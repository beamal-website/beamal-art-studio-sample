import {randomUUID,createHash} from 'node:crypto';
import {ApplicationError} from './validation.mjs';

const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const invalid=message=>{throw new ApplicationError(400,'INVALID_RESOURCE',message);};
const nameKey=value=>value.trim().toLowerCase();
const roomFields=['capacity','detail','remark','externalLocation'];

export function validateSchedulingResource(input,{update=false}={}) {
  if(!plain(input))invalid('Scheduling resource must be a JSON object.');
  if(update&&(!Number.isSafeInteger(input.version)||input.version<1))throw new ApplicationError(409,'VERSION_REQUIRED','Reload the scheduling resource and include its current version before saving.');
  const allowed=update?['version','displayName','active',...roomFields]:['kind','displayName','active',...roomFields];
  if(Object.keys(input).some(key=>!allowed.includes(key)))invalid('Unsupported scheduling resource field.');
  if(!update&&!['teacher','room'].includes(input.kind))invalid('Choose a teacher or room resource.');
  if(!update&&input.kind==='teacher'&&roomFields.some(key=>Object.hasOwn(input,key)))invalid('Room fields cannot be assigned to a teacher resource.');
  const result=update?{version:input.version}:{kind:input.kind};
  if(!update||Object.hasOwn(input,'displayName')) {
    if(typeof input.displayName!=='string'||!input.displayName.trim()||input.displayName.trim().length>200)invalid('Enter a display name of 1 to 200 characters.');
    result.displayName=input.displayName.trim();
  }
  if(Object.hasOwn(input,'active')) {
    if(typeof input.active!=='boolean')invalid('Active must be true or false.');
    result.active=input.active;
  } else if(!update)result.active=true;
  if(Object.hasOwn(input,'capacity')) {
    if(input.capacity!==null&&(!Number.isSafeInteger(input.capacity)||input.capacity<1))invalid('Room capacity must be empty or a positive whole number.');
    result.capacity=input.capacity;
  } else if(!update&&input.kind==='room')result.capacity=null;
  for(const key of['detail','remark']) {
    if(Object.hasOwn(input,key)) {
      if(typeof input[key]!=='string'||input[key].length>2000)invalid('Room details and remarks must be text of at most 2000 characters.');
      result[key]=input[key].trim();
    } else if(!update&&input.kind==='room')result[key]='';
  }
  if(Object.hasOwn(input,'externalLocation')) {
    if(typeof input.externalLocation!=='boolean')invalid('External location must be true or false.');
    result.externalLocation=input.externalLocation;
  } else if(!update&&input.kind==='room')result.externalLocation=false;
  if(update&&Object.keys(result).length===1)invalid('Choose a display name or active status to change.');
  return result;
}

export function createSchedulingResourceStore({database,transaction}) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS scheduling_resources (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK(kind IN ('teacher','room')),
      display_name TEXT NOT NULL, name_key TEXT NOT NULL,
      active INTEGER NOT NULL CHECK(active IN (0,1)),
      version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      UNIQUE(kind,name_key)
    );
    CREATE TABLE IF NOT EXISTS scheduling_resource_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id TEXT NOT NULL REFERENCES users(id),
      resource_id TEXT NOT NULL REFERENCES scheduling_resources(id),
      action TEXT NOT NULL, version INTEGER NOT NULL,
      snapshot TEXT NOT NULL, created_at TEXT NOT NULL
    );
  `);
  if(!database.prepare('PRAGMA table_info(scheduling_resources)').all().some(column=>column.name==='metadata'))database.exec("ALTER TABLE scheduling_resources ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}'");
  const dto=row=>row?{id:row.id,kind:row.kind,displayName:row.display_name,active:!!row.active,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,...(row.kind==='room'?{capacity:null,detail:'',remark:'',externalLocation:false,...JSON.parse(row.metadata)}:{})}:null;
  const get=id=>dto(database.prepare('SELECT * FROM scheduling_resources WHERE id=?').get(id));
  const getMany=ids=> {
    const unique=[...new Set(ids)],rows=[];
    for(let offset=0;offset<unique.length;offset+=900){const chunk=unique.slice(offset,offset+900);rows.push(...database.prepare(`SELECT * FROM scheduling_resources WHERE id IN (${chunk.map(()=>'?').join(',')})`).all(...chunk).map(dto));}
    return rows;
  };
  const administrator=actorId=> {
    if(database.prepare('SELECT role FROM users WHERE id=?').get(actorId)?.role!=='admin')throw new ApplicationError(403,'ROLE_FORBIDDEN','Only an administrator can change scheduling resources.');
  };
  const uniqueName=(kind,displayName,id='')=> {
    if(database.prepare('SELECT id FROM scheduling_resources WHERE kind=? AND name_key=? AND id<>?').get(kind,nameKey(displayName),id))throw new ApplicationError(409,'RESOURCE_NAME_EXISTS','A scheduling resource of this kind already has this name. Reuse or rename the existing resource.');
  };
  const audit=(actorId,action,resource)=>database.prepare('INSERT INTO scheduling_resource_audit_log(actor_id,resource_id,action,version,snapshot,created_at) VALUES (?,?,?,?,?,?)').run(actorId,resource.id,action,resource.version,JSON.stringify(resource),resource.updatedAt);
  const list=({since=''}={})=>transaction(()=> {
    const versions=database.prepare('SELECT id,version FROM scheduling_resources ORDER BY id').all();
    const revision=createHash('sha256').update(JSON.stringify(versions)).digest('hex');
    if(since===revision)return {revision,unchanged:true};
    return {revision,resources:database.prepare('SELECT * FROM scheduling_resources ORDER BY kind,display_name COLLATE NOCASE,id').all().map(dto)};
  },'read');
  const create=(input,actorId)=>transaction(()=> {
    administrator(actorId);const data=validateSchedulingResource(input);uniqueName(data.kind,data.displayName);
    const id=randomUUID(),now=new Date().toISOString();
    const metadata=Object.fromEntries(roomFields.filter(key=>Object.hasOwn(data,key)).map(key=>[key,data[key]]));
    database.prepare('INSERT INTO scheduling_resources(id,kind,display_name,name_key,active,version,created_at,updated_at,metadata) VALUES (?,?,?,?,?,1,?,?,?)').run(id,data.kind,data.displayName,nameKey(data.displayName),data.active?1:0,now,now,JSON.stringify(metadata));
    const resource=get(id);audit(actorId,'scheduling-resource.create',resource);return resource;
  });
  const update=(id,input,actorId)=>transaction(()=> {
    administrator(actorId);const data=validateSchedulingResource(input,{update:true}),current=get(id);
    if(!current)throw new ApplicationError(404,'RESOURCE_NOT_FOUND','Scheduling resource was not found.');
    if(current.kind==='teacher'&&roomFields.some(key=>Object.hasOwn(data,key)))invalid('Room fields cannot be assigned to a teacher resource.');
    if(current.version!==data.version)throw new ApplicationError(409,'VERSION_CONFLICT','This scheduling resource was changed by someone else. Reload it before saving.');
    const displayName=data.displayName??current.displayName,active=data.active??current.active;uniqueName(current.kind,displayName,id);
    const metadata=Object.fromEntries(roomFields.filter(key=>Object.hasOwn(current,key)||Object.hasOwn(data,key)).map(key=>[key,Object.hasOwn(data,key)?data[key]:current[key]]));
    const now=new Date().toISOString(),changed=database.prepare('UPDATE scheduling_resources SET display_name=?,name_key=?,active=?,metadata=?,version=version+1,updated_at=? WHERE id=? AND version=?').run(displayName,nameKey(displayName),active?1:0,JSON.stringify(metadata),now,id,data.version);
    if(changed.changes!==1)throw new ApplicationError(409,'VERSION_CONFLICT','This scheduling resource was changed by someone else. Reload it before saving.');
    const resource=get(id);audit(actorId,'scheduling-resource.update',resource);return resource;
  });
  return {list,get,getMany,create,update,audit:()=>database.prepare('SELECT * FROM scheduling_resource_audit_log ORDER BY id').all().map(row=>({...row,snapshot:JSON.parse(row.snapshot)}))};
}
