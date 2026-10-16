import {ApplicationError} from './validation.mjs';

const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const fail=(status,code,message)=>{throw new ApplicationError(status,code,message);};
const invalid=message=>fail(400,'INVALID_PACKAGE_CONTENTS',message);

function validateComponents(value){
 if(!Array.isArray(value)||value.length>50)invalid('Provide up to 50 ordered package components.');
 const seen=new Set();
 return value.map(component=>{
  if(!plain(component)||Object.keys(component).some(key=>!['id','name','minutes'].includes(key)))invalid('Each component needs only an identifier, name and minutes.');
  const {id,name,minutes}=component;
  if(typeof id!=='string'||!id||id.trim()!==id||id.length>200||seen.has(id))invalid('Use a unique nonempty identifier for each component.');
  if(typeof name!=='string'||!name.trim()||name.length>200)invalid('Each component needs a name of at most 200 characters.');
  if(!Number.isSafeInteger(minutes)||minutes<1||minutes>1440)invalid('Each component needs a whole number of minutes between 1 and 1440.');
  seen.add(id);return {id,name,minutes};
 });
}
function validateInput(input){
 if(!plain(input)||Object.keys(input).some(key=>!['version','feeVersion','components'].includes(key)))invalid('Provide only the current contents version, fee version and ordered components.');
 if(!Number.isSafeInteger(input.version)||input.version<0)fail(409,'VERSION_REQUIRED','Reload the package contents and include their current version, or zero for unset contents.');
 if(!Number.isSafeInteger(input.feeVersion)||input.feeVersion<1)fail(409,'FEE_VERSION_REQUIRED','Reload the fee and include its current version.');
 return {version:input.version,feeVersion:input.feeVersion,components:validateComponents(input.components)};
}

export function createPackageContentsStore({database,transaction,getFee,getCourse,accessControl}){
 transaction(()=>database.exec(`
  CREATE TABLE IF NOT EXISTS fee_package_contents(
   fee_id TEXT PRIMARY KEY REFERENCES fees(id),version INTEGER NOT NULL CHECK(version>0),
   components TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS fee_package_content_audit_log(
   id INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT NOT NULL REFERENCES users(id),
   fee_id TEXT NOT NULL REFERENCES fee_package_contents(fee_id),action TEXT NOT NULL,
   version INTEGER NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL
  );
 `));
 const reader=user=>{
  const actor=database.prepare('SELECT id,role FROM users WHERE id=?').get(user&&typeof user.id==='string'?user.id:'');
  if(!actor||!['admin','teacher'].includes(actor.role))fail(403,'ROLE_FORBIDDEN','Package contents are only available to administrators and authorized teachers.');
  return actor;
 };
 const target=(id,user,write=false)=>{
  const actor=reader(user);
  if(write&&actor.role!=='admin')fail(403,'ROLE_FORBIDDEN','Only an administrator can save package contents.');
  if(typeof id!=='string'||!id||id.trim()!==id||id.length>200)invalid('Choose an exact fee identifier.');
  const fee=getFee(id),activeIds=(fee?.courseIds||[]).filter(courseId=>{const course=getCourse(courseId);return course&&!course.deletedAt;});
  if(!fee||!activeIds.length||actor.role==='teacher'&&!activeIds.some(courseId=>accessControl.canReadCourse(courseId,actor)))fail(404,'PACKAGE_CONTENTS_NOT_FOUND','The active authorized package fee was not found.');
  if(fee.pricingModel!=='package')fail(409,'PACKAGE_FEE_REQUIRED','Contents can only be read or saved for a package fee.');
  return {actor,fee};
 };
 const record=id=>database.prepare('SELECT * FROM fee_package_contents WHERE fee_id=?').get(id);
 const project=(fee,row)=>({feeId:fee.id,feeVersion:fee.version,version:row?.version??0,components:row?validateComponents(JSON.parse(row.components)):[],updatedAt:row?.updated_at??null});
 const get=(id,user)=>transaction(()=>{const {fee}=target(id,user);return project(fee,record(id));},'read');
 // Expected versions are checked only for a fresh write. An exact lost-ack
 // retry may replay its receipt while the actor and package remain authorized.
 const authorizeWrite=(id,user)=>transaction(()=>{const {fee}=target(id,user,true);return project(fee,record(id));},'read');
 const save=(id,input,user)=>transaction(()=>{
  const {actor,fee}=target(id,user,true),data=validateInput(input),current=record(id);
  if(data.feeVersion!==fee.version)fail(409,'FEE_VERSION_CONFLICT','This fee changed. Reload it before saving package contents.');
  if(data.version!==(current?.version??0))fail(409,'VERSION_CONFLICT','These package contents changed. Reload them before saving.');
  if(!current&&!data.components.length)invalid('Add a component before saving package contents for the first time.');
  const now=new Date().toISOString(),encoded=JSON.stringify(data.components);
  if(current){
   const changed=database.prepare('UPDATE fee_package_contents SET components=?,version=version+1,updated_at=? WHERE fee_id=? AND version=?').run(encoded,now,id,data.version);
   if(changed.changes!==1)fail(409,'VERSION_CONFLICT','These package contents changed. Reload them before saving.');
  }else database.prepare('INSERT INTO fee_package_contents(fee_id,version,components,created_at,updated_at) VALUES (?,1,?,?,?)').run(id,encoded,now,now);
  const contents=project(fee,record(id));
  database.prepare('INSERT INTO fee_package_content_audit_log(actor_id,fee_id,action,version,snapshot,created_at) VALUES (?,?,?,?,?,?)').run(actor.id,id,'package-contents.save',contents.version,JSON.stringify(contents),now);
  return contents;
 });
 const audit=()=>database.prepare('SELECT * FROM fee_package_content_audit_log ORDER BY id').all().map(row=>({...row,snapshot:JSON.parse(row.snapshot)}));
 return {get,authorizeWrite,save,audit};
}
