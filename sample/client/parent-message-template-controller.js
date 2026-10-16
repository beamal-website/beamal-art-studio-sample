import {parentTemplateMarkup} from './parent-message-template-ui.js';

const copy=value=>JSON.parse(JSON.stringify(value));
const validId=value=>typeof value==='string'&&!!value.trim()&&value.length<=200;
const validRecord=value=>!!value&&validId(value.id)&&typeof value.title==='string'&&!!value.title.trim()&&value.title.length<=120&&typeof value.body==='string'&&!!value.body.trim()&&value.body.length<=2000&&Number.isSafeInteger(value.version)&&value.version>0&&typeof value.archived==='boolean'&&['createdAt','updatedAt'].every(key=>typeof value[key]==='string'&&Number.isFinite(Date.parse(value[key])));

export function createParentMessageTemplates({api,scope,paint,onAuth=()=>{},key=()=>crypto.randomUUID(),dom=document,Form=FormData,t=(_zh,en)=>en,esc,markup=parentTemplateMarkup}){
 let state=null;
 const now=()=>scope()||{};
 const owns=owner=>!!owner&&state===owner&&owner.identity===now().identity&&owner.location===now().location&&['admin','teacher'].includes(now().role)&&(!owner.guard||owner.guard());
 const nodes=()=>[...dom.querySelectorAll('.pmt-dialog button:not(:disabled),.pmt-dialog input:not(:disabled),.pmt-dialog textarea:not(:disabled),#pmt-body')];
 const capture=()=>{if(!state)return null;const active=dom.activeElement,body=dom.querySelector('#pmt-body'),form=dom.querySelector('#template-editor');if(form&&state.step==='edit'&&!state.busy&&!state.unconfirmed){const values=Object.fromEntries(new Form(form));for(const name of ['title','body'])if(typeof values[name]==='string')state.draft[name]=values[name];}return {name:active?.name,action:active?.dataset?.action,id:active?.dataset?.templateId,start:active?.selectionStart,end:active?.selectionEnd,top:body?.scrollTop||0};};
 const restore=position=>{if(!position)return;const target=nodes().find(node=>position.name?node.name===position.name:position.action&&node.dataset?.action===position.action&&(!position.id||node.dataset?.templateId===position.id));target?.focus?.({preventScroll:true});if(typeof position.start==='number'&&target?.setSelectionRange)try{target.setSelectionRange(position.start,position.end);}catch{}const body=dom.querySelector('#pmt-body');if(body)body.scrollTop=position.top;};
 const model=()=>{if(!state)return null;const {opener,guard,onSelect,onClose,read,saveJob,...data}=state;return {...data,q:state.searchDraft??state.q};};
 const draw=(position=capture())=>{if(!state)return;paint(markup(model(),{t,esc}));restore(position);};
 const close=({notify=true,draw:clear=true,selected=null}={})=>{const old=state;state=null;if(!old)return;if(clear)paint('');if(notify&&ownsReturn(old)){if(selected)old.onSelect?.(copy(selected));old.onClose?.();old.opener?.focus?.({preventScroll:true});}};
 const ownsReturn=owner=>owner.identity===now().identity&&owner.location===now().location&&['admin','teacher'].includes(now().role)&&(!owner.guard||owner.guard());
 const ownership=()=>{if(state&&!owns(state))close({notify:false});return !!state;};
 const focus=(selector='#pmt-body')=>dom.querySelector(selector)?.focus?.({preventScroll:true});
 const read=async()=>{
  if(!ownership()||state.busy||state.read||state.step!=='list')return;const owner=state,job={};owner.read=job;owner.status='loading';owner.error='';draw();
  try{const result=await api.parentMessageTemplates({q:owner.q,page:owner.page,pageSize:25,status:owner.mode==='choose'?'active':owner.statusFilter});if(!owns(owner)||owner.read!==job){ownership();return;}
   if(!result||!Array.isArray(result.records)||result.records.some(row=>!validRecord(row)||row.archived!==(owner.statusFilter==='archived'))||new Set(result.records.map(row=>row.id)).size!==result.records.length||!Number.isSafeInteger(result.total)||result.total<result.records.length||result.page!==owner.page||result.pageSize!==25||result.records.length>25||typeof result.revision!=='string')throw Error('Invalid template list');
   const lastPage=Math.max(1,Math.ceil(result.total/25));if(owner.page>lastPage){owner.page=lastPage;owner.read=null;await read();return;}
   owner.records=copy(result.records);owner.total=result.total;owner.status='ready';owner.revision=result.revision;draw();
  }catch(error){if(!owns(owner)||owner.read!==job){ownership();return;}owner.status='error';owner.records=[];owner.total=null;owner.error=t('未能讀取範本，請重試。','Could not load templates. Try again.');draw();if(error.status===401||error.status===403)await onAuth(error);}
  finally{if(state===owner&&owner.read===job)owner.read=null;}
 };
 const open=async({mode='manage',opener=null,guard=null,onSelect=null,onClose=null,currentMessage=''}={})=>{
  if(state||!['admin','teacher'].includes(now().role)||!(typeof now().identity==='string'&&now().identity)||!['manage','choose'].includes(mode)||guard&&!guard())return false;
  state={identity:now().identity,location:now().location,mode,canManage:mode==='manage',step:'list',status:'loading',records:[],total:null,page:1,pageSize:25,q:'',statusFilter:'active',revision:'',draft:null,selected:null,busy:false,unconfirmed:false,stale:false,error:'',ack:null,read:null,operation:null,opener,guard,onSelect,onClose,currentMessage};draw(null);focus('.pmt-dialog [data-action="parent-template-close"]');await read();return true;
 };
 const choose=async(action,id)=>{
  if(!ownership()||state.busy||state.read||state.step!=='list'||!validId(id)||!state.records.some(row=>row.id===id))return;
  const owner=state,job={};owner.read=job;owner.busy=true;owner.error='';draw();
  try{const result=await api.parentMessageTemplate(id);if(!owns(owner)||owner.read!==job){ownership();return;}const row=result?.template;if(!validRecord(row)||row.id!==id||owner.mode==='choose'&&row.archived)throw Error('Invalid exact template');
   owner.selected=copy(row);owner.ack=null;owner.operation=null;owner.unconfirmed=false;owner.stale=false;
   if(action==='parent-template-edit'){owner.draft=copy(row);owner.step='edit';}
   else if(action==='parent-template-choose')owner.step='apply-review';
   else{owner.step='archive-review';owner.archiveAction=action==='parent-template-archive-review'?'archive':'restore';}
  }catch(error){if(!owns(owner)||owner.read!==job){ownership();return;}owner.error=t('未能讀取這個範本，請重新整理清單再選擇。','Could not load this template. Refresh the list and choose again.');if(error.status===401||error.status===403)await onAuth(error);}
  finally{if(state===owner&&owner.read===job){owner.read=null;owner.busy=false;draw(null);focus(owner.step==='edit'?'#pmt-draft-title':'#pmt-body');}}
 };
 const input=target=>{if(!ownership()||state.busy||state.unconfirmed||!target)return false;if(target.name==='q'&&state.step==='list'){state.searchDraft=String(target.value??'');return true;}if(state.step==='edit'&&['title','body'].includes(target.name)){state.draft[target.name]=String(target.value??'');state.error='';return true;}return false;};
 const validDraft=draft=>draft&&typeof draft.title==='string'&&!!draft.title.trim()&&draft.title.length<=120&&typeof draft.body==='string'&&!!draft.body.trim()&&draft.body.length<=2000;
 const save=async action=>{
  if(!ownership()||state.busy||state.mode!=='manage'||state.stale||!['review','archive-review'].includes(state.step))return;
  const owner=state,isEdit=owner.step==='review',operationName=isEdit?(owner.draft.id?'update':'create'):owner.archiveAction;
  if(isEdit&&!validDraft(owner.draft)||!isEdit&&!validRecord(owner.selected)||!isEdit&&action!=='parent-template-'+operationName)return;
  owner.operation ||= {name:operationName,id:isEdit?owner.draft.id:owner.selected.id,payload:isEdit?{...(owner.draft.id?{version:owner.draft.version}:{}),title:owner.draft.title,body:owner.draft.body}:{version:owner.selected.version},before:isEdit?copy(owner.draft):copy(owner.selected),key:key()};
  const op=owner.operation,job={};owner.saveJob=job;owner.busy=true;owner.error='';owner.ack=null;draw();
  try{
   const result=op.name==='create'?await api.createParentMessageTemplate(op.payload,op.key):op.name==='update'?await api.updateParentMessageTemplate(op.id,op.payload,op.key):await api[op.name==='archive'?'archiveParentMessageTemplate':'restoreParentMessageTemplate'](op.id,op.payload.version,op.key);
   if(!owns(owner)||owner.saveJob!==job){ownership();return;}const row=result?.template;
   if(!validRecord(row)||op.id&&row.id!==op.id||row.version!==(op.name==='create'?1:op.payload.version+1)||row.title!==op.before.title||row.body!==op.before.body||row.archived!==(op.name==='archive'||op.name==='update'&&!!op.before.archived))throw Error('Unconfirmed exact template acknowledgement');
   owner.ack={operation:op.name,record:copy(row)};owner.unconfirmed=false;owner.operation=null;owner.step='list';owner.selected=null;owner.draft=null;owner.page=1;owner.status='idle';
  }catch(error){if(!owns(owner)||owner.saveJob!==job){ownership();return;}owner.unconfirmed=!error.status||error.status>=500||error.code==='service_unavailable'&&error.status>=200&&error.status<300;owner.stale=error.status===409;owner.error=owner.stale?t('範本已更新。已填內容保留，請重新讀取後核對。','The template changed. Your entries are kept; reload and review.'):owner.unconfirmed?t('尚未確認儲存結果，請重試同一次操作。','The save result is unconfirmed. Retry the same operation.'):t('未能儲存，已填內容保留。','Could not save. Your entries are kept.');}
  finally{if(state===owner&&owner.saveJob===job){owner.busy=false;owner.saveJob=null;if(owner.step==='list')await read();draw(null);focus(owner.ack?'#pmt-ack':'#pmt-error');}}
 };
 const command=async(action,data={})=>{
  if(!ownership())return false;if(state.busy)return true;
  if(action==='parent-template-close'){close();return true;}
  if(['parent-template-save','parent-template-archive','parent-template-restore'].includes(action)){await save(action);return true;}
  if(state.unconfirmed)return true;
  if(action==='parent-template-back'){if(state.step==='review'){state.step='edit';state.operation=null;}else{state.step='list';state.selected=null;state.draft=null;state.stale=false;state.operation=null;}state.error='';draw(null);focus();return true;}
  if(action==='parent-template-review'&&state.step==='edit'){capture();if(!validDraft(state.draft)){state.error=t('請填寫範本名稱（最多 120 字）及訊息（最多 2,000 字）。','Enter a title (up to 120 characters) and message (up to 2,000 characters).');draw();return true;}if(state.stale)return true;state.step='review';state.error='';draw(null);focus();return true;}
  if(action==='parent-template-reload'&&state.draft?.id){const owner=state,draft=copy(state.draft);state.step='list';await choose('parent-template-edit',draft.id);if(state===owner&&state.step==='edit'){state.draft={...state.draft,title:draft.title,body:draft.body};state.stale=false;state.error=t('已讀取最新版本，已填內容保留。請重新核對。','Latest version loaded; your entries are kept. Review again.');draw();}return true;}
  if(action==='parent-template-reload'&&state.selected?.id&&!state.draft){const target=state.selected.id,oldAction=state.archiveAction;state.step='list';await choose(state.mode==='choose'?'parent-template-choose':oldAction==='archive'?'parent-template-archive-review':'parent-template-restore-review',target);return true;}
  if(action==='parent-template-apply'&&state.step==='apply-review'&&state.mode==='choose'&&validRecord(state.selected)&&!state.selected.archived){close({selected:state.selected});return true;}
  if(state.step!=='list')return action.startsWith('parent-template-');
  if(action==='parent-template-new'&&state.mode==='manage'){state.draft={title:'',body:''};state.ack=null;state.stale=false;state.operation=null;state.step='edit';state.error='';draw(null);focus('#pmt-draft-title');return true;}
  if(['parent-template-edit','parent-template-archive-review','parent-template-restore-review'].includes(action)&&state.mode==='manage'||action==='parent-template-choose'&&state.mode==='choose'){await choose(action,data.templateId);return true;}
  if(action==='parent-template-tab'&&state.mode==='manage'&&['active','archived'].includes(data.status)){state.statusFilter=data.status;state.page=1;state.ack=null;await read();return true;}
  if(action==='parent-template-search'){const form=dom.querySelector('#template-search'),fields=form?Object.fromEntries(new Form(form)):{};state.q=String(fields.q??state.searchDraft??state.q).trim().slice(0,200);state.searchDraft=state.q;state.page=1;state.ack=null;await read();return true;}
  if(action==='parent-template-page'&&state.status==='ready'){const page=Number(data.page);if(Number.isSafeInteger(page)&&page>=1&&page<=Math.max(1,Math.ceil(state.total/25))){state.page=page;await read();}return true;}
  if(action==='parent-template-retry'){await read();return true;}
  return action.startsWith('parent-template-');
 };
 const keyboard=event=>{if(!state)return false;if(!ownership())return true;if(event.isComposing||event.keyCode===229)return true;if(event.key==='Escape'){event.preventDefault();if(!state.busy)close();return true;}if(event.key==='Tab'){const list=nodes(),first=list[0],last=list.at(-1);if(!list.includes(dom.activeElement)||event.shiftKey&&dom.activeElement===first||!event.shiftKey&&dom.activeElement===last){event.preventDefault();(event.shiftKey?last:first)?.focus?.();}}return true;};
 return {open,input,command,keyboard,isOpen:()=>!!state,html:()=>state?markup(model(),{t,esc}):'',beforeRender(){if(!ownership())return null;return capture();},afterRender:restore,clear:close};
}
