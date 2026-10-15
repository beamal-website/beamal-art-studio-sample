// Calendar-sharing source and local settings drafts only. No URL/token creation,
// publication, external navigation, subscription or clipboard access occurs here.
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const context=value=>({t:value?.t||((_zh,en)=>en),esc:value?.esc||escape,embedded:value?.embedded===true,profile:value?.profile===true,canCopyCalendarSharing:value?.canCopyCalendarSharing===true});
const rows=value=>Array.isArray(value)?value.filter(row=>row&&typeof row==='object'):[];
const viewerKnown=model=>typeof model.viewer?.id==='string'&&!!model.viewer.id.trim();
const admin=model=>viewerKnown(model)&&model.viewer.role==='admin';
function profile(model){
 const candidates=rows(model.staff).filter(row=>typeof row.id==='string'&&row.id.trim()&&row.id===model.profileStaffId),member=candidates.length===1?candidates[0]:null;if(!member||!viewerKnown(model))return null;
 if(admin(model))return member;
 if(model.viewer.role!=='teacher')return null;
 // An explicit current self mapping overrides potentially stale profile links.
 const own=Object.hasOwn(model.viewer,'teacherResourceIds')?Array.isArray(model.viewer.teacherResourceIds)&&model.viewer.teacherResourceIds.includes(member.id):member.userId===model.viewer.id;
 return own?member:null;
}
function identity(model){return JSON.stringify([model.viewer?.id||'',model.viewer?.role||'',model.viewer?.accessRevision??'',Array.isArray(model.viewer?.teacherResourceIds)?model.viewer.teacherResourceIds.filter(id=>typeof id==='string').slice().sort():null]);}
function record(model){if(model.ready!==true||!profile(model))return null;const candidates=rows(model.records).filter(row=>row.staffId===model.profileStaffId);return candidates.length===1&&typeof candidates[0].enabled==='boolean'?candidates[0]:null;}
function safeUrl(value){
 if(typeof value!=='string'||!value||value!==value.trim()||/[\p{Cc}\p{Cf}\s\\]/u.test(value)||/%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)||!/^https?:\/\/|^webcal:\/\//i.test(value))return null;
 try{const url=new URL(value);return ['https:','http:','webcal:'].includes(url.protocol)&&url.hostname&&!url.username&&!url.password?value:null;}catch{return null;}
}
export function calendarSharingCopySource(model={},suppliedContext){const ctx=context(suppliedContext),member=profile(model),source=record(model),url=source?.enabled===true?safeUrl(source.url):null;return member&&url&&ctx.canCopyCalendarSharing?{staffId:member.id,url}:null;}
function button(command,label,ctx,{id='',secondary=false,disabled=false,extra=''}={}){return `<button type="button" class="staff-calendar-sharing-button${secondary?' staff-calendar-sharing-secondary':''}" data-action="ui-calendar-sharing" data-ui-command="${ctx.esc(command)}" data-ui-id="${ctx.esc(id)}"${disabled?' disabled':''}${extra?' '+extra:''}>${ctx.esc(label)}</button>`;}
function feedback(model,ctx){return `${model.formError?`<p class="staff-calendar-sharing-error" role="alert">${ctx.esc(model.formError)}</p>`:''}${model.notice?`<p class="staff-calendar-sharing-feedback" role="status">${ctx.esc(model.notice)}</p>`:''}`;}
function readState(model,ctx){const message=model.loading===true?(model.ready===true?ctx.t('正在更新日曆分享資料…','Updating calendar sharing…'):ctx.t('正在載入日曆分享資料…','Loading calendar sharing…')):model.error?(model.ready===true?ctx.t('未能更新日曆分享資料，正顯示上次載入的資料。','Could not update calendar sharing. Showing the last loaded details.'):ctx.t('未能載入日曆分享資料，請稍後重試。','Could not load calendar sharing. Try again later.')):model.ready!==true?ctx.t('日曆分享資料暫未提供。','Calendar sharing details are not available yet.'):'';return message?`<p class="staff-calendar-sharing-read${model.error?' staff-calendar-sharing-error':''}" role="${model.error?'alert':'status'}"${model.loading===true?' aria-busy="true"':''}>${ctx.esc(message)}</p>`:'';}
function currentStatus(source,ctx){return source?.enabled===true?ctx.t('已啟用分享','Sharing enabled'):source?.enabled===false?ctx.t('已停用分享','Sharing disabled'):ctx.t('目前分享狀態未提供','Current sharing status is unavailable');}
export function calendarSharingPageMarkup(model={},suppliedContext){
 const ctx=context(suppliedContext),{t,esc}=ctx,member=profile(model),source=record(model),url=source?.enabled===true?safeUrl(source.url):null,copy=calendarSharingCopySource(model,ctx),tag=ctx.embedded?'h2':'h1',read=readState(model,ctx);
 const person=member&&(!ctx.profile||admin(model))?`<div class="staff-calendar-sharing-profile${ctx.profile?' staff-calendar-sharing-actions':''}">${ctx.profile?'':`<p class="staff-calendar-sharing-person">${esc(member.displayName)}</p>`}${admin(model)?button('calendar-sharing-open',t('設定分享','Sharing settings'),ctx,{id:member.id,secondary:true}):''}</div>`:'';
 const status=source||!read?`<p class="staff-calendar-sharing-status" role="status">${esc(currentStatus(source,ctx))}</p>`:'';
 return `<section class="staff-calendar-sharing-page${ctx.embedded?' staff-calendar-sharing-embedded':' ui-staff-page'}" aria-label="${esc(t('日曆分享','Calendar sharing'))}">${ctx.profile?'':`<header class="staff-calendar-sharing-heading"><${tag}>${esc(t('日曆分享','Calendar sharing'))}</${tag}></header>`}<div class="staff-calendar-sharing-body">${!member?`<p class="staff-calendar-sharing-read" role="status">${esc(t('此老師的日曆分享資料暫未提供。','Calendar sharing is unavailable for this staff profile.'))}</p>`:`${person}${feedback(model,ctx)}${read}${status}<div class="staff-calendar-sharing-link"><label class="staff-calendar-sharing-field"><span>${esc(t('共享日曆連結','Shared calendar'))}</span><input type="url" value="${esc(url||'')}" readonly aria-label="${esc(t('共享日曆連結','Shared calendar'))}" placeholder="${esc(t('連結暫未提供','Link unavailable'))}" autocomplete="off" spellcheck="false"></label>${button('calendar-sharing-copy',t('複製連結','Copy link'),ctx,{id:member.id,secondary:true,disabled:!copy})}</div>${source?.enabled===true&&!url?`<p class="staff-calendar-sharing-note">${esc(t('分享連結暫未提供。','Sharing link is not available yet.'))}</p>`:''}${url&&!ctx.canCopyCalendarSharing?`<p class="staff-calendar-sharing-note">${esc(t('目前無法使用複製功能，可選取上方連結自行複製。','Copy is currently unavailable. You can select the link above and copy it manually.'))}</p>`:''}`}</div></section>`;
}
function validDialog(model){const member=profile(model),dialog=model.dialog;return !!member&&admin(model)&&dialog?.id===member.id&&dialog.ownerIdentity===identity(model)&&['calendar-sharing-edit','calendar-sharing-review'].includes(dialog.kind);}
export function calendarSharingDialogMarkup(model={},suppliedContext){
 const dialog=model.dialog;if(!dialog)return '';const ctx=context(suppliedContext),{t,esc}=ctx,valid=validDialog(model),member=profile(model),review=dialog.kind==='calendar-sharing-review',draft=dialog.draft||{},enabled=draft.enabled==='true',form=valid?(review?'calendar-sharing-save':'calendar-sharing-review'):'',title=review?t('核對日曆分享','Review calendar sharing'):t('日曆分享設定','Calendar sharing settings');
 const body=!valid?`<p class="staff-calendar-sharing-read" role="status">${esc(t('分享設定資料已變更，請關閉後重新開啟。','Sharing settings are unavailable or have changed. Close and reopen them.'))}</p>`:`<p class="staff-calendar-sharing-person">${esc(member.displayName)}</p>${feedback(model,ctx)}${review?`<dl class="staff-calendar-sharing-facts"><div><dt>${esc(t('分享設定','Share calendar'))}</dt><dd>${esc(draft.enabled==='true'?t('啟用','Enable'):draft.enabled==='false'?t('停用','Disable'):t('待確認','Pending confirmation'))}</dd></div></dl>${enabled?`<p class="staff-calendar-sharing-notice">${esc(t('取得連結的人可能讀到日曆，請只向指定人士提供。','Anyone with the link may be able to read the calendar. Share it only with intended recipients.'))}</p>`:''}<p id="staff-calendar-sharing-save-note" class="staff-calendar-sharing-note">${esc(t('這項設定尚未套用；目前無法保存分享設定。','This setting has not been applied. Sharing settings cannot be saved yet.'))}</p>`:`<p class="staff-calendar-sharing-status">${esc(currentStatus(record(model),ctx))}</p><label class="staff-calendar-sharing-field"><span>${esc(t('分享日曆','Share calendar'))}</span><select name="enabled" data-ui-command="calendar-sharing-draft" required>${[['',t('請選擇','Choose a setting')],['true',t('啟用','Enable')],['false',t('停用','Disable')]].map(([value,label])=>`<option value="${value}"${draft.enabled===value?' selected':''}>${esc(label)}</option>`).join('')}</select></label>`}`;
 return `<div class="modal ui-staff-modal" role="dialog" aria-modal="true" aria-labelledby="staff-calendar-sharing-title"><div class="dialog staff-calendar-sharing-dialog" tabindex="-1"><header><h2 id="staff-calendar-sharing-title">${esc(title)}</h2>${button('calendar-sharing-cancel','×',ctx,{secondary:true,extra:`aria-label="${esc(t('關閉','Close'))}"`})}</header>${form?`<form id="ui-calendar-sharing-form" data-ui-command="${form}" data-ui-id="${esc(dialog.id)}">`:''}<div class="ui-staff-dialog-body">${body}</div><footer>${button('calendar-sharing-cancel',review?t('返回修改','Back to edit'):t('取消','Cancel'),ctx,{secondary:true})}${valid?`<button type="submit" class="staff-calendar-sharing-button"${review?' data-ui-command="calendar-sharing-save" disabled aria-describedby="staff-calendar-sharing-save-note"':''}>${esc(review?t('儲存','Save'):t('核對設定','Review setting'))}</button>`:''}</footer>${form?'</form>':''}</div></div>`;
}
export function advanceCalendarSharingUi(input={},command,fields={},suppliedContext){
 const model=structuredClone(input),ctx=context(suppliedContext),member=profile(model);model.formError='';model.notice='';delete model.copyRequest;
 if(model.dialog&&!validDialog(model))model.dialog=null;
 if(command==='calendar-sharing-copy-result'){
  if(calendarSharingCopySource(model,ctx)){if(fields.ok===true)model.notice=ctx.t('已複製連結。','Link copied.');else if(fields.ok===false)model.formError=ctx.t('未能複製連結，請再試。','Could not copy the link. Try again.');}return model;
 }
 if(command==='calendar-sharing-open'){
  if(!member||!admin(model)||fields.id&&fields.id!==member.id){model.dialog=null;return model;}
  const source=record(model);model.dialog={kind:'calendar-sharing-edit',id:member.id,ownerIdentity:identity(model),draft:{enabled:source?.enabled===true?'true':source?.enabled===false?'false':''}};return model;
 }
 if(command==='calendar-sharing-cancel'){model.dialog=model.dialog?.kind==='calendar-sharing-review'?{...model.dialog,kind:'calendar-sharing-edit'}:null;return model;}
 if(!validDialog(model)||model.dialog.kind!=='calendar-sharing-edit')return model;
 if(command==='calendar-sharing-draft'||command==='calendar-sharing-review'){
  if(Object.hasOwn(fields,'enabled'))model.dialog.draft={enabled:String(fields.enabled??'')};
  if(command==='calendar-sharing-review'){
   if(!['true','false'].includes(model.dialog.draft.enabled))model.formError=ctx.t('請選擇啟用或停用分享。','Choose whether to enable or disable sharing.');else model.dialog.kind='calendar-sharing-review';
  }
 }
 // Saving, enabling a URL, and copying itself intentionally have no side effect.
 return model;
}
