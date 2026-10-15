const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const context=ctx=>({t:ctx?.t||((_zh,en)=>en),esc:ctx?.esc||escape});

// The first 19 entries preserve the existing catalogue. Course Payment Summary
// is an additional requirement from the customer's original PDF, page 8.
const GROUPS=[
 {key:'sales',zh:'銷售',en:'Sales',items:[
  ['payment-summary','付款摘要','Payment Summary','按付款方式分類，顯示客戶付款總額。以實際收款為計算基準。','A summary of total customer payments grouped by payment method, on a cash basis.'],
  ['payment-detail','付款明細','Payment Detail','列出指定期間內的付款交易明細，以實際收款為計算基準。','Payment transaction details for a specified period, on a cash basis.'],
  ['sales-summary','銷售摘要','Sales Summary','按課程及產品類別顯示收入，方便比較各類別的銷售表現。以實際收款為計算基準。','Revenue by course and product category, showing which categories generate the most revenue, on a cash basis.'],
  ['sales-detail','銷售明細','Sales Detail','按收據列出課程及產品訂單，以實際收款為計算基準。','A list of course and product orders by receipt, on a cash basis.'],
  ['earned-revenue-summary','已賺取收入摘要','Earned Revenue Summary','按指定期間已提供的課堂服務，計算學生訂單中已賺取的收入。','A summary of revenue earned from lessons provided within the selected service period, on an accrual basis.'],
  ['earned-revenue-detail','已賺取收入明細','Earned Revenue Detail','列出指定期間內，學生訂單中每節課堂已賺取的收入。','Earned revenue for each lesson in a student’s order during the selected period, on an accrual basis.'],
  ['discount-summary','折扣摘要','Discount Summary','顯示各項優惠的折扣總額，方便檢視每個推廣方案使用的預算。','Discount totals across all discount schemes, helping monitor the budget spent on each promotion.'],
  ['discount-detail','折扣明細','Discount Detail','逐項列出交易的折扣，方便查看每次交易的收入和優惠金額。','Discounted transactions, with revenue and discount amounts for each transaction.'],
  ['deferred-revenue-by-package','套票未賺取收入','Deferred Revenue By Package','顯示指定日期各預付套票尚未賺取的收入，包括套票總值、已用及剩餘額度、到期日和未使用金額。','Unearned revenue remaining in prepaid lesson packages as of a selected date, including total value, quota used, remaining quota, expiry date and unused amount.'],
  ['course-payment-summary','課程付款摘要','Course Payment Summary','按課程查看指定期間的付款摘要。','A summary of payments by course for the selected period.']
 ]},
 {key:'enrollment',zh:'報名',en:'Enrollment',items:[
  ['first-enrollment','首次報名','First Enrollment','列出指定期間首次報名、之前沒有付費上課的學生，方便跟進試堂和恆常課程報名。','Students who first enrolled in the selected period and had not paid for classes before, helping follow up on trials and regular-course enrollment.'],
  ['last-enrollment','最後報名','Last Enrollment','列出指定期間最後一次報名或離開、之後沒有再付費上課的學生，方便跟進離開原因。','Students whose last enrollment or departure falls within the selected period and who did not pay for further classes, helping follow up on why they left.'],
  ['enrollment-detail','報名明細','Enrollment Detail','列出學生已上的課堂和出席記錄，可按出席狀態及老師搜尋。','Lessons and attendance records for all students, searchable by attendance status and teacher.'],
  ['lesson-detail-by-staff','員工課堂明細','Lesson Detail By Staff','按員工列出課堂和出席記錄，並顯示學生總人數及課堂總時數。','Lessons and attendance by staff, with total student numbers and lesson duration for each staff member.'],
  ['package-usage','套票使用情況','Package Usage','顯示已購套票的使用次數或分鐘、剩餘額度，以及相關金額。','Purchased packages with visits or minutes used, remaining balances and their monetary values.'],
  ['enrollment-metrics','報名統計','Enrollment Metrics','按老師、班別或學生統計課堂數目、時數及出席情況，方便比較各班的表現。','Lesson counts and hours by teacher, class or student, with attendance summaries to help compare class performance.']
 ]},
 {key:'product',zh:'產品',en:'Product',items:[
  ['product-summary','產品摘要','Product Summary','顯示每項產品的銷售收入及數量，以實際收款為計算基準。','Revenue and quantity sold for each product, on a cash basis.'],
  ['product-detail','產品明細','Product Detail','列出產品的交易明細，以實際收款為計算基準。','Product transactions, on a cash basis.']
 ]},
 {key:'staff',zh:'員工',en:'Staff',items:[
  ['salary-summary','薪酬摘要','Salary Summary','顯示所有員工的薪酬概覽。','An overview of salary for all staff.'],
  ['time-clock-detail','打卡明細','Time Clock Detail','列出員工的上班及下班打卡時間。','Staff clock-in and clock-out times.']
 ]}
].map(group=>({...group,items:group.items.map(([id,zh,en,descriptionZh,descriptionEn])=>({id,zh,en,descriptionZh,descriptionEn}))}));

const reportById=id=>GROUPS.flatMap(group=>group.items).find(report=>report.id===id);
export const getReportGroups=()=>GROUPS.map(group=>({...group,items:group.items.map(report=>({...report}))}));

export function reportsPageMarkup(ctx={}){
 const {t,esc}=context(ctx);
 return `<section class="reports-page" aria-labelledby="reports-title"><h1 id="reports-title" class="reports-sr-only">${t('報告','Reports')}</h1><p class="reports-availability" id="reports-availability">${t('報告查詢及匯出暫未開放。','Report queries and exports are not available yet.')}</p><div class="reports-groups">${GROUPS.map(group=>`<section class="reports-group" aria-labelledby="reports-group-${group.key}"><h2 id="reports-group-${group.key}">${t(group.zh,group.en)}</h2><div class="reports-list">${group.items.map(report=>`<article class="reports-entry"><h3><button type="button" disabled aria-describedby="reports-availability report-${report.id}-description">${esc(t(report.zh,report.en))}</button></h3><p id="report-${report.id}-description">${esc(t(report.descriptionZh,report.descriptionEn))}</p></article>`).join('')}</div></section>`).join('')}</div></section>`;
}

const validDay=value=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;
 const [year,month,day]=value.split('-').map(Number),date=new Date(0);
 date.setUTCFullYear(year,month-1,day);
 return year>0&&date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
};
export function getReportQueryDefaults(reportId,ctx={}){
 if(!reportById(reportId))return null;
 const today=validDay(ctx.today)?ctx.today:'';
 return {period:reportId==='deferred-revenue-by-package'?'as-of':'month',month:today.slice(0,7),year:today.slice(0,4),quarter:today?String(Math.ceil(Number(today.slice(5,7))/3)):'',from:'',to:'',asOf:today};
}

const FILTERS={
 'payment-summary':[], 'payment-detail':['student'],
 'sales-summary':['category'], 'sales-detail':['category','student'],
 'earned-revenue-summary':['course'], 'earned-revenue-detail':['course','student'],
 'discount-summary':[], 'discount-detail':['student'],
 'deferred-revenue-by-package':['course','student'], 'course-payment-summary':['course','category'],
 'first-enrollment':['course'], 'last-enrollment':['course'],
 'enrollment-detail':['course','teacher','attendance'], 'lesson-detail-by-staff':['teacher','course'],
 'package-usage':['course','student'], 'enrollment-metrics':['teacher','class','student'],
 'product-summary':['product','category'], 'product-detail':['product','category'],
 'salary-summary':['staff'], 'time-clock-detail':['staff']
};
const FILTER_NAMES={course:['課程','Course','courses'],category:['類別','Category','categories'],product:['產品','Product','products'],student:['學生','Student','students'],teacher:['老師','Teacher','teachers'],staff:['員工','Staff','staff'],class:['班別','Class','classes'],attendance:['出席狀態','Attendance status','attendanceStatuses']};
const COLUMN_NAMES={
 paymentMethod:['付款方式','Payment method'],paymentCount:['付款筆數','Payments'],paidAmount:['付款總額','Total paid'],date:['日期','Date'],receipt:['收據','Receipt'],studentName:['學生','Student'],category:['類別','Category'],quantity:['數量','Quantity'],itemName:['項目','Item'],courseName:['課程','Course'],earnedAmount:['已賺取收入','Earned revenue'],lessonDate:['課堂日期','Lesson date'],discountName:['優惠','Discount'],transactionCount:['交易筆數','Transactions'],discountAmount:['折扣金額','Discount amount'],packageName:['套票','Package'],totalValue:['總值','Total value'],usedQuota:['已用額度','Quota used'],remainingQuota:['剩餘額度','Remaining quota'],expiryDate:['到期日','Expiry date'],deferredAmount:['未賺取收入','Deferred revenue'],teacherName:['老師','Teacher'],attendance:['出席狀態','Attendance'],studentCount:['學生人數','Students'],duration:['總時數','Total hours'],unit:['額度單位','Quota unit'],remainingValue:['剩餘價值','Remaining value'],className:['班別','Class'],lessonCount:['課堂數目','Lessons'],productName:['產品','Product'],staffName:['員工','Staff'],period:['期間','Period'],salaryAmount:['薪酬','Salary'],time:['實際時間','Recorded time'],eventType:['事件','Event']
};
const COLUMNS={
 'payment-summary':['paymentMethod','paymentCount','paidAmount'],
 'payment-detail':['date','receipt','studentName','paymentMethod','paidAmount'],
 'sales-summary':['category','paidAmount'],
 'sales-detail':['date','receipt','studentName','itemName','quantity','paidAmount'],
 'earned-revenue-summary':['courseName','earnedAmount'],
 'earned-revenue-detail':['lessonDate','studentName','courseName','earnedAmount'],
 'discount-summary':['discountName','transactionCount','discountAmount'],
 'discount-detail':['date','studentName','discountName','discountAmount'],
 'deferred-revenue-by-package':['studentName','packageName','totalValue','usedQuota','remainingQuota','expiryDate','deferredAmount'],
 'course-payment-summary':['courseName','paymentCount','paidAmount'],
 'first-enrollment':['date','studentName','courseName'],'last-enrollment':['date','studentName','courseName'],
 'enrollment-detail':['lessonDate','studentName','courseName','teacherName','attendance'],
 'lesson-detail-by-staff':['lessonDate','teacherName','courseName','studentCount','duration'],
 'package-usage':['studentName','packageName','unit','usedQuota','remainingQuota','remainingValue'],
 'enrollment-metrics':['teacherName','className','studentName','lessonCount','duration'],
 'product-summary':['productName','category','quantity','paidAmount'],
 'product-detail':['date','receipt','productName','quantity','paidAmount'],
 'salary-summary':['staffName','period','salaryAmount'], 'time-clock-detail':['date','staffName','time','eventType']
};
const AMOUNTS=new Set(['paidAmount','earnedAmount','discountAmount','totalValue','deferredAmount','remainingValue','salaryAmount']);
const QUANTITIES=new Set(['paymentCount','quantity','transactionCount','usedQuota','remainingQuota','studentCount','duration','lessonCount']);
const control=(name,label,input)=>`<label class="reports-filter"><span>${label}</span>${input}</label>`;

function dateDraftIssue(report,filters,draft){
 if(!draft||!['period','month','quarter','year','from','to','asOf'].some(key=>Object.hasOwn(draft,key)))return null;
 const issue=(fields,zh,en)=>({fields,message:[zh,en]});
 if(report.id==='deferred-revenue-by-package')return validDay(filters.asOf)?null:issue(['asOf'],'請選擇有效的截至日期。','Select a valid as-of date.');
 if(!['month','quarter','year','custom'].includes(filters.period))return issue(['period'],'請選擇有效的期間。','Select a valid period.');
 if(filters.period==='month'){
  const match=/^(\d{4})-(\d{2})$/.exec(filters.month||'');
  return match&&Number(match[1])>0&&Number(match[2])>=1&&Number(match[2])<=12?null:issue(['month'],'請選擇有效的月份。','Select a valid month.');
 }
 if(['quarter','year'].includes(filters.period)){
  if(!/^\d{1,4}$/.test(String(filters.year||''))||Number(filters.year)<1)return issue(['year'],'請輸入 1 至 9999 的年份。','Enter a year from 1 to 9999.');
  if(filters.period==='quarter'&&!/^[1-4]$/.test(String(filters.quarter)))return issue(['quarter'],'請選擇第 1 至第 4 季。','Select a quarter from Q1 to Q4.');
  return null;
 }
 if(!validDay(filters.from))return issue(['from'],'請選擇有效的開始日期。','Select a valid start date.');
 if(!validDay(filters.to))return issue(['to'],'請選擇有效的結束日期。','Select a valid end date.');
 return filters.from>filters.to?issue(['from','to'],'結束日期不能早於開始日期。','The end date cannot be earlier than the start date.'):null;
}

function periodMarkup(report,filters,{t,esc},issue){
 const invalid=name=>issue?.fields.includes(name)?' aria-invalid="true" aria-describedby="report-date-error"':'';
 const input=(name,type,value,extra='')=>`<input name="${name}" type="${type}" value="${esc(value)}" ${extra}${invalid(name)}>`;
 if(report.id==='deferred-revenue-by-package')return control('asOf',t('截至日期','As of date'),input('asOf','date',filters.asOf,'required'));
 const mode=['month','quarter','year','custom'].includes(filters.period)?filters.period:'month';
 let html=control('period',t('期間','Period'),`<select name="period"${invalid('period')}>${issue?.fields.includes('period')?`<option value="${esc(filters.period)}" selected>${t('請選擇期間','Select period')}</option>`:''}${[['month','每月','Monthly'],['quarter','每季','Quarterly'],['year','每年','Yearly'],['custom','指定日期','Date range']].map(([value,z,e])=>`<option value="${value}"${filters.period===value?' selected':''}>${t(z,e)}</option>`).join('')}</select>`);
 if(mode==='month')html+=control('month',t('月份','Month'),input('month','month',filters.month,'required'));
 if(mode==='quarter'||mode==='year')html+=control('year',t('年份','Year'),input('year','number',filters.year,'min="1" max="9999" step="1" required'));
 if(mode==='quarter')html+=control('quarter',t('季度','Quarter'),`<select name="quarter" required${invalid('quarter')}><option value="">${t('選擇季度','Select quarter')}</option>${filters.quarter&&!/^[1-4]$/.test(String(filters.quarter))?`<option value="${esc(filters.quarter)}" selected>${t('請選擇有效季度','Select a valid quarter')}</option>`:''}${[1,2,3,4].map(value=>`<option value="${value}"${String(value)===String(filters.quarter)?' selected':''}>${t(`第 ${value} 季`,`Q${value}`)}</option>`).join('')}</select>`);
 if(mode==='custom')html+=control('from',t('由','From'),input('from','date',filters.from,'required'))+control('to',t('至','To'),input('to','date',filters.to,'required'));
 return html;
}

function selectionMarkup(key,value,ctx){
 const {t,esc}=context(ctx),[zh,en,collection]=FILTER_NAMES[key],rows=Array.isArray(ctx[collection])?ctx[collection]:[],selected=String(value??'');
 const options=rows.filter(row=>row&&row.id!==undefined).map(row=>({id:String(row.id),label:row.name??row.displayName??t(row.nameZh||'',row.nameEn||'')??''}));
 let html=`<option value="">${t('全部','All')}</option>`;
 if(selected&&!options.some(option=>option.id===selected))html+=`<option value="${esc(selected)}" selected>${t('所選項目暫未能讀取','Selected item unavailable')}</option>`;
 html+=options.map(option=>`<option value="${esc(option.id)}"${option.id===selected?' selected':''}>${esc(option.label)}</option>`).join('');
 return control(key,t(zh,en),`<select name="${key}">${html}</select>`);
}

function resultsMarkup(report,result,ctx){
 const {t,esc}=context(ctx),status=result?.status;
 if(status==='loading')return `<div class="reports-result-state" role="status" aria-busy="true"><h2>${t('讀取報告中…','Loading report…')}</h2></div>`;
 if(status==='error')return `<div class="reports-result-state" role="alert"><h2>${t('未能讀取報告','Could not load report')}</h2><p>${esc(result.message||t('請稍後再試，已選條件會保留。','Please try again later. Your selected filters are kept.'))}</p></div>`;
 if(status==='empty'||status==='ready'&&Array.isArray(result.rows)&&result.rows.length===0)return `<div class="reports-result-state" role="status"><h2>${t('沒有符合的紀錄','No records match these filters')}</h2><p>${t('試試調整期間或篩選條件。','Try a different period or change the filters.')}</p></div>`;
 if(status!=='ready'||!Array.isArray(result.rows))return `<div class="reports-result-state" role="status"><h2>${t('尚未讀取報告資料','Report data has not been loaded')}</h2></div>`;
 const columns=COLUMNS[report.id],cell=(row,key)=>{
  const value=row?.[key],numeric=AMOUNTS.has(key)||QUANTITIES.has(key);
  if(value===null||value===undefined||value===''||numeric&&(typeof value!=='number'||!Number.isFinite(value)))return '—';
  if(key==='eventType')return value==='in'?t('上班打卡','Clock in'):value==='out'?t('下班打卡','Clock out'):'—';
  if(AMOUNTS.has(key))return esc(`HK$${new Intl.NumberFormat('en-HK',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value)}`);
  return esc(typeof value==='string'||typeof value==='number'?value:'—');
 };
 return `<div class="reports-results-table" role="region" tabindex="0" aria-label="${t('報告結果，可橫向捲動','Report results, horizontally scrollable')}"><table><caption class="reports-sr-only">${esc(t(report.zh,report.en))}</caption><thead><tr>${columns.map(key=>`<th scope="col"${AMOUNTS.has(key)||QUANTITIES.has(key)?' class="reports-number"':''}>${t(...COLUMN_NAMES[key])}</th>`).join('')}</tr></thead><tbody>${result.rows.map(row=>`<tr>${columns.map(key=>`<td${AMOUNTS.has(key)||QUANTITIES.has(key)?' class="reports-number"':''}>${cell(row,key)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

// Controlled presentation only. Official catalogue entries remain disabled;
// this renderer does not register routes, fetch data, export files or save state.
export function reportQueryMarkup(reportId,state={},ctx={}){
 const {t,esc}=context(ctx),report=reportById(reportId);
 if(!report)return `<section class="reports-query reports-missing" aria-labelledby="report-query-title"><h1 id="report-query-title">${t('找不到此報告','Report not found')}</h1><button type="button" disabled>${t('返回報告','Back to reports')}</button></section>`;
 const filters={...getReportQueryDefaults(reportId,ctx),...state.filters},issue=dateDraftIssue(report,filters,state.filters);
 return `<section class="reports-query" aria-labelledby="report-query-title"><header class="reports-query-heading"><h1 id="report-query-title">${esc(t(report.zh,report.en))}</h1><button class="reports-secondary" type="button" disabled>${t('返回報告','Back to reports')}</button></header><form class="reports-query-filters" aria-label="${t('報告條件','Report filters')}" aria-describedby="report-query-availability">${periodMarkup(report,filters,{t,esc},issue)}${FILTERS[reportId].map(key=>selectionMarkup(key,filters[key],ctx)).join('')}<div class="reports-query-actions"><button type="submit" disabled>${t('查看報告','View report')}</button><button class="reports-secondary" type="button" disabled>${t('匯出','Export')}</button></div>${issue?`<p class="reports-date-error" id="report-date-error" role="alert">${t(...issue.message)}</p>`:''}</form><p class="reports-availability" id="report-query-availability">${t('報告查詢及匯出暫未開放。','Report queries and exports are not available yet.')}</p>${issue?'':resultsMarkup(report,state.result,ctx)}</section>`;
}
