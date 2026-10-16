import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,error} from './helpers.mjs';

const applicant={localName:'陳欣悅',fullName:'Natalie Chan',dateOfBirth:'2016-03-12',gender:'female',school:'Example Primary',referrer:'朋友介紹',parentName:'陳慧琳',whatsapp:'61234567',email:'parent@example.test',remark:' 首次試課 <raw> '};
async function setup(t,options={}){
 const app=await fixture(t,{trialFormPolicy:'name-birth-whatsapp',...options}),admin=app.client(),teacher=app.client(),student=app.client(),anonymous=app.client();
 const a=await admin.login(),b=await teacher.login(2);await student.login(3);
 const resource=app.store.schedulingResources.create({kind:'teacher',displayName:'Trial teacher'},a.body.user.id);
 app.store.accessControl.setTeacherLink(resource.id,{version:0,userId:b.body.user.id},a.body.user.id);
 const slot=app.store.availableSlots.create({courseId:'public-course',date:'2026-10-20',time:'13:00',duration:60,teacherIds:[resource.id],roomIds:[],trialCapacity:1,trialEnabled:true,active:true},a.body.user.id);
 const source=await anonymous.request('/api/public/courses/public-course?from=2026-10-19&days=7');assert.equal(source.status,200,source.text);
 return {...app,admin,teacher,student,anonymous,resource,actor:a.body.user,teacherActor:b.body.user,slot,input:{courseId:'public-course',slotId:slot.id,from:'2026-10-19',days:7,revision:source.body.revision,applicant}};
}
const submit=(app,key=randomUUID(),options={})=>app.anonymous.request('/api/public/trial-applications',{method:'POST',body:app.input,headers:{'Idempotency-Key':key},csrf:false,...options});

test('public trial HTTP is closed without an explicit field policy; policy endpoint does not expose private data',async t=>{
 const app=await setup(t,{trialFormPolicy:null});const policy=await app.anonymous.request('/api/public/trial-form-policy');assert.equal(policy.status,200,policy.text);assert.deepEqual(policy.body,{policy:null});
 error(await submit(app),503);assert.equal(app.store.people.list({},app.actor.id).total,0);
});

test('anonymous real submit holds one Trial seat and returns only a historical receipt; current Teacher and Admin see the same request',async t=>{
 const app=await setup(t),key=randomUUID(),sent=await submit(app,key);assert.equal(sent.status,201,sent.text);assert.deepEqual(Object.keys(sent.body).sort(),['outcome','reference']);assert.equal(sent.body.outcome,'received');
 const list=await app.teacher.request('/api/trial-applications');assert.equal(list.status,200,list.text);assert.equal(list.body.total,1);assert.equal(list.body.records[0].reference,sent.body.reference);
 const record=list.body.records[0];assert.equal(record.applicant.whatsapp,applicant.whatsapp);assert.equal(record.slot.id,app.slot.id);assert.equal(record.status,'pending');
 assert.deepEqual((await app.admin.request('/api/trial-applications/'+record.id)).body,{application:record});
 const work=await app.teacher.request('/api/trial-applications/work');assert.equal(work.status,200,work.text);assert.equal(work.body.pendingTotal,1);assert.equal(work.body.requests[0].id,record.id);assert.equal(work.body.notifications[0].applicationId,record.id);
 const retry=await submit(app,key);assert.equal(retry.status,201,retry.text);assert.deepEqual(retry.body,sent.body);assert.equal(app.store.people.list({},app.actor.id).total,1);
 error(await submit(app,randomUUID()),409);
 for(const client of [app.anonymous,app.student]){error(await client.request('/api/trial-applications'),client===app.anonymous?401:403);error(await client.request('/api/trial-applications/'+record.id),client===app.anonymous?401:403);}
 const rejected=await app.teacher.request('/api/trial-applications/'+record.id+'/reject',{method:'POST',body:{version:record.version},headers:{'Idempotency-Key':'reject-one'}});assert.equal(rejected.status,200,rejected.text);assert.equal(rejected.body.application.status,'rejected');
 assert.equal((await app.teacher.request('/api/trial-applications/work')).body.pendingTotal,0);assert.equal(app.store.availableSlots.get(app.slot.id,app.actor).trialRemaining,1);
 assert.deepEqual((await submit(app,key)).body,sent.body);assert.equal(app.store.availableSlots.get(app.slot.id,app.actor).trialRemaining,1);
});

test('trial endpoints reject origin method query body and authority violations without creating profiles or leaking contacts',async t=>{
 const app=await setup(t);error(await submit(app,randomUUID(),{requestOrigin:'https://hostile.example.test'}),403);error(await submit(app,randomUUID(),{requestOrigin:null}),403);
 error(await submit(app,randomUUID(),{body:{...app.input,personId:'forged-person'}}),400);error(await submit(app,randomUUID(),{headers:{}}),400);
 error(await app.anonymous.request('/api/public/trial-applications'),405);error(await app.anonymous.request('/api/public/trial-form-policy',{method:'POST',body:{}}),405);
 error(await app.admin.request('/api/trial-applications?page=1&page=2'),400);error(await app.admin.request('/api/trial-applications?email=parent@example.test'),400);
 assert.equal(app.store.people.list({},app.actor.id).total,0);
 const sent=await submit(app);assert.equal(sent.status,201,sent.text);const record=(await app.admin.request('/api/trial-applications')).body.records[0];
 error(await app.teacher.request('/api/trial-applications/'+record.id+'/reject',{method:'POST',body:{version:record.version},csrf:false}),403);
 app.store.accessControl.setTeacherLink(app.resource.id,{version:1,userId:null},app.actor.id);app.store.accessControl.createGrant({userId:app.teacherActor.id,kind:'course',courseId:'public-course'},app.actor.id);
 const denied=await app.teacher.request('/api/trial-applications/'+record.id);assert.ok([403,404].includes(denied.status),denied.text);assert.ok(!denied.text.includes(applicant.email));
 assert.equal((await app.teacher.request('/api/trial-applications/work')).body.pendingTotal,0);
 error(await app.teacher.request('/api/trial-applications/'+record.id+'/reject',{method:'POST',body:{version:record.version}}),404);
});
test('anonymous submission has bounded abuse protection separate from login and never bypasses origin checks',async t=>{
 const app=await setup(t,{trialFormPolicy:null});
 for(let n=0;n<30;n++)error(await submit(app),503);
 const limited=await submit(app);error(limited,429);assert.equal(limited.body.error.code,'TRIAL_RATE_LIMIT');assert.equal(limited.headers.get('retry-after'),'900');
 error(await submit(app,randomUUID(),{requestOrigin:'https://hostile.example.test'}),403);
 const policy=await app.anonymous.request('/api/public/trial-form-policy');assert.equal(policy.status,200);assert.deepEqual(policy.body,{policy:null});
 assert.equal(app.store.people.list({},app.actor.id).total,0);
});
