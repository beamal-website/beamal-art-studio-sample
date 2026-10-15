// Personal contact details are separate from scheduling resources and login accounts.
// This module only prepares drafts. It never saves a record or changes access.
import {sessionIdentityKey} from './session-identity.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const context=value=>({t:value?.t||((_zh,en)=>en),esc:value?.esc||escape,embedded:value?.embedded===true,profile:value?.profile===true});
const list=value=>Array.isArray(value)?value.filter(item=>item&&typeof item==='object'):[];
const text=value=>typeof value==='string'?value:'';
const hasViewer=model=>typeof model.viewer?.id==='string'&&!!model.viewer.id.trim()&&['admin','teacher'].includes(model.viewer.role);
const admin=model=>hasViewer(model)&&model.viewer.role==='admin';
const normalized=input=>({...input,viewer:input?.viewer||{},staff:list(input?.staff),records:list(input?.records),profileStaffId:text(input?.profileStaffId),dialog:input?.dialog||null});
const fields=[
 ['fullName','全名','Full name',200],['localName','本地姓名','Local name',200],['citizenId','身份證號碼','Citizen ID',100],['gender','性別','Gender',100,'gender'],
 ['contactEmail','聯絡電郵','Contact email',320,'email'],['phone','電話','Phone',100,'tel'],['mobile','手提電話','Mobile',100,'tel'],
 ['position','職位','Position',200],['employment','僱傭安排','Employment',100,'employment'],['joined','入職日期','Joined date',10,'date'],
 ['detail','詳細資料','Detail',2000,'textarea'],['remarks','備註','Remarks',2000,'textarea'],
];
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&value.slice(0,4)!=='0000'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
function target(model){
 if(!hasViewer(model)||!model.profileStaffId.trim())return null;
 const members=model.staff.filter(member=>member.id===model.profileStaffId);if(members.length!==1)return null;
 const member=members[0];
 if(!admin(model)){
  const own=Object.hasOwn(model.viewer,'teacherResourceIds')?Array.isArray(model.viewer.teacherResourceIds)&&model.viewer.teacherResourceIds.some(id=>typeof id==='string'&&id===member.id):member.userId===model.viewer.id;
  if(!own)return null;
 }
 return member;
}
function source(model){const records=model.ready===true?model.records.filter(record=>record.staffId===model.profileStaffId):[];return {record:records.length===1?records[0]:null,ambiguous:records.length>1,known:model.ready===true};}
function sourceMessage(model,ctx){
 const {t}=ctx,info=source(model);if(info.ambiguous)return t('個人資料未能確認，請稍後重試。','Personal details could not be confirmed. Try again later.');
 if(model.loading===true)return model.ready===true?t('正在更新個人資料…','Updating personal details…'):t('正在載入個人資料…','Loading personal details…');
 if(model.error)return model.ready===true?t('未能更新個人資料，正顯示上次載入的個人資料。','Could not update personal details. Showing the last loaded personal details.'):t('未能載入個人資料，請稍後重試。','Could not load personal details. Try again later.');
 if(!info.known)return t('現有個人資料暫未提供。','Personal details are not available yet.');
 return info.record?'':t('暫未有個人資料記錄。','No personal details on file.');
}
function feedback(model,ctx){const message=sourceMessage(model,ctx);return message?`<p class="staff-profile-status" role="${model.error||source(model).ambiguous?'alert':'status'}"${model.loading===true?' aria-busy="true"':''}>${ctx.esc(message)}</p>`:'';}
function formMessage(code,ctx){return ({'staff-profile-unavailable':ctx.t('此員工的個人資料暫未提供。','This staff profile is unavailable.'),'staff-profile-email':ctx.t('請填寫有效的聯絡電郵，或留空。','Enter a valid contact email, or leave it blank.'),'staff-profile-gender':ctx.t('請選擇清單中的性別，或保留現有資料。','Choose a listed gender, or keep the existing value.'),'staff-profile-date':ctx.t('請填寫有效的入職日期，或留空。','Enter a valid joined date, or leave it blank.'),'staff-profile-length':ctx.t('部分內容過長，請縮短標示的欄位。','Some entries are too long. Shorten the marked fields.')}[code]||'');}
function errorMarkup(model,ctx){const message=formMessage(model.formError,ctx);return message?`<p class="staff-profile-error" role="alert">${ctx.esc(message)}</p>`:'';}
function employment(value,ctx){return value==='full-time'?ctx.t('全職','Full-time'):value==='part-time'?ctx.t('兼職','Part-time'):ctx.t('待確認','Pending confirmation');}
function valueOf(record,key,ctx){
 if(!record||!Object.hasOwn(record,key)||record[key]===null||record[key]===undefined)return key==='employment'?employment('',ctx):'—';
 if(typeof record[key]!=='string')return '—';
 if(!record[key].trim())return ctx.t('未填寫','Not provided');
 if(key==='employment')return employment(record[key],ctx);
 if(key==='gender')return ({male:ctx.t('男','Male'),female:ctx.t('女','Female'),unspecified:ctx.t('不透露','Unspecified')})[record[key]]||record[key];
 return record[key];
}
function facts(rows,ctx){return `<dl class="staff-profile-facts">${rows.map(([label,value])=>`<div><dt>${ctx.esc(label)}</dt><dd>${ctx.esc(value)}</dd></div>`).join('')}</dl>`;}
function birthFacts(record,today,ctx){
 const birth=text(record?.dateOfBirth),known=validDate(birth),day=text(today),years=known&&validDate(day)&&birth<=day?Number(day.slice(0,4))-Number(birth.slice(0,4))-(day.slice(5)<birth.slice(5)?1:0):null;
 return [[ctx.t('出生日期','Date of birth'),known?birth:'—'],[ctx.t('年齡','Age'),years===null?'—':ctx.t(`${years} 歲`,`${years} years`)]];
}
function personalFacts(record,ctx,today){return facts([[ctx.t('員工編號','Staff number'),valueOf(record,'staffNumber',ctx)],...birthFacts(record,today,ctx),...fields.map(([key,zh,en])=>[ctx.t(zh,en),valueOf(record,key,ctx)])],ctx);}
function resourceFacts(member,ctx){
 const color=/^#[0-9a-f]{6}$/i.test(member.representativeColor||'')?member.representativeColor:'—';
 return `<section class="staff-profile-resource"><h3>${ctx.esc(ctx.t('排課資料','Scheduling details'))}</h3>${facts([[ctx.t('顯示名稱','Display name'),text(member.displayName)||'—'],[ctx.t('代表顏色','Preferred colour'),color],[ctx.t('狀態','Status'),member.active===true?ctx.t('在職','Active'):member.active===false?ctx.t('已停用','Inactive'):ctx.t('待確認','Pending confirmation')]],ctx)}</section>`;
}
function button(command,label,id,ctx,{secondary=false,close=false}={}){return `<button type="button" class="staff-profile-button${secondary?' staff-profile-secondary':''}" data-action="ui-staff-profile" data-ui-command="${command}" data-ui-id="${ctx.esc(id)}"${close?` aria-label="${ctx.esc(ctx.t('關閉','Close'))}"`:''}>${ctx.esc(label)}</button>`;}
export function staffProfilePageMarkup(input={},suppliedContext){
 const model=normalized(input),ctx=context(suppliedContext),{t,esc}=ctx,member=target(model),info=source(model),allowed=member&&!info.ambiguous;
 const heading=ctx.profile?'':`<header class="staff-profile-heading"><${ctx.embedded?'h2':'h1'}>${esc(t('個人資料','Personal details'))}</${ctx.embedded?'h2':'h1'}>${allowed&&admin(model)?button('staff-profile-open',t('編輯個人資料','Edit personal details'),member.id,ctx,{secondary:true}):''}</header>`;
 return `<section class="staff-profile-page${ctx.embedded?' staff-profile-embedded':''}" aria-label="${esc(t('員工個人資料','Staff personal details'))}">${heading}${ctx.profile&&allowed&&admin(model)?`<div class="staff-profile-actions">${button('staff-profile-open',t('編輯個人資料','Edit personal details'),member.id,ctx,{secondary:true})}</div>`:''}${errorMarkup(model,ctx)}${!member?`<p class="staff-profile-status" role="status">${esc(t('個人資料暫未提供。','Personal details are unavailable.'))}</p>`:info.ambiguous?feedback(model,ctx):feedback(model,ctx)+personalFacts(info.record,ctx,model.today)+resourceFacts(member,ctx)}</section>`;
}
function draftFor(record){return Object.fromEntries(fields.map(([key])=>[key,text(record?.[key])]));}
function mergeDraft(draft,values){return {...draft,...Object.fromEntries(fields.filter(([key])=>Object.hasOwn(values,key)).map(([key])=>[key,String(values[key]??'')]))};}
function issues(draft,originalGender){
 const tooLong=fields.filter(([key,,,_max])=>typeof draft[key]!=='string'||draft[key].length>_max).map(([key])=>key);if(tooLong.length)return {code:'staff-profile-length',keys:tooLong};
 if(draft.gender&&!['male','female','unspecified'].includes(draft.gender)&&draft.gender!==originalGender)return {code:'staff-profile-gender',keys:['gender']};
 const email=draft.contactEmail.trim();if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {code:'staff-profile-email',keys:['contactEmail']};
 if(draft.joined.trim()&&!validDate(draft.joined.trim()))return {code:'staff-profile-date',keys:['joined']};
 return {code:'',keys:[]};
}
function inputField(definition,draft,model,ctx){
 const [key,zh,en,maxLength,kind]=definition,value=text(draft[key]),invalid=Array.isArray(model.invalidFields)&&model.invalidFields.includes(key),attrs=`name="${key}" data-ui-command="staff-profile-draft" maxlength="${maxLength}"${invalid?' aria-invalid="true"':''}`;
 let control;if(kind==='textarea')control=`<textarea ${attrs} rows="3">${ctx.esc(value)}</textarea>`;
 else if(kind==='employment'||kind==='gender'){
  const choices=kind==='gender'?[['',ctx.t('請選擇','Choose')],['male',ctx.t('男','Male')],['female',ctx.t('女','Female')],['unspecified',ctx.t('不透露','Unspecified')]]:[['',ctx.t('待確認','Pending confirmation')],['full-time',ctx.t('全職','Full-time')],['part-time',ctx.t('兼職','Part-time')]];
  if(value&&!choices.some(([key])=>key===value))choices.push([value,kind==='gender'?value:ctx.t('待確認','Pending confirmation')]);
  control=`<select ${attrs}>${choices.map(([key,label])=>`<option value="${ctx.esc(key)}"${key===value?' selected':''}>${ctx.esc(label)}</option>`).join('')}</select>`;
 }else control=`<input type="${kind||'text'}" ${attrs} value="${ctx.esc(value)}"${key==='contactEmail'?' autocomplete="email"':key==='phone'||key==='mobile'?' autocomplete="tel"':''}>`;
 return `<label class="staff-profile-field${kind==='textarea'?' staff-profile-wide':''}"><span>${ctx.esc(ctx.t(zh,en))}</span>${control}</label>`;
}
function currentDialog(model){const member=target(model),dialog=model.dialog;return admin(model)&&member&&!source(model).ambiguous&&dialog?.id===member.id&&dialog.staffId===member.id&&dialog.viewerIdentity===sessionIdentityKey(model.viewer)&&['staff-profile-edit','staff-profile-review'].includes(dialog.kind)?{member,dialog}:null;}
export function staffProfileDialogMarkup(input={},suppliedContext){
 const model=normalized(input),ctx=context(suppliedContext),{t,esc}=ctx;if(!model.dialog)return '';const current=currentDialog(model),review=current?.dialog.kind==='staff-profile-review';
 let body,footer,form='';if(!current){body=`<p class="staff-profile-status" role="status">${esc(t('此員工的個人資料暫未提供。','This staff profile is unavailable.'))}</p>`;footer=button('staff-profile-cancel',t('關閉','Close'),model.profileStaffId,ctx,{secondary:true});}
 else {
  const {member,dialog}=current,draft=dialog.draft||draftFor(null);form=review?'staff-profile-save':'staff-profile-review';
  body=`<p class="staff-profile-person">${esc(text(member.displayName)||'—')}</p>${feedback(model,ctx)}${errorMarkup(model,ctx)}${review?personalFacts({...draft,staffNumber:source(model).record?.staffNumber,dateOfBirth:source(model).record?.dateOfBirth},ctx,model.today):`${facts([[t('員工編號','Staff number'),valueOf(source(model).record,'staffNumber',ctx)],...birthFacts(source(model).record,model.today,ctx)],ctx)}<div class="staff-profile-form-grid">${fields.map(field=>inputField(field,draft,model,ctx)).join('')}</div>`}${review?`<p id="staff-profile-save-note" class="staff-profile-note">${esc(t('這些個人資料尚未儲存。','These personal details have not been saved.'))}</p>`:''}`;
  footer=button('staff-profile-cancel',review?t('返回修改','Back to edit'):t('取消','Cancel'),member.id,ctx,{secondary:true})+(review?`<button type="submit" class="staff-profile-button" data-action="ui-staff-profile" data-ui-command="staff-profile-save" disabled aria-describedby="staff-profile-save-note">${esc(t('儲存','Save'))}</button>`:`<button type="submit" class="staff-profile-button">${esc(t('核對資料','Review details'))}</button>`);
 }
 return `<div class="modal ui-staff-modal" role="dialog" aria-modal="true" aria-labelledby="staff-profile-title"><div class="dialog staff-profile-dialog" tabindex="-1"><header><h2 id="staff-profile-title">${esc(review?t('核對個人資料','Review personal details'):t('編輯個人資料','Edit personal details'))}</h2>${button('staff-profile-cancel','×',model.profileStaffId,ctx,{secondary:true,close:true})}</header>${form?`<form id="ui-staff-profile-form" data-ui-command="${form}" data-ui-id="${esc(model.profileStaffId)}">`:''}<div class="ui-staff-dialog-body staff-profile-dialog-body">${body}</div><footer>${footer}</footer>${form?'</form>':''}</div></div>`;
}
export function advanceStaffProfileUi(input={},command,values={},suppliedContext){
 const model=structuredClone(normalized(input));if(model.dialog&&!currentDialog(model)){model.dialog=null;model.formError='staff-profile-unavailable';model.invalidFields=[];}
 if(!['staff-profile-open','staff-profile-draft','staff-profile-review','staff-profile-cancel'].includes(command))return model;
 if(command==='staff-profile-cancel'){
  const current=currentDialog(model);model.dialog=current?.dialog.kind==='staff-profile-review'?{...current.dialog,kind:'staff-profile-edit'}:null;model.formError='';model.invalidFields=[];return model;
 }
 if(command==='staff-profile-open'){
  const member=target(model),matches=member&&[values.id,values.staffId].every(id=>id===undefined||id===member.id);
  if(!admin(model)||!matches||source(model).ambiguous){model.dialog=null;model.formError='staff-profile-unavailable';return model;}
  model.dialog={kind:'staff-profile-edit',id:member.id,staffId:member.id,viewerIdentity:sessionIdentityKey(model.viewer),originalGender:text(source(model).record?.gender),draft:draftFor(source(model).record)};model.formError='';model.invalidFields=[];return model;
 }
 const current=currentDialog(model);if(!current){model.dialog=null;model.formError='staff-profile-unavailable';model.invalidFields=[];return model;}
 if(current.dialog.kind!=='staff-profile-edit')return model;
 const keepValidation=['staff-profile-email','staff-profile-date','staff-profile-length','staff-profile-gender'].includes(model.formError);
 model.dialog.draft=mergeDraft(current.dialog.draft||draftFor(null),values);model.formError='';model.invalidFields=[];
 if(command==='staff-profile-review'||keepValidation){const validation=issues(model.dialog.draft,model.dialog.originalGender);model.formError=validation.code;model.invalidFields=validation.keys;if(command==='staff-profile-review'&&!validation.code)model.dialog.kind='staff-profile-review';}
 return model;
}
