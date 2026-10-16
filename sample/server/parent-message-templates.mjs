import {createHash,randomUUID} from 'node:crypto';
import {ApplicationError} from './validation.mjs';

const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const fail=(status,code,message)=>{throw new ApplicationError(status,code,message);};
const invalid=message=>fail(400,'INVALID_PARENT_MESSAGE_TEMPLATE',message);
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function validateVersion(input,fields){
 if(!plain(input)||Object.keys(input).some(field=>!fields.includes(field)))invalid('Provide only the supported template fields.');
 if(!Number.isSafeInteger(input.version)||input.version<1)fail(409,'VERSION_REQUIRED','Reload the template and include its current version.');
 return input.version;
}
function validateText(input,update=false){
 if(!plain(input)||Object.keys(input).some(field=>!(update?['version','title','body']:['title','body']).includes(field)))invalid('Provide only a template title and message body.');
 const version=update?validateVersion(input,['version','title','body']):null;
 if(typeof input.title!=='string'||!input.title.trim()||input.title.length>120||typeof input.body!=='string'||!input.body.trim()||input.body.length>2000)invalid('Enter a title of at most 120 characters and a message of at most 2000 characters.');
 return {title:input.title,body:input.body,...(update?{version}:{})};
}
function validateQuery(query){
 if(!plain(query)||Object.keys(query).some(field=>!['q','status','page','pageSize','since'].includes(field)))invalid('Choose only the search, status, page, page size and revision.');
 const q=query.q===undefined?'':query.q,status=query.status===undefined?'active':query.status,since=query.since===undefined?'':query.since;
 if(typeof q!=='string'||q.length>200||!['active','archived','all'].includes(status)||typeof since!=='string'||since.length>200)invalid('Choose a valid search, template status and revision.');
 const positive=(value,fallback)=>{if(value===undefined)return fallback;const text=String(value);if(!/^[1-9]\d*$/.test(text)||!Number.isSafeInteger(Number(text)))invalid('Page and page size must be positive whole numbers.');return Number(text);};
 const page=positive(query.page,1),pageSize=positive(query.pageSize,25);if(pageSize>100||!Number.isSafeInteger((page-1)*pageSize))invalid('Choose at most 100 templates per page.');
 return {q:q.trim(),status,page,pageSize,since};
}

export function createParentMessageTemplateStore({database,transaction}){
 transaction(()=>database.exec(`
  CREATE TABLE IF NOT EXISTS parent_message_templates(
   id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,body TEXT NOT NULL,
   archived INTEGER NOT NULL CHECK(archived IN (0,1)),version INTEGER NOT NULL CHECK(version>0),
   created_at TEXT NOT NULL,updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS parent_message_templates_owner ON parent_message_templates(owner_id,archived,updated_at,id);
  CREATE TABLE IF NOT EXISTS parent_message_template_audit_log(
   id INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT NOT NULL REFERENCES users(id),
   template_id TEXT NOT NULL REFERENCES parent_message_templates(id),action TEXT NOT NULL,
   version INTEGER NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL
  );
 `));
 const actorFor=user=>{
  const actor=database.prepare('SELECT id,role FROM users WHERE id=?').get(user&&typeof user.id==='string'?user.id:'');
  if(!actor||!['admin','teacher'].includes(actor.role))fail(403,'ROLE_FORBIDDEN','Only a current administrator or teacher can access their own parent message templates.');
  return actor;
 };
 const dto=row=>({id:row.id,title:row.title,body:row.body,version:row.version,archived:row.archived===1,createdAt:row.created_at,updatedAt:row.updated_at});
 const own=(id,actor)=>{
  const row=typeof id==='string'&&id.length>0&&id.length<=200?database.prepare('SELECT * FROM parent_message_templates WHERE id=? AND owner_id=?').get(id,actor.id):null;
  if(!row)fail(404,'PARENT_MESSAGE_TEMPLATE_NOT_FOUND','Your parent message template was not found.');return row;
 };
 const authorizeManage=(user,id)=>transaction(()=>{const actor=actorFor(user);if(id!==undefined)own(id,actor);return actor;},'read');
 const get=(id,user)=>transaction(()=>dto(own(id,actorFor(user))),'read');
 const list=(query={},user)=>transaction(()=>{
  const actor=actorFor(user),{q,status,page,pageSize,since}=validateQuery(query),where=' WHERE owner_id=?'+(status==='all'?'':' AND archived='+(status==='archived'?1:0))+' AND instr(lower(title||char(10)||body),lower(?))>0',parameters=[actor.id,q],total=database.prepare('SELECT COUNT(*) AS count FROM parent_message_templates'+where).get(...parameters).count;
  const records=database.prepare('SELECT * FROM parent_message_templates'+where+' ORDER BY updated_at DESC,id DESC LIMIT ? OFFSET ?').all(...parameters,pageSize,(page-1)*pageSize).map(dto),revision=hash({owner:actor.id,q,status,page,pageSize,total,records});
  return since===revision?{revision,unchanged:true,total,page,pageSize}:{records,total,page,pageSize,revision};
 },'read');
 const auditRecord=(actor,action,record)=>database.prepare('INSERT INTO parent_message_template_audit_log(actor_id,template_id,action,version,snapshot,created_at) VALUES (?,?,?,?,?,?)').run(actor.id,record.id,action,record.version,JSON.stringify(record),record.updatedAt);
 const create=(input,user)=>transaction(()=>{
  const actor=actorFor(user),data=validateText(input),id=randomUUID(),now=new Date().toISOString();
  database.prepare('INSERT INTO parent_message_templates(id,owner_id,title,body,archived,version,created_at,updated_at) VALUES (?,?,?,?,0,1,?,?)').run(id,actor.id,data.title,data.body,now,now);
  const record=dto(own(id,actor));auditRecord(actor,'parent-message-template.create',record);return record;
 });
 const update=(id,input,user)=>transaction(()=>{
  const actor=actorFor(user),current=own(id,actor),data=validateText(input,true);
  if(data.version!==current.version)fail(409,'VERSION_CONFLICT','This template changed. Reload it before saving.');
  const changed=database.prepare('UPDATE parent_message_templates SET title=?,body=?,version=version+1,updated_at=? WHERE id=? AND owner_id=? AND version=?').run(data.title,data.body,new Date().toISOString(),id,actor.id,data.version);
  if(changed.changes!==1)fail(409,'VERSION_CONFLICT','This template changed. Reload it before saving.');
  const record=dto(own(id,actor));auditRecord(actor,'parent-message-template.update',record);return record;
 });
 const setArchived=(id,input,archived,user)=>transaction(()=>{
  const actor=actorFor(user),current=own(id,actor),version=validateVersion(input,['version']);
  if(typeof archived!=='boolean')invalid('Choose archive or restore.');
  if(version!==current.version)fail(409,'VERSION_CONFLICT','This template changed. Reload it before saving.');
  if((current.archived===1)===archived)fail(409,'TEMPLATE_STATE_CONFLICT',archived?'This template is already archived.':'This template is already active.');
  const changed=database.prepare('UPDATE parent_message_templates SET archived=?,version=version+1,updated_at=? WHERE id=? AND owner_id=? AND version=?').run(Number(archived),new Date().toISOString(),id,actor.id,version);
  if(changed.changes!==1)fail(409,'VERSION_CONFLICT','This template changed. Reload it before saving.');
  const record=dto(own(id,actor));auditRecord(actor,archived?'parent-message-template.archive':'parent-message-template.restore',record);return record;
 });
 const audit=()=>database.prepare('SELECT * FROM parent_message_template_audit_log ORDER BY id').all().map(row=>({...row,snapshot:JSON.parse(row.snapshot)}));
 return {list,get,authorizeManage,create,update,setArchived,audit};
}
