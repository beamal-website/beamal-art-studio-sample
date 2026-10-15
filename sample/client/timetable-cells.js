const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const quarter=value=>Number.isInteger(value)&&value>=0&&value<=1425&&value%15===0;
const clock=minutes=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
function clockMinutes(value){if(typeof value!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return null;const minutes=Number(value.slice(0,2))*60+Number(value.slice(3));return quarter(minutes)?minutes:null;}
function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value.slice(0,4)!=='0000'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}

export function timetableGridMinimum(dayCount){
  if(!Number.isSafeInteger(dayCount)||dayCount<0)throw new RangeError('Timetable day count must be a non-negative safe integer.');
  const width=56+Math.max(1,dayCount)*200;
  if(!Number.isSafeInteger(width))throw new RangeError('Timetable minimum width exceeds safe integer precision.');
  return width;
}

export function timetableCreateCells(options={}){
  if(!options||typeof options!=='object')return [];
  const {start,lastTime,interval,compactTimes}=options;
  // Compact rows are explicit positions, not elapsed minutes on a linear axis.
  if(compactTimes!==undefined)return Array.isArray(compactTimes)?compactTimes.flatMap((minutes,index)=>quarter(minutes)?[{time:clock(minutes),top:index,height:1}]:[]):[];
  if(!Number.isInteger(start)||start<0||start>1439||!finite(lastTime)||lastTime<start||!finite(interval)||interval<=0)return [];
  const height=15/interval;if(!finite(height)||height<=0)return [];
  const first=Math.ceil(start/15)*15,last=Math.floor(Math.min(lastTime,1439)/15)*15,cells=[];
  for(let minutes=first;minutes<=last;minutes+=15){const top=(minutes-start)/interval;if(!finite(top)||top<0)return [];cells.push({time:clock(minutes),top,height});}
  return cells;
}

export function timetableCreateCellMarkup(cells,date,suppliedContext){
  if(!validDate(date)||!Array.isArray(cells))return '';
  const t=suppliedContext?.t||((_zh,en)=>en),esc=suppliedContext?.esc||escape;
  const valid=cells.filter(cell=>cell&&clockMinutes(cell.time)!==null&&finite(cell.top)&&cell.top>=0&&finite(cell.height)&&cell.height>0);
  return valid.map((cell,index)=>`<button type="button" class="tt-cell-add" data-action="tt-add-cell" data-date="${date}" data-time="${cell.time}" style="--tt-cell-top:${cell.top};--tt-cell-height:${cell.height}" tabindex="${index===0?'0':'-1'}" aria-label="${esc(t('新增排課','Add schedule')+' · '+date+' · '+cell.time)}"><span class="tt-cell-add-hint" aria-hidden="true">+ ${cell.time}</span></button>`).join('');
}
