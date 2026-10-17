import test from 'node:test';
import assert from 'node:assert/strict';
import {rosterGroupPageMarkup as page,rosterGroupDialogMarkup as dialog,advanceRosterGroupUi as advance} from '../client/staff-roster-groups-ui.js';
const en={t:(_zh,en)=>en},zh={t:zh=>zh};
const fixture=()=>({viewer:{id:'admin-user',role:'admin',teacherResourceIds:['maya']},staff:[{id:'maya',userId:'admin-user',displayName:'Maya Lam'},{id:'leo',userId:'teacher-user',displayName:'Leo Chan'}],profileStaffId:'leo',groups:[{id:'a',name:'Roster A'},{id:'b/晚',name:'Roster B'}],groupsReady:true,groupsLoading:false,groupsError:'',assignments:[{staffId:'maya',groupId:'a'},{staffId:'leo',groupId:'b/晚'}],assignmentsReady:true,assignmentsLoading:false,assignmentsError:'',dialog:null,month:'2026-10'});
const open=(model=fixture(),fields={id:'leo'})=>advance(model,'roster-group-open',fields,en);

test('an exact known profile shows the assigned group and bilingual labels without borrowing another staff assignment',()=>{
 const m=fixture();for(const ctx of [en,zh]){const html=page(m,ctx);assert.match(html,/Roster B/);assert.doesNotMatch(html,/Roster A/);assert.match(html,/data-action="ui-roster-group"[^>]*data-ui-command="roster-group-open"[^>]*data-ui-id="leo"/);}assert.match(page(m,en),/Belongs to Roster Group/);assert.match(page(m,zh),/所屬排班群組/);
});
test('a missing or unready assignment is unknown while only an explicit null assignment means no group',()=>{
 const m=fixture();for(const extra of [{assignmentsReady:false},{assignments:[]},{assignments:[{staffId:'leo'}]},{assignments:[{staffId:'leo',groupId:false}]}]){const html=page({...m,...extra},en);assert.match(html,/unavailable|not available|not provided/);assert.doesNotMatch(html,/Roster B|No roster group/);assert.equal(open({...m,...extra}).dialog.draft.groupChoice,'');}
 const none={...m,assignments:[{staffId:'leo',groupId:null}]};assert.match(page(none,en),/No roster group/);assert.equal(open(none).dialog.draft.groupChoice,'none');
});
test('unready empty ambiguous or missing group sources never guess a name or change an assignment to no group',()=>{
 const m=fixture();for(const extra of [{groupsReady:false},{groups:[]},{groups:[...m.groups,{id:'b/晚',name:'Conflicting group'}]},{groups:[{id:'a',name:'Roster A'}]}]){const source={...m,...extra},html=page(source,en);assert.match(html,/not available|could not be confirmed|No roster groups|unavailable/);assert.doesNotMatch(html,/Roster B|Conflicting group|No roster group<\/dd>/);assert.equal(open(source).dialog.draft.groupChoice,'');}
 assert.match(page({...m,groups:[]},en),/No roster groups are available/);
});
test('both source loading failures and cached refresh failures are readable without exposing diagnostic payloads',()=>{
 const m=fixture();for(const [extra,pattern] of [[{groupsReady:false,groupsLoading:true},/Loading roster groups/],[{assignmentsReady:false,assignmentsLoading:true},/Loading roster group assignment/],[{groupsReady:false,groupsError:'RAW GROUP STACK'},/Could not load roster groups/],[{assignmentsReady:false,assignmentsError:'RAW ASSIGNMENT STACK'},/Could not load roster group assignment/]]){const html=page({...m,...extra},en);assert.match(html,pattern);assert.doesNotMatch(html,/RAW GROUP STACK|RAW ASSIGNMENT STACK/);}
 const refreshed=page({...m,groupsError:'RAW',assignmentsError:'RAW'},en);assert.match(refreshed,/last loaded/);assert.match(refreshed,/Roster B/);assert.doesNotMatch(refreshed,/RAW/);
});
test('Admin opens an exact draft with separately encoded group IDs and unavailable sources require an explicit choice',()=>{
 let m=open();assert.equal(m.dialog.kind,'roster-group-edit');assert.equal(m.dialog.id,'leo');assert.equal(m.dialog.draft.groupChoice,'group:b%2F%E6%99%9A');assert.match(dialog(m,en),/<option value="group:b%2F%E6%99%9A" selected/);
 m=open({...fixture(),groupsReady:false,assignmentsReady:false});assert.equal(m.dialog.draft.groupChoice,'');const html=dialog(m,en);assert.match(html,/<option value="" selected/);assert.match(html,/<option value="none">No roster group/);assert.doesNotMatch(html,/<option value="group:/);
 const invalid=advance(m,'roster-group-review',{groupChoice:''},en);assert.equal(invalid.dialog.kind,'roster-group-edit');assert.ok(invalid.formError);assert.match(dialog(invalid,en),/role="alert"/);
});
test('only available unique source groups or an explicit no-group choice can reach review',()=>{
 const m=fixture();for(const source of [{...m,groupsReady:false},{...m,groups:[]},{...m,groups:[...m.groups,{id:'a',name:'Duplicate'}]}]){const bad=advance(open(source),'roster-group-review',{groupChoice:'group:a'},en);assert.equal(bad.dialog.kind,'roster-group-edit');assert.ok(bad.formError);const none=advance(open(source),'roster-group-review',{groupChoice:'none'},en);assert.equal(none.dialog.kind,'roster-group-review');assert.match(dialog(none,en),/No roster group/);}
 const unknown=advance(open(),'roster-group-review',{groupChoice:'group:missing'},en);assert.equal(unknown.dialog.kind,'roster-group-edit');assert.ok(unknown.formError);
});
test('Teacher is read only and an explicit empty or malformed self list cannot reuse a stale user link',()=>{
 const m=fixture();m.viewer={id:'teacher-user',role:'teacher',teacherResourceIds:['leo']};assert.match(page(m,en),/Roster B/);assert.doesNotMatch(page(m,en),/roster-group-open/);assert.equal(open(m).dialog,null);
 for(const teacherResourceIds of [[],null,'leo',{},['maya']]){const denied={...m,viewer:{...m.viewer,teacherResourceIds}};assert.doesNotMatch(page(denied,en),/Roster B|Leo Chan/);assert.equal(open(denied).dialog,null);}
 assert.match(page({...m,viewer:{id:'teacher-user',role:'teacher'}},en),/Roster B/);
});
test('Student missing whitespace orphan and duplicate staff identities cannot read or edit any group assignment',()=>{
 const m=fixture();for(const extra of [{viewer:{id:'s',role:'student'}},{viewer:{id:' ',role:'admin'}},{viewer:{}},{profileStaffId:'orphan'},{staff:[...m.staff,{...m.staff[1]}]}]){const source={...m,...extra};assert.doesNotMatch(page(source,en),/Roster B|Leo Chan|roster-group-open/);assert.equal(open(source).dialog,null);}
});
test('fixed profile and group source fields cannot be replaced by forged draft or review payloads',()=>{
 const original=fixture();assert.equal(open(original,{id:'maya'}).dialog,null);let m=advance(open(original),'roster-group-review',{groupChoice:'group:a',staffId:'maya',profileStaffId:'maya',groups:[{id:'forged',name:'Fake'}]},en);assert.equal(m.dialog.id,'leo');assert.equal(m.profileStaffId,'leo');assert.equal(m.dialog.kind,'roster-group-review');assert.deepEqual(m.groups,original.groups);assert.deepEqual(m.assignments,original.assignments);
});
test('Review Back and Cancel retain the exact selection and original month without applying it',()=>{
 const original=fixture();let m=advance(open(original),'roster-group-review',{groupChoice:'group:a'},en);assert.equal(m.dialog.kind,'roster-group-review');let html=dialog(m,en);assert.match(html,/Roster A/);assert.match(html,/not been saved/);assert.match(html,/roster-group-save[^>]*disabled/);assert.doesNotMatch(html,/successfully|has been applied|deleted|overwrite/i);
 m=advance(m,'roster-group-cancel',{},en);assert.equal(m.dialog.kind,'roster-group-edit');assert.equal(m.dialog.draft.groupChoice,'group:a');m=advance(m,'roster-group-cancel',{},en);assert.equal(m.dialog,null);assert.equal(m.month,'2026-10');assert.deepEqual(m.assignments,original.assignments);
});
test('identity revision profile or duplicate staff changes clear stale private drafts even on a forged save',()=>{
 const opened=advance(open(),'roster-group-draft',{groupChoice:'group:a'},en);for(const extra of [{viewer:{...opened.viewer,id:'other-admin'}},{viewer:{...opened.viewer,accessRevision:'new'}},{viewer:{...opened.viewer,role:'teacher',teacherResourceIds:[]}},{profileStaffId:'maya'},{staff:[...opened.staff,{...opened.staff[1]}]}]){const changed={...opened,...extra};assert.doesNotMatch(dialog(changed,en),/Leo Chan|name="groupChoice"/);assert.equal(advance(changed,'roster-group-save',{},en).dialog,null);}
});
test('source changes cannot turn a stale removed group choice into a valid review and validation survives harvest',()=>{
 let m=advance(open(),'roster-group-draft',{groupChoice:'group:a'},en);m.groups=m.groups.filter(group=>group.id!=='a');m=advance(m,'roster-group-review',{},en);assert.equal(m.dialog.kind,'roster-group-edit');assert.ok(m.formError);m=advance(m,'roster-group-draft',{groupChoice:'group:a'},en);assert.ok(m.formError);m=advance(m,'roster-group-draft',{groupChoice:'none'},en);assert.equal(m.formError,'');
});
test('duplicate assignments malformed flags or invalid group IDs do not silently become a known assignment',()=>{
 const m=fixture();for(const extra of [{assignments:[...m.assignments,{staffId:'leo',groupId:null}]},{assignmentsReady:'true'},{groupsReady:'true'},{groups:[{id:'',name:'Roster B'}]}]){const source={...m,...extra};assert.doesNotMatch(page(source,en),/Roster B/);assert.equal(open(source).dialog.draft.groupChoice,'');}
});
test('final Save stays disabled and forged submissions cannot alter canonical fields or produce a success notice',()=>{
 const original=fixture(),review=advance(open(original),'roster-group-review',{groupChoice:'none'},en);for(const command of ['roster-group-save','roster-group-submit','save']){const m=advance(review,command,{groupChoice:'group:a',assignments:[]},en);assert.deepEqual(m.assignments,original.assignments);assert.deepEqual(m.groups,original.groups);assert.deepEqual(m.staff,original.staff);assert.equal(m.dialog.kind,'roster-group-review');assert.ok(!m.notice);}
});
test('source labels are escaped and embedded Profile does not duplicate the outside name or heading',()=>{
 const m=fixture();m.staff[1].displayName='<script>Leo</script>';m.groups[1].name='<img src=x onerror=bad>';const standalone=page(m,en)+dialog(open(m),en);assert.doesNotMatch(standalone,/<script>|<img /);assert.match(standalone,/&lt;script&gt;Leo/);assert.match(standalone,/&lt;img /);const embedded=page(m,{...en,embedded:true,profile:true});assert.doesNotMatch(embedded,/<h1|<h2|&lt;script&gt;Leo/);assert.match(embedded,/roster-group-open/);
});
