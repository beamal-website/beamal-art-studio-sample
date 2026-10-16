import {MessageChannel,Worker,receiveMessageOnPort} from 'node:worker_threads';

const pragmaTableInfo=/^\s*PRAGMA\s+table_info\s*\(\s*['"]?([a-z0-9_]+)['"]?\s*\)\s*;?\s*$/i;

export function translateSql(source){
 let sql=String(source).trim();if(!sql)return '';
 const pragma=pragmaTableInfo.exec(sql);if(pragma){const name=pragma[1].replaceAll("'","''");return `SELECT column_name AS name, data_type AS type, ordinal_position AS cid FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='${name}' ORDER BY ordinal_position`;}
 if(/^PRAGMA\b/i.test(sql))return '';
 const ignore=/^INSERT\s+OR\s+IGNORE\s+INTO\b/i.test(sql);
 sql=sql.replace(/^INSERT\s+OR\s+IGNORE\s+INTO\b/i,'INSERT INTO')
  .replace(/\bINTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT\b/gi,'BIGSERIAL PRIMARY KEY')
  .replace(/\s+COLLATE\s+NOCASE\b/gi,'')
  .replace(/\bBEGIN\s+IMMEDIATE\b/gi,'BEGIN')
    .replace(/\bMAX\s*\(\s*([a-z_][a-z0-9_.]*)\s*,\s*([^()]+)\)/gi,'GREATEST($1, $2)')
    .replace(/\binstr\s*\(\s*([^,]+),\s*([^)]*)\)/gi,'strpos($1, $2)');
 if(ignore&&!/\bON\s+CONFLICT\b/i.test(sql))sql+=' ON CONFLICT DO NOTHING';
 return sql.replace(/;\s*$/,'');
}

export function replacePlaceholders(source){
 let result='',index=0,quote='',lineComment=false,blockComment=false;
 for(let position=0;position<source.length;position++){
  const char=source[position],next=source[position+1];
  if(lineComment){result+=char;if(char==='\n')lineComment=false;continue;}
  if(blockComment){result+=char;if(char==='*'&&next==='/'){result+='/';position++;blockComment=false;}continue;}
  if(quote){result+=char;if(char===quote){if(next===quote){result+=next;position++;}else quote='';}continue;}
  if(char==='-'&&next==='-'){result+='--';position++;lineComment=true;continue;}
  if(char==='/'&&next==='*'){result+='/*';position++;blockComment=true;continue;}
  if(char==="'"||char==='"'){quote=char;result+=char;continue;}
  if(char==='?'){result+='$'+(++index);continue;}
  result+=char;
 }
 return result;
}

function statements(source){
 const result=[];let current='',quote='',lineComment=false,blockComment=false;
 for(let position=0;position<source.length;position++){
  const char=source[position],next=source[position+1];
  if(lineComment){current+=char;if(char==='\n')lineComment=false;continue;}
  if(blockComment){current+=char;if(char==='*'&&next==='/'){current+='/';position++;blockComment=false;}continue;}
  if(quote){current+=char;if(char===quote){if(next===quote){current+=next;position++;}else quote='';}continue;}
  if(char==='-'&&next==='-'){current+='--';position++;lineComment=true;continue;}
  if(char==='/'&&next==='*'){current+='/*';position++;blockComment=true;continue;}
  if(char==="'"||char==='"'){quote=char;current+=char;continue;}
  if(char===';'){if(current.trim())result.push(current.trim());current='';continue;}
  current+=char;
 }
 if(current.trim())result.push(current.trim());return result;
}

export async function createPostgresDatabase(connectionString){
 if(typeof connectionString!=='string'||!/^postgres(?:ql)?:\/\//i.test(connectionString))throw new TypeError('DATABASE_URL must be a PostgreSQL connection string.');
 const channel=new MessageChannel(),worker=new Worker(new URL('./postgres-database-worker.mjs',import.meta.url),{workerData:{connectionString,port:channel.port2},transferList:[channel.port2]});
 try{const ready=await new Promise((resolve,reject)=>{const failed=error=>reject(error);worker.once('error',failed);worker.once('message',message=>{worker.off('error',failed);message.ready?resolve():reject(Object.assign(new Error(message.error?.message||'Could not connect to PostgreSQL.'),{code:message.error?.code}));});});if(!ready)throw new Error('PostgreSQL worker did not start.');}
 catch(error){channel.port1.close();await worker.terminate();throw error;}
 let requestId=0,closed=false;
 const send=(action,sql='',values=[])=>{
  if(closed)throw new Error('The PostgreSQL connection is closed.');
  const id=++requestId,signalBuffer=new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT),signal=new Int32Array(signalBuffer);
  worker.postMessage({id,action,sql,values,signal:signalBuffer});let packet;
  while(!packet){packet=receiveMessageOnPort(channel.port1);if(packet)break;const wait=Atomics.wait(signal,0,0,1000);if(wait==='timed-out'&&worker.threadId===-1)throw new Error('The PostgreSQL worker exited unexpectedly.');}
  const message=packet.message;if(message.id!==id)throw new Error('PostgreSQL worker returned an out-of-order response.');
  if(message.error)throw Object.assign(new Error(message.error.message||'PostgreSQL query failed.'),{code:message.error.code,detail:message.error.detail});
  return message;
 };
 const query=(sql,values=[])=>send('query',replacePlaceholders(translateSql(sql)),values);
 return {
  exec(source){for(const statement of statements(source)){const sql=translateSql(statement);if(sql)query(sql);}},
  prepare(source){const sql=translateSql(source);return {all:(...values)=>query(sql,values).rows||[],get:(...values)=>query(sql,values).rows?.[0],run:(...values)=>{const result=query(sql,values);return {changes:result.rowCount||0};}};},
  close(){if(closed)return;try{send('close');}finally{closed=true;channel.port1.close();worker.terminate().catch(()=>{});}},
 };
}