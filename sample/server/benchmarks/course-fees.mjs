import {fork} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {performance,monitorEventLoopDelay} from 'node:perf_hooks';
import {once} from 'node:events';

if(process.argv[2]==='--worker') {
 const config=JSON.parse(process.argv[3]);
 const {createApplication}=await import(config.application);
 const courses=Array.from({length:config.rows},(_,i)=>({id:randomUUID(),courseName:`Fictional course ${String(i+1).padStart(4,'0')}`,feeName:`Fictional base fee ${String(i+1).padStart(4,'0')}`,category:'Performance fixture',level:'Baseline',pricingModel:'package',price:1000+(i%10),packageType:'visits',packageTotal:4,bookingExpiry:null,onlineStore:true}));
 const setupStart=performance.now();
 const app=await createApplication({databasePath:config.databasePath,seedUsers:[{email:'perf-admin@example.test',password:'FictionalBaselinePassword1!',displayName:'Fictional performance admin',role:'admin'}],seedCourses:courses});
 const user=app.store.listUsers()[0];
 for(let i=0;i<config.shared;i++) {
  const courseIds=Array.from({length:config.links},(_,j)=>courses[(i*config.links+j)%courses.length].id);
  app.store.createFee({feeName:`Fictional shared fee ${i+1}`,category:'Shared performance fixture',pricingModel:'fixed-monthly',price:500,months:1,bookingExpiry:null,onlineStore:true,courseIds},user.id);
 }
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const monitor=monitorEventLoopDelay({resolution:1});monitor.enable();
 let origin,resource;
 process.send({kind:'ready',base:`http://127.0.0.1:${app.server.address().port}`,setupMs:performance.now()-setupStart,courseCount:courses.length,feeCount:app.store.listFees().length,links:config.rows+config.shared*config.links});
 process.on('message',async message=>{
  if(message.kind==='start') {monitor.reset();origin=performance.eventLoopUtilization();resource=process.resourceUsage();process.send({kind:'start'});}
  if(message.kind==='metrics') {
   const utilization=performance.eventLoopUtilization(origin),usage=process.resourceUsage();
   process.send({kind:'metrics',loopMaxMs:monitor.max/1e6,loopP95Ms:monitor.percentile(95)/1e6,loopP50Ms:monitor.percentile(50)/1e6,eventLoopUtilization:utilization.utilization,serverCpuMs:(usage.userCPUTime+usage.systemCPUTime-resource.userCPUTime-resource.systemCPUTime)/1000,peakRssMiB:usage.maxRSS/1024});
  }
  if(message.kind==='stop') {monitor.disable();await app.close();process.disconnect();}
 });
} else {
 const source=fileURLToPath(new URL('../',import.meta.url));
 const directory=await mkdtemp(join(tmpdir(),'beamal-service-baseline-'));await mkdir(join(directory,'modules'));
 const manifest={};
 for(const file of ['app.mjs','store.mjs','security.mjs','validation.mjs','materials.mjs']) {
  const bytes=await readFile(join(source,file));manifest[file]=createHash('sha256').update(bytes).digest('hex');await writeFile(join(directory,'modules',file),bytes);
 }
 const datasetConfigs=[{name:'100 courses / 100 base fees',rows:100,shared:0,links:0},{name:'1000 courses / 1000 base fees',rows:1000,shared:0,links:0},{name:'1000 courses / 1100 fees: 100 shared x 10 courses',rows:1000,shared:100,links:10}];
 const smoke=process.argv.includes('--smoke'),readsPerPhase=smoke?3:20;
 const selectedDatasets=smoke?datasetConfigs.slice(0,1):datasetConfigs;
 const results=[];
 const wait=(child,kind)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{cleanup();reject(new Error(`Timed out waiting for ${kind}`));},60000);
  const message=body=>{if(body.kind===kind){cleanup();resolve(body)}};
  const exited=code=>{cleanup();reject(new Error(`Worker exited ${code} before ${kind}`))};
  const cleanup=()=>{clearTimeout(timer);child.off('message',message);child.off('exit',exited)};
  child.on('message',message);child.on('exit',exited);
 });
 const rpc=async(child,kind)=>{const pending=wait(child,kind);child.send({kind});return pending;};
 const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
 const summary=values=>({count:values.length,p50Ms:percentile(values,.5),p95Ms:percentile(values,.95),maxMs:Math.max(...values)});
 let active;
 try {
  for(const config of selectedDatasets) {
   active=fork(fileURLToPath(import.meta.url),['--worker',JSON.stringify({...config,application:join(directory,'modules','app.mjs'),databasePath:join(directory,`${config.rows}-${config.shared}.sqlite`)})],{stdio:['ignore','ignore','pipe','ipc']});
   let stderr='';active.stderr.on('data',data=>stderr+=data.toString());
   const ready=await wait(active,'ready');
   const loginStart=performance.now();
   const login=await fetch(ready.base+'/api/auth/login',{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify({email:'perf-admin@example.test',password:'FictionalBaselinePassword1!'})});
   if(login.status!==200)throw new Error('Benchmark authentication failed');await login.json();
   const cookie=login.headers.get('set-cookie').split(';')[0],loginMs=performance.now()-loginStart;
   const read=async path=>{const start=performance.now();const response=await fetch(ready.base+path,{headers:{Cookie:cookie}});const text=await response.text();if(response.status!==200)throw new Error(`Read failed ${response.status}`);return{milliseconds:performance.now()-start,bytes:Buffer.byteLength(text),text}};
   for(let warm=0;warm<3;warm++)await Promise.all([read('/api/courses'),read('/api/fees')]);
   const row={...config,storage:'isolated temporary file SQLite/WAL',courseCount:ready.courseCount,feeCount:ready.feeCount,associationCount:ready.links,setupMs:ready.setupMs,loginMs,reads:{}};
   const initialCatalog=await read('/api/catalog'),catalogRevision=JSON.parse(initialCatalog.text).revision;
   if(typeof catalogRevision!=='string'||!/^[a-f0-9]{64}$/.test(catalogRevision))throw new Error('Catalog returned an invalid revision');
   const unchangedRoute='/api/catalog?since='+encodeURIComponent(catalogRevision);
   const endpoints=[{label:'/api/courses',route:'/api/courses'},{label:'/api/fees',route:'/api/fees'},{label:'/api/catalog full',route:'/api/catalog'},{label:'/api/catalog unchanged',route:unchangedRoute}];
   for(const {route,label} of endpoints) {
    await rpc(active,'start');const reads=[];
    for(let i=0;i<readsPerPhase;i++)reads.push(await read(route));
    const metrics=await rpc(active,'metrics');
    const body=JSON.parse(reads[0].text);
    if(label==='/api/catalog unchanged') {
     if(body.unchanged!==true||body.revision!==catalogRevision||Object.hasOwn(body,'courses')||Object.hasOwn(body,'fees'))throw new Error('Expected only an unchanged catalog acknowledgement');
    } else if(label==='/api/catalog full') {
     if(body.courses?.length!==ready.courseCount||body.fees?.length!==ready.feeCount)throw new Error('Catalog DTO count mismatch');
     if(body.courses.some(course=>!Array.isArray(course.feeIds)||Object.hasOwn(course,'fees')||Object.hasOwn(course,'price')))throw new Error('Catalog duplicated nested fee or pricing data');
    } else if((route==='/api/courses'?body.courses?.length:body.fees?.length)!==(route==='/api/courses'?ready.courseCount:ready.feeCount))throw new Error('Read DTO count mismatch');
    row.reads[label]={...summary(reads.map(r=>r.milliseconds)),bytes:reads[0].bytes,...metrics};
   }
   await rpc(active,'start');const totals=[],health=[];
   for(let i=0;i<readsPerPhase;i++) {
    const start=performance.now();const [courses,fees,ping]=await Promise.all([read('/api/courses'),read('/api/fees'),read('/api/health')]);
    totals.push(performance.now()-start);health.push(ping.milliseconds);
   }
   row.pollPair={...summary(totals),health:summary(health),bytesPerClientPoll:row.reads['/api/courses'].bytes+row.reads['/api/fees'].bytes,...await rpc(active,'metrics')};
   await rpc(active,'start');const unchangedTotals=[],unchangedHealth=[];
   for(let i=0;i<readsPerPhase;i++) {
    const start=performance.now();const [catalog,ping]=await Promise.all([read(unchangedRoute),read('/api/health')]);
    unchangedTotals.push(performance.now()-start);unchangedHealth.push(ping.milliseconds);
   }
   row.unchangedPoll={...summary(unchangedTotals),health:summary(unchangedHealth),bytesPerClientPoll:row.reads['/api/catalog unchanged'].bytes,...await rpc(active,'metrics')};
   results.push(row);
   const exit=once(active,'exit');active.send({kind:'stop'});await exit;active=null;
   console.log(JSON.stringify({dataset:row.name,...row}));
  }
  console.log(JSON.stringify({kind:'manifest',node:process.version,smoke,readsPerPhase,serverModuleSHA256:manifest,method:`Separate Node server/client processes; temp file SQLite; administrator authenticated; 3 warmup paired reads and 1 initial catalog read; ${readsPerPhase} sequential reads per legacy/full/unchanged endpoint; ${readsPerPhase} parallel course+fee+health cycles and ${readsPerPhase} unchanged-catalog+health cycles; end-to-end local HTTP read timing includes complete response body, excludes client JSON parsing; event-loop delay measured only in server process, 1ms sampling; background host load uncontrolled. Smoke verifies the benchmark only and is not performance acceptance.`}));
 }finally{if(active&&active.exitCode===null&&active.signalCode===null){const stopped=once(active,'exit');active.kill('SIGTERM');await stopped.catch(()=>{});}await rm(directory,{recursive:true,force:true});}
}
