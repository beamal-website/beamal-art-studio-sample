import {operationsPageMarkup,operationsDialogMarkup,getOperationsPreviewData,advanceOperationsPreview,accountingEntrySummaryMarkup,accountingEntryStudentMarkup} from './operations-ui.js';
import {staffDirectoryMarkup,staffPortalMarkup,staffDialogMarkup,staffInterfacePreviewState,advanceStaffPreview,staffWorkflowFacts,staffPayrollModel,staffAttendanceModel,staffLeaveModel,staffRosterModel,staffCalendarSharingModel,staffProfileModel} from './staff-portal-ui.js';
import {payrollPageMarkup,payrollDialogMarkup,advancePayrollUi} from './staff-payroll-ui.js';
import {attendancePageMarkup,attendanceDialogMarkup,advanceAttendanceUi} from './staff-attendance-ui.js';
import {leavePageMarkup,leaveDialogMarkup,advanceLeaveUi} from './staff-leave-ui.js';
import {rosterPageMarkup,rosterDialogMarkup,advanceRosterUi} from './staff-roster-ui.js';
import {calendarSharingDialogMarkup,advanceCalendarSharingUi,calendarSharingCopySource} from './staff-calendar-sharing-ui.js';
import {staffProfileDialogMarkup,advanceStaffProfileUi} from './staff-profile-ui.js';
import {lessonWorkflowMarkup,getLessonWorkflowData,advanceLessonWorkflow} from './lesson-workflow-ui.js';
import {sharedLessonWorkflowMarkup,advanceSharedLessonWorkflow} from './shared-lesson-workflow-ui.js';
import {dataToolsMarkup,advanceDataTools} from './data-tools-ui.js';
import {getStudentPortalData,studentPortalPageMarkup,studentPortalDialogMarkup,advanceStudentPortal} from './student-portal-ui.js';
import {accountActionsMarkup,advanceAccountActions} from './account-actions-ui.js';
import {staffSharedState} from './staff-shared-adapter.js';

// Presentation drafts are deliberately separate from shared business records.
// No API client, browser storage, account changes or message delivery lives here.
export function createInterfacePreview({context,showModal,cacheModal=()=>{},repaint,dom=document,Form=FormData,sharedSnapshot,onOpenStaffLesson,onEditStaff,onManageStaffAccess,onRetryStaff,onCopyCalendarSharing,resolveSharedLesson,onCloseSharedLesson,onSaveSharedAttendance}) {
  let sharedAttendanceJob=null;
  let productOwner=null,productEditPosition=null,productDetailPosition=null,productListReturn=null,productSourceProvided=false,productRendering=false;
  let operations,staff,student,documentPreview=null,account=null,lesson=null,dataTools=null,overlay=null,returnFocus=null,accountingReturns=[],accountingListReturn=null,messageListReturn=null,messageComposeReturn=null,staffReturn=null,staffManagementSection='directory',staffHrReturn=null,staffHrContext='',staffHrPositions=[],calendarCopyEpoch=0,sharedLesson=null,sharedLessonTicket=null,sharedLessonEditPosition=null;
  const fresh=()=>{productOwner=null;productEditPosition=null;productDetailPosition=null;productListReturn=null;productSourceProvided=false;calendarCopyEpoch++;messageListReturn=null;messageComposeReturn=null;operations={data:getOperationsPreviewData(),today:context()?.today,query:'',status:'all',category:'all',accountingTab:'invoices',selectedThreadId:'thread-1',settingsTab:'general',dialog:null,notice:''};staff=staffInterfacePreviewState();student={data:getStudentPortalData(),section:'profile',requestFilter:'all',notificationFilter:'all',query:'',selectedStudentId:'child-1',dialog:null,notice:''};account=null;lesson=null;dataTools=null;overlay=null;sharedLesson=null;sharedLessonTicket=null;sharedLessonEditPosition=null;};
  fresh();
  const ctx=()=>{const current=context()||{};return {...current,esc:current.esc||(value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])))};};
  const productDialog=dialog=>['product','view-product','create-product','edit-product','stock-product','product-review','stock-product-review'].includes(dialog?.type);
  const productContextKey=()=>{
    const current=ctx();
    if(current.sharedMode&&(current.role!=='admin'||!current.sharedIdentity))return '';
    return JSON.stringify([current.sharedMode?current.sharedIdentity:'presentation',current.role||'',current.staffViewKey||'']);
  };
  const discardProduct=()=>{
    const open=overlay==='operations'&&productDialog(operations.dialog);
    if(productDialog(operations.dialog)){operations.dialog=null;operations.draft={};}
    if(open){overlay=null;returnFocus=null;showModal('');}
    productOwner=null;productEditPosition=null;productDetailPosition=null;productListReturn=null;
  };
  const rememberProductOwner=()=>{
    const dialog=operations.dialog;
    if(!productDialog(dialog)){productOwner=null;return true;}
    const selected=dialog.type==='create-product'||dialog.originType==='create-product'?'':dialog.id;
    const matches=selected?operations.data.products.filter(row=>row.id===selected):[];
    if(selected&&matches.length!==1){discardProduct();return false;}
    productOwner={key:productContextKey(),selectedId:selected,sourceKey:selected?JSON.stringify(matches[0]):'',provided:ctx().productsContext!==undefined,stale:false};return true;
  };
  const syncProductSource=()=>{
    const current=ctx(),key=productContextKey(),open=overlay==='operations'&&productDialog(operations.dialog);
    if(!key||open&&productOwner&&productOwner.key!==key){
      discardProduct();operations.data.products=[];operations.productSource={status:'unavailable'};return false;
    }
    const source=current.productsContext;
    if(source===undefined&&productSourceProvided){discardProduct();operations.data.products=[];operations.productSource={status:'unavailable'};return false;}
    if(source===undefined){
      operations.productSource={status:'ready'};
      return true;
    }
    productSourceProvided=true;
    const position=open?productPosition():null;
    if(open)harvestProduct();
    const before=open?operationsDialogMarkup(operations,ctx()):'';
    const validRecords=Array.isArray(source?.records)&&source.records.every(row=>row&&typeof row==='object'&&!Array.isArray(row)&&typeof row.id==='string'&&!!row.id.trim());
    const status=source&&['ready','loading','error','unavailable'].includes(source.status)?source.status:'unavailable';
    operations.productSource={status:status==='ready'&&!validRecords?'unavailable':status,error:typeof source?.error==='string'?source.error:''};
    if(operations.productSource.status==='ready')operations.data.products=JSON.parse(JSON.stringify(source.records));
    else if(!open)operations.data.products=[];
    if(open&&operations.productSource.status==='ready'&&productOwner?.selectedId){
      const rows=operations.data.products.filter(row=>row.id===productOwner.selectedId);
      if(rows.length!==1){discardProduct();return false;}
      if(['edit-product','product-review','stock-product','stock-product-review'].includes(operations.dialog.type)){
        if(JSON.stringify(rows[0])!==productOwner.sourceKey)productOwner.stale=true;
        if(productOwner.stale)operations.productSource={status:'error',error:current.t('產品資料已更新。已填內容保留；請關閉後重新開啟。','Product details changed. Your entries are kept; close and reopen the product.')};
      }else{productOwner.sourceKey=JSON.stringify(rows[0]);productOwner.stale=false;}
    }
    if(open){const html=operationsDialogMarkup(operations,ctx());if(html!==before){
      const alert=dom.querySelector('#ops-product-source-error'),form=dom.querySelector('#ui-operations-form');
      if(['create-product','edit-product','stock-product','product-review','stock-product-review'].includes(operations.dialog?.type)&&alert&&form){
        const source=operations.productSource,message=source.status==='ready'?'':source.error||current.t(source.status==='loading'?'正在讀取產品資料，請稍候。':'產品資料暫未提供，請重新開啟產品頁。',source.status==='loading'?'Product details are loading. Please wait.':'Product data is unavailable. Reopen Products to try again.');
        alert.textContent=message;alert.hidden=!message;
        const submit=[...dom.querySelectorAll('#ui-operations-form button')].find(node=>node.type==='submit');
        if(submit)submit.disabled=['product-review','stock-product-review'].includes(operations.dialog.type)||source.status!=='ready';
        cacheModal(html);
      }else{showModal(html);restoreProductPosition(position);}
    }}
    return true;
  };
  const sharedLessonControls=()=>[...dom.querySelectorAll('#modal-root .slw-dialog button,#modal-root .slw-dialog input,#modal-root .slw-dialog select,#modal-root .slw-dialog textarea,#modal-root .slw-dialog summary')];
  const sharedLessonNotes=()=>[...dom.querySelectorAll('#modal-root .slw-dialog details[data-slw-note]')];
  const sharedLessonPosition=()=>{
    const active=dom.activeElement,body=dom.querySelector('#modal-root .slw-body');
    return {top:body?.scrollTop||0,left:body?.scrollLeft||0,element:active,name:active?.name,tag:active?.tagName,index:sharedLessonControls().indexOf(active),start:active?.selectionStart,end:active?.selectionEnd,notes:sharedLessonNotes().filter(node=>node.dataset?.slwNote).map(node=>({key:node.dataset.slwNote,open:node.open===true}))};
  };
  const restoreSharedLessonPosition=position=>{
    if(!position)return;
    const notes=new Map((position.notes||[]).map(note=>[note.key,note.open]));
    for(const note of sharedLessonNotes())if(notes.has(note.dataset?.slwNote))note.open=notes.get(note.dataset.slwNote);
    const usable=node=>node&&node.isConnected!==false&&!node.disabled,controls=sharedLessonControls();
    const target=usable(position.element)?position.element:controls.find(node=>usable(node)&&position.name&&node.name===position.name&&node.tagName===position.tag)||controls[position.index];
    if(usable(target)){target.focus({preventScroll:true});if(typeof position.start==='number'&&typeof target.setSelectionRange==='function')try{target.setSelectionRange(position.start,position.end);}catch{}}
    const body=dom.querySelector('#modal-root .slw-body');if(body){body.scrollTop=position.top;body.scrollLeft=position.left;}
  };
  const captureSharedLessonDraft=form=>{
    if(overlay!=='shared-lesson'||sharedLesson?.step!=='edit'||sharedLesson?.busy)return false;
    form??=dom.querySelector('#shared-lesson-workflow-form');
    if(!form||form.id!=='shared-lesson-workflow-form')return false;
    sharedLesson=advanceSharedLessonWorkflow(sharedLesson,'draft',Object.fromEntries(new Form(form)));return true;
  };
  const discardSharedLesson=({restore=false,draw=true}={})=>{
    const ticket=sharedLessonTicket;
    sharedLesson=null;sharedLessonTicket=null;sharedLessonEditPosition=null;sharedAttendanceJob=null;
    if(overlay==='shared-lesson')overlay=null;
    if(draw){returnFocus=null;showModal('');}
    if(ticket&&typeof onCloseSharedLesson==='function')onCloseSharedLesson(ticket,{restore});
  };
  const syncSharedLesson=({capture=true}={})=>{
    if(overlay!=='shared-lesson'||!sharedLesson)return 'ready';
    const current=ctx();
    if(!current.sharedMode||!['admin','teacher'].includes(current.role)||!current.sharedIdentity||current.sharedIdentity!==sharedLesson.identity||typeof resolveSharedLesson!=='function'){
      discardSharedLesson();return 'invalid';
    }
    const resolved=resolveSharedLesson({sessionId:sharedLesson.lesson.id,returnTicket:sharedLessonTicket});
    if(!resolved||!['ready','loading','error'].includes(resolved.status)||resolved.returnTicket&&resolved.returnTicket!==sharedLessonTicket){discardSharedLesson();return 'invalid';}
    if(capture)captureSharedLessonDraft();
    if(resolved.status!=='ready'){
      sharedLesson={...sharedLesson,sourceStatus:resolved.status,sourceError:resolved.error||''};return resolved.status;
    }
    const facts=resolved.facts,original=sharedLesson;
    if(!facts||facts.identity!==current.sharedIdentity||facts.contextKey!==original.contextKey||facts.student?.id!==original.student.id||facts.lesson?.id!==original.lesson.id||facts.lesson.scheduleId!==original.lesson.scheduleId||facts.lesson.sequence!==original.lesson.sequence){discardSharedLesson();return 'invalid';}
    const changed=original.attendanceBase&&(original.attendanceBase.version!==facts.lesson.sessionVersion||original.attendanceBase.sourceVersion!==facts.lesson.sourceVersion);
    const stale=original.stale||!!(original.view==='attendance'&&changed&&!original.busy&&!original.unconfirmed);
    sharedLesson={...original,...structuredClone(facts),view:original.view,step:original.step,draft:original.draft,sourceStatus:'ready',sourceError:'',stale,capabilities:{review:true,save:facts.capabilities?.save===true&&typeof onSaveSharedAttendance==='function'}};return 'ready';
  };
  const openSharedLesson=(view,{sessionId}={})=>{
    const current=ctx();
    if(overlay||!['student','attendance','arrange'].includes(view)||!current.sharedMode||!['admin','teacher'].includes(current.role)||!current.sharedIdentity||!sessionId||typeof resolveSharedLesson!=='function'||typeof onCloseSharedLesson!=='function')return false;
    const resolved=resolveSharedLesson({sessionId,opener:dom.activeElement}),facts=resolved?.facts;
    if(resolved?.status!=='ready'||!resolved.returnTicket||!facts||facts.identity!==current.sharedIdentity||facts.lesson?.id!==sessionId||!facts.student?.id||!facts.contextKey)return false;
    sharedLesson={...structuredClone(facts),view,step:'edit',draft:{},sourceStatus:'ready',sourceError:'',attendanceBase:{version:facts.lesson.sessionVersion,sourceVersion:facts.lesson.sourceVersion},capabilities:{review:true,save:facts.capabilities?.save===true&&typeof onSaveSharedAttendance==='function'}};sharedLessonTicket=resolved.returnTicket;sharedLessonEditPosition=null;overlay='shared-lesson';returnFocus=null;redrawOverlay();return true;
  };
  const refreshSharedLesson=()=>{
    if(overlay!=='shared-lesson')return false;
    captureSharedLessonDraft();const before=sharedLessonWorkflowMarkup(sharedLesson,ctx()),position=sharedLessonPosition();
    if(syncSharedLesson({capture:false})==='invalid')return true;
    if(sharedLessonWorkflowMarkup(sharedLesson,ctx())!==before){redrawOverlay();restoreSharedLessonPosition(position);}return true;
  };
  const advanceSharedLesson=(command,fields={},form)=>{
    const status=syncSharedLesson();if(status==='invalid')return true;
    if(!sharedLesson)return true;
    if(sharedLesson.busy)return true;
    if(command==='close'){discardSharedLesson({restore:true});return true;}
    if(command==='save')return saveSharedAttendance();
    if(status!=='ready'&&!['draft','back'].includes(command)){redrawOverlay();return true;}
    if(form)captureSharedLessonDraft(form);
    if(command==='review'){
      const currentForm=form||dom.querySelector('#shared-lesson-workflow-form');
      if(currentForm?.id==='shared-lesson-workflow-form')fields={...Object.fromEntries(new Form(currentForm)),...fields};
    }
    const prior=sharedLesson.step,position=prior==='edit'?sharedLessonPosition():null;
    if(command==='back'){sharedLesson.operationKey=null;sharedLesson.unconfirmed=false;}
    sharedLesson=advanceSharedLessonWorkflow(sharedLesson,command,fields);
    if(prior==='edit'&&sharedLesson.step==='review')sharedLessonEditPosition=position;
    redrawOverlay();if(command==='back'&&sharedLesson.step==='edit')restoreSharedLessonPosition(sharedLessonEditPosition);return true;
  };
  const saveSharedAttendance=async()=>{
    if(!sharedLesson||sharedLesson.view!=='attendance'||sharedLesson.step!=='review'||sharedLesson.busy||sharedLesson.stale||sharedLesson.sourceStatus!=='ready'||sharedLesson.capabilities?.save!==true||typeof onSaveSharedAttendance!=='function')return true;
    const state=sharedLesson,base=state.attendanceBase;
    if(!Number.isSafeInteger(base?.version)||base.version<1||!Number.isSafeInteger(base.sourceVersion)||base.sourceVersion<1)return true;
    const checked=advanceSharedLessonWorkflow({...state,step:'edit'},'review',state.draft);if(checked.step!=='review'||checked.formError)return true;
    const draft=checked.draft,payload={sessionId:state.lesson.id,version:base.version,sourceVersion:base.sourceVersion,...(draft.attendance?{attendance:draft.attendance}:{})};
    for(const key of ['remark','sticker'])if(Object.hasOwn(draft,key))payload[key]=draft[key];
    if(Object.hasOwn(draft,'showRemark'))payload.showRemark=draft.showRemark==='yes';
    state.operationKey ||= typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'attendance-'+Date.now()+'-'+Math.random().toString(36).slice(2);
    const job={ticket:sharedLessonTicket,identity:state.identity,contextKey:state.contextKey};sharedAttendanceJob=job;sharedLesson={...state,busy:true,saveError:''};redrawOverlay();
    const current=()=>sharedAttendanceJob===job&&overlay==='shared-lesson'&&sharedLessonTicket===job.ticket&&sharedLesson?.identity===ctx().sharedIdentity&&sharedLesson.contextKey===job.contextKey;
    try{
      const result=await onSaveSharedAttendance(payload,{returnTicket:job.ticket,operationKey:state.operationKey});
      if(!current()||syncSharedLesson({capture:false})==='invalid')return true;
      const saved=result?.session;
      if(!saved||saved.id!==payload.sessionId||saved.studentId!==state.student.id||saved.scheduleId!==state.lesson.scheduleId||saved.sequence!==state.lesson.sequence||saved.sourceVersion!==base.sourceVersion||!Number.isSafeInteger(saved.version)||saved.version<=base.version||saved.attendance!==(payload.attendance??state.student.attendance)||['remark','showRemark'].some(key=>Object.hasOwn(payload,key)&&saved[key]!==payload[key])||Object.hasOwn(payload,'sticker')&&saved.stickerColor!==payload.sticker)throw new Error(ctx().t('未能確認儲存結果，請重試。','Could not confirm the saved result. Please retry.'));
      discardSharedLesson({restore:true});
    }catch(error){
      if(!current())return true;
      sharedLesson={...sharedLesson,busy:false,unconfirmed:!error.status||error.code==='service_unavailable'&&error.status>=200&&error.status<300,stale:sharedLesson.stale||error.status===409,saveError:error.status===409?ctx().t('出席資料已更新，已填內容保留。請重新開啟核對。','Attendance details changed. Your entries are kept; reopen to review the latest record.'):ctx().t('未能儲存，已填內容保留，請重試。','Could not save. Your entries are kept; please retry.')};
      redrawOverlay();dom.querySelector('#slw-save-error')?.focus({preventScroll:true});
    }finally{if(sharedAttendanceJob===job)sharedAttendanceJob=null;}
    return true;
  };
  const sharedPersonFacts=(view,personId)=>{
    const current=ctx(),scope=current.peopleContext,person=scope?.person;
    if(!current.sharedMode||current.role!=='admin'||!current.sharedIdentity||!scope?.allowed||!scope.ready||!personId||scope.personId!==personId||person?.id!==personId||!person.displayName||!['applicant','student'].includes(person.kind)||!['applicant','family','convert','activation'].includes(view)||view==='convert'&&person.kind!=='applicant')return null;
    return {shared:true,sharedPerson:true,sharedIdentity:current.sharedIdentity,personId,student:{...person},lesson:{},data:{students:[{...person}],slots:[],trialHistory:[]}};
  };
  const syncSharedPerson=()=>{
    const state=overlay==='lesson'&&lesson?.sharedPerson?lesson:overlay==='account'&&account?.sharedPerson?account:null;
    if(!state)return true;
    const facts=sharedPersonFacts(state.view,state.personId);
    if(!facts||facts.sharedIdentity!==state.sharedIdentity){lesson=null;account=null;overlay=null;return false;}
    if(overlay==='lesson')lesson={...lesson,...facts};
    else account={...account,student:facts.student,data:{...account.data,student:facts.student}};
    return true;
  };
  const staffContext=()=>({...ctx(),canManageStaffAccess:typeof onManageStaffAccess==='function'&&staff.viewer?.role==='admin',canCopyCalendarSharing:typeof onCopyCalendarSharing==='function'});
  const profileResourceId=tab=>staff.dialog?.kind==='detail'&&staff.dialog.tab===tab?staff.dialog.id:staffHrReturn&&staffReturn?.dialog?.tab===tab?staffReturn.resourceId:'';
  const hrModules={
    payroll:{key:'payrollUi',formId:'ui-payroll-form',model:()=>staffPayrollModel(staff),markup:payrollDialogMarkup,advance:advancePayrollUi},
    attendance:{key:'attendanceUi',formId:'ui-attendance-form',model:()=>staffAttendanceModel(staff),markup:attendanceDialogMarkup,advance:advanceAttendanceUi},
    leave:{key:'leaveUi',formId:'ui-leave-form',model:()=>staffLeaveModel(staff,{profileStaffId:staff.dialog?.kind==='detail'&&staff.dialog.tab==='leave'?staff.dialog.id:staffHrReturn&&staffReturn?.dialog?.tab==='leave'?staffReturn.resourceId:''}),markup:leaveDialogMarkup,advance:advanceLeaveUi},
    roster:{key:'rosterUi',formId:'ui-roster-form',model:()=>staffRosterModel(staff,{profileStaffId:staff.dialog?.kind==='detail'&&staff.dialog.tab==='roster'?staff.dialog.id:staffHrReturn&&staffReturn?.dialog?.tab==='roster'?staffReturn.resourceId:''}),markup:rosterDialogMarkup,advance:advanceRosterUi},
    'calendar-sharing':{key:'calendarSharingUi',formId:'ui-calendar-sharing-form',model:()=>staffCalendarSharingModel(staff,{profileStaffId:profileResourceId('calendar-sharing')}),markup:calendarSharingDialogMarkup,advance:advanceCalendarSharingUi},
    'staff-profile':{key:'staffProfileUi',formId:'ui-staff-profile-form',model:()=>staffProfileModel(staff,{profileStaffId:profileResourceId('contact')}),markup:staffProfileDialogMarkup,advance:advanceStaffProfileUi},
  };
  const hrKinds=Object.keys(hrModules);
  const syncStaff=({captureHr=true}={})=>{
    if(typeof sharedSnapshot!=='function')return;
    const snapshot=sharedSnapshot();
    if(snapshot==null){if(staff.shared){calendarCopyEpoch++;staff=staffInterfacePreviewState();staffReturn=null;staffHrReturn=null;staffHrContext='';staffHrPositions=[];staffManagementSection='directory';if(['staff',...hrKinds].includes(overlay)){overlay=null;showModal('');}}return;}
    const form=overlay==='staff'&&staff.dialog&&dom.querySelector('#ui-staff-form');
    if(form&&form.dataset?.uiForm===staff.dialog.kind)staff.dialog={...staff.dialog,draft:{...staff.dialog.draft,...Object.fromEntries(new Form(form))}};
    const hr=hrModules[overlay],hrForm=hr&&dom.querySelector(`#${hr.formId}`);
    if(captureHr&&hrForm&&staff[hr.key]?.dialog)storeHrUi(overlay,hr.advance(hr.model(),`${overlay}-draft`,Object.fromEntries(new Form(hrForm)),staffContext()));
    const next=staffSharedState(staff,snapshot),identityChanged=staff.shared&&staff.sharedIdentity!==next.sharedIdentity;
    staff=next;
    if(calendarCopyPending){
      const current=calendarSharingCopySource(staffCalendarSharingModel(staff,{profileStaffId:calendarCopyPending.staffId}),staffContext());
      if(calendarCopyPending.epoch!==calendarCopyEpoch||calendarCopyPending.sourceKey!==JSON.stringify([staff.sharedIdentity,ctx().staffViewKey,current])){calendarCopyEpoch++;calendarCopyPending=null;}
    }
    const hrChanged=staffHrContext&&staffHrContext!==JSON.stringify([staff.sharedIdentity,ctx().staffViewKey]);
    if(identityChanged||hrChanged){calendarCopyEpoch++;for(const hr of Object.values(hrModules))staff[hr.key]={};staffManagementSection='directory';staffHrReturn=null;staffHrContext='';staffHrPositions=[];staffReturn=null;}
    if((identityChanged&&['staff',...hrKinds].includes(overlay))||(hrChanged&&hrKinds.includes(overlay))){overlay=null;showModal('');}
  };
  const advanceOperations=(command,fields)=>advanceOperationsPreview({...operations,lang:ctx().t('zh','en')},command,fields);
  const advanceStudent=(command,fields)=>advanceStudentPortal({...student,role:ctx().role,lang:ctx().t('zh','en')},command,fields,ctx());
  const redrawOverlay=()=>{
    syncSharedPerson();
    if(['staff',...hrKinds].includes(overlay))syncStaff({captureHr:false});
    // The draft was harvested before the transition. A controlled redraw must
    // validate access without copying an earlier form's DOM back over it.
    if(overlay==='lesson'&&syncStudentRequest(undefined,{captureDraft:false})==='invalid'){lesson=null;overlay=null;}
    const html=overlay==='shared-lesson'?sharedLessonWorkflowMarkup(sharedLesson,ctx()):overlay==='operations'?operationsDialogMarkup(operations,ctx()):overlay==='order-document'?operationsDialogMarkup(documentPreview,ctx()):overlay==='staff'?staffDialogMarkup(staff,staffContext()):hrModules[overlay]?hrModules[overlay].markup(hrModules[overlay].model(),staffContext()):overlay==='lesson'?lessonWorkflowMarkup(lesson,ctx()):overlay==='student'?studentPortalDialogMarkup(student,ctx()):overlay==='account'?accountActionsMarkup(account,ctx()):overlay==='data-tools'?dataToolsMarkup(dataTools,ctx()):'';
    showModal(html);
    if(html)dom.querySelector('#modal-root .dialog button:not(:disabled),#modal-root .dialog input:not(:disabled),#modal-root .dialog select:not(:disabled)')?.focus();
    else {overlay=null;const original=returnFocus?.element;const replacement=original?.isConnected&&!original.disabled?original:[...dom.querySelectorAll('button')].find(button=>!button.disabled&&returnFocus&&Object.keys(returnFocus.dataset).length&&Object.entries(returnFocus.dataset).every(([key,value])=>button.dataset[key]===value));replacement?.focus({preventScroll:true});returnFocus=null;}
  };
  const close=()=>{if(overlay==='shared-lesson'&&sharedLesson?.busy&&sharedLesson.identity===ctx().sharedIdentity)return;if(overlay==='operations'&&productDialog(operations.dialog)){if(!productContextKey()||productOwner&&productOwner.key!==productContextKey()){discardProduct();return;}const previous=operations.dialog,position=productPosition();operations=advanceOperations('close',{});drawProductTransition(previous,position,null);return;}if(overlay==='shared-lesson'){discardSharedLesson({restore:true});return;}calendarCopyEpoch++;staffReturn=null;staffHrReturn=null;staffHrContext='';staffHrPositions=[];for(const hr of Object.values(hrModules))staff[hr.key]={...staff[hr.key],dialog:null};operations.dialog=null;staff.dialog=null;student.dialog=null;documentPreview=null;account=null;lesson=null;dataTools=null;overlay=null;accountingReturns=[];accountingListReturn=null;messageListReturn=null;messageComposeReturn=null;redrawOverlay();};
  const staffPosition=()=>{
    const body=dom.querySelector('#modal-root .ui-staff-dialog-body'),active=dom.activeElement;
    const controls=[...dom.querySelectorAll('#modal-root button,#modal-root input,#modal-root select,#modal-root textarea')];
    return {top:body?.scrollTop||0,left:body?.scrollLeft||0,focus:{element:active,dataset:{...active?.dataset},name:active?.name,tag:active?.tagName,type:active?.type,text:active?.textContent?.trim(),index:controls.indexOf(active),selection:typeof active?.selectionStart==='number'?{start:active.selectionStart,end:active.selectionEnd,direction:active.selectionDirection}:null}};
  };
  const restoreStaffPosition=position=>{
    if(!position)return;
    const original=position.focus?.element,usable=node=>node&&node.isConnected!==false&&!node.disabled;
    const controls=[...dom.querySelectorAll('#modal-root button,#modal-root input,#modal-root select,#modal-root textarea')];
    const focus=position.focus||{},target=usable(original)?original:controls.find(node=>usable(node)&&focus.name&&node.name===focus.name&&node.tagName===focus.tag)||controls.find(node=>usable(node)&&Object.keys(focus.dataset||{}).length&&Object.entries(focus.dataset).every(([key,value])=>node.dataset?.[key]===value)&&(!focus.tag||node.tagName===focus.tag)&&(!focus.text||node.textContent?.trim()===focus.text))||controls.find(node=>usable(node)&&focus.tag==='BUTTON'&&node.tagName===focus.tag&&node.type===focus.type&&node.textContent?.trim()===focus.text)||controls[focus.index];
    if(usable(target))target.focus({preventScroll:true});
    const selection=position.focus?.selection;if(selection&&typeof target?.setSelectionRange==='function')try{target.setSelectionRange(selection.start,selection.end,selection.direction);}catch{}
    const body=dom.querySelector('#modal-root .ui-staff-dialog-body');if(body){body.scrollTop=position.top;body.scrollLeft=position.left;}
  };
  const suspendStaffReturn=resourceId=>{
    calendarCopyEpoch++;
    const ticket={};staffReturn={ticket,resourceId,identity:staff.sharedIdentity,view:ctx().staffViewKey,dialog:staff.dialog?.kind==='detail'&&staff.dialog.id===resourceId?{...staff.dialog}:null,position:staffPosition(),returnFocus,list:{top:dom.scrollingElement?.scrollTop||0,left:dom.scrollingElement?.scrollLeft||0}};
    staff.dialog=null;overlay=null;showModal('');return ticket;
  };
  const resumeStaffReturn=(ticket,{repaintList=false}={})=>{
    if(!ticket||staffReturn?.ticket!==ticket)return false;
    const saved=staffReturn;staffReturn=null;syncStaff();
    if(!staff.shared||staff.sharedIdentity!==saved.identity||ctx().staffViewKey!==saved.view||saved.resourceId&&!staff.staff.some(member=>member.id===saved.resourceId))return false;
    if(repaintList)repaint();
    returnFocus=saved.returnFocus;staff.dialog=saved.dialog;overlay=staff.dialog?'staff':null;redrawOverlay();
    if(staff.dialog)restoreStaffPosition(saved.position);
    const page=dom.scrollingElement;if(page){page.scrollTop=saved.list.top;page.scrollLeft=saved.list.left;}
    return true;
  };
  const refreshSharedStaff=()=>{
    const hr=hrModules[overlay],visible=hr?hr.markup(hr.model(),staffContext()):null;
    const before=JSON.stringify(staff),position=['staff',...hrKinds].includes(overlay)?staffPosition():null;syncStaff();
    // Directory polling must not replace a live HR form when none of its
    // displayed details changed. This keeps native input, selection and IME.
    if(hr&&hr===hrModules[overlay]&&visible===hr.markup(hr.model(),staffContext()))return true;
    if(['staff',...hrKinds].includes(overlay)&&before!==JSON.stringify(staff)){redrawOverlay();restoreStaffPosition(position);return true;}
    return false;
  };
  const hrModel=kind=>hrModules[kind].model();
  const hrDraft=kind=>{const form=dom.querySelector(`#${hrModules[kind].formId}`);return form?Object.fromEntries(new Form(form)):{};};
  const storeHrUi=(kind,model)=>{
    const {viewer,staff:members,rows,records,events,settings,ready,loading,error,today,settingsReady,sessions,sessionsReady,balances,profileStaffId,staffGroups,groupsReady,...ui}=model;
    staff={...staff,[hrModules[kind].key]:ui};
  };
  const advanceHr=(kind,command,fields={},{draw=true}={})=>{
    syncStaff({captureHr:false});
    if(overlay&&!['staff',kind].includes(overlay))return true;
    const model=hrModel(kind),oldDialog=model.dialog,previous=JSON.stringify(model),position=overlay===kind?staffPosition():null;
    const next=hrModules[kind].advance(model,command,fields,staffContext());
    if(!next||JSON.stringify(next)===previous)return true;
    const inlineProfile=overlay==='staff'&&staff.dialog?.kind==='detail'&&staff.dialog.tab===kind&&!next.dialog;
    if(overlay&&overlay!==kind&&!next.dialog&&!inlineProfile)return true;
    if(inlineProfile){
      const position=staffPosition();storeHrUi(kind,next);redrawOverlay();restoreStaffPosition(position);return true;
    }
    if(next.dialog&&overlay==='staff'&&staff.dialog?.kind==='detail')staffHrReturn=suspendStaffReturn(staff.dialog.id);
    storeHrUi(kind,next);
    if(!draw)return true;
    if(command.endsWith('-filter')||['roster-prev-month','roster-next-month'].includes(command)){repaint();return true;}
    const dialogKey=dialog=>dialog?`${dialog.kind}:${dialog.id||''}`:'',transition=oldDialog&&next.dialog&&dialogKey(oldDialog)!==dialogKey(next.dialog);
    let back=null;
    if(transition){
      const target=dialogKey(next.dialog),index=staffHrPositions.findLastIndex(saved=>saved.key===target);
      if(index>=0){back=staffHrPositions[index].position;staffHrPositions.length=index;}
      else if(/review/.test(next.dialog.kind)||dialogKey(next.dialog.returnTo)===dialogKey(oldDialog))staffHrPositions.push({key:dialogKey(oldDialog),position});
    }
    if(!next.dialog){
      overlay=null;staffHrContext='';staffHrPositions=[];
      const ticket=staffHrReturn;staffHrReturn=null;
      if(ticket&&resumeStaffReturn(ticket))return true;
      redrawOverlay();return true;
    }
    overlay=kind;staffHrContext=JSON.stringify([staff.sharedIdentity,ctx().staffViewKey]);redrawOverlay();
    if(back)restoreStaffPosition(back);else if(oldDialog?.kind===next.dialog.kind)restoreStaffPosition(position);
    return true;
  };
  const cancelHr=()=>hrKinds.includes(overlay)?advanceHr(overlay,`${overlay}-cancel`,hrDraft(overlay)):false;
  let calendarCopyPending=null;
  const copyStaffCalendar=async fields=>{
    syncStaff();
    const current=()=>overlay==='staff'&&staff.dialog?.kind==='detail'&&staff.dialog.tab==='calendar-sharing'?calendarSharingCopySource(hrModel('calendar-sharing'),staffContext()):null;
    const details=current();
    if(!details||fields.id&&fields.id!==details.staffId||calendarCopyPending?.epoch===calendarCopyEpoch)return true;
    const marker=()=>JSON.stringify([calendarCopyEpoch,staff.sharedIdentity,ctx().staffViewKey,current()]);
    const original=marker(),ticket={epoch:calendarCopyEpoch,staffId:details.staffId,sourceKey:JSON.stringify([staff.sharedIdentity,ctx().staffViewKey,details])};calendarCopyPending=ticket;
    advanceHr('calendar-sharing','calendar-sharing-copy');
    let ok=false;
    try{ok=await onCopyCalendarSharing({...details})!==false;}catch{}
    finally{if(calendarCopyPending===ticket)calendarCopyPending=null;}
    syncStaff({captureHr:false});
    if(marker()===original)advanceHr('calendar-sharing','calendar-sharing-copy-result',{ok});
    return true;
  };
  const hrControl=(target,change=false)=>{
    const command=target.dataset?.uiCommand,kind=hrKinds.find(key=>command?.startsWith(`${key}-`));
    const rosterMode=kind==='roster'&&['offDuty','scope'].includes(target.name);
    if((command==='payroll-salary-type'||rosterMode)&&!change)return true;
    const formKind=hrKinds.find(key=>target.closest?.(`#${hrModules[key].formId}`));
    if(formKind&&overlay===formKind){
      const values=hrDraft(formKind);
      if(target.name)values[target.name]=target.value;
      if(command==='payroll-salary-type'&&change)return advanceHr(formKind,command,{...values,value:target.value});
      if(rosterMode&&change)return advanceHr(formKind,'roster-draft',values);
      return advanceHr(formKind,`${formKind}-draft`,values,{draw:false});
    }
    if(!kind||!command.endsWith('-filter')||!target.name)return false;
    const position={name:target.name,start:target.selectionStart,end:target.selectionEnd};
    advanceHr(kind,command,{[target.name]:target.value});
    const next=[...dom.querySelectorAll(`[data-ui-command="${command}"]`)].find(node=>node.name===position.name);next?.focus({preventScroll:true});
    if(typeof position.start==='number'&&typeof next?.setSelectionRange==='function')try{next.setSelectionRange(position.start,position.end);}catch{}
    return true;
  };
  const staffManagementMarkup=accountActions=>{
    if(staff.viewer?.role!=='admin')return staffDirectoryMarkup(staff,{...ctx(),accountActions});
    const {t,esc}=ctx(),nav=`<nav class="ui-staff-management-tabs" aria-label="${esc(t('員工管理分頁','Staff areas'))}">${[['directory','員工','Staff'],['roster','排班','Roster'],['leave','假期','Leave'],['attendance','打卡紀錄','Clock records'],['payroll','薪金','Payroll']].map(([key,zh,en])=>`<button type="button" class="ui-staff-button ui-staff-secondary" data-action="ui-staff" data-ui-command="management-section" data-ui-tab="${key}" aria-current="${staffManagementSection===key?'page':'false'}">${esc(t(zh,en))}</button>`).join('')}</nav>`;
    return `<div class="ui-staff-management">${nav}${staffManagementSection==='roster'?rosterPageMarkup(staffRosterModel(staff),ctx()):staffManagementSection==='payroll'?payrollPageMarkup(staffPayrollModel(staff),ctx()):staffManagementSection==='attendance'?attendancePageMarkup(staffAttendanceModel(staff),ctx()):staffManagementSection==='leave'?leavePageMarkup(staffLeaveModel(staff),ctx()):staffDirectoryMarkup(staff,{...ctx(),accountActions})}</div>`;
  };
  const accountingDialog=dialog=>!!dialog&&['invoice','view-invoice','create-invoice','edit-invoice','accounting-entry-review','payment','view-payment','record-payment','credit','view-credit','create-credit','receipt-options','receipt-save','receipt-email','receipt-save-preview','receipt-email-preview'].includes(dialog.type);
  const accountingDialogKey=dialog=>dialog?`${dialog.type}:${dialog.id||''}`:'';
  const accountingControls=()=>[...dom.querySelectorAll('#modal-root .dialog button,#modal-root .dialog input,#modal-root .dialog select,#modal-root .dialog textarea')];
  const messageDialog=dialog=>['compose','message-preview','preview-message'].includes(dialog?.type);
  const messageFocus=(node,controls=[])=>({element:node,name:node?.name,tag:node?.tagName,type:node?.type,text:node?.textContent?.trim(),dataset:{...node?.dataset},index:controls.indexOf(node),selection:typeof node?.selectionStart==='number'?{start:node.selectionStart,end:node.selectionEnd,direction:node.selectionDirection}:null});
  const restoreMessageFocus=(focus,controls=[])=>{
    if(!focus)return;
    const usable=node=>node&&node.isConnected!==false&&!node.disabled&&node.type!=='hidden';
    const target=usable(focus.element)?focus.element:controls.find(node=>usable(node)&&focus.name&&node.name===focus.name&&node.tagName===focus.tag)||controls.find(node=>usable(node)&&Object.keys(focus.dataset).length&&Object.entries(focus.dataset).every(([key,value])=>node.dataset?.[key]===value)&&node.tagName===focus.tag&&(!focus.text||node.textContent?.trim()===focus.text))||controls.find(node=>usable(node)&&focus.tag==='BUTTON'&&node.tagName==='BUTTON'&&node.type===focus.type&&node.textContent?.trim()===focus.text)||controls[focus.index];
    if(!usable(target))return;
    target.focus({preventScroll:true});
    if(focus.selection&&typeof target.setSelectionRange==='function')try{target.setSelectionRange(focus.selection.start,focus.selection.end,focus.selection.direction);}catch{}
  };
  const inlineMessage=()=>{
    const node=dom.querySelector('.ops-composer textarea[name="message"]');
    return node?.dataset?.uiId===operations.selectedThreadId&&node.closest?.('.ops-composer')?.dataset?.messageThreadId===operations.selectedThreadId?node:null;
  };
  const harvestMessage=()=>{
    if(overlay==='operations'&&operations.dialog?.type==='compose'){
      const form=dom.querySelector('#ui-operations-form');
      if(form)operations=advanceOperations('message-compose-draft',Object.fromEntries(new Form(form)));
    }else if(!overlay){const node=inlineMessage();if(node)operations=advanceOperations('message-draft',{id:operations.selectedThreadId,message:node.value});}
  };
  const captureMessageControl=target=>{
    if(!target)return false;
    if(!overlay&&target.dataset?.uiCommand==='message-draft'&&target===inlineMessage()){
      operations=advanceOperations('message-draft',{id:operations.selectedThreadId,message:target.value});return true;
    }
    if(overlay==='operations'&&operations.dialog?.type==='compose'&&target.dataset?.uiCommand==='message-compose-draft'&&target.closest?.('#ui-operations-form')){harvestMessage();return true;}
    return false;
  };
  const messageListPosition=reply=>({
    threadId:operations.selectedThreadId,focus:messageFocus(reply?inlineMessage():dom.activeElement),
    regions:[dom.scrollingElement,dom.querySelector('.ops-conversation-list'),dom.querySelector('.ops-message-history')].filter(Boolean).map(node=>({node,top:node.scrollTop||0,left:node.scrollLeft||0}))
  });
  const messageDialogPosition=()=>{const body=dom.querySelector('#modal-root .ops-dialog-body');return {focus:messageFocus(dom.activeElement,accountingControls()),top:body?.scrollTop||0,left:body?.scrollLeft||0};};
  const drawMessageTransition=(previous,position,listPosition)=>{
    const dialog=operations.dialog;
    if(!messageDialog(previous)&&!messageDialog(dialog))return false;
    if(!messageDialog(previous)){messageListReturn=listPosition;messageComposeReturn=null;}
    if(previous?.type==='compose'&&dialog?.type!=='compose')messageComposeReturn=position;
    overlay=dialog?'operations':null;redrawOverlay();
    const editPosition=dialog?.type==='compose'?(previous?.type==='compose'?position:messageComposeReturn):null;
    if(editPosition){restoreMessageFocus(editPosition.focus,accountingControls());const body=dom.querySelector('#modal-root .ops-dialog-body');if(body){body.scrollTop=editPosition.top;body.scrollLeft=editPosition.left;}}
    if(!dialog){
      const saved=messageListReturn;messageListReturn=null;messageComposeReturn=null;
      if(saved&&saved.threadId===operations.selectedThreadId){restoreMessageFocus(saved.focus);for(const region of saved.regions){if(region.node.isConnected!==false){region.node.scrollTop=region.top;region.node.scrollLeft=region.left;}}}
    }
    return true;
  };
  const cancelMessageDialog=()=>{
    if(overlay!=='operations'||!messageDialog(operations.dialog))return false;
    const previous=operations.dialog,position=messageDialogPosition();harvestMessage();operations=advanceOperations('close',{});return drawMessageTransition(previous,position,null);
  };
  const accountingDialogPosition=(dialog=operations.dialog)=>{
    const active=dom.activeElement,body=dom.querySelector('#modal-root .ops-dialog-body');
    return {key:accountingDialogKey(dialog),focus:{element:active,dataset:{...active?.dataset},name:active?.name,index:accountingControls().indexOf(active)},top:body?.scrollTop||0,left:body?.scrollLeft||0,tables:[...dom.querySelectorAll('#modal-root .ops-table-scroll')].map(node=>({top:node.scrollTop||0,left:node.scrollLeft||0}))};
  };
  const restoreAccountingDialog=(position,dialog=operations.dialog)=>{
    if(!position||position.key!==accountingDialogKey(dialog))return;
    const controls=accountingControls(),focus=position.focus,usable=node=>node&&node.isConnected!==false&&!node.disabled&&node.type!=='hidden'&&!node.closest?.('fieldset:disabled');
    const target=usable(focus.element)?focus.element:controls.find(node=>usable(node)&&Object.keys(focus.dataset).length&&Object.entries(focus.dataset).every(([key,value])=>node.dataset?.[key]===value))||controls.find(node=>usable(node)&&focus.name&&node.name===focus.name)||controls[focus.index];
    if(usable(target))target.focus({preventScroll:true});
    const body=dom.querySelector('#modal-root .ops-dialog-body');
    if(body){body.scrollTop=position.top;body.scrollLeft=position.left;}
    const tables=[...dom.querySelectorAll('#modal-root .ops-table-scroll')];
    for(const [index,saved] of (position.tables||[]).entries())if(tables[index]){tables[index].scrollTop=saved.top;tables[index].scrollLeft=saved.left;}
  };
  const accountingListPosition=()=>({
    page:dom.scrollingElement,top:dom.scrollingElement?.scrollTop||0,left:dom.scrollingElement?.scrollLeft||0,
    tables:[...dom.querySelectorAll('.ops-table-scroll')].map((node,index)=>({node,index,label:node.getAttribute?.('aria-label'),top:node.scrollTop||0,left:node.scrollLeft||0}))
  });
  const restoreAccountingList=position=>{
    if(!position)return;
    const tables=[...dom.querySelectorAll('.ops-table-scroll')];
    for(const saved of position.tables){const node=saved.node.isConnected!==false?saved.node:tables.find(row=>saved.label&&row.getAttribute?.('aria-label')===saved.label)||tables[saved.index];if(node){node.scrollTop=saved.top;node.scrollLeft=saved.left;}}
    const page=dom.scrollingElement||position.page;if(page){page.scrollTop=position.top;page.scrollLeft=position.left;}
  };
  const finishAccountingDialog=()=>{const position=accountingListReturn;close();restoreAccountingList(position);};
  const takeAccountingReturn=dialog=>{while(accountingReturns.length){const saved=accountingReturns.pop();if(saved.key===accountingDialogKey(dialog))return saved;}};
  const cancelAccountingDialog=()=>{
    const orderDocument=overlay==='order-document',state=orderDocument?documentPreview:operations;
    if(!['operations','order-document'].includes(overlay)||!accountingDialog(state?.dialog))return false;
    const next=advanceOperationsPreview({...state,lang:ctx().t('zh','en')},'cancel-accounting',{});
    if(orderDocument)documentPreview=next;else operations=next;
    if(!next.dialog){finishAccountingDialog();return true;}
    const position=takeAccountingReturn(next.dialog);
    redrawOverlay();restoreAccountingDialog(position,next.dialog);return true;
  };
  const drawAccountingTransition=(previous,position,listPosition,{pageChanged=false,orderDocument=false}={})=>{
    const dialog=(orderDocument?documentPreview:operations)?.dialog;
    if(!accountingDialog(previous)&&!accountingDialog(dialog))return false;
    if(!accountingDialog(previous)){accountingReturns=[];accountingListReturn=listPosition;}
    overlay=dialog?(orderDocument?'order-document':'operations'):null;
    if(pageChanged)repaint();
    if(!dialog){finishAccountingDialog();return true;}
    const same=accountingDialogKey(previous)===accountingDialogKey(dialog),back=!same&&accountingDialogKey(previous?.returnTo)===accountingDialogKey(dialog);
    if(position&&!same&&accountingDialogKey(dialog.returnTo)===accountingDialogKey(previous))accountingReturns.push(position);
    const restore=back?takeAccountingReturn(dialog):same?position:null;
    redrawOverlay();
    restoreAccountingDialog(restore,dialog);
    return true;
  };
  const accountingFilterFields=target=>{
    const form=target?.closest?.('.ops-accounting-filters');
    return form?{...Object.fromEntries(new Form(form)),section:'accounting'}:null;
  };
  const accountingEntryFields=target=>{
    if(overlay!=='operations'||!['create-invoice','edit-invoice','record-payment','create-credit'].includes(operations.dialog?.type))return null;
    const form=target?.closest?.('form');
    return form?.id==='ui-operations-form'?Object.fromEntries(new Form(form)):null;
  };
  const captureAccountingEntry=target=>{
    const fields=accountingEntryFields(target);if(!fields)return false;
    operations=advanceOperations('accounting-entry-draft',fields);
    // Keep live input nodes, caret and scroll intact while updating derived text.
    const summary=dom.querySelector('#modal-root [data-accounting-entry-summary]');
    if(summary)summary.innerHTML=accountingEntrySummaryMarkup(operations,ctx());
    const student=dom.querySelector('#modal-root [data-accounting-entry-student]');
    if(student)student.innerHTML=accountingEntryStudentMarkup(operations,ctx());
    return true;
  };
  const focusAccountingItem=(command,previousNames,value)=>{
    const fields=accountingControls().filter(node=>node.name?.startsWith('itemName_'));
    const removedIndex=previousNames.indexOf('itemName_'+value);
    const target=command==='accounting-add-item'?fields.find(node=>!previousNames.includes(node.name))
      :removedIndex>=0?fields[Math.min(removedIndex,fields.length-1)]:null;
    const fallback=accountingControls().find(node=>node.dataset?.uiCommand==='accounting-add-item');
    const next=target||fallback;if(!next)return;
    next.focus({preventScroll:true});next.scrollIntoView?.({block:'nearest'});
  };
  const repaintAccountingPage=()=>{
    const active=dom.activeElement,focus={dataset:{...active?.dataset},name:active?.name,start:active?.selectionStart,end:active?.selectionEnd},position=accountingListPosition();
    repaint();
    const controls=[...dom.querySelectorAll('.ops-accounting-filters input,.ops-accounting-filters select,button')];
    const target=controls.find(node=>!node.disabled&&focus.name&&node.name===focus.name)||controls.find(node=>!node.disabled&&Object.keys(focus.dataset).length&&Object.entries(focus.dataset).every(([key,value])=>node.dataset?.[key]===value));
    target?.focus({preventScroll:true});
    if(target?.type==='text'&&focus.start!=null&&typeof target.setSelectionRange==='function')target.setSelectionRange(focus.start,focus.end);
    restoreAccountingList(position);
  };
  const refreshSharedPerson=()=>{
    if(!(overlay==='lesson'&&lesson?.sharedPerson||overlay==='account'&&account?.sharedPerson))return false;
    const markup=()=>overlay==='lesson'?lessonWorkflowMarkup(lesson,ctx()):accountActionsMarkup(account,ctx());
    const before=markup(),bodySelector=overlay==='lesson'?'#modal-root .lw-body':'#modal-root .aa-body';
    const active=dom.activeElement,body=dom.querySelector(bodySelector),scroll={top:body?.scrollTop||0,left:body?.scrollLeft||0};
    const controlsSelector='#modal-root .dialog button,#modal-root .dialog input,#modal-root .dialog select,#modal-root .dialog textarea';
    const focusedInDialog=!!active?.closest?.('#modal-root .dialog');
    const focusIndex=focusedInDialog?[...dom.querySelectorAll(controlsSelector)].indexOf(active):-1;
    if(!syncSharedPerson()){close();return true;}
    const html=markup();
    // A routine profile poll must not remount an unchanged dialog or move focus.
    if(html===before)return true;
    showModal(html);
    if(focusedInDialog){
      const controls=[...dom.querySelectorAll(controlsSelector)],usable=node=>node&&!node.disabled&&!node.closest?.('fieldset:disabled');
      const target=controls[focusIndex];
      (usable(target)?target:controls.find(node=>node.dataset?.uiCommand==='close'&&usable(node)))?.focus({preventScroll:true});
    }
    const nextBody=dom.querySelector(bodySelector);
    if(nextBody){nextBody.scrollTop=scroll.top;nextBody.scrollLeft=scroll.left;}
    return true;
  };
  const productBody=()=>dom.querySelector('#modal-root .ops-product-body')||dom.querySelector('#modal-root .ops-dialog-body');
  const productControls=()=>[...accountingControls(),productBody()].filter(Boolean);
  const productPosition=()=>{
    const active=dom.activeElement,body=productBody();
    return {focus:messageFocus(active,productControls()),top:body?.scrollTop||0,left:body?.scrollLeft||0,inputTop:active?.scrollTop||0,inputLeft:active?.scrollLeft||0};
  };
  const restoreProductPosition=position=>{
    if(!position)return;
    restoreMessageFocus(position.focus,productControls());
    const body=productBody();if(body){body.scrollTop=position.top;body.scrollLeft=position.left;}
    const active=dom.activeElement;if(active?.name&&active.name===position.focus?.name){active.scrollTop=position.inputTop;active.scrollLeft=position.inputLeft;}
  };
  const productListPosition=()=>({top:dom.scrollingElement?.scrollTop||0,left:dom.scrollingElement?.scrollLeft||0,tableTop:dom.querySelector('.ops-products-table')?.scrollTop||0,tableLeft:dom.querySelector('.ops-products-table')?.scrollLeft||0});
  const harvestProduct=({preserveError=true}={})=>{
    if(productRendering)return false;
    if(overlay!=='operations'||!['create-product','edit-product','stock-product'].includes(operations.dialog?.type))return false;
    const form=dom.querySelector('#ui-operations-form');if(!form)return false;
    const error=operations.error,errorField=operations.productErrorField;
    operations=advanceOperations(operations.dialog.type==='stock-product'?'stock-product-draft':'product-draft',Object.fromEntries(new Form(form)));
    if(preserveError){operations.error=error;operations.productErrorField=errorField;}
    cacheModal(operationsDialogMarkup(operations,ctx()));return true;
  };
  const captureProductControl=target=>{
    if(productRendering)return true;
    if(!target?.closest?.('#ui-operations-form')||!['create-product','edit-product','stock-product'].includes(operations.dialog?.type)||overlay!=='operations')return false;
    const changed=!!target.name&&String(operations.dialog.values?.[target.name]??'')!==String(target.value??'');
    if(!syncProductSource())return true;
    harvestProduct({preserveError:!changed});productEditPosition={...productPosition(),focus:messageFocus(target,productControls()),inputTop:target.scrollTop||0,inputLeft:target.scrollLeft||0};return true;
  };
  const drawProductTransition=(previous,position,listPosition)=>{
    const dialog=operations.dialog;
    if(!productDialog(previous)&&!productDialog(dialog))return false;
    if(!previous&&dialog){productListReturn=listPosition||productListPosition();productEditPosition=null;productDetailPosition=null;}
    if(['product','view-product'].includes(previous?.type)&&['edit-product','stock-product'].includes(dialog?.type))productDetailPosition=position;
    if(['create-product','edit-product','stock-product'].includes(previous?.type)&&['product-review','stock-product-review'].includes(dialog?.type)){
      const editing=position?.focus?.name?position:productEditPosition;
      productEditPosition={...editing,top:position?.top||0,left:position?.left||0};
    }
    overlay=dialog?'operations':null;productRendering=true;
    try{repaint();redrawOverlay();}finally{productRendering=false;}
    if(['product-review','stock-product-review'].includes(dialog?.type)){const body=productBody();if(body){body.scrollTop=0;body.scrollLeft=0;body.focus?.({preventScroll:true});}}
    else if(['create-product','edit-product','stock-product'].includes(dialog?.type)){
      if(['product-review','stock-product-review'].includes(previous?.type))restoreProductPosition(productEditPosition);
      else if(previous?.type===dialog.type)restoreProductPosition(position);
      else dom.querySelector(dialog.type==='stock-product'?'#ui-operations-form [name="quantity"]':'#ui-operations-form [name="nameZh"]')?.focus({preventScroll:true});
      if(operations.error){const field=operations.productErrorField,control=field?dom.querySelector('#ui-operations-form [name="'+field+'"]'):null,error=dom.querySelector('#ops-product-error');(control||error)?.focus?.({preventScroll:true});(control?.closest?.('[data-product-field]')||error||control)?.scrollIntoView?.({block:'nearest'});}
    }else if(['product','view-product'].includes(dialog?.type)&&['edit-product','stock-product','product-review','stock-product-review'].includes(previous?.type)){
      restoreProductPosition(productDetailPosition);
      const command=previous.type==='stock-product-review'?'stock-product':previous.originType||previous.type;
      [...dom.querySelectorAll('#modal-root .dialog button')].find(node=>!node.disabled&&node.dataset?.uiCommand===command&&node.dataset.uiId===dialog.id)?.focus({preventScroll:true});
    }else if(!dialog){
      const saved=productListReturn;productOwner=null;productEditPosition=null;productDetailPosition=null;productListReturn=null;
      if(saved){const page=dom.scrollingElement,table=dom.querySelector('.ops-products-table');if(page){page.scrollTop=saved.top;page.scrollLeft=saved.left;}if(table){table.scrollTop=saved.tableTop;table.scrollLeft=saved.tableLeft;}}
    }
    return true;
  };
  const cancelProductForm=()=>{
    const previous=operations.dialog;
    if(overlay!=='operations'||!['create-product','edit-product','stock-product','product-review','stock-product-review'].includes(previous?.type))return false;
    const position=productPosition();operations=advanceOperations('cancel-product',{});
    return drawProductTransition(previous,position,null);
  };
  const fieldsFromDataset=d=>({id:d.uiId,tab:d.uiTab,section:d.uiSection,value:d.uiValue});
  const openLesson=(view,facts={})=>{
    if(guardStudentRequest()!=='ready')return false;
    const current=ctx();
    // Shared roster views must enter through the canonical session resolver.
    // Neither an ID nor caller-supplied facts can authorize a legacy fixture.
    if(current.sharedMode&&['student','attendance','arrange'].includes(view))return false;
    if(facts.sharedPerson===true){
      const resolved=sharedPersonFacts(view,facts.personId);
      if(!resolved||view==='activation')return false;
      const element=dom.activeElement;returnFocus={element,dataset:{...element?.dataset}};
      lesson={view,step:'details',...resolved};overlay='lesson';redrawOverlay();return true;
    }
    if(current.sharedMode&&['applicant','family','convert'].includes(view)&&!(view==='family'&&current.role==='student'))return false;
    if(current.sharedMode&&current.role==='student'&&!['student-request','family'].includes(view))return false;
    if(view==='student-request'&&current.sharedMode){
      if(current.role!=='student')return false;
      const resolved=studentLessonFacts({uiId:facts.lesson?.id,uiStudentId:facts.student?.id,uiScheduleId:facts.lesson?.scheduleId,uiSequence:facts.lesson?.sequence});
      if(!resolved)return false;
      facts={...resolved,draft:{...resolved.draft,...facts.draft}};
    }
    if(view==='family'&&current.sharedMode&&current.role==='student'){
      if(!current.sharedReady||!current.sharedIdentity)return false;
      facts={...facts,shared:true,sharedIdentity:current.sharedIdentity,data:{students:(current.students||[]).map(row=>({...row})),slots:[],trialHistory:[]}};
    }
    const element=dom.activeElement;returnFocus={element,dataset:{...element?.dataset}};const data=getLessonWorkflowData();lesson={view,step:'edit',student:data.students[0],lesson:{courseName:'創意繪畫 · Creative Drawing',date:'2026-10-16',time:'13:00',duration:60,teacher:'陳子朗 Leo Chan'},data,...facts};overlay='lesson';redrawOverlay();
  };
  const openAccount=(view,facts={})=>{
    if(ctx().sharedMode&&view==='trial-application')return false;
    if(guardStudentRequest()!=='ready')return false;
    if(facts.sharedPerson===true){
      const resolved=sharedPersonFacts(view,facts.personId);
      if(!resolved||view!=='activation')return false;
      facts={...resolved,data:{student:resolved.student,courses:[],slots:[]}};
    }else if(ctx().sharedMode&&view==='activation')return false;
    const element=dom.activeElement;returnFocus={element,dataset:{...element?.dataset}};
    account=advanceAccountActions({},'launch',{view,...facts});
    if(facts.sharedPerson)account={...account,sharedPerson:true,personId:facts.personId,sharedIdentity:facts.sharedIdentity};
    overlay='account';redrawOverlay();return true;
  };
  const openOrderDocument=order=>{
    if(guardStudentRequest()!=='ready')return false;
    const element=dom.activeElement;returnFocus={element,dataset:{...element?.dataset}};accountingReturns=[];accountingListReturn=accountingListPosition();
    const data=getOperationsPreviewData(),id=order.id;
    data.students=[{id:order.studentId,nameZh:order.studentName,nameEn:order.studentName}];
    data.invoices=[{id,number:id,studentId:order.studentId,date:String(order.updatedAt||order.createdAt||'').slice(0,10),dueDate:order.dueDate||'—',status:order.paymentStatus==='paid'?'paid':'draft',discount:0,orderPreviewSource:true,sourceVersion:order.version,items:[{nameZh:order.items.map(row=>row.courseName||row.feeName).join(' / '),nameEn:order.items.map(row=>row.courseName||row.feeName).join(' / '),quantity:1,unitPrice:order.amountCents/100}],notesZh:'訂單版本 '+order.version+' · 僅預覽版面，尚未生成文件。',notesEn:'Order version '+order.version+' · Layout preview; no document has been generated.'}];
    data.payments=[];documentPreview={data,dialog:{type:'invoice',id}};overlay='order-document';redrawOverlay();
  };
  const studentLessonFacts=d=>{
    const current=ctx();
    if(current.sharedMode){
      if(current.role!=='student'||!current.sharedIdentity||!current.sharedReady)return null;
      const students=Array.isArray(current.students)?current.students:[],allowed=new Set(students.map(person=>person.id)),lessons=(Array.isArray(current.lessons)?current.lessons:[]).filter(row=>allowed.has(row.studentId));
      let selected=d.uiId?lessons.find(row=>row.id===d.uiId):null;
      if(d.uiId&&!selected)return null;
      const personId=d.uiStudentId||selected?.studentId||(students.some(person=>person.id===student.selectedStudentId)?student.selectedStudentId:students[0]?.id),person=students.find(row=>row.id===personId);
      if(!person)return null;
      if(!selected)selected=lessons.find(row=>row.studentId===person.id&&(!d.uiScheduleId||row.scheduleId===d.uiScheduleId)&&(!d.uiSequence||row.sequence===Number(d.uiSequence)));
      if(!selected||selected.studentId!==person.id||d.uiScheduleId&&selected.scheduleId!==d.uiScheduleId||d.uiSequence&&selected.sequence!==Number(d.uiSequence))return null;
      return {shared:true,sharedIdentity:current.sharedIdentity,requestCapabilities:{submit:false,upload:false},data:{students:students.map(row=>({...row})),slots:[],trialHistory:[]},student:{...person},lesson:{...selected,teacher:Array.isArray(selected.teachers)?selected.teachers.map(row=>row.displayName).join(' · '):selected.teacher||'',room:Array.isArray(selected.rooms)?selected.rooms.map(row=>row.displayName).join(' · '):selected.room||''},draft:{requestType:d.uiRequestType==='sick'?'sick':'reschedule'}};
    }
    const id=student.selectedStudentId||'child-1',registered=id==='child-1'?ctx().student:null,person=registered||student.data.students.find(row=>row.id===id)||{};
    return {student:{...person,...student.data.profileOverrides?.[person.id||id]},lesson:{scheduleId:d.uiScheduleId,sequence:Number(d.uiSequence)||1,date:d.uiLessonDate,time:d.uiLessonTime,courseName:d.uiCourseName},draft:{requestType:d.uiRequestType==='sick'?'sick':'reschedule'}};
  };
  const retainStudentRequestDraft=fields=>{
    if(!lesson?.shared||lesson.view!=='student-request')return;
    const form=dom.querySelector('#ui-lesson-form'),typed=form?Object.fromEntries([...new Form(form)].filter(([key])=>key!=='requestType')):{},values={...typed,...fields};
    const draft=Object.fromEntries(Object.entries(values).filter(([key,value])=>['reason','preferredDate'].includes(key)&&typeof value==='string'));
    lesson={...lesson,draft:{...lesson.draft,...draft}};
  };
  const syncStudentRequest=(fields,{captureDraft=true}={})=>{
    if(!lesson?.shared||lesson.view!=='student-request')return 'ready';
    const current=ctx();
    if(!current.sharedMode||current.role!=='student'||!current.sharedIdentity||current.sharedIdentity!==lesson.sharedIdentity)return 'invalid';
    if(captureDraft)retainStudentRequestDraft(fields);
    if(!current.sharedReady){lesson={...lesson,requestLoading:true,requestRefreshError:!!current.sharedError};return 'loading';}
    const facts=studentLessonFacts({uiId:lesson.lesson.id,uiStudentId:lesson.student.id,uiScheduleId:lesson.lesson.scheduleId,uiSequence:lesson.lesson.sequence});
    if(!facts)return 'invalid';
    lesson={...lesson,...facts,draft:lesson.draft,requestLoading:false,requestRefreshError:!!current.sharedError};return 'ready';
  };
  const guardStudentRequest=fields=>{
    if(!syncSharedPerson()){close();return 'invalid';}
    const wasLoading=lesson?.requestLoading,status=syncStudentRequest(fields);
    if(status==='invalid')close();
    else if(status==='loading'||wasLoading)redrawOverlay();
    return status;
  };
  const refreshSharedStudentRequest=()=>{
    if(overlay!=='lesson'||!lesson?.shared||lesson.view!=='student-request')return false;
    const visibleSnapshot=()=>JSON.stringify({student:lesson.student?.displayName||lesson.student?.name||'',course:lesson.lesson?.courseName||lesson.lesson?.course||'',date:lesson.lesson?.date||'',time:lesson.lesson?.time||'',teacher:lesson.lesson?.teacher||'',loading:!!lesson.requestLoading,error:!!lesson.requestRefreshError});
    const before=visibleSnapshot(),active=dom.activeElement,body=dom.querySelector('#modal-root .lw-body'),scroll={top:body?.scrollTop||0,left:body?.scrollLeft||0};
    const controlsSelector='#modal-root .dialog button,#modal-root .dialog input,#modal-root .dialog select,#modal-root .dialog textarea';
    const focusedInDialog=!!active?.closest?.('#modal-root .lw-dialog');
    const focusMatch=node=>{
      if(active?.name)return node.name===active.name&&node.tagName===active.tagName;
      if(active?.dataset?.uiCommand)return node.dataset?.uiCommand===active.dataset.uiCommand&&node.dataset?.uiId===active.dataset.uiId&&node.dataset?.uiTab===active.dataset.uiTab;
      return active?.type==='submit'&&node.type==='submit'&&(node.getAttribute?.('form')||node.form?.id)===(active.getAttribute?.('form')||active.form?.id);
    };
    const focusIndex=focusedInDialog?[...dom.querySelectorAll(controlsSelector)].filter(focusMatch).indexOf(active):-1;
    const selection=focusedInDialog&&typeof active.selectionStart==='number'?{start:active.selectionStart,end:active.selectionEnd,direction:active.selectionDirection}:null;
    const status=syncStudentRequest();
    if(status==='invalid'){close();return true;}
    // Routine polls only harvest the draft; unchanged facts must leave the live
    // controls, focus, selection and scroll untouched.
    if(before===visibleSnapshot())return true;
    showModal(lessonWorkflowMarkup(lesson,ctx()));
    if(focusedInDialog){
      const controls=[...dom.querySelectorAll(controlsSelector)],usable=node=>node&&!node.disabled&&!node.closest?.('fieldset:disabled');
      const matching=controls.filter(focusMatch),target=matching[focusIndex]||matching[0];
      const focus=usable(target)?target:controls.find(node=>node.dataset?.uiCommand==='close'&&usable(node));
      focus?.focus({preventScroll:true});
      if(focus===target&&selection&&typeof focus?.setSelectionRange==='function')focus.setSelectionRange(selection.start,selection.end,selection.direction);
    }
    const nextBody=dom.querySelector('#modal-root .lw-body');
    if(nextBody){nextBody.scrollTop=scroll.top;nextBody.scrollLeft=scroll.left;}
    return true;
  };
  const action=(d,element)=>{
    if(d.action==='ui-operations'&&(d.uiSection==='products'||String(d.uiCommand||'').includes('product')||productDialog(operations.dialog))&&!syncProductSource())return true;
    if(d.action==='ui-shared-lesson')return advanceSharedLesson(d.uiCommand,{id:d.uiId});
    if(overlay==='shared-lesson'&&syncSharedLesson()==='invalid')return true;
    if(d.action==='ui-lesson'&&d.uiCommand==='launch'&&ctx().sharedMode&&['student','attendance','arrange'].includes(d.uiView)){openSharedLesson(d.uiView,{sessionId:d.uiId});return true;}
    const requestStatus=guardStudentRequest();
    if(requestStatus!=='ready'){
      if(requestStatus==='loading'&&d.action==='ui-lesson'&&['close','close-dialog'].includes(d.uiCommand))close();
      return true;
    }
    const fields=fieldsFromDataset(d);
    if(d.action==='ui-lesson'&&d.uiCommand!=='launch'){
      const form=dom.querySelector('#ui-lesson-form');
      if(form)Object.assign(fields,Object.fromEntries(new Form(form)));
    }
    if(d.action==='ui-operations'&&d.uiCommand==='apply-filters'){
      for(const control of element?.closest('.ops-filters')?.querySelectorAll('input[name],select[name]')||[])fields[control.name]=control.value;
    }
    if(d.action==='ui-operations'&&d.uiCommand==='preview-reply'){
      const composer=element?.closest('.ops-composer');
      if(overlay||d.uiId!==operations.selectedThreadId||composer?.dataset?.messageThreadId!==d.uiId)return true;
      fields.message=composer.querySelector('[name=message]')?.value||'';
    }
    if(d.action==='ui-operations'&&d.uiCommand==='apply-email-template'){
      const form=element?.closest('form');
      if(form)Object.assign(fields,Object.fromEntries(new Form(form)));
    }
    const accountingItemChange=d.action==='ui-operations'&&['accounting-add-item','accounting-remove-item'].includes(d.uiCommand);
    const accountingItemNames=accountingItemChange?accountingControls().filter(node=>node.name?.startsWith('itemName_')).map(node=>node.name):[];
    if(accountingItemChange)Object.assign(fields,accountingEntryFields(element)||{});
    if(d.action==='ui-account-actions'&&d.uiCommand!=='launch'){
      const form=dom.querySelector('#ui-account-actions-form');
      if(form)Object.assign(fields,Object.fromEntries(new Form(form)));
    }
    if(!overlay){const node=element||dom.activeElement;returnFocus={element:node,dataset:{...node?.dataset}};}
    if(hrKinds.some(kind=>d.action==='ui-'+kind)){
      const kind=d.action.slice(3),extra=kind==='leave'?{...(d.uiStaffId||d.uiCommand==='leave-open-new'?{staffId:d.uiStaffId||d.uiId}:{}),...(d.uiRecordId?{recordId:d.uiRecordId}:{})}:{};
      if(kind==='calendar-sharing'&&d.uiCommand==='calendar-sharing-copy')return copyStaffCalendar(fields);
      return advanceHr(kind,d.uiCommand,{...hrDraft(kind),...fields,...extra});
    }
    if(d.action==='ui-operations'){
      if(overlay==='order-document'){
        if(['close','cancel-accounting'].includes(d.uiCommand)&&cancelAccountingDialog())return true;
        const previous=documentPreview.dialog,position=accountingDialogPosition(previous);
        documentPreview=advanceOperationsPreview({...documentPreview,lang:ctx().t('zh','en')},d.uiCommand,fields);
        drawAccountingTransition(previous,position,null,{orderDocument:true});return true;
      }
      if(d.uiCommand==='cancel-product'&&cancelProductForm())return true;
      if(['close','cancel-accounting'].includes(d.uiCommand)&&cancelAccountingDialog())return true;
      if(d.uiSection==='accounting'&&['apply-filters','clear-filters','accounting-tab'].includes(d.uiCommand)){
        operations=advanceOperations(d.uiCommand,fields);repaintAccountingPage();return true;
      }
      harvestMessage();harvestProduct();
      const previous=operations.dialog,position=accountingDialog(previous)?accountingDialogPosition():null,listPosition=!overlay?accountingListPosition():null,messagePosition=messageDialog(previous)?messageDialogPosition():null,messageList=!overlay?messageListPosition(['preview-reply','preview-message'].includes(d.uiCommand)):null;
      const productBefore=productDialog(previous)?productPosition():null,productList=!overlay&&d.uiSection==='products'?productListPosition():null;
      operations=advanceOperations(d.uiCommand,fields);
      if(productDialog(operations.dialog)&&(!productOwner||operations.dialog.type==='edit-product'&&previous?.type==='product')&&!rememberProductOwner()){repaint();redrawOverlay();return true;}
      if(drawProductTransition(previous,productBefore,productList))return true;
      if(drawAccountingTransition(previous,position,listPosition)){
        if(accountingItemChange)focusAccountingItem(d.uiCommand,accountingItemNames,d.uiValue);
        return true;
      }
      if(drawMessageTransition(previous,messagePosition,messageList))return true;
      overlay=operations.dialog?'operations':null;repaint();redrawOverlay();
      if(d.uiCommand==='product-page'&&d.uiSection==='products'){
        const controls=[...dom.querySelectorAll('button')].filter(node=>!node.disabled&&node.dataset?.action==='ui-operations'&&node.dataset.uiCommand==='product-page'&&node.dataset.uiSection==='products');
        const target=controls.find(node=>node.dataset.uiId===d.uiId)||controls[0]||dom.querySelector('.ops-products-table')||dom.querySelector('.ops-products-filters input[name="query"]');
        target?.focus();
      }
      return true;
    }
    if(d.action==='ui-staff'){
      syncStaff();
      if(['open-detail','detail-tab'].includes(d.uiCommand))calendarCopyEpoch++;
      if(d.uiCommand==='management-section'){
        if(staff.viewer?.role==='admin'&&['directory','roster','leave','attendance','payroll'].includes(d.uiTab)){
          if(overlay)close();staffManagementSection=d.uiTab;repaint();
          [...dom.querySelectorAll('.ui-staff-management-tabs button')].find(node=>node.dataset?.uiTab===d.uiTab)?.focus({preventScroll:true});
        }
        return true;
      }
      if(staff.shared&&d.uiCommand==='retry'){
        if(!staff.sharedLoading&&typeof onRetryStaff==='function')onRetryStaff();
        return true;
      }
      if(d.uiCommand==='open-leave')return advanceHr('leave','leave-open-new',{staffId:d.uiId});
      if(staff.shared&&d.uiCommand==='open-permissions'){
        if(staff.viewer?.role==='admin'&&typeof onManageStaffAccess==='function'&&staff.staff.some(member=>member.id===d.uiId)){close();onManageStaffAccess({resourceId:d.uiId});}
        return true;
      }
      if(staff.shared&&d.uiCommand==='open-edit'&&typeof onEditStaff==='function'){
        const resourceId=d.uiId==='new'?'':d.uiId;
        if(!resourceId||staff.staff.some(member=>member.id===resourceId)){const ticket=suspendStaffReturn(resourceId);onEditStaff({resourceId},ticket);}
        return true;
      }
      if(staff.shared&&d.uiCommand==='open-class'&&typeof onOpenStaffLesson==='function'){
        const selected=staff.classes.find(row=>row.id===d.uiId);
        if(selected){close();onOpenStaffLesson({scheduleId:selected.scheduleId,sequence:selected.sequence,date:selected.date});}
        return true;
      }
      if(d.uiCommand==='workflow'){const facts=staffWorkflowFacts(staff,d.uiId);if(!facts)return true;staff.dialog=null;openLesson(d.uiView||'arrange',facts);return true;}
      staff=advanceStaffPreview(staff,d.uiCommand,fields);
      overlay=staff.dialog?'staff':null;repaint();redrawOverlay();
      if(d.uiCommand==='detail-tab')[...dom.querySelectorAll('.ui-staff-detail-tabs button')].find(node=>node.dataset?.uiTab===d.uiTab)?.focus({preventScroll:true});
      return true;
    }
    if(d.action==='ui-lesson'){
      if(ctx().sharedMode&&ctx().role==='student'&&d.uiCommand==='launch'&&!['student-request','family'].includes(d.uiView))return true;
      if(d.uiCommand==='launch'){const facts=ctx().sharedMode&&d.personId?{sharedPerson:true,personId:d.personId}:ctx().sharedMode&&ctx().role==='student'||d.uiScheduleId?studentLessonFacts(d):{};if(facts)openLesson(d.uiView||'attendance',facts);return true;}
      if(d.uiCommand==='close'||d.uiCommand==='close-dialog'){close();return true;}
      if(!lesson)return true;
      if(lesson?.view==='family'&&lesson.step==='review'&&d.uiCommand==='confirm-preview'){openAccount('family-enrolment',{student:{...lesson.draft},draft:{...lesson.draft},route:lesson.draft?.route});return true;}
      lesson=advanceLessonWorkflow(lesson,d.uiCommand,fields);overlay=lesson?'lesson':null;redrawOverlay();return true;
    }
    if(d.action==='ui-student'){
      if(d.uiCommand==='close'){close();return true;}
      student=advanceStudent(d.uiCommand,fields);overlay=student.dialog?'student':null;repaint();redrawOverlay();return true;
    }
    if(d.action==='ui-account-actions'){
      if(d.uiCommand==='close'){close();return true;}
      if(d.uiCommand==='launch'){openAccount(d.uiView||'activation',ctx().sharedMode&&d.personId?{sharedPerson:true,personId:d.personId}:{});return true;}
      account=advanceAccountActions(account,d.uiCommand,fields);overlay='account';redrawOverlay();return true;
    }
    if(d.action==='ui-data-tools'){
      if(d.uiCommand==='close'){close();return true;}
      dataTools=d.uiCommand==='launch'?{view:d.uiView||'import',entity:d.uiSection||'courses',step:'edit'}:advanceDataTools(dataTools,d.uiCommand,fields);overlay='data-tools';redrawOverlay();return true;
    }
    return false;
  };
  const submit=form=>{
    if(form.id==='ui-operations-form'&&productDialog(operations.dialog)&&!syncProductSource())return true;
    const values=new Form(form),fields=Object.fromEntries(values);
    if(form.id==='ui-operations-form'&&(fields.formSection==='products'||String(fields.formKind||'').includes('product'))&&(!syncProductSource()||overlay!=='operations'||!productDialog(operations.dialog)))return true;
    if(form.id==='shared-lesson-workflow-form')return advanceSharedLesson(sharedLesson?.view==='attendance'&&sharedLesson?.step==='review'?'save':'review',fields,form);
    if(guardStudentRequest(form.id==='ui-lesson-form'?fields:undefined)!=='ready')return true;
    if(hrKinds.some(kind=>form.id===hrModules[kind].formId)){
      const kind=hrKinds.find(key=>form.id===hrModules[key].formId);
      return advanceHr(kind,form.dataset?.uiCommand||`${kind}-review-${kind==='payroll'?'salary':kind==='leave'?'new':'settings'}`,fields);
    }
    if(['ui-operations-form','ui-operations-settings'].includes(form.id)){
      if(overlay==='order-document'){
        const previous=documentPreview.dialog,position=accountingDialogPosition(previous);
        documentPreview=advanceOperationsPreview({...documentPreview,lang:ctx().t('zh','en')},'submit',fields);
        drawAccountingTransition(previous,position,null,{orderDocument:true});return true;
      }
      else {
        const previous=operations.dialog,position=accountingDialog(previous)?accountingDialogPosition():null,messagePosition=messageDialog(previous)?messageDialogPosition():null;
        const productBefore=productDialog(previous)?productPosition():null;
        operations=advanceOperations('submit',{...fields,formKind:fields.formKind||form.dataset.uiForm});
        if(drawProductTransition(previous,productBefore,null))return true;
        if(drawAccountingTransition(previous,position,null))return true;
        if(drawMessageTransition(previous,messagePosition,null))return true;
        overlay=operations.dialog?'operations':null;
      }
    }else if(form.id==='ui-staff-form'){
      syncStaff();
      const repeated=new Form(form);fields.permissions=typeof repeated.getAll==='function'?repeated.getAll('permission'):[];
      staff=advanceStaffPreview(staff,'submit',{...fields,formKind:form.dataset.uiForm||fields.formKind});overlay=staff.dialog?'staff':null;
    }else if(form.id==='ui-lesson-form'){
      if(!lesson)return true;
      lesson=advanceLessonWorkflow(lesson,form.dataset.uiCommand||'review',fields);overlay=lesson?'lesson':null;
      if(lesson?.shared&&lesson.view==='student-request'){redrawOverlay();return true;}
    }else if(form.id==='ui-student-form'){
      fields.items=typeof values.getAll==='function'?values.getAll('item'):[...values].filter(([name])=>name==='item').map(([,value])=>value);
      fields.filename=form.querySelector?.('[name=slip]')?.files?.[0]?.name||'';
      student=advanceStudent('submit',fields);overlay=student.dialog?'student':null;
    }else if(form.id==='ui-account-actions-form'){
      account=advanceAccountActions(account,form.dataset?.uiCommand||'next',fields);overlay='account';
    }else if(form.id==='ui-data-tools-form'){
      fields.columns=typeof values.getAll==='function'?values.getAll('column'):[...values].filter(([name])=>name==='column').map(([,value])=>value);
      dataTools=advanceDataTools(dataTools,'review',{...fields,filename:form.querySelector?.('[name=file]')?.files?.[0]?.name||''});overlay='data-tools';
    }else if(form.matches?.('.ops-filters')){
      operations=advanceOperations('apply-filters',{...fields,section:fields.section||fields.formSection||form.dataset?.uiSection});
      if((fields.section||fields.formSection||form.dataset?.uiSection)==='accounting'){repaintAccountingPage();return true;}
    }else return false;
    repaint();redrawOverlay();return true;
  };
  const keyboard=event=>{
    if(!overlay)return false;
    if(overlay==='operations'&&productDialog(operations.dialog)&&(event.isComposing||event.keyCode===229)){
      if(!productContextKey()||productOwner&&productOwner.key!==productContextKey()){discardProduct();event.preventDefault();return true;}
    }
    if(overlay==='operations'&&productDialog(operations.dialog)&&!syncProductSource()){event.preventDefault();return true;}
    if(overlay==='shared-lesson'){
      if(syncSharedLesson()==='invalid'){event.preventDefault();return true;}
      if(event.isComposing||event.keyCode===229)return true;
      if(sharedLesson?.busy&&event.key==='Escape'){event.preventDefault();return true;}
      if(event.key==='Escape'){event.preventDefault();discardSharedLesson({restore:true});return true;}
    }
    if(!syncSharedPerson()){event.preventDefault();close();return true;}
    const wasLoading=lesson?.requestLoading,requestStatus=syncStudentRequest();
    if(requestStatus==='invalid'){event.preventDefault();close();return true;}
    if(overlay==='operations'&&['product','view-product','create-product','edit-product','stock-product','product-review','stock-product-review'].includes(operations.dialog?.type)&&(event.isComposing||event.keyCode===229))return true;
    if(event.key==='Escape'){event.preventDefault();if(!cancelHr()&&!cancelProductForm()&&!cancelAccountingDialog()&&!cancelMessageDialog())close();return true;}
    if(requestStatus==='loading'&&!wasLoading||requestStatus==='ready'&&wasLoading)redrawOverlay();
    if(event.key==='Tab'){
      const controls=[...dom.querySelectorAll('#modal-root .dialog button:not(:disabled),#modal-root .dialog input:not(:disabled):not([type=hidden]),#modal-root .dialog select:not(:disabled),#modal-root .dialog textarea:not(:disabled),#modal-root .dialog summary,#modal-root .slw-body[tabindex],#modal-root .ops-product-body[tabindex]')].filter(node=>!node.closest('[hidden]')&&(typeof node.getClientRects!=='function'||node.getClientRects().length>0));
      const first=controls[0],last=controls.at(-1);
      if(!controls.includes(dom.activeElement)||event.shiftKey&&dom.activeElement===first||!event.shiftKey&&dom.activeElement===last){event.preventDefault();(event.shiftKey?last:first)?.focus();}
    }
    return true;
  };
  const input=target=>{
    if(captureProductControl(target))return true;
    if(overlay==='shared-lesson'&&target.closest?.('#shared-lesson-workflow-form')){if(syncSharedLesson({capture:false})!=='invalid')captureSharedLessonDraft(target.closest('form'));return true;}
    if(guardStudentRequest()!=='ready')return true;
    if(hrControl(target))return true;
    if(captureAccountingEntry(target))return true;
    if(captureMessageControl(target))return true;
    const accountingFields=accountingFilterFields(target);
    if(accountingFields){operations=advanceOperations('accounting-draft',accountingFields);return true;}
    if(lesson?.shared&&lesson.view==='student-request'&&target.closest?.('#ui-lesson-form'))return true;
    if(target.dataset?.uiCommand==='search'){
      const start=target.selectionStart;staff=advanceStaffPreview(staff,'search',{value:target.value});repaint();const next=dom.querySelector('[data-ui-command="search"]');next?.focus();next?.setSelectionRange?.(start,start);return true;
    }
    return false;
  };
  const change=target=>{
    if(captureProductControl(target))return true;
    if(overlay==='shared-lesson'&&target.closest?.('#shared-lesson-workflow-form')){if(syncSharedLesson({capture:false})==='invalid')return true;captureSharedLessonDraft(target.closest('form'));if(target.dataset?.uiCommand==='filter-date'){const position=sharedLessonPosition();sharedLesson=advanceSharedLessonWorkflow(sharedLesson,'filter-date',{date:target.value});redrawOverlay();restoreSharedLessonPosition(position);}return true;}
    if(guardStudentRequest()!=='ready')return true;
    if(hrControl(target,true))return true;
    if(captureAccountingEntry(target))return true;
    if(captureMessageControl(target))return true;
    const accountingFields=accountingFilterFields(target);
    if(accountingFields){
      if(target.dataset?.uiCommand==='accounting-mode'){
        operations=advanceOperations('accounting-mode',{...accountingFields,value:target.value});repaintAccountingPage();
      }else operations=advanceOperations('accounting-draft',accountingFields);
      return true;
    }
    if(overlay==='lesson'&&target.name==='template'&&target.closest('#ui-lesson-form')){
      const draft=Object.fromEntries(new Form(target.closest('form')));lesson=advanceLessonWorkflow(lesson,'template',draft);redrawOverlay();dom.querySelector('#ui-lesson-form [name=template]')?.focus();return true;
    }
    if(target.dataset?.uiCommand==='filter'){
      staff=advanceStaffPreview(staff,'filter',{value:target.value});repaint();return true;
    }
    return false;
  };
  return {
    operations:section=>{guardStudentRequest();if(section==='products')syncProductSource();return operationsPageMarkup(section,operations,ctx());},
    directory:(accountActions='')=>{guardStudentRequest();syncStaff();return staffManagementMarkup(accountActions);},
    teacherPortal:()=>{guardStudentRequest();syncStaff();if(!staff.shared)staff={...staff,viewerId:ctx().role==='admin'?'maya':'leo'};return staffPortalMarkup(staff,ctx());},
    studentPage:section=>{guardStudentRequest();return studentPortalPageMarkup(section,student,ctx());},
    action,submit,keyboard,input,change,openLesson,openSharedLesson,refreshSharedLesson,openAccount,openOrderDocument,studentLessonFacts,refreshSharedStudentRequest,refreshSharedPerson,refreshSharedStaff,resumeStaffReturn,discardStaffReturn:()=>{staffReturn=null;},close,
    clear:()=>{if(sharedLessonTicket)discardSharedLesson({draw:false});staffReturn=null;staffManagementSection='directory';staffHrReturn=null;staffHrContext='';staffHrPositions=[];fresh();documentPreview=null;returnFocus=null;accountingReturns=[];accountingListReturn=null;},
    get isOpen(){return !!overlay;},
  };
}
