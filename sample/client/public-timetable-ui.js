import {publicSlotMatchesType,publicQuota,publicClassTypeMarkup,publicClassStatusMarkup,publicAvailabilityLegend,publicNotice} from './availability-ui.js';
import {publicCourseColour,publicCourseColourSwatch} from './public-course-colour-ui.js';

const DAY=86400000,MIN_DAY=Date.parse('0001-01-01T00:00:00Z')/DAY,MAX_DAY=Date.parse('9999-12-31T00:00:00Z')/DAY;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const id=value=>typeof value==='string'&&value.length<=200&&!!value.trim();
const dateDay=value=>{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const day=Date.parse(value+'T00:00:00Z')/DAY;
  return Number.isSafeInteger(day)&&day>=MIN_DAY&&day<=MAX_DAY&&new Date(day*DAY).toISOString().slice(0,10)===value?day:null;
};
const dateKey=day=>new Date(day*DAY).toISOString().slice(0,10);
const rangeDaysValid=value=>Number.isSafeInteger(value)&&value>=7&&value<=30;
const types=['all','class','trial','rescheduling'];
const range=(from,days)=>{const first=dateDay(from);return first!==null&&rangeDaysValid(days)?{first,last:Math.min(MAX_DAY,first+days-1)}:null;};
const shifted=(day,offset)=>day!==null&&day+offset>=MIN_DAY&&day+offset<=MAX_DAY?dateKey(day+offset):null;
const stringNames=(value,t)=>Array.isArray(value)?value.filter(name=>typeof name==='string'&&name.trim()).join(t('、',', '))||'—':'—';

export function validPublicTimetableProjection(data,from,days){
  if(!object(data)||data.unchanged||!rangeDaysValid(data.rangeDays)||days!=null&&data.rangeDays!==days||data.from!==from||!Array.isArray(data.courses)||!Array.isArray(data.slots))return false;
  const dates=range(from,data.rangeDays);if(!dates||data.to!==dateKey(dates.last))return false;
  const courseIds=new Set();
  for(const course of data.courses){if(!object(course)||!id(course.id)||courseIds.has(course.id)||typeof course.courseName!=='string'||!course.courseName.trim()||course.courseName.length>200)return false;courseIds.add(course.id);}
  const slotIds=new Set();
  for(const slot of data.slots){
    if(!object(slot)||!id(slot.id)||slotIds.has(slot.id)||!courseIds.has(slot.courseId)||slot.sourceAvailable===false||dateDay(slot.date)===null||slot.date<from||slot.date>data.to||typeof slot.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.time)||!Number.isSafeInteger(slot.duration)||slot.duration<1)return false;
    if(Number(slot.time.slice(0,2))*60+Number(slot.time.slice(3))+slot.duration>1440)return false;
    slotIds.add(slot.id);
  }
  return true;
}

export function publicTimetableSlotMatches(slot,{courseFilter='',slotType='all'}={}){
  return object(slot)&&slot.sourceAvailable!==false&&(!courseFilter||slot.courseId===courseFilter)&&publicSlotMatchesType(slot,types.includes(slotType)?slotType:'all');
}

export function publicTimetableMarkup(state={}, {t,esc,managementPreview=false,trialPreview=false,staticPreview=false}){
  const {courses=[],slots=[],from='',to='',rangeDays=7,error='',dateError='',dateInput}=state;
  const prefix=managementPreview?'availability-preview':'availability-public',titleTag=managementPreview?'h3':'h1',weekTag=managementPreview?'h4':'h2',dayTag=managementPreview?'h5':'h3',courseTag=managementPreview?'h6':'h4';
  const count=rangeDaysValid(rangeDays)?rangeDays:7,dates=range(from,count),previous=shifted(dates?.first??null,-count),next=shifted(dates?.first??null,count);
  const loading=state.loading===true||state.ready===false,valid=validPublicTimetableProjection(state,from,rangeDays),failure=error||dateError||(!loading&&!valid?t('課表資料暫未能使用，請重新載入。','Timetable details are unavailable. Please reload.'):'');
  const ready=!loading&&!failure&&valid,busy=loading&&!failure,courseFilter=typeof state.courseFilter==='string'?state.courseFilter:'',slotType=types.includes(state.slotType)?state.slotType:'all';
  const safeCourses=ready?courses:[],courseMap=new Map(safeCourses.map(course=>[course.id,course]));
  const shown=ready?slots.filter(slot=>publicTimetableSlotMatches(slot,{courseFilter,slotType})).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.courseId.localeCompare(b.courseId)||a.id.localeCompare(b.id)):[];
  const shownCourseIds=new Set(shown.map(slot=>slot.courseId)),legendCourses=safeCourses.filter(course=>shownCourseIds.has(course.id)),inputDate=typeof dateInput==='string'?dateInput:from;
  const missingCourseOption=courseFilter&&!safeCourses.some(course=>course.id===courseFilter)?`<option value="${esc(courseFilter)}" selected disabled>${esc(t('所選課程暫未提供','Selected course unavailable'))}</option>`:'';
  const reset=courseFilter||slotType!=='all'?`<button type="button" class="ghost" data-action="${prefix}-filters-reset">${esc(t('清除篩選','Clear filters'))}</button>`:'';
  const courseLegend=legendCourses.length?`<aside class="availability-week-course-legend" aria-label="${esc(t('課程圖例','Course key'))}"><ul>${legendCourses.map(course=>`<li data-public-course-legend-id="${esc(course.id)}">${publicCourseColourSwatch(course,{esc})}<span>${esc(t(course.courseName,course.courseNameEn||course.courseName))}</span></li>`).join('')}</ul></aside>`:'';
  const slotMarkup=slot=>{
    const course=courseMap.get(slot.courseId),colour=publicCourseColour(course.publicColor),trial=publicSlotMatchesType(slot,'trial'),rescheduling=publicSlotMatchesType(slot,'rescheduling');
    const courseInfo=`<button type="button" class="ghost" data-action="availability-week-course" data-course-id="${esc(course.id)}" data-slot-id="${esc(slot.id)}" aria-label="${esc(t(`查看${course.courseName}課程詳情`,`View ${course.courseName} course details`))}">${esc(t('課程詳情','Course details'))}</button>`;
    const actions=managementPreview?`<button type="button" class="availability-preview-manage" data-action="availability-preview-manage" data-slot-id="${esc(slot.id)}" aria-label="${esc(t(`管理${course.courseName} ${slot.date} ${slot.time}時段`,`Manage ${course.courseName} ${slot.date} ${slot.time}`))}">${esc(t('管理時段','Manage time'))}</button>`:courseInfo+(trialPreview&&trial&&slot.trialVisible===true?`<button type="button" class="availability-trial-preview" data-action="availability-trial-open" data-course-id="${esc(course.id)}" data-slot-id="${esc(slot.id)}" aria-label="${esc(t(`填寫${course.courseName} ${slot.date} ${slot.time}試堂資料`,`Enter trial details for ${course.courseName} ${slot.date} ${slot.time}`))}"${slot.trialStatus!=='available'||!Number.isSafeInteger(slot.trialRemaining)||slot.trialRemaining<1?' disabled':''}>${esc(t('填寫試堂資料','Enter trial details'))}</button>`:'');
    return `<article class="availability-public-slot availability-week-slot" data-availability-slot-id="${esc(slot.id)}" data-course-id="${esc(course.id)}"${colour?` style="--public-course-colour:${colour}"`:''}><header><${courseTag} class="availability-week-course-title">${publicCourseColourSwatch(course,{esc})}${esc(t(course.courseName,course.courseNameEn||course.courseName))}</${courseTag}><p class="availability-week-slot-time"><time datetime="${slot.date}T${slot.time}">${slot.time}</time><span>${esc(t(`${slot.duration} 分鐘`,`${slot.duration} minutes`))}</span></p></header>${publicClassTypeMarkup(slot,{t,esc})}<dl><div><dt>${esc(t('老師','Teachers'))}</dt><dd>${esc(stringNames(slot.teacherNames,t))}</dd></div><div><dt>${esc(t('課室','Rooms'))}</dt><dd>${esc(stringNames(slot.roomNames,t))}</dd></div></dl><div class="availability-public-quotas">${publicClassStatusMarkup(slot,{t,esc})}${publicQuota(t('試課名額','Trial places'),trial,slot.trialRemaining,slot.trialStatus,{t,esc})}${publicQuota(t('調課名額','Rescheduling places'),rescheduling,slot.reschedulingRemaining,slot.reschedulingStatus,{t,esc})}</div><div class="availability-week-actions">${actions}</div></article>`;
  };
  const allDays=ready?Array.from({length:dates.last-dates.first+1},(_,index)=>dateKey(dates.first+index)):[],groups=[];for(let index=0;index<allDays.length;index+=7)groups.push(allDays.slice(index,index+7));
  const empty=ready&&!courses.length?t('暫未有公開課程。','No published courses yet.'):ready&&!slots.length?t('這段日期暫未有公開時段。','No published times in this date range.'):ready&&!shown.length?t('沒有符合這些篩選的時段。','No times match these filters.') :'';
  const weekdays=[t('星期日','Sunday'),t('星期一','Monday'),t('星期二','Tuesday'),t('星期三','Wednesday'),t('星期四','Thursday'),t('星期五','Friday'),t('星期六','Saturday')];
  const calendar=groups.map((days,index)=>`<section class="availability-week-section" data-public-week-index="${index}" aria-labelledby="${prefix}-week-${index}"><${weekTag} id="${prefix}-week-${index}"><time datetime="${days[0]}">${days[0]}</time> — <time datetime="${days.at(-1)}">${days.at(-1)}</time></${weekTag}><div class="availability-week-grid">${days.map(day=>`<section class="availability-week-day" data-availability-date="${day}"><${dayTag}><time datetime="${day}">${day}</time><span>${esc(weekdays[new Date(day+'T00:00:00Z').getUTCDay()])}</span></${dayTag}>${shown.filter(slot=>slot.date===day).map(slotMarkup).join('')||`<p class="availability-day-empty">${esc(courseFilter||slotType!=='all'?t('沒有符合條件的時段。','No matching times.'):t('沒有可約時段。','No available times.'))}</p>`}</section>`).join('')}</div></section>`).join('');
  return `<section class="availability-public availability-public-weekly" aria-labelledby="${prefix}-week-title" aria-busy="${busy}"${staticPreview?' inert':''}>${staticPreview?'':`<button type="button" class="ghost availability-public-back" data-action="${prefix}-back">← ${esc(managementPreview?t('返回','Back'):t('返回課程','Back to courses'))}</button>`}<header class="availability-public-header"><${titleTag} id="${prefix}-week-title">${esc(t('公開課表','Public timetable'))}</${titleTag}></header>${publicNotice(t,esc)}
    <div class="availability-public-controls availability-week-controls"><label for="${prefix}-from"><span>${esc(t('開始日期','Start date'))}</span><input id="${prefix}-from" name="from" type="date" value="${esc(inputDate)}" min="0001-01-01" max="9999-12-31"${dateError?` aria-invalid="true" aria-describedby="${prefix}-week-error"`:''}></label><label for="${prefix}-days"><span>${esc(t('顯示日數','Days to show'))}</span><select id="${prefix}-days" name="days">${Array.from({length:24},(_,index)=>index+7).map(value=>`<option value="${value}"${value===count?' selected':''}>${esc(t(`${value} 天`,`${value} days`))}</option>`).join('')}</select></label><label for="${prefix}-type"><span>${esc(t('時段類型','Time type'))}</span><select id="${prefix}-type" name="slotType">${[['all',t('所有時段','All times')],['class',t('課堂','Classes')],['trial',t('試課','Trial')]].map(([value,label])=>`<option value="${value}"${value===slotType?' selected':''}>${esc(label)}</option>`).join('')}</select></label><label for="${prefix}-course-filter"><span>${esc(t('課程','Course'))}</span><select id="${prefix}-course-filter" name="courseFilter"><option value=""${!courseFilter?' selected':''}>${esc(t('所有課程','All courses'))}</option>${missingCourseOption}${safeCourses.map(course=>`<option value="${esc(course.id)}"${course.id===courseFilter?' selected':''}>${esc(t(course.courseName,course.courseNameEn||course.courseName))}</option>`).join('')}</select></label><div class="availability-week-range-actions"><button type="button" class="ghost" data-action="${prefix}-range" data-from="${esc(previous||from)}" data-direction="previous"${previous?'':' disabled'}>${esc(t(`前 ${count} 天`,`Previous ${count} days`))}</button><button type="button" class="ghost" data-action="${prefix}-range" data-from="${esc(next||from)}" data-direction="next"${next?'':' disabled'}>${esc(t(`後 ${count} 天`,`Next ${count} days`))}</button>${reset}</div><p class="availability-week-range-label"><time datetime="${esc(from)}">${esc(from||'—')}</time> — <time datetime="${esc(to)}">${esc(to||'—')}</time></p></div>
    ${failure?`<div class="availability-error-state"><p id="${prefix}-week-error" class="availability-error" role="alert">${esc(failure)}</p><button type="button" class="ghost" data-action="${prefix}-refresh">${esc(t('重新載入','Reload'))}</button></div>`:''}${busy?`<p class="availability-loading" role="status">${esc(t('正在載入課表…','Loading timetable…'))}</p>`:''}${empty?`<p class="availability-empty" role="status">${esc(empty)}</p>`:''}${ready?`${courseLegend}${shown.length?publicAvailabilityLegend({t,esc}):''}<div class="availability-week-list">${calendar}</div>`:''}</section>`;
}
