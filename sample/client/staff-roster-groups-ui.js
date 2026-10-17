// Existing roster groups and assignment drafts only. No assignment is saved,
// no roster is overwritten and no lesson, payroll or login record is changed.
import {sessionIdentityKey} from './session-identity.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const context=value=>({t:value?.t||((_zh,en)=>en),esc:value?.esc||escape,embedded:value?.embedded===true,profile:value?.profile===true});
const objects=value=>Array.isArray(value)?value.filter(item=>item&&typeof item==='object'):[];
const validId=value=>{if(typeof value!=='string'||!value.trim())return false;try{encodeURIComponent(value);return true;}catch{return false;}};
const hasViewer=model=>validId(model.viewer?.id);
const admin=model=>hasViewer(model)&&model.viewer.role==='admin';
function target(model){
 if(!hasViewer(model)||!validId(model.profileStaffId))return null;
 const members=objects(model.staff).filter(member=>member.id===model.profileStaffId);if(members.length!==1)return null;const member=members[0];
 if(admin(model))return member;if(model.viewer.role!=='teacher')return null;
 const own=Object.hasOwn(model.viewer,'teacherResourceIds')?Array.isArray(model.viewer.teacherResourceIds)&&model.viewer.teacherResourceIds.includes(member.id):member.userId===model.viewer.id;return own?member:null;
}
function groupSource(model){
 if(model.groupsReady!==true)return {known:false,valid:false,groups:[]};
 if(!Array.isArray(model.groups))return {known:true,valid:false,groups:[]};
 const groups=objects(model.groups),ids=groups.map(group=>group.id),valid=groups.length===model.groups.length&&groups.every(group=>validId(group.id)&&typeof group.name==='string'&&!!group.name.trim())&&new Set(ids).size===ids.length;
 return {known:true,valid,groups:valid?groups:[]};
}
function assignment(model){
 if(model.assignmentsReady!==true||!Array.isArray(model.assignments))return {kind:'unknown',reason:'notready'};
 const records=objects(model.assignments).filter(record=>record.staffId===model.profileStaffId);if(records.length!==1)return {kind:'unknown',reason:records.length?'ambiguous':'missing'};
 const record=records[0];if(record.groupId===null)return {kind:'none'};if(!validId(record.groupId))return {kind:'unknown',reason:'malformed'};
 const source=groupSource(model),group=source.valid?source.groups.find(group=>group.id===record.groupId):null;return group?{kind:'group',group}:{kind:'unknown',reason:'unresolved'};
}
const choiceFor=id=>'group:'+encodeURIComponent(id);
function chosen(model,value){
 if(value==='none')return {kind:'none'};if(typeof value!=='string'||!value.startsWith('group:'))return null;
 let id;try{id=decodeURIComponent(value.slice(6));}catch{return null;}const source=groupSource(model),group=source.valid?source.groups.find(group=>group.id===id):null;return group?{kind:'group',group}:null;
}
function groupLabel(value,ctx){return value?.kind==='none'?ctx.t('不屬群組','No roster group'):value?.kind==='group'?value.group.name:'—';}
function sourceMarkup(model,ctx){
 const {t,esc}=ctx,groups=groupSource(model),current=assignment(model),messages=[];
 if(model.groupsLoading===true)messages.push([model.groupsReady===true?t('正在更新排班群組…','Updating roster groups…'):t('正在載入排班群組…','Loading roster groups…'),false,true]);
 else if(model.groupsError)messages.push([model.groupsReady===true?t('未能更新排班群組，正顯示上次載入的資料。','Could not update roster groups. Showing the last loaded details.'):t('未能載入排班群組，請稍後重試。','Could not load roster groups. Try again later.'),true,false]);
 else if(!groups.known)messages.push([t('排班群組資料暫未提供。','Roster groups are not available yet.'),false,false]);
 else if(!groups.valid)messages.push([t('排班群組未能確認，請稍後重試。','Roster groups could not be confirmed. Try again later.'),true,false]);
 else if(!groups.groups.length)messages.push([t('目前沒有可選的排班群組。','No roster groups are available.'),false,false]);
 if(model.assignmentsLoading===true)messages.push([model.assignmentsReady===true?t('正在更新所屬排班群組…','Updating roster group assignment…'):t('正在載入所屬排班群組…','Loading roster group assignment…'),false,true]);
 else if(model.assignmentsError)messages.push([model.assignmentsReady===true?t('未能更新所屬群組，正顯示上次載入的資料。','Could not update roster group assignment. Showing the last loaded details.'):t('未能載入所屬排班群組，請稍後重試。','Could not load roster group assignment. Try again later.'),true,false]);
 else if(current.kind==='unknown'){
  if(current.reason==='notready')messages.push([t('所屬排班群組資料暫未提供。','Roster group assignment is not available yet.'),false,false]);
  else if(current.reason==='ambiguous')messages.push([t('所屬排班群組未能確認，請稍後重試。','Roster group assignment could not be confirmed. Try again later.'),true,false]);
  else if(current.reason!=='unresolved'||groups.valid)messages.push([t('所屬排班群組資料未提供。','Roster group assignment is unavailable or not provided.'),false,false]);
 }
 if(!groups.known&&model.assignmentsReady!==true&&!model.groupsLoading&&!model.assignmentsLoading&&!model.groupsError&&!model.assignmentsError)return `<p class="staff-roster-group-read" role="status">${esc(t('排班群組資料暫未提供。','Roster group details are not available yet.'))}</p>`;
 return messages.map(([message,error,loading])=>`<p class="staff-roster-group-read${error?' staff-roster-group-error':''}" role="${error?'alert':'status'}"${loading?' aria-busy="true"':''}>${esc(message)}</p>`).join('');
}
function button(command,label,ctx,{id='',secondary=false,close=false}={}){return `<button type="button" class="staff-roster-group-button${secondary?' staff-roster-group-secondary':''}" data-action="ui-roster-group" data-ui-command="${command}" data-ui-id="${ctx.esc(id)}"${close?` aria-label="${ctx.esc(ctx.t('關閉','Close'))}"`:''}>${ctx.esc(label)}</button>`;}
function currentFact(model,ctx){return `<dl class="staff-roster-group-facts"><div><dt>${ctx.esc(ctx.t('所屬排班群組','Belongs to Roster Group'))}</dt><dd>${ctx.esc(groupLabel(assignment(model),ctx))}</dd></div></dl>`;}
function errorMarkup(model,ctx){return model.formError?`<p class="staff-roster-group-error" role="alert">${ctx.esc(ctx.t('請選擇目前可用的排班群組，或明確選擇不屬群組。','Choose an available roster group, or explicitly choose no roster group.'))}</p>`:'';}
export function rosterGroupPageMarkup(model={},suppliedContext){
 const ctx=context(suppliedContext),{t,esc}=ctx,member=target(model),tag=ctx.embedded?'h2':'h1';
 return `<section class="staff-roster-group-page${ctx.embedded?' staff-roster-group-embedded':''}" aria-label="${esc(t('排班群組','Roster group'))}">${ctx.profile?'':`<header class="staff-roster-group-heading"><${tag}>${esc(t('排班群組','Roster group'))}</${tag}></header>`}${!member?`<p class="staff-roster-group-read" role="status">${esc(t('此老師的排班群組資料暫未提供。','Roster group details are unavailable for this staff profile.'))}</p>`:`${ctx.profile?'':`<p class="staff-roster-group-person">${esc(member.displayName||'—')}</p>`}<div class="staff-roster-group-current">${currentFact(model,ctx)}${admin(model)?button('roster-group-open',t('更改群組','Change group'),ctx,{id:member.id,secondary:true}):''}</div>${sourceMarkup(model,ctx)}`}</section>`;
}
function currentDialog(model){const member=target(model),dialog=model.dialog;return admin(model)&&member&&dialog?.id===member.id&&dialog.ownerIdentity===sessionIdentityKey(model.viewer)&&['roster-group-edit','roster-group-review'].includes(dialog.kind)?{member,dialog}:null;}
export function rosterGroupDialogMarkup(model={},suppliedContext){
 if(!model.dialog)return '';const ctx=context(suppliedContext),{t,esc}=ctx,current=currentDialog(model),review=current?.dialog.kind==='roster-group-review',draft=current?.dialog.draft||{},selection=chosen(model,draft.groupChoice),form=current?(review?'roster-group-save':'roster-group-review'):'';
 let body;if(!current)body=`<p class="staff-roster-group-read" role="status">${esc(t('排班群組設定已變更，請關閉後重新開啟。','Roster group settings are unavailable or have changed. Close and reopen them.'))}</p>`;
 else {
  const source=groupSource(model),options=[['',t('請選擇','Choose a group')],['none',t('不屬群組','No roster group')],...source.groups.map(group=>[choiceFor(group.id),group.name])];
  body=`<p class="staff-roster-group-person">${esc(current.member.displayName||'—')}</p>${errorMarkup(model,ctx)}${sourceMarkup(model,ctx)}${review?`<dl class="staff-roster-group-facts"><div><dt>${esc(t('所選群組','Selected group'))}</dt><dd>${esc(groupLabel(selection,ctx))}</dd></div></dl>${!selection?`<p class="staff-roster-group-error" role="alert">${esc(t('所選群組暫未提供，請返回重新選擇。','The selected group is unavailable. Go back and choose again.'))}</p>`:''}<p id="staff-roster-group-save-note" class="staff-roster-group-note">${esc(t('這項設定尚未儲存。','This setting has not been saved.'))}</p>`:`${currentFact(model,ctx)}<label class="staff-roster-group-field"><span>${esc(t('排班群組','Roster group'))}</span><select name="groupChoice" data-ui-command="roster-group-draft" required${model.formError?' aria-invalid="true"':''}>${options.map(([value,label])=>`<option value="${esc(value)}"${draft.groupChoice===value?' selected':''}>${esc(label)}</option>`).join('')}</select></label>`}`;
 }
 return `<div class="modal ui-staff-modal" role="dialog" aria-modal="true" aria-labelledby="staff-roster-group-title"><div class="dialog staff-roster-group-dialog" tabindex="-1"><header><h2 id="staff-roster-group-title">${esc(review?t('核對排班群組','Review roster group'):t('排班群組設定','Roster group settings'))}</h2>${button('roster-group-cancel','×',ctx,{secondary:true,close:true})}</header>${form?`<form id="ui-roster-group-form" data-ui-command="${form}" data-ui-id="${esc(model.profileStaffId)}">`:''}<div class="ui-staff-dialog-body">${body}</div><footer>${button('roster-group-cancel',review?t('返回修改','Back to edit'):t('取消','Cancel'),ctx,{secondary:true})}${current?`<button type="submit" class="staff-roster-group-button"${review?' data-ui-command="roster-group-save" disabled aria-describedby="staff-roster-group-save-note"':''}>${esc(review?t('儲存','Save'):t('核對設定','Review setting'))}</button>`:''}</footer>${form?'</form>':''}</div></div>`;
}
export function advanceRosterGroupUi(input={},command,fields={},suppliedContext){
 const model=structuredClone(input);if(model.dialog&&!currentDialog(model)){model.dialog=null;model.formError='';}
 if(command==='roster-group-open'){
  const member=target(model);model.formError='';if(!member||!admin(model)||[fields.id,fields.staffId].some(id=>id!==undefined&&id!==member.id)){model.dialog=null;return model;}
  const source=assignment(model);model.dialog={kind:'roster-group-edit',id:member.id,ownerIdentity:sessionIdentityKey(model.viewer),draft:{groupChoice:source.kind==='none'?'none':source.kind==='group'?choiceFor(source.group.id):''}};return model;
 }
 if(command==='roster-group-cancel'){model.formError='';model.dialog=model.dialog?.kind==='roster-group-review'?{...model.dialog,kind:'roster-group-edit'}:null;return model;}
 const current=currentDialog(model);if(!current||current.dialog.kind!=='roster-group-edit')return model;
 if(['roster-group-draft','roster-group-review'].includes(command)){
  if(Object.hasOwn(fields,'groupChoice'))current.dialog.draft={groupChoice:typeof fields.groupChoice==='string'?fields.groupChoice:''};
  if(command==='roster-group-review'||model.formError){model.formError=chosen(model,current.dialog.draft.groupChoice)?'':'roster-group-choice';if(command==='roster-group-review'&&!model.formError)model.dialog.kind='roster-group-review';}
 }
 return model;
}
