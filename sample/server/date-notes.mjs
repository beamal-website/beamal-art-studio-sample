import {ApplicationError} from './validation.mjs';
const fail=(status,code,message)=>{throw new ApplicationError(status,code,message);};
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value.slice(0,4)!=='0000'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;

// Ownership always comes from the current authenticated account, never a request field.
export function createDateNoteStore({database,transaction}){
 transaction(()=>database.exec(`
  CREATE TABLE IF NOT EXISTS date_notes(
   user_id TEXT NOT NULL REFERENCES users(id),date TEXT NOT NULL,
   text TEXT NOT NULL CHECK(length(text)<=2000),version INTEGER NOT NULL CHECK(version>0),
   created_at TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,date)
  );
  CREATE TABLE IF NOT EXISTS date_note_audit_log(
   id INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT NOT NULL REFERENCES users(id),
   date TEXT NOT NULL,version INTEGER NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL,
   FOREIGN KEY(actor_id,date) REFERENCES date_notes(user_id,date)
  );
 `));
 const owner=(date,user)=>{
  const actor=database.prepare('SELECT id,role FROM users WHERE id=?').get(typeof user?.id==='string'?user.id:'');
  if(!actor||!['admin','teacher'].includes(actor.role))fail(403,'ROLE_FORBIDDEN','Date notes are private to their staff account.');
  if(!validDate(date))fail(400,'INVALID_DATE_NOTE','Choose a valid calendar date.');
  return actor;
 };
 const row=(date,actor)=>database.prepare('SELECT * FROM date_notes WHERE user_id=? AND date=?').get(actor.id,date);
 const project=(date,record)=>({date,version:record?.version??0,text:record?.text??'',updatedAt:record?.updated_at??null,canWrite:true});
 const get=(date,user)=>transaction(()=>{const actor=owner(date,user);return project(date,row(date,actor));},'read');
 const save=(date,input,user)=>transaction(()=>{
  const actor=owner(date,user);
  if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'INVALID_DATE_NOTE','Provide a date note.');
  if(!Number.isSafeInteger(input.version)||input.version<0)fail(409,'VERSION_REQUIRED','Reload the note before saving.');
  if(Object.keys(input).some(key=>!['version','text'].includes(key))||typeof input.text!=='string'||input.text.length>2000)fail(400,'INVALID_DATE_NOTE','Provide only the version and note text of at most 2000 characters.');
  const current=row(date,actor);
  if(input.version!==(current?.version??0))fail(409,'VERSION_CONFLICT','This date note changed. Reload it before saving.');
  if(!current&&!input.text.trim())fail(400,'INVALID_DATE_NOTE','Enter a note before saving it for the first time.');
  const now=new Date().toISOString();
  if(current){
   const changed=database.prepare('UPDATE date_notes SET text=?,version=version+1,updated_at=? WHERE user_id=? AND date=? AND version=?').run(input.text,now,actor.id,date,input.version);
   if(changed.changes!==1)fail(409,'VERSION_CONFLICT','This date note changed. Reload it before saving.');
  }else database.prepare('INSERT INTO date_notes(user_id,date,text,version,created_at,updated_at) VALUES (?,?,?,1,?,?)').run(actor.id,date,input.text,now,now);
  const note=project(date,row(date,actor));
  database.prepare('INSERT INTO date_note_audit_log(actor_id,date,version,snapshot,created_at) VALUES (?,?,?,?,?)').run(actor.id,date,note.version,JSON.stringify(note),now);
  return note;
 });
 const list=(from,to,user)=>transaction(()=>{
  const actor=owner(from,user);
  if(!validDate(to)||from>to||(Date.parse(to)-Date.parse(from))/86400000>61)fail(400,'INVALID_DATE_NOTE_RANGE','Choose a calendar window of at most 62 days.');
  const dates=database.prepare('SELECT date,text FROM date_notes WHERE user_id=? AND date>=? AND date<=? ORDER BY date').all(actor.id,from,to).filter(record=>record.text.trim()).map(record=>record.date);
  return {dates};
 },'read');
 return {get,authorizeWrite:get,save,list};
}
