import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fixture,error,users} from './helpers.mjs';

test('archived QA records leave normal lists and direct material access without deleting history or unrelated staff',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-archive-'));t.after(()=>rm(directory,{recursive:true,force:true}));const path=join(directory,'sample.sqlite'),app=await fixture(t,{databasePath:path}),admin=app.client();await admin.login();
 const post=async(path,body)=>(await admin.request(path,{method:'POST',body})).body;
 const resource=(await post('/api/scheduling-resources',{kind:'teacher',displayName:'QA extra'})).resource;
 const retained=(await post('/api/scheduling-resources',{kind:'teacher',displayName:'Adopted teacher'})).resource;
 const person=(await post('/api/people',{displayName:'QA applicant'})).person;
 const material=(await post('/api/courses/public-course/materials',{name:'QA material'})).material;
 const teacher=app.client();await teacher.login(2);
 const db=new DatabaseSync(path);t.after(()=>db.close());
 for(const [table,id]of[['scheduling_resources',resource.id],['people',person.id],['materials',material.id],['users',app.store.userByEmail(users[2].email).id]])db.prepare(`UPDATE ${table} SET archived_at=? WHERE id=?`).run('2026-10-19T00:00:00.000Z',id);
 const resources=(await admin.request('/api/scheduling-resources')).body.resources;assert.equal(resources.some(row=>row.id===resource.id),false);assert.ok(resources.some(row=>row.id===retained.id));
 assert.equal((await admin.request('/api/people')).body.total,0);error(await admin.request('/api/people/'+person.id),404);
 assert.deepEqual((await admin.request('/api/courses/public-course/materials')).body.materials,[]);error(await admin.request('/api/materials/'+material.id),404);
 assert.equal((await teacher.request('/api/auth/session')).body.user,null);error(await app.client().request('/api/auth/login',{method:'POST',body:{email:users[2].email,password:users[2].password},csrf:false}),401);
 assert.equal(app.store.listUsers().some(row=>row.email===users[2].email),false);
 for(const [table,id]of[['scheduling_resources',resource.id],['people',person.id],['materials',material.id]])assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE id=?`).get(id).n,1);
 assert.ok(db.prepare('SELECT COUNT(*) AS n FROM material_audit_log WHERE material_id=?').get(material.id).n);
 for(const [table,id]of[['scheduling_resources',resource.id],['people',person.id],['materials',material.id]])db.prepare(`UPDATE ${table} SET archived_at=NULL WHERE id=?`).run(id);
 assert.ok((await admin.request('/api/scheduling-resources')).body.resources.some(row=>row.id===resource.id));assert.equal((await admin.request('/api/people')).body.total,1);assert.equal((await admin.request('/api/materials/'+material.id)).status,200);
});
