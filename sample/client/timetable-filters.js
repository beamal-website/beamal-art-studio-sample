// Display preferences only: every record is already scoped by the host. This
// module never fetches people, changes a lesson or grants access to a resource.
const fields=new Set(['course','teacher','room','type','kind','category','level','date','time','student','gender','age','price']);
const studentFields=new Set(['student','gender','age']);
const feeBases=['monthly-lessons','fixed-monthly','package'];
const ageNumber=value=>typeof value==='string'&&/^\d+$/.test(value)&&Number(value)<=120?Number(value):null;
const moneyCents=value=>{if(typeof value!=='string'||!/^\d+(?:\.\d{1,2})?$/.test(value)||Number(value)>9999999999.99)return null;return Math.round(Number(value)*100);};
const kindValues=['class','available','trial','rescheduling','regular','special','mine'];
const presets=new Set(['regular','special','trial','rescheduling','mine']);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=value=>typeof value==='string'?value:'';
const id=value=>typeof value==='string'&&!!value.trim()&&value.length<=100;
const validValue=value=>typeof value==='string'&&!!value.trim()&&value.length<=160;
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='0001-01-01'&&value<='9999-12-31'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const time=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const context=ctx=>({t:ctx?.t||((_zh,en)=>en),esc:ctx?.esc||escape,options:object(ctx?.options)?ctx.options:{},error:text(ctx?.error),creating:typeof ctx?.creating==='boolean'?ctx.creating:undefined,notice:text(ctx?.notice)});
const ids=value=>Array.isArray(value)?[...new Set(value.filter(id))]:[];

export function validateTimetableFilterDraft(draft){
 if(!object(draft)||typeof draft.name!=='string'||!draft.name.trim()||draft.name.length>80)return 'name';
 if(!['all','any'].includes(draft.match)||!Array.isArray(draft.conditions)||!draft.conditions.length||draft.conditions.length>6)return 'conditions';
 for(const condition of draft.conditions){
  if(!object(condition)||!fields.has(condition.field))return 'conditions';
  if(!validValue(condition.value)||condition.field==='kind'&&!kindValues.includes(condition.value))return 'value';
  const range=condition.field==='date'?date:condition.field==='time'?time:null;
  if(range){if(!range(condition.value)||condition.end!==undefined&&condition.end!==''&&!range(condition.end))return 'value';if(condition.end&&condition.end<condition.value)return 'range';}
  else if(condition.field==='age'||condition.field==='price'){
   const numeric=condition.field==='age'?ageNumber:moneyCents,start=numeric(condition.value),hasEnd=condition.end!==undefined&&condition.end!=='';
   if(start===null||hasEnd&&numeric(condition.end)===null||condition.field==='price'&&!feeBases.includes(condition.basis))return 'value';
   if(hasEnd&&numeric(condition.end)<start)return 'range';
  }else if(condition.end!==undefined&&condition.end!=='')return 'range';
 }
 return '';
}
function cleanFilter(filter){
 if(!object(filter)||!id(filter.id)||validateTimetableFilterDraft(filter)||filter.visible!==undefined&&typeof filter.visible!=='boolean')return null;
 return {id:filter.id,name:filter.name.trim(),match:filter.match,visible:filter.visible!==false,conditions:filter.conditions.map(condition=>({field:condition.field,value:condition.value,...(['date','time','age','price'].includes(condition.field)&&condition.end?{end:condition.end}:{}),...(condition.field==='price'?{basis:condition.basis}:{})}))};
}
export function normalizeTimetableFilterState(raw){
 raw=object(raw)?raw:{};const rows=Array.isArray(raw.filters)?raw.filters:[],counts=new Map();
 for(const row of rows)if(id(row?.id))counts.set(row.id,(counts.get(row.id)||0)+1);
 const filters=[];for(const row of rows){if(counts.get(row?.id)!==1)continue;const filter=cleanFilter(row);if(filter)filters.push(filter);if(filters.length===20)break;}
 // An invalid explicit reference cannot mean "show everything". The empty
 // reference is intentionally unmatched; valid filter IDs cannot be empty.
 const only=raw.only===undefined||raw.only===null?null:id(raw.only)?raw.only:'';
 return {version:1,hiddenResources:{teachers:ids(raw.hiddenResources?.teachers),rooms:ids(raw.hiddenResources?.rooms)},hiddenPresets:Array.isArray(raw.hiddenPresets)?[...new Set(raw.hiddenPresets.filter(value=>presets.has(value)))]:[],filters,only};
}
function kindMatches(record,value){
 if(value==='class'||value==='available')return record.kind===value;
 if(value==='trial')return record.kind==='available'&&record.trialEnabled===true;
 if(value==='rescheduling')return record.kind==='available'&&record.reschedulingEnabled===true;
 if(value==='regular'||value==='special')return record.classTypeKind===value;
 return value==='mine'&&record.isMine===true;
}
function conditionMatches(record,condition){
 const {field,value}=condition;
 if(field==='kind')return kindMatches(record,value);
 if(field==='teacher'||field==='room'){const source=record[field+'Ids'];return Array.isArray(source)&&source.some(item=>typeof item==='string'&&item===value);}
 if(field==='date'||field==='time'){const valid=field==='date'?date:time,source=record[field];return valid(source)&&source>=value&&source<=(condition.end||value);}
 const key={course:'courseId',type:'classTypeId',category:'category',level:'level'}[field];return !!key&&typeof record[key]==='string'&&record[key]===value;
}
function authorizedStudents(record){
 if(!Array.isArray(record.students))return [];const counts=new Map();for(const student of record.students)if(validValue(student?.id))counts.set(student.id,(counts.get(student.id)||0)+1);return record.students.filter(student=>object(student)&&counts.get(student.id)===1);
}
function studentMatches(student,condition,record){
 if(condition.field==='student')return student.id===condition.value;
 if(condition.field==='gender')return typeof student.gender==='string'&&student.gender===condition.value;
 const age=student.age;if(!object(age)||!Number.isSafeInteger(age.years)||age.years<0||age.years>120||!Number.isSafeInteger(age.months)||age.months<0||age.months>11||!date(record.date)||age.asOf!==record.date)return false;
 return age.years>=ageNumber(condition.value)&&age.years<=ageNumber(condition.end||condition.value);
}
function feeMatches(offer,condition){
 if(!object(offer)||offer.basis!==condition.basis||typeof offer.amount!=='number'||!Number.isFinite(offer.amount)||offer.amount<0||offer.amount>9999999999.99)return false;
 if(Number(offer.amount.toFixed(2))!==offer.amount)return false;const cents=Math.round(offer.amount*100);
 return cents>=moneyCents(condition.value)&&cents<=moneyCents(condition.end||condition.value);
}
export function matchesTimetableFilter(record,filter){
 if(!object(record)||validateTimetableFilterDraft(filter))return false;
 const students=authorizedStudents(record),offers=Array.isArray(record.feePrices)?record.feePrices:[];
 if(filter.match==='any')return filter.conditions.some(condition=>studentFields.has(condition.field)?students.some(student=>studentMatches(student,condition,record)):condition.field==='price'?offers.some(offer=>feeMatches(offer,condition)):conditionMatches(record,condition));
 const person=filter.conditions.filter(condition=>studentFields.has(condition.field)),price=filter.conditions.filter(condition=>condition.field==='price'),other=filter.conditions.filter(condition=>!studentFields.has(condition.field)&&condition.field!=='price');
 return other.every(condition=>conditionMatches(record,condition))&&(!person.length||students.some(student=>person.every(condition=>studentMatches(student,condition,record))))&&(!price.length||offers.some(offer=>price.every(condition=>feeMatches(offer,condition))));
}
export function matchesTimetableFilterState(record,raw){
 if(!object(record))return false;const state=normalizeTimetableFilterState(raw);
 for(const [plural,key]of [['teachers','teacherIds'],['rooms','roomIds']])if(Array.isArray(record[key])&&record[key].some(value=>state.hiddenResources[plural].includes(value)))return false;
 if(state.hiddenPresets.some(value=>kindMatches(record,value))||state.filters.some(filter=>!filter.visible&&matchesTimetableFilter(record,filter)))return false;
 if(state.only!==null){const filter=state.filters.find(filter=>filter.id===state.only);return !!filter&&matchesTimetableFilter(record,filter);}
 return true;
}
const action=(command,label,ctx,{filterId,index,extra='',className=''}={})=>`<button type="button" class="tnf-button ${className}" data-action="tt-named-${command}"${filterId!==undefined?` data-filter-id="${ctx.esc(filterId)}"`:''}${index!==undefined?` data-index="${index}"`:''}${extra?' '+extra:''}>${label}</button>`;
const eye=visible=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>${visible?'':'<path d="m3 3 18 18"/>'}</svg>`;
const errorMessage=(code,{t})=>({name:t('請輸入最多80字的篩選名稱。','Enter a filter name of up to 80 characters.'),conditions:t('請選擇1至6項可用條件。','Choose 1 to 6 supported conditions.'),value:t('請填寫有效的條件內容。','Enter a valid value for each condition.'),range:t('請將範圍由小至大填寫。','Enter the range from its lower to upper value.'),storage:t('未能儲存篩選。原有設定已保留，請重試。','Could not save filters. Your previous settings are kept; please retry.')})[code]||code;
const errorMarkup=ctx=>ctx.error?`<p class="tnf-error" role="alert">${ctx.esc(errorMessage(ctx.error,ctx))}</p>`:'';
export function timetableNamedFiltersMarkup(raw,suppliedContext={}){
 const ctx=context(suppliedContext),{t,esc}=ctx,state=normalizeTimetableFilterState(raw),unknownOnly=state.only!==null&&!state.filters.some(filter=>filter.id===state.only);
 return `<section class="tnf-list" aria-label="${esc(t('自訂篩選','Custom filters'))}"><div class="tnf-list-heading"><h3>${t('自訂篩選','Custom filters')}</h3>${action('add',esc(t('新增','Add')),ctx)}</div>${errorMarkup(ctx)}${unknownOnly?`<div class="tnf-source-note" role="status"><p>${t('目前只看的篩選暫未提供。','The selected filter is unavailable.')}</p>${action('only',esc(t('取消只看','Cancel only')),ctx,{filterId:state.only})}</div>`:''}${state.filters.map(filter=>{const selected=state.only===filter.id,status=filter.visible?t('顯示中','Visible'):t('已隱藏','Hidden');return `<article class="tnf-row${filter.visible?'':' is-hidden'}${selected?' is-only':''}"><div class="tnf-row-name"><strong>${esc(filter.name)}</strong><span>${status}${selected?' · '+t('只看此篩選','Only this filter'):''}</span></div><div class="tnf-row-actions">${action('only',esc(selected?t('取消只看','Cancel only'):t('只看','Only')),ctx,{filterId:filter.id,extra:`aria-pressed="${selected}"`})}${action('toggle',eye(filter.visible)+`<span>${status}</span>`,ctx,{filterId:filter.id,className:'tt-filter-eye',extra:`aria-pressed="${filter.visible}" aria-label="${esc((filter.visible?t('隱藏符合此篩選的課堂：','Hide lessons matching this filter: '):t('顯示符合此篩選的課堂：','Show lessons matching this filter: '))+filter.name)}" title="${esc(filter.visible?t('隱藏符合此篩選的課堂','Hide lessons matching this filter'):t('顯示符合此篩選的課堂','Show lessons matching this filter'))}"`})}${action('edit',esc(t('編輯','Edit')),ctx,{filterId:filter.id})}${action('remove',esc(t('刪除','Delete')),ctx,{filterId:filter.id,extra:`aria-label="${esc(t('刪除此篩選：','Delete filter: ')+filter.name)}"`})}</div></article>`;}).join('')||`<p class="tnf-empty">${t('尚未建立自訂篩選。','No custom filters yet.')}</p>`}</section>`;
}
const fieldLabels=[['course','課程','Course'],['teacher','老師','Teacher'],['room','課室','Room'],['type','課堂類型','Class type'],['kind','時段類別','Activity kind'],['category','課程類別','Course category'],['level','程度','Level'],['date','日期','Date'],['time','開始時間','Start time'],['student','學生','Student'],['gender','性別','Gender'],['age','上課當日歲數（足歲）','Age at lesson (years)'],['price','現行課程價目（HKD）','Current course fee (HKD)']];
const kindLabels=[['class','課堂','Class'],['available','可約時段','Available slot'],['trial','試堂時段','Trial slot'],['rescheduling','補堂時段','Rescheduling slot'],['regular','常規課','Regular class'],['special','特別課','Special class'],['mine','我的課堂','My classes']];
function fieldControl(condition,index,ctx){
 const {t,esc}=ctx,known=fieldLabels.some(([key])=>key===condition.field);
 return `<label class="tnf-field"><span>${t('條件','Condition')}</span><select name="conditionField-${index}"><option value=""${!condition.field?' selected':''}>${t('選擇條件','Choose a field')}</option>${!known&&condition.field?`<option value="${esc(condition.field)}" selected disabled>${t('此條件暫未提供','This field is unavailable')}</option>`:''}${fieldLabels.map(([key,zh,en])=>`<option value="${key}"${condition.field===key?' selected':''}${fields.has(key)?'':' disabled'}>${esc(t(zh,en)+(fields.has(key)?'':t('（暫未提供）',' (not available yet)')))}</option>`).join('')}</select></label>`;
}
function valueControl(condition,index,ctx){
 const {t,esc}=ctx,field=condition.field,value=text(condition.value),end=text(condition.end);
 if(field==='date'||field==='time')return `<div class="tnf-range"><label class="tnf-field"><span>${t('由','From')}</span><input type="${field}" name="conditionValue-${index}" value="${esc(value)}" required></label><label class="tnf-field"><span>${t('至（可選）','To (optional)')}</span><input type="${field}" name="conditionEnd-${index}" value="${esc(end)}"></label></div>`;
 if(field==='age'||field==='price'){
  const amount=field==='price',label=amount?t('現行課程價目（HKD）','Current course fee (HKD)'):t('上課當日歲數（足歲）','Age at lesson (years)'),max=amount?'9999999999.99':'120',step=amount?'0.01':'1';
  const basis=amount?`<label class="tnf-field"><span>${t('收費模式','Fee basis')}</span><select name="conditionBasis-${index}" required><option value=""${!condition.basis?' selected':''}>${t('選擇收費模式','Choose a fee basis')}</option>${[['monthly-lessons','每堂價','Per lesson'],['fixed-monthly','固定月費','Fixed monthly'],['package','課包總價','Package total']].map(([id,zh,en])=>`<option value="${id}"${condition.basis===id?' selected':''}>${esc(t(zh,en))}</option>`).join('')}</select></label>`:'';
  return `<div class="tnf-numeric">${basis}<div class="tnf-range"><label class="tnf-field"><span>${label}</span><input type="number" name="conditionValue-${index}" value="${esc(value)}" min="0" max="${max}" step="${step}" required></label><label class="tnf-field"><span>${t('至（可選）','To (optional)')}</span><input type="number" name="conditionEnd-${index}" value="${esc(end)}" min="0" max="${max}" step="${step}"></label></div></div>`;
 }
 let options=field==='kind'?kindLabels.map(([id,zh,en])=>({id,label:t(zh,en)})):Array.isArray(ctx.options[field])?ctx.options[field]:[],counts=new Map();for(const option of options)if(validValue(option?.id))counts.set(option.id,(counts.get(option.id)||0)+1);options=options.filter(option=>validValue(option?.id)&&typeof option.label==='string'&&counts.get(option.id)===1);
 const supported=fields.has(field),found=options.some(option=>option.id===value);
 return `<label class="tnf-field"><span>${t('內容','Value')}</span><select name="conditionValue-${index}"${supported&&options.length?' required':' disabled'}><option value=""${!value?' selected':''}>${options.length?t('請選擇','Choose a value'):t('選項暫未提供','Options are not available yet')}</option>${value&&!found?`<option value="${esc(value)}" selected disabled>${t('原選項暫未提供','Saved selection unavailable')}</option>`:''}${options.map(option=>`<option value="${esc(option.id)}"${value===option.id?' selected':''}>${esc(option.label)}</option>`).join('')}</select></label>`;
}
export function timetableFilterEditorMarkup(draft={},suppliedContext={}){
 const ctx=context(suppliedContext),{t,esc}=ctx;draft=object(draft)?draft:{};const conditions=Array.isArray(draft.conditions)&&draft.conditions.length?draft.conditions.slice(0,6):[{field:'',value:''}],creating=ctx.creating??!draft.id;
 return `<div class="modal tnf-modal" role="dialog" aria-modal="true" aria-labelledby="tt-named-filter-title"><div class="dialog tnf-dialog tt-named-filter-dialog"><header class="tnf-header"><h2 id="tt-named-filter-title">${creating?t('新增篩選','Create filter'):t('編輯篩選','Edit filter')}</h2>${action('cancel','×',ctx,{extra:`aria-label="${esc(t('關閉','Close'))}"`,className:'tnf-close'})}</header><form id="tt-named-filter-editor"${id(draft.id)?` data-filter-id="${esc(draft.id)}"`:''}><div class="tnf-body">${ctx.notice?`<p class="tnf-source-note" role="status">${esc(ctx.notice)}</p>`:''}<label class="tnf-field"><span>${t('篩選名稱','Filter name')}</span><input name="filterName" value="${esc(text(draft.name))}" maxlength="80" required autocomplete="off"></label><label class="tnf-field"><span>${t('符合條件的方式','Match conditions')}</span><select name="filterMatch"><option value="all"${draft.match!=='any'?' selected':''}>${t('符合全部條件','Match all conditions')}</option><option value="any"${draft.match==='any'?' selected':''}>${t('符合任何條件','Match any condition')}</option></select></label><div class="tnf-conditions">${conditions.map((condition,index)=>{condition=object(condition)?condition:{};return `<fieldset class="tnf-condition"><legend>${t('條件','Condition')} ${index+1}</legend><div class="tnf-condition-inputs">${fieldControl(condition,index,ctx)}${valueControl(condition,index,ctx)}</div>${action('remove-condition',esc(t('移除此條件','Remove condition')),ctx,{index,extra:conditions.length<=1?'disabled':''})}</fieldset>`;}).join('')}</div>${action('add-condition',esc(t('新增條件','Add condition')),ctx,{extra:conditions.length>=6?'disabled':''})}${errorMarkup(ctx)}</div><footer class="tnf-footer">${action('cancel',esc(t('取消','Cancel')),ctx)}<button type="submit" name="filterIntent" value="save" class="tnf-button">${t('儲存','Save')}</button><button type="submit" name="filterIntent" value="only" class="tnf-button tnf-primary">${t('儲存並只看','Save and only show')}</button></footer></form></div></div>`;
}
