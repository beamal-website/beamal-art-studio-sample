import test from 'node:test';import assert from 'node:assert/strict';
import {formalAvailabilityFields,formalLessonFields,formalCapacityEquation,syncFormalFields,formalPolicyFromFields,formalTrialApplicantsMarkup} from '../client/formal-availability-ui.js';
import {formalAvailabilityPolicy,formalTotalCapacity} from '../shared/formal-availability.js';
const ui={t:(_zh,en)=>en,esc:value=>String(value??'').replaceAll('<','&lt;').replaceAll('"','&quot;')};
test('capacity fields expose each enabled quota and derive regular plus trial plus rescheduling total',()=>{const policy={regularCapacity:6,trialEnabled:true,trialCapacity:2,reschedulingEnabled:true,reschedulingCapacity:1},html=formalAvailabilityFields(policy,ui);assert.match(html,/data-formal-total>9</);assert.match(html,/name="formaltrialEnabled" checked/);assert.match(html,/name="formalreschedulingEnabled" checked/);assert.match(html,/name="formaltrialCapacity"[^>]*value="2" required/);assert.equal(formalTotalCapacity(6,policy),9);});
test('disabled quota fields are hidden, disabled and excluded from the sum',()=>{const html=formalAvailabilityFields({regularCapacity:6,trialEnabled:false,trialCapacity:5,reschedulingEnabled:false,reschedulingCapacity:7},ui);assert.match(html,/data-formal-quota="trial" hidden/);assert.match(html,/data-formal-quota="rescheduling" hidden/);assert.match(html,/data-formal-total>6</);});
test('unchecked fields normalize to zero and enabled fields require valid whole numbers',()=>{assert.deepEqual(formalPolicyFromFields({formaltrialEnabled:'on',formaltrialCapacity:'2',formalreschedulingCapacity:'999'}),{trialEnabled:true,trialCapacity:2,reschedulingEnabled:false,reschedulingCapacity:0});for(const value of ['','0','-1','1.5'])assert.throws(()=>formalPolicyFromFields({formaltrialEnabled:'on',formaltrialCapacity:value}));});
test('legacy blank defaults remain absent and private fields are rejected',()=>{assert.equal(formalPolicyFromFields({formalRegularCapacity:''},{regular:true,optional:true}),null);assert.throws(()=>formalAvailabilityPolicy({trialEnabled:false,trialCapacity:0,reschedulingEnabled:false,reschedulingCapacity:0,teacherIds:['other']}));});
test('only confirmed trial names appear, escaped and separate from paid enrollments',()=>{const html=formalTrialApplicantsMarkup([{displayName:'<private>',status:'accepted'},{displayName:'Pending hidden',status:'pending'}],ui);assert.match(html,/&lt;private>/);assert.match(html,/Trial confirmed/);assert.doesNotMatch(html,/Pending hidden/);assert.doesNotMatch(html,/Paid|data-action|<private>/);});

test('single lesson always shows two quota inputs and starts disabled purposes at zero',()=>{
 const html=formalLessonFields({regularCapacity:8,trialEnabled:false,trialCapacity:5,reschedulingEnabled:true,reschedulingCapacity:2},ui);
 assert.match(html,/Allow trial<\/span><input type="checkbox"/);
 assert.match(html,/name="formaltrialCapacity"[^>]*value="0" disabled/);
 assert.match(html,/name="formalreschedulingCapacity"[^>]*value="2" required/);
 assert.match(html,/8 \+ 2 = 10/);
 assert.doesNotMatch(html,/This lesson|Regular places<|name="capacity"| hidden/);
});
test('single lesson equation includes only enabled purposes',()=>{
 const p={trialEnabled:false,trialCapacity:2,reschedulingEnabled:false,reschedulingCapacity:1};
 assert.equal(formalCapacityEquation(8,p),'8 = 8');
 assert.equal(formalCapacityEquation(8,{...p,trialEnabled:true}),'8 + 2 = 10');
 assert.equal(formalCapacityEquation(8,{...p,reschedulingEnabled:true}),'8 + 1 = 9');
 assert.equal(formalCapacityEquation(8,{...p,trialEnabled:true,reschedulingEnabled:true}),'8 + 2 + 1 = 11');
});
test('single lesson toggle keeps zero quota visible, disables it and excludes it from submission',()=>{
 const trial={checked:true},rescheduling={checked:false},trialInput={value:'2'},reschedulingInput={value:'7'},output={};
 const groups={trial:{querySelector:()=>trialInput},rescheduling:{querySelector:()=>reschedulingInput}};
 const controls={formaltrialEnabled:trial,formalreschedulingEnabled:rescheduling,formaltrialCapacity:trialInput,formalreschedulingCapacity:reschedulingInput};
 const root={hasAttribute:()=>true,dataset:{regularCapacity:'8'},querySelector:selector=>{
  if(selector==='[data-formal-total]')return output;
  const group=selector.match(/data-formal-quota="(\w+)"/);if(group)return groups[group[1]];
  const name=selector.match(/name="(\w+)"/);return name?controls[name[1]]:null;
 }};
 syncFormalFields(root);assert.equal(output.textContent,'8 + 2 = 10');assert.equal(reschedulingInput.disabled,true);assert.equal(reschedulingInput.value,'0');assert.equal(groups.rescheduling.hidden,false);
 trial.checked=false;syncFormalFields(root);assert.equal(trialInput.disabled,true);assert.equal(trialInput.required,false);assert.equal(trialInput.value,'0');assert.equal(output.textContent,'8 = 8');
 trial.checked=true;syncFormalFields(root);assert.equal(trialInput.disabled,false);assert.equal(trialInput.required,true);assert.equal(trialInput.value,'0');
});
