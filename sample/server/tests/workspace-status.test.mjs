import test from 'node:test';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {fixture,error} from './helpers.mjs';
import {DatabaseSync} from 'node:sqlite';
import {createWorkspaceStatusStore} from '../workspace-status.mjs';
const tags=[{id:'follow-up',name:'待聯絡',color:'yellow'}];
test('staff share four independent versioned status configurations while visitors and parents cannot edit them',async t=>{
 const a=await fixture(t),admin=a.client(),teacher=a.client(),parent=a.client();await admin.login();await teacher.login(2);await parent.login(3);
 const base='/api/workspace-status/';
 const first=await teacher.request(base+'trial');assert.equal(first.status,200,first.text);
 const save=await teacher.request(base+'trial',{method:'PATCH',body:{tags,version:0},headers:{'Idempotency-Key':'status-config-1'}});assert.equal(save.status,200,save.text);
 assert.deepEqual((await admin.request(base+'trial')).body.tags,tags);
 for(const category of ['rescheduling','payment','other'])assert.equal((await admin.request(base+category)).body.version,0);
 error(await admin.request(base+'trial',{method:'PATCH',body:{tags,version:0}}),409);
 error(await teacher.request(base+'trial',{method:'PATCH',body:{tags:[{...tags[0],name:'中'.repeat(11)}],version:1}}),400);
 error(await teacher.request(base+'trial',{method:'PATCH',body:{tags,version:1},csrf:false}),403);
 error(await parent.request(base+'trial'),403);error(await a.client().request(base+'trial'),401);
 error(await teacher.request(base+'trial/item',{method:'PATCH',body:{key:'trial:missing',tagId:'follow-up',version:0}}),404);
 const replay=await teacher.request(base+'trial',{method:'PATCH',body:{tags,version:0},headers:{'Idempotency-Key':'status-config-1'}});assert.deepEqual(replay.body,save.body);
});
test('item status is shared, protected by source authorization and versioned independently of other lists',()=>{
 const database=new DatabaseSync(':memory:'),allowed=new Set(['trial:a']);
 const store=createWorkspaceStatusStore({database,transaction:fn=>fn(),authorizeItem(category,key){if(!allowed.has(key))throw new Error('Forbidden source');}}),user={role:'teacher'},other={role:'admin'};
 store.saveTags('trial',{tags,version:0},user);
 assert.deepEqual(store.assign('trial',{key:'trial:a',tagId:'follow-up',version:0},user),{key:'trial:a',tagId:'follow-up',version:1});
 assert.equal(store.read('trial',['trial:a'],other).items[0].tagId,'follow-up');
 assert.throws(()=>store.assign('trial',{key:'trial:a',tagId:null,version:0},other));
 allowed.clear();assert.throws(()=>store.read('trial',['trial:a'],user));assert.throws(()=>store.assign('trial',{key:'trial:a',tagId:null,version:1},user));
 allowed.add('trial:a');store.saveTags('trial',{tags:[],version:1},other);assert.equal(store.read('trial',['trial:a'],user).items[0].tagId,null);
 database.close();
});

test('a real trial item status is visible to authorized colleagues without changing the application or reserved seats',async t=>{
 const a=await fixture(t,{trialFormPolicy:'name-birth-whatsapp'}),admin=a.client(),teacher=a.client(),publicClient=a.client();const manager=(await admin.login()).body.user,staff=(await teacher.login(2)).body.user;
 const resource=a.store.schedulingResources.create({kind:'teacher',displayName:'Status trial teacher'},manager.id);a.store.accessControl.setTeacherLink(resource.id,{version:0,userId:staff.id},manager.id);
 const slot=a.store.availableSlots.create({courseId:'public-course',date:'2026-10-20',time:'13:00',duration:60,teacherIds:[resource.id],roomIds:[],trialCapacity:1,trialEnabled:true,active:true},manager.id);
 const source=await publicClient.request('/api/public/courses/public-course?from=2026-10-19&days=7');
 const submitted=await publicClient.request('/api/public/trial-applications',{method:'POST',csrf:false,headers:{'Idempotency-Key':randomUUID()},body:{courseId:'public-course',slotId:slot.id,from:'2026-10-19',days:7,revision:source.body.revision,applicant:{localName:'測試學生',fullName:'Test Child',dateOfBirth:'2016-03-12',gender:'unspecified',school:'',referrer:'',parentName:'Test Parent',whatsapp:'61234567',email:'',remark:''}}});assert.equal(submitted.status,201,submitted.text);
 const records=a.store.trialApplications.list({page:1,pageSize:20},manager).records||a.store.trialApplications.list({page:1,pageSize:20},manager).applications;
 const id=records?.[0]?.id||submitted.body.application?.id;assert.ok(id,JSON.stringify(submitted.body));const key='trial:'+id;
 const saved=await admin.request('/api/workspace-status/trial/item',{method:'PATCH',body:{key,tagId:'in-progress',version:0}});assert.equal(saved.status,200,saved.text);
 const read=await teacher.request('/api/workspace-status/trial?keys='+encodeURIComponent(JSON.stringify([key])));assert.equal(read.status,200,read.text);assert.equal(read.body.items[0].tagId,'in-progress');
 assert.equal(a.store.trialApplications.get(id,manager).status,'pending');assert.equal(a.store.availableSlots.get(slot.id,manager).trialReserved,1);
});

test('status definitions and item choices survive a database restart',async t=>{
 const {mkdtemp,rm}=await import('node:fs/promises'),{join}=await import('node:path'),{tmpdir}=await import('node:os');const directory=await mkdtemp(join(tmpdir(),'beamal-status-'));t.after(()=>rm(directory,{recursive:true,force:true}));const path=join(directory,'status.sqlite'),user={role:'admin'};
 let db=new DatabaseSync(path),store=createWorkspaceStatusStore({database:db,transaction:fn=>fn(),authorizeItem:()=>{}});store.saveTags('trial',{tags,version:0},user);store.assign('trial',{key:'trial:real-record',tagId:'follow-up',version:0},user);db.close();
 db=new DatabaseSync(path);try{store=createWorkspaceStatusStore({database:db,transaction:fn=>fn(),authorizeItem:()=>{}});const data=store.read('trial',['trial:real-record'],user);assert.deepEqual(data.tags,tags);assert.equal(data.items[0].tagId,'follow-up');assert.equal(store.read('payment',[],user).version,0);}finally{db.close();}
});
