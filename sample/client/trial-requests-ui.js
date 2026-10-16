// The host supplies one authorized request source and performs all writes.
// These renderers never confirm, convert, reject, or manufacture a task record.
const text=value=>typeof value==='string'?value:'';
const identified=value=>!!text(value).trim()&&value.length<=200;
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const context=ctx=>({t:typeof ctx?.t==='function'?ctx.t:(_zh,en)=>en,esc:typeof ctx?.esc==='function'?ctx.esc:escape});
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(text(value))&&value>='0001-01-01'&&value<='9999-12-31'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const validTime=value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(text(value));
const validRecord=row=>row&&identified(row.id)&&identified(row.personId)&&identified(row.reference)&&row.reference.length<=100&&Number.isSafeInteger(row.version)&&row.version>0&&['pending','rejected'].includes(row.status)&&row.applicant&&typeof row.applicant==='object'&&!Array.isArray(row.applicant)&&identified(row.slot?.id)&&identified(row.slot.courseId)&&validDate(row.slot.date)&&validTime(row.slot.time)&&Number.isSafeInteger(row.slot.duration)&&row.slot.duration>0&&row.slot.duration<=1440-Number(row.slot.time.slice(0,2))*60-Number(row.slot.time.slice(3))&&typeof row.canReject==='boolean';
function validRows(rows){return Array.isArray(rows)&&rows.every(validRecord)&&new Set(rows.map(row=>row.id)).size===rows.length;}
const fieldValue=(value,ctx)=>ctx.esc(text(value)||ctx.t('未提供','Not provided'));
const applicantName=(record,ctx)=>fieldValue(record.applicant.displayName,ctx);
const names=(values,ctx)=>fieldValue(Array.isArray(values)?values.filter(value=>typeof value==='string').join(ctx.t('、',', ')):'',ctx);
function timestamp(value,ctx){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(value)||!validDate(value.slice(0,10))||!Number.isFinite(Date.parse(value)))return ctx.t('未提供','Not provided');
 return `<time datetime="${ctx.esc(value)}">${ctx.esc(new Intl.DateTimeFormat(ctx.t('zh-HK','en-GB'),{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)))}</time>`;
}
const statusMarkup=(record,ctx)=>`<span class="trial-request-status trial-request-${record.status}">${ctx.esc(record.status==='pending'?ctx.t('待處理','Pending'):ctx.t('已拒絕','Rejected'))}</span>`;
const command=(name,label,ctx,{disabled=false,primary=false}={})=>`<button type="button" class="trial-request-button${primary?' trial-request-primary':''}" data-action="trial-request-command" data-command="${name}"${disabled?' disabled':''}>${ctx.esc(label)}</button>`;
function sourceMessage(model,ctx){return model.loading?ctx.t('正在載入試課申請…','Loading trial requests…'):model.error||model.sourceError?ctx.t('未能載入試課申請，請重試。','Could not load trial requests. Please retry.'):ctx.t('試課申請資料暫未提供。','Trial request details are unavailable.');}
function requestSummary(record,ctx){
 const {t,esc}=ctx;
 return `<section class="trial-request-context"><div><strong>${applicantName(record,ctx)}</strong>${statusMarkup(record,ctx)}</div><p>${esc(record.reference)}</p><h3>${fieldValue(record.slot.courseName,ctx)}</h3><p><time datetime="${esc(record.slot.date)}">${esc(record.slot.date)}</time> · ${esc(record.slot.time)} · ${esc(record.slot.duration)} ${esc(t('分鐘','minutes'))}</p><p>${esc(t('老師','Teachers'))}：${names(record.slot.teacherNames,ctx)}</p><p>${esc(t('課室','Rooms'))}：${names(record.slot.roomNames,ctx)}</p></section>`;
}
function requestCard(record,ctx,{readonly=false}={}){
 const {t,esc}=ctx;
 return `<article class="trial-request-card"><div class="trial-request-card-heading"><h3>${applicantName(record,ctx)}</h3>${statusMarkup(record,ctx)}</div><p class="trial-request-reference">${esc(record.reference)}</p><p>${fieldValue(record.slot.courseName,ctx)}</p><p><time datetime="${esc(record.slot.date)}">${esc(record.slot.date)}</time> · ${esc(record.slot.time)} · ${esc(record.slot.duration)} ${esc(t('分鐘','minutes'))}</p><p class="trial-request-created">${esc(t('收到申請','Received'))} · ${timestamp(record.createdAt,ctx)}</p>${readonly?'':`<button type="button" class="trial-request-button" data-action="trial-request-open" data-request-id="${esc(record.id)}" aria-label="${esc(t('查看申請','View request')+' · '+record.reference+' · '+text(record.applicant.displayName))}">${esc(t('查看申請','View request'))}</button>`}</article>`;
}
export function trialRequestsMarkup(model={},suppliedContext={}){
 const ctx=context(suppliedContext),{t,esc}=ctx,known=model.ready===true&&!model.error&&!model.sourceError&&validRows(model.records)&&Number.isSafeInteger(model.total)&&model.total>=0&&Number.isSafeInteger(model.page)&&model.page>0&&Number.isSafeInteger(model.pageSize)&&model.pageSize>0&&model.pageSize<=100,heading=model.embedded?'':`<h2>${esc(t('試課申請','Trial requests'))}</h2>`;
 if(!known)return `<section class="trial-requests" aria-label="${esc(t('試課申請','Trial requests'))}" aria-busy="${!!model.loading}">${heading}<p class="trial-requests-source" role="${model.error||model.sourceError?'alert':'status'}">${esc(sourceMessage(model,ctx))}</p>${model.loading?'':`<button type="button" class="trial-request-button" data-action="trial-requests-retry">${esc(t('重試','Retry'))}</button>`}</section>`;
 const pages=Math.max(1,Math.ceil(model.total/model.pageSize)),page=model.page,controls=pages>1?`<nav class="trial-requests-pagination" aria-label="${esc(t('試課申請分頁','Trial request pages'))}"><button type="button" class="trial-request-button" data-action="trial-requests-page" data-page="${Math.max(1,page-1)}"${page===1||model.loading?' disabled':''}>${esc(t('上一頁','Previous'))}</button><span>${esc(t(`第 ${page} / ${pages} 頁 · 共 ${model.total} 筆`,`Page ${page} of ${pages} · ${model.total} requests`))}</span><button type="button" class="trial-request-button" data-action="trial-requests-page" data-page="${page+1}"${page>=pages||model.loading?' disabled':''}>${esc(t('下一頁','Next'))}</button></nav>`:'';
 const body=model.records.length?`<div class="trial-requests-list">${model.records.map(row=>requestCard(row,ctx)).join('')}</div>`:`<p class="trial-requests-empty">${esc(model.total===0?t('暫時沒有試課申請。','No trial requests yet.'):t('這一頁沒有試課申請。','No trial requests on this page.'))}</p>`;
 return `<section class="trial-requests" aria-label="${esc(t('試課申請','Trial requests'))}" aria-busy="${!!model.loading}">${heading}${model.loading?`<p role="status">${esc(t('正在更新申請…','Updating requests…'))}</p>`:''}${body}${controls}${model.hasMore===true?`<button type="button" class="trial-request-button" data-action="trial-requests-view-all">${esc(t('查看所有申請','View all requests'))}</button>`:''}</section>`;
}
function applicantDetails(record,ctx){
 const {t,esc}=ctx,person=record.applicant,gender={male:t('男','Male'),female:t('女','Female'),unspecified:t('不透露','Prefer not to say')};
 const fields=[['中文姓名','Chinese name',person.localName],['英文姓名','English name',person.fullName],['出生日期','Date of birth',validDate(person.dateOfBirth)?person.dateOfBirth:''],['性別','Gender',Object.hasOwn(gender,person.gender)?gender[person.gender]:''],['學校','School',person.school],['介紹人','Referrer',person.referrer],['家長姓名','Parent name',person.parentName],['WhatsApp','WhatsApp',person.whatsapp],['電郵','Email',person.email],['備註','Remark',person.remark]];
 return `<dl class="trial-request-facts">${fields.map(([zh,en,value])=>`<div><dt>${esc(t(zh,en))}</dt><dd>${fieldValue(value,ctx)}</dd></div>`).join('')}</dl>`;
}
function eventHistory(record,ctx){
 const {t,esc}=ctx,events=Array.isArray(record.events)?record.events:[],label=type=>type==='submitted'?t('收到申請','Application received'):type==='rejected'?t('拒絕申請','Request rejected'):t('記錄更新','Record updated');
 return `<section class="trial-request-history"><h3>${esc(t('申請記錄','Request history'))}</h3>${events.length?`<ol>${events.map(event=>`<li><strong>${esc(label(event?.type))}</strong><span>${timestamp(event?.createdAt,ctx)}</span>${text(event?.actor?.displayName)?`<span>${esc(event.actor.displayName)}</span>`:''}</li>`).join('')}</ol>`:`<p>${esc(t('記錄暫未提供。','History is not provided.'))}</p>`}</section>`;
}
const canReject=state=>state.ready===true&&validRecord(state.record)&&state.record.status==='pending'&&state.record.canReject===true&&!state.readonly&&!state.busy&&(state.uncertain===true||!state.loading&&!state.stale&&!state.sourceError);
export function advanceTrialRequest(state={},action){
 if(state.busy||state.uncertain===true)return state;
 if(action==='back')return {...state,step:'details',error:''};
 if(action==='review-rejection'&&canReject(state))return {...state,step:'reject-review',error:''};
 return state;
}
export function trialRequestDialogMarkup(state={},suppliedContext={}){
 const ctx=context(suppliedContext),{t,esc}=ctx,uncertain=state.uncertain===true,known=state.ready===true&&(!state.sourceError||uncertain)&&validRecord(state.record),busy=!!state.busy,review=known&&state.step==='reject-review'&&!state.readonly,title=review?t('核對拒絕申請','Review rejection'):t('試課申請','Trial request');
 const message=uncertain?t('暫未確認處理結果，請重試核對同一筆申請。','The result has not been confirmed. Retry this same request.'):state.stale?t('這筆申請已更新，請重新載入核對。','This request changed. Reload it before continuing.'):known?text(state.error):'';
 const feedback=`<p id="trial-request-error" class="trial-request-error" role="alert" tabindex="-1"${message?'':' hidden'}>${esc(message)}</p>`;
 const body=!known?`<p class="trial-requests-source" role="${state.error||state.sourceError?'alert':'status'}">${esc(sourceMessage(state,ctx))}</p>`:requestSummary(state.record,ctx)+(review?`<p class="trial-request-reject-note">${esc(t('拒絕此申請後，預留的試課名額將會釋放。','Rejecting this request will release its reserved trial place.'))}</p>`:applicantDetails(state.record,ctx)+eventHistory(state.record,ctx));
 const listReturn=state.returnToList===true?command('list',t('返回申請','Back to applications'),ctx,{disabled:busy||uncertain}):'',reload=state.stale&&!uncertain?command('retry',t('重新載入','Reload'),ctx,{disabled:busy||!!state.loading}):'';
 const footer=!known?listReturn+command('close',t('關閉','Close'),ctx,{disabled:busy})+command('retry',t('重試','Retry'),ctx,{disabled:busy||!!state.loading}):review?command('back',t('返回','Back'),ctx,{disabled:busy||uncertain})+reload+command('reject',busy?t('正在處理…','Processing…'):uncertain?t('重試拒絕申請','Retry rejection'):t('拒絕申請','Reject request'),ctx,{primary:true,disabled:!canReject(state)}):listReturn+command('close',t('關閉','Close'),ctx,{disabled:busy})+reload+(state.record.status==='pending'&&state.record.canReject===true&&!state.readonly?command('review-rejection',t('拒絕申請','Reject request'),ctx,{disabled:!canReject(state)||uncertain}):'');
 return `<div class="modal trial-request-modal" role="dialog" aria-modal="true" aria-labelledby="trial-request-title"><div class="dialog trial-request-dialog" tabindex="-1" aria-busy="${busy}"><header class="trial-request-header"><h2 id="trial-request-title">${esc(title)}</h2><button type="button" class="trial-request-button trial-request-close" data-action="trial-request-command" data-command="close" aria-label="${esc(t('關閉','Close'))}"${busy?' disabled':''}>×</button></header>${feedback}<div id="trial-request-body" class="trial-request-body" tabindex="0">${body}</div><footer class="trial-request-footer">${footer}</footer></div></div>`;
}
export function trialHistoryMarkup(model={},suppliedContext={}){
 const ctx=context(suppliedContext),{t,esc}=ctx,known=identified(model.personId)&&model.ready===true&&!model.error&&validRows(model.records)&&model.records.every(row=>row.personId===model.personId);
 return `<section class="trial-request-person-history"><h2>${esc(t('試課記錄','Trial records'))}</h2>${!known?`<p class="trial-requests-source" role="${model.error?'alert':'status'}">${esc(sourceMessage(model,ctx))}</p>`:model.records.length?`<div class="trial-requests-list">${model.records.map(row=>requestCard(row,ctx,{readonly:true})+eventHistory(row,ctx)).join('')}</div>`:`<p class="trial-requests-empty">${esc(t('暫時沒有試課記錄。','No trial records yet.'))}</p>`}</section>`;
}
