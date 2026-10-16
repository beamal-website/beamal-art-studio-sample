import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,error,noCredentials} from './helpers.mjs';

const application=(overrides={})=>({courseId:'public-course',courseName:'Untrusted course label',studentNameZh:'陳小明',studentNameEn:'Ming Chan',birthDate:'2019-05-01',school:'Harbour School',referrerName:'Ms Lee',interestedTimeslot:'Saturday afternoon',whatsappNumber:'+852 1234 5678',email:'parent@example.test',parentName:'陳家長',...overrides});

test('anonymous trial application saves all requested fields to SQLite and returns only a reference',async t=>{
 const app=await fixture(t),visitor=app.client(),response=await visitor.request('/api/trial-applications',{method:'POST',body:application()});
 assert.equal(response.status,201,response.text);noCredentials(response);
 assert.deepEqual(Object.keys(response.body.application).sort(),['createdAt','id','status']);
 const saved=app.store.trialApplications.get(response.body.application.id);
 assert.deepEqual(saved,{id:response.body.application.id,courseId:'public-course',courseName:'Published art',studentNameZh:'陳小明',studentNameEn:'Ming Chan',birthDate:'2019-05-01',school:'Harbour School',referrerName:'Ms Lee',interestedTimeslot:'Saturday afternoon',whatsappNumber:'+852 1234 5678',email:'parent@example.test',parentName:'陳家長',status:'new',createdAt:response.body.application.createdAt});
});

test('fixed studio courses can save a course-name snapshot without a database course ID',async t=>{
 const app=await fixture(t),response=await app.client().request('/api/trial-applications',{method:'POST',body:application({courseId:'',courseName:'Pre-Baby Class'})});
 assert.equal(response.status,201,response.text);
 const saved=app.store.trialApplications.get(response.body.application.id);assert.equal(saved.courseId,null);assert.equal(saved.courseName,'Pre-Baby Class');
});

test('trial applications reject unpublished courses, invalid fields and disallowed origins',async t=>{
 const app=await fixture(t),client=app.client();
 error(await client.request('/api/trial-applications',{method:'POST',body:application({courseId:'private-course'})}),404);
 error(await client.request('/api/trial-applications',{method:'POST',body:application({email:'not-an-email'})}),400);
 error(await client.request('/api/trial-applications',{method:'POST',body:{...application(),unexpected:'private field'}}),400);
 error(await client.request('/api/trial-applications',{method:'POST',body:application(),requestOrigin:null}),403);
});