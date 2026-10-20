import test from 'node:test';
import assert from 'node:assert/strict';
import {workspacePendingCount,workspacePendingCounts} from '../client/workspace-notification.js';
test('workspace badge counts only current authorized pending work and clears after resolution',()=>{
 const input={identity:'admin-A',trial:{identity:'admin-A',ready:true,pendingTotal:2},arrangements:{identity:'admin-A',ready:true,total:1},available:{identity:'admin-A',ready:true,slots:[{id:'slot'}]},requests:{identity:'admin-A',ready:true,requests:[{status:'pending'},{status:'assigned'},{status:'rejected'}]}};
 assert.equal(workspacePendingCount(input),5);
 assert.equal(workspacePendingCount({...input,requests:{...input.requests,requests:[{status:'reviewing'}]}}),5);
 assert.equal(workspacePendingCount({...input,identity:'other'}),0);
 assert.equal(workspacePendingCount({...input,identity:''}),0);
 assert.equal(workspacePendingCount({identity:'admin-A',requests:{...input.requests,ready:false}}),0);
 assert.equal(workspacePendingCount({identity:'admin-A',requests:{...input.requests,requests:[{status:'assigned'}]}}),0);
});

test('workspace child badges separate trial, rescheduling and sick-leave or arrangement work',()=>{
 const identity='manager',counts=workspacePendingCounts({identity,trial:{identity,ready:true,pendingTotal:2},requests:{identity,ready:true,requests:[{type:'reschedule',status:'pending'},{type:'sick',status:'reviewing'},{type:'reschedule',status:'approved'}]}});
 assert.deepEqual(counts,{rescheduling:1,trial:2,payment:0,other:1});
});
