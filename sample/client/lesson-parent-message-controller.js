import {parentMessageMarkup,parentMessageInboxMarkup} from './lesson-parent-message-ui.js';

const clone=value=>JSON.parse(JSON.stringify(value));
const id=value=>typeof value==='string'&&!!value.trim()&&value.length<=200;
const timestamp=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value));
const messageRecord=row=>!!row&&['id','sessionId','studentId','senderId','recipientUserId'].every(key=>id(row[key]))&&['studentName','senderName','recipientName','courseName','date','time','body'].every(key=>typeof row[key]==='string')&&row.body.trim()&&row.body.length<=2000&&timestamp(row.createdAt)&&row.channel==='app-test';

export function createLessonParentMessaging({api,scope,resolve,current,onOpen,onClose,paint,onInboxChange=()=>{},onAuth=()=>{},onNotice=()=>{},copy,openTemplatePicker,key=()=>crypto.randomUUID(),dom=document,Form=FormData,t=(_zh,en)=>en,esc,markup=parentMessageMarkup,inboxMarkup=parentMessageInboxMarkup}){
 let state=null,inbox={identity:'',status:'idle',records:[],total:null,page:1,pageSize:25,revision:'',error:''},inboxJob=null;
 const scopeNow=()=>scope()||{};
 const owns=owner=>!!owner&&state===owner&&owner.identity===scopeNow().identity&&['admin','teacher'].includes(scopeNow().role)&&current(owner.ticket);
 const controls=()=>[...dom.querySelectorAll('.lpm-dialog button:not(:disabled),.lpm-dialog input:not(:disabled),.lpm-dialog textarea:not(:disabled),.lpm-dialog a[href],#lpm-body')];
 const capture=()=>{
  if(!state||state.pickerOpen)return null;const node=dom.activeElement,body=dom.querySelector('#lpm-body');
  if(state.step==='edit'&&!state.busy&&!state.unconfirmed){const form=dom.querySelector('#lpm-form');if(form){const fields=Object.fromEntries(new Form(form));if(typeof fields.message==='string')state.draft.message=fields.message;if(['app','whatsapp'].includes(fields.channel))state.draft.channel=fields.channel;}}
  return {name:node?.name,radioValue:node?.type==='radio'?node.value:null,action:node?.dataset?.action,top:body?.scrollTop||0,start:node?.selectionStart,end:node?.selectionEnd};
 };
 const restore=position=>{
  if(!position)return;const target=controls().find(node=>position.name?node.name===position.name&&(position.radioValue===null||node.value===position.radioValue):position.action&&node.dataset?.action===position.action);
  target?.focus?.({preventScroll:true});if(typeof position.start==='number'&&target?.setSelectionRange)try{target.setSelectionRange(position.start,position.end);}catch{}
  const body=dom.querySelector('#lpm-body');if(body)body.scrollTop=position.top;
 };
 const draw=(position=capture())=>{if(!state||state.pickerOpen)return;paint(markup(state,{t,esc}));restore(position);};
 const discard=({restore:back=false,draw:clear=true,notify=true}={})=>{const old=state;state=null;if(old){if(clear)paint('');if(notify)onClose(old.ticket,{restore:back});}};
 const ownership=()=>{if(state&&!owns(state))discard({restore:false});return !!state;};
 const validContext=(value,owner)=>{
  const lesson=owner.facts.lesson;
  return value&&value.sessionId===owner.sessionId&&value.studentId===owner.facts.student.id&&value.courseId===lesson.courseId&&value.date===lesson.date&&value.time===lesson.time&&id(value.revision)&&id(value.sender?.id)&&typeof value.sender.displayName==='string'&&typeof value.studentName==='string'&&typeof value.courseName==='string'&&Number.isSafeInteger(value.duration)&&value.duration>0&&Array.isArray(value.teacherNames)&&value.teacherNames.every(name=>typeof name==='string')&&
   (value.whatsApp===null||typeof value.whatsApp?.name==='string'&&typeof value.whatsApp.number==='string'&&!!value.whatsApp.number.trim())&&(value.appRecipient===null||id(value.appRecipient?.userId)&&typeof value.appRecipient.displayName==='string');
 };
 const readContext=async({poll=false}={})=>{
  if(!ownership()||state.busy||state.unconfirmed||state.read)return;
  const owner=state,job={};owner.read=job;if(!poll){owner.contextStatus='loading';owner.error='';if(owner.step==='preview')owner.step='edit';draw();}
  try{
   const result=await api.parentMessageContext(owner.sessionId);if(!owns(owner)||owner.read!==job){ownership();return;}
   if(!validContext(result?.context,owner))throw new Error('Invalid exact parent contact context');
   const next=result.context;
   if(poll&&owner.context&&owner.context.revision!==next.revision){owner.stale=true;owner.error=t('課堂或收件人資料已更新。請重新讀取，再核對訊息。','Lesson or recipient details changed. Reload and review the message.');draw();}
   else if(!poll){owner.context=clone(next);owner.contextStatus='ready';owner.stale=false;owner.operation=null;owner.ack=null;owner.error='';draw();}
   else if(owner.contextStatus!=='ready'){owner.contextStatus='ready';owner.error='';draw();}
  }catch(error){
   if(!owns(owner)||owner.read!==job){ownership();return;}
   if([401,403,404].includes(error.status)){discard({restore:false});await onAuth(error);return;}
   owner.contextStatus='error';owner.error=t('未能讀取家長聯絡資料。已填訊息保留，請重試。','Could not load parent contact details. Your message is kept; try again.');draw();
  }finally{if(state===owner&&owner.read===job)owner.read=null;}
 };
 const open=async(sessionId,opener)=>{
  if(state||!id(sessionId)||!['admin','teacher'].includes(scopeNow().role))return false;
  const resolved=resolve({sessionId,opener});if(resolved?.status!=='ready'||!resolved.returnTicket||resolved.facts?.lesson?.id!==sessionId||!id(resolved.facts?.student?.id))return false;
  state={sessionId,ticket:resolved.returnTicket,facts:clone(resolved.facts),identity:scopeNow().identity,context:null,contextStatus:'loading',step:'edit',draft:{channel:'app',message:''},templatesAvailable:typeof openTemplatePicker==='function',pickerOpen:false,busy:false,unconfirmed:false,stale:false,error:'',ack:null,operation:null,read:null};
  onOpen(state.ticket);draw(null);dom.querySelector('.lpm-dialog [data-action="parent-message-close"]')?.focus?.();await readContext();return true;
 };
 const input=target=>{
  if(!target||!['message','channel'].includes(target.name)||!ownership())return false;
  if(state.step!=='edit'||state.busy||state.unconfirmed)return true;
  if(target.name==='message'){state.draft.message=String(target.value??'');if(!state.stale)state.error='';const preview=dom.querySelector('[data-action="parent-message-preview"]');if(preview)preview.disabled=!canPreview(state);}
  else if(['app','whatsapp'].includes(target.value)){capture();state.draft.channel=target.value;state.error='';draw();}
  return true;
 };
 const canPreview=owner=>owner.contextStatus==='ready'&&!owner.stale&&owner.context&&typeof owner.draft.message==='string'&&!!owner.draft.message.trim()&&owner.draft.message.length<=2000&&!!(owner.draft.channel==='app'?owner.context.appRecipient:owner.draft.channel==='whatsapp'?owner.context.whatsApp:null);
 const send=async()=>{
  if(!ownership()||state.busy||state.stale||state.step!=='preview'||state.draft.channel!=='app'||!(state.unconfirmed&&state.operation||canPreview(state)))return;
  const owner=state;owner.operation ||= {payload:{revision:owner.context.revision,message:owner.draft.message},context:clone(owner.context),key:key()};
  const operation=owner.operation,job={};owner.read=null;owner.saveJob=job;owner.busy=true;owner.error='';draw();
  try{
   const result=await api.sendParentMessage(owner.sessionId,operation.payload,operation.key);if(!owns(owner)||owner.saveJob!==job){ownership();return;}
   const row=result?.message,c=operation.context;
   if(!messageRecord(row)||row.sessionId!==owner.sessionId||row.studentId!==c.studentId||row.senderId!==c.sender.id||row.recipientUserId!==c.appRecipient.userId||row.body!==operation.payload.message||row.courseName!==c.courseName||row.date!==c.date||row.time!==c.time)throw new Error('Unconfirmed exact parent message response');
   owner.ack=clone(row);owner.step='saved';owner.unconfirmed=false;owner.error='';
  }catch(error){
   if(!owns(owner)||owner.saveJob!==job){ownership();return;}
   if([401,403,404].includes(error.status)){discard({restore:false});await onAuth(error);return;}
   owner.unconfirmed=!error.status||error.status>=500||error.code==='service_unavailable'&&error.status>=200&&error.status<300;owner.stale=error.status===409;
   owner.error=owner.stale?t('課堂或收件人資料已更新。訊息保留，請重新讀取後再核對。','Lesson or recipient details changed. Your message is kept; reload and review again.'):owner.unconfirmed?t('尚未確認發送結果。請重試同一則訊息。','The result has not been confirmed. Retry the same message.'):t('未能發送。訊息保留，請重試。','Could not send. Your message is kept; try again.');
  }finally{if(state===owner&&owner.saveJob===job){owner.busy=false;owner.saveJob=null;draw(null);dom.querySelector(owner.step==='saved'?'#lpm-saved':'#lpm-error')?.focus?.({preventScroll:true});}}
 };
 const command=async(action)=>{
  if(!ownership())return false;if(state.busy)return true;
  if(action==='parent-message-template'&&state.step==='edit'&&state.contextStatus==='ready'&&!state.stale&&!state.unconfirmed&&typeof openTemplatePicker==='function'){
   const owner=state,position=capture();owner.pickerOpen=true;
   try{const opened=await openTemplatePicker({currentMessage:owner.draft.message,guard:()=>owns(owner),onSelect:record=>{if(owns(owner)&&typeof record?.body==='string'&&record.body.trim()&&record.body.length<=2000){owner.draft.message=record.body;owner.error='';}},onClose:()=>{if(owns(owner)){owner.pickerOpen=false;draw(null);restore(position);dom.querySelector('#lpm-message')?.focus?.({preventScroll:true});}}});if(!opened&&owns(owner)){owner.pickerOpen=false;draw(position);}}catch{if(owns(owner)){owner.pickerOpen=false;owner.error=t('未能開啟範本，已填訊息保留。','Could not open templates. Your message is kept.');draw(position);}}return true;
  }
  if(action==='parent-message-close'){discard({restore:true});return true;}
  if(action==='parent-message-send'){await send();return true;}
  if(state.unconfirmed)return true;
  if(action==='parent-message-retry'){await readContext();return true;}
  if(action==='parent-message-preview'&&state.step==='edit'){capture();if(!canPreview(state)){state.error=t('請選擇有聯絡資料的渠道，並填寫最多 2,000 字的訊息。','Choose an available channel and enter a message of up to 2,000 characters.');draw();return true;}state.editPosition=capture();state.step='preview';state.error='';draw(null);dom.querySelector('#lpm-body')?.focus?.();return true;}
  if(action==='parent-message-back'&&state.step==='preview'){state.step='edit';state.operation=null;state.error='';draw(null);restore(state.editPosition);return true;}
  if(['parent-message-copy-number','parent-message-copy-message'].includes(action)&&state.step==='preview'&&state.draft.channel==='whatsapp'&&canPreview(state)&&copy){const owner=state;try{await copy(action.endsWith('number')?state.context.whatsApp.number:state.draft.message);if(owns(owner))onNotice(t('已複製。','Copied.'));}catch{if(owns(owner)){owner.error=t('未能複製，請手動選取文字。','Could not copy. Select the text manually.');draw();}}return true;}
  return action.startsWith('parent-message-');
 };
 const keyboard=event=>{
  if(!state)return false;if(!ownership())return true;if(event.isComposing||event.keyCode===229)return true;
  if(event.key==='Escape'){event.preventDefault();if(!state.busy)void command('parent-message-close');return true;}
  if(event.key==='Tab'){const list=controls(),first=list[0],last=list.at(-1);if(!list.includes(dom.activeElement)||event.shiftKey&&dom.activeElement===first||!event.shiftKey&&dom.activeElement===last){event.preventDefault();(event.shiftKey?last:first)?.focus?.();}}return true;
 };
 const resetInbox=()=>{inbox={identity:scopeNow().identity,status:'idle',records:[],total:null,page:1,pageSize:25,revision:'',error:''};inboxJob=null;};
 const inboxPage=()=>{if(inbox.identity!==scopeNow().identity)resetInbox();return inboxMarkup(inbox,{t,esc});};
 const readInbox=async()=>{
  const scope=scopeNow();if(scope.role!=='student'||!scope.inboxVisible)return;if(inbox.identity!==scope.identity)resetInbox();if(inboxJob)return;
  const job={identity:scope.identity,page:inbox.page};inboxJob=job;const hadReady=inbox.status==='ready';if(!hadReady){inbox.status='loading';onInboxChange();}
  try{
   const result=await api.parentMessagesInbox({page:job.page,pageSize:25},hadReady?inbox.revision:'');
   if(inboxJob!==job||scopeNow().identity!==job.identity||scopeNow().role!=='student'||!scopeNow().inboxVisible)return;
   if(!result||typeof result.revision!=='string'||!Number.isSafeInteger(result.total)||result.total<0||result.page!==job.page||result.pageSize!==25||!result.unchanged&&(!Array.isArray(result.records)||result.records.length>25||result.records.some(row=>!messageRecord(row))||new Set(result.records.map(row=>row.id)).size!==result.records.length||result.total<result.records.length)||result.unchanged&&(!hadReady||result.revision!==inbox.revision))throw new Error('Invalid parent inbox response');
   const next={...inbox,...result,status:'ready',error:''};const changed=JSON.stringify(next)!==JSON.stringify(inbox);inbox=next;if(changed)onInboxChange();
  }catch(error){if(inboxJob!==job||scopeNow().identity!==job.identity)return;inbox={...inbox,status:'error',records:[],total:null,revision:'',error:t('未能讀取訊息，請重試。','Could not load messages. Try again.')};onInboxChange();if(error.status===401)await onAuth(error);}
  finally{if(inboxJob===job){inboxJob=null;if(!scopeNow().inboxVisible)resetInbox();}}
 };
 const inboxAction=async action=>{if(!action.startsWith('parent-inbox-'))return false;if(scopeNow().role!=='student'||!scopeNow().inboxVisible)return true;if(inboxJob)return true;const previous=inbox.page;if(action==='parent-inbox-next'&&inbox.status==='ready'&&inbox.page*25<inbox.total)inbox.page++;if(action==='parent-inbox-prev'&&inbox.page>1)inbox.page--;if(inbox.page!==previous){inbox={...inbox,status:'idle',records:[],total:null,revision:'',error:''};onInboxChange();}await readInbox();return true;};
 return {open,input,command,keyboard,readInbox,inboxPage,inboxAction,isOpen:()=>!!state,refresh:()=>readContext({poll:true}),ensureInbox(){if(inbox.identity!==scopeNow().identity)resetInbox();if(scopeNow().role!=='student'||!scopeNow().inboxVisible){if(inboxJob||inbox.status!=='idle')resetInbox();return;}if(inbox.status==='idle')void readInbox();},beforeRender(){if(!ownership())return null;return capture();},afterRender:restore,html:()=>state?markup(state,{t,esc}):'',clear({draw=true,notify=true}={}){discard({draw,notify});resetInbox();}};
}
