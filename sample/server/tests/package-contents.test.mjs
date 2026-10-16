import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {request as httpRequest} from 'node:http';
import {fixture,error,origin,grantTeacherAccess} from './helpers.mjs';

const path=id=>'/api/fees/'+encodeURIComponent(id)+'/package-contents';
const components=()=>[{id:'class-a',name:' Class A <原文>\n ',minutes:60},{id:'interview',name:'Interview',minutes:15}];
const body=(contents,items=components())=>({version:contents.version,feeVersion:contents.feeVersion,components:items});
const feeFields=extra=>({feeName:'Class A + Interview',pricingModel:'package',price:1000,packageType:'minutes',packageTotal:75,bookingExpiry:null,onlineStore:true,courseIds:['public-course'],...extra});
async function setup(t,options={}){
 const directory=await mkdtemp(join(tmpdir(),'beamal-package-contents-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const databasePath=options.databasePath||join(directory,'isolated.sqlite'),app=await fixture(t,{databasePath}),admin=app.client(),teacher=app.client(),student=app.client();
 const actor=(await admin.login()).body.user;await teacher.login(2);await student.login(3);
 const created=await admin.request('/api/fees',{method:'POST',body:feeFields(options.fee)});assert.equal(created.status,201,created.text);
 return {...app,databasePath,admin,teacher,student,actor,fee:created.body.fee};
}
const save=(app,input,key,client=app.admin)=>client.request(path(app.fee.id),{method:'PATCH',body:input,headers:key?{'Idempotency-Key':key}:{}});
const inspect=(app,read)=>{const database=new DatabaseSync(app.databasePath);try{return read(database);}finally{database.close();}};
const oldBusiness=app=>inspect(app,database=>Object.fromEntries(database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'fee_package_content%' AND name!='idempotent_creates' ORDER BY name").all().map(({name})=>[name,database.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY rowid').all()])));

test('package contents unset reads do not invent saved components and exact ordered raw names persist without touching fees or schedules',async t=>{
 const app=await setup(t),before=oldBusiness(app),initial=await app.admin.request(path(app.fee.id));assert.equal(initial.status,200,initial.text);
 assert.deepEqual(initial.body,{contents:{feeId:app.fee.id,feeVersion:app.fee.version,version:0,components:[],updatedAt:null}});
 assert.equal(inspect(app,db=>db.prepare('SELECT COUNT(*) AS n FROM fee_package_contents').get().n),0);
 const saved=await save(app,body(initial.body.contents));assert.equal(saved.status,200,saved.text);assert.equal(saved.body.contents.version,1);assert.deepEqual(saved.body.contents.components,components());assert.equal(saved.body.contents.feeVersion,app.fee.version);assert.ok(Number.isFinite(Date.parse(saved.body.contents.updatedAt)));
 assert.deepEqual((await app.admin.request(path(app.fee.id))).body,saved.body);assert.deepEqual(oldBusiness(app),before);assert.equal(app.store.packageContents.audit().length,1);
 const reordered=await save(app,body(saved.body.contents,components().reverse()));assert.equal(reordered.status,200,reordered.text);assert.deepEqual(reordered.body.contents.components.map(row=>row.id),['interview','class-a']);assert.equal(reordered.body.contents.version,2);
});

test('new unset package contents cannot save an empty composition while previously saved contents can be explicitly cleared',async t=>{
 const app=await setup(t),initial=await app.admin.request(path(app.fee.id));assert.equal(initial.status,200,initial.text);const unset=initial.body.contents;
 error(await save(app,body(unset,[]),'package-empty-new'),400);
 assert.deepEqual((await app.admin.request(path(app.fee.id))).body.contents,unset);
 assert.equal(inspect(app,db=>db.prepare('SELECT COUNT(*) AS n FROM fee_package_contents').get().n),0);assert.deepEqual(app.store.packageContents.audit(),[]);
 const saved=await save(app,body(unset),'package-with-contents');assert.equal(saved.status,200,saved.text);
 const clear=await save(app,body(saved.body.contents,[]),'package-clear-existing');assert.equal(clear.status,200,clear.text);assert.equal(clear.body.contents.version,2);assert.deepEqual(clear.body.contents.components,[]);assert.equal(app.store.packageContents.audit().length,2);
});

test('package content writes use independent composition and fee CAS and legacy Fee edits preserve saved contents',async t=>{
 const app=await setup(t),initial=(await app.admin.request(path(app.fee.id))).body.contents,saved=await save(app,body(initial));assert.equal(saved.status,200,saved.text);
 error(await save(app,body(initial)),409);
 const changed=await app.admin.request('/api/fees/'+app.fee.id,{method:'PATCH',body:feeFields({version:app.fee.version,price:1200})});assert.equal(changed.status,200,changed.text);
 const current=(await app.admin.request(path(app.fee.id))).body.contents;assert.equal(current.version,1);assert.equal(current.feeVersion,changed.body.fee.version);assert.deepEqual(current.components,components());
 error(await save(app,body(saved.body.contents)),409);
 const cleared=await save(app,body(current,[]));assert.equal(cleared.status,200,cleared.text);assert.equal(cleared.body.contents.version,2);assert.deepEqual(cleared.body.contents.components,[]);assert.equal(app.store.packageContents.audit().length,2);
});

test('package contents strict validation rejects ambiguous identities types unknown keys and excessive rows without partial records',async t=>{
 const app=await setup(t),initial=await app.admin.request(path(app.fee.id));assert.equal(initial.status,200,initial.text);const current=initial.body.contents,valid=body(current);
 const invalid=[null,[],{...valid,unknown:true},{version:0,feeVersion:1},{...valid,components:{}},{...valid,components:Array.from({length:51},(_,i)=>({id:'row-'+i,name:'Part',minutes:1}))},
  {...valid,components:[{id:'same',name:'A',minutes:1},{id:'same',name:'B',minutes:2}]},...['',' x','x '.repeat(101),null,2].map(id=>({...valid,components:[{id,name:'Part',minutes:1}]})),
  ...['',' '.repeat(2),'x'.repeat(201),null,1].map(name=>({...valid,components:[{id:'part',name,minutes:1}]})),
  ...[0,-1,1.5,1441,'60',null,true,Number.MAX_SAFE_INTEGER].map(minutes=>({...valid,components:[{id:'part',name:'Part',minutes}]})),
  {...valid,components:[{id:'part',name:'Part',minutes:1,price:10}]}];
 for(const input of invalid)error(await save(app,input),400);
 for(const input of [{...valid,version:-1},{...valid,version:0.5},{...valid,version:'0'},{...valid,feeVersion:0},{...valid,feeVersion:'1'}])error(await save(app,input),409);
 assert.deepEqual((await app.admin.request(path(app.fee.id))).body.contents,current);assert.deepEqual(app.store.packageContents.audit(),[]);
 const boundary=await save(app,body(current,Array.from({length:50},(_,i)=>({id:'segment-'+i,name:'x'.repeat(200),minutes:i%2?1440:1}))));assert.equal(boundary.status,200,boundary.text);assert.equal(boundary.body.contents.components.length,50);
});

test('package contents reads require current active course scope and only current administrators may write',async t=>{
 const app=await setup(t),initial=await app.admin.request(path(app.fee.id));assert.equal(initial.status,200,initial.text);
 error(await app.teacher.request(path(app.fee.id)),404);await grantTeacherAccess(app,app.admin,{courses:['public-course']});assert.equal((await app.teacher.request(path(app.fee.id))).status,200);
 error(await save(app,body(initial.body.contents),null,app.teacher),403);error(await app.student.request(path(app.fee.id)),403);error(await save(app,body(initial.body.contents),null,app.student),403);error(await app.client().request(path(app.fee.id)),401);
 const other=await app.admin.request('/api/fees',{method:'POST',body:feeFields({courseIds:['private-course']})});assert.equal(other.status,201,other.text);error(await app.teacher.request(path(other.body.fee.id)),404);
 app.store.deleteCourse('public-course',app.store.getCourse('public-course').version,app.actor.id);error(await app.admin.request(path(app.fee.id)),404);error(await save(app,body(initial.body.contents)),404);error(await app.teacher.request(path(app.fee.id)),404);
});

test('nonpackage fees never accept or expose package compositions and returning to package retains the separate saved record',async t=>{
 const app=await setup(t),read=await app.admin.request(path(app.fee.id));assert.equal(read.status,200,read.text);const saved=await save(app,body(read.body.contents));assert.equal(saved.status,200,saved.text);
 const fixed=await app.admin.request('/api/fees/'+app.fee.id,{method:'PATCH',body:feeFields({version:app.fee.version,pricingModel:'fixed-monthly',months:1,price:800})});assert.equal(fixed.status,200,fixed.text);error(await app.admin.request(path(app.fee.id)),409);error(await save(app,{...body(saved.body.contents),feeVersion:fixed.body.fee.version}),409);
 const back=await app.admin.request('/api/fees/'+app.fee.id,{method:'PATCH',body:feeFields({version:fixed.body.fee.version})});assert.equal(back.status,200,back.text);const restored=await app.admin.request(path(app.fee.id));assert.equal(restored.status,200,restored.text);assert.deepEqual(restored.body.contents.components,components());assert.equal(restored.body.contents.version,1);assert.equal(restored.body.contents.feeVersion,back.body.fee.version);
});

test('package contents receipt retry saves one version and audit while changed payload conflicts and current authority blocks replay',async t=>{
 const app=await setup(t),read=await app.admin.request(path(app.fee.id));assert.equal(read.status,200,read.text);const input=body(read.body.contents),first=await save(app,input,'package-lost-ack');assert.equal(first.status,200,first.text);
 assert.deepEqual((await save(app,input,'package-lost-ack')).body,first.body);error(await save(app,{...input,components:components().reverse()},'package-lost-ack'),409);assert.equal(app.store.packageContents.audit().length,1);
 inspect(app,db=>db.prepare("UPDATE users SET role='teacher' WHERE id=?").run(app.actor.id));error(await save(app,input,'package-lost-ack'),403);assert.equal(app.store.packageContents.audit().length,1);
});

test('package contents audit failure atomically rolls back version contents and receipt then allows a single retry',async t=>{
 const app=await setup(t),read=await app.admin.request(path(app.fee.id));assert.equal(read.status,200,read.text);const input=body(read.body.contents),before=oldBusiness(app);
 inspect(app,db=>db.exec("CREATE TRIGGER isolated_package_audit_failure BEFORE INSERT ON fee_package_content_audit_log BEGIN SELECT RAISE(ABORT,'isolated audit failure'); END;"));error(await save(app,input,'package-atomic'),500);assert.deepEqual((await app.admin.request(path(app.fee.id))).body,read.body);assert.deepEqual(app.store.packageContents.audit(),[]);assert.deepEqual(oldBusiness(app),before);
 inspect(app,db=>db.exec('DROP TRIGGER isolated_package_audit_failure'));const retry=await save(app,input,'package-atomic');assert.equal(retry.status,200,retry.text);assert.equal(retry.body.contents.version,1);assert.equal(app.store.packageContents.audit().length,1);
});

test('package contents save and explicit clear survive restart and never enter public or Student fee catalog DTOs',async t=>{
 const app=await setup(t),publicPaths=['/api/public/courses','/api/public/courses/public-course?from=2026-10-16','/api/public/timetable?from=2026-10-16&days=7'],anonymous=app.client(),before=await Promise.all(publicPaths.map(url=>anonymous.request(url))),initial=await app.admin.request(path(app.fee.id));assert.equal(initial.status,200,initial.text);
 const input=body(initial.body.contents,[{id:'PRIVATE-COMPONENT-ID',name:'PRIVATE-COMPOSITION-CONTENT',minutes:75}]),saved=await save(app,input);assert.equal(saved.status,200,saved.text);
 for(let i=0;i<publicPaths.length;i++){const reply=await anonymous.request(publicPaths[i]);assert.deepEqual(reply.body,before[i].body);assert.ok(!reply.text.includes('PRIVATE-COMPOSITION'));}
 for(const url of ['/api/fees','/api/courses','/api/catalog']){const reply=await app.student.request(url);assert.equal(reply.status,200,reply.text);assert.ok(!reply.text.includes('PRIVATE-COMPOSITION'));assert.ok(!reply.text.includes('PRIVATE-COMPONENT'));}
 const feeId=app.fee.id;await app.close();const next=await fixture(t,{databasePath:app.databasePath}),admin=next.client();await admin.login();assert.deepEqual((await admin.request(path(feeId))).body,saved.body);
 const clear=await admin.request(path(feeId),{method:'PATCH',body:body(saved.body.contents,[])});assert.equal(clear.status,200,clear.text);await next.close();const final=await fixture(t,{databasePath:app.databasePath}),finalAdmin=final.client();await finalAdmin.login();assert.deepEqual((await finalAdmin.request(path(feeId))).body,clear.body);assert.equal(final.store.packageContents.audit().length,2);
});

test('package contents HTTP rejects invalid methods queries CSRF origin and malformed exact identities',async t=>{
 const app=await setup(t),read=await app.admin.request(path(app.fee.id));assert.equal(read.status,200,read.text);const input=body(read.body.contents);
 for(const method of ['POST','PUT','DELETE'])error(await app.admin.request(path(app.fee.id),{method,body:input}),405);
 for(const suffix of ['?from=2026-10-16','?version=0','?x=1&x=2']){error(await app.admin.request(path(app.fee.id)+suffix),400);error(await app.admin.request(path(app.fee.id)+suffix,{method:'PATCH',body:input}),400);}
 error(await app.admin.request(path(app.fee.id),{method:'PATCH',body:input,csrf:false}),403);error(await app.admin.request(path(app.fee.id),{method:'PATCH',body:input,requestOrigin:'https://hostile.test'}),403);error(await app.admin.request('/api/fees/bad%ZZ/package-contents'),400);error(await app.admin.request(path('missing')),404);assert.equal(app.store.packageContents.audit().length,0);
});

test('package contents PATCH rechecks administrator after paused body before an old receipt can reveal private components',async t=>{
 const app=await setup(t),read=await app.admin.request(path(app.fee.id));assert.equal(read.status,200,read.text);const input=body(read.body.contents,[{id:'private-part',name:'PRIVATE-PAUSED-PACKAGE',minutes:60}]),saved=await save(app,input,'package-paused');assert.equal(saved.status,200,saved.text);
 const payload=JSON.stringify(input),url=new URL(path(app.fee.id),app.base);let observed;const seen=new Promise(resolve=>{observed=req=>{if(req.url===url.pathname)resolve();};app.server.on('request',observed);});let request;
 const pending=new Promise((resolve,reject)=>{request=httpRequest(url,{method:'PATCH',headers:{Origin:origin,Cookie:[...app.admin.cookies].map(([name,value])=>name+'='+value).join('; '),'X-CSRF-Token':app.admin.csrfToken,'Idempotency-Key':'package-paused','Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}},response=>{let text='';response.setEncoding('utf8');response.on('data',chunk=>text+=chunk);response.on('end',()=>resolve({status:response.statusCode,text}));});request.on('error',reject);request.write(payload.slice(0,12));});
 await seen;app.server.off('request',observed);inspect(app,db=>db.prepare("UPDATE users SET role='teacher' WHERE id=?").run(app.actor.id));request.end(payload.slice(12));const denied=await pending;assert.equal(denied.status,403,denied.text);assert.ok(!denied.text.includes('PRIVATE-PAUSED-PACKAGE'));assert.equal(app.store.packageContents.audit().length,1);
});
