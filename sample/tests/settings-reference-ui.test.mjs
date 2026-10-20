import test from 'node:test';
import assert from 'node:assert/strict';
import {settingsReferenceGroups,settingsReferenceMarkup} from '../client/settings-reference-ui.js';
import {operationsPageMarkup,advanceOperationsPreview} from '../client/operations-ui.js';
const ctx={t:(_zh,en)=>en,settingsReference:true};
test('settings groups follow all 27 inspected SchoolTracs pages with Sales as the default',()=>{
 const html=operationsPageMarkup('settings',{},ctx);assert.equal(settingsReferenceGroups.flatMap(group=>group.items).length,27);
 for(const title of ['SALES','TIMETABLE','COURSE','MESSENGER','NOTIFICATION &amp; REMINDER','STUDENT','STAFF','BRANCH &amp; ORGANIZATION'])assert.ok(html.includes(title),title);
 assert.match(html,/Payment methods/);assert.match(html,/Order display/);assert.match(html,/name="monthlyLastDay"[^>]*checked/);assert.doesNotMatch(html,/ops-heading-icon|portal-settings-tools|General<\/button>/);
});
test('all inspected settings pages render meaningful content in both languages without changing stored settings',()=>{
 for(const group of settingsReferenceGroups)for(const item of group.items)for(const t of [ctx.t,zh=>zh]){
  const html=settingsReferenceMarkup({settingsReferenceTab:item.id},{settings:{general:{studioName:'Beamal'}}},{...ctx,t});assert.ok(html.includes('data-settings-page="'+item.id+'"'));assert.doesNotMatch(html,/undefined|NaN|SchoolTracs POS/);
 }
});
test('reference category selection and preview saving stay local and retain existing legacy settings',()=>{
 let state=advanceOperationsPreview({lang:'en'},'settings-reference-tab',{id:'timetable'});assert.equal(state.settingsReferenceTab,'timetable');
 const before=JSON.stringify(state.data.settings);state=advanceOperationsPreview(state,'submit',{formKind:'settings-reference',settingsTab:'timetable',startTime:'09:00',endTime:'19:00'});
 assert.equal(JSON.stringify(state.data.settings),before);assert.equal(state.settingsReferenceValues.timetable.startTime,'09:00');assert.match(state.notice,/system settings were not changed/);
 assert.match(operationsPageMarkup('settings',state,ctx),/value="09:00"/);
});
test('reference rooms use supplied local resources and never copy the reference account QA rooms',()=>{
 const html=settingsReferenceMarkup({settingsReferenceTab:'rooms'},{},{...ctx,settingsResourcesReady:true,settingsResources:[{id:'a',kind:'room',active:true,displayName:'畫室 A',capacity:8},{id:'b',kind:'teacher',displayName:'PRIVATE TEACHER'}]});
 assert.match(html,/畫室 A/);assert.doesNotMatch(html,/Beamal Room QA|PRIVATE TEACHER/);
});
test('import export upload integrations and destructive reference actions remain disabled',()=>{
 for(const id of ['rooms','holiday','import','integration','delete-all-data']){
  const html=settingsReferenceMarkup({settingsReferenceTab:id},{},ctx);assert.doesNotMatch(html,/type="file"|https?:\/\//);for(const tag of html.match(/<button[^>]*data-settings-inactive[^>]*>/g)||[])assert.match(tag,/disabled/);
 }
});

test('roles and permissions follow the observed role-by-permission matrix rather than an empty list',()=>{
 const html=settingsReferenceMarkup({settingsReferenceTab:'role-and-permission'},{},ctx);assert.match(html,/sr-permissions-table/);for(const label of ['System Administrator','Clerk','Director','Access to Sales','Access to Timetable','Access to Billing'])assert.ok(html.includes(label));assert.ok((html.match(/scope="row"/g)||[]).length>35);
});
