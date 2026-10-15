// Presentation-only payroll. This module never calculates pay, writes records,
// generates files, or infers authorization from a person's name or email.
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const context=value=>({t:value?.t||((_zh,en)=>en),esc:value?.esc||escape,embedded:value?.embedded===true});
const list=value=>Array.isArray(value)?value.filter(row=>row&&typeof row==='object'):[];
const numeric=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const validMonth=value=>typeof value==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(value)&&value.slice(0,4)!=='0000';
const money=value=>numeric(value)?new Intl.NumberFormat('en-HK',{style:'currency',currency:'HKD',minimumFractionDigits:2,maximumFractionDigits:2}).format(value):'—';
const duration=value=>numeric(value)?`${value} min`:'—';
const approvedMinutes=value=>numeric(value)&&Number.isInteger(value)?`${value} min`:'—';
const typedAmount=value=>value!==undefined&&value!==null&&String(value).trim()!==''&&numeric(Number(value))?Number(value):null;
const statuses=[['draft','草稿','Draft'],['pending','待覆核','Pending review'],['approved','已覆核','Approved'],['released','已發放','Released']];
const statusLabel=(value,t)=>{const found=statuses.find(([key])=>key===value);return found?t(found[1],found[2]):t('待確認','Pending confirmation');};
const normalized=input=>({...input,staff:list(input.staff),rows:list(input.rows),month:typeof input.month==='string'?input.month:validMonth(input.today?.slice(0,7))?input.today.slice(0,7):'',teacherId:input.teacherId||'',status:input.status||'all',query:input.query||'',dialog:input.dialog||null});
const isAdmin=model=>!!model.viewer?.id&&model.viewer.role==='admin';
function allowedMember(model,id){
  const member=model.staff.find(row=>row.id===id);if(!member||!model.viewer?.id)return null;
  return isAdmin(model)||model.viewer.role==='teacher'&&(member.userId===model.viewer.id||Array.isArray(model.viewer.teacherResourceIds)&&model.viewer.teacherResourceIds.includes(member.id))?member:null;
}
function scopedRows(model){
  if(model.ready!==true||!validMonth(model.month))return [];
  const admin=isAdmin(model),query=String(model.query).trim().toLocaleLowerCase();
  return model.rows.filter(row=>{
    const member=allowedMember(model,row.staffId);
    return !!member&&row.month===model.month&&(admin||row.visibleToTeacher===true)&&(!admin||!model.teacherId||row.staffId===model.teacherId)&&(model.status==='all'||row.status===model.status)&&(!query||[member.displayName,row.reference||''].join(' ').toLocaleLowerCase().includes(query));
  });
}
function button(command,label,{id='',secondary=false,disabled=false,extra=''}={},ctx){return `<button type="button" class="staff-payroll-button${secondary?' staff-payroll-secondary':''}" data-action="ui-payroll" data-ui-command="${ctx.esc(command)}" data-ui-id="${ctx.esc(id)}"${disabled?' disabled':''}${extra?' '+extra:''}>${ctx.esc(label)}</button>`;}
function feedback(model,ctx){return model.formError?`<p class="staff-payroll-feedback staff-payroll-error" role="alert">${ctx.esc(model.formError)}</p>`:'';}
function sourceNotice(model,ctx){
  const {t,esc}=ctx,busy=model.loading===true,failed=!!model.error,ready=model.ready===true;
  if(!busy&&!failed&&ready)return '';
  const text=busy?(ready?t('正在更新薪金紀錄…','Updating payroll…'):t('正在載入薪金紀錄…','Loading payroll…')):failed?(ready?t('未能更新薪金紀錄，正顯示上次載入的資料。','Could not update payroll. Showing the last loaded records.'):t('未能載入薪金紀錄，請稍後重試。','Could not load payroll. Try again later.')):t('薪金紀錄暫未提供。','Payroll records are not available yet.');
  return `<p class="staff-payroll-source${failed&&!busy?' staff-payroll-error':''}" role="${failed&&!busy?'alert':'status'}"${busy?' aria-busy="true"':''}>${esc(text)}</p>`;
}
function field(name,label,value,ctx,{type='text',options,command='payroll-draft',required=false,step='0.01'}={}){
  const {esc}=ctx,attrs=`name="${esc(name)}" data-ui-command="${esc(command)}"`;
  return `<label class="staff-payroll-field"><span>${esc(label)}</span>${options?`<select ${attrs}${required?' required':''}>${options.map(([key,text])=>`<option value="${esc(key)}"${value===key?' selected':''}>${esc(text)}</option>`).join('')}</select>`:type==='textarea'?`<textarea ${attrs} rows="3" maxlength="1000">${esc(value)}</textarea>`:`<input type="${type}" ${attrs} value="${esc(value)}"${type==='number'?` min="0" step="${esc(step)}"`:''}${required?' required':''}>`}</label>`;
}
function facts(rows,ctx){return `<dl class="staff-payroll-facts">${rows.map(([label,value])=>`<div><dt>${ctx.esc(label)}</dt><dd>${ctx.esc(value===undefined||value===null||value===''?'—':value)}</dd></div>`).join('')}</dl>`;}
function toolbar(model,ctx){
  const {t}=ctx,admin=isAdmin(model),staff=model.staff.filter(member=>allowedMember(model,member.id));
  return `<div class="staff-payroll-filters">${field('month',t('月份','Month'),model.month,ctx,{type:'month',command:'payroll-filter'})}${admin?field('teacherId',t('老師','Teacher'),model.teacherId,ctx,{command:'payroll-filter',options:[['',t('全部老師','All teachers')],...staff.map(member=>[member.id,member.displayName])]}):''}${field('status',t('狀態','Status'),model.status,ctx,{command:'payroll-filter',options:[['all',t('全部狀態','All statuses')],...statuses.map(([key,zh,en])=>[key,t(zh,en)])]})}${field('query',t('搜尋','Search'),model.query,ctx,{type:'search',command:'payroll-filter'})}</div>`;
}
function tableRows(model,rows,ctx){
  const {t,esc}=ctx;
  return rows.map(row=>{
    const member=allowedMember(model,row.staffId),type=row.salaryType;
    return `<tr><td>${button('payroll-open-record',member.displayName,{id:row.id,secondary:true},ctx)}</td><td>${esc(row.month)}</td><td>${esc(type==='hourly'?t('時薪','Hourly salary'):type==='monthly'?t('月薪','Monthly salary'):t('待確認','Pending confirmation'))}</td><td>${esc(duration(row.scheduledMinutes))}</td><td>${esc(row.actualVerified===true&&numeric(row.actualMinutes)?duration(row.actualMinutes):t('待核實','Pending verification'))}</td><td>${esc(approvedMinutes(row.approvedLateMinutes))}</td><td>${esc(approvedMinutes(row.approvedOtMinutes))}</td><td>${esc(money(row.approvedDeduction))}</td><td>${esc(money(row.netPay))}</td><td><span class="staff-payroll-status">${esc(statusLabel(row.status,t))}</span></td></tr>`;
  }).join('');
}
export function payrollPageMarkup(input={},suppliedContext){
  const model=normalized(input),ctx=context(suppliedContext),{t,esc}=ctx,authorized=isAdmin(model)||model.viewer?.id&&model.viewer.role==='teacher',rows=scopedRows(model);
  const title=isAdmin(model)?t('薪金管理','Payroll'):t('薪金紀錄','Payroll');
  const headers=[t('老師','Teacher'),t('月份','Month'),t('薪資類型','Salary type'),t('排班時數','Scheduled'),t('實際工時','Actual'),t('認可遲到','Recognized late'),t('認可加班','Approved OT'),t('已核扣款','Approved deductions'),t('淨額','Net pay'),t('狀態','Status')];
  const notice=sourceNotice(model,ctx),empty=model.ready!==true?'':!validMonth(model.month)?t('請選擇月份。','Choose a month.'):model.teacherId||model.status!=='all'||String(model.query).trim()?t('沒有符合的薪金紀錄','No matching payroll records'):t('暫時沒有薪金紀錄','No payroll records yet');
  const table=`<div class="staff-payroll-table-wrap" role="region" aria-label="${esc(t('薪金紀錄','Payroll records'))}" tabindex="0"><table class="staff-payroll-table"><thead><tr>${headers.map(label=>`<th scope="col">${esc(label)}</th>`).join('')}</tr></thead><tbody>${rows.length?tableRows(model,rows,ctx):`<tr><td colspan="${headers.length}" class="staff-payroll-empty">${notice||esc(empty)}</td></tr>`}</tbody></table></div>`;
  return `<section class="staff-payroll-page${ctx.embedded?' staff-payroll-embedded':' ui-staff-page'}">${ctx.embedded?'':`<header class="staff-payroll-heading"><h1>${esc(title)}</h1></header>`}<div class="staff-payroll-body">${authorized?toolbar(model,ctx)+(rows.length?notice:'')+table:`<p class="staff-payroll-source" role="status">${esc(t('薪金資料暫未提供。','Payroll details are unavailable.'))}</p>`}</div></section>`;
}
export function salaryProfileMarkup(input={},member,suppliedContext){
  const model=normalized(input),ctx=context(suppliedContext),{t,esc}=ctx,target=allowedMember(model,member?.id);
  if(!target)return `<p class="staff-payroll-source" role="status">${esc(t('薪酬設定暫未提供。','Salary settings are unavailable.'))}</p>`;
  const profile=target.salaryProfile||{},type=profile.salaryType,known=['hourly','monthly'].includes(type);
  return `<section class="staff-payroll-profile"><div class="staff-payroll-section-heading"><h3>${esc(t('薪酬設定','Salary settings'))}</h3>${isAdmin(model)?button('payroll-open-salary',t('設定薪酬','Set salary'),{id:target.id,secondary:true},ctx):''}</div>${facts([[t('薪資類型','Salary type'),known?type==='hourly'?t('時薪','Hourly salary'):t('月薪','Monthly salary'):t('待確認','Pending confirmation')],...(type==='hourly'?[[t('時薪（港元／小時）','Hourly rate (HKD / hour)'),money(profile.hourlyRate)]]:type==='monthly'?[[t('基本月薪（港元／月）','Monthly base salary (HKD / month)'),money(profile.monthlyBaseSalary)]]:[])],ctx)}</section>`;
}
function salaryDraft(member){const profile=member.salaryProfile||{};return {salaryType:['hourly','monthly'].includes(profile.salaryType)?profile.salaryType:'',hourlyRate:numeric(profile.hourlyRate)?String(profile.hourlyRate):'',monthlyBaseSalary:numeric(profile.monthlyBaseSalary)?String(profile.monthlyBaseSalary):'',note:String(profile.note||'')};}
function mergeDraft(current,fields){return {...current,...Object.fromEntries(['salaryType','hourlyRate','monthlyBaseSalary','note'].filter(key=>Object.hasOwn(fields,key)).map(key=>[key,String(fields[key]??'')]))};}
const adjustmentKeys=['approvedLateMinutes','approvedOtMinutes','approvedOtPay','approvedDeduction','note'];
function adjustmentDraft(row){return Object.fromEntries(adjustmentKeys.map(key=>[key,key==='note'?String(row.adjustmentNote||''):numeric(row[key])?String(row[key]):'']));}
function mergeAdjustment(current,fields){return {...current,...Object.fromEntries(adjustmentKeys.filter(key=>Object.hasOwn(fields,key)).map(key=>[key,String(fields[key]??'')]))};}
function adjustmentEditor(model,row,draft,ctx){
  const {t,esc}=ctx,member=allowedMember(model,row.staffId);
  return `<p class="staff-payroll-person">${esc(member.displayName)} · ${esc(row.month)}</p>${facts([[t('原紀錄淨額','Recorded net pay'),money(row.netPay)]],ctx)}<div class="staff-payroll-form-grid">${field('approvedLateMinutes',t('認可遲到（分鐘）','Recognized late (minutes)'),draft.approvedLateMinutes,ctx,{type:'number',step:'1',required:true})}${field('approvedOtMinutes',t('認可加班（分鐘）','Approved OT (minutes)'),draft.approvedOtMinutes,ctx,{type:'number',step:'1',required:true})}${field('approvedOtPay',t('加班補款（港元）','OT pay (HKD)'),draft.approvedOtPay,ctx,{type:'number'})}${field('approvedDeduction',t('扣款（港元）','Deductions (HKD)'),draft.approvedDeduction,ctx,{type:'number'})}</div>${field('note',t('核對備註（可選）','Review note (optional)'),draft.note,ctx,{type:'textarea'})}<p class="staff-payroll-note">${esc(t('未確定的金額可留空。加班費率、扣款及假期待遇須另行確認；本次核對不會自動計算或更改淨額。','Leave an amount blank if it is not confirmed. OT rates, deductions and leave pay require separate confirmation. This review does not calculate or change net pay.'))}</p>`;
}
function adjustmentReview(model,row,draft,ctx){
  const {t,esc}=ctx,member=allowedMember(model,row.staffId);
  return `<p class="staff-payroll-person">${esc(member.displayName)} · ${esc(row.month)}</p>${facts([[t('原紀錄淨額','Recorded net pay'),money(row.netPay)]],ctx)}<div class="staff-payroll-section-heading"><h3>${esc(t('待核對調整','Adjustments to review'))}</h3></div>${facts([[t('認可遲到','Recognized late'),approvedMinutes(typedAmount(draft.approvedLateMinutes))],[t('認可加班','Approved OT'),approvedMinutes(typedAmount(draft.approvedOtMinutes))],[t('加班補款','OT pay'),money(typedAmount(draft.approvedOtPay))],[t('扣款','Deductions'),money(typedAmount(draft.approvedDeduction))],...(draft.note?[[t('核對備註','Review note'),draft.note]]:[])],ctx)}<p id="staff-payroll-approve-note" class="staff-payroll-note">${esc(t('調整尚未套用，原紀錄淨額不變。薪金審批尚未接通。','These adjustments have not been applied. The recorded net pay is unchanged. Payroll approval is not connected yet.'))}</p>`;
}
function salaryEditor(member,draft,ctx){
  const {t,esc}=ctx;
  return `<p class="staff-payroll-person">${esc(member.displayName)}</p><div class="staff-payroll-form-grid">${field('salaryType',t('薪資類型','Salary type'),draft.salaryType,ctx,{command:'payroll-salary-type',required:true,options:[['',t('請選擇','Select salary type')],['hourly',t('時薪','Hourly salary')],['monthly',t('月薪','Monthly salary')]]})}${draft.salaryType==='hourly'?field('hourlyRate',t('時薪（港元／小時）','Hourly rate (HKD / hour)'),draft.hourlyRate,ctx,{type:'number',required:true}):draft.salaryType==='monthly'?field('monthlyBaseSalary',t('基本月薪（港元／月）','Monthly base salary (HKD / month)'),draft.monthlyBaseSalary,ctx,{type:'number',required:true}):''}</div>${field('note',t('備註（可選）','Note (optional)'),draft.note,ctx,{type:'textarea'})}<p class="staff-payroll-note">${esc(draft.salaryType==='hourly'?t('基本薪金以排班時數及個別時薪核算；實際打卡時數另作對照。','Base pay uses scheduled hours and this teacher’s hourly rate. Actual clock duration is shown separately.'):draft.salaryType==='monthly'?t('基本薪金使用個別固定月薪；實際工時及假期影響分開覆核。','Base pay uses this teacher’s fixed monthly salary. Actual hours and leave effects are reviewed separately.'):t('每位老師可分別使用時薪或月薪。','Each teacher can have an hourly or monthly salary.'))}</p><p class="staff-payroll-note">${esc(t('生效日期、加班及假期計薪規則須另行確認。','Effective dates, overtime and leave pay rules require separate confirmation.'))}</p>`;
}
function recordDetails(model,row,ctx){
  const {t,esc}=ctx,member=allowedMember(model,row.staffId),verified=row.actualVerified===true&&numeric(row.actualMinutes);
  const values=[[t('老師','Teacher'),member.displayName],[t('月份','Month'),row.month],[t('狀態','Status'),statusLabel(row.status,t)],[t('排班時數','Scheduled duration'),duration(row.scheduledMinutes)],[t('實際工時','Actual clock duration'),verified?duration(row.actualMinutes):t('待核實','Pending verification')],[t('認可遲到','Recognized late'),approvedMinutes(row.approvedLateMinutes)],[t('認可加班時數','Approved OT'),approvedMinutes(row.approvedOtMinutes)],[t('基本薪金','Base pay'),money(row.basePay)],[t('已核加班補款','Approved OT pay'),money(row.approvedOtPay)],[t('已核扣款','Approved deductions'),money(row.approvedDeduction)],[t('淨額','Net pay'),money(row.netPay)]];
  return `${facts(values,ctx)}<p class="staff-payroll-note">${esc(t('實際工時不會自動增加基本薪金；加班及扣款以已覆核資料為準。','Actual hours do not automatically increase base pay. Overtime and deductions use reviewed records.'))}</p><div class="staff-payroll-section-heading"><h3>${esc(t('薪金單','Payslip'))}</h3></div><p class="staff-payroll-note">${esc(row.payslipGenerated===true?t('薪金單下載暫未提供。','Payslip download is not available yet.'):t('薪金單尚未生成。','Payslip has not been generated.'))}</p>`;
}
export function payrollDialogMarkup(input={},suppliedContext){
  const model=normalized(input),dialog=model.dialog;if(!dialog)return '';
  const ctx=context(suppliedContext),{t,esc}=ctx,kind=dialog.kind,member=allowedMember(model,dialog.id),recordKind=['payroll-record','payroll-adjustment','payroll-adjustment-review'].includes(kind),row=recordKind?scopedRows(model).find(item=>item.id===dialog.id):null;
  const salary=['salary-edit','salary-review'].includes(kind),adjustment=['payroll-adjustment','payroll-adjustment-review'].includes(kind),allowed=salary?isAdmin(model)&&!!member:!!row&&(!adjustment||isAdmin(model));
  const title=salary?kind==='salary-review'?t('核對薪酬設定','Review salary settings'):t('薪酬設定','Salary settings'):adjustment?t('核對薪金調整','Review payroll adjustments'):t('薪金紀錄','Payroll record');let body='',footer='',form='';
  if(!allowed)body=`<p class="staff-payroll-source" role="status">${esc(t('此薪金資料暫未提供，請關閉後重新選擇。','This payroll record is unavailable. Close and select an available record.'))}</p>`;
  else if(kind==='salary-edit'){
    const draft={...salaryDraft(member),...dialog.draft};body=salaryEditor(member,draft,ctx);form='payroll-review-salary';footer=`<button type="submit" class="staff-payroll-button">${esc(t('核對設定','Review settings'))}</button>`;
  }else if(kind==='salary-review'){
    const draft=dialog.draft||{},hourly=draft.salaryType==='hourly',known=['hourly','monthly'].includes(draft.salaryType);
    body=`<p class="staff-payroll-person">${esc(member.displayName)}</p>${facts([[t('薪資類型','Salary type'),known?hourly?t('時薪','Hourly salary'):t('月薪','Monthly salary'):t('待確認','Pending confirmation')],...(known?[[hourly?t('時薪（港元／小時）','Hourly rate (HKD / hour)'):t('基本月薪（港元／月）','Monthly base salary (HKD / month)'),money(typedAmount(hourly?draft.hourlyRate:draft.monthlyBaseSalary))]]:[]),...(draft.note?[[t('備註','Note'),draft.note]]:[])],ctx)}<p id="staff-payroll-save-note" class="staff-payroll-note">${esc(t('薪酬設定尚未接通保存；本次核對不會更改老師的薪酬資料。','Salary settings cannot be saved yet. This review does not change the teacher’s salary.'))}</p>`;
    form='payroll-save';footer=`<button type="submit" class="staff-payroll-button" disabled aria-describedby="staff-payroll-save-note">${esc(t('儲存','Save'))}</button>`;
  }else if(kind==='payroll-adjustment'){
    body=adjustmentEditor(model,row,{...adjustmentDraft(row),...dialog.draft},ctx);form='payroll-review-adjustment';footer=`<button type="submit" class="staff-payroll-button">${esc(t('核對調整','Review adjustments'))}</button>`;
  }else if(kind==='payroll-adjustment-review'){
    body=adjustmentReview(model,row,dialog.draft||{},ctx);form='payroll-approve';footer=`<button type="submit" class="staff-payroll-button" disabled aria-describedby="staff-payroll-approve-note">${esc(t('批准調整','Approve adjustments'))}</button>`;
  }else{
    body=recordDetails(model,row,ctx);footer=`${isAdmin(model)?button('payroll-open-adjustment',t('核對調整','Review adjustments'),{id:row.id,secondary:true},ctx)+button('payroll-generate',t('生成薪金單','Generate payslip'),{id:row.id,disabled:true,secondary:true},ctx):''}${button('payroll-download',t('下載薪金單','Download payslip'),{id:row.id,disabled:true},ctx)}`;
  }
  return `<div class="modal ui-staff-modal" role="dialog" aria-modal="true" aria-labelledby="staff-payroll-title"><div class="dialog staff-payroll-dialog" tabindex="-1"><header><h2 id="staff-payroll-title">${esc(title)}</h2>${button('payroll-cancel','×',{secondary:true,extra:`aria-label="${esc(t('關閉','Close'))}"`},ctx)}</header>${form?`<form id="ui-payroll-form" data-ui-command="${form}" data-ui-id="${esc(dialog.id)}">`:''}<div class="ui-staff-dialog-body">${feedback(model,ctx)}${body}</div><footer>${button('payroll-cancel',['salary-review','payroll-adjustment-review'].includes(kind)?t('返回修改','Back to edit'):t('取消','Cancel'),{secondary:true},ctx)}${footer}</footer>${form?'</form>':''}</div></div>`;
}
export function advancePayrollUi(input={},command,fields={},suppliedContext){
  const state=structuredClone(normalized(input)),{t}=context(suppliedContext);state.formError='';state.notice='';
  if(command==='payroll-open-salary'){
    const member=allowedMember(state,fields.id);
    if(!isAdmin(state)||!member){state.dialog=null;state.formError=t('薪酬設定暫未提供。','Salary settings are unavailable.');return state;}
    state.dialog={kind:'salary-edit',id:member.id,draft:salaryDraft(member)};
  }else if(command==='payroll-open-record'){
    const row=scopedRows(state).find(item=>item.id===fields.id);
    if(!row){state.dialog=null;state.formError=t('薪金紀錄暫未提供。','Payroll record is unavailable.');return state;}
    state.dialog={kind:'payroll-record',id:row.id};
  }else if(command==='payroll-open-adjustment'){
    const parent=state.dialog,id=fields.id||parent?.id,row=scopedRows(state).find(item=>item.id===id);
    if(!isAdmin(state)||!row||parent?.kind!=='payroll-record'||parent.id!==id){state.formError=t('薪金調整資料暫未提供。','Payroll adjustments are unavailable.');return state;}
    state.dialog={kind:'payroll-adjustment',id:row.id,draft:adjustmentDraft(row),returnTo:parent};
  }else if(command==='payroll-cancel'){
    if(state.dialog?.kind==='salary-review')state.dialog={...state.dialog,kind:'salary-edit'};
    else if(state.dialog?.kind==='payroll-adjustment-review')state.dialog={...state.dialog,kind:'payroll-adjustment'};
    else state.dialog=state.dialog?.kind==='payroll-adjustment'?state.dialog.returnTo||null:null;
  }
  else if(command==='payroll-filter'){
    for(const key of ['month','teacherId','status','query'])if(Object.hasOwn(fields,key))state[key]=String(fields[key]??'');
    state.dialog=null;
  }else if(['payroll-draft','payroll-salary-type','payroll-review-salary'].includes(command)){
    const dialog=state.dialog,member=allowedMember(state,dialog?.id);
    if(command==='payroll-draft'&&dialog?.kind==='payroll-adjustment'){
      if(isAdmin(state)&&scopedRows(state).some(row=>row.id===dialog.id))dialog.draft=mergeAdjustment(dialog.draft||{},fields);
      return state;
    }
    if(!isAdmin(state)||!member||dialog?.kind!=='salary-edit')return state;
    dialog.draft=mergeDraft(dialog.draft||salaryDraft(member),fields);
    if(command==='payroll-salary-type')dialog.draft.salaryType=['hourly','monthly'].includes(fields.value)?fields.value:'';
    if(command==='payroll-review-salary'){
      const draft=dialog.draft,type=draft.salaryType,key=type==='hourly'?'hourlyRate':'monthlyBaseSalary',raw=String(draft[key]??'').trim(),amount=Number(raw);
      if(!['hourly','monthly'].includes(type))state.formError=t('請選擇薪資類型。','Select a salary type.');
      else if(!raw||!Number.isFinite(amount)||amount<0)state.formError=type==='hourly'?t('請填寫有效時薪。','Enter a valid hourly rate.'):t('請填寫有效基本月薪。','Enter a valid monthly base salary.');
      else dialog.kind='salary-review';
    }
  }else if(command==='payroll-review-adjustment'){
    const dialog=state.dialog,row=scopedRows(state).find(item=>item.id===dialog?.id);
    if(!isAdmin(state)||!row||dialog?.kind!=='payroll-adjustment')return state;
    dialog.draft=mergeAdjustment(dialog.draft||adjustmentDraft(row),fields);
    const draft=dialog.draft,invalidMinutes=['approvedLateMinutes','approvedOtMinutes'].some(key=>!String(draft[key]??'').trim()||typedAmount(draft[key])===null||!Number.isInteger(Number(draft[key]))),invalidMoney=['approvedOtPay','approvedDeduction'].some(key=>String(draft[key]??'').trim()!==''&&typedAmount(draft[key])===null);
    if(invalidMinutes)state.formError=t('請以零或正整數填寫認可分鐘。','Enter zero or positive whole minutes.');
    else if(invalidMoney)state.formError=t('請填寫有效調整金額，或留空待確認。','Enter a valid adjustment amount, or leave it blank if unconfirmed.');
    else dialog.kind='payroll-adjustment-review';
  }
  // Final business commands intentionally have no write or success path.
  return state;
}
