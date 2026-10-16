import {createHash,randomUUID} from 'node:crypto';
import {ApplicationError} from './validation.mjs';

const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=(status,code,message)=>{throw new ApplicationError(status,code,message);};
const invalid=message=>fail(400,'INVALID_PARENT_MESSAGE',message);
function validateInput(input){
 if(!plain(input)||Object.keys(input).some(field=>!['revision','message'].includes(field))||typeof input.revision!=='string'||!/^[a-f0-9]{64}$/.test(input.revision)||typeof input.message!=='string'||!input.message.trim()||input.message.length>2000)invalid('Provide the reviewed lesson revision and a nonempty message of at most 2000 characters.');
 return {revision:input.revision,message:input.message};
}
function validateQuery(query){
 if(!plain(query)||Object.keys(query).some(field=>!['page','pageSize','since'].includes(field)))invalid('Choose only the inbox page, page size and revision.');
 const positive=(value,fallback)=>{if(value===undefined)return fallback;const source=String(value);if(!/^[1-9]\d*$/.test(source)||!Number.isSafeInteger(Number(source)))invalid('Inbox pages must be positive whole numbers.');return Number(source);};
 const page=positive(query.page,1),pageSize=positive(query.pageSize,25),since=query.since??'';
 if(pageSize>100||!Number.isSafeInteger((page-1)*pageSize)||typeof since!=='string'||since.length>200||query.since===null)invalid('Choose at most 100 messages per page and a supported revision.');
 return {page,pageSize,since};
}

export function createLessonParentMessageStore({database,transaction,enrollmentOrders}){
 transaction(()=>database.exec(`
  CREATE TABLE IF NOT EXISTS lesson_parent_messages(
   id TEXT PRIMARY KEY,session_id TEXT NOT NULL REFERENCES student_sessions(id),
   student_id TEXT NOT NULL REFERENCES people(id),sender_id TEXT NOT NULL REFERENCES users(id),
   recipient_user_id TEXT NOT NULL REFERENCES users(id),data TEXT NOT NULL,created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS lesson_parent_messages_recipient ON lesson_parent_messages(recipient_user_id,created_at,id);
  CREATE TABLE IF NOT EXISTS lesson_parent_message_audit_log(
   id INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT NOT NULL REFERENCES users(id),
   message_id TEXT NOT NULL REFERENCES lesson_parent_messages(id),action TEXT NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL
  );
 `));
 const context=(id,user)=>enrollmentOrders.authorizedParentMessageContext(id,user);
 const authorizeSend=(id,input,user)=>transaction(()=>{
  const current=context(id,user),data=validateInput(input);
  if(data.revision!==current.revision)fail(409,'PARENT_MESSAGE_CONTEXT_CHANGED','The lesson, parent contact or linked account changed. Reload the message details before sending.');
  if(!current.appRecipient)fail(409,'PARENT_APP_RECIPIENT_REQUIRED','This student needs an explicitly linked student account to receive a local App message.');
  return {context:current,input:data};
 },'read');
 const send=(id,input,user)=>transaction(()=>{
  const {context:current,input:data}=authorizeSend(id,input,user),createdAt=new Date().toISOString(),message={id:randomUUID(),sessionId:current.sessionId,studentId:current.studentId,studentName:current.studentName,senderId:current.sender.id,senderName:current.sender.displayName,recipientUserId:current.appRecipient.userId,recipientName:current.appRecipient.displayName,courseName:current.courseName,date:current.date,time:current.time,body:data.message,createdAt,channel:'app-test'};
  database.prepare('INSERT INTO lesson_parent_messages(id,session_id,student_id,sender_id,recipient_user_id,data,created_at) VALUES (?,?,?,?,?,?,?)').run(message.id,message.sessionId,message.studentId,message.senderId,message.recipientUserId,JSON.stringify(message),createdAt);
  database.prepare('INSERT INTO lesson_parent_message_audit_log(actor_id,message_id,action,snapshot,created_at) VALUES (?,?,?,?,?)').run(current.sender.id,message.id,'lesson-parent-message.app-test',JSON.stringify(message),createdAt);
  return message;
 });
 const inbox=(query={},user)=>transaction(()=>{
  const actor=database.prepare('SELECT id,role FROM users WHERE id=?').get(user&&typeof user.id==='string'?user.id:'');
  if(actor?.role!=='student')fail(403,'ROLE_FORBIDDEN','This inbox is only available to the current student recipient account.');
  const {page,pageSize,since}=validateQuery(query),eligible=`FROM lesson_parent_messages AS messages WHERE messages.recipient_user_id=? AND EXISTS(SELECT 1 FROM student_account_links AS links JOIN people ON people.id=links.student_id AND people.kind='student' WHERE links.student_id=messages.student_id AND links.user_id=messages.recipient_user_id)`,total=database.prepare('SELECT COUNT(*) AS count '+eligible).get(actor.id).count;
  const records=database.prepare('SELECT messages.data '+eligible+' ORDER BY messages.created_at DESC,messages.id DESC LIMIT ? OFFSET ?').all(actor.id,pageSize,(page-1)*pageSize).map(row=>{
   const saved=JSON.parse(row.data);return Object.fromEntries(['id','sessionId','studentId','studentName','senderId','senderName','recipientUserId','recipientName','courseName','date','time','body','createdAt','channel'].map(field=>[field,saved[field]]));
  }),revision=hash({actor:actor.id,page,pageSize,total,records});
  return since===revision?{revision,unchanged:true,total,page,pageSize}:{records,total,page,pageSize,revision};
 },'read');
 const audit=()=>database.prepare('SELECT * FROM lesson_parent_message_audit_log ORDER BY id').all().map(row=>({...row,snapshot:JSON.parse(row.snapshot)}));
 return {context,authorizeSend,send,inbox,audit};
}
