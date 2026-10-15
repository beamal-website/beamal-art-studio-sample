import test from 'node:test';
import assert from 'node:assert/strict';
import {publicCourseDetailsMarkup} from '../client/availability-ui.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const helpers={t:(_zh,en)=>en,esc};
const page=state=>publicCourseDetailsMarkup({course:{id:'public-course',courseName:'Drawing',content:{descriptionZh:'畫出日常故事',descriptionEn:'Draw everyday stories',minAgeYears:2.5,maxAgeYears:6}},from:'2026-10-16',to:'2026-10-22',...state},helpers);
test('public course details display only explicitly provided course introduction and fractional recommended ages',()=>{
 const markup=page({});assert.match(markup,/Draw everyday stories/);assert.match(markup,/2\.5/);assert.doesNotMatch(markup,/data-action="course-content-edit"/);
});
test('public content does not borrow legacy age or descriptions and suppresses supplied content while loading or failed',()=>{
 const absent=page({course:{id:'public-course',courseName:'Drawing',age:'LEGACY AGE',zd:'LEGACY TEXT',descriptionEn:'UNSCOPED TEXT'}});assert.doesNotMatch(absent,/LEGACY AGE|LEGACY TEXT|UNSCOPED TEXT|course-content-edit/);
 for(const state of [{loading:true},{error:'Please retry'}])assert.doesNotMatch(page(state),/Draw everyday stories|畫出日常故事/);
});
