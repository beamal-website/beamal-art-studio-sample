import test from 'node:test';
import assert from 'node:assert/strict';
import {studentManagementPages,studentRecordsMarkup} from '../client/student-management-ui.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const ui=zh=>({t:(z,e)=>zh?z:e,esc});
test('four student record pages provide the reference columns without AI, invented records or enabled writes',()=>{
 assert.equal(studentManagementPages.length,5);
 for(const zh of [false,true])for(const [id]of studentManagementPages.slice(1)){
  const html=studentRecordsMarkup(id,{},ui(zh));assert.match(html,/<table>/);assert.match(html,/role="status"/);assert.doesNotMatch(html,/AI Assistant|Enable AI|Chloe|Maya|data-person-id=/);
  for(const button of html.match(/<button[^>]*>[^<]*(?:Create|新增|Export|匯出)<\/button>/g)||[])assert.match(button,/disabled/);
 }
 const journal=studentRecordsMarkup('student-journals',{},ui(false));for(const column of ['Student','Type','Content','Staff name','Created date','Attachments'])assert.ok(journal.includes('>'+column+'</th>'));
 assert.equal(studentRecordsMarkup('unknown',{},ui(false)),'');
});
test('student record panels remain local to each page and escape filter drafts',()=>{
 const assessment=studentRecordsMarkup('student-assessments',{panel:'templates',query:'"><img src=x>'},ui(false));assert.match(assessment,/>Name<\/th>/);assert.match(assessment,/value="&quot;&gt;&lt;img src=x&gt;"/);assert.doesNotMatch(assessment,/<img/);
 const cases=studentRecordsMarkup('student-cases',{panel:'enrollment'},ui(false));assert.match(cases,/data-panel="enrollment" aria-pressed="true"/);assert.match(cases,/>Result<\/th>/);
 const notices=studentRecordsMarkup('student-notices',{filter:'past'},ui(true));assert.match(notices,/<option value="past" selected>/);assert.match(notices,/簽署截止日期/);
});

test('reference assessment templates show their own columns and search without the grading filter',()=>{
 const html=studentRecordsMarkup('student-assessments',{panel:'templates',source:{connected:true,ready:true,total:1,records:[{id:'template-a',title:'Painting review',category:'Art',description:'Colour and composition',staffName:'Owner A',createdAt:'2026-10-20T00:00:00Z'}]}},ui(false));
 for(const title of ['Name','Category','Description','Owner','Uploaded on'])assert.ok(html.includes('>'+title+'</th>'),title);
 assert.doesNotMatch(html,/data-student-record-field="filter"/);assert.match(html,/Painting review/);assert.match(html,/Owner A/);
});

test('reference case panels keep each row aligned with their different date columns',()=>{
 const source={connected:true,ready:true,total:1,records:[{id:'case-a',type:'enrollment',title:'Enrollment request',date:'2026-11-01',status:'open',studentName:'Student A',studentId:'student-a',createdAt:'2026-10-20T00:00:00Z'}]};
 const leave=studentRecordsMarkup('student-cases',{panel:'leave',source},ui(false));assert.match(leave,/>Date<\/th>/);
 const enrollment=studentRecordsMarkup('student-cases',{panel:'enrollment',source},ui(false));assert.doesNotMatch(enrollment,/>Date<\/th>/);assert.doesNotMatch(enrollment,/>2026-11-01<\/td>/);assert.match(enrollment,/Student A/);
});

test('empty reference pages retain the table but omit meaningless pagination',()=>{
 const source={connected:true,ready:true,total:0,records:[],page:1,pageSize:25};
 for(const section of ['student-assessments','student-cases','student-notices']){
  const html=studentRecordsMarkup(section,{source},ui(false));assert.match(html,/<table>/);assert.doesNotMatch(html,/class="sr-pagination"/);assert.match(html,/student-management-search-submit/);
 }
});
