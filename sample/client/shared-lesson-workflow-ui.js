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
const validSource=state=>['attendance','arrange','student'].includes(state?.view)&&id(state.student?.id)&&id(state.lesson?.id)&&id(state.lesson?.scheduleId)&&Number.isSafeInteger(state.lesson?.sequence)&&state.lesson.sequence>0&&validDate(state.lesson.date)&&validDuration(state.lesson.time,state.lesson.duration);
const context=ctx=>({t:ctx?.t||((_zh,en)=>en),esc:ctx?.esc||escape});
const sourceStatus=state=>!own(state,'sourceStatus')&&!(state.view==='arrange'&&state.capabilities?.savePending===true)?'ready':['ready','loading','error'].includes(state.sourceStatus)?state.sourceStatus:'error';
function replacementStatus(state){
 const source=state.availability;
 if(!source||typeof source!=='object'||Array.isArray(source))return 'unknown';
 if(source.loading===true)return 'loading';
 if(source.error||source.loading!==undefined&&source.loading!==false)return 'error';
 if(source.policyUnconfirmed===true)return 'policy-unconfirmed';
 if(source.ready!==true)return 'unknown';
 if(!Array.isArray(source.slots)||!source.slots.every(slot=>slot&&typeof slot==='object'&&!Array.isArray(slot)&&id(slot.id)&&typeof slot.eligible==='boolean'&&validDate(slot.date)&&validDuration(slot.time,slot.duration)&&(slot.available===undefined||slot.available===null||Number.isSafeInteger(slot.available)&&slot.available>=0)))return 'error';
 return new Set(source.slots.map(slot=>slot.id)).size===source.slots.length?'ready':'error';
}
const availableSource=state=>replacementStatus(state)==='ready';
function verifiedSlots(state){
 if(!availableSource(state))return [];
 const rows=Array.isArray(state.availability.slots)?state.availability.slots:[],counts=new Map();
 for(const row of rows)if(id(row?.id))counts.set(row.id,(counts.get(row.id)||0)+1);
 return rows.filter(row=>row&&counts.get(row.id)===1&&row.eligible===true&&validDate(row.date)&&validDuration(row.time,row.duration)).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.id.localeCompare(b.id));
}
const places=slot=>Number.isSafeInteger(slot?.available)&&slot.available>=0?slot.available:null;
const chosenSlot=state=>verifiedSlots(state).find(slot=>slot.id===state.draft?.selectedSlotId&&places(slot)>0);
const pendingAck=state=>state.view==='arrange'&&validSource(state)&&state.pendingConfirmation?.studentId===state.student.id&&state.pendingConfirmation.sessionId===state.lesson.id&&state.pendingConfirmation.status==='pending'&&Number.isSafeInteger(state.pendingConfirmation.version)&&state.pendingConfirmation.version>0;
const pendingSaved=state=>state.view==='arrange'&&(pendingAck(state)||state.arrangement?.status==='pending'&&Number.isSafeInteger(state.arrangement.version)&&state.arrangement.version>0);
const pendingUncertain=state=>state.view==='arrange'&&(state.unconfirmed===true||state.uncertain===true);
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
function attendanceError(draft,state){
 const student=state?.student,annotationChanged=text(draft.remark)!==text(student?.remark)||!!draft.sticker&&draft.sticker!==student?.stickerColor||own(draft,'showRemark')&&(draft.showRemark==='yes'&&student?.showRemark!==true||draft.showRemark===''&&student?.showRemark===true);
 if(!statuses.some(([value])=>value===draft.attendance)&&!(draft.attendance===''&&student?.attendance==='unmarked'&&annotationChanged))return 'attendance';
 if(text(draft.remark).length>2000)return 'remark';
 if(draft.sticker&&!stickers.some(([value])=>value===draft.sticker))return 'sticker';
 if(own(draft,'showRemark')&&!['','yes'].includes(draft.showRemark))return 'remark-visibility';
 return '';
}
export function advanceSharedLessonWorkflow(state={},command,fields={}){
 // Student details are a canonical read-only view, never an editable draft.
 if(state.view==='student'||state.busy)return state;
 if(pendingUncertain(state))return state;
 if(state.view==='arrange'&&state.stale&&command!=='back')return state;
 if(command==='continue-arrange')return state.step==='saved'&&pendingAck(state)&&sourceStatus(state)==='ready'&&!state.stale?{...state,step:'edit',draft:{...state.draft,arrangement:'pending',selectedSlotId:''},formError:'',saveError:''}:state;
 // Final operations are intentionally inert, including forged native submits.
 if(!['draft','review','back','select-slot','pending','filter-date'].includes(command))return state;
 if(!validSource(state))return {...state,step:'edit',draft:{},formError:'source-unavailable'};
 if(state.view==='arrange'&&state.step==='saved')return state;
 if(command==='back')return {...state,step:'edit',formError:''};
 if((sourceStatus(state)!=='ready'||state.stale)&&['review','pending','select-slot'].includes(command))return {...state,draft:state.view==='attendance'?attendanceDraft(state,fields,command==='review'):{...state.draft},formError:'source-not-ready'};
 if(state.view==='attendance'){
  if(!['draft','review'].includes(command))return state;
  const draft=attendanceDraft(state,fields,command==='review'),error=command==='review'?attendanceError(draft,state):'';
  return {...state,draft,step:command==='review'&&!error?'review':'edit',formError:error};
 }
 if(command==='draft')return {...state,draft:{...state.draft},...(own(fields,'date')?{filterDate:text(fields.date)}:{})};
 if(command==='filter-date'){
  const date=text(fields.date);return {...state,filterDate:date,...(!date||validDate(date)?{dateFilter:date,filterError:''}:{filterError:'date'}),formError:''};
 }
 if(command==='pending')return pendingSaved(state)?state:{...state,step:'review',draft:{...state.draft,arrangement:'pending',selectedSlotId:''},formError:''};
 if(command==='select-slot'){
  const selected=verifiedSlots(state).find(slot=>slot.id===fields.id&&places(slot)>0);
  return selected?{...state,step:'edit',draft:{...state.draft,arrangement:'selected',selectedSlotId:selected.id},formError:''}:{...state,formError:'slot-unavailable'};
 }
 if(command==='review'){
  const valid=state.draft?.arrangement==='pending'&&!pendingSaved(state)||state.draft?.arrangement==='selected'&&!!chosenSlot(state);
  return {...state,draft:{...state.draft},step:valid?'review':'edit',formError:valid?'':'slot-unavailable'};
 }
 return state;
}
const button=(command,label,ctx,{id:targetId,disabled=false,kind='secondary',extra=''}={})=>`<button type="button" class="slw-button slw-${kind}" data-action="ui-shared-lesson" data-ui-command="${command}"${targetId!==undefined?` data-ui-id="${ctx.esc(targetId)}"`:''}${disabled?' disabled':''}${extra?' '+extra:''}>${ctx.esc(label)}</button>`;
const value=(input,ctx)=>ctx.esc(input===null||input===undefined||input===''?'—':input);
function sourceContext(state,ctx,heading=''){
 const {student,lesson}=state,{t,esc}=ctx;
 return `<section class="slw-context" aria-label="${esc(t('目前學生及課堂','Current student and lesson'))}" data-student-id="${esc(student.id)}" data-session-id="${esc(lesson.id)}">${heading?`<h3 class="slw-context-heading">${esc(heading)}</h3>`:''}<strong>${value(student.displayName,ctx)}</strong><p>${value(lesson.courseName,ctx)}</p><p><time datetime="${esc(lesson.date)}">${esc(lesson.date)}</time> · ${esc(lesson.time)} · ${esc(lesson.duration)} ${t('分鐘','min')}</p><small>${t('老師：','Teacher: ')}${value(lesson.teacher,ctx)} · ${t('課室：','Room: ')}${value(lesson.room,ctx)}</small></section>`;
}
function studentAge(student,ctx){
 const {t,esc}=ctx,age=student.age;
 if(!age||!Number.isSafeInteger(age.years)||age.years<0||!Number.isSafeInteger(age.months)||age.months<0||age.months>11||!validDate(age.asOf))return t('未提供','Not provided');
 return `${esc(t(`${age.years} 歲 ${age.months} 個月`,`${age.years} years ${age.months} months`))}<small class="slw-detail-as-of">${t('截至','As of')} <time datetime="${esc(age.asOf)}">${esc(age.asOf)}</time></small>`;
}
function studentBalance(student,ctx){
 const {t,esc}=ctx,balance=student.balance;
 if(!balance||!['minutes','visits'].includes(balance.unit)||typeof balance.remaining!=='number'||!Number.isFinite(balance.remaining)||balance.remaining<0)return t('未提供','Not provided');
 const total=typeof balance.total==='number'&&Number.isFinite(balance.total)&&balance.total>=0?` / ${balance.total}`:'',unit=balance.unit==='minutes'?t('分鐘','minutes'):t('次','visits');
 return `${esc(balance.remaining)}${esc(total)} ${unit}`;
}
function studentRemark(student,ctx){
 const {t,esc}=ctx;
 if(typeof student.remark!=='string')return t('未提供','Not provided');
 if(student.remark==='')return t('尚無備註','No remark yet');
 if(student.remark.length<=160)return esc(student.remark);
 return `<details class="slw-long-note" data-slw-note="student-remark"><summary>${t('查看完整備註','Read full remark')}<span class="slw-note-excerpt">${esc(student.remark.slice(0,100))}…</span></summary><p>${esc(student.remark)}</p></details>`;
}
function studentDetails(state,ctx){
 const {student}=state,{t,esc}=ctx,status=statuses.find(([key])=>key===student.attendance),sticker=stickers.find(([key])=>key===student.stickerColor);
 const attendance=status?esc(t(status[1],status[2])):student.attendance==='unmarked'?t('尚未登記','Not marked'):t('未提供','Not provided');
 const stickerMarkup=!sticker?t('未提供','Not provided'):sticker[0]==='none'?esc(t(sticker[1],sticker[2])):`<span class="slw-read-sticker slw-sticker-${sticker[0]}"><span class="slw-colour-dot" aria-hidden="true"></span>${esc(t(sticker[1],sticker[2]))}</span>`;
 return `<dl class="slw-summary slw-student-summary"><div><dt>${t('年齡','Age')}</dt><dd>${studentAge(student,ctx)}</dd></div><div><dt>${t('剩餘額度','Remaining balance')}</dt><dd>${studentBalance(student,ctx)}</dd></div><div><dt>${t('本堂出席','Attendance')}</dt><dd>${attendance}</dd></div><div><dt>${t('本堂備註','Remark')}</dt><dd class="slw-note-value">${studentRemark(student,ctx)}</dd></div><div><dt>${t('貼紙','Sticker')}</dt><dd>${stickerMarkup}</dd></div></dl>`;
}
function attendanceForm(state,ctx){
 const {t,esc}=ctx,draft=attendanceDraft(state),invalid=state.formError==='attendance';
 return `<fieldset class="slw-fieldset"${invalid?' aria-invalid="true" aria-describedby="slw-form-error"':''}><legend>${t('本堂出席','Attendance for this lesson')}</legend><div class="slw-choices">${statuses.map(([status,zh,en])=>`<label class="slw-choice"><input type="radio" name="attendance" value="${status}" data-ui-command="draft"${draft.attendance===status?' checked':''}${state.student.attendance==='unmarked'?'':' required'}><span>${esc(t(zh,en))}</span></label>`).join('')}</div></fieldset><label class="slw-field"><span>${t('本堂備註','Remark for this lesson')}</span><textarea name="remark" rows="4" maxlength="2000" data-ui-command="draft"${state.formError==='remark'?' aria-invalid="true" aria-describedby="slw-form-error"':''}>${esc(draft.remark)}</textarea></label><fieldset class="slw-fieldset"><legend>${t('彩色貼紙（可選）','Colour sticker (optional)')}</legend><div class="slw-stickers">${stickers.map(([colour,zh,en])=>`<label class="slw-sticker slw-sticker-${colour}"><input type="radio" name="sticker" value="${colour}" data-ui-command="draft"${draft.sticker===colour?' checked':''}><span class="slw-colour-dot" aria-hidden="true"></span><span>${esc(t(zh,en))}</span></label>`).join('')}</div></fieldset><input type="hidden" name="showRemark" value=""><label class="slw-check"><input type="checkbox" name="showRemark" value="yes" data-ui-command="draft"${draft.showRemark==='yes'?' checked':''}><span>${t('在時間表顯示這項備註與貼紙','Show this remark and sticker on the timetable')}</span></label>`;
}
function attendanceReview(state,ctx){
 const {t,esc}=ctx,draft=attendanceDraft(state),error=attendanceError(draft,state);
 if(error)return `<p class="slw-status" role="status">${t('出席資料暫未提供，請返回核對。','Attendance details are unavailable. Go back to review the form.')}</p>`;
 const status=statuses.find(([id])=>id===draft.attendance),sticker=stickers.find(([id])=>id===draft.sticker);
 const remark=text(draft.remark).length>160?`<details class="slw-long-note" data-slw-note="attendance-remark"><summary>${t('查看完整備註','Read full remark')}</summary><p>${esc(draft.remark)}</p></details>`:value(draft.remark,ctx);
 return `<dl class="slw-summary"><div><dt>${t('出席','Attendance')}</dt><dd>${status?esc(t(status[1],status[2])):t('尚未登記','Not marked')}</dd></div><div><dt>${t('備註','Remark')}</dt><dd class="slw-note-value">${remark}</dd></div><div><dt>${t('貼紙','Sticker')}</dt><dd>${sticker?esc(t(sticker[1],sticker[2])):'—'}</dd></div><div><dt>${t('在時間表顯示','Show on timetable')}</dt><dd>${own(draft,'showRemark')?t(draft.showRemark==='yes'?'是':'否',draft.showRemark==='yes'?'Yes':'No'):'—'}</dd></div></dl>`;
}
function slotCard(slot,ctx,review=false,state={}){
 const {t,esc}=ctx,count=places(slot),selected=state.draft?.selectedSlotId===slot.id;
 return `<article class="slw-slot${selected?' is-selected':''}"><div><strong>${review?esc(slot.date)+' · ':''}${esc(slot.time)} · ${esc(slot.duration)} ${t('分鐘','min')}</strong><p>${value(slot.courseName,ctx)}</p><small>${t('老師：','Teacher: ')}${value(slot.teacher,ctx)}${slot.room?' · '+t('課室：','Room: ')+esc(slot.room):''}</small><p class="slw-places">${count===null?t('名額資料暫未提供','Places unavailable'):count===0?t('已滿','Full'):t(`可用名額：${count}`,`Available places: ${count}`)}</p></div>${review?'':button('select-slot',selected?t('已選擇','Selected'):count===0?t('已滿','Full'):t('選擇','Choose'),ctx,{id:slot.id,disabled:count===null||count===0||sourceStatus(state)!=='ready'||!!state.busy||!!state.stale||pendingUncertain(state),extra:`aria-pressed="${selected}"`})}</article>`;
}
function arrangementForm(state,ctx){
 const {t,esc}=ctx,filter=text(state.filterDate??state.dateFilter),invalid=!!state.filterError||!!filter&&!validDate(filter),status=replacementStatus(state),canLoad=state.capabilities?.loadArrangementSlots===true,readBlocked=!!state.busy||pendingUncertain(state)||!!state.stale||status==='loading'||sourceStatus(state)==='loading'||invalid;
 let contents='';
 if(status!=='ready'){
  const message=status==='loading'?t('正在載入補堂時段…','Loading replacement slots…'):status==='error'?t('未能載入補堂時段。','Could not load replacement slots.'):status==='policy-unconfirmed'?t('補堂安排暫未開放。','Replacement arrangements are not open yet.'):t('補堂時段暫未提供。','Replacement slots are not available yet.');
  contents=`<div class="slw-availability-state"><p id="slw-slots-status" class="slw-status" role="${status==='error'?'alert':'status'}" tabindex="-1">${esc(message)}</p>${canLoad?button('reload-slots',status==='error'?t('重試','Retry'):t('重新讀取時段','Reload slots'),ctx,{disabled:readBlocked}):''}</div>`;
 }
 else if(invalid)contents=`<p class="slw-status">${t('請修正日期以查看時段。','Correct the date to view slots.')}</p>`;
 else {
  const rows=verifiedSlots(state).filter(slot=>!state.dateFilter||slot.date===state.dateFilter),dates=[...new Set(rows.map(slot=>slot.date))];
  contents=dates.map((date,index)=>`<details class="slw-date"${rows.some(slot=>slot.date===date&&slot.id===state.draft?.selectedSlotId)||index===0?' open':''}><summary><time datetime="${esc(date)}">${esc(date)}</time></summary><div>${rows.filter(slot=>slot.date===date).map(slot=>slotCard(slot,ctx,false,state)).join('')}</div></details>`).join('')||`<p class="slw-status">${state.dateFilter?t('這個日期沒有符合的時段。','No matching slots on this date.'):t('暫未有合資格的補堂時段。','No eligible slots are available.')}</p>`;
 }
 const alreadyPending=pendingSaved(state),dateField=`<label class="slw-field slw-date-filter"><span>${t('日期（可選）','Date (optional)')}</span><input type="date" name="date" value="${esc(filter)}" data-ui-command="filter-date"${state.busy||pendingUncertain(state)||state.stale?' disabled':''}${invalid?' aria-invalid="true" aria-describedby="slw-filter-error"':''}></label>`;
 return `${canLoad?`<div class="slw-date-query">${dateField}${button('query-slots',t('查找時段','Find slots'),ctx,{disabled:readBlocked})}</div>`:dateField}${invalid?`<p id="slw-filter-error" class="slw-error" role="alert">${t('請選擇有效日期。','Choose a valid date.')}</p>`:''}<div class="slw-dates">${contents}</div><section class="slw-pending"><div><strong>${t('稍後再定時間','Arrange a time later')}</strong><p>${alreadyPending?t('這位學生這一堂已列為待確認。你可以繼續查看補堂時段。','This student’s lesson is already pending confirmation. You can continue viewing replacement times.'):t('先核對這位學生這一堂的待安排資料。','Review a pending arrangement for this student and lesson.')}</p></div>${button('pending','Pending Confirmation',ctx,{disabled:sourceStatus(state)!=='ready'||!!state.busy||!!state.stale||pendingUncertain(state)||alreadyPending})}</section>`;
}
function arrangementReview(state,ctx){
 const {t}=ctx;
 if(state.draft?.arrangement==='pending')return `<section class="slw-review-card"><h3>Pending Confirmation</h3><p>${t('尚未選擇新時間。','A replacement time has not been selected.')}</p></section>`;
 const selected=chosenSlot(state);return `<section class="slw-replacement-review"><h3>${t('所選補堂時段','Selected replacement')}</h3>${selected?slotCard(selected,ctx,true):`<p class="slw-status" role="status">${t('所選補堂時段暫未提供，請返回重新選擇。','The selected replacement slot is unavailable. Go back to select again.')}</p>`}</section>`;
}
function formError(code,ctx){const {t}=ctx;return ({attendance:t('請選擇本堂出席狀態。','Choose an attendance status.'),remark:t('備註最多 2,000 字。','Remarks can contain up to 2,000 characters.'),sticker:t('請選擇有效的貼紙。','Choose a valid sticker.'),'remark-visibility':t('請重新核對時間表展示選項。','Review the timetable display option.'),'slot-unavailable':t('請選擇可用的補堂時段，或選擇 Pending Confirmation。','Choose an available replacement slot or Pending Confirmation.'),'source-unavailable':t('此學生課堂資料暫未提供。','This student lesson is unavailable.'),'source-not-ready':t('課堂資料尚未更新，請稍後再核對。','Wait for the lesson details to update before reviewing.')})[code]||'';}
export function sharedLessonWorkflowMarkup(state={},suppliedContext={}){
 if(!['attendance','arrange','student'].includes(state.view))return '';
 const ctx=context(suppliedContext),{t,esc}=ctx,readonly=state.view==='student',title=readonly?t('學生課堂資料','Student lesson details'):state.view==='attendance'?t('出席與備註','Attendance & remarks'):'Make Up This Class',valid=validSource(state),review=state.step==='review',busy=!!state.busy,saveCapable=state.view==='attendance'&&state.capabilities?.save===true,pendingCapability=state.view==='arrange'&&state.capabilities?.savePending===true,pendingReview=state.view==='arrange'&&state.draft?.arrangement==='pending',pendingSaveCapable=pendingCapability&&pendingReview,uncertain=pendingUncertain(state),saved=state.step==='saved'&&pendingAck(state);
 const header=`<header class="slw-header"><h2 id="slw-title">${esc(title)}</h2>${button('close','×',ctx,{kind:'icon',disabled:busy,extra:`aria-label="${esc(t('關閉','Close'))}"`})}</header>`;
 if(!valid)return `<div class="modal slw-modal" role="dialog" aria-modal="true" aria-labelledby="slw-title"><div class="dialog slw-dialog">${header}<div id="slw-body" class="slw-body" tabindex="0"><p class="slw-status" role="status">${t('此學生課堂資料暫未提供。','This student lesson is unavailable.')}</p></div><footer class="slw-footer">${button('close',t('關閉','Close'),ctx,{disabled:busy})}</footer></div></div>`;
 const status=(saveCapable||pendingCapability)&&!['ready','loading','error'].includes(state.sourceStatus)?'error':sourceStatus(state),statusMarkup=status==='ready'?'':`<p id="slw-source-state" class="slw-source-state" role="${status==='error'?'alert':'status'}">${status==='loading'?(readonly?t('正在更新課堂資料。','Updating lesson details.'):t('正在更新課堂資料，你填寫的內容已保留。','Updating lesson details. Your entries are kept.')):(readonly?t('未能更新課堂資料。','Could not update lesson details.'):t('未能更新課堂資料，你填寫的內容已保留。','Could not update lesson details. Your entries are kept.'))}</p>`;
 if(readonly)return `<div class="modal slw-modal" role="dialog" aria-modal="true" aria-labelledby="slw-title"><div class="dialog slw-dialog">${header}<div class="slw-content"><div id="slw-body" class="slw-body" tabindex="0">${sourceContext(state,ctx)}${statusMarkup}${studentDetails(state,ctx)}</div><footer class="slw-footer">${button('close',t('返回名冊','Back to student list'),ctx,{disabled:busy})}</footer></div></div></div>`;
 if(saved)return `<div class="modal slw-modal" role="dialog" aria-modal="true" aria-labelledby="slw-title"><div class="dialog slw-dialog">${header}<div class="slw-content"${busy?' aria-busy="true"':''}><div id="slw-body" class="slw-body" tabindex="0">${sourceContext(state,ctx)}${statusMarkup}<section id="slw-pending-saved" class="slw-review-card" role="status" tabindex="-1"><h3>${t('已儲存待確認安排','Pending Confirmation saved')}</h3><p>${t('這位學生這一堂已列為待確認，尚未選擇補堂時間。','This student’s lesson is pending confirmation. A replacement time has not been selected.')}</p></section></div><footer class="slw-footer">${button('close',t('關閉','Close'),ctx,{disabled:busy})}${button('continue-arrange',t('繼續查看時段','Continue viewing times'),ctx,{disabled:busy||!!state.stale||uncertain||status!=='ready',kind:'primary'})}</footer></div></div></div>`;
 const error=formError(state.formError,ctx),contents=sourceContext(state,ctx,state.view==='arrange'&&review&&state.draft?.arrangement==='selected'?t('原課堂','Original lesson'):'')+statusMarkup+(state.view==='attendance'?(review?attendanceReview(state,ctx):attendanceForm(state,ctx)):(review?arrangementReview(state,ctx):arrangementForm(state,ctx)))+(error?`<p id="slw-form-error" class="slw-error" role="alert">${esc(error)}</p>`:'');
 const pendingStale=state.view==='arrange'&&state.stale,saveError=pendingStale?t('這堂課的安排資料已更新。請關閉後重新開啟，核對最新內容。','Lesson arrangement details changed. Close and reopen this lesson to review the latest information.'):text(state.saveError)||(state.stale?t('這堂課的出席資料已更新。請關閉後重新開啟，核對最新內容。','Attendance details changed. Close and reopen this lesson to review the latest information.'):uncertain?t('尚未確認儲存結果。請再次儲存這項待確認安排，或關閉後稍後查閱。','The saving result has not been confirmed. Retry saving this pending arrangement, or close and check again later.') :''),feedback=`<p id="slw-save-error" class="slw-source-state slw-error" role="alert" tabindex="-1"${saveError?'':' hidden'}>${esc(saveError)}</p>`;
 const body=`<div id="slw-body" class="slw-body" tabindex="0">${contents}${review?`<p id="slw-save-note" class="slw-save-note">${saveCapable||pendingSaveCapable||state.view==='attendance'&&state.stale?t('尚未儲存。','Changes have not been saved.'):t('尚未儲存。此功能的儲存操作暫未開放。','Changes have not been saved. Saving is not available yet.')}</p>`:''}</div>`;
 const blocked=status!=='ready'||!!state.stale||busy||uncertain,canSave=saveCapable&&!blocked&&!attendanceError(attendanceDraft(state),state),canSavePending=pendingSaveCapable&&!busy&&!state.stale&&!pendingSaved(state)&&(state.sourceStatus==='ready'||uncertain&&state.sourceStatus==='error'),duplicatePending=pendingSaved(state)&&!(state.draft?.arrangement==='selected'&&chosenSlot(state));
 const saveCommand=pendingSaveCapable?'save-pending':saveCapable?'save':state.view==='attendance'?'final-save':'final-confirm',saveLabel=busy&&(saveCapable||pendingSaveCapable)?t('正在儲存…','Saving…'):saveCapable||pendingSaveCapable?t('儲存','Save'):state.view==='attendance'?t('儲存','Save'):t('確認安排','Confirm arrangement');
 const footer=`<footer class="slw-footer">${review?button('back',t('返回修改','Back to edit'),ctx,{disabled:busy||uncertain})+button(saveCommand,saveLabel,ctx,{disabled:!(canSave||canSavePending),kind:'primary',extra:'aria-describedby="slw-save-note"'}):button('close',t('取消','Cancel'),ctx,{disabled:busy})+`<button type="submit" class="slw-button slw-primary" data-action="ui-shared-lesson" data-ui-command="review"${blocked||duplicatePending?' disabled'+(state.stale?' aria-describedby="slw-save-error"':status!=='ready'?' aria-describedby="slw-source-state"':''):''}>${t('核對','Review')}</button>`}</footer>`;
 const content=review&&!saveCapable&&!pendingSaveCapable?`<div class="slw-content"${busy?' aria-busy="true"':''}>${body}${footer}</div>`:`<form id="shared-lesson-workflow-form" novalidate data-ui-command="${review?saveCommand:'review'}"${busy?' aria-busy="true"':''}>${body}${footer}</form>`;
 return `<div class="modal slw-modal" role="dialog" aria-modal="true" aria-labelledby="slw-title"><div class="dialog slw-dialog">${header}${feedback}${content}</div></div>`;
}
