const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const array=value=>Array.isArray(value)?value:[];
const text=value=>typeof value==='string'?value:'';
const context=ctx=>({t:ctx?.t||((_zh,en)=>en),esc:ctx?.esc||esc,embedded:ctx?.embedded===true});
const hasViewer=model=>['string','number'].includes(typeof model?.viewer?.id)&&String(model.viewer.id).trim()!=='';
const isAdmin=model=>hasViewer(model)&&model.viewer.role==='admin';
const same=(a,b)=>a!=null&&b!=null&&String(a)!==''&&String(a)===String(b);
const labelFor=value=>value==='in'||value==='Check In'?'in':value==='out'||value==='Check Out'?'out':'';
const locationFor=value=>['normal','offsite'].includes(value)?value:'';
const knownNumber=value=>typeof value==='number'&&Number.isFinite(value);
const bool=value=>value===true||value==='true'?true:value===false||value==='false'?false:null;
const emptySettings=()=>({studioName:'',address:'',latitude:'',longitude:'',preClassMinutes:'',postClassMinutes:'',requirePhoto:null,requireReason:null});
const settingsKeys=Object.keys(emptySettings());
function accessibleStaff(model){
 if(!hasViewer(model))return [];
 const members=array(model?.staff).filter(row=>row&&row.id!=null&&String(row.id)!=='');
 if(isAdmin(model))return members;
 if(model?.viewer?.role!=='teacher')return [];
 return members.filter(row=>same(row.userId,model.viewer.id)||array(model.viewer.teacherResourceIds).some(id=>same(row.id,id)));
}
function accessibleEvents(model){
 if(model?.ready!==true)return [];
 const staff=accessibleStaff(model);
 return array(model.events).filter(row=>row&&row.id!=null&&String(row.id)!==''&&staff.some(member=>same(member.id,row.staffId)));
}
function eventFor(model,id){return accessibleEvents(model).find(row=>same(row.id,id));}
function validDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const [year,month,day]=value.split('-').map(Number),date=new Date(`${value}T00:00:00Z`);
 return Number.isFinite(date.valueOf())&&date.getUTCFullYear()===year&&date.getUTCMonth()+1===month&&date.getUTCDate()===day;
}
function filterIssue(model){const draft=model.filterDraft||model;if(draft.from&&!validDate(draft.from)||draft.to&&!validDate(draft.to)||draft.from&&draft.to&&draft.to<draft.from)return 'filter-date';if(draft.teacherId&&draft.teacherId!=='all'&&!accessibleStaff(model).some(row=>same(row.id,draft.teacherId)))return 'filter-teacher';return '';}
function selectedEvents(model){
 const wantedLabel=labelFor(model.label),wantedLocation=locationFor(model.locationStatus),wantedTeacher=model.teacherId==='all'?'':model.teacherId;
 return accessibleEvents(model).filter(row=>{
  const date=text(row.timestamp).slice(0,10);
  return (!model.from||validDate(date)&&date>=model.from)&&(!model.to||validDate(date)&&date<=model.to)&&(!wantedTeacher||same(wantedTeacher,row.staffId))&&(!wantedLabel||labelFor(row.label)===wantedLabel)&&(!wantedLocation||locationFor(row.locationStatus)===wantedLocation);
 }).sort((a,b)=>text(b.timestamp).localeCompare(text(a.timestamp)));
}
function button(command,label,ctx,{id='',secondary=false,disabled=false,type='button'}={}){
 return `<button type="${type}" class="staff-attendance-button${secondary?' staff-attendance-secondary':''}" data-action="ui-attendance" data-ui-command="${ctx.esc(command)}" data-ui-id="${ctx.esc(id)}"${disabled?' disabled':''}>${ctx.esc(label)}</button>`;
}
function select(name,label,value,choices,ctx,command='attendance-filter',extra=''){
 return `<label class="staff-attendance-field"><span>${ctx.esc(label)}</span><select name="${ctx.esc(name)}" data-ui-command="${command}" ${extra}>${choices.map(([key,title])=>`<option value="${ctx.esc(key)}"${same(key,value)||key===''&&(value==null||value==='')?' selected':''}>${ctx.esc(title)}</option>`).join('')}</select></label>`;
}
function input(name,label,value,ctx,{type='text',extra='',command='attendance-filter'}={}){
 return `<label class="staff-attendance-field"><span>${ctx.esc(label)}</span><input type="${type}" name="${ctx.esc(name)}" value="${ctx.esc(value)}" data-ui-command="${command}" ${extra}></label>`;
}
function validationMessage(code,ctx){const messages={'filter-date':['請檢查開始及結束日期。','Check the from and to dates.'],'filter-teacher':['請選擇仍可查看的老師。','Choose an available teacher.'],'settings-name':['請填寫工作室名稱。','Enter a studio name.'],'settings-centre':['請填寫有效的工作室中心點經緯度。','Enter valid latitude and longitude for the studio centre.'],'settings-window':['請填寫零或以上的完整分鐘數。','Enter whole minutes of zero or more for both clock windows.'],'settings-policy':['請分別設定外勤照片及原因要求。','Choose both off-site photo and reason requirements.']};return messages[code]?ctx.t(...messages[code]):'';}
function feedback(model,ctx){const message=validationMessage(model.validationError,ctx);return message?`<p class="staff-attendance-error" role="alert">${ctx.esc(message)}</p>`:'';}
function labelText(row,ctx){return labelFor(row.label)==='in'?'Check In':labelFor(row.label)==='out'?'Check Out':ctx.t('類型資料未提供','Label unavailable');}
function locationText(row,ctx){return row.locationStatus==='normal'?ctx.t('正常','Normal'):row.locationStatus==='offsite'?ctx.t('外勤','Off-site'):ctx.t('地點狀態未提供','Location status unavailable');}
const distanceText=row=>knownNumber(row.distanceMeters)&&row.distanceMeters>=0?`${row.distanceMeters} m`:'—';
function readableClock(value,ctx){
 const match=typeof value==='string'&&/^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(\.\d+)?)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/.exec(value);
 if(!match||!validDate(match[1]))return null;
 const [year,month,day]=match[1].split('-'),months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 const date=ctx.t(`${Number(year)}年${Number(month)}月${Number(day)}日`,`${Number(day)} ${months[Number(month)-1]} ${year}`),time=`${match[2]}:${match[3]}${match[4]===undefined?'':`:${match[4]}${match[5]||''}`}`,zone=match[6]==='Z'?'UTC':match[6]?`UTC${match[6]}`:ctx.t('時區資料未提供','Time zone unavailable');
 return `${date}\n${time}\n${zone}`;
}
function clockMarkup(value,ctx){const display=readableClock(value,ctx);return display?`<time class="staff-attendance-clock-time" datetime="${ctx.esc(value)}">${ctx.esc(display)}</time>`:`<span class="staff-attendance-clock-time">${ctx.esc(ctx.t('時間資料未提供','Clock time unavailable'))}</span>`;}
function readState(model,ctx){
 const {t}=ctx;
 const message=model.loading?(model.ready?t('正在更新打卡紀錄…','Updating clock records…'):t('正在載入打卡紀錄…','Loading clock records…')):model.error?(model.ready?t('未能更新打卡紀錄。正顯示上次載入的資料。','Could not update clock records. Showing the last loaded records.'):t('未能載入打卡紀錄，請重試。','Could not load clock records. Try again.')):model.ready!==true?t('打卡紀錄暫未提供。','Clock records are not available yet.') :'';
 return message?`<p class="staff-attendance-read" role="${model.error?'alert':'status'}"${model.loading?' aria-busy="true"':''}>${ctx.esc(message)}</p>`:'';
}
function filters(model,ctx){
 const {t}=ctx,members=accessibleStaff(model),draft=model.filterDraft||model,issue=filterIssue(model),invalid=issue==='filter-date'?'aria-invalid="true"':'',missing=draft.teacherId&&draft.teacherId!=='all'&&!members.some(row=>same(row.id,draft.teacherId));
 return `<div class="staff-attendance-filters" role="group" aria-label="${ctx.esc(t('打卡紀錄篩選','Clock event filters'))}">${input('from',t('開始日期','From'),draft.from,ctx,{type:'date',extra:invalid})}${input('to',t('結束日期','To'),draft.to,ctx,{type:'date',extra:invalid})}${isAdmin(model)?select('teacherId',t('老師','Teacher'),draft.teacherId==='all'?'':draft.teacherId,[['',t('全部老師','All teachers')],...members.map(row=>[String(row.id),row.displayName||t('姓名未提供','Name unavailable')]),...(missing?[[draft.teacherId,t('所選老師資料未能提供','Selected teacher unavailable')]]:[])],ctx,'attendance-filter',missing?'aria-invalid="true"':''):''}${select('label',t('打卡類型','Clock label'),labelFor(draft.label),[['',t('全部類型','All labels')],['in','Check In'],['out','Check Out']],ctx)}${select('locationStatus',t('地點狀態','Location status'),locationFor(draft.locationStatus),[['',t('全部狀態','All statuses')],['normal',t('正常','Normal')],['offsite',t('外勤','Off-site')]],ctx)}</div>`;
}
export function attendancePageMarkup(model={},suppliedContext){
 const ctx=context(suppliedContext),{t}=ctx,heading=ctx.embedded?'h2':'h1',title=isAdmin(model)?t('員工打卡','Staff attendance'):t('打卡紀錄','Clock records'),rows=selectedEvents(model),members=accessibleStaff(model),labels=[t('老師','Teacher'),t('打卡時間','Clock time'),t('打卡類型','Clock label'),t('地點狀態','Location status'),t('距離','Distance'),t('詳情','Details')];
 if(!hasViewer(model))return `<section class="staff-attendance-page${ctx.embedded?' staff-attendance-embedded':''}"><header class="staff-attendance-heading"><${heading}>${ctx.esc(title)}</${heading}></header><div class="staff-attendance-body"><p role="status">${ctx.esc(t('帳戶資料暫未提供。','Account details are unavailable.'))}</p></div></section>`;
 const table=rows.length?`<div class="staff-attendance-table-wrap" role="region" aria-label="${ctx.esc(t('獨立打卡事件','Independent clock events'))}" tabindex="0"><table class="staff-attendance-table"><thead><tr>${labels.map(label=>`<th scope="col">${ctx.esc(label)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${[ctx.esc(members.find(member=>same(member.id,row.staffId))?.displayName||t('姓名未提供','Name unavailable')),clockMarkup(row.timestamp,ctx),`<span class="staff-attendance-badge">${ctx.esc(labelText(row,ctx))}</span>`,`<span class="staff-attendance-badge${row.locationStatus==='offsite'?' staff-attendance-offsite':''}">${ctx.esc(locationText(row,ctx))}</span>`,ctx.esc(distanceText(row)),button('attendance-open-event',t('查看紀錄','View event'),ctx,{id:row.id,secondary:true})].map((cell,index)=>`<td data-label="${ctx.esc(labels[index])}">${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<p class="staff-attendance-empty">${ctx.esc(t('沒有符合的打卡事件。','No clock events match these filters.'))}</p>`;
 const issue=filterIssue(model),previous=model.ready===true&&model.filterDraft&&issue,filterNotice=previous?`<p class="staff-attendance-note">${ctx.esc(t('正顯示上一組有效篩選條件的結果。','Showing results for the previous valid filters.'))}</p>`:'';
 return `<section class="staff-attendance-page${ctx.embedded?' staff-attendance-embedded':''}"><header class="staff-attendance-heading"><${heading}>${ctx.esc(title)}</${heading}>${isAdmin(model)?button('attendance-open-settings',t('打卡設定','Attendance settings'),ctx,{secondary:true}):''}</header><div class="staff-attendance-body">${filters(model,ctx)}${feedback(issue?{validationError:issue}:model,ctx)}${readState(model,ctx)}${filterNotice}${model.ready===true&&(!issue||rows.length)?table:''}</div></section>`;
}
function mergeDraft(base,fields){
 const draft={...emptySettings(),...base};
 for(const key of settingsKeys)if(Object.hasOwn(fields,key))draft[key]=['requirePhoto','requireReason'].includes(key)?bool(fields[key]):fields[key];
 return draft;
}
function validateDraft(draft){
 const numeric=value=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value));
 if(!text(draft.studioName).trim())return 'settings-name';
 if(!numeric(draft.latitude)||Math.abs(Number(draft.latitude))>90||!numeric(draft.longitude)||Math.abs(Number(draft.longitude))>180)return 'settings-centre';
 if(['preClassMinutes','postClassMinutes'].some(key=>!numeric(draft[key])||!Number.isSafeInteger(Number(draft[key]))||Number(draft[key])<0))return 'settings-window';
 if(bool(draft.requirePhoto)===null||bool(draft.requireReason)===null)return 'settings-policy';
 return '';
}
function normalizedDraft(draft){return {...draft,studioName:text(draft.studioName).trim(),address:text(draft.address).trim(),latitude:Number(draft.latitude),longitude:Number(draft.longitude),preClassMinutes:Number(draft.preClassMinutes),postClassMinutes:Number(draft.postClassMinutes),requirePhoto:bool(draft.requirePhoto),requireReason:bool(draft.requireReason)};}
function settingFields(draft,ctx){
 const {t}=ctx,number=(name,label,extra)=>input(name,label,draft[name],ctx,{type:'number',command:'attendance-draft',extra}),choices=[['',t('請選擇','Choose a setting')],['true',t('需要','On — required')],['false',t('不需要','Off — optional')]];
 return `<div class="staff-attendance-form-grid">${input('studioName',t('工作室名稱','Studio name'),draft.studioName,ctx,{command:'attendance-draft',extra:'required maxlength="120"'})}${input('address',t('地址（選填）','Address (optional)'),draft.address,ctx,{command:'attendance-draft',extra:'maxlength="300"'})}${number('latitude',t('中心點緯度','Centre latitude'),'min="-90" max="90" step="any" required')}${number('longitude',t('中心點經度','Centre longitude'),'min="-180" max="180" step="any" required')}${number('preClassMinutes',t('課前 Check In 時段（分鐘）','Pre-class Check In window (minutes)'),'min="0" step="1" required')}${number('postClassMinutes',t('課後 Check Out 時段（分鐘）','Post-class Check Out window (minutes)'),'min="0" step="1" required')}</div><section class="staff-attendance-policy"><h3>${ctx.esc(t('外勤打卡','Off-site clock'))}</h3><p>${ctx.esc(t('距離中心點 100 m 以內標記為正常；超過 100 m 標記為外勤，仍可打卡。','Within 100 m of the centre is normal; beyond 100 m is off-site and still allows a clock event.'))}</p><div class="staff-attendance-form-grid">${select('requirePhoto',t('外勤需要照片','Require photo'),draft.requirePhoto===null?'':String(draft.requirePhoto),choices,ctx,'attendance-draft')}${select('requireReason',t('外勤需要原因','Require reason'),draft.requireReason===null?'':String(draft.requireReason),choices,ctx,'attendance-draft')}</div><p>${ctx.esc(t('照片及原因要求分開設定；尚未設定的項目需要明確選擇。','Photo and reason requirements are independent. Choose a value for each unset setting.'))}</p></section>`;
}
function facts(rows,ctx){return `<dl class="staff-attendance-facts">${rows.map(([label,value])=>`<div><dt>${ctx.esc(label)}</dt><dd>${ctx.esc(value)}</dd></div>`).join('')}</dl>`;}
function eventDetails(model,row,ctx){
 const {t}=ctx,member=accessibleStaff(model).find(member=>same(member.id,row.staffId)),photo=row.photoAvailable===true?t('已附照片','Photo attached'):row.photoAvailable===false?t('未附照片','No photo attached'):t('照片資料未提供','Photo information unavailable');
 return facts([[t('老師','Teacher'),member?.displayName||'—'],[t('打卡時間','Clock time'),readableClock(row.timestamp,ctx)||t('時間資料未提供','Clock time unavailable')],[t('打卡類型','Clock label'),labelText(row,ctx)],[t('地點狀態','Location status'),locationText(row,ctx)],[t('距離工作室中心點','Distance from studio centre'),distanceText(row)],[t('照片','Photo'),photo]],ctx)+`<section class="staff-attendance-reason"><h3>${ctx.esc(t('外勤原因','Off-site reason'))}</h3><p>${ctx.esc(typeof row.reason==='string'?(row.reason||t('未提供原因','No reason provided')):t('原因資料未提供','Reason information unavailable'))}</p></section>${row.photoAvailable===true?`<p class="staff-attendance-note">${ctx.esc(t('照片檢視暫未接通。','Photo viewing is not connected yet.'))}</p>`:''}`;
}
function reviewDetails(draft,ctx){
 const {t}=ctx,on=value=>value?t('需要','On — required'):t('不需要','Off — optional');
 return facts([[t('工作室名稱','Studio name'),draft.studioName],[t('地址','Address'),draft.address||'—'],[t('中心點緯度','Centre latitude'),draft.latitude],[t('中心點經度','Centre longitude'),draft.longitude],[t('課前 Check In 時段','Pre-class Check In window'),`${draft.preClassMinutes} min`],[t('課後 Check Out 時段','Post-class Check Out window'),`${draft.postClassMinutes} min`],[t('外勤需要照片','Require photo'),on(draft.requirePhoto)],[t('外勤需要原因','Require reason'),on(draft.requireReason)]],ctx);
}
export function attendanceDialogMarkup(model={},suppliedContext){
 const ctx=context(suppliedContext),{t}=ctx,dialog=model.dialog;if(!dialog||!hasViewer(model))return '';
 const event=dialog.kind==='attendance-event',settings=['attendance-settings','attendance-review'].includes(dialog.kind);
 if(!event&&!settings||settings&&!isAdmin(model))return '';
 const row=event?eventFor(model,dialog.id):null,draft=settings?mergeDraft(emptySettings(),dialog.draft||{}):null,review=dialog.kind==='attendance-review'&&!validateDraft(draft,ctx);
 const title=event?t('打卡紀錄','Clock event'):review?t('核對打卡設定','Review attendance settings'):t('打卡設定','Attendance settings');
 const body=event?(row?eventDetails(model,row,ctx):`<p role="status">${ctx.esc(t('此打卡紀錄暫未提供。','Clock event is unavailable.'))}</p>`):`${feedback(model,ctx)}${review?reviewDetails(draft,ctx):settingFields(draft,ctx)}<p class="staff-attendance-note" id="staff-attendance-save-note">${ctx.esc(t('設定儲存暫未接通。核對不會變更現有設定。','Saving settings is not connected yet. Reviewing does not change current settings.'))}</p>`;
 const actions=event?button('attendance-cancel',t('關閉','Close'),ctx,{secondary:true}):review?`${button('attendance-cancel',t('返回修改','Back to edit'),ctx,{secondary:true})}${button('attendance-save-settings',t('儲存設定','Save settings'),ctx,{disabled:true})}`:`${button('attendance-cancel',t('取消','Cancel'),ctx,{secondary:true})}${button('attendance-review-settings',t('核對設定','Review settings'),ctx,{type:'submit'})}`;
 return `<div class="modal staff-attendance-modal" role="dialog" aria-modal="true" aria-labelledby="staff-attendance-dialog-title"><div class="dialog staff-attendance-dialog" tabindex="-1"><header><h2 id="staff-attendance-dialog-title">${ctx.esc(title)}</h2><button type="button" class="staff-attendance-button staff-attendance-secondary" data-action="ui-attendance" data-ui-command="attendance-cancel" aria-label="${ctx.esc(t('關閉','Close'))}">×</button></header>${settings&&!review?'<form id="ui-attendance-form" data-ui-command="attendance-review-settings">':''}<div class="ui-staff-dialog-body">${body}</div><footer>${actions}</footer>${settings&&!review?'</form>':''}</div></div>`;
}
export function advanceAttendanceUi(model={},command,fields={},suppliedContext){
 const state=structuredClone(model),ctx=context(suppliedContext);
 if(!hasViewer(state))return state;
 if(command==='attendance-cancel'){
  state.dialog=state.dialog?.kind==='attendance-review'&&isAdmin(state)?{...state.dialog,kind:'attendance-settings'}:null;state.validationError='';return state;
 }
 if(command==='attendance-open-event'){
  if(eventFor(state,fields.id))state.dialog={kind:'attendance-event',id:fields.id};else state.dialog=null;
  return state;
 }
 if(command==='attendance-filter'){
  const next={from:state.from||'',to:state.to||'',teacherId:state.teacherId||'',label:state.label||'',locationStatus:state.locationStatus||'',...state.filterDraft};
  for(const key of Object.keys(next))if(Object.hasOwn(fields,key))next[key]=text(fields[key]);
  if(next.from&&!validDate(next.from)||next.to&&!validDate(next.to)||next.from&&next.to&&next.to<next.from){state.filterDraft=next;state.validationError='filter-date';return state;}
  if(next.teacherId==='all')next.teacherId='';
  if(next.teacherId&&!accessibleStaff(state).some(row=>same(row.id,next.teacherId))){state.filterDraft=next;state.validationError='filter-teacher';return state;}
  next.label=['in','out'].includes(next.label)?next.label:'';next.locationStatus=locationFor(next.locationStatus);
  Object.assign(state,next,{filterDraft:null,validationError:''});return state;
 }
 if(!isAdmin(state))return state;
 if(command==='attendance-open-settings'){state.dialog={kind:'attendance-settings',draft:mergeDraft(emptySettings(),state.settingsReady===true?state.settings||{}:{})};state.validationError='';}
 else if(['attendance-draft','attendance-review-settings'].includes(command)&&state.dialog?.kind==='attendance-settings'){
  const draft=mergeDraft(state.dialog.draft,fields);state.dialog={...state.dialog,draft};state.validationError='';
  if(command==='attendance-review-settings'){state.validationError=validateDraft(draft);if(!state.validationError)state.dialog={kind:'attendance-review',draft:normalizedDraft(draft)};}
 }
 return state;
}
