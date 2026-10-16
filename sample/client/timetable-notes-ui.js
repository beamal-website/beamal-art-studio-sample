// Internal timetable note drafts only. Persistence and role/context authorization
// remain with the host; this module never reads or writes business records.
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const context=ctx=>({t:typeof ctx?.t==='function'?ctx.t:(_zh,en)=>en,esc:typeof ctx?.esc==='function'?ctx.esc:escape});
const text=value=>typeof value==='string'?value:'';
const own=(value,key)=>Object.hasOwn(value||{},key);
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value.slice(0,4)!=='0000'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const validTime=value=>typeof value==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
function validContext(model){
 if(!model||!['date','lesson'].includes(model.kind)||!validDate(model.date))return false;
 if(model.kind==='date')return true;
 return typeof model.scheduleId==='string'&&!!model.scheduleId.trim()&&model.scheduleId.length<=200&&Number.isSafeInteger(model.sequence)&&model.sequence>0&&(model.time===undefined||model.time===null||model.time===''||validTime(model.time));
}
function serviceNote(model){
 const note=model.note;
 if(model.kind!=='lesson'||!validContext(model)||!note||typeof note!=='object'||Array.isArray(note))return null;
 if(note.scheduleId!==model.scheduleId||note.sequence!==model.sequence||note.courseId!==model.courseId||typeof note.courseId!=='string'||!note.courseId.trim()||note.courseId.length>200||note.date!==model.date||note.time!==model.time||!validTime(note.time))return null;
 if(!Number.isSafeInteger(model.sourceVersion)||model.sourceVersion<1||note.sourceVersion!==model.sourceVersion||!Number.isSafeInteger(note.version)||note.version<0||typeof note.text!=='string'||note.text.length>2000||typeof note.canWrite!=='boolean')return null;
 if(note.version===0?note.updatedAt!==null:typeof note.updatedAt!=='string'||!note.updatedAt.trim()||!Number.isFinite(Date.parse(note.updatedAt)))return null;
 return note;
}
export function validateTimetableNoteDraft(model){
 if(!validContext(model))return 'context';
 if(typeof model.draft?.text!=='string'||!model.draft.text.trim()&&!(own(model,'sourceStatus')&&serviceNote(model)?.version>0))return 'text';
 return model.draft.text.length>2000?'length':'';
}
function errorMessage(code,{t}){
 return code==='context'?t('這個日期或課堂的資料暫未提供，請重新選擇。','This date or lesson is unavailable. Please select it again.'):code==='text'?t('請輸入備忘內容。','Enter a note.'):code==='length'?t('備忘最多可輸入 2,000 字。','Use up to 2,000 characters for the note.'):t('請核對備忘內容後再試。','Check the note and try again.');
}
function noteContext(model,{t,esc}){
 const day=`<time datetime="${esc(model.date)}">${esc(model.date)}</time>`;
 if(model.kind==='date')return `<section class="tt-note-context" aria-label="${esc(t('備忘日期','Note date'))}"><strong>${day}</strong></section>`;
 return `<section class="tt-note-context" aria-label="${esc(t('指定課堂','Selected lesson'))}"><strong>${esc(text(model.courseName).trim()||t('課程名稱暫未提供','Course name unavailable'))}</strong><p>${day}<span aria-hidden="true"> · </span><span>${esc(validTime(model.time)?model.time:t('開始時間暫未提供','Start time unavailable'))}</span><span aria-hidden="true"> · </span><span>${esc(t(`第 ${model.sequence} 堂`,`Lesson ${model.sequence}`))}</span></p></section>`;
}
export function timetableNoteDialogMarkup(model={},suppliedContext){
 const ctx=context(suppliedContext),{t,esc}=ctx,known=validContext(model),persistent=model.kind==='lesson'&&own(model,'sourceStatus'),note=persistent?serviceNote(model):null,busy=!!model.busy,stale=!!model.stale,sourceStatus=persistent&&['loading','ready','error'].includes(model.sourceStatus)?model.sourceStatus:'error',ready=persistent&&sourceStatus==='ready'&&!!note,readonly=persistent&&!!note&&note.canWrite===false,editable=known&&(!persistent||!!note&&!readonly),review=model.stage==='review'&&editable,value=text(model.draft?.text),issue=known?(model.error||(review?validateTimetableNoteDraft(model):'')):'context';
 const title=model.kind==='lesson'?t('課堂備忘','Lesson note'):t('日期備忘','Date note');
 const error=issue?`<p id="tt-note-error" class="tt-note-error" role="alert">${esc(errorMessage(issue,ctx))}</p>`:'';
 const sourceMessage=!persistent?'':sourceStatus==='loading'?t('正在載入這堂課的備忘…','Loading this lesson note…'):!ready?(note?t('未能更新這堂課的備忘，請重試。','Could not update this lesson note. Please retry.'):t('未能載入這堂課的備忘，請重試。','Could not load this lesson note. Please retry.')):'';
 const saveMessage=stale?t('這堂課或備忘的資料已更新。請關閉後重新開啟，核對最新內容。','This lesson or note changed. Close and reopen it to review the latest information.'):text(model.saveError);
 const feedback=persistent?`<p id="tt-note-source-state" class="tt-note-error" role="${sourceStatus==='loading'?'status':'alert'}" tabindex="-1"${sourceMessage?'':' hidden'}>${esc(sourceMessage)}</p><button type="button" id="tt-note-retry" class="tt-note-button" data-action="tt-note-retry"${sourceMessage&&!stale?'':' hidden'}${busy||sourceStatus==='loading'?' disabled':''}>${esc(t('重試','Retry'))}</button><p id="tt-note-save-error" class="tt-note-error" role="alert" tabindex="-1"${saveMessage?'':' hidden'}>${esc(saveMessage)}</p>`:'';
 const clearing=!!note&&note.version>0&&!value.trim(),blocked=busy||stale||persistent&&!ready;
 const body=!known?error:noteContext(model,ctx)+error+(readonly?`<p class="tt-note-limit">${esc(t('這則備忘只供查看。','This note is read-only.'))}</p><h3 class="tt-note-label">${esc(t('備忘內容','Note'))}</h3><div class="tt-note-text">${esc(note.text||t('暫未有備忘。','No note yet.'))}</div>`:!editable?'':review?`<h3 class="tt-note-label">${esc(t('備忘內容','Note'))}</h3><div class="tt-note-text">${esc(value)}</div>${clearing?`<p class="tt-note-limit">${esc(t('儲存後會清空這則備忘的內容。','Saving will clear this note.'))}</p>`:''}<p id="tt-note-unsaved" class="tt-note-unsaved">${esc(t('這則備忘尚未儲存。','This note has not been saved.'))}</p>`:`<label class="tt-note-field" for="tt-note-text"><span>${esc(t('備忘內容','Note'))}</span><textarea id="tt-note-text" name="text" maxlength="2000" rows="7" aria-describedby="tt-note-limit${issue?' tt-note-error':''}"${issue==='text'||issue==='length'?' aria-invalid="true"':''}${busy||persistent&&!ready&&model.sourceStatus!=='error'?' disabled':''}>${esc(value)}</textarea></label><p id="tt-note-limit" class="tt-note-limit">${esc(t('最多 2,000 字。','Up to 2,000 characters.'))}</p>`);
 const canSave=review&&ready&&note.canWrite===true&&model.capabilities?.save===true&&!blocked&&!issue;
 const footer=!editable?`<button type="button" class="tt-note-button" data-action="tt-note-close"${busy?' disabled':''}>${esc(t('關閉','Close'))}</button>`:review?`<button type="button" class="tt-note-button" data-action="tt-note-back"${busy?' disabled':''}>${esc(t('返回修改','Back to edit'))}</button><button type="button" class="tt-note-button tt-note-primary" data-action="tt-note-save"${canSave?'':' disabled'} aria-describedby="tt-note-unsaved">${esc(busy?t('正在儲存…','Saving…'):t('儲存','Save'))}</button>`:`<button type="button" class="tt-note-button" data-action="tt-note-cancel"${busy?' disabled':''}>${esc(t('取消','Cancel'))}</button><button type="submit" id="tt-note-review" class="tt-note-button tt-note-primary"${blocked?' disabled':''}>${esc(t('核對','Review'))}</button>`;
 const contents=`<div id="tt-note-body" class="tt-note-body" tabindex="0">${body}</div><footer class="tt-note-footer">${footer}</footer>`,content=editable?`<form id="tt-note-form" data-ui-command="${review?'tt-note-save':'tt-note-review'}"${busy?' aria-busy="true"':''}>${contents}</form>`:`<div class="tt-note-content"${busy?' aria-busy="true"':''}>${contents}</div>`;
 return `<div class="modal tt-note-modal" role="dialog" aria-modal="true" aria-labelledby="tt-note-title"><div class="dialog tt-note-dialog" tabindex="-1"><header class="tt-note-header"><h2 id="tt-note-title">${esc(title)}</h2><button type="button" class="tt-note-button tt-note-close" data-action="tt-note-close" aria-label="${esc(t('關閉備忘','Close note'))}"${busy?' disabled':''}>×</button></header>${feedback}${content}</div></div>`;
}
export function timetableNoteButtonMarkup(model={},suppliedContext){
 const ctx=context(suppliedContext),{t,esc}=ctx,known=validContext(model),lesson=model.kind==='lesson';
 const label=known?(lesson?`${t('課堂備忘','Lesson note')}: ${text(model.courseName).trim()||t('課程名稱暫未提供','Course name unavailable')}, ${model.date}, ${validTime(model.time)?model.time:t('開始時間暫未提供','Start time unavailable')}, ${t(`第 ${model.sequence} 堂`,`Lesson ${model.sequence}`)}`:`${t('日期備忘','Date note')}: ${model.date}`):t('備忘暫未提供','Note unavailable');
 const data=known?` data-note-kind="${model.kind}" data-date="${esc(model.date)}"${lesson?` data-schedule-id="${esc(model.scheduleId)}" data-sequence="${model.sequence}"${validTime(model.time)?` data-time="${esc(model.time)}"`:''}`:''}`:'';
 return `<button type="button" class="tt-note-icon" data-action="tt-note-open"${data} aria-label="${esc(label)}" title="${esc(label)}"${known?'':' disabled'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9"/><path d="m20 2 2 2-11 11-4 1 1-4L20 2Z"/><path d="M7 7h5M7 20h10"/></svg></button>`;
}
