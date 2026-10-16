import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {request as httpRequest} from 'node:http';
import {fixture,error,origin} from './helpers.mjs';

const base='/api/parent-message-templates',path=id=>base+'/'+encodeURIComponent(id),fields=extra=>({title:' 原文 <家長訊息> ',body:' Dear {parentName},\n Original <body> & text. ',...extra});
const mutate=(client,url,method,body,key,options={})=>client.request(url,{method,body,headers:key?{'Idempotency-Key':key}:{},...options});
const inspect=(app,read)=>{const db=new DatabaseSync(app.databasePath);try{return read(db);}finally{db.close();}};
const business=app=>inspect(app,db=>Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'parent_message_template%' AND name!='idempotent_creates' ORDER BY name").all().map(({name})=>[name,db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY rowid').all()])));
async function setup(t){
 const directory=await mkdtemp(join(tmpdir(),'beamal-parent-templates-'));t.after(()=>rm(directory,{recursive:true,force:true}));const databasePath=join(directory,'isolated.sqlite'),app=await fixture(t,{databasePath}),admin=app.client(),teacher=app.client(),student=app.client(),actor=(await admin.login()).body.user;await teacher.login(2);await student.login(3);
 return {...app,databasePath,admin,teacher,student,actor};
}
const create=async(app,input=fields(),key,client=app.admin)=>{const result=await mutate(client,base,'POST',input,key);assert.equal(result.status,201,result.text);return result.body.template;};
const read=async(client,url=base)=>{const result=await client.request(url);assert.equal(result.status,200,result.text);return result.body;};

test('parent templates begin empty and preserve exact reusable plain text with stable IDs and versions without sending messages',async t=>{
 const app=await setup(t),before=business(app),empty=await read(app.admin);assert.equal(empty.total,0);assert.deepEqual(empty.records,[]);assert.deepEqual(app.store.parentMessageTemplates.audit(),[]);
 const input=fields(),first=await create(app,input),sameTitle=await create(app,fields({body:'Independent text'}));assert.notEqual(first.id,sameTitle.id);assert.equal(first.title,input.title);assert.equal(first.body,input.body);assert.equal(first.version,1);assert.equal(first.archived,false);assert.ok(Number.isFinite(Date.parse(first.createdAt)));assert.equal(first.createdAt,first.updatedAt);
 assert.deepEqual(Object.keys(first).sort(),['archived','body','createdAt','id','title','updatedAt','version']);assert.deepEqual((await read(app.admin,path(first.id))).template,first);error(await app.teacher.request(path(first.id)),404);assert.equal((await read(app.teacher)).total,0);assert.equal((await read(app.admin)).total,2);assert.deepEqual(business(app),before);assert.equal(app.store.parentMessageTemplates.audit().length,2);
 const edit=await mutate(app.admin,path(first.id),'PATCH',{version:1,title:'Edited',body:'No replacement for {studentName}'});assert.equal(edit.status,200,edit.text);assert.equal(edit.body.template.id,first.id);assert.equal(edit.body.template.version,2);assert.equal(edit.body.template.body,'No replacement for {studentName}');assert.deepEqual((await read(app.admin,path(sameTitle.id))).template,sameTitle);
});

test('template search pagination and revisions use real saved rows including literal wildcard characters',async t=>{
 const app=await setup(t);for(const [title,body]of[['Alpha','中文內容'],['Beta','ALPHA elsewhere'],['100%_literal','No percent expansion']])await create(app,{title,body},null,app.teacher);
 const alpha=await read(app.teacher,base+'?q=alpha&pageSize=1');assert.equal(alpha.total,2);assert.equal(alpha.records.length,1);assert.equal(alpha.page,1);assert.equal(alpha.pageSize,1);
 const next=await read(app.teacher,base+'?q=alpha&page=2&pageSize=1');assert.equal(next.total,2);assert.notEqual(next.records[0].id,alpha.records[0].id);
 assert.equal((await read(app.teacher,base+'?q=%25_')).total,1);assert.equal((await read(app.teacher,base+'?q='+encodeURIComponent('中文'))).total,1);
 const unchanged=await read(app.teacher,base+'?q=alpha&pageSize=1&since='+alpha.revision);assert.deepEqual(unchanged,{revision:alpha.revision,unchanged:true,total:2,page:1,pageSize:1});
 const target=alpha.records[0];assert.equal((await mutate(app.teacher,path(target.id),'PATCH',{version:target.version,title:'Removed match',body:'Changed'})).status,200);const changed=await read(app.teacher,base+'?q=alpha&pageSize=1&since='+alpha.revision);assert.equal(changed.unchanged,undefined);assert.equal(changed.total,1);assert.notEqual(changed.revision,alpha.revision);assert.equal((await read(app.admin,base+'?status=all')).total,0);
});

test('Teacher own archive and restore are reversible versioned changes and never expose personal templates to Admin',async t=>{
 const app=await setup(t),record=await create(app,fields(),null,app.teacher),archived=await mutate(app.teacher,path(record.id)+'/archive','POST',{version:1},'archive-once');assert.equal(archived.status,200,archived.text);assert.equal(archived.body.template.archived,true);assert.equal(archived.body.template.version,2);
 assert.deepEqual((await read(app.teacher,path(record.id))).template,archived.body.template);assert.equal((await read(app.teacher)).total,0);error(await app.admin.request(path(record.id)),404);
 assert.equal((await read(app.teacher,base+'?status=archived')).records[0].id,record.id);assert.equal((await read(app.teacher,base+'?status=all')).total,1);assert.equal((await read(app.admin,base+'?status=all')).total,0);
 error(await mutate(app.teacher,path(record.id)+'/restore','POST',{version:1}),409);const restored=await mutate(app.teacher,path(record.id)+'/restore','POST',{version:2});assert.equal(restored.status,200,restored.text);assert.equal(restored.body.template.archived,false);assert.equal(restored.body.template.version,3);assert.equal((await read(app.teacher)).records[0].id,record.id);assert.equal(app.store.parentMessageTemplates.audit().length,3);
});

test('personal template authority forbids cross-owner access even for Admin and never accepts a caller supplied owner',async t=>{
 const app=await setup(t),record=await create(app,fields({body:'PRIVATE-ADMIN-TEMPLATE'})),teacherRecord=await create(app,fields({body:'PRIVATE-TEACHER-TEMPLATE'}),null,app.teacher),otherAdmin=app.client();await otherAdmin.login(1);
 for(const [client,status]of [[app.student,403],[app.client(),401]])for(const url of[base,path(record.id),path('missing')]){const denied=await client.request(url);error(denied,status);assert.ok(!denied.text.includes('PRIVATE-TEMPLATE'));}
 for(const [client,target]of [[app.teacher,record],[app.admin,teacherRecord],[otherAdmin,record]]){
  error(await client.request(path(target.id)),404);
  for(const [url,method,input]of [[path(target.id),'PATCH',{version:1,...fields()}],[path(target.id)+'/archive','POST',{version:1}],[path(target.id)+'/restore','POST',{version:1}]])error(await mutate(client,url,method,input),404);
 }
 error(await mutate(app.teacher,base,'POST',fields({ownerId:app.actor.id})),400);error(await app.admin.request(base+'?ownerId=other'),400);
 assert.throws(()=>app.store.parentMessageTemplates.create(fields(),{id:app.teacher.cookies.get('not-an-account'),role:'admin'}),value=>value.status===403);
 assert.equal(app.store.parentMessageTemplates.audit().length,2);
});

test('template input limits unknown fields versions and stale updates fail without altering raw saved drafts',async t=>{
 const app=await setup(t);
 for(const input of[null,[],{},fields({title:''}),fields({title:'  '}),fields({title:'x'.repeat(121)}),fields({body:''}),fields({body:' \n '}),fields({body:'x'.repeat(2001)}),fields({body:null}),fields({title:42}),fields({channel:'whatsapp'}),fields({variables:{name:'fake'}})])error(await mutate(app.admin,base,'POST',input),400);
 assert.equal((await read(app.admin)).total,0);const record=await create(app,fields({title:'x'.repeat(120),body:'y'.repeat(2000)}));
 for(const input of[{...fields(),version:0},{...fields(),version:'1'},{...fields(),version:2}])error(await mutate(app.admin,path(record.id),'PATCH',input),409);
 error(await mutate(app.admin,path(record.id),'PATCH',{version:1,...fields(),recipientUserId:'forged'}),400);error(await mutate(app.admin,path(record.id)+'/archive','POST',{version:1,body:'not permitted'}),400);error(await app.admin.request(path('missing')),404);assert.deepEqual((await read(app.admin,path(record.id))).template,record);assert.equal(app.store.parentMessageTemplates.audit().length,1);
});

test('template idempotency covers create update archive restore and changed payloads never duplicate version or audit',async t=>{
 const app=await setup(t),input=fields(),record=await create(app,input,'template-create');assert.deepEqual(await create(app,input,'template-create'),record);error(await mutate(app.admin,base,'POST',fields({body:'Different'}),'template-create'),409);
 const operations=[[path(record.id),'PATCH',{version:1,title:'Edited',body:'Raw text'},'template-edit'],[path(record.id)+'/archive','POST',{version:2},'template-archive'],[path(record.id)+'/restore','POST',{version:3},'template-restore']];
 for(const [url,method,body,key]of operations){const first=await mutate(app.admin,url,method,body,key),again=await mutate(app.admin,url,method,body,key);assert.equal(first.status,200,first.text);assert.deepEqual(again.body,first.body);}
 assert.equal((await read(app.admin,path(record.id))).template.version,4);assert.equal(app.store.parentMessageTemplates.audit().length,4);assert.equal((await read(app.admin,base+'?status=all')).total,1);
 inspect(app,db=>db.prepare("UPDATE users SET role='student' WHERE id=?").run(app.actor.id));error(await mutate(app.admin,base,'POST',input,'template-create'),403);error(await mutate(app.admin,path(record.id),'PATCH',operations[0][2],'template-edit'),403);assert.equal(app.store.parentMessageTemplates.audit().length,4);
});

test('template audit and receipt failures roll back together and saved archive history survives restart without seeds',async t=>{
 const app=await setup(t),before=business(app);inspect(app,db=>db.exec("CREATE TRIGGER isolated_template_audit_failure BEFORE INSERT ON parent_message_template_audit_log BEGIN SELECT RAISE(ABORT,'isolated template audit failure'); END;"));
 error(await mutate(app.admin,base,'POST',fields(),'template-atomic'),500);assert.equal((await read(app.admin)).total,0);assert.deepEqual(app.store.parentMessageTemplates.audit(),[]);assert.deepEqual(business(app),before);inspect(app,db=>db.exec('DROP TRIGGER isolated_template_audit_failure'));
 const record=await create(app,fields(),'template-atomic'),archived=await mutate(app.admin,path(record.id)+'/archive','POST',{version:1});assert.equal(archived.status,200,archived.text);await app.close();
 const restarted=await fixture(t,{databasePath:app.databasePath}),admin=restarted.client();await admin.login();assert.deepEqual((await read(admin,path(record.id))).template,archived.body.template);assert.equal((await read(admin,base+'?status=all')).total,1);assert.equal(restarted.store.parentMessageTemplates.audit().length,2);
});

test('template REST rejects unsupported methods queries CSRF and origin without accepting caller role headers',async t=>{
 const app=await setup(t),record=await create(app);
 for(const [url,method]of [[base,'PATCH'],[base,'DELETE'],[path(record.id),'DELETE'],[path(record.id)+'/archive','PATCH'],[path(record.id)+'/restore','DELETE']])error(await mutate(app.admin,url,method,{version:1}),405);
 for(const suffix of['?page=0','?pageSize=101','?page=1&page=2','?status=missing','?userId=someone'])error(await app.admin.request(base+suffix),400);
 error(await app.admin.request(path(record.id)+'?version=1'),400);error(await mutate(app.admin,base+'?x=1','POST',fields()),400);error(await mutate(app.admin,base,'POST',fields(),null,{csrf:false}),403);error(await mutate(app.admin,base,'POST',fields(),null,{requestOrigin:'https://hostile.test'}),403);
 error(await app.student.request(base,{headers:{'X-User-Role':'admin'}}),403);assert.equal(app.store.parentMessageTemplates.audit().length,1);
});

test('a template request paused across Admin demotion cannot replay an old saved private response',async t=>{
 const app=await setup(t),input=fields({body:'PRIVATE-PAUSED-TEMPLATE'});await create(app,input,'template-paused');const payload=JSON.stringify(input),url=new URL(base,app.base);let observed;const seen=new Promise(resolve=>{observed=req=>{if(req.url===url.pathname)resolve();};app.server.on('request',observed);});let request;
 const pending=new Promise((resolve,reject)=>{request=httpRequest(url,{method:'POST',headers:{Origin:origin,Cookie:[...app.admin.cookies].map(([name,value])=>name+'='+value).join('; '),'X-CSRF-Token':app.admin.csrfToken,'Idempotency-Key':'template-paused','Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}},response=>{let text='';response.setEncoding('utf8');response.on('data',chunk=>text+=chunk);response.on('end',()=>resolve({status:response.statusCode,text}));});request.on('error',reject);request.write(payload.slice(0,12));});
 await seen;app.server.off('request',observed);inspect(app,db=>db.prepare("UPDATE users SET role='student' WHERE id=?").run(app.actor.id));request.end(payload.slice(12));const denied=await pending;assert.equal(denied.status,403,denied.text);assert.ok(!denied.text.includes('PRIVATE-PAUSED-TEMPLATE'));assert.equal(app.store.parentMessageTemplates.audit().length,1);
});
