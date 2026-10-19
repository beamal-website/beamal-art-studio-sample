import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTimetableNoteDraft as validate,timetableNoteDialogMarkup as dialog,timetableNoteButtonMarkup as button} from '../client/timetable-notes-ui.js';
const en={t:(_zh,en)=>en},zh={t:zh=>zh};
const date=()=>({kind:'date',date:'2026-10-16',draft:{text:'Confirm workshop materials.\nAsk the studio manager.'},stage:'edit'});
const lesson=()=>({...date(),kind:'lesson',scheduleId:'schedule-exact',sequence:3,courseName:'Watercolour exploration',time:'13:20'});

test('date note edit clearly identifies its day and provides a labelled bounded native textarea',()=>{
 const html=dialog(date(),en);assert.match(html,/Date note/);assert.match(html,/<time datetime="2026-10-16">2026-10-16<\/time>/);assert.match(html,/id="tt-note-form"/);assert.match(html,/<label[^>]*for="tt-note-text"/);assert.match(html,/<textarea[^>]*id="tt-note-text"[^>]*name="text"[^>]*maxlength="2000"/);assert.match(html,/Confirm workshop materials\.\nAsk the studio manager\./);assert.doesNotMatch(html,/<form[^>]*data-action=/);assert.match(html,/data-action="tt-note-close"/);assert.match(html,/data-action="tt-note-cancel"/);assert.match(html,/>Save<\/button>/);assert.doesNotMatch(html,/>Review<\/button>/);assert.match(html,/data-ui-command="tt-note-save"/);assert.match(dialog(date(),zh),/>儲存<\/button>/);
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
 const day=button(date(),en),slot=button(lesson(),en);assert.match(day,/class="tt-note-icon tt-note-empty"/);assert.match(day,/data-action="tt-note-open"/);assert.match(day,/data-note-kind="date"/);assert.match(day,/data-date="2026-10-16"/);assert.match(day,/aria-label="Date note: 2026-10-16"/);assert.match(day,/<svg[^>]*aria-hidden="true"/);assert.match(slot,/data-schedule-id="schedule-exact"/);assert.match(slot,/data-sequence="3"/);assert.match(slot,/data-time="13:20"/);assert.match(slot,/aria-label="Lesson note: Watercolour exploration, 2026-10-16, 13:20, Lesson 3"/);assert.doesNotMatch(day,/>Date note<|>2026-10-16</);
});

test('review invalid text cannot expose an enabled final submit or claim any storage action happened',()=>{
 for(const m of [{...lesson(),stage:'review',draft:{text:''}},{...lesson(),stage:'review',draft:{text:'z'.repeat(2001)}}]){const html=dialog(m,en);assert.match(html,/role="alert"/);assert.match(html,/data-action="tt-note-save"[^>]*disabled/);assert.doesNotMatch(html,/Saved|No notes|No records/);}
});

const serviceLesson=(extra={})=>({...lesson(),courseId:'course-exact',sourceVersion:7,sourceStatus:'ready',capabilities:{save:true},note:{scheduleId:'schedule-exact',sequence:3,courseId:'course-exact',date:'2026-10-16',time:'13:20',sourceVersion:7,version:0,text:'',updatedAt:null,canWrite:true},...extra});
const action=(html,name)=>html.match(new RegExp('<button\\b[^>]*data-action="'+name+'"[^>]*>'))?.[0];
const disabled=button=>!!button&&/\sdisabled(?:\s|>)/.test(button);
test('an exact ready writable lesson enables only its valid Review Save without claiming it has saved',()=>{
 const model=serviceLesson({stage:'review'}),before=JSON.stringify(model),html=dialog(model,en);assert.ok(action(html,'tt-note-save'));assert.equal(disabled(action(html,'tt-note-save')),false);assert.match(action(html,'tt-note-save'),/type="button"/);assert.match(html,/This note has not been saved/);assert.doesNotMatch(html,/Note saved|Saved successfully/);assert.match(html,/id="tt-note-body"[^>]*tabindex="0"/);assert.equal(JSON.stringify(model),before);
});
test('date and legacy lesson drafts never gain persistence from a capability or a forged note object',()=>{
 const forgedDate=dialog({...serviceLesson(),kind:'date',stage:'edit'},en);assert.doesNotMatch(forgedDate,/<textarea|id="tt-note-save"/);assert.ok(disabled(action(dialog({...lesson(),capabilities:{save:true},stage:'review'},en),'tt-note-save')));
 for(const save of [undefined,false,1,'true',null]){const html=dialog(serviceLesson({capabilities:{save},stage:'review'}),en);assert.ok(!action(html,'tt-note-save')||disabled(action(html,'tt-note-save')));}
});
test('invalid or mismatched persisted note facts never expose another lesson text or enable Save',()=>{
 const base=serviceLesson(),notes=[null,{...base.note,scheduleId:'different'},{...base.note,sequence:4},{...base.note,courseId:'different'},{...base.note,date:'2026-10-17'},{...base.note,time:'13:30'},{...base.note,sourceVersion:6},{...base.note,version:-1},{...base.note,version:'1'},{...base.note,sourceVersion:0},{...base.note,updatedAt:'not-a-date',version:1},{...base.note,canWrite:'true'},{...base.note,text:null}];
 for(const note of notes){const html=dialog({...base,note:note&&{...note,text:note.text===null?null:'UNRELATED PRIVATE NOTE'},stage:'review'},en);assert.ok(!action(html,'tt-note-save')||disabled(action(html,'tt-note-save')));assert.doesNotMatch(html,/UNRELATED PRIVATE NOTE/);assert.match(html,/unavailable|Could not load/);}
});
test('only an existing validated lesson note may be cleared and Review explicitly describes clearing it',()=>{
 const initial=serviceLesson({draft:{text:''}});assert.equal(validate(initial),'text');assert.ok(disabled(action(dialog({...initial,stage:'review'},en),'tt-note-save')));
 const existing=serviceLesson({draft:{text:''},note:{...initial.note,version:2,text:'Original note',updatedAt:'2026-10-16T01:02:03.000Z'}}),before=JSON.stringify(existing);assert.equal(validate(existing),'');const html=dialog({...existing,stage:'review'},en);assert.match(html,/clear|removed/i);assert.equal(disabled(action(html,'tt-note-save')),false);assert.match(dialog({...existing,stage:'review'},zh),/清空/);assert.equal(JSON.stringify(existing),before);
 assert.equal(validate({...existing,draft:{text:'  \n  '}}),'');assert.equal(validate({...existing,draft:{text:'a'.repeat(2001)}}),'length');assert.equal(validate({...existing,draft:{text:null}}),'text');
});
test('a read-only grant shows only authoritative note content and Close without an editable draft or Review',()=>{
 const base=serviceLesson(),model={...base,draft:{text:'UNSAVED FORGED DRAFT'},note:{...base.note,version:2,text:'Canonical <saved> note',updatedAt:'2026-10-16T01:02:03.000Z',canWrite:false}},html=dialog(model,en);assert.match(html,/Canonical &lt;saved&gt; note/);assert.doesNotMatch(html,/UNSAVED FORGED DRAFT|<textarea|<form\b|data-action="tt-note-save"|data-action="tt-note-back"|>Review</);assert.match(html,/read.only/i);assert.ok(action(html,'tt-note-close'));assert.doesNotMatch(html,/course-exact|schedule-exact/);
});
test('loading and failed note reads distinguish unknown content from an empty note and provide retry',()=>{
 for(const sourceStatus of ['loading','error']){const model=serviceLesson({sourceStatus,note:null,readError:'PRIVATE SQL STACK'}),html=dialog(model,en);assert.match(html,/Watercolour exploration|2026-10-16/);assert.match(html,sourceStatus==='loading'?/Loading/:/Could not load/);assert.doesNotMatch(html,/<textarea|No note yet|PRIVATE SQL STACK/);assert.ok(action(html,'tt-note-retry'));assert.ok(!action(html,'tt-note-save')||disabled(action(html,'tt-note-save')));}
 const base=serviceLesson(),html=dialog({...base,sourceStatus:'error',draft:{text:'Native raw\n草稿'}},en);assert.match(html,/Native raw\n草稿/);assert.match(html,/<textarea/);assert.ok(disabled(html.match(/<button\b[^>]*id="tt-note-review"[^>]*>/)?.[0]));
});
test('busy lesson notes lock native controls and all exits while keeping raw input and reporting saving',()=>{
 for(const stage of ['edit','review']){const model=serviceLesson({busy:true,stage,draft:{text:' Keep\n原文 '}}),before=JSON.stringify(model),html=dialog(model,en);assert.match(html,/<form[^>]*aria-busy="true"/);const buttons=html.match(/<button\b[^>]*>/g)||[];assert.ok(buttons.length>=3);assert.ok(buttons.every(disabled));if(stage==='edit')assert.match(html,/<textarea[^>]*disabled/);else assert.match(html,/Saving/);assert.match(html,/ Keep\n原文 /);assert.equal(JSON.stringify(model),before);}
});
test('stale and failed Saves keep exact drafts with focused escaped feedback and safe Back Close controls',()=>{
 const base=serviceLesson({stage:'review'}),stale={...base,stale:true,saveError:'Generic retry message'},html=dialog(stale,en);assert.match(html,/changed|reopen/);assert.ok(disabled(action(html,'tt-note-save')));assert.equal(disabled(action(html,'tt-note-back')),false);assert.equal(disabled(action(html,'tt-note-close')),false);assert.match(html,/id="tt-note-save-error"[^>]*role="alert"[^>]*tabindex="-1"/);assert.ok(html.indexOf('id="tt-note-save-error"')<html.indexOf('id="tt-note-body"'));
 const failed=dialog({...base,saveError:'Could not save <script>private</script> & retry.'},en);assert.match(failed,/Could not save &lt;script&gt;private&lt;\/script&gt; &amp; retry/);assert.doesNotMatch(failed,/<script>/);assert.equal(disabled(action(failed,'tt-note-save')),false);assert.match(dialog(base,en),/id="tt-note-save-error"[^>]*hidden/);assert.equal(base.draft.text,lesson().draft.text);
});
test('temporary loss of the save capability retains the writable draft while loading disables its textarea',()=>{
 for(const sourceStatus of ['loading']){
  const model=serviceLesson({sourceStatus,capabilities:{save:false},draft:{text:' Original native\n中文草稿 '}}),before=JSON.stringify(model),html=dialog(model,en);assert.match(html,/ Original native\n中文草稿 /);assert.match(html,/<form[^>]*id="tt-note-form"/);assert.match(html,/<textarea[^>]*disabled/);assert.ok(disabled(html.match(/<button\b[^>]*id="tt-note-review"[^>]*>/)?.[0]));assert.doesNotMatch(html,/This note is read-only|No note yet/);assert.equal(disabled(action(html,'tt-note-close')),false);assert.equal(JSON.stringify(model),before);
 }
});
test('a stale writable note retains the raw draft when save capability is temporarily false without treating it as a read-only grant',()=>{
 const model=serviceLesson({stage:'review',stale:true,capabilities:{save:false},draft:{text:'New unsaved text\n第二行'}}),before=JSON.stringify(model),html=dialog(model,en);assert.match(html,/New unsaved text\n第二行/);assert.match(html,/changed/);assert.doesNotMatch(html,/This note is read-only|No note yet/);assert.ok(disabled(action(html,'tt-note-save')));assert.equal(disabled(action(html,'tt-note-back')),false);assert.equal(disabled(action(html,'tt-note-close')),false);assert.match(dialog({...model,stage:'edit'},en),/<textarea[^>]*>New unsaved text\n第二行<\/textarea>/);assert.equal(JSON.stringify(model),before);
});
test('a known writable note remains locally editable after a failed poll without allowing Review Save or unauthorized editing',()=>{
 const model=serviceLesson({sourceStatus:'error',capabilities:{save:false},draft:{text:' Original native\n可續寫草稿 '}}),before=JSON.stringify(model),html=dialog(model,en),textarea=html.match(/<textarea\b[^>]*>/)?.[0];assert.ok(textarea);assert.equal(disabled(textarea),false);assert.match(html,/ Original native\n可續寫草稿 /);assert.match(html,/Could not update/);assert.ok(disabled(html.match(/<button\b[^>]*id="tt-note-review"[^>]*>/)?.[0]));assert.ok(disabled(action(dialog({...model,stage:'review'},en),'tt-note-save')));assert.equal(JSON.stringify(model),before);
 assert.match(dialog({...model,busy:true},en),/<textarea[^>]*disabled/);for(const sourceStatus of ['loading','error'])assert.doesNotMatch(dialog({...model,sourceStatus,note:null},en),/<form\b|<textarea|No note yet/);assert.doesNotMatch(dialog({...model,note:{...model.note,canWrite:false}},en),/<textarea|<form\b|可續寫草稿/);
});

test('a loaded date note saves directly from its textarea and preserves Cancel in both languages',()=>{
 const model={...date(),sourceStatus:'ready',capabilities:{save:true},note:{date:'2026-10-16',version:1,text:'Saved note',updatedAt:'2026-10-16T01:02:03.000Z',canWrite:true}};
 for(const ctx of [en,zh]){
  const html=dialog(model,ctx);assert.match(html,/<textarea/);assert.match(html,/data-ui-command="tt-note-save"/);assert.match(html,/id="tt-note-save"[^>]*>(Save|儲存)<\/button>/);assert.doesNotMatch(html,/id="tt-note-save"[^>]*disabled|>Review<|>核對</);assert.ok(action(html,'tt-note-cancel'));
 }
 for(const patch of [{busy:true},{stale:true},{sourceStatus:'error'},{note:{...model.note,date:'2026-10-17'}}])assert.doesNotMatch(dialog({...model,...patch},en),/id="tt-note-save"(?![^>]*disabled)[^>]*>/);
 const cleared={...model,draft:{text:''}};assert.equal(validate(cleared),'');assert.equal(validate({...cleared,note:{...model.note,version:0,updatedAt:null}}),'text');
});

test('date note icons distinguish saved content from empty or unknown dates without changing lesson icons',()=>{
 const present=button({...date(),hasNote:true},en),empty=button({...date(),hasNote:false},en),unknown=button(date(),en);
 assert.match(present,/tt-note-present/);assert.match(present,/aria-description="Has a saved note"/);assert.match(empty,/tt-note-empty/);assert.match(empty,/aria-description="No saved note"/);assert.match(unknown,/data-note-status="unknown"/);
 assert.doesNotMatch(button({...lesson(),hasNote:false},en),/tt-note-empty|data-note-status=/);assert.match(button({...date(),hasNote:true},zh),/已有備忘/);
});
