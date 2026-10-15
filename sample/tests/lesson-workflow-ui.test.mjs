import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonWorkflowMarkup, advanceLessonWorkflow, getLessonWorkflowData } from '../client/lesson-workflow-ui.js';

const en={t:(_zh,english)=>english};
const base=()=>({data:getLessonWorkflowData(),student:{id:'student-a',displayName:'Chloe <Ho>'},lesson:{id:'lesson-a',courseName:'Drawing & Colour',date:'2026-10-16',time:'13:00',teacher:'Leo',capacity:8,occupied:8},draft:{}});
test('attendance includes all approved choices and preserves seat facts without claiming a save',()=>{
 const state={...base(),view:'attendance'},html=lessonWorkflowMarkup(state,en);
 for(const value of ['present','late','absent','leave','sick','other'])assert.match(html,new RegExp('value="'+value+'"'));
 assert.match(html,/Interface preview/);assert.match(html,/do not release a seat/);assert.match(html,/Chloe &lt;Ho&gt;/);
 const saved=advanceLessonWorkflow(state,'save-preview',{attendance:'absent',remark:'Follow up',sticker:'yellow'});
 assert.equal(saved.step,'complete');assert.equal(saved.lesson.occupied,8);assert.equal(saved.draft.attendance,'absent');assert.match(lessonWorkflowMarkup(saved,en),/This preview has been updated/);
});
test('make up flow keeps exact name date accordions and full slots unavailable',()=>{
 const state={...base(),view:'arrange'},html=lessonWorkflowMarkup(state,en);
 assert.match(html,/Make Up This Class/);assert.match(html,/<details/);assert.match(html,/2026-10-17/);assert.match(html,/Pending Confirmation/);
 assert.match(html,/disabled[^>]*>[^<]*Full/s);
 const selected=advanceLessonWorkflow(state,'select-slot',{id:'slot-1'});assert.equal(selected.selectedSlot,'slot-1');
 const review=advanceLessonWorkflow(selected,'review');assert.equal(review.step,'review');assert.match(lessonWorkflowMarkup(review,en),/Review arrangement/);
 const pending=advanceLessonWorkflow(state,'pending');assert.equal(pending.step,'review');assert.equal(pending.draft.arrangement,'pending');assert.equal(pending.selectedSlot,null);
});
test('message preview has channel choice editable text and never creates a sending link',()=>{
 const state={...base(),view:'message'},html=lessonWorkflowMarkup(state,en);assert.match(html,/WhatsApp/);assert.match(html,/App notification/);assert.match(html,/name="message"/);
 const review=advanceLessonWorkflow(state,'review',{channel:'whatsapp',message:'Hello <parent>'});const preview=lessonWorkflowMarkup(review,en);
 assert.match(preview,/Hello &lt;parent&gt;/);assert.match(preview,/Changes appear in this preview only/);assert.doesNotMatch(preview,/href="(?:https:\/\/wa|mailto:)/);
});
test('student requests bind one student and lesson and keep medical upload optional',()=>{
 const html=lessonWorkflowMarkup({...base(),view:'student-request',draft:{requestType:'sick'}},en);
 assert.match(html,/Apply for Sick Leave/);assert.match(html,/2026-10-16/);assert.match(html,/name="reason"/);assert.doesNotMatch(html,/name="attachment"[^>]*required/);
});
test('applicant result and convert remain independent of actual identity payment or enrollment',()=>{
 const state={...base(),view:'applicant',step:'followup'},html=lessonWorkflowMarkup(state,en);
 assert.match(html,/Enrollment Confirmed/);assert.match(html,/Pending Follow-up/);assert.match(html,/Absent/);
 const convert=lessonWorkflowMarkup({...base(),view:'convert'},en);assert.match(convert,/Convert to Student/);assert.match(convert,/Payment and lesson enrollment are separate/);
 const result=advanceLessonWorkflow({...base(),view:'convert'},'save-preview',{displayName:'A'});assert.equal(result.step,'complete');assert.equal(result.student.displayName,'Chloe <Ho>');
});
test('family addition shows trial and direct routes without creating another parent account',()=>{
 const state={...base(),view:'family',step:'add'},html=lessonWorkflowMarkup(state,en);assert.match(html,/Trial Class/);assert.match(html,/Direct Enrollment/);assert.match(html,/existing family login/);
 const review=advanceLessonWorkflow(state,'review',{displayName:'Sibling',route:'direct'});assert.equal(review.step,'review');assert.match(lessonWorkflowMarkup(review,en),/Sibling/);
});
test('unknown view stays closed; required slot and form choices report useful preview errors',()=>{
 assert.equal(lessonWorkflowMarkup({view:'unknown'},en),'');
 const state=advanceLessonWorkflow({...base(),view:'arrange'},'review');assert.equal(state.step,undefined);assert.ok(state.error);
 const full=advanceLessonWorkflow({...base(),view:'arrange'},'select-slot',{id:'slot-full'});assert.notEqual(full.selectedSlot,'slot-full');
});
test('Chinese preview copy and all controls have a consistent integration contract',()=>{
 const html=lessonWorkflowMarkup({...base(),view:'attendance'},{t:zh=>zh});assert.match(html,/介面預覽/);assert.match(html,/出席/);assert.match(html,/id="ui-lesson-form"/);assert.match(html,/data-action="ui-lesson"/);assert.match(html,/aria-modal="true"/);
});
test('message templates produce editable drafts and unchecking the timetable remark clears its preview preference',()=>{
 const message=advanceLessonWorkflow({...base(),view:'message'},'template',{template:'absence'});assert.equal(message.draft.template,'absence');assert.ok(message.draft.message);
 const attendance=advanceLessonWorkflow({...base(),view:'attendance',draft:{showRemark:'yes'}},'save-preview',{attendance:'present'});assert.equal(attendance.draft.showRemark,'');
});
test('student request tabs switch request type while preserving the same student lesson and draft',()=>{
 const state={...base(),view:'student-request',draft:{reason:'Please contact me'}};
 const sick=advanceLessonWorkflow(state,'request-type',{id:'sick'});assert.equal(sick.draft.requestType,'sick');assert.equal(sick.draft.reason,'Please contact me');assert.equal(sick.lesson.id,'lesson-a');
 const html=lessonWorkflowMarkup(sick,en);assert.match(html,/data-ui-command="request-type" data-ui-id="reschedule"/);assert.match(html,/data-ui-command="request-type" data-ui-id="sick"/);assert.match(html,/aria-pressed="true"/);
 assert.equal(getLessonWorkflowData().students[0].dateOfBirth,'2017-04-18');
});
