import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getAccountActionsData,accountActionsMarkup,advanceAccountActions} from '../client/account-actions-ui.js';

const en={t:(_zh,en)=>en},zh={t:zh=>zh};
const launch=view=>advanceAccountActions({},'launch',{view});
const choose=state=>advanceAccountActions(advanceAccountActions(state,'select-course',{id:'example-drawing'}),'select-slot',{id:'example-slot-1'});
const details={displayName:'New Child',dateOfBirth:'2018-05-12',parentName:'Parent Ho',whatsapp:'+852 5550 0103',email:'parent@example.test',school:'Example School',referrer:'Friend'};

test('activation and reset need confirmation and never change the supplied account status',()=>{
 const student={id:'known-child',displayName:'Chloe',email:'student@example.test',activationStatus:'not-activated'};
 const initial=advanceAccountActions({},'launch',{view:'activation',student}),before=JSON.stringify(initial);
 for(const value of ['activate','reset-password']){
  const review=advanceAccountActions(initial,'next',{value});assert.equal(review.step,'review');
  assert.match(accountActionsMarkup(review,en),/Confirm preview/);
  const done=advanceAccountActions(review,'complete');assert.equal(done.step,'complete');
  assert.equal(done.data.student.activationStatus,'not-activated');
  assert.match(accountActionsMarkup(done,en),/No email was sent/);
 }
 assert.equal(JSON.stringify(initial),before);assert.equal(student.activationStatus,'not-activated');
});

test('a shared profile with unknown account linkage never invents activation status or advances an unavailable account operation',()=>{
 const person={id:'actual-second-person',displayName:'Actual <selected> person',email:'contact@example.test',status:'active',activationStatus:'activated'};
 const initial=advanceAccountActions({},'launch',{view:'activation',shared:true,student:person,data:{student:person,courses:[],slots:[]}}),before=JSON.stringify(initial);
 for(const context of [en,zh]){
  const html=accountActionsMarkup(initial,context);
  assert.match(html,context===en?/Account status could not be confirmed/:/帳戶狀態未能確認/);
  assert.match(html,/Actual &lt;selected&gt; person/);assert.doesNotMatch(html,/Not Activated|<dd>Activated<\/dd>|<dd>已啟用<\/dd>|Chloe|example-child|type="password"|Interface preview|Review the screen and flow only/);
  for(const operation of ['activate','reset-password'])assert.match(html,new RegExp(`<button[^>]+data-ui-value="${operation}"[^>]*disabled`));
 }
 for(const command of ['next','submit','complete']){
  const next=advanceAccountActions(initial,command,{value:'activate',operation:'reset-password'});assert.equal(next.step,'details');assert.equal(next.data.student.id,person.id);assert.doesNotMatch(accountActionsMarkup(next,en),/This preview is complete|Confirm password reset preview|Confirm account activation preview/);
 }
 assert.equal(JSON.stringify(initial),before);assert.equal(person.activationStatus,'activated');
 assert.doesNotMatch(accountActionsMarkup({...initial,step:'complete'},en),/This preview is complete/,'A stale presentation step cannot falsely complete a shared account operation');
});

test('shared account linkage belongs to the exact person and means linked rather than activated',()=>{
 const student={id:'person-b',displayName:'Same name'},launchLink=accountLink=>advanceAccountActions({},'launch',{view:'activation',shared:true,student,accountLink});
 const linked=launchLink({studentId:'person-b',userId:'account-b'}),unlinked=launchLink({studentId:'person-b',userId:null}),foreign=launchLink({studentId:'person-a',userId:'account-a'});
 assert.match(accountActionsMarkup(linked,en),/Login account linked/);assert.match(accountActionsMarkup(unlinked,en),/No login account linked/);assert.match(accountActionsMarkup(foreign,en),/Account status could not be confirmed/);
 for(const state of [linked,unlinked,foreign]){assert.doesNotMatch(accountActionsMarkup(state,en),/<dd>Activated<\/dd>|Not Activated|Chloe/);assert.equal(advanceAccountActions(state,'next',{value:'reset-password'}).step,'details');}
});

test('shared account flows without supplied related data keep the actual profile and never borrow sample courses or availability',()=>{
 const student={id:'person-b',displayName:'Actual selected person'},state=advanceAccountActions({},'launch',{view:'trial-application',shared:true,student}),html=accountActionsMarkup(state,en);
 assert.equal(state.data.student.id,student.id);assert.deepEqual(state.data.courses,[]);assert.deepEqual(state.data.slots,[]);assert.equal(state.data.fictional,false);
 assert.match(html,/Course details are not connected yet/);assert.doesNotMatch(html,/Creative Drawing|Clay workshop|example-slot|Fictional example|No courses are available/);
 assert.equal(advanceAccountActions(state,'select-course',{id:'example-drawing'}).draft.courseId,undefined);
});

test('authorized course facts stay bounded instead of borrowing fictional availability',()=>{
 const source={courses:[{id:'real-course',courseName:'Known course'}],slots:[],student:{displayName:'Known child'}};
 const state=advanceAccountActions({},'launch',{view:'trial-application',...source});
 source.courses[0].courseName='Changed elsewhere';assert.equal(state.data.courses[0].courseName,'Known course');
 const selected=advanceAccountActions(state,'select-course',{id:'real-course'});
 assert.match(accountActionsMarkup(selected,en),/No lesson times are available/);
 assert.doesNotMatch(accountActionsMarkup(selected,en),/Creative Drawing|example-slot-1/);
 const missing=advanceAccountActions(selected,'select-slot',{id:'example-slot-1'});assert.equal(missing.draft.slotId,undefined);
});

test('family direct enrollment preserves its route and details across review and back',()=>{
 let state=advanceAccountActions(launch('family-enrolment'),'next',{route:'direct'});
 state=choose(state);state=advanceAccountActions(state,'next');assert.equal(state.step,'details');
 state=advanceAccountActions(state,'next',details);assert.equal(state.step,'review');
 const review=accountActionsMarkup(state,en);assert.match(review,/Direct Enrollment/);assert.match(review,/New Child/);assert.match(review,/Example School/);
 state=advanceAccountActions(state,'back');assert.equal(state.step,'details');assert.equal(state.draft.displayName,'New Child');
 state=advanceAccountActions(state,'back');assert.equal(state.step,'selection');assert.equal(state.draft.slotId,'example-slot-1');
});

test('full or foreign slots cannot be selected and changing course clears the old slot',()=>{
 const state=choose(launch('trial-application'));
 const full=advanceAccountActions(state,'select-slot',{id:'example-slot-full'});
 assert.equal(full.draft.slotId,'example-slot-1');assert.equal(full.error,'slot-unavailable');
 assert.match(accountActionsMarkup(full,en),/data-ui-id="example-slot-full"[^>]*disabled/);
 const changed=advanceAccountActions(state,'select-course',{id:'example-clay'});assert.equal(changed.draft.slotId,undefined);
 const foreign=advanceAccountActions(changed,'select-slot',{id:'example-slot-1'});assert.equal(foreign.draft.slotId,undefined);
 assert.equal(advanceAccountActions(changed,'next').step,'selection');
});

test('invalid dates and contact details retain the draft with an actionable error',()=>{
 const selection=choose(launch('trial-application')),state=advanceAccountActions(selection,'next');
 for(const patch of [{dateOfBirth:'2018-02-30'},{whatsapp:'123'},{email:'invalid'}]){
  const invalid=advanceAccountActions(state,'next',{...details,...patch});
  assert.equal(invalid.step,'details');assert.ok(invalid.error);assert.equal(invalid.draft.school,'Example School');
  assert.match(accountActionsMarkup(invalid,en),/role="alert"/);
 }
});

test('trial application moves selection to details to review to a clearly labeled preview completion',()=>{
 let state=choose(launch('trial-application'));state=advanceAccountActions(state,'next');
 state=advanceAccountActions(state,'next',{...details,displayName:'<Child>'});assert.equal(state.step,'review');
 const html=accountActionsMarkup(state,en);assert.match(html,/&lt;Child&gt;/);assert.doesNotMatch(html,/<Child>/);
 state=advanceAccountActions(state,'complete');assert.equal(state.step,'complete');
 assert.match(accountActionsMarkup(state,en),/No application was submitted/);
 assert.equal(state.applicationId,undefined);assert.equal(state.orderId,undefined);
});

test('both languages expose the required family and trial fields and every control stays in its namespace',()=>{
 const state=advanceAccountActions(choose(launch('trial-application')),'next');
 const html=accountActionsMarkup(state,en),translated=accountActionsMarkup(state,zh);
 for(const name of ['displayName','dateOfBirth','parentName','whatsapp','email','school','referrer'])assert.match(html,new RegExp(`name="${name}"`));
 assert.match(translated,/出生日期/);assert.match(translated,/家長/);assert.match(translated,/介面預覽/);
 assert.match(html,/id="ui-account-actions-form"/);assert.match(html,/data-ui-command="next"/);
 for(const [tag] of html.matchAll(/<button\b[^>]*>/g))assert.ok(tag.includes('data-action="ui-account-actions"')||tag.includes('type="submit"'),tag);
});

test('unknown views stay closed and the fictional examples are returned independently',()=>{
 assert.equal(accountActionsMarkup({view:'unknown'},en),'');
 const first=getAccountActionsData(),second=getAccountActionsData();first.courses[0].courseName='changed';
 assert.notEqual(second.courses[0].courseName,'changed');assert.equal(second.fictional,true);
 assert.match(accountActionsMarkup(launch('trial-application'),en),/Fictional example/);
});
