import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {fixture,error,noCredentials} from './helpers.mjs';

const path=id=>'/api/fees/'+encodeURIComponent(id)+'/history';
const fields=overrides=>({feeName:'Same named fee',category:'Private category',pricingModel:'monthly-lessons',price:300,duration:60,months:1,bookingExpiry:null,onlineStore:false,courseIds:['public-course','private-course'],...overrides});
async function setup(t,options={}){const app=await fixture(t,options),admin=app.client();await admin.login();return {...app,admin};}
async function create(app,overrides={}){const reply=await app.admin.request('/api/fees',{method:'POST',body:fields(overrides)});assert.equal(reply.status,201,reply.text);return reply.body.fee;}
async function update(app,fee,overrides={}){const reply=await app.admin.request('/api/fees/'+encodeURIComponent(fee.id),{method:'PATCH',body:fields({version:fee.version,...overrides})});assert.equal(reply.status,200,reply.text);return reply.body.fee;}
function business(app){return {courses:app.store.listCourses(),fees:app.store.listFees(),courseAudit:app.store.audit(),feeAudit:app.store.feeAudit()};}
async function disk(t){const directory=await mkdtemp(join(tmpdir(),'beamal-fee-history-'));t.after(()=>rm(directory,{recursive:true,force:true}));return join(directory,'fictional.sqlite');}
function tableDigests(database){return Object.fromEntries(database.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,createHash('sha256').update(JSON.stringify(database.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY rowid').all())).digest('hex')]));}

test('fee history returns exact recorded pricing snapshots newest first for one ID, never another same-name fee',async t=>{
 const app=await setup(t),first=await create(app),other=await create(app,{price:987.65});
 const fixed=await update(app,first,{pricingModel:'fixed-monthly',price:850,months:2,bookingExpiry:{value:3,unit:'months'}});
 await update(app,fixed,{feeName:'Renamed package',pricingModel:'package',price:1200,packageType:'minutes',packageTotal:240});
 const before=business(app),reply=await app.admin.request(path(first.id));assert.equal(reply.status,200,reply.text);noCredentials(reply);
 assert.deepEqual(Object.keys(reply.body).sort(),['feeId','records']);assert.equal(reply.body.feeId,first.id);
 const rows=reply.body.records;assert.equal(rows.length,3);assert.deepEqual(rows.map(row=>row.version),[3,2,1]);assert.deepEqual(rows.map(row=>row.action),['fee.update','fee.update','fee.create']);
 assert.deepEqual(rows.map(row=>row.feeName),['Renamed package','Same named fee','Same named fee']);
 assert.deepEqual(rows.map(row=>row.pricing),[
  {pricingModel:'package',price:1200,packageType:'minutes',packageTotal:240,bookingExpiry:null},
  {pricingModel:'fixed-monthly',price:850,months:2,bookingExpiry:{value:3,unit:'months'}},
  {pricingModel:'monthly-lessons',price:300,months:1,duration:60,bookingExpiry:null},
 ]);
 for(const row of rows){assert.deepEqual(Object.keys(row).sort(),['action','actorName','feeName','id','pricing','recordedAt','version']);assert.equal(row.actorName,'Manager A');assert.ok(Number.isSafeInteger(row.id));assert.equal(new Date(row.recordedAt).toISOString(),row.recordedAt);}
 assert.ok(rows.every((row,index)=>index===0||rows[index-1].id>row.id));assert.ok(!reply.text.includes(other.id));assert.ok(!reply.text.includes('987.65'));assert.ok(!reply.text.includes('Private category'));assert.ok(!reply.text.includes('courseIds'));assert.ok(!reply.text.includes('example.test'));
 assert.equal((await app.admin.request(path(other.id))).body.records.length,1);assert.deepEqual(business(app),before,'Reading history cannot create audit entries, rewrite prices or mutate links.');
});

test('fee history authorizes before existence and decoding and rejects methods without business writes',async t=>{
 const app=await setup(t),fee=await create(app),anonymous=app.client(),teacher=app.client(),student=app.client();await teacher.login(2);await student.login(3);const before=business(app);
 for(const id of [fee.id,'does-not-exist','bad%ZZ'])for(const [client,status]of[[anonymous,401],[teacher,403],[student,403]]){
  const url=id==='bad%ZZ'?'/api/fees/bad%ZZ/history':path(id);error(await client.request(url,{headers:{'X-User-Role':'admin'}}),status);
 }
 error(await app.admin.request(path('does-not-exist')),404);error(await app.admin.request('/api/fees/bad%ZZ/history'),400);
 for(const method of ['POST','PATCH','DELETE','PUT'])error(await app.admin.request(path(fee.id),{method,body:{price:1}}),405);
 const read=await app.admin.request(path(fee.id),{csrf:false,requestOrigin:null});assert.equal(read.status,200,read.text);assert.deepEqual(business(app),before);
});

test('course pricing edits are included as recorded edits for their exact primary fee',async t=>{
 const app=await setup(t),course=app.store.getCourse('public-course'),fee=course.fees[0];
 const reply=await app.admin.request('/api/courses/'+course.id,{method:'PATCH',body:{version:course.version,price:1050}});assert.equal(reply.status,200,reply.text);
 const history=await app.admin.request(path(fee.id));assert.equal(history.status,200,history.text);assert.deepEqual(history.body.records.map(row=>row.pricing.price),[1050,1000]);assert.equal(history.body.records[0].action,'fee.update');
 assert.ok(!Object.hasOwn(history.body.records[0],'effectiveDate'));assert.ok(!Object.hasOwn(history.body.records.at(-1),'actorName'),'Seed actor is unknown, not a fictitious administrator.');
});

test('legacy empty history stays empty and real recorded edits survive service restart without manufacturing earlier versions',async t=>{
 const databasePath=await disk(t),app=await setup(t,{databasePath}),saved=await create(app),empty=await create(app,{feeName:'Imported legacy fee'});
 await update(app,saved,{price:350});const inspection=new DatabaseSync(databasePath);
 try{inspection.prepare('DELETE FROM fee_audit_log WHERE fee_id=?').run(empty.id);}finally{inspection.close();}
 const before=business(app),first=await app.admin.request(path(saved.id)),legacy=await app.admin.request(path(empty.id));assert.equal(first.status,200,first.text);assert.equal(legacy.status,200,legacy.text);assert.deepEqual(legacy.body,{feeId:empty.id,records:[]});await app.close();
 const restarted=await setup(t,{databasePath}),reply=await restarted.admin.request(path(saved.id));assert.equal(reply.status,200,reply.text);assert.deepEqual(reply.body,first.body);assert.deepEqual((await restarted.admin.request(path(empty.id))).body,legacy.body);assert.deepEqual(business(restarted),before);
});

test('history projects only stored whitelist values and preserves unknown legacy values without falling back to current pricing',async t=>{
 const databasePath=await disk(t),app=await setup(t,{databasePath}),fee=await create(app),inspection=new DatabaseSync(databasePath);t.after(()=>inspection.close());
 const extra={email:'PRIVATE@example.test',password:'PRIVATE-PASSWORD',token:'PRIVATE-TOKEN',actorName:'PRIVATE-FAKE-ACTOR',courseIds:['PRIVATE-OTHER-COURSE'],onlineStore:true};
 const snapshot={...extra,feeName:'Stored historical name',pricingModel:'package',price:12.34,packageType:'visits',packageTotal:5,bookingExpiry:{value:2,unit:'weeks',...extra}};
 const insert=inspection.prepare('INSERT INTO fee_audit_log(actor_id,action,fee_id,version,snapshot,created_at) VALUES (NULL,?,?,?,?,?)');
 insert.run('fee.import',fee.id,7,JSON.stringify(snapshot),'2026-10-14T08:00:00.000Z');
 insert.run('fee.recorded',fee.id,8,JSON.stringify({...extra,pricingModel:{email:'PRIVATE-MODEL'},price:{password:'PRIVATE-PRICE'},months:'3',duration:0,packageType:'arbitrary',packageTotal:-1,bookingExpiry:{value:1,unit:'invalid',...extra}}),'2025-01-01T00:00:00.000Z');
 insert.run('fee.recorded',fee.id,9,'not valid json','2024-01-01T00:00:00.000Z');
 const before=tableDigests(inspection),reply=await app.admin.request(path(fee.id));assert.equal(reply.status,200,reply.text);noCredentials(reply);const rows=reply.body.records;
 assert.deepEqual(rows.map(row=>row.version),[9,8,7,1],'Recorded ID order wins even when source timestamps are non-monotonic.');
 for(const row of rows.slice(0,2)){assert.equal(row.feeName,'');assert.deepEqual(row.pricing,{pricingModel:null,price:null});assert.equal(Object.hasOwn(row,'actorName'),false);}
 assert.deepEqual(rows[2].pricing,{pricingModel:'package',price:12.34,packageType:'visits',packageTotal:5,bookingExpiry:{value:2,unit:'weeks'}});assert.equal(rows[2].feeName,'Stored historical name');assert.equal(rows[2].action,'fee.import');
 assert.ok(!reply.text.includes('PRIVATE'));assert.ok(!reply.text.includes('snapshot'));assert.ok(!reply.text.includes('onlineStore'));assert.ok(!reply.text.includes('courseIds'));assert.ok(!reply.text.includes('actor_id'));
 for(const method of ['GET','POST','PATCH','DELETE']){const result=await app.admin.request(path(fee.id),{method});assert.equal(result.status,method==='GET'?200:405);}
 const head=await fetch(app.base+path(fee.id),{method:'HEAD',headers:{Cookie:[...app.admin.cookies].map(([key,value])=>key+'='+value).join('; ')}});assert.equal(head.status,405);assert.equal(await head.text(),'');
 assert.deepEqual(tableDigests(inspection),before,'History reads and rejected mutations cannot change any persisted table.');
});
