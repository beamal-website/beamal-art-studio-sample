import test from 'node:test';
import assert from 'node:assert/strict';
import {accessControlMarkup,accessGrantEditorMarkup,accessTeacherLinkEditorMarkup} from '../client/access-control-ui.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const en={t:(_z,e)=>e,esc};
const accounts=[{id:'teacher-a',role:'teacher',displayName:'Same Name'},{id:'teacher-b',role:'teacher',displayName:'Same Name'},{id:'admin-a',role:'admin',displayName:'Maya Admin'}];
const resources=[{id:'resource-a',kind:'teacher',displayName:'Leo resource'},{id:'resource-b',kind:'teacher',displayName:'Other teacher resource'},{id:'room-a',kind:'room',displayName:'Studio A'}];
const teacherLinks=[{teacherResourceId:'resource-a',userId:'teacher-a'},{teacherResourceId:'resource-b',userId:'teacher-b'}];
const grants=[{id:'grant-a',userId:'teacher-a',kind:'resource',resourceId:'resource-b',active:true},{id:'grant-b',userId:'teacher-b',kind:'course',courseId:'course-b',active:true}];
const selector=(html,id)=>html.match(new RegExp('<select id="'+id+'"[^>]*>[\\s\\S]*?<\\/select>'))?.[0]||'';
test('global access controls retain all eligible teachers and teaching resources by default',()=>{
 const links=accessControlMarkup({accounts,resources,teacherLinks},en);assert.match(links,/data-resource-id="resource-a"/);assert.match(links,/data-resource-id="resource-b"/);
 const html=accessControlMarkup({accounts,resources,teacherLinks,grants,selectedUserId:'teacher-b',tab:'grants'},en),select=selector(html,'access-user-filter');
 assert.match(select,/value=""/);assert.match(select,/value="teacher-a"/);assert.match(select,/value="teacher-b" selected/);assert.doesNotMatch(select,/disabled|admin-a/);assert.match(html,/data-grant-id="grant-b"/);assert.doesNotMatch(html,/data-grant-id="grant-a"/);
});
test('a staff subject displays only its own link row and names the current person',()=>{
 const html=accessControlMarkup({accounts,resources,teacherLinks,subjectResourceId:'resource-a',subjectName:'Leo <Teacher>'},en);
 assert.match(html,/<h2 id="access-control-title">Leo &lt;Teacher&gt; · Teacher accounts and read access<\/h2>/);assert.match(html,/data-resource-id="resource-a"/);assert.doesNotMatch(html,/data-resource-id="resource-b"|Other teacher resource|<Teacher>/);
});
test('locked staff grants use the exact account id despite equal display names or stale selected user',()=>{
 const html=accessControlMarkup({accounts,resources,teacherLinks,grants,subjectResourceId:'resource-a',subjectName:'Leo',lockedUserId:'teacher-a',selectedUserId:'teacher-b',tab:'grants'},en),select=selector(html,'access-user-filter');
 assert.match(select,/disabled/);assert.match(select,/value="teacher-a" selected/);assert.doesNotMatch(select,/value="teacher-b"|value=""/);assert.match(html,/data-grant-id="grant-a"/);assert.doesNotMatch(html,/data-grant-id="grant-b"/);
 assert.match(html,/Other teacher resource/,'All resource labels remain available as grant targets.');
});
test('administrator baseline view hides grant tabs and controls even if a grants tab was requested',()=>{
 const html=accessControlMarkup({accounts,resources,teacherLinks,grants,subjectResourceId:'resource-a',subjectName:'Maya',lockedUserId:'admin-a',canViewGrants:false,tab:'grants'},en);
 assert.match(html,/Maya · Teacher accounts/);assert.match(html,/data-resource-id="resource-a"/);assert.doesNotMatch(html,/data-access-tab="grants"|access-user-filter|data-action="access-grant-add"|data-grant-id=/);
});
test('locked grant editor submits its exact teacher through a hidden field while the displayed selector stays locked',()=>{
 const html=accessGrantEditorMarkup({accounts,resources,lockedUserId:'teacher-a',selectedUserId:'teacher-b'},en),select=selector(html,'access-grant-user');
 assert.match(select,/disabled/);assert.match(select,/value="teacher-a" selected/);assert.doesNotMatch(select,/teacher-b|admin-a|value=""/);assert.match(html,/<input type="hidden" name="userId" value="teacher-a">/);assert.match(html,/value="resource-b"/);
 const global=accessGrantEditorMarkup({accounts,resources,selectedUserId:'teacher-b'},en),globalSelect=selector(global,'access-grant-user');assert.match(globalSelect,/value="teacher-a"/);assert.match(globalSelect,/value="teacher-b" selected/);assert.doesNotMatch(globalSelect,/disabled/);assert.doesNotMatch(global,/<input type="hidden" name="userId"/);
});
test('unknown locked accounts never fall back to another teacher and cannot submit a grant',()=>{
 const managed=accessControlMarkup({accounts,resources,grants,lockedUserId:'unknown',tab:'grants'},en),select=selector(managed,'access-user-filter');assert.doesNotMatch(select,/teacher-a|teacher-b|value=""/);assert.match(managed,/data-action="access-grant-add" disabled/);
 const edited=accessGrantEditorMarkup({accounts,resources,lockedUserId:'unknown'},en);assert.doesNotMatch(selector(edited,'access-grant-user'),/teacher-a|teacher-b|value=""/);assert.match(edited,/id="access-save" disabled/);
});
test('pending reads can allow closing while all grant and link mutations stay disabled',()=>{
 const options={accounts,resources,teacherLinks,grants,lockedUserId:'teacher-a',busy:true,allowClose:true};
 const grantsHtml=accessControlMarkup({...options,tab:'grants'},en);
 const closes=grantsHtml.match(/<button[^>]*data-action="access-close"[^>]*>/g)||[];
 assert.equal(closes.length,2);for(const close of closes)assert.doesNotMatch(close,/disabled/);
 assert.match(grantsHtml,/data-action="access-grant-add" disabled/);assert.match(grantsHtml,/data-grant-id="grant-a" disabled/);assert.match(selector(grantsHtml,'access-user-filter'),/disabled/);assert.match(grantsHtml,/data-access-tab="links"[^>]* disabled/);
 const linksHtml=accessControlMarkup(options,en);assert.match(linksHtml,/data-resource-id="resource-a"[^>]* disabled/);
 const savingHtml=accessControlMarkup({...options,allowClose:false},en);
 for(const close of savingHtml.match(/<button[^>]*data-action="access-close"[^>]*>/g)||[])assert.match(close,/disabled/);
 const legacyBusy=accessControlMarkup({accounts,resources,busy:true},en);
 for(const close of legacyBusy.match(/<button[^>]*data-action="access-close"[^>]*>/g)||[])assert.match(close,/disabled/);
});
test('link editor preserves eligible administrator and teacher selection for an explicitly chosen resource',()=>{
 const html=accessTeacherLinkEditorMarkup({resource:resources[0],accounts,current:{userId:'teacher-a',version:3}},en);assert.match(html,/data-resource-id="resource-a"/);assert.match(html,/data-version="3"/);assert.match(html,/value="teacher-a" selected/);assert.match(html,/value="admin-a"/);
});
