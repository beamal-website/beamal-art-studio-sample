// Interface drafts only. No account activation, API, browser storage, delivery or
// enrollment happens here. Launch with {view,data:{student,courses,slots}} to keep
// authorized facts in the same snapshot for rendering and command validation.
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const views=new Set(['activation','family-enrolment','trial-application']);
const objectRows=value=>Array.isArray(value)?value.filter(row=>row&&typeof row==='object'):[];
const firstStep=view=>view==='activation'?'details':view==='family-enrolment'?'route':'selection';
const currentStep=state=>!state.step||state.step==='edit'?firstStep(state.view):state.step;
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const forCourse=(slot,id)=>String(slot.courseId??slot.course??'')===String(id);
const available=slot=>slot&&slot.active!==false&&slot.full!==true&&Number.isFinite(Number(slot.available))&&Number(slot.available)>0;
const label=(row,t)=>t(row.courseNameZh||row.nameZh||row.courseName||row.name||'',row.courseNameEn||row.nameEn||row.courseName||row.name||'');

export function getAccountActionsData(){return {
 fictional:true,
 student:{id:'example-child',displayName:'何詠晴 Chloe Ho（虛構）',dateOfBirth:'2017-04-18',email:'student@example.test',activationStatus:'not-activated'},
 courses:[{id:'example-drawing',courseName:'創意繪畫',courseNameEn:'Creative Drawing'},{id:'example-clay',courseName:'陶藝小工房',courseNameEn:'Clay workshop'}],
 slots:[{id:'example-slot-1',courseId:'example-drawing',date:'2026-10-17',time:'11:00',duration:60,teacher:'陳子朗 Leo Chan（虛構）',available:2},{id:'example-slot-full',courseId:'example-drawing',date:'2026-10-17',time:'15:00',duration:60,teacher:'林雅晴 Maya Lam（虛構）',available:0},{id:'example-slot-clay',courseId:'example-clay',date:'2026-10-18',time:'10:30',duration:60,teacher:'許悅童 Ava Hui（虛構）',available:3}],
};}

function factsFor(state={},ctx={}){
 const supplied=state.data||ctx.data||ctx.facts||(state.courses||state.slots?state:null)||(ctx.courses||ctx.slots?ctx:null);
 if(supplied)return {fictional:supplied.fictional===true,student:state.student||ctx.student||supplied.student||{},courses:objectRows(supplied.courses),slots:objectRows(supplied.slots)};
 return {...getAccountActionsData(),student:state.student||ctx.student||getAccountActionsData().student};
}

export function advanceAccountActions(input={},command,fields={}){
 if(command==='close')return null;
 if(command==='launch'){
  const view=fields.view||input.view;if(!views.has(view))return null;
  const supplied=fields.data||(['courses','slots'].some(key=>Object.hasOwn(fields,key))?{courses:fields.courses,slots:fields.slots,student:fields.student,fictional:fields.fictional}:null);
  const data=structuredClone(factsFor({data:supplied,student:fields.student||input.student}));
  return {view,step:firstStep(view),data,draft:{...(fields.draft||{}),...(view==='trial-application'?{route:'trial'}:{})},error:''};
 }
 if(!input||!views.has(input.view))return input;
 const state={...input,data:input.data||factsFor(input),draft:{...input.draft},error:''},step=currentStep(state);
 const course=state.data.courses.find(row=>String(row.id)===String(state.draft.courseId));
 const slot=state.data.slots.find(row=>String(row.id)===String(state.draft.slotId));
 if(command==='select-course'){
  if(!state.data.courses.some(row=>String(row.id)===String(fields.id)))return {...state,error:'choose-course'};
  state.draft.courseId=String(fields.id);delete state.draft.slotId;return {...state,step:'selection'};
 }
 if(command==='select-slot'){
  const selected=state.data.slots.find(row=>String(row.id)===String(fields.id));
  if(!course||!forCourse(selected||{},course.id)||!available(selected))return {...state,error:'slot-unavailable'};
  state.draft.slotId=String(selected.id);return state;
 }
 if(command==='back'){
  const previous=step==='complete'?'review':step==='review'?'details':step==='details'&&state.view!=='activation'?'selection':firstStep(state.view);
  return {...state,step:previous};
 }
 if(command==='complete')return step==='review'?{...state,step:'complete'}:state;
 if(!['next','submit'].includes(command))return state;
 if(state.view==='activation'){
  const operation=fields.value||fields.operation||state.draft.operation;
  return ['activate','reset-password'].includes(operation)?{...state,step:'review',draft:{...state.draft,operation}}:{...state,error:'choose-operation'};
 }
 if(step==='route')return {...state,step:'selection',draft:{...state.draft,route:fields.route==='direct'?'direct':'trial'}};
 if(step==='selection'){
  if(!course)return {...state,error:'choose-course'};
  if(!slot||!forCourse(slot,course.id)||!available(slot))return {...state,error:'choose-slot'};
  return {...state,step:'details'};
 }
 if(step==='details'){
  for(const key of ['displayName','dateOfBirth','parentName','whatsapp','email','school','referrer','remark'])if(Object.hasOwn(fields,key))state.draft[key]=String(fields[key]??'').trim();
  if(!state.draft.displayName||!state.draft.parentName)return {...state,error:'details-required'};
  if(state.draft.dateOfBirth&&!validDate(state.draft.dateOfBirth))return {...state,error:'birth-date-invalid'};
  const digits=String(state.draft.whatsapp||'').replace(/\D/g,'');
  if(!/^\+?[\d ()-]+$/.test(state.draft.whatsapp||'')||digits.length<7||digits.length>15)return {...state,error:'whatsapp-invalid'};
  if(state.draft.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.draft.email))return {...state,error:'email-invalid'};
  return {...state,step:'review'};
 }
 return state;
}

export function accountActionsMarkup(state={},ctx={}){
 if(!state||!views.has(state.view))return '';
 const t=ctx.t||((_zh,en)=>en),esc=ctx.esc||escape,data=factsFor(state,ctx),draft=state.draft||{},step=currentStep(state),student=data.student||{};
 const button=(command,text,extra='',primary=false)=>`<button type="button" class="aa-button ${primary?'aa-primary':'aa-secondary'}" data-action="ui-account-actions" data-ui-command="${command}" ${extra}>${text}</button>`;
 const submit=text=>`<button type="submit" class="aa-button aa-primary" form="ui-account-actions-form">${text}</button>`;
 const field=(title,name,value='',extra='')=>`<label class="aa-field"><span>${title}</span><input name="${name}" value="${esc(value)}" ${extra}></label>`;
 const form=body=>`<form id="ui-account-actions-form" data-ui-command="next">${body}</form>`;
 const errors={
  'choose-operation':t('請選擇帳戶操作。','Choose an account action.'),
  'choose-course':t('請先選擇課程。','Choose a course first.'),
  'choose-slot':t('請選擇尚有名額的課節。','Choose an available lesson time.'),
  'slot-unavailable':t('此時段未能選擇，請選擇另一課節。','This lesson time is unavailable. Choose another time.'),
  'details-required':t('請填寫學生及家長姓名。','Enter the student and parent names.'),
  'birth-date-invalid':t('請核對出生日期。','Check the date of birth.'),
  'whatsapp-invalid':t('請填寫有效的 WhatsApp 聯絡號碼。','Enter a valid WhatsApp contact number.'),
  'email-invalid':t('請核對電郵地址，或暫時留空。','Check the email address or leave it blank.'),
 };
 const error=errors[state.error]||state.error||'';
 const course=data.courses.find(row=>String(row.id)===String(draft.courseId)),slot=data.slots.find(row=>String(row.id)===String(draft.slotId));
 const route=draft.route==='direct'?'Direct Enrollment':'Trial Class';
 let title=state.view==='activation'?t('帳戶啟用與密碼','Account activation and password'):state.view==='family-enrolment'?t('家庭成員報名','Family member enrollment'):t('申請試堂','Trial application'),body='',footer='';
 const summary=rows=>`<dl class="aa-summary">${rows.map(([key,value])=>`<div><dt>${key}</dt><dd>${esc(value||'—')}</dd></div>`).join('')}</dl>`;
 if(step==='complete'){
  const message=state.view==='activation'?t('沒有寄出電郵，帳戶狀態及密碼沒有改動。','No email was sent. Account access and passwords have not changed.'):t('沒有提交申請、建立訂單或預留名額。','No application was submitted. No order or seat reservation was created.');
  body=`<section class="aa-complete"><span aria-hidden="true">✓</span><h3>${t('已完成本次預覽','This preview is complete')}</h3><p>${message}</p></section>`;
  footer=button('back',t('返回核對','Back to review'))+button('close',t('完成','Done'),'',true);
 }else if(state.view==='activation'){
  const status=student.activationStatus||student.status||'not-activated',statusText=['not-activated','inactive','NotActivated'].includes(status)?'Not Activated':status==='active'||status==='activated'?t('已啟用','Activated'):String(status);
  body=summary([[t('學生','Student'),student.displayName||student.name],[t('登入電郵','Login email'),student.email],[t('帳戶狀態','Account status'),statusText]]);
  if(step==='review'){
   const reset=draft.operation==='reset-password';body+=`<section class="aa-confirmation"><h3>${reset?t('確認重設密碼預覽','Confirm password reset preview'):t('確認啟用帳戶預覽','Confirm account activation preview')}</h3><p>${reset?t('正式接駁後，會由帳戶服務處理密碼重設。此預覽不會顯示或改動密碼。','When connected, the account service handles password resets. This preview does not display or change passwords.'):t('正式接駁後，會由帳戶服務核對身份及寄出啟用指引。此預覽不會授予登入權限。','When connected, the account service checks identity and delivers activation instructions. This preview does not grant login access.')}</p></section>`;
   footer=button('back',t('返回','Back'))+button('complete',t('確認預覽','Confirm preview'),'',true);
  }else{
   body+=`<p class="aa-note">${t('選擇操作後先核對資料。這裡不會寄送通知、建立帳戶或改動密碼。','Review the details before confirming. No notification, account creation or password change occurs here.')}</p>`;
   footer=button('next','Activate Account','data-ui-value="activate"',true)+button('next','Reset Password','data-ui-value="reset-password"');
  }
 }else if(step==='route'){
  body=form(`<h3>${t('選擇報名方式','Choose an enrollment route')}</h3><div class="aa-route-options">${[['trial','Trial Class','先申請試堂，再由老師跟進。','Request a trial before the teacher follows up.'],['direct','Direct Enrollment','直接選擇課程及課節，再核對資料。','Choose a course and lesson before reviewing details.']].map(([id,text,zh,en])=>`<label class="aa-route"><input type="radio" name="route" value="${id}" ${(draft.route||'trial')===id?'checked':''}><span><strong>${text}</strong><small>${t(zh,en)}</small></span></label>`).join('')}</div>`);
  footer=button('close',t('取消','Cancel'))+submit(t('下一步：選課','Next: choose a course'));
 }else if(step==='selection'){
  body=`<div class="aa-selection-heading"><h3>${t('選擇課程','Choose a course')}</h3><span>${route}</span></div><div class="aa-courses">${data.courses.map(row=>button('select-course',esc(label(row,t)),`data-ui-id="${esc(row.id)}" aria-pressed="${String(row.id)===String(draft.courseId)}"`)).join('')||`<p class="aa-empty">${t('暫未有可選課程。','No courses are available.')}</p>`}</div><h3>${t('選擇課節','Choose a lesson time')}</h3><div class="aa-slots">${!course?`<p class="aa-empty">${t('選擇課程後，會在這裡顯示可選課節。','Choose a course to see its lesson times.')}</p>`:data.slots.filter(row=>forCourse(row,course.id)).map(row=>`<article class="aa-slot ${String(row.id)===String(draft.slotId)?'is-selected':''}"><div><strong>${esc(row.date||'—')} · ${esc(row.time||'—')}</strong><p>${esc(row.duration||'—')} ${t('分鐘','min')}${row.teacher?' · '+esc(row.teacher):''}</p><small>${available(row)?esc(row.available)+' '+t('個可選名額','places available'):t('未能選擇／已滿','Unavailable / full')}</small></div>${button('select-slot',available(row)?String(row.id)===String(draft.slotId)?t('已選擇','Selected'):t('選擇','Choose'):t('已滿／未提供','Full / unavailable'),`data-ui-id="${esc(row.id)}" aria-pressed="${String(row.id)===String(draft.slotId)}" ${available(row)?'':'disabled'}`)}</article>`).join('')||`<p class="aa-empty">${t('暫未有可選課節。','No lesson times are available.')}</p>`}</div>`;
  footer=button(state.view==='family-enrolment'?'back':'close',t('返回','Back'))+button('next',t('下一步：填寫資料','Next: student details'),'',true);
 }else if(step==='details'){
  body=`<p class="aa-selection-summary">${esc(course?label(course,t):'')} · ${esc(slot?.date||'')} ${esc(slot?.time||'')}</p>`+form(`<div class="aa-fields-two">${field(t('學生姓名','Student name'),'displayName',draft.displayName??(state.view==='trial-application'?student.displayName||student.name||'':''),'required maxlength="120" autocomplete="name"')}${field(t('出生日期（選填）','Date of birth (optional)'),'dateOfBirth',draft.dateOfBirth??(state.view==='trial-application'?student.dateOfBirth||'':''),'type="date"')}${field(t('家長姓名','Parent name'),'parentName',draft.parentName||'','required maxlength="120" autocomplete="name"')}${field(t('WhatsApp 聯絡號碼','WhatsApp contact number'),'whatsapp',draft.whatsapp||'','type="tel" required maxlength="24" autocomplete="tel"')}${field(t('電郵（選填）','Email (optional)'),'email',draft.email||'','type="email" maxlength="200" autocomplete="email"')}${field(t('學校（選填）','School (optional)'),'school',draft.school||'','maxlength="200"')}${field(t('介紹人／得知途徑（選填）','Referrer / source (optional)'),'referrer',draft.referrer||'','maxlength="200"')}</div><label class="aa-field"><span>${t('補充內容（選填）','Additional details (optional)')}</span><textarea name="remark" rows="3" maxlength="1000">${esc(draft.remark||'')}</textarea></label>`);
  footer=button('back',t('返回選課','Back to lesson times'))+submit(t('下一步：核對','Next: review'));
 }else if(step==='review'){
  body=`<h3>${t('核對資料','Review details')}</h3>`+summary([[t('報名方式','Enrollment route'),route],[t('課程','Course'),course?label(course,t):''],[t('課節','Lesson time'),slot?`${slot.date} · ${slot.time}`:''],[t('學生','Student'),draft.displayName],[t('出生日期','Date of birth'),draft.dateOfBirth],[t('家長','Parent'),draft.parentName],[t('WhatsApp','WhatsApp'),draft.whatsapp],[t('電郵','Email'),draft.email],[t('學校','School'),draft.school],[t('介紹人／得知途徑','Referrer / source'),draft.referrer],[t('補充內容','Additional details'),draft.remark]])+`<p class="aa-note">${t('請核對內容。這一步只展示確認流程，沒有提交、收款或預留名額。','Review the details. This confirms the interface flow only; nothing is submitted, paid or reserved.')}</p>`;
  footer=button('back',t('返回修改','Back to edit'))+button('complete',t('確認預覽','Confirm preview'),'',true);
 }
 return `<div class="modal aa-modal" role="dialog" aria-modal="true" aria-labelledby="aa-title" aria-describedby="aa-preview-note"><div class="dialog aa-dialog" tabindex="-1"><header class="aa-header"><div><small>${t('介面預覽','Interface preview')}</small><h2 id="aa-title">${title}</h2></div>${button('close','×',`aria-label="${t('關閉','Close')}"`)}</header><div class="aa-body"><p id="aa-preview-note" class="aa-preview-note">${data.fictional?`<strong>${t('虛構示例','Fictional example')}</strong>`:''}<span>${t('只檢視畫面及流程，不會改動帳戶或提交申請。','Review the screen and flow only. No account changes or applications are submitted.')}</span></p>${body}${error?`<p class="aa-error" role="alert">${esc(error)}</p>`:''}</div><footer class="aa-footer">${footer}</footer></div></div>`;
}
