import {operationsPageMarkup,operationsDialogMarkup,getOperationsPreviewData,advanceOperationsPreview} from './operations-ui.js';
import {staffDirectoryMarkup,staffPortalMarkup,staffDialogMarkup,staffInterfacePreviewState,advanceStaffPreview,staffWorkflowFacts} from './staff-portal-ui.js';
import {lessonWorkflowMarkup,getLessonWorkflowData,advanceLessonWorkflow} from './lesson-workflow-ui.js';
import {dataToolsMarkup,advanceDataTools} from './data-tools-ui.js';
import {getStudentPortalData,studentPortalPageMarkup,studentPortalDialogMarkup,advanceStudentPortal} from './student-portal-ui.js';
import {accountActionsMarkup,advanceAccountActions} from './account-actions-ui.js';

// Presentation drafts are deliberately separate from shared business records.
// No API client, browser storage, account changes or message delivery lives here.
export function createInterfacePreview({context,showModal,repaint,dom=document,Form=FormData}) {
  let operations,staff,student,documentPreview=null,account=null,lesson=null,dataTools=null,overlay=null,returnFocus=null;
  const fresh=()=>{operations={data:getOperationsPreviewData(),query:'',status:'all',category:'all',accountingTab:'invoices',selectedThreadId:'thread-1',settingsTab:'general',dialog:null,notice:''};staff=staffInterfacePreviewState();student={data:getStudentPortalData(),section:'profile',requestFilter:'all',notificationFilter:'all',query:'',selectedStudentId:'child-1',dialog:null,notice:''};account=null;lesson=null;dataTools=null;overlay=null;};
  fresh();
  const ctx=()=>context();
  const advanceOperations=(command,fields)=>advanceOperationsPreview({...operations,lang:ctx().t('zh','en')},command,fields);
  const advanceStudent=(command,fields)=>advanceStudentPortal({...student,role:ctx().role,lang:ctx().t('zh','en')},command,fields);
  const redrawOverlay=()=>{
    const html=overlay==='operations'?operationsDialogMarkup(operations,ctx()):overlay==='order-document'?operationsDialogMarkup(documentPreview,ctx()):overlay==='staff'?staffDialogMarkup(staff,ctx()):overlay==='lesson'?lessonWorkflowMarkup(lesson,ctx()):overlay==='student'?studentPortalDialogMarkup(student,ctx()):overlay==='account'?accountActionsMarkup(account,ctx()):overlay==='data-tools'?dataToolsMarkup(dataTools,ctx()):'';
    showModal(html);
    if(html)dom.querySelector('#modal-root .dialog button:not(:disabled),#modal-root .dialog input:not(:disabled),#modal-root .dialog select:not(:disabled)')?.focus();
    else {overlay=null;const original=returnFocus?.element;const replacement=original?.isConnected?original:[...dom.querySelectorAll('button')].find(button=>returnFocus&&Object.keys(returnFocus.dataset).length&&Object.entries(returnFocus.dataset).every(([key,value])=>button.dataset[key]===value));replacement?.focus();returnFocus=null;}
  };
  const close=()=>{operations.dialog=null;staff.dialog=null;student.dialog=null;documentPreview=null;account=null;lesson=null;dataTools=null;overlay=null;redrawOverlay();};
  const fieldsFromDataset=d=>({id:d.uiId,tab:d.uiTab,section:d.uiSection,value:d.uiValue});
  const openLesson=(view,facts={})=>{
    const element=dom.activeElement;returnFocus={element,dataset:{...element?.dataset}};const data=getLessonWorkflowData();lesson={view,step:'edit',student:data.students[0],lesson:{courseName:'創意繪畫 · Creative Drawing',date:'2026-10-16',time:'13:00',duration:60,teacher:'陳子朗 Leo Chan'},data,...facts};overlay='lesson';redrawOverlay();
  };
  const openAccount=(view,facts={})=>{const element=dom.activeElement;returnFocus={element,dataset:{...element?.dataset}};account=advanceAccountActions({},'launch',{view,...facts});overlay='account';redrawOverlay();};
  const openOrderDocument=order=>{
    const element=dom.activeElement;returnFocus={element,dataset:{...element?.dataset}};
    const data=getOperationsPreviewData(),id=order.id;
    data.students=[{id:order.studentId,nameZh:order.studentName,nameEn:order.studentName}];
    data.invoices=[{id,number:id,studentId:order.studentId,date:String(order.updatedAt||order.createdAt||'').slice(0,10),dueDate:order.dueDate||'—',status:order.paymentStatus==='paid'?'paid':'draft',discount:0,orderPreviewSource:true,sourceVersion:order.version,items:[{nameZh:order.items.map(row=>row.courseName||row.feeName).join(' / '),nameEn:order.items.map(row=>row.courseName||row.feeName).join(' / '),quantity:1,unitPrice:order.amountCents/100}],notesZh:'訂單版本 '+order.version+' · 僅預覽版面，尚未生成文件。',notesEn:'Order version '+order.version+' · Layout preview; no document has been generated.'}];
    data.payments=[];documentPreview={data,dialog:{type:'invoice',id}};overlay='order-document';redrawOverlay();
  };
  const studentLessonFacts=d=>{
    const id=student.selectedStudentId||'child-1',registered=id==='child-1'?ctx().student:null,person=registered||student.data.students.find(row=>row.id===id)||{};
    return {student:{...person,...student.data.profileOverrides?.[person.id||id]},lesson:{scheduleId:d.uiScheduleId,sequence:Number(d.uiSequence)||1,date:d.uiLessonDate,time:d.uiLessonTime,courseName:d.uiCourseName},draft:{requestType:d.uiRequestType==='sick'?'sick':'reschedule'}};
  };
  const action=(d,element)=>{
    const fields=fieldsFromDataset(d);
    if(d.action==='ui-lesson'&&d.uiCommand!=='launch'){
      const form=dom.querySelector('#ui-lesson-form');
      if(form)Object.assign(fields,Object.fromEntries(new Form(form)));
    }
    if(d.action==='ui-operations'&&d.uiCommand==='apply-filters'){
      for(const control of element?.closest('.ops-filters')?.querySelectorAll('input[name],select[name]')||[])fields[control.name]=control.value;
    }
    if(d.action==='ui-operations'&&d.uiCommand==='preview-reply')fields.message=element?.closest('.ops-composer')?.querySelector('[name=message]')?.value||'';
    if(d.action==='ui-operations'&&d.uiCommand==='apply-email-template'){
      const form=element?.closest('form');
      if(form)Object.assign(fields,Object.fromEntries(new Form(form)));
    }
    if(d.action==='ui-account-actions'&&d.uiCommand!=='launch'){
      const form=dom.querySelector('#ui-account-actions-form');
      if(form)Object.assign(fields,Object.fromEntries(new Form(form)));
    }
    if(!overlay){const node=element||dom.activeElement;returnFocus={element:node,dataset:{...node?.dataset}};}
    if(d.action==='ui-operations'){
      if(overlay==='order-document'){documentPreview=advanceOperationsPreview({...documentPreview,lang:ctx().t('zh','en')},d.uiCommand,fields);overlay=documentPreview.dialog?'order-document':null;redrawOverlay();return true;}
      operations=advanceOperations(d.uiCommand,fields);
      overlay=operations.dialog?'operations':null;repaint();redrawOverlay();return true;
    }
    if(d.action==='ui-staff'){
      if(d.uiCommand==='workflow'){const facts=staffWorkflowFacts(staff,d.uiId);staff.dialog=null;openLesson(d.uiView||'arrange',facts);return true;}
      staff=advanceStaffPreview(staff,d.uiCommand,fields);
      overlay=staff.dialog?'staff':null;repaint();redrawOverlay();return true;
    }
    if(d.action==='ui-lesson'){
      if(d.uiCommand==='launch'){openLesson(d.uiView||'attendance',d.uiScheduleId?studentLessonFacts(d):{});return true;}
      if(d.uiCommand==='close'||d.uiCommand==='close-dialog'){close();return true;}
      if(lesson?.view==='family'&&lesson.step==='review'&&d.uiCommand==='confirm-preview'){openAccount('family-enrolment',{student:{...lesson.draft},draft:{...lesson.draft},route:lesson.draft?.route});return true;}
      lesson=advanceLessonWorkflow(lesson,d.uiCommand,fields);overlay=lesson?'lesson':null;redrawOverlay();return true;
    }
    if(d.action==='ui-student'){
      if(d.uiCommand==='close'){close();return true;}
      student=advanceStudent(d.uiCommand,fields);overlay=student.dialog?'student':null;repaint();redrawOverlay();return true;
    }
    if(d.action==='ui-account-actions'){
      if(d.uiCommand==='close'){close();return true;}
      if(d.uiCommand==='launch'){openAccount(d.uiView||'activation');return true;}
      account=advanceAccountActions(account,d.uiCommand,fields);overlay='account';redrawOverlay();return true;
    }
    if(d.action==='ui-data-tools'){
      if(d.uiCommand==='close'){close();return true;}
      dataTools=d.uiCommand==='launch'?{view:d.uiView||'import',entity:d.uiSection||'courses',step:'edit'}:advanceDataTools(dataTools,d.uiCommand,fields);overlay='data-tools';redrawOverlay();return true;
    }
    return false;
  };
  const submit=form=>{
    const values=new Form(form),fields=Object.fromEntries(values);
    if(['ui-operations-form','ui-operations-settings'].includes(form.id)){
      if(overlay==='order-document'){documentPreview=advanceOperationsPreview({...documentPreview,lang:ctx().t('zh','en')},'submit',fields);overlay=documentPreview.dialog?'order-document':null;}
      else {operations=advanceOperations('submit',{...fields,formKind:fields.formKind||form.dataset.uiForm});overlay=operations.dialog?'operations':null;}
    }else if(form.id==='ui-staff-form'){
      const repeated=new Form(form);fields.permissions=typeof repeated.getAll==='function'?repeated.getAll('permission'):[];
      staff=advanceStaffPreview(staff,'submit',{...fields,formKind:form.dataset.uiForm||fields.formKind});overlay=staff.dialog?'staff':null;
    }else if(form.id==='ui-lesson-form'){
      lesson=advanceLessonWorkflow(lesson,form.dataset.uiCommand||'review',fields);overlay=lesson?'lesson':null;
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
      operations=advanceOperations('apply-filters',fields);
    }else return false;
    repaint();redrawOverlay();return true;
  };
  const keyboard=event=>{
    if(!overlay)return false;
    if(event.key==='Escape'){event.preventDefault();close();return true;}
    if(event.key==='Tab'){
      const controls=[...dom.querySelectorAll('#modal-root .dialog button:not(:disabled),#modal-root .dialog input:not(:disabled):not([type=hidden]),#modal-root .dialog select:not(:disabled),#modal-root .dialog textarea:not(:disabled),#modal-root .dialog summary')].filter(node=>!node.closest('[hidden]')&&(typeof node.getClientRects!=='function'||node.getClientRects().length>0));
      const first=controls[0],last=controls.at(-1);
      if(!controls.includes(dom.activeElement)||event.shiftKey&&dom.activeElement===first||!event.shiftKey&&dom.activeElement===last){event.preventDefault();(event.shiftKey?last:first)?.focus();}
    }
    return true;
  };
  const input=target=>{
    if(target.dataset?.uiCommand==='search'){
      const start=target.selectionStart;staff=advanceStaffPreview(staff,'search',{value:target.value});repaint();const next=dom.querySelector('[data-ui-command="search"]');next?.focus();next?.setSelectionRange?.(start,start);return true;
    }
    return false;
  };
  const change=target=>{
    if(overlay==='lesson'&&target.name==='template'&&target.closest('#ui-lesson-form')){
      const draft=Object.fromEntries(new Form(target.closest('form')));lesson=advanceLessonWorkflow(lesson,'template',draft);redrawOverlay();dom.querySelector('#ui-lesson-form [name=template]')?.focus();return true;
    }
    if(target.dataset?.uiCommand==='filter'){
      staff=advanceStaffPreview(staff,'filter',{value:target.value});repaint();return true;
    }
    return false;
  };
  return {
    operations:section=>operationsPageMarkup(section,operations,ctx()),
    directory:()=>staffDirectoryMarkup(staff,ctx()),
    teacherPortal:()=>{staff={...staff,viewerId:ctx().role==='admin'?'maya':'leo'};return staffPortalMarkup(staff,ctx());},
    studentPage:section=>studentPortalPageMarkup(section,student,ctx()),
    action,submit,keyboard,input,change,openLesson,openAccount,openOrderDocument,studentLessonFacts,close,
    clear:()=>{fresh();documentPreview=null;returnFocus=null;},
    get isOpen(){return !!overlay;},
  };
}
