import {randomUUID,createHash} from 'node:crypto';
import {ApplicationError} from './validation.mjs';

const policies=['name-birth-whatsapp','name-whatsapp','name-contact'];
const applicantFields=['localName','fullName','dateOfBirth','gender','school','referrer','parentName','whatsapp','email','remark'];
const limits={localName:200,fullName:200,school:200,referrer:200,parentName:200,whatsapp:80,email:254,remark:2000,gender:20,dateOfBirth:10};
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const fail=(status,code,message)=>{throw new ApplicationError(status,code,message);};
const invalid=message=>fail(400,'INVALID_TRIAL_APPLICATION',message);
const id=value=>typeof value==='string'&&!!value&&value.trim()===value&&value.length<=200;
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='0001-01-01'&&value<='9999-12-31'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):plain(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const requestHash=input=>{try{const serialized=JSON.stringify(canonical(input));if(typeof serialized!=='string')invalid('Provide a JSON trial application.');return hash(serialized);}catch{invalid('Provide a JSON trial application.');}};
const route='POST /api/public/trial-applications';

function submission(input){
 if(!plain(input)||Object.keys(input).some(key=>!['courseId','slotId','from','days','revision','applicant'].includes(key)))invalid('Provide only the reviewed course, time, date range and applicant details.');
 if(!id(input.courseId)||!id(input.slotId)||!date(input.from)||!Number.isInteger(input.days)||input.days<7||input.days>30||typeof input.revision!=='string'||!/^[a-f0-9]{64}$/.test(input.revision))invalid('Provide the exact reviewed public course, time and date range.');
 if(!plain(input.applicant)||Object.keys(input.applicant).some(key=>!applicantFields.includes(key)))invalid('Provide only the public trial applicant fields.');
 const applicant={};
 for(const field of applicantFields){const value=Object.hasOwn(input.applicant,field)?input.applicant[field]:'';if(typeof value!=='string'||value.length>limits[field])invalid(`${field} must be text within its supported length.`);applicant[field]=value;}
 if(applicant.email.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicant.email.trim()))invalid('Enter a valid email address.');
 if(applicant.dateOfBirth&&(!date(applicant.dateOfBirth)||applicant.dateOfBirth>today()))invalid('Enter a valid date of birth that is not in the future.');
 if(!['','male','female','unspecified'].includes(applicant.gender))invalid('Choose a supported gender value or leave it blank.');
 return {...input,applicant};
}
function requestKey(value){
 if(typeof value!=='string'||!(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)||/^[A-Za-z0-9_-]{32,100}$/.test(value)))fail(400,'INVALID_IDEMPOTENCY_KEY','Use a newly generated random request key of at least 128 bits.');
 return value;
}
function required(applicant){
 if(!applicant.localName.trim())invalid('Enter a Chinese name.');
 if(!applicant.fullName.trim())invalid('Enter an English name.');
 if(!applicant.dateOfBirth)invalid('Enter a date of birth.');
 if(!applicant.gender)invalid('Choose a gender option.');
 if(!applicant.whatsapp.trim())invalid('Enter a WhatsApp contact.');
}
function listQuery(input={}){
 if(!plain(input)||Object.keys(input).some(key=>!['personId','status','page','pageSize','since'].includes(key)))invalid('Choose supported trial request filters.');
 const status=input.status===undefined?'all':input.status,personId=input.personId===undefined?'':input.personId,since=input.since===undefined?'':input.since;
 if(!['all','pending','accepted','rejected'].includes(status)||personId!==''&&!id(personId)||typeof since!=='string'||since.length>200)invalid('Choose valid trial request filters.');
 const integer=(value,fallback)=>{const raw=String(value??fallback);if(!/^[1-9]\d*$/.test(raw)||!Number.isSafeInteger(Number(raw)))invalid('Choose positive whole-number pages.');return Number(raw);};
 const page=integer(input.page,1),pageSize=integer(input.pageSize,25);
 if(pageSize>100||!Number.isSafeInteger((page-1)*pageSize))invalid('Use a page size of at most 100.');
 return {status,personId,since,page,pageSize};
}

export function createTrialApplicationStore({database,transaction,availableSlots,people,accessControl,trialFormPolicy=null}){
 if(trialFormPolicy!==null&&!policies.includes(trialFormPolicy))throw new Error('Invalid public trial form policy.');
 transaction(()=>database.exec(`
  CREATE TABLE IF NOT EXISTS trial_applications(
   id TEXT PRIMARY KEY,reference TEXT NOT NULL UNIQUE,person_id TEXT NOT NULL REFERENCES people(id),
   slot_id TEXT NOT NULL REFERENCES available_slots(id),reservation_id TEXT NOT NULL UNIQUE REFERENCES availability_reservations(id),
   source_identity TEXT NOT NULL,slot_snapshot TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('pending','rejected')),
   version INTEGER NOT NULL CHECK(version>0),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,rejected_at TEXT,rejected_by TEXT REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS trial_application_acceptances(
   application_id TEXT PRIMARY KEY REFERENCES trial_applications(id),actor_id TEXT NOT NULL REFERENCES users(id),
   actor_name TEXT NOT NULL,created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS trial_applications_person ON trial_applications(person_id,created_at,id);
  CREATE INDEX IF NOT EXISTS trial_applications_status ON trial_applications(status,created_at,id);
  CREATE INDEX IF NOT EXISTS trial_applications_slot_status ON trial_applications(slot_id,status,created_at,id);
  CREATE TABLE IF NOT EXISTS trial_application_events(
   id INTEGER PRIMARY KEY AUTOINCREMENT,application_id TEXT NOT NULL REFERENCES trial_applications(id),
   type TEXT NOT NULL CHECK(type IN ('submitted','rejected')),version INTEGER NOT NULL,
   actor_id TEXT REFERENCES users(id),actor_name TEXT NOT NULL,created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS trial_application_events_application ON trial_application_events(application_id,id);
  CREATE TABLE IF NOT EXISTS public_trial_receipts(
   route TEXT NOT NULL,key_hash TEXT NOT NULL,payload_hash TEXT NOT NULL,
   application_id TEXT NOT NULL REFERENCES trial_applications(id),response_body TEXT NOT NULL,created_at TEXT NOT NULL,
   PRIMARY KEY(route,key_hash)
  );
 `));
 // Compatibility metadata for existing clients; published slot rules decide eligibility.
 // A missing legacy field policy must never disable otherwise eligible applications.
 const policy=()=>({policy:trialFormPolicy??'name-whatsapp'});
 const record=applicationId=>database.prepare('SELECT * FROM trial_applications WHERE id=?').get(applicationId);
 const event=row=>({id:row.id,type:row.type,version:row.version,createdAt:row.created_at,actor:{id:row.actor_id,displayName:row.actor_name}});
 const events=applicationId=>database.prepare('SELECT * FROM trial_application_events WHERE application_id=? ORDER BY id').all(applicationId).map(event);
 const actorFor=user=>{
  const actor=database.prepare('SELECT id,role,display_name FROM users WHERE id=?').get(typeof user?.id==='string'?user.id:'');
  if(!actor||!['admin','teacher'].includes(actor.role))fail(403,'ROLE_FORBIDDEN','Trial requests are only available to administrators and responsible teachers.');
  return actor;
 };
 const scope=user=>{
  const actor=actorFor(user),own=new Set(actor.role==='teacher'?accessControl.ownTeacherResourceIds(actor):[]),slots=new Map(actor.role==='teacher'?availableSlots.scopeFacts().map(slot=>[slot.id,slot]):[]);
  return {actor,allowed:row=>{if(actor.role==='admin')return true;const slot=slots.get(row.slot_id);return !!slot&&(slot.sourceAvailable===true||slot.unavailableReason==='HELD_SOURCE_CHANGED')&&(slot.teacherIds||[]).some(teacherId=>own.has(teacherId));}};
 };
 const acceptance=id=>database.prepare('SELECT * FROM trial_application_acceptances WHERE application_id=?').get(id);
 const effectiveStatus=row=>acceptance(row.id)?'accepted':row.status;
 const project=(row,actor=null)=>{
  const person=people.profileForTrial(row.person_id);if(!person)fail(409,'TRIAL_PERSON_UNAVAILABLE','Applicant details are unavailable.');
  const applicant=Object.fromEntries(applicantFields.map(field=>[field,field==='whatsapp'?person.whatsApp:field==='dateOfBirth'?person.dateOfBirth??'':person[field]??'']));
  const accepted=acceptance(row.id),status=accepted?'accepted':row.status;
  return {id:row.id,reference:row.reference,personId:row.person_id,status,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,rejectedAt:row.rejected_at,applicant:{...applicant,displayName:person.displayName},slot:JSON.parse(row.slot_snapshot),canReject:status==='pending',canAccept:status==='pending'&&actor?.role==='admin',acceptedAt:accepted?.created_at||null,events:[...events(row.id),...(accepted?[{id:'accepted:'+row.id,type:'accepted',version:row.version,createdAt:accepted.created_at,actor:{id:accepted.actor_id,displayName:accepted.actor_name}}]:[])]};
 };
 const target=(applicationId,user)=>{
  const current=scope(user);if(!id(applicationId))invalid('Choose an exact trial request.');
  const row=record(applicationId);if(!row||!current.allowed(row))fail(404,'TRIAL_APPLICATION_NOT_FOUND','Trial request was not found.');
  return {row,actor:current.actor};
 };
 const submit=(input,{key}={})=>transaction(()=>{
  const keyHash=hash(requestKey(key)),payloadHash=requestHash(input);
  const saved=database.prepare('SELECT * FROM public_trial_receipts WHERE route=? AND key_hash=?').get(route,keyHash);
  if(saved){if(saved.payload_hash!==payloadHash)fail(409,'IDEMPOTENCY_CONFLICT','This request key was already used for different trial details.');return JSON.parse(saved.response_body);}
  const parsed=submission(input);
  required(parsed.applicant);
  const held=availableSlots.reservePublicTrial(parsed),profile={...Object.fromEntries(applicantFields.filter(field=>field!=='whatsapp').map(field=>[field,parsed.applicant[field]])),whatsApp:parsed.applicant.whatsapp,displayName:parsed.applicant.localName.trim()||parsed.applicant.fullName.trim()};
  const person=people.createPublicApplicant(profile),applicationId=randomUUID(),reference='TR-'+randomUUID().replaceAll('-','').toUpperCase(),now=new Date().toISOString();
  database.prepare("INSERT INTO trial_applications(id,reference,person_id,slot_id,reservation_id,source_identity,slot_snapshot,status,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'pending',1,?,?)").run(applicationId,reference,person.id,parsed.slotId,held.reservationId,held.sourceIdentity,JSON.stringify(held.slot),now,now);
  database.prepare("INSERT INTO trial_application_events(application_id,type,version,actor_id,actor_name,created_at) VALUES (?,'submitted',1,NULL,'Public trial form',?)").run(applicationId,now);
  const ack={reference,outcome:'received'};
  database.prepare('INSERT INTO public_trial_receipts(route,key_hash,payload_hash,application_id,response_body,created_at) VALUES (?,?,?,?,?,?)').run(route,keyHash,payloadHash,applicationId,JSON.stringify(ack),now);
  return ack;
 });
 const get=(applicationId,user)=>transaction(()=>{const {row,actor}=target(applicationId,user);return project(row,actor)},'read');
 const list=(query,user)=>transaction(()=>{
  const normalized=listQuery(query),current=scope(user),all=database.prepare('SELECT * FROM trial_applications ORDER BY created_at DESC,id').all().filter(row=>current.allowed(row)&&(!normalized.personId||row.person_id===normalized.personId)&&(normalized.status==='all'||effectiveStatus(row)===normalized.status));
  const {page,pageSize}=normalized,total=all.length,applications=all.slice((page-1)*pageSize,page*pageSize).map(row=>project(row,current.actor)),revision=hash({actor:current.actor.id,role:current.actor.role,query:normalized.status,personId:normalized.personId,page,pageSize,total,applications});
  return normalized.since===revision?{revision,unchanged:true,page,pageSize,total}:{revision,records:applications,page,pageSize,total};
 },'read');
 const authorizeReject=(applicationId,user)=>get(applicationId,user);
 const reject=(applicationId,input,user)=>transaction(()=>{
  const {row,actor}=target(applicationId,user);
  if(!plain(input)||Object.keys(input).some(field=>field!=='version'))invalid('Provide only the current trial request version.');
  if(!Number.isSafeInteger(input.version)||input.version<1)fail(409,'VERSION_REQUIRED','Reload the trial request before rejecting it.');
  if(row.version!==input.version)fail(409,'VERSION_CONFLICT','This trial request changed. Reload it.');
  if(effectiveStatus(row)!=='pending')fail(409,'TRIAL_ALREADY_REJECTED','This trial request was already rejected.');
  availableSlots.releaseTrialReservation({reservationId:row.reservation_id,slotId:row.slot_id,sourceIdentity:row.source_identity});
  const now=new Date().toISOString(),changed=database.prepare("UPDATE trial_applications SET status='rejected',version=version+1,updated_at=?,rejected_at=?,rejected_by=? WHERE id=? AND version=? AND status='pending'").run(now,now,actor.id,applicationId,input.version);
  if(changed.changes!==1)fail(409,'VERSION_CONFLICT','This trial request changed. Reload it.');
  database.prepare("INSERT INTO trial_application_events(application_id,type,version,actor_id,actor_name,created_at) VALUES (?,'rejected',?,?,?,?)").run(applicationId,row.version+1,actor.id,actor.display_name,now);
  return project(record(applicationId),actor);
 });
 const authorizeAccept=(applicationId,user)=>{
  const selected=target(applicationId,user);if(selected.actor.role!=='admin')fail(403,'ROLE_FORBIDDEN','Only an administrator can accept trial applications.');return selected;
 };
 const accept=(applicationId,input,user)=>transaction(()=>{
  const {row,actor}=authorizeAccept(applicationId,user);
  if(!plain(input)||Object.keys(input).some(key=>key!=='version')||!Number.isSafeInteger(input.version)||input.version<1)invalid('Provide the current request version.');
  if(row.version!==input.version)fail(409,'VERSION_CONFLICT','This trial request changed. Reload it.');
  if(effectiveStatus(row)!=='pending')fail(409,'TRIAL_ALREADY_RESOLVED','This trial request has already been resolved.');
  availableSlots.confirmTrialReservation({reservationId:row.reservation_id,slotId:row.slot_id,sourceIdentity:row.source_identity});
  const now=new Date().toISOString(),changed=database.prepare("UPDATE trial_applications SET version=version+1,updated_at=? WHERE id=? AND version=? AND status='pending'").run(now,applicationId,input.version);
  if(changed.changes!==1)fail(409,'VERSION_CONFLICT','This request changed. Reload it.');
  database.prepare('INSERT INTO trial_application_acceptances(application_id,actor_id,actor_name,created_at) VALUES (?,?,?,?)').run(applicationId,actor.id,actor.display_name,now);
  return project(record(applicationId),actor);
 });
 const participant=(id,date,applicationId=null,profile=people.profileForTrial(id))=>{if(!profile)return null;let age=null;if(profile.dateOfBirth&&profile.dateOfBirth<=date){const [by,bm,bd]=profile.dateOfBirth.split('-').map(Number),[y,m,d]=date.split('-').map(Number),months=(y-by)*12+m-bm-(d<bd?1:0);if(Number.isSafeInteger(months)&&months>=0)age={years:Math.floor(months/12),months:months%12,asOf:date};}return {id,displayName:profile.displayName,age,...(applicationId?{applicationId}:{})};};
 const participants=(slotId,date)=>{
  const applications=database.prepare("SELECT applications.* FROM trial_applications applications JOIN availability_reservations reservations ON reservations.id=applications.reservation_id WHERE applications.slot_id=? AND applications.status='pending' AND reservations.state='held'").all(slotId);
  const trials=applications.filter(row=>!!acceptance(row.id)).map(row=>participant(row.person_id,date,row.id)).filter(Boolean);
  const moved=database.prepare("SELECT people.id FROM availability_reservations reservations JOIN student_sessions sessions ON sessions.id=reservations.student_session_id JOIN people ON people.id=sessions.student_id JOIN enrollment_orders orders ON orders.id=sessions.order_id WHERE reservations.slot_id=? AND reservations.kind='rescheduling' AND reservations.state='held' AND sessions.schedule_id=reservations.target_schedule_id AND sessions.sequence=reservations.target_sequence AND orders.payment_status='paid'").all(slotId);
  return {trials,rescheduling:[...new Set(moved.map(row=>row.id))].map(id=>participant(id,date)).filter(Boolean)};
 };
 const participantsForSlots=slots=>{
  if(!Array.isArray(slots)||slots.some(slot=>!slot||typeof slot.id!=='string'||typeof slot.date!=='string'))throw new TypeError('Slot participant batches require slot IDs and dates.');
  const dates=new Map(slots.map(slot=>[slot.id,slot.date])),result=new Map([...dates.keys()].map(slotId=>[slotId,{trials:[],rescheduling:[]}]));
  if(!dates.size)return result;
  const slotIds=[...dates.keys()],applications=[],moved=[];
  for(let index=0;index<slotIds.length;index+=400){
   const batch=slotIds.slice(index,index+400),placeholders=batch.map(()=>'?').join(',');
   applications.push(...database.prepare(`SELECT applications.slot_id,applications.id AS application_id,applications.person_id FROM trial_applications applications JOIN availability_reservations reservations ON reservations.id=applications.reservation_id JOIN trial_application_acceptances acceptances ON acceptances.application_id=applications.id WHERE applications.slot_id IN (${placeholders}) AND applications.status='pending' AND reservations.state='held' ORDER BY applications.created_at,applications.id`).all(...batch));
   moved.push(...database.prepare(`SELECT reservations.slot_id,people.id AS person_id FROM availability_reservations reservations JOIN student_sessions sessions ON sessions.id=reservations.student_session_id JOIN people ON people.id=sessions.student_id JOIN enrollment_orders orders ON orders.id=sessions.order_id WHERE reservations.slot_id IN (${placeholders}) AND reservations.kind='rescheduling' AND reservations.state='held' AND sessions.schedule_id=reservations.target_schedule_id AND sessions.sequence=reservations.target_sequence AND orders.payment_status='paid' ORDER BY reservations.slot_id,people.id`).all(...batch));
  }
  const profileIds=[...new Set([...applications.map(row=>row.person_id),...moved.map(row=>row.person_id)])],profiles=people.profileForTrials(profileIds);
  for(const row of applications){const details=result.get(row.slot_id),profile=profiles.get(row.person_id),person=participant(row.person_id,dates.get(row.slot_id),row.application_id,profile);if(details&&person)details.trials.push(person);}
  const seen=new Set();
  for(const row of moved){const key=JSON.stringify([row.slot_id,row.person_id]);if(seen.has(key))continue;seen.add(key);const details=result.get(row.slot_id),profile=profiles.get(row.person_id),person=participant(row.person_id,dates.get(row.slot_id),null,profile);if(details&&person)details.rescheduling.push(person);}
  return result;
 };
 const workSnapshot=(user,options={})=>transaction(()=>{
  if(!plain(options)||Object.keys(options).some(field=>field!=='since'))invalid('Choose supported work query parameters.');
  const since=options.since===undefined?'':options.since;
  if(typeof since!=='string'||since.length>200)invalid('Use a valid work revision.');
  const current=scope(user),all=database.prepare('SELECT * FROM trial_applications ORDER BY created_at DESC,id').all().filter(current.allowed),pending=all.filter(row=>effectiveStatus(row)==='pending'),allowed=new Map(all.map(row=>[row.id,row]));
  const confirmedEvents=database.prepare('SELECT * FROM trial_application_acceptances').all().filter(row=>allowed.has(row.application_id)).map(row=>({...row,id:'accepted:'+row.application_id,type:'accepted',version:allowed.get(row.application_id).version}));
  const allEvents=[...database.prepare('SELECT * FROM trial_application_events ORDER BY id DESC').all(),...confirmedEvents].filter(row=>allowed.has(row.application_id)).sort((a,b)=>b.created_at.localeCompare(a.created_at)||String(b.id).localeCompare(String(a.id)));
  const requests=pending.slice(0,50).map(row=>project(row,current.actor)),notifications=allEvents.slice(0,50).map(row=>({...event(row),applicationId:row.application_id,reference:allowed.get(row.application_id).reference}));
  const pendingTotal=pending.length,revision=hash({actor:current.actor.id,role:current.actor.role,pendingTotal,requests,notifications,totalEvents:allEvents.length});
  return since===revision?{revision,unchanged:true,pendingTotal}:{revision,pendingTotal,requests,notifications,hasMoreRequests:pending.length>50,hasMoreNotifications:allEvents.length>50};
 },'read');
 return {policy,submit,list,get,authorizeReject,reject,authorizeAccept,accept,participants,participantsForSlots,workSnapshot};
}
