import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {teacherColourChoices,teacherColourPickerMarkup,AVAILABLE_TIME_COLOUR,isTeacherColour} from '../client/teacher-colour-picker.js';
import {createTeacherColourSaver} from '../client/teacher-colour-save.js';
import {schedulingResourceEditorMarkup} from '../client/scheduling-resources-ui.js';
const ctx={t:(_,en)=>en,esc:value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))};
test('twenty stable named choices exclude the reserved availability brand colour',()=>{
 assert.equal(teacherColourChoices.length,20);assert.equal(new Set(teacherColourChoices.map(row=>row.value)).size,20);
 assert.ok(teacherColourChoices.every(row=>/^#[0-9a-f]{6}$/.test(row.value)&&row.zh&&row.en));assert.equal(isTeacherColour(AVAILABLE_TIME_COLOUR),false);
 const html=teacherColourPickerMarkup({value:'#426ea8',teacherId:'teacher-a'},ctx);assert.equal((html.match(/data-teacher-colour=/g)||[]).length,20);assert.match(html,/aria-pressed="true"/);assert.doesNotMatch(html,/type="color"|type="text"|class="modal/);
});
test('scheduling editor submits the selected colour with its existing field and permission controls',()=>{
 const html=schedulingResourceEditorMarkup({kind:'teacher',record:{id:'teacher-a',displayName:'老師',representativeColor:'#426ea8'},canEdit:true},ctx);
 assert.match(html,/type="hidden" name="representativeColor" value="#426ea8"/);assert.match(html,/name="useRepresentativeColor" checked/);assert.doesNotMatch(html,/type="color"/);
});
function fixture(){let state={role:'admin',identity:'admin-a',generation:3,resources:[{id:'teacher-a',kind:'teacher',version:4}]},resolve,calls=[],accepted=[],finished=[];
 const saver=createTeacherColourSaver({context:()=>state,save:(...args)=>{calls.push(args);return new Promise(done=>resolve=done);},accept:row=>accepted.push(row),errorText:()=> 'Could not save'});
 return {get state(){return state;},patch:patch=>state={...state,...patch},saver,calls,accepted,finished,finish:error=>finished.push(error),reply:()=>resolve({resource:{id:'teacher-a',version:5,representativeColor:'#426ea8'}})};
}
test('selection saves only the chosen colour against the exact resource version',async()=>{const f=fixture(),job=f.saver({teacherId:'teacher-a',colour:'#426ea8',finish:f.finish});assert.deepEqual(f.calls[0],[{representativeColor:'#426ea8'},f.state.resources[0]]);f.reply();await job;assert.equal(f.accepted.length,1);assert.deepEqual(f.finished,[undefined]);});
test('reserved colours and non-admin identities cannot save',async()=>{for(const patch of [{colour:AVAILABLE_TIME_COLOUR},{colour:'#ffffff'},{role:'teacher'}]){const f=fixture();if(patch.role)f.patch({role:patch.role});await f.saver({teacherId:'teacher-a',colour:patch.colour||'#426ea8',finish:f.finish});assert.equal(f.calls.length,0);assert.equal(f.accepted.length,0);assert.ok(f.finished[0]);}});
test('late responses after an account switch never update another identity',async()=>{const f=fixture(),job=f.saver({teacherId:'teacher-a',colour:'#426ea8',finish:f.finish});f.patch({identity:'admin-b'});f.reply();await job;assert.equal(f.accepted.length,0);assert.equal(f.finished.length,0);});
test('newer polled resource versions cannot be overwritten by an older save response',async()=>{const f=fixture(),job=f.saver({teacherId:'teacher-a',colour:'#426ea8',finish:f.finish});f.patch({resources:[{id:'teacher-a',kind:'teacher',version:6}]});f.reply();await job;assert.equal(f.accepted.length,0);assert.ok(f.finished[0]);});
test('availability blocks keep a filled brand colour and no border independently of teacher colour settings',()=>{const css=readFileSync(new URL('../client/teacher-colour-picker.css',import.meta.url),'utf8');assert.match(css,/\.tt-lesson\.availability-timetable-slot\{[^}]*background:#27777b[^}]*border:0/);assert.match(css,/grid-template-columns:repeat\(5/);assert.match(css,/width:232px/);});
