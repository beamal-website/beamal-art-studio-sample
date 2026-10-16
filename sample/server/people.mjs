import {randomUUID,createHash} from 'node:crypto';
import {ApplicationError} from './validation.mjs';

const textLimits={displayName:200,parentName:200,whatsApp:80,email:254,school:200,referrer:200,localName:200,firstName:200,lastName:200,phone:80,address:1000,level:200,remark:2000,citizenId:200,fullName:200,gender:200,mobile:80,district:200,contact1Name:200,contact1Phone:80,contact1Email:254,contact2Name:200,contact2Phone:80,contact2Email:254,occupation:200,detail:2000,billName:200};
const dateFields=['dateOfBirth','enrollmentDate','quitDate'];
const emails=new Set(['email','contact1Email','contact2Email']);
const profileFields=[...Object.keys(textLimits),...dateFields,'promotion'];
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const invalid=message=>{throw new ApplicationError(400,'INVALID_PERSON',message);};
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='0001-01-01'&&value<='9999-12-31'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;

export function validatePerson(input,{update=false}={}) {
  if(!plain(input))invalid('Profile must be a JSON object.');
  if(update&&(!Number.isSafeInteger(input.version)||input.version<1))throw new ApplicationError(409,'VERSION_REQUIRED','Reload the profile and include its current version before saving.');
  if(Object.keys(input).some(key=>!profileFields.includes(key)&&!(update&&key==='version')))invalid('Unsupported or read-only profile field.');
  const result=update?{version:input.version}:{};
  for(const [key,limit]of Object.entries(textLimits)){
    if(!Object.hasOwn(input,key)&&update)continue;
    const value=input[key]??(!Object.hasOwn(input,key)?'':null);
    if(typeof value!=='string'||value.length>limit)invalid(`${key} must be text of at most ${limit} characters.`);
    result[key]=value.trim();
    if(key==='displayName'&&!result[key])invalid('Enter a display name.');
    if(emails.has(key)&&result[key]&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result[key]))invalid(`${key} must be empty or a valid email address.`);
  }
  for(const key of dateFields){
    if(!Object.hasOwn(input,key)&&update)continue;
    const value=input[key]===undefined||input[key]===''?null:input[key];
    if(value!==null&&!validDate(value))invalid(`${key} must be empty or a valid ISO calendar date.`);
    result[key]=value;
  }
  if(Object.hasOwn(input,'promotion')||!update){
    const value=input.promotion===undefined?null:input.promotion;
    if(value!==null&&typeof value!=='boolean')invalid('Promotion consent must be empty, true or false.');
    result.promotion=value;
  }
  if(update&&Object.keys(result).length===1)invalid('Choose a profile field to change.');
  return result;
}

export function validatePeopleQuery(input={}) {
  const bad=message=>{throw new ApplicationError(400,'INVALID_PEOPLE_QUERY',message);};
  if(!plain(input)||Object.keys(input).some(key=>!['kind','q','page','pageSize','sort','direction','since'].includes(key)))bad('Unsupported profile list query.');
  const kind=input.kind??'applicant',q=input.q??'',sort=input.sort??'displayName',direction=input.direction??'asc',since=input.since??'';
  if(!['applicant','student'].includes(kind)||!['displayName','createdAt'].includes(sort)||!['asc','desc'].includes(direction))bad('Choose a supported kind and sort order.');
  if(typeof q!=='string'||q.length>200||typeof since!=='string'||since.length>200)bad('Use a search phrase and revision of at most 200 characters.');
  const positive=(value,fallback)=>{const source=String(value??fallback);if(!/^[1-9]\d*$/.test(source)||!Number.isSafeInteger(Number(source)))bad('Page and page size must be positive whole numbers.');return Number(source);};
  const page=positive(input.page,1),pageSize=positive(input.pageSize,25);
  if(pageSize>100||!Number.isSafeInteger((page-1)*pageSize))bad('Use at most 100 profiles per page.');
  return {kind,q:q.trim(),page,pageSize,sort,direction,since};
}

export function createPeopleStore({database,transaction}) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN ('applicant','student')),
      display_name TEXT NOT NULL,profile TEXT NOT NULL,search_text TEXT NOT NULL,
      version INTEGER NOT NULL CHECK(version>0),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
      converted_at TEXT,converted_by TEXT REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS people_kind_name ON people(kind,display_name COLLATE NOCASE,id);
    CREATE INDEX IF NOT EXISTS people_kind_created ON people(kind,created_at,id);
    CREATE TABLE IF NOT EXISTS person_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,person_id TEXT NOT NULL REFERENCES people(id),
      actor_id TEXT REFERENCES users(id),actor_name TEXT NOT NULL,
      action TEXT NOT NULL,version INTEGER NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS person_audit_person ON person_audit_log(person_id,id);
  `);
  // Public form submissions have no user account. Preserve every old audit row,
  // index, trigger and AUTOINCREMENT high-water mark when removing NOT NULL.
  if(database.prepare('PRAGMA table_info(person_audit_log)').all().find(column=>column.name==='actor_id')?.notnull)transaction(()=>{
    const objects=database.prepare("SELECT sql FROM sqlite_master WHERE tbl_name='person_audit_log' AND type IN ('index','trigger') AND sql IS NOT NULL").all();
    const sequence=database.prepare("SELECT seq FROM sqlite_sequence WHERE name='person_audit_log'").get()?.seq??0;
    database.exec(`CREATE TABLE person_audit_log_nullable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,person_id TEXT NOT NULL REFERENCES people(id),
      actor_id TEXT REFERENCES users(id),actor_name TEXT NOT NULL,
      action TEXT NOT NULL,version INTEGER NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL
    );
    INSERT INTO person_audit_log_nullable SELECT * FROM person_audit_log;
    DROP TABLE person_audit_log;
    ALTER TABLE person_audit_log_nullable RENAME TO person_audit_log;`);
    for(const object of objects)database.exec(object.sql);
    const current=database.prepare("SELECT seq FROM sqlite_sequence WHERE name='person_audit_log'").get();
    if(current)database.prepare("UPDATE sqlite_sequence SET seq=? WHERE name='person_audit_log'").run(Math.max(sequence,current.seq));
    else database.prepare('INSERT INTO sqlite_sequence(name,seq) VALUES (?,?)').run('person_audit_log',sequence);
  });
  const administrator=actorId=>{const actor=database.prepare('SELECT id,display_name,role FROM users WHERE id=?').get(actorId);if(actor?.role!=='admin')throw new ApplicationError(403,'ROLE_FORBIDDEN','Only an administrator can access profiles until explicit profile permissions are available.');return actor;};
  const defaults={...Object.fromEntries(Object.keys(textLimits).map(key=>[key,''])),...Object.fromEntries(dateFields.map(key=>[key,null])),promotion:null};
  const dto=row=>{
    if(!row)return null;const profile=JSON.parse(row.profile);
    return {...Object.fromEntries(profileFields.map(key=>[key,Object.hasOwn(profile,key)?profile[key]:defaults[key]])),displayName:row.display_name,id:row.id,kind:row.kind,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,convertedAt:row.converted_at,convertedBy:row.converted_by?{id:row.converted_by,displayName:row.converter_name}:null};
  };
  const select='SELECT people.*,converter.display_name AS converter_name FROM people LEFT JOIN users AS converter ON converter.id=people.converted_by';
  const record=id=>database.prepare(`${select} WHERE people.id=?`).get(id);
  const get=(id,actorId)=>transaction(()=>{administrator(actorId);const person=dto(record(id));if(!person)throw new ApplicationError(404,'PERSON_NOT_FOUND','Profile was not found.');return person;},'read');
  const searchText=profile=>Object.values(profile).filter(value=>typeof value==='string').join('\n').toLowerCase();
  const audit=(actor,action,person)=>database.prepare('INSERT INTO person_audit_log(person_id,actor_id,actor_name,action,version,snapshot,created_at) VALUES (?,?,?,?,?,?,?)').run(person.id,actor.id,actor.display_name,action,person.version,JSON.stringify(person),person.updatedAt);
  const list=(query,actorId)=>transaction(()=>{
    administrator(actorId);const normalized=validatePeopleQuery(query),{kind,q,page,pageSize,sort,direction,since}=normalized;
    const where='WHERE people.kind=? AND instr(people.search_text,?)>0',params=[kind,q.toLowerCase()],versions=database.prepare(`SELECT id,version FROM people ${where} ORDER BY id`).all(...params),total=versions.length;
    const revision=createHash('sha256').update(JSON.stringify({scope:'administrator-profiles-v1',kind,q:q.toLowerCase(),page,pageSize,sort,direction,versions})).digest('hex');
    if(since===revision)return {revision,unchanged:true,page,pageSize,total};
    const column=sort==='displayName'?'people.display_name COLLATE NOCASE':'people.created_at',order=direction==='asc'?'ASC':'DESC';
    const people=database.prepare(`${select} ${where} ORDER BY ${column} ${order},people.id ASC LIMIT ? OFFSET ?`).all(...params,pageSize,(page-1)*pageSize).map(dto);
    return {revision,people,page,pageSize,total};
  },'read');
  const insertApplicant=(input,actor,action)=>{
    const profile=validatePerson(input),id=randomUUID(),now=new Date().toISOString();
    database.prepare("INSERT INTO people(id,kind,display_name,profile,search_text,version,created_at,updated_at) VALUES (?,'applicant',?,?,?,1,?,?)").run(id,profile.displayName,JSON.stringify(profile),searchText(profile),now,now);
    const person=dto(record(id));audit(actor,action,person);return person;
  };
  const create=(input,actorId)=>transaction(()=>insertApplicant(input,administrator(actorId),'person.create'));
  // Internal orchestration helpers, never general anonymous profile endpoints.
  const createPublicApplicant=input=>transaction(()=>insertApplicant(input,{id:null,display_name:'Public trial form'},'person.public-create'));
  const profileForTrial=id=>dto(record(id));
  const update=(id,input,actorId)=>transaction(()=>{
    const actor=administrator(actorId),patch=validatePerson(input,{update:true}),current=dto(record(id));
    if(!current)throw new ApplicationError(404,'PERSON_NOT_FOUND','Profile was not found.');
    if(current.version!==patch.version)throw new ApplicationError(409,'VERSION_CONFLICT','This profile changed. Reload it before saving.');
    const profile=Object.fromEntries(profileFields.map(key=>[key,Object.hasOwn(patch,key)?patch[key]:current[key]])),now=new Date().toISOString();
    const changed=database.prepare('UPDATE people SET display_name=?,profile=?,search_text=?,version=version+1,updated_at=? WHERE id=? AND version=?').run(profile.displayName,JSON.stringify(profile),searchText(profile),now,id,patch.version);
    if(changed.changes!==1)throw new ApplicationError(409,'VERSION_CONFLICT','This profile changed. Reload it before saving.');
    const person=dto(record(id));audit(actor,'person.update',person);return person;
  });
  const history=(id,actorId)=>transaction(()=>{
    administrator(actorId);if(!record(id))throw new ApplicationError(404,'PERSON_NOT_FOUND','Profile was not found.');
    return database.prepare('SELECT * FROM person_audit_log WHERE person_id=? ORDER BY id').all(id).map(row=>({id:row.id,action:row.action,version:row.version,actor:{id:row.actor_id,displayName:row.actor_name},createdAt:row.created_at,snapshot:JSON.parse(row.snapshot)}));
  },'read');
  return {list,get,create,update,history,createPublicApplicant,profileForTrial};
}
