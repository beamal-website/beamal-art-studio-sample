const count=value=>Number.isSafeInteger(value)&&value>=0?value:null;
export function courseAvailabilityListsMarkup({slots=[],courseId='',from='',to='',loading=false,error=false}={}, {t,esc}){
 const rows=slots.filter(slot=>slot.courseId===courseId&&(!from||slot.date>=from)&&(!to||slot.date<=to)).slice().sort((a,b)=>String(a.date+' '+a.time).localeCompare(String(b.date+' '+b.time))||String(a.id).localeCompare(String(b.id)));
 const fact=(label,value)=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
 const names=values=>Array.isArray(values)&&values.length?values.join(' / '):t('稍後安排','Arrange later');
 const list=(purpose,title)=>{
  const records=rows.filter(slot=>slot[purpose+'Enabled']===true);
  return `<section class="course-availability-column" aria-labelledby="course-availability-${purpose}"><h3 id="course-availability-${purpose}">${esc(title)}</h3>${records.map(slot=>{
   const capacity=count(slot[purpose+'Capacity']),reserved=count(slot[purpose+'Reserved']),remaining=capacity!==null&&reserved!==null?Math.max(0,capacity-reserved):null;
   const state=slot.active===false?'inactive':slot.sourceAvailable===false?'unavailable':remaining===null?'unknown':remaining===0?'full':'available';
   const label={inactive:t('已停用','Inactive'),unavailable:t('暫不可用','Unavailable'),unknown:t('待確認','To be confirmed'),full:t('已滿額','Full'),available:t('可預約','Available')}[state];
   return `<article class="course-availability-row" data-slot-id="${esc(slot.id)}"><header><div><time datetime="${esc(slot.date)}">${esc(slot.date)}</time><h4>${esc(slot.time||'—')}</h4></div><span class="course-availability-status" data-availability-status="${state}">${esc(label)}</span></header><dl>${fact(t('老師','Teachers'),names(slot.teacherNames))}${fact(t('課室','Rooms'),names(slot.roomNames))}${fact(t('時長','Duration'),count(slot.duration)!==null?t(`${slot.duration} 分鐘`,`${slot.duration} minutes`):'—')}${fact(t('已用名額','Used places'),`${reserved??'—'} / ${capacity??'—'}`)}${fact(t('剩餘名額','Remaining places'),remaining??'—')}</dl></article>`;
  }).join('')||`<p class="course-availability-empty">${esc(error?t('暫未能顯示時段。','Times could not be loaded.'):loading?t('正在載入時段…','Loading times…'):t('此日期範圍暫未有時段。','No times in this date range.'))}</p>`}</section>`;
 };
 return `<div class="course-availability-lists">${list('trial',t('試堂','Trials'))}${list('rescheduling',t('調堂','Rescheduling'))}</div>`;
}
