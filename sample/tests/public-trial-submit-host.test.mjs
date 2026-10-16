import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicTrialSubmission} from '../client/public-trial-submit.js';

function fixture(send){
 const overlay={courseId:'course-2',slotId:'slot-2',from:'2026-10-19',rangeDays:7,revision:'reviewed',model:{step:'review',draft:{localName:'欣悅',remark:' <raw>\n '},busy:false}};
 let current=true;const changes=[],calls=[];
 const submit=createPublicTrialSubmission(overlay,{isCurrent:()=>current,canSubmit:()=>true,newKey:()=> 'stable-key',send:async(input,key)=>{calls.push({input:structuredClone(input),key});return send?send(input,key):{reference:'TR-123',outcome:'received'};},changed:()=>changes.push(structuredClone(overlay.model)),errorText:()=> 'Try again'});
 return {overlay,submit,calls,changes,invalidate:()=>current=false};
}
test('host freezes exact reviewed course slot fields and one operation key; busy prevents duplicate writes',async()=>{
 let finish;const h=fixture(()=>new Promise(resolve=>finish=resolve)),pending=h.submit();assert.equal(h.overlay.model.busy,true);await h.submit();assert.equal(h.calls.length,1);
 assert.deepEqual(h.calls[0],{input:{courseId:'course-2',slotId:'slot-2',from:'2026-10-19',days:7,revision:'reviewed',applicant:{localName:'欣悅',remark:' <raw>\n '}},key:'stable-key'});
 finish({reference:'TR-123',outcome:'received'});await pending;assert.equal(h.overlay.model.busy,false);assert.deepEqual(h.overlay.model.submission,{reference:'TR-123',outcome:'received'});await h.submit();assert.equal(h.calls.length,1);
});
test('lost acknowledgement retry sends identical payload before any current availability gate; it cannot silently change applicants',async()=>{
 let attempt=0;const h=fixture(()=>{if(++attempt===1)throw new Error('lost response');return {reference:'TR-123',outcome:'received'};});
 await h.submit();assert.equal(h.overlay.model.uncertain,true);assert.equal(h.overlay.model.draft.localName,'欣悅');h.overlay.model.sourceStatus='unavailable';h.overlay.revision='new-public-view';h.overlay.model.draft.localName='different';await h.submit();
 assert.equal(h.calls.length,2);assert.deepEqual(h.calls[0],h.calls[1]);assert.equal(h.overlay.model.submission.reference,'TR-123');
});
test('malformed receipt is uncertain while definitive rejection preserves data and requires review again',async()=>{
 const malformed=fixture(()=>({reference:'TR-123',outcome:'confirmed',email:'private@example.test'}));await malformed.submit();assert.equal(malformed.overlay.model.submission,undefined);assert.equal(malformed.overlay.model.uncertain,true);
 const conflict=fixture(()=>{throw Object.assign(new Error('stale'),{status:409})});await conflict.submit();assert.equal(conflict.overlay.model.stale,true);assert.equal(conflict.overlay.model.uncertain,false);assert.equal(conflict.overlay.model.draft.remark,' <raw>\n ');await conflict.submit();assert.equal(conflict.calls.length,1);
});
test('navigation or identity change makes late receipt inert without reopening or reporting success',async()=>{
 let finish;const h=fixture(()=>new Promise(resolve=>finish=resolve)),pending=h.submit();const before=h.changes.length;h.invalidate();finish({reference:'TR-123',outcome:'received'});await pending;assert.equal(h.overlay.model.submission,undefined);assert.equal(h.changes.length,before);
});
test('a successful HTTP response with unreadable JSON keeps the original request for receipt retry',async()=>{
 let attempt=0;const h=fixture(()=>{if(++attempt===1)throw Object.assign(new Error('unreadable JSON'),{status:201,code:'service_unavailable'});return {reference:'TR-123',outcome:'received'};});
 await h.submit();assert.equal(h.overlay.model.uncertain,true);assert.equal(h.overlay.model.stale,false);await h.submit();assert.deepEqual(h.calls[0],h.calls[1]);assert.equal(h.overlay.model.submission.reference,'TR-123');
});
