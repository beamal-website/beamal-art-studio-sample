import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import {isAbsolute,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {DEMO_IDS} from './demo-accounts.mjs';
import {RELATIONAL_DEMO_IDS} from './relational-demo.mjs';
import {chloeStudentProfile,relationalStudentProfile} from './demo-student-profiles.mjs';
import {validatePerson} from './people.mjs';

// Explicit opt-in only. Startup never imports this helper. Original ownership
// markers and import audit entries, rather than names, define its narrow scope.
const fields=['gender','dateOfBirth','firstName','lastName','fullName','localName','school','level','parentName','contact1Name','contact1Phone','contact1Email','contact2Name','contact2Phone','contact2Email','district','address','whatsApp','phone','mobile','email','detail','remark','billName','occupation','referrer','enrollmentDate','promotion'];
const ownedIds=[DEMO_IDS.studentPerson,...RELATIONAL_DEMO_IDS.students];
const profileKey='owned-demo-profile-enrichment-v1';
const {studentPerson,...checkpointIds}=DEMO_IDS;
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const blank=value=>value===null||value===undefined||typeof value==='string'&&!value.trim();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const validId=value=>typeof value==='string'&&!!value.trim()&&value.length<=200;
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='0001-01-01'&&value<='9999-12-31'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const unowned=()=>{throw Object.assign(new Error('This database does not have the complete owned local demo profile. No profiles were enriched.'),{code:'DEMO_PROFILES_UNOWNED_DATABASE'});};
const marker=(db,name)=>{const row=db.prepare('SELECT value FROM schema_metadata WHERE name=?').get(name);if(!row)unowned();return JSON.parse(row.value);};
function ownedState(db,{refreshGenerated=false}={}){
 try{
  const relational=marker(db,'relational_centre_demo_v1'),checkpoint=marker(db,'checkpoint_demo3_v1'),child=marker(db,'checkpoint_demo3_student_v1');
  const localRow=db.prepare("SELECT value FROM schema_metadata WHERE name='local_demo_v1'").get();
  // Older explicitly provisioned cohorts predate the portable launcher marker.
  // Only this explicit refresh accepts them; exact import audits and account
  // links below must still prove every owned identity before any write.
  if(!localRow&&!refreshGenerated)unowned();
  const local=localRow?JSON.parse(localRow.value):{profileKey:'local-demo-v1',profileVersion:1,phase:'complete',startDate:checkpoint.startDate,mapping:relational.mapping,ids:{...checkpoint.ids,studentPerson,teachers:Object.fromEntries((relational.mapping?.teachers||[]).map(row=>[row.key,row.id])),courses:(relational.mapping?.courses||[]).map(row=>row.id)},counts:{students:300,teachers:4,courses:6},accounts:checkpoint.accounts};
  if(local.profileKey!=='local-demo-v1'||local.profileVersion!==1||local.phase!=='complete'||!validDate(local.startDate)||relational.profileKey!=='relational-centre-demo-v1'||relational.phase!=='complete'||!same(relational.mapping,local.mapping)||relational.mapping?.startDate!==local.startDate||relational.mappingHash!==createHash('sha256').update(JSON.stringify(relational.mapping)).digest('hex')||!same(relational.studentIds,ownedIds))unowned();
  if(checkpoint.profileKey!=='checkpoint-demo3-v1'||checkpoint.profileVersion!==1||checkpoint.startDate!==local.startDate||!same(checkpoint.ids,checkpointIds)||child.profileKey!=='checkpoint-demo3-student-v1'||child.personId!==studentPerson||child.actorId!==DEMO_IDS.users.maya)unowned();
  const {teachers,courses,rooms}=local.mapping;
  if(!Array.isArray(teachers)||teachers.length!==4||new Set(teachers.map(row=>row?.id)).size!==4||!['maya','leo','ava','ethan'].every(key=>teachers.filter(row=>row?.key===key&&validId(row.id)).length===1)||teachers.find(row=>row.key==='maya').id!==DEMO_IDS.teachers.maya||teachers.find(row=>row.key==='leo').id!==DEMO_IDS.teachers.leo)unowned();
  if(!Array.isArray(courses)||courses.length!==6||!courses.every(row=>validId(row?.id)&&validId(row?.feeId))||new Set(courses.map(row=>row.id)).size!==6||courses[0].id!==DEMO_IDS.course||!Array.isArray(rooms)||!rooms.length||!rooms.every(row=>validId(row?.id)))unowned();
  if(local.ids?.studentPerson!==studentPerson||!same(local.ids?.users,DEMO_IDS.users)||!same(local.ids?.courses,courses.map(row=>row.id))||!same(local.ids?.teachers,Object.fromEntries(teachers.map(row=>[row.key,row.id])))||local.counts?.students!==300||local.counts?.teachers!==4||local.counts?.courses!==6)unowned();
  if(!Array.isArray(local.accounts)||local.accounts.length!==3)unowned();
  for(const [key,email,role]of[['maya','admin@gmail.com','admin'],['leo','teacher@gmail.com','teacher'],['chloe','student@gmail.com','student']]){
   if(local.accounts.filter(row=>row?.id===DEMO_IDS.users[key]&&row.email===email&&row.role===role).length!==1||db.prepare('SELECT role FROM users WHERE id=?').get(DEMO_IDS.users[key])?.role!==role)unowned();
  }
  for(const key of ['maya','leo'])if(db.prepare('SELECT user_id FROM teacher_account_links WHERE teacher_resource_id=?').get(DEMO_IDS.teachers[key])?.user_id!==DEMO_IDS.users[key])unowned();
  if(db.prepare('SELECT user_id FROM student_account_links WHERE student_id=?').get(studentPerson)?.user_id!==DEMO_IDS.users.chloe)unowned();
  const rows=ownedIds.map(id=>{
   const row=db.prepare("SELECT * FROM people WHERE id=? AND kind='student'").get(id);if(!row||!Number.isSafeInteger(row.version)||row.version<1)unowned();
   const profile=JSON.parse(row.profile);if(!plain(profile))unowned();
   const imports=db.prepare("SELECT snapshot FROM person_audit_log WHERE person_id=? AND action='person.import' AND version=1").all(id);if(imports.length!==1)unowned();
   const source=JSON.parse(imports[0].snapshot),expected=id===studentPerson?'checkpoint-demo3-student-v1':'relational-centre-demo-v1';if(source.id!==id||source.kind!=='student'||source.version!==1||source.fixture?.profileKey!==expected)unowned();
   return {...row,profile,original:source};
  });
  return {startDate:local.startDate,rows,actor:db.prepare('SELECT id,display_name FROM users WHERE id=?').get(DEMO_IDS.users.maya)};
 }catch(error){if(error.code==='DEMO_PROFILES_UNOWNED_DATABASE')throw error;unowned();}
}
function patchesFor(source,{refreshGenerated=false}={}){
 return source.rows.flatMap((row,index)=>{
  const desired=index===0?chloeStudentProfile(source.startDate):relationalStudentProfile(index-1,source.startDate);
  const candidates=refreshGenerated?['displayName',...fields]:fields;
  const patch=Object.fromEntries(candidates.filter(key=>{
   const current=key==='displayName'?row.display_name:row.profile[key];
   return !blank(desired[key])&&!same(current,desired[key])&&(blank(current)||refreshGenerated&&same(current,row.original[key]));
  }).map(key=>[key,desired[key]]));
  return Object.keys(patch).length?[{row,patch}]:[];
 });
}
async function existingFile(path){try{return await fs.lstat(path);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
async function requireSafeSidecars(path){
 for(const suffix of ['-wal','-shm','-journal']){const sidecar=await existingFile(path+suffix);if(sidecar&&(!sidecar.isFile()||sidecar.isSymbolicLink()))unowned();}
}
async function probeOwned(path,options){
 // Even read-only SQLite may create WAL/SHM files. All ownership checks first
 // run against a private copy, leaving an unknown original completely untouched.
 await requireSafeSidecars(path);
 const directory=await fs.mkdtemp(join(tmpdir(),'beamal-profile-enrichment-probe-')),copy=join(directory,'probe.sqlite');let db;
 try{
  await fs.copyFile(path,copy);await fs.chmod(copy,0o600);
  for(const suffix of ['-wal','-journal']){const sidecar=await existingFile(path+suffix);if(sidecar){if(!sidecar.isFile()||sidecar.isSymbolicLink())unowned();await fs.copyFile(path+suffix,copy+suffix);await fs.chmod(copy+suffix,0o600);}}
  db=new DatabaseSync(copy,{readOnly:true});const source=ownedState(db,options);return {source,patches:patchesFor(source,options)};
 }catch(error){if(error.code==='DEMO_PROFILES_UNOWNED_DATABASE')throw error;unowned();}finally{db?.close();await fs.rm(directory,{recursive:true,force:true});}
}
const result=(source,patches)=>({profileKey,startDate:source.startDate,updatedProfiles:patches.length,updatedFields:patches.reduce((count,{patch})=>count+Object.keys(patch).length,0),updatedStudentIds:patches.map(({row})=>row.id)});
export async function enrichOwnedDemoProfiles({databasePath,refreshGenerated=false}={}){
 if(typeof refreshGenerated!=='boolean')throw new Error('refreshGenerated must be an explicit boolean.');
 const options={refreshGenerated};
 if(typeof databasePath!=='string'||!isAbsolute(databasePath))throw new Error('An explicit absolute databasePath is required.');
 const path=resolve(databasePath),before=await existingFile(path);if(!before?.isFile()||before.isSymbolicLink())unowned();
 const probe=await probeOwned(path,options);if(!probe.patches.length)return result(probe.source,[]);
 const current=await existingFile(path);if(!current?.isFile()||current.isSymbolicLink()||current.dev!==before.dev||current.ino!==before.ino)unowned();
 await requireSafeSidecars(path);
 const db=new DatabaseSync(path);let transaction=false;
 try{
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; BEGIN IMMEDIATE;');transaction=true;
  // Re-read under the write lock: concurrent human edits are preserved, and a
  // stale probe can never overwrite a now-populated field or bypass ownership.
  const source=ownedState(db,options),patches=patchesFor(source,options),now=new Date().toISOString();
  for(const {row,patch}of patches){
   const {version,...validated}=validatePerson({...patch,version:row.version},{update:true}),profile={...row.profile,...validated},nextVersion=version+1;
   const displayName=patch.displayName??row.display_name;
   const changed=db.prepare('UPDATE people SET display_name=?,profile=?,search_text=?,version=?,updated_at=? WHERE id=? AND version=?').run(displayName,JSON.stringify(profile),[displayName,...Object.values(profile).filter(value=>typeof value==='string')].join('\n').toLowerCase(),nextVersion,now,row.id,version);if(changed.changes!==1)throw new Error('A demo profile changed before enrichment. Retry explicitly.');
   const snapshot={...profile,displayName,id:row.id,kind:row.kind,version:nextVersion,createdAt:row.created_at,updatedAt:now,convertedAt:row.converted_at,convertedBy:row.converted_by?{id:row.converted_by,displayName:db.prepare('SELECT display_name FROM users WHERE id=?').get(row.converted_by)?.display_name??''}:null,enrichment:{profileKey,fields:Object.keys(patch)}};
   db.prepare('INSERT INTO person_audit_log(person_id,actor_id,actor_name,action,version,snapshot,created_at) VALUES (?,?,?,?,?,?,?)').run(row.id,source.actor.id,source.actor.display_name,refreshGenerated?'person.refresh-owned-demo':'person.enrich-owned-demo',nextVersion,JSON.stringify(snapshot),now);
  }
  db.exec('COMMIT');transaction=false;return result(source,patches);
 }catch(error){if(transaction)db.exec('ROLLBACK');throw error;}finally{db.close();}
}
