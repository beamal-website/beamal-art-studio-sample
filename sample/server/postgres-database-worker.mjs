import {Client,types} from 'pg';
import {parentPort,workerData} from 'node:worker_threads';

types.setTypeParser(20,value=>{const number=Number(value);return Number.isSafeInteger(number)?number:value;});
const client=new Client({connectionString:workerData.connectionString,connectionTimeoutMillis:15000,application_name:'beamal-render-api'}),port=workerData.port;
try{await client.connect();parentPort.postMessage({ready:true});}
catch(error){parentPort.postMessage({ready:false,error:{message:error.message,code:error.code}});process.exitCode=1;}

if(process.exitCode!==1){
 let queue=Promise.resolve();
 const respond=(request,result)=>{port.postMessage({id:request.id,...result});Atomics.store(new Int32Array(request.signal),0,1);Atomics.notify(new Int32Array(request.signal),0);};
 port.on('message',request=>{queue=queue.then(async()=>{
  if(request.action==='close'){try{await client.end();respond(request,{closed:true});}catch(error){respond(request,{error:{message:error.message,code:error.code}});}port.close();return;}
  try{const result=await client.query({text:request.sql,values:request.values||[]});respond(request,{rows:result.rows,rowCount:result.rowCount,command:result.command});}
  catch(error){respond(request,{error:{message:error.message,code:error.code,detail:error.detail}});}
 });});
}