import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs/promises';
import {dirname,isAbsolute,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createStore} from './store.mjs';
import {provisionDemoAccounts,DEMO_IDS} from './demo-accounts.mjs';
import {provisionRelationalDemo} from './relational-demo.mjs';

// Explicit local launcher only. Existing databases are never adopted, migrated,
// re-seeded or repaired by this helper, even when they contain other demo data.
const profileKey='local-demo-v1',markerKey='local_demo_v1';
const accountKeys=[['maya','admin@gmail.com','admin'],['leo','teacher@gmail.com','teacher'],['chloe','student@gmail.com','student']];
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value.slice(0,4)!=='0000'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const validId=value=>typeof value==='string'&&!!value&&value.length<=200;
const unowned=()=>{throw Object.assign(new Error('LOCAL_DEMO_UNOWNED_DATABASE: This existing database was not created by the local demo launcher. It was left unchanged. Choose a new database path.'),{code:'LOCAL_DEMO_UNOWNED_DATABASE'});};
function nextFriday(){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),date=new Date(['year','month','day'].map(key=>parts.find(part=>part.type===key).value).join('-')+'T00:00:00Z');
 date.setUTCDate(date.getUTCDate()+(5-date.getUTCDay()+7)%7);return date.toISOString().slice(0,10);
}
function validMarker(saved){
 if(!saved||saved.profileKey!==profileKey||saved.profileVersion!==1||saved.phase!=='complete'||!validDate(saved.startDate)||saved.mapping?.startDate!==saved.startDate)return false;
 const {teachers,courses,rooms}=saved.mapping;
 if(!Array.isArray(teachers)||teachers.length!==4||!Array.isArray(courses)||courses.length!==6||!Array.isArray(rooms)||!rooms.length)return false;
 if(!['maya','leo','ava','ethan'].every(key=>teachers.filter(row=>row?.key===key&&validId(row.id)).length===1)||new Set(teachers.map(row=>row.id)).size!==4)return false;
 if(teachers.find(row=>row.key==='maya').id!==DEMO_IDS.teachers.maya||teachers.find(row=>row.key==='leo').id!==DEMO_IDS.teachers.leo)return false;
 if(!courses.every(row=>validId(row?.id)&&validId(row?.feeId))||new Set(courses.map(row=>row.id)).size!==6||courses[0].id!==DEMO_IDS.course||!rooms.every(row=>validId(row?.id)))return false;
 if(!Array.isArray(saved.accounts)||saved.accounts.length!==3||!accountKeys.every(([key,email,role])=>saved.accounts.some(row=>row?.id===DEMO_IDS.users[key]&&row.email===email&&row.role===role)))return false;
 return saved.ids?.studentPerson===DEMO_IDS.studentPerson&&saved.counts?.students===300&&saved.counts?.teachers===4&&saved.counts?.courses===6;
}
async function readOwned(databasePath){
 // SQLite can create WAL/SHM sidecars even with readOnly:true. Probe only a
 // private copy, so an unowned source is never opened or locked by SQLite.
 const probeDirectory=await fs.mkdtemp(join(tmpdir(),'beamal-local-demo-probe-')),probePath=join(probeDirectory,'probe.sqlite');let database;
 try{
  await fs.copyFile(databasePath,probePath);await fs.chmod(probePath,0o600);
  for(const suffix of ['-wal','-journal']){const sidecar=await existingFile(databasePath+suffix);if(sidecar){if(!sidecar.isFile()||sidecar.isSymbolicLink())unowned();await fs.copyFile(databasePath+suffix,probePath+suffix);await fs.chmod(probePath+suffix,0o600);}}
  database=new DatabaseSync(probePath,{readOnly:true});
  const row=database.prepare('SELECT value FROM schema_metadata WHERE name=?').get(markerKey);if(!row)unowned();
  const saved=JSON.parse(row.value);if(!validMarker(saved))unowned();return {...saved,created:false};
 }catch(error){if(error.code==='LOCAL_DEMO_UNOWNED_DATABASE')throw error;unowned();}finally{database?.close();await fs.rm(probeDirectory,{recursive:true,force:true});}
}
async function existingFile(databasePath){
 try{return await fs.lstat(databasePath);}catch(error){if(error.code==='ENOENT')return null;throw error;}
}

export async function ensureLocalDemo({databasePath,startDate}={}){
 if(typeof databasePath!=='string'||!isAbsolute(databasePath))throw new Error('An explicit absolute databasePath is required.');
 if(startDate!==undefined&&!validDate(startDate))throw new Error('Choose a valid startDate in YYYY-MM-DD format.');
 databasePath=resolve(databasePath);const existing=await existingFile(databasePath);
 if(existing){if(!existing.isFile()||existing.isSymbolicLink())unowned();return readOwned(databasePath);}
 const parent=dirname(databasePath);await fs.mkdir(parent,{recursive:true,mode:0o700});
 const stageDirectory=await fs.mkdtemp(join(parent,'.beamal-local-demo-')),stagePath=join(stageDirectory,'sample.sqlite');
 try{
  const reserved=await fs.open(stagePath,'wx',0o600);await reserved.close();
  const date=startDate??nextFriday(),checkpoint=await provisionDemoAccounts({databasePath:stagePath,startDate:date}),store=await createStore({databasePath:stagePath});
  let mapping;
  try{
   const teachers=[{key:'maya',id:DEMO_IDS.teachers.maya},{key:'leo',id:DEMO_IDS.teachers.leo}];
   for(const [key,displayName,color]of[['ava','許悅童 Ava Hui','#5c8c6c'],['ethan','鄭思澄 Ethan Cheng','#8f6ca7']])teachers.push({key,id:store.schedulingResources.create({kind:'teacher',displayName,representativeColor:color},DEMO_IDS.users.maya).id});
   const courses=[{id:DEMO_IDS.course,feeId:DEMO_IDS.fees[0]}];
   for(const courseName of ['水彩探索','幼兒創意藝術','繪本創作','手作與拼貼','素描基礎']){
    const course=store.createCourse({courseName,feeName:'每堂60分鐘',category:'Art',level:'Beginner',pricingModel:'monthly-lessons',price:280,duration:60,months:1,bookingExpiry:null,onlineStore:true},DEMO_IDS.users.maya);courses.push({id:course.id,feeId:course.feeIds[0]});
   }
   mapping={courses,teachers,rooms:[{id:DEMO_IDS.room}],startDate:date};
  }finally{await store.close();}
  const relational=await provisionRelationalDemo({databasePath:stagePath,mapping}),database=new DatabaseSync(stagePath);
  let manifest;
  try{
   const accounts=accountKeys.map(([key,email,role])=>({id:DEMO_IDS.users[key],email,role,displayName:database.prepare('SELECT display_name FROM users WHERE id=?').get(DEMO_IDS.users[key]).display_name}));
   manifest={profileKey,profileVersion:1,phase:'complete',createdAt:new Date().toISOString(),startDate:date,mapping,ids:{...checkpoint.ids,teachers:Object.fromEntries(mapping.teachers.map(row=>[row.key,row.id])),courses:mapping.courses.map(row=>row.id)},accounts,counts:relational.counts,notice:'Local demo only. Initial roster: 4 teachers, 6 courses and 300 active students. Only Chloe has paid enrollment; the other 299 profiles have no login, payment or occupied seat. Restarts preserve user changes.'};
   database.prepare('INSERT INTO schema_metadata(name,value) VALUES (?,?)').run(markerKey,JSON.stringify(manifest));
   // Publish a complete standalone SQLite image, never a main file that still
   // depends on a staging WAL. All stores above are already closed.
   database.exec('PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode=DELETE;');
  }finally{database.close();}
  await fs.chmod(stagePath,0o600);const durable=await fs.open(stagePath,'r');try{await durable.sync();}finally{await durable.close();}
  // link() fails atomically with EEXIST if another process created the target.
  // rename() must not be used: it could replace an unrelated database.
  await fs.link(stagePath,databasePath);return {...manifest,created:true};
 }finally{await fs.rm(stageDirectory,{recursive:true,force:true});}
}
