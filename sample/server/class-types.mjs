import {randomUUID,createHash} from 'node:crypto';
import {ApplicationError} from './validation.mjs';

export const CLASS_TYPE_REGULAR_ID='00000000-0000-4000-8000-000000000001';
export const CLASS_TYPE_SPECIAL_ID='00000000-0000-4000-8000-000000000002';
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const invalid=message=>{throw new ApplicationError(400,'INVALID_CLASS_TYPE',message);};
const snapshotFields=['id','kind','name','studentReschedulingAllowed','version'];
const selectionFields=['classTypeId','classTypeVersion','classTypeCourseVersion'];

export function validateClassType(input,{update=false}={}) {
  if(!plain(input))invalid('Class type must be a JSON object.');
  if(update&&(!Number.isSafeInteger(input.version)||input.version<1))throw new ApplicationError(409,'VERSION_REQUIRED','Reload the class type and include its current version.');
  const allowed=update?['version','name','studentReschedulingAllowed','active']:['name','studentReschedulingAllowed','active'];
  if(Object.keys(input).some(key=>!allowed.includes(key)))invalid('Unsupported or read-only class type field.');
  if(typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>200)invalid('Enter a class type name of 1 to 200 characters.');
  if(!Object.hasOwn(input,'studentReschedulingAllowed')||input.studentReschedulingAllowed!==null&&typeof input.studentReschedulingAllowed!=='boolean')invalid('Student rescheduling must be allowed, forbidden or not configured.');
  if(typeof input.active!=='boolean')invalid('Active must be true or false.');
  return {...(update?{version:input.version}:{}),name:input.name.trim(),studentReschedulingAllowed:input.studentReschedulingAllowed,active:input.active};
}

// Keep request selections separate from the server-created historical snapshot.
export function validateClassTypeSelection(input,{inherit=false}={}) {
  const result=Object.fromEntries(selectionFields.filter(key=>Object.hasOwn(input,key)).map(key=>[key,input[key]]));
  if(Object.hasOwn(result,'classTypeId')) {
    if(result.classTypeId!==null&&(typeof result.classTypeId!=='string'||!result.classTypeId||result.classTypeId.length>200))invalid('Choose an existing class type or clear the selection.');
    if(result.classTypeId!==null&&(!Number.isSafeInteger(result.classTypeVersion)||result.classTypeVersion<1))throw new ApplicationError(409,'CLASS_TYPE_VERSION_REQUIRED','Reload the class type and include its current version.');
    if(result.classTypeId===null&&Object.hasOwn(result,'classTypeVersion')&&result.classTypeVersion!==0)invalid('An empty class type must use version zero.');
    if(Object.hasOwn(result,'classTypeCourseVersion'))invalid('An explicit type selection cannot also inherit a course default.');
  } else if(Object.hasOwn(result,'classTypeVersion')||Object.hasOwn(result,'classTypeCourseVersion')) {
    if(!inherit)invalid('A class type version requires an explicit selection.');
    if(!Number.isSafeInteger(result.classTypeCourseVersion)||result.classTypeCourseVersion<1)throw new ApplicationError(409,'COURSE_VERSION_REQUIRED','Reload the course and include its current version before using its default.');
    if(!Number.isSafeInteger(result.classTypeVersion)||result.classTypeVersion<0)throw new ApplicationError(409,'CLASS_TYPE_VERSION_REQUIRED','Reload the default class type and include its current version.');
  }
  return result;
}

export function createClassTypeStore({database,transaction}) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS class_types (
      id TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN ('regular','special','custom')),
      name TEXT NOT NULL,name_key TEXT NOT NULL UNIQUE,
      student_rescheduling_allowed INTEGER CHECK(student_rescheduling_allowed IS NULL OR student_rescheduling_allowed IN (0,1)),
      active INTEGER NOT NULL CHECK(active IN (0,1)),version INTEGER NOT NULL CHECK(version>0),created_at TEXT NOT NULL,updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS class_type_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,
      class_type_id TEXT NOT NULL REFERENCES class_types(id),version INTEGER NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL
    );
  `);
  transaction(()=>{
    const now=new Date().toISOString();
    for(const [id,kind,name]of[[CLASS_TYPE_REGULAR_ID,'regular','Regular Class'],[CLASS_TYPE_SPECIAL_ID,'special','Special Class']])
      database.prepare('INSERT OR IGNORE INTO class_types VALUES (?,?,?,?,NULL,1,1,?,?)').run(id,kind,name,name.toLowerCase(),now,now);
  });
  const dto=row=>row?{id:row.id,kind:row.kind,name:row.name,studentReschedulingAllowed:row.student_rescheduling_allowed===null?null:!!row.student_rescheduling_allowed,active:!!row.active,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at}:null;
  const get=id=>dto(database.prepare('SELECT * FROM class_types WHERE id=?').get(id));
  const administrator=id=>{if(database.prepare('SELECT role FROM users WHERE id=?').get(id)?.role!=='admin')throw new ApplicationError(403,'ROLE_FORBIDDEN','Only an administrator can change class types.');};
  const unique=(name,id='')=>{if(database.prepare('SELECT id FROM class_types WHERE name_key=? AND id<>?').get(name.toLowerCase(),id))throw new ApplicationError(409,'CLASS_TYPE_NAME_EXISTS','A class type with this name already exists.');};
  const audit=(actor,action,type)=>database.prepare('INSERT INTO class_type_audit_log(actor_id,action,class_type_id,version,snapshot,created_at) VALUES (?,?,?,?,?,?)').run(actor,action,type.id,type.version,JSON.stringify(type),type.updatedAt);
  const list=({since=''}={})=>transaction(()=>{const types=database.prepare('SELECT * FROM class_types ORDER BY CASE kind WHEN \'regular\' THEN 0 WHEN \'special\' THEN 1 ELSE 2 END,created_at,id').all().map(dto),revision=createHash('sha256').update(JSON.stringify(types)).digest('hex');return since===revision?{revision,unchanged:true}:{revision,types};},'read');
  const create=(input,actor)=>transaction(()=>{administrator(actor);const data=validateClassType(input);unique(data.name);const id=randomUUID(),now=new Date().toISOString();database.prepare('INSERT INTO class_types VALUES (?,\'custom\',?,?,?,?,1,?,?)').run(id,data.name,data.name.toLowerCase(),data.studentReschedulingAllowed===null?null:Number(data.studentReschedulingAllowed),Number(data.active),now,now);const type=get(id);audit(actor,'class-type.create',type);return type;});
  const update=(id,input,actor)=>transaction(()=>{administrator(actor);const data=validateClassType(input,{update:true}),current=get(id);if(!current)throw new ApplicationError(404,'CLASS_TYPE_NOT_FOUND','Class type was not found.');if(current.version!==data.version)throw new ApplicationError(409,'VERSION_CONFLICT','This class type changed. Reload it before saving.');unique(data.name,id);const now=new Date().toISOString(),changed=database.prepare('UPDATE class_types SET name=?,name_key=?,student_rescheduling_allowed=?,active=?,version=version+1,updated_at=? WHERE id=? AND version=?').run(data.name,data.name.toLowerCase(),data.studentReschedulingAllowed===null?null:Number(data.studentReschedulingAllowed),Number(data.active),now,id,data.version);if(changed.changes!==1)throw new ApplicationError(409,'VERSION_CONFLICT','This class type changed. Reload it before saving.');const type=get(id);audit(actor,'class-type.update',type);return type;});
  const snapshot=(id,version)=>{const type=get(id);if(!type)invalid('Choose an existing class type.');if(type.version!==version)throw new ApplicationError(409,'CLASS_TYPE_VERSION_CONFLICT','This class type configuration changed. Reload it before choosing it.');if(!type.active)throw new ApplicationError(409,'CLASS_TYPE_INACTIVE','Choose an active class type or keep the saved configuration.');return Object.fromEntries(snapshotFields.map(key=>[key,type[key]]));};
  return {list,get,create,update,snapshot,audit:()=>database.prepare('SELECT * FROM class_type_audit_log ORDER BY id').all().map(row=>({...row,snapshot:JSON.parse(row.snapshot)}))};
}
