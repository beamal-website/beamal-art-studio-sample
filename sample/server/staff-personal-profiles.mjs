import {createHash} from 'node:crypto';
import {ApplicationError} from './validation.mjs';

const textLimits={staffNumber:80,fullName:200,localName:200,gender:100,contactEmail:254,phone:100,mobile:100,position:200,employment:100,detail:2000,remarks:2000};
const dates=['joined','dateOfBirth'],fields=[...Object.keys(textLimits),...dates];
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='0001-01-01'&&value<='9999-12-31'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const fail=(status,code,message)=>{throw new ApplicationError(status,code,message);};
const invalid=message=>fail(400,'INVALID_STAFF_PROFILE',message);
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function validateInitialStaffPersonalProfile(input){
 if(!plain(input)||Object.keys(input).some(key=>!fields.includes(key)))invalid('Provide only supported personal-profile fields.');
 const profile={};
 for(const [key,limit]of Object.entries(textLimits)){
  const value=input[key]===undefined?'':input[key];
  if(typeof value!=='string'||value.length>limit)invalid(`${key} must be text of at most ${limit} characters.`);
  profile[key]=value.trim();
 }
 if(!profile.fullName)invalid('Enter the staff member’s full name.');
 if(profile.contactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.contactEmail))invalid('Enter a valid contact email or leave it empty.');
 for(const key of dates){const value=input[key]===undefined||input[key]===''?null:input[key];if(value!==null&&!validDate(value))invalid(`${key} must be empty or a valid ISO date.`);profile[key]=value;}
 return profile;
}

// Personal details are independent of scheduling assignments, payroll and login
// accounts. Initial values are written only by an explicitly invoked provisioner.
export function createStaffPersonalProfileStore({database,transaction,resources,accessControl}){
 database.exec(`
  CREATE TABLE IF NOT EXISTS staff_personal_profiles (
   teacher_resource_id TEXT PRIMARY KEY REFERENCES scheduling_resources(id),
   version INTEGER NOT NULL CHECK(version>0),profile TEXT NOT NULL,
   created_at TEXT NOT NULL,updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS staff_personal_profile_audit_log (
   id INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT NOT NULL REFERENCES users(id),
   teacher_resource_id TEXT NOT NULL REFERENCES staff_personal_profiles(teacher_resource_id),
   action TEXT NOT NULL,version INTEGER NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL
  );
 `);
 const identity=user=>database.prepare('SELECT id,role FROM users WHERE id=?').get(typeof user==='string'?user:user?.id||'');
 const permitted=(user,roles)=>{const actor=identity(user);if(!actor||!roles.includes(actor.role))fail(403,'ROLE_FORBIDDEN','This account cannot access staff personal profiles.');return actor;};
 const dto=row=>{
  const raw=JSON.parse(row.profile),profile=plain(raw)?raw:{};
  return {staffId:row.teacher_resource_id,version:row.version,...Object.fromEntries(Object.entries(textLimits).map(([key,limit])=>[key,typeof profile[key]==='string'&&profile[key].length<=limit?profile[key]:''])),...Object.fromEntries(dates.map(key=>[key,validDate(profile[key])?profile[key]:null]))};
 };
 const list=(user,{since=''}={})=>transaction(()=>{
  const actor=permitted(user,['admin','teacher']);if(typeof since!=='string'||since.length>200)invalid('Choose a profile revision of at most 200 characters.');
  const own=actor.role==='teacher'?accessControl.ownTeacherResourceIds(actor):null;
  const select="SELECT profiles.* FROM staff_personal_profiles AS profiles JOIN scheduling_resources AS resources ON resources.id=profiles.teacher_resource_id WHERE resources.kind='teacher'";
  const rows=own?own.map(id=>database.prepare(select+' AND profiles.teacher_resource_id=?').get(id)).filter(Boolean):database.prepare(select+' ORDER BY profiles.teacher_resource_id').all(),records=rows.map(dto);
  const revision=hash({scope:{id:actor.id,role:actor.role,own},records});return since===revision?{revision,unchanged:true}:{revision,records};
 },'read');
 const createInitial=(resourceId,input,user)=>transaction(()=>{
  const actor=permitted(user,['admin']);
  if(typeof resourceId!=='string'||!resourceId.trim()||resourceId.length>200)invalid('Choose an existing teacher resource.');
  const resource=resources.get(resourceId);if(!resource)fail(404,'STAFF_RESOURCE_NOT_FOUND','The teacher resource was not found.');if(resource.kind!=='teacher')invalid('Personal profiles belong to teacher resources.');
  if(database.prepare('SELECT teacher_resource_id FROM staff_personal_profiles WHERE teacher_resource_id=?').get(resourceId))fail(409,'STAFF_PROFILE_EXISTS','This staff profile already exists and was left unchanged.');
  const profile=validateInitialStaffPersonalProfile(input),now=new Date().toISOString();
  database.prepare('INSERT INTO staff_personal_profiles(teacher_resource_id,version,profile,created_at,updated_at) VALUES (?,1,?,?,?)').run(resourceId,JSON.stringify(profile),now,now);
  const record=dto(database.prepare('SELECT * FROM staff_personal_profiles WHERE teacher_resource_id=?').get(resourceId));
  database.prepare('INSERT INTO staff_personal_profile_audit_log(actor_id,teacher_resource_id,action,version,snapshot,created_at) VALUES (?,?,?,?,?,?)').run(actor.id,resourceId,'staff-profile.create-initial',record.version,JSON.stringify(record),now);
  return record;
 });
 return {list,createInitial,audit:()=>database.prepare('SELECT * FROM staff_personal_profile_audit_log ORDER BY id').all().map(row=>({...row,snapshot:JSON.parse(row.snapshot)}))};
}
