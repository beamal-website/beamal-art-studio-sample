import test from 'node:test';
import assert from 'node:assert/strict';
import {staffPortalMarkup} from '../client/staff-portal-ui.js';
const state={shared:true,sharedReady:true,sharedSourceReady:true,viewerId:'teacher',viewer:{id:'teacher',displayName:'Leo'},todos:[],todosReady:false,classes:[],today:'2026-10-16'};
test('a real trial follow-up is inside the teacher home and To-do surfaces with a real count and no contradictory unavailable message',()=>{
 for(const portalTab of ['home','todo']){
  const html=staffPortalMarkup({...state,portalTab,todoCategory:'trial'},{trialWork:()=>'<section data-real-trial-work>Exact trial queue</section>',trialPendingTotal:2});
  assert.match(html,/data-real-trial-work/);const trialColumn=html.split('data-todo-category="trial"')[1].split('data-todo-category="payment"')[0];assert.doesNotMatch(trialColumn,/Tasks are not available yet/);assert.match(html,/data-ui-id="trial" aria-current="page"/);assert.ok(html.indexOf('data-real-trial-work')>html.indexOf('<h1'));
 }
});
test('without the authoritative trial source the existing unavailable state does not turn into zero tasks or fixtures',()=>{
 const html=staffPortalMarkup({...state,portalTab:'todo'},{});assert.match(html,/Tasks are not available yet/);assert.doesNotMatch(html,/Exact trial queue|To-do \(0\)/);
});
