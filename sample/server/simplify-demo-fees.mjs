import {DatabaseSync} from 'node:sqlite';
import {isAbsolute,resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {backupRelationalDemo} from './relational-demo.mjs';
import {DEMO_IDS} from './demo-accounts.mjs';

const marker='demo_six_term_fees_v1';
const parse=JSON.parse;
function validate(db,plan){
 const saved=db.prepare("SELECT value FROM schema_metadata WHERE name='complete_demo_25_v1'").get();
 if(!saved||parse(saved.value).profileKey!=='complete-demo-25-v1')throw Error('Only the completed 25-student demo may be simplified.');
 const students=new Set(parse(saved.value).students);
 if(students.size!==25||db.prepare('SELECT student_id FROM enrollment_orders').all().some(row=>!students.has(row.student_id)))throw Error('An order outside the owned sample students exists.');
 if(!Array.isArray(plan)||plan.length!==6||new Set(plan.map(row=>row.id)).size!==6||new Set(plan.map(row=>row.feeId)).size!==6)throw Error('Provide six distinct course and fee IDs in Course 1–6 order.');
 const courses=db.prepare('SELECT * FROM courses').all();
 if(courses.length!==6||courses.some(row=>!plan.some(item=>item.id===row.id)||row.deleted_at))throw Error('The six sample courses must exactly match the supplied plan.');
 for(const row of plan){if(!Number.isSafeInteger(row.priceCents)||row.priceCents<=0||!db.prepare('SELECT fee_id FROM course_fees WHERE course_id=? AND fee_id=?').get(row.id,row.feeId))throw Error('Each price must be positive and each selected fee must belong to its course.');}
 const ids=new Set(plan.map(row=>row.id));
 for(const row of db.prepare('SELECT data FROM enrollment_orders').all())if(!parse(row.data).items?.length||parse(row.data).items.some(item=>!ids.has(item.courseId)))throw Error('An order has an unexpected course.');
 if(db.prepare('SELECT COUNT(*) n FROM fees').get().n>9)throw Error('Additional fees exist; review before replacing sample fees.');
}
export async function simplifyDemoFees({databasePath,backupPath,plan}={}){
 if(!isAbsolute(databasePath||''))throw Error('Provide an absolute database path.');
 let db=new DatabaseSync(databasePath,{readOnly:true});
 try{const saved=db.prepare('SELECT value FROM schema_metadata WHERE name=?').get(marker);if(saved)return {...parse(saved.value),unchanged:true};validate(db,plan);}finally{db.close();}
 if(!backupPath)throw Error('A new backup path is required.');
 await backupRelationalDemo(databasePath,backupPath);
 db=new DatabaseSync(databasePath);
 try{
  db.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE');validate(db,plan);
  const now=new Date().toISOString(),actor=DEMO_IDS.users.maya,fees=[],byCourse=new Map();
  for(const [index,row]of plan.entries()){
   const old=db.prepare('SELECT * FROM fees WHERE id=?').get(row.feeId),course=db.prepare('SELECT * FROM courses WHERE id=?').get(row.id),name=`Course ${index+1}`;
   const data={feeName:`${name}｜四堂一期`,feeNameEn:`${name} · 4 lessons per term`,category:'',pricingModel:'package',packageType:'visits',packageTotal:4,bookingExpiry:null,onlineStore:!!course.online_store};
   db.prepare('UPDATE fees SET data=?,price_cents=?,online_store=?,version=version+1,updated_at=? WHERE id=?').run(JSON.stringify(data),row.priceCents,course.online_store,now,row.feeId);
   const courseData={...parse(course.data),courseName:name,courseNameEn:name};
   db.prepare('UPDATE courses SET data=?,price_cents=?,name_key=?,version=version+1,updated_at=? WHERE id=?').run(JSON.stringify(courseData),row.priceCents,name.toLowerCase(),now,row.id);
   db.prepare('INSERT INTO audit_log(actor_id,action,course_id,version,snapshot,created_at) VALUES (?,?,?,?,?,?)').run(actor,'course.demo-four-lesson-term',row.id,course.version+1,JSON.stringify({...courseData,id:row.id,feeIds:[row.feeId],price:row.priceCents/100}),now);
   const fee={...data,id:row.feeId,feeCode:old.fee_code,price:row.priceCents/100,courseIds:[row.id],version:old.version+1};
   byCourse.set(row.id,{...row,name,fee});fees.push(fee);
   db.prepare('INSERT INTO fee_audit_log(actor_id,action,fee_id,version,snapshot,created_at) VALUES (?,?,?,?,?,?)').run(actor,'fee.demo-four-lesson-term',row.feeId,fee.version,JSON.stringify(fee),now);
  }
  const removed=db.prepare('SELECT * FROM fees').all().filter(row=>!plan.some(item=>item.feeId===row.id));
  db.exec('DELETE FROM course_fees');
  for(const row of plan)db.prepare('INSERT INTO course_fees(course_id,fee_id,position) VALUES (?,?,0)').run(row.id,row.feeId);
  // These tables hold current package components. A plain four-visit package
  // has none; retain every old definition in the backup before clearing it.
  db.exec('DELETE FROM fee_package_content_audit_log; DELETE FROM fee_package_contents');
  for(const row of removed){db.prepare('DELETE FROM fee_audit_log WHERE fee_id=?').run(row.id);db.prepare('DELETE FROM fees WHERE id=?').run(row.id);}
  const normalizeItems=items=>items.map(item=>{
   const row=byCourse.get(item.courseId);if(!row)throw Error('Unexpected order course.');
   return {...item,courseName:row.name,feeId:row.feeId,feeName:row.fee.feeName,pricing:{pricingModel:'package',price:row.priceCents/100,packageType:'visits',packageTotal:4,bookingExpiry:null}};
  });
  let amountCents=0;
  const orderIds=[];
  for(const row of db.prepare('SELECT * FROM enrollment_orders').all()){
   const data=parse(row.data),items=normalizeItems(data.items),amount=items.reduce((sum,item)=>sum+byCourse.get(item.courseId).priceCents,0),next={...data,items};
   db.prepare('UPDATE enrollment_orders SET data=?,amount_cents=?,version=version+1,updated_at=? WHERE id=?').run(JSON.stringify(next),amount,now,row.id);
   db.prepare('UPDATE enrollment_sales SET amount_cents=? WHERE order_id=?').run(amount,row.id);
   const snapshot={...next,id:row.id,studentId:row.student_id,amountCents:amount,version:row.version+1,orderStatus:row.order_status,paymentStatus:row.payment_status};
   db.prepare('INSERT INTO enrollment_order_audit_log(actor_id,action,target_id,version,snapshot,created_at) VALUES (?,?,?,?,?,?)').run(actor,'order.demo-four-lesson-term',row.id,row.version+1,JSON.stringify(snapshot),now);
   if(row.payment_status==='paid')amountCents+=amount;orderIds.push(row.id);
  }
  // Retry receipts must not reintroduce stale fee snapshots after this explicit
  // fixture rewrite. Keep keys and payload hashes so retries cannot duplicate work.
  const rewrite=value=>{
   if(Array.isArray(value))return value.filter(item=>!item?.feeCode||!removed.some(row=>row.id===item.id)).map(rewrite);
   if(!value||typeof value!=='object')return value;
   if(Array.isArray(value.items)&&value.items.length&&value.items.every(item=>byCourse.has(item.courseId)&&item.feeId))return {...value,items:normalizeItems(value.items),...(Object.hasOwn(value,'amountCents')?{amountCents:value.items.reduce((sum,item)=>sum+byCourse.get(item.courseId).priceCents,0)}:{})};
   const fee=fees.find(row=>row.id===value.id&&value.feeCode);if(fee)return {...value,...fee};
   return Object.fromEntries(Object.entries(value).map(([key,entry])=>[key,rewrite(entry)]));
  };
  for(const row of db.prepare('SELECT rowid,response_body FROM idempotent_creates').all())db.prepare('UPDATE idempotent_creates SET response_body=? WHERE rowid=?').run(JSON.stringify(rewrite(parse(row.response_body))),row.rowid);
  if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('A related record lost its link.');
  const sales=db.prepare('SELECT SUM(amount_cents) n FROM enrollment_sales').get().n||0;if(sales!==amountCents)throw Error('Orders and payment totals do not agree.');
  const result={profileKey:marker,fees:fees.map(row=>({id:row.id,name:row.feeName,price:row.price})),orderCount:orderIds.length,paidTotalCents:amountCents,removedFeeIds:removed.map(row=>row.id),backupPath,updatedAt:now};
  db.prepare('INSERT INTO schema_metadata(name,value) VALUES (?,?)').run(marker,JSON.stringify(result));db.exec('COMMIT');return result;
 }catch(error){db.exec('ROLLBACK');throw error;}finally{db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2),get=key=>{const index=args.indexOf(key);if(index<0||!args[index+1])throw Error(`Missing ${key}`);return args[index+1];};
 console.log(JSON.stringify(await simplifyDemoFees({databasePath:resolve(get('--database')),backupPath:resolve(get('--backup')),plan:parse(await readFile(get('--plan'),'utf8'))})));
}
