import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createInterfacePreview} from '../client/interface-preview.js';
const t=(_zh,en)=>en;
function preview(){let html='',paints=0;const dom={activeElement:null,querySelector:()=>null,querySelectorAll:()=>[]};class Form{constructor(form){this.entries=Object.entries(form.values||{}).flatMap(([name,value])=>Array.isArray(value)?value.map(item=>[name,item]):[[name,value]]);}*[Symbol.iterator](){yield* this.entries;}getAll(name){return this.entries.filter(([key])=>key===name).map(([,value])=>value);}}const ui=createInterfacePreview({context:()=>({t,role:'teacher'}),showModal:value=>html=value,repaint:()=>paints++,dom,Form});return {ui,get html(){return html;},get paints(){return paints;}};}
test('the presentation host opens staff permissions and validates edits without a business client',()=>{
 const p=preview();assert.match(p.ui.directory(),/Maya Lam|Leo Chan/);
 p.ui.action({action:'ui-staff',uiCommand:'open-edit',uiId:'leo'});assert.match(p.html,/Edit staff profile/);assert.equal(p.ui.isOpen,true);
 assert.equal(p.ui.submit({id:'ui-staff-form',dataset:{uiForm:'edit'},values:{displayName:'',hourlyRate:'100'}}),true);assert.match(p.html,/Enter a display name/);
 p.ui.submit({id:'ui-staff-form',dataset:{uiForm:'edit'},values:{displayName:'Leo Preview',hourlyRate:'250'}});assert.match(p.ui.directory(),/Leo Preview/);assert.equal(p.ui.isOpen,false);assert.equal(p.html,'');
});
test('lesson previews keep the selected student and switch request kind without changing shared lessons',()=>{
 const p=preview();p.ui.openLesson('student-request',{student:{displayName:'<Chloe>'},lesson:{courseName:'Painting',date:'2026-10-16',time:'13:00'}});assert.match(p.html,/&lt;Chloe&gt;/);assert.doesNotMatch(p.html,/<Chloe>/);
 p.ui.action({action:'ui-lesson',uiCommand:'request-type',uiId:'sick'});assert.match(p.html,/Apply for Sick Leave/);
 p.ui.submit({id:'ui-lesson-form',dataset:{uiCommand:'review'},values:{requestType:'sick',reason:'Feeling unwell'}});assert.match(p.html,/Feeling unwell/);assert.match(p.html,/Review request/);
 p.ui.action({action:'ui-lesson',uiCommand:'confirm-preview'});assert.match(p.html,/This preview has been updated|This interface preview has been updated/);
 let prevented=false;p.ui.keyboard({key:'Escape',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(p.html,'');assert.equal(p.ui.isOpen,false);
});
test('import and export buttons open complete review flows without parsing or uploading a file',()=>{
 const p=preview();p.ui.action({action:'ui-data-tools',uiCommand:'launch',uiView:'import',uiSection:'courses'});assert.match(p.html,/Choose a CSV or Excel file/);
 p.ui.submit({id:'ui-data-tools-form',values:{duplicates:'skip'},querySelector:()=>({files:[{name:'Class examples.csv'}]})});assert.match(p.html,/Class examples.csv/);assert.match(p.html,/Mapped field/);
 p.ui.action({action:'ui-data-tools',uiCommand:'complete'});assert.match(p.html,/Preview complete/);
 p.ui.action({action:'ui-data-tools',uiCommand:'close'});assert.equal(p.html,'');
});
test('export review uses every selected field and preserves omitted fields when returning to options',()=>{
 const p=preview();p.ui.action({action:'ui-data-tools',uiCommand:'launch',uiView:'export',uiSection:'students'});
 p.ui.submit({id:'ui-data-tools-form',values:{format:'Excel',range:'page',column:['name','level']}});
 assert.match(p.html,/Excel/);assert.match(p.html,/<td>Name<\/td>/);assert.match(p.html,/<td>Level<\/td>/);assert.doesNotMatch(p.html,/<td>Email<\/td>/);
 p.ui.action({action:'ui-data-tools',uiCommand:'back'});assert.match(p.html,/value="name"[^>]*checked/);assert.doesNotMatch(p.html,/value="email"[^>]*checked/);
});
test('receipt template application reads the selected template and keeps the current recipient',()=>{
 const p=preview();p.ui.action({action:'ui-operations',uiCommand:'receipt-email',uiId:'invoice-1'});
 const form={values:{formKind:'receipt-email',recordId:'invoice-1',recipientEmail:'retained@example.test',templateId:'email-template-2',attachmentName:'current.pdf',subject:'Earlier subject',body:'Earlier body'}};
 p.ui.action({action:'ui-operations',uiCommand:'apply-email-template',uiId:'invoice-1'},{closest:()=>form});
 assert.match(p.html,/retained@example.test/);assert.match(p.html,/Beamal lesson reminder/);assert.doesNotMatch(p.html,/value="Earlier subject"/);assert.match(p.html,/current.pdf/);
});
test('teacher follow-up opens the task’s student and lesson rather than an unrelated default',()=>{
 const p=preview();p.ui.action({action:'ui-staff',uiCommand:'workflow',uiView:'arrange',uiId:'task-chloe'});
 assert.match(p.html,/Chloe Ho/);assert.match(p.html,/Make Up This Class/);assert.match(p.html,/2026-10-16/);
});
test('a selected family member sick-leave action retains that member and its specified lesson',()=>{
 const p=preview();p.ui.action({action:'ui-student',uiCommand:'select-student',uiId:'child-2'});
 p.ui.action({action:'ui-lesson',uiCommand:'launch',uiView:'student-request',uiRequestType:'sick',uiScheduleId:'example-schedule-2',uiSequence:'2',uiLessonDate:'2026-10-24',uiLessonTime:'10:30',uiCourseName:'Creative explorers'});
 assert.match(p.html,/Ethan Ho/);assert.match(p.html,/Apply for Sick Leave/);assert.match(p.html,/2026-10-24/);assert.match(p.html,/10:30/);assert.doesNotMatch(p.html,/Chloe Ho/);
});
test('family handoff keeps the new child details and direct enrollment choice',()=>{
 const p=preview();p.ui.openLesson('family');p.ui.action({action:'ui-lesson',uiCommand:'add-family'});
 p.ui.submit({id:'ui-lesson-form',dataset:{uiCommand:'review'},values:{displayName:'New child',dateOfBirth:'2020-06-08',route:'direct'}});
 p.ui.action({action:'ui-lesson',uiCommand:'confirm-preview'});assert.match(p.html,/Family member enrollment/);assert.match(p.html,/value="direct"[^>]*checked/);
 p.ui.submit({id:'ui-account-actions-form',dataset:{uiCommand:'next'},values:{route:'direct'}});
 p.ui.action({action:'ui-account-actions',uiCommand:'select-course',uiId:'example-drawing'});p.ui.action({action:'ui-account-actions',uiCommand:'select-slot',uiId:'example-slot-1'});
 p.ui.submit({id:'ui-account-actions-form',dataset:{uiCommand:'next'},values:{}});assert.match(p.html,/value="New child"/);assert.match(p.html,/value="2020-06-08"/);
});
test('order document previews use the current amount and version without contaminating accounting samples',()=>{
 const p=preview(),order={id:'OWN-ORDER-V7',studentId:'own-child',studentName:'Own family',amountCents:12345,version:7,paymentStatus:'awaiting-payment',updatedAt:'2026-10-15T08:00:00Z',items:[{courseName:'Own art course'}]},before=JSON.stringify(order);
 p.ui.openOrderDocument(order);assert.match(p.html,/Own family/);assert.match(p.html,/123\.45/);assert.match(p.html,/Order version 7/);assert.match(p.html,/Balance due/);assert.match(p.html,/PDF not generated/);
 assert.doesNotMatch(p.ui.operations('accounting'),/OWN-ORDER-V7|Own family/);
 p.ui.action({action:'ui-operations',uiCommand:'receipt-options',uiId:order.id});assert.match(p.html,/Send by Email/);
 p.ui.action({action:'ui-operations',uiCommand:'receipt-save',uiId:order.id});p.ui.submit({id:'ui-operations-form',values:{formKind:'receipt-save',recordId:order.id,filename:'own-preview.pdf',paperSize:'A4'}});assert.match(p.html,/has not been generated/);
 assert.equal(JSON.stringify(order),before);
});
