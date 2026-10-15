// Work roster presentation only. Never infer shifts from lessons or Clock,
// calculate pay, create business records, or change another teacher's identity.
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const context=value=>({t:value?.t||((_zh,en)=>en),esc:value?.esc||escape,embedded:value?.embedded===true,profile:value?.profile===true});
const array=value=>Array.isArray(value)?value.filter(item=>item&&typeof item==='object'):[];
const hasViewer=model=>typeof model.viewer?.id==='string'&&!!model.viewer.id.trim();
const admin=model=>hasViewer(model)&&model.viewer.role==='admin';
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value.slice(0,4)!=='0000'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const validMonth=value=>typeof value==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(value)&&value.slice(0,4)!=='0000';
const validTime=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
function accessibleStaff(model){
 if(!hasViewer(model))return [];
 let staff=model.staff.filter(member=>typeof member.id==='string'&&member.id.trim());
 if(!admin(model))staff=model.viewer.role==='teacher'?staff.filter(member=>member.userId===model.viewer.id||Array.isArray(model.viewer.teacherResourceIds)&&model.viewer.teacherResourceIds.includes(member.id)):[];
 return model.profileStaffId?staff.filter(member=>member.id===model.profileStaffId):staff;
}
function selectedStaff(model){const staff=accessibleStaff(model);if(model.profileStaffId)return staff.find(member=>member.id===model.profileStaffId)||null;if(model.teacherId&&staff.some(member=>member.id===model.teacherId))return staff.find(member=>member.id===model.teacherId);return !admin(model)&&staff.length===1?staff[0]:null;}
function normalized(input){const model={...input,staff:array(input.staff),rows:array(input.rows),month:typeof input.month==='string'?input.month:validDate(input.today)?input.today.slice(0,7):'',teacherId:input.profileStaffId||input.teacherId||'',dialog:input.dialog||null};if(!admin(model)){const own=selectedStaff(model);model.teacherId=own?.id||'';}return model;}
function dayRows(model,date){const member=selectedStaff(model);return model.ready===true&&member?model.rows.filter(row=>typeof row.id==='string'&&row.id.trim()&&row.staffId===member.id&&row.date===date):[];}
function button(command,label,ctx,{id='',disabled=false,secondary=false,extra=''}={}){return `<button type="button" class="staff-roster-button${secondary?' staff-roster-secondary':''}" data-action="ui-roster" data-ui-command="${ctx.esc(command)}" data-ui-id="${ctx.esc(id)}"${disabled?' disabled':''}${extra?' '+extra:''}>${ctx.esc(label)}</button>`;}
function field(name,label,value,ctx,{type='text',choices,required=false,command='roster-draft'}={}){const attrs=`name="${ctx.esc(name)}" data-ui-command="${command}"${required?' required':''}`;return `<label class="staff-roster-field"><span>${ctx.esc(label)}</span>${choices?`<select ${attrs}>${choices.map(([key,label])=>`<option value="${ctx.esc(key)}"${String(value??'')===key?' selected':''}>${ctx.esc(label)}</option>`).join('')}</select>`:type==='textarea'?`<textarea ${attrs} rows="3" maxlength="1000">${ctx.esc(value)}</textarea>`:`<input type="${type}" ${attrs} value="${ctx.esc(value)}">`}</label>`;}
function facts(values,ctx){return `<dl class="staff-roster-facts">${values.map(([label,value])=>`<div><dt>${ctx.esc(label)}</dt><dd>${ctx.esc(value===undefined||value===null||value===''?'—':value)}</dd></div>`).join('')}</dl>`;}
function sourceState(model,ctx){const text=model.loading===true?(model.ready===true?ctx.t('正在更新排班…','Updating roster…'):ctx.t('正在載入排班…','Loading roster…')):model.error?(model.ready===true?ctx.t('未能更新排班，正顯示上次載入的資料。','Could not update roster. Showing the last loaded records.'):ctx.t('未能載入排班，請稍後重試。','Could not load roster. Try again later.')):model.ready!==true?ctx.t('排班紀錄暫未提供。','Roster records are not available yet.'):'';return text?`<p class="staff-roster-read${model.error?' staff-roster-error':''}" role="${model.error?'alert':'status'}"${model.loading===true?' aria-busy="true"':''}>${ctx.esc(text)}</p>`:'';}
const completeSegments=value=>Array.isArray(value)&&value.length>0&&value.length<=3&&value.every(segment=>segment&&validTime(segment.start)&&validTime(segment.end)&&segment.end>segment.start);
function validSegments(value){
 if(!completeSegments(value))return false;
 const sorted=value.slice().sort((a,b)=>a.start.localeCompare(b.start));
 return !sorted.some((segment,index)=>index>0&&segment.start<sorted[index-1].end);
}
function rosterSummary(record,ctx){if(record.offDuty===true)return ctx.t('休息日','Off duty');if(record.offDuty===false&&validSegments(record.segments))return record.segments.map(segment=>`${segment.start}–${segment.end}`).join(' · ');return ctx.t('時段資料未提供','Times unavailable');}
function rosterGroup(model,member,ctx){const group=model.staffGroups?.[member.id],label=model.groupsReady!==true?ctx.t('排班群組資料暫未提供。','Roster group information is unavailable.'):group&&typeof group.name==='string'&&group.name.trim()?group.name:group==null?ctx.t('未指定排班群組','No roster group assigned'):ctx.t('排班群組資料暫未提供。','Roster group information is unavailable.');return `<p class="staff-roster-group"><span>${ctx.esc(ctx.t('排班群組','Roster group'))}</span><strong>${ctx.esc(label)}</strong></p>`;}
function monthDates(month){if(!validMonth(month))return null;const start=new Date(month+'-01T00:00:00Z'),next=new Date(start);next.setUTCMonth(next.getUTCMonth()+1);next.setUTCDate(0);return {offset:(start.getUTCDay()+6)%7,count:next.getUTCDate()};}
function calendar(model,ctx){
 const {t,esc}=ctx,range=monthDates(model.month);if(!range)return `<p class="staff-roster-read" role="status">${esc(t('請選擇有效月份。','Choose a valid month.'))}</p>`;
 const days=Array.from({length:range.count},(_,index)=>`${model.month}-${String(index+1).padStart(2,'0')}`),weekdays=[['一','Mon'],['二','Tue'],['三','Wed'],['四','Thu'],['五','Fri'],['六','Sat'],['日','Sun']],cells=Array.from({length:Math.ceil((range.offset+range.count)/7)*7},(_,index)=>{const day=index-range.offset+1;if(day<1||day>range.count)return '<td class="staff-roster-outside" aria-hidden="true"></td>';const date=days[day-1],records=dayRows(model,date),summary=model.ready!==true?'—':records.length?records.map(record=>rosterSummary(record,ctx)).join('\n'):t('未設定','Not set');return `<td${date===model.today?' class="staff-roster-today"':''}><button type="button" class="staff-roster-day" data-action="ui-roster" data-ui-command="roster-open-day" data-ui-id="${date}" aria-label="${esc(date+' · '+summary)}"><time datetime="${date}">${day}</time><span>${esc(summary)}</span></button></td>`;});
 return `<div class="staff-roster-calendar-wrap" role="region" aria-label="${esc(t('每月排班月曆','Monthly work roster'))}" tabindex="0"><table class="staff-roster-calendar"><thead><tr>${weekdays.map(([zh,en])=>`<th scope="col">${esc(t(zh,en))}</th>`).join('')}</tr></thead><tbody>${Array.from({length:cells.length/7},(_,week)=>`<tr>${cells.slice(week*7,week*7+7).join('')}</tr>`).join('')}</tbody></table></div><p class="staff-roster-mobile-hint">${esc(t('月曆可左右捲動，點選日期查看完整資料。','Scroll the calendar sideways and select a date for full details.'))}</p>`;
}
export function rosterPageMarkup(input={},suppliedContext){
 const model=normalized(input),ctx=context(suppliedContext),{t,esc}=ctx,member=selectedStaff(model),authorized=admin(model)||hasViewer(model)&&model.viewer.role==='teacher'&&accessibleStaff(model).length>0,tag=ctx.embedded?'h2':'h1';
 return `<section class="staff-roster-page${ctx.embedded?' staff-roster-embedded':' ui-staff-page'}" aria-label="${esc(t('工作排班','Work roster'))}">${ctx.profile?'':`<header class="staff-roster-heading"><${tag}>${esc(t('工作排班','Work roster'))}</${tag}></header>`}<div class="staff-roster-body">${!authorized?`<p class="staff-roster-read" role="status">${esc(t('排班資料暫未提供。','Roster details are unavailable.'))}</p>`:`<div class="staff-roster-filters">${!model.profileStaffId&&(admin(model)||accessibleStaff(model).length>1)?field('teacherId',t('老師','Teacher'),model.teacherId,ctx,{command:'roster-filter',choices:[['',t('請選擇老師','Choose a teacher')],...accessibleStaff(model).map(member=>[member.id,member.displayName])]}):''}${field('month',t('月份','Month'),model.month,ctx,{type:'month',command:'roster-filter'})}<div class="staff-roster-month-actions">${button('roster-prev-month',t('上個月','Previous month'),ctx,{secondary:true})}${button('roster-next-month',t('下個月','Next month'),ctx,{secondary:true})}</div></div>${model.formError?`<p class="staff-roster-error" role="alert">${esc(model.formError)}</p>`:''}${!member?`<p class="staff-roster-read" role="status">${esc(t('請選擇老師。','Choose a teacher.'))}</p>`:`<p class="staff-roster-person">${esc(member.displayName)}</p>${rosterGroup(model,member,ctx)}${sourceState(model,ctx)}${calendar(model,ctx)}`}`}</div></section>`;
}
function recordMarkup(record,ctx){return `<article class="staff-roster-source-record">${facts([[ctx.t('排班','Roster'),rosterSummary(record,ctx)],[ctx.t('備註','Note'),record.note]],ctx)}</article>`;}
const draftKeys=['offDuty','start1','end1','start2','end2','start3','end3','note','scope','until'];
function blankDraft(record){return {offDuty:record?.offDuty===true?'true':record?.offDuty===false?'false':'',...Object.fromEntries([1,2,3].flatMap(index=>[[`start${index}`,record?.segments?.[index-1]?.start||''],[`end${index}`,record?.segments?.[index-1]?.end||'']])),note:String(record?.note||''),scope:'day',until:''};}
function segmentsFrom(draft){return [1,2,3].map(index=>({start:draft[`start${index}`]||'',end:draft[`end${index}`]||''})).filter(segment=>segment.start||segment.end);}
function draftIssue(draft,day,ctx){
 if(!['true','false'].includes(draft.offDuty))return ctx.t('請選擇工作日或休息日。','Choose a working day or off duty.');
 if(draft.offDuty==='false'){
  const segments=segmentsFrom(draft);if(!completeSegments(segments))return ctx.t('請填寫一至三段完整且結束晚於開始的時段。','Enter one to three complete time segments, each ending after it starts.');
  const sorted=segments.slice().sort((a,b)=>a.start.localeCompare(b.start));if(sorted.some((segment,index)=>index>0&&segment.start<sorted[index-1].end))return ctx.t('同一天的時段不能重疊。','Time segments on the same day must not overlap.');
 }
 if(!['day','weekly'].includes(draft.scope))return ctx.t('請選擇排班範圍。','Choose a roster scope.');
 if(draft.scope==='weekly'&&(!validDate(draft.until)||draft.until<day))return ctx.t('請選擇不早於開始日期的每週結束日期。','Choose a weekly end date on or after the starting date.');
 return '';
}
function editMarkup(model,dialog,member,ctx){
 const {t,esc}=ctx,draft=dialog.draft||blankDraft();return `<p class="staff-roster-person">${esc(member.displayName)} · ${esc(dialog.id)}</p>${field('offDuty',t('工作安排','Duty status'),draft.offDuty,ctx,{required:true,choices:[['',t('請選擇','Choose duty status')],['false',t('工作日','Working day')],['true',t('休息日','Off duty')]]})}${draft.offDuty==='false'?`<div class="staff-roster-segments">${[1,2,3].map(index=>`<fieldset><legend>${esc(t(`時段 ${index}${index>1?'（可選）':''}`,`Segment ${index}${index>1?' (optional)':''}`))}</legend><div class="staff-roster-form-grid">${field('start'+index,t('開始','Start'),draft['start'+index],ctx,{type:'time',required:index===1})}${field('end'+index,t('結束','End'),draft['end'+index],ctx,{type:'time',required:index===1})}</div></fieldset>`).join('')}</div>`:''}<div class="staff-roster-form-grid">${field('scope',t('套用範圍','Apply to'),draft.scope,ctx,{choices:[['day',t('只限當天','This day only')],['weekly',t('每週同一天','Every week')]],required:true})}${draft.scope==='weekly'?field('until',t('每週排班至','Repeat weekly until'),draft.until,ctx,{type:'date',required:true}):''}</div>${field('note',t('備註（可選）','Note (optional)'),draft.note,ctx,{type:'textarea'})}<p class="staff-roster-note">${esc(t('工作排班與授課時間、打卡及薪金分開記錄。','Work roster is separate from lesson times, Clock records and payroll.'))}</p>`;
}
function reviewMarkup(dialog,member,ctx){
 const {t}=ctx,draft=dialog.draft||{},offDuty=draft.offDuty==='true',scope=draft.scope==='weekly'?t(`每週同一天 · ${dialog.id} 至 ${draft.until}`,`Every week · ${dialog.id} to ${draft.until}`):t('只限當天','This day only');
 return facts([[t('老師','Teacher'),member.displayName],[t('日期','Date'),dialog.id],[t('工作安排','Duty status'),offDuty?t('休息日','Off duty'):draft.offDuty==='false'?t('工作日','Working day'):t('待確認','Pending confirmation')],...(!offDuty&&draft.offDuty==='false'?[[t('時段','Time segments'),segmentsFrom(draft).map(segment=>`${segment.start}–${segment.end}`).join('\n')]]:[]),[t('套用範圍','Apply to'),scope],[t('備註','Note'),draft.note]],ctx)+`<p id="staff-roster-save-note" class="staff-roster-note">${ctx.esc(t('這份排班尚未保存；現有排班、課堂及薪金不變。','This roster has not been saved. Existing rosters, lessons and pay are unchanged.'))}</p>`;
}
export function rosterDialogMarkup(input={},suppliedContext){
 const model=normalized(input),ctx=context(suppliedContext),{t,esc}=ctx,dialog=model.dialog;if(!dialog)return '';const member=selectedStaff(model),allowed=!!member&&dialog.staffId===member.id&&validDate(dialog.id)&&dialog.id.slice(0,7)===model.month,editing=['roster-edit','roster-review'].includes(dialog.kind),available=allowed&&(!editing||admin(model));let body='',footer='',form='';
 if(!available)body=`<p class="staff-roster-read" role="status">${esc(t('此排班資料暫未提供。','This roster is unavailable.'))}</p>`;
 else if(dialog.kind==='roster-day'){
  const records=dayRows(model,dialog.id);body=`<p class="staff-roster-person">${esc(member.displayName)} · ${esc(dialog.id)}</p>${model.ready!==true?`<p class="staff-roster-read" role="status">${esc(t('當日排班資料暫未提供。','Roster details are unavailable for this day.'))}</p>`:records.length?records.map(record=>recordMarkup(record,ctx)+(admin(model)?button('roster-open-edit',t('編輯排班','Edit roster'),ctx,{id:record.id,secondary:true}):'')).join(''):`<p class="staff-roster-read" role="status">${esc(t('當日未設定排班。','No roster set for this day.'))}</p>`}`;if(admin(model)&&!records.length)footer=button('roster-open-edit',t('設定排班','Set roster'),ctx,{id:dialog.id});
 }else if(dialog.kind==='roster-edit'){body=editMarkup(model,dialog,member,ctx);form='roster-review';footer=`<button type="submit" class="staff-roster-button">${esc(t('核對排班','Review roster'))}</button>`;}
 else if(dialog.kind==='roster-review'){body=reviewMarkup(dialog,member,ctx);form='roster-save';footer=`<button type="submit" class="staff-roster-button" data-ui-command="roster-save" disabled aria-describedby="staff-roster-save-note">${esc(t('儲存','Save'))}</button>`;}
 else body=`<p class="staff-roster-read" role="status">${esc(t('此排班資料暫未提供。','This roster is unavailable.'))}</p>`;
 return `<div class="modal ui-staff-modal" role="dialog" aria-modal="true" aria-labelledby="staff-roster-title"><div class="dialog staff-roster-dialog" tabindex="-1"><header><h2 id="staff-roster-title">${esc(dialog.kind==='roster-review'?t('核對工作排班','Review work roster'):t('工作排班','Work roster'))}</h2>${button('roster-cancel','×',ctx,{secondary:true,extra:`aria-label="${esc(t('關閉','Close'))}"`})}</header>${form?`<form id="ui-roster-form" data-ui-command="${form}" data-ui-id="${esc(dialog.id)}">`:''}<div class="ui-staff-dialog-body">${model.formError?`<p class="staff-roster-error" role="alert">${esc(model.formError)}</p>`:''}${body}</div><footer>${button('roster-cancel',dialog.kind==='roster-review'?t('返回修改','Back to edit'):t('取消','Cancel'),ctx,{secondary:true})}${footer}</footer>${form?'</form>':''}</div></div>`;
}
export function advanceRosterUi(input={},command,fields={},suppliedContext){
 const model=structuredClone(normalized(input)),ctx=context(suppliedContext);model.formError='';model.notice='';
 if(command==='roster-filter'){
  if(Object.hasOwn(fields,'month'))model.month=String(fields.month??'');
  if(!model.profileStaffId&&Object.hasOwn(fields,'teacherId')){const id=String(fields.teacherId??'');if(admin(model)||accessibleStaff(model).some(member=>member.id===id))model.teacherId=id;}if(model.profileStaffId)model.teacherId=model.profileStaffId;model.dialog=null;return model;
 }
 if(command==='roster-prev-month'||command==='roster-next-month'){
  if(!validMonth(model.month)){model.formError=ctx.t('請選擇有效月份。','Choose a valid month.');return model;}
  const [year,month]=model.month.split('-').map(Number),index=year*12+month-1+(command==='roster-next-month'?1:-1),nextYear=Math.floor(index/12),nextMonth=index%12+1;if(nextYear<1||nextYear>9999)return model;
  model.month=`${String(nextYear).padStart(4,'0')}-${String(nextMonth).padStart(2,'0')}`;model.dialog=null;return model;
 }
 const member=selectedStaff(model);
 if(command==='roster-open-day'){
  if(!member||!validDate(fields.id)||fields.id.slice(0,7)!==model.month){model.formError=ctx.t('請選擇目前月份的有效日期及老師。','Choose a valid date and teacher in the current month.');return model;}
  model.dialog={kind:'roster-day',id:fields.id,staffId:member.id};return model;
 }
 const dialog=model.dialog;if(!dialog)return model;
 if(command==='roster-cancel'){model.dialog=dialog.kind==='roster-review'?{...dialog,kind:'roster-edit'}:dialog.returnTo||null;return model;}
 if(!member||dialog.staffId!==member.id||!validDate(dialog.id)||dialog.id.slice(0,7)!==model.month||!admin(model))return model;
 if(command==='roster-open-edit'&&dialog.kind==='roster-day'){
  const records=dayRows(model,dialog.id),record=records.find(row=>row.id===fields.id);if(!record&&(fields.id!==dialog.id||records.length)){model.formError=ctx.t('請選擇當日可用的排班紀錄。','Choose an available roster record for this day.');return model;}
  model.dialog={kind:'roster-edit',id:dialog.id,staffId:member.id,...(record?{recordId:record.id}:{}),draft:blankDraft(record),returnTo:dialog};return model;
 }
 if(['roster-draft','roster-review'].includes(command)&&dialog.kind==='roster-edit'){
  dialog.draft={...dialog.draft,...Object.fromEntries(draftKeys.filter(key=>Object.hasOwn(fields,key)).map(key=>[key,String(fields[key]??'')]))};
  if(command==='roster-review'){model.formError=draftIssue(dialog.draft,dialog.id,ctx);if(!model.formError)dialog.kind='roster-review';}
 }
 // The final Save intentionally has no business write or success path.
 return model;
}
