import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../store.mjs';
import {fixture,error,users,seedCourses} from './helpers.mjs';
const day='2026-10-12',path='/api/date-notes/'+day;
async function setup(t,options={}){
 const app=await fixture(t,options),admin=app.client(),teacher=app.client(),student=app.client();
 await admin.login();await teacher.login(2);await student.login(3);return {...app,admin,teacher,student};
}
const save=(client,text,version=0,key)=>client.request(path,{method:'PATCH',body:{text,version},headers:key?{'Idempotency-Key':key}:{}});
test('date notes save raw text directly and stay private between administrators and teachers',async t=>{
 const a=await setup(t),initial=await a.admin.request(path);assert.equal(initial.status,200,initial.text);assert.equal(initial.body.note.version,0);
 const raw='  Private admin note\n私人備忘 <text>  ',saved=await save(a.admin,raw);assert.equal(saved.status,200,saved.text);assert.equal(saved.body.note.text,raw);assert.equal(saved.body.note.version,1);
 assert.equal((await a.admin.request(path)).body.note.text,raw);assert.equal((await a.teacher.request(path)).body.note.text,'');
 const teacher=await save(a.teacher,'Teacher private note');assert.equal(teacher.status,200,teacher.text);assert.equal((await a.admin.request(path)).body.note.text,raw);
 const admin2=a.client();await admin2.login(1);assert.equal((await admin2.request(path)).body.note.version,0);
 for(const client of [a.student,a.client()]){error(await client.request(path),client===a.student?403:401);error(await save(client,'forged'),client===a.student?403:401);}
 error(await a.teacher.request(path+'?userId=admin'),400);
});
test('date-note versions prevent stale overwrites and retries save only once while clearing remains durable',async t=>{
 const a=await setup(t),saved=await save(a.admin,'First',0,'date-note-retry');assert.equal(saved.status,200,saved.text);
 const retry=await save(a.admin,'First',0,'date-note-retry');assert.deepEqual(retry.body,saved.body);
 error(await save(a.admin,'Stale',0),409);error(await save(a.admin,'Different',0,'date-note-retry'),409);
 const cleared=await save(a.admin,'',1);assert.equal(cleared.status,200,cleared.text);assert.equal(cleared.body.note.version,2);assert.equal((await a.admin.request(path)).body.note.text,'');
 error(await save(a.teacher,' \n '),400);assert.equal((await a.teacher.request(path)).body.note.version,0);
});
test('date notes reject invalid dates payloads unsafe requests and unsupported methods',async t=>{
 const a=await setup(t);
 for(const date of ['2026-02-30','0000-01-01','2026-1-1','wrong'])error(await a.admin.request('/api/date-notes/'+date),400);
 for(const body of [{version:0,text:null},{version:0,text:'a'.repeat(2001)},{version:0,text:'valid',userId:'someone'},{version:0,text:'valid',date:'2026-10-13'}])error(await a.admin.request(path,{method:'PATCH',body}),400);
 error(await a.admin.request(path,{method:'PATCH',body:{text:'missing version'}}),409);
 error(await a.admin.request(path,{method:'PATCH',body:{version:0,text:'unsafe'},csrf:false}),403);
 error(await a.admin.request(path,{method:'POST',body:{version:0,text:'wrong method'}}),405);
 const saved=await save(a.admin,'a'.repeat(2000));assert.equal(saved.status,200,saved.text);
});
test('private date notes survive a server restart and never enter student or public timetable data',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-private-date-'));t.after(()=>rm(directory,{recursive:true,force:true}));const databasePath=join(directory,'notes.sqlite');
 const a=await setup(t,{databasePath}),saved=await save(a.admin,'PRIVATE DATE NOTE');assert.equal(saved.status,200,saved.text);
 for(const [client,url] of [[a.client(),'/api/public/timetable?from=2026-10-12&days=7'],[a.student,'/api/student/timetable?from=2026-10-01&to=2026-10-31']]){const result=await client.request(url);assert.equal(result.status,200,result.text);assert.ok(!result.text.includes('PRIVATE DATE NOTE'));}
 const actor=(await a.admin.request('/api/auth/session')).body.user;await a.close();const next=await createStore({databasePath,seedUsers:users,seedCourses});t.after(()=>next.close());assert.deepEqual(next.dateNotes.get(day,actor),saved.body.note);
});

test('calendar indicators return only this account’s nonblank note dates within a bounded window',async t=>{
 const a=await setup(t),url='/api/date-notes?from=2026-10-12&to=2026-10-18';assert.equal((await save(a.admin,'Private')).status,200);assert.equal((await save(a.teacher,'Teacher private')).status,200);
 const initial=await a.admin.request(url);assert.equal(initial.status,200,initial.text);assert.deepEqual(initial.body,{dates:[day]});assert.ok(!initial.text.includes('Private'));
 const admin2=a.client();await admin2.login(1);assert.deepEqual((await admin2.request(url)).body,{dates:[]});assert.deepEqual((await a.admin.request('/api/date-notes?from=2026-10-13&to=2026-10-18')).body,{dates:[]});
 await save(a.admin,' \n ',1);assert.deepEqual((await a.admin.request(url)).body,{dates:[]});assert.deepEqual((await a.teacher.request(url)).body,{dates:[day]});
 error(await a.student.request(url),403);error(await a.client().request(url),401);
 for(const query of ['from=2026-02-30&to=2026-10-18','from=2026-10-18&to=2026-10-12','from=2026-01-01&to=2026-10-18','from=2026-10-12','from=2026-10-12&to=2026-10-18&userId=another'])error(await a.admin.request('/api/date-notes?'+query),400);
});
