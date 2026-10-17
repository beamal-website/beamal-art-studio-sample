import {randomUUID} from 'node:crypto';
import {ApplicationError} from './validation.mjs';

const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const invalid=message=>{throw new ApplicationError(400,'INVALID_TRIAL_APPLICATION',message)};
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='0001-01-01'&&value<=new Date().toISOString().slice(0,10)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;

export function validateTrialApplication(input){
 const allowed=['courseId','courseName','studentNameZh','studentNameEn','birthDate','school','referrerName','interestedTimeslot','whatsappNumber','email','parentName'];
 if(!plain(input)||Object.keys(input).some(key=>!allowed.includes(key)))invalid('The application contains unsupported fields.');
 const text=(key,max,{required=false}={})=>{
  const value=input[key]??'';if(typeof value!=='string'||value.length>max)invalid(`${key} must be text of at most ${max} characters.`);
  const normalized=value.trim();if(required&&!normalized)invalid(`${key} is required.`);return normalized;
 };
 const courseId=text('courseId',200)||null,courseName=text('courseName',200,{required:true}),studentNameZh=text('studentNameZh',200,{required:true}),studentNameEn=text('studentNameEn',200,{required:true}),birthDate=text('birthDate',10,{required:true}),school=text('school',200),referrerName=text('referrerName',200),interestedTimeslot=text('interestedTimeslot',300,{required:true}),whatsappNumber=text('whatsappNumber',40,{required:true}),email=text('email',254,{required:true}),parentName=text('parentName',200,{required:true});
 if(!validDate(birthDate))invalid('Enter a valid birth date that is not in the future.');
 if(!/^[+0-9().\s-]+$/.test(whatsappNumber)||whatsappNumber.replace(/\D/g,'').length<7||whatsappNumber.replace(/\D/g,'').length>20)invalid('Enter a valid WhatsApp number.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))invalid('Enter a valid email address.');
 return {courseId,courseName,studentNameZh,studentNameEn,birthDate,school,referrerName,interestedTimeslot,whatsappNumber,email,parentName};
}

export function createTrialInquiryStore({database,transaction}){
 // The earlier cloud form used trial_applications for unreserved enquiries.
 // Rename that schema without changing IDs or rows before the slot-backed
 // application store creates its separate reservation model.
 transaction(()=>{
  const columns=database.prepare('PRAGMA table_info(trial_applications)').all().map(row=>row.name);
  if(columns.includes('student_name_zh')&&!columns.includes('person_id')){
   if(database.prepare('PRAGMA table_info(trial_inquiries)').all().length)throw new Error('Both legacy trial enquiries and trial_inquiries exist; review their data before continuing.');
   database.exec('ALTER TABLE trial_applications RENAME TO trial_inquiries');
  }
 });
 database.exec(`
  CREATE TABLE IF NOT EXISTS trial_inquiries (
   id TEXT PRIMARY KEY,course_id TEXT,course_name TEXT NOT NULL,student_name_zh TEXT NOT NULL,student_name_en TEXT NOT NULL,
   birth_date TEXT NOT NULL,school TEXT NOT NULL,referrer_name TEXT NOT NULL,interested_timeslot TEXT NOT NULL,
   whatsapp_number TEXT NOT NULL,email TEXT NOT NULL,parent_name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'new',created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS trial_inquiries_created ON trial_inquiries(created_at,id);
  CREATE INDEX IF NOT EXISTS trial_inquiries_course ON trial_inquiries(course_id,created_at);
 `);
 const select='SELECT id,course_id,course_name,student_name_zh,student_name_en,birth_date,school,referrer_name,interested_timeslot,whatsapp_number,email,parent_name,status,created_at FROM trial_inquiries';
 const dto=row=>row?{id:row.id,courseId:row.course_id,courseName:row.course_name,studentNameZh:row.student_name_zh,studentNameEn:row.student_name_en,birthDate:row.birth_date,school:row.school,referrerName:row.referrer_name,interestedTimeslot:row.interested_timeslot,whatsappNumber:row.whatsapp_number,email:row.email,parentName:row.parent_name,status:row.status,createdAt:row.created_at}:null;
 return {
  create(input){return transaction(()=>{
   const application=validateTrialApplication(input);let courseId=application.courseId,courseName=application.courseName;
   if(courseId){
    const row=database.prepare(`SELECT courses.data FROM courses WHERE courses.id=? AND courses.deleted_at IS NULL AND EXISTS (SELECT 1 FROM course_fees JOIN fees ON fees.id=course_fees.fee_id WHERE course_fees.course_id=courses.id AND fees.online_store=1)`).get(courseId);
    if(!row)throw new ApplicationError(404,'PUBLIC_COURSE_NOT_FOUND','This course is not available for trial applications.');
    courseName=JSON.parse(row.data).courseName;
   }
   const id=randomUUID(),createdAt=new Date().toISOString();
   database.prepare('INSERT INTO trial_inquiries(id,course_id,course_name,student_name_zh,student_name_en,birth_date,school,referrer_name,interested_timeslot,whatsapp_number,email,parent_name,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,courseId,courseName,application.studentNameZh,application.studentNameEn,application.birthDate,application.school,application.referrerName,application.interestedTimeslot,application.whatsappNumber,application.email,application.parentName,'new',createdAt);
   return dto(database.prepare(`${select} WHERE id=?`).get(id));
  });},
  get(id){return transaction(()=>dto(database.prepare(`${select} WHERE id=?`).get(id)),'read');},
 };
}