import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,stat,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {requireSupportedNode,parseLocalOptions,startBuiltDemo} from '../../scripts/start-local.mjs';
import {Client} from '../server/tests/helpers.mjs';

async function environment(t){
 const directory=await mkdtemp(join(tmpdir(),'Beamal downloaded sample ')),staticDir=join(directory,'dist'),dataDir=join(directory,'private demo');
 await mkdir(staticDir);await writeFile(join(staticDir,'index.html'),'<!doctype html><title>Portable Beamal sample</title>');
 t.after(()=>rm(directory,{recursive:true,force:true}));return {directory,staticDir,dataDir};
}
test('portable entry checks the actual minimum runtime and rejects malformed options before starting',()=>{
 for(const version of ['22.13.0','22.23.1','24.0.0','26.1.0'])assert.doesNotThrow(()=>requireSupportedNode(version));
 for(const version of ['18.20.0','20.19.0','22.12.9','not-a-version'])assert.throws(()=>requireSupportedNode(version),/Node.*22\.13/);
 const opts=parseLocalOptions(['--no-open','--port','0','--data-dir','a folder with spaces']);assert.equal(opts.open,false);assert.equal(opts.port,0);assert.match(opts.dataDir,/a folder with spaces$/);
 for(const args of [['--port','-1'],['--port','65536'],['--port','abc'],['--host','0.0.0.0'],['--data-dir'],['--unexpected']])assert.throws(()=>parseLocalOptions(args));
});
test('the real command entry runs when reached through an alias or symbolic link',async t=>{
 const env=await environment(t),alias=join(env.directory,'Launch from shortcut.mjs');await symlink(fileURLToPath(new URL('../../scripts/start-local.mjs',import.meta.url)),alias);
 const {stdout}=await promisify(execFile)(process.execPath,[alias,'--help'],{timeout:10000});assert.match(stdout,/Beamal local demo/);assert.match(stdout,/22\.13/);
});
test('one built server serves the downloaded UI and all three mock logins from the same origin',async t=>{
 const env=await environment(t),app=await startBuiltDemo({...env,port:0,startDate:'2026-10-16'});t.after(()=>app.close());
 assert.match(app.url,/^http:\/\/127\.0\.0\.1:\d+$/);assert.match(await(await fetch(app.url+'/account')).text(),/Portable Beamal sample/);
 assert.deepEqual(await(await fetch(app.url+'/api/health')).json(),{mode:'shared-test',service:'Beamal',storage:'sqlite'});
 for(const [email,role]of [['admin@gmail.com','admin'],['teacher@gmail.com','teacher'],['student@gmail.com','student']]){
  const client=new Client(app.url),login=await client.request('/api/auth/login',{method:'POST',body:{email,password:'000000'},csrf:false,requestOrigin:app.url});assert.equal(login.status,200,login.text);assert.equal(login.body.user.role,role);
  if(role==='admin'){const catalog=await client.request('/api/catalog');assert.equal(catalog.body.courses.length,6);}
  if(role==='student'){const schedule=await client.request('/api/student/timetable?from=2026-10-01&to=2026-11-30');assert.equal(schedule.status,200);assert.equal(schedule.body.students.length,1);assert.equal(schedule.body.lessons.length,7);}
 }
 assert.equal(app.demo.counts.teachers,4);assert.equal(app.demo.counts.students,300);assert.equal(app.demo.counts.paidStudents,1);
 assert.equal((await fetch(app.url+'/.data/local-demo/beamal.sqlite')).status,404);
});
test('restarting a downloaded demo preserves an actual course edit and does not duplicate its cohort',async t=>{
 const env=await environment(t);let app=await startBuiltDemo({...env,port:0,startDate:'2026-10-16'});t.after(()=>app.close());
 const admin=new Client(app.url);await admin.request('/api/auth/login',{method:'POST',body:{email:'admin@gmail.com',password:'000000'},csrf:false,requestOrigin:app.url});
 const course=(await admin.request('/api/catalog')).body.courses[0];
 const changed=await admin.request('/api/courses/'+course.id,{method:'PATCH',requestOrigin:app.url,body:{courseName:'Colleague saved course',category:course.category||'',level:course.level||'',version:course.version}});assert.equal(changed.status,200,changed.text);
 await app.close();app=await startBuiltDemo({...env,port:0,startDate:'2027-02-01'});
 const again=new Client(app.url);assert.equal((await again.request('/api/auth/login',{method:'POST',body:{email:'admin@gmail.com',password:'000000'},csrf:false,requestOrigin:app.url})).status,200);
 const catalog=(await again.request('/api/catalog')).body;assert.equal(catalog.courses.length,6);assert.equal(catalog.courses.find(row=>row.id===course.id).courseName,'Colleague saved course');assert.equal(app.demo.created,false);assert.equal(app.demo.startDate,'2026-10-16');
});
test('an occupied port is preserved and the demo chooses another loopback port',async t=>{
 const env=await environment(t),other=createServer((_req,res)=>res.end('Other project remains running'));
 await new Promise(resolve=>other.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>other.close(resolve)));
 const port=other.address().port,app=await startBuiltDemo({...env,port,startDate:'2026-10-16'});t.after(()=>app.close());assert.notEqual(new URL(app.url).port,String(port));assert.equal(await(await fetch('http://127.0.0.1:'+port)).text(),'Other project remains running');
});
test('missing built UI fails before creating or changing any demo database',async t=>{
 const env=await environment(t);await rm(env.staticDir,{recursive:true});await assert.rejects(startBuiltDemo({...env,port:0}),/build|打包/i);await assert.rejects(stat(env.dataDir),{code:'ENOENT'});
});
