import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixture,error,users,seedCourses} from './helpers.mjs';
import {createStore} from '../store.mjs';
async function setup(t){
 const directory=await mkdtemp(join(tmpdir(),'beamal-student-records-'));t.after(()=>rm(directory,{recursive:true,force:true}));const databasePath=join(directory,'records.sqlite'),a=await fixture(t,{databasePath}),admin=a.client(),teacher=a.client(),family=a.client(),other=a.client();await admin.login();await teacher.login(2);await family.login(3);await other.login(4);
 const db=new DatabaseSync(databasePath),now=new Date().toISOString();for(const[id,name]of[['student-a','Fictional student A'],['student-b','Fictional student B']])db.prepare("INSERT INTO people(id,kind,display_name,profile,search_text,version,created_at,updated_at) VALUES (?,'student',?,?,?,1,?,?)").run(id,name,JSON.stringify({displayName:name}),name,now,now);db.close();
 const account=a.store.listUsers().find(u=>u.email===users[3].email);const linked=await admin.request('/api/people/student-a/account-link',{method:'PATCH',body:{userId:account.id,version:0}});assert.equal(linked.status,200,linked.text);
 return {...a,admin,teacher,family,other,databasePath};
}
const save=(client,body,id,key)=>client.request('/api/student-records'+(id?'/'+id:''),{method:id?'PATCH':'POST',body,headers:key?{'Idempotency-Key':key}:{}});
const journal=(content='Private note',visibility='internal')=>({kind:'journal',studentId:'student-a',content,visibility});
test('student journals are durable, author-attributed, versioned and private unless explicitly shared',async t=>{
 const a=await setup(t),first=await save(a.admin,journal(),null,'journal-once');assert.equal(first.status,201,first.text);assert.equal(first.body.record.staffName,'Manager A');assert.deepEqual((await save(a.admin,journal(),null,'journal-once')).body,first.body);
 assert.deepEqual((await a.family.request('/api/student/records')).body.records,[]);error(await save(a.teacher,journal()),403);error(await a.teacher.request('/api/student-records?kind=journal'),403);error(await a.other.request('/api/student-records?kind=journal'),403);error(await a.client().request('/api/student/records'),401);
 const id=first.body.record.id;error(await save(a.admin,{version:0,content:'Stale'},id),409);const shared=await save(a.admin,{version:1,visibility:'student'},id);assert.equal(shared.status,200,shared.text);assert.equal((await a.family.request('/api/student/records')).body.records[0].content,'Private note');assert.deepEqual((await a.other.request('/api/student/records')).body.records,[]);
 const profile=await a.admin.request('/api/people/student-a/workspace');assert.equal(profile.status,200,profile.text);assert.equal(profile.body.records[0].id,id);assert.equal(profile.body.recordLogs.length,2);assert.ok(profile.body.accountLink?.displayName);assert.equal((await a.admin.request('/api/people/student-b/workspace')).body.accountLink,null);error(await a.family.request('/api/people/student-a/workspace'),403);
 const actor=(await a.admin.request('/api/auth/session')).body.user;await a.close();const restarted=await createStore({databasePath:a.databasePath,seedUsers:users,seedCourses});t.after(()=>restarted.close());assert.equal(restarted.studentRecords.get(id,actor).content,'Private note');
});
test('assessment templates snapshot their rubric, reject incomplete grades and share only completed selected assessments',async t=>{
 const a=await setup(t),template=await save(a.admin,{kind:'template',title:'Painting review',description:'Observe progress',category:'Art',skills:['Colour','Observation'],evaluations:['Developing','Confident']});assert.equal(template.status,201,template.text);
 const draft={kind:'assessment',studentId:'student-a',templateId:template.body.record.id,courseId:'public-course',ratings:{Colour:'Confident'},comment:'Progress',status:'draft',visibility:'student'},assessment=await save(a.admin,draft);assert.equal(assessment.status,201,assessment.text);assert.deepEqual((await a.family.request('/api/student/records')).body.records,[]);
 error(await save(a.admin,{...draft,status:'graded'}),400);error(await save(a.admin,{...draft,ratings:{Intruder:'Confident'}}),400);
 const changed=await save(a.admin,{version:1,skills:['New skill']},template.body.record.id);assert.equal(changed.status,200,changed.text);
 const graded=await save(a.admin,{version:1,status:'graded',ratings:{Colour:'Confident',Observation:'Developing'}},assessment.body.record.id);assert.equal(graded.status,200,graded.text);assert.deepEqual(graded.body.record.template.skills,['Colour','Observation']);assert.equal((await a.family.request('/api/student/records')).body.records[0].id,assessment.body.record.id);error(await save(a.admin,{version:2,studentId:'student-b'},assessment.body.record.id),400);
});
test('notices publish only to selected families, sign exact revisions and retain previous signatures without leaking other recipients',async t=>{
 const a=await setup(t),draft={kind:'notice',title:'Term information',content:'Please read this notice',date:'2001-01-01',signDeadline:'',studentIds:['student-a','student-b'],status:'draft'},notice=await save(a.admin,draft);assert.equal(notice.status,201,notice.text);assert.deepEqual((await a.family.request('/api/student/records')).body.records,[]);
 const published=await save(a.admin,{version:1,status:'published'},notice.body.record.id),id=notice.body.record.id;assert.equal(published.status,200,published.text);const family=await a.family.request('/api/student/records');assert.equal(family.body.records.length,1);assert.deepEqual(family.body.records[0].studentIds,['student-a']);assert.ok(!family.text.includes('student-b'));
 assert.equal((await a.admin.request('/api/people/student-a/workspace')).body.records[0].id,id);assert.equal((await a.admin.request('/api/people/student-a/workspace')).body.recordLogs.length,2);assert.deepEqual((await a.admin.request('/api/student-records/'+id)).body.record.recipientNames,['Fictional student A','Fictional student B']);
 const sign=fields=>a.family.request('/api/student-records/'+id+'/sign',{method:'POST',body:fields});error(await a.other.request('/api/student-records/'+id+'/sign',{method:'POST',body:{studentId:'student-a',version:2}}),404);error(await sign({studentId:'student-a',version:1}),409);assert.equal((await sign({studentId:'student-a',version:2})).status,200);assert.equal((await sign({studentId:'student-a',version:2})).status,200);assert.equal((await a.admin.request('/api/student-records/'+id)).body.record.signatures.length,1);
 const updated=await save(a.admin,{version:2,content:'Changed terms'},id);assert.equal(updated.status,200,updated.text);const current=(await a.family.request('/api/student/records')).body.records[0];assert.equal(current.version,3);assert.equal(current.signatures[0].version,2,'A former signature is never silently applied to changed content');
 await save(a.admin,{version:3,signDeadline:'2001-01-02'},id);error(await sign({studentId:'student-a',version:4}),409);
});
test('case follow-up is validated and archived with history rather than changing lessons or payments',async t=>{
 const a=await setup(t),entry=await save(a.admin,{kind:'case',studentId:'student-a',type:'leave',title:'One day leave',content:'Follow up',date:'2026-10-19',status:'open',result:''});assert.equal(entry.status,201,entry.text);const id=entry.body.record.id;
 error(await save(a.admin,{version:1,status:'closed'},id),400);const closed=await save(a.admin,{version:1,status:'closed',result:'Parent contacted'},id);assert.equal(closed.status,200,closed.text);assert.deepEqual((await a.family.request('/api/student/records')).body.records,[]);
 assert.equal((await a.admin.request('/api/people/student-a/workspace')).body.orders.length,0);const archived=await save(a.admin,{version:2,archived:true},id);assert.equal(archived.status,200,archived.text);error(await a.admin.request('/api/student-records/'+id),404);assert.equal((await a.admin.request('/api/student-records?kind=case')).body.total,0);assert.equal((await a.admin.request('/api/people/student-a/workspace')).body.recordLogs.length,3);
});
test('student record boundaries reject forged owners, invalid queries, unsafe writes and unsupported methods',async t=>{
 const a=await setup(t);for(const body of [null,[],{...journal(),actorId:'forged'},journal('x'.repeat(10001)),{...journal(),studentId:'missing'},{kind:'template',title:'Bad',skills:['Same','Same'],evaluations:['Good']}]){const result=await save(a.admin,body);assert.ok([400,404].includes(result.status),result.text);}
 error(await a.admin.request('/api/student-records?kind=journal&userId=other'),400);error(await a.admin.request('/api/student-records?kind=journal&pageSize=101'),400);error(await a.admin.request('/api/student-records',{method:'POST',body:journal(),csrf:false}),403);error(await a.admin.request('/api/student-records',{method:'DELETE',body:{}}),405);
 const created=await save(a.admin,journal('First'));const id=created.body.record.id;const replies=await Promise.all([save(a.admin,{version:1,content:'A'},id),save(a.admin,{version:1,content:'B'},id)]);assert.deepEqual(replies.map(r=>r.status).sort(),[200,409]);
});
