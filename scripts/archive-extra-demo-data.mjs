// One-time, allowlisted cleanup for the audited local relational demo. Never a name-based purge.
import {DatabaseSync,backup} from 'node:sqlite';
import {mkdir,cp,chmod,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

export const cleanupId='qa-residue-20261019-v1';
const extraSchedules=['5d45a726-2c31-4701-80aa-eec9d8cc15cf','4a2dd056-2d54-44ee-9500-3c44d1e4b7d6','255abb86-c8f8-4d58-8a23-ae55c19f517d','500747a7-bc3a-41d6-ba76-2c8865f6f2cf','c6cf7766-fc14-45d0-a6db-0d99ba0152c2'];
const extraSlots=['84b97aeb-60c6-4477-acc6-cce8822181c3','8da7ebf6-29bb-4db0-b5ab-699e6e3c358c'];
const extraTeacher='b16430c7-3347-4395-9d54-d6d0d49a451d',extraPerson='8898e41a-b0be-4f6f-af1b-3fb015a26a4f',extraMaterial='6fcc02bd-bb52-45de-b277-119724a4e38b';
const oldTeacherUser='9a00c31e-a4c5-43fd-bc60-c8ffd7044460',extraUsers=['786fcfd1-2fc5-421f-a9e2-a05f58f81ed9','7eb08c07-a9d0-420b-9a8c-457b7a73bc4c'];
const tables=new Set(['schedules','available_slots','scheduling_resources','people','materials','users']);
const row=(db,table,id)=>{assert.ok(tables.has(table));const value=db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);assert.ok(value,`Missing audited ${table}: ${id}`);return {...value};};
const json=(db,key)=>JSON.parse(db.prepare('SELECT value FROM schema_metadata WHERE name=?').get(key)?.value||'null');
const equal=(a,b)=>assert.deepEqual(a,b,'The record changed since the cleanup plan. No changes were made.');

export function cleanupPlan(db,now=new Date().toISOString()){
 const original=json(db,'checkpoint_demo3_v1'),demo=json(db,'relational_centre_demo_v1');assert.equal(demo?.phase,'complete');assert.equal(demo.studentIds.length,300);assert.equal(demo.mapping.teachers.length,4);assert.equal(demo.mapping.rooms.length,2);
 const protectedSchedules=new Set([...Object.values(original.ids.schedules),...demo.result.scheduleIds]);
 for(const id of extraSchedules){assert.ok(!protectedSchedules.has(id));assert.equal(db.prepare('SELECT COUNT(*) AS n FROM student_sessions WHERE schedule_id=?').get(id).n,0,'QA schedule now has students; review manually.');}
 for(const id of extraSlots)assert.equal(db.prepare("SELECT COUNT(*) AS n FROM availability_reservations WHERE slot_id=? AND state='held'").get(id).n,0,'QA slot now has reservations; review manually.');
 assert.ok(!demo.studentIds.includes(extraPerson));assert.equal(db.prepare('SELECT COUNT(*) AS n FROM enrollment_orders WHERE student_id=?').get(extraPerson).n,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM student_account_links WHERE student_id=?').get(extraPerson).n,0);
 assert.ok(!demo.mapping.teachers.some(t=>t.id===extraTeacher));assert.equal(row(db,'scheduling_resources',extraTeacher).active,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM teacher_account_links WHERE teacher_resource_id=?').get(extraTeacher).n,0);
 assert.match(row(db,'scheduling_resources',extraTeacher).display_name,/QA/);assert.match(row(db,'people',extraPerson).display_name,/GUI.*驗收/);assert.match(row(db,'materials',extraMaterial).name,/QA/);
 for(const id of extraUsers){assert.match(row(db,'users',id).display_name,/Test .*fictional/);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM teacher_account_links WHERE user_id=?').get(id).n,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM student_account_links WHERE user_id=?').get(id).n,0);assert.ok(!Object.values(original.ids.users).includes(id));}
 const ava=demo.mapping.teachers.find(t=>t.key==='ava');assert.equal(db.prepare('SELECT user_id FROM teacher_account_links WHERE teacher_resource_id=?').get(ava.id)?.user_id,oldTeacherUser);
 const changes=[];
 const change=(table,id,fields)=>{const before=row(db,table,id),after={...before,...fields,...(Object.hasOwn(before,'version')?{version:before.version+1,updated_at:now}:{})};changes.push({table,id,before,after});};
 for(const id of extraSlots){const value=row(db,'available_slots',id);change('available_slots',id,{data:JSON.stringify({...JSON.parse(value.data),active:false}),archived_at:now});}
 for(const id of extraSchedules)if(!row(db,'schedules',id).deleted_at)change('schedules',id,{deleted_at:now});
 change('scheduling_resources',extraTeacher,{archived_at:now,active:0,metadata:JSON.stringify({...JSON.parse(row(db,'scheduling_resources',extraTeacher).metadata),teachingAllowed:false})});
 change('people',extraPerson,{archived_at:now});change('materials',extraMaterial,{archived_at:now});
 for(const id of extraUsers)change('users',id,{archived_at:now});
 change('users',oldTeacherUser,{display_name:row(db,'scheduling_resources',ava.id).display_name});
 const refreshNames=value=>{
  if(!value||typeof value!=='object')return value;if(Array.isArray(value))return value.map(refreshNames);const result=Object.fromEntries(Object.entries(value).map(([key,item])=>[key,refreshNames(item)]));
  for(const [key,ids]of[['teacher','teacherIds'],['room','roomIds']])if(Array.isArray(result[ids]))result[key]=result[ids].map(id=>row(db,'scheduling_resources',id).display_name).join(', ');
  if(result.remark==='虛構中期檢查排課；沒有建立學生報名、付款或座位使用。')result.remark='示範排課；報名及付款狀態以現有訂單紀錄為準。';return result;
 };
 for(const id of Object.values(original.ids.schedules))change('schedules',id,{data:JSON.stringify(refreshNames(JSON.parse(row(db,'schedules',id).data)))});
 return {id:cleanupId,createdAt:now,changes,protected:{students:demo.studentIds,teachers:demo.mapping.teachers.map(t=>t.id),rooms:demo.mapping.rooms.map(t=>t.id),schedules:[...protectedSchedules],orders:demo.result.orderIds}};
}
const writeRow=(db,table,id,value)=>{assert.ok(tables.has(table));const keys=Object.keys(value).filter(key=>key!=='id');db.prepare(`UPDATE ${table} SET ${keys.map(key=>`${key}=?`).join(',')} WHERE id=?`).run(...keys.map(key=>value[key]),id);};
export function applyCleanup(db,plan,{restore=false}={}){
 db.exec('BEGIN IMMEDIATE');try{
  db.exec('CREATE TABLE IF NOT EXISTS demo_cleanup_runs(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,plan TEXT NOT NULL,restored_at TEXT)');
  if(!restore&&db.prepare('SELECT id FROM demo_cleanup_runs WHERE id=? AND restored_at IS NULL').get(plan.id)){db.exec('ROLLBACK');return {unchanged:true};}
  for(const change of plan.changes)equal(row(db,change.table,change.id),restore?change.after:change.before);
  for(const change of plan.changes)writeRow(db,change.table,change.id,restore?change.before:change.after);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  if(restore)db.prepare('UPDATE demo_cleanup_runs SET restored_at=? WHERE id=?').run(new Date().toISOString(),plan.id);
  else db.prepare('INSERT INTO demo_cleanup_runs(id,created_at,plan,restored_at) VALUES (?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET created_at=excluded.created_at,plan=excluded.plan,restored_at=NULL').run(plan.id,plan.createdAt,JSON.stringify(plan));
  db.exec('COMMIT');return {restored:restore,changed:plan.changes.length};
 }catch(error){db.exec('ROLLBACK');throw error;}
}

async function main(){
 const args=process.argv.slice(2),option=name=>args[args.indexOf(name)+1],apply=args.includes('--apply'),restore=args.includes('--restore');
 assert.ok(args.includes('--database'),'Specify --database; no database is selected by default.');const path=resolve(option('--database')),db=new DatabaseSync(path,{readOnly:!apply});
 try{
  const prior=db.prepare("SELECT name FROM sqlite_master WHERE name='demo_cleanup_runs'").get()?db.prepare('SELECT plan,restored_at FROM demo_cleanup_runs WHERE id=?').get(cleanupId):null;
  if(prior&&!prior.restored_at&&!restore){console.log(JSON.stringify({id:cleanupId,unchanged:true}));return;}
  const plan=restore?(assert.ok(prior&&!prior.restored_at,'No applied cleanup to restore.'),JSON.parse(prior.plan)):cleanupPlan(db);
  if(!apply){console.log(JSON.stringify({dryRun:true,id:plan.id,changes:plan.changes.map(c=>({table:c.table,id:c.id})),protectedCounts:Object.fromEntries(Object.entries(plan.protected).map(([k,v])=>[k,v.length]))},null,2));return;}
  assert.ok(args.includes('--backup'),'Applying or restoring requires --backup with a NEW directory.');const directory=resolve(option('--backup'));await mkdir(directory,{mode:0o700});const backupPath=join(directory,'before.sqlite');await backup(db,backupPath);await chmod(backupPath,0o600);
  const attachments=path+'.attachments';if(await stat(attachments).then(()=>true).catch(()=>false))await cp(attachments,join(directory,'attachments'),{recursive:true});
  console.log(JSON.stringify({...applyCleanup(db,plan,{restore}),id:cleanupId,backup:backupPath}));
 }finally{db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
