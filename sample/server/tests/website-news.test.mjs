import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,error} from './helpers.mjs';
const post={title:'Shared title',titleEn:'Shared English',description:'Description',descriptionEn:'English description',content:'Full content',contentEn:'Full English',releaseDate:'2026-01-01',image:''};
test('news is shared across browsers, administrator only, versioned and filtered by publication date',async t=>{
 const a=await fixture(t),admin=a.client(),other=a.client(),teacher=a.client(),publicClient=a.client();await admin.login();await other.login(1);await teacher.login(2);
 const created=await admin.request('/api/news',{method:'POST',body:post});assert.equal(created.status,201,created.text);const item=created.body.post;
 assert.ok((await publicClient.request('/api/public/news')).body.posts.some(row=>row.id===item.id&&row.titleEn==='Shared English'));
 assert.ok((await other.request('/api/news')).body.posts.some(row=>row.id===item.id));
 const changed=await other.request('/api/news/'+item.id,{method:'PATCH',body:{...post,title:'Updated',version:item.version}});assert.equal(changed.status,200,changed.text);
 error(await admin.request('/api/news/'+item.id,{method:'PATCH',body:{...post,version:item.version}}),409);
 const future=await admin.request('/api/news',{method:'POST',body:{...post,title:'Future',releaseDate:'2099-01-01'}});assert.equal(future.status,201,future.text);
 assert.ok(!(await publicClient.request('/api/public/news')).text.includes('Future'));assert.ok((await other.request('/api/news')).text.includes('Future'));
 error(await teacher.request('/api/news'),403);error(await teacher.request('/api/news',{method:'POST',body:post}),403);error(await publicClient.request('/api/news'),401);
 error(await admin.request('/api/news',{method:'POST',body:post,csrf:false}),403);
});
test('legacy news imports preserve custom records, retry safely and never overwrite a collaborator edit',async t=>{
 const a=await fixture(t),admin=a.client();await admin.login();
 const legacy={...post,id:'N1006',title:'Local custom story'};
 const first=await admin.request('/api/news/import',{method:'POST',body:{posts:[legacy]}});assert.equal(first.status,200,first.text);
 await admin.request('/api/news/import',{method:'POST',body:{posts:[legacy]}});
 let rows=(await admin.request('/api/news')).body.posts;assert.equal(rows.filter(row=>row.title===legacy.title).length,1);
 const imported=rows.find(row=>row.title===legacy.title);await admin.request('/api/news/'+imported.id,{method:'PATCH',body:{...post,title:'Collaborator update',version:imported.version}});
 await admin.request('/api/news/import',{method:'POST',body:{posts:[legacy]}});rows=(await admin.request('/api/news')).body.posts;
 assert.equal(rows.find(row=>row.id===imported.id).title,'Collaborator update');
 error(await admin.request('/api/news',{method:'POST',body:{...post,image:'https://untrusted/image'}}),400);
 error(await admin.request('/api/news',{method:'POST',body:{...post,releaseDate:'2026-02-30'}}),400);
});

test('shared news and its import receipts survive a database restart with dates images and translations intact',async t=>{
 const {mkdtemp,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{createStore}=await import('../store.mjs');
 const directory=await mkdtemp(join(tmpdir(),'beamal-news-'));t.after(()=>rm(directory,{recursive:true,force:true}));const databasePath=join(directory,'news.sqlite');
 const a=await fixture(t,{databasePath}),admin=a.client();await admin.login();const actor=(await admin.request('/api/auth/session')).body.user;
 const imported={...post,id:'local-persisted',title:'Persistent imported news',image:'/assets/beamal-canvas.jpg'};
 assert.equal((await admin.request('/api/news/import',{method:'POST',body:{posts:[imported]}})).status,200);
 const before=(await admin.request('/api/news')).body.posts.find(row=>row.title===imported.title);await a.close();
 const next=await createStore({databasePath,seedUsers:[],seedCourses:[]});t.after(()=>next.close());
 assert.deepEqual(next.websiteNews.list({user:actor}).posts.find(row=>row.id===before.id),before);
 assert.equal(next.websiteNews.importLegacy({posts:[imported]},actor).imported,0);
 assert.equal(next.websiteNews.list({publicOnly:true}).posts.filter(row=>row.id===before.id).length,1);
});

test('deleting website news removes the same item publicly and privately without accepting stale or unauthorized requests',async t=>{
 const a=await fixture(t),admin=a.client(),teacher=a.client(),visitor=a.client();await admin.login();await teacher.login(2);
 const created=await admin.request('/api/news',{method:'POST',body:post});const item=created.body.post;
 error(await teacher.request('/api/news/'+item.id,{method:'DELETE',body:{version:item.version}}),403);
 error(await visitor.request('/api/news/'+item.id,{method:'DELETE',body:{version:item.version}}),401);
 error(await admin.request('/api/news/'+item.id,{method:'DELETE',body:{version:item.version},csrf:false}),403);
 const updated=await admin.request('/api/news/'+item.id,{method:'PATCH',body:{...post,title:'Current title',version:item.version}});
 error(await admin.request('/api/news/'+item.id,{method:'DELETE',body:{version:item.version}}),409);
 assert.ok((await visitor.request('/api/public/news')).body.posts.some(row=>row.id===item.id&&row.title==='Current title'));
 const deletion={method:'DELETE',body:{version:updated.body.post.version},headers:{'Idempotency-Key':'news-delete-exact-operation'}};const removed=await admin.request('/api/news/'+item.id,deletion);assert.equal(removed.status,200,removed.text);assert.deepEqual((await admin.request('/api/news/'+item.id,deletion)).body,removed.body);
 assert.ok(!(await visitor.request('/api/public/news')).body.posts.some(row=>row.id===item.id));assert.ok(!(await admin.request('/api/news')).body.posts.some(row=>row.id===item.id));
 error(await admin.request('/api/news/'+item.id,{method:'PATCH',body:{...post,version:removed.body.post.version}}),404);
});

test('deleted built-in news stays deleted after restart and a legacy import cannot revive it',async t=>{
 const {mkdtemp,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{createStore}=await import('../store.mjs');
 const directory=await mkdtemp(join(tmpdir(),'beamal-deleted-news-'));t.after(()=>rm(directory,{recursive:true,force:true}));const databasePath=join(directory,'news.sqlite');
 const a=await fixture(t,{databasePath}),admin=a.client();await admin.login();const actor=(await admin.request('/api/auth/session')).body.user;
 const item=(await admin.request('/api/news')).body.posts.find(row=>row.id==='sample-news-1');assert.ok(item);
 const removed=await admin.request('/api/news/'+item.id,{method:'DELETE',body:{version:item.version}});assert.equal(removed.status,200,removed.text);await a.close();
 const next=await createStore({databasePath,seedUsers:[],seedCourses:[]});t.after(()=>next.close());
 assert.ok(!next.websiteNews.list({publicOnly:true}).posts.some(row=>row.id===item.id));
 next.websiteNews.importLegacy({posts:[{...post,id:item.id,title:'Old local copy'}]},actor);
 assert.ok(!next.websiteNews.list({user:actor}).posts.some(row=>row.title==='Old local copy'||row.id===item.id));
});
