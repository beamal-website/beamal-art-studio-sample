import test from 'node:test';
import assert from 'node:assert/strict';
import {validPublicTimetableProjection,publicTimetableSlotMatches,publicTimetableMarkup} from '../client/public-timetable-ui.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const ui=language=>({t:(zh,en)=>language==='en'?en:zh,esc});
const courses=[{id:'course-a',courseName:'繪畫 <A>',category:'Art',level:'Beginner',publicColor:'#AABBCC'},{id:'course-b',courseName:'Watercolour & B',category:'Art',level:'',publicColor:'#ffffff'},{id:'unused-course',courseName:'Later published course',category:'Art',level:'',publicColor:null}];
const slot=extra=>({id:'slot-a',courseId:'course-a',date:'2026-10-15',time:'14:00',duration:60,teacherNames:['Artist <A>'],roomNames:['Studio & 1'],trialEnabled:true,trialVisible:true,trialRemaining:2,trialStatus:'available',reschedulingEnabled:true,reschedulingVisible:true,reschedulingRemaining:1,reschedulingStatus:'available',classAvailability:'available',classType:{kind:'regular',name:'Regular Class'},...extra});
const projection=extra=>({revision:'public-fixture-revision',courses:structuredClone(courses),slots:[slot()],from:'2026-10-15',to:'2026-10-21',rangeDays:7,slotType:'all',courseFilter:'',loading:false,error:'',...extra});
const tagById=(html,id)=>html.match(new RegExp(`<[^>]+\\bid="${id}"[^>]*>`))?.[0]||'';
const cards=html=>[...html.matchAll(/<article\b[^>]*data-availability-slot-id="([^"]+)"[^>]*>[\s\S]*?<\/article>/g)].map(match=>({id:match[1],html:match[0]}));

test('mixed weekly projection validates exact finite ranges and identities without mutating its input',()=>{
 for(const [rangeDays,to]of[[7,'2026-10-21'],[14,'2026-10-28'],[30,'2026-11-13']]){const data=projection({rangeDays,to}),before=structuredClone(data);assert.equal(validPublicTimetableProjection(data,data.from,rangeDays),true);assert.deepEqual(data,before);}
 const capped=projection({from:'9999-12-30',to:'9999-12-31',rangeDays:30,slots:[]});assert.equal(validPublicTimetableProjection(capped,capped.from,30),true);assert.equal(validPublicTimetableProjection(projection({courses:[],slots:[]}),slot().date,7),true);
});

test('mixed weekly projection rejects duplicate orphan unavailable and malformed dated occurrences rather than guessing',()=>{
 const cases=[{unchanged:true},{from:'2026-10-16'},{to:'2026-10-22'},{rangeDays:6},{rangeDays:31},{courses:[courses[0],courses[0]]},{courses:[{...courses[0],id:' '}]},{courses:[{...courses[0],courseName:''}]},{slots:[slot(),slot()]},{slots:[slot({id:''})]},{slots:[slot({courseId:'missing-course'})]},{slots:[slot({date:'2026-02-30'})]},{slots:[slot({date:'2026-10-22'})]},{slots:[slot({time:'24:00'})]},{slots:[slot({time:'9:00'})]},{slots:[slot({time:'23:45',duration:16})]},{slots:[slot({duration:0})]},{slots:[slot({duration:1.5})]},{slots:[slot({sourceAvailable:false})]}];
 for(const changes of cases)assert.equal(validPublicTimetableProjection(projection(changes),'2026-10-15',7),false,JSON.stringify(changes));
 assert.equal(validPublicTimetableProjection(null,'2026-10-15',7),false);assert.equal(validPublicTimetableProjection(projection(),'2026-10-15',14),false);
});

test('mixed weekly filters combine exact course identity with independent published use facts',()=>{
 const formal=slot({trialVisible:false,classAvailability:'full'}),trial=slot({id:'trial-only',courseId:'course-b',classAvailability:null,reschedulingVisible:false}),rescheduling=slot({id:'rescheduling-only',trialEnabled:false,trialVisible:false,classAvailability:null});
 assert.equal(publicTimetableSlotMatches(formal,{slotType:'class'}),true);assert.equal(publicTimetableSlotMatches(formal,{slotType:'trial'}),false);assert.equal(publicTimetableSlotMatches(trial,{slotType:'class'}),false);assert.equal(publicTimetableSlotMatches(trial,{courseFilter:'course-a',slotType:'trial'}),false);assert.equal(publicTimetableSlotMatches(trial,{courseFilter:'course-b',slotType:'trial'}),true);assert.equal(publicTimetableSlotMatches(rescheduling,{slotType:'rescheduling'}),true);assert.equal(publicTimetableSlotMatches({...rescheduling,reschedulingEnabled:false},{slotType:'rescheduling'}),false);assert.equal(publicTimetableSlotMatches({...formal,sourceAvailable:false},{}),false);
});

test('mixed weekly calendar keeps simultaneous courses and same-course slot identities separate in a stable escaped order',()=>{
 const state=projection({slots:[slot({id:'slot-z',courseId:'course-b'}),slot({id:'slot-b'}),slot({id:'slot-a'})]}),before=structuredClone(state),html=publicTimetableMarkup(state,{...ui('en'),trialPreview:true});
 assert.deepEqual(cards(html).map(row=>row.id),['slot-a','slot-b','slot-z']);assert.match(cards(html)[0].html,/繪畫 &lt;A&gt;/);assert.match(cards(html)[2].html,/Watercolour &amp; B/);assert.match(cards(html)[0].html,/--public-course-colour:#aabbcc/);assert.match(cards(html)[2].html,/--public-course-colour:#ffffff/);assert.match(html,/<h1[^>]*>Public timetable<\/h1>/);assert.match(html,/<h2[^>]*>[\s\S]*?2026-10-15/);assert.match(html,/<h3[^>]*>[\s\S]*?2026-10-15/);assert.match(html,/<h4[^>]*>[\s\S]*?繪畫 &lt;A&gt;/);assert.deepEqual(state,before);
});

test('mixed weekly calendar splits fourteen and thirty days into seven-day sections including every empty date',()=>{
 for(const [rangeDays,to,groups]of[[7,'2026-10-21',1],[14,'2026-10-28',2],[30,'2026-11-13',5]]){const html=publicTimetableMarkup(projection({rangeDays,to}),ui('en'));assert.equal((html.match(/data-public-week-index=/g)||[]).length,groups);assert.equal((html.match(/data-availability-date=/g)||[]).length,rangeDays);assert.match(html,new RegExp(`data-availability-date="${to}"`));assert.match(html,/No available times/);assert.equal(cards(html).length,1);}
 const capped=publicTimetableMarkup(projection({from:'9999-12-30',to:'9999-12-31',rangeDays:30,slots:[]}),ui('en'));assert.equal((capped.match(/data-availability-date=/g)||[]).length,2);assert.match(capped.match(/<button[^>]*data-direction="next"[^>]*>/)?.[0]||'',/disabled/);assert.doesNotMatch(capped,/10000-/);
});

test('mixed weekly course key names only shown courses once while filter options retain every published course',()=>{
 const html=publicTimetableMarkup(projection({slots:[slot(),slot({id:'second-a'}),slot({id:'slot-b',courseId:'course-b'})],courseFilter:'course-a'}),ui('en'));
 const key=html.match(/<aside[^>]*class="availability-week-course-legend"[^>]*>[\s\S]*?<\/aside>/)?.[0]||'';assert.equal((key.match(/繪畫 &lt;A&gt;/g)||[]).length,1);assert.doesNotMatch(key,/Watercolour|Later published/);assert.match(html,/<option value="unused-course">Later published course<\/option>/);assert.match(html,/<option value="course-a" selected>/);assert.match(html,/data-action="availability-public-filters-reset"/);assert.deepEqual(cards(html).map(row=>row.id),['second-a','slot-a']);
});

test('mixed weekly cards keep Class Full independent from hidden Trial and disable shown full or unknown trial entry',()=>{
 const html=publicTimetableMarkup(projection({slots:[slot({classAvailability:'full',trialVisible:false,trialStatus:'full',trialRemaining:0})]}),{...ui('en'),trialPreview:true});assert.match(html,/data-public-class-status="full"/);assert.match(html,/Class places/);assert.doesNotMatch(cards(html)[0].html,/Trial places|availability-trial-open/);
 for(const changes of [{trialStatus:'full',trialRemaining:0},{trialRemaining:null},{trialRemaining:undefined}]){const shown=publicTimetableMarkup(projection({slots:[slot(changes)]}),{...ui('en'),trialPreview:true});assert.match(shown.match(/<button[^>]*data-action="availability-trial-open"[^>]*>/)?.[0]||'',/disabled/);}
 const available=publicTimetableMarkup(projection({slots:[slot({classAvailability:'full'})]}),{...ui('en'),trialPreview:true}),button=available.match(/<button[^>]*data-action="availability-trial-open"[^>]*>/)?.[0]||'';assert.match(button,/data-course-id="course-a"/);assert.match(button,/data-slot-id="slot-a"/);assert.doesNotMatch(button,/disabled/);
 const missingVisibility=publicTimetableMarkup(projection({slots:[slot({trialVisible:undefined})]}),{...ui('en'),trialPreview:true});assert.doesNotMatch(missingVisibility,/data-action="availability-trial-open"/);
});

test('mixed weekly management preview uses its own controls headings and exact slot manage actions without public trial actions',()=>{
 const html=publicTimetableMarkup(projection(),{...ui('en'),managementPreview:true,trialPreview:true});for(const suffix of ['from','days','type','course-filter'])assert.match(html,new RegExp(`id="availability-preview-${suffix}"`));assert.match(html,/data-action="availability-preview-back"/);assert.match(html,/data-action="availability-preview-range"/);assert.match(html,/data-action="availability-preview-manage" data-slot-id="slot-a"/);assert.doesNotMatch(html,/data-action="availability-trial-open"|data-action="availability-week-course"|<h[12]\b/);for(const level of [3,4,5,6])assert.match(html,new RegExp(`<h${level}\\b`));
 const publicHtml=publicTimetableMarkup(projection(),ui('en'));assert.match(publicHtml,/data-action="availability-week-course" data-course-id="course-a" data-slot-id="slot-a"/);assert.match(publicHtml,/data-action="availability-public-back"/);assert.doesNotMatch(publicHtml,/data-action="availability-preview-manage"/);
});

test('mixed weekly states distinguish loading source failure no courses no dates and filtered empty without showing stale slot cards',()=>{
 for(const language of ['zh','en']){
  const loading=publicTimetableMarkup(projection({loading:true}),ui(language));assert.match(loading,language==='en'?/Loading timetable/:/正在載入課表/);assert.equal(cards(loading).length,0);assert.match(loading,/aria-busy="true"/);
  const failed=publicTimetableMarkup(projection({error:'Source <failed>'}),ui(language));assert.match(failed,/Source &lt;failed&gt;/);assert.equal(cards(failed).length,0);assert.match(failed,/data-action="availability-public-refresh"/);
  const empty=publicTimetableMarkup(projection({courses:[],slots:[]}),ui(language));assert.match(empty,language==='en'?/No published courses yet/:/暫未有公開課程/);
  const noDates=publicTimetableMarkup(projection({slots:[]}),ui(language));assert.match(noDates,language==='en'?/No published times in this date range/:/這段日期暫未有公開時段/);
  const filtered=publicTimetableMarkup(projection({courseFilter:'course-b'}),ui(language));assert.match(filtered,language==='en'?/No times match these filters/:/沒有符合這些篩選的時段/);assert.match(filtered,/data-action="availability-public-filters-reset"/);assert.equal((filtered.match(/data-availability-date=/g)||[]).length,7);
 }
 const orphan=publicTimetableMarkup(projection({slots:[slot({courseId:'missing-course'})]}),ui('en'));assert.equal(cards(orphan).length,0);assert.match(orphan,/Timetable details are unavailable/);
});

test('mixed weekly date errors preserve the typed control value and suppress actions from the previous source',()=>{
 const html=publicTimetableMarkup(projection({dateError:'Choose <date>',dateInput:'2026-02-30'}),{...ui('en'),trialPreview:true});const input=tagById(html,'availability-public-from');assert.match(input,/value="2026-02-30"/);assert.match(input,/aria-invalid="true"/);assert.match(html,/Choose &lt;date&gt;/);assert.equal(cards(html).length,0);assert.doesNotMatch(html,/data-action="availability-trial-open"/);
});

test('mixed weekly unavailable selected course remains visibly selected during loading errors and removal without reusing its old name',()=>{
 for(const changes of [{loading:true},{error:'Source unavailable'},{courses:[courses[1],courses[2]],slots:[]}])for(const language of ['zh','en']){
  const html=publicTimetableMarkup(projection({courseFilter:'course-a',...changes}),ui(language)),select=html.match(/<select[^>]*id="availability-public-course-filter"[^>]*>[\s\S]*?<\/select>/)?.[0]||'';
  assert.match(select,/<option value="course-a" selected disabled>/);assert.match(select,language==='en'?/Selected course unavailable/:/所選課程暫未提供/);assert.doesNotMatch(select,/繪畫/);assert.doesNotMatch(select,/<option value="" selected>/);assert.match(html,/data-action="availability-public-filters-reset"/);
 }
});

test('mixed weekly trial action has a contextual course date and time accessible name',()=>{
 const html=publicTimetableMarkup(projection(),{...ui('en'),trialPreview:true}),button=html.match(/<button[^>]*data-action="availability-trial-open"[^>]*>/)?.[0]||'';
 assert.match(button,/aria-label="[^"]*繪畫 &lt;A&gt;[^"]*2026-10-15[^"]*14:00[^"]*"/);
});

test('mixed weekly unknown class facts and unsafe colours never invent Regular places or expose private metadata',()=>{
 const record=slot({classAvailability:'unknown',classType:null,remark:'PRIVATE SLOT NOTE',scheduleId:'PRIVATE SCHEDULE',teacherColors:['#001122'],sourceVersions:{'PRIVATE SOURCE':123}}),state=projection({courses:[{...courses[0],publicColor:'#aabbcc;display:none'}],slots:[record]}),html=publicTimetableMarkup(state,ui('en'));
 assert.match(html,/To be confirmed/);assert.match(html,/Artist &lt;A&gt;/);assert.match(html,/Studio &amp; 1/);assert.doesNotMatch(html,/Regular Class|0 places remaining|PRIVATE|--public-course-colour:|#001122|display:none|<A>/);
 const standalone=publicTimetableMarkup(projection({slots:[slot({classAvailability:null,classType:{kind:'regular',name:'Regular Class'}})]}),ui('en'));assert.doesNotMatch(cards(standalone)[0].html,/Class places|Regular Class/);
});
