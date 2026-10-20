import {DatabaseSync} from 'node:sqlite';
import {isAbsolute,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {backupRelationalDemo} from './relational-demo.mjs';
import {DEMO_IDS} from './demo-accounts.mjs';

const marker='demo_chinese_display_names_v1';
const chinese=value=>typeof value==='string'&&/^[\p{Script=Han}·．\s]+$/u.test(value.trim());
const english=value=>typeof value==='string'&&/[a-z]/i.test(value)&&!/[\p{Script=Han}]/u.test(value);
function readPlan(db){
 const read=name=>{const row=db.prepare('SELECT value FROM schema_metadata WHERE name=?').get(name);if(!row)throw Error('Only the completed owned student demo can be normalized.');return JSON.parse(row.value);};
 const source=read('relational_centre_demo_v1');if(source.phase!=='complete'||read('complete_demo_25_v1').profileKey!=='complete-demo-25-v1')throw Error('Complete the owned 25-student demo first.');
 const students=source.studentIds.map(id=>db.prepare("SELECT * FROM people WHERE id=? AND kind='student'").get(id));
 const teachers=source.mapping.teachers.map(({id})=>db.prepare("SELECT r.*,p.profile,p.version profile_version FROM scheduling_resources r JOIN staff_personal_profiles p ON p.teacher_resource_id=r.id WHERE r.id=? AND r.kind='teacher'").get(id));
 if(students.length!==300||teachers.length!==4||students.some(row=>!row)||teachers.some(row=>!row))throw Error('The owned students and teachers are incomplete.');
 for(const row of [...students,...teachers]){const profile=JSON.parse(row.profile);if(!chinese(profile.localName)||!english(profile.fullName))throw Error('Every profile must have an existing Chinese local name and English full name.');}
 return {students,teachers};
}
export async function normalizeDemoNames({databasePath,backupPath}={}){
 if(!isAbsolute(databasePath||''))throw Error('Provide an absolute database path.');
 let db=new DatabaseSync(databasePath,{readOnly:true});
 try{const saved=db.prepare('SELECT value FROM schema_metadata WHERE name=?').get(marker);if(saved)return {...JSON.parse(saved.value),unchanged:true};readPlan(db);}finally{db.close();}
 if(!backupPath)throw Error('A new backup path is required.');await backupRelationalDemo(databasePath,backupPath);
 db=new DatabaseSync(databasePath);
 try{
  db.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE');const {students,teachers}=readPlan(db),actor=DEMO_IDS.users.maya,now=new Date().toISOString(),names=new Map();
  for(const row of [...students,...teachers])names.set(row.display_name,JSON.parse(row.profile).localName.trim());
  for(const row of students){const profile=JSON.parse(row.profile),next={...profile,displayName:profile.localName.trim(),localName:profile.localName.trim(),fullName:profile.fullName.trim()};
   if(row.display_name===next.displayName&&JSON.stringify(profile)===JSON.stringify(next))continue;
   db.prepare('UPDATE people SET display_name=?,profile=?,search_text=?,version=version+1,updated_at=? WHERE id=?').run(next.displayName,JSON.stringify(next),Object.values(next).filter(value=>typeof value==='string').join('\n').toLowerCase(),now,row.id);
   db.prepare('INSERT INTO person_audit_log(person_id,actor_id,actor_name,action,version,snapshot,created_at) VALUES (?,?,?,?,?,?,?)').run(row.id,actor,JSON.parse(teachers.find(item=>item.id===DEMO_IDS.teachers.maya).profile).localName,'person.demo-chinese-display-name',row.version+1,JSON.stringify({...next,id:row.id,kind:'student'}),now);
  }
  for(const row of teachers){const profile=JSON.parse(row.profile),displayName=profile.localName.trim();if(row.display_name===displayName)continue;
   db.prepare('UPDATE scheduling_resources SET display_name=?,name_key=?,version=version+1,updated_at=? WHERE id=?').run(displayName,displayName.toLowerCase(),now,row.id);
   db.prepare('INSERT INTO scheduling_resource_audit_log(actor_id,action,resource_id,version,snapshot,created_at) VALUES (?,?,?,?,?,?)').run(actor,'resource.demo-chinese-display-name',row.id,row.version+1,JSON.stringify({id:row.id,displayName,kind:'teacher'}),now);
  }
  // Only rename a login when its displayed name matches a renamed person;
  // parent accounts retain their own separate names and all login IDs stay intact.
  const linkedUsers=new Set();
  for(const row of students)for(const link of db.prepare('SELECT user_id FROM student_account_links WHERE student_id=?').all(row.id))if(link.user_id)linkedUsers.add(link.user_id);
  for(const row of teachers)for(const link of db.prepare('SELECT user_id FROM teacher_account_links WHERE teacher_resource_id=?').all(row.id))if(link.user_id)linkedUsers.add(link.user_id);
  for(const id of linkedUsers){const user=db.prepare('SELECT display_name FROM users WHERE id=? AND archived_at IS NULL').get(id),name=user&&names.get(user.display_name);if(name&&name!==user.display_name)db.prepare('UPDATE users SET display_name=? WHERE id=?').run(name,id);}
  const studentNames=new Map(students.map(row=>[row.id,JSON.parse(row.profile).localName.trim()]));let updatedOrders=0;
  for(const row of db.prepare('SELECT * FROM enrollment_orders').all()){
   if(!studentNames.has(row.student_id))continue;const data=JSON.parse(row.data),studentName=studentNames.get(row.student_id);if(data.studentName===studentName)continue;
   const next={...data,studentName};db.prepare('UPDATE enrollment_orders SET data=?,version=version+1,updated_at=? WHERE id=?').run(JSON.stringify(next),now,row.id);
   db.prepare('INSERT INTO enrollment_order_audit_log(actor_id,action,target_id,version,snapshot,created_at) VALUES (?,?,?,?,?,?)').run(actor,'order.demo-chinese-display-name',row.id,row.version+1,JSON.stringify({...next,id:row.id,studentId:row.student_id,amountCents:row.amount_cents}),now);updatedOrders++;
  }
  const rewrite=value=>Array.isArray(value)?value.map(rewrite):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,['displayName','studentName','teacherName','actorName'].includes(key)&&typeof item==='string'?(names.get(item)||item):rewrite(item)])):value;
  for(const row of db.prepare('SELECT rowid,response_body FROM idempotent_creates').all())db.prepare('UPDATE idempotent_creates SET response_body=? WHERE rowid=?').run(JSON.stringify(rewrite(JSON.parse(row.response_body))),row.rowid);
  if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('A related record lost its link.');
  const result={students:students.length,activeStudents:students.filter(row=>!row.archived_at).length,teachers:teachers.length,updatedOrders,backupPath};db.prepare('INSERT INTO schema_metadata(name,value) VALUES (?,?)').run(marker,JSON.stringify(result));db.exec('COMMIT');return result;
 }catch(error){db.exec('ROLLBACK');throw error;}finally{db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const args=process.argv.slice(2),get=key=>{const i=args.indexOf(key);if(i<0||!args[i+1])throw Error(`Missing ${key}`);return resolve(args[i+1]);};console.log(JSON.stringify(await normalizeDemoNames({databasePath:get('--database'),backupPath:get('--backup')})));}
