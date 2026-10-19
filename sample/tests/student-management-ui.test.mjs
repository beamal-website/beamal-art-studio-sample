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
 const assessment=studentRecordsMarkup('student-assessments',{panel:'templates',query:'"><img src=x>'},ui(false));assert.match(assessment,/Template name/);assert.match(assessment,/value="&quot;&gt;&lt;img src=x&gt;"/);assert.doesNotMatch(assessment,/<img/);
 const cases=studentRecordsMarkup('student-cases',{panel:'enrollment'},ui(false));assert.match(cases,/data-panel="enrollment" aria-pressed="true"/);assert.match(cases,/>Result<\/th>/);
 const notices=studentRecordsMarkup('student-notices',{filter:'past'},ui(true));assert.match(notices,/<option value="past" selected>/);assert.match(notices,/簽署截止日期/);
});
