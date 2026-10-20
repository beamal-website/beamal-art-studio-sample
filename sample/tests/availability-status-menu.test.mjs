import test from 'node:test';
import assert from 'node:assert/strict';
import {createAvailabilityStatusSaver} from '../client/availability-status-menu.js';
function fixture(save){
 const slot={id:'slot',active:true,version:3,trialReserved:0},state={allowed:true,identity:'admin',generation:1,records:new Map([['slot',slot]])},accepted=[],errors=[],writes=[];
 const toggle=createAvailabilityStatusSaver({context:()=>state,save:async(patch,current)=>{writes.push({patch,current});return save?save(patch,current):{slot:{...current,...patch,version:4}}},accept:s=>accepted.push(s),errorText:e=>errors.push(e)});
 return {slot,state,accepted,errors,writes,toggle};
}
test('status toggle sends only active flag using current version, and accepts canonical response',async()=>{const f=fixture();await f.toggle('slot',false);assert.deepEqual(f.writes,[{patch:{active:false},current:f.slot}]);assert.equal(f.accepted[0].active,false);});
test('inactive time can be reactivated',async()=>{const f=fixture();f.slot.active=false;await f.toggle('slot',true);assert.equal(f.accepted[0].active,true);});
test('teachers and missing slots cannot mutate availability',async()=>{const f=fixture();f.state.allowed=false;await f.toggle('slot',false);f.state.allowed=true;await f.toggle('missing',false);assert.equal(f.writes.length,0);});
test('reserved-slot rejection leaves local record active',async()=>{const error=Object.assign(Error(),{status:409,code:'SLOT_HAS_RESERVATIONS'}),f=fixture(()=>{throw error});await f.toggle('slot',false);assert.equal(f.slot.active,true);assert.equal(f.accepted.length,0);assert.deepEqual(f.errors,[error]);});
test('late reply from previous identity is discarded',async()=>{let resolve;const f=fixture(()=>new Promise(r=>resolve=r)),pending=f.toggle('slot',false);f.state.identity='other-admin';resolve({slot:{...f.slot,active:false,version:4}});await pending;assert.equal(f.accepted.length,0);});
test('newer polled slot cannot be overwritten by late reply',async()=>{let resolve;const f=fixture(()=>new Promise(r=>resolve=r)),pending=f.toggle('slot',false);f.state.records.set('slot',{...f.slot,version:5});resolve({slot:{...f.slot,active:false,version:4}});await pending;assert.equal(f.accepted.length,0);assert.equal(f.errors[0].code,'VERSION_CONFLICT');});
test('duplicate clicks cannot create concurrent writes',async()=>{let resolve;const f=fixture(()=>new Promise(r=>resolve=r)),pending=f.toggle('slot',false);await f.toggle('slot',false);assert.equal(f.writes.length,1);resolve({slot:{...f.slot,active:false,version:4}});await pending;});
test('malformed acknowledgement is rejected',async()=>{const f=fixture((patch,current)=>({slot:{...current,version:4}}));await f.toggle('slot',false);assert.equal(f.accepted.length,0);assert.equal(f.errors.length,1);});
