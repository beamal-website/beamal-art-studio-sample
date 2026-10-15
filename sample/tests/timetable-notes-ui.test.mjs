import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTimetableNoteDraft as validate,timetableNoteDialogMarkup as dialog,timetableNoteButtonMarkup as button} from '../client/timetable-notes-ui.js';
const en={t:(_zh,en)=>en},zh={t:zh=>zh};
const date=()=>({kind:'date',date:'2026-10-16',draft:{text:'Confirm workshop materials.\nAsk the studio manager.'},stage:'edit'});
const lesson=()=>({...date(),kind:'lesson',scheduleId:'schedule-exact',sequence:3,courseName:'Watercolour exploration',time:'13:20'});

test('date note edit clearly identifies its day and provides a labelled bounded native textarea',()=>{
 const html=dialog(date(),en);assert.match(html,/Date note/);assert.match(html,/<time datetime="2026-10-16">2026-10-16<\/time>/);assert.match(html,/id="tt-note-form"/);assert.match(html,/<label[^>]*for="tt-note-text"/);assert.match(html,/<textarea[^>]*id="tt-note-text"[^>]*name="text"[^>]*maxlength="2000"/);assert.match(html,/Confirm workshop materials\.\nAsk the studio manager\./);assert.doesNotMatch(html,/<form[^>]*data-action=/);assert.match(html,/data-action="tt-note-close"/);assert.match(html,/data-action="tt-note-cancel"/);assert.match(html,/Review/);
});

test('lesson note context is exact and readable without exposing opaque scheduling IDs as product copy',()=>{
 const m=lesson(),before=JSON.stringify(m),html=dialog(m,en);assert.match(html,/Lesson note/);assert.match(html,/Watercolour exploration/);assert.match(html,/2026-10-16/);assert.match(html,/13:20/);assert.match(html,/Lesson 3/);assert.doesNotMatch(html,/schedule-exact/);assert.equal(JSON.stringify(m),before);assert.match(dialog(m,zh),/課堂備忘|第 3 堂|13:20/);
});

test('review shows full original text and unsaved state with Back and a genuinely disabled final Save',()=>{
 const m={...lesson(),stage:'review'},html=dialog(m,en);assert.match(html,/This note has not been saved/);assert.match(html,/class="tt-note-text"/);assert.match(html,/Confirm workshop materials\.\nAsk the studio manager\./);assert.match(html,/data-action="tt-note-back"/);assert.match(html,/<button[^>]*data-action="tt-note-save"[^>]*disabled/);assert.doesNotMatch(html,/<textarea|No (?:notes|records)|Saved successfully|Note saved/);assert.match(dialog(m,zh),/這則備忘尚未儲存/);
});

test('validation rejects blank or malformed note text and accepts an actual 2000-character multiline note',()=>{
 for(const text of ['', ' \n\t ',undefined,null,5,{},[]])assert.equal(validate({...date(),draft:{text}}),'text');assert.equal(validate({...date(),draft:{text:'a'.repeat(2000)}}),'');assert.equal(validate({...date(),draft:{text:'a'.repeat(2001)}}),'length');assert.equal(validate({...date(),draft:{text:'  Keep these margins.\n\nSecond paragraph.  '}}),'');
});

test('invalid dates or ambiguous lesson identities cannot create an active note editor or launch button',()=>{
 const variants=[{...date(),date:'2026-02-30'},{...date(),date:'0000-01-01'},{...date(),kind:'student'},{...lesson(),scheduleId:''},{...lesson(),scheduleId:' '.repeat(2)},{...lesson(),sequence:0},{...lesson(),sequence:'3'},{...lesson(),sequence:1.5},{...lesson(),time:'25:00'}];for(const m of variants){assert.equal(validate(m),'context');assert.doesNotMatch(dialog(m,en),/<textarea|Watercolour exploration/);assert.match(dialog(m,en),/unavailable/);assert.match(button(m,en),/disabled/);}
});

test('missing optional lesson labels and start time remain unknown rather than borrowing a class or midnight',()=>{
 const m={...lesson(),courseName:undefined,time:undefined},html=dialog(m,en);assert.equal(validate(m),'');assert.match(html,/Course name unavailable/);assert.match(html,/Start time unavailable/);assert.doesNotMatch(html,/00:00|Watercolour exploration|Chloe|Maya/);
});

test('untrusted source labels note text and injected markup are rendered as text',()=>{
 const m={...lesson(),courseName:'<img src=x onerror=bad>',draft:{text:'</textarea><script>bad()</script>\n& "quotes"'}},html=dialog(m,en)+dialog({...m,stage:'review'},en);assert.doesNotMatch(html,/<img|<script>|onerror="/);assert.match(html,/&lt;img/);assert.match(html,/&lt;\/textarea&gt;&lt;script&gt;/);assert.match(html,/&amp; &quot;quotes&quot;/);
});

test('local errors are accessible natural messages and never reveal raw diagnostics',()=>{
 for(const [error,pattern]of [['text',/Enter a note/],['length',/2,000 characters/],['context',/unavailable/],['PRIVATE SQL STACK',/Check the note/]]){const html=dialog({...date(),error},en);assert.match(html,/role="alert"/);assert.match(html,pattern);assert.doesNotMatch(html,/PRIVATE SQL STACK/);}assert.match(dialog({...date(),error:'text'},en),/aria-invalid="true"/);
});

test('date and lesson launchers are small native icon controls with complete accessible context',()=>{
 const day=button(date(),en),slot=button(lesson(),en);assert.match(day,/class="tt-note-icon"/);assert.match(day,/data-action="tt-note-open"/);assert.match(day,/data-note-kind="date"/);assert.match(day,/data-date="2026-10-16"/);assert.match(day,/aria-label="Date note: 2026-10-16"/);assert.match(day,/<svg[^>]*aria-hidden="true"/);assert.match(slot,/data-schedule-id="schedule-exact"/);assert.match(slot,/data-sequence="3"/);assert.match(slot,/data-time="13:20"/);assert.match(slot,/aria-label="Lesson note: Watercolour exploration, 2026-10-16, 13:20, Lesson 3"/);assert.doesNotMatch(day,/>Date note<|>2026-10-16</);
});

test('review invalid text cannot expose an enabled final submit or claim any storage action happened',()=>{
 for(const m of [{...date(),stage:'review',draft:{text:''}},{...lesson(),stage:'review',draft:{text:'z'.repeat(2001)}}]){const html=dialog(m,en);assert.match(html,/role="alert"/);assert.match(html,/data-action="tt-note-save"[^>]*disabled/);assert.doesNotMatch(html,/Saved|No notes|No records/);}
});
