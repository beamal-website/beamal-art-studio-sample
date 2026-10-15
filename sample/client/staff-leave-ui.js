// Leave presentation and local drafts only. No business record, roster,
// capacity, salary, leave balance or teacher assignment is changed here.
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const ctxOf=value=>({t:value?.t||((_zh,en)=>en),esc:value?.esc||escape,embedded:value?.embedded===true});
const rows=value=>Array.isArray(value)?value.filter(row=>row&&typeof row==='object'):[];
const text=value=>String(value??'');
const validNumber=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const hasViewer=model=>typeof model.viewer?.id==='string'&&!!model.viewer.id.trim();
const admin=model=>hasViewer(model)&&model.viewer.role==='admin';
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value.slice(0,4)!=='0000'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const time=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const types=[['sick','病假','Sick leave'],['personal','事假','Personal leave'],['annual','年假','Annual leave'],['compensation','補假','Compensation leave']];
const statuses=[['pending','待審批','Pending'],['approved','已批准','Approved'],['rejected','已拒絕','Rejected']];
const typeLabel=(value,ctx)=>{const found=types.find(([key])=>key===value);return found?ctx.t(found[1],found[2]):ctx.t('類別待確認','Type unavailable');};
const statusLabel=(value,ctx)=>{const found=statuses.find(([key])=>key===value);return found?ctx.t(found[1],found[2]):ctx.t('狀態待確認','Status unavailable');};
const sourceLabel=(value,ctx)=>value==='teacher'?ctx.t('老師申請','Teacher application'):value==='admin'?ctx.t('管理員登記','Admin entry'):ctx.t('來源待確認','Source unavailable');
function modelOf(input){return {...input,staff:rows(input.staff),rows:rows(input.rows),sessions:rows(input.sessions),from:input.from||'',to:input.to||'',teacherId:input.profileStaffId||input.teacherId||'',status:input.status||'all',query:input.query||'',dialog:input.dialog||null};}
function members(model){
  if(!hasViewer(model))return [];
  let result=model.staff.filter(member=>typeof member.id==='string'&&member.id);
  if(!admin(model))result=model.viewer.role==='teacher'?result.filter(member=>member.userId===model.viewer.id||Array.isArray(model.viewer.teacherResourceIds)&&model.viewer.teacherResourceIds.includes(member.id)):[];
  return model.profileStaffId?result.filter(member=>member.id===model.profileStaffId):result;
}
const memberFor=(model,id)=>members(model).find(member=>member.id===id);
function accessibleRecords(model){if(model.ready!==true)return [];return model.rows.filter(row=>typeof row.id==='string'&&row.id&&!!memberFor(model,row.staffId));}
function selectedRecords(model){return accessibleRecords(model).filter(row=>(!model.from||date(row.to)&&row.to>=model.from)&&(!model.to||date(row.from)&&row.from<=model.to)&&(!model.teacherId||row.staffId===model.teacherId)&&(model.status==='all'||row.status===model.status)&&(!text(model.query).trim()||[memberFor(model,row.staffId)?.displayName,row.reason].join(' ').toLocaleLowerCase().includes(text(model.query).trim().toLocaleLowerCase())));}
const recordFor=(model,id)=>selectedRecords(model).find(row=>row.id===id);
function button(command,label,ctx,{id='',secondary=false,disabled=false,extra=''}={}){return `<button type="button" class="staff-leave-button${secondary?' staff-leave-secondary':''}" data-action="ui-leave" data-ui-command="${ctx.esc(command)}" data-ui-id="${ctx.esc(id)}"${disabled?' disabled':''}${extra?' '+extra:''}>${ctx.esc(label)}</button>`;}
function submit(command,label,ctx,disabled=false){return `<button type="submit" class="staff-leave-button" data-ui-command="${ctx.esc(command)}"${disabled?' disabled aria-describedby="staff-leave-final-note"':''}>${ctx.esc(label)}</button>`;}
function field(name,label,value,ctx,{type='text',choices,command='leave-draft',required=false}={}){const attrs=`name="${ctx.esc(name)}" data-ui-command="${command}"${required?' required':''}`;return `<label class="staff-leave-field"><span>${ctx.esc(label)}</span>${choices?`<select ${attrs}>${choices.map(([key,label])=>`<option value="${ctx.esc(key)}"${text(value)===key?' selected':''}>${ctx.esc(label)}</option>`).join('')}</select>`:type==='textarea'?`<textarea ${attrs} rows="3" maxlength="1000">${ctx.esc(value)}</textarea>`:`<input type="${type}" ${attrs} value="${ctx.esc(value)}">`}</label>`;}
const facts=(values,ctx)=>`<dl class="staff-leave-facts">${values.map(([label,value])=>`<div><dt>${ctx.esc(label)}</dt><dd>${ctx.esc(value===undefined||value===null||value===''?'—':value)}</dd></div>`).join('')}</dl>`;
function readState(model,ctx){const message=model.loading===true?(model.ready===true?ctx.t('正在更新假期紀錄…','Updating leave records…'):ctx.t('正在載入假期紀錄…','Loading leave records…')):model.error?(model.ready===true?ctx.t('未能更新假期紀錄，正顯示上次載入的資料。','Could not update leave records. Showing the last loaded records.'):ctx.t('未能載入假期紀錄，請稍後重試。','Could not load leave records. Try again later.')):model.ready!==true?ctx.t('假期紀錄暫未提供。','Leave records are not available yet.'):'';return message?`<p class="staff-leave-read${model.error?' staff-leave-error':''}" role="${model.error?'alert':'status'}"${model.loading===true?' aria-busy="true"':''}>${ctx.esc(message)}</p>`:'';}
function balanceMarkup(model,ctx){
  const scope=members(model),id=model.profileStaffId||model.teacherId||(model.viewer?.role==='teacher'&&scope.length===1?scope[0].id:'');if(!id||!memberFor(model,id))return '';
  const values=model.balances?.[id],format=value=>validNumber(value?.value)?`${value.value}${typeof value.unit==='string'&&value.unit.trim()?' '+value.unit.trim():''}`:'—';
  return `<section class="staff-leave-balances">${facts([[ctx.t('年假餘額','Annual leave remaining'),format(values?.annual)],[ctx.t('補假餘額','Compensation leave remaining'),format(values?.compensation)]],ctx)}</section>`;
}
function filters(model,ctx){const draft=model.filterDraft||model;return `<div class="staff-leave-filters">${field('from',ctx.t('由','From'),draft.from||'',ctx,{type:'date',command:'leave-filter'})}${field('to',ctx.t('至','To'),draft.to||'',ctx,{type:'date',command:'leave-filter'})}${admin(model)&&!model.profileStaffId?field('teacherId',ctx.t('老師','Teacher'),draft.teacherId||'',ctx,{command:'leave-filter',choices:[['',ctx.t('全部老師','All teachers')],...members(model).map(member=>[member.id,member.displayName])]}):''}${field('status',ctx.t('狀態','Status'),draft.status||'all',ctx,{command:'leave-filter',choices:[['all',ctx.t('全部狀態','All statuses')],...statuses.map(([key,zh,en])=>[key,ctx.t(zh,en)])]})}${field('query',ctx.t('搜尋','Search'),draft.query||'',ctx,{type:'search',command:'leave-filter'})}</div>`;}
export function leavePageMarkup(input={},suppliedContext){
  const model=modelOf(input),ctx=ctxOf(suppliedContext),{t,esc}=ctx,scope=members(model),allowed=admin(model)||hasViewer(model)&&model.viewer.role==='teacher'&&scope.length>0,tag=ctx.embedded?'h2':'h1';
  const title=ctx.embedded&&!model.profileStaffId?'':'<'+tag+'>'+esc(t('假期','Leave'))+'</'+tag+'>';
  const selected=selectedRecords(model),headers=[t('老師','Teacher'),t('假期類別','Leave type'),t('日期／時間','Dates / times'),t('來源','Source'),t('狀態','Status'),t('處理人','Reviewed by'),t('處理時間','Reviewed at')],notice=readState(model,ctx);
  const empty=model.teacherId&&!model.profileStaffId||model.status!=='all'||text(model.query).trim()?t('沒有符合的假期紀錄','No matching leave records'):t('暫時沒有假期紀錄','No leave records yet');
  return `<section class="staff-leave-page${ctx.embedded?' staff-leave-embedded':' ui-staff-page'}"><header class="staff-leave-heading">${title}${allowed?button('leave-open-new',admin(model)?t('登記假期','Register leave'):t('申請假期','Request leave'),ctx,{id:model.profileStaffId||''}):''}</header><div class="staff-leave-body">${allowed?`${balanceMarkup(model,ctx)}${filters(model,ctx)}${model.filterError?`<p class="staff-leave-error" role="alert">${esc(model.filterError)}</p>`:''}${notice}<div class="staff-leave-table-wrap" role="region" aria-label="${esc(t('假期紀錄','Leave history'))}" tabindex="0"><table class="staff-leave-table"><thead><tr>${headers.map(label=>`<th scope="col">${esc(label)}</th>`).join('')}</tr></thead><tbody>${selected.length?selected.map(row=>`<tr><td>${button('leave-open-record',memberFor(model,row.staffId).displayName,ctx,{id:row.id,secondary:true})}</td><td>${esc(typeLabel(row.type,ctx))}</td><td>${esc(rangeLabel(row))}</td><td>${esc(sourceLabel(row.source,ctx))}</td><td>${esc(statusLabel(row.status,ctx))}</td><td>${esc(reviewerLabel(model,row.reviewedBy,ctx))}</td><td>${esc(reviewTime(row.reviewedAt,ctx))}</td></tr>`).join(''):`<tr><td class="staff-leave-empty" colspan="${headers.length}">${model.ready===true?esc(empty):''}</td></tr>`}</tbody></table></div>`:`<p class="staff-leave-read" role="status">${esc(t('假期資料暫未提供。','Leave details are unavailable.'))}</p>`}</div></section>`;
}
function reviewerLabel(model,value,ctx){if(value&&typeof value==='object')return value.displayName||ctx.t('處理人資料未提供','Reviewer unavailable');if(typeof value==='string'&&value)return model.staff.find(member=>member.id===value||member.userId===value)?.displayName||value;return '—';}
function reviewTime(value,ctx){
  if(value===undefined||value===null||value==='')return '—';
  const match=typeof value==='string'&&/^(\d{4}-\d{2}-\d{2})(?:T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(\.\d+)?)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?)?$/.exec(value);
  if(!match||!date(match[1]))return ctx.t('處理日期及時間未提供','Review date and time unavailable');
  const [year,month,day]=match[1].split('-'),months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const readableDate=ctx.t(`${Number(year)}年${Number(month)}月${Number(day)}日`,`${Number(day)} ${months[Number(month)-1]} ${year}`),clock=match[2]===undefined?ctx.t('時間未提供','Time unavailable'):`${match[2]}:${match[3]}${match[4]===undefined?'':':'+match[4]+(match[5]||'')}`,zone=match[6]==='Z'?'UTC':match[6]?`UTC${match[6]}`:ctx.t('時區資料未提供','Time zone unavailable');
  return `${readableDate}\n${clock}\n${zone}`;
}
function rangeLabel(row){return `${row.from||'—'}${row.startTime?' '+row.startTime:''}${row.to!==row.from||row.endTime?' – '+(row.to||'—')+(row.endTime?' '+row.endTime:''):''}`;}
function affected(model,record){
  if(model.sessionsReady!==true)return {ready:false,preview:false,list:[],missing:false};
  const related=model.sessions.filter(session=>typeof session.id==='string'&&!!session.id&&(session.staffId===record.staffId||session.originalStaffId===record.staffId));
  if(Array.isArray(record.affectedSessionIds)){const ids=new Set(record.affectedSessionIds);const matches=related.filter(session=>ids.has(session.id));return {ready:true,preview:false,list:matches,missing:matches.length<ids.size};}
  if(!date(record.from)||!date(record.to)||record.to<record.from||!!record.startTime!==!!record.endTime||record.startTime&&(!time(record.startTime)||!time(record.endTime)||record.from===record.to&&record.endTime<=record.startTime))return {ready:false,preview:false,list:[],missing:false};
  const matches=related.filter(session=>date(session.date)&&session.date>=record.from&&session.date<=record.to&&(!record.startTime||time(session.start)&&time(session.end)&&(session.date>record.from||session.end>record.startTime)&&(session.date<record.to||session.start<record.endTime)));
  return {ready:true,preview:true,list:matches,missing:false};
}
function affectedMarkup(model,record,ctx,canAssign=false){
  const state=affected(model,record),{t,esc}=ctx;
  return `<section class="staff-leave-affected"><h3>${esc(t('受影響課次','Affected class sessions'))}</h3>${!state.ready?`<p class="staff-leave-read" role="status">${esc(t('受影響課次資料暫未提供。','Affected sessions are not available yet.'))}</p>`:`${state.preview?`<p class="staff-leave-note">${esc(t('以下按日期及時間預覽，尚未保存為受影響課次紀錄。','Preview based on dates and times. These affected sessions have not been saved.'))}</p>`:''}${state.missing?`<p class="staff-leave-read" role="status">${esc(t('部分受影響課次資料未能提供。','Some affected session details are unavailable.'))}</p>`:''}${state.list.length?`<ul class="staff-leave-sessions">${state.list.map(session=>`<li><div><h4>${esc(typeof session.courseName==='object'?t(session.courseName.zh||session.courseName.en,session.courseName.en||session.courseName.zh):session.courseName||t('課程資料未提供','Course unavailable'))}</h4><p>${esc(session.date)} · ${esc(session.start||'—')}–${esc(session.end||'—')}</p><p>${esc(session.roomName||'—')}</p><p>${esc(t('已報讀／班額','Enrolled / capacity'))} · ${validNumber(session.enrolled)?session.enrolled:'—'} / ${validNumber(session.capacity)?session.capacity:'—'}</p></div>${canAssign&&admin(model)?button('leave-open-substitute',t('指定代課老師','Assign substitute'),ctx,{id:session.id,secondary:true,extra:`data-ui-record-id="${esc(record.id)}"`}):''}</li>`).join('')}</ul>`:!state.missing?`<p class="staff-leave-note">${esc(t('沒有受影響課次。','No affected sessions.'))}</p>`:''}`}</section>`;
}
function recordFacts(model,record,ctx,{draft=false}={}){
  const {t}=ctx,values=[[t('老師','Teacher'),memberFor(model,record.staffId)?.displayName],[t('假期類別','Leave type'),typeLabel(record.type,ctx)],[t('日期／時間','Dates / times'),rangeLabel(record)],[t('來源','Source'),sourceLabel(record.source,ctx)],[t('狀態','Status'),draft?(record.source==='admin'?t('尚未登記','Not registered'):t('尚未提交','Not submitted')):statusLabel(record.status,ctx)],[t('原因','Reason'),record.reason]];
  if(!draft)values.push([t('處理人','Reviewed by'),reviewerLabel(model,record.reviewedBy,ctx)],[t('處理時間','Reviewed at'),reviewTime(record.reviewedAt,ctx)],[t('處理備註','Review note'),record.reviewNote]);
  return facts(values,ctx);
}
const newKeys=['staffId','type','from','to','startTime','endTime','reason'];
const blankNew=id=>({staffId:id||'',type:'',from:'',to:'',startTime:'',endTime:'',reason:''});
function mergeDraft(draft,fields,keys){return {...draft,...Object.fromEntries(keys.filter(key=>Object.hasOwn(fields,key)).map(key=>[key,text(fields[key])]))};}
function newEditor(model,draft,ctx){
  const {t,esc}=ctx,locked=!!model.profileStaffId||!admin(model),member=memberFor(model,draft.staffId);
  return `${locked?`<p class="staff-leave-person">${esc(member?.displayName||t('老師資料未提供','Teacher unavailable'))}</p><input type="hidden" name="staffId" value="${esc(draft.staffId)}">`:field('staffId',t('老師','Teacher'),draft.staffId,ctx,{required:true,choices:[['',t('請選擇老師','Choose a teacher')],...members(model).map(member=>[member.id,member.displayName])]})}<div class="staff-leave-form-grid">${field('type',t('假期類別','Leave type'),draft.type,ctx,{required:true,choices:[['',t('請選擇類別','Choose a leave type')],...types.map(([key,zh,en])=>[key,t(zh,en)])]})}${field('from',t('開始日期','From date'),draft.from,ctx,{type:'date',required:true})}${field('to',t('結束日期','To date'),draft.to,ctx,{type:'date',required:true})}${field('startTime',t('開始時間（可選）','Start time (optional)'),draft.startTime,ctx,{type:'time'})}${field('endTime',t('結束時間（可選）','End time (optional)'),draft.endTime,ctx,{type:'time'})}</div>${field('reason',t('原因（可選）','Reason (optional)'),draft.reason,ctx,{type:'textarea'})}<p class="staff-leave-note">${esc(t('如只請部分時段，請同時填寫開始及結束時間。','For part of a day, enter both start and end times.'))}</p>${draft.type==='compensation'?`<p class="staff-leave-note">${esc(t('補假包括公眾假期相關安排。額度及薪酬影響另行確認。','Compensation leave includes public holiday arrangements. Balances and pay effects require separate confirmation.'))}</p>`:''}`;
}
function newIssue(model,draft,requestedStaffId,ctx){
  const fixed=model.profileStaffId||(!admin(model)&&members(model).length===1?members(model)[0].id:'');
  if(!memberFor(model,draft.staffId)||fixed&&requestedStaffId&&requestedStaffId!==fixed)return ctx.t('請使用指定老師的假期申請。','Use the selected teacher for this leave request.');
  if(!types.some(([key])=>key===draft.type))return ctx.t('請選擇假期類別。','Choose a leave type.');
  if(!date(draft.from)||!date(draft.to)||draft.to<draft.from)return ctx.t('請檢查開始及結束日期。','Check the from and to dates.');
  if(!!draft.startTime!==!!draft.endTime||draft.startTime&&(!time(draft.startTime)||!time(draft.endTime)||draft.from===draft.to&&draft.endTime<=draft.startTime))return ctx.t('請檢查成對的開始及結束時間。','Check both start and end times.');
  return '';
}
function candidates(model,record,session){return model.staff.filter(member=>typeof member.id==='string'&&member.id&&member.id!==record.staffId&&member.id!==session.staffId&&member.active!==false&&member.substituteEligible!==false);}
function substituteSession(model,dialog,record){return affected(model,record).list.find(session=>session.id===dialog.sessionId);}
function sessionFacts(session,ctx){return facts([[ctx.t('課次','Class session'),typeof session.courseName==='object'?ctx.t(session.courseName.zh||session.courseName.en,session.courseName.en||session.courseName.zh):session.courseName],[ctx.t('日期／時間','Dates / times'),`${session.date} · ${session.start||'—'}–${session.end||'—'}`],[ctx.t('課室','Room'),session.roomName],[ctx.t('已報讀／班額','Enrolled / capacity'),`${validNumber(session.enrolled)?session.enrolled:'—'} / ${validNumber(session.capacity)?session.capacity:'—'}`]],ctx);}
export function leaveDialogMarkup(input={},suppliedContext){
  const model=modelOf(input),ctx=ctxOf(suppliedContext),{t,esc}=ctx,dialog=model.dialog;if(!dialog)return '';
  const kind=dialog.kind,record=recordFor(model,dialog.id),isNew=['leave-new','leave-new-review'].includes(kind),substitute=['leave-substitute','leave-substitute-review'].includes(kind),session=record&&substitute?substituteSession(model,dialog,record):null,decision=['approve','reject'].find(value=>kind===`leave-${value}`||kind===`leave-${value}-review`);
  const allowed=isNew?hasViewer(model)&&['admin','teacher'].includes(model.viewer.role)&&!!memberFor(model,dialog.draft?.staffId)||admin(model)&&!model.profileStaffId:!!record&&(!substitute&&!decision||admin(model))&&(!decision||record.status==='pending')&&(!substitute||!!session);
  const title=isNew?admin(model)?t('登記假期','Register leave'):t('申請假期','Request leave'):substitute?t('指定代課老師','Assign substitute'):decision?decision==='approve'?t('批准假期','Approve leave'):t('拒絕申請','Reject leave'):t('假期紀錄','Leave record');
  let body='',form='',footer='';
  if(!allowed)body=`<p class="staff-leave-read" role="status">${esc(t('此假期資料暫未提供，請關閉後重新選擇。','This leave record is unavailable. Close and select an available record.'))}</p>`;
  else if(kind==='leave-new'){body=newEditor(model,{...blankNew(''),...dialog.draft},ctx);form='leave-review-new';footer=submit(form,t('核對申請','Review leave'),ctx);}
  else if(kind==='leave-new-review'){
    const draft=dialog.draft;body=recordFacts(model,{...draft,source:admin(model)?'admin':'teacher',status:'pending'},ctx,{draft:true})+affectedMarkup(model,draft,ctx)+`<p id="staff-leave-final-note" class="staff-leave-note">${esc(t('假期登記尚未接通，本次核對不會建立假期紀錄。','Leave registration is not connected yet. This review does not create a leave record.'))}</p>`;form=admin(model)?'leave-register':'leave-submit';footer=submit(form,admin(model)?t('登記假期','Register leave'):t('提交申請','Submit request'),ctx,true);
  }else if(decision){
    body=recordFacts(model,record,ctx)+affectedMarkup(model,record,ctx);const review=kind.endsWith('-review');
    body+=review?facts([[t('處理備註','Review note'),dialog.draft?.reviewNote]],ctx)+`<p id="staff-leave-final-note" class="staff-leave-note">${esc(t('審批尚未接通，不會更改假期、課堂、名額或薪金。','Approval is not connected yet. Leave, lessons, capacity and pay are unchanged.'))}</p>`:field('reviewNote',t('處理備註（可選）','Review note (optional)'),dialog.draft?.reviewNote||'',ctx,{type:'textarea'});
    form=review?`leave-${decision}`:`leave-review-${decision}`;footer=submit(form,review?decision==='approve'?t('批准','Approve'):t('拒絕','Reject'):t('核對決定','Review decision'),ctx,review);
  }else if(substitute){
    const review=kind.endsWith('-review'),choices=candidates(model,record,session),chosen=choices.find(member=>member.id===dialog.draft?.substituteStaffId);body=sessionFacts(session,ctx);
    body+=review?facts([[t('代課老師','Substitute teacher'),chosen?.displayName],[t('備註','Note'),dialog.draft?.note]],ctx)+`<p id="staff-leave-final-note" class="staff-leave-note">${esc(t('代課安排尚未接通，未更改授課老師、學生、班額或原假期紀錄。','Substitute assignment is not connected yet. The teacher, students, capacity and original leave record are unchanged.'))}</p>`:`${field('substituteStaffId',t('代課老師','Substitute teacher'),dialog.draft?.substituteStaffId||'',ctx,{required:true,choices:[['',t('請選擇代課老師','Choose a substitute')],...choices.map(member=>[member.id,member.displayName])]})}${field('note',t('備註（可選）','Note (optional)'),dialog.draft?.note||'',ctx,{type:'textarea'})}<p class="staff-leave-note">${esc(t('只處理這一課次。代課老師的同時段安排及假期仍需確認。','This applies to this session only. The substitute’s availability and leave still require confirmation.'))}</p>`;
    form=review?'leave-assign':'leave-review-substitute';footer=submit(form,review?t('確認代課','Assign substitute'):t('核對安排','Review assignment'),ctx,review);
  }else body=recordFacts(model,record,ctx)+affectedMarkup(model,record,ctx,true),footer=admin(model)&&record.status==='pending'?button('leave-open-approve',t('批准','Approve'),ctx,{id:record.id,secondary:true})+button('leave-open-reject',t('拒絕','Reject'),ctx,{id:record.id,secondary:true}):'';
  return `<div class="modal ui-staff-modal" role="dialog" aria-modal="true" aria-labelledby="staff-leave-title"><div class="dialog staff-leave-dialog" tabindex="-1"><header><h2 id="staff-leave-title">${esc(title)}</h2>${button('leave-cancel','×',ctx,{secondary:true,extra:`aria-label="${esc(t('關閉','Close'))}"`})}</header>${form?`<form id="ui-leave-form" data-ui-command="${form}" data-ui-id="${esc(dialog.id||'')}">`:''}<div class="ui-staff-dialog-body">${model.formError?`<p class="staff-leave-error" role="alert">${esc(model.formError)}</p>`:''}${body}</div><footer>${button('leave-cancel',kind.endsWith('-review')?t('返回修改','Back to edit'):t('取消','Cancel'),ctx,{secondary:true})}${footer}</footer>${form?'</form>':''}</div></div>`;
}
export function advanceLeaveUi(input={},command,fields={},suppliedContext){
  const model=structuredClone(modelOf(input)),ctx=ctxOf(suppliedContext);model.formError='';model.notice='';
  if(command==='leave-filter'){
    const draft={...(model.filterDraft||{from:model.from,to:model.to,teacherId:model.teacherId,status:model.status,query:model.query}),...Object.fromEntries(['from','to','teacherId','status','query'].filter(key=>Object.hasOwn(fields,key)).map(key=>[key,text(fields[key])]))};if(model.profileStaffId)draft.teacherId=model.profileStaffId;
    model.filterDraft=draft;model.filterError='';
    if(draft.from&&!date(draft.from)||draft.to&&!date(draft.to)||draft.from&&draft.to&&draft.to<draft.from)model.filterError=ctx.t('請檢查開始及結束日期。','Check the from and to dates.');
    else for(const key of ['from','to','teacherId','status','query'])model[key]=draft[key]||(['status'].includes(key)?'all':'');
    return model;
  }
  if(command==='leave-open-new'){
    const scope=members(model),requested=fields.staffId||fields.id||'',fixed=model.profileStaffId||(!admin(model)&&scope.length===1?scope[0].id:''),id=fixed||requested;
    if(!admin(model)&&(!hasViewer(model)||model.viewer.role!=='teacher'||!id||requested&&requested!==fixed)||model.profileStaffId&&!memberFor(model,model.profileStaffId)||id&&!memberFor(model,id)||!admin(model)&&scope.length!==1&&!model.profileStaffId){model.formError=ctx.t('老師假期資料暫未提供。','Teacher leave details are unavailable.');model.dialog=null;return model;}
    model.dialog={kind:'leave-new',id:'new',draft:blankNew(id)};return model;
  }
  if(command==='leave-open-record'){const record=recordFor(model,fields.id);if(record)model.dialog={kind:'leave-record',id:record.id};else {model.dialog=null;model.formError=ctx.t('假期紀錄暫未提供。','Leave record is unavailable.');}return model;}
  const dialog=model.dialog;if(!dialog)return model;
  if(command==='leave-cancel'){
    if(dialog.kind.endsWith('-review'))model.dialog={...dialog,kind:dialog.kind.slice(0,-7)};
    else model.dialog=dialog.returnTo||null;
    return model;
  }
  const record=recordFor(model,dialog.id);
  if(command==='leave-open-approve'||command==='leave-open-reject'){
    if(admin(model)&&record?.status==='pending'&&dialog.kind==='leave-record'&&(!fields.id||fields.id===record.id))model.dialog={kind:command.replace('-open-','-'),id:record.id,draft:{reviewNote:''},returnTo:dialog};return model;
  }
  if(command==='leave-open-substitute'){
    const session=record&&affected(model,record).list.find(row=>row.id===fields.id);
    if(admin(model)&&dialog.kind==='leave-record'&&record&&session&&(!fields.recordId||fields.recordId===record.id))model.dialog={kind:'leave-substitute',id:record.id,sessionId:session.id,draft:{substituteStaffId:'',note:''},returnTo:dialog};return model;
  }
  const newForm=dialog.kind==='leave-new',decision=['leave-approve','leave-reject'].includes(dialog.kind),substitute=dialog.kind==='leave-substitute',keys=newForm?newKeys:decision?['reviewNote']:substitute?['substituteStaffId','note']:[];
  if(command==='leave-draft'||['leave-review-new','leave-review-approve','leave-review-reject','leave-review-substitute'].includes(command)){
    if(!newForm&&!decision&&!substitute)return model;
    if(!newForm&&(!admin(model)||!record)||decision&&record.status!=='pending')return model;
    const requested=fields.staffId;dialog.draft=mergeDraft(dialog.draft||{},fields,keys);
    if(newForm&&(model.profileStaffId||!admin(model)))dialog.draft.staffId=model.profileStaffId||members(model)[0]?.id||'';
    if(command==='leave-draft')return model;
    if(newForm&&command==='leave-review-new'){
      model.formError=newIssue(model,dialog.draft,requested,ctx);if(!model.formError)dialog.kind='leave-new-review';
    }else if(decision&&command===`leave-review-${dialog.kind.slice(6)}`)dialog.kind+='-review';
    else if(substitute&&command==='leave-review-substitute'){
      const session=substituteSession(model,dialog,record);if(!session||!candidates(model,record,session).some(member=>member.id===dialog.draft.substituteStaffId))model.formError=ctx.t('請選擇可用的另一位代課老師。','Choose another available substitute teacher.');else dialog.kind='leave-substitute-review';
    }
  }
  // Final Submit/Register/Approve/Reject/Assign commands have no write path.
  return model;
}
