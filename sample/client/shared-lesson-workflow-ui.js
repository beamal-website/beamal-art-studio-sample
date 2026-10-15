// The host resolves one authorized StudentSession. This module owns only its
// presentation draft: it has no API, storage, reservation or attendance writes.
const statuses=[['present','出席','Present'],['late','遲到','Late'],['absent','缺席','Absent'],['leave','請假','Leave'],['sick','病假','Sick'],['other','其他','Other']];
const stickers=[['none','沒有貼紙','No sticker'],['yellow','黃色','Yellow'],['green','綠色','Green'],['blue','藍色','Blue'],['pink','粉紅色','Pink']];
const own=(value,key)=>Object.hasOwn(value||{},key);
const text=value=>typeof value==='string'?value:'';
const id=value=>typeof value==='string'&&!!value.trim();
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='0001-01-01'&&value<='9999-12-31'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const validTime=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const validDuration=(time,duration)=>validTime(time)&&Number.isSafeInteger(duration)&&duration>0&&duration<=1440-Number(time.slice(0,2))*60-Number(time.slice(3));
const validSource=state=>['attendance','arrange'].includes(state?.view)&&id(state.student?.id)&&id(state.lesson?.id)&&id(state.lesson?.scheduleId)&&Number.isSafeInteger(state.lesson?.sequence)&&state.lesson.sequence>0&&validDate(state.lesson.date)&&validDuration(state.lesson.time,state.lesson.duration);
const context=ctx=>({t:ctx?.t||((_zh,en)=>en),esc:ctx?.esc||escape});
const sourceStatus=state=>!own(state,'sourceStatus')?'ready':['ready','loading','error'].includes(state.sourceStatus)?state.sourceStatus:'error';
const availableSource=state=>state.availability?.ready===true&&!state.availability.loading&&!state.availability.error;
function verifiedSlots(state){
 if(!availableSource(state))return [];
 const rows=Array.isArray(state.availability.slots)?state.availability.slots:[],counts=new Map();
 for(const row of rows)if(id(row?.id))counts.set(row.id,(counts.get(row.id)||0)+1);
 return rows.filter(row=>row&&counts.get(row.id)===1&&row.eligible===true&&validDate(row.date)&&validDuration(row.time,row.duration)).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.id.localeCompare(b.id));
}
const places=slot=>Number.isSafeInteger(slot?.available)&&slot.available>=0?slot.available:null;
const chosenSlot=state=>verifiedSlots(state).find(slot=>slot.id===state.draft?.selectedSlotId&&places(slot)>0);
function attendanceDraft(state,fields={},complete=false){
 const previous=state.draft||{},draft={};
 for(const key of ['attendance','remark','sticker','showRemark']){
  if(own(fields,key))draft[key]=text(fields[key]);
  else if(key==='showRemark'&&complete)draft[key]='';
  else if(own(previous,key))draft[key]=text(previous[key]);
  else if(key==='attendance')draft[key]=statuses.some(([value])=>value===state.student?.attendance)?state.student.attendance:'';
  else if(key==='remark')draft[key]=text(state.student?.remark);
  else if(key==='sticker'&&stickers.some(([value])=>value===state.student?.stickerColor))draft[key]=state.student.stickerColor;
  else if(key==='showRemark'&&typeof state.student?.showRemark==='boolean')draft[key]=state.student.showRemark?'yes':'';
 }
 return draft;
}
function attendanceError(draft){
 if(!statuses.some(([value])=>value===draft.attendance))return 'attendance';
 if(text(draft.remark).length>2000)return 'remark';
 if(draft.sticker&&!stickers.some(([value])=>value===draft.sticker))return 'sticker';
 if(own(draft,'showRemark')&&!['','yes'].includes(draft.showRemark))return 'remark-visibility';
 return '';
}
export function advanceSharedLessonWorkflow(state={},command,fields={}){
 // Final operations are intentionally inert, including forged native submits.
 if(!['draft','review','back','select-slot','pending','filter-date'].includes(command))return state;
 if(!validSource(state))return {...state,step:'edit',draft:{},formError:'source-unavailable'};
 if(command==='back')return {...state,step:'edit',formError:''};
 if(sourceStatus(state)!=='ready'&&['review','pending','select-slot'].includes(command))return {...state,draft:state.view==='attendance'?attendanceDraft(state,fields,command==='review'):{...state.draft},formError:'source-not-ready'};
 if(state.view==='attendance'){
  if(!['draft','review'].includes(command))return state;
  const draft=attendanceDraft(state,fields,command==='review'),error=command==='review'?attendanceError(draft):'';
  return {...state,draft,step:command==='review'&&!error?'review':'edit',formError:error};
 }
 if(command==='draft')return {...state,draft:{...state.draft},...(own(fields,'date')?{filterDate:text(fields.date)}:{})};
 if(command==='filter-date'){
  const date=text(fields.date);return {...state,filterDate:date,...(!date||validDate(date)?{dateFilter:date,filterError:''}:{filterError:'date'}),formError:''};
 }
 if(command==='pending')return {...state,step:'review',draft:{...state.draft,arrangement:'pending',selectedSlotId:''},formError:''};
 if(command==='select-slot'){
  const selected=verifiedSlots(state).find(slot=>slot.id===fields.id&&places(slot)>0);
  return selected?{...state,step:'edit',draft:{...state.draft,arrangement:'selected',selectedSlotId:selected.id},formError:''}:{...state,formError:'slot-unavailable'};
 }
 if(command==='review'){
  const valid=state.draft?.arrangement==='pending'||state.draft?.arrangement==='selected'&&!!chosenSlot(state);
  return {...state,draft:{...state.draft},step:valid?'review':'edit',formError:valid?'':'slot-unavailable'};
 }
 return state;
}
const button=(command,label,ctx,{id:targetId,disabled=false,kind='secondary',extra=''}={})=>`<button type="button" class="slw-button slw-${kind}" data-action="ui-shared-lesson" data-ui-command="${command}"${targetId!==undefined?` data-ui-id="${ctx.esc(targetId)}"`:''}${disabled?' disabled':''}${extra?' '+extra:''}>${ctx.esc(label)}</button>`;
const value=(input,ctx)=>ctx.esc(input===null||input===undefined||input===''?'—':input);
function sourceContext(state,ctx){
 const {student,lesson}=state,{t,esc}=ctx;
 return `<section class="slw-context" aria-label="${esc(t('目前學生及課堂','Current student and lesson'))}" data-student-id="${esc(student.id)}" data-session-id="${esc(lesson.id)}"><strong>${value(student.displayName,ctx)}</strong><p>${value(lesson.courseName,ctx)}</p><p><time datetime="${esc(lesson.date)}">${esc(lesson.date)}</time> · ${esc(lesson.time)} · ${esc(lesson.duration)} ${t('分鐘','min')}</p><small>${t('老師：','Teacher: ')}${value(lesson.teacher,ctx)} · ${t('課室：','Room: ')}${value(lesson.room,ctx)}</small></section>`;
}
function attendanceForm(state,ctx){
 const {t,esc}=ctx,draft=attendanceDraft(state),invalid=state.formError==='attendance';
 return `<fieldset class="slw-fieldset"${invalid?' aria-invalid="true" aria-describedby="slw-form-error"':''}><legend>${t('本堂出席','Attendance for this lesson')}</legend><div class="slw-choices">${statuses.map(([status,zh,en])=>`<label class="slw-choice"><input type="radio" name="attendance" value="${status}" data-ui-command="draft"${draft.attendance===status?' checked':''} required><span>${esc(t(zh,en))}</span></label>`).join('')}</div></fieldset><label class="slw-field"><span>${t('本堂備註','Remark for this lesson')}</span><textarea name="remark" rows="4" maxlength="2000" data-ui-command="draft"${state.formError==='remark'?' aria-invalid="true" aria-describedby="slw-form-error"':''}>${esc(draft.remark)}</textarea></label><fieldset class="slw-fieldset"><legend>${t('彩色貼紙（可選）','Colour sticker (optional)')}</legend><div class="slw-stickers">${stickers.map(([colour,zh,en])=>`<label class="slw-sticker slw-sticker-${colour}"><input type="radio" name="sticker" value="${colour}" data-ui-command="draft"${draft.sticker===colour?' checked':''}><span class="slw-colour-dot" aria-hidden="true"></span><span>${esc(t(zh,en))}</span></label>`).join('')}</div></fieldset><input type="hidden" name="showRemark" value=""><label class="slw-check"><input type="checkbox" name="showRemark" value="yes" data-ui-command="draft"${draft.showRemark==='yes'?' checked':''}><span>${t('在時間表顯示這項備註與貼紙','Show this remark and sticker on the timetable')}</span></label>`;
}
function attendanceReview(state,ctx){
 const {t,esc}=ctx,draft=attendanceDraft(state),error=attendanceError(draft);
 if(error)return `<p class="slw-status" role="status">${t('出席資料暫未提供，請返回核對。','Attendance details are unavailable. Go back to review the form.')}</p>`;
 const status=statuses.find(([id])=>id===draft.attendance),sticker=stickers.find(([id])=>id===draft.sticker);
 const remark=text(draft.remark).length>160?`<details class="slw-long-note"><summary>${t('查看完整備註','Read full remark')}</summary><p>${esc(draft.remark)}</p></details>`:value(draft.remark,ctx);
 return `<dl class="slw-summary"><div><dt>${t('出席','Attendance')}</dt><dd>${esc(t(status[1],status[2]))}</dd></div><div><dt>${t('備註','Remark')}</dt><dd class="slw-note-value">${remark}</dd></div><div><dt>${t('貼紙','Sticker')}</dt><dd>${sticker?esc(t(sticker[1],sticker[2])):'—'}</dd></div><div><dt>${t('在時間表顯示','Show on timetable')}</dt><dd>${own(draft,'showRemark')?t(draft.showRemark==='yes'?'是':'否',draft.showRemark==='yes'?'Yes':'No'):'—'}</dd></div></dl>`;
}
function slotCard(slot,ctx,review=false,state={}){
 const {t,esc}=ctx,count=places(slot),selected=state.draft?.selectedSlotId===slot.id;
 return `<article class="slw-slot${selected?' is-selected':''}"><div><strong>${review?esc(slot.date)+' · ':''}${esc(slot.time)} · ${esc(slot.duration)} ${t('分鐘','min')}</strong><p>${value(slot.courseName,ctx)}</p><small>${t('老師：','Teacher: ')}${value(slot.teacher,ctx)}${slot.room?' · '+t('課室：','Room: ')+esc(slot.room):''}</small><p class="slw-places">${count===null?t('名額資料暫未提供','Places unavailable'):count===0?t('已滿','Full'):t(`可用名額：${count}`,`Available places: ${count}`)}</p></div>${review?'':button('select-slot',selected?t('已選擇','Selected'):count===0?t('已滿','Full'):t('選擇','Choose'),ctx,{id:slot.id,disabled:count===null||count===0||sourceStatus(state)!=='ready',extra:`aria-pressed="${selected}"`})}</article>`;
}
function arrangementForm(state,ctx){
 const {t,esc}=ctx,filter=text(state.filterDate??state.dateFilter),invalid=!!state.filterError;
 let contents='';
 if(!availableSource(state))contents=`<p class="slw-status" role="status">${state.availability?.loading?t('正在載入時段…','Loading slots…'):t('補堂時段暫未提供。','Replacement slots are not available yet.')}</p>`;
 else if(invalid)contents=`<p class="slw-status">${t('請修正日期以查看時段。','Correct the date to view slots.')}</p>`;
 else {
  const rows=verifiedSlots(state).filter(slot=>!state.dateFilter||slot.date===state.dateFilter),dates=[...new Set(rows.map(slot=>slot.date))];
  contents=dates.map((date,index)=>`<details class="slw-date"${rows.some(slot=>slot.date===date&&slot.id===state.draft?.selectedSlotId)||index===0?' open':''}><summary><time datetime="${esc(date)}">${esc(date)}</time></summary><div>${rows.filter(slot=>slot.date===date).map(slot=>slotCard(slot,ctx,false,state)).join('')}</div></details>`).join('')||`<p class="slw-status">${state.dateFilter?t('這個日期沒有符合的時段。','No matching slots on this date.'):t('暫未有合資格的補堂時段。','No eligible slots are available.')}</p>`;
 }
 return `<label class="slw-field slw-date-filter"><span>${t('日期（可選）','Date (optional)')}</span><input type="date" name="date" value="${esc(filter)}" data-ui-command="filter-date"${invalid?' aria-invalid="true" aria-describedby="slw-filter-error"':''}></label>${invalid?`<p id="slw-filter-error" class="slw-error" role="alert">${t('請選擇有效日期。','Choose a valid date.')}</p>`:''}<div class="slw-dates">${contents}</div><section class="slw-pending"><div><strong>${t('稍後再定時間','Arrange a time later')}</strong><p>${t('先核對這位學生這一堂的待安排資料。','Review a pending arrangement for this student and lesson.')}</p></div>${button('pending','Pending Confirmation',ctx,{disabled:sourceStatus(state)!=='ready'})}</section>`;
}
function arrangementReview(state,ctx){
 const {t}=ctx;
 if(state.draft?.arrangement==='pending')return `<section class="slw-review-card"><h3>Pending Confirmation</h3><p>${t('尚未選擇新時間。','A replacement time has not been selected.')}</p></section>`;
 const selected=chosenSlot(state);return selected?slotCard(selected,ctx,true):`<p class="slw-status" role="status">${t('所選補堂時段暫未提供，請返回重新選擇。','The selected replacement slot is unavailable. Go back to select again.')}</p>`;
}
function formError(code,ctx){const {t}=ctx;return ({attendance:t('請選擇本堂出席狀態。','Choose an attendance status.'),remark:t('備註最多 2,000 字。','Remarks can contain up to 2,000 characters.'),sticker:t('請選擇有效的貼紙。','Choose a valid sticker.'),'remark-visibility':t('請重新核對時間表展示選項。','Review the timetable display option.'),'slot-unavailable':t('請選擇可用的補堂時段，或選擇 Pending Confirmation。','Choose an available replacement slot or Pending Confirmation.'),'source-unavailable':t('此學生課堂資料暫未提供。','This student lesson is unavailable.'),'source-not-ready':t('課堂資料尚未更新，請稍後再核對。','Wait for the lesson details to update before reviewing.')})[code]||'';}
export function sharedLessonWorkflowMarkup(state={},suppliedContext={}){
 if(!['attendance','arrange'].includes(state.view))return '';
 const ctx=context(suppliedContext),{t,esc}=ctx,title=state.view==='attendance'?t('出席與備註','Attendance & remarks'):'Make Up This Class',valid=validSource(state),review=state.step==='review';
 const header=`<header class="slw-header"><h2 id="slw-title">${esc(title)}</h2>${button('close','×',ctx,{kind:'icon',extra:`aria-label="${esc(t('關閉','Close'))}"`})}</header>`;
 if(!valid)return `<div class="modal slw-modal" role="dialog" aria-modal="true" aria-labelledby="slw-title"><div class="dialog slw-dialog">${header}<div class="slw-body"><p class="slw-status" role="status">${t('此學生課堂資料暫未提供。','This student lesson is unavailable.')}</p></div><footer class="slw-footer">${button('close',t('關閉','Close'),ctx)}</footer></div></div>`;
 const status=sourceStatus(state),statusMarkup=status==='ready'?'':`<p id="slw-source-state" class="slw-source-state" role="${status==='error'?'alert':'status'}">${status==='loading'?t('正在更新課堂資料，你填寫的內容已保留。','Updating lesson details. Your entries are kept.'):t('未能更新課堂資料，你填寫的內容已保留。','Could not update lesson details. Your entries are kept.')}</p>`;
 const error=formError(state.formError,ctx),contents=sourceContext(state,ctx)+statusMarkup+(state.view==='attendance'?(review?attendanceReview(state,ctx):attendanceForm(state,ctx)):(review?arrangementReview(state,ctx):arrangementForm(state,ctx)))+(error?`<p id="slw-form-error" class="slw-error" role="alert">${esc(error)}</p>`:'');
 const body=`<div class="slw-body">${contents}${review?`<p id="slw-save-note" class="slw-save-note">${t('尚未儲存。此功能的儲存操作暫未開放。','Changes have not been saved. Saving is not available yet.')}</p>`:''}</div>`;
 const footer=`<footer class="slw-footer">${review?button('back',t('返回修改','Back to edit'),ctx)+button(state.view==='attendance'?'final-save':'final-confirm',state.view==='attendance'?t('儲存','Save'):t('確認安排','Confirm arrangement'),ctx,{disabled:true,kind:'primary',extra:'aria-describedby="slw-save-note"'}):button('close',t('取消','Cancel'),ctx)+`<button type="submit" class="slw-button slw-primary" data-action="ui-shared-lesson" data-ui-command="review"${status!=='ready'?' disabled aria-describedby="slw-source-state"':''}>${t('核對','Review')}</button>`}</footer>`;
 return `<div class="modal slw-modal" role="dialog" aria-modal="true" aria-labelledby="slw-title"><div class="dialog slw-dialog">${header}${review?`<div class="slw-content">${body}${footer}</div>`:`<form id="shared-lesson-workflow-form" data-ui-command="review">${body}${footer}</form>`}</div></div>`;
}
