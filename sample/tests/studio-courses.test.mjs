import test from 'node:test';
import assert from 'node:assert/strict';
import {studioCourseDirectoryMarkup,studioCourseFromCatalog,studioCourseById,studioCourseRooms,studioCourseDetailsMarkup} from '../client/studio-courses.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ui=language=>({t:(zh,en)=>language==='en'?en:zh,esc});
const records=[{id:'one',courseName:'水彩探索',courseNameEn:'Watercolour',category:'繪畫',level:'Beginner'},{id:'two',courseName:'Pre-Baby Class',courseNameEn:'Updated class'}];
test('public directory contains exactly the supplied published records and never adds old presets',()=>{
 const html=studioCourseDirectoryMarkup({courses:records,...ui('en')});
 assert.equal((html.match(/class="studio-course-row"/g)||[]).length,2);
 assert.match(html,/Watercolour/);assert.match(html,/Updated class/);assert.doesNotMatch(html,/B11|B8|45 minutes|4 \/ 12 \/ 24|b11-pre-baby/);
 assert.equal(studioCourseRooms.length,0);assert.equal(studioCourseById('b11-pre-baby'),null);
 assert.equal((studioCourseDirectoryMarkup(ui('zh')).match(/class="studio-course-row"/g)||[]).length,0);
 const renamed=studioCourseDirectoryMarkup({courses:[{...records[0],courseNameEn:'New name'}],...ui('en')});assert.match(renamed,/New name/);assert.doesNotMatch(renamed,/Updated class|Watercolour/);
});
test('public details use saved names and do not invent ages rooms or class formats',()=>{
 const course=studioCourseFromCatalog(records[1]),html=studioCourseDetailsMarkup({course,serviceCourse:records[1],from:'2026-10-16',to:'2026-10-22'},ui('en'));
 assert.match(html,/Updated class/);assert.doesNotMatch(html,/2.5 years|B11|45 minutes/);
 assert.equal(studioCourseFromCatalog(records[0]).nameZh,'水彩探索');
});
test('published times retain real duration room and teacher facts, with full slots unavailable',()=>{
 const record=records[0],course=studioCourseFromCatalog(record),slot={id:'slot',courseId:record.id,date:'2026-10-20',time:'10:00',duration:60,roomNames:['Studio A'],teacherNames:['Maya'],active:true,trialEnabled:true,trialRemaining:2};
 const options={course,serviceCourse:record,slots:[slot],from:'2026-10-16',to:'2026-10-22'};
 const html=studioCourseDetailsMarkup(options,ui('en'));assert.match(html,/60 minutes/);assert.match(html,/Studio A · Maya/);assert.match(html,/data-trial-timeslot="2026-10-20 10:00"/);
 const full=studioCourseDetailsMarkup({...options,slots:[{...slot,trialRemaining:0}]},ui('en'));assert.match(full,/Full/);assert.doesNotMatch(full,/data-trial-timeslot="2026-10-20 10:00"/);
});
