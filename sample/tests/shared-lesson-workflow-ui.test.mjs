import test from 'node:test';
import assert from 'node:assert/strict';
import {sharedLessonWorkflowMarkup as markup,advanceSharedLessonWorkflow as advance} from '../client/shared-lesson-workflow-ui.js';

const en={t:(_zh,en)=>en},zh={t:zh=>zh};
const base=(view='attendance')=>({view,step:'edit',student:{id:'student-second',displayName:'Isla <Second>',attendance:'unmarked',remark:'Existing session note'},lesson:{id:'session-second',scheduleId:'series-second',sequence:3,courseId:'course-second',courseName:'Print & colour',date:'2026-11-02',time:'15:15',duration:45,teacher:'Teacher B',room:'Studio 2'},draft:{},availability:{ready:false,slots:[]},capabilities:{save:false}});
const slot=(extra={})=>({id:'slot-second',eligible:true,date:'2026-11-09',time:'15:30',duration:45,courseName:'Print & colour',teacher:'Teacher C',room:'Studio 1',available:2,...extra});
const ready=(slots=[slot()])=>({...base('arrange'),availability:{ready:true,slots}});
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};

test('attendance shows only its supplied student and exact session with six explicit states and no automatic present',()=>{
 const html=markup(base(),en);assert.match(html,/Isla &lt;Second&gt;/);assert.match(html,/Print &amp; colour/);assert.match(html,/2026-11-02/);assert.match(html,/15:15/);assert.match(html,/Teacher B/);
 for(const status of ['present','late','absent','leave','sick','other'])assert.match(html,new RegExp('name="attendance"[^>]*value="'+status+'"'));
 assert.doesNotMatch(html,/name="attendance"[^>]*checked|name="sticker"[^>]*checked|name="showRemark"[^>]*checked|Chloe|Creative Drawing|Interface preview|Preview complete/);assert.match(html,/name="remark"/);assert.match(html,/name="sticker"/);assert.match(html,/name="showRemark"/);
 const changed=advance(base(),'draft',{attendance:'present'});assert.equal(Object.hasOwn(changed.draft,'sticker'),false);assert.equal(Object.hasOwn(changed.draft,'showRemark'),false);assert.equal(Object.hasOwn(changed.student,'sticker'),false);assert.equal(Object.hasOwn(changed.student,'showRemark'),false);
});
test('attendance review and Back retain the draft without changing canonical records or falsely saving',()=>{
 const original=freeze(base()),before=JSON.stringify(original),review=advance(original,'review',{attendance:'absent',remark:'Only this session',sticker:'yellow',showRemark:'yes',studentId:'another',scheduleId:'other',sequence:'99'});
 assert.equal(review.step,'review');assert.equal(review.draft.attendance,'absent');assert.equal(review.draft.showRemark,'yes');assert.equal(review.student.id,'student-second');assert.equal(review.lesson.id,'session-second');assert.equal(JSON.stringify(original),before);
 const html=markup(review,en);assert.match(html,/Only this session/);assert.match(html,/Absent/);assert.match(html,/data-ui-command="final-save"[^>]*disabled/);assert.match(html,/not been saved/);
 const back=advance(review,'back');assert.equal(back.step,'edit');assert.deepEqual(back.draft,review.draft);assert.match(markup(back,en),/value="absent"[^>]*\bchecked/);
});
test('required attendance and bounded remarks validate locally while preserving raw drafts and checkbox clearing',()=>{
 let state=advance(base(),'review',{remark:'Keep this note'});assert.equal(state.step,'edit');assert.ok(state.formError);assert.match(markup(state,en),/role="alert"/);assert.equal(state.draft.remark,'Keep this note');
 state=advance(base(),'review',{attendance:'invented',remark:'x'.repeat(2001),sticker:'secret'});assert.equal(state.step,'edit');assert.equal(state.draft.remark.length,2001);
 state=advance({...base(),draft:{attendance:'late',showRemark:'yes'}},'review',{attendance:'late',remark:''});assert.equal(state.step,'review');assert.equal(state.draft.showRemark,'');assert.equal(state.draft.remark,'');
});
test('draft updates cannot overwrite the source student lesson view or capabilities',()=>{
 const state=freeze(base()),next=advance(state,'draft',{attendance:'sick',remark:'Draft',student:{id:'forged'},lesson:{id:'forged'},view:'arrange',step:'complete',capabilities:{save:true}});
 assert.equal(next.view,'attendance');assert.equal(next.student.id,state.student.id);assert.equal(next.lesson.id,state.lesson.id);assert.deepEqual(next.capabilities,{save:false});assert.equal(next.draft.remark,'Draft');assert.equal(state.draft.remark,undefined);
});
test('forged final operations never produce completion or mutate business facts even when save capability is forged true',()=>{
 const state=freeze({...base(),step:'review',draft:{attendance:'present'},capabilities:{save:true}}),before=JSON.stringify(state);
 for(const command of ['final-save','final-confirm','save','confirm','submit','save-preview','confirm-preview','approve','assign']){const next=advance(state,command,{attendance:'absent',step:'complete'});assert.equal(JSON.stringify(next),before);assert.doesNotMatch(markup(next,en),/Preview complete|Successfully|has been updated|Saved successfully/);assert.match(markup(next,en),/data-ui-command="final-save"[^>]*disabled/);}
});
test('missing or malformed canonical session cannot render an unrelated default or accept a draft',()=>{
 assert.equal(markup({view:'unknown'},en),'');
 for(const patch of [{student:null},{student:{id:' ',displayName:'Private wrong person'}},{lesson:{...base().lesson,sequence:0}},{lesson:{...base().lesson,date:'2026-02-31'}},{lesson:{...base().lesson,time:'25:00'}}]){
  const state={...base(),...patch},html=markup(state,en);assert.match(html,/unavailable/);assert.doesNotMatch(html,/Chloe|Private wrong person|name="attendance"/);assert.equal(advance(state,'review',{attendance:'present'}).step,'edit');
 }
});
test('all private text is escaped in form review and slot context',()=>{
 const state={...base(),student:{...base().student,displayName:'<img src=x onerror=alert(1)>'},draft:{attendance:'present',remark:'<script>alert(1)</script>'}},html=markup(state,en);assert.doesNotMatch(html,/<img|<script/);assert.match(html,/&lt;img/);assert.match(html,/&lt;script/);
 const preview=markup({...ready([slot({courseName:'<svg onload=x>',teacher:'<b>teacher</b>'})]),step:'review',draft:{arrangement:'selected',selectedSlotId:'slot-second'}},en);assert.doesNotMatch(preview,/<svg|<b>/);assert.match(preview,/&lt;svg/);
});
test('unknown loading and failed availability never claim zero available slots or borrow fixtures',()=>{
 for(const availability of [undefined,{ready:false,slots:[]},{ready:false,loading:true,slots:[]},{ready:false,error:'PRIVATE TOKEN <script>',slots:[slot()]}]){
  const html=markup({...base('arrange'),availability},en);assert.match(html,/not available|Loading/);assert.doesNotMatch(html,/0 available|No matching|PRIVATE TOKEN|slot-second|Sample slots|Chloe/);
 }
 assert.match(markup(ready([]),en),/No eligible slots/);
});
test('only unique explicitly verified eligible slots appear and full or unknown capacities cannot be selected',()=>{
 const state=ready([slot(),slot({id:'not-verified',eligible:undefined}),slot({id:'not-eligible',eligible:false}),slot({id:'full',available:0}),slot({id:'unknown-places',available:null}),slot({id:'duplicate'}),slot({id:'duplicate'})]),html=markup(state,en);
 assert.match(html,/data-ui-id="slot-second"/);assert.doesNotMatch(html,/data-ui-id="not-verified"|data-ui-id="not-eligible"|data-ui-id="duplicate"/);assert.match(html,/Full/);assert.match(html,/Places unavailable/);
 for(const id of ['full','unknown-places','duplicate','not-verified','missing'])assert.notEqual(advance(state,'select-slot',{id}).draft?.selectedSlotId,id);
 assert.equal(advance(state,'select-slot',{id:'slot-second'}).draft.selectedSlotId,'slot-second');
});
test('arrangement date accordions sort dates and times and a date filter preserves the selected session',()=>{
 const state=ready([slot({id:'late',date:'2026-11-10',time:'16:00'}),slot({id:'early',date:'2026-11-09',time:'09:00'}),slot({id:'middle',date:'2026-11-09',time:'12:00'})]),html=markup(state,en);
 assert.ok(html.indexOf('2026-11-09')<html.indexOf('2026-11-10'));assert.ok(html.indexOf('09:00')<html.indexOf('12:00'));assert.match(html,/<details/);
 const filtered=advance(state,'filter-date',{date:'2026-11-10'});assert.equal(filtered.lesson.id,'session-second');assert.match(markup(filtered,en),/data-ui-id="late"/);assert.doesNotMatch(markup(filtered,en),/data-ui-id="early"/);
 const invalid=advance(filtered,'filter-date',{date:'2026-02-31'});assert.ok(invalid.filterError);assert.match(markup(invalid,en),/aria-invalid="true"/);
});
test('selected replacement Review and Back preserve the exact target and never reserve or write',()=>{
 const state=freeze(ready()),before=JSON.stringify(state),selected=advance(state,'select-slot',{id:'slot-second'}),review=advance(selected,'review');assert.equal(review.step,'review');assert.equal(review.draft.selectedSlotId,'slot-second');assert.equal(review.student.id,'student-second');assert.equal(review.lesson.sequence,3);
 const html=markup(review,en);assert.match(html,/2026-11-09/);assert.match(html,/Teacher C/);assert.match(html,/data-ui-command="final-confirm"[^>]*disabled/);assert.match(html,/not been saved/);assert.equal(JSON.stringify(state),before);
 const back=advance(review,'back');assert.equal(back.step,'edit');assert.equal(back.draft.selectedSlotId,'slot-second');assert.match(markup(back,en),/aria-pressed="true"/);
});
test('Pending is only a same-student same-session review draft and is possible when availability is unavailable',()=>{
 const state=freeze(base('arrange')),pending=advance(state,'pending');assert.equal(pending.step,'review');assert.equal(pending.draft.arrangement,'pending');assert.equal(pending.draft.selectedSlotId,'');assert.equal(pending.student.id,state.student.id);assert.equal(pending.lesson.id,state.lesson.id);assert.match(markup(pending,en),/Pending Confirmation/);assert.match(markup(pending,en),/data-ui-command="final-confirm"[^>]*disabled/);assert.equal(state.draft.arrangement,undefined);
 const back=advance(pending,'back');assert.equal(back.step,'edit');assert.equal(back.draft.arrangement,'pending');
});
test('a removed or no-longer-eligible selected target cannot survive as a valid Review',()=>{
 const selected=advance(ready(),'select-slot',{id:'slot-second'});
 for(const availability of [{ready:false,slots:[]},{ready:true,slots:[]},{ready:true,slots:[slot({eligible:false})]},{ready:true,slots:[slot({available:0})]}]){
  const next=advance({...selected,availability},'review');assert.equal(next.step,'edit');assert.ok(next.formError);assert.doesNotMatch(markup({...next,step:'review'},en),/>Teacher C</);assert.match(markup({...next,step:'review'},en),/unavailable|not available/);
 }
});
test('bilingual native form buttons use one integration contract and final notices appear only in Review',()=>{
 const state=base(),html=markup(state,zh);assert.match(html,/出席/);assert.match(html,/id="shared-lesson-workflow-form"/);assert.match(html,/data-action="ui-shared-lesson"/);assert.match(html,/data-ui-command="review"/);assert.match(html,/aria-modal="true"/);assert.doesNotMatch(html,/not been saved|尚未儲存|Interface preview/);
 const review=advance(state,'review',{attendance:'present'});assert.match(markup(review,zh),/尚未儲存/);assert.match(markup(review,zh),/data-ui-command="back"/);
});
test('a same-session loading or source error keeps typed drafts editable but blocks native and forged Review',()=>{
 for(const sourceStatus of ['loading','error']){
  const source=freeze({...base(),sourceStatus,sourceError:'PRIVATE TOKEN <script>',draft:{attendance:'sick',remark:'Retained before refresh',sticker:'blue',showRemark:'yes'}}),typed=advance(source,'draft',{remark:'Still typing during refresh',showRemark:''});
  assert.equal(typed.draft.remark,'Still typing during refresh');assert.equal(typed.draft.sticker,'blue');assert.equal(typed.draft.showRemark,'');assert.equal(typed.lesson.id,'session-second');assert.equal(source.draft.remark,'Retained before refresh');
  const html=markup(typed,en);assert.match(html,sourceStatus==='loading'?/Updating lesson details/:/Could not update lesson details/);assert.match(html,/data-ui-command="review"[^>]*disabled/);assert.doesNotMatch(html,/<textarea[^>]*disabled|PRIVATE TOKEN|<script/);assert.match(html,/Still typing during refresh/);
  const forged=advance(typed,'review',{attendance:'present',remark:'Raw before Review',showRemark:''});assert.equal(forged.step,'edit');assert.equal(forged.draft.remark,'Raw before Review');assert.equal(forged.student.id,'student-second');
 }
});
test('source failure during an arrangement Review permits Back and recovery without losing the exact target',()=>{
 const review=advance(advance(ready(),'select-slot',{id:'slot-second'}),'review'),failed={...review,sourceStatus:'error',sourceError:'Raw private source failure'},back=advance(failed,'back');
 assert.equal(back.step,'edit');assert.equal(back.draft.selectedSlotId,'slot-second');assert.equal(back.lesson.id,review.lesson.id);assert.match(markup(back,en),/data-ui-command="select-slot"[^>]*disabled/);assert.match(markup(back,en),/data-ui-command="pending"[^>]*disabled/);
 assert.equal(advance(back,'review').step,'edit');assert.equal(advance(back,'pending').step,'edit');assert.equal(advance(back,'select-slot',{id:'slot-second'}).draft.selectedSlotId,'slot-second');
 const recovered=advance({...back,sourceStatus:'ready'},'review');assert.equal(recovered.step,'review');assert.equal(recovered.draft.selectedSlotId,'slot-second');assert.match(markup(recovered,en),/Teacher C/);assert.match(markup(recovered,en),/data-ui-command="final-confirm"[^>]*disabled/);assert.doesNotMatch(markup(recovered,en),/Raw private source failure|Saved successfully/);
});
function parsedActionTree(html){
 const stack=[],nodes=[],voidTags=new Set(['input','br','hr','img','meta','link']);
 for(const match of html.matchAll(/<(\/?)([a-z][a-z0-9-]*)\b([^>]*)>/gi)){
  const [,closing,tag,raw]=match;
  if(closing){const index=stack.findLastIndex(node=>node.tag===tag);if(index>=0)stack.splice(index);continue;}
  const attributes=Object.fromEntries([...raw.matchAll(/([\w-]+)="([^"]*)"/g)].map(([,key,value])=>[key,value])),node={tag,attributes,parent:stack.at(-1),closestAction(){for(let node=this;node;node=node.parent)if(Object.hasOwn(node.attributes,'data-action'))return node;return null;}};
  nodes.push(node);if(!voidTags.has(tag))stack.push(node);
 }
 return nodes;
}
test('native form controls never resolve the host delegated action selector to the ancestor form',()=>{
 for(const view of ['attendance','arrange']){
  const nodes=parsedActionTree(markup(view==='arrange'?ready():base(),en)),form=nodes.find(node=>node.tag==='form');assert.equal(form.attributes.id,'shared-lesson-workflow-form');assert.equal(form.attributes['data-ui-command'],'review');
  const controls=nodes.filter(node=>['textarea','input'].includes(node.tag)&&node.attributes.type!=='hidden');assert.ok(controls.length>0);
  for(const control of controls)assert.equal(control.closestAction(),null,'Clicking '+control.tag+' '+control.attributes.name+' must keep native focus/check behaviour');
  const review=nodes.find(node=>node.tag==='button'&&node.attributes.type==='submit');assert.equal(review.closestAction(),review);assert.equal(review.attributes['data-action'],'ui-shared-lesson');assert.equal(review.attributes['data-ui-command'],'review');
 }
});
test('known canonical sticker and display preference initialize the editor while missing or malformed settings remain unknown',()=>{
 const state=freeze({...base(),student:{...base().student,stickerColor:'blue',showRemark:true}}),html=markup(state,en);assert.match(html,/name="sticker"[^>]*value="blue"[^>]*checked/);assert.match(html,/type="checkbox" name="showRemark"[^>]*checked/);
 const draft=advance(state,'draft',{remark:'Only this note changed'});assert.equal(draft.draft.sticker,'blue');assert.equal(draft.draft.showRemark,'yes');assert.equal(state.student.stickerColor,'blue');assert.equal(state.student.showRemark,true);assert.equal(state.draft.sticker,undefined);
 const cleared=advance(draft,'draft',{sticker:'none',showRemark:''});assert.equal(cleared.draft.sticker,'none');assert.equal(cleared.draft.showRemark,'');assert.doesNotMatch(markup(cleared,en),/type="checkbox" name="showRemark"[^>]*checked/);
 const explicitFalse=advance({...base(),student:{...base().student,showRemark:false}},'draft',{});assert.equal(explicitFalse.draft.showRemark,'');
 for(const extra of [{},{stickerColor:null,showRemark:null},{stickerColor:'unknown-colour',showRemark:'true'}]){
  const unknown={...base(),student:{...base().student,...extra}},next=advance(unknown,'draft',{remark:'Typed'});assert.equal(Object.hasOwn(next.draft,'sticker'),false);assert.equal(Object.hasOwn(next.draft,'showRemark'),false);assert.doesNotMatch(markup(next,en),/name="sticker"[^>]*checked|type="checkbox" name="showRemark"[^>]*checked/);
 }
});
const detailValue=(html,label)=>html.match(new RegExp('<dt>'+label+'</dt><dd[^>]*>([\\s\\S]*?)</dd>'))?.[1];
test('student lesson details show the exact canonical student and lesson read-only with only a return action',()=>{
 const state=freeze({...base('student'),student:{...base().student,age:{years:6,months:2,asOf:'2026-11-02'},balance:{unit:'minutes',remaining:0,total:720},attendance:'late',stickerColor:'blue',contactEmail:'private@example.test',phone:'PRIVATE PHONE'},draft:{attendance:'present',remark:'FORGED DRAFT',sticker:'yellow'}}),html=markup(state,en);
 assert.match(html,/Student lesson details/);assert.match(html,/Isla &lt;Second&gt;/);assert.match(html,/data-student-id="student-second"/);assert.match(html,/data-session-id="session-second"/);assert.match(html,/2026-11-02/);assert.match(html,/15:15/);assert.match(html,/Print &amp; colour/);
 assert.equal(detailValue(html,'Attendance'),'Late');assert.match(detailValue(html,'Remark'),/Existing session note/);assert.match(detailValue(html,'Sticker'),/Blue/);
 assert.doesNotMatch(html,/<form\b|<input\b|<textarea\b|type="submit"|data-ui-command="review"|final-save|not been saved|FORGED DRAFT|PRIVATE PHONE|private@example/);
 const buttons=parsedActionTree(html).filter(node=>node.tag==='button');assert.equal(buttons.length,2);assert.ok(buttons.every(node=>node.attributes['data-ui-command']==='close'));assert.match(html,/Back to student list/);
});
test('student age is shown only from a complete explicit age snapshot including zero and its reference date',()=>{
 const supplied=markup({...base('student'),student:{...base().student,age:{years:0,months:0,asOf:'2024-02-29'}}},en);assert.match(detailValue(supplied,'Age'),/0 years.*0 months/);assert.match(detailValue(supplied,'Age'),/2024-02-29/);
 for(const age of [undefined,null,{years:6,months:2},{years:6,months:12,asOf:'2026-11-02'},{years:-1,months:0,asOf:'2026-11-02'},{years:'6',months:2,asOf:'2026-11-02'},{years:6.5,months:2,asOf:'2026-11-02'},{years:6,months:2,asOf:'2026-02-29'}]){
  const html=markup({...base('student'),student:{...base().student,age,dateOfBirth:'2020-01-01'}},en);assert.equal(detailValue(html,'Age'),'Not provided');assert.doesNotMatch(html,/2020-01-01/);
 }
});
test('remaining balance preserves minutes or visits and known zero without deriving lessons or inventing an unknown zero',()=>{
 for(const [balance,expected] of [[{unit:'minutes',remaining:0,total:720},/0 \/ 720 minutes/],[{unit:'visits',remaining:0,total:4},/0 \/ 4 visits/],[{unit:'minutes',remaining:95},/95 minutes/],[{unit:'visits',remaining:2.5},/2\.5 visits/]]){
  const html=markup({...base('student'),student:{...base().student,balance}},en);assert.match(detailValue(html,'Remaining balance'),expected);assert.doesNotMatch(html,/lessons remaining|1\.5 visits/);
 }
 for(const balance of [undefined,null,{}, {unit:'minutes',remaining:null},{unit:'minutes',remaining:'0'},{unit:'minutes',remaining:-1},{unit:'minutes',remaining:Infinity},{unit:'lessons',remaining:0},{remaining:0,total:4}]){
  const html=markup({...base('student'),student:{...base().student,balance}},en);assert.equal(detailValue(html,'Remaining balance'),'Not provided');assert.doesNotMatch(html,/Infinity|NaN|0 minutes|0 visits/);
 }
 const invalidTotal=markup({...base('student'),student:{...base().student,balance:{unit:'minutes',remaining:95,total:Infinity}}},en);assert.equal(detailValue(invalidTotal,'Remaining balance'),'95 minutes');assert.doesNotMatch(invalidTotal,/Infinity|NaN/);
});
test('student attendance distinguishes every source status, unmarked and unknown while sticker never borrows draft values',()=>{
 for(const [attendance,label] of [['present','Present'],['late','Late'],['absent','Absent'],['leave','Leave'],['sick','Sick'],['other','Other'],['unmarked','Not marked'],[undefined,'Not provided'],['invented','Not provided']]){
  const html=markup({...base('student'),student:{...base().student,attendance},draft:{attendance:'present',sticker:'yellow'}},en);assert.equal(detailValue(html,'Attendance'),label);assert.equal(detailValue(html,'Sticker'),'Not provided');
 }
 assert.equal(detailValue(markup({...base('student'),student:{...base().student,stickerColor:'none'}},en),'Sticker'),'No sticker');
});
test('student remarks distinguish known blank from unknown and long private text is escaped and collapsible',()=>{
 for(const [student,expected] of [[{id:'student-second',remark:''},'No remark yet'],[{id:'student-second'},'Not provided'],[{id:'student-second',remark:null},'Not provided']])assert.equal(detailValue(markup({...base('student'),student},en),'Remark'),expected);
 const remark='<img src=x onerror="PRIVATE">'+('長篇備註 & <script>'.repeat(30)),html=markup({...base('student'),student:{...base().student,remark}},en),note=detailValue(html,'Remark');assert.match(note,/<details class="slw-long-note" data-slw-note="student-remark">/);assert.match(note,/<summary>/);assert.match(note,/Read full remark/);assert.match(note,/&lt;img/);assert.match(note,/&lt;script&gt;/);assert.doesNotMatch(html,/<img|<script/);
});
test('read-only student detail retains source facts during loading or failure without editable drafts or raw errors',()=>{
 for(const sourceStatus of ['loading','error']){
  const state=freeze({...base('student'),sourceStatus,sourceError:'PRIVATE SOURCE <script>',draft:{remark:'PRIVATE DRAFT'}}),html=markup(state,en);assert.match(html,sourceStatus==='loading'?/Updating lesson details/:/Could not update lesson details/);assert.match(html,/Existing session note/);assert.match(html,/Isla &lt;Second&gt;/);assert.doesNotMatch(html,/PRIVATE SOURCE|PRIVATE DRAFT|Your entries|<form\b|Review|Save/);
  for(const command of ['draft','review','pending','select-slot','filter-date','back','final-save','submit'])assert.equal(advance(state,command,{remark:'Forged',attendance:'present'}),state);
 }
});
test('student detail rejects invalid canonical context and supports a clean Chinese read-only view',()=>{
 const html=markup(base('student'),zh);assert.match(html,/學生課堂資料/);assert.match(html,/返回名冊/);assert.match(html,/尚未登記/);assert.match(html,/年齡/);assert.match(html,/剩餘額度/);assert.doesNotMatch(html,/核對|儲存|未儲存/);
 for(const patch of [{student:null},{student:{id:' '}},{lesson:{...base().lesson,sequence:0}},{lesson:{...base().lesson,date:'2026-02-31'}}]){const unavailable=markup({...base('student'),...patch},en);assert.match(unavailable,/unavailable/);assert.doesNotMatch(unavailable,/Isla|Print &amp; colour|Remaining balance|Chloe/);}
});
test('long remark disclosures have stable semantic identities across source updates rather than positional identities',()=>{
 const long='A detailed lesson remark. '.repeat(12);
 for(const [view,key] of [['student','student-remark'],['attendance','attendance-remark']]){
  for(const remark of [long,'Changed background source. '+long]){
   const state=view==='student'?{...base(view),student:{...base().student,remark}}:{...base(view),step:'review',draft:{attendance:'present',remark}},nodes=parsedActionTree(markup(state,en));
   const notes=nodes.filter(node=>node.tag==='details'&&node.attributes['data-slw-note']===key);assert.equal(notes.length,1,'The '+view+' remark must be uniquely addressable without its order or text');
   assert.ok(nodes.some(node=>node.tag==='summary'&&node.parent===notes[0]));assert.ok(nodes.some(node=>node.tag==='p'&&node.parent===notes[0]));
   assert.equal(nodes.filter(node=>Object.hasOwn(node.attributes,'data-slw-note')).length,1);
  }
 }
 const slots=parsedActionTree(markup(ready(),en));assert.equal(slots.filter(node=>Object.hasOwn(node.attributes,'data-slw-note')).length,0);
});
