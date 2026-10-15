import {coursePublicColourFields,coursePublicColourPayload} from '../client/public-course-colour-ui.js';
import {createPublicTrialDraft,advancePublicTrial,publicTrialMarkup} from '../client/public-trial-ui.js';
import {availabilityPublicPreviewMarkup} from '../client/availability-public-preview-ui.js';
import {timetableNoteDialogMarkup,validateTimetableNoteDraft,timetableNoteButtonMarkup} from '../client/timetable-notes-ui.js';
import {normalizeTimetableFilterState,validateTimetableFilterDraft,matchesTimetableFilterState,timetableNamedFiltersMarkup,timetableFilterEditorMarkup} from '../client/timetable-filters.js';
import {feePricingMarkup} from '../client/fee-pricing-ui.js';
import {createInterfacePreview} from '../client/interface-preview.js';
import {reportsPageMarkup} from '../client/reports-ui.js';
import { enrollmentOrdersMarkup, enrollmentOrderDetailsMarkup, enrollmentOrderEditorMarkup, studentAccountLinksMarkup, sharedStudentClassesMarkup, enrollmentLessons, suggestedOrderCents } from '../client/enrollment-orders-ui.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {materialPanelMarkup,materialEditorMarkup,materialVideoRow,safeMaterialUrl} from '../client/materials-ui.js';
import {materialAttachmentDrafts} from '../client/attachments-ui.js';
import {attachmentIssue} from '../client/attachment-client.js';
import {courseScheduleTableMarkup} from '../client/course-schedule-ui.js';
import {scheduleScopeMarkup} from '../client/schedule-scope-ui.js';
import {schedulingResourcesMarkup,schedulingResourceEditorMarkup,scheduleResourcePickerMarkup} from '../client/scheduling-resources-ui.js';
import {representativeColour,timetableTeacherColour,teacherColourMarkersMarkup} from '../client/teacher-colour-ui.js';
import {classCapacityStatusMarkup,classCapacityStatusEditorMarkup} from '../client/class-capacity-status-ui.js';
import {classTypeName,classTypeSelectionMarkup,classTypeDetailsMarkup,classTypesManagerMarkup,classTypeEditorMarkup} from '../client/class-type-ui.js';
import {timetableDateRange,timetableRangeControlMarkup} from '../client/timetable-range.js';
import {accessControlMarkup,accessTeacherLinkEditorMarkup,accessGrantEditorMarkup} from '../client/access-control-ui.js';
import {peopleDirectoryMarkup,peopleProfileMarkup,peopleEditorMarkup} from '../client/people-ui.js';
import {availabilityEditorMarkup,availabilityDetailMarkup,availabilityPublicSettingsMarkup,availabilityOccurrenceSummaryMarkup,publicCourseDirectoryMarkup,publicCourseDetailsMarkup,publicSlotMatchesType} from '../client/availability-ui.js';
import {scheduleOccurrences,scheduleOccurrence,scheduleFollowingRule} from '../shared/schedule-occurrences.js';
import {sessionIdentityKey} from '../client/session-identity.js';
import {timetableGridMinimum,timetableCreateCells,timetableCreateCellMarkup} from '../client/timetable-cells.js';
import {resolveSharedLessonContext} from '../client/shared-lesson-context.js';

test('same-revision authenticated teacher mapping changes refresh the session and clear stale private identity state',async()=>{
 const user={...sharedTestUser,teacherResourceIds:['linked-before']},a=await sharedApp({session:async()=>({user})});
 a.set("materialCaches.set('private',{items:[{name:'Old identity material'}]});modal='Old private dialog';sharedStaffSavedIdentity='old-staff-source'");
 a.client.session=async()=>({user:{...user,teacherResourceIds:[]}});await a.set('refreshSharedSession()');
 assert.deepEqual(a.read('authUser.teacherResourceIds'),[]);assert.equal(a.read('materialCaches.size'),0);assert.equal(a.read('modal'),'');assert.equal(a.read('sharedStaffSavedIdentity'),'');
});

test('equivalent reordered authenticated teacher IDs do not clear an unchanged session or its private draft',async()=>{
 const user={...sharedTestUser,teacherResourceIds:['resource-a','resource-b']},a=await sharedApp({session:async()=>({user})});
 a.set("materialCaches.set('private',{items:[{name:'Retained authorized material'}]});modal='Retained authorized draft'");
 a.client.session=async()=>({user:{...user,teacherResourceIds:['resource-b','resource-a','resource-a']}});await a.set('refreshSharedSession()');
 assert.equal(a.read('materialCaches.size'),1);assert.equal(a.read('modal'),'Retained authorized draft');
});
test('Join classes sort by upcoming session and income records show newest payment first',()=>{const a=app();a.set("lang='en';nextClassDate=c=>c.id==='b'?'2030-01-01':'2030-01-02';join={step:1,course:'art',classId:'a'};location.pathname='/join';render()");let html=a.nodes['#app'].innerHTML,ids=[...html.matchAll(/name="classId" value="([^"]+)"/g)].map(match=>match[1]);assert.deepEqual(ids,['b','a']);assert.ok(html.indexOf('Next class: 1 Jan 2030')<html.indexOf('Next class: 2 Jan 2030'));a.set("role='teacher';tab='payments';location.pathname='/account';render()");html=a.nodes['#app'].innerHTML;assert.ok(html.indexOf('Ryan Yu · B1005')<html.indexOf('David Leung · B1002'));});
test('News page contains sample studio stories and no course listings',()=>{const a=app();a.set("lang='en';location.pathname='/news';render()");const html=a.nodes['#app'].innerHTML,entries=html.match(/<details class="news-entry">[\s\S]*?<\/details>/g)||[];assert.equal(entries.length,3);assert.match(html,/Student Art Showcase/);assert.match(html,/Art Award Highlights/);assert.match(html,/Studio Updates/);assert.doesNotMatch(html.match(/<section class="news-page">[\s\S]*?<\/section>/)?.[0]||'',/>Course [123]</);assert.doesNotMatch(html,/Next class|lessons per term|Places available/);assert.match(entries[0],/class="news-detail-image" src="\/assets\/beamal-canvas\.jpg"/);});
test('sample News cards show bilingual stories, categories and artwork',()=>{const a=app();a.set("lang='en';location.pathname='/news';render()");let html=a.nodes['#app'].innerHTML;assert.match(html,/class="news-page-heading"/);assert.match(html,/class="news-entry-image" src="\/assets\/beamal-storybook\.jpg"/);assert.match(html,/Art showcase/);assert.match(html,/Awards/);assert.match(html,/Read more/);a.set("lang='zh';render()");html=a.nodes['#app'].innerHTML;assert.match(html,/學生作品展/);assert.match(html,/藝術獎項消息/);assert.match(html,/閱讀更多/);});
test('existing custom news survives the sample migration and reset restores example stories',()=>{const old=app().read('db');old.news=[];delete old.newsSampleVersion;let a=app({'beamal-demo-v1':JSON.stringify(old)});assert.equal(a.read('db.news.length'),3);assert.equal(a.read('db.newsSampleVersion'),1);old.news=[{id:'N77',title:'Existing update',description:'Saved update',content:'Existing content',releaseDate:'2026-09-30',image:''}];a=app({'beamal-demo-v1':JSON.stringify(old)});assert.equal(a.read('db.news.length'),1);assert.equal(a.read('db.news[0].title'),'Existing update');a.click({action:'reset'});assert.equal(a.read('db.news.length'),3);assert.equal(a.read('db.news[0].title'),'Student Art Showcase');});
import fs from 'node:fs';
test('WhatsApp icon is grouped with Instagram and Facebook in Follow Us',()=>{const a=app();a.set("lang='en';render()");const html=a.nodes['#app'].innerHTML,follow=html.match(/<div class="footer-social">[\s\S]*?<\/div><\/div>/)?.[0];assert.match(follow,/aria-label="Instagram"/);assert.match(follow,/aria-label="Facebook"/);assert.match(follow,/class="whatsapp-link" href="https:\/\/wa\.me\/85252338449"/);assert.match(follow,/aria-label="Contact the teacher on WhatsApp at \+852 5233 8449"/);assert.doesNotMatch(html,/class="whatsapp-float"/);});
test('course cards show the earliest available class date in both languages',()=>{const a=app();const at="new Date('2026-09-30T00:00:00Z')";assert.equal(a.read(`earliestCourseDate('art',${at})`),'2026-10-05');assert.equal(a.read(`earliestCourseDate('story',${at})`),'2026-09-30');assert.equal(a.read(`earliestCourseDate('sewing',${at})`),'2026-10-02');a.set("lang='en';location.pathname='/classes';render()");assert.equal((a.nodes['#app'].innerHTML.match(/Earliest class date:/g)||[]).length,3);a.set("lang='zh';render()");assert.equal((a.nodes['#app'].innerHTML.match(/最快上堂日期:/g)||[]).length,3);a.set("db.classes.filter(c=>c.course==='art').forEach(c=>c.occupied=c.capacity);render()");assert.equal(a.read(`earliestCourseDate('art',${at})`),'');assert.match(a.nodes['#app'].innerHTML,/最快上堂日期: 暫無可報名時段/);});

test('standard Explore Class detail shows lesson count, weekdays, and times',()=>{const a=app();a.set("lang='en';location.pathname='/classes';render()");a.click({go:'/classes/art'});const html=a.nodes['#app'].innerHTML;assert.match(html,/class="course-schedule"/);assert.match(html,/4 lessons per term/);assert.match(html,/Every Monday · 10:00/);assert.match(html,/Every Tuesday · 14:00/);});
test('teacher class photo persists and appears on course cards and details',()=>{const a=app();a.set("lang='en';role='teacher';tab='students';location.pathname='/account';render()");a.click({action:'new-class'});let modal=a.nodes['#modal-root'].innerHTML;assert.match(modal,/id="class-image" type="file" accept="image\/jpeg,image\/png,image\/webp"/);assert.match(modal,/Maximum 1 MB/);a.set("classDraftImage='data:image/png;base64,dGVzdA=='");a.submit('class-editor',{courseName:'Painting lab',classCode:'PAINT-01',weekdays:['5'],time:'10:30',capacity:'8',lessonsPerTerm:'4'},{dataset:{id:''}});const id=a.read('db.classes.at(-1).id');assert.equal(a.read('db.classes.at(-1).image'),'data:image/png;base64,dGVzdA==');a.set("lang='en';role='';location.pathname='/classes';render()");let html=a.nodes['#app'].innerHTML;assert.match(html,/class="art class-photo"><img src="data:image\/png;base64,dGVzdA=="/);a.click({go:`/classes/${a.read('db.classes.at(-1).course')}`});assert.match(a.nodes['#app'].innerHTML,/src="data:image\/png;base64,dGVzdA=="/);a.set(`role='teacher';tab='students';location.pathname='/account';render()`);a.click({editClass:id});assert.match(a.nodes['#modal-root'].innerHTML,/id="class-image-preview" class="news-image-preview"><img src="data:image\/png;base64,dGVzdA=="/);});
test("class photo crop keeps the card's fixed 8:5 frame and stores only the selected area",()=>{const a=app();a.set("lang='en';role='teacher';tab='students';location.pathname='/account';render()");a.click({action:'new-class'});a.set("classCropSource='data:image/png;base64,dGVzdA==';classCrop=initialClassCrop(1600,900);document.querySelector('#class-crop-editor').innerHTML=classCropMarkup()");const html=a.nodes['#class-crop-editor'].innerHTML;assert.match(html,/id="class-crop-frame"/);assert.match(html,/id="class-crop-size"/);assert.match(html,/data-action="apply-class-crop"/);let crop=a.read('classCrop');assert.ok(Math.abs(crop.width*1600/(a.read('cropHeight(classCrop)')*900)-1.6)<1e-10);a.nodes['#class-crop-frame']={style:{}};a.set('resizeClassCrop(.3)');crop=a.read('classCrop');assert.ok(crop.x>=0&&crop.y>=0&&crop.x+crop.width<=1&&crop.y+a.read('cropHeight(classCrop)')<=1);a.nodes['#class-crop-stage img']={naturalWidth:1600,naturalHeight:900};a.ctx.document.createElement=()=>({getContext:()=>({drawImage:(...args)=>a.ctx.cropDraw=args}),toDataURL:()=> 'data:image/jpeg;base64,dGVzdA=='});assert.equal(a.read('applyClassCrop()'),true);assert.equal(a.read('classDraftImage'),'data:image/jpeg;base64,dGVzdA==');assert.ok(Math.abs(a.ctx.cropDraw[3]/a.ctx.cropDraw[4]-1.6)<1e-10);assert.deepEqual(a.ctx.cropDraw.slice(5),[0,0,800,500]);});
test('home News preview shows a studio story and its image',()=>{const a=app();a.set("lang='en';render()");const html=a.nodes['#app'].innerHTML,option=html.match(/<label class="upcoming-option[^]*?<\/label>/)?.[0];assert.ok(option.indexOf('<span>')<option.indexOf('<time'));assert.match(option,/Student Art Showcase/);assert.match(html,/class="upcoming-detail-copy"/);assert.match(html,/class="news-detail-image" src="\/assets\/beamal-canvas\.jpg"/);assert.doesNotMatch(option,/Course [123]/);});
test('teacher can publish dated news with an image for the home and News pages',()=>{const a=app({},'2026-10-09T12:00:00');a.set("lang='en';role='teacher';tab='news';location.pathname='/account';render()");let html=a.nodes['#app'].innerHTML,releaseDate=a.read('localToday()');assert.match(html,/data-tab="settings" class="active"/);assert.match(html,new RegExp(`name="releaseDate" value="${releaseDate}"`));a.set("newsDraftImage='data:image/png;base64,dGVzdA=='");a.submit('teacher-news',{title:'Studio update',description:'A short summary',content:'The full studio announcement.',releaseDate});assert.equal(a.read('db.news.length'),4);assert.equal(a.read("JSON.parse(localStorage.getItem(K)).news[0].title"),'Studio update');a.set("lang='en';role='';location.pathname='/';render()");html=a.nodes['#app'].innerHTML;assert.match(html,/Studio update/);assert.match(html,/A short summary/);assert.match(html,/The full studio announcement\./);assert.match(html,/src="data:image\/png;base64,dGVzdA=="/);assert.equal((html.match(/name="upcoming-event"/g)||[]).length,4);a.click({go:'/news'});html=a.nodes['#app'].innerHTML;assert.match(html,/Studio update/);assert.doesNotMatch(html.match(/<section class="news-page">[\s\S]*?<\/section>/)?.[0]||'',/>Course [123]</);});
test('teacher edits an existing news post without creating another post or losing its image',()=>{const a=app();a.set("lang='en';role='teacher';tab='news';location.pathname='/account';render();newsDraftImage='data:image/png;base64,dGVzdA=='");a.submit('teacher-news',{title:'First title',description:'First summary',content:'First content',releaseDate:'2026-09-30'});const id=a.read('db.news[0].id'),next=a.read('db.next');a.click({editNews:id});let html=a.nodes['#app'].innerHTML;assert.match(html,/Edit news/);assert.match(html,/name="title" maxlength="120" value="First title"/);assert.match(html,/First content<\/textarea>/);assert.match(html,/id="news-image-preview" class="news-image-preview"><img src="data:image\/png;base64,dGVzdA=="/);a.submit('teacher-news',{title:'Updated title',description:'Updated summary',content:'Updated content',releaseDate:'2026-10-01'});assert.equal(a.read('db.news.length'),4);assert.equal(a.read('db.next'),next);assert.equal(a.read('db.news[0].id'),id);assert.equal(a.read('db.news[0].image'),'data:image/png;base64,dGVzdA==');assert.equal(a.read("JSON.parse(localStorage.getItem(K)).news[0].title"),'Updated title');a.set("role='';location.pathname='/news';render()");html=a.nodes['#app'].innerHTML;assert.match(html,/Updated title/);assert.match(html,/Updated content/);assert.doesNotMatch(html,/First title/);});
test('teacher can edit a seeded story and keep its existing Beamal image',()=>{const a=app();a.set("lang='en';role='teacher';tab='news';location.pathname='/account';render()");a.click({editNews:'sample-news-2'});let html=a.nodes['#app'].innerHTML;assert.match(html,/name="title" maxlength="120" value="Art Award Highlights"/);assert.match(html,/id="news-image-preview" class="news-image-preview"><img src="\/assets\/beamal-storybook\.jpg"/);a.submit('teacher-news',{title:'Updated studio story',description:'Revised summary',content:'Revised content',releaseDate:'2026-09-30'});assert.equal(a.read('db.news.length'),3);assert.equal(a.read("db.news.find(post=>post.id==='sample-news-2').image"),'/assets/beamal-storybook.jpg');a.set("role='';location.pathname='/news';render()");html=a.nodes['#app'].innerHTML;assert.match(html,/Updated studio story/);assert.match(html,/Revised content/);assert.doesNotMatch(html,/Art Award Highlights/);});
test('manager News opens on the published stories before the editor',()=>{const a=app();a.set("lang='en';role='teacher';tab='news';location.pathname='/account';render()");let html=a.nodes['#app'].innerHTML;assert.ok(html.indexOf('class="teacher-news-list"')<html.indexOf('id="teacher-news"'));for(const title of ['Student Art Showcase','Art Award Highlights','Studio Updates'])assert.match(html,new RegExp(title));assert.equal((html.match(/data-edit-news=/g)||[]).length,3);assert.match(html,/data-action="new-news"/);a.click({editNews:'sample-news-1'});assert.match(a.nodes['#app'].innerHTML,/Edit news/);a.click({action:'new-news'});assert.equal(a.read('newsEditId'),'');assert.match(a.nodes['#app'].innerHTML,/Add news/);assert.match(a.nodes['#app'].innerHTML,/Student Art Showcase/);});
test('cancelling a news edit leaves the published post intact',()=>{const a=app();a.set("lang='en';role='teacher';tab='news';location.pathname='/account';db.news=[{id:'N1',title:'Original',description:'Summary',content:'Content',releaseDate:'2026-09-30',image:''}];render()");a.click({editNews:'N1'});a.click({action:'cancel-news-edit'});assert.equal(a.read('newsEditId'),'');assert.equal(a.read('db.news[0].title'),'Original');assert.match(a.nodes['#app'].innerHTML,/Add news/);});
test('homepage News shows sample stories and links to the full page',()=>{const a=app();a.set("lang='en';render()");let html=a.nodes['#app'].innerHTML;assert.match(html,/Latest News/);assert.match(html,/Studio updates/);assert.equal((html.match(/name="upcoming-event"/g)||[]).length,3);assert.ok((html.match(/href="\/news" data-go="\/news"/g)||[]).length>=3);const footer=html.slice(html.indexOf('<footer'));assert.match(footer,/href="\/news" data-go="\/news"/);let detail=html.match(/<article class="upcoming-detail teacher-news-detail">([\s\S]*?)<\/article>/)?.[1];assert.match(detail,/Student Art Showcase/);a.change('upcoming-event','1');html=a.nodes['#app'].innerHTML;detail=html.match(/<article class="upcoming-detail teacher-news-detail">([\s\S]*?)<\/article>/)?.[1];assert.match(detail,/Art Award Highlights/);assert.match(html,/value="1" checked/);a.click({go:'/news'});html=a.nodes['#app'].innerHTML;assert.match(html,/Art Award Highlights/);assert.doesNotMatch(html,/Next class|lessons per term/);});
function app(seed={},clock,mobile=false,injectedClient=null,options={}){const handlers={},store=new Map(Object.entries(seed)),session=new Map(),nodes={},windowHandlers={};let historyIndex=0;const historyEntries=[{path:options.pathname||'/',state:null}];const storage=(m,local=false)=>({getItem:k=>m.get(k)??null,setItem:(k,v)=>{const failure=local?options.localWriteError?.(k,v):null;if(failure)throw failure;return m.set(k,v)},removeItem:k=>m.delete(k)});const ctx=vm.createContext({coursePublicColourFields,coursePublicColourPayload,createPublicTrialDraft,advancePublicTrial,publicTrialMarkup,availabilityPublicPreviewMarkup,timetableNoteDialogMarkup,validateTimetableNoteDraft,timetableNoteButtonMarkup,normalizeTimetableFilterState,validateTimetableFilterDraft,matchesTimetableFilterState,timetableNamedFiltersMarkup,timetableFilterEditorMarkup,sessionIdentityKey,resolveSharedLessonContext,timetableGridMinimum,timetableCreateCells,timetableCreateCellMarkup,...(options.preview?{createInterfacePreview:settings=>{options.onPreviewContext?.(settings.context);options.onPreviewSettings?.(settings);return createInterfacePreview({...settings,dom:ctx.document,Form:ctx.FormData});}}:{}),reportsPageMarkup,feePricingMarkup,enrollmentOrdersMarkup,enrollmentOrderDetailsMarkup,enrollmentOrderEditorMarkup,studentAccountLinksMarkup,sharedStudentClassesMarkup,enrollmentLessons,suggestedOrderCents,classTypeName,classTypeSelectionMarkup,classTypeDetailsMarkup,classTypesManagerMarkup,classTypeEditorMarkup,classCapacityStatusMarkup,classCapacityStatusEditorMarkup,representativeColour,timetableTeacherColour,teacherColourMarkersMarkup,availabilityEditorMarkup,availabilityDetailMarkup,availabilityPublicSettingsMarkup,availabilityOccurrenceSummaryMarkup,publicCourseDirectoryMarkup,publicCourseDetailsMarkup,publicSlotMatchesType,peopleDirectoryMarkup,peopleProfileMarkup,peopleEditorMarkup,accessControlMarkup,accessTeacherLinkEditorMarkup,accessGrantEditorMarkup,timetableDateRange,timetableRangeControlMarkup,schedulingResourcesMarkup,schedulingResourceEditorMarkup,scheduleResourcePickerMarkup,scheduleOccurrences,scheduleOccurrence,scheduleFollowingRule,scheduleScopeMarkup,courseScheduleTableMarkup,materialPanelMarkup,materialEditorMarkup,materialVideoRow,safeMaterialUrl,materialAttachmentDrafts,attachmentIssue,AbortController,...(injectedClient?{createApiClient:()=>injectedClient}:{}),localStorage:storage(store,true),sessionStorage:storage(session),navigator:{language:'zh-HK'},location:{pathname:options.pathname||'/'},history:{get state(){return JSON.parse(JSON.stringify(historyEntries[historyIndex].state))},pushState(state,_,p){historyEntries.splice(historyIndex+1);historyEntries.push({path:p||ctx.location.pathname,state:JSON.parse(JSON.stringify(state))});historyIndex++;ctx.location.pathname=historyEntries[historyIndex].path},replaceState(state,_,p){historyEntries[historyIndex]={path:p||ctx.location.pathname,state:JSON.parse(JSON.stringify(state))};ctx.location.pathname=historyEntries[historyIndex].path},go(delta){const next=historyIndex+delta;if(next<0||next>=historyEntries.length)return;historyIndex=next;ctx.location.pathname=historyEntries[historyIndex].path;for(const handler of windowHandlers.popstate||[])handler({state:this.state})},back(){this.go(-1)},forward(){this.go(1)}},window:{scrollTo(){},addEventListener:(type,handler)=>{(windowHandlers[type]??=[]).push(handler);options.onWindowEvent?.(type,handler)},setInterval:(handler,ms)=>options.onInterval?.(handler,ms)??0,clearInterval(){},matchMedia:()=>({matches:mobile,addEventListener(){}})},document:{documentElement:{},...(options.initialQuerySelectorAll?{querySelectorAll:options.initialQuerySelectorAll}:{}),querySelector:s=>nodes[s]??(nodes[s]=(()=>{const classes=new Set(),attributes={};return {innerHTML:'',textContent:'',focus(){},setAttribute:(k,v)=>attributes[k]=String(v),getAttribute:k=>attributes[k],classList:{toggle:(k,on)=>on?classes.add(k):classes.delete(k),contains:k=>classes.has(k)}}})()),addEventListener:(e,h)=>{if(e==='change')(handlers.change??=[]).push(h);else handlers[e]=h},createElement:()=>({remove(){}}),body:{append(){}}},FormData:class{constructor(f){return Object.entries(f.values||{}).flatMap(([k,v])=>Array.isArray(v)?v.map(x=>[k,x]):[[k,v]])}},setTimeout(){},confirm:()=>true,Date:clock?class extends Date{constructor(...args){super(...(args.length?args:[clock]))}static now(){return new Date(clock).getTime()}}:Date,console});vm.runInContext(fs.readFileSync(new URL('../src.js',import.meta.url),'utf8').replace(/^import .*;$/gm,''),ctx);return {ctx,read:s=>JSON.parse(vm.runInContext(`JSON.stringify(${s})`,ctx)),submit:(id,values,extra={})=>handlers.submit({preventDefault(){},target:extra.id===id?Object.assign(extra,{values:extra.values||values,classList:extra.classList||{contains:()=>false}}):{id,values,classList:{contains:()=>false},...extra}}),click:(dataset,element)=>handlers.click({preventDefault(){},target:{closest:()=>element||({dataset})}}),nativeClick:target=>handlers.click({preventDefault(){target.prevented=true},target}),input:target=>handlers.input({target}),keydown:(key,extra={})=>handlers.keydown({key,preventDefault(){},...extra}),change:(name,value,extra={})=>handlers.change.forEach(handler=>handler({target:{name,value,...extra}})),set:s=>vm.runInContext(s,ctx),nodes};}
test('home copy switches between polished English and Chinese without special Unicode spacing',()=>{const a=app();a.set("lang='en';render()");let html=a.nodes['#app'].innerHTML;assert.match(html,/Express yourself and tell your story through art/);assert.match(html,/Regular Art Classes for Kids/);assert.match(html,/Storybook Class/);assert.match(html,/Sewing Class/);assert.doesNotMatch(html,/𝗞𝗶𝗱|𝑬𝒙𝒑𝒓𝒆𝒔𝒔/);assert.match(html,/beamal-elephants\.jpg/);assert.match(html,/Clay Classes/);assert.match(html,/Sketching Classes/);assert.match(html,/Drawing Classes/);assert.match(html,/beamal-idioms\.jpg/);assert.match(html,/beamal-sketch\.jpg/);assert.match(html,/beamal-canvas\.jpg/);assert.match(html,/>Home</);a.click({go:'/about'});html=a.nodes['#app'].innerHTML;assert.match(html,/Mission &amp; Vision/);assert.match(html,/Our Story/);assert.match(html,/beamal-colourpencil\.jpg/);assert.match(html,/beamal-guidedog\.jpg/);assert.doesNotMatch(html,/Express yourself|Regular Art Classes for Kids/);a.click({go:'/'});assert.match(a.nodes['#app'].innerHTML,/Express yourself and tell your story through art/);a.set("lang='zh';render()");html=a.nodes['#app'].innerHTML;assert.match(html,/透過藝術表達自己，訴說你的故事/);assert.match(html,/兒童常規藝術課程/);assert.match(html,/繪本課程/);assert.match(html,/縫紉課程/);assert.doesNotMatch(html,/Express yourself|Regular Art Classes for Kids/);});
test('enrolment steps return to the top so mobile users see each new form',()=>{const a=app();a.set("location.pathname='/join';window.scrollTo=(x,y)=>{window.lastScroll=[x,y]};render()");a.submit('join',{course:'art',classId:'a'});assert.equal(a.read('join.step'),2);assert.deepEqual(a.read('window.lastScroll'),[0,0]);a.set('window.lastScroll=null');a.click({action:'joinback'});assert.equal(a.read('join.step'),1);assert.deepEqual(a.read('window.lastScroll'),[0,0]);a.submit('join',{course:'art',classId:'a'});a.set('window.lastScroll=null');a.submit('join',{student:'Alex Chan',phone:'00000000',email:'alex@example.test'});assert.equal(a.read('join.step'),3);assert.deepEqual(a.read('window.lastScroll'),[0,0]);});
test('demo login accepts 1/2 with blank password and rejects invalid credentials',()=>{const a=app();a.submit('login',{username:'9',password:''});assert.match(a.nodes['#login-error'].textContent,/1 或 2/);a.submit('login',{username:'1',password:'secret'});assert.equal(a.read('role'),'');a.submit('login',{username:'1',password:''});assert.equal(a.read('role'),'student');a.click({action:'logout'});a.submit('login',{username:'2',password:''});assert.equal(a.read('role'),'teacher');});
test('logged-in account navigation uses the Beamal login icon',()=>{const a=app();a.set("role='student';location.pathname='/classes';render()");assert.match(a.nodes['#app'].innerHTML,/class="account-avatar"[^>]*><img src="\/assets\/beamal-login_icon\.png"/);assert.match(a.nodes['#app'].innerHTML,/aria-label="我的帳戶"/);});
test('six recurring slots are distinct, two per course, and full slots cannot enrol',()=>{const a=app();const slots=a.read('db.classes');assert.equal(slots.length,6);assert.equal(new Set(slots.map(c=>c.weekday+':'+c.time)).size,6);for(const id of ['art','story','sewing']){const list=slots.filter(c=>c.course===id);assert.equal(list.length,2);assert.equal(list.filter(c=>c.occupied<c.capacity).length,1)}a.set("join={step:3,course:'sewing',classId:'d',student:'Alex Chan',phone:'80000000',email:'alex@example.test'}; finish()");assert.equal(a.read('db.bookings.length'),4);assert.equal(a.read('join.step'),1);a.set("join={step:3,course:'sewing',classId:'f',student:'Alex Chan',phone:'80000000',email:'alex@example.test'}; finish()");assert.equal(a.read('db.bookings.at(-1).status'),'pending');assert.match(a.nodes['#app'].innerHTML,/待付款/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/B1003/);a.click({go:'/payment'});assert.equal(a.read('location.pathname'),'/payment');assert.equal(a.read('db.bookings.at(-1).paid'),false);a.click({action:'complete-payment'});assert.equal(a.read('location.pathname'),'/payment-success');assert.equal(a.read('db.bookings.at(-1).paid'),true);assert.equal(a.read('db.bookings.at(-1).status'),'confirmed');assert.match(a.nodes['#app'].innerHTML,/請查看電郵，啟用你的學生帳戶/);});
test('class change approval updates student schedule, capacity, and payment stays associated',()=>{const a=app();a.set("db.bookings.unshift({id:'B1001',student:db.student.name,studentId:'demo',classId:'a',status:'confirmed',amount:880,paid:false})");a.set('db.classes[1].occupied=3');a.submit('transfer',{to:'b'},{dataset:{booking:'B1001'}});const id=a.read('db.requests[0].id');a.click({approve:id});assert.equal(a.read('mine()[0].classId'),'b');assert.equal(a.read('db.classes[0].occupied'),3);assert.equal(a.read('db.classes[1].occupied'),4);a.set("role='teacher'");a.click({pay:'B1001'});assert.equal(a.read('mine()[0].paid'),true);assert.ok(a.read('mine()[0].paidAt'));});
test('full target prevents approval; rejection preserves original class; reset restores data',()=>{const a=app();a.set("db.bookings.unshift({id:'B1001',student:db.student.name,studentId:'demo',classId:'a',status:'confirmed',amount:880,paid:false})");a.submit('transfer',{to:'b'},{dataset:{booking:'B1001'}});a.set('db.classes[1].occupied=db.classes[1].capacity');const id=a.read('db.requests[0].id');a.click({approve:id});assert.equal(a.read('db.requests[0].status'),'pending');assert.equal(a.read('mine()[0].classId'),'a');a.click({reject:id});assert.equal(a.read('db.requests[0].status'),'rejected');a.click({action:'reset'});assert.equal(a.read('db.requests.length'),0);assert.equal(a.read('db.bookings.length'),4);});
test('new student has no activity, read-only profile, and only teacher can update it',()=>{const a=app();assert.equal(a.read('db.student.name'),'Alex Chan');assert.equal(a.read('mine().length'),0);assert.equal(a.read('db.requests.length'),0);a.set("role='student';tab='payments';location.pathname='/account';render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,/id="profile"|name="name"|返回網站/);a.submit('teacher-profile',{name:'Not allowed',phone:'1',email:'x@example.test'},{dataset:{student:'demo'}});assert.equal(a.read('db.student.name'),'Alex Chan');a.set("role='teacher'");a.submit('teacher-profile',{name:'<img src=x onerror=alert(1)>',phone:'00000000',email:'demo@example.test'},{dataset:{student:'demo'}});assert.equal(a.read('db.student.name'),'<img src=x onerror=alert(1)>');a.set("role='student';tab='payments';render()");assert.match(a.nodes['#app'].innerHTML,/&lt;img/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/<img src=x/);});
test('calendar shows confirmed recurring student classes and navigates across years',()=>{const a=app();a.set("role='student';tab='overview';location.pathname='/account';calendarMonth=new Date(2026,9,1);db.bookings.push({id:'TEST',studentId:'demo',student:db.student.name,classId:'a',status:'pending'});render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,/class="calendar-event"/);a.set("db.bookings.at(-1).status='confirmed';render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,/class="calendar-event"/);a.set("db.bookings.at(-1).paid=true;db.bookings.at(-1).paidAt='2026-09-30';render()");assert.equal((a.nodes['#app'].innerHTML.match(/class="calendar-event"/g)||[]).length,4);a.set('calendarMonth=new Date(2026,11,1)');a.click({action:'calendar-next'});assert.equal(a.read('calendarMonth.getFullYear()'),2027);assert.equal(a.read('calendarMonth.getMonth()'),0);a.click({action:'calendar-prev'});assert.equal(a.read('calendarMonth.getMonth()'),11);});
test('duplicate enrolments retain the paid record and repeated submission does not add a class or charge',()=>{const a=app();a.set("db.bookings.push(...[6,7,8,9].map(n=>({id:'B100'+n,student:db.student.name,studentId:'demo',classId:'a',status:n===8?'confirmed':'pending',paid:n===8,amount:1000})));db.classes[0].occupied=8;sessionStorage.setItem('beamal-enrolment','B1009');deduplicateEnrolments()");assert.equal(a.read('mine().length'),1);assert.equal(a.read('mine()[0].id'),'B1008');assert.equal(a.read('mine()[0].paid'),true);assert.equal(a.read('db.classes[0].occupied'),5);assert.equal(a.read("sessionStorage.getItem('beamal-enrolment')"),'B1008');a.set("join={step:3,course:'art',classId:'a',student:db.student.name,phone:'80000000',email:db.student.email};finish();finish()");assert.equal(a.read('mine().length'),1);assert.equal(a.read('db.classes[0].occupied'),5);assert.equal(a.read('mine()[0].paid'),true);a.set("role='student';tab='courses';location.pathname='/account';render()");assert.match(a.nodes['#app'].innerHTML,/我的課程/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/我的課程與時間表|轉堂申請|申請轉堂/);});
test('legacy duplicate booking ids resolve request references without blocking startup',()=>{
 const a=app();a.set("db.bookings=[{id:'SAME',studentId:'same-student',student:'Same student',classId:'a',paid:false,status:'pending'},{id:'SAME',studentId:'same-student',student:'Same student',classId:'a',paid:true,status:'confirmed',marker:'paid-winner'},{id:'KEEP',studentId:'other-student',student:'Other student',classId:'b',paid:true,status:'confirmed'}];db.requests=[{id:'R-SAME',booking:'SAME'},{id:'R-KEEP',booking:'KEEP'}]");
 vm.runInContext('deduplicateEnrolments()',a.ctx,{timeout:250});
 assert.equal(a.read('db.bookings.length'),2);assert.equal(a.read("db.bookings.find(row=>row.id==='SAME').marker"),'paid-winner');assert.deepEqual(a.read('db.requests.map(row=>row.booking)'),['SAME','KEEP']);
});

test('legacy duplicate booking ids retain checkout references without blocking startup',()=>{
 const a=app();a.set("db.bookings=[{id:'SAME',studentId:'same-student',student:'Same student',classId:'a',paid:false,status:'pending'},{id:'SAME',studentId:'same-student',student:'Same student',classId:'a',paid:true,status:'confirmed'}];db.requests=[];sessionStorage.setItem('beamal-enrolment','SAME')");
 vm.runInContext('deduplicateEnrolments()',a.ctx,{timeout:250});
 assert.equal(a.read('db.bookings.length'),1);assert.equal(a.read('db.bookings[0].paid'),true);assert.equal(a.read("sessionStorage.getItem('beamal-enrolment')"),'SAME');
});

test('legacy cross-group booking id cycles preserve surviving records and references',()=>{
 const a=app();a.set("db.bookings=[{id:'A',studentId:'student-one',student:'One',classId:'a',paid:false},{id:'B',studentId:'student-one',student:'One',classId:'a',paid:true},{id:'B',studentId:'student-two',student:'Two',classId:'b',paid:false},{id:'A',studentId:'student-two',student:'Two',classId:'b',paid:true},{id:'KEEP',studentId:'student-three',student:'Three',classId:'c',paid:false}];db.requests=[{booking:'A'},{booking:'B'},{booking:'KEEP'}];sessionStorage.setItem('beamal-enrolment','A')");
 vm.runInContext('deduplicateEnrolments()',a.ctx,{timeout:250});
 assert.deepEqual(a.read('db.bookings.map(row=>[row.id,row.studentId])'),[['B','student-one'],['A','student-two'],['KEEP','student-three']]);assert.deepEqual(a.read('db.requests.map(row=>row.booking)'),['A','B','KEEP']);assert.equal(a.read("sessionStorage.getItem('beamal-enrolment')"),'A');
});

test('legacy duplicate booking aliases retain paid-winner references through a chain and are idempotent',()=>{
 const a=app();a.set("db.bookings=[{id:'A',studentId:'same-student',student:'Same student',classId:'a',paid:false},{id:'B',studentId:'same-student',student:'Same student',classId:'a',paid:false},{id:'C',studentId:'same-student',student:'Same student',classId:'a',paid:true},{id:'KEEP',studentId:'other-student',student:'Other student',classId:'b',paid:true}];db.requests=[{booking:'A'},{booking:'B'},{booking:'C'},{booking:'KEEP'},{booking:'UNKNOWN'}];sessionStorage.setItem('beamal-enrolment','B')");
 vm.runInContext('deduplicateEnrolments()',a.ctx,{timeout:250});
 assert.deepEqual(a.read('db.bookings.map(row=>row.id)'),['C','KEEP']);assert.deepEqual(a.read('db.requests.map(row=>row.booking)'),['C','C','C','KEEP','UNKNOWN']);assert.equal(a.read("sessionStorage.getItem('beamal-enrolment')"),'C');
 const before=a.read('db');vm.runInContext('deduplicateEnrolments()',a.ctx,{timeout:250});assert.deepEqual(a.read('db'),before);
});

test('teacher edits recurring classes with pencil, validates capacity and unique time, and adds slots',()=>{const a=app();a.set("role='teacher';tab='students';location.pathname='/account';render()");assert.match(a.nodes['#app'].innerHTML,/班別設定/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/type="date"|class-edit|student-directory|學生與班別/);a.click({editClass:'a'});assert.match(a.nodes['#modal-root'].innerHTML,/id="class-editor"/);const original=a.read('db.classes[0]');a.submit('class-editor',{courseName:'Course 1',classCode:'CL-001',weekdays:['2'],time:'14:00',capacity:'8',lessonsPerTerm:'4'},{dataset:{id:'a'}});assert.match(a.nodes['#class-error'].textContent,/已有課程/);assert.deepEqual(a.read('db.classes[0]'),original);a.submit('class-editor',{courseName:'Course 1',classCode:'CL-001',weekdays:['0'],time:'09:30',capacity:'3',lessonsPerTerm:'4'},{dataset:{id:'a'}});assert.equal(a.read('db.classes[0].capacity'),8);a.submit('class-editor',{courseName:'Course 1',classCode:'CL-001',weekdays:['0'],time:'09:30',capacity:'10',lessonsPerTerm:'4'},{dataset:{id:'a'}});assert.equal(a.read('db.classes[0].weekday'),0);assert.equal(a.read('db.classes[0].time'),'09:30');assert.equal(a.read('db.classes[0].occupied'),4);a.click({action:'new-class'});a.submit('class-editor',{courseName:'Course 2',classCode:'CL-007',weekdays:['1'],time:'17:30',capacity:'12',lessonsPerTerm:'4'},{dataset:{id:''}});assert.equal(a.read('db.classes.length'),7);assert.equal(a.read('db.classes.at(-1).occupied'),0);a.set("join={step:1,course:'story',classId:'c'};location.pathname='/join';modal='';render()");assert.match(a.nodes['#app'].innerHTML,/逢星期一 · 17:30/);assert.match(a.nodes['#app'].innerHTML,/堂／期/);a.set("role='student'");a.submit('class-editor',{course:'art',weekday:'0',time:'18:00',capacity:'5',lessonsPerTerm:'4'},{dataset:{id:''}});assert.equal(a.read('db.classes.length'),7);});

test('teacher class cards open a separate enrolled-student list page',()=>{const a=app();a.set("lang='en';role='teacher';tab='students';location.pathname='/account';db.bookings.push({id:'UNPAID',student:'Unpaid Visitor',classId:'a',status:'pending',paid:false});render()");assert.match(a.nodes['#app'].innerHTML,/>View students</);assert.match(a.nodes['#app'].innerHTML,/data-class-roster="a"/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/class-title-button/);a.click({classRoster:'a'});assert.equal(a.read('location.pathname'),'/account/classes/a');assert.match(a.nodes['#app'].innerHTML,/David Leung/);assert.match(a.nodes['#app'].innerHTML,/david@example\.test/);assert.match(a.nodes['#app'].innerHTML,/00000000/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/Unpaid Visitor/);assert.match(a.nodes['#app'].innerHTML,/Back to classes/);assert.match(a.nodes['#app'].innerHTML,/data-tab="catalog" class="active"/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/role="dialog"/);a.set("render()");assert.match(a.nodes['#app'].innerHTML,/David Leung/);a.click({action:'back-classes'});assert.equal(a.read('location.pathname'),'/account');assert.match(a.nodes['#app'].innerHTML,/Class settings/);a.click({classRoster:'b'});assert.match(a.nodes['#app'].innerHTML,/No students have joined this class yet/);a.click({tab:'payments'});assert.equal(a.read('location.pathname'),'/account');assert.match(a.nodes['#app'].innerHTML,/Payments &amp; income|Payments & income/);a.set("role='student';location.pathname='/account/classes/a';render()");assert.equal(a.read('location.pathname'),'/account');assert.doesNotMatch(a.nodes['#app'].innerHTML,/David Leung/);});

test('course and join pages show lessons per term and teacher validates the lesson count',()=>{const a=app();a.set("lang='en';location.pathname='/classes';render()");let html=a.nodes['#app'].innerHTML;assert.match(html,/4 lessons per term/);assert.doesNotMatch(html,/Class dates/);a.set("role='teacher';tab='students';location.pathname='/account';render()");a.click({action:'new-class'});assert.match(a.nodes['#modal-root'].innerHTML,/name="lessonsPerTerm"[^>]*value="4"/);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/name="startDate"|name="endDate"/);const input={courseName:'Painting lab',classCode:'CL-007',weekdays:['1'],time:'18:30',capacity:'8',lessonsPerTerm:'0'};a.submit('class-editor',input,{dataset:{id:''}});assert.match(a.nodes['#class-error'].textContent,/lessons per term/);assert.equal(a.read('db.classes.length'),6);a.submit('class-editor',{...input,lessonsPerTerm:'6'},{dataset:{id:''}});assert.equal(a.read('db.classes.at(-1).lessonsPerTerm'),6);a.set("role='student';join={step:1,course:'art',classId:'a'};location.pathname='/join';render()");assert.match(a.nodes['#app'].innerHTML,/4 lessons per term/);});

test('custom classes appear on the public courses page and open their details',()=>{const a=app();a.set("role='teacher';tab='students';location.pathname='/account';render()");a.click({action:'new-class'});a.submit('class-editor',{courseName:'Painting lab',classCode:'PAINT-01',weekdays:['1','3'],time:'18:30',capacity:'8',lessonsPerTerm:'4'},{dataset:{id:''}});const courseId=a.read('db.classes.at(-1).course');a.set("lang='en';role='';location.pathname='/classes';render()");assert.match(a.nodes['#app'].innerHTML,/Painting lab/);assert.match(a.nodes['#app'].innerHTML,/Every Wednesday、Every Monday · 18:30/);assert.match(a.nodes['#app'].innerHTML,/4 lessons per term/);assert.match(a.nodes['#app'].innerHTML,new RegExp(`href="/classes/${courseId}" data-go="/classes/${courseId}"[^>]*>Explore class</`));a.click({go:`/classes/${courseId}`});assert.match(a.nodes['#app'].innerHTML,/Painting lab/);assert.match(a.nodes['#app'].innerHTML,/Back to courses/);});

test('opening and cancelling the class editor only changes the dialog, preserving the background',()=>{const a=app();a.set("role='teacher';tab='students';location.pathname='/account';render()");const background=a.nodes['#app'].innerHTML;a.click({editClass:'a'});assert.equal(a.nodes['#app'].innerHTML,background);assert.match(a.nodes['#modal-root'].innerHTML,/修改課程/);a.click({action:'close'});assert.equal(a.nodes['#modal-root'].innerHTML,'');assert.equal(a.nodes['#app'].innerHTML,background);a.click({action:'new-class'});assert.equal(a.nodes['#app'].innerHTML,background);assert.match(a.nodes['#modal-root'].innerHTML,/新增課程/);});

test('overview cards open separate lists with the matching sidebar entry selected',()=>{const a=app();a.set("role='teacher';tab='overview';location.pathname='/account';render()");a.click({tab:'student-list'});let html=a.nodes['#app'].innerHTML;assert.match(html,/學生名單/);assert.match(html,/data-tab="student-list" class="active"/);assert.doesNotMatch(html,/班別設定|data-tab="catalog" class="active"/);a.click({tab:'overview'});a.click({tab:'new-enrolments'});html=a.nodes['#app'].innerHTML;assert.match(html,/新學生報名/);assert.match(html,/data-tab="new-enrolments" class="active"/);assert.doesNotMatch(html,/轉堂申請|data-tab="requests" class="active"/);assert.match(html,/返回時間表/);});

test('reset restores three default students and clears enrolments, edits, requests and pending checkout',()=>{const a=app();assert.deepEqual(a.read('allStudentProfiles().map(s=>s.name)'),['Alex Chan','David Leung','Ryan Yu']);a.set("role='teacher';db.student.name='Changed';db.studentProfiles={};db.classes[0].time='23:00';db.bookings.push({id:'TEST',student:'Other',classId:'a'});db.requests.push({id:'R1'});sessionStorage.setItem('beamal-enrolment','TEST');modal='old';search='Other';tab='students'");a.click({action:'reset'});assert.deepEqual(a.read('allStudentProfiles().map(s=>s.name)'),['Alex Chan','David Leung','Ryan Yu']);assert.equal(a.read('db.bookings.length'),4);assert.equal(a.read('db.requests.length'),0);assert.equal(a.read('db.classes[0].time'),'10:00');assert.equal(a.read("sessionStorage.getItem('beamal-enrolment')"),null);assert.equal(a.read('tab'),'overview');assert.equal(a.read('modal'),'');assert.equal(a.read('search'),'');assert.match(a.nodes['#app'].innerHTML,/banner-reset/);});
test('reset logs out either account and returns to the homepage',()=>{for(const account of ['student','teacher']){const a=app();a.set(`role='${account}';sessionStorage.setItem('role',role);location.pathname='/account';db.student.name='Changed';render()`);a.click({action:'reset'});assert.equal(a.read('location.pathname'),'/');assert.equal(a.read('role'),'');assert.equal(a.read("sessionStorage.getItem('role')"),null);assert.equal(a.read('db.student.name'),'Alex Chan');assert.match(a.nodes['#app'].innerHTML,/data-go="\/login"/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/class="account-avatar"/);}});

test('default students have the requested courses while account 1 stays unenrolled',()=>{const a=app();assert.equal(a.read('db.student.name'),'Alex Chan');assert.equal(a.read('mine().length'),0);assert.deepEqual(a.read("db.bookings.filter(b=>b.student==='David Leung').map(b=>cl(b.classId).course)"),['art','story']);assert.deepEqual(a.read("db.bookings.filter(b=>b.student==='Ryan Yu').map(b=>cl(b.classId).course)"),['story','sewing']);assert.equal(a.read('newEnrolments().length'),0);a.click({action:'reset'});assert.equal(a.read('mine().length'),0);assert.equal(a.read('db.bookings.length'),4);});

test('student count includes only paid confirmed students, counted once across multiple courses',()=>{const a=app();assert.deepEqual(a.read('studentList().map(s=>s.name)'),['David Leung','Ryan Yu']);a.set("db.bookings.push({id:'ALEX',studentId:'demo',student:db.student.name,classId:'a',status:'pending',paid:false,amount:1000})");assert.equal(a.read('studentList().length'),2);a.set("db.bookings.at(-1).status='confirmed'");assert.equal(a.read('studentList().length'),2);a.set("role='teacher'");a.click({pay:'ALEX'});assert.equal(a.read('studentList().length'),3);a.set("db.bookings.push({id:'ALEX2',studentId:'demo',student:db.student.name,classId:'c',status:'confirmed',paid:true})");assert.equal(a.read('studentList().length'),3);a.set("role='teacher';tab='payments';location.pathname='/account';render()");assert.match(a.nodes['#app'].innerHTML,/<th>Status<\/th>/);a.click({action:'reset'});assert.equal(a.read('studentList().length'),2);assert.equal(a.read('mine().length'),0);assert.ok(a.read('db.bookings.every(b=>b.paid)'));});

test('payments sort newest first, monthly totals match dates, and Excel contains records and monthly summaries',async()=>{const a=app();assert.deepEqual(a.read('sortedPayments(db.bookings).map(b=>b.paidAt)'),['2026-09-18','2026-08-12','2026-07-15','2026-06-08']);a.set("incomeEnd=new Date(2026,8,1);role='teacher';tab='payments';location.pathname='/account';render()");assert.deepEqual(a.read('incomeMonths().map(m=>m.total)'),[0,0,1000,1200,1200,1500]);a.click({incomeMonth:'2026-07'});assert.match(a.nodes['#app'].innerHTML,/Record · 2026-07/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/Ryan Yu · B1005/);a.click({action:'income-all'});assert.match(a.nodes['#app'].innerHTML,/Ryan Yu · B1005/);const sheets=a.read('incomeExportSheets()');assert.equal(sheets[0].data.length,5);assert.equal(sheets[0].data[1][5],'2026-09-18');assert.equal(sheets[1].data.slice(1).reduce((sum,r)=>sum+r[1],0),4900);const {default:writeExcelFile}=await import('write-excel-file/node');await writeExcelFile(sheets).toFile('/tmp/beamal-export-check.xlsx');});

test('manual courses, multiple weekdays and editable unique class codes persist safely',()=>{const a=app();a.set("role='teacher';tab='students';location.pathname='/account';render()");a.click({action:'new-class'});assert.match(a.nodes['#modal-root'].innerHTML,/name="courseName"/);assert.match(a.nodes['#modal-root'].innerHTML,/name="classCode" value="CL-007"/);assert.equal((a.nodes['#modal-root'].innerHTML.match(/type="checkbox"/g)||[]).length,7);const input={courseName:'Painting lab',classCode:'cl-001',weekdays:['1','3'],time:'18:30',capacity:'8',lessonsPerTerm:'4'};a.submit('class-editor',input,{dataset:{id:''}});assert.match(a.nodes['#class-error'].textContent,/已被使用/);assert.equal(a.read('db.classes.length'),6);a.submit('class-editor',{...input,classCode:'PAINT-01',weekdays:[]},{dataset:{id:''}});assert.equal(a.read('db.classes.length'),6);a.submit('class-editor',{...input,classCode:'PAINT-01'},{dataset:{id:''}});assert.equal(a.read('db.classes.length'),7);assert.deepEqual(a.read('db.classes.at(-1).weekdays'),[1,3]);assert.match(a.nodes['#app'].innerHTML,/Painting lab/);assert.match(a.nodes['#app'].innerHTML,/PAINT-01/);assert.equal(a.read('db.classes.at(-1).lessonsPerTerm'),4);const id=a.read('db.classes.at(-1).id');a.click({editClass:id});assert.match(a.nodes['#modal-root'].innerHTML,/value="PAINT-01"/);a.submit('class-editor',{...input,classCode:'PAINT-01',weekdays:['2','4']},{dataset:{id}});assert.deepEqual(a.read('db.classes.at(-1).weekdays'),[2,4]);a.click({action:'new-class'});assert.match(a.nodes['#modal-root'].innerHTML,/value="CL-007"/);a.submit('class-editor',{...input,classCode:'OTHER',weekdays:['2'],time:'14:00'},{dataset:{id:''}});assert.equal(a.read('db.classes.length'),7);});

test('time lists descend and unpaid enrolments retain original submission time',()=>{const a=app();a.set("join={step:3,course:'art',classId:'a',student:'Alex Chan',phone:'80000000',email:'alex@example.test'};finish()");const stamp=a.read('db.bookings.at(-1).submittedAt');assert.ok(!Number.isNaN(Date.parse(stamp)));a.set("join={step:3,course:'art',classId:'a',student:'Alex Chan',phone:'80000000',email:'alex@example.test'};finish()");assert.equal(a.read('db.bookings.at(-1).submittedAt'),stamp);a.set("role='teacher';tab='new-enrolments';location.pathname='/account';render()");assert.match(a.nodes['#app'].innerHTML,/提交日期/);assert.ok(a.nodes['#app'].innerHTML.includes(a.read('dateTime(db.bookings.at(-1).submittedAt)')));const records=[{id:'1',paid:false,submittedAt:'2026-09-28T03:00:00Z'},{id:'2',paid:false,submittedAt:'2026-09-28T04:00:00Z'},{id:'3',paid:true,paidAt:'2026-09-27'}];a.set('checkRecords='+JSON.stringify(records));assert.deepEqual(a.read('sortedPayments(checkRecords).map(b=>b.id)'),['2','1','3']);assert.deepEqual(a.read('sortedRecords(checkRecords).map(b=>b.id)'),['2','1','3']);assert.equal(a.read("dateTime('2026-09-28T04:00:00Z')"),'28/09/2026, 12:00:00');assert.equal(a.read("recordMonth('2026-09-30T17:00:00Z')"),'2026-10');assert.equal(a.read('dateTime(undefined)'),'未記錄');const weekly=a.read('sortedClasses(db.classes).map(weeklyRank)');assert.deepEqual(weekly,[...weekly].sort((x,y)=>y-x));a.set("role='teacher';tab='payments';render()");assert.match(a.nodes['#app'].innerHTML,/提交日期/);assert.equal(a.read('incomeExportSheets()[0].data[0].at(-1)'),'Submit date');});

test('sample visitor enters their own enrolment and login details instead of receiving prefilled demo credentials',()=>{const a=app();a.set("lang='en';location.pathname='/classes';render()");a.click({go:'/classes/art'});a.click({enrol:'art'});a.submit('join',{course:'art',classId:'a'});let html=a.nodes['#app'].innerHTML;assert.match(html,/id="student" name="student" value="" required/);assert.match(html,/id="phone" name="phone" inputmode="numeric" pattern="\[0-9\]\+" value="" required/);assert.match(html,/id="email" name="email" type="text" value="" required/);assert.doesNotMatch(html,/id="student"[^>]*value="Alex Chan"/);a.submit('join',{student:'Sample Visitor',phone:'81234567',email:'visitor@example.test'});assert.match(a.nodes['#app'].innerHTML,/Sample Visitor · visitor@example\.test/);a.submit('join',{});assert.equal(a.read('db.bookings.at(-1).student'),'Sample Visitor');assert.equal(a.read('Object.hasOwn(join,"student")'),false);a.click({go:'/join'});a.submit('join',{course:'art',classId:'a'});assert.match(a.nodes['#app'].innerHTML,/id="student" name="student" value="" required/);a.click({go:'/login'});assert.match(a.nodes['#app'].innerHTML,/id="username" name="username" value="" autocomplete="username" required/);});

test('enrolment details accept names as text, phone digits and unrestricted email text',()=>{const a=app();a.set("lang='en';join={step:2,course:'art',classId:'a'};location.pathname='/join';render()");let html=a.nodes['#app'].innerHTML;assert.match(html,/id="phone" name="phone" inputmode="numeric" pattern="\[0-9\]\+"/);assert.match(html,/id="email" name="email" type="text"/);a.submit('join',{student:'Alex123',phone:'81234567',email:'sample'});assert.equal(a.read('join.step'),2);assert.match(a.nodes['#join-error'].textContent,/letters and spaces/);a.submit('join',{student:'陳 小明',phone:'8a123',email:'sample'});assert.equal(a.read('join.step'),2);assert.match(a.nodes['#join-error'].textContent,/digits only/);const phone={id:'phone',value:'8a 12-34'};a.input(phone);assert.equal(phone.value,'81234');a.submit('join',{student:'陳 小明',phone:'81234',email:'sample'});assert.equal(a.read('join.step'),3);assert.match(a.nodes['#app'].innerHTML,/陳 小明 · sample/);});

test('review and enrolment receipt explain the student account activation email after payment',()=>{const a=app();a.set("lang='en';join={step:3,course:'art',classId:'a',student:'Sample Visitor',phone:'81234567',email:'visitor@example.test'};location.pathname='/join';render()");assert.match(a.nodes['#app'].innerHTML,/Once payment is successful, you will receive an email to activate your student account/);a.submit('join',{});assert.equal(a.read('location.pathname'),'/confirmation');assert.match(a.nodes['#app'].innerHTML,/Once payment is successful, you will receive an email to activate your student account/);a.set("lang='zh';render()");assert.match(a.nodes['#app'].innerHTML,/付款成功後，你會收到電郵以啟用學生帳戶/);});

test('student payment joins the class and adds it to My Calendar',()=>{const a=app({},'2026-09-30T00:00:00Z');a.set("lang='en';join={step:3,course:'art',classId:'a',student:'Sample Visitor',phone:'81234567',email:'visitor@example.test'};finish()");assert.equal(a.read('db.student.name'),'Sample Visitor');assert.equal(a.read('mine().length'),1);assert.equal(a.read('mine()[0].paid'),false);a.set("role='student';tab='courses';location.pathname='/account';render()");assert.match(a.nodes['#app'].innerHTML,/Awaiting payment/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/>Joining</);a.set("tab='overview';calendarMonth=new Date(2026,9,1);render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,/class="calendar-event"/);a.click({go:'/payment'});assert.match(a.nodes['#app'].innerHTML,/Simulate successful payment/);a.click({action:'complete-payment'});assert.equal(a.read('location.pathname'),'/payment-success');assert.equal(a.read('mine()[0].paid'),true);assert.equal(a.read('mine()[0].status'),'confirmed');assert.ok(a.read('mine()[0].paidAt'));a.set("tab='courses';location.pathname='/account';render()");assert.match(a.nodes['#app'].innerHTML,/>Joining</);a.set("tab='overview';render()");assert.equal((a.nodes['#app'].innerHTML.match(/class="calendar-event"/g)||[]).length,4);a.set("calendarMonth=new Date(2027,0,1);render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,/class="calendar-event"/);});
test('My classes shows four actual dates only after payment confirmation',()=>{const a=app();a.set("lang='en';role='student';tab='courses';location.pathname='/account';db.bookings.push({id:'B9999',studentId:'demo',student:'Alex Chan',classId:'a',status:'pending',paid:false,submittedAt:'2026-09-30'});render()");let html=a.nodes['#app'].innerHTML;assert.match(html,/Class dates/);assert.match(html,/Shown after payment/);assert.doesNotMatch(html,/datetime="2026-10-05"/);a.set("db.bookings.at(-1).paid=true;db.bookings.at(-1).status='confirmed';db.bookings.at(-1).paidAt='2026-09-30';render()");html=a.nodes['#app'].innerHTML;for(const date of ['2026-10-05','2026-10-12','2026-10-19','2026-10-26'])assert.match(html,new RegExp(`datetime="${date}"`));assert.equal((html.match(/<li><time datetime="2026-10-/g)||[]).length,4);});

test('teacher payment confirmation joins the same sample student account',()=>{const a=app({},'2026-09-30T00:00:00Z');a.set("lang='en';join={step:3,course:'art',classId:'a',student:'Sample Visitor',phone:'81234567',email:'visitor@example.test'};finish()");const id=a.read('mine()[0].id');a.set("role='teacher';tab='new-enrolments';location.pathname='/account';render()");assert.match(a.nodes['#app'].innerHTML,new RegExp(`data-pay="${id}"`));a.click({confirm:id});assert.equal(a.read('mine()[0].status'),'pending');a.set("tab='payments';render()");assert.match(a.nodes['#app'].innerHTML,new RegExp(`data-pay="${id}"`));a.click({pay:id});const paidAt=a.read('mine()[0].paidAt');a.click({pay:id});assert.equal(a.read('mine()[0].paidAt'),paidAt);assert.equal(a.read('mine()[0].paid'),true);assert.equal(a.read('mine()[0].status'),'confirmed');assert.equal(a.read('newEnrolments().length'),0);a.set("role='student';tab='courses';render()");assert.match(a.nodes['#app'].innerHTML,/>Joining</);a.set("tab='overview';calendarMonth=new Date(2026,9,1);render()");assert.equal((a.nodes['#app'].innerHTML.match(/class="calendar-event"/g)||[]).length,4);});

test('a booking grants the configured number of lessons after confirmed payment',()=>{const a=app();assert.deepEqual(a.read("lessonDatesForClass(cl('a'),'2026-09-30T00:00:00Z')"),['2026-10-05','2026-10-12','2026-10-19','2026-10-26']);assert.deepEqual(a.read("lessonDatesForClass(cl('a'),'2026-10-12T02:01:00Z')"),['2026-10-19','2026-10-26','2026-11-02','2026-11-09']);a.set("cl('a').lessonsPerTerm=6");assert.equal(a.read("lessonDatesForClass(cl('a'),'2026-09-30T00:00:00Z').length"),6);a.set("cl('a').weekdays=[1,3]");assert.deepEqual(a.read("lessonDatesForClass(cl('a'),'2026-09-30T00:00:00Z').slice(0,4)"),['2026-09-30','2026-10-05','2026-10-07','2026-10-12']);a.set("lang='en';join={step:1,course:'art',classId:'a'};location.pathname='/join';render()");assert.match(a.nodes['#app'].innerHTML,/6 lessons per term/);});

test('calendar excludes lessons before payment and stops after the fourth lesson',()=>{const a=app();a.set("role='student';tab='overview';location.pathname='/account';calendarMonth=new Date(2026,9,1);db.bookings.push({id:'LATE',studentId:'demo',student:db.student.name,classId:'a',status:'confirmed',paid:true,paidAt:'2026-10-12T02:01:00Z'});render()");let html=a.nodes['#app'].innerHTML;assert.equal((html.match(/class="calendar-event"/g)||[]).length,2);assert.match(html,/aria-label="2026-10-05"><span class="calendar-number" >5<\/span><\/div>/);assert.match(html,/aria-label="2026-10-12"><span class="calendar-number" >12<\/span><\/div>/);a.set("calendarMonth=new Date(2026,10,1);render()");assert.equal((a.nodes['#app'].innerHTML.match(/class="calendar-event"/g)||[]).length,2);a.set("calendarMonth=new Date(2026,11,1);render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,/class="calendar-event"/);});

test('management previews teacher roles without creating accounts or changing permissions',()=>{const a=app();a.set("lang='en';role='teacher';tab='management';location.pathname='/account';render()");let html=a.nodes['#app'].innerHTML;assert.match(html,/data-tab="management" class="active"/);assert.match(html,/Teacher 1/);assert.match(html,/Teacher 2/);assert.match(html,/Add teacher/);const before=a.read('db');a.click({action:'add-teacher'});assert.match(a.nodes['#modal-root'].innerHTML,/id="management-preview"/);assert.match(a.nodes['#modal-root'].innerHTML,/Access level/);assert.match(a.nodes['#modal-root'].innerHTML,/Teacher management/);assert.match(a.nodes['#modal-root'].innerHTML,/Nothing is created or changed here/);a.submit('management-preview',{name:'New Teacher',email:'teacher@example.test',level:'manager',permission:['classes','payments']});assert.match(a.nodes['#management-preview-note'].textContent,/no account or access has been created or changed/);assert.deepEqual(a.read('db'),before);a.click({action:'close'});a.click({previewTeacher:'teacher2'});assert.match(a.nodes['#modal-root'].innerHTML,/Teacher 2/);assert.match(a.nodes['#modal-root'].innerHTML,/Save access/);a.set("role='student';tab='overview';render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-tab="management"/);});

test('sample payment and submission dates share the same day and legacy records are backfilled',()=>{const a=app();assert.ok(a.read('db.bookings.every(b=>b.submittedAt===b.paidAt)'));a.set("lang='en';role='teacher';tab='payments';location.pathname='/account';render()");let html=a.nodes['#app'].innerHTML;assert.match(html,/>Payment date<\/th>/);assert.match(html,/>Submit date<\/th>/);assert.doesNotMatch(html,/Not recorded/);const old=a.read('db');delete old.submittedDateVersion;old.bookings.forEach(b=>delete b.submittedAt);const b=app({'beamal-demo-v1':JSON.stringify(old)});assert.equal(b.read('db.submittedDateVersion'),1);assert.ok(b.read('db.bookings.every(record=>record.submittedAt===record.paidAt)'));assert.ok(b.read("JSON.parse(localStorage.getItem(K)).bookings.every(record=>record.submittedAt===record.paidAt)"));});
test('portfolio uses thirteen distinct Beamal photos across five slides and eight gallery photos',()=>{const a=app();const files=a.read('photos.slice(10).map(p=>p.file)');assert.equal(files.length,13);assert.equal(new Set(files).size,13);for(const file of files)assert.ok(fs.existsSync(new URL('../public/assets/'+file,import.meta.url)),file);a.set("location.pathname='/portfolio';render()");const html=a.nodes['#app'].innerHTML,ids=[...html.matchAll(/data-art="(\d+)"/g)].map(match=>match[1]);assert.equal(ids.length,13);assert.equal(new Set(ids).size,13);assert.equal((html.match(/class="portfolio-slide"/g)||[]).length,5);assert.equal((html.match(/class="portfolio-piece"/g)||[]).length,8);a.click({art:'22'});assert.match(a.nodes['#modal-root'].innerHTML,/portfolio-sewing-charms\.jpg/);});
test('portfolio advances its five-photo coverflow and status every five seconds',()=>{const a=app();a.set("location.pathname='/portfolio';render()");let html=a.nodes['#app'].innerHTML;assert.doesNotMatch(html,/portfolio-status-count|01 \/ 05/);assert.equal((html.match(/class="(?:active)?"/g)||[]).length,5);assert.match(html,/class="portfolio-status-sr">第 1 張作品，共 5 張/);assert.match(html,/data-position="active"/);assert.match(html,/data-position="previous"/);assert.match(html,/data-position="next"/);assert.match(html,/data-position="far-previous"/);assert.match(html,/data-position="far-next"/);a.set(`let fakeSlides=[0,1,2,3,4].map(()=>({dataset:{},inert:false}));let statusNode={textContent:''};let segments=[0,1,2,3,4].map(()=>({classList:{toggle(){}}}));let slider={querySelectorAll(selector){return selector==='.portfolio-slide'?fakeSlides:segments},querySelector(){return statusNode}};document.querySelector=selector=>selector==='.portfolio-slider'?slider:null;window.setTimeout=(fn,delay)=>{window.tick=fn;window.delay=delay;return 1};window.clearTimeout=()=>{};syncPortfolioRotation('/portfolio');window.tick()`);assert.equal(a.read('window.delay'),5000);assert.equal(a.read('portfolioActive'),1);assert.deepEqual(a.read('fakeSlides.map(slide=>slide.dataset.position)'),['previous','active','next','far-next','far-previous']);assert.deepEqual(a.read('fakeSlides.map(slide=>slide.inert)'),[true,false,true,true,true]);assert.equal(a.read('statusNode.textContent'),'第 2 張作品，共 5 張');a.click({action:'portfolio-prev'});assert.equal(a.read('portfolioActive'),0);assert.equal(a.read('statusNode.textContent'),'第 1 張作品，共 5 張');});

test('teacher course boards group slots, sort by course code, and show default artwork in one editor',()=>{
 const a=app();a.set("lang='en';role='teacher';tab='students';location.pathname='/account';render()");
 let html=a.nodes['#app'].innerHTML;
 assert.equal((html.match(/class="panel course-board"/g)||[]).length,3);
 assert.equal((html.match(/data-edit-course=/g)||[]).length,3);
 assert.doesNotMatch(html,/data-edit-class=/);
 assert.ok(html.indexOf('CO-001')<html.indexOf('CO-002')&&html.indexOf('CO-002')<html.indexOf('CO-003'));
 assert.match(html,/<strong>Every Monday<\/strong><p>10:00<\/p><p>Class number: CL-001<\/p><p>Capacity: 8<\/p><p>Occupied: 4<\/p>/);
 assert.match(html,/<strong>Every Tuesday<\/strong><p>14:00<\/p><p>Class number: CL-002<\/p><p>Capacity: 8<\/p><p>Occupied: 8<\/p>/);
 assert.doesNotMatch(html,/Time slot [12] ·/);
 a.click({editCourse:'art'});
 let editor=a.nodes['#modal-root'].innerHTML;
 assert.match(editor,/id="course-editor"/);
 assert.match(editor,/name="courseName" value="Course 1"/);
 assert.match(editor,/name="courseCode" value="CO-001"/);
 assert.match(editor,/course-art-crop/);
 assert.match(editor,/<details class="course-slot-editor" data-slot-id="a" open>/);
 assert.match(editor,/<details class="course-slot-editor" data-slot-id="b" >/);
 assert.match(editor,/name="lessonsPerTerm\.a"[^>]*value="4"/);
 assert.doesNotMatch(editor,/name="startDate\.a"|name="endDate\.a"/);
 assert.equal((editor.match(/name="classCode\./g)||[]).length,2);
 a.set("db.courseCodes.art='CO-010';render()");html=a.nodes['#app'].innerHTML;
 assert.ok(html.indexOf('CO-002')<html.indexOf('CO-003')&&html.indexOf('CO-003')<html.indexOf('CO-010'));
});

test('one course edit updates both slots and shared photo while rejecting duplicate codes',()=>{
 const a=app();a.set("lang='en';role='teacher';tab='students';location.pathname='/account';render()");a.click({editCourse:'art'});
 const values={courseName:'Colour Studio',courseCode:'CO-010','classCode.a':'CL-001','weekdays.a':['1'],'time.a':'10:00','capacity.a':'8','lessonsPerTerm.a':'4','classCode.b':'CL-002','weekdays.b':['2'],'time.b':'14:00','capacity.b':'8','lessonsPerTerm.b':'4'};
 a.submit('course-editor',{...values,courseCode:'co-002'},{dataset:{course:'art'}});
 assert.match(a.nodes['#course-error'].textContent,/already in use/);
 assert.equal(a.read('db.courseCodes.art'),'CO-001');
 a.submit('course-editor',{...values,'classCode.b':'cl-001'},{dataset:{course:'art'}});
 assert.match(a.nodes['#course-error'].textContent,/Class code is already in use/);
 assert.equal(a.read('db.classes[1].classCode===undefined'),true);
 a.set("classDraftImage='data:image/png;base64,dGVzdA=='");a.submit('course-editor',values,{dataset:{course:'art'}});
 assert.equal(a.read('db.courseCodes.art'),'CO-010');
 assert.deepEqual(a.read("db.classes.filter(c=>c.course==='art').map(c=>[c.courseName,c.image])"),[['Colour Studio','data:image/png;base64,dGVzdA=='],['Colour Studio','data:image/png;base64,dGVzdA==']]);
 a.set("role='';location.pathname='/classes';render()");assert.match(a.nodes['#app'].innerHTML,/Colour Studio/);assert.match(a.nodes['#app'].innerHTML,/data:image\/png;base64,dGVzdA==/);
});

test('existing bookings keep their purchased lesson count when a teacher changes a class term',()=>{
 const a=app();assert.equal(a.read('db.bookings[0].lessonCount'),4);
 a.set("cl('a').lessonsPerTerm=6");
 assert.equal(a.read('bookingLessonDates(db.bookings[0]).length'),4);
 a.set("db.bookings.push({id:'NEW',student:'Alex Chan',studentId:'demo',classId:'a',status:'confirmed',paid:true,paidAt:'2026-09-30',lessonCount:6})");
 assert.equal(a.read('bookingLessonDates(db.bookings.at(-1)).length'),6);
});

test('older saved classes migrate from date limits to lesson counts without losing bookings',()=>{
 const seed=app().read('initial()');delete seed.lessonTermVersion;
 for(const c of seed.classes){delete c.lessonsPerTerm;c.startDate='2026-10-05';c.endDate='2026-12-31'}
 for(const b of seed.bookings)delete b.lessonCount;
 const a=app({'beamal-demo-v1':JSON.stringify(seed)});
 assert.equal(a.read('db.classes.every(c=>c.lessonsPerTerm===4&&!Object.hasOwn(c,"startDate")&&!Object.hasOwn(c,"endDate"))'),true);
 assert.equal(a.read('db.bookings.every(b=>b.lessonCount===4)'),true);
 assert.equal(a.read('db.bookings.length'),4);
});

test('teacher and student logins open role-appropriate pages with the unchanged yellow notice',()=>{
 for(const username of ['1','2']){const a=app();a.set("lang='en'");a.submit('login',{username,password:''});const html=a.nodes['#app'].innerHTML;assert.match(html,/class="portal-topbar"/);assert.match(html,/beamal-logo.jpg/);assert.match(html,/beamal-login_icon.png/);assert.match(html,/portal-environment/);assert.doesNotMatch(html,/INTERNAL SAMPLE — FOR REVIEW ONLY/);assert.match(html,/banner-reset/);const nav=html.match(/<nav id="portal-sidebar"[\s\S]*?<\/nav>/)[0];
  if(username==='2'){assert.equal(a.read('tab'),'catalog');assert.match(nav,/data-tab="catalog" class="active"/);assert.ok(nav.indexOf('Sales')<nav.indexOf('Timetable'));for(const label of ['Courses','Fees','Products','Messages','Students','Leads','Accounting','Reports','Staffs','Channels','Settings'])assert.ok(nav.includes(label));assert.equal((html.match(/<th(?:\s[^>]*)?>/g)||[]).filter(tag=>!tag.includes('portal-select-cell')).length,8,'Count the seven course data columns and row actions separately from the selection checkbox')}
  else{assert.equal(a.read('tab'),'overview');assert.match(nav,/data-tab="overview" class="active"/);assert.deepEqual(a.read('portalItems().map(item=>item[0])'),['overview','courses','payments']);assert.match(html,/My Calendar/);assert.doesNotMatch(nav,/Sales|Products|Messages|Students|Leads|Accounting|Reports|Staffs|Channels|Settings/);assert.doesNotMatch(html,/Meeting link|Follows term|Online Store/)}
  assert.doesNotMatch(html,/Help &amp; Support|Switch branch|Guided Setup|Days left in trial|footer-social/);
 }
});
test('course workspace searches saved names and opens existing course and class editors',()=>{
 const a=app();a.set("lang='en';role='teacher';tab='catalog';location.pathname='/account';render()");let html=a.nodes['#app'].innerHTML;assert.equal((html.match(/data-open-course=/g)||[]).length,3);assert.match(html,/HK\$1,200/);a.submit('portal-course-search',{search:'Course 2'});html=a.nodes['#app'].innerHTML;assert.equal((html.match(/data-open-course=/g)||[]).length,1);assert.match(html,/data-open-course="story"/);a.click({openCourse:'story'});assert.equal(a.read('location.pathname'),'/account/courses/story');assert.match(a.nodes['#app'].innerHTML,/course-detail-layout/);a.click({editCourse:'story'});assert.match(a.nodes['#modal-root'].innerHTML,/id="course-editor"/);a.click({action:'close'});a.click({tab:'catalog'});a.submit('portal-course-search',{search:'missing'});assert.match(a.nodes['#app'].innerHTML,/No matching courses/);a.click({action:'new-class'});assert.match(a.nodes['#modal-root'].innerHTML,/id="class-editor"/);
});
test('student navigation keeps only personal classes, calendar and payment information in both languages',()=>{
 const a=app();a.set("lang='en';role='student';tab='courses';location.pathname='/account';render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,/Course 1|David Leung|data-edit-course|data-action="new-class"/);
 a.set("db.bookings.push({id:'OWN',studentId:'demo',student:db.student.name,classId:'a',amount:1000,paid:false,status:'pending'});render()");let html=a.nodes['#app'].innerHTML;assert.match(html,/Course 1/);assert.match(html,/Awaiting payment/);assert.match(html,/Class dates/);assert.doesNotMatch(html,/Course 2|Course 3|Category|Level|Meeting link|Follows term|Online Store/);
 const before=a.read('db');for(const tab of ['products','sales','new-enrolments','students','student-list','management','settings','news','accounting','reports']){a.click({tab});assert.equal(a.read('tab'),'courses');assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-edit-course|Teacher 1|David Leung/)}assert.deepEqual(a.read('db'),before);
 a.click({tab:'payments'});html=a.nodes['#app'].innerHTML;assert.match(html,/Profile/);assert.match(html,/alex@example.test/);assert.doesNotMatch(html,/david@example.test|ryan@example.test/);
 a.click({action:'language'});html=a.nodes['#app'].innerHTML;assert.match(html,/我的時間表|我的課程|付款及個人資料/);assert.doesNotMatch(html,/銷售|學生管理|會計|報告|員工|潛在客戶/);
 a.click({action:'portal-menu'});assert.equal(a.nodes['.portal-shell'].classList.contains('is-menu-open'),true);a.click({tab:'overview'});assert.equal(a.read('portalMenu'),true);assert.match(a.nodes['#app'].innerHTML,/My Calendar/);
});
test('desktop sidebar stays collapsed through navigation until manually reopened',()=>{
 for(const role of ['teacher','student']){
  const a=app();a.set(`role='${role}';location.pathname='/account';render()`);
  a.click({action:'portal-menu'});
  for(const tab of a.read('portalItems().map(([id])=>id)')){
   a.click({tab});
   assert.equal(a.read('tab'),tab);
   assert.equal(a.read('portalMenu'),true);
   assert.equal(a.nodes['.portal-shell'].classList.contains('is-menu-open'),true);
   assert.equal(a.nodes['[data-action="portal-menu"]'].getAttribute('aria-expanded'),'false');
  }
  a.click({action:'portal-menu'});a.click({tab:'overview'});
  assert.equal(a.read('portalMenu'),false);
  assert.equal(a.nodes['[data-action="portal-menu"]'].getAttribute('aria-expanded'),'true');
 }
});
test('mobile sidebar closes after selecting a page so it does not cover the content',()=>{
 for(const role of ['teacher','student']){
  const a=app({},undefined,true);a.set(`role='${role}';location.pathname='/account';render()`);
  for(const tab of a.read('portalItems().map(([id])=>id)')){
   a.click({action:'portal-menu'});assert.equal(a.nodes['#portal-sidebar'].inert,false);
   a.click({tab});
   assert.equal(a.read('tab'),tab);
   assert.equal(a.read('portalMenu'),false);
   assert.equal(a.nodes['.portal-shell'].classList.contains('is-menu-open'),false);
   assert.equal(a.nodes['[data-action="portal-menu"]'].getAttribute('aria-expanded'),'false');
   assert.equal(a.nodes['#portal-sidebar'].inert,true);
  }
 }
});
for(const accountRole of ['admin','teacher'])test(`shared ${accountRole} mobile Fees navigation closes the sidebar and keeps subsequent navigation consistent`,async()=>{
 const user={...sharedTestUser,role:accountRole},a=await sharedApp({session:async()=>({user})});
 a.set('portalViewport.matches=true;syncPortalMenu()');
 await a.click({action:'portal-menu'});assert.equal(a.read('role'),'teacher');assert.equal(a.read('authUser.role'),accountRole);assert.equal(a.nodes['#portal-sidebar'].inert,false);
 await a.click({tab:'fees'});
 assert.equal(a.read('location.pathname'),'/account/fees');assert.equal(a.read('tab'),'fees');
 assert.equal(a.read('portalMenu'),false,'Fees navigation must close the mobile sidebar');assert.equal(a.nodes['[data-action="portal-menu"]'].getAttribute('aria-expanded'),'false');assert.equal(a.nodes['#portal-sidebar'].inert,true);
 await a.click({action:'portal-menu'});await a.click({tab:'catalog'});
 assert.equal(a.read('location.pathname'),'/account');assert.equal(a.read('tab'),'catalog');assert.equal(a.read('portalMenu'),false);assert.equal(a.nodes['[data-action="portal-menu"]'].getAttribute('aria-expanded'),'false');assert.equal(a.nodes['#portal-sidebar'].inert,true);
});
test('shared desktop Fees navigation preserves the manually selected sidebar state',async()=>{
 for(const accountRole of ['admin','teacher']){
  const user={...sharedTestUser,role:accountRole},a=await sharedApp({session:async()=>({user})});
  for(const collapsed of [false,true]){
   a.set(`portalMenu=${collapsed};tab='catalog';location.pathname='/account';render()`);await a.click({tab:'fees'});
   assert.equal(a.read('location.pathname'),'/account/fees');assert.equal(a.read('portalMenu'),collapsed);assert.equal(a.nodes['[data-action="portal-menu"]'].getAttribute('aria-expanded'),String(!collapsed));assert.equal(a.nodes['#portal-sidebar'].inert,false);
   await a.click({tab:'catalog'});assert.equal(a.read('location.pathname'),'/account');assert.equal(a.read('portalMenu'),collapsed);
  }
 }
});
test('a shared student selecting an unauthorized Fees page keeps the current mobile page and open sidebar',async()=>{
 const user={...sharedTestUser,role:'student'},a=await sharedApp({session:async()=>({user})});
 a.set("portalViewport.matches=true;tab='courses';location.pathname='/account';render()");await a.click({action:'portal-menu'});const html=a.nodes['#app'].innerHTML;
 await a.click({tab:'fees'});
 assert.equal(a.read('location.pathname'),'/account');assert.equal(a.read('tab'),'courses');assert.equal(a.read('portalMenu'),true);assert.equal(a.nodes['[data-action="portal-menu"]'].getAttribute('aria-expanded'),'true');assert.equal(a.nodes['#portal-sidebar'].inert,false);assert.equal(a.nodes['#app'].innerHTML,html);
});
test('sidebar toggles preserve the page, unfinished input, and focus without rerendering',()=>{
 for(const role of ['teacher','student'])for(const mobile of [false,true]){
  const a=app({},undefined,mobile);a.set(`role='${role}';location.pathname='/account';render()`);
  const html=a.nodes['#app'].innerHTML,content=a.nodes['.portal-shell'];
  a.nodes['[data-action="portal-menu"]'].focused=true;
  const input=a.nodes['#app'].draft={value:'Unsubmitted search'};
  for(const expanded of [true,false,true,false]){
   a.click({action:'portal-menu'});
   assert.equal(a.nodes['#app'].innerHTML,html,'opening or closing the sidebar must not replace the page');
   assert.equal(a.nodes['.portal-shell'],content);
   assert.equal(a.nodes['#app'].draft,input);assert.equal(input.value,'Unsubmitted search');
   assert.equal(a.nodes['[data-action="portal-menu"]'].focused,true);
   assert.equal(content.classList.contains('is-menu-open'),expanded);
   assert.equal(a.nodes['[data-action="portal-menu"]'].getAttribute('aria-expanded'),String(mobile?expanded:!expanded));
   assert.equal(a.nodes['#portal-sidebar'].inert,mobile&&!expanded);
  }
 }
});
test('sidebar accessibility follows desktop and mobile breakpoints without replacing the page',()=>{
 const a=app();a.set("role='teacher';location.pathname='/account';render()");const html=a.nodes['#app'].innerHTML;
 a.set('portalViewport.matches=true;syncPortalMenu()');assert.equal(a.nodes['#portal-sidebar'].inert,true);assert.equal(a.nodes['[data-action="portal-menu"]'].getAttribute('aria-expanded'),'false');
 a.click({action:'portal-menu'});assert.equal(a.nodes['#portal-sidebar'].inert,false);
 a.set('portalViewport.matches=false;syncPortalMenu()');assert.equal(a.nodes['#portal-sidebar'].inert,false);assert.equal(a.nodes['[data-action="portal-menu"]'].getAttribute('aria-expanded'),'false');assert.equal(a.nodes['#app'].innerHTML,html);
});

test('teacher timetable renders the reference layout and recurring class start times',()=>{const a=app({},'2026-10-08T12:00:00');a.set("lang='en';role='teacher';tab='overview';location.pathname='/account';selectTimetableDate('2026-10-08');render()");const html=a.nodes['#app'].innerHTML;for(const cls of ['teacher-timetable','tt-toolbar','tt-mini-calendar','tt-resource-tabs','tt-grid-scroll','tt-grid-heading','tt-time-axis'])assert.match(html,new RegExp(`class="${cls}`));assert.match(html,/id="tt-date"[^>]*value="2026-10-08"/);assert.match(html,/Thu, Oct 8/);assert.match(html,/09:00<\/div><div[^>]*>09:15<\/div><div[^>]*>09:30/);assert.equal((html.match(/data-open-lesson=/g)||[]).length,6);assert.match(html,/top:calc\(4 \* var\(--tt-row-height\)\);height:calc\(3 \* var\(--tt-row-height\) - 2px\)" data-open-lesson="a"/);assert.match(html,/No Room Assigned/);assert.doesNotMatch(html,/Days left in trial|Guided Setup|Help &amp; Support|Switch branch|teacher-today/);a.click({openLesson:'a',lessonKind:'class',lessonDate:'2026-10-05'});assert.equal(a.read('location.pathname'),'/account');assert.match(a.nodes['#modal-root'].innerHTML,/lesson-dialog/);});
test('timetable date and week/day controls handle month and year boundaries',()=>{const a=app();a.set("role='teacher';tab='overview';location.pathname='/account';selectTimetableDate('2027-01-01');render()");assert.deepEqual(a.read('timetableDays().map(timetableDateKey)'),['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);a.click({action:'tt-next'});assert.equal(a.read('timetableDate'),'2027-01-08');a.click({action:'tt-prev'});assert.equal(a.read('timetableDate'),'2027-01-01');a.change('','day',{id:'tt-view'});assert.deepEqual(a.read('timetableDays().map(timetableDateKey)'),['2027-01-01']);a.click({action:'tt-prev'});assert.equal(a.read('timetableDate'),'2026-12-31');a.click({action:'tt-month-next'});assert.equal(a.read('timetableDate'),'2026-12-31');assert.equal(a.read('timetableMonth.getMonth()'),0);a.click({ttDate:'2027-01-15'});assert.equal(a.read('timetableDate'),'2027-01-15');a.change('','2027-02-30',{id:'tt-date'});assert.equal(a.read('timetableDate'),'2027-01-15');a.change('','2028-02-29',{id:'tt-date'});assert.equal(a.read('timetableDate'),'2028-02-29');a.change('','invalid',{id:'tt-view'});assert.equal(a.read('timetableView'),'day');});
test('timetable search supports names, case-insensitive class codes and multi-day classes',()=>{const a=app();a.set("lang='en';role='teacher';tab='overview';location.pathname='/account';selectTimetableDate('2026-10-08');db.classes[0].weekdays=[1,3];db.classes[0].courseName='繪畫 Atelier';db.classes[0].classCode='PAINT-01';render()");assert.equal((a.nodes['#app'].innerHTML.match(/data-open-lesson="a"/g)||[]).length,2);a.submit('timetable-search',{search:'paint-01'});assert.equal((a.nodes['#app'].innerHTML.match(/data-open-lesson=/g)||[]).length,2);a.change('',true,{id:'tt-hide-empty',checked:true});assert.match(a.nodes['#app'].innerHTML,/--tt-days:2/);a.submit('timetable-search',{search:'繪畫'});assert.match(a.nodes['#app'].innerHTML,/data-open-lesson="a"/);a.submit('timetable-search',{search:'16:00'});assert.match(a.nodes['#app'].innerHTML,/data-open-lesson="d"/);assert.match(a.nodes['#app'].innerHTML,/--tt-days:1/);a.submit('timetable-search',{search:'no such lesson'});assert.match(a.nodes['#app'].innerHTML,/No lessons match your search/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-open-lesson=/);a.click({action:'new-class'});assert.match(a.nodes['#modal-root'].innerHTML,/id="class-editor"/);});
test('timetable resource controls use actual assignments and keep independent selections',()=>{const a=app();a.set("lang='en';role='teacher';tab='overview';location.pathname='/account';selectTimetableDate('2026-10-08');db.classes[0].room='Room A';db.classes[0].teacher='Eileen';render()");a.change('tt-resource','Room A',{checked:true});assert.deepEqual(a.read('timetableSelections.rooms'),['Room A']);assert.equal((a.nodes['#app'].innerHTML.match(/data-open-lesson=/g)||[]).length,1);a.click({ttResourceTab:'teachers'});assert.match(a.nodes['#app'].innerHTML,/No Teacher Assigned/);assert.match(a.nodes['#app'].innerHTML,/Eileen/);a.change('tt-resource','unassigned',{checked:true});assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-open-lesson=/);a.change('tt-resource','unassigned',{checked:false});a.change('tt-resource','Eileen',{checked:true});assert.deepEqual(a.read('timetableSelections.teachers'),['Eileen']);a.submit('timetable-resource-search',{search:'eileen'});assert.doesNotMatch(a.nodes['#app'].innerHTML,/value="unassigned"/);a.click({ttResourceTab:'rooms'});assert.match(a.nodes['#app'].innerHTML,/value="Room A" checked/);a.change('',true,{id:'tt-all-resources',checked:true});assert.deepEqual(a.read('timetableSelections.rooms'),['Room A','unassigned']);a.change('',false,{id:'tt-all-resources',checked:false});assert.deepEqual(a.read('timetableSelections.rooms'),[]);a.click({action:'tt-filters'});assert.match(a.nodes['#app'].innerHTML,/tt-workspace filters-hidden/);a.click({action:'tt-filters'});assert.equal(a.read('timetableFiltersVisible'),true);a.click({action:'tt-month-toggle'});assert.doesNotMatch(a.nodes['#app'].innerHTML,/class="tt-mini-grid"/);});
test('timetable ends at the 19:45 row while retaining early classes and stored late times',()=>{const a=app();a.set("role='teacher';selectTimetableDate('2026-10-08');db.classes[0].time='07:15';db.classes[1].time='23:45'");assert.deepEqual(a.read('timetableRange(timetableDays())'),{start:420,end:1200});a.set("tab='overview';location.pathname='/account';render()");assert.match(a.nodes['#app'].innerHTML,/>07:00<\/div>/);assert.match(a.nodes['#app'].innerHTML,/>19:45<\/div>/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/>20:00<\/div>|>23:45<\/div>|data-open-lesson="b"/);assert.equal(a.read('db.classes[1].time'),'23:45');assert.doesNotMatch(a.nodes['#app'].innerHTML,/07:15\s*[–-]\s*\d/);});
test('students retain their personal calendar and cannot change teacher timetable controls',()=>{const a=app();a.set("lang='en';role='student';tab='overview';location.pathname='/account';render()");const before=a.nodes['#app'].innerHTML,date=a.read('timetableDate');assert.doesNotMatch(before,/class="teacher-timetable"|No Room Assigned|data-tab="new-enrolments"/);a.click({action:'tt-next'});a.click({ttDate:'2027-02-01'});a.click({ttResourceTab:'teachers'});a.change('','day',{id:'tt-view'});a.submit('timetable-search',{search:'secret'});assert.equal(a.read('timetableDate'),date);assert.equal(a.read('timetableView'),'week');assert.equal(a.read('timetableResource'),'rooms');assert.equal(a.read('timetableSearch'),'');assert.equal(a.nodes['#app'].innerHTML,before);});

function scheduleValues(overrides={}){return {course:'art',color:'#27777b',startDate:'2026-10-08',endMode:'forever',endDate:'',count:'1',time:'09:30',duration:'60',teacher:'',room:'',capacity:'',session:'1',remark:'',detail:'',moreInfo:'',...overrides}}
function scheduleApp(){const a=app({},'2026-10-08T12:00:00');a.set("lang='en';role='teacher';tab='overview';location.pathname='/account';selectTimetableDate('2026-10-08');render()");a.click({action:'tt-add-schedule'});return a}
test('Add schedule opens the requested fields instead of the class editor in both languages',()=>{const a=scheduleApp();let html=a.nodes['#modal-root'].innerHTML;for(const text of ['Add schedule','Course overview','Schedule','Start date','Repeat Forever','Start time','Duration (min)','Additional information (optional)','Teacher','Room','Capacity','Session','Remark','Detail','More info (shown in student app)'])assert.ok(html.includes(text),text);assert.match(html,/name="course" required/);assert.match(html,/type="color" name="color" value="#27777b"/);assert.match(html,/id="schedule-duration" name="duration" required disabled/);assert.doesNotMatch(html,/Class code|id="class-editor"|Class photo|Room 1/);a.click({action:'close'});assert.equal(a.read('scheduleDraft'),null);a.set("lang='zh'");a.click({action:'tt-add-schedule'});html=a.nodes['#modal-root'].innerHTML;for(const text of ['課程概覽','一直重複','時長（分鐘）','附加資料（可選）','更多資訊（學生可見）'])assert.ok(html.includes(text),text);});
test('start time unlocks durations and preview follows the selected date and repeat weekdays',()=>{const a=scheduleApp();a.input({name:'time',value:'23:45',closest:()=>({})});assert.equal(a.nodes['#schedule-duration'].disabled,false);assert.match(a.nodes['#schedule-duration'].innerHTML,/value="15"/);assert.doesNotMatch(a.nodes['#schedule-duration'].innerHTML,/value="30"/);a.input({name:'duration',value:'15',closest:()=>({})});a.input({name:'time',value:'23:00',closest:()=>({})});a.input({name:'duration',value:'60',closest:()=>({})});a.input({name:'time',value:'23:45',closest:()=>({})});assert.equal(a.read('scheduleDraft.duration'),'');a.input({name:'startDate',value:'2026-10-09',closest:()=>({})});assert.deepEqual(a.read('scheduleDraft.weekdays'),[5]);a.click({action:'tt-schedule-preview'});assert.match(a.nodes['#schedule-preview-content'].innerHTML,/2026-10-09/);a.click({action:'schedule-end-open'});a.change('endWeekday','1',{checked:true});a.change('endMode','count');a.change('count','2');a.submit('schedule-end-editor',{endMode:'count',count:'2',mustAttendAll:'yes'});assert.deepEqual(a.read('scheduleDraft.weekdays'),[1,5]);assert.match(a.nodes['#schedule-preview-content'].innerHTML,/2026-10-12/);assert.deepEqual(a.read('schedulePreviewDates(scheduleDraft)'),['2026-10-09','2026-10-12']);});
test('schedule save persists all supplied information and duration without changing existing enrolments',()=>{const a=scheduleApp(),classes=a.read('db.classes'),bookings=a.read('db.bookings');a.submit('schedule-editor',scheduleValues({teacher:'Teacher 1',capacity:'9',session:'2',remark:'Internal note',detail:'Bring paint',moreInfo:'Wear an apron'}),{dataset:{id:''}});const saved=a.read('db.schedules[0]');assert.equal(saved.teacher,'Teacher 1');assert.equal(saved.room,'');assert.equal(saved.capacity,9);assert.equal(saved.session,2);assert.equal(saved.duration,60);assert.equal(saved.remark,'Internal note');assert.equal(saved.detail,'Bring paint');assert.equal(saved.moreInfo,'Wear an apron');assert.deepEqual(a.read('db.classes'),classes);assert.deepEqual(a.read('db.bookings'),bookings);assert.equal(a.read('modal'),'');assert.match(a.nodes['#app'].innerHTML,new RegExp(`data-open-lesson="${saved.id}"`));assert.match(a.nodes['#app'].innerHTML,/height:calc\(4 \* var\(--tt-row-height\) - 2px\)/);assert.match(a.nodes['#app'].innerHTML,/09:30 – 10:30/);const reloaded=app({'beamal-demo-v1':a.read('localStorage.getItem(K)')});assert.deepEqual(reloaded.read('db.schedules[0]'),saved);a.click({editSchedule:saved.id});assert.match(a.nodes['#modal-root'].innerHTML,/Edit Course 1/);assert.match(a.nodes['#modal-root'].innerHTML,/Internal note/);const next=a.read('db.next');a.submit('schedule-editor',scheduleValues({time:'11:00',duration:'30',moreInfo:'New info'}),{dataset:{id:saved.id}});assert.equal(a.read('db.schedules.length'),1);assert.equal(a.read('db.schedules[0].id'),saved.id);assert.equal(a.read('db.next'),next);assert.equal(a.read('db.schedules[0].time'),'11:00');});
test('weekly schedules obey start/end boundaries, counted occurrences and multi-day recurrence',()=>{const a=scheduleApp();a.set("scheduleDraft.weekdays=[1,3];scheduleDraft.customWeekdays=true");a.submit('schedule-editor',scheduleValues({endMode:'count',count:'3'}),{dataset:{id:''}});assert.deepEqual(a.read('schedulePreviewDates(db.schedules[0],8)'),['2026-10-12','2026-10-14','2026-10-19']);assert.equal(a.read("scheduleOccurs(db.schedules[0],'2026-10-07')"),false);assert.equal(a.read("scheduleOccurs(db.schedules[0],'2026-10-21')"),false);a.click({action:'tt-add-schedule'});a.submit('schedule-editor',scheduleValues({startDate:'2026-12-31',endMode:'date',endDate:'2027-01-07'}),{dataset:{id:''}});assert.deepEqual(a.read('schedulePreviewDates(db.schedules[1])'),['2026-12-31','2027-01-07']);assert.equal(a.read("scheduleOccurs(db.schedules[1],'2027-01-14')"),false);a.set("selectTimetableDate('2027-01-14');render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,new RegExp(`data-edit-schedule="${a.read('db.schedules[1].id')}"`));});
test('invalid schedules stay in the form and never write partial data',()=>{const invalid=[{course:'not-a-course'},{startDate:'2026-02-30'},{time:'24:00'},{time:'09:31'},{duration:'0'},{duration:'17'},{time:'23:45',duration:'30'},{endMode:'date',endDate:'2026-10-07'},{endMode:'count',count:'0'},{endMode:'count',count:'1.5'},{color:'red;position:fixed'},{teacher:'Unknown teacher'},{room:'Fake Room'},{capacity:'0'},{capacity:'1.5'},{session:'0'},{remark:'x'.repeat(2001)}];for(const values of invalid){const a=scheduleApp(),next=a.read('db.next');a.submit('schedule-editor',scheduleValues(values),{dataset:{id:''}});assert.equal(a.read('db.schedules.length'),0,JSON.stringify(values).slice(0,100));assert.equal(a.read('db.next'),next);assert.ok(a.nodes['#schedule-error'].textContent);assert.match(a.nodes['#modal-root'].innerHTML,/id="schedule-editor"/)}const a=scheduleApp();a.set('scheduleDraft.weekdays=[];scheduleDraft.customWeekdays=true');a.submit('schedule-editor',scheduleValues(),{dataset:{id:''}});assert.equal(a.read('db.schedules.length'),0);});
test('empty optional schedule fields stay empty and cancel does not save',()=>{const a=scheduleApp();a.submit('schedule-editor',scheduleValues({session:''}),{dataset:{id:''}});assert.equal(a.read('db.schedules[0].capacity'),null);assert.equal(a.read('db.schedules[0].session'),1);assert.equal(a.read('db.schedules[0].room'),'');a.click({action:'tt-add-schedule'});a.input({name:'remark',value:'Unsaved',closest:()=>({})});a.click({action:'close'});a.submit('schedule-editor',scheduleValues(),{dataset:{id:''}});assert.equal(a.read('db.schedules.length'),1);});
test('overlapping schedules and existing class markers remain individually selectable',()=>{const a=scheduleApp();a.submit('schedule-editor',scheduleValues({startDate:'2026-10-05',time:'09:30',duration:'60'}),{dataset:{id:''}});const layout=a.read("timetableDayLayout(timetableDateObject('2026-10-05'))");assert.equal(layout.length,2);assert.equal(layout[0].lanes,2);assert.notEqual(layout[0].lane,layout[1].lane);a.click({editSchedule:a.read('db.schedules[0].id')});assert.match(a.nodes['#modal-root'].innerHTML,/Edit Course 1/);});
test('only enrolled students see applicable student information, never internal notes',()=>{const a=scheduleApp();a.submit('schedule-editor',scheduleValues({startDate:'2026-10-05',time:'10:00',moreInfo:'Student <info>',remark:'Secret remark',detail:'Secret detail'}),{dataset:{id:''}});a.set("db.bookings=[{id:'ST1',student:db.student.name,classId:'a',paid:true,status:'confirmed',paidAt:'2026-10-04',lessonCount:4}];role='student';tab='courses';render()");let html=a.nodes['#app'].innerHTML;assert.match(html,/Student &lt;info&gt;/);assert.doesNotMatch(html,/Secret remark|Secret detail|data-edit-schedule=/);a.click({action:'tt-add-schedule'});a.click({editSchedule:a.read('db.schedules[0].id')});assert.equal(a.read('scheduleDraft'),null);a.set("db.bookings[0].paid=false;render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,/Student &lt;info&gt;/);});
test('reset removes schedules and returns to a usable timetable without stale drafts',()=>{const a=scheduleApp();a.submit('schedule-editor',scheduleValues(),{dataset:{id:''}});a.click({action:'tt-add-schedule'});a.click({action:'reset'});assert.deepEqual(a.read('db.schedules'),[]);assert.equal(a.read('scheduleDraft'),null);a.submit('login',{username:'2',password:''});a.click({tab:'overview'});assert.match(a.nodes['#app'].innerHTML,/class="teacher-timetable"/);a.click({action:'tt-add-schedule'});assert.match(a.nodes['#modal-root'].innerHTML,/id="schedule-editor"/);});
test('week and day timetable views include 19:45 but never add later rows for long schedules',()=>{const a=scheduleApp();a.submit('schedule-editor',scheduleValues({time:'19:45',duration:'120'}),{dataset:{id:''}});const saved=a.read('db.schedules[0]');for(const view of ['week','day']){a.change('',view,{id:'tt-view'});const html=a.nodes['#app'].innerHTML;assert.match(html,/>19:45<\/div>/);assert.doesNotMatch(html,/>20:00<\/div>|>20:15<\/div>|>21:00<\/div>/);assert.match(html,new RegExp(`data-open-lesson="${saved.id}"`));assert.equal(a.read('timetableRange(timetableDays()).end'),1200)}assert.equal(a.read('db.schedules[0].duration'),120);assert.equal(a.read('db.schedules[0].time'),'19:45');});


test('course detail shows only matching monthly schedules, real fees and blank unsupported fields',()=>{
 const a=app({},'2026-10-08T12:00:00');a.set("role='teacher';lang='en';tab='catalog';location.pathname='/account';render()");a.click({action:'portal-menu'});a.click({openCourse:'art'});
 let html=a.nodes['#app'].innerHTML;assert.equal(a.read('location.pathname'),'/account/courses/art');assert.equal(a.read('portalMenu'),true);assert.doesNotMatch(a.nodes['#app'].innerHTML,/role="dialog"/);
 for(const text of ['General','Materials','Schedule','Fees','Settings','Display in Online Store','Add video conferencing link','HK$1,000','4 lessons per term'])assert.ok(html.includes(text),text);
 assert.match(html,/2026-10-05/);assert.match(html,/2026-10-26/);assert.match(html,/data-edit-activity="a"/);assert.match(html,/data-edit-activity="b"/);assert.doesNotMatch(html,/data-edit-activity="c"|100 \/ hr|10:45/);
 a.click({action:'course-month-next'});assert.match(a.nodes['#app'].innerHTML,/2026-11-02/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/2026-10-26/);
 a.change('','2027-01',{id:'course-detail-month'});a.click({action:'course-month-prev'});assert.equal(a.read('courseDetailMonth.getFullYear()'),2026);assert.equal(a.read('courseDetailMonth.getMonth()'),11);
 a.change('','invalid',{id:'course-detail-month'});assert.equal(a.read('courseDetailMonth.getMonth()'),11);
 a.click({courseDetailTab:'materials'});assert.match(a.nodes['#app'].innerHTML,/class="course-materials-empty"/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/course-schedule-scroll/);
 a.click({action:'language'});assert.match(a.nodes['#app'].innerHTML,/教材/);a.click({courseDetailTab:'general'});assert.match(a.nodes['#app'].innerHTML,/時間安排/);
 a.click({tab:'payments'});assert.equal(a.read('location.pathname'),'/account');assert.equal(a.read('portalMenu'),true);
});
test('course detail Add and Edit schedules stay connected to the timetable without altering bookings',()=>{
 const a=app({},'2026-10-08T12:00:00');a.set("role='teacher';lang='en';tab='catalog';location.pathname='/account';render()");a.click({openCourse:'story'});const bookings=a.read('db.bookings'),classes=a.read('db.classes');
 a.click({action:'course-add-schedule'});assert.equal(a.read('scheduleDraft.course'),'story');assert.equal(a.read('scheduleDraft.startDate'),'2026-10-08');assert.match(a.nodes['#modal-root'].innerHTML,/value="story" selected/);
 a.submit('schedule-editor',scheduleValues({course:'story',time:'10:00',duration:'45',endMode:'count',count:'4'}),{dataset:{id:''}});const id=a.read('db.schedules[0].id');
 assert.equal(a.read('location.pathname'),'/account/courses/story');let html=a.nodes['#app'].innerHTML;assert.match(html,/10:00–10:45/);assert.match(html,/2026-10-29/);assert.match(html,new RegExp(`data-edit-activity="${id}"`));assert.deepEqual(a.read('db.bookings'),bookings);assert.deepEqual(a.read('db.classes'),classes);
 a.click({editSchedule:id});a.submit('schedule-editor',scheduleValues({course:'story',time:'10:00',duration:'60',endMode:'count',count:'4'}),{dataset:{id}});assert.match(a.nodes['#app'].innerHTML,/10:00–11:00/);assert.equal(a.read('db.schedules.length'),1);
 a.change('','timetable',{id:'course-detail-view'});assert.equal(a.read('location.pathname'),'/account');assert.equal(a.read('tab'),'overview');assert.equal(a.read('timetableSearch'),'');assert.match(a.nodes['#app'].innerHTML,/Course: Course 2/);assert.match(a.nodes['#app'].innerHTML,new RegExp(`data-open-lesson="${id}"`));
});
test('course detail supports direct links and rejects student access or unknown courses',()=>{
 const a=app();a.set("role='teacher';lang='en';location.pathname='/account/courses/art';render()");assert.match(a.nodes['#app'].innerHTML,/course-detail-layout/);assert.match(a.nodes['#app'].innerHTML,/data-tab="catalog" class="active"/);
 a.set("location.pathname='/account/courses/missing';render()");assert.match(a.nodes['#app'].innerHTML,/Course not found/);a.click({tab:'catalog'});assert.equal(a.read('location.pathname'),'/account');
 a.set("role='student';tab='overview';location.pathname='/account/courses/art';render()");assert.equal(a.read('location.pathname'),'/account');assert.doesNotMatch(a.nodes['#app'].innerHTML,/course-detail-layout|data-edit-course=/);a.click({openCourse:'art'});assert.equal(a.read('location.pathname'),'/account');
});

function lessonApp(){const a=app({},'2026-10-08T12:00:00');a.set("role='teacher';lang='en';tab='overview';location.pathname='/account';selectTimetableDate('2026-10-08');render()");return a}
test('timetable cards open date-specific lesson details without replacing the timetable',()=>{
 const a=lessonApp(),background=a.nodes['#app'].innerHTML,before=a.read('db');
 assert.match(background,/data-open-lesson="e" data-lesson-kind="class" data-lesson-date="2026-10-08"/);
 a.click({openLesson:'e',lessonKind:'class',lessonDate:'2026-10-08'});let html=a.nodes['#modal-root'].innerHTML;
 assert.equal(a.nodes['#app'].innerHTML,background);assert.equal(a.read('location.pathname'),'/account');
 for(const text of ['#1 · Course 2','Teachers','Room','Capacity','Online Meeting','Remark','Details','More info','Student','Materials','Assessments','Students (0)','Enroll student','Name (No.)','Make Up','Order','Payment','Attendance','Remarks','No student yet'])assert.ok(html.includes(text),text);
 assert.match(html,/datetime="2026-10-08"/);assert.match(html,/15:00/);assert.doesNotMatch(html,/15:45/);
 assert.match(html,/<dt>Capacity<\/dt><dd>6<\/dd>/);
 a.click({lessonTab:'materials'});html=a.nodes['#modal-root'].innerHTML;assert.match(html,/aria-labelledby="lesson-tab-materials"/);assert.doesNotMatch(html,/lesson-students-table|No assessment yet/);
 for(const text of ['Name','Owner','Uploaded on','Visible to students','No material yet'])assert.ok(html.includes(text),text);
 assert.match(html,/class="lesson-records-add" disabled/);assert.match(html,/#1 · Course 2/);
 a.click({lessonTab:'assessments'});html=a.nodes['#modal-root'].innerHTML;assert.match(html,/aria-labelledby="lesson-tab-assessments"/);assert.doesNotMatch(html,/No material yet|Visible to students/);
 for(const text of ['Name (No.)','Assessment name','Assessed by','Assessed on','No assessment yet'])assert.ok(html.includes(text),text);
 a.set("lang='zh'");a.click({lessonTab:'materials'});html=a.nodes['#modal-root'].innerHTML;for(const text of ['擁有人','上載日期','學生可見','暫時沒有教材'])assert.ok(html.includes(text),text);
 a.click({lessonTab:'assessments'});html=a.nodes['#modal-root'].innerHTML;for(const text of ['評估名稱','評估者','評估日期','暫時沒有評估'])assert.ok(html.includes(text),text);
 a.set("lang='en'");a.click({lessonTab:'students'});
 assert.deepEqual(a.read('db'),before);a.click({action:'lesson-close'});assert.equal(a.read('selectedTimetableLesson'),null);assert.equal(a.nodes['#modal-root'].innerHTML,'');assert.equal(a.nodes['#app'].innerHTML,background);
 a.click({openLesson:'e',lessonKind:'class',lessonDate:'2026-10-15'});assert.match(a.nodes['#modal-root'].innerHTML,/#2 · Course 2/);a.click({action:'lesson-edit'});assert.equal(a.read('selectedTimetableLesson'),null);assert.match(a.nodes['#modal-root'].innerHTML,/id="schedule-editor"/);
});
test('lesson roster includes only confirmed students booked for the selected occurrence',()=>{
 const a=lessonApp();a.set("db.bookings=[{id:'NOW',student:'Current Student',classId:'a',paid:true,status:'confirmed',paidAt:'2026-10-04',lessonCount:1},{id:'OTHER',student:'Other Class',classId:'b',paid:true,status:'confirmed',paidAt:'2026-10-04',lessonCount:4},{id:'OLD',student:'Expired Term',classId:'a',paid:true,status:'confirmed',paidAt:'2026-06-01',lessonCount:4},{id:'PENDING',student:'Unpaid Student',classId:'a',paid:false,status:'pending'},{id:'WAIT',student:'Waitlist Student',classId:'a',paid:true,status:'waitlist',paidAt:'2026-10-04'}]");
 a.click({openLesson:'a',lessonKind:'class',lessonDate:'2026-10-05'});let html=a.nodes['#modal-root'].innerHTML;assert.match(html,/Students \(1\)/);assert.match(html,/Current Student/);assert.match(html,/>NOW<\/td>/);assert.match(html,/>Paid<\/td>/);assert.doesNotMatch(html,/Other Class|Expired Term|Unpaid Student|Waitlist Student|No student yet/);
 a.click({action:'lesson-close'});a.click({openLesson:'a',lessonKind:'class',lessonDate:'2026-10-12'});assert.match(a.nodes['#modal-root'].innerHTML,/Students \(0\)/);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/Current Student/);
});
test('saved schedule cards show full information, correct recurrence number and separate editing',()=>{
 const a=scheduleApp();a.submit('schedule-editor',scheduleValues({startDate:'2026-10-05',time:'10:00',duration:'45',session:'3',endMode:'count',count:'3',remark:'Private <note>',detail:'Teacher detail',moreInfo:'Student info'}),{dataset:{id:''}});const id=a.read('db.schedules[0].id');
 a.set("db.bookings=[{id:'BOOK',student:'Enrolled Student',classId:'a',paid:true,status:'confirmed',paidAt:'2026-10-04',lessonCount:4}]");
 a.click({openLesson:id,lessonKind:'schedule',lessonDate:'2026-10-12'});let html=a.nodes['#modal-root'].innerHTML;assert.match(html,/#4 · Course 1/);assert.match(html,/10:00 – 10:45/);assert.match(html,/Private &lt;note&gt;/);assert.match(html,/Teacher detail/);assert.match(html,/Student info/);assert.match(html,/Enrolled Student/);assert.match(html,/style="background:#27777b"/);
 a.click({action:'lesson-edit'});assert.match(a.nodes['#modal-root'].innerHTML,/id="schedule-editor"/);assert.equal(a.read('scheduleDraft.id'),id);a.click({action:'close'});assert.equal(a.read('selectedTimetableLesson.id'),id);assert.equal(a.read('selectedTimetableLesson.date'),'2026-10-12');a.click({action:'lesson-close'});
 const background=a.nodes['#app'].innerHTML;a.click({openLesson:id,lessonKind:'schedule',lessonDate:'2026-10-26'});assert.equal(a.read('selectedTimetableLesson'),null);assert.equal(a.nodes['#app'].innerHTML,background);assert.equal(a.nodes['#modal-root'].innerHTML,'');
});
test('student access and invalid lesson references cannot open internal details',()=>{
 const a=lessonApp();for(const [id,kind,date] of [['missing','class','2026-10-05'],['a','wrong','2026-10-05'],['a','class','2026-10-06'],['a','class','2026-02-30']]){a.click({openLesson:id,lessonKind:kind,lessonDate:date});assert.equal(a.read('selectedTimetableLesson'),null)}
 a.set("role='student';tab='overview';render()");const background=a.nodes['#app'].innerHTML;a.click({openLesson:'a',lessonKind:'class',lessonDate:'2026-10-05'});a.click({lessonTab:'students'});a.click({action:'lesson-edit'});assert.equal(a.read('selectedTimetableLesson'),null);assert.equal(a.nodes['#app'].innerHTML,background);assert.doesNotMatch(a.nodes['#app'].innerHTML,/lesson-dialog|Private|data-open-lesson=/);
});

test('Escape closes lesson details and keeps the original timetable and selection intact',()=>{
 const a=lessonApp(),background=a.nodes['#app'].innerHTML;a.click({action:'portal-menu'});a.click({openLesson:'a',lessonKind:'class',lessonDate:'2026-10-05'});a.click({lessonTab:'assessments'});a.keydown('Escape');assert.equal(a.read('modal'),'');assert.equal(a.read('selectedTimetableLesson'),null);assert.equal(a.nodes['#modal-root'].innerHTML,'');assert.equal(a.nodes['#app'].innerHTML,background);assert.equal(a.read('portalMenu'),true);
});

test('timetable slot cards show time first, course and three counters while keeping saved colours',()=>{
 const a=scheduleApp();a.submit('schedule-editor',scheduleValues({startDate:'2026-10-05',time:'10:00',duration:'45',color:'#8ec549'}),{dataset:{id:''}});const id=a.read('db.schedules[0].id'),saved=a.read('db');let html=a.nodes['#app'].innerHTML;
 const card=html.match(new RegExp(`<button class="tt-lesson tt-scheduled-lesson"[^>]*data-open-lesson="${id}"[^]*?<\\/button>`))[0];
 assert.match(card,/--tt-lesson-color:#8ec549/);assert.match(card,/class="tt-lesson-time">10:00 – 10:45/);assert.ok(card.indexOf('tt-lesson-time')<card.indexOf('<strong>Course 1'));assert.ok(card.indexOf('<strong>Course 1')<card.indexOf('tt-lesson-stats'));
 for(const label of ['Awaiting payment: 0','Enrolled students: 0','Assigned teachers: 0'])assert.ok(card.includes(label),label);
 a.click({openLesson:id,lessonKind:'schedule',lessonDate:'2026-10-05'});assert.match(a.nodes['#modal-root'].innerHTML,/10:00 – 10:45/);assert.deepEqual(a.read('db'),saved);
 a.click({action:'lesson-close'});a.click({action:'language'});html=a.nodes['#app'].innerHTML;for(const label of ['待付款人數: 0','已加入學生人數: 0','已分配老師人數: 0'])assert.ok(html.includes(label),label);
});
test('slot counters derive distinct students and assigned teachers from existing records',()=>{
 const a=lessonApp();a.set("db.classes[0].teacher='Teacher 1';db.bookings=[{id:'OWN',student:'Student A',studentId:'A',classId:'a',paid:true,status:'confirmed',paidAt:'2026-10-04',lessonCount:1},{id:'OLD',student:'Old term',classId:'a',paid:true,status:'confirmed',paidAt:'2026-06-01',lessonCount:4},{id:'WAIT',student:'Pending student',studentId:'P',classId:'a',paid:false,status:'pending'},{id:'DUP',student:'Pending student',studentId:'P',classId:'a',paid:false,status:'pending'},{id:'OTHER',student:'Other class',classId:'b',paid:false,status:'pending'},{id:'LIST',student:'Waitlist',classId:'a',paid:false,status:'waitlist'}];render()");
 assert.deepEqual(a.read("timetableSlotStats({...cl('a'),isSchedule:false},'2026-10-05')"),{payment:1,students:1,teachers:1});assert.deepEqual(a.read("timetableSlotStats({...cl('a'),isSchedule:false},'2026-10-12')"),{payment:1,students:0,teachers:1});
 a.set("db.classes[0].teacher=''");assert.equal(a.read("timetableSlotStats(cl('a'),'2026-10-05').teachers"),0);
});
test('short adjacent slot summaries use separate lanes without changing actual duration or adding later time labels',()=>{
 const a=lessonApp();a.set("db.schedules=[{id:'SHORT1',course:'art',startDate:'2026-10-08',weekdays:[4],endMode:'forever',time:'09:00',duration:15,color:'#27777b'},{id:'SHORT2',course:'art',startDate:'2026-10-08',weekdays:[4],endMode:'forever',time:'09:15',duration:15,color:'#27777b'},{id:'LATE',course:'art',startDate:'2026-10-08',weekdays:[4],endMode:'forever',time:'19:45',duration:15,color:'#27777b'}];render()");
 const layout=a.read("timetableDayLayout(timetableDateObject('2026-10-08'))"),first=layout.find(c=>c.id==='SHORT1'),second=layout.find(c=>c.id==='SHORT2');assert.notEqual(first.lane,second.lane);assert.equal(first.duration,15);assert.equal(second.time,'09:15');assert.equal(a.read("db.schedules[2].duration"),15);
 const html=a.nodes['#app'].innerHTML;assert.match(html,/09:00 – 09:15/);assert.match(html,/19:45 – 20:00/);assert.match(html,/>19:45<\/div>/);assert.doesNotMatch(html,/>20:00<\/div>|>20:15<\/div>/);
});

test('timetable date columns keep the same baseline across empty and crowded weeks and both fourteen-day rows',()=>{
 const a=lessonApp();a.set("db.classes=[];db.schedules=[0,1,2].map(i=>({id:'OVERLAP'+i,course:'art',startDate:'2026-10-15',weekdays:[4],endMode:'forever',time:'10:00',duration:60,color:'#27777b'}));render()");
 const minimums=()=>[...a.nodes['#app'].innerHTML.matchAll(/--tt-grid-min:(\d+)px/g)].map(match=>Number(match[1]));
 const empty=minimums();assert.deepEqual(empty,[1456]);a.click({action:'tt-next'});assert.equal(a.read("Math.max(...timetableDayLayout(timetableDateObject('2026-10-15')).map(row=>row.lanes))"),3);assert.deepEqual(minimums(),empty);
 assert.equal((a.nodes['#app'].innerHTML.match(/data-open-lesson="OVERLAP/g)||[]).length,3,'All overlapping lessons must remain separate clickable cards');
 a.set("timetableView='range';timetableViewSettings.rangeDays=14;selectTimetableDate('2026-10-08');render()");assert.deepEqual(minimums(),[1456,1456]);
});

test('an empty timetable quarter-hour opens the existing editor with its date time and weekday without saving on cancel',async()=>{
 const a=lessonApp(),before=a.read('db');assert.match(a.nodes['#app'].innerHTML,/data-action="tt-add-cell"[^>]*data-date="2026-10-05"[^>]*data-time="09:15"/);
 await a.click({action:'tt-add-cell',date:'2026-10-05',time:'09:15'});assert.equal(a.read('scheduleDraft.startDate'),'2026-10-05');assert.equal(a.read('scheduleDraft.time'),'09:15');assert.deepEqual(a.read('scheduleDraft.weekdays'),[1]);assert.match(a.nodes['#modal-root'].innerHTML,/<option value="09:15" selected>/);assert.match(a.nodes['#modal-root'].innerHTML,/id="schedule-duration"[^>]*required(?! disabled)/);
 a.keydown('Escape');assert.equal(a.read('modal'),'');assert.deepEqual(a.read('db'),before);assert.equal(a.read('timetableDate'),'2026-10-08');
 for(const fields of [{date:'2026-10-05',time:'09:20'},{date:'2026-02-30',time:'09:15'},{date:'2030-01-01',time:'09:15'},{date:'2026-10-05',time:'24:00'}]){await a.click({action:'tt-add-cell',...fields});assert.equal(a.read('modal'),'');}
});

test('timetable create cells follow real quarter hours under twenty-minute display rows and stay absent for read-only roles',async()=>{
 const a=lessonApp();a.set("timetableViewSettings.intervalDuration=20;render()");const html=a.nodes['#app'].innerHTML;assert.match(html,/data-time="09:15"/);assert.doesNotMatch(html,/data-time="09:20"/);
 await a.click({action:'tt-add-cell',date:'2026-10-05',time:'09:15'});assert.equal(a.read('scheduleDraft.time'),'09:15');a.keydown('Escape');
 const user={...copy(sharedTestUser),id:'qa-cell-readonly-teacher',role:'teacher'},b=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1},{session:async()=>({user}),schedules:async()=>teacherScheduleFixture(sharedScheduleRecord())});
 assert.doesNotMatch(b.nodes['#app'].innerHTML,/data-action="tt-add-cell"/);await b.click({action:'tt-add-cell',date:'2026-10-05',time:'09:15'});assert.equal(b.read('modal'),'');assert.equal(b.read('scheduleDraft'),null);
});


const timetableSettingsValues=(extra={})=>({calendarType:'fixed',intervalDuration:'15',intervalHeight:'30',studentsNumbering:'decimal',level:'on',teachers:'on',rooms:'on',students:'on',statusIcon:'on',...extra});
test('calendar view settings preview and cancellation preserve lessons, date, filters and collapsed sidebar',()=>{
 const a=lessonApp(),before=a.read('db'),settings=a.read('timetableViewSettings');a.click({action:'portal-menu'});a.set("timetableSearch='Course 1';timetableSelections.rooms=['unassigned'];render()");a.click({action:'tt-view-settings'});assert.ok(a.read('timetableSettingsDraft'));let html=a.nodes['#modal-root'].innerHTML;for(const label of ['Calendar View Settings','Fixed Intervals','Compact','Interval Duration (min)','Interval Height (px)','Decimal','Disc','None','Calendar Record Elements'])assert.ok(html.includes(label),label);
 a.set("updateTimetableSettingsDraft({name:'intervalDuration',value:'30'});updateTimetableSettingsDraft({name:'intervalHeight',value:'48'})");assert.match(a.nodes['#tt-settings-preview'].innerHTML,/10:00/);assert.match(a.nodes['#tt-settings-preview'].innerHTML,/48px/);a.keydown('Escape');assert.equal(a.read('modal'),'');assert.equal(a.read('timetableSettingsDraft'),null);assert.deepEqual(a.read('timetableViewSettings'),settings);assert.deepEqual(a.read('db'),before);assert.equal(a.read('timetableDate'),'2026-10-08');assert.equal(a.read('timetableSearch'),'Course 1');assert.deepEqual(a.read('timetableSelections.rooms'),['unassigned']);assert.equal(a.read('portalMenu'),true);
 a.set("role='student'");a.click({action:'tt-view-settings'});assert.match(a.nodes['#modal-root'].innerHTML,/id="tt-view-settings"/,'Students may configure calendar appearance without receiving timetable management permissions');assert.ok(a.read('timetableSettingsDraft'));a.click({action:'tt-close-settings'});assert.equal(a.read('modal'),'');assert.deepEqual(a.read('db'),before);
});
test('fixed interval settings change row spacing and persist without changing lesson times or the 19:45 limit',()=>{
 const a=lessonApp(),before=a.read('db');a.click({action:'tt-view-settings'});a.submit('tt-view-settings',timetableSettingsValues({intervalDuration:'20',intervalHeight:'40'}));assert.equal(a.read('modal'),'');assert.equal(a.read('timetableViewSettings.intervalDuration'),20);let html=a.nodes['#app'].innerHTML;assert.match(html,/--tt-row-height:40px/);assert.match(html,/>09:20<\/div>/);assert.match(html,/>19:45<\/div>/);assert.doesNotMatch(html,/>19:40<\/div>|>20:00<\/div>/);assert.match(html,/top:calc\(3 \* var\(--tt-row-height\)\)/);assert.deepEqual(a.read('db'),before);
 const reloaded=app({'beamal-timetable-view-v1':a.read('localStorage.getItem(timetableSettingsKey)')});assert.deepEqual(reloaded.read('timetableViewSettings'),a.read('timetableViewSettings'));assert.equal(reloaded.read('timetableSettingsDraft'),null);a.click({action:'tt-view-settings'});a.click({action:'tt-close-settings'});assert.equal(a.read('timetableViewSettings.intervalDuration'),20);
 a.set("db.schedules=[{id:'EARLY',course:'art',startDate:'2026-10-08',weekdays:[4],endMode:'forever',time:'09:00',duration:15},{id:'NEXT',course:'art',startDate:'2026-10-08',weekdays:[4],endMode:'forever',time:'09:15',duration:15}]");let layout=a.read("timetableDayLayout(timetableDateObject('2026-10-08'))");assert.notEqual(layout.find(c=>c.id==='EARLY').lane,layout.find(c=>c.id==='NEXT').lane);
 a.click({action:'reset'});assert.deepEqual(a.read('timetableViewSettings'),a.read('defaultTimetableViewSettings()'));assert.equal(a.read('localStorage.getItem(timetableSettingsKey)'),null);
});
test('compact view removes empty intervals, groups simultaneous lessons and keeps lesson and list navigation working',()=>{
 const a=lessonApp(),before=a.read('db');a.click({action:'tt-view-settings'});a.submit('tt-view-settings',timetableSettingsValues({calendarType:'compact',intervalHeight:'35'}));let html=a.nodes['#app'].innerHTML;assert.match(html,/tt-grid tt-compact/);assert.match(html,/>10:00<\/div>/);assert.doesNotMatch(html,/>09:15<\/div>|>10:15<\/div>/);assert.equal((html.match(/data-open-lesson=/g)||[]).length,6);assert.deepEqual(a.read('db'),before);
 a.click({openLesson:'e',lessonKind:'class',lessonDate:'2026-10-08'});assert.match(a.nodes['#modal-root'].innerHTML,/#1 · Course 2/);a.click({action:'lesson-list'});assert.equal(a.read('timetableView'),'list');assert.match(a.nodes['#app'].innerHTML,/tt-lesson-list/);a.click({openLesson:'e',lessonKind:'class',lessonDate:'2026-10-22'});a.click({action:'lesson-week'});assert.match(a.nodes['#app'].innerHTML,/tt-grid tt-compact/);assert.equal(a.read('timetableDate'),'2026-10-22');
 a.set("timetableLessonFilter=null;db.classes[1].weekdays=[1];db.classes[1].time='10:00';db.classes[2].weekdays=[1];db.classes[2].time='11:00'");let layout=a.read("timetableDayLayout(timetableDateObject('2026-10-19'))");assert.equal(layout.find(c=>c.id==='a').lanes,2);assert.notEqual(layout.find(c=>c.id==='a').lane,layout.find(c=>c.id==='b').lane);assert.equal(layout.find(c=>c.id==='c').lanes,1);
 a.click({action:'tt-view-settings'});a.submit('tt-view-settings',timetableSettingsValues());assert.match(a.nodes['#app'].innerHTML,/class="tt-grid"/);assert.match(a.nodes['#app'].innerHTML,/>09:15<\/div>/);
});
test('calendar record switches show only available scoped data and student numbering changes presentation',()=>{
 const a=lessonApp();a.set("db.classes[0].teacher='Eileen';db.classes[0].room='Room A';db.classes[0].category='Art & <paint>';db.classes[0].level='Beginner';db.classes[0].detail='Bring brushes';db.bookings=[{id:'PRESENT',student:'Student A',classId:'a',paid:true,status:'confirmed',paidAt:'2026-10-04',lessonCount:1,age:8,level:'Level 1',studentNumber:'ST-1',education:'Primary',remark:'No apron'},{id:'OTHER',student:'Other student',classId:'b',paid:true,status:'confirmed',paidAt:'2026-10-04',lessonCount:1}];db.student.age=99");const before=a.read('db');a.click({action:'tt-view-settings'});a.submit('tt-view-settings',timetableSettingsValues({category:'on',lessonNumber:'on',detail:'on',studentAge:'on',studentRemark:'on',studentLevel:'on',studentNumber:'on',education:'on'}));let extra=a.read("timetableSlotExtras(cl('a'),'2026-10-05')");assert.ok(extra.rows.includes('Teachers: Eileen'));assert.ok(extra.rows.includes('Rooms: Room A'));assert.ok(extra.rows.includes('Lesson: 1'));assert.match(extra.students[0],/^1\. Student A · Age: 8/);assert.match(extra.students[0],/Student Remark: No apron|Student Number: ST-1/);assert.doesNotMatch(extra.students.join(' '),/Other student|99/);assert.match(a.nodes['#app'].innerHTML,/Art &amp; &lt;paint&gt;/);
 for(const [numbering,prefix] of [['disc','• Student A'],['none','Student A']]){a.click({action:'tt-view-settings'});a.submit('tt-view-settings',timetableSettingsValues({studentsNumbering:numbering}));assert.ok(a.read("timetableSlotExtras(cl('a'),'2026-10-05').students[0]").startsWith(prefix))}
 a.click({action:'tt-view-settings'});a.submit('tt-view-settings',timetableSettingsValues({level:'',teachers:'',rooms:'',students:'',statusIcon:''}));assert.deepEqual(a.read("timetableSlotExtras(cl('a'),'2026-10-05')"),{rows:[],students:[]});let html=(a.nodes['#app'].innerHTML.match(/<button class="tt-lesson [^]*?<\/button>/g)||[]).join('');assert.doesNotMatch(html,/Assigned teachers:|Enrolled students:|👦|💰|Eileen|Room A/);assert.deepEqual(a.read('db'),before);
 a.set("db.schedules=[{id:'END',course:'art',startDate:'2026-10-08',weekdays:[4],endMode:'count',count:2,time:'10:00',duration:45}];timetableViewSettings.elements.lastDate=true");assert.ok(a.read("timetableSlotExtras({...db.schedules[0],isSchedule:true},'2026-10-08').rows").includes('Last Date: 2026-10-15'));
});
test('invalid or unpersistable calendar preferences never overwrite saved settings and malformed storage falls back safely',()=>{
 for(const values of [{calendarType:'other'},{studentsNumbering:'other'},{intervalDuration:'0'},{intervalDuration:'17'},{intervalDuration:'65'},{intervalHeight:'19'},{intervalHeight:'121'},{intervalHeight:'30.5'}]){const a=lessonApp(),before=a.read('timetableViewSettings');a.click({action:'tt-view-settings'});a.submit('tt-view-settings',timetableSettingsValues(values));assert.deepEqual(a.read('timetableViewSettings'),before);assert.ok(a.read('timetableSettingsDraft'));assert.ok(a.nodes['#tt-settings-error'].textContent);assert.equal(a.read('localStorage.getItem(timetableSettingsKey)'),null)}
 const a=lessonApp(),before=a.read('timetableViewSettings');a.click({action:'tt-view-settings'});a.ctx.localStorage.setItem=()=>{throw new Error('Quota')};a.submit('tt-view-settings',timetableSettingsValues({intervalHeight:'50'}));assert.deepEqual(a.read('timetableViewSettings'),before);assert.match(a.nodes['#tt-settings-error'].textContent,/Could not save/);a.set("role='student'");a.submit('tt-view-settings',timetableSettingsValues({intervalHeight:'60'}));assert.deepEqual(a.read('timetableViewSettings'),before);
 for(const raw of ['invalid','null','{"intervalHeight":999,"elements":{"students":"false"}}']){const b=app({'beamal-timetable-view-v1':raw});assert.deepEqual(b.read('timetableViewSettings'),b.read('defaultTimetableViewSettings()'))}
});

test('activity info copy contains the selected lesson without changing schedules or copying students',async()=>{
 const a=lessonApp();a.set("db.schedules.push({id:'S-COPY',course:'art',startDate:'2026-10-08',endMode:'forever',weekdays:[4],time:'10:00',duration:45,color:'#27777b',capacity:8,teacher:'Teacher 1',room:'Room A',session:1,remark:'Bring a brush',detail:'Painting',moreInfo:'Student info'});db.classes.find(c=>c.course==='art').courseName='A & B'");let copied='';a.ctx.navigator.clipboard={writeText:async text=>{copied=text}};const before=a.read('db');a.click({openLesson:'S-COPY',lessonKind:'schedule',lessonDate:'2026-10-15'});
 const html=a.nodes['#modal-root'].innerHTML;for(const label of ['Lesson reminder settings','Copy activity info','More actions','Edit activity'])assert.ok(html.includes(label),label);assert.match(html,/data-action="lesson-copy"/);assert.equal(await a.ctx.copyLessonActivityInfo(),true);assert.match(copied,/#2 · A & B/);assert.match(copied,/2026-10-15 · 10:00 – 10:45/);assert.match(copied,/Teachers: Teacher 1/);assert.match(copied,/Room: Room A/);assert.match(copied,/Remark: Bring a brush/);assert.doesNotMatch(copied,/David Leung|Ryan Yu|&amp;/);assert.deepEqual(a.read('db'),before);assert.ok(a.read('selectedTimetableLesson'));assert.equal(a.read('scheduleDraft'),null);
 a.set("lang='zh'");assert.equal(await a.ctx.copyLessonActivityInfo(),true);assert.match(copied,/老師: Teacher 1/);assert.match(copied,/備註: Bring a brush/);
 a.ctx.navigator.clipboard={writeText:async()=>{throw new Error('Denied')}};assert.equal(await a.ctx.copyLessonActivityInfo(),false);delete a.ctx.navigator.clipboard;assert.equal(await a.ctx.copyLessonActivityInfo(),false);assert.deepEqual(a.read('db'),before);
 a.set("role='student'");let calls=0;a.ctx.navigator.clipboard={writeText:async()=>calls++};assert.equal(await a.ctx.copyLessonActivityInfo(),false);assert.equal(calls,0);
});

test('attendance menu is scoped to teacher timetable and Escape closes it without changing lessons',()=>{
 const a=lessonApp(),before=a.read('db'),date=a.read('timetableDate');
 for(const view of ['week','day','list']){a.set(`timetableView='${view}';render()`);let html=a.nodes['#app'].innerHTML;assert.match(html,/aria-label="Attendance" aria-describedby="tt-attendance-tooltip"/);assert.match(html,/id="tt-attendance-tooltip"[^>]*role="tooltip"/);for(const label of ['Check in by scan device','Check in by mobile camera','Check in logs'])assert.ok(html.includes(label));assert.equal((html.match(/type="button" disabled title="Currently unavailable"/g)||[]).length,3);assert.doesNotMatch(html,/More timetable options|data-action="tt-today"/)}
 let focused=false;a.nodes['#tt-attendance']={open:true,querySelector:()=>({focus(){focused=true}})};a.keydown('Escape');assert.equal(a.nodes['#tt-attendance'].open,false);assert.equal(focused,true);assert.equal(a.read('timetableDate'),date);assert.deepEqual(a.read('db'),before);
 a.set("lang='zh';render()");assert.match(a.nodes['#app'].innerHTML,/出席選項|透過掃描裝置簽到|透過手機鏡頭簽到|簽到紀錄/);a.set("role='student';render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,/id="tt-attendance"/);assert.deepEqual(a.read('db'),before);
});

test('lesson menu opens reversibly and Escape dismisses it before closing details',()=>{
 const a=lessonApp(),before=a.read('db');a.click({openLesson:'e',lessonKind:'class',lessonDate:'2026-10-08'});
 for(const label of ['Duplicate lesson','Switch to List View','Open in Sales','Open in Courses'])assert.ok(a.nodes['#modal-root'].innerHTML.includes(label),label);
 a.click({action:'lesson-more'});assert.equal(a.read('lessonMenuOpen'),true);assert.equal(a.nodes['#lesson-more-menu'].hidden,false);assert.equal(a.nodes['[data-action="lesson-more"]'].getAttribute('aria-expanded'),'true');
 a.keydown('Escape');assert.equal(a.read('lessonMenuOpen'),false);assert.ok(a.read('selectedTimetableLesson'));assert.equal(a.nodes['#lesson-more-menu'].hidden,true);
 a.click({action:'lesson-more'});a.click({lessonTab:'materials'});assert.equal(a.read('lessonMenuOpen'),false);assert.deepEqual(a.read('db'),before);
 a.keydown('Escape');assert.equal(a.read('selectedTimetableLesson'),null);
});
test('lesson menu links reach Sales and the matching course while preserving collapsed navigation',()=>{
 const a=lessonApp(),before=a.read('db');a.click({action:'portal-menu'});a.click({openLesson:'e',lessonKind:'class',lessonDate:'2026-10-08'});a.click({action:'lesson-sales'});
 assert.equal(a.read('tab'),'new-enrolments');assert.equal(a.read('modal'),'');assert.equal(a.read('portalMenu'),true);assert.match(a.nodes['#app'].innerHTML,/New student enrolments/);
 a.click({openLesson:'e',lessonKind:'class',lessonDate:'2026-11-05'});a.click({action:'lesson-course'});assert.equal(a.read('location.pathname'),'/account/courses/story');assert.equal(a.read('timetableDate'),'2026-11-05');assert.equal(a.read('courseDetailMonth.getMonth()'),10);assert.match(a.nodes['#app'].innerHTML,/course-detail-layout/);assert.equal(a.read('portalMenu'),true);assert.deepEqual(a.read('db'),before);
 a.set("role='student'");for(const action of ['lesson-more','lesson-duplicate','lesson-list','lesson-week','lesson-sales','lesson-course'])a.click({action});assert.equal(a.read('modal'),'');assert.deepEqual(a.read('db'),before);
});
test('duplicating a lesson opens a single-occurrence draft and never copies enrolments or mutates the source',()=>{
 const a=lessonApp();a.set("db.schedules.push({id:'S-DUP',course:'art',startDate:'2026-10-08',endMode:'forever',endDate:'',count:1,weekdays:[4],time:'10:00',duration:45,color:'#8fc34a',teacher:'Teacher 1',room:'Room A',capacity:8,session:2,remark:'Remark',detail:'Detail',moreInfo:'Student info'})");const before=a.read('db');
 a.click({openLesson:'S-DUP',lessonKind:'schedule',lessonDate:'2026-10-15'});a.click({action:'lesson-duplicate'});const d=a.read('scheduleDraft');assert.equal(d.id,'');assert.equal(d.startDate,'2026-10-15');assert.equal(d.endMode,'count');assert.equal(d.count,1);assert.equal(d.time,'10:00');assert.equal(d.duration,45);assert.equal(d.color,'#8fc34a');assert.deepEqual(d.weekdays,[4]);assert.equal(d.teacher,'Teacher 1');assert.equal(d.room,'Room A');assert.equal(d.moreInfo,'Student info');assert.equal(a.read('selectedTimetableLesson'),null);assert.deepEqual(a.read('db'),before);
 a.click({action:'close'});assert.deepEqual(a.read('db'),before);a.click({openLesson:'S-DUP',lessonKind:'schedule',lessonDate:'2026-10-15'});a.click({action:'lesson-duplicate'});
 a.submit('schedule-editor',{...d,capacity:'8',duration:'45',count:'1',session:'1'},{dataset:{id:''}});assert.equal(a.read('db.schedules.length'),2);assert.deepEqual(a.read('db.schedules[0]'),before.schedules[0]);assert.deepEqual(a.read('db.bookings'),before.bookings);assert.equal(a.read("scheduleOccurs(db.schedules[1],'2026-10-15')"),true);assert.equal(a.read("scheduleOccurs(db.schedules[1],'2026-10-22')"),false);
 a.click({openLesson:'a',lessonKind:'class',lessonDate:'2026-10-05'});a.click({action:'lesson-duplicate'});assert.equal(a.read('scheduleDraft.duration'),'');assert.equal(a.read('scheduleDraft.course'),'art');
});
test('Switch to List View groups the selected class monthly and keeps occurrence numbers and filters accurate',()=>{
 const a=lessonApp(),before=a.read('db');a.click({openLesson:'e',lessonKind:'class',lessonDate:'2026-10-08'});a.click({action:'lesson-list'});assert.equal(a.read('modal'),'');assert.equal(a.read('timetableView'),'list');assert.deepEqual(a.read('timetableLessonFilter'),{id:'e',kind:'class'});let html=a.nodes['#app'].innerHTML;
 assert.match(html,/tt-workspace filters-hidden/);assert.match(html,/Class ID: CL-005/);assert.match(html,/tt-list-date-group/);assert.match(html,/Day of week/);assert.match(html,/Number/);assert.match(html,/Capacity/);assert.match(html,/Created on/);assert.equal((html.match(/data-open-lesson="e"/g)||[]).length,4);assert.doesNotMatch(html,/data-open-lesson="a"|datetime="2026-10-01"/);
 for(const date of ['2026-10-08','2026-10-15','2026-10-22','2026-10-29'])assert.ok(html.includes(`data-lesson-date="${date}"`));assert.match(html,/>4<\/td><td>0\/6</);
 a.click({openLesson:'e',lessonKind:'class',lessonDate:'2026-10-22'});assert.match(a.nodes['#modal-root'].innerHTML,/#3 · Course 2/);a.click({action:'lesson-close'});
 a.click({action:'tt-next'});assert.equal(a.read('timetableDate'),'2026-11-08');assert.match(a.nodes['#app'].innerHTML,/data-lesson-date="2026-11-05"/);a.click({action:'tt-prev'});assert.equal(a.read('timetableDate'),'2026-10-08');
 a.click({action:'tt-clear-lesson'});assert.equal(a.read('timetableLessonFilter'),null);assert.match(a.nodes['#app'].innerHTML,/data-open-lesson="a"/);a.change('', 'week',{id:'tt-view'});assert.match(a.nodes['#app'].innerHTML,/class="tt-grid"/);assert.deepEqual(a.read('db'),before);
 a.set("db.schedules.push({id:'S-LIST',course:'story',startDate:'2026-10-08',endMode:'count',count:4,weekdays:[4],time:'10:00',duration:45,color:'#8fc34a',session:1,capacity:null});timetableSearch=''");a.click({openLesson:'S-LIST',lessonKind:'schedule',lessonDate:'2026-10-08'});a.click({action:'lesson-list'});html=a.nodes['#app'].innerHTML;assert.equal((html.match(/data-open-lesson="S-LIST"/g)||[]).length,4);assert.doesNotMatch(html,/data-open-lesson="e"/);assert.match(html,/10:00 – 10:45/);assert.match(html,/>0\/-<\/td>/);
 a.change('', 'list',{id:'tt-view'});a.set("timetableSearch='no-match';render()");assert.match(a.nodes['#app'].innerHTML,/No lessons match your search/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-open-lesson=/);
});


test('lesson menu switches List back to Week at the selected occurrence and can return to List',()=>{
 const a=lessonApp();a.set("db.schedules.push({id:'S-WEEK',course:'art',startDate:'2026-10-08',endMode:'count',count:4,weekdays:[4],time:'10:00',duration:45,color:'#8fc34a',session:1})");a.click({action:'portal-menu'});const before=a.read('db');
 for(const [id,kind] of [['e','class'],['S-WEEK','schedule']]){
  a.set("timetableView='week';timetableFiltersVisible=false;lang='en'");a.click({openLesson:id,lessonKind:kind,lessonDate:'2026-10-08'});assert.match(a.nodes['#modal-root'].innerHTML,/Switch to List View/);a.click({action:'lesson-list'});
  a.click({openLesson:id,lessonKind:kind,lessonDate:'2026-10-22'});let html=a.nodes['#modal-root'].innerHTML;assert.match(html,/data-action="lesson-week"/);assert.match(html,/Switch to Week View/);assert.doesNotMatch(html,/Switch to List View/);a.click({action:'lesson-more'});a.click({action:'lesson-week'});
  assert.equal(a.read('timetableView'),'week');assert.equal(a.read('timetableDate'),'2026-10-22');assert.deepEqual(a.read('timetableLessonFilter'),{id,kind});assert.equal(a.read('portalMenu'),true);assert.equal(a.read('timetableFiltersVisible'),false);assert.equal(a.read('selectedTimetableLesson'),null);assert.equal(a.read('lessonMenuOpen'),false);html=a.nodes['#app'].innerHTML;assert.match(html,/class="tt-grid"/);assert.ok(html.includes(`data-open-lesson="${id}"`));assert.ok(html.includes('data-lesson-date="2026-10-22"'));assert.doesNotMatch(html,/tt-lesson-list|data-open-lesson="a"/);
  a.click({openLesson:id,lessonKind:kind,lessonDate:'2026-10-22'});assert.match(a.nodes['#modal-root'].innerHTML,/Switch to List View/);a.click({action:'lesson-list'});assert.equal(a.read('timetableView'),'list');assert.equal(a.read('timetableDate'),'2026-10-22');assert.equal((a.nodes['#app'].innerHTML.match(new RegExp(`data-open-lesson="${id}"`,'g'))||[]).length,4);
  a.set("lang='zh'");a.click({openLesson:id,lessonKind:kind,lessonDate:'2026-10-22'});assert.match(a.nodes['#modal-root'].innerHTML,/切換至星期檢視/);a.click({action:'lesson-week'});assert.equal(a.read('timetableView'),'week');assert.deepEqual(a.read('db'),before);
 }
});

const courseInput=(extra={})=>({courseName:'Watercolour studio',feeName:'Standard fee',category:'Art',level:'Beginner',pricingModel:'monthly-lessons',lessonPrice:'300',duration:'60',lessonMonths:'1',...extra});
function createCourseApp(){const a=app();a.set("role='teacher';lang='en';tab='catalog';location.pathname='/account';render()");return a}
test('course Create opens the reference pricing form while class creation keeps its existing fields',()=>{
 const a=createCourseApp(),before=a.read('db'),background=a.nodes['#app'].innerHTML;
 assert.match(background,/data-action="new-course"/);a.click({action:'new-course'});let html=a.nodes['#modal-root'].innerHTML;
 for(const text of ['Create course','Course overview','Pricing','Booking expiry (from invoice date)','Display in Online Store'])assert.ok(html.includes(text));
 assert.equal((html.match(/type="radio" name="pricingModel"/g)||[]).length,3);assert.match(html,/data-pricing-fields="fixed-monthly" hidden disabled/);assert.match(html,/id="course-expiry-fields"[^>]*disabled/);assert.doesNotMatch(html,/name="classCode"|name="weekdays"|id="class-image"/);
 a.click({action:'close'});assert.equal(a.nodes['#app'].innerHTML,background);assert.deepEqual(a.read('db'),before);
 a.set("lang='zh'");a.click({action:'new-course'});html=a.nodes['#modal-root'].innerHTML;assert.match(html,/課程概覽|總分鐘數/);assert.match(html,/固定月費，不受當月堂數影響/);
 a.click({action:'close'});a.click({action:'new-class'});assert.match(a.nodes['#modal-root'].innerHTML,/id="class-editor"/);assert.match(a.nodes['#modal-root'].innerHTML,/name="weekdays"/);
});
test('each pricing model persists only its own values, expiry and store visibility without making classes',()=>{
 for(const [extra,expected] of [
  [{expiryEnabled:'on',expiryValue:'3',expiryUnit:'months',onlineStore:'on'},{pricingModel:'monthly-lessons',price:300,duration:60,months:1,bookingExpiry:{value:3,unit:'months'},onlineStore:true}],
  [{pricingModel:'fixed-monthly',monthlyPrice:'850',fixedMonths:'2',duration:'bad',packageTotal:'bad'},{pricingModel:'fixed-monthly',price:850,months:2,bookingExpiry:null,onlineStore:false}],
  [{pricingModel:'package',packagePrice:'1200',packageType:'minutes',packageTotal:'240',lessonMonths:'bad'},{pricingModel:'package',price:1200,packageType:'minutes',packageTotal:240,bookingExpiry:null,onlineStore:false}],
  [{pricingModel:'package',packagePrice:'1200',packageType:'lessons',packageTotal:'4'},{pricingModel:'package',price:1200,packageType:'lessons',packageTotal:4,bookingExpiry:null,onlineStore:false}]
 ]){
  const a=createCourseApp(),classes=a.read('db.classes'),bookings=a.read('db.bookings');a.click({action:'new-course'});a.submit('create-course-editor',courseInput(extra),{dataset:{id:''}});
  const record=a.read('db.courseSettings[0]');for(const [key,value] of Object.entries(expected))assert.deepEqual(record[key],value,key);
  assert.equal(record.courseName,'Watercolour studio');assert.equal(record.category,'Art');assert.equal(record.feeName,'Standard fee');assert.deepEqual(a.read('db.classes'),classes);assert.deepEqual(a.read('db.bookings'),bookings);assert.equal(a.read('modal'),'');assert.equal(a.read('db.courseCodes[db.courseSettings[0].id]'),'CO-004');
  if(expected.pricingModel!=='monthly-lessons')assert.equal(record.duration,undefined);if(expected.pricingModel!=='package')assert.equal(record.packageType,undefined);
  const reload=app({'beamal-demo-v1':JSON.stringify(a.read('db'))});assert.deepEqual(reload.read('db.courseSettings[0]'),record);
 }
});
test('invalid prices, duplicate course names, totals and booking expiry never save partial records',()=>{
 for(const extra of [{courseName:'course 1'},{feeName:' '},{lessonPrice:'0'},{lessonPrice:'NaN'},{duration:'1.5'},{lessonMonths:'25'},{pricingModel:'unknown'},{pricingModel:'fixed-monthly',monthlyPrice:'300',fixedMonths:'0'},{pricingModel:'package',packagePrice:'300',packageType:'hours',packageTotal:'4'},{pricingModel:'package',packagePrice:'300',packageType:'lessons',packageTotal:'-1'},{expiryEnabled:'on',expiryValue:'0',expiryUnit:'months'},{expiryEnabled:'on',expiryValue:'1',expiryUnit:'years'}]){
  const a=createCourseApp(),before=a.read('db');a.click({action:'new-course'});a.submit('create-course-editor',courseInput(extra),{dataset:{id:''}});assert.deepEqual(a.read('db'),before);assert.ok(a.nodes['#create-course-error'].textContent,JSON.stringify(extra));assert.ok(a.read('modal'));
 }
 const a=createCourseApp();a.submit('create-course-editor',courseInput({expiryValue:'bad',expiryUnit:'bad'}),{dataset:{id:''}});assert.equal(a.read('db.courseSettings.length'),1);assert.equal(a.read('db.courseSettings[0].bookingExpiry'),null);
 a.submit('create-course-editor',courseInput({courseName:'WATERCOLOUR STUDIO'}),{dataset:{id:''}});assert.equal(a.read('db.courseSettings.length'),1);
});
test('new courses appear in search, fee details and schedules before any lesson exists',()=>{
 const a=createCourseApp();a.submit('create-course-editor',courseInput({onlineStore:'on'}),{dataset:{id:''}});const id=a.read('db.courseSettings[0].id');let html=a.nodes['#app'].innerHTML;
 assert.match(html,/Watercolour studio/);assert.match(html,/Art<\/td><td>Beginner/);assert.match(html,/HK\$300/);assert.match(html,/per lesson · 60 min/);assert.match(html,/>Shown</);
 a.submit('portal-course-search',{search:'watercolour'});assert.equal((a.nodes['#app'].innerHTML.match(/data-open-course=/g)||[]).length,1);a.click({openCourse:id});assert.equal(a.read('accountCourseId()'),id);assert.match(a.nodes['#app'].innerHTML,/No lessons this month/);assert.match(a.nodes['#app'].innerHTML,/Standard fee/);
 a.click({action:'course-add-schedule'});assert.equal(a.read('scheduleDraft.course'),id);assert.match(a.nodes['#modal-root'].innerHTML,new RegExp(`value="${id}" selected`));a.submit('schedule-editor',{course:id,color:'#27777b',startDate:'2026-10-12',endMode:'count',count:'1',time:'10:00',duration:'60',capacity:'8',session:'1'},{dataset:{id:''}});assert.equal(a.read('db.schedules[0].course'),id);assert.equal(a.read('db.classes.length'),6);
 a.click({editCourse:id});assert.match(a.nodes['#modal-root'].innerHTML,/Edit course/);assert.match(a.nodes['#modal-root'].innerHTML,/name="lessonPrice"[^>]*value="300"/);
 a.submit('create-course-editor',courseInput({courseName:'Renamed studio',pricingModel:'fixed-monthly',monthlyPrice:'900',fixedMonths:'1'}),{dataset:{id}});assert.equal(a.read('db.courseSettings.length'),1);assert.equal(a.read('db.courseSettings[0].id'),id);assert.match(a.nodes['#app'].innerHTML,/Renamed studio/);assert.match(a.nodes['#app'].innerHTML,/HK\$900/);
});
test('pricing switches retain entered values, hide and disable inactive modes and relabel package totals',()=>{
 const a=createCourseApp();a.set(`testFields=['monthly-lessons','fixed-monthly','package'].map(key=>({dataset:{pricingFields:key},hidden:false,disabled:false}));testControls={'[name=pricingModel]:checked':{value:'package'},'[name=expiryEnabled]':{checked:true},'#course-expiry-fields':{disabled:true},'[name=packageType]':{value:'lessons'},'#package-total-label':{textContent:''}};testForm={querySelector:key=>testControls[key],querySelectorAll:()=>testFields};syncCoursePricing(testForm)`);
 assert.deepEqual(a.read('testFields.map(f=>[f.hidden,f.disabled])'),[[true,true],[true,true],[false,false]]);assert.equal(a.read("testControls['#course-expiry-fields'].disabled"),false);assert.equal(a.read("testControls['#package-total-label'].textContent"),'No. of visits');
 a.set("testControls['[name=pricingModel]:checked'].value='fixed-monthly';testControls['[name=expiryEnabled]'].checked=false;testControls['[name=packageType]'].value='minutes';syncCoursePricing(testForm)");assert.deepEqual(a.read('testFields.map(f=>[f.hidden,f.disabled])'),[[true,true],[false,false],[true,true]]);assert.equal(a.read("testControls['#course-expiry-fields'].disabled"),true);
});
test('student actions cannot create or edit internal courses and reset clears course settings',()=>{
 const a=createCourseApp();a.submit('create-course-editor',courseInput(),{dataset:{id:''}});const before=a.read('db'),id=before.courseSettings[0].id;a.set("role='student'");a.click({action:'new-course'});a.click({editCourse:id});a.submit('create-course-editor',courseInput({courseName:'Unauthorised edit'}),{dataset:{id}});assert.equal(a.read('modal'),'');assert.deepEqual(a.read('db'),before);
 a.click({action:'reset'});assert.deepEqual(a.read('db.courseSettings'),[]);a.submit('login',{username:'2',password:''});a.click({action:'new-course'});assert.match(a.nodes['#modal-root'].innerHTML,/Create course/);
});

function leadsApp(){const a=app({},'2026-10-09T12:00:00');a.set("role='teacher';lang='en';tab='leads';location.pathname='/account';render()");return a}
const leadInput=(extra={})=>({displayName:'Sample enquiry',stage:'new',promotion:'yes',gender:'',district:'',owner:'',...extra});
test('Leads opens a bilingual empty workspace and the full reference form without creating students',()=>{
 const a=leadsApp(),before=a.read('db');let html=a.nodes['#app'].innerHTML;assert.match(html,/No leads yet/);assert.match(html,/data-action="lead-columns"/);assert.match(html,/Marketing source/);assert.doesNotMatch(html,/data-lead-id=/);
 a.click({action:'lead-create'});html=a.nodes['#modal-root'].innerHTML;for(const text of ['Personal information','Display name *','Student no.','Citizen ID','First name','Last name','Full name','Local name','Gender','Date of birth','Receive promotional email','Name (Contact 1)','Email (Contact 2)','School','Occupation','Enrollment date','Quit date','Bill name','Created Source','Lead information','Stage','Owner','Comments'])assert.ok(html.includes(text),text);assert.match(html,/name="studentNumber"[^>]*disabled/);assert.match(html,/name="promotion"[^]*?value="yes" selected/);
 a.click({action:'close'});assert.deepEqual(a.read('db'),before);a.set("lang='zh';render()");assert.match(a.nodes['#app'].innerHTML,/暫未有潛在客戶/);a.click({action:'lead-create'});assert.match(a.nodes['#modal-root'].innerHTML,/個人資料/);assert.match(a.nodes['#modal-root'].innerHTML,/聯絡人 2 電郵/);
});
test('lead information saves and reloads while edits retain identity, creation date and archive state',()=>{
 const a=leadsApp(),classes=a.read('db.classes'),profiles=a.read('db.studentProfiles'),bookings=a.read('db.bookings');a.submit('lead-editor',leadInput({displayName:'Studio enquiry',firstName:'Sample',lastName:'Person',fullName:'Sample Person',localName:'樣板查詢',email:'sample@example.test',phone:'+852 0000 0000',mobile:'00000000',contact1Name:'Sample contact',contact1Email:'contact@example.test',birthDate:'2015-04-10',district:'kowloon',school:'Sample school',level:'Beginner',occupation:'Student',marketingSource:'Website',detail:'Drawing interest',remark:'Weekends',comments:'Asked about trial lessons'}),{dataset:{id:''}});
 let lead=a.read('db.leads[0]');assert.equal(lead.displayName,'Studio enquiry');assert.equal(lead.contact1Email,'contact@example.test');assert.equal(lead.comments,'Asked about trial lessons');assert.equal(lead.active,true);assert.equal(lead.createdSource,'manual');assert.match(a.nodes['#app'].innerHTML,/Website/);assert.deepEqual(a.read('db.classes'),classes);assert.deepEqual(a.read('db.studentProfiles'),profiles);assert.deepEqual(a.read('db.bookings'),bookings);
 const reload=app({'beamal-demo-v1':JSON.stringify(a.read('db'))});assert.deepEqual(reload.read('db.leads[0]'),lead);a.click({action:'lead-edit',leadId:lead.id});assert.match(a.nodes['#modal-root'].innerHTML,/value="Studio enquiry"/);a.set("db.leads[0].active=false");a.submit('lead-editor',leadInput({displayName:'Renamed enquiry',stage:'contacted',promotion:'no'}),{dataset:{id:lead.id}});assert.equal(a.read('db.leads.length'),1);assert.equal(a.read('db.leads[0].id'),lead.id);assert.equal(a.read('db.leads[0].createdAt'),lead.createdAt);assert.equal(a.read('db.leads[0].active'),false);assert.equal(a.read('db.leads[0].promotion'),'no');
});
test('invalid lead information never saves partial data and unknown edit ids cannot create records',()=>{
 for(const extra of [{displayName:' '},{email:'bad-email'},{contact2Email:'missing-domain@'},{birthDate:'2027-01-01'},{birthDate:'2026-02-30'},{stage:'unrecognised'},{promotion:'maybe'},{owner:'Unknown owner'},{gender:'invalid'},{district:'invalid'},{comments:'x'.repeat(4001)}]){const a=leadsApp(),before=a.read('db');a.click({action:'lead-create'});a.submit('lead-editor',leadInput(extra),{dataset:{id:''}});assert.deepEqual(a.read('db'),before);assert.ok(a.nodes['#lead-editor-error'].textContent,JSON.stringify(extra));assert.ok(a.read('modal'))}
 const a=leadsApp();a.submit('lead-editor',leadInput(),{dataset:{id:'missing'}});assert.equal(a.read('db.leads.length'),0);a.submit('lead-editor',leadInput(),{dataset:{id:''}});assert.equal(a.read('db.leads.length'),1);
});
test('lead search and filters combine and selected leads can be reversibly archived and restored',()=>{
 const a=leadsApp();for(const values of [{displayName:'Alpha enquiry',level:'Beginner',stage:'new',email:'alpha@example.test'},{displayName:'Beta enquiry',level:'Advanced',stage:'contacted',phone:'12345678'},{displayName:'Gamma enquiry',level:'Beginner',stage:'contacted'}])a.submit('lead-editor',leadInput(values),{dataset:{id:''}});
 a.submit('lead-search-form',{search:'ALPHA@'});assert.deepEqual(a.read('filteredLeads().map(lead=>lead.displayName)'),['Alpha enquiry']);a.click({action:'lead-clear-filters'});a.change('','contacted',{id:'lead-stage-filter'});a.change('','Beginner',{id:'lead-level-filter'});assert.deepEqual(a.read('filteredLeads().map(lead=>lead.displayName)'),['Gamma enquiry']);
 a.change('lead-selection',a.read('db.leads[2].id'),{checked:true});a.click({action:'lead-archive'});assert.equal(a.read('db.leads[2].active'),false);assert.equal(a.read('db.leads[0].active'),true);assert.equal(a.read('filteredLeads().length'),0);a.change('','archived',{id:'lead-status'});assert.equal(a.read('filteredLeads().length'),1);a.change('', '',{id:'lead-select-all',checked:true});a.click({action:'lead-restore'});assert.equal(a.read('db.leads[2].active'),true);assert.equal(a.read('filteredLeads().length'),0);a.click({action:'lead-clear-filters'});assert.equal(a.read('filteredLeads().length'),3);
 a.submit('lead-search-form',{search:'unmatched'});assert.match(a.nodes['#app'].innerHTML,/No matching leads/);
});
test('Columns uses three-line drag handles and saves ordering and visibility only after OK',()=>{
 const a=leadsApp(),before=a.read('db');a.click({action:'lead-columns'});let html=a.nodes['#modal-root'].innerHTML;assert.match(html,/Drag the three-line handle/);assert.match(html,/M4 6h16M4 12h16M4 18h16/);assert.equal((html.match(/data-lead-column-handle=/g)||[]).length,11);assert.doesNotMatch(html,/data-action="lead-move-up"|data-action="lead-move-down"/);
 a.set("moveLeadColumnDraft('email',0)");a.click({action:'lead-hide-column',columnKey:'phone'});a.click({action:'lead-show-column',columnKey:'citizenId'});a.click({action:'lead-show-column',columnKey:'citizenId'});assert.equal(a.read("leadColumnDraft.filter(key=>key==='citizenId').length"),1);a.click({action:'lead-hide-column',columnKey:'displayName'});assert.ok(a.read("leadColumnDraft.includes('displayName')"));assert.deepEqual(a.read('db'),before);
 a.click({action:'close'});assert.equal(a.read('leadColumnDraft'),null);assert.deepEqual(a.read('db'),before);a.click({action:'lead-columns'});assert.deepEqual(a.read('leadColumnDraft'),a.read('defaultLeadColumns'));
 a.set("moveLeadColumnDraft('email',0)");a.click({action:'lead-hide-column',columnKey:'phone'});a.click({action:'lead-show-column',columnKey:'citizenId'});const draft=a.read('leadColumnDraft');a.click({action:'lead-columns-save'});assert.deepEqual(a.read('db.leadColumns'),draft);assert.equal(a.read('modal'),'');html=a.nodes['#app'].innerHTML;assert.ok(html.indexOf('<th>Email</th>')<html.indexOf('<th>Name</th>'));assert.doesNotMatch(html,/<th>Phone<\/th>/);assert.match(html,/<th>Citizen ID<\/th>/);const reload=app({'beamal-demo-v1':JSON.stringify(a.read('db'))});assert.deepEqual(reload.read('shownLeadColumns()'),draft);
});
test('column keyboard movement and malformed saved settings retain every column once and keep Name visible',()=>{
 const a=leadsApp();assert.deepEqual(a.read("normaliseLeadColumns(['email','email','unknown','phone'])"),['displayName','email','phone']);a.click({action:'lead-columns'});
 a.keydown('ArrowUp',{target:{closest:()=>({dataset:{leadColumnHandle:'email'}})}});assert.equal(a.read("leadColumnDraft.indexOf('email')"),2);a.keydown('Home',{target:{closest:()=>({dataset:{leadColumnHandle:'email'}})}});assert.equal(a.read('leadColumnDraft[0]'),'email');a.keydown('End',{target:{closest:()=>({dataset:{leadColumnHandle:'email'}})}});assert.equal(a.read('leadColumnDraft.at(-1)'),'email');a.set("moveLeadColumnDraft('email',500)");assert.equal(a.read('leadColumnDraft.length'),11);assert.equal(a.read('new Set(leadColumnDraft).size'),11);a.keydown('Escape');assert.equal(a.read('leadColumnDraft'),null);assert.equal(a.read('modal'),'');assert.deepEqual(a.read('shownLeadColumns()'),a.read('defaultLeadColumns'));
});
test('lead content is escaped and student actions cannot access or change manager records',()=>{
 const a=leadsApp();a.submit('lead-editor',leadInput({displayName:'<img src=x>',comments:'<script>alert(1)</script>'}),{dataset:{id:''}});assert.match(a.nodes['#app'].innerHTML,/&lt;img src=x&gt;/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/<script>alert/);const before=a.read('db');a.set("role='student';tab='overview';render()");for(const action of ['lead-create','lead-edit','lead-columns','lead-columns-save','lead-hide-column','lead-show-column','lead-archive','lead-restore'])a.click({action,leadId:before.leads[0].id,columnKey:'email'});a.submit('lead-editor',leadInput({displayName:'Changed'}),{dataset:{id:before.leads[0].id}});assert.deepEqual(a.read('db'),before);assert.equal(a.read('modal'),'');a.click({tab:'leads'});assert.equal(a.read('tab'),'overview');assert.doesNotMatch(a.nodes['#app'].innerHTML,/&lt;img src=x&gt;/);
 a.click({action:'reset'});assert.deepEqual(a.read('db.leads'),[]);assert.deepEqual(a.read('shownLeadColumns()'),a.read('defaultLeadColumns'));a.submit('login',{username:'2',password:''});a.click({tab:'leads'});assert.match(a.nodes['#app'].innerHTML,/暫未有潛在客戶|No leads yet/);
});
test('pointer reordering changes only the column draft, and cancelling restores the prior order',()=>{
 const a=leadsApp();a.click({action:'lead-columns'});a.set(`
 testRows=leadColumnDraft.map(key=>({dataset:{leadColumn:key},classList:{add(){}},getBoundingClientRect:()=>{let index=testRows.findIndex(row=>row.dataset.leadColumn===key);return {top:100+index*60,height:60}}}));
 testList={querySelectorAll:()=>testRows,insertBefore:(source,target)=>{testRows=testRows.filter(row=>row!==source);let index=target?testRows.indexOf(target):testRows.length;testRows.splice(index,0,source)}};
 testCapture={scrollTop:0,getBoundingClientRect:()=>({top:60,bottom:900}),setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){}};
 testHandle={dataset:{leadColumnHandle:'email'},setAttribute(){},closest:()=>testRows.find(row=>row.dataset.leadColumn==='email')};
 document.querySelectorOriginal=document.querySelector;document.querySelector=key=>key==='#lead-shown-columns'?testList:key==='#lead-columns-body'?testCapture:document.querySelectorOriginal(key);
 startLeadColumnDrag({target:{closest:()=>testHandle},button:0,pointerId:7,clientX:700,clientY:310,preventDefault(){}});
 moveLeadColumnDrag({pointerId:8,clientX:700,clientY:110,preventDefault(){}});
 `);assert.equal(a.read("leadColumnDraft.indexOf('email')"),3);a.set("moveLeadColumnDrag({pointerId:7,clientX:700,clientY:110,preventDefault(){}})");assert.equal(a.read('leadColumnDraft[0]'),'email');assert.equal(a.read('testRows[0].dataset.leadColumn'),'email');assert.equal(a.read('db.leadColumns'),null);
 a.set("finishLeadColumnDrag(true)");assert.equal(a.read('leadColumnDrag'),null);assert.deepEqual(a.read('leadColumnDraft'),a.read('defaultLeadColumns'));a.set("startLeadColumnDrag({target:{closest:()=>testHandle},button:0,pointerId:7,clientX:700,clientY:310,preventDefault(){}});moveLeadColumnDrag({pointerId:7,clientX:700,clientY:110,preventDefault(){}});finishLeadColumnDrag()");assert.equal(a.read('leadColumnDraft[0]'),'email');a.click({action:'lead-columns-save'});assert.equal(a.read('db.leadColumns[0]'),'email');
});
test('saving a new lead clears incompatible filters so the saved lead is visible immediately',()=>{
 const a=leadsApp();a.set("leadSearch='No match';leadStageFilter='contacted';leadLevelFilter='Advanced';leadStatusFilter='archived'");a.submit('lead-editor',leadInput({displayName:'New enquiry',level:'Beginner'}),{dataset:{id:''}});assert.deepEqual(a.read('filteredLeads().map(lead=>lead.displayName)'),['New enquiry']);assert.equal(a.read('leadSearch'),'');assert.equal(a.read('leadStatusFilter'),'active');
});

test('timetable selector retains Day Week Month List alongside consecutive Range and Month navigates leap years and short months',()=>{
 const a=lessonApp();let html=a.nodes['#app'].innerHTML,select=html.match(/<select id="tt-view"[\s\S]*?<\/select>/)[0],views=[...select.matchAll(/<option value="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(views.filter(view=>view!=='range'),['day','week','month','list']);assert.equal(views.filter(view=>view==='range').length,1);
 a.change('','month',{id:'tt-view'});assert.equal(a.read('timetableView'),'month');assert.equal(a.read('timetableDate'),'2026-10-08');html=a.nodes['#app'].innerHTML;assert.match(html,/Monthly lesson calendar/);assert.match(html,/October 2026/);assert.match(html,/Previous month/);assert.equal(a.read('timetableMonthDates().length'),35);assert.equal(a.read('timetableDateKey(timetableMonthDates()[0])'),'2026-09-28');assert.equal(a.read('timetableDateKey(timetableMonthDates().at(-1))'),'2026-11-01');
 a.set("selectTimetableDate('2028-01-31')");a.click({action:'tt-next'});assert.equal(a.read('timetableDate'),'2028-02-29');assert.equal(a.read('timetableDays().length'),29);assert.equal(a.read('timetableMonthDates().length%7'),0);a.click({action:'tt-next'});assert.equal(a.read('timetableDate'),'2028-03-29');
 a.set("selectTimetableDate('2026-12-31')");a.click({action:'tt-next'});assert.equal(a.read('timetableDate'),'2027-01-31');a.click({action:'tt-next'});assert.equal(a.read('timetableDate'),'2027-02-28');
 for(const view of ['day','week','list']){a.change('',view,{id:'tt-view'});assert.equal(a.read('timetableDate'),'2027-02-28');assert.equal(a.read('timetableView'),view)}a.change('','invalid',{id:'tt-view'});assert.equal(a.read('timetableView'),'list');
 a.set("lang='zh';timetableView='month';render()");assert.match(a.nodes['#app'].innerHTML,/月份課堂月曆/);assert.match(a.nodes['#app'].innerHTML,/月份<\/option>/);
});
test('Month displays real occurrences, respects filters and opens the matching lesson without reopening sidebars',()=>{
 const a=lessonApp();a.set("db.classes=[];db.schedules.push({id:'S-MONTH',course:'art',startDate:'2026-10-08',endMode:'count',count:4,weekdays:[4],time:'10:00',duration:45,color:'#8fc34a',session:1,teacher:'Teacher 1',room:'Room A'});timetableFiltersVisible=false;portalMenu=true;timetableSelections.rooms=['Room A'];timetableSearch='10:00';timetableLessonFilter={id:'S-MONTH',kind:'schedule'};timetableHideEmpty=true");const before=a.read('db');a.change('','month',{id:'tt-view'});let html=a.nodes['#app'].innerHTML;assert.equal((html.match(/data-open-lesson="S-MONTH"/g)||[]).length,4);assert.equal((html.match(/class="tt-month-day /g)||[]).length,35);assert.match(html,/tt-workspace filters-hidden/);assert.match(html,/10:00 – 10:45/);assert.match(html,/id="tt-hide-empty" type="checkbox" disabled/);
 a.click({openLesson:'S-MONTH',lessonKind:'schedule',lessonDate:'2026-10-22'});assert.equal(a.read('selectedTimetableLesson.date'),'2026-10-22');assert.match(a.nodes['#modal-root'].innerHTML,/#3 · Course 1/);a.click({action:'lesson-close'});a.click({ttDate:'2026-10-22'});assert.equal(a.read('timetableView'),'month');assert.equal(a.read('timetableDate'),'2026-10-22');assert.equal(a.read('timetableFiltersVisible'),false);assert.equal(a.read('portalMenu'),true);assert.equal(a.read('timetableSearch'),'10:00');
 a.set("timetableSearch='no match';render()");assert.match(a.nodes['#app'].innerHTML,/No lessons match your search/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-open-lesson=/);a.set("timetableSearch='';timetableSelections.rooms=['Other'];render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-open-lesson=/);assert.deepEqual(a.read('db'),before);
 a.set("role='student';render()");a.change('','week',{id:'tt-view'});assert.equal(a.read('timetableView'),'month');assert.doesNotMatch(a.nodes['#app'].innerHTML,/id="tt-view"|tt-month-calendar/);
});
test('Month does not invent legacy lessons before their start date and keeps adjacent dates chronological',()=>{
 const a=lessonApp();a.set("timetableView='month';timetableLessonFilter={id:'e',kind:'class'};render()");let html=a.nodes['#app'].innerHTML;assert.equal((html.match(/data-open-lesson="e"/g)||[]).length,4);assert.doesNotMatch(html,/data-lesson-date="2026-10-01"/);a.set("selectTimetableDate('2026-08-08');render()");assert.equal(a.read('timetableMonthDates().length'),42);assert.equal(a.read('timetableDateKey(timetableMonthDates()[0])'),'2026-07-27');assert.equal(a.read('timetableDateKey(timetableMonthDates().at(-1))'),'2026-09-06');assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-open-lesson="e"/);
});

test('End defaults to Repeat Forever and opens an isolated recurrence draft with selected start weekday',()=>{
 const a=scheduleApp();const before=a.read('scheduleDraft'),form=a.nodes['#modal-root'].innerHTML;assert.match(form,/id="schedule-end-summary"/);assert.doesNotMatch(form,/<select name="endMode"/);assert.equal(a.read('scheduleDraft.mustAttendAll'),true);a.click({action:'schedule-end-open'});let html=a.nodes['#schedule-end-layer'].innerHTML;for(const text of ['End Date','Repeat on','Must the student attend all days?','Yes','No, students can enroll in selected days separately','Ends','Never ends','Ends on','Ends after','sessions','OK'])assert.ok(html.includes(text),text);assert.match(html,/name="endWeekday" value="4"[^>]*checked/);assert.equal((html.match(/name="endWeekday"/g)||[]).length,7);assert.match(html,/name="mustAttendAll" value="yes" checked/);assert.match(html,/name="endMode" value="forever" checked/);assert.equal(a.nodes['.schedule-modal'].inert,true);
 a.change('endWeekday','1',{checked:true});a.change('endMode','count');a.change('count','4');a.change('mustAttendAll','no');assert.deepEqual(a.read('scheduleDraft'),before);assert.equal(a.nodes['#modal-root'].innerHTML,form);a.click({action:'schedule-end-close'});assert.deepEqual(a.read('scheduleDraft'),before);assert.equal(a.read('scheduleEndDraft'),null);assert.equal(a.nodes['.schedule-modal'].inert,false);
 a.click({action:'schedule-end-open'});a.change('endMode','date');a.change('endDate','2026-10-29');a.keydown('Escape');assert.equal(a.read('scheduleEndDraft'),null);assert.ok(a.read('modal').includes('schedule-editor'));assert.deepEqual(a.read('scheduleDraft'),before);
});
test('End OK applies multi-day recurrence and attendance preference, and save/edit/reload preserves them',()=>{
 const a=scheduleApp();a.input({name:'remark',value:'Keep this note',closest:()=>({})});a.click({action:'schedule-end-open'});a.change('endWeekday','1',{checked:true});a.change('endMode','count');a.change('count','4');a.change('mustAttendAll','no');a.submit('schedule-end-editor',{endMode:'count',count:'4',mustAttendAll:'no'});assert.equal(a.read('scheduleEndDraft'),null);assert.deepEqual(a.read('scheduleDraft.weekdays'),[1,4]);assert.equal(a.read('scheduleDraft.mustAttendAll'),false);assert.equal(a.read('scheduleDraft.remark'),'Keep this note');assert.equal(a.nodes['#schedule-end-summary'].textContent,'Ends after 4 sessions');assert.equal(a.nodes['#schedule-editor [name="count"]'].value,4);assert.deepEqual(a.read('schedulePreviewDates(scheduleDraft)'),['2026-10-08','2026-10-12','2026-10-15','2026-10-19']);
 const bookings=a.read('db.bookings');a.submit('schedule-editor',scheduleValues({endMode:'count',count:'4',remark:'Keep this note'}),{dataset:{id:''}});const saved=a.read('db.schedules[0]');assert.equal(saved.mustAttendAll,false);assert.deepEqual(saved.weekdays,[1,4]);assert.deepEqual(a.read('db.bookings'),bookings);a.click({editSchedule:saved.id});a.click({action:'schedule-end-open'});assert.equal(a.read('scheduleEndDraft.mustAttendAll'),false);assert.equal(a.read('scheduleEndDraft.count'),4);assert.deepEqual(a.read('scheduleEndDraft.weekdays'),[1,4]);a.click({action:'schedule-end-close'});a.click({action:'close'});
 const reloaded=app({'beamal-demo-v1':a.read('localStorage.getItem(K)')});assert.deepEqual(reloaded.read('db.schedules[0]'),saved);a.set("role='student'");a.click({action:'schedule-end-open'});assert.equal(a.read('scheduleEndDraft'),null);
});
test('End rejects empty weekdays, invalid date ranges and counts without applying changes',()=>{
 const a=scheduleApp(),before=a.read('scheduleDraft');a.click({action:'schedule-end-open'});a.change('endWeekday','4',{checked:false});a.submit('schedule-end-editor',{endMode:'forever'});assert.match(a.nodes['#schedule-end-error'].textContent,/at least one/);assert.deepEqual(a.read('scheduleDraft'),before);a.change('endWeekday','4',{checked:true});
 for(const endDate of ['','2026-10-07','2026-02-30']){a.submit('schedule-end-editor',{endMode:'date',endDate});assert.match(a.nodes['#schedule-end-error'].textContent,/End date/);assert.deepEqual(a.read('scheduleDraft'),before)}
 for(const count of ['0','1.5','1000']){a.submit('schedule-end-editor',{endMode:'count',count});assert.match(a.nodes['#schedule-end-error'].textContent,/whole number/);assert.deepEqual(a.read('scheduleDraft'),before)}
 a.change('endWeekday','4',{checked:false});a.change('endWeekday','1',{checked:true});a.submit('schedule-end-editor',{endMode:'date',endDate:'2026-10-09'});assert.match(a.nodes['#schedule-end-error'].textContent,/No lessons/);assert.deepEqual(a.read('scheduleDraft'),before);
 a.submit('schedule-end-editor',{endMode:'date',endDate:'2026-10-19',mustAttendAll:'yes'});assert.equal(a.read('scheduleDraft.endMode'),'date');assert.deepEqual(a.read('schedulePreviewDates(scheduleDraft)'),['2026-10-12','2026-10-19']);assert.match(a.nodes['#schedule-end-summary'].textContent,/19 Oct 2026/);
 a.click({action:'schedule-end-open'});a.submit('schedule-editor',scheduleValues(),{dataset:{id:''}});assert.equal(a.read('db.schedules.length'),0);a.click({action:'close'});assert.ok(a.read('scheduleEndDraft'),'The inert parent close cannot discard the nested End draft');a.keydown('Escape');assert.equal(a.read('scheduleEndDraft'),null);assert.ok(a.read('scheduleDraft'));a.click({action:'close'});assert.equal(a.read('scheduleDraft'),null);
});
test('End is bilingual and older schedules default to attending all selected weekdays',()=>{
 const a=scheduleApp();a.click({action:'close'});a.set("lang='zh';db.schedules.push({id:'OLD',course:'art',startDate:'2026-10-08',endMode:'forever',endDate:'',count:1,weekdays:[4],time:'10:00',duration:45,color:'#27777b',session:1})");a.click({editSchedule:'OLD'});a.click({action:'schedule-end-open'});assert.equal(a.read('scheduleEndDraft.mustAttendAll'),true);const html=a.nodes['#schedule-end-layer'].innerHTML;for(const text of ['結束日期','重複星期','學生必須出席所有日子嗎？','永不結束','完成以下次數後','確定'])assert.ok(html.includes(text),text);a.keydown('Escape');a.keydown('Escape');assert.equal(a.read('scheduleDraft'),null);assert.equal(a.read('modal'),'');
});

test('Edit Activity opens the Schedule form for legacy slots and keeps class identity and bookings on Save',()=>{
 const a=lessonApp(),before=a.read('db'),original=before.classes.find(c=>c.id==='e');a.click({openLesson:'e',lessonKind:'class',lessonDate:'2026-10-15'});a.click({action:'lesson-edit'});let html=a.nodes['#modal-root'].innerHTML;for(const text of ['Edit Course 2','Course overview','Schedule','Additional information (optional)','Save','Delete','HK$1,200'])assert.ok(html.includes(text),text);assert.doesNotMatch(html,/id="class-editor"|Class photo|name="classCode"/);assert.equal(a.read('scheduleDraft.sourceKind'),'class');assert.equal(a.read('scheduleDraft.id'),'e');assert.equal(a.read('scheduleDraft.startDate'),'2026-10-08');assert.equal(a.read('scheduleDraft.time'),'15:00');assert.equal(a.read('scheduleDraft.duration'),'');assert.equal(a.read('scheduleDraft.capacity'),6);assert.deepEqual(a.read('db'),before);a.click({action:'close'});assert.deepEqual(a.read('db'),before);
 a.click({openLesson:'e',lessonKind:'class',lessonDate:'2026-10-15'});a.click({action:'lesson-edit'});a.click({action:'schedule-end-open'});a.change('endWeekday','1',{checked:true});a.submit('schedule-end-editor',{endMode:'count',count:'3',mustAttendAll:'no'});a.submit('schedule-editor',scheduleValues({course:'story',time:'15:00',duration:'45',capacity:'6',endMode:'count',count:'3',remark:'Bring paper',detail:'Lesson detail',moreInfo:'Student note'}),{dataset:{id:'e'}});
 const edited=a.read("cl('e')");assert.equal(edited.id,original.id);assert.equal(edited.occupied,original.occupied);assert.equal(edited.lessonsPerTerm,original.lessonsPerTerm);assert.equal(a.read('classNumber(cl("e"))'),'CL-005');assert.equal(edited.duration,45);assert.equal(edited.activitySchedule,true);assert.deepEqual(edited.weekdays,[1,4]);assert.equal(edited.mustAttendAll,false);assert.equal(a.read('db.schedules.length'),0);assert.equal(a.read('db.classes.length'),6);assert.equal(a.read('db.next'),before.next);assert.deepEqual(a.read('db.bookings'),before.bookings);assert.equal(a.read("classOccursOn(cl('e'),'2026-10-15')"),true);assert.equal(a.read("classOccursOn(cl('e'),'2026-10-22')"),false);assert.equal(a.read("classOccursOn(cl('e'),'2026-10-01')"),false);
 a.set("courseDetailMonth=new Date(2026,9,1)");assert.deepEqual(a.read("courseMonthDates(cl('e'))"),['2026-10-08','2026-10-12','2026-10-15']);a.click({openLesson:'e',lessonKind:'class',lessonDate:'2026-10-15'});a.click({action:'lesson-edit'});assert.equal(a.read('scheduleDraft.remark'),'Bring paper');assert.equal(a.read('scheduleDraft.count'),3);assert.equal(a.read('scheduleDraft.duration'),45);
});
test('Edit Activity for a saved schedule shows actual course fees and changes only that schedule',()=>{
 const a=scheduleApp();a.submit('schedule-editor',scheduleValues({time:'10:00',duration:'45',endMode:'date',endDate:'2026-10-29'}),{dataset:{id:''}});let id=a.read('db.schedules[0].id');a.set("db.courseSettings.push({id:'art',courseName:'Course 1',feeName:'Standard fee',pricingModel:'monthly-lessons',duration:60,months:1,price:300})");const before=a.read('db');a.click({openLesson:id,lessonKind:'schedule',lessonDate:'2026-10-08'});a.click({action:'lesson-edit'});const html=a.nodes['#modal-root'].innerHTML;assert.match(html,/Edit Course 1/);assert.match(html,/Standard fee/);assert.match(html,/per lesson · 60 min · 1 month/);assert.match(html,/HK\$300/);assert.equal(a.read('scheduleDraft.endDate'),'2026-10-29');a.submit('schedule-editor',scheduleValues({time:'11:00',duration:'60',endMode:'date',endDate:'2026-10-29'}),{dataset:{id}});assert.equal(a.read('db.schedules.length'),1);assert.equal(a.read('db.schedules[0].id'),id);assert.equal(a.read('db.schedules[0].time'),'11:00');assert.deepEqual(a.read('db.classes'),before.classes);assert.deepEqual(a.read('db.bookings'),before.bookings);assert.deepEqual(a.read('db.courseSettings'),before.courseSettings);
 a.set("db.classes[0].courseName='<img src=x onerror=alert(1)>'");a.click({openLesson:id,lessonKind:'schedule',lessonDate:'2026-10-08'});a.click({action:'lesson-edit'});assert.match(a.nodes['#modal-root'].innerHTML,/Edit &lt;img/);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/<h2[^>]*>Edit <img/);
});
test('legacy activity Save validates capacity and occupied times and cannot save a different class ID',()=>{
 const a=lessonApp(),before=a.read('db');a.click({openLesson:'e',lessonKind:'class',lessonDate:'2026-10-08'});a.click({action:'lesson-edit'});a.submit('schedule-editor',scheduleValues({course:'story',time:'15:00',capacity:'5'}),{dataset:{id:'e'}});assert.match(a.nodes['#schedule-error'].textContent,/occupied/);assert.deepEqual(a.read('db'),before);a.submit('schedule-editor',scheduleValues({course:'story',time:'15:00',capacity:'6'}),{dataset:{id:'c'}});assert.deepEqual(a.read('db'),before);
 a.set("scheduleDraft.weekdays=[5]");a.submit('schedule-editor',scheduleValues({course:'story',time:'13:00',capacity:'6'}),{dataset:{id:'e'}});assert.match(a.nodes['#schedule-error'].textContent,/Another class/);assert.deepEqual(a.read('db'),before);a.set("role='student'");a.submit('schedule-editor',scheduleValues({capacity:'20'}),{dataset:{id:'e'}});assert.deepEqual(a.read('db'),before);
});
test('Delete Activity is reversible across reloads and retains class IDs, bookings and payment records',()=>{
 const a=lessonApp();a.set("db.schedules.push({id:'S-DELETE',course:'art',startDate:'2026-10-08',endMode:'count',count:4,weekdays:[4],time:'10:00',duration:45,color:'#27777b',session:1})");const before=a.read('db'),bookedDates=a.read('bookingLessonDates(db.bookings[0])');
 for(const [id,kind,date] of [['a','class','2026-10-05'],['S-DELETE','schedule','2026-10-08']]){a.click({openLesson:id,lessonKind:kind,lessonDate:date});a.click({action:'lesson-edit'});a.click({action:'activity-delete'});assert.equal(a.read('modal'),'');assert.match(a.nodes['#app'].innerHTML,/data-action="activity-undo"/);assert.doesNotMatch(a.nodes['#app'].innerHTML,new RegExp(`data-open-lesson="${id}"`));assert.deepEqual(a.read('db.bookings'),before.bookings)}
 assert.equal(a.read("cl('a').activityDeleted"),true);assert.equal(a.read("bookable(cl('a'))"),false);assert.equal(a.read("nextClassDate(cl('a'))"),'');assert.deepEqual(a.read('bookingLessonDates(db.bookings[0])'),bookedDates);assert.equal(a.read('db.classes.length'),before.classes.length);assert.equal(a.read('db.schedules.length'),1);a.set("courseDetailMonth=new Date(2026,9,1)");assert.deepEqual(a.read("courseMonthDates(cl('a'))"),[]);
 const b=app({'beamal-demo-v1':a.read('localStorage.getItem(K)')},'2026-10-08T12:00:00');b.set("role='teacher';lang='en';tab='overview';location.pathname='/account';selectTimetableDate('2026-10-08');render()");assert.match(b.nodes['#app'].innerHTML,/Undo/);b.click({action:'activity-undo'});assert.equal(b.read('db.schedules[0].activityDeleted??false'),false);b.click({action:'activity-undo'});assert.equal(b.read("cl('a').activityDeleted??false"),false);assert.deepEqual(b.read('db.bookings'),before.bookings);assert.deepEqual(b.read('db.classes'),before.classes);assert.deepEqual(b.read('db.schedules'),before.schedules);assert.doesNotMatch(b.nodes['#app'].innerHTML,/data-action="activity-undo"/);
 b.set("role='student'");b.click({action:'activity-delete'});b.click({action:'activity-undo'});assert.deepEqual(b.read('db.bookings'),before.bookings);
});
test('Course Schedule edit pencils use the same form and preserve bilingual controls',()=>{
 const a=lessonApp();a.click({openCourse:'story'});const html=a.nodes['#app'].innerHTML;assert.match(html,/data-edit-activity="e" data-activity-kind="class"/);a.click({editActivity:'e',activityKind:'class'});assert.match(a.nodes['#modal-root'].innerHTML,/Edit Course 2/);assert.match(a.nodes['#modal-root'].innerHTML,/id="schedule-editor"/);a.click({action:'close'});a.set("lang='zh'");a.click({editActivity:'e',activityKind:'class'});const edit=a.nodes['#modal-root'].innerHTML;for(const text of ['修改 Course 2','課程概覽','附加資料（可選）','刪除','儲存'])assert.ok(edit.includes(text),text);a.click({action:'close'});assert.equal(a.read('location.pathname'),'/account/courses/story');
});

const sharedTestUser={id:'qa-admin',email:'qa-admin@example.test',displayName:'QA Manager',role:'admin'};
const sharedTestFee={id:'qa-fee',feeCode:'FE-701',feeName:'Shared lesson fee',category:'Tuition',pricingModel:'monthly-lessons',price:300,months:24,duration:60,bookingExpiry:null,onlineStore:true,courseIds:['qa-course'],version:1,createdAt:'2026-10-14T00:00:00Z',updatedAt:'2026-10-14T00:00:00Z'};
const sharedTestCourse={id:'qa-course',courseCode:'CO-701',courseName:'Shared studio',category:'Art',level:'Beginner',feeIds:['qa-fee'],fees:[sharedTestFee],feeName:sharedTestFee.feeName,pricingModel:sharedTestFee.pricingModel,price:sharedTestFee.price,months:24,duration:60,bookingExpiry:null,onlineStore:true,version:1,createdAt:'2026-10-14T00:00:00Z',updatedAt:'2026-10-14T00:00:00Z'};
const copy=value=>JSON.parse(JSON.stringify(value));
const serviceError=(status,code,message='Test service rejected the request')=>Object.assign(new Error(message),{status,code});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}};

async function sharedApp(overrides={},seed={},options={}){
 const state={user:copy(sharedTestUser),courses:[copy(sharedTestCourse)],fees:[copy(sharedTestFee)]},calls=[];
 const client={
  health:async()=>({mode:'shared-test'}),session:async()=>({user:copy(state.user),csrfToken:'qa-csrf'}),
  login:async()=>({user:copy(state.user),csrfToken:'qa-csrf'}),logout:async()=>({user:null}),
  courses:async()=>({courses:copy(state.courses)}),fees:async()=>({fees:copy(state.fees)}),
  async saveFee(record,current){
   calls.push({operation:'saveFee',record:copy(record),current:current?copy(current):null});
   const saved={...record,id:current?.id||'qa-created-fee',feeCode:current?'FE-701':'FE-702',version:current?current.version+1:1,createdAt:'2026-10-14T00:00:00Z',updatedAt:'2026-10-14T01:00:00Z'};
   state.fees=state.fees.filter(f=>f.id!==saved.id);state.fees.push(saved);
   state.courses=state.courses.map(c=>record.courseIds.includes(c.id)?{...c,version:c.version+1,fees:[...c.fees.filter(f=>f.id!==saved.id),saved],feeIds:[...new Set([...c.feeIds,saved.id])]}:c);
   return {fee:copy(saved),courses:copy(state.courses.filter(c=>record.courseIds.includes(c.id)))};
  },
  async updateCourseMetadata(id,fields){calls.push({operation:'metadata',id,fields:copy(fields)});state.courses=state.courses.map(c=>c.id===id?{...c,...fields,version:c.version+1}:c);return {course:copy(state.courses.find(c=>c.id===id))}},
  async saveCourse(record,current){calls.push({operation:'saveCourse',record:copy(record),current:current?copy(current):null});const saved={...record,id:current?.id||'qa-created-course',courseCode:'CO-702',version:1,createdAt:'2026-10-14T00:00:00Z',updatedAt:'2026-10-14T00:00:00Z',fees:[],feeIds:[]};state.courses.push(saved);return {course:copy(saved)}},
  ...overrides,
 };
 const a=app(seed,'2026-10-14T12:00:00',false,client,options);
 for(let turn=0;turn<30&&!a.read('sharedReady');turn++)await Promise.resolve();
 assert.equal(a.read('sharedReady'),true,'Shared service bootstrap did not complete');
 assert.equal(a.read('sharedMode'),true);
 a.set("lang='en';tab='catalog';location.pathname='/account';render()");
 const messages=[];a.ctx.document.body.append=node=>messages.push(node.textContent);
 return {...a,client,state,calls,messages};
}

function sharedForm(id,{recordId='',version='',courseIds=['qa-course']}={}){
 const submit={disabled:false,textContent:'Create',focus(){}},cancel={disabled:false},attributes={};
 return {id,dataset:{id:recordId,version},values:{},submitButton:submit,attributes,
  querySelector:()=>submit,
  querySelectorAll:selector=>selector==='[name=courseIds]'?courseIds.map(value=>({value})):[cancel,submit],
  setAttribute:(key,value)=>attributes[key]=String(value),removeAttribute:key=>delete attributes[key],
 };
}
const sharedFeeInput=()=>({feeName:'Shared lesson fee',category:'Tuition',pricingModel:'monthly-lessons',lessonPrice:'300',lessonMonths:'24',duration:'60',onlineStore:'on'});

async function feePricingApp(){
 const a=await sharedApp();a.set("tab='fees';location.pathname='/account/fees';openFeeEditor('qa-fee')");
 const root=a.nodes['#modal-root'],parentHtml=root.innerHTML,attributes={},focus=[];
 const parent={inert:false,isConnected:true,draft:{feeName:'Unsent name',lessonPrice:'0',courseIds:['qa-course','other-course'],operationKey:'original-key',error:'Existing field error'},scrollTop:213,setAttribute:(key,value)=>attributes[key]=value,removeAttribute:key=>delete attributes[key]};
 const opener={dataset:{action:'fee-pricing-open'},focus:options=>focus.push(options)};
 a.ctx.document.activeElement=opener;
 a.nodes['#fee-editor']={dataset:{id:'qa-fee',version:'1',operationKey:'original-key'},closest:()=>parent};
 root.insertAdjacentHTML=(position,html)=>{assert.equal(position,'beforeend');root.innerHTML+=html;};
 const child={remove(){root.innerHTML=parentHtml;}};
 a.nodes['.fee-pricing-dialog']={closest:()=>child};
 return {...a,parent,attributes,focus,opener,parentHtml};
}
test('fee pricing child returns the same unsaved editor node and scroll on Close or Escape without saving',async()=>{
 for(const close of ['button','escape']){
  const a=await feePricingApp(),before=copy(a.parent.draft);a.set('openFeePricing()');
  assert.equal(a.parent.inert,true);assert.equal(a.attributes['aria-hidden'],'true');
  assert.match(a.nodes['#modal-root'].innerHTML,/id="fee-pricing-editor"/);assert.match(a.nodes['#modal-root'].innerHTML,/HK\$300.00/);
  await a.submit('fee-pricing-editor',{futurePrice:'999',effectiveDate:'2026-11-01'});
  assert.equal(a.calls.filter(row=>row.operation==='saveFee').length,0);
  if(close==='escape')a.keydown('Escape');else await a.click({action:'fee-pricing-close'});
  assert.equal(a.parent.inert,false);assert.equal(a.attributes['aria-hidden'],undefined);
  assert.equal(a.nodes['#modal-root'].innerHTML,a.parentHtml);assert.deepEqual(a.parent.draft,before);assert.equal(a.parent.scrollTop,213);
  assert.equal(a.focus.length,1);assert.equal(a.focus[0].preventScroll,true);
  assert.match(a.read('modal'),/id="fee-editor"/);assert.equal(a.read('feePricingReturn'),null);
 }
});
test('fee pricing entry requires an existing saved fee and admin identity and cannot run while saving',async()=>{
 const a=await feePricingApp();a.set('openFeeEditor()');a.nodes['#fee-editor'].dataset.id='';
 assert.doesNotMatch(a.read('modal'),/data-action="fee-pricing-open"/);a.set('openFeePricing()');assert.equal(a.read('feePricingReturn'),null);
 a.set("openFeeEditor('qa-fee')");a.nodes['#fee-editor'].dataset.id='missing-fee';a.set('openFeePricing()');assert.equal(a.read('feePricingReturn'),null);
 a.nodes['#fee-editor'].dataset.id='qa-fee';a.set('courseSaving=true;openFeePricing()');assert.equal(a.read('feePricingReturn'),null);
 a.set("courseSaving=false;authUser={...authUser,role:'teacher'};openFeePricing()");assert.equal(a.read('feePricingReturn'),null);
 assert.equal(a.calls.filter(row=>row.operation==='saveFee').length,0);
});
test('fee pricing child is discarded on route or identity changes and cannot resurrect the old fee editor',async()=>{
 for(const leave of ["go('/account')","applySharedUser({id:'different-admin',role:'admin',accessRevision:'next'})"]){
  const a=await feePricingApp();a.set('openFeePricing()');assert.ok(a.read('feePricingReturn.feeId'));
  a.set(leave);assert.equal(a.read('feePricingReturn'),null);a.set('closeFeePricing()');assert.equal(a.read('modal'),'');
  assert.equal(a.calls.filter(row=>row.operation==='saveFee').length,0);assert.equal(a.focus.length,0);
 }
});

test('shared fee editor submits the opened version even when a background refresh has newer values',async()=>{
 const a=await sharedApp();a.set("openFeeEditor('qa-fee')");
 const html=a.nodes['#modal-root'].innerHTML,version=html.match(/id="fee-editor"[^>]*data-version="([^"]+)"/)?.[1];
 assert.equal(version,'1');
 a.state.fees[0]={...a.state.fees[0],price:999,version:2};
 a.state.courses[0]={...a.state.courses[0],version:2,fees:[a.state.fees[0]]};
 await a.set('refreshSharedCourses({paint:false})');
 assert.equal(a.read('sharedFees[0].version'),2);
 let sent;
 a.client.saveFee=async(record,current)=>{sent=copy(current);throw serviceError(409,'VERSION_CONFLICT')};
 const form=sharedForm('fee-editor',{recordId:'qa-fee',version});form.values=sharedFeeInput();
 await a.submit(form.id,form.values,form);
 assert.equal(sent.version,1);
 assert.match(a.nodes['#fee-editor-error'].textContent,/changed|latest/i);
 assert.ok(a.read('modal'));
 assert.equal(form.submitButton.disabled,false);
});

test('switching shared student identities never inherits the previous local phone or private profile fields',async()=>{
 const a=await sharedApp();
 a.set("db.student={name:'Previous student',phone:'81234567',email:'old@example.test',privateNotes:'Private old profile'};applySharedUser({id:'student-a',displayName:'Student A',email:'a@example.test',role:'student'})");
 assert.deepEqual(a.read('db.student'),{id:'student-a',name:'Student A',email:'a@example.test',phone:''});
 a.set("db.student.phone='89999999';applySharedUser({id:'student-b',displayName:'Student B',email:'b@example.test',role:'student'});tab='payments';render()");
 assert.equal(a.read('db.student.phone'),'');
 assert.doesNotMatch(a.nodes['#app'].innerHTML,/81234567|89999999|old@example|Private old profile/);
 assert.match(a.nodes['#app'].innerHTML,/Student B|b@example\.test/);
 a.set('save()');
 assert.doesNotMatch(a.ctx.localStorage.getItem('beamal-demo-v1'),/Student B|b@example\.test|89999999/,'Shared identity must not be serialized into the legacy browser data');
});

test('a full browser storage quota cannot block applying acknowledged shared course data',async()=>{
 let attempts=0;
 const a=await sharedApp({}, {'beamal-demo-v1':JSON.stringify(app().read('db'))},{localWriteError:key=>{if(key==='beamal-demo-v1-before-shared'){attempts++;return Object.assign(new Error('Storage quota exceeded'),{name:'QuotaExceededError'})}return null}});
 assert.ok(attempts>0,'The failed backup write must actually occur, rather than only installing an unused failure mock');
 const saved={...copy(sharedTestCourse),courseName:'Server acknowledged course',version:2};
 a.ctx.savedServerCourses=[saved];
 assert.doesNotThrow(()=>a.set('applySharedCourses(savedServerCourses)'));
 assert.equal(a.read('db.courseSettings[0].courseName'),'Server acknowledged course');
 assert.equal(a.read('db.courseSettings[0].version'),2);
});

test('an acknowledged fee create stays saved if the following refresh fails and cannot leave a retryable create form',async()=>{
 const a=await sharedApp();a.set('openFeeEditor()');
 const form=sharedForm('fee-editor');form.values=sharedFeeInput();
 const save=a.client.saveFee;
 a.client.saveFee=async(...args)=>{const result=await save(...args);a.client.courses=async()=>{throw serviceError(503,'service_unavailable')};a.client.fees=async()=>{throw serviceError(503,'service_unavailable')};return result};
 await a.submit(form.id,form.values,form);
 assert.equal(a.calls.filter(c=>c.operation==='saveFee').length,1);
 assert.equal(a.read('modal'),'');
 assert.equal(a.read("sharedFees.some(f=>f.id==='qa-created-fee')"),true);
 assert.equal(a.read("db.courseSettings[0].fees.some(f=>f.id==='qa-created-fee')"),true);
 assert.doesNotMatch(a.nodes['#fee-editor-error']?.textContent||'',/could not save|未能儲存/i);
 assert.ok(a.messages.some(message=>/saved|儲存/i.test(message)),JSON.stringify(a.messages));
});

test('an acknowledged course metadata edit is applied even when a subsequent refresh is unavailable',async()=>{
 const a=await sharedApp();a.set("openCourseMetadataEditor('qa-course')");
 const form=sharedForm('course-metadata-editor',{recordId:'qa-course',version:'1'});form.values={courseName:'Already saved title',category:'Updated category',level:'Advanced'};
 const update=a.client.updateCourseMetadata;
 a.client.updateCourseMetadata=async(...args)=>{const result=await update(...args);a.client.courses=async()=>{throw serviceError(503,'service_unavailable')};return result};
 await a.submit(form.id,form.values,form);
 assert.equal(a.calls.filter(c=>c.operation==='metadata').length,1);
 assert.equal(a.read('modal'),'');
 assert.equal(a.read('db.courseSettings[0].courseName'),'Already saved title');
 assert.equal(a.read('db.courseSettings[0].version'),2);
 assert.doesNotMatch(a.nodes['#course-metadata-error']?.textContent||'',/could not save|未能儲存/i);
});

test('expired shared authentication closes private forms and clears the previous account course and fee cache',async()=>{
 const a=await sharedApp();a.set("openFeeEditor('qa-fee')");
 a.client.courses=async()=>{throw serviceError(401,'AUTH_REQUIRED')};
 await a.set('refreshSharedCourses()');
 assert.equal(a.read('authUser'),null);assert.equal(a.read('role'),'');
 assert.equal(a.read('modal'),'');assert.equal(a.read('sharedFees.length'),0);
 assert.equal(a.read('db.courseSettings.length'),0);
 assert.equal(a.read('location.pathname'),'/login');
 assert.doesNotMatch(a.nodes['#app'].innerHTML,/id="fee-editor"|Shared lesson fee|Shared studio/);
});

test('a delayed old-account read cannot repopulate private state after logout and another student logs in',async()=>{
 const a=await sharedApp(),courses=deferred(),fees=deferred();
 a.client.courses=()=>courses.promise;a.client.fees=()=>fees.promise;
 const pending=a.set('refreshSharedCourses()');
 await a.set('sharedLogout()');
 a.set("applySharedUser({id:'student-new',displayName:'New student',email:'new@example.test',role:'student'})");
 courses.resolve({courses:[copy(sharedTestCourse)]});fees.resolve({fees:[copy(sharedTestFee)]});
 await pending;
 assert.equal(a.read('authUser.id'),'student-new');
 assert.equal(a.read('sharedFees.length'),0);
 assert.equal(a.read('db.courseSettings.length'),0);
 assert.equal(a.read('db.student.name'),'New student');
});

test('a delayed pre-save refresh cannot erase an acknowledged new fee in the same account',async()=>{
 const a=await sharedApp(),courses=deferred(),fees=deferred();
 const oldCourses=copy(a.state.courses),oldFees=copy(a.state.fees);
 a.client.courses=()=>courses.promise;a.client.fees=()=>fees.promise;
 const pending=a.set('refreshSharedCourses()');
 a.set('openFeeEditor()');
 const form=sharedForm('fee-editor');form.values=sharedFeeInput();
 await a.submit(form.id,form.values,form);
 assert.equal(a.read("sharedFees.some(f=>f.id==='qa-created-fee')"),true);
 courses.resolve({courses:oldCourses});fees.resolve({fees:oldFees});await pending;
 assert.equal(a.read("sharedFees.some(f=>f.id==='qa-created-fee')"),true);
 assert.equal(a.read("db.courseSettings[0].fees.some(f=>f.id==='qa-created-fee')"),true);
 assert.equal(a.read('db.courseSettings[0].version'),2);
});

test('private shared course titles and codes cannot leak through matching legacy class projections after identity changes',async()=>{
 const previous=app().read('db');
 previous.classes.filter(c=>c.course==='art').forEach(c=>c.courseName='Existing local painting title');
 previous.courseCodes.art='CO-LOCAL-ART';
 const privateFee={...copy(sharedTestFee),courseIds:['art'],onlineStore:false};
 const privateCourse={...copy(sharedTestCourse),id:'art',courseName:'Confidential manager-only studio',courseCode:'CO-PRIVATE-ART',fees:[privateFee],onlineStore:false};
 const a=await sharedApp({courses:async()=>({courses:[privateCourse]}),fees:async()=>({fees:[privateFee]})},{'beamal-demo-v1':JSON.stringify(previous)});
 assert.equal(a.read("name('art')"),privateCourse.courseName,'The manager must see the actual shared title');
 assert.equal(a.read("courseCodeFor('art')"),privateCourse.courseCode,'The manager must see the actual shared code');
 a.set('save()');
 const local=JSON.parse(a.ctx.localStorage.getItem('beamal-demo-v1'));
 assert.deepEqual(local.courseSettings,[]);
 assert.doesNotMatch(JSON.stringify(local),/Confidential manager-only studio|CO-PRIVATE-ART/);
 assert.ok(local.classes.filter(c=>c.course==='art').every(c=>c.courseName==='Existing local painting title'));
 assert.equal(local.courseCodes.art,'CO-LOCAL-ART');
 await a.set('sharedLogout()');
 a.set("location.pathname='/classes';render()");
 assert.doesNotMatch(a.nodes['#app'].innerHTML,/Confidential manager-only studio|CO-PRIVATE-ART/);
 assert.ok(a.read("db.classes.filter(c=>c.course==='art').every(c=>c.courseName==='Existing local painting title')"));
 assert.equal(a.read('db.courseCodes.art'),'CO-LOCAL-ART','Identity loss must not retain the manager-only projected course code');
 a.client.courses=async()=>({courses:[]});a.client.fees=async()=>({fees:[]});
 a.set("applySharedUser({id:'no-course-student',displayName:'Unenrolled student',email:'unenrolled@example.test',role:'student'})");
 await a.set('refreshSharedCourses({paint:false})');
 a.set("location.pathname='/classes';render()");
 assert.doesNotMatch(a.nodes['#app'].innerHTML,/Confidential manager-only studio|CO-PRIVATE-ART/);
 assert.equal(a.read('db.courseSettings.length'),0);
 assert.equal(a.read('db.courseCodes.art'),'CO-LOCAL-ART');
});

test('polling during an open course editor keeps the opened version and cancellation displays the latest shared list',async()=>{
 const a=await sharedApp();a.set("openCourseMetadataEditor('qa-course')");
 const editor=a.nodes['#modal-root'].innerHTML;
 assert.match(editor,/data-version="1"/);
 assert.match(editor,/value="Shared studio"/);
 a.state.courses[0]={...a.state.courses[0],courseName:'Latest title from another manager',version:2};
 await a.set('refreshSharedCourses()');
 assert.equal(a.read('db.courseSettings[0].version'),2);
 assert.match(a.nodes['#app'].innerHTML,/Shared studio/);
 assert.doesNotMatch(a.nodes['#app'].innerHTML,/Latest title from another manager/);
 assert.equal(a.nodes['#modal-root'].innerHTML,editor,'Polling must preserve the unfinished editor and original version');
 await a.click({action:'close'});
 assert.equal(a.read('modal'),'');
 assert.match(a.nodes['#app'].innerHTML,/Latest title from another manager/);
 assert.doesNotMatch(a.nodes['#app'].innerHTML,/Shared studio/);
 // A focused search field may postpone repainting too, but the next unfocused poll must flush it even when data is unchanged.
 a.ctx.document.activeElement={matches:()=>true};
 a.state.courses[0]={...a.state.courses[0],courseName:'Latest title after search focus',version:3};
 await a.set('refreshSharedCourses()');
 assert.doesNotMatch(a.nodes['#app'].innerHTML,/Latest title after search focus/);
 a.ctx.document.activeElement=null;
 await a.set('refreshSharedCourses()');
 assert.match(a.nodes['#app'].innerHTML,/Latest title after search focus/);
});

test('a primary browser storage quota failure at startup does not stop shared health checks or the usable login form',async()=>{
 let healthCalls=0,writes=0;
 const client={health:async()=>{healthCalls++;return {mode:'shared-test'}},session:async()=>({user:null})};
 const quota=Object.assign(new Error('Main browser storage is full'),{name:'QuotaExceededError'});
 let a;
 assert.doesNotThrow(()=>{a=app({},'2026-10-14T12:00:00',false,client,{pathname:'/login',localWriteError:key=>{if(key==='beamal-demo-v1'){writes++;return quota}return null}})});
 for(let turn=0;turn<30&&!a.read('sharedReady');turn++)await Promise.resolve();
 assert.ok(writes>0,'The actual primary-key write was not attempted');
 assert.equal(healthCalls,1,'Bootstrap must reach the shared service despite the failed legacy write');
 assert.equal(a.read('sharedReady'),true);assert.equal(a.read('sharedMode'),true);
 assert.match(a.nodes['#app'].innerHTML,/id="login"/);
 assert.match(a.nodes['#app'].innerHTML,/name="username"[^>]*type="email"/);
 assert.match(a.nodes['#app'].innerHTML,/name="password"[^>]*required/);
 assert.doesNotMatch(a.nodes['#app'].innerHTML,/shared-loading/);
});

test('a failed startup health check recovers on login and registers exactly one recurring refresh and focus handler',async()=>{
 let healthy=false,healthCalls=0,courseReads=0,authenticatedUser=null;
 const intervals=[],events=[];
 const client={
  health:async()=>{healthCalls++;if(!healthy)throw serviceError(503,'service_unavailable');return {mode:'shared-test'}},
  session:async()=>({user:copy(authenticatedUser)}),login:async()=>{authenticatedUser=copy(sharedTestUser);return {user:copy(authenticatedUser)}},logout:async()=>{authenticatedUser=null;return {user:null}},
  courses:async()=>{courseReads++;return {courses:[copy(sharedTestCourse)]}},fees:async()=>({fees:[copy(sharedTestFee)]}),
 };
 const a=app({},'2026-10-14T12:00:00',false,client,{pathname:'/login',onInterval:(handler,ms)=>{intervals.push({handler,ms});return intervals.length},onWindowEvent:(type,handler)=>events.push({type,handler})});
 for(let turn=0;turn<30&&!a.read('sharedReady');turn++)await Promise.resolve();
 assert.equal(healthCalls,1);assert.equal(a.read('sharedMode'),false);assert.equal(intervals.length,0);
 healthy=true;
 const loginForm=sharedForm('login');loginForm.values={username:sharedTestUser.email,password:'A valid test password'};
 await a.submit('login',loginForm.values,loginForm);
 assert.equal(a.read('authUser.id'),sharedTestUser.id);assert.equal(a.read('sharedMode'),true);
 assert.equal(a.read('location.pathname'),'/account');
 assert.equal(intervals.length,1);assert.equal(intervals[0].ms,5000);
 assert.equal(events.filter(event=>event.type==='focus').length,1);
 const before=courseReads;await intervals[0].handler();await events.find(event=>event.type==='focus').handler();
 assert.equal(courseReads,before+2,'Both registered callbacks must actually refresh shared data');
 assert.equal(a.read('authUser.id'),sharedTestUser.id,'The fake service must keep the successful login session during both refreshes');
 // Re-establishing the session and logging in again must reuse the original registrations.
 await a.set('initialiseSharedService()');
 await a.submit('login',loginForm.values,loginForm);
 assert.equal(intervals.length,1);assert.equal(events.filter(event=>event.type==='focus').length,1);
});

const sharedTestMaterial={id:'qa-material',courseId:'qa-course',name:'Preparation material',description:'Bring a sketchbook.',videoLinks:['https://example.test/video'],attachments:[],visibleToStudents:false,studentDownload:false,owner:{id:sharedTestUser.id,displayName:sharedTestUser.displayName},version:1,createdAt:'2026-10-14T00:00:00Z',updatedAt:'2026-10-14T00:00:00Z'};
async function materialsApp(){
 const a=await sharedApp(),records=[copy(sharedTestMaterial)];let reads=0;
 a.client.materials=async()=>{reads++;return {materials:copy(records)}};
 a.client.saveMaterial=async(courseId,record,current,operationKey)=>{
  a.calls.push({operation:'material',courseId,record:copy(record),current:current?copy(current):null,operationKey});
  const saved={...record,id:current?.id||'qa-created-material',courseId,owner:copy(sharedTestMaterial.owner),version:current?current.version+1:1,createdAt:sharedTestMaterial.createdAt,updatedAt:'2026-10-14T01:00:00Z'};
  const index=records.findIndex(item=>item.id===saved.id);if(index<0)records.push(saved);else records[index]=saved;
  return {material:copy(saved)};
 };
 a.set("location.pathname='/account/courses/qa-course';courseDetailTab='materials';render()");
 await a.set("refreshCourseMaterials('qa-course',{paint:false})");a.set('render()');
 return {...a,records,getReads:()=>reads};
}
function materialForm({recordId='',version='',links=['https://example.test/video'],operationKey='stable-material-operation'}={}){
 const form=sharedForm('material-editor',{recordId,version}),query=form.querySelectorAll,queryOne=form.querySelector,stop={disabled:true,hidden:true};
 const fields={name:{disabled:false,focus(){}},description:{disabled:false},visibleToStudents:{disabled:false,checked:true},studentDownload:{disabled:false,checked:true},lesson:{disabled:true},file:{disabled:false}};
 const videoInputs=links.map(value=>({value,disabled:false})),editable=[...Object.values(fields),...videoInputs];
 form.dataset.courseId='qa-course';form.dataset.operationKey=operationKey;
 form.querySelector=selector=>selector==='[data-action=material-cancel-upload]'?stop:fields[selector.match(/^\[name=([^\]]+)\]$/)?.[1]]||queryOne(selector);
 form.querySelectorAll=selector=>selector==='[name=materialVideoLink]'?videoInputs:selector==='button'?[...query(selector),stop]:selector.replace(/\s/g,'')==='input,textarea,select'?editable:query(selector);
 form.stopButton=stop;form.editableFields=editable;form.fields=fields;form.videoInputs=videoInputs;
 form.values={name:'Saved material',description:'Written preparation',visibleToStudents:'on',studentDownload:'on'};
 return form;
}

test('course materials load once, show bilingual escaped metadata and enable attachment selection while lesson sharing stays unavailable',async()=>{
 const a=await materialsApp();assert.equal(a.getReads(),1);
 const bad='<img src=x onerror=alert(1)>';
 a.records[0]={...a.records[0],name:bad,description:'<script>alert(1)</script>',owner:{id:'qa-admin',displayName:'Owner <unsafe>'}};
 await a.set("refreshCourseMaterials('qa-course',{force:true})");
 let html=a.nodes['#app'].innerHTML;
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);assert.match(html,/Owner &lt;unsafe&gt;/);
 assert.doesNotMatch(html,/<img src=x onerror|<script>alert\(1\)<\/script>/);
 assert.match(html,/Uploaded on/);assert.match(html,/Hidden from students/);
 a.set("openMaterialEditor('qa-material')");html=a.nodes['#modal-root'].innerHTML;
 assert.match(html,/name="name"[^>]*value="&lt;img/);assert.match(html,/name="studentDownload"[^>]*disabled/);
 assert.match(html,/<select disabled>/);assert.match(html,/id="material-attachment-input" multiple/);
 const choose=html.match(/<button[^>]*data-action="material-choose-files"[^>]*>Choose files/)?.[0];assert.ok(choose);assert.doesNotMatch(choose,/disabled/);
 a.set("lang='zh';modal='';render()");html=a.nodes['#app'].innerHTML;
 assert.match(html,/教材/);assert.match(html,/擁有人/);assert.match(html,/上載日期/);
});

test('a teacher opens materials as read-only safe links and cannot create or submit manager edits',async()=>{
 const a=await materialsApp();
 a.ctx.testCourse=copy(sharedTestCourse);
 a.records[0]={...a.records[0],videoLinks:['javascript:alert(1)','https://example.test/safe-video','https://user:password@example.test/private-video']};
 a.set("applySharedUser({id:'qa-teacher',email:'teacher@example.test',displayName:'Teacher',role:'teacher'});applySharedCourses([testCourse])");
 await a.set("refreshCourseMaterials('qa-course',{paint:false})");
 a.set("openMaterialEditor('qa-material')");
 const html=a.nodes['#modal-root'].innerHTML;
 assert.match(html,/Material details/);assert.doesNotMatch(html,/id="material-editor"|type="submit"/);
 assert.match(html,/href="https:\/\/example\.test\/safe-video"/);assert.match(html,/rel="noopener noreferrer"/);
 assert.doesNotMatch(html,/javascript:|user:password|private-video/);
 a.set("modal='';openMaterialEditor()");assert.equal(a.read('modal'),'');
 const form=materialForm({recordId:'qa-material',version:'1'});await a.submit(form.id,form.values,form);
 assert.equal(a.calls.filter(call=>call.operation==='material').length,0);
});

test('hiding material visibility disables downloads without clearing the checked draft and switching visibility back restores that choice',async()=>{
 const a=await materialsApp(),download={checked:true,disabled:false},form=materialForm();
 const query=form.querySelector;form.querySelector=selector=>selector==='[name=studentDownload]'?download:query(selector);
 a.change('visibleToStudents','',{checked:false,closest:selector=>selector==='#material-editor'?form:null});
 assert.equal(download.checked,true);assert.equal(download.disabled,true);
 a.change('visibleToStudents','',{checked:true,closest:selector=>selector==='#material-editor'?form:null});
 assert.equal(download.disabled,false);assert.equal(download.checked,true);
});

test('saving a hidden material never sends download permission even when the disabled draft remains checked',async()=>{
 const a=await materialsApp();a.set('openMaterialEditor()');
 const form=materialForm();delete form.values.visibleToStudents;
 await a.submit(form.id,form.values,form);
 const saved=a.calls.find(call=>call.operation==='material');assert.ok(saved);
 assert.equal(saved.record.visibleToStudents,false);assert.equal(saved.record.studentDownload,false);
});

test('invalid material links never reach the shared service',async()=>{
 const a=await materialsApp();
 for(const links of [['javascript:alert(1)'],['https://user:password@example.test/private'],Array.from({length:21},()=> 'https://example.test/video')]){
  const badForm=materialForm({links});await a.submit(badForm.id,badForm.values,badForm);
  assert.match(a.nodes['#material-editor-error'].textContent,/http|20/);
 }
 assert.equal(a.calls.filter(call=>call.operation==='material').length,0);
});

test('material edits retain the opened version and operation key after a background update and rejected save',async()=>{
 const a=await materialsApp();a.set("openMaterialEditor('qa-material')");
 const html=a.nodes['#modal-root'].innerHTML,version=html.match(/data-version="([^"]+)"/)?.[1];assert.equal(version,'1');
 a.records[0]={...a.records[0],name:'Another manager changed the material',version:2};
 await a.set("refreshCourseMaterials('qa-course',{paint:false,force:true})");
 let sent;
 a.client.saveMaterial=async(courseId,record,current,operationKey)=>{sent={courseId,current:copy(current),operationKey};throw serviceError(409,'VERSION_CONFLICT')};
 const form=materialForm({recordId:'qa-material',version});await a.submit(form.id,form.values,form);
 assert.equal(sent.current.version,1);assert.equal(sent.operationKey,'stable-material-operation');
 assert.match(a.nodes['#material-editor-error'].textContent,/changed|latest/);
 assert.ok(a.read('modal'));assert.equal(form.submitButton.disabled,false);
 assert.equal(a.read("materialCaches.get('qa-course').items[0].version"),2);
});

test('material retry preserves the draft and operation key and an acknowledged save needs no extra GET',async()=>{
 const a=await materialsApp();a.set('openMaterialEditor()');const form=materialForm();
 let attempts=0;const save=a.client.saveMaterial,keys=[];
 a.client.saveMaterial=async(...args)=>{keys.push(args[3]);if(attempts++===0)throw serviceError(0,'connection_failed');return save(...args)};
 const reads=a.getReads();await a.submit(form.id,form.values,form);
 assert.ok(a.read('modal'));assert.equal(form.values.name,'Saved material');assert.equal(form.submitButton.disabled,false);
 assert.match(a.nodes['#material-editor-error'].textContent,/connect|retry|retained/i);
 await a.submit(form.id,form.values,form);
 assert.deepEqual(keys,['stable-material-operation','stable-material-operation']);
 assert.equal(a.read('modal'),'');assert.equal(a.getReads(),reads);
 assert.equal(a.read("materialCaches.get('qa-course').items.some(item=>item.id==='qa-created-material')"),true);
 assert.match(a.nodes['#app'].innerHTML,/Saved material/);assert.ok(a.messages.includes('Material saved'));
});

test('a pending material write blocks closing and an older read cannot erase the acknowledged material',async()=>{
 const a=await materialsApp(),read=deferred(),save=deferred(),old=copy(a.records);
 a.client.materials=()=>read.promise;const pendingRead=a.set("refreshCourseMaterials('qa-course',{paint:false})");
 a.set('openMaterialEditor()');a.client.saveMaterial=()=>save.promise;
 const form=materialForm(),pendingSave=a.submit(form.id,form.values,form);
 assert.equal(a.read('materialSaving'),true);assert.equal(form.submitButton.disabled,true);
 await a.click({action:'close'});assert.ok(a.read('modal'));a.keydown('Escape');assert.ok(a.read('modal'));
 const created={...copy(sharedTestMaterial),id:'qa-created-material',name:'Saved during old read'};save.resolve({material:created});await pendingSave;
 read.resolve({materials:old});await pendingRead;
 assert.equal(a.read('modal'),'');assert.equal(a.read('materialSaving'),false);
 assert.equal(a.read("materialCaches.get('qa-course').items.some(item=>item.id==='qa-created-material')"),true);
});

test('material unauthorized errors clear private state and delayed errors from an old identity do not sign out the new one',async()=>{
 const a=await materialsApp();a.set("openMaterialEditor('qa-material')");
 a.client.materials=async()=>{throw serviceError(401,'AUTH_REQUIRED')};
 await a.set("refreshCourseMaterials('qa-course',{force:true})");
 assert.equal(a.read('authUser'),null);assert.equal(a.read('modal'),'');assert.equal(a.read('materialCaches.size'),0);assert.equal(a.read('location.pathname'),'/login');
 const b=await materialsApp(),old=deferred();b.client.materials=()=>old.promise;
 const pending=b.set("refreshCourseMaterials('qa-course')");await b.set('sharedLogout()');
 b.set("applySharedUser({id:'new-student',displayName:'New student',email:'new@example.test',role:'student'})");
 old.reject(serviceError(401,'AUTH_REQUIRED'));await pending;
 assert.equal(b.read('authUser.id'),'new-student');assert.equal(b.read('materialCaches.size'),0);
});

test('older acknowledged course and fee receipts never downgrade records already refreshed to a higher version',async()=>{
 const a=await sharedApp(),newFee={...copy(sharedTestFee),version:3,price:900},newCourse={...copy(sharedTestCourse),version:5,courseName:'Newest title',price:900,fees:[newFee]};
 a.ctx.newFee=newFee;a.ctx.newCourse=newCourse;a.ctx.oldFee=copy(sharedTestFee);a.ctx.oldCourse=copy(sharedTestCourse);
 a.set('sharedFees=[newFee];applySharedCourses([newCourse]);applyFeeAcknowledgement({fee:oldFee,courses:[oldCourse]});applyCourseAcknowledgement(oldCourse)');
 assert.equal(a.read('db.courseSettings[0].version'),5);assert.equal(a.read('db.courseSettings[0].courseName'),'Newest title');
 assert.equal(a.read('sharedFees[0].version'),3);assert.equal(a.read('sharedFees[0].price'),900);
});

test('unchanged compact catalog replies reuse the hydrated record and still flush an earlier postponed view update',async()=>{
 const a=await sharedApp(),requests=[],compact=copy(sharedTestCourse);
 for(const field of ['fees','feeName','pricingModel','price','months','duration','packageType','packageTotal','bookingExpiry','onlineStore'])delete compact[field];
 compact.courseName='Compact catalog latest title';compact.version=2;
 a.client.catalog=async revision=>{requests.push(revision);return requests.length===1?{revision:'catalog-r2',courses:[compact],fees:[copy(sharedTestFee)]}:{revision:'catalog-r2',unchanged:true}};
 a.ctx.document.activeElement={matches:()=>true};await a.set('refreshSharedCourses()');
 assert.equal(a.read('db.courseSettings[0].price'),300);assert.equal(a.read('db.courseSettings[0].fees[0].id'),'qa-fee');
 assert.doesNotMatch(a.nodes['#app'].innerHTML,/Compact catalog latest title/);
 a.ctx.document.activeElement=null;await a.set('refreshSharedCourses()');
 assert.deepEqual(requests,['','catalog-r2']);assert.match(a.nodes['#app'].innerHTML,/Compact catalog latest title/);
 assert.equal(a.read('db.courseSettings[0].version'),2);
});

test('shared startup preserves the exact original local data before sanitizing and a failed backup never destroys the original',async()=>{
 const original=app().read('db');
 original.courseSettings=[{id:'legacy-personal-course',courseName:'Original local course',feeName:'Original local fee',pricingModel:'fixed-monthly',price:850,months:2}];
 original.student={name:'Original local student',email:'original@example.test',phone:'81234567',remark:'Original profile information'};
 const raw=JSON.stringify(original,null,2),existingBackup='{"untouched":"An earlier retained backup"}';
 for(const mode of ['new backup','existing backup','quota failure','latest backup quota failure']){
  const existing=mode==='existing backup'||mode==='latest backup quota failure';
  const seed={'beamal-demo-v1':raw};if(existing)seed['beamal-demo-v1-before-shared']=existingBackup;
  let rejectedWrites=0,healthCalls=0;
  const rejectedKey=mode==='quota failure'?'beamal-demo-v1-before-shared':mode==='latest backup quota failure'?'beamal-demo-v1-before-shared-latest':null;
  const options={localWriteError:key=>{if(key===rejectedKey){rejectedWrites++;return Object.assign(new Error('Backup quota is full'),{name:'QuotaExceededError'})}return null}};
  const a=await sharedApp({health:async()=>{healthCalls++;return {mode:'shared-test'}}},seed,options);
  assert.equal(healthCalls,1,mode);assert.equal(a.read('authUser.id'),sharedTestUser.id,mode);
  assert.equal(a.read('db.courseSettings[0].id'),'qa-course',`${mode}: server data must still load`);
  a.set('save()');
  if(rejectedKey){
   assert.ok(rejectedWrites>0);
   assert.equal(a.ctx.localStorage.getItem('beamal-demo-v1'),raw,'Failed backup must not allow the original primary value to be scrubbed');
   assert.equal(a.ctx.localStorage.getItem('beamal-demo-v1-before-shared'),existing?existingBackup:null);
   assert.equal(a.ctx.localStorage.getItem('beamal-demo-v1-before-shared-latest'),null);
  }else{
   assert.equal(a.ctx.localStorage.getItem('beamal-demo-v1-before-shared'),existing?existingBackup:raw,'Back up the original bytes, including its local course and profile, without replacing an earlier backup');
   assert.equal(a.ctx.localStorage.getItem('beamal-demo-v1-before-shared-latest'),existing?raw:null,'When an earlier backup differs, the current original must have its own complete recoverable copy before the primary value is sanitized');
   const sanitized=JSON.parse(a.ctx.localStorage.getItem('beamal-demo-v1'));
   assert.deepEqual(sanitized.courseSettings,[]);assert.deepEqual(sanitized.student,{name:'',email:'',phone:''});
   assert.doesNotMatch(JSON.stringify(sanitized),/Original local course|Original local student|original@example\.test/);
  }
 }
});

test('a retained valid session automatically leaves the login form after service recovery without submitting credentials again',async()=>{
 let healthy=false,healthCalls=0,sessionCalls=0,loginCalls=0;
 const client={
  health:async()=>{healthCalls++;if(!healthy)throw serviceError(503,'service_unavailable');return {mode:'shared-test'}},
  session:async()=>{sessionCalls++;return {user:copy(sharedTestUser)}},
  login:async()=>{loginCalls++;return {user:copy(sharedTestUser)}},
  courses:async()=>({courses:[copy(sharedTestCourse)]}),fees:async()=>({fees:[copy(sharedTestFee)]}),
 };
 const offline=app({},'2026-10-14T12:00:00',false,client,{pathname:'/login'});
 for(let turn=0;turn<30&&!offline.read('sharedReady');turn++)await Promise.resolve();
 assert.equal(offline.read('location.pathname'),'/login');assert.match(offline.nodes['#app'].innerHTML,/id="login"/);
 assert.equal(sessionCalls,0);
 // Reloading the UI uses the same retained cookie through session(); it must not require a second login POST.
 healthy=true;
 const reloaded=app({},'2026-10-14T12:00:00',false,client,{pathname:'/login'});
 for(let turn=0;turn<30&&!reloaded.read('sharedReady');turn++)await Promise.resolve();
 assert.equal(healthCalls,2);assert.equal(sessionCalls,1);assert.equal(loginCalls,0);
 assert.equal(reloaded.read('authUser.id'),sharedTestUser.id);
 assert.equal(reloaded.read('location.pathname'),'/account');
 assert.match(reloaded.nodes['#app'].innerHTML,/Shared studio/);
 assert.doesNotMatch(reloaded.nodes['#app'].innerHTML,/id="login"/);
});

for(const scenario of [
 {label:'course create',formId:'create-course-editor',errorId:'create-course-error',method:'saveCourse',open:'openCreateCourse()',invoke:'persistSharedCourse(pendingWriteInput,null)',recordId:'',input:()=>({...copy(sharedTestCourse),courseName:'Old manager draft'})},
 {label:'fee edit',formId:'fee-editor',errorId:'fee-editor-error',method:'saveFee',open:"openFeeEditor('qa-fee')",invoke:'saveSharedFee(pendingWriteInput,pendingWriteForm)',recordId:'qa-fee',input:sharedFeeInput},
 {label:'course metadata edit',formId:'course-metadata-editor',errorId:'course-metadata-error',method:'updateCourseMetadata',open:"openCourseMetadataEditor('qa-course')",invoke:'saveCourseMetadata(pendingWriteInput,pendingWriteForm)',recordId:'qa-course',input:()=>({courseName:'Old manager draft',category:'Art',level:'Beginner'})},
])test(`a pending ${scenario.label} safely ignores late failures after polling signs out the old identity and removes its real form`,async()=>{
 for(const status of [503,409,401]){
  const a=await sharedApp(),write=deferred(),form=sharedForm(scenario.formId,{recordId:scenario.recordId,version:'1'}),oldError={textContent:''};
  a.set(scenario.open);form.isConnected=true;
  a.nodes[`#${scenario.formId}`]=form;a.nodes[`#${scenario.errorId}`]=oldError;
  const query=a.ctx.document.querySelector,removedSelector=new RegExp(`^#(?:${scenario.formId}|${scenario.errorId})(?:$|\\s)`);
  // Unlike the legacy harness, a removed real DOM form must not manufacture
  // an error node when an old request eventually rejects.
  a.ctx.document.querySelector=selector=>!form.isConnected&&removedSelector.test(selector)?null:query(selector);
  let writes=0;a.client[scenario.method]=()=>{writes++;return write.promise};
  a.ctx.pendingWriteInput=scenario.input();a.ctx.pendingWriteForm=form;
  const pending=a.set(scenario.invoke);
  assert.equal(writes,1);assert.equal(a.read('courseSaving'),true);assert.equal(form.submitButton.disabled,true);
  a.client.courses=async()=>{throw serviceError(401,'AUTH_REQUIRED')};
  await a.set('refreshSharedCourses()');
  assert.equal(a.read('authUser'),null);assert.equal(a.read('modal'),'');assert.equal(a.read('location.pathname'),'/login');
  assert.doesNotMatch(a.nodes['#app'].innerHTML,new RegExp(`id="${scenario.formId}"`),'The login page must remove the old form from the rendered document');
  form.isConnected=false;delete a.nodes[`#${scenario.formId}`];delete a.nodes[`#${scenario.errorId}`];
  assert.equal(a.ctx.document.querySelector(`#${scenario.formId}`),null);
  assert.equal(a.ctx.document.querySelector(`#${scenario.errorId}`),null);
  a.ctx.nextCourse={id:'new-account-course',courseCode:'CO-NEW',courseName:'New manager course',category:'Art',level:'Beginner',version:5,feeIds:[],fees:[],feeName:'',createdAt:sharedTestCourse.createdAt,updatedAt:sharedTestCourse.updatedAt};
  a.set("applySharedUser({id:'next-admin',displayName:'Next manager',email:'next@example.test',role:'admin'});applySharedCourses([nextCourse]);location.pathname='/account';tab='catalog';render()");
  const currentView=a.nodes['#app'].innerHTML,currentGeneration=a.read('sharedGeneration');
  write.reject(serviceError(status,status===401?'AUTH_REQUIRED':status===409?'VERSION_CONFLICT':'service_unavailable'));
  await assert.doesNotReject(pending,`${scenario.label}: the removed old form must not cause a TypeError for status ${status}`);
  assert.equal(a.read('authUser.id'),'next-admin');assert.equal(a.read('sharedGeneration'),currentGeneration);
  assert.equal(a.read('location.pathname'),'/account');assert.equal(a.read('courseSaving'),false);
  assert.equal(a.nodes['#app'].innerHTML,currentView,'An old failure must not replace the new identity view with a login or error');
  assert.equal(a.read('db.courseSettings[0].courseName'),'New manager course');
  assert.equal(oldError.textContent,'');assert.equal(a.nodes[`#${scenario.errorId}`],undefined);
  assert.deepEqual(a.messages,[],'An old failure must not emit an error or saved notification for the new identity');
 }
});

async function attachmentApp(){
 const a=await materialsApp(),uploaded=new Map(),uploadCalls=[];let sequence=0;
 a.ctx.crypto={randomUUID:()=>`qa-attachment-operation-${++sequence}`};
 const reply=(file,id)=>{const upload={id,name:file.name,mimeType:file.type,size:file.size,createdAt:sharedTestMaterial.createdAt};uploaded.set(id,upload);return {upload}};
 a.client.uploadMaterialAttachment=async(courseId,file,options)=>{uploadCalls.push({courseId,file,options});return reply(file,`qa-upload-${uploadCalls.length}`)};
 const save=a.client.saveMaterial;
 a.client.saveMaterial=async(...args)=>{
  const result=await save(...args);
  result.material.attachments=(args[1].attachments||[]).map(id=>copy(uploaded.get(id)||a.records.flatMap(item=>item.attachments||[]).find(item=>item.id===id)));
  const index=a.records.findIndex(item=>item.id===result.material.id);a.records[index]=copy(result.material);
  return result;
 };
 return {...a,uploaded,uploadCalls,reply};
}
const attachmentFiles=()=>[{name:'First preparation.png',type:'image/png',size:101},{name:'Second preparation.pdf',type:'application/pdf',size:420}];
async function until(predicate,message){for(let turn=0;turn<40&&!predicate();turn++)await Promise.resolve();assert.ok(predicate(),message);}

test('material attachment selection keeps valid drafts and marks invalid files for removal before anything uploads or persists',async()=>{
 const a=await attachmentApp();a.set('openMaterialEditor()');
 a.ctx.queuedFiles=[...attachmentFiles(),{name:'Too large.pdf',type:'application/pdf',size:50_000_001},{name:'Active.html',type:'text/html',size:20}];
 a.set('addMaterialFiles(queuedFiles)');
 assert.deepEqual(a.read('materialAttachmentDraft.slice(0,2).map(item=>item.name)'),attachmentFiles().map(file=>file.name));
 assert.ok(a.read("materialAttachmentDraft.slice(0,2).every(item=>item.status==='queued'&&!item.result)"));
 assert.deepEqual(a.read('materialAttachmentDraft.slice(2).map(item=>[item.status,item.issue])'),[['error','size'],['error','type']]);
 assert.equal(a.uploadCalls.length,0);assert.equal(a.calls.filter(call=>call.operation==='material').length,0);
 assert.doesNotMatch(a.ctx.localStorage.getItem('beamal-demo-v1'),/First preparation|Second preparation|Too large|Active\.html/);
 assert.match(a.nodes['#material-attachment-drafts'].innerHTML,/Uploads when you save/);
 assert.match(a.nodes['#material-attachment-drafts'].innerHTML,/Cannot upload; remove or replace/);
 assert.doesNotMatch(a.nodes['#material-attachment-drafts'].innerHTML,/save again to retry/,'A permanent file type or size error must not instruct the user to retry the same invalid file');
 const form=materialForm();await a.submit(form.id,form.values,form);assert.equal(a.uploadCalls.length,0);assert.match(a.nodes['#material-editor-error'].textContent,/Remove or replace/);
 const invalidIds=a.read('materialAttachmentDraft.slice(2).map(item=>item.localId)');for(const attachmentId of invalidIds)await a.click({action:'material-remove-attachment',attachmentId});
 assert.deepEqual(a.read('materialAttachmentDraft.map(item=>item.name)'),attachmentFiles().map(file=>file.name));
});

test('material attachment uploads run sequentially, report progress and wait for server acknowledgement before sending material metadata',async()=>{
 const a=await attachmentApp(),first=deferred(),second=deferred(),files=attachmentFiles();a.set('openMaterialEditor()');
 files[0].name='<img src=x onerror=alert(1)>.png';a.ctx.queuedFiles=files;a.set('addMaterialFiles(queuedFiles)');
 const calls=[];a.client.uploadMaterialAttachment=(courseId,file,options)=>{calls.push({courseId,file,options});return calls.length===1?first.promise:second.promise};
 const form=materialForm(),pending=a.submit(form.id,form.values,form);
 assert.equal(calls.length,1);assert.equal(calls[0].file,files[0]);assert.equal(calls[0].courseId,'qa-course');
 assert.ok(calls[0].options.operationKey);assert.equal(a.read('materialAttachmentDraft[0].status'),'uploading');assert.equal(a.read('materialAttachmentDraft[1].status'),'queued');
 calls[0].options.onProgress({loaded:37,total:101,percent:37});
 let html=a.nodes['#material-attachment-drafts'].innerHTML;assert.match(html,/aria-valuenow="37"/);assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);assert.doesNotMatch(html,/<img src=x onerror/);
 calls[0].options.onProgress({loaded:101,total:101,percent:100});assert.equal(a.read('materialAttachmentDraft[0].status'),'uploading');assert.match(a.nodes['#material-attachment-drafts'].innerHTML,/Checking file/);
 assert.equal(a.calls.filter(call=>call.operation==='material').length,0);
 first.resolve(a.reply(files[0],'acknowledged-first'));
 await until(()=>calls.length===2,'The second file must start only after the first server acknowledgement');
 assert.equal(a.read('materialAttachmentDraft[0].result.id'),'acknowledged-first');assert.equal(a.calls.filter(call=>call.operation==='material').length,0);
 second.resolve(a.reply(files[1],'acknowledged-second'));await pending;
 const saved=a.calls.find(call=>call.operation==='material');assert.deepEqual(saved.record.attachments,['acknowledged-first','acknowledged-second']);
 assert.equal(saved.operationKey,'stable-material-operation');assert.equal(a.read('modal'),'');assert.equal(a.read('materialSaving'),false);
 assert.deepEqual(a.read("materialCaches.get('qa-course').items.find(item=>item.id==='qa-created-material').attachments.map(file=>file.id)"),['acknowledged-first','acknowledged-second']);
});

test('a failed later upload retains earlier acknowledged file IDs and retries only the failed file using the same operation key',async()=>{
 const a=await attachmentApp(),files=attachmentFiles(),calls=[];a.set('openMaterialEditor()');a.ctx.queuedFiles=files;a.set('addMaterialFiles(queuedFiles)');
 let attempts=0;
 a.client.uploadMaterialAttachment=async(courseId,file,options)=>{calls.push({file,options});if(file===files[1]&&attempts++===0)throw serviceError(0,'UPLOAD_CONNECTION_FAILED');return a.reply(file,file===files[0]?'already-uploaded':'retried-file')};
 const form=materialForm();await a.submit(form.id,form.values,form);
 assert.equal(a.calls.filter(call=>call.operation==='material').length,0);assert.ok(a.read('modal'));assert.equal(form.submitButton.disabled,false);
 assert.equal(a.read('materialAttachmentDraft[0].result.id'),'already-uploaded');assert.equal(a.read('materialAttachmentDraft[1].status'),'error');
 assert.equal(form.values.name,'Saved material');await a.submit(form.id,form.values,form);
 assert.equal(calls.length,3);assert.equal(calls.filter(call=>call.file===files[0]).length,1);
 assert.ok(calls[1].options.operationKey);assert.equal(calls[1].options.operationKey,calls[2].options.operationKey);
 assert.deepEqual(a.calls.find(call=>call.operation==='material').record.attachments,['already-uploaded','retried-file']);assert.equal(a.read('modal'),'');
});

test('an attachment metadata version conflict keeps the opened version, draft and cached upload ID without retransferring the file on retry',async()=>{
 const a=await attachmentApp(),files=attachmentFiles().slice(0,1),sent=[];a.set("openMaterialEditor('qa-material')");a.ctx.queuedFiles=files;a.set('addMaterialFiles(queuedFiles)');
 a.client.saveMaterial=async(courseId,record,current,operationKey)=>{sent.push({record:copy(record),current:copy(current),operationKey});throw serviceError(409,'VERSION_CONFLICT')};
 const form=materialForm({recordId:'qa-material',version:'1'});await a.submit(form.id,form.values,form);
 assert.equal(a.uploadCalls.length,1);assert.ok(a.read('modal'));assert.equal(form.submitButton.disabled,false);assert.match(a.nodes['#material-editor-error'].textContent,/changed|latest/);
 await a.submit(form.id,form.values,form);
 assert.equal(a.uploadCalls.length,1);assert.equal(sent.length,2);assert.equal(sent[0].current.version,1);assert.equal(sent[1].current.version,1);
 assert.deepEqual(sent[1].record.attachments,sent[0].record.attachments);assert.equal(sent[1].operationKey,sent[0].operationKey);assert.ok(a.read('materialAttachmentDraft[0].result.id'));
});

test('stopping an active upload aborts the transfer but preserves the draft and operation key for a later retry',async()=>{
 const a=await attachmentApp(),files=attachmentFiles().slice(0,1),calls=[];a.set('openMaterialEditor()');a.ctx.queuedFiles=files;a.set('addMaterialFiles(queuedFiles)');
 a.client.uploadMaterialAttachment=(courseId,file,options)=>{calls.push({file,options});return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(serviceError(0,'UPLOAD_CANCELLED')),{once:true}))};
 const form=materialForm(),pending=a.submit(form.id,form.values,form);assert.equal(calls.length,1);assert.equal(calls[0].options.signal.aborted,false);assert.equal(form.stopButton.disabled,false);assert.equal(form.stopButton.hidden,false);
 await a.click({action:'material-cancel-upload'});await pending;
 assert.equal(calls[0].options.signal.aborted,true);assert.ok(a.read('modal'));assert.equal(a.read('materialAttachmentDraft.length'),1);assert.equal(form.submitButton.disabled,false);
 assert.equal(form.stopButton.disabled,true);assert.equal(form.stopButton.hidden,true);
 assert.equal(a.calls.filter(call=>call.operation==='material').length,0);
 a.client.uploadMaterialAttachment=async(courseId,file,options)=>{calls.push({file,options});return a.reply(file,'completed-after-cancel')};
 await a.submit(form.id,form.values,form);
 assert.equal(calls.length,2);assert.equal(calls[1].options.signal.aborted,false);assert.equal(calls[1].options.operationKey,calls[0].options.operationKey);
 assert.deepEqual(a.calls.find(call=>call.operation==='material').record.attachments,['completed-after-cancel']);
});

test('old upload progress and acknowledgements cannot modify or unlock a new account active upload after authentication expires',async()=>{
 const a=await attachmentApp(),old=deferred(),next=deferred(),files=attachmentFiles(),calls=[];
 a.set('openMaterialEditor()');a.ctx.oldFiles=[files[0]];a.set('addMaterialFiles(oldFiles)');
 a.client.uploadMaterialAttachment=(courseId,file,options)=>{calls.push({file,options});return calls.length===1?old.promise:next.promise};
 const oldForm=materialForm(),oldSave=a.submit(oldForm.id,oldForm.values,oldForm);assert.equal(calls.length,1);
 a.client.materials=async()=>{throw serviceError(401,'AUTH_REQUIRED')};await a.set("refreshCourseMaterials('qa-course',{force:true})");
 assert.equal(a.read('authUser'),null);assert.equal(a.read('modal'),'');oldForm.isConnected=false;
 a.ctx.nextCourse=copy(sharedTestCourse);a.client.materials=async()=>({materials:[]});
 a.set("applySharedUser({id:'next-upload-admin',displayName:'Next upload manager',email:'next-upload@example.test',role:'admin'});applySharedCourses([nextCourse]);location.pathname='/account/courses/qa-course';courseDetailTab='materials';render()");
 await a.set("refreshCourseMaterials('qa-course',{force:true,paint:false})");a.set('openMaterialEditor()');a.ctx.nextFiles=[files[1]];a.set('addMaterialFiles(nextFiles)');
 const nextForm=materialForm();nextForm.values.name='Next account material';const nextSave=a.submit(nextForm.id,nextForm.values,nextForm);assert.equal(calls.length,2);assert.equal(a.read('materialSaving'),true);
 calls[0].options.onProgress({loaded:101,total:101,percent:100});assert.equal(a.read('materialAttachmentDraft[0].name'),files[1].name);assert.equal(a.read('materialAttachmentDraft[0].percent'),0);
 old.resolve(a.reply(files[0],'old-account-file'));await oldSave;
 assert.equal(a.read('authUser.id'),'next-upload-admin');assert.equal(a.read('materialSaving'),true,'An old finally block must not unlock the next identity upload');assert.equal(nextForm.submitButton.disabled,true);
 assert.equal(a.calls.filter(call=>call.operation==='material').length,0);
 next.resolve(a.reply(files[1],'next-account-file'));await nextSave;
 assert.deepEqual(a.calls.find(call=>call.operation==='material').record.attachments,['next-account-file']);assert.equal(a.read('materialSaving'),false);
 assert.equal(a.read("materialCaches.get('qa-course').items.find(item=>item.id==='qa-created-material').name"),'Next account material');
});

test('changing a draft after a lost material save acknowledgement retains its operation key and surfaces a receipt conflict without creating a duplicate',async()=>{
 const a=await attachmentApp(),files=attachmentFiles().slice(0,1),requests=[];a.set('openMaterialEditor()');a.ctx.queuedFiles=files;a.set('addMaterialFiles(queuedFiles)');
 const save=a.client.saveMaterial;let savedPayload;
 a.client.saveMaterial=async(...args)=>{
  requests.push({record:copy(args[1]),operationKey:args[3]});
  if(!savedPayload){savedPayload=copy(args[1]);await save(...args);throw serviceError(0,'connection_failed')}
  assert.notDeepEqual(args[1],savedPayload,'The retry must actually contain a changed user draft');
  throw serviceError(409,'IDEMPOTENCY_CONFLICT');
 };
 const form=materialForm();await a.submit(form.id,form.values,form);
 assert.ok(a.read('modal'));assert.equal(a.uploadCalls.length,1);assert.equal(a.records.filter(item=>item.id==='qa-created-material').length,1);
 form.values.name='Changed retry draft';await a.submit(form.id,form.values,form);
 assert.equal(requests.length,2);assert.equal(requests[0].operationKey,'stable-material-operation');assert.equal(requests[1].operationKey,requests[0].operationKey);
 assert.equal(requests[1].record.name,'Changed retry draft');assert.equal(form.values.name,'Changed retry draft');assert.ok(a.read('modal'));
 assert.match(a.nodes['#material-editor-error'].textContent,/previous save|Cancel and reopen/);
 assert.equal(a.records.filter(item=>item.id==='qa-created-material').length,1);assert.equal(a.records.find(item=>item.id==='qa-created-material').name,'Saved material');assert.equal(a.uploadCalls.length,1);
 assert.ok(!a.messages.includes('Material saved'),'An unacknowledged or conflicting retry must not display a new saved notification');
});

test('a pending material upload locks editable fields and header close, then restores each original permission state after failure',async()=>{
 const a=await attachmentApp(),upload=deferred(),files=attachmentFiles().slice(0,1);a.set('openMaterialEditor()');a.ctx.queuedFiles=files;a.set('addMaterialFiles(queuedFiles)');
 const form=materialForm(),headerClose={disabled:false},query=a.ctx.document.querySelector;
 delete form.values.visibleToStudents;form.fields.visibleToStudents.checked=false;form.fields.studentDownload.disabled=true;
 a.nodes['#material-editor']=form;
 a.ctx.document.querySelector=selector=>/create-course-header|material-editor-dialog\s+header/.test(selector)&&/button|data-action/.test(selector)?headerClose:query(selector);
 const original=form.editableFields.map(field=>field.disabled);
 a.client.uploadMaterialAttachment=()=>upload.promise;
 const pending=a.submit(form.id,form.values,form);
 try{
  assert.equal(form.fields.name.disabled,true,'Typing a new name after the submitted snapshot must be prevented while it saves');
  assert.equal(form.fields.description.disabled,true);assert.ok(form.videoInputs.every(input=>input.disabled));assert.equal(form.fields.visibleToStudents.disabled,true);
  assert.equal(headerClose.disabled,true);assert.equal(form.stopButton.disabled,false);assert.equal(form.stopButton.hidden,false);
 }finally{upload.reject(serviceError(503,'UPLOAD_CONNECTION_FAILED'));await pending;}
 assert.deepEqual(form.editableFields.map(field=>field.disabled),original,'Re-enable only controls that were enabled before saving');
 assert.equal(form.fields.name.disabled,false);assert.equal(form.fields.lesson.disabled,true);assert.equal(form.fields.studentDownload.disabled,true);
 assert.equal(headerClose.disabled,false);assert.equal(form.submitButton.disabled,false);assert.equal(form.stopButton.disabled,true);assert.equal(form.stopButton.hidden,true);
 assert.ok(a.read('modal'));assert.equal(a.calls.filter(call=>call.operation==='material').length,0);
});

function observeAppWrites(a){
 const node=a.nodes['#app'],descriptor=Object.getOwnPropertyDescriptor(node,'innerHTML');let html=node.innerHTML,writes=0;
 Object.defineProperty(node,'innerHTML',{configurable:true,get:()=>descriptor?.get?descriptor.get.call(node):html,set:value=>{writes++;if(descriptor?.set)descriptor.set.call(node,value);else html=value}});
 return ()=>writes;
}
function publicAccountLinkFixture(a,{signedIn=true}={}){
 const classes=new Set([signedIn?'account-avatar':'login-icon']),attributes={href:signedIn?'/account':'/login'},link={dataset:{go:attributes.href},classList:{toggle:(key,on)=>on?classes.add(key):classes.delete(key),contains:key=>classes.has(key)},setAttribute:(key,value)=>attributes[key]=String(value)},query=a.ctx.document.querySelector;
 a.ctx.document.querySelector=selector=>selector==='.site-header .login-icon'?(classes.has('login-icon')?link:null):selector==='.site-header .account-avatar'?(classes.has('account-avatar')?link:null):query(selector);
 return {classes,attributes,link};
}
function switchSharedIdentity(a){
 a.ctx.nextIdentityUser={id:'next-auth-admin',role:'admin',displayName:'Next authenticated manager',email:'next-auth@example.test'};
 a.ctx.nextIdentityCourse={...copy(sharedTestCourse),id:'next-auth-course',courseName:'New account preserved course',feeIds:[],fees:[],feeName:''};
 a.set("applySharedUser(nextIdentityUser);applySharedCourses([nextIdentityCourse]);tab='catalog';location.pathname='/account';render()");
}

test('a current shared permission failure invalidates the SDK session before returning to login',async()=>{
 let invalidations=0,token='fictional-old-token';
 const a=await sharedApp({invalidateSession(){invalidations++;token=''}});a.set("openFeeEditor('qa-fee')");
 a.client.courses=async()=>{throw serviceError(401,'AUTH_REQUIRED')};await a.set('refreshSharedCourses()');
 assert.equal(invalidations,1);assert.equal(token,'');assert.equal(a.read('authUser'),null);assert.equal(a.read('modal'),'');assert.equal(a.read('location.pathname'),'/login');
});

test('a slow successful login retains its valid session without overriding a newer FAQ navigation',async()=>{
 for(const navigation of ['link','back']){
  const a=await sharedApp();await a.click({action:'logout'});if(navigation==='back')a.set("history.replaceState({},'','/faq');go('/login')");const wait=deferred();let calls=0;a.client.login=()=>{calls++;return wait.promise};const form=sharedForm('login');form.values={username:sharedTestUser.email,password:'fictional-password'};const pending=a.submit('login',form.values,form);
  if(navigation==='link')await a.click({go:'/faq'});else a.set('history.back()');assert.equal(a.read('location.pathname'),'/faq');form.isConnected=false;wait.resolve({user:copy(sharedTestUser)});await pending;
  assert.equal(a.read('location.pathname'),'/faq','A completed old login must not replace the page the user chose');assert.equal(a.read('authUser.id'),sharedTestUser.id,'The current successful service session remains valid');assert.equal(a.read('loginPending'),false);assert.equal(calls,1);assert.match(a.nodes['#app'].innerHTML,/FAQ/);
 }
});

test('a successful login after leaving updates the existing account link without remounting the chosen page or losing focus and scroll',async()=>{
 for(const focusedOn of ['main','account-link']){
  const a=await sharedApp();await a.click({action:'logout'});const wait=deferred(),form=sharedForm('login');a.client.login=()=>wait.promise;form.values={username:sharedTestUser.email,password:'fictional-password'};const pending=a.submit('login',form.values,form);await a.click({go:'/faq'});form.isConnected=false;
  const classes=new Set(['login-icon']),attributes={href:'/login','aria-label':'Login',title:'Login'},accountLink={dataset:{go:'/login'},classList:{toggle:(key,on)=>on?classes.add(key):classes.delete(key),contains:key=>classes.has(key)},setAttribute:(key,value)=>attributes[key]=String(value)},main={scrollTop:183},field={value:'Unsubmitted text'},faq={open:true};a.nodes['.site-header .login-icon']=accountLink;a.nodes['main']=main;a.ctx.document.activeElement=focusedOn==='main'?field:accountLink;a.ctx.window.scrollY=427;let mainWrites=0,html=a.nodes['#app'].innerHTML;Object.defineProperty(a.nodes['#app'],'innerHTML',{configurable:true,get:()=>html,set(value){mainWrites++;html=value;main.scrollTop=0;field.value='';faq.open=false;a.ctx.document.activeElement=a.ctx.document.body;}});
  wait.resolve({user:copy(sharedTestUser)});await pending;assert.equal(a.read('location.pathname'),'/faq');assert.equal(a.read('authUser.id'),sharedTestUser.id);assert.equal(classes.has('account-avatar'),true,'The visible existing header must show the signed-in account');assert.equal(classes.has('login-icon'),false);assert.equal(accountLink.dataset.go,'/account');assert.equal(attributes.href,'/account');assert.equal(attributes['aria-label'],'My account');assert.equal(attributes.title,'My account');assert.equal(mainWrites,0);assert.equal(a.nodes['main'],main);assert.equal(main.scrollTop,183);assert.equal(a.ctx.window.scrollY,427);assert.equal(field.value,'Unsubmitted text');assert.equal(faq.open,true);assert.equal(a.ctx.document.activeElement,focusedOn==='main'?field:accountLink);
 }
});

test('an expired catalogue after a delayed FAQ login restores the existing public login link without remounting or moving focus',async()=>{
 const a=await sharedApp();await a.click({action:'logout'});const login=deferred(),catalogue=deferred(),form=sharedForm('login');let reads=0;a.client.login=()=>login.promise;a.client.courses=()=>{reads++;return catalogue.promise};form.values={username:sharedTestUser.email,password:'fictional-password'};const pending=a.submit('login',form.values,form);await a.click({go:'/faq'});form.isConnected=false;
 const {classes,attributes,link}=publicAccountLinkFixture(a,{signedIn:false}),field={value:'Keep this FAQ draft'};a.ctx.document.activeElement=field;a.ctx.window.scrollY=427;const writes=observeAppWrites(a);
 login.resolve({user:copy(sharedTestUser)});await until(()=>reads===1,'The successful session must reach its catalogue read');assert.equal(classes.has('account-avatar'),true);catalogue.reject(serviceError(401,'AUTH_REQUIRED'));await pending;
 assert.equal(a.read('authUser'),null);assert.equal(a.read('role'),'');assert.equal(a.read('location.pathname'),'/faq');assert.equal(classes.has('login-icon'),true,'The authoritative session expiry must restore the visible login link');assert.equal(classes.has('account-avatar'),false);assert.equal(link.dataset.go,'/login');assert.equal(attributes.href,'/login');assert.equal(attributes['aria-label'],'Login');assert.equal(attributes.title,'Login');assert.equal(writes(),0);assert.equal(a.ctx.document.activeElement,field);assert.equal(a.ctx.window.scrollY,427);assert.equal(field.value,'Keep this FAQ draft');
});

test('public account labels follow current identity and language while an old catalogue expiry cannot sign out a newer student',async()=>{
 for(const language of ['en','zh']){
  const a=await sharedApp();a.set("go('/faq')");const old=deferred();a.client.courses=()=>old.promise;const pending=a.set('refreshSharedCourses({paint:false})'),{classes,attributes,link}=publicAccountLinkFixture(a);a.ctx.document.activeElement=link;a.ctx.window.scrollY=193;const writes=observeAppWrites(a);a.ctx.currentHeaderLanguage=language;
  a.set("lang=currentHeaderLanguage;applySharedUser({id:'header-teacher',role:'teacher',displayName:'Teacher',email:'teacher@example.test'});applySharedUser({id:'header-student',role:'student',displayName:'Student',email:'student@example.test'})");
  assert.equal(a.read('role'),'student');assert.equal(attributes['aria-label'],language==='zh'?'我的帳戶':'My account');assert.equal(attributes.title,language==='zh'?'我的帳戶':'My account');assert.equal(link.dataset.go,'/account');old.reject(serviceError(401,'AUTH_REQUIRED'));await assert.rejects(pending,error=>error.status===401);assert.equal(a.read('authUser.id'),'header-student');assert.equal(classes.has('account-avatar'),true);assert.equal(link.dataset.go,'/account');
  a.set('applySharedUser(null)');assert.equal(classes.has('login-icon'),true);assert.equal(classes.has('account-avatar'),false);assert.equal(link.dataset.go,'/login');assert.equal(attributes.href,'/login');assert.equal(attributes['aria-label'],language==='zh'?'登入':'Login');assert.equal(attributes.title,language==='zh'?'登入':'Login');assert.equal(writes(),0);assert.equal(a.ctx.document.activeElement,link);assert.equal(a.ctx.window.scrollY,193);
 }
});

test('logging out during an old login catalogue read permits a new account login and the old finally cannot unlock it',async()=>{
 const student={id:'qa-student-login',role:'student',displayName:'Test student',email:'student@example.test'},a=await sharedApp({session:async()=>({user:student})});a.set("history.replaceState({},'','/account')");await a.click({action:'logout'});const catalogue=deferred();let catalogueReads=0;a.client.courses=()=>{catalogueReads++;return catalogue.promise};a.client.login=async()=>({user:student});const original=sharedForm('login');original.values={username:student.email,password:'fictional-password'};const pending=a.submit('login',original.values,original);await until(()=>a.read('authUser?.id??null')===student.id&&catalogueReads===1,'Authentication must succeed before the slow catalogue read');assert.equal(a.read('loginPending'),true);
 a.set('history.back()');assert.equal(a.read('location.pathname'),'/account');await a.click({action:'logout'});assert.equal(a.read('authUser'),null);assert.equal(a.read('location.pathname'),'/login');const next=deferred();let newLoginRequests=0;a.client.login=()=>{newLoginRequests++;return next.promise};const form=sharedForm('login');form.values={username:'next-admin@example.test',password:'fictional-password'};const newer=a.submit('login',form.values,form);assert.equal(newLoginRequests,1,'The new account must really send its login request without waiting for the old catalogue');assert.equal(form.submitButton.disabled,true);assert.equal(a.read('loginPending'),true);
 catalogue.resolve({courses:[]});await pending;assert.equal(a.read('loginPending'),true,'The detached old finally must not release the new login job');assert.equal(form.submitButton.disabled,true);assert.equal(a.read('authUser'),null);const admin={...copy(sharedTestUser),id:'next-auth-admin',email:'next-admin@example.test'};next.resolve({user:admin});await newer;assert.equal(a.read('authUser.id'),admin.id);assert.equal(a.read('location.pathname'),'/account');assert.equal(a.read('loginPending'),false);assert.equal(form.submitButton.disabled,false);
});

test('the current login still rejects duplicate submits, presents its error and allows a successful retry',async()=>{
 const a=await sharedApp();await a.click({action:'logout'});const wait=deferred(),form=sharedForm('login');let calls=0;a.client.login=()=>{calls++;return wait.promise};form.values={username:sharedTestUser.email,password:'fictional-password'};const pending=a.submit('login',form.values,form);await a.submit('login',form.values,form);assert.equal(calls,1);assert.equal(form.submitButton.disabled,true);assert.equal(a.read('loginPending'),true);wait.reject(serviceError(401,'INVALID_CREDENTIALS'));await pending;assert.equal(a.read('loginPending'),false);assert.equal(form.submitButton.disabled,false);assert.ok(a.nodes['#login-error'].textContent);assert.equal(a.read('authUser'),null);assert.equal(a.read('location.pathname'),'/login');
 a.client.login=async()=>{calls++;return {user:copy(sharedTestUser)}};await a.submit('login',form.values,form);assert.equal(calls,2);assert.equal(a.read('authUser.id'),sharedTestUser.id);assert.equal(a.read('location.pathname'),'/account');assert.equal(a.read('loginPending'),false);
});

test('a current login whose catalogue reports an expired session releases its job and stays signed out',async()=>{
 const a=await sharedApp();await a.click({action:'logout'});a.client.login=async()=>({user:copy(sharedTestUser)});a.client.courses=async()=>{throw serviceError(401,'AUTH_REQUIRED')};const form=sharedForm('login');form.values={username:sharedTestUser.email,password:'fictional-password'};await a.submit('login',form.values,form);assert.equal(a.read('authUser'),null);assert.equal(a.read('role'),'');assert.equal(a.read('location.pathname'),'/login');assert.equal(a.read('loginPending'),false);assert.equal(a.read('loginJob'),null);assert.equal(form.submitButton.disabled,false);
});

test('a superseded login completion cannot publish an old error or repaint another authenticated identity',async()=>{
 const a=await sharedApp(),old=deferred(),form=sharedForm('login'),errorNode={textContent:''};
 a.nodes['#login-error']=errorNode;a.client.login=()=>old.promise;
 form.values={username:'previous@example.test',password:'fictional-password'};const pending=a.submit('login',form.values,form);
 switchSharedIdentity(a);form.isConnected=false;delete a.nodes['#login-error'];
 const query=a.ctx.document.querySelector;a.ctx.document.querySelector=selector=>selector==='#login-error'?null:query(selector);
 const writes=observeAppWrites(a),view=a.nodes['#app'].innerHTML;
 old.reject(serviceError(0,'AUTH_SUPERSEDED'));await pending;
 assert.equal(a.read('authUser.id'),'next-auth-admin');assert.equal(a.read('db.courseSettings[0].courseName'),'New account preserved course');
 assert.equal(errorNode.textContent,'');assert.equal(writes(),0);assert.equal(a.nodes['#app'].innerHTML,view);assert.deepEqual(a.messages,[]);
});

test('a superseded logout completion cannot clear another account or display a false connection error',async()=>{
 const a=await sharedApp(),old=deferred();a.client.logout=()=>old.promise;const pending=a.set('sharedLogout()');
 switchSharedIdentity(a);const writes=observeAppWrites(a),view=a.nodes['#app'].innerHTML;
 old.reject(serviceError(0,'AUTH_SUPERSEDED'));await pending;
 assert.equal(a.read('authUser.id'),'next-auth-admin');assert.equal(a.read('location.pathname'),'/account');assert.equal(a.read('db.courseSettings[0].courseName'),'New account preserved course');
 assert.equal(writes(),0);assert.equal(a.nodes['#app'].innerHTML,view);assert.deepEqual(a.messages,[]);
});

test('a superseded startup session cannot log out or repaint the identity whose later login already succeeded',async()=>{
 const old=deferred(),user={id:'next-auth-admin',role:'admin',displayName:'Next manager',email:'next@example.test'},record={...copy(sharedTestCourse),courseName:'New account preserved course'};let sessions=0;
 const client={health:async()=>({mode:'shared-test'}),session:()=>{sessions++;return old.promise},login:async()=>({user:copy(user)}),courses:async()=>({courses:[record]}),fees:async()=>({fees:[copy(sharedTestFee)]}),invalidateSession(){}};
 const a=app({},'2026-10-14T12:00:00',false,client,{pathname:'/login'});await until(()=>sessions===1,'The startup session must really be pending');
 const form=sharedForm('login');form.values={username:user.email,password:'fictional-password'};await a.submit('login',form.values,form);
 assert.equal(a.read('authUser.id'),user.id);assert.equal(a.read('location.pathname'),'/account');
 const writes=observeAppWrites(a),view=a.nodes['#app'].innerHTML;
 old.reject(serviceError(0,'AUTH_SUPERSEDED'));await until(()=>a.read('sharedReady'),'Superseded bootstrap must still release its ready state');
 assert.equal(a.read('authUser?.id??null'),user.id);assert.equal(a.read('db.courseSettings[0]?.courseName??null'),'New account preserved course');
 assert.equal(writes(),0,'A stale bootstrap must not reconstruct the current form and lose its entered values');assert.equal(a.nodes['#app'].innerHTML,view);
});

test('a server-rejected file with a supported PNG name requires removal instead of retransferring the same immutable bad content',async()=>{
 const a=await attachmentApp(),good={name:'Preserved preparation.pdf',type:'application/pdf',size:420},bad={name:'Bad content.png',type:'image/png',size:101},uploads=[];
 a.set('openMaterialEditor()');a.ctx.queuedFiles=[good,bad];a.set('addMaterialFiles(queuedFiles)');
 assert.equal(a.read('materialAttachmentDraft[1].issue'),'','The PNG file name and size must genuinely pass the browser precheck');
 a.client.uploadMaterialAttachment=async(courseId,file,options)=>{uploads.push({file,options});if(file===bad)throw serviceError(400,'INVALID_ATTACHMENT');return a.reply(file,'preserved-good-file')};
 const form=materialForm();await a.submit(form.id,form.values,form);assert.equal(uploads.length,2);
 assert.ok(a.read('materialAttachmentDraft[1].issue'),'Permanent server content rejection must require removal or replacement');
 assert.equal(a.read('materialAttachmentDraft[0].result.id'),'preserved-good-file');assert.equal(form.values.name,'Saved material');assert.ok(a.read('modal'));
 assert.match(a.nodes['#material-attachment-drafts'].innerHTML,/Cannot upload; remove or replace/);assert.doesNotMatch(a.nodes['#material-attachment-drafts'].innerHTML,/save again to retry/);
 await a.submit(form.id,form.values,form);assert.equal(uploads.length,2,'Repeated Save must not retransmit a file the server already identified as invalid');
 assert.equal(a.read('materialAttachmentDraft[0].result.id'),'preserved-good-file');assert.equal(a.calls.filter(call=>call.operation==='material').length,0);
});

const sharedScheduleRecord=(overrides={})=>({id:'qa-schedule',course:'qa-course',color:'#27777b',startDate:'2026-10-08',endMode:'count',endDate:'',count:4,time:'10:00',duration:45,weekdays:[4],mustAttendAll:true,teacher:'',room:'',capacity:8,session:1,remark:'Private scheduling note',detail:'Internal preparation',moreInfo:'Bring an apron',version:1,createdAt:'2026-10-14T00:00:00Z',updatedAt:'2026-10-14T00:00:00Z',...overrides});
function teacherScheduleFixture(record,{sequence=1,date=record.startDate,revision='explicitly-authorized-teacher-occurrence'}={}){
 const {weekdays,endMode,endDate,count,segments,exceptions,activityDeleted,...item}=copy(record);return {revision,readScope:'occurrences',occurrences:[{sequence,date,item:{...item,startDate:date,session:(record.session||1)+sequence-1}}]};
}
function sharedScheduleForm({id='',version='',values={}}={}){
 const form=sharedForm('schedule-editor',{recordId:id,version});form.dataset.operationKey='stable-schedule-'+(id||'new');form.isConnected=true;
 form.values=scheduleValues({course:'qa-course',startDate:'2026-10-08',endMode:'count',count:'4',time:'10:00',duration:'45',capacity:'8',...values});return form;
}
async function sharedScheduleApp(remote={rows:[],revision:1},overrides={},options={}){
 const scheduleCalls=[],polls=[],focus=[],windowEvents={};
 const client={
  async schedules(since){scheduleCalls.push({operation:'read',since});const revision='schedule-'+remote.revision;return since===revision?{unchanged:true,revision}:{schedules:copy(remote.rows),revision}},
  async saveSchedule(record,current,operationKey){
   scheduleCalls.push({operation:'save',record:copy(record),current:current?copy(current):null,operationKey});
   const previous=current&&remote.rows.find(row=>row.id===current.id);
   if(current&&(!previous||previous.version!==current.version))throw serviceError(409,'VERSION_CONFLICT');
   const saved=sharedScheduleRecord({...record,id:current?.id||'qa-created-schedule',version:previous?previous.version+1:1});
   remote.rows=remote.rows.filter(row=>row.id!==saved.id);remote.rows.push(saved);remote.revision++;return {schedule:copy(saved)};
  },
  ...overrides,
 };
 const a=await sharedApp(client,{}, {...options,onInterval:(handler,ms)=>{polls.push({handler,ms});return polls.length},onWindowEvent:(type,handler)=>{(windowEvents[type]??=[]).push(handler);if(type==='focus')focus.push(handler)}});
 a.set("tab='overview';selectTimetableDate('2026-10-08');location.pathname='/account';render()");
 await a.set('refreshSharedSchedules({paint:false})');
 return {...a,remote,scheduleCalls,polls,focus,windowEvents};
}

test('course timetable navigation clears conflicting display filters, shows its course and restores the source workspace',async()=>{
 for(const view of ['day','week','range']){
  const a=await sharedScheduleApp({rows:[scopedScheduleRecord()],revision:1}),before=a.read('db');a.set("tab='catalog';location.pathname='/account';render()");await a.click({openCourse:'qa-course'});
  a.set(`courseDetailMonth=new Date(2026,9,1);courseDetailTab='general';timetableView=${JSON.stringify(view)};timetableViewSettings.rangeDays=8;selectTimetableDate('2026-10-01');timetableSearch='unrelated old search';timetableResourceSearch='old room';timetableSelections={rooms:['missing-room'],teachers:['missing-teacher']};timetableClassTypeFilter='old-type';render()`);
  const prefs=a.read('({timetableDate,timetableView,timetableSearch,timetableResourceSearch,timetableSelections,timetableClassTypeFilter,rangeDays:timetableViewSettings.rangeDays})'),scroll={scrollTop:317,scrollLeft:18},group={dataset:{courseScheduleGroup:'schedule:qa-scoped-series'},open:true};a.nodes['.course-schedule-scroll']=scroll;a.ctx.document.querySelectorAll=selector=>selector==='.course-schedule-group'?[group]:[];
  a.change('','timetable',{id:'course-detail-view'});assert.equal(a.read('location.pathname'),'/account');assert.equal(a.read('tab'),'overview');assert.equal(a.read('timetableView'),view);assert.equal(a.read('timetableViewSettings.rangeDays'),8);assert.equal(a.read('timetableDate'),'2026-10-14');assert.equal(a.read('timetableSearch'),'');assert.equal(a.read('timetableResourceSearch'),'');assert.equal(a.read('timetableClassTypeFilter'),'');assert.deepEqual(a.read('timetableSelections'),{rooms:[],teachers:[]});assert.match(a.nodes['#app'].innerHTML,/Course: Shared studio/);assert.match(a.nodes['#app'].innerHTML,/data-open-lesson="qa-scoped-series"/);assert.match(a.nodes['#app'].innerHTML,/Back to Shared studio/);
  scroll.scrollTop=0;scroll.scrollLeft=0;group.open=false;await a.click({action:'tt-back-course'});assert.equal(a.read('location.pathname'),'/account/courses/qa-course');assert.equal(a.read('courseDetailMonth.getMonth()'),9);assert.equal(a.read('courseDetailTab'),'general');assert.equal(scroll.scrollTop,317);assert.equal(scroll.scrollLeft,18);assert.equal(group.open,true);assert.deepEqual(a.read('({timetableDate,timetableView,timetableSearch,timetableResourceSearch,timetableSelections,timetableClassTypeFilter,rangeDays:timetableViewSettings.rangeDays})'),prefs);assert.deepEqual(a.read('db'),before);
 }
});

test('course timetable history Back and Forward restore scoped views and discard the old lesson modal',async()=>{
 const a=await sharedScheduleApp({rows:[scopedScheduleRecord()],revision:1});a.set("tab='catalog';location.pathname='/account';history.replaceState({foreign:{kept:true}},'',location.pathname);render()");await a.click({openCourse:'qa-course'});a.set("courseDetailMonth=new Date(2026,9,1);courseDetailTab='materials';render()");a.change('','timetable',{id:'course-detail-view'});
 assert.equal(a.read('history.state.foreign.kept'),true);a.set("openTimetableLesson('qa-scoped-series','schedule','2026-10-14',1)");assert.ok(a.read('selectedTimetableLesson'));a.set('history.back()');assert.equal(a.read('location.pathname'),'/account/courses/qa-course');assert.equal(a.read('tab'),'catalog');assert.equal(a.read('courseDetailTab'),'materials');assert.equal(a.read('selectedTimetableLesson'),null);assert.equal(a.read('modal'),'');
 a.set('history.forward()');assert.equal(a.read('location.pathname'),'/account');assert.equal(a.read('tab'),'overview');assert.deepEqual(a.read('timetableLessonFilter'),{course:'qa-course'});assert.match(a.nodes['#app'].innerHTML,/Course: Shared studio/);assert.equal(a.read('modal'),'');const serialized=JSON.stringify(a.read('history.state'));assert.doesNotMatch(serialized,/"students":\[|"bookings":|"orders":|innerHTML|isConnected/);assert.equal(a.read('history.state.foreign.kept'),true);
});

test('each course row opens its stable course timetable and returns to its exact filtered sorted list with focus and scrolling',async()=>{
 for(const returnViaHistory of [false,true]){
  const a=await sharedScheduleApp({rows:[scopedScheduleRecord(),scopedScheduleRecord({id:'other-series',course:'qa-other-course'})],revision:1});a.state.courses.push({...copy(sharedTestCourse),id:'qa-other-course',courseCode:'CO-702',fees:[],feeIds:[]});await a.set('refreshSharedCourses({paint:false})');
  a.set("tab='catalog';location.pathname='/account';courseSearch='Shared';courseCategoryFilter='Art';courseLevelFilter='Beginner';courseStatusFilter='active';courseSortKey='level';courseSortDirection='desc';courseDetailMonth=new Date(2027,0,1);selectTimetableDate('2026-10-01');timetableView='range';timetableViewSettings.rangeDays=8;timetableSearch='unrelated search';timetableResourceSearch='old room';timetableSelections={rooms:['missing-room'],teachers:['missing-teacher']};timetableClassTypeFilter='old-type';history.replaceState({foreign:{kept:true}},'',location.pathname);render()");
  const html=a.nodes['#app'].innerHTML,buttons=[...html.matchAll(/<button\b[^>]*data-course-timetable="[^"]+"[^>]*>/g)].map(row=>row[0]);assert.equal(buttons.length,2,'Every active readable course needs its own timetable action');assert.match(html,/<table class="course-list-with-actions">/);assert.match(html,/<th class="course-row-actions">Actions<\/th>/);assert.doesNotMatch(html,/data-action="course-view-timetable"/,'The directory must not retain a second unscoped timetable launcher');
  const tag=buttons.find(button=>button.includes('data-course-timetable="qa-other-course"')),dataset=markupDataset(tag),filters=a.read('({courseSearch,courseCategoryFilter,courseLevelFilter,courseStatusFilter,courseSortKey,courseSortDirection})'),preferences=a.read('captureTimetablePreferences()'),db=a.read('db'),content={scrollTop:317,scrollLeft:4},table={scrollTop:28,scrollLeft:219};a.nodes['.portal-content']=content;a.nodes['.portal-course-table']=table;let focused='';
  const opener={dataset,isConnected:true,closest:()=>null,focus(options){assert.equal(options?.preventScroll,true);focused=dataset.courseTimetable}},wrong={dataset:{courseTimetable:'qa-course'},focus(){focused='wrong'}};a.ctx.document.activeElement=opener;a.ctx.document.querySelectorAll=selector=>selector==='button'?[wrong,opener]:selector==='.portal-content'?[content]:selector==='.portal-course-table'?[table]:[];
  await a.nativeClick({closest:selector=>selector.split(',').includes('[data-course-timetable]')?opener:null});assert.equal(a.read('location.pathname'),'/account');assert.equal(a.read('tab'),'overview');assert.deepEqual(a.read('timetableLessonFilter'),{course:'qa-other-course'});assert.equal(a.read('timetableDate'),'2026-10-14','A list action uses the current timetable month, not a stale course-detail month');assert.equal(a.read('timetableView'),'range');assert.equal(a.read('timetableSearch'),'');assert.equal(a.read('timetableResourceSearch'),'');assert.equal(a.read('timetableClassTypeFilter'),'');assert.deepEqual(a.read('timetableSelections'),{rooms:[],teachers:[]});assert.match(a.nodes['#app'].innerHTML,/Back to courses/);assert.match(a.nodes['#app'].innerHTML,/data-open-lesson="other-series"/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-open-lesson="qa-scoped-series"/);
  content.scrollTop=0;content.scrollLeft=0;table.scrollTop=0;table.scrollLeft=0;if(returnViaHistory)a.set('history.back()');else await a.click({action:'tt-back-course'});assert.equal(a.read('tab'),'catalog');assert.deepEqual(a.read('({courseSearch,courseCategoryFilter,courseLevelFilter,courseStatusFilter,courseSortKey,courseSortDirection})'),filters);assert.deepEqual(a.read('captureTimetablePreferences()'),preferences);assert.equal(content.scrollTop,317);assert.equal(content.scrollLeft,4);assert.equal(table.scrollTop,28);assert.equal(table.scrollLeft,219);assert.equal(focused,'qa-other-course');assert.equal(a.read('history.state.foreign.kept'),true);assert.deepEqual(a.read('db'),db);
  if(returnViaHistory){a.set('history.forward()');assert.equal(a.read('tab'),'overview');assert.deepEqual(a.read('timetableLessonFilter'),{course:'qa-other-course'});assert.match(a.nodes['#app'].innerHTML,/Back to courses/);}
 }
});

test('course row timetable actions respect readable teacher courses and omit deleted and student rows',async()=>{
 const series=scopedScheduleRecord(),user={...copy(sharedTestUser),role:'teacher'},a=await sharedScheduleApp({rows:[],revision:1},{session:async()=>({user}),schedules:async()=>teacherScheduleFixture(series,{sequence:2,date:'2026-10-21'})});a.set("tab='catalog';location.pathname='/account';render()");const tag=a.nodes['#app'].innerHTML.match(/<button\b[^>]*data-course-timetable="qa-course"[^>]*>/)?.[0];assert.ok(tag);assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-course-timetable="unreadable-course"/);await a.click({courseTimetable:'unreadable-course'});assert.equal(a.read('tab'),'catalog');assert.equal(a.read('courseTimetableOrigin'),null);
 await a.click(markupDataset(tag));assert.equal(a.read('tab'),'overview');await a.set('refreshSharedSchedules({paint:false})');assert.equal(a.read('sharedScheduleOccurrences.length'),1);assert.equal(a.read('db.schedules.length'),0);await a.click({action:'tt-clear-lesson'});assert.equal(a.read('timetableLessonFilter'),null);assert.equal(a.read('sharedScheduleOccurrences.length'),1);assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-lesson-sequence="1"/);await a.click({action:'tt-back-course'});assert.equal(a.read('tab'),'catalog');
 a.set("db.courseSettings[0].deletedAt='2026-10-15T00:00:00Z';courseStatusFilter='deleted';render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-course-timetable=/);assert.match(a.nodes['#app'].innerHTML,/data-action="course-restore"/);await a.click({courseTimetable:'qa-course'});assert.equal(a.read('tab'),'catalog');assert.equal(a.read('courseTimetableOrigin'),null);
 a.set("role='student';authUser={id:'qa-student',role:'student'};db.courseSettings[0].deletedAt=null;courseStatusFilter='active';tab='courses';render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-course-timetable=|course-list-with-actions/);await a.click({courseTimetable:'qa-course'});assert.equal(a.read('tab'),'courses');assert.equal(a.read('courseTimetableOrigin'),null);
});

test('a pending course-row timetable read cannot replace a changed role, access scope or filtered source list',async()=>{
 for(const change of ['student','access','filter']){
  const series=scopedScheduleRecord(),user={...copy(sharedTestUser),role:'teacher'},a=await sharedScheduleApp({rows:[],revision:1},{session:async()=>({user}),schedules:async()=>teacherScheduleFixture(series,{sequence:2,date:'2026-10-21'})});a.set("tab='catalog';location.pathname='/account';render()");await a.set('refreshSharedSchedules({paint:false})');const tag=a.nodes['#app'].innerHTML.match(/<button\b[^>]*data-course-timetable="qa-course"[^>]*>/)?.[0];assert.ok(tag);
  const wait=deferred();let reads=0;a.client.schedules=()=>{reads++;return wait.promise};const pending=a.click(markupDataset(tag));await until(()=>reads===1,'The row action must wait for the current teacher-authorized schedule source');
  if(change==='filter')a.set("courseSearch='Different search';render()");else {a.ctx.changedCourseUser={...user,...(change==='student'?{id:'qa-parent',role:'student'}:{accessRevision:'new-course-access'})};a.set("applySharedUser(changedCourseUser);tab=authUser.role==='student'?'payments':'catalog';render()");}
  const destination=a.read('({path:location.pathname,tab,role,identity:authUser.id})');wait.resolve(teacherScheduleFixture(series,{sequence:2,date:'2026-10-21'}));await pending;assert.deepEqual(a.read('({path:location.pathname,tab,role,identity:authUser.id})'),destination);assert.equal(a.read('courseTimetableOrigin'),null);assert.equal(a.read('timetableLessonFilter'),null);if(change==='filter')assert.equal(a.read('courseSearch'),'Different search');
 }
});

test('Fees course links return to the exact fee source and browser history retains Fees rather than Courses',async()=>{
 const a=await sharedScheduleApp({rows:[scopedScheduleRecord()],revision:1});a.set("sharedFees.push({...sharedFees[0],id:'same-name-fee',courseIds:['qa-course']});feeSearch='Shared';feeFilter='single';tab='fees';location.pathname='/account/fees';history.replaceState({foreign:'keep'},'',location.pathname);render()");const tag=[...a.nodes['#app'].innerHTML.matchAll(/<button\b[^>]*data-open-course="qa-course"[^>]*>/g)].map(row=>row[0]).find(row=>row.includes('data-source-fee-id="qa-fee"'));assert.ok(tag,'A course link must identify its original fee, even when names repeat');
 const scroll={scrollTop:241,scrollLeft:0};a.nodes['.portal-content']=scroll;await a.click(markupDataset(tag));assert.match(a.nodes['#app'].innerHTML,/Back to fees/);a.set('history.back()');assert.equal(a.read('location.pathname'),'/account/fees');assert.equal(a.read('tab'),'fees');assert.equal(a.read('feeSearch'),'Shared');assert.equal(a.read('feeFilter'),'single');a.set('history.forward()');assert.equal(a.read('accountCourseId()'),'qa-course');assert.match(a.nodes['#app'].innerHTML,/Back to fees/);
 let target='';a.ctx.document.querySelectorAll=selector=>selector==='[data-open-course]'?[{dataset:{openCourse:'qa-course',sourceFeeId:'same-name-fee'},focus(){target='wrong'}},{dataset:{openCourse:'qa-course',sourceFeeId:'qa-fee'},focus(options){assert.equal(options?.preventScroll,true);target='qa-fee'}}]:[];scroll.scrollTop=0;await a.click({action:'course-back-source'});assert.equal(target,'qa-fee');assert.equal(scroll.scrollTop,241);assert.equal(a.read('location.pathname'),'/account/fees');assert.equal(a.read('history.state.foreign'),'keep');
});

test('course source return uses a safe fallback for a removed fee and a direct URL falls back to Courses',async()=>{
 const a=await sharedScheduleApp({rows:[scopedScheduleRecord()],revision:1});a.set("tab='fees';location.pathname='/account/fees';render()");await a.click({openCourse:'qa-course',sourceFeeId:'qa-fee'});a.set("sharedFees=[]");let focused=0;a.nodes['#fee-status']={focus(options){assert.equal(options?.preventScroll,true);focused++}};a.ctx.document.querySelectorAll=()=>[];await a.click({action:'course-back-source'});assert.equal(a.read('location.pathname'),'/account/fees');assert.equal(a.read('tab'),'fees');assert.equal(focused,1);
 const direct=await sharedScheduleApp();direct.set("location.pathname='/account/courses/qa-course';tab='catalog';render()");await direct.click({action:'course-back-source'});assert.equal(direct.read('location.pathname'),'/account');assert.equal(direct.read('tab'),'catalog');
});

test('course timetable clear removes only its display constraint while a teacher keeps the authorized occurrence scope',async()=>{
 const series=scopedScheduleRecord(),user={...copy(sharedTestUser),role:'teacher'},a=await sharedScheduleApp({rows:[],revision:1},{session:async()=>({user}),schedules:async()=>teacherScheduleFixture(series,{sequence:2,date:'2026-10-21'})});a.set("tab='catalog';location.pathname='/account';render()");await a.click({openCourse:'qa-course'});a.set("courseDetailMonth=new Date(2026,9,1);selectTimetableDate('2026-10-01');timetableView='day';render()");a.change('','timetable',{id:'course-detail-view'});await until(()=>a.read('location.pathname')==='/account','The authorized course month must finish loading before opening its timetable');await a.set('refreshSharedSchedules()');assert.equal(a.read('timetableDate'),'2026-10-21');assert.match(a.nodes['#app'].innerHTML,/data-lesson-sequence="2"/);await a.click({action:'tt-clear-lesson'});assert.equal(a.read('timetableLessonFilter'),null);assert.equal(a.read('sharedScheduleOccurrences.length'),1);assert.equal(a.read('db.schedules.length'),0);assert.match(a.nodes['#app'].innerHTML,/Back to Shared studio/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-lesson-sequence="1"/);
});

test('course navigation history is invalidated when account access changes',async()=>{
 const a=await sharedScheduleApp({rows:[scopedScheduleRecord()],revision:1});a.set("tab='fees';location.pathname='/account/fees';render()");await a.click({openCourse:'qa-course',sourceFeeId:'qa-fee'});a.change('','timetable',{id:'course-detail-view'});a.set(`applySharedUser(${JSON.stringify({...copy(sharedTestUser),accessRevision:'changed-access'})});render();history.back()`);assert.equal(a.read('courseDetailOrigin'),null);assert.equal(a.read('courseTimetableOrigin'),null);assert.doesNotMatch(a.nodes['#app'].innerHTML,/Back to fees|Back to Shared studio/);assert.equal(a.read('modal'),'');
});

test('course navigation returns to the filtered Courses list and retains an honestly empty month',async()=>{
 const a=await sharedScheduleApp({rows:[scopedScheduleRecord()],revision:1});a.set("tab='catalog';location.pathname='/account';courseSearch='Shared';courseCategoryFilter='Art';courseLevelFilter='Beginner';courseStatusFilter='active';courseSortKey='courseName';courseSortDirection='desc';render()");const before=a.read('({courseSearch,courseCategoryFilter,courseLevelFilter,courseStatusFilter,courseSortKey,courseSortDirection})');await a.click({openCourse:'qa-course'});a.set("courseDetailMonth=new Date(2027,0,1);timetableView='day';render()");a.change('','timetable',{id:'course-detail-view'});assert.equal(a.read('timetableDate'),'2027-01-01');assert.match(a.nodes['#app'].innerHTML,/Course: Shared studio/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-open-lesson="qa-scoped-series"/);await a.click({action:'tt-back-course'});assert.equal(a.read('courseDetailMonth.getFullYear()'),2027);assert.equal(a.read('courseDetailMonth.getMonth()'),0);await a.click({action:'course-back-source'});assert.equal(a.read('tab'),'catalog');assert.deepEqual(a.read('({courseSearch,courseCategoryFilter,courseLevelFilter,courseStatusFilter,courseSortKey,courseSortDirection})'),before);assert.match(a.nodes['#app'].innerHTML,/data-open-course="qa-course"/);
});

test('course timetable navigation is bilingual and a removed course cannot retain its return control',async()=>{
 const a=await sharedScheduleApp({rows:[scopedScheduleRecord()],revision:1});a.set("tab='catalog';location.pathname='/account';lang='zh';render()");await a.click({openCourse:'qa-course'});a.set("courseDetailMonth=new Date(2026,9,1)");a.change('','timetable',{id:'course-detail-view'});assert.match(a.nodes['#app'].innerHTML,/課程: Shared studio/);assert.match(a.nodes['#app'].innerHTML,/返回 Shared studio/);a.set("db.courseSettings=[];render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-action="tt-back-course"/);await a.click({action:'tt-back-course'});assert.equal(a.read('location.pathname'),'/account');assert.equal(a.read('tab'),'overview');
});

test('a delayed authorized course-month read cannot navigate back after the teacher leaves',async()=>{
 const series=scopedScheduleRecord(),user={...copy(sharedTestUser),role:'teacher'},a=await sharedScheduleApp({rows:[],revision:1},{session:async()=>({user}),schedules:async()=>teacherScheduleFixture(series,{sequence:2,date:'2026-10-21'})});a.set("tab='catalog';location.pathname='/account';render()");await a.click({openCourse:'qa-course'});await a.set('refreshSharedSchedules({paint:false})');const wait=deferred();let reads=0;a.client.schedules=()=>{reads++;return wait.promise};a.change('','timetable',{id:'course-detail-view'});await until(()=>reads===1,'The teacher navigation must use an authorized course-month read');await a.click({tab:'catalog'});const destination=a.read('location.pathname');wait.resolve(teacherScheduleFixture(series,{sequence:2,date:'2026-10-21'}));await until(()=>a.read('scheduleReadPromise')===null,'The old course read must finish');assert.equal(a.read('location.pathname'),destination);assert.equal(a.read('tab'),'catalog');assert.equal(a.read('courseTimetableOrigin'),null);assert.equal(a.read('timetableLessonFilter'),null);
});

test('an in-flight teacher course read failure leaves the source visible and a successful retry opens its timetable',async()=>{
 const series=scopedScheduleRecord(),user={...copy(sharedTestUser),role:'teacher'},a=await sharedScheduleApp({rows:[],revision:1},{session:async()=>({user}),schedules:async()=>teacherScheduleFixture(series,{sequence:2,date:'2026-10-21'})});a.set("tab='catalog';location.pathname='/account';render()");await a.click({openCourse:'qa-course'});await a.set('refreshSharedSchedules({paint:false})');
 const wait=deferred();let reads=0;a.client.schedules=()=>{reads++;return wait.promise};const background=a.set('refreshSharedSchedules()');await until(()=>reads===1,'The background course-month read must start');const navigation=a.set("openCourseTimetable({id:'course-detail-view'})");wait.reject(serviceError(503,'SERVICE_UNAVAILABLE'));await background;await navigation;assert.equal(a.read('location.pathname'),'/account/courses/qa-course');assert.equal(a.read('tab'),'catalog');assert.equal(a.read('timetableLessonFilter'),null);assert.equal(a.read('courseTimetableOrigin'),null);
 a.client.schedules=async()=>teacherScheduleFixture(series,{sequence:2,date:'2026-10-21'});await a.set("openCourseTimetable({id:'course-detail-view'})");assert.equal(a.read('location.pathname'),'/account');assert.equal(a.read('timetableDate'),'2026-10-21');
});

test('course timetable Back and Forward preserve every independently scrolling range grid',async()=>{
 const a=await sharedScheduleApp({rows:[scopedScheduleRecord()],revision:1});a.set("tab='catalog';location.pathname='/account';render()");await a.click({openCourse:'qa-course'});a.set("courseDetailMonth=new Date(2026,9,1);timetableView='range';timetableViewSettings.rangeDays=8;render()");a.change('','timetable',{id:'course-detail-view'});assert.ok((a.nodes['#app'].innerHTML.match(/class="tt-grid-scroll/g)||[]).length>1);
 const grids=[{scrollLeft:31,scrollTop:101},{scrollLeft:72,scrollTop:202}],before=copy(grids);a.nodes['.tt-grid-scroll']=grids[0];a.ctx.document.querySelectorAll=selector=>selector==='.tt-grid-scroll'?grids:[];a.set('persistCourseUiHistory();history.back()');for(const grid of grids){grid.scrollLeft=0;grid.scrollTop=0;}a.set('history.forward()');assert.deepEqual(grids,before);
});

test('course history Back dismisses its fee editor and an older save cannot close or unlock a newer editor',async()=>{
 const a=await sharedScheduleApp({rows:[scopedScheduleRecord()],revision:1});a.set("tab='fees';location.pathname='/account/fees';render()");await a.click({openCourse:'qa-course',sourceFeeId:'qa-fee'});await a.click({action:'fee-edit',feeId:'qa-fee'});assert.match(a.nodes['#modal-root'].innerHTML,/id="fee-editor"/);
 const old=deferred(),newer=deferred();let writes=0;a.client.saveFee=()=>++writes===1?old.promise:newer.promise;const form=sharedForm('fee-editor',{recordId:'qa-fee',version:'1'});form.values=sharedFeeInput();const pending=a.submit(form.id,form.values,form);assert.equal(a.read('courseSaving'),true);a.set('history.back()');assert.equal(a.read('location.pathname'),'/account/fees');assert.equal(a.read('tab'),'fees');assert.equal(a.read('modal'),'');assert.equal(a.read('courseSaving'),false);
 await a.click({action:'fee-edit',feeId:'qa-fee'});const current=sharedForm('fee-editor',{recordId:'qa-fee',version:'1'});current.values=sharedFeeInput();const saving=a.submit(current.id,current.values,current),markup=a.read('modal');old.resolve({fee:{...copy(sharedTestFee),version:2},courses:[copy(sharedTestCourse)]});await pending;assert.equal(a.read('modal'),markup);assert.equal(a.read('courseSaving'),true);assert.equal(current.submitButton.disabled,true);newer.resolve({fee:{...copy(sharedTestFee),version:2},courses:[copy(sharedTestCourse)]});await saving;assert.equal(a.read('modal'),'');assert.equal(a.read('courseSaving'),false);
});

test('a delayed authorized timetable read after Forward preserves the current reading position rather than replaying history',async()=>{
 const series=scopedScheduleRecord(),user={...copy(sharedTestUser),role:'teacher'},a=await sharedScheduleApp({rows:[],revision:1},{session:async()=>({user}),schedules:async()=>teacherScheduleFixture(series,{sequence:2,date:'2026-10-21'})});a.set("tab='catalog';location.pathname='/account';render()");await a.click({openCourse:'qa-course'});await a.set('refreshSharedSchedules({paint:false})');a.set("timetableView='range';timetableViewSettings.rangeDays=8;render()");await a.set("openCourseTimetable({id:'course-detail-view'})");await a.set('refreshSharedSchedules({paint:false})');
 const grid={scrollLeft:31,scrollTop:101};a.nodes['.tt-grid-scroll']=grid;a.ctx.document.querySelectorAll=selector=>selector==='.tt-grid-scroll'?[grid]:[];let html=a.nodes['#app'].innerHTML;Object.defineProperty(a.nodes['#app'],'innerHTML',{configurable:true,get:()=>html,set(value){html=value;grid.scrollLeft=0;grid.scrollTop=0;}});a.set('persistCourseUiHistory();history.back()');await a.set('refreshSharedSchedules({paint:false})');
 const wait=deferred();let reads=0;a.client.schedules=()=>{reads++;return wait.promise};const dateInput={id:'tt-date',value:a.read('timetableDate'),matches:selector=>selector==='input,select,textarea',focus(){a.ctx.document.activeElement=this}};a.nodes['#tt-date']=dateInput;a.set('history.forward()');await until(()=>reads===1,'Forward must load its authorized timetable window');assert.equal(grid.scrollTop,101);dateInput.value=a.read('timetableDate');a.ctx.document.activeElement=dateInput;grid.scrollLeft=44;grid.scrollTop=156;
 wait.resolve(teacherScheduleFixture(series,{sequence:2,date:'2026-10-21'}));await a.set('refreshSharedSchedules({paint:false})');assert.equal(grid.scrollLeft,44);assert.equal(grid.scrollTop,156);assert.equal(a.ctx.document.activeElement,dateInput);assert.equal(a.read('modal'),'');
});

test('shared timetable creates and edits one recurring schedule and another admin reads the same course calendar',async()=>{
 const remote={rows:[],revision:1},a=await sharedScheduleApp(remote),ack=deferred(),pricing=a.read("db.courseSettings.map(course=>({id:course.id,price:course.price,fees:course.fees,feeIds:course.feeIds}))");
 a.set("openSchedule('',{course:'qa-course'})");a.set('scheduleDraft.weekdays=[4];scheduleDraft.customWeekdays=true');
 const form=sharedScheduleForm(),save=a.client.saveSchedule;
 a.client.saveSchedule=async(...args)=>{await ack.promise;return save(...args)};
 const pending=a.submit(form.id,form.values,form);
 try{assert.equal(a.read('db.schedules.length'),0,'An unacknowledged write must not become a saved calendar entry');assert.ok(a.read('modal'));assert.ok(!a.messages.includes('Schedule saved'));}
 finally{ack.resolve();await pending;}
 assert.equal(a.scheduleCalls.filter(call=>call.operation==='save').length,1);assert.equal(remote.rows.length,1);assert.equal(a.read('modal'),'');
 const id=remote.rows[0].id;assert.equal(a.read('db.schedules[0].id'),id);assert.equal(a.read('db.schedules[0].course'),'qa-course');assert.deepEqual(a.read('schedulePreviewDates(db.schedules[0],8)'),['2026-10-08','2026-10-15','2026-10-22','2026-10-29']);
 a.set("timetableView='month';render()");let html=a.nodes['#app'].innerHTML;
 assert.equal((html.match(new RegExp('data-open-lesson="'+id+'"','g'))||[]).length,4);assert.match(html,/Shared studio/);assert.match(html,/10:00 – 10:45/);
 a.click({openLesson:id,lessonKind:'schedule',lessonDate:'2026-10-08'});assert.equal(a.read('selectedTimetableLesson.id'),id);
 const detail=a.nodes['#modal-root'].innerHTML;assert.match(detail,/<h3>Students \(—\)<\/h3>/,'An unavailable enrolment list must not be presented as a confirmed count of zero students');assert.doesNotMatch(detail,/<h3>Students \(0\)<\/h3>/);assert.match(detail,/Loading students|Could not connect/i,'An unavailable roster read must remain explicitly loading or failed, without inventing a count');
 a.click({action:'lesson-close'});
 a.set(`openSchedule('${id}')`);const editMarkup=a.nodes['#modal-root'].innerHTML,openedVersion=editMarkup.match(/id="schedule-editor"[^>]*data-version="([^"]+)"/)?.[1];assert.equal(openedVersion,'1');assert.match(editMarkup,/Changes or deletion apply to the entire recurring schedule/);assert.match(editMarkup,/Use Undo to restore a deleted schedule/);const edit=sharedScheduleForm({id,version:openedVersion,values:{time:'11:00',duration:'60',remark:'Updated shared lesson'}});
 a.input({name:'time',value:'11:00',closest:()=>({})});await a.submit(edit.id,edit.values,edit);
 assert.equal(remote.rows.length,1);assert.equal(remote.rows[0].id,id);assert.equal(remote.rows[0].course,'qa-course');assert.equal(remote.rows[0].version,2);assert.equal(remote.rows[0].time,'11:00');assert.deepEqual(a.read("db.courseSettings.map(course=>({id:course.id,price:course.price,fees:course.fees,feeIds:course.feeIds}))"),pricing,'Scheduling must preserve the existing course and its fee amounts/associations');
 const other=await sharedScheduleApp(remote,{session:async()=>({user:{...copy(sharedTestUser),id:'qa-second-admin',email:'second@example.test'}})});
 assert.equal(other.read('authUser.id'),'qa-second-admin');assert.equal(other.read('db.schedules[0].id'),id);assert.equal(other.read('db.schedules[0].time'),'11:00');
 other.set("courseDetailMonth=new Date(2026,9,1);courseDetailTab='general';location.pathname='/account/courses/qa-course';render()");html=other.nodes['#app'].innerHTML;
 assert.match(html,/Shared studio/);assert.match(html,/11:00–12:00/);assert.equal((html.match(/class="course-schedule-columns course-schedule-row"/g)||[]).length,4);
 other.change('','timetable',{id:'course-detail-view'});
 assert.equal(other.read('location.pathname'),'/account');assert.equal(other.read('timetableSearch'),'');assert.match(other.nodes['#app'].innerHTML,/Course: Shared studio/,'View in Timetable must show the readable course name in its explicit filter rather than exposing an internal course ID');
 assert.ok(other.nodes['#app'].innerHTML.includes('data-open-lesson="'+id+'"'),'The public course-to-timetable navigation must show the exact saved schedule instead of an empty filtered calendar');
});

test('shared timetable cancelling a new schedule discards the draft without sending a write or changing existing lessons',async()=>{
 const a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1}),before=a.read('db.schedules');
 a.set("openSchedule('',{course:'qa-course'})");a.input({name:'remark',value:'Unsaved scheduling draft',closest:()=>({})});a.click({action:'close'});
 assert.equal(a.read('modal'),'');assert.equal(a.read('scheduleDraft'),null);assert.deepEqual(a.read('db.schedules'),before);assert.equal(a.scheduleCalls.filter(call=>call.operation==='save').length,0);
 a.set("openSchedule('',{course:'qa-course'})");assert.equal(a.read('scheduleDraft.remark'),'');assert.equal(a.remote.rows.length,1);
});

test('shared timetable keeps the opened version and unsaved draft when a newer background schedule causes a conflict',async()=>{
 const remote={rows:[sharedScheduleRecord()],revision:1},a=await sharedScheduleApp(remote);a.set("openSchedule('qa-schedule')");
 const version=a.nodes['#modal-root'].innerHTML.match(/id="schedule-editor"[^>]*data-version="([^"]+)"/)?.[1];assert.equal(version,'1');
 a.input({name:'remark',value:'Keep my unsaved lesson draft',closest:()=>({})});
 remote.rows[0]={...remote.rows[0],time:'12:00',version:2};remote.revision++;
 await a.set('refreshSharedSchedules({paint:false})');assert.equal(a.read('db.schedules[0].version'),2);assert.equal(a.read('scheduleDraft.version'),1);
 const form=sharedScheduleForm({id:'qa-schedule',version,values:{time:'11:00',remark:'Keep my unsaved lesson draft'}});
 await a.submit(form.id,form.values,form);const sent=a.scheduleCalls.find(call=>call.operation==='save');
 assert.equal(sent.current.version,1);assert.equal(remote.rows[0].version,2);assert.equal(remote.rows[0].time,'12:00');assert.equal(a.read('scheduleDraft.remark'),'Keep my unsaved lesson draft');
 assert.ok(a.read('modal'));assert.match(a.nodes['#schedule-error'].textContent,/changed|reopen|latest/i);assert.equal(form.submitButton.disabled,false);assert.ok(!a.messages.includes('Schedule saved'));
});

test('shared timetable ignores an old save acknowledgement after sign-out while another identity has its own pending schedule',async()=>{
 const a=await sharedScheduleApp(),oldAck=deferred(),newAck=deferred();let oldStarted=false,newStarted=false;
 a.set("openSchedule('',{course:'qa-course'})");const oldForm=sharedScheduleForm();
 a.client.saveSchedule=()=>{oldStarted=true;return oldAck.promise};const oldPending=a.submit(oldForm.id,oldForm.values,oldForm);
 await until(()=>oldStarted,'The original schedule must genuinely be waiting for its server acknowledgement');
 a.set("applySharedUser(null);go('/login')");oldForm.isConnected=false;switchSharedIdentity(a);
 a.set("openSchedule('',{course:'next-auth-course'})");a.input({name:'remark',value:'New manager pending schedule',closest:()=>({})});
 const nextForm=sharedScheduleForm({values:{course:'next-auth-course',remark:'New manager pending schedule'}});nextForm.dataset.operationKey='new-identity-schedule';
 a.client.saveSchedule=()=>{newStarted=true;return newAck.promise};const newPending=a.submit(nextForm.id,nextForm.values,nextForm);
 try{
  await until(()=>newStarted,'The new identity must be able to begin its own independent save');assert.equal(nextForm.submitButton.disabled,true);
  const modal=a.read('modal');oldAck.resolve({schedule:sharedScheduleRecord({id:'old-identity-schedule'})});await oldPending;
  assert.equal(a.read('authUser.id'),'next-auth-admin');assert.equal(a.read('modal'),modal);assert.equal(a.read('scheduleDraft.remark'),'New manager pending schedule');
  assert.ok(a.read('db.schedules.every(item=>item.id!=="old-identity-schedule")'));assert.equal(nextForm.submitButton.disabled,true,'The old save must not unlock the new identity’s active form');
 }finally{
  oldAck.resolve({schedule:sharedScheduleRecord({id:'old-identity-schedule'})});
  newAck.resolve({schedule:sharedScheduleRecord({id:'new-identity-schedule',course:'next-auth-course',remark:'New manager pending schedule'})});await oldPending;await newPending;
 }
 assert.deepEqual(a.read('db.schedules.map(item=>item.id)'),['new-identity-schedule']);
});

test('shared timetable lets an authenticated teacher read lessons but blocks creation and forged edit submissions',async()=>{
 const user={...copy(sharedTestUser),id:'qa-readonly-teacher',role:'teacher'},a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1},{session:async()=>({user}),schedules:async()=>teacherScheduleFixture(sharedScheduleRecord())});
 assert.match(a.nodes['#app'].innerHTML,/data-open-lesson="qa-schedule"/);
 const add=a.nodes['#app'].innerHTML.match(/<button\b[^>]*data-action="tt-add-schedule"[^>]*>/)?.[0];assert.match(add||'',/\bdisabled\b/);
 a.click({action:'tt-add-schedule'});assert.equal(a.read('scheduleDraft'),null);assert.equal(a.read('modal'),'');
 a.ctx.forgedSchedule=sharedScheduleRecord();a.set('scheduleDraft={...forgedSchedule,sourceKind:"schedule",customWeekdays:true}');
 const form=sharedScheduleForm({id:'qa-schedule',version:'1',values:{time:'13:00'}});await a.submit(form.id,form.values,form);
 assert.equal(a.scheduleCalls.filter(call=>call.operation==='save').length,0);assert.equal(a.remote.rows[0].time,'10:00');
});

test('shared timetable polling checks the session before private reads and clears editor state when a successful session changes ID or role',async()=>{
 for(const change of ['id','role','student','signed-out']){
  const a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1}),session=deferred(),rows=deferred();let sessions=0,reads=0;
  a.set("openSchedule('qa-schedule');materialCaches.set('qa-course',{items:[{id:'private-material',name:'Private old manager material'}],error:'',loading:false});materialAttachmentDraft=[{localId:'old-upload',name:'Private queued file',status:'queued'}];timetableSelections={rooms:['old-private-room'],teachers:['old-private-teacher']};timetableResourceSearch='Old private resource';timetableSearch='Old private lesson'");
  a.client.session=()=>{sessions++;return session.promise};a.client.courses=async()=>{reads++;return {courses:[]}};a.client.fees=async()=>{reads++;return {fees:[]}};a.client.schedules=()=>{reads++;return rows.promise};
  const pending=a.polls[0].handler();await until(()=>sessions===1,'Every scheduled refresh must confirm the browser’s current account first');
  assert.equal(reads,0,'Private data requests must wait for the session response');
  const next=change==='signed-out'?null:{...copy(sharedTestUser),...(change==='id'?{id:'another-admin'}:change==='student'?{id:'another-student',role:'student'}:{role:'teacher'})};session.resolve({user:next});
  await until(()=>a.read('authUser?.id??null')===(next?.id??null)&&a.read('authUser?.role??null')===(next?.role??null),'The changed authenticated identity must be applied');
  assert.equal(a.read('modal'),'');assert.equal(a.read('scheduleDraft'),null);assert.equal(a.read('selectedTimetableLesson'),null);
  assert.equal(a.read('materialCaches.size'),0);assert.equal(a.read('materialAttachmentDraft.length'),0);assert.equal(a.read('db.schedules.length'),0);
  assert.deepEqual(a.read('timetableSelections'),{rooms:[],teachers:[]},'A new identity must not inherit old room or teacher selections that hide its lessons');assert.equal(a.read('timetableResourceSearch'),'');assert.equal(a.read('timetableSearch'),'');
  assert.doesNotMatch(a.nodes['#app'].innerHTML,/Private old manager material|Private scheduling note|Private queued file/);
  const incoming=next&&next.role!=='student'?[sharedScheduleRecord({id:'new-identity-schedule',room:'New identity room',teacher:'New identity teacher'})]:[];rows.resolve(next?.role==='teacher'?teacherScheduleFixture(incoming[0],{revision:'new-identity-schedule-revision'}):{schedules:incoming,revision:'new-identity-schedule-revision'});await pending;
  if(incoming.length)assert.deepEqual(a.read("timetableClasses(timetableDateObject('2026-10-08')).map(item=>item.id)"),['new-identity-schedule'],'The replacement account’s lessons must be visible without clearing another user’s filters manually');
  else assert.equal(a.read('db.schedules.length'),0);
 }
});

test('shared timetable focus refresh of the same identity preserves revisions and an open unsaved lesson draft',async()=>{
 const a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1});a.set("openSchedule('qa-schedule');scheduleDraft.remark='Typing before focus refresh';sharedCatalogRevision='catalog-open-draft-revision';materialCaches.set('qa-course',{items:[{id:'kept-material'}],error:'',loading:false});timetableSelections={rooms:['unassigned'],teachers:['unassigned']};timetableResourceSearch='No Room';timetableSearch='qa-schedule'");
 const filters=a.read('({selections:timetableSelections,resourceSearch:timetableResourceSearch,search:timetableSearch})'),generation=a.read('sharedGeneration'),draft=a.read('scheduleDraft'),modal=a.read('modal');let sessions=0;
 a.client.session=async()=>{sessions++;return {user:copy(sharedTestUser)}};
 await a.focus[0]();
 assert.equal(sessions,1);assert.equal(a.read('sharedGeneration'),generation);assert.equal(a.read('sharedCatalogRevision'),'catalog-open-draft-revision');
 assert.deepEqual(a.read('scheduleDraft'),draft);assert.equal(a.read('modal'),modal);assert.equal(a.read('materialCaches.size'),1);assert.deepEqual(a.read('({selections:timetableSelections,resourceSearch:timetableResourceSearch,search:timetableSearch})'),filters,'Refreshing the same account must preserve its intentional current filters');
 assert.equal(a.scheduleCalls.filter(call=>call.operation==='read').at(-1).since,'schedule-1','An unchanged account should reuse the schedule revision instead of forcing a complete reload');
});

test('shared alignment Courses row navigation opens the selected shared timetable rather than legacy local class settings',async()=>{
 const a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1});a.set("tab='catalog';location.pathname='/account';render()");
 const button=a.nodes['#app'].innerHTML.match(/<button\b[^>]*data-course-timetable="qa-course"[^>]*>View in Timetable<\/button>/)?.[0];assert.ok(button,'The course row must expose its own schedule navigation');
 const dataset=Object.fromEntries([...button.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(([,name,value])=>[name.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()),value]));
 await a.click(dataset);
 assert.equal(a.read('location.pathname'),'/account');assert.deepEqual(a.read('timetableLessonFilter'),{course:'qa-course'});assert.ok(a.nodes['#app'].innerHTML.includes('class="teacher-timetable"'),'The actual rendered button must navigate into the shared timetable');
 assert.ok(a.nodes['#app'].innerHTML.includes('data-open-lesson="qa-schedule"'),'The shared schedule must remain visible through this course-list entrance');
 assert.ok(!a.nodes['#app'].innerHTML.includes('class-settings-grid'),'The shared workspace must not silently return to local demo classes');
});

test('shared alignment course-detail Add locks its course and fee context through cancel, forged data and omitted disabled fields',async()=>{
 for(const operation of ['cancel','forged-course','omitted-course']){
  const a=await sharedScheduleApp();a.state.courses.push({...copy(sharedTestCourse),id:'qa-other-course',courseName:'Another shared course',fees:[],feeIds:[]});
  await a.set('refreshSharedCourses({paint:false})');a.set("courseDetailMonth=new Date(2026,9,1);courseDetailTab='general';location.pathname='/account/courses/qa-course';render()");
  a.click({action:'course-add-schedule'});const markup=a.nodes['#modal-root'].innerHTML,select=markup.match(/<select\b[^>]*name="course"[^>]*>/)?.[0];
  assert.match(select||'',/\bdisabled\b/,'Adding from a course must keep that course fixed');assert.equal(a.read('scheduleDraft.course'),'qa-course');
  assert.ok(markup.includes('id="schedule-fee-summary"'),'The course Add form must expose the current fee summary before submission');assert.match(markup,/Shared lesson fee/);assert.match(markup,/HK\$300/);
  if(operation==='cancel'){
   a.input({name:'remark',value:'Unsaved course-specific lesson',closest:()=>({})});a.click({action:'close'});
   assert.equal(a.read('scheduleDraft'),null);assert.equal(a.remote.rows.length,0);assert.equal(a.scheduleCalls.filter(call=>call.operation==='save').length,0);
   a.click({tab:'overview'});a.click({action:'tt-add-schedule'});
   const generalSelect=a.nodes['#modal-root'].innerHTML.match(/<select\b[^>]*name="course"[^>]*>/)?.[0];assert.ok(generalSelect);assert.doesNotMatch(generalSelect,/\bdisabled\b/,'The general timetable Add entrance must still let the manager choose a course');a.click({action:'close'});continue;
  }
  const form=sharedScheduleForm();if(operation==='forged-course')form.values.course='qa-other-course';else delete form.values.course;
  await a.submit(form.id,form.values,form);
  const writes=a.scheduleCalls.filter(call=>call.operation==='save');assert.equal(writes.length,1,operation);assert.equal(writes[0].record.course,'qa-course','The captured course context must win over a forged or omitted form field');
  assert.equal(a.remote.rows.length,1);assert.equal(a.remote.rows[0].course,'qa-course');assert.equal(a.read('db.schedules[0].course'),'qa-course');assert.equal(a.read('location.pathname'),'/account/courses/qa-course');assert.equal(a.read('modal'),'');
  assert.ok(a.nodes['#app'].innerHTML.includes('data-edit-activity="qa-created-schedule"'),'The saved course-specific schedule must appear on the course page that created it');
 }
});

test('shared alignment editing a schedule deleted before or during save reports the missing record and retains the draft without recreating it',async()=>{
 for(const deletion of ['before-submit','during-write']){
  const remote={rows:[sharedScheduleRecord()],revision:1},a=await sharedScheduleApp(remote);a.set("openSchedule('qa-schedule')");
  const version=a.nodes['#modal-root'].innerHTML.match(/id="schedule-editor"[^>]*data-version="([^"]+)"/)?.[1],form=sharedScheduleForm({id:'qa-schedule',version,values:{remark:'Preserve this deleted-record draft'}});
  assert.ok(a.nodes['#modal-root'].innerHTML.includes('id="schedule-error"'));a.nodes['#schedule-error']={textContent:'',isConnected:true};
  a.input({name:'remark',value:form.values.remark,closest:()=>({})});let attempts=[];
  if(deletion==='before-submit'){
   remote.rows=[];remote.revision++;await a.set('refreshSharedSchedules({paint:false})');assert.equal(a.read('db.schedules.length'),0);
   await a.submit(form.id,form.values,form);assert.equal(a.scheduleCalls.filter(call=>call.operation==='save').length,0,'A known missing edit target must not become an accidental create');
  }else{
   const response=deferred();a.client.saveSchedule=(record,current,operationKey)=>{attempts.push({record:copy(record),current:copy(current),operationKey});return response.promise};
   const pending=a.submit(form.id,form.values,form);
   try{
    await until(()=>attempts.length===1,'The edit must genuinely be in flight when the record is deleted');assert.equal(attempts[0].current.id,'qa-schedule');assert.equal(attempts[0].current.version,1);
    remote.rows=[];remote.revision++;await a.set('refreshSharedSchedules({paint:false})');response.reject(serviceError(404,'SCHEDULE_NOT_FOUND'));await pending;
   }finally{response.resolve({schedule:sharedScheduleRecord()});await pending;}
   assert.equal(attempts.length,1);assert.ok(attempts.every(attempt=>attempt.current?.id==='qa-schedule'),'A server 404 must not retry the edit as a create');
  }
  assert.match(a.nodes['#schedule-error'].textContent,/no longer available|no longer exists|not found|deleted/i,'The user must receive a visible explanation instead of a silent Save');
  assert.ok(a.read('modal'));assert.equal(a.read('scheduleDraft.id'),'qa-schedule');assert.equal(a.read('scheduleDraft.remark'),'Preserve this deleted-record draft');assert.equal(form.values.remark,'Preserve this deleted-record draft');assert.equal(form.submitButton.disabled,false);
  assert.equal(remote.rows.length,0);assert.equal(a.read('db.schedules.length'),0);assert.ok(!a.messages.includes('Schedule saved'));
 }
});

test('shared course catalogue schedule details expose capacity and safe multiline notes without claiming an unknown student count or changing dates',async()=>{
 const record=sharedScheduleRecord({capacity:8,moreInfo:'Bring <apron> & spare\nshirt',detail:'<script>qaScheduleAttack()</script>',remark:'"Careful" <img src=x onerror=qaScheduleAttack()>'}),a=await sharedScheduleApp({rows:[record],revision:1});
 a.set("courseDetailMonth=new Date(2026,9,1);courseDetailTab='general';location.pathname='/account/courses/qa-course';render()");
 const html=a.nodes['#app'].innerHTML,rows=[...html.matchAll(/class="course-schedule-columns course-schedule-row"[^>]*>([\s\S]*?)<\/div>/g)];
 assert.equal(rows.length,4);assert.deepEqual(a.read("courseScheduleGroups('qa-course')[0].dates"),['2026-10-08','2026-10-15','2026-10-22','2026-10-29']);
 for(const [,row]of rows){
  const cells=[...row.matchAll(/<span\b[^>]*role="cell"[^>]*>([\s\S]*?)<\/span>/g)].map(match=>match[1]);
  assert.equal(cells.length,11,'The course schedule must show the complete data for each saved lesson');assert.equal(cells[6],'8');assert.equal(cells[7],'—','A shared student list not connected to enrolments is unknown, rather than a confirmed zero');
  assert.equal(cells[8],'Bring &lt;apron&gt; &amp; spare\nshirt');assert.equal(cells[9],'&lt;script&gt;qaScheduleAttack()&lt;/script&gt;');assert.ok(cells[10].includes('&lt;img src=x onerror=qaScheduleAttack()&gt;'));
 }
 assert.ok(!html.includes('<script>qaScheduleAttack()'));assert.ok(!html.includes('<img src=x onerror=qaScheduleAttack()>'));assert.equal(a.read('db.schedules[0].moreInfo'),record.moreInfo,'Rendering escaped notes must not corrupt the stored original');
});

const catalogueCourse=(id,courseCode,courseName,fields={})=>({...copy(sharedTestCourse),id,courseCode,courseName,fees:[],feeIds:[],feeName:'',...fields});
const visibleCatalogueIds=a=>[...a.nodes['#app'].innerHTML.matchAll(/<button\b[^>]*data-open-course="([^"]+)"/g)].map(match=>match[1]);
async function courseCatalogueApp(records=[copy(sharedTestCourse)],overrides={}){
 const lifecycleCalls=[];let a;
 async function change(action,current,operationKey){
  lifecycleCalls.push({action,current:copy(current),operationKey});const previous=a.state.courses.find(course=>course.id===current.id);
  if(!previous)throw serviceError(404,'COURSE_NOT_FOUND');if(previous.version!==current.version)throw serviceError(409,'VERSION_CONFLICT');
  const course={...copy(previous),version:previous.version+1,updatedAt:'2026-10-14T02:00:00Z'};if(action==='delete')course.deletedAt='2026-10-14T02:00:00Z';else delete course.deletedAt;
  a.state.courses=a.state.courses.map(item=>item.id===course.id?course:item);return {course:copy(course)};
 }
 a=await sharedApp({deleteCourse:(current,key)=>change('delete',current,key),restoreCourse:(current,key)=>change('restore',current,key),...overrides});
 const query=a.ctx.document.querySelector;a.ctx.document.querySelector=selector=>['#course-metadata-editor','#course-lifecycle-editor','.course-lifecycle-modal'].includes(selector)?a.nodes[selector]||null:query(selector);
 const modalRoot=query('#modal-root');modalRoot.insertAdjacentHTML=(position,markup)=>{assert.equal(position,'beforeend');modalRoot.innerHTML+=markup;};
 a.state.courses=copy(records);await a.set('refreshSharedCourses({paint:false})');a.set("tab='catalog';location.pathname='/account';render()");
 return {...a,lifecycleCalls};
}

test('shared course catalogue combines status and text filters, sorts ties consistently and resets private filter state on identity change',async()=>{
 const records=[catalogueCourse('alpha-2','CO-102','Alpha drawing',{category:'Art',level:'Beginner'}),catalogueCourse('alpha-1','CO-101','Alpha drawing',{category:'Art',level:'Beginner'}),catalogueCourse('beta','CO-103','Beta studio',{category:'Art',level:'Intermediate'}),catalogueCourse('gamma','CO-104','Gamma craft',{category:'Craft',level:'Beginner'}),catalogueCourse('deleted','CO-099','Deleted drawing',{category:'Art',level:'Beginner',deletedAt:'2026-10-14T00:00:00Z'})],a=await courseCatalogueApp(records);
 assert.deepEqual(visibleCatalogueIds(a),['alpha-1','alpha-2','beta','gamma'],'Normal must hide deleted courses and begin with stable course-code order');
 a.change('','Art',{id:'portal-course-category'});a.change('','Beginner',{id:'portal-course-level'});await a.submit('portal-course-search',{search:'ALPHA'});assert.deepEqual(visibleCatalogueIds(a),['alpha-1','alpha-2']);
 await a.submit('portal-course-search',{search:''});a.change('','',{id:'portal-course-category'});a.change('','',{id:'portal-course-level'});
 a.click({courseSort:'courseName'});assert.equal(a.read('courseSortKey'),'courseName');assert.equal(a.read('courseSortDirection'),'asc');assert.deepEqual(visibleCatalogueIds(a),['alpha-1','alpha-2','beta','gamma']);
 a.click({courseSort:'courseName'});assert.equal(a.read('courseSortDirection'),'desc');let sorted=visibleCatalogueIds(a);assert.deepEqual(sorted.slice(0,2),['gamma','beta']);assert.deepEqual(new Set(sorted.slice(2)),new Set(['alpha-1','alpha-2']));
 a.state.courses.reverse();await a.set('refreshSharedCourses()');assert.deepEqual(visibleCatalogueIds(a),sorted,'Equal course names must not change positions merely because the service response order changes');
 a.click({courseSort:'category'});assert.deepEqual(visibleCatalogueIds(a).map(id=>records.find(item=>item.id===id).category),['Art','Art','Art','Craft']);
 a.click({courseSort:'level'});assert.deepEqual(visibleCatalogueIds(a).map(id=>records.find(item=>item.id===id).level),['Beginner','Beginner','Beginner','Intermediate']);
 a.change('','Art',{id:'portal-course-category'});a.change('','Beginner',{id:'portal-course-level'});a.change('','deleted',{id:'portal-course-status'});
 assert.equal(a.read('courseStatusFilter'),'deleted');assert.equal(a.read('courseCategoryFilter'),'');assert.equal(a.read('courseLevelFilter'),'');assert.deepEqual(visibleCatalogueIds(a),['deleted']);
 await a.submit('portal-course-search',{search:'drawing'});switchSharedIdentity(a);
 assert.equal(a.read('courseStatusFilter'),'active');assert.equal(a.read('courseCategoryFilter'),'');assert.equal(a.read('courseLevelFilter'),'');assert.equal(a.read('courseSearch'),'');assert.equal(a.read('courseSortKey'),'courseCode');assert.equal(a.read('courseSortDirection'),'asc');assert.deepEqual(visibleCatalogueIds(a),['next-auth-course']);
 const refreshed=await courseCatalogueApp([catalogueCourse('last-art','CO-301','Last matching class',{category:'Art',level:'Beginner'})]);
 refreshed.change('','Art',{id:'portal-course-category'});refreshed.change('','Beginner',{id:'portal-course-level'});assert.deepEqual(visibleCatalogueIds(refreshed),['last-art']);
 refreshed.state.courses[0]={...refreshed.state.courses[0],category:'Craft',level:'Advanced',version:2};await refreshed.set('refreshSharedCourses()');
 assert.deepEqual(visibleCatalogueIds(refreshed),[]);assert.equal(refreshed.read('courseCategoryFilter'),'Art');assert.equal(refreshed.read('courseLevelFilter'),'Beginner');
 const filterMarkup=id=>refreshed.nodes['#app'].innerHTML.match(new RegExp('<select\\b[^>]*id="'+id+'"[^>]*>([\\s\\S]*?)<\\/select>'))?.[1]||'';
 assert.match(filterMarkup('portal-course-category'),/<option\b(?=[^>]*\bvalue="Art")(?=[^>]*\bselected)[^>]*>[^<]*Art[^<]*<\/option>/,'The now-unmatched category must remain visibly selected rather than appearing cleared');
 assert.match(filterMarkup('portal-course-level'),/<option\b(?=[^>]*\bvalue="Beginner")(?=[^>]*\bselected)[^>]*>[^<]*Beginner[^<]*<\/option>/,'The now-unmatched level must remain visibly selected too');
 refreshed.change('','',{id:'portal-course-category'});assert.deepEqual(visibleCatalogueIds(refreshed),[],'The separate level filter must remain active until the user clears it');refreshed.change('','',{id:'portal-course-level'});
 assert.deepEqual(visibleCatalogueIds(refreshed),['last-art']);assert.equal(refreshed.read('db.courseSettings[0].category'),'Craft');assert.equal(refreshed.read('db.courseSettings[0].level'),'Advanced');
});

function markupDataset(tag){return Object.fromEntries([...tag.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(([,name,value])=>[name.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()),value]));}
function catalogueMetadataForm(a,id,values={}){
 const markup=a.nodes['#modal-root'].innerHTML,tag=markup.match(/<form\b[^>]*id="course-metadata-editor"[^>]*>/)?.[0];assert.ok(tag);
 const current=a.read(`courseSettingsFor(${JSON.stringify(id)})`),form=sharedForm('course-metadata-editor');form.dataset=markupDataset(tag);form.values={courseName:current.courseName,category:current.category,level:current.level,...values};form.isConnected=true;
 const attributes={},dialog={inert:false,setAttribute:(name,value)=>attributes[name]=String(value),removeAttribute:name=>delete attributes[name],getAttribute:name=>attributes[name]??null};form.dialog=dialog;form.closest=selector=>selector==='.create-course-modal'?dialog:null;
 const controls=Object.fromEntries(Object.entries(form.values).map(([name,value])=>[name,{name,value,disabled:false,focus(){}}])),query=form.querySelector,all=form.querySelectorAll;
 form.elements={...controls,namedItem:name=>controls[name]};form.querySelector=selector=>controls[selector.match(/\[name=["']?([a-zA-Z]+)/)?.[1]]||query(selector);form.querySelectorAll=selector=>selector.includes('input')?Object.values(controls):all(selector);
 a.nodes['#course-metadata-editor']=form;for(const [name,input]of Object.entries(controls)){a.nodes[`#course-metadata-editor [name=${name}]`]=input;a.nodes[`#course-metadata-editor [name="${name}"]`]=input;}
 return form;
}

test('public course colour uses the real exact course editor and saves optional colour independently of pricing',async()=>{
 const original=catalogueCourse('colour-b','CO-902','Watercolour B',{publicColor:'#aabbcc'}),a=await courseCatalogueApp([catalogueCourse('colour-a','CO-901','Drawing A'),original]);
 await a.click({editCourse:'colour-b'});assert.match(a.nodes['#modal-root'].innerHTML,/公開課程顏色|Public course colour/);assert.match(a.nodes['#modal-root'].innerHTML,/name="usePublicColor"[^>]*checked/);assert.match(a.nodes['#modal-root'].innerHTML,/name="publicColor"[^>]*value="#aabbcc"/);
 const fees=a.read('sharedFees'),schedules=a.read('db.schedules'),form=catalogueMetadataForm(a,'colour-b',{publicColorSetting:'1',usePublicColor:'on',publicColor:'#ABCDEF'});await a.submit(form.id,form.values,form);
 const saved=a.calls.findLast(row=>row.operation==='metadata');assert.equal(saved.id,'colour-b');assert.equal(saved.fields.publicColor,'#abcdef');assert.equal(Object.hasOwn(saved.fields,'usePublicColor'),false);assert.equal(Object.hasOwn(saved.fields,'publicColorSetting'),false);assert.equal(Object.hasOwn(saved.fields,'price'),false);assert.equal(a.read("courseSettingsFor('colour-b').publicColor"),'#abcdef');assert.equal(a.read("Object.hasOwn(courseSettingsFor('colour-a'),'publicColor')"),false);assert.deepEqual(a.read('sharedFees'),fees);assert.deepEqual(a.read('db.schedules'),schedules);
});

test('public course colour unset and explicit clear do not save the native colour picker default',async()=>{
 const a=await courseCatalogueApp([catalogueCourse('colour-b','CO-902','Watercolour B')]);await a.click({editCourse:'colour-b'});
 const markup=a.nodes['#modal-root'].innerHTML;assert.match(markup,/未設定|Not set/);assert.match(markup,/class="course-public-colour-picker"[^>]*hidden/);assert.match(markup,/name="publicColorSetting" value="1"/);assert.match(markup,/<input[^>]*name="publicColor"[^>]*disabled/);assert.doesNotMatch(markup,/name="usePublicColor"[^>]*checked/);
 let form=catalogueMetadataForm(a,'colour-b',{publicColorSetting:'1'});await a.submit(form.id,form.values,form);assert.equal(a.calls.findLast(row=>row.operation==='metadata').fields.publicColor,null);
 a.state.courses[0]={...a.state.courses[0],publicColor:'#123456'};await a.set('refreshSharedCourses({paint:false})');await a.click({editCourse:'colour-b'});form=catalogueMetadataForm(a,'colour-b',{publicColorSetting:'1'});await a.submit(form.id,form.values,form);assert.equal(a.calls.findLast(row=>row.operation==='metadata').fields.publicColor,null);
});

test('public course colour validation failure keeps the same draft and does not write or silently choose a colour',async()=>{
 const a=await courseCatalogueApp([catalogueCourse('colour-b','CO-902','Watercolour B',{publicColor:'#123456'})]);await a.click({editCourse:'colour-b'});const form=catalogueMetadataForm(a,'colour-b',{publicColorSetting:'1',usePublicColor:'on',publicColor:'red;display:none'});a.nodes['#course-metadata-error']={textContent:''};const before=a.calls.length;await a.submit(form.id,form.values,form);assert.equal(a.calls.length,before);assert.match(a.nodes['#course-metadata-error'].textContent,/顏色|colour/i);assert.equal(form.values.publicColor,'red;display:none');assert.match(a.nodes['#modal-root'].innerHTML,/course-metadata-editor/);assert.equal(a.read("courseSettingsFor('colour-b').publicColor"),'#123456');
});

test('saving public course colour returns focus to the exact course edit opener after the page is repainted',async()=>{
 const a=await courseCatalogueApp([catalogueCourse('colour-b','CO-902','Watercolour B')]);let focused=0;
 const old={dataset:{editCourse:'colour-b'},isConnected:true,focus(){},closest:()=>null};a.ctx.document.activeElement=old;await a.click({editCourse:'colour-b'});
 const form=catalogueMetadataForm(a,'colour-b',{publicColorSetting:'1',usePublicColor:'on',publicColor:'#abcdef'}),fresh={dataset:{editCourse:'colour-b'},isConnected:true,focus(){focused++;}};
 old.isConnected=false;a.ctx.document.querySelectorAll=selector=>selector==='button'?[fresh]:[];
 await a.submit(form.id,form.values,form);assert.equal(a.read('modal'),'');assert.equal(focused,1,'The old edit button was replaced by render; restore the matching new opener instead of leaving focus on the page body');assert.equal(a.read('courseEditorReturnFocus'),null);
});
function catalogueLifecycleForm(a){
 const markup=a.nodes['#modal-root'].innerHTML,tag=markup.match(/<form\b[^>]*id="course-lifecycle-editor"[^>]*>/)?.[0];assert.ok(tag,'A real lifecycle confirmation must be open before submitting');
 const form=sharedForm('course-lifecycle-editor');form.dataset=markupDataset(tag);form.values={};form.isConnected=true;a.nodes['#course-lifecycle-editor']=form;
 const root=a.nodes['#modal-root'],start=root.innerHTML.indexOf('<div class="modal course-lifecycle-modal"'),dialog={querySelectorAll:selector=>form.querySelectorAll(selector),remove(){root.innerHTML=root.innerHTML.slice(0,start);delete a.nodes['.course-lifecycle-modal'];delete a.nodes['#course-lifecycle-editor'];form.isConnected=false;}};form.closest=selector=>selector==='.course-lifecycle-modal'?dialog:null;a.nodes['.course-lifecycle-modal']=dialog;
 assert.ok(markup.includes('id="course-lifecycle-error"'));a.nodes['#course-lifecycle-error']={textContent:'',isConnected:true};return form;
}

test('shared course catalogue deletion survives a fresh read and restores the same course without changing its fees',async()=>{
 const a=await courseCatalogueApp(),fees=copy(sharedTestCourse.fees);a.set("openCourseMetadataEditor('qa-course')");catalogueMetadataForm(a,'qa-course');
 a.click({action:'course-delete',courseId:'qa-course'});let form=catalogueLifecycleForm(a);await a.submit(form.id,form.values,form);
 assert.equal(a.lifecycleCalls.length,1);assert.equal(a.lifecycleCalls[0].action,'delete');assert.equal(a.lifecycleCalls[0].current.id,'qa-course');assert.equal(a.lifecycleCalls[0].current.version,1);assert.ok(a.lifecycleCalls[0].operationKey);
 assert.ok(a.state.courses[0].deletedAt);assert.equal(a.read('modal'),'');assert.equal(a.read('courseStatusFilter'),'deleted');assert.deepEqual(visibleCatalogueIds(a),['qa-course']);assert.deepEqual(a.read("courseSettingsFor('qa-course').fees"),fees);
 const fresh=await courseCatalogueApp(a.state.courses);assert.deepEqual(visibleCatalogueIds(fresh),[],'A fresh Normal view must not resurface the deleted course');
 fresh.change('','deleted',{id:'portal-course-status'});assert.deepEqual(visibleCatalogueIds(fresh),['qa-course']);
 fresh.click({action:'course-restore',courseId:'qa-course'});form=catalogueLifecycleForm(fresh);await fresh.submit(form.id,form.values,form);
 assert.equal(fresh.lifecycleCalls.length,1);assert.equal(fresh.lifecycleCalls[0].action,'restore');assert.equal(fresh.lifecycleCalls[0].current.id,'qa-course');assert.equal(fresh.lifecycleCalls[0].current.version,2);
 assert.equal(fresh.state.courses[0].deletedAt,undefined);assert.equal(fresh.state.courses[0].version,3);assert.equal(fresh.read('courseStatusFilter'),'active');assert.deepEqual(visibleCatalogueIds(fresh),['qa-course']);assert.deepEqual(fresh.read("courseSettingsFor('qa-course').fees"),fees);assert.equal(fresh.state.courses.length,1);
});

test('shared course catalogue lifecycle conflicts retain the opened draft, teachers cannot forge writes and old identity acknowledgements are ignored',async()=>{
 const conflict=await courseCatalogueApp();conflict.set("openCourseMetadataEditor('qa-course')");const parent=catalogueMetadataForm(conflict,'qa-course',{courseName:'Unsaved typed course title'});
 assert.equal(parent.dataset.version,'1');conflict.state.courses[0]={...conflict.state.courses[0],version:2};await conflict.set('refreshSharedCourses({paint:false})');
 conflict.click({action:'course-delete',courseId:'qa-course'});let form=catalogueLifecycleForm(conflict);await conflict.submit(form.id,form.values,form);
 assert.equal(conflict.lifecycleCalls[0].current.version,1,'Delete must retain the metadata form’s opened version rather than silently accepting a newer background record');
 assert.match(conflict.nodes['#course-lifecycle-error'].textContent,/changed|latest|reopen/i);assert.ok(conflict.read('modal'));assert.equal(form.submitButton.disabled,false);assert.equal(parent.values.courseName,'Unsaved typed course title');assert.equal(conflict.state.courses[0].deletedAt,undefined);
 conflict.click({action:'course-lifecycle-cancel'});assert.ok(conflict.nodes['#modal-root'].innerHTML.includes('course-metadata-editor'));assert.equal(conflict.lifecycleCalls.length,1);

 const scheduled=await courseCatalogueApp();let scheduledWrites=0;scheduled.client.deleteCourse=async()=>{scheduledWrites++;throw serviceError(409,'COURSE_HAS_SCHEDULES')};
 scheduled.set("openCourseMetadataEditor('qa-course')");catalogueMetadataForm(scheduled,'qa-course');scheduled.click({action:'course-delete',courseId:'qa-course'});form=catalogueLifecycleForm(scheduled);await scheduled.submit(form.id,form.values,form);
 assert.equal(scheduledWrites,1);assert.match(scheduled.nodes['#course-lifecycle-error'].textContent,/schedule/i,'A course with active lessons needs an actionable schedule explanation rather than an unrelated version message');assert.ok(scheduled.read('modal'));assert.equal(scheduled.state.courses[0].deletedAt,undefined);assert.deepEqual(scheduled.state.courses[0].fees,sharedTestCourse.fees);

 const deleted=catalogueCourse('deleted-course','CO-702','Deleted course',{deletedAt:'2026-10-14T00:00:00Z'}),teacher=await courseCatalogueApp([copy(sharedTestCourse),deleted]);teacher.state.user={...copy(sharedTestUser),role:'teacher'};teacher.ctx.readonlyUser=copy(teacher.state.user);teacher.ctx.readonlyCourses=copy(teacher.state.courses);
 teacher.set("applySharedUser(readonlyUser);applySharedCourses(readonlyCourses);tab='catalog';location.pathname='/account';render()");teacher.change('','deleted',{id:'portal-course-status'});
 const restore=teacher.nodes['#app'].innerHTML.match(/<button\b[^>]*data-action="course-restore"[^>]*>/)?.[0];assert.match(restore||'',/\bdisabled\b/);
 teacher.click({action:'course-delete',courseId:'qa-course'});teacher.click({action:'course-restore',courseId:'deleted-course'});assert.equal(teacher.read('modal'),'');
 const forged=sharedForm('course-lifecycle-editor',{recordId:'qa-course',version:'1'});forged.dataset.action='delete';forged.dataset.courseId='qa-course';await teacher.submit(forged.id,{},forged);assert.equal(teacher.lifecycleCalls.length,0);

 const old=await courseCatalogueApp(),ack=deferred();let started=false;old.client.deleteCourse=()=>{started=true;return ack.promise};
 old.set("openCourseMetadataEditor('qa-course')");catalogueMetadataForm(old,'qa-course');old.click({action:'course-delete',courseId:'qa-course'});form=catalogueLifecycleForm(old);const pending=old.submit(form.id,form.values,form);
 await until(()=>started,'The previous identity’s delete must genuinely be awaiting acknowledgement');switchSharedIdentity(old);form.isConnected=false;old.set("openCourseMetadataEditor('next-auth-course')");const modal=old.read('modal');
 ack.resolve({course:{...copy(sharedTestCourse),version:2,deletedAt:'2026-10-14T02:00:00Z'}});await pending;
 assert.equal(old.read('authUser.id'),'next-auth-admin');assert.equal(old.read('modal'),modal);assert.deepEqual(old.read('db.courseSettings.map(course=>course.id)'),['next-auth-course']);assert.equal(old.read('courseStatusFilter'),'active');assert.deepEqual(old.messages,[]);
});

const scopedScheduleRecord=(fields={})=>sharedScheduleRecord({id:'qa-scoped-series',startDate:'2026-10-14',weekdays:[3],count:3,time:'12:30',duration:45,session:1,...fields});
const singleOccurrenceReceipt=()=>scopedScheduleRecord({version:2,exceptions:[{sequence:2,overrides:{date:'2026-10-21',time:'12:45'}}]});
const followingOccurrenceReceipt=()=>{
 const {id,version,createdAt,updatedAt,...rule}=scopedScheduleRecord();
 return scopedScheduleRecord({version:3,segments:[{fromSequence:2,rule:{...rule,startDate:'2026-10-21',count:2,session:2,time:'13:00'}}],exceptions:[]});
};
async function scopedScheduleApp(rows=[scopedScheduleRecord()],overrides={}){
 const a=await sharedScheduleApp({rows:copy(rows),revision:1},overrides),query=a.ctx.document.querySelector,root=query('#modal-root');a.occurrenceCalls=[];
 const privateSelectors=new Set(['.schedule-scope-modal','#schedule-scope-editor','#schedule-scope-confirm','#schedule-scope-error','#schedule-scope-editor [name=scope]']);
 a.ctx.document.querySelector=selector=>privateSelectors.has(selector)?a.nodes[selector]||null:query(selector);
 root.insertAdjacentHTML=(position,markup)=>{
  assert.equal(position,'beforeend');const start=root.innerHTML.length;root.innerHTML+=markup;
  assert.match(markup,/id="schedule-scope-editor"/,'Only a real scope confirmation may create these DOM nodes');
  const form=sharedForm('schedule-scope-editor'),radios=['single','following'].map(value=>({name:'scope',value,checked:false,disabled:false,focus(){},closest:selector=>selector==='#schedule-scope-editor'?form:null}));
  form.isConnected=true;form.values={};const submit=form.submitButton;submit.disabled=true;submit.textContent='OK';
  const error={textContent:'',isConnected:true},cancel={disabled:false};
  const dialog={querySelectorAll:selector=>selector==='[name=scope]'?radios:[cancel,...radios,submit],remove(){root.innerHTML=root.innerHTML.slice(0,start);form.isConnected=false;error.isConnected=false;for(const selector of privateSelectors)delete a.nodes[selector]}};
  a.nodes['.schedule-scope-modal']=dialog;a.nodes['#schedule-scope-editor']=form;a.nodes['#schedule-scope-confirm']=submit;a.nodes['#schedule-scope-error']=error;a.nodes['#schedule-scope-editor [name=scope]']=radios[0];a.scopeRadios=radios;
 };
 a.client.saveScheduleOccurrence=async(record,current,sequence,scope,operationKey)=>{
  a.occurrenceCalls.push({record:copy(record),current:copy(current),sequence,scope,operationKey});
  assert.ok(a.receipt,'The test must provide the external service acknowledgement');
  a.remote.rows=[copy(a.receipt)];a.remote.revision++;return {schedule:copy(a.receipt)};
 };
 return a;
}
function scopedEditor(a,{sequence=2,date='2026-10-21',values={}}={}){
 a.click({editActivity:'qa-scoped-series',activityKind:'schedule',activityDate:date,activitySequence:String(sequence)});
 const markup=a.nodes['#modal-root'].innerHTML,tag=markup.match(/<form\b[^>]*id="schedule-editor"[^>]*>/)?.[0];assert.ok(tag,'A selected occurrence must open the actual schedule editor');
 const draft=a.read('scheduleDraft'),form=sharedScheduleForm({id:draft.id,version:markupDataset(tag).version,values:{...draft,...values}});form.dataset=markupDataset(tag);
 const controls=Object.fromEntries(Object.entries(form.values).map(([name,value])=>[name,{name,value,disabled:name==='course',focus(){}}])),buttons=form.querySelectorAll('button'),attributes={};
 const parent={inert:false,setAttribute:(key,value)=>attributes[key]=String(value),removeAttribute:key=>delete attributes[key],getAttribute:key=>attributes[key]??null};
 form.controls=controls;form.dialog=parent;form.closest=selector=>selector==='.schedule-modal'?parent:null;form.querySelectorAll=()=>[...buttons,...Object.values(controls)];form.querySelector=selector=>controls[selector.match(/\[name=["']?([a-zA-Z]+)/)?.[1]]||form.submitButton;
 a.nodes['.schedule-modal']=parent;a.nodes['#schedule-editor']=form;a.nodes['.schedule-dialog header button']={disabled:false};
 return form;
}
function chooseScopedSave(a,scope){
 const radio=a.scopeRadios.find(item=>item.value===scope);assert.ok(radio);radio.checked=true;a.nodes['#schedule-scope-editor'].values.scope=scope;a.change('scope',scope,{closest:selector=>selector==='#schedule-scope-editor'?a.nodes['#schedule-scope-editor']:null});
}
async function confirmScopedSave(a){const form=a.nodes['#schedule-scope-editor'];assert.ok(form?.isConnected,'Confirmation must still be mounted');await a.submit(form.id,form.values,form);}
function assertScopedViews(a,expected){
 a.set("location.pathname='/account';tab='overview';timetableSearch='';timetableLessonFilter=null;timetableSelections={rooms:[],teachers:[]}");
 for(const view of ['day','week','month','list'])for(const [date,time]of expected){
  a.set(`timetableView=${JSON.stringify(view)};selectTimetableDate(${JSON.stringify(date)});render()`);
  const tags=[...a.nodes['#app'].innerHTML.matchAll(/<button\b[^>]*data-open-lesson="qa-scoped-series"[^>]*>/g)].map(match=>match[0]),tag=tags.find(value=>value.includes(`data-lesson-date="${date}"`));
  assert.ok(tag,`${view} must retain the same saved series on ${date}`);assert.ok(tag.includes(time),`${view} must display ${time} for ${date}`);
 }
 a.set("courseDetailMonth=new Date(2026,9,1);courseDetailTab='general';location.pathname='/account/courses/qa-course';render()");
 const rows=[...a.nodes['#app'].innerHTML.matchAll(/class="course-schedule-columns course-schedule-row"[^>]*>([\s\S]*?)<\/div>/g)].map(match=>[...match[1].matchAll(/<span\b[^>]*role="cell"[^>]*>([\s\S]*?)<\/span>/g)].map(cell=>cell[1]));
 assert.equal(rows.length,expected.length,'The course must retain exactly the original three lesson dates');
 for(const [date,time]of expected){const row=rows.find(cells=>cells[0].includes(date));assert.ok(row);assert.equal(row[2],time);}
}

test('shared scoped timetable edits the selected occurrence only after an explicit scope choice',async()=>{
 const a=await scopedScheduleApp(),pricing=a.read('db.courseSettings[0].fees'),form=scopedEditor(a,{values:{time:'12:45'}});a.receipt=singleOccurrenceReceipt();
 assert.equal(a.read('scheduleDraft.occurrenceSequence??null'),2,'An occurrence editor must retain the selected immutable sequence');
 assert.equal(a.read('scheduleDraft.startDate'),'2026-10-21');assert.equal(a.read('scheduleDraft.session'),2);assert.equal(a.read('scheduleDraft.endMode'),'date');assert.equal(a.read('scheduleDraft.endDate'),'2026-10-28','Selected lesson editing must prefill the observed last date even when the original series was entered by count');assert.deepEqual(a.read('schedulePreviewDates(scheduleDraft,8)'),['2026-10-21','2026-10-28']);
 await a.submit(form.id,form.values,form);
 assert.equal(a.scheduleCalls.filter(call=>call.operation==='save').length,0,'Saving one occurrence must not immediately overwrite its recurring series');assert.equal(a.occurrenceCalls.length,0);assert.ok(form.dialog.inert);
 assert.equal(a.nodes['#schedule-scope-confirm'].disabled,true);assert.ok(a.scopeRadios.every(radio=>!radio.checked),'Neither scope should be preselected');
 await confirmScopedSave(a);assert.equal(a.occurrenceCalls.length,0,'An unchosen scope cannot send a write');
 chooseScopedSave(a,'single');await confirmScopedSave(a);
 assert.equal(a.occurrenceCalls.length,1);const call=a.occurrenceCalls[0];assert.deepEqual(call.current,{id:'qa-scoped-series',version:1});assert.equal(call.sequence,2);assert.equal(call.scope,'single');assert.equal(call.record.startDate,'2026-10-21');assert.equal(call.record.time,'12:45');assert.ok(call.operationKey);assert.equal(a.read('modal'),'');
 assert.deepEqual(a.read('db.courseSettings[0].fees'),pricing,'Changing a lesson time must preserve its course prices');
 assertScopedViews(a,[['2026-10-14','12:30'],['2026-10-21','12:45'],['2026-10-28','12:30']]);
 const summary=a.nodes['#app'].innerHTML.match(/<details class="course-schedule-group"[^>]*><summary>[\s\S]*?<strong>([\s\S]*?)<\/strong>/)?.[1];assert.ok(summary);assert.match(summary,/Times vary; see individual lessons/,'The group summary must direct users to the per-lesson times after only one lesson changes');assert.doesNotMatch(summary,/12:30|12:45/,'A mixed-time group must not advertise one time as applying to every lesson');
});

test('shared scoped following edit preserves earlier lessons, remaining sessions and course occurrence links',async()=>{
 const a=await scopedScheduleApp([singleOccurrenceReceipt()]),form=scopedEditor(a,{values:{time:'13:00'}});a.receipt=followingOccurrenceReceipt();
 assert.equal(a.read('scheduleDraft.time'),'12:45','Following-edit prefill must include the previously changed selected lesson');assert.equal(a.read('scheduleDraft.count'),2);assert.equal(a.read('scheduleDraft.session'),2);assert.equal(a.read('scheduleDraft.endMode'),'date');assert.equal(a.read('scheduleDraft.endDate'),'2026-10-28');
 await a.submit(form.id,form.values,form);chooseScopedSave(a,'following');await confirmScopedSave(a);
 assert.equal(a.occurrenceCalls[0].scope,'following');assert.equal(a.occurrenceCalls[0].sequence,2);assert.equal(a.occurrenceCalls[0].record.count,2);assert.equal(a.occurrenceCalls[0].record.session,2);assert.equal(a.occurrenceCalls[0].current.version,2);
 assertScopedViews(a,[['2026-10-14','12:30'],['2026-10-21','13:00'],['2026-10-28','13:00']]);
 const dateButton=[...a.nodes['#app'].innerHTML.matchAll(/<button\b[^>]*class="course-schedule-date-edit"[^>]*>/g)].map(match=>match[0]).find(tag=>tag.includes('data-lesson-date="2026-10-28"'));assert.ok(dateButton);await a.click(markupDataset(dateButton));
 assert.deepEqual(a.read('selectedTimetableLesson'),{id:'qa-scoped-series',kind:'schedule',date:'2026-10-28',sequence:3});assert.equal(a.read('scheduleDraft'),null,'A date opens the selected lesson for viewing before any edit intent');assert.match(a.nodes['#modal-root'].innerHTML,/13:00 – 13:45/);await a.click({action:'lesson-edit'});
 assert.equal(a.read('scheduleDraft.id'),'qa-scoped-series');assert.equal(a.read('scheduleDraft.occurrenceSequence'),3);assert.equal(a.read('scheduleDraft.session'),3);assert.equal(a.read('scheduleDraft.count'),1);assert.equal(a.read('scheduleDraft.startDate'),'2026-10-28');assert.equal(a.read('scheduleDraft.time'),'13:00');
});

test('course schedule date links show the exact moved lesson and roster for admins and readonly teachers without writes',async()=>{
 const record=scopedScheduleRecord({exceptions:[{sequence:2,overrides:{date:'2026-10-22',time:'13:15'}},{sequence:3,cancelled:true}]}),occurrence=scheduleOccurrence(record,2);
 for(const accountRole of ['admin','teacher']){
  const user={...copy(sharedTestUser),role:accountRole},rosterReads=[],overrides={session:async()=>({user}),lessonStudents:async(id,sequence)=>{rosterReads.push({id,sequence});return {students:[{id:'linked-session',studentId:'linked-student',displayName:'Linked student',orderId:'linked-order'}]}}};
  if(accountRole==='teacher')overrides.schedules=async()=>({revision:'authorized-moved-lesson',readScope:'occurrences',occurrences:[{...copy(occurrence),item:{...copy(occurrence.item),occurrenceSequence:2}}]});
  const a=await scopedScheduleApp([record],overrides);a.set("courseDetailMonth=new Date(2026,9,1);courseDetailTab='general';location.pathname='/account/courses/qa-course';render()");await a.set('refreshSharedSchedules()');
  const html=a.nodes['#app'].innerHTML,tag=[...html.matchAll(/<button\b[^>]*class="course-schedule-date-edit"[^>]*>/g)].map(match=>match[0]).find(value=>value.includes('data-lesson-date="2026-10-22"'));
  assert.ok(tag,'Every authorized course lesson needs a date link even when editing is forbidden');assert.doesNotMatch(tag,/data-edit-activity|\bdisabled\b/);assert.match(tag,/data-lesson-sequence="2"/);assert.match(tag,/View lesson details/);
  const before=a.read('db');await a.click(markupDataset(tag));await a.set('refreshLessonStudents()');
  assert.deepEqual(a.read('selectedTimetableLesson'),{id:record.id,kind:'schedule',date:'2026-10-22',sequence:2});assert.equal(a.read('scheduleDraft'),null);assert.equal(a.read('lessonDetailTab'),'students');assert.match(a.nodes['#modal-root'].innerHTML,/13:15 – 14:00/);assert.match(a.nodes['#modal-root'].innerHTML,/Linked student/);assert.deepEqual(rosterReads,[{id:record.id,sequence:2}]);
  const pencil=a.nodes['#modal-root'].innerHTML.match(/<button\b[^>]*data-action="lesson-edit"[^>]*>/)?.[0];assert.ok(pencil);assert.equal(/\bdisabled\b/.test(pencil),accountRole==='teacher');
  if(accountRole==='teacher'){const modal=a.read('modal');await a.click({action:'lesson-edit'});assert.equal(a.read('modal'),modal,'A forged edit action must leave a readonly teacher in the usable lesson view');assert.equal(a.read('scheduleDraft'),null);}
  await a.click({action:'lesson-close'});assert.deepEqual(a.read('db'),before);assert.equal(a.occurrenceCalls.length,0);assert.equal(a.scheduleCalls.filter(call=>call.operation==='save').length,0);
  for(const reference of [{openLesson:record.id,lessonKind:'schedule',lessonDate:'2026-10-21',lessonSequence:'2'},{openLesson:record.id,lessonKind:'schedule',lessonDate:'2026-10-22',lessonSequence:'1'},{openLesson:record.id,lessonKind:'schedule',lessonDate:'2026-10-28',lessonSequence:'3'},{openLesson:'unknown-lesson',lessonKind:'schedule',lessonDate:'2026-10-22',lessonSequence:'2'}]){
   await a.click(reference);assert.equal(a.read('selectedTimetableLesson'),null,'Moved, cancelled, wrong-sequence and unknown references cannot open a different lesson');assert.equal(a.read('modal'),'');
  }
 }
});

test('closing a course lesson restores the same date focus, month, expanded groups and scroll after a background repaint',async()=>{
 const a=await scopedScheduleApp([scopedScheduleRecord(),scopedScheduleRecord({id:'qa-second-series',time:'15:00'})]);a.set("courseDetailMonth=new Date(2026,9,1);courseDetailTab='general';location.pathname='/account/courses/qa-course';render()");
 const tag=[...a.nodes['#app'].innerHTML.matchAll(/<button\b[^>]*class="course-schedule-date-edit"[^>]*>/g)].map(match=>match[0]).find(value=>value.includes('data-open-lesson="qa-second-series"')&&value.includes('data-lesson-date="2026-10-21"'));assert.ok(tag);
 const dataset=markupDataset(tag),groupKeys=['schedule:qa-scoped-series','schedule:qa-second-series'],makeGroups=()=>groupKeys.map((key,index)=>({dataset:{courseScheduleGroup:key},open:index===0}));let groups=makeGroups(),focused=0;
 const makeOpener=()=>({dataset,isConnected:true,focus(options){focused++;assert.equal(options?.preventScroll,true)}});let opener=makeOpener();groups[0].open=false;groups[1].open=true;
 const scroll={scrollLeft:310,scrollTop:48};a.nodes['.course-schedule-scroll']=scroll;a.ctx.document.querySelectorAll=selector=>selector==='.course-schedule-group'?groups:selector==='[data-open-lesson]'?[opener]:[];
 a.ctx.window.scrollX=0;a.ctx.window.scrollY=460;a.ctx.window.scrollTo=(x,y)=>{a.ctx.window.scrollX=x;a.ctx.window.scrollY=y};
 const root=a.nodes['#app'];let html=root.innerHTML;Object.defineProperty(root,'innerHTML',{configurable:true,get:()=>html,set(value){html=value;opener.isConnected=false;opener=makeOpener();groups=makeGroups();scroll.scrollLeft=0;scroll.scrollTop=0;a.ctx.window.scrollY=0;if(a.nodes['#modal-root'])a.nodes['#modal-root'].innerHTML='';}});
 await a.click(dataset,opener);assert.equal(a.read('selectedTimetableLesson.id'),'qa-second-series');assert.equal(a.read('location.pathname'),'/account/courses/qa-course');
 a.set('sharedViewDirty=true');a.keydown('Escape');
 assert.equal(a.read('modal'),'');assert.equal(a.read('selectedTimetableLesson'),null);assert.equal(a.read('courseDetailMonth.getMonth()'),9);assert.equal(a.read('courseDetailTab'),'general');assert.deepEqual(groups.map(group=>group.open),[false,true]);assert.deepEqual([scroll.scrollLeft,scroll.scrollTop],[310,48]);assert.equal(a.ctx.window.scrollY,460);assert.equal(focused,1);assert.equal(a.occurrenceCalls.length,0);
});

test('a course lesson that is moved or cancelled during viewing closes safely instead of leaving an unusable stale dialog',async()=>{
 for(const overrides of [{date:'2026-10-22'},{cancelled:true}]){
  const a=await scopedScheduleApp();a.set("courseDetailMonth=new Date(2026,9,1);courseDetailTab='general';location.pathname='/account/courses/qa-course';render()");await a.click({openLesson:'qa-scoped-series',lessonKind:'schedule',lessonDate:'2026-10-21',lessonSequence:'2'});
  a.remote.rows=[scopedScheduleRecord({version:2,exceptions:[{sequence:2,...(overrides.cancelled?overrides:{overrides})}]})];a.remote.revision++;await a.set('refreshSharedSchedules()');
  assert.equal(a.read('selectedTimetableLesson'),null);assert.equal(a.read('modal'),'');assert.equal(a.read('location.pathname'),'/account/courses/qa-course');assert.equal(a.read('courseDetailMonth.getMonth()'),9);assert.equal(a.occurrenceCalls.length,0);assert.equal(a.scheduleCalls.filter(call=>call.operation==='save').length,0);
 }
});
test('browser Back leaves a course lesson without retaining its modal, return context or late roster reply',async()=>{
 const wait=deferred(),a=await scopedScheduleApp(undefined,{lessonStudents:()=>wait.promise});a.set("courseDetailMonth=new Date(2026,9,1);courseDetailTab='general';location.pathname='/account/courses/qa-course';render()");await a.click({openLesson:'qa-scoped-series',lessonKind:'schedule',lessonDate:'2026-10-21',lessonSequence:'2'});const read=a.set('refreshLessonStudents()');
 assert.ok(a.read('selectedTimetableLesson'));assert.ok(a.read('courseLessonReturn'));
 a.set("location.pathname='/account'");for(const handler of a.windowEvents.popstate||[])await handler();
 assert.equal(a.read('selectedTimetableLesson'),null);assert.equal(a.read('courseLessonReturn'),null);assert.equal(a.read('modal'),'');
 wait.resolve({students:[{id:'late-session',displayName:'Late roster student'}]});await read;assert.equal(a.read('modal'),'');assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/Late roster student/);
});

test('shared scoped confirmation cancel preserves the mounted typed editor and readonly teacher duplicate preserves lesson details',async()=>{
 const a=await scopedScheduleApp(),form=scopedEditor(a,{values:{time:'12:45',remark:'Keep this unsaved note'}});a.input({name:'remark',value:form.values.remark,closest:selector=>selector==='#schedule-editor'?form:null});a.input({name:'time',value:form.values.time,closest:selector=>selector==='#schedule-editor'?form:null});
 await a.submit(form.id,form.values,form);chooseScopedSave(a,'single');await a.click({action:'schedule-scope-cancel'});
 assert.equal(a.read('scheduleScopeDraft??null'),null);assert.equal(a.nodes['#schedule-editor'],form);assert.equal(form.values.time,'12:45');assert.equal(form.values.remark,'Keep this unsaved note');assert.equal(a.read('scheduleDraft.remark'),'Keep this unsaved note');assert.equal(a.read('scheduleDraft.time'),'12:45');assert.equal(form.dialog.inert,false);assert.equal(form.dialog.getAttribute('aria-hidden'),null);assert.equal(a.occurrenceCalls.length,0);assert.equal(a.scheduleCalls.filter(call=>call.operation==='save').length,0);assert.match(a.nodes['#modal-root'].innerHTML,/id="schedule-editor"/);
 await a.click({action:'close'});a.client.schedules=async()=>teacherScheduleFixture(scopedScheduleRecord(),{sequence:2,date:'2026-10-21'});a.set(`applySharedUser(${JSON.stringify({...copy(sharedTestUser),id:'qa-scoped-teacher',role:'teacher'})})`);await a.set('refreshSharedSchedules({paint:false})');
 await a.click({openLesson:'qa-scoped-series',lessonKind:'schedule',lessonDate:'2026-10-21',lessonSequence:'2'});const selected=a.read('selectedTimetableLesson');assert.match(a.nodes['#modal-root'].innerHTML,/data-action="lesson-duplicate" disabled/);await a.click({action:'lesson-duplicate'});
 assert.deepEqual(a.read('selectedTimetableLesson'),selected);assert.ok(a.read('modal'),'A forbidden duplicate action must not close the lesson and leave an unusable dialog');assert.equal(a.read('scheduleDraft??null'),null);assert.equal(a.occurrenceCalls.length,0);
});

test('shared scoped failures retain scope, opened version and retry key while late identity acknowledgements cannot affect a new editor',async()=>{
 for(const status of [409,503]){
  const a=await scopedScheduleApp(),form=scopedEditor(a,{values:{time:'12:45',remark:'Keep on retry'}}),calls=[];let rejectOnce=true;
  a.client.saveScheduleOccurrence=async(record,current,sequence,scope,key)=>{calls.push({record:copy(record),current:copy(current),sequence,scope,key});if(rejectOnce||status===409){rejectOnce=false;if(status===503){a.remote.rows=[singleOccurrenceReceipt()];a.remote.revision++}throw serviceError(status,status===409?'VERSION_CONFLICT':'SERVICE_UNAVAILABLE')}return {schedule:singleOccurrenceReceipt()}};
  await a.submit(form.id,form.values,form);chooseScopedSave(a,'single');await confirmScopedSave(a);
  assert.ok(a.read('scheduleScopeDraft'));assert.equal(a.read('scheduleScopeDraft.scope'),'single');assert.equal(form.values.remark,'Keep on retry');assert.equal(a.nodes['#schedule-scope-confirm'].disabled,false);assert.ok(a.nodes['#schedule-scope-error'].textContent);assert.equal(a.read('db.schedules[0].version'),1);
  if(status===409){a.remote.rows=[scopedScheduleRecord({version:4})];a.remote.revision++}await a.set('refreshSharedSchedules({paint:false})');await confirmScopedSave(a);
  assert.equal(calls.length,2);assert.deepEqual(calls[1],calls[0],'A retry must retain the original opened version, immutable sequence, selected scope, payload and operation key');assert.equal(calls[0].current.version,1);assert.ok(calls[0].key);
 }
 const a=await scopedScheduleApp(),form=scopedEditor(a,{values:{time:'12:45'}}),late=deferred();let started=false;a.client.saveScheduleOccurrence=async()=>{started=true;return late.promise};
 await a.submit(form.id,form.values,form);chooseScopedSave(a,'single');const pending=confirmScopedSave(a);await until(()=>started,'The old identity must have genuinely dispatched the scoped save');
 switchSharedIdentity(a);form.isConnected=false;a.set("openSchedule('',{course:'next-auth-course'})");const currentModal=a.read('modal');assert.equal(a.read('scheduleScopeDraft??null'),null);assert.equal(a.read('scheduleSaving'),false);
 late.resolve({schedule:singleOccurrenceReceipt()});await pending;assert.equal(a.read('authUser.id'),'next-auth-admin');assert.equal(a.read('modal'),currentModal);assert.equal(a.read('db.schedules.length'),0);assert.equal(a.read('scheduleDraft.course'),'next-auth-course');assert.equal(a.read('scheduleSaving'),false);assert.deepEqual(a.messages,[]);
});

test('shared scoped browser Back discards the detached confirmation and a pending old acknowledgement cannot close the next editor',async()=>{
 for(const pendingWrite of [false,true]){
  const a=await scopedScheduleApp(),form=scopedEditor(a,{values:{time:'12:45'}}),ack=deferred();let started=false,pending;
  await a.submit(form.id,form.values,form);chooseScopedSave(a,'single');
  if(pendingWrite){a.client.saveScheduleOccurrence=async()=>{started=true;return ack.promise};pending=confirmScopedSave(a);await until(()=>started,'The scoped save must genuinely be waiting before browser Back');}
  try{
   assert.equal(a.windowEvents.popstate.length,1);a.ctx.location.pathname='/about';for(const handler of a.windowEvents.popstate)handler({type:'popstate'});
   assert.equal(a.read('!!scheduleScopeDraft'),false,'Browser Back must discard scope state when its nested confirmation leaves the DOM');assert.equal(a.read('!!scheduleDraft'),false);assert.equal(a.read('modal'),'');assert.equal(a.read('scheduleSaving'),false);assert.equal(a.read('scheduleSaveJob??null'),null);
   assert.doesNotMatch(a.nodes['#app'].innerHTML,/id="schedule-editor"|id="schedule-scope-editor"/,'The destination must not contain a leftover editor');
   await a.click({go:'/account'});assert.equal(a.ctx.location.pathname,'/account','Navigation must remain usable after the confirmation disappears');await a.click({action:'tt-add-schedule'});const newModal=a.read('modal');assert.match(newModal,/id="schedule-editor"/);assert.equal(a.read('scheduleDraft.id'),'');
   if(pendingWrite){ack.resolve({schedule:singleOccurrenceReceipt()});await pending;assert.equal(a.read('modal'),newModal,'The previous page’s accepted save must not close a new editor');assert.equal(a.read('scheduleDraft.id'),'');assert.equal(a.ctx.location.pathname,'/account');assert.deepEqual(a.messages,[]);}
   else assert.equal(a.occurrenceCalls.length,0,'Leaving an unconfirmed operation must not write anything');
  }finally{if(pendingWrite){ack.resolve({schedule:singleOccurrenceReceipt()});await pending;}}
 }
});

const schedulingResource=(id,kind,displayName,fields={})=>({id,kind,displayName,active:true,version:1,createdAt:'2026-10-14T00:00:00Z',updatedAt:'2026-10-14T00:00:00Z',...(kind==='room'?{capacity:null,detail:'',remark:'',externalLocation:false}:{}),...fields});
async function resourceUiApp(remote={resources:[],revision:1},overrides={},options={}){
 const resourceCalls=[],resourceReads=[];let serial=0;
 const a=await sharedScheduleApp({rows:[],revision:1},{
  async schedulingResources(since){resourceReads.push(since);const revision='resources-'+remote.revision;return since===revision?{revision,unchanged:true}:{revision,resources:copy(remote.resources)}},
  async saveSchedulingResource(record,current,key){
   resourceCalls.push({record:copy(record),current:current?copy(current):null,key});const previous=current&&remote.resources.find(row=>row.id===current.id);
   if(current&&previous?.version!==current.version)throw serviceError(409,'VERSION_CONFLICT');
   const resource=schedulingResource(current?.id||'qa-created-resource-'+(++serial),current?.kind||record.kind,record.displayName,{...record,version:current?current.version+1:1});remote.resources=remote.resources.filter(row=>row.id!==resource.id);remote.resources.push(resource);remote.revision++;return {resource:copy(resource)};
  },...overrides,
 },options);
 a.ctx.document.querySelectorAll=selector=>selector.includes('.resource-editor-dialog')?(a.resourceForm?.allControls||[]).filter(control=>!selector.includes(':not(:disabled)')||!control.disabled):[];
 a.set("timetableResource='teachers'");return Object.assign(a,{resourceCalls,resourceReads,resourceRemote:remote});
}
async function openResourceManager(a){await a.set('openSchedulingResources()');assert.ok(a.read('resourceManager'));assert.match(a.nodes['#modal-root'].innerHTML,/resource-manager-modal/);}
function resourceEditorForm(a,values={}){
 const markup=a.nodes['#modal-root'].innerHTML,tag=markup.match(/<form\b[^>]*id="scheduling-resource-editor"[^>]*>/)?.[0];assert.ok(tag,'A real resource editor must be open before submitting');
 const current=a.read('resourceDraft.current??null'),kind=a.read('resourceDraft.kind'),form=sharedForm('scheduling-resource-editor'),colourField=markup.match(/<input\b[^>]*id="resource-representative-color"[^>]*>/)?.[0];form.dataset=markupDataset(tag);form.values={displayName:current?.displayName||'',...(current?.active===false?{}:{active:'on'}),...(kind==='room'?{capacity:current?.capacity==null?'':String(current.capacity),detail:current?.detail||'',remark:current?.remark||'',...(current?.externalLocation?{externalLocation:'on'}:{})}:colourField?{representativeColor:colourField.match(/value="([^"]*)"/)?.[1]||'#27777b',...(/<input\b[^>]*id="resource-color-enabled"[^>]*\bchecked/.test(markup)?{useRepresentativeColor:'on'}:{})}:{}),...values};form.isConnected=true;
 const controls=Object.entries(form.values).map(([name,value])=>({name,value,disabled:false,focus(){}})),close={disabled:false};form.allControls=[...controls,...form.querySelectorAll('button'),close];a.resourceForm=form;
 a.nodes['#scheduling-resource-editor']=form;a.nodes['#resource-editor-save']=form.submitButton;a.nodes['#resource-editor-error']={textContent:'',isConnected:true};return form;
}

test('shared scheduling resources create teachers and room metadata once, update the cache from acknowledgements and remain visible to another admin',async()=>{
 const remote={resources:[],revision:1},a=await resourceUiApp(remote);await openResourceManager(a);await a.click({action:'resource-add'});let form=resourceEditorForm(a,{displayName:'  QA teaching artist  '});const reads=a.resourceReads.length;
 await a.submit(form.id,form.values,form);assert.equal(a.resourceCalls.length,1,'The actual editor submit must save the scheduling resource');assert.equal(a.resourceCalls[0].record.displayName,'QA teaching artist');assert.equal(a.resourceCalls[0].current,null);assert.ok(a.resourceCalls[0].key);assert.equal(a.resourceReads.length,reads,'A successful acknowledgement must update the manager without another potentially failing GET');assert.match(a.nodes['#modal-root'].innerHTML,/QA teaching artist/);assert.equal(a.read('resourceDraft??null'),null);
 await a.click({action:'resource-set-kind',resourceKind:'room'});await a.click({action:'resource-add'});form=resourceEditorForm(a,{displayName:'QA <studio>',capacity:'12',detail:'Projector & chairs\nBring brushes',remark:'Do not replace lessons',externalLocation:'on'});await a.submit(form.id,form.values,form);
 const room=remote.resources.find(row=>row.kind==='room');assert.ok(room);assert.equal(room.capacity,12);assert.equal(room.detail,'Projector & chairs\nBring brushes');assert.equal(room.externalLocation,true);assert.match(a.nodes['#modal-root'].innerHTML,/QA &lt;studio&gt;/);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/QA <studio>/);
 await a.click({action:'resource-edit',resourceId:room.id});form=resourceEditorForm(a,{displayName:'QA renamed studio',capacity:'10'});delete form.values.active;await a.submit(form.id,form.values,form);const changed=remote.resources.find(row=>row.id===room.id);assert.equal(changed.version,2);assert.equal(changed.active,false);assert.equal(changed.capacity,10);assert.equal(a.read('resourceManager.status'),'inactive');assert.match(a.nodes['#modal-root'].innerHTML,/QA renamed studio/);assert.equal(a.resourceCalls.at(-1).current.version,1);
 const other=await resourceUiApp(remote,{session:async()=>({user:{...copy(sharedTestUser),id:'qa-resource-admin-B'}})});await openResourceManager(other);await other.click({action:'resource-set-kind',resourceKind:'room'});other.change('status','all',{id:'scheduling-resource-status'});assert.deepEqual(other.read('sharedSchedulingResources'),copy(remote.resources));assert.match(other.nodes['#modal-root'].innerHTML,/QA renamed studio/);assert.match(other.nodes['#modal-root'].innerHTML,/Inactive/);
});

test('shared scheduling resource edits retain the opened version and typed values on conflict or forbidden responses, and Cancel preserves manager filters',async()=>{
 for(const status of [409,403]){
  const initial=schedulingResource('qa-room','room','QA studio',{version:7,capacity:8}),remote={resources:[initial],revision:1},a=await resourceUiApp(remote);await openResourceManager(a);await a.click({action:'resource-set-kind',resourceKind:'room'});await a.submit('scheduling-resource-search',{query:'QA'});a.change('status','all',{id:'scheduling-resource-status'});await a.click({action:'resource-edit',resourceId:'qa-room'});
  const form=resourceEditorForm(a,{displayName:'QA typed name',capacity:'10',remark:'Keep my unsaved room note'});assert.equal(a.read('resourceDraft.current.version'),7);
  remote.resources=[{...initial,displayName:'QA remote name',version:8}];remote.revision++;await a.set('refreshSharedResources({paint:true})');assert.equal(a.read('resourceDraft.current.version'),7);assert.equal(form.values.displayName,'QA typed name');assert.match(a.nodes['#modal-root'].innerHTML,/id="scheduling-resource-editor"/);
  let request;a.client.saveSchedulingResource=async(record,current,key)=>{request={record:copy(record),current:copy(current),key};throw serviceError(status,status===409?'VERSION_CONFLICT':'ROLE_FORBIDDEN')};await a.submit(form.id,form.values,form);
  assert.ok(request,'The form submit must reach the real shared resource save function');assert.equal(request.current.version,7);assert.equal(form.values.remark,'Keep my unsaved room note');assert.ok(a.read('resourceDraft'));assert.ok(a.nodes['#resource-editor-error'].textContent);assert.equal(form.submitButton.disabled,false);assert.ok(!a.messages.includes('Scheduling resource saved'));
  await a.click({action:'resource-editor-cancel'});assert.equal(a.read('resourceDraft??null'),null);assert.equal(a.read('resourceManager.query'),'QA');assert.equal(a.read('resourceManager.status'),'all');assert.equal(a.read('resourceManager.kind'),'room');assert.match(a.nodes['#modal-root'].innerHTML,/QA remote name/);assert.equal(remote.resources[0].version,8);
 }
});

test('shared scheduling resource lost acknowledgements keep the same operation key and late background reads cannot overwrite an accepted record',async()=>{
 const a=await resourceUiApp(),saved=schedulingResource('qa-retry-teacher','teacher','QA retry artist'),calls=[],ack=deferred();await openResourceManager(a);await a.click({action:'resource-add'});const form=resourceEditorForm(a,{displayName:saved.displayName});
 a.client.saveSchedulingResource=async(record,current,key)=>{calls.push({record:copy(record),current:current?copy(current):null,key});if(calls.length===1)throw serviceError(503,'SERVICE_UNAVAILABLE');return ack.promise};
 await a.submit(form.id,form.values,form);assert.equal(calls.length,1);assert.ok(a.read('resourceDraft'));assert.equal(form.values.displayName,saved.displayName);assert.ok(a.nodes['#resource-editor-error'].textContent);
 const oldRead=deferred();a.client.schedulingResources=()=>oldRead.promise;const refreshing=a.set('refreshSharedResources({paint:false})'),saving=a.submit(form.id,form.values,form);await until(()=>calls.length===2,'Retry must genuinely be waiting for the shared service');
 try{assert.ok(form.allControls.every(control=>control.disabled),'Pending resource writes must disable the editable form and close controls');a.ctx.document.activeElement=a.ctx.document.body;let prevented=false;a.keydown('Tab',{preventDefault(){prevented=true}});assert.equal(prevented,true,'If disabled controls move focus to the body, Tab must not escape to the background page while a resource write is pending');}finally{ack.resolve({resource:copy(saved)});await saving}
 assert.equal(calls.length,2);assert.deepEqual(calls[1],calls[0],'Retry must use the exact original payload, current version and operation key');assert.ok(calls[0].key);assert.equal(a.read('sharedSchedulingResources[0].id'),saved.id);assert.equal(a.read('resourceDraft??null'),null);
 oldRead.resolve({resources:[],revision:'old-before-save'});await refreshing;assert.deepEqual(a.read('sharedSchedulingResources'),[saved],'A GET started before an accepted write must not erase its acknowledgement');assert.equal(a.messages.filter(message=>message==='Scheduling resource saved').length,1);
});

test('shared scheduling resources enforce readonly roles and ignore old identity reads and save acknowledgements without closing a new editor',async()=>{
 const row=schedulingResource('qa-resource-teacher','teacher','QA shared artist'),teacher=await resourceUiApp({resources:[row],revision:1},{session:async()=>({user:{...copy(sharedTestUser),role:'teacher'}}),schedules:async()=>({revision:'explicit-teacher-resource-read',readScope:'occurrences',occurrences:[]})});await openResourceManager(teacher);assert.match(teacher.nodes['#modal-root'].innerHTML,/Read only/);assert.match(teacher.nodes['#modal-root'].innerHTML,/data-action="resource-add" disabled/);await teacher.click({action:'resource-add'});await teacher.click({action:'resource-edit',resourceId:row.id});assert.equal(teacher.read('resourceDraft??null'),null);assert.equal(teacher.resourceCalls.length,0);
 const student=await resourceUiApp({resources:[row],revision:1},{session:async()=>({user:{...copy(sharedTestUser),role:'student'}})});await student.set('openSchedulingResources()');assert.equal(student.read('resourceManager??null'),null);assert.deepEqual(student.resourceReads,[]);
 const a=await resourceUiApp({resources:[row],revision:1});await openResourceManager(a);await a.click({action:'resource-edit',resourceId:row.id});const oldForm=resourceEditorForm(a,{displayName:'Old identity changed name'}),ack=deferred();let started=false;a.client.saveSchedulingResource=async()=>{started=true;return ack.promise};const pending=a.submit(oldForm.id,oldForm.values,oldForm);await until(()=>started,'The previous identity must genuinely have a resource write in flight');switchSharedIdentity(a);oldForm.isConnected=false;
 a.client.schedulingResources=async()=>({resources:[],revision:'new-user-resources'});await openResourceManager(a);await a.click({action:'resource-add'});const newForm=resourceEditorForm(a,{displayName:'New identity draft'}),newModal=a.read('modal');assert.equal(a.read('resourceSaving'),false);ack.resolve({resource:{...row,displayName:'Old identity changed name',version:2}});await pending;
 assert.equal(a.read('authUser.id'),'next-auth-admin');assert.equal(a.read('modal'),newModal);assert.equal(newForm.values.displayName,'New identity draft');assert.deepEqual(a.read('sharedSchedulingResources'),[]);assert.deepEqual(a.messages,[]);
 const late=deferred();a.client.schedulingResources=()=>late.promise;const read=a.set('refreshSharedResources({paint:false})');a.set('applySharedUser(null)');late.resolve({resources:[row],revision:'old-user-private-resources'});await read;assert.deepEqual(a.read('sharedSchedulingResources'),[]);assert.equal(a.read('resourceManager??null'),null);assert.equal(a.read('resourceDraft??null'),null);
});

test('shared resource IDs survive active lesson duplication and copied inactive assignments are rejected as new assignments',async()=>{
 const teacher=schedulingResource('qa-teacher-A','teacher','QA teaching artist'),room=schedulingResource('qa-room-A','room','QA studio'),otherTeacher=schedulingResource('qa-teacher-B','teacher','QA second artist'),otherRoom=schedulingResource('qa-room-B','room','QA second studio'),teacherIds=[teacher.id,otherTeacher.id],roomIds=[room.id,otherRoom.id],record=sharedScheduleRecord({teacherIds,roomIds,teacher:teacher.displayName,room:room.displayName}),remote={resources:[teacher,room,otherTeacher,otherRoom],revision:1};
 const a=await resourceUiApp(remote,{schedules:async()=>({schedules:[copy(record)],revision:'resource-assignment-series'})});await a.set('refreshSharedResources({paint:false})');
 await a.click({openLesson:record.id,lessonKind:'schedule',lessonDate:'2026-10-08',lessonSequence:'1'});await a.click({action:'lesson-duplicate'});
 assert.equal(a.read('scheduleDraft.id'),'');assert.deepEqual(a.read('scheduleDraft.teacherIds??null'),teacherIds,'Duplicating a formal assignment must retain its stable teacher IDs rather than downgrade its label to unmatched legacy text');assert.deepEqual(a.read('scheduleDraft.roomIds??null'),roomIds);
 assert.match(a.nodes['#modal-root'].innerHTML,/name="teacherIds" value="qa-teacher-A"[^>]*checked/);assert.match(a.nodes['#modal-root'].innerHTML,/name="roomIds" value="qa-room-A"[^>]*checked/);
 let form=sharedScheduleForm({values:{teacherIds,roomIds,endMode:'count',count:'1'}});await a.submit(form.id,form.values,form);assert.equal(a.scheduleCalls.filter(call=>call.operation==='save').length,1);assert.deepEqual(a.scheduleCalls.find(call=>call.operation==='save').record.teacherIds,teacherIds,'FormData must keep every checked teacher, not only the last checkbox');assert.deepEqual(a.scheduleCalls.find(call=>call.operation==='save').record.roomIds,roomIds);assert.equal(a.read('modal'),'');
 remote.resources=[{...teacher,active:false,version:2},room,otherTeacher,otherRoom];remote.revision++;await a.set('refreshSharedResources({paint:false})');await a.click({openLesson:record.id,lessonKind:'schedule',lessonDate:'2026-10-08',lessonSequence:'1'});await a.click({action:'lesson-duplicate'});form=sharedScheduleForm({values:{teacherIds,roomIds,endMode:'count',count:'1'}});
 await a.submit(form.id,form.values,form);assert.equal(a.scheduleCalls.filter(call=>call.operation==='save').length,1,'An inactive ID copied into a new draft is not an existing assignment that may be retained');assert.ok(a.nodes['#schedule-error'].textContent);assert.ok(a.read('scheduleDraft'));assert.equal(a.read('scheduleDraft.id'),'');
 await a.click({action:'close'});a.remote.rows.push(copy(record));a.set(`openSchedule(${JSON.stringify(record.id)})`);assert.match(a.nodes['#modal-root'].innerHTML,/value="qa-teacher-A"[^>]*data-resource-inactive="true"[^>]*checked/);form=sharedScheduleForm({id:record.id,version:'1',values:{teacherIds,roomIds,time:'11:00'}});await a.submit(form.id,form.values,form);assert.equal(a.scheduleCalls.filter(call=>call.operation==='save').length,2,'An existing inactive assignment may be retained while editing lesson time');assert.deepEqual(a.scheduleCalls.at(-1).record.teacherIds,teacherIds);
});

test('shared resource rename reorders checkboxes without changing a time-only following assignment, while a real membership change is submitted',async()=>{
 const A=schedulingResource('qa-teacher-A','teacher','A artist'),B=schedulingResource('qa-teacher-B','teacher','0 renamed B'),C=schedulingResource('qa-teacher-C','teacher','C artist');
 const series=scopedScheduleRecord({teacherIds:[A.id,B.id],roomIds:[],teacher:'A artist, B artist',exceptions:[{sequence:3,overrides:{teacherIds:[C.id],teacher:'C artist'}}]});
 for(const selected of [[B.id,A.id],[C.id,A.id]]){
  const a=await scopedScheduleApp([series]);a.client.schedulingResources=async()=>({resources:[B,A,C],revision:'renamed-resource-order'});await a.set('refreshSharedResources({paint:false})');
  const form=scopedEditor(a,{values:{time:'13:15',teacherIds:selected,roomIds:[]}}),markup=a.nodes['#modal-root'].innerHTML;
  assert.ok(markup.indexOf('value="qa-teacher-B"')<markup.indexOf('value="qa-teacher-A"'),'The renamed resource really must appear first in the rendered chooser');
  await a.submit(form.id,form.values,form);assert.ok(a.read('scheduleScopeDraft'),'The public save must open the real occurrence confirmation');
  const expected=selected.includes(B.id)?[A.id,B.id]:selected;
  assert.deepEqual(a.read('scheduleScopeDraft.record.teacherIds'),expected,'An unchanged checkbox set must keep its opened order so a time-only Following save cannot erase a later independent teacher assignment');
  chooseScopedSave(a,'following');a.receipt={...copy(series),version:2};await confirmScopedSave(a);
  assert.deepEqual(a.occurrenceCalls[0].record.teacherIds,expected);assert.equal(a.occurrenceCalls[0].scope,'following');assert.equal(a.occurrenceCalls[0].sequence,2);
  assert.deepEqual(a.read('scheduleOccurrence(db.schedules[0],3).item.teacherIds'),[C.id]);
 }
});

test('shared resource manager close immediately paints an acknowledged rename and restores the surviving opener',async()=>{
 const teacher=schedulingResource('qa-teacher-close','teacher','Old artist name'),record=sharedScheduleRecord({teacherIds:[teacher.id],roomIds:[],teacher:teacher.displayName}),remote={resources:[teacher],revision:1};
 const a=await resourceUiApp(remote,{schedules:async()=>({schedules:[copy(record)],revision:'assigned-lesson'})});await a.set('refreshSharedResources({paint:false})');a.set("tab='overview';location.pathname='/account';selectTimetableDate('2026-10-08');render()");
 assert.match(a.nodes['#app'].innerHTML,/Old artist name/);a.change('tt-resource',teacher.id,{checked:true});assert.equal((a.nodes['#app'].innerHTML.match(/data-open-lesson=/g)||[]).length,1);let focused=0;const opener={isConnected:true,focus(){focused++}};a.ctx.document.activeElement=opener;
 await openResourceManager(a);await a.click({action:'resource-edit',resourceId:teacher.id});const form=resourceEditorForm(a,{displayName:'New artist name'});await a.submit(form.id,form.values,form);
 assert.equal(a.read('sharedViewDirty'),true);assert.match(a.nodes['#app'].innerHTML,/Old artist name/,'The underlying calendar stays mounted while the manager is open');
 await a.click({action:'resource-close'});assert.equal(a.read('resourceManager??null'),null);assert.equal(a.read('modal'),'');assert.match(a.nodes['#app'].innerHTML,/New artist name/,'Closing must show the accepted resource name immediately without waiting for a later poll');assert.doesNotMatch(a.nodes['#app'].innerHTML,/Old artist name/);assert.equal(a.read('sharedViewDirty'),false);assert.equal(focused,1);assert.deepEqual(a.read('timetableSelections.teachers'),[teacher.id],'Renaming must retain the stable ID filter');assert.equal((a.nodes['#app'].innerHTML.match(/data-open-lesson=/g)||[]).length,1);
});

test('shared resource manager polling with an unchanged revision keeps its mounted controls and scroll position',async()=>{
 const row=schedulingResource('qa-stable-manager','teacher','Stable artist'),a=await resourceUiApp({resources:[row],revision:1});await openResourceManager(a);
 const root=a.nodes['#modal-root'];let html=root.innerHTML,replacements=0;Object.defineProperty(root,'innerHTML',{configurable:true,get:()=>html,set(value){html=value;replacements++}});
 const focusedButton={isConnected:true,matches:()=>false},scroll={scrollTop:180};a.ctx.document.activeElement=focusedButton;root.managerScroll=scroll;
 const revision=a.read('resourceRevision');await a.set('refreshSharedResources({paint:true})');assert.equal(a.resourceReads.at(-1),revision,'This must exercise an actual unchanged service response');
 assert.equal(replacements,0,'An unchanged background poll must not replace manager buttons while the user is clicking or scrolling');assert.equal(a.ctx.document.activeElement,focusedButton);assert.equal(root.managerScroll.scrollTop,180);assert.ok(a.read('resourceManager'));
 a.resourceRemote.resources=[{...row,displayName:'Changed artist',version:2}];a.resourceRemote.revision++;await a.set('refreshSharedResources({paint:true})');assert.match(root.innerHTML,/Changed artist/);assert.ok(replacements>0,'A real resource change must still refresh the visible manager');
});

test('shared time-only following saves omit missing resource IDs and preserve later assignments without automatically matching legacy names',async()=>{
 const teacher=schedulingResource('qa-existing-teacher','teacher','Same legacy artist'),room=schedulingResource('qa-later-room','room','Same legacy room');
 for(const legacy of [false,true]){
  const {id,version,createdAt,updatedAt,...rule}=scopedScheduleRecord(),series=scopedScheduleRecord({...(legacy?{teacher:teacher.displayName,room:room.displayName}:{}),segments:[{fromSequence:3,rule:{...rule,startDate:'2026-10-28',count:1,session:3,roomIds:[room.id],room:room.displayName}}]});
  const a=await scopedScheduleApp([series]);a.client.schedulingResources=async()=>({resources:[teacher,room],revision:'formal-resource-records'});await a.set('refreshSharedResources({paint:false})');const form=scopedEditor(a,{values:{time:'13:15'}});
  assert.equal(a.read('Object.hasOwn(scheduleDraft,"teacherIds")'),false);assert.equal(a.read('Object.hasOwn(scheduleDraft,"roomIds")'),false);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/<input[^>]*name="(?:teacherIds|roomIds)"[^>]*checked/,'Matching names must not automatically assign formal resource IDs');
  await a.submit(form.id,form.values,form);chooseScopedSave(a,'following');a.receipt={...copy(series),version:2};await confirmScopedSave(a);const sent=a.occurrenceCalls[0].record;
  assert.equal(Object.hasOwn(sent,'teacherIds'),false,'Missing IDs must be omitted, not converted to an explicit clear');assert.equal(Object.hasOwn(sent,'roomIds'),false,'A time-only Following edit must not clear a later independently assigned room');assert.equal(sent.teacher,legacy?teacher.displayName:'');assert.equal(sent.room,legacy?room.displayName:'');assert.deepEqual(a.read('scheduleOccurrence(db.schedules[0],3).item.roomIds'),[room.id]);
 }
});

test('calendar consecutive range accepts every 1–14 day length from the exact chosen date and navigation advances that many days without changing lessons',()=>{
 const a=app({},'2026-10-08T12:00:00');a.set("lang='en';role='teacher';tab='overview';location.pathname='/account';render()");const before=a.read('db');
 a.change('','range',{id:'tt-view'});assert.equal(a.read('timetableView'),'range','The public view selector must offer the confirmed consecutive-day mode');
 const dates=['2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03','2027-01-04','2027-01-05','2027-01-06','2027-01-07','2027-01-08','2027-01-09','2027-01-10','2027-01-11'];
 const nextStarts=['2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03','2027-01-04','2027-01-05','2027-01-06','2027-01-07','2027-01-08','2027-01-09','2027-01-10','2027-01-11','2027-01-12'];
 for(let count=1;count<=14;count++){
  a.change('',String(count),{id:'tt-range-count'});a.change('','2026-12-29',{id:'tt-date'});assert.deepEqual(a.read('timetableDays().map(timetableDateKey)'),dates.slice(0,count),'A range must start on the chosen Tuesday, without rounding to Monday');
  assert.match(a.nodes['#app'].innerHTML,/id="tt-range-count"/);a.click({action:'tt-next'});assert.equal(a.read('timetableDate'),nextStarts[count-1]);a.click({action:'tt-prev'});assert.equal(a.read('timetableDate'),'2026-12-29');
 }
 assert.deepEqual(a.read('db'),before,'Date and layout preferences must not change lesson, booking, capacity or fee data');
});

test('calendar consecutive range wraps 14 days as 7 plus 7 and 8 days as 7 plus 1, retaining those date groups after filters hide empty days',()=>{
 const a=app({},'2026-10-08T12:00:00');a.set("lang='en';role='teacher';tab='overview';location.pathname='/account';db.classes=[{...db.classes[0],weekdays:[1,3],teacher:'Only artist',courseName:'Range fixture',classCode:'RANGE-1'},{...db.classes[1],weekdays:[0,1,2,3,4,5,6],teacher:'Other artist',courseName:'Other fixture'}];selectTimetableDate('2026-10-08');render()");
 const before=a.read('db'),columns=()=>[...a.nodes['#app'].innerHTML.matchAll(/--tt-days:(\d+)/g)].map(match=>Number(match[1]));a.change('','range',{id:'tt-view'});a.change('','14',{id:'tt-range-count'});
 assert.deepEqual(columns(),[7,7],'Fourteen days must produce two actual timetable grids with seven columns each');assert.equal((a.nodes['#app'].innerHTML.match(/data-tt-range-group=/g)||[]).length,2);
 a.change('','8',{id:'tt-range-count'});assert.deepEqual(columns(),[7,1]);a.change('','14',{id:'tt-range-count'});a.click({ttResourceTab:'teachers'});a.change('tt-resource','Only artist',{checked:true});a.change('',true,{id:'tt-hide-empty',checked:true});
 assert.deepEqual(columns(),[2,2],'Hide Empty filters each original seven-day group; it must not move the second week into the first row');const lessons=[...a.nodes['#app'].innerHTML.matchAll(/<button\b[^>]*data-open-lesson="a"[^>]*>/g)].map(match=>markupDataset(match[0]).lessonDate);assert.deepEqual(lessons,['2026-10-12','2026-10-14','2026-10-19','2026-10-21']);assert.ok(columns().every(count=>count<=7));
 a.submit('timetable-search',{search:'No such fixture'});assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-open-lesson=/);assert.ok(columns().every(count=>count<=7));a.submit('timetable-search',{search:''});a.change('',false,{id:'tt-hide-empty',checked:false});assert.deepEqual(columns(),[7,7]);assert.deepEqual(a.read('db'),before);
});

test('calendar consecutive range leaves ordinary day, week, month and list dates unchanged when switching views',()=>{
 const a=app({},'2026-10-08T12:00:00');a.set("lang='en';role='teacher';tab='overview';location.pathname='/account';selectTimetableDate('2026-10-08');render()");a.change('','range',{id:'tt-view'});a.change('','8',{id:'tt-range-count'});
 for(const [view,first,last,length]of [['day','2026-10-08','2026-10-08',1],['week','2026-10-05','2026-10-11',7],['month','2026-10-01','2026-10-31',31],['list','2026-10-01','2026-10-31',31]]){
  a.change('',view,{id:'tt-view'});const days=a.read('timetableDays().map(timetableDateKey)');assert.equal(days.length,length);assert.equal(days[0],first);assert.equal(days.at(-1),last);assert.equal(a.read('timetableDate'),'2026-10-08');
 }
 a.change('','range',{id:'tt-view'});assert.deepEqual(a.read('timetableDays().map(timetableDateKey)'),['2026-10-08','2026-10-09','2026-10-10','2026-10-11','2026-10-12','2026-10-13','2026-10-14','2026-10-15']);
});

test('shared calendar range keeps the selected course-jump dates and unsaved settings draft, and preferences belong to the current account',async()=>{
 const a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1}),before=a.read('db'),A=copy(a.state.user);a.change('','range',{id:'tt-view'});a.change('','8',{id:'tt-range-count'});a.change('','2026-10-08',{id:'tt-date'});
 await a.click({openCourse:'qa-course'});a.change('','timetable',{id:'course-detail-view'});assert.equal(a.read('timetableView'),'range');assert.equal(a.read('timetableDate'),'2026-10-08');assert.equal(a.read('timetableViewSettings.rangeDays'),8);assert.match(a.nodes['#app'].innerHTML,/data-open-lesson="qa-schedule"/);
 await a.click({action:'tt-view-settings'});a.submit('tt-view-settings',timetableSettingsValues({rangeDays:'14'}));assert.equal(a.read('timetableViewSettings.rangeDays'),14);assert.equal(a.read('timetableView'),'range');const saved=a.read(`localStorage.getItem(timetableSettingsKey+':'+authUser.id)`);assert.equal(JSON.parse(saved).rangeDays,14);
 await a.click({action:'tt-view-settings'});a.change('rangeDays','3',{closest:selector=>selector==='#tt-view-settings'?{id:'tt-view-settings'}:null});const draft=a.read('timetableSettingsDraft'),mounted=a.read('modal');await a.set('refreshSharedSession()');assert.deepEqual(a.read('timetableSettingsDraft'),draft);assert.equal(a.read('modal'),mounted);a.keydown('Escape');assert.equal(a.read('timetableViewSettings.rangeDays'),14);assert.equal(a.read(`localStorage.getItem(timetableSettingsKey+':'+authUser.id)`),saved);assert.deepEqual(a.read('db'),before);
 const B={...A,id:'qa-calendar-teacher-B',role:'teacher'};a.ctx.preferenceUser=copy(B);a.state.user=copy(B);a.set('applySharedUser(preferenceUser)');assert.equal(a.read('timetableViewSettings.rangeDays'),7,'Another account must start with its own preferences');await a.click({action:'tt-view-settings'});a.submit('tt-view-settings',timetableSettingsValues({rangeDays:'2'}));assert.equal(a.read('timetableViewSettings.rangeDays'),2);
 a.ctx.preferenceUser=copy(A);a.state.user=copy(A);a.set('applySharedUser(preferenceUser)');assert.equal(a.read('timetableViewSettings.rangeDays'),14,'Returning to the original account must reload its own saved range');assert.equal(a.read('localStorage.getItem(timetableSettingsKey)'),null,'Shared account settings must not overwrite the legacy preview preference key');
});

test('student calendar consecutive range shows only the student’s confirmed paid lessons and grants visual settings without management writes',()=>{
 const a=app({},'2026-10-08T12:00:00');a.set("lang='en';role='student';tab='overview';location.pathname='/account';db.bookings=[{id:'OWN',studentId:'demo',student:db.student.name,classId:'a',status:'confirmed',paid:true,paidAt:'2026-09-30',lessonCount:4},{id:'UNPAID',studentId:'demo',student:db.student.name,classId:'b',status:'confirmed',paid:false},{id:'OTHER',studentId:'another-student',student:'Private other student',classId:'c',status:'confirmed',paid:true,paidAt:'2026-09-30',lessonCount:4}];render()");const before=a.read('db');
 assert.match(a.nodes['#app'].innerHTML,/id="student-calendar-view"/);a.change('','range',{id:'student-calendar-view'});a.change('','2026-10-08',{id:'student-calendar-date'});a.change('','14',{id:'tt-range-count'});
 let html=a.nodes['#app'].innerHTML;assert.deepEqual([...html.matchAll(/--tt-range-days:(\d+)/g)].map(match=>Number(match[1])),[7,7]);assert.equal((html.match(/class="calendar-event"/g)||[]).length,2);assert.doesNotMatch(html,/Course 2|Private other student|Secret|data-edit-activity|data-open-lesson=/);
 a.click({action:'calendar-next'});assert.match(a.nodes['#app'].innerHTML,/id="student-calendar-date"[^>]*value="2026-10-22"/);a.click({action:'calendar-prev'});assert.match(a.nodes['#app'].innerHTML,/id="student-calendar-date"[^>]*value="2026-10-08"/);
 a.click({action:'tt-view-settings'});assert.match(a.nodes['#modal-root'].innerHTML,/id="tt-view-settings"/);a.submit('tt-view-settings',timetableSettingsValues({rangeDays:'8'}));assert.deepEqual([...a.nodes['#app'].innerHTML.matchAll(/--tt-range-days:(\d+)/g)].map(match=>Number(match[1])),[7,1]);a.click({action:'tt-add-schedule'});assert.equal(a.read('scheduleDraft'),null);assert.equal(a.read('modal'),'');assert.deepEqual(a.read('db'),before);
 a.change('','month',{id:'student-calendar-view'});assert.match(a.nodes['#app'].innerHTML,/class="calendar-grid"/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/teacher-timetable/);
});

test('teacher occurrence-scoped calendars clear a revoked open lesson and material cache for the same account, ignoring a delayed old-scope read',async()=>{
 for(const delayed of [false,true]){
  const teacher={...copy(sharedTestUser),role:'teacher',accessRevision:'authorized-scope-A'},series=sharedScheduleRecord({remark:'Private authorized lesson remark'}),{weekdays,endMode,endDate,count,...item}=series,occurrence={sequence:1,date:'2026-10-08',item:{...item,startDate:'2026-10-08'}},material={...copy(sharedTestMaterial),name:'Private authorized scope material'};
  const a=await sharedScheduleApp({rows:[],revision:1},{session:async()=>({user:copy(teacher)}),schedules:async()=>({revision:'authorized-occurrence-revision',readScope:'occurrences',occurrences:[copy(occurrence)]}),materials:async()=>({materials:[copy(material)]})});
  a.set("timetableView='day';render()");assert.match(a.nodes['#app'].innerHTML,/data-open-lesson="qa-schedule"/,'A teacher must render the authorized occurrence DTO without receiving the recurrence series');assert.equal(a.read('db.schedules.length'),0,'An occurrence-scoped response must not be promoted into a whole recurring series');
  await a.set("refreshCourseMaterials('qa-course',{paint:false})");assert.equal(a.read('materialCaches.get("qa-course").items[0].name'),material.name);await a.click({openLesson:series.id,lessonKind:'schedule',lessonDate:occurrence.date,lessonSequence:'1'});assert.match(a.nodes['#modal-root'].innerHTML,/Private authorized lesson remark/);
  let pending,started=false;const old=deferred();if(delayed){a.client.schedules=()=>{started=true;return old.promise};pending=a.set('refreshSharedSchedules({paint:false})');await until(()=>started,'The old-scope read must genuinely be in flight before revocation');}
  a.client.session=async()=>({user:{...copy(teacher),accessRevision:'revoked-scope-B'}});a.client.courses=async()=>({courses:[]});a.client.fees=async()=>({fees:[]});a.client.schedules=async()=>({revision:'revoked-occurrence-revision',readScope:'occurrences',occurrences:[]});a.client.materials=async()=>{throw serviceError(404,'NOT_FOUND')};
  await a.focus[0]();assert.equal(a.read('authUser.id'),teacher.id);assert.equal(a.read('authUser.role'),'teacher');assert.equal(a.read('authUser.accessRevision'),'revoked-scope-B');assert.equal(a.read('modal'),'');assert.equal(a.read('selectedTimetableLesson'),null);assert.equal(a.read('materialCaches.size'),0);assert.deepEqual(a.read('sharedScheduleOccurrences'),[]);assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-open-lesson="qa-schedule"|Private authorized/);
  if(delayed){old.resolve({revision:'authorized-occurrence-revision',readScope:'occurrences',occurrences:[copy(occurrence)]});await pending;assert.deepEqual(a.read('sharedScheduleOccurrences'),[]);assert.equal(a.read('modal'),'');assert.equal(a.read('materialCaches.size'),0);assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-open-lesson="qa-schedule"|Private authorized/);}
 }
});

const accessAccount=(id,displayName,role='teacher')=>({id,displayName,role});
async function accessUiApp(remote={},overrides={},options={}){
 remote.accounts??=[accessAccount('access-artist-A','Artist A'),accessAccount('access-artist-B','Artist B'),accessAccount(sharedTestUser.id,'Administrator','admin')];remote.teacherLinks??=[];remote.grants??=[];remote.revision??=1;
 const resource=schedulingResource('access-teacher-resource','teacher','Teaching artist'),resources=[resource,schedulingResource('access-room-resource','room','Studio')],calls=[],reads=[];
 const a=await resourceUiApp({resources,revision:1},{schedules:async()=>({revision:'access-editor-schedules',schedules:[sharedScheduleRecord()]}),
  async accessControl(since){reads.push(since);return {...copy(remote),revision:'access-'+remote.revision}},
  async saveTeacherLink(resourceId,userId,version,key){calls.push({operation:'link',resourceId,userId,version,key});const current=remote.teacherLinks.find(link=>link.teacherResourceId===resourceId);if((current?.version||0)!==version)throw serviceError(409,'VERSION_CONFLICT');const teacherLink={teacherResourceId:resourceId,userId,version:version+1};remote.teacherLinks=remote.teacherLinks.filter(link=>link.teacherResourceId!==resourceId);remote.teacherLinks.push(teacherLink);remote.revision++;return {teacherLink:copy(teacherLink),revision:'access-'+remote.revision}},
  async createScopeGrant(grant,key){calls.push({operation:'grant',grant:copy(grant),key});const value={...copy(grant),id:'access-grant-'+(remote.grants.length+1),active:true,version:1};remote.grants.push(value);remote.revision++;return {grant:copy(value),revision:'access-'+remote.revision}},
  async setScopeGrantActive(grant,active,key){calls.push({operation:'toggle',grant:copy(grant),active,key});const current=remote.grants.find(row=>row.id===grant.id);if(current?.version!==grant.version)throw serviceError(409,'VERSION_CONFLICT');const value={...current,active,version:current.version+1};remote.grants=remote.grants.map(row=>row.id===grant.id?value:row);remote.revision++;return {grant:copy(value),revision:'access-'+remote.revision}},...overrides},options);
 const original=a.ctx.document.querySelectorAll;a.ctx.document.querySelectorAll=selector=>selector==='[data-access-grant-fields]'?a.accessForm?.fieldsets||[]:selector.includes('.access-dialog')?(a.accessForm?.allControls||a.accessManagerControls||[]).filter(control=>!selector.includes(':not(:disabled)')||!control.disabled):original(selector);
 return Object.assign(a,{accessRemote:remote,accessCalls:calls,accessReads:reads,accessResource:resource});
}
async function openAccessManager(a){const reads=a.accessReads.length;await a.click({action:'access-open'});assert.match(a.nodes['#modal-root'].innerHTML,/access-management-dialog/,'The public administrator action must open the actual permission manager');await until(()=>a.accessReads.length>reads&&!!a.read('teacherAccessCache?.revision')&&a.read('teacherAccessRead??null')===null,'The fresh access snapshot must genuinely finish loading before editing, even when a cached revision already exists');}
function accessEditorForm(a,id,values={}){
 const tag=a.nodes['#modal-root'].innerHTML.match(new RegExp('<form\\b[^>]*id="'+id+'"[^>]*>'))?.[0];assert.ok(tag,'The actual access editor must be mounted');const form=sharedForm(id);form.dataset=markupDataset(tag);form.values=values;form.isConnected=true;form.fields=Object.fromEntries(Object.entries(values).map(([name,value])=>[name,{name,value,disabled:false,focus(){}}]));form.fieldsets=['course','resource','occurrence'].map(kind=>({dataset:{accessGrantFields:kind},hidden:kind!=='course',disabled:kind!=='course'}));const buttons=form.querySelectorAll('button');form.allControls=[...buttons,...Object.values(form.fields)];form.querySelectorAll=selector=>selector.includes('data-access-grant-fields')?form.fieldsets:selector==='button'?[...buttons]:form.allControls;form.querySelector=selector=>form.fields[selector.match(/\[name=["']?([a-zA-Z]+)/)?.[1]]||form.submitButton;a.accessForm=form;a.nodes['#'+id]=form;a.nodes['#access-save']=form.submitButton;a.nodes['#access-editor-error']={textContent:'',isConnected:true};return form;
}

test('administrator access controls link and unlink an existing teacher account and create and revoke a single-lesson grant from acknowledgements',async()=>{
 const a=await accessUiApp();await openAccessManager(a);await a.click({action:'access-link-edit',resourceId:a.accessResource.id});let form=accessEditorForm(a,'access-teacher-link-editor',{userId:'access-artist-A'}),reads=a.accessReads.length;await a.submit(form.id,form.values,form);
 assert.deepEqual(a.accessCalls[0],{operation:'link',resourceId:a.accessResource.id,userId:'access-artist-A',version:0,key:a.accessCalls[0].key});assert.ok(a.accessCalls[0].key);assert.equal(a.accessReads.length,reads,'An accepted permission write must update its cache without another GET');assert.match(a.nodes['#modal-root'].innerHTML,/Artist A/);assert.equal(a.resourceCalls.length,0,'Linking an account must not create another teacher resource');
 await a.click({action:'access-link-edit',resourceId:a.accessResource.id});form=accessEditorForm(a,'access-teacher-link-editor',{userId:''});await a.submit(form.id,form.values,form);assert.equal(a.accessCalls[1].userId,null);assert.equal(a.accessCalls[1].version,1);assert.equal(a.read('teacherAccessCache.teacherLinks[0].userId'),null);
 await a.click({action:'access-tab',accessTab:'grants'});a.change('userId','access-artist-A',{id:'access-user-filter'});await a.click({action:'access-grant-add'});form=accessEditorForm(a,'access-grant-editor',{userId:'access-artist-A',kind:'occurrence',occurrenceKey:'qa-schedule:2'});a.change('kind','occurrence',{id:'access-grant-kind'});assert.deepEqual(form.fieldsets.filter(fieldset=>!fieldset.disabled&&!fieldset.hidden).map(fieldset=>fieldset.dataset.accessGrantFields),['occurrence']);await a.submit(form.id,form.values,form);const grant=a.accessRemote.grants[0];assert.ok(grant);assert.deepEqual(a.accessCalls[2].grant,{userId:'access-artist-A',kind:'occurrence',scheduleId:'qa-schedule',sequence:2});assert.equal(a.read('teacherAccessCache.grants[0].id'),grant.id);assert.equal(a.accessReads.length,reads);
 const toggle=a.client.setScopeGrantActive,attempts=[];let lostReceipt;a.client.setScopeGrantActive=async(current,active,key)=>{attempts.push({grant:copy(current),active,key});if(lostReceipt&&key===attempts[0].key)return copy(lostReceipt);const result=await toggle(current,active,key);if(attempts.length===1){lostReceipt=copy(result);throw serviceError(503,'SERVICE_UNAVAILABLE')}return result};
 await a.click({action:'access-grant-toggle',grantId:grant.id});await until(()=>!a.read('teacherAccessSaving'),'The lost acknowledgement must settle and leave a retryable manager');assert.ok(a.read('teacherAccessError'));assert.equal(a.read('teacherAccessCache.grants[0].version'),1);await a.click({action:'access-grant-toggle',grantId:grant.id});await until(()=>!a.read('teacherAccessSaving'),'The permission retry must settle');assert.deepEqual(attempts[1],attempts[0],'A revoke retry after a lost success response must keep the opened version, payload and operation key');assert.ok(attempts[0].key);assert.equal(a.accessCalls[3].grant.version,1);assert.equal(a.accessCalls[3].active,false);assert.equal(a.read('teacherAccessCache.grants[0].active'),false);assert.equal(a.read('teacherAccessCache.grants[0].version'),2);await a.click({action:'access-grant-toggle',grantId:grant.id});await until(()=>!a.read('teacherAccessSaving'),'Restoring the permission must settle');assert.equal(a.accessCalls[4].grant.version,2);assert.equal(a.accessCalls[4].active,true);assert.equal(a.read('teacherAccessCache.grants[0].version'),3);
 for(const [kind,target]of [['course',{courseId:'qa-course'}],['resource',{resourceId:'access-room-resource'}]]){await a.click({action:'access-grant-add'});form=accessEditorForm(a,'access-grant-editor',{userId:'access-artist-A',kind,...target});a.change('kind',kind,{id:'access-grant-kind'});assert.deepEqual(form.fieldsets.filter(fieldset=>!fieldset.disabled&&!fieldset.hidden).map(fieldset=>fieldset.dataset.accessGrantFields),[kind]);await a.submit(form.id,form.values,form);assert.deepEqual(a.accessCalls.at(-1).grant,{userId:'access-artist-A',kind,...target});}
 assert.equal(a.accessReads.length,reads);assert.equal(a.accessRemote.accounts.length,3,'Permission management must not manufacture login accounts');
});

test('administrator access editor conflicts keep the opened version and typed account, and cancellation returns to the manager without another write',async()=>{
 const remote={teacherLinks:[{teacherResourceId:'access-teacher-resource',userId:'access-artist-A',version:5}]},a=await accessUiApp(remote);await openAccessManager(a);await a.click({action:'access-link-edit',resourceId:a.accessResource.id});const form=accessEditorForm(a,'access-teacher-link-editor',{userId:'access-artist-B'});remote.teacherLinks[0]={...remote.teacherLinks[0],version:6};await a.submit(form.id,form.values,form);
 assert.equal(a.accessCalls[0].version,5,'Save must use the opened permission version, not silently accept another administrator’s update');assert.equal(form.values.userId,'access-artist-B');assert.ok(a.nodes['#access-editor-error'].textContent);assert.match(a.nodes['#modal-root'].innerHTML,/id="access-teacher-link-editor"/);assert.equal(form.submitButton.disabled,false);await a.click({action:'access-editor-cancel'});assert.match(a.nodes['#modal-root'].innerHTML,/access-management-dialog/);assert.equal(a.accessCalls.length,1);assert.equal(remote.teacherLinks[0].version,6);
});

test('access management denies readonly identities and a pending old administrator acknowledgement cannot unlock or close a new identity’s editor',async()=>{
 for(const role of ['teacher','student']){
  const a=await accessUiApp({}, {session:async()=>({user:{...copy(sharedTestUser),role}}),schedules:async()=>({revision:'readonly-role-scope',readScope:'occurrences',occurrences:[]})});assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-action="access-open"/);await a.click({action:'access-open'});await a.click({action:'access-link-edit',resourceId:a.accessResource.id});const forged=sharedForm('access-teacher-link-editor');forged.dataset={resourceId:a.accessResource.id,version:'0'};await a.submit(forged.id,{userId:'access-artist-A'},forged);assert.equal(a.read('teacherAccessManager??null'),null);assert.equal(a.accessReads.length,0);assert.equal(a.accessCalls.length,0);
 }
 const a=await accessUiApp();await openAccessManager(a);await a.click({action:'access-link-edit',resourceId:a.accessResource.id});const form=accessEditorForm(a,'access-teacher-link-editor',{userId:'access-artist-A'}),ack=deferred();let started=false;a.client.saveTeacherLink=()=>{started=true;return ack.promise};const pending=a.submit(form.id,form.values,form);await until(()=>started,'The old account must genuinely be waiting for its permission acknowledgement');
 try{
  assert.ok(form.allControls.every(control=>control.disabled),'Permission writes must lock the editable controls while pending');a.ctx.document.activeElement=a.ctx.document.body;let trapped=false;a.keydown('Tab',{preventDefault(){trapped=true}});assert.equal(trapped,true,'Disabled controls must not let keyboard focus escape into the background');a.keydown('Escape');assert.ok(a.read('teacherAccessDraft'));
  switchSharedIdentity(a);form.isConnected=false;await openAccessManager(a);await a.click({action:'access-link-edit',resourceId:a.accessResource.id});const newForm=accessEditorForm(a,'access-teacher-link-editor',{userId:'access-artist-B'}),newModal=a.read('modal');ack.resolve({teacherLink:{teacherResourceId:a.accessResource.id,userId:'access-artist-A',version:1},revision:'old-identity-ack'});await pending;
  assert.equal(a.read('authUser.id'),'next-auth-admin');assert.equal(a.read('modal'),newModal);assert.equal(newForm.values.userId,'access-artist-B');assert.equal(a.read('teacherAccessDraft.kind'),'link');assert.equal(a.read('teacherAccessSaving'),false);assert.deepEqual(a.read('teacherAccessCache.teacherLinks'),[]);
 }finally{ack.resolve({teacherLink:{teacherResourceId:a.accessResource.id,userId:'access-artist-A',version:1},revision:'old-identity-ack'});await pending;}
});

test('calendar public selection of year 0001 keeps padded ISO range reads and the mini calendar in the actual selected year',async()=>{
 const windows=[],user={...copy(sharedTestUser),role:'teacher',accessRevision:'early-year-read-scope'},a=await sharedScheduleApp({rows:[],revision:1},{session:async()=>({user}),schedules:async(since,range)=>{windows.push(copy(range));return {revision:'early-year-'+range?.from,readScope:'occurrences',occurrences:[]}}});
 a.change('','range',{id:'tt-view'});a.change('','7',{id:'tt-range-count'});a.change('','0001-01-01',{id:'tt-date'});await a.set('refreshSharedSchedules({paint:false})');assert.deepEqual(a.read('timetableDays().map(timetableDateKey)'),['0001-01-01','0001-01-02','0001-01-03','0001-01-04','0001-01-05','0001-01-06','0001-01-07'],'Selected early years must remain valid four-digit ISO dates');assert.equal(windows.at(-1).from,'0001-01-01');assert.equal(windows.at(-1).to,'0001-01-07');assert.equal(a.read('timetableMonth.getFullYear()'),1,'The mini calendar must not silently turn year 1 into 1901');assert.match(a.nodes['#app'].innerHTML,/data-tt-date="0001-01-01"/);
});

test('warm access-manager reopening refreshes renamed and new resources even when ACL revision is unchanged, without replacing an active editor',async()=>{
 const a=await accessUiApp();await openAccessManager(a);assert.match(a.nodes['#modal-root'].innerHTML,/Teaching artist/);const revision=a.read('teacherAccessCache.revision');await a.click({action:'access-close'});
 const added=schedulingResource('new-access-teacher','teacher','New teaching artist');a.resourceRemote.resources=a.resourceRemote.resources.map(resource=>resource.id===a.accessResource.id?{...resource,displayName:'Renamed teaching artist',version:2}:resource).concat(added);a.resourceRemote.revision++;
 await openAccessManager(a);assert.equal(a.read('teacherAccessCache.revision'),revision,'The permissions themselves have not changed');assert.ok(a.read('sharedSchedulingResources.some(resource=>resource.id==="new-access-teacher")'));assert.match(a.nodes['#modal-root'].innerHTML,/Renamed teaching artist/,'Warm reopening must render the freshly read resource context');assert.match(a.nodes['#modal-root'].innerHTML,/data-resource-id="new-access-teacher"/);
 await a.click({action:'access-link-edit',resourceId:a.accessResource.id});const form=accessEditorForm(a,'access-teacher-link-editor',{userId:'access-artist-B'}),mounted=a.read('modal');a.resourceRemote.resources=a.resourceRemote.resources.map(resource=>resource.id===a.accessResource.id?{...resource,displayName:'Renamed again',version:3}:resource);a.resourceRemote.revision++;await a.set('refreshSharedResources({paint:false})');await a.set('refreshTeacherAccess({paint:true})');assert.equal(a.read('modal'),mounted);assert.equal(form.values.userId,'access-artist-B');assert.equal(a.accessCalls.length,0);await a.click({action:'access-editor-cancel'});assert.match(a.nodes['#modal-root'].innerHTML,/Renamed again/);
});

test('a shared teacher cannot render unscoped legacy student, enrolment, management, lead or news data through sidebar actions or old class URLs',async()=>{
 const user={...copy(sharedTestUser),role:'teacher',accessRevision:'no-legacy-authorizations'},a=await sharedScheduleApp({rows:[],revision:1},{session:async()=>({user}),courses:async()=>({courses:[]}),fees:async()=>({fees:[]}),schedules:async()=>({revision:'empty-safe-teacher-view',readScope:'occurrences',occurrences:[]})});
 a.set(`db.bookings=[{id:'PRIVATE-PAID',studentId:'other-student',student:'Unscoped paid student Zed',classId:'a',paid:true,status:'confirmed',paidAt:'2026-10-01'},{id:'PRIVATE-PENDING',studentId:'other-pending',student:'Unscoped pending student Zee',classId:'a',paid:false,status:'pending',submittedAt:'2026-10-01'}];db.studentProfiles={'Unscoped paid student Zed':{id:'private-legacy-student',name:'Unscoped paid student Zed',phone:'12345678',email:'fictional-private@example.test'}};db.requests=[{id:'PRIVATE-REQUEST',student:'Unscoped request student'}];db.leads=[${JSON.stringify({id:'private-legacy-lead',...leadInput({displayName:'Unscoped lead Zee'}),status:'active',archived:false,createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z'})}];db.news=[{...db.news[0],title:'Unscoped future news draft',releaseDate:'2030-01-01'}];previewTeachers.push({id:'private-legacy-teacher',name:'Unscoped management teacher',level:'teacher',permissions:[]});render()`);
 const privateData=/Unscoped (?:paid|pending|request|lead|future|management)|fictional-private@example\.test/;
 a.ctx.document.querySelector('#modal-root');
 const nav=a.nodes['#app'].innerHTML.match(/<nav id="portal-sidebar"[\s\S]*?<\/nav>/)?.[0]||'';assert.deepEqual(a.read('portalItems().map(item=>item[0])'),['overview','catalog','fees']);assert.doesNotMatch(nav,/data-tab="(?:student-list|new-enrolments|management|leads|news|students|payments)"/,'Unsupported legacy teacher modules must not appear as usable sidebar entries');
 for(const tab of ['student-list','new-enrolments','management','leads','news']){await a.click({tab});assert.doesNotMatch(a.nodes['#app'].innerHTML,privateData,'A shared teacher must not obtain unrelated local prototype data from '+tab);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,privateData);}
 for(const dataset of [{viewStudent:'private-legacy-student'},{editStudent:'private-legacy-student'}]){await a.click(dataset);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,privateData,'A forged legacy student action must not bypass the page restriction');assert.equal(a.read('modal'),'');}
 await a.click({go:'/account/classes/a'});assert.doesNotMatch(a.nodes['#app'].innerHTML,privateData,'An old class URL must not bypass the shared teacher scope');assert.doesNotMatch(a.nodes['#app'].innerHTML,/class-roster-table/);assert.equal(a.scheduleCalls.filter(call=>call.operation==='save').length,0);
});

test('teacher date navigation paints an authorized delayed response while the committed date stays focused, but retains an uncommitted search until blur',async()=>{
 const user={...copy(sharedTestUser),role:'teacher',accessRevision:'navigation-scope'},record=sharedScheduleRecord(),initial=teacherScheduleFixture(record),newRow={sequence:2,date:'2026-10-30',item:{...initial.occurrences[0].item,startDate:'2026-10-30',time:'14:00',session:2}},reply=deferred();let started=false;
 const a=await sharedScheduleApp({rows:[],revision:1},{session:async()=>({user}),schedules:async(since,range)=>{if(range?.from==='2026-10-30'){started=true;return reply.promise}return initial}});a.change('','day',{id:'tt-view'});await a.set('refreshSharedSchedules({paint:false})');a.change('','2026-10-30',{id:'tt-date'});const reading=a.set('refreshSharedSchedules({paint:true})');await until(()=>started,'Changing the date must dispatch the new authorized date-window read');
 const makeDateControl=()=>({id:'tt-date',value:'2026-10-30',isConnected:true,matches:selector=>selector.includes('input'),focus(){a.ctx.document.activeElement=this}}),focused=makeDateControl();a.nodes['#tt-date']=focused;a.ctx.document.activeElement=focused;const appRoot=a.nodes['#app'];let html=appRoot.innerHTML;Object.defineProperty(appRoot,'innerHTML',{configurable:true,get:()=>html,set(value){html=value;a.nodes['#tt-date'].isConnected=false;a.nodes['#tt-date']=makeDateControl();a.ctx.document.activeElement=a.ctx.document.body}});
 reply.resolve({revision:'navigation-new-window',readScope:'occurrences',occurrences:[copy(newRow)]});await reading;assert.equal(a.read('sharedScheduleOccurrences[0].item.time'),'14:00');assert.match(appRoot.innerHTML,/data-open-lesson="qa-schedule"[^>]*data-lesson-date="2026-10-30"/,'A committed navigation control must not indefinitely hide the already authorized response');assert.match(appRoot.innerHTML,/14:00/);assert.equal(a.ctx.document.activeElement,a.nodes['#tt-date'],'Repainting must restore focus to the newly mounted committed date control');assert.equal(a.nodes['#tt-date'].isConnected,true);assert.equal(a.nodes['#tt-date'].value,'2026-10-30');
 const typed={id:'uncommitted-timetable-search',value:'Keep my unsaved search',matches:selector=>selector.includes('input')};a.ctx.document.activeElement=typed;const changed={...copy(newRow),item:{...copy(newRow.item),time:'15:00',version:2}};a.client.schedules=async since=>since==='navigation-while-typing'?{revision:since,readScope:'occurrences',unchanged:true}:{revision:'navigation-while-typing',readScope:'occurrences',occurrences:[changed]};await a.set('refreshSharedSchedules({paint:true})');assert.match(appRoot.innerHTML,/14:00/);assert.equal(a.ctx.document.activeElement,typed);assert.equal(typed.value,'Keep my unsaved search');assert.equal(a.read('sharedViewDirty'),true);
 a.ctx.document.activeElement=a.ctx.document.body;await a.set('refreshSharedSchedules({paint:true})');assert.match(appRoot.innerHTML,/15:00/,'After blur, an unchanged poll must flush a postponed authorized update');assert.equal(a.read('sharedViewDirty'),false);
});

test('access manager public opening focuses inside its dialog and recaptures Tab from outside even when every control is disabled',async()=>{
 const a=await accessUiApp(),opener={id:'background-access-opener',isConnected:true,matches:()=>false,closest:()=>null,focus(){a.ctx.document.activeElement=this}},dialog={contains:node=>node===dialog||controls.includes(node),focus(){a.ctx.document.activeElement=this}},controls=['close','filter'].map(id=>({id:'access-'+id,disabled:false,closest:selector=>selector.includes('[hidden]')?null:dialog,focus(){a.ctx.document.activeElement=this}}));a.accessManagerControls=controls;
 const query=a.ctx.document.querySelector;a.ctx.document.querySelector=selector=>selector.includes('access-close')||/\.access-(?:management-)?dialog (?:header )?button/.test(selector)?controls[0]:['.access-dialog','.access-management-dialog'].includes(selector)?dialog:query(selector);a.ctx.document.activeElement=opener;
 await openAccessManager(a);assert.ok(dialog.contains(a.ctx.document.activeElement),'Opening a permission dialog must focus inside it instead of leaving keyboard users on the page underneath');
 for(const disabled of [false,true]){controls.forEach(control=>control.disabled=disabled);a.ctx.document.activeElement=opener;let prevented=false;a.keydown('Tab',{preventDefault(){prevented=true}});assert.equal(prevented,true,'Tab from outside the open permission dialog must be recaptured');assert.ok(dialog.contains(a.ctx.document.activeElement),'A busy dialog without enabled controls must still receive keyboard focus');}
 controls.forEach(control=>control.disabled=false);await a.click({action:'access-close'});assert.equal(a.ctx.document.activeElement,opener,'Closing must restore the original surviving opener');
});

const formalPerson = (fields={}) => ({id:'qa-applicant',kind:'applicant',displayName:'Fictional applicant',dateOfBirth:null,parentName:'',whatsApp:'',email:'',school:'',referrer:'',localName:'',firstName:'',lastName:'',phone:'',address:'',level:'',remark:'',citizenId:'',fullName:'',gender:'',mobile:'',district:'',contact1Name:'',contact1Phone:'',contact1Email:'',contact2Name:'',contact2Phone:'',contact2Email:'',occupation:'',detail:'',billName:'',enrollmentDate:null,quitDate:null,promotion:null,version:1,createdAt:'2026-10-15T00:00:00Z',updatedAt:'2026-10-15T00:00:00Z',convertedAt:null,convertedBy:null,...fields});
function mountPeopleModalRoot(a){
 // Main renders replace their modal child in a browser. Keep the host harness
 // from mistaking its detached old modal object for the currently visible one.
 const root=a.nodes['#app'];let html=root.innerHTML;
 const replace=value=>{const previous=a.ctx.document.querySelector('#modal-root');previous.isConnected=false;a.nodes['#modal-root']={...previous,isConnected:true,innerHTML:String(value).match(/<div id="modal-root">([\s\S]*)<\/div>$/)?.[1]||''};};
 Object.defineProperty(root,'innerHTML',{configurable:true,get:()=>html,set:value=>{html=value;replace(value)}});replace(html);
}
async function peopleUiApp(remote={people:[],revision:1},overrides={},options={}){
 const peopleReads=[],peopleWrites=[];
 const a=await sharedApp({
  async people(query={},revision=''){peopleReads.push({operation:'list',query:copy(query),revision});const kind=query.kind||'applicant',q=String(query.q||'').toLowerCase(),sort=query.sort||'displayName',direction=query.direction==='desc'?-1:1,rows=remote.people.filter(person=>person.kind===kind&&(!q||JSON.stringify(person).toLowerCase().includes(q))).sort((one,two)=>direction*one[sort].localeCompare(two[sort])||one.id.localeCompare(two.id)),page=Number(query.page)||1,pageSize=Number(query.pageSize)||25;return {people:copy(rows.slice((page-1)*pageSize,page*pageSize)),total:rows.length,page,pageSize,revision:String(remote.revision)}},
  async person(id){peopleReads.push({operation:'person',id});const person=remote.people.find(person=>person.id===id);if(!person)throw serviceError(404,'PERSON_NOT_FOUND');return {person:copy(person)}},
  async personHistory(id){peopleReads.push({operation:'history',id});const person=remote.people.find(person=>person.id===id);return {history:person?[{id:1,action:'person.create',version:1,actor:{id:sharedTestUser.id,displayName:sharedTestUser.displayName},createdAt:person.createdAt,snapshot:copy(person)}]:[]}},
  async savePerson(profile,current,key){peopleWrites.push({profile:copy(profile),current:current?copy(current):null,key});const previous=current&&remote.people.find(person=>person.id===current.id);if(current&&previous?.version!==current.version)throw serviceError(409,'VERSION_CONFLICT','Another administrator changed this person.');const person=formalPerson({...previous,...profile,id:current?.id||'qa-created-applicant',version:current?current.version+1:1,updatedAt:'2026-10-15T01:00:00Z'});remote.people=remote.people.filter(record=>record.id!==person.id);remote.people.push(person);remote.revision++;return {person:copy(person)}},
  ...overrides,
 },{},options);
 const queryAll=a.ctx.document.querySelectorAll;
 a.ctx.document.querySelectorAll=selector=>selector.includes('.people-editor-dialog')?(a.peopleForm?.controls||[]).filter(control=>!selector.includes(':not(:disabled)')||!control.disabled):queryAll?.(selector)||[];
 if(options.mountModalRoot)mountPeopleModalRoot(a);
 return Object.assign(a,{peopleRemote:remote,peopleReads,peopleWrites});
}
async function openPeopleDirectory(a,kind='applicant'){
 const students=a.nodes['#app'].innerHTML.match(/<button[^>]*data-tab="([^"]+)"[^>]*aria-label="Students"/);assert.ok(students,'The administrator needs a visible Students entry');
 await a.click({tab:students[1]});assert.match(a.nodes['#app'].innerHTML,/class="people-directory"/,'The shared Students entry must open the formal directory instead of legacy or placeholder data');
 await a.click({action:'people-kind',peopleKind:kind});await until(()=>a.peopleReads.some(read=>read.operation==='list'&&read.query.kind===kind),'The selected classification must load the shared list');
 await until(()=>a.read('peopleList.ready')&&!a.read('peopleReads.size'),'The shared directory read must complete');
}
function peopleEditorForm(a,values){
 const tag=a.nodes['#modal-root'].innerHTML.match(/<form id="people-editor"[^>]*>/)?.[0];assert.ok(tag,'A real applicant editor must be mounted before submitting');
 const dataset=markupDataset(tag),attributes={},error={textContent:'',focus(){}},dialog={contains:node=>node===dialog||controls.includes(node),focus(){a.ctx.document.activeElement=this}},inputNames=[...a.nodes['#modal-root'].innerHTML.matchAll(/<(?:input|textarea|select)[^>]*\bname="([^"]+)"/g)].map(match=>match[1]);
 const nearest=selector=>selector.includes('[hidden]')?null:dialog,fields=Object.fromEntries(inputNames.map(name=>[name,{name,value:values[name]??'',disabled:false,isConnected:true,closest:nearest,focus(){a.ctx.document.activeElement=this}}])),submit={id:'people-save',disabled:false,textContent:dataset.id?'Save':'Add applicant',isConnected:true,closest:nearest,focus(){a.ctx.document.activeElement=this}},cancel={disabled:false,isConnected:true,dataset:{action:'people-editor-cancel'},closest:nearest,focus(){a.ctx.document.activeElement=this}},fieldset={disabled:false},controls=[...Object.values(fields),cancel,submit];
 const form={id:'people-editor',dataset,values:copy(values),isConnected:true,submitButton:submit,fields,fieldset,dialog,controls,
  querySelector:selector=>selector==='fieldset'||selector.includes('people-editor-fields')?fieldset:selector.includes('submit')||selector==='#people-save'?submit:selector.includes('people-editor-error')?error:fields[selector.match(/name=["']?([^\]"']+)/)?.[1]]||null,
  querySelectorAll:selector=>selector.includes('fieldset')?[fieldset]:selector.includes('input')||selector.includes('textarea')||selector.includes('select')?Object.values(fields):[cancel,submit],
  setAttribute:(key,value)=>attributes[key]=String(value),removeAttribute:key=>delete attributes[key],closest:selector=>selector.includes('people-editor')?dialog:null,
 };
 a.peopleForm=form;a.nodes['#people-editor']=form;a.nodes['#people-editor-error']=error;a.nodes['#people-save']=submit;a.nodes['.people-editor-dialog']=dialog;a.nodes['#people-display-name']=fields.displayName;return form;
}

test('formal applicant directory opens from Students and creates and edits two contacts by stable shared ID without enrolling or hydrating local student records',async()=>{
 const a=await peopleUiApp();a.set("db.studentProfiles={'Unrelated local student':{name:'Private legacy child',phone:'81234567'}}");
 await openPeopleDirectory(a);
 assert.match(a.nodes['#app'].innerHTML,/Applicant directory/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/Private legacy child|81234567/);
 await a.click({action:'people-create'});assert.match(a.nodes['#modal-root'].innerHTML,/id="people-editor"/);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/data-action="people-convert"/);assert.deepEqual(a.peopleWrites,[],'Opening a blank applicant editor is not a save');
 const before=a.read('({bookings:db.bookings,requests:db.requests,classes:db.classes,studentProfiles:db.studentProfiles})'),values={displayName:'Applicant <script>private</script>',dateOfBirth:'',parentName:'Fictional parent',whatsApp:'',email:'',school:'',referrer:'',contact1Name:'Contact one <b>',contact1Phone:'82222222',contact1Email:'one@example.test',contact2Name:'Contact two',contact2Phone:'83333333',contact2Email:'two@example.test',enrollmentDate:'',quitDate:'',promotion:''},form=peopleEditorForm(a,values);
 for(const name of ['contact1Name','contact1Phone','contact1Email','contact2Name','contact2Phone','contact2Email'])assert.ok(form.fields[name],`The actual editor must expose ${name}`);
 await a.submit(form.id,form.values,form);assert.equal(a.peopleWrites.length,1);const sent=a.peopleWrites[0];assert.equal(sent.current,null);assert.ok(sent.key);assert.equal(sent.profile.dateOfBirth,null);assert.equal(sent.profile.enrollmentDate,null);assert.equal(sent.profile.quitDate,null);assert.equal(sent.profile.promotion,null,'A blank promotion preference must not imply consent');
 for(const name of ['contact1Name','contact1Phone','contact1Email','contact2Name','contact2Phone','contact2Email'])assert.equal(sent.profile[name],values[name]);
 assert.equal(a.peopleRemote.people.length,1);const person=a.peopleRemote.people[0];assert.equal(person.id,'qa-created-applicant');assert.equal(person.kind,'applicant');assert.equal(person.convertedAt,null);assert.deepEqual(a.read('({bookings:db.bookings,requests:db.requests,classes:db.classes,studentProfiles:db.studentProfiles})'),before,'Profile dates and contacts must not create enrolments, payments or local profiles');
 assert.match(a.nodes['#app'].innerHTML,/Applicant &lt;script&gt;private&lt;\/script&gt;/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/<script>private<\/script>/);assert.match(a.nodes['#app'].innerHTML,/Contact one &lt;b&gt;|one@example.test/);assert.match(a.nodes['#app'].innerHTML,/Contact two|two@example.test/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-action="people-convert"|Trial history|Remaining lessons: 0/);
 await a.click({action:'people-edit',personId:person.id});const edit=peopleEditorForm(a,{...values,contact2Email:'two-updated@example.test'});assert.equal(edit.dataset.id,person.id);assert.equal(edit.dataset.version,'1');await a.submit(edit.id,edit.values,edit);assert.equal(a.peopleRemote.people.length,1);assert.equal(a.peopleRemote.people[0].id,person.id);assert.equal(a.peopleRemote.people[0].version,2);assert.equal(a.peopleRemote.people[0].contact1Email,'one@example.test');assert.equal(a.peopleRemote.people[0].contact2Email,'two-updated@example.test');assert.equal(a.peopleWrites[1].current.id,person.id);assert.equal(a.peopleWrites[1].current.version,1);
 await a.click({action:'people-back'});await a.click({action:'people-open',personId:person.id});await until(()=>a.peopleReads.some(read=>read.operation==='history'&&read.id===person.id),'Opening the stable shared ID must load its administrative history');assert.match(a.nodes['#app'].innerHTML,/Record history/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/Trial history|Private legacy child/);
});

test('formal applicant editor freezes its opened version and preserves typed contacts and operation key after a background conflict until explicit cancellation',async()=>{
 const remote={people:[formalPerson()],revision:1},a=await peopleUiApp(remote);await openPeopleDirectory(a);await a.click({action:'people-open',personId:'qa-applicant'});await until(()=>a.read("peopleDetails.get('qa-applicant')?.ready"),'The opened profile must load before editing');await a.click({action:'people-edit',personId:'qa-applicant'});
 const form=peopleEditorForm(a,{displayName:'Typed draft child',contact2Name:'Typed guardian',contact2Email:'typed@example.test',dateOfBirth:'',promotion:''});assert.equal(form.dataset.version,'1');remote.people[0]={...remote.people[0],displayName:'Other administrator change',version:2};remote.revision++;await a.set("refreshPersonProfile('qa-applicant',{paint:false})");assert.equal(a.read("peopleDetails.get('qa-applicant').person.version"),2);
 await a.submit(form.id,form.values,form);assert.equal(a.peopleWrites[0].current.version,1);assert.match(a.nodes['#people-editor-error'].textContent,/changed|latest|conflict/i);assert.equal(form.values.displayName,'Typed draft child');assert.equal(form.values.contact2Email,'typed@example.test');assert.ok(a.read('peopleEditorDraft'));assert.ok(a.read('modal'));assert.equal(form.submitButton.disabled,false);
 await a.submit(form.id,form.values,form);assert.equal(a.peopleWrites.length,2);assert.equal(a.peopleWrites[1].key,a.peopleWrites[0].key,'Retrying an open editor must retain its operation identity');assert.equal(a.peopleWrites[1].current.version,1);await a.click({action:'people-editor-cancel'});assert.equal(a.peopleWrites.length,2);assert.equal(a.read('peopleEditorDraft'),null);assert.equal(a.read('modal'),'');assert.equal(remote.people[0].displayName,'Other administrator change');
});

test('formal applicant pending save from an old account cannot add private data or close and unlock the new administrators editor',async()=>{
 const a=await peopleUiApp(),wait=deferred();await openPeopleDirectory(a);await a.click({action:'people-create'});const old=peopleEditorForm(a,{displayName:'Private old-account applicant',dateOfBirth:'',promotion:''});let sent;a.client.savePerson=async(profile,current,key)=>{sent={profile:copy(profile),current,key};return wait.promise};const saving=a.submit(old.id,old.values,old);await until(()=>!!sent,'The old account save must actually dispatch');
 a.set("applySharedUser({id:'new-people-admin',displayName:'New administrator',email:'new-people-admin@example.test',role:'admin'});tab='student-placeholder';render()");await a.click({action:'people-create'});const current=peopleEditorForm(a,{displayName:'Keep new-account draft'}),newDraft=a.read('peopleEditorDraft');current.submitButton.disabled=true;
 wait.resolve({person:formalPerson({id:'old-account-result',displayName:'Private old-account applicant'})});await saving;assert.deepEqual(a.read('peopleEditorDraft'),newDraft);assert.equal(current.values.displayName,'Keep new-account draft');assert.equal(current.submitButton.disabled,true,'The old finally handler must not unlock a new form');assert.match(a.nodes['#modal-root'].innerHTML,/id="people-editor"/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/Private old-account applicant/);assert.equal(a.read("peopleDetails.has('old-account-result')"),false);assert.doesNotMatch(a.read('localStorage.getItem(K)'),/Private old-account applicant/);
});

test('formal applicant private list profile and history cannot survive a switch to teacher or student and forged people actions stay denied',async()=>{
 const privatePerson=formalPerson({displayName:'Private other-family applicant',contact2Phone:'84444444'}),a=await peopleUiApp({people:[privatePerson],revision:1});await openPeopleDirectory(a);const profile=deferred(),history=deferred(),list=deferred();let profileStarted=false,historyStarted=false,listStarted=false;a.client.person=async()=>{profileStarted=true;return profile.promise};a.client.personHistory=async()=>{historyStarted=true;return history.promise};a.client.people=async()=>{listStarted=true;return list.promise};
 await a.click({action:'people-open',personId:privatePerson.id});await until(()=>profileStarted,'The old administrator profile request must actually dispatch');const background=a.set('refreshSharedPeople({paint:false})');await until(()=>listStarted,'The old administrator list request must dispatch');
 a.set("applySharedUser({id:'qa-scoped-teacher',displayName:'Scoped teacher',email:'teacher@example.test',role:'teacher',accessRevision:'only-own-course'});tab='student-placeholder';render()");profile.resolve({person:privatePerson});history.resolve({history:[{id:1,action:'person.create',version:1,actor:{id:'other-admin',displayName:'Private family administrator'},createdAt:privatePerson.createdAt,snapshot:privatePerson}]});list.resolve({people:[privatePerson],total:1,page:1,pageSize:25,revision:'private-old'});await background;for(let turn=0;turn<20;turn++)await Promise.resolve();
 assert.equal(a.read('peopleDetails.size'),0);assert.deepEqual(a.read('peopleList.people'),[]);assert.doesNotMatch(a.nodes['#app'].innerHTML,/Private other-family|84444444|Private family administrator/);assert.equal(a.read('modal'),'');
 let deniedReads=0;a.client.people=a.client.person=a.client.personHistory=async()=>{deniedReads++;throw Error('A nonadministrator must not request formal people')};
 for(const user of [{id:'qa-scoped-teacher',displayName:'Scoped teacher',role:'teacher',accessRevision:'only-own-course'},{id:'qa-student',displayName:'Student',role:'student'},null]){a.ctx.nextPersonUser=user;a.set("applySharedUser(nextPersonUser);tab='student-placeholder';location.pathname='/account/people/qa-applicant';render()");await a.click({action:'people-open',personId:'qa-applicant'});await a.click({action:'people-edit',personId:'qa-applicant'});await a.click({action:'people-create'});assert.equal(a.read('modal'),'');assert.doesNotMatch(a.nodes['#app'].innerHTML,/Private other-family|84444444|people-editor/)}
 assert.equal(deniedReads,0);assert.deepEqual(a.peopleWrites,[]);
 const historyReply=deferred();let historyDispatched=false;const historyOnly=await peopleUiApp({people:[privatePerson],revision:1},{personHistory:async()=>{historyDispatched=true;return historyReply.promise}});await openPeopleDirectory(historyOnly);await historyOnly.click({action:'people-open',personId:privatePerson.id});await until(()=>historyDispatched,'The old profile history request must actually dispatch');historyOnly.set("applySharedUser({id:'history-next-teacher',displayName:'New teacher',role:'teacher',accessRevision:'limited'});tab='overview';location.pathname='/account';render()");historyReply.resolve({history:[{id:1,action:'person.create',version:1,actor:{id:'private-admin',displayName:'Private family administrator'},createdAt:privatePerson.createdAt,snapshot:privatePerson}]});for(let turn=0;turn<15;turn++)await Promise.resolve();assert.equal(historyOnly.read('peopleDetails.size'),0);assert.doesNotMatch(historyOnly.nodes['#app'].innerHTML,/Private family administrator|Private other-family|84444444/);
 const expired=await peopleUiApp({people:[privatePerson],revision:1},{personHistory:async()=>{throw serviceError(401,'AUTH_REQUIRED','The session expired after loading the profile')}});await openPeopleDirectory(expired);await expired.click({action:'people-open',personId:privatePerson.id});await until(()=>expired.read('authUser')===null,'A current history 401 must clear the already loaded private profile and session');assert.equal(expired.read('location.pathname'),'/login');assert.doesNotMatch(expired.nodes['#app'].innerHTML,/Private other-family|84444444/);assert.equal(expired.read('peopleDetails.size'),0);
});

test('formal directory search sorting and pagination use the current shared query and reject an older query response',async()=>{
 const people=Array.from({length:32},(_,index)=>formalPerson({id:'directory-'+String(index).padStart(2,'0'),displayName:index>=28?'Family & target '+index:'Applicant '+String(index).padStart(2,'0'),createdAt:`2026-10-15T00:00:${String(index).padStart(2,'0')}Z`})),a=await peopleUiApp({people,revision:1});await openPeopleDirectory(a);assert.equal(a.read('peopleList.total'),32);assert.equal(a.read('peopleList.people.length'),25);
 await a.click({action:'people-page',page:'2'});await until(()=>a.peopleReads.at(-1)?.query.page===2&&a.read('peopleList.ready'),'Next must request the second real page');assert.equal(a.read('peopleList.people.length'),7);assert.equal(a.read('peopleList.people[0].id'),'directory-25');assert.match(a.nodes['#app'].innerHTML,/Page 2 of 2/);
 await a.submit('people-search',{q:'  Family & target  '});await until(()=>a.peopleReads.at(-1)?.query.q==='Family & target'&&a.read('peopleList.ready'),'Searching must submit the committed phrase and reset pagination');assert.equal(a.read('peopleList.page'),1);assert.equal(a.read('peopleList.total'),4);assert.deepEqual(a.read('peopleList.people.map(person=>person.id)'),['directory-28','directory-29','directory-30','directory-31']);
 a.change('sort','createdAt',{id:'people-sort'});a.change('direction','desc',{id:'people-direction'});await until(()=>a.peopleReads.at(-1)?.query.direction==='desc'&&a.read('peopleList.ready'),'The displayed sort controls must select a server query');assert.equal(a.peopleReads.at(-1).query.sort,'createdAt');assert.equal(a.peopleReads.at(-1).query.page,1);assert.equal(a.read('peopleList.people[0].id'),'directory-31');
 const first=deferred(),readPeople=a.client.people;let pending=false;a.client.people=async(query,revision)=>{if(query.q==='outdated'){pending=true;return first.promise}return readPeople(query,revision)};await a.submit('people-search',{q:'outdated'});await until(()=>pending,'The old query must dispatch before it is superseded');await a.submit('people-search',{q:'Applicant 00'});await until(()=>a.read('peopleList.ready')&&a.read('peopleList.people[0]?.id')==='directory-00','The newer committed query must become visible');first.resolve({people:[formalPerson({id:'outdated-private-result',displayName:'Wrong old query'})],total:1,page:1,pageSize:25,revision:'old-query'});for(let turn=0;turn<15;turn++)await Promise.resolve();assert.equal(a.read('peopleList.q'),'Applicant 00');assert.deepEqual(a.read('peopleList.people.map(person=>person.id)'),['directory-00']);assert.doesNotMatch(a.nodes['#app'].innerHTML,/Wrong old query/);
 const committedReply=deferred();let committedPending=false;a.client.people=async(query,revision)=>{if(query.q==='Applicant 01'){committedPending=true;return committedReply.promise}return readPeople(query,revision)};await a.submit('people-search',{q:'Applicant 01'});await until(()=>committedPending,'The committed search request must dispatch before focusing the search control');const input=value=>({id:'people-search-query',value,isConnected:true,matches:selector=>selector.includes('input'),focus(){a.ctx.document.activeElement=this}}),focused=input('Applicant 01'),root=a.nodes['#app'];a.nodes['#people-search-query']=focused;a.ctx.document.activeElement=focused;let displayed=root.innerHTML;Object.defineProperty(root,'innerHTML',{get:()=>displayed,set:value=>{displayed=value;if(a.nodes['#people-search-query'])a.nodes['#people-search-query'].isConnected=false;a.nodes['#people-search-query']=input(a.read('peopleList.q'));a.ctx.document.activeElement=a.ctx.document.body}});
 committedReply.resolve({people:[copy(people[1])],total:1,page:1,pageSize:25,revision:'focused-search-result'});await until(()=>a.read('peopleList.ready'),'The committed search response must finish');assert.match(root.innerHTML,/data-person-id="directory-01"/,'A committed focused search must paint its accepted result immediately');assert.equal(a.ctx.document.activeElement,a.nodes['#people-search-query'],'Painting a committed query must restore focus to the mounted search control');assert.equal(a.nodes['#people-search-query'].value,'Applicant 01');
 const typed=input('Keep my unsubmitted phrase');a.nodes['#people-search-query']=typed;a.ctx.document.activeElement=typed;people[1]={...people[1],parentName:'Updated guardian after blur',version:2};a.client.people=readPeople;await a.set('refreshSharedPeople({paint:true})');assert.equal(a.read('peopleList.people[0].parentName'),'Updated guardian after blur');assert.doesNotMatch(root.innerHTML,/Updated guardian after blur/);assert.equal(a.ctx.document.activeElement,typed);assert.equal(typed.value,'Keep my unsubmitted phrase');a.ctx.document.activeElement=a.ctx.document.body;await a.set('refreshSharedPeople({paint:true})');assert.match(root.innerHTML,/Updated guardian after blur/);
});

test('formal applicant browser Back discards an unsaved editor and ignores a pending acknowledgement without navigating back to the private profile',async()=>{
 const events={},a=await peopleUiApp({people:[],revision:1},{},{onWindowEvent:(type,handler)=>events[type]=handler});await openPeopleDirectory(a);await a.click({action:'people-create'});peopleEditorForm(a,{displayName:'Unsaved applicant draft'});assert.equal(typeof events.popstate,'function');
 a.set("location.pathname='/account';tab='catalog'");events.popstate();assert.equal(a.read('peopleEditorDraft'),null);assert.equal(a.read('modal'),'');assert.deepEqual(a.peopleWrites,[],'Leaving an unsaved editor must not perform a profile write');
 await openPeopleDirectory(a);await a.click({action:'people-create'});const form=peopleEditorForm(a,{displayName:'Pending old-route private profile'}),wait=deferred();let dispatched=false;a.client.savePerson=async()=>{dispatched=true;return wait.promise};const saving=a.submit(form.id,form.values,form);await until(()=>dispatched,'A pending save must dispatch before browser Back');
 a.set("location.pathname='/account';tab='catalog'");events.popstate();assert.equal(a.read('peopleEditorDraft'),null);assert.equal(a.read('peopleSaving'),false);assert.equal(a.read('modal'),'');wait.resolve({person:formalPerson({id:'old-route-person',displayName:'Pending old-route private profile'})});await saving;assert.equal(a.read('location.pathname'),'/account');assert.equal(a.read('tab'),'catalog');assert.equal(a.read("peopleDetails.has('old-route-person')"),false);assert.equal(a.read('modal'),'');assert.doesNotMatch(a.nodes['#app'].innerHTML,/Pending old-route private profile/);
});

test('formal applicant delayed save acknowledgement cannot downgrade a newer same-account profile read',async()=>{
 const remote={people:[formalPerson()],revision:1},a=await peopleUiApp(remote);await openPeopleDirectory(a);await a.click({action:'people-open',personId:'qa-applicant'});await until(()=>a.read("peopleDetails.get('qa-applicant')?.historyReady")&&!a.read('peopleReads.size'),'The current profile must be fully read before editing');await a.click({action:'people-edit',personId:'qa-applicant'});const form=peopleEditorForm(a,{displayName:'First administrator save',contact2Email:'first-save@example.test'}),receipt=deferred();let sent;a.client.savePerson=async(profile,current,key)=>{sent={profile:copy(profile),current:copy(current),key};return receipt.promise};const saving=a.submit(form.id,form.values,form);await until(()=>!!sent,'The older save must actually dispatch');assert.equal(sent.current.version,1);
 remote.people[0]={...remote.people[0],displayName:'Newer administrator profile',contact2Email:'newer@example.test',version:3};remote.revision++;await a.set("refreshPersonProfile('qa-applicant',{paint:false})");assert.equal(a.read("peopleDetails.get('qa-applicant').person.version"),3);assert.equal(form.values.displayName,'First administrator save');
 const laterRead=deferred();a.client.person=async()=>laterRead.promise;receipt.resolve({person:formalPerson({displayName:'First administrator save',contact2Email:'first-save@example.test',version:2})});await saving;assert.equal(a.read("peopleDetails.get('qa-applicant').person.version"),3,'A delayed successful receipt must retain the already read higher version');assert.equal(a.read("peopleDetails.get('qa-applicant').person.contact2Email"),'newer@example.test');assert.match(a.nodes['#app'].innerHTML,/Newer administrator profile/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/first-save@example.test/);assert.equal(a.read('peopleEditorDraft'),null);
 laterRead.resolve({person:copy(remote.people[0])});
});

for(const source of ['directory','history'])test(`formal applicant current ${source} 403 purges private caches and editor before rechecking the changed account`,async()=>{
 const privatePerson=formalPerson({displayName:'Revoked private family',contact2Phone:'85555555'}),privateHistory=[{id:1,action:'person.create',version:1,actor:{id:'private-family-admin',displayName:'Revoked private actor'},createdAt:privatePerson.createdAt,snapshot:privatePerson}],a=await peopleUiApp({people:[privatePerson],revision:1},{personHistory:async()=>({history:copy(privateHistory)})});await openPeopleDirectory(a);await a.click({action:'people-open',personId:privatePerson.id});await until(()=>a.read("peopleDetails.get('qa-applicant')?.historyReady")&&!a.read('peopleReads.size'),'An authorized profile and administrative history must be visible before revocation');assert.match(a.nodes['#app'].innerHTML,/Revoked private actor/);await a.click({action:'people-back'});await until(()=>!a.read('peopleReads.size'),'The authorized directory read must finish before the denial request');
 const denial=deferred(),sessionReply=deferred();let deniedRead=false,sessionReads=0;a.client.session=async()=>{sessionReads++;return sessionReply.promise};if(source==='directory')a.client.people=async()=>{deniedRead=true;return denial.promise};else a.client.personHistory=async()=>{deniedRead=true;return denial.promise};
 if(source==='history')await a.click({action:'people-open',personId:privatePerson.id});await a.click({action:'people-refresh'});await until(()=>deniedRead,'The public refresh must actually reach the denied endpoint');if(source==='directory')await a.click({action:'people-open',personId:privatePerson.id});await a.click({action:'people-edit',personId:privatePerson.id});const form=peopleEditorForm(a,{displayName:'Revoked private family typed draft'});assert.ok(a.read('peopleEditorDraft'));
 const oldProfile=deferred();let oldProfileStarted=false;a.client.person=async()=>{oldProfileStarted=true;return oldProfile.promise};const pendingProfile=source==='directory'?a.set("refreshPersonProfile('qa-applicant',{paint:false})"):null;if(pendingProfile)await until(()=>oldProfileStarted,'A pre-denial background profile read must actually dispatch');
 denial.reject(serviceError(403,'ROLE_FORBIDDEN','This account no longer has administrator profile access'));for(let turn=0;turn<20;turn++)await Promise.resolve();assert.equal(a.read('peopleDetails.size'),0,'A current permission denial must remove previously authorized profile and history caches immediately');assert.deepEqual(a.read('peopleList.people'),[]);assert.equal(a.read('peopleEditorDraft'),null);assert.equal(a.read('modal'),'');assert.doesNotMatch(a.nodes['#app'].innerHTML,/Revoked private family|Revoked private actor|85555555/);assert.ok(sessionReads>0,'A current permission denial must recheck the current login immediately, without waiting for a poll');
 const user={id:'changed-'+source,displayName:'Changed '+source+' account',email:'changed-'+source+'@example.test',role:source==='directory'?'teacher':'student',accessRevision:'limited-after-denial'};sessionReply.resolve({user,csrfToken:'changed-identity-csrf'});await until(()=>a.read('authUser?.id')===user.id,'The immediate session result must apply the changed identity');if(pendingProfile){oldProfile.resolve({person:privatePerson});await pendingProfile}assert.equal(a.read('peopleDetails.size'),0);assert.doesNotMatch(a.nodes['#app'].innerHTML,/Revoked private family|Revoked private actor|85555555/);assert.equal(a.peopleWrites.length,0);assert.equal(form.values.displayName,'Revoked private family typed draft');
});

for(const transition of ['classification','search','page','sort'])test(`formal directory ${transition} immediately shows loading without previous rows or counts while the changed query is pending`,async()=>{
 const rows=transition==='classification'?[formalPerson({id:'pending-classification-person',displayName:'Applicant after the empty student directory'})]:Array.from({length:32},(_,index)=>formalPerson({id:'pending-person-'+String(index).padStart(2,'0'),displayName:index>=30?'ZZ matching applicant '+index:'Previous applicant '+String(index).padStart(2,'0'),createdAt:`2026-10-15T00:00:${String(31-index).padStart(2,'0')}Z`}));
 const a=await peopleUiApp({people:rows,revision:1});await openPeopleDirectory(a,transition==='classification'?'student':'applicant');
 if(transition==='classification'){assert.equal(a.read('peopleList.total'),0);assert.match(a.nodes['#app'].innerHTML,/No student records yet/);}else{assert.equal(a.read('peopleList.total'),32);assert.match(a.nodes['#app'].innerHTML,/Previous applicant 00/);assert.match(a.nodes['#app'].innerHTML,/32 records/);}
 const gate=deferred(),originalRead=a.client.people,pendingReads=[];let dispatched=false;
 a.client.people=(query,revision)=>{dispatched=true;const pending=gate.promise.then(()=>originalRead(query,revision));pendingReads.push(pending);return pending;};
 try{
  if(transition==='classification')await a.click({action:'people-kind',peopleKind:'applicant'});
  else if(transition==='search')await a.submit('people-search',{q:'ZZ matching applicant'});
  else if(transition==='page')await a.click({action:'people-page',page:'2'});
  else a.change('sort','createdAt',{id:'people-sort'});
  assert.equal(dispatched,true,'The public change must dispatch its new shared query before checking the first waiting frame');
  const waiting=a.nodes['#app'].innerHTML;
  const directoryTag=waiting.match(/<section class="people-directory"[^>]*>/)?.[0]||'';
  assert.match(directoryTag,/aria-busy="true"/,'The first frame for a changed query must be busy, even before its reply exists');
  assert.match(waiting,/Loading records…/,'A changed classification, search, page or sort must show loading immediately');
  assert.doesNotMatch(waiting,/data-person-id=|class="people-pagination"|\d+ records · Page|No (?:student|applicant) records yet|No records match your search/,'Pending query UI must hide previous rows and counts, and must not claim that the new result is empty');
  gate.resolve();await until(()=>a.read('peopleList.ready')&&!a.read('peopleReads.size'),'The changed query must show its accepted result after the reply arrives');
  const loaded=a.nodes['#app'].innerHTML;assert.doesNotMatch(loaded,/Loading records…/);assert.match(loaded,/data-person-id=/);
  if(transition==='classification'){assert.match(loaded,/Applicant after the empty student directory/);assert.equal(a.read('peopleList.total'),1);}
  else if(transition==='search'){assert.equal(a.read('peopleList.total'),2);assert.doesNotMatch(loaded,/Previous applicant 00/);}
  else if(transition==='page'){assert.equal(a.read('peopleList.page'),2);assert.match(loaded,/Page 2 of 2/);assert.doesNotMatch(loaded,/Previous applicant 00/);}
  else assert.equal(a.read('peopleList.sort'),'createdAt');
 }finally{gate.resolve();await Promise.allSettled(pendingReads);}
});

const formalAvailableSlot=(fields={})=>({id:'qa-available-slot',kind:'available-slot',sourceKind:'standalone',courseId:'qa-course',courseName:'Shared studio',date:'2026-10-15',time:'13:00',duration:60,teacherIds:['qa-slot-teacher'],roomIds:['qa-slot-room'],teacherNames:['Teaching artist'],roomNames:['Studio room'],scheduleId:null,sequence:null,totalCapacity:8,trialCapacity:2,reschedulingCapacity:1,trialEnabled:true,reschedulingEnabled:false,active:true,publicVisibility:'default',remark:'PRIVATE slot preparation',excludedStudentIds:['PRIVATE excluded person'],version:1,sourceVersions:{'course:qa-course':1,'resource:qa-slot-teacher':1,'resource:qa-slot-room':1},createdAt:'2026-10-15T00:00:00Z',updatedAt:'2026-10-15T00:00:00Z',sourceAvailable:true,unavailableReason:null,trialReserved:0,reschedulingReserved:0,trialRemaining:2,reschedulingRemaining:1,trialStatus:'available',reschedulingStatus:'available',totalReserved:null,classCapacity:null,classOccupied:null,...fields});
const publicAvailableSlot=slot=>({...Object.fromEntries(['id','kind','courseId','date','time','duration','teacherNames','roomNames','totalCapacity','trialCapacity','trialEnabled','trialReserved','trialRemaining','trialStatus'].map(key=>[key,copy(slot[key])])),reschedulingVisible:false});
async function availabilityUiApp(remote={},overrides={},options={}){
 remote.slots??=[formalAvailableSlot()];remote.publicCourse??={id:'qa-course',courseName:'Published authoritative studio',category:'Art',level:'Beginner'};remote.publishedSlots??=remote.slots.length?[publicAvailableSlot(remote.slots[0])]:[];remote.revision??=1;remote.publicRevision??=1;remote.settings??={showFullTrialSlots:false,showReschedulingSlots:false,rangeDays:7,version:0};
 const availabilityReads=[],availabilityWrites=[],publicAvailabilityReads=[],resource={id:'qa-slot-teacher',kind:'teacher',displayName:'Teaching artist',active:true,version:1},room={id:'qa-slot-room',kind:'room',displayName:'Studio room',active:true,capacity:8,detail:'',remark:'',externalLocation:false,version:1};
 const a=await sharedApp({
  schedulingResources:async()=>({resources:[resource,room],revision:'availability-resources'}),
  async availability(range,revision=''){availabilityReads.push({operation:'list',range:copy(range),revision});return {slots:copy(remote.slots.filter(slot=>slot.date>=range.from&&slot.date<=range.to&&(!range.courseId||slot.courseId===range.courseId))),revision:String(remote.revision)}},
  async availableSlot(id){availabilityReads.push({operation:'detail',id});const slot=remote.slots.find(slot=>slot.id===id);if(!slot)throw serviceError(404,'SLOT_NOT_FOUND');return {slot:copy(slot)}},
  async saveAvailableSlot(profile,current,key){availabilityWrites.push({operation:'slot',profile:copy(profile),current:current?copy(current):null,key});const previous=current&&remote.slots.find(slot=>slot.id===current.id);if(current&&previous?.version!==current.version)throw serviceError(409,'VERSION_CONFLICT');const slot=formalAvailableSlot({...previous,...profile,id:current?.id||'qa-created-available-slot',version:current?current.version+1:1});remote.slots=remote.slots.filter(item=>item.id!==slot.id).concat(slot);remote.revision++;return {slot:copy(slot)}},
  async availabilityPublicSettings(){availabilityReads.push({operation:'settings'});return {settings:copy(remote.settings)}},
  async saveAvailabilityPublicSettings(settings,current,key){availabilityWrites.push({operation:'settings',settings:copy(settings),current:copy(current),key});if(current.version!==remote.settings.version)throw serviceError(409,'VERSION_CONFLICT');remote.settings={...remote.settings,...settings,version:current.version+1};return {settings:copy(remote.settings)}},
  async publicCourses(revision=''){publicAvailabilityReads.push({operation:'courses',revision});return {courses:[copy(remote.publicCourse)],revision:String(remote.publicRevision)}},
  async publicCourseDetails(id,from='2026-10-14',revision=''){publicAvailabilityReads.push({operation:'detail',id,from,revision});if(id!==remote.publicCourse.id)throw serviceError(404,'COURSE_NOT_FOUND');const end=new Date(from+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+6);const to=end.toISOString().slice(0,10);return {course:copy(remote.publicCourse),slots:copy(remote.publishedSlots.filter(slot=>slot.date>=from&&slot.date<=to)),from,to,rangeDays:7,revision:String(remote.publicRevision)}},
  ...overrides,
 },{},options);
 const queryAll=a.ctx.document.querySelectorAll;a.ctx.document.querySelectorAll=selector=>selector.includes('.availability-modal')?(a.availabilityForm?.controls||[]).filter(control=>!selector.includes(':not(:disabled)')||!control.disabled):queryAll?.(selector)||[];
 return Object.assign(a,{availabilityRemote:remote,availabilityReads,availabilityWrites,publicAvailabilityReads});
}
async function openAvailabilityTimetable(a){a.set("tab='overview';location.pathname='/account';selectTimetableDate('2026-10-15');timetableView='day';render()");await until(()=>a.availabilityReads.some(read=>read.operation==='list')&&a.read('availabilityCache.ready')&&!a.read('availabilityReads.size'),'The real available-slot date query must complete');}
const availableSlotValues=(fields={})=>({mode:'standalone',courseId:'qa-course',date:'2026-10-15',time:'13:00',duration:'60',teacherIds:['qa-slot-teacher'],roomIds:['qa-slot-room'],totalCapacity:'8',trialCapacity:'2',reschedulingCapacity:'1',trialEnabled:'on',active:'on',publicVisibility:'default',remark:'Typed private slot note',...fields});
function availabilityForm(a,values,id='availability-editor'){
 const tag=a.nodes['#modal-root'].innerHTML.match(new RegExp(`<form id="${id}"[^>]*>`))?.[0];assert.ok(tag,'A real availability form must exist before submitting');const dataset=markupDataset(tag),dialog={contains:node=>node===dialog||controls.includes(node),focus(){a.ctx.document.activeElement=this}},linked=values.mode==='linked',standalone={hidden:linked,disabled:linked},linkedFields={hidden:!linked,disabled:!linked},configuration={disabled:false},attributes={},error={textContent:'',isConnected:true},names=[...new Set([...a.nodes['#modal-root'].innerHTML.matchAll(/<(?:input|textarea|select)[^>]*\bname="([^"]+)"/g)].map(match=>match[1]))],fields=Object.fromEntries(names.map(name=>[name,{name,value:values[name]??'',disabled:false,isConnected:true,closest:selector=>selector.includes('[hidden]')&&['courseId','date','time','duration','teacherIds','roomIds'].includes(name)&&standalone.disabled?standalone:selector.includes('[hidden]')&&name==='occurrenceKey'&&linkedFields.disabled?linkedFields:selector.includes('[hidden]')?null:dialog,focus(){a.ctx.document.activeElement=this}}]));
 const submit={disabled:false,textContent:'Save',focus(){a.ctx.document.activeElement=this}},cancel={disabled:false,dataset:{action:id==='availability-editor'?'availability-editor-cancel':'availability-settings-cancel'},focus(){a.ctx.document.activeElement=this}},controls=[...Object.values(fields),cancel,submit],form={id,dataset,values:copy(values),controls,fields,submitButton:submit,isConnected:true,setAttribute:(key,value)=>attributes[key]=String(value),removeAttribute:key=>delete attributes[key],querySelector:selector=>selector.includes('submit')?submit:fields[selector.match(/name=["']?([^\]"']+)/)?.[1]]||null,querySelectorAll:()=>controls,closest:()=>dialog};
 a.availabilityForm=form;a.nodes['#'+id]=form;a.nodes['#availability-editor-error']=error;a.nodes['#availability-settings-error']=error;a.nodes['#availability-save']=submit;a.nodes['#availability-public-settings-save']=submit;a.nodes['.availability-modal .dialog']=dialog;a.nodes['#availability-standalone-fields']=standalone;a.nodes['#availability-linked-fields']=linkedFields;a.nodes['#availability-configuration-fields']=configuration;for(const name of names)a.nodes['#availability-'+name]=fields[name];a.nodes['#availability-mode']=fields.mode;return form;
}

test('formal anonymous course navigation reads published availability and seven days from public APIs instead of private or legacy caches',async()=>{
 const a=await availabilityUiApp({slots:[formalAvailableSlot(),formalAvailableSlot({id:'hidden-private-slot',publicVisibility:'hide',remark:'PRIVATE hidden remark'})]});a.set("applySharedUser(null);db.classes.push({id:'private-legacy-class',course:'qa-course',courseName:'PRIVATE legacy studio',time:'09:00',weekday:4});db.courseSettings.push({id:'qa-course',courseName:'PRIVATE stale course title',feeName:'PRIVATE admin fee',price:999});lang='en'");const before=a.availabilityReads.length;
 await a.click({go:'/classes'});await until(()=>a.publicAvailabilityReads.some(read=>read.operation==='courses'),'Anonymous Classes must request the formal public catalogue');await until(()=>a.nodes['#app'].innerHTML.includes('Published authoritative studio'),'The public catalogue response must render the published course');assert.doesNotMatch(a.nodes['#app'].innerHTML,/PRIVATE|Course 1|Course 2|Course 3/);
 await a.click({action:'availability-public-course',courseId:'qa-course'});await until(()=>a.publicAvailabilityReads.some(read=>read.operation==='detail'&&read.id==='qa-course'),'The published course button must request its real public details');await until(()=>a.nodes['#app'].innerHTML.includes('Teaching artist'),'The public slot response must become visible');assert.equal(a.read('location.pathname'),'/classes/qa-course');assert.match(a.nodes['#app'].innerHTML,/Published authoritative studio/);assert.match(a.nodes['#app'].innerHTML,/13:00/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/PRIVATE|hidden-private-slot|excluded person|\$999(?:[<.\s]|$)/);assert.equal(a.availabilityReads.length,before,'Anonymous course pages must not fetch private available-slot endpoints');const state=a.read("publicAvailabilityDetails.get('qa-course')");assert.equal(state.from,'2026-10-14');assert.equal(state.to,'2026-10-20');assert.equal(state.slots[0].id,'qa-available-slot');assert.equal(state.slots[0].remark,undefined);assert.equal(state.slots[0].excludedStudentIds,undefined);assert.equal(a.read('authUser'),null);
});

test('formal shared public Join and payment routes cannot expose or execute the old demonstration enrolment and Paid flow',async()=>{
 const a=await availabilityUiApp();a.set("applySharedUser(null);lang='en';sessionStorage.setItem('beamal-enrolment',db.bookings[0].id)");const before=a.read('({bookings:db.bookings,classes:db.classes,requests:db.requests,student:db.student})');
 for(const route of ['/join','/confirmation','/payment','/payment-success']){await a.click({go:route});assert.doesNotMatch(a.nodes['#app'].innerHTML,/<form id="join"|class="payment-success"|data-action="complete-payment"|Payment successful|Check your email to activate/,'A formal public route must not render the legacy registration or payment result')}
 a.set("join={step:3,course:'art',classId:'a',student:'Forbidden legacy enrolment',phone:'80000000',email:'forged@example.test'}");await a.submit('join',{});await a.click({action:'complete-payment'});assert.deepEqual(a.read('({bookings:db.bookings,classes:db.classes,requests:db.requests,student:db.student})'),before,'Disabled visitor Trial and unbuilt Payment must not save a demonstration booking or Paid state');assert.deepEqual(a.availabilityWrites,[]);
});

test('formal available slot Course and Timetable creation keeps one saved ID and fees while a failed post-save refresh cannot recreate it',async()=>{
 const a=await availabilityUiApp({slots:[]});const before=a.read('({fees:sharedFees,schedules:db.schedules,bookings:db.bookings})');await a.click({openCourse:'qa-course'});await a.click({action:'availability-add',courseId:'qa-course'});const form=availabilityForm(a,availableSlotValues());assert.equal(form.dataset.id,'');a.client.availability=async()=>{throw serviceError(503,'SERVICE_UNAVAILABLE')};await a.submit(form.id,form.values,form);assert.equal(a.availabilityWrites.length,1);const saved=a.availabilityRemote.slots[0];assert.equal(saved.id,'qa-created-available-slot');assert.equal(a.availabilityWrites[0].profile.courseId,'qa-course');assert.deepEqual(a.availabilityWrites[0].profile.teacherIds,['qa-slot-teacher']);assert.ok(a.availabilityWrites[0].key);assert.equal(a.read("availabilityRecords.get('qa-created-available-slot').id"),saved.id);assert.equal(a.read('availabilityOverlay'),null);assert.equal(a.read('modal'),'');assert.deepEqual(a.read('({fees:sharedFees,schedules:db.schedules,bookings:db.bookings})'),before);assert.ok(a.messages.some(text=>/saved/i.test(text)),'A valid write acknowledgement must remain saved even if a later read fails');
 await until(()=>a.read('availabilityCache.ready&&!!availabilityCache.error'),'The acknowledged write must survive its subsequent list error');assert.match(a.nodes['#app'].innerHTML,/data-slot-id="qa-created-available-slot"/,'The saved ID must remain visible immediately without needing another successful GET');assert.match(a.nodes['#app'].innerHTML,/role="alert"/);a.set("timetableView='day';selectTimetableDate('2026-10-16');tab='overview';location.pathname='/account';render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-slot-id="qa-created-available-slot"/,'A saved preview must not appear in a different date window');a.set("selectTimetableDate('2026-10-15');location.pathname='/account/courses/qa-course';render()");
 a.set("tab='overview';timetableView='week';location.pathname='/account';render()");const savedControl={dataset:{slotId:saved.id},matches:()=>false,isConnected:true,focus(){a.ctx.document.activeElement=this}},grid={scrollLeft:480,scrollTop:330};a.nodes[`[data-slot-id="${saved.id}"]`]=savedControl;a.ctx.document.activeElement=savedControl;const queryAll=a.ctx.document.querySelectorAll;a.ctx.document.querySelectorAll=selector=>selector==='.tt-grid-scroll'?[grid]:selector==='[data-slot-id]'?[savedControl]:queryAll(selector);let html=a.nodes['#app'].innerHTML;Object.defineProperty(a.nodes['#app'],'innerHTML',{get:()=>html,set:value=>{html=value;a.ctx.document.activeElement=a.ctx.document.body;grid.scrollLeft=0;grid.scrollTop=0},configurable:true});a.client.availability=async()=>({slots:copy(a.availabilityRemote.slots),revision:'recovered-slot-list'});await a.set('refreshSharedAvailability()');assert.match(a.nodes['#app'].innerHTML,/data-slot-id="qa-created-available-slot"/);assert.equal(a.ctx.document.activeElement,savedControl,'The first successful changed read after ACK must keep the saved slot focused');assert.deepEqual({left:grid.scrollLeft,top:grid.scrollTop},{left:480,top:330},'The same changed read must preserve timetable scroll positions');Object.defineProperty(a.nodes['#app'],'innerHTML',{value:html,writable:true,configurable:true});await a.click({action:'availability-open',slotId:saved.id});assert.equal(a.availabilityReads.at(-1).operation,'detail');await a.click({action:'availability-edit',slotId:saved.id});const edit=availabilityForm(a,availableSlotValues({time:'13:30'}));assert.equal(edit.dataset.id,saved.id);assert.equal(edit.dataset.version,'1');await a.click({action:'availability-editor-cancel'});assert.equal(a.availabilityWrites.length,1);assert.equal(a.read('modal'),'');
});

test('formal available slot editing freezes the opened version and stable key while preserving a conflicting draft and busy keyboard controls',async()=>{
 const a=await availabilityUiApp();await openAvailabilityTimetable(a);await a.click({action:'availability-open',slotId:'qa-available-slot'});await a.click({action:'availability-edit',slotId:'qa-available-slot'});const form=availabilityForm(a,availableSlotValues({remark:'Keep my slot draft',time:'13:45'}));assert.equal(form.dataset.version,'1');a.availabilityRemote.slots[0]={...a.availabilityRemote.slots[0],version:2,time:'14:00'};a.availabilityRemote.revision++;await a.set('refreshSharedAvailability({paint:false})');assert.equal(a.read("availabilityRecords.get('qa-available-slot').version"),2);
 await a.submit(form.id,form.values,form);assert.equal(a.availabilityWrites[0].current.version,1);assert.match(a.nodes['#availability-editor-error'].textContent,/changed|latest|updated/i);assert.equal(form.values.remark,'Keep my slot draft');assert.equal(form.submitButton.disabled,false);await a.submit(form.id,form.values,form);assert.equal(a.availabilityWrites[1].key,a.availabilityWrites[0].key);assert.equal(a.availabilityWrites[1].current.version,1);
 const wait=deferred();let called=false;a.client.saveAvailableSlot=async()=>{called=true;return wait.promise};const saving=a.submit(form.id,form.values,form);await until(()=>called,'The save must dispatch before testing pending controls');assert.ok(form.controls.every(control=>control.disabled),'Saving must freeze editable fields as well as buttons');a.ctx.document.activeElement=a.ctx.document.body;let prevented=false;a.keydown('Tab',{preventDefault(){prevented=true}});assert.equal(prevented,true);assert.equal(a.ctx.document.activeElement,a.nodes['.availability-modal .dialog'],'A busy editor without enabled controls must trap keyboard focus');wait.reject(serviceError(503,'SERVICE_UNAVAILABLE'));await saving;assert.equal(form.fields.remark.disabled,false);assert.equal(form.values.remark,'Keep my slot draft');await a.click({action:'availability-editor-cancel'});assert.equal(a.read('modal'),'');assert.equal(a.availabilityRemote.slots[0].time,'14:00');
});

test('formal availability public display settings preserve initial version and cannot change private slot content',async()=>{
 const a=await availabilityUiApp(),before=copy(a.availabilityRemote.slots);await openAvailabilityTimetable(a);await a.click({action:'availability-public-settings-open'});const form=availabilityForm(a,{showFullTrialSlots:'on'},'availability-public-settings');assert.equal(form.dataset.version,'0');await a.submit(form.id,form.values,form);const write=a.availabilityWrites[0];assert.equal(write.operation,'settings');assert.equal(write.current.version,0);assert.deepEqual(write.settings,{showFullTrialSlots:true,showReschedulingSlots:false});assert.ok(write.key);assert.deepEqual(a.availabilityRemote.slots,before);assert.equal(a.availabilityRemote.settings.version,1);assert.equal(a.read('modal'),'');await a.click({action:'availability-public-settings-open'});availabilityForm(a,{showReschedulingSlots:'on'},'availability-public-settings');await a.click({action:'availability-settings-cancel'});assert.equal(a.availabilityWrites.length,1);assert.deepEqual(a.availabilityRemote.slots,before);
});

test('formal late-night available slots remain visible in the real day grid without changing the ordinary timetable end',async()=>{
 const a=await availabilityUiApp({slots:[formalAvailableSlot({time:'23:15',duration:30})]});await openAvailabilityTimetable(a);const html=a.nodes['#app'].innerHTML;assert.match(html,/data-action="availability-open"[^>]*data-slot-id="qa-available-slot"/);assert.match(html,/23:15/);assert.equal(a.read('timetableRange(timetableDays()).end'),1425,'The actual day grid must extend through a late available time instead of clipping it at 20:00');assert.match(html,/>23:30<\/div>/);a.availabilityRemote.slots=[];a.availabilityRemote.revision++;await a.set('refreshSharedAvailability()');assert.equal(a.read('timetableRange(timetableDays()).end'),1200);assert.match(a.nodes['#app'].innerHTML,/>19:45<\/div>/,'A normal timetable with no late activity retains its existing 19:45 last label');assert.doesNotMatch(a.nodes['#app'].innerHTML,/>20:00<\/div>/);
});

test('formal available slot late detail rejection cannot close a subsequently opened slot',async()=>{
 const second=formalAvailableSlot({id:'qa-second-available-slot',time:'15:00'}),a=await availabilityUiApp({slots:[formalAvailableSlot(),second]}),gate=deferred();await openAvailabilityTimetable(a);a.client.availableSlot=async id=>id==='qa-available-slot'?gate.promise:{slot:copy(second)};
 const first=a.click({action:'availability-open',slotId:'qa-available-slot'});assert.equal(a.read('availabilityOverlay.slot.id'),'qa-available-slot');await a.click({action:'availability-close'});await a.click({action:'availability-open',slotId:second.id});assert.equal(a.read('availabilityOverlay.slot.id'),second.id);gate.reject(serviceError(503,'SERVICE_UNAVAILABLE'));await first;assert.equal(a.read('availabilityOverlay?.slot.id??null'),second.id,'An obsolete detail failure must not close the current slot');assert.match(a.nodes['#modal-root'].innerHTML,/15:00/);
});

test('formal availability settings read finishing after navigation cannot reopen an account overlay on a public page',async()=>{
 for(const kind of ['settings','editor'])for(const returnToOriginal of [false,true]){
  const events={},a=await availabilityUiApp({}, {},{onWindowEvent:(type,handler)=>events[type]=handler}),gate=deferred();await openAvailabilityTimetable(a);let started=false;if(kind==='settings')a.client.availabilityPublicSettings=async()=>{started=true;return gate.promise};else{a.set('resourceReady=false');a.client.schedulingResources=async()=>{started=true;return gate.promise}}const pending=a.click({action:kind==='settings'?'availability-public-settings-open':'availability-add'});await until(()=>started,'The opening request must be pending before navigation');await a.click({go:'/classes'});if(returnToOriginal){a.ctx.location.pathname='/account';events.popstate();a.set("tab='overview';render()");}gate.resolve(kind==='settings'?{settings:copy(a.availabilityRemote.settings)}:{resources:[{id:'qa-slot-teacher',kind:'teacher',displayName:'Teaching artist',active:true,version:1}],revision:'late-editor-resources'});await pending;assert.equal(a.read('location.pathname'),returnToOriginal?'/account':'/classes');assert.equal(a.read('availabilityOverlay'),null,'An old opening intent must remain canceled even after returning to its original route');assert.equal(a.read('modal'),'');assert.doesNotMatch(a.nodes['#modal-root']?.innerHTML||'',/availability-public-settings|availability-editor/);
 }
});

test('formal availability unchanged polling preserves the current timetable DOM and focused slot control',async()=>{
 const a=await availabilityUiApp();await openAvailabilityTimetable(a);let paints=0,html=a.nodes['#app'].innerHTML;Object.defineProperty(a.nodes['#app'],'innerHTML',{get:()=>html,set:value=>{paints++;html=value;a.ctx.document.activeElement=a.ctx.document.body},configurable:true});const focused={id:'focused-slot-control',matches:()=>false,focus(){a.ctx.document.activeElement=this}};a.ctx.document.activeElement=focused;a.client.availability=async()=>({unchanged:true,revision:a.read('availabilityCache.revision')});await a.set('refreshSharedAvailability()');assert.equal(paints,0,'An unchanged response must not replace the timetable and its open details or scroll position');assert.equal(a.ctx.document.activeElement,focused);
 a.set("applySharedUser(null);location.pathname='/classes';render()");await until(()=>a.read('publicCoursesCache.ready'),'The public catalogue must load before polling');paints=0;a.ctx.document.activeElement=focused;a.client.publicCourses=async()=>({unchanged:true,revision:a.read('publicCoursesCache.revision')});await a.set('refreshPublicAvailability()');assert.equal(paints,0,'Unchanged public polling must also preserve the course button and page scroll');assert.equal(a.ctx.document.activeElement,focused);
});

test('formal available slot delayed write receipt preserves a newer background version and its source data after list failure',async()=>{
 const a=await availabilityUiApp(),gate=deferred();await openAvailabilityTimetable(a);await a.click({action:'availability-open',slotId:'qa-available-slot'});await a.click({action:'availability-edit',slotId:'qa-available-slot'});const form=availabilityForm(a,availableSlotValues({time:'13:30'}));let opened;a.client.saveAvailableSlot=async(profile,current,key)=>{opened={profile:copy(profile),current:copy(current),key};return gate.promise};const saving=a.submit(form.id,form.values,form);await until(()=>!!opened,'The write must be pending before a newer version is read');const newer=formalAvailableSlot({version:3,time:'15:00',teacherNames:['Renamed authoritative artist'],sourceVersions:{'course:qa-course':3,'resource:qa-slot-teacher':3}});a.availabilityRemote.slots=[newer];a.availabilityRemote.revision++;await a.set('refreshSharedAvailability({paint:false})');assert.equal(a.read("availabilityRecords.get('qa-available-slot').version"),3);a.client.availability=async()=>{throw serviceError(503,'SERVICE_UNAVAILABLE')};gate.resolve({slot:formalAvailableSlot({version:2,time:'13:30'})});await saving;await until(()=>a.read('availabilityCache.ready&&!!availabilityCache.error'),'The post-save read must reach its error state');assert.equal(opened.current.version,1);assert.equal(a.read("availabilityRecords.get('qa-available-slot').version"),3);assert.equal(a.read("availabilityVisibleRecords()[0].time"),'15:00');const card=a.nodes['#app'].innerHTML.match(/<button[^>]*data-action="availability-open"[^>]*data-slot-id="qa-available-slot"[^>]*>[\s\S]*?<\/button>/)?.[0]||'';assert.match(card,/15:00/);assert.doesNotMatch(card,/13:30/);assert.match(a.nodes['#app'].innerHTML,/role="alert"/);assert.equal(a.read('availabilityOverlay'),null);
});

test('formal available slot Back navigation fences a pending write from the new editor and its saving state',async()=>{
 const events={},a=await availabilityUiApp({}, {},{onWindowEvent:(type,handler)=>events[type]=handler}),old=deferred(),fresh=deferred();await openAvailabilityTimetable(a);await a.click({action:'availability-add'});const first=availabilityForm(a,availableSlotValues({remark:'Old page draft'}));let calls=0;a.client.saveAvailableSlot=async()=>++calls===1?old.promise:fresh.promise;const firstSave=a.submit(first.id,first.values,first);await until(()=>calls===1,'The old save must be pending');a.ctx.location.pathname='/classes';events.popstate();assert.equal(a.read('availabilityOverlay'),null);assert.equal(a.read('modal'),'');await a.click({go:'/account'});a.set("tab='overview';render()");await a.click({action:'availability-add'});const second=availabilityForm(a,availableSlotValues({remark:'New page draft'})),secondSave=a.submit(second.id,second.values,second);await until(()=>calls===2,'The current editor must have its own pending save');old.resolve({slot:formalAvailableSlot({id:'obsolete-ack',remark:'Old page draft'})});await firstSave;assert.equal(a.read('availabilitySaving'),true,'The old receipt must not unlock a different editor');assert.equal(a.read("availabilityRecords.has('obsolete-ack')"),false);assert.equal(second.values.remark,'New page draft');assert.match(a.nodes['#modal-root'].innerHTML,/availability-editor/);fresh.reject(serviceError(503,'SERVICE_UNAVAILABLE'));await secondSave;assert.equal(a.read('availabilitySaving'),false);assert.equal(second.submitButton.disabled,false);await a.click({action:'availability-editor-cancel'});
});

test('formal available slot access denial clears focused private drafts and fences old reads before session role refresh',async()=>{
 for(const status of [401,403]){
  const a=await availabilityUiApp(),oldRead=deferred(),session=deferred();await openAvailabilityTimetable(a);a.client.availableSlot=async()=>oldRead.promise;const stale=a.click({action:'availability-open',slotId:'qa-available-slot'});await a.click({action:'availability-close'});await a.click({action:'availability-add'});const form=availabilityForm(a,availableSlotValues({remark:'PRIVATE detached draft'}));a.ctx.document.activeElement=form.fields.remark;form.fields.remark.matches=()=>true;let checked=false;a.client.session=async()=>{checked=true;return session.promise};a.client.availability=async()=>{throw serviceError(status,'FORBIDDEN')};await a.set('refreshSharedAvailability()');assert.equal(a.read('availabilityOverlay'),null);assert.equal(a.read('availabilityRecords.size'),0);assert.equal(a.read('availabilityCache.slots.length'),0);assert.equal(a.read('modal'),'');assert.doesNotMatch(a.nodes['#app'].innerHTML+a.nodes['#modal-root'].innerHTML,/PRIVATE detached draft|PRIVATE slot preparation|PRIVATE excluded person/);oldRead.resolve({slot:formalAvailableSlot({remark:'PRIVATE late reply'})});await stale;assert.equal(a.read('availabilityRecords.size'),0);if(status===401){assert.equal(a.read('authUser'),null);assert.equal(a.read('location.pathname'),'/login');}else{await until(()=>checked,'A current 403 must immediately recheck session permissions');a.state.user={id:'qa-student',displayName:'Student',role:'student'};session.resolve({user:copy(a.state.user)});await until(()=>a.read("authUser?.role==='student'"),'The changed session role must be accepted');assert.equal(a.read('availabilityRecords.size'),0);assert.equal(a.read('availabilityOverlay'),null);}
 }
});

test('formal public available-slot date changes ignore stale success and failure while painting the committed focused date',async()=>{
 for(const outcome of ['success','failure']){
  const a=await availabilityUiApp(),old=deferred();a.set("applySharedUser(null);lang='en'");let oldStarted=false;a.client.publicCourseDetails=async(id,from)=>{if(from==='2026-10-14'){oldStarted=true;return old.promise}return {course:copy(a.availabilityRemote.publicCourse),slots:[publicAvailableSlot(formalAvailableSlot({id:'next-week-slot',date:from,time:'16:00'}))],from,to:'2026-10-28',rangeDays:7,revision:'next-week'}};await a.click({action:'availability-public-course',courseId:'qa-course'});await until(()=>oldStarted,'The first date window must still be pending');const date={id:'availability-public-from',value:'2026-10-22',matches:selector=>selector.includes('input'),focus(){a.ctx.document.activeElement=this}};a.nodes['#availability-public-from']=date;a.ctx.document.activeElement=date;a.change('',date.value,{id:date.id});await until(()=>a.nodes['#app'].innerHTML.includes('next-week-slot'),'The committed focused date must paint without waiting for blur');assert.equal(a.ctx.document.activeElement,date);if(outcome==='success')old.resolve({course:copy(a.availabilityRemote.publicCourse),slots:[publicAvailableSlot(formalAvailableSlot({id:'stale-private-window'}))],from:'2026-10-14',to:'2026-10-20',rangeDays:7,revision:'old'});else old.reject(serviceError(503,'SERVICE_UNAVAILABLE'));await until(()=>a.read('publicAvailabilityReads.size')===0,'Both date requests must settle');assert.equal(a.read("publicAvailabilityDetails.get('qa-course').from"),'2026-10-22');assert.equal(a.read("publicAvailabilityDetails.get('qa-course').error"),'');assert.match(a.nodes['#app'].innerHTML,/next-week-slot|16:00/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/stale-private-window/);
 }
});

test('formal linked available slot saves the real selected occurrence instead of the disabled standalone fields',async()=>{
 const a=await availabilityUiApp({slots:[]}),schedule=sharedScheduleRecord({startDate:'2026-10-15',teacherIds:['qa-slot-teacher'],roomIds:['qa-slot-room'],time:'17:00',duration:45});a.ctx.linkedSchedule=copy(schedule);a.set('db.schedules=[linkedSchedule]');await openAvailabilityTimetable(a);await a.click({action:'availability-add',courseId:'qa-course'});assert.match(a.nodes['#modal-root'].innerHTML,/value="qa-schedule:1"/);const form=availabilityForm(a,availableSlotValues({mode:'linked',occurrenceKey:'qa-schedule:1',courseId:'forged-disabled-course',date:'2026-12-31',time:'01:00',teacherIds:['forged-disabled-teacher']}));let saved;a.client.saveAvailableSlot=async(profile,current,key)=>{saved={profile:copy(profile),current,key};return {slot:formalAvailableSlot({id:'qa-linked-slot',sourceKind:'linked',scheduleId:'qa-schedule',sequence:1,time:'17:00',duration:45,sourceVersions:{'schedule:qa-schedule':1,'course:qa-course':1,'resource:qa-slot-teacher':1,'resource:qa-slot-room':1}})}};await a.submit(form.id,form.values,form);assert.deepEqual(saved.profile,{totalCapacity:8,trialCapacity:2,reschedulingCapacity:1,trialEnabled:true,reschedulingEnabled:false,active:true,publicVisibility:'default',remark:'Typed private slot note',excludedStudentIds:[],scheduleId:'qa-schedule',sequence:1});assert.equal(saved.current,null);assert.ok(saved.key);assert.equal(a.read("availabilityRecords.get('qa-linked-slot').courseId"),'qa-course');assert.equal(a.read("availabilityRecords.get('qa-linked-slot').time"),'17:00');assert.equal(a.read("availabilityRecords.get('qa-linked-slot').scheduleId"),schedule.id);assert.deepEqual(a.read('db.schedules'),[schedule]);assert.equal(a.read('availabilityOverlay'),null);
});

test('formal teacher available-slot details are read-only and forged management cannot write or expose admin-only notes',async()=>{
 const a=await availabilityUiApp(),slot=copy(a.availabilityRemote.slots[0]);delete slot.remark;delete slot.excludedStudentIds;a.state.user={id:'qa-available-teacher',displayName:'Teaching artist',role:'teacher',accessRevision:'authorized-slot'};a.client.availability=async(range,revision)=>{a.availabilityReads.push({operation:'list',range:copy(range),revision});return {slots:[copy(slot)],revision:'teacher-slot'}};a.client.availableSlot=async()=>({slot:copy(slot)});a.client.schedules=async()=>({readScope:'occurrences',occurrences:[],revision:'teacher-empty'});a.ctx.nextAvailabilityUser=copy(a.state.user);a.set('applySharedUser(nextAvailabilityUser)');await openAvailabilityTimetable(a);await a.click({action:'availability-open',slotId:slot.id});assert.match(a.nodes['#modal-root'].innerHTML,/13:00/);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/PRIVATE|data-action="availability-edit"|excludedStudentIds/);await a.click({action:'availability-edit',slotId:slot.id});assert.equal(a.read('availabilityOverlay.kind'),'detail');await a.click({action:'availability-close'});await a.click({action:'availability-add'});await a.click({action:'availability-public-settings-open'});assert.equal(a.read('availabilityOverlay'),null);await a.submit('availability-editor',availableSlotValues(),{dataset:{id:slot.id,version:'1'}});assert.equal(a.availabilityWrites.length,0);assert.equal(a.read('availabilityRecords.size'),1);
});

test('formal Applicant profile sidebar navigation leaves the profile for the actual selected account module',async()=>{
 const a=await peopleUiApp({people:[formalPerson()],revision:1});await openPeopleDirectory(a);
 for(const target of ['overview','catalog','student-list']){await a.click({action:'people-open',personId:'qa-applicant'});await until(()=>a.read("peopleDetails.get('qa-applicant')?.ready"),'The profile must be genuinely open before using its sidebar');assert.equal(a.read('location.pathname'),'/account/people/qa-applicant');await a.click({tab:target});assert.equal(a.read('location.pathname'),'/account','Choosing a sidebar module must leave the profile route');assert.equal(a.read('tab'),target);assert.doesNotMatch(a.nodes['#app'].innerHTML,/class="people-profile"/);assert.match(a.nodes['#app'].innerHTML,target==='overview'?/id="tt-date"/:target==='catalog'?/id="portal-course-search"/:/id="people-search-query"/);}
});

test('teacher representative colour saves on the formal resource, clears explicitly and never enters room metadata',async()=>{
 const a=await resourceUiApp();await openResourceManager(a);await a.click({action:'resource-add'});let form=resourceEditorForm(a,{displayName:'Colour teaching artist',useRepresentativeColor:'on',representativeColor:'#abcdef'});await a.submit(form.id,form.values,form);assert.equal(a.resourceCalls[0].record.representativeColor,'#abcdef','The public resource editor must send the chosen teacher colour');assert.equal(a.resourceCalls[0].current,null);assert.ok(a.resourceCalls[0].key);const teacher=a.resourceRemote.resources[0];assert.equal(teacher.representativeColor,'#abcdef');await a.click({action:'resource-edit',resourceId:teacher.id});assert.match(a.nodes['#modal-root'].innerHTML,/id="resource-color-enabled"[^>]*checked/);assert.match(a.nodes['#modal-root'].innerHTML,/id="resource-representative-color"[^>]*value="#abcdef"/);form=resourceEditorForm(a,{displayName:teacher.displayName,representativeColor:'#abcdef'});delete form.values.useRepresentativeColor;await a.submit(form.id,form.values,form);assert.equal(a.resourceCalls.at(-1).record.representativeColor,null,'Unchecking colour must send explicit null instead of inventing a default');assert.equal(a.resourceRemote.resources[0].id,teacher.id);assert.equal(a.resourceRemote.resources[0].representativeColor,null);
 await a.click({action:'resource-set-kind',resourceKind:'room'});await a.click({action:'resource-add'});assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/resource-color-enabled|resource-representative-color/);form=resourceEditorForm(a,{displayName:'Uncoloured room',capacity:'8',useRepresentativeColor:'on',representativeColor:'#ff0000'});await a.submit(form.id,form.values,form);assert.equal(a.resourceCalls.at(-1).record.kind,'room');assert.equal(Object.hasOwn(a.resourceCalls.at(-1).record,'representativeColor'),false,'Forged teacher colour inputs must not cross the room payload whitelist');
});

test('teacher representative colour conflict uses the opened version and stable key while Cancel preserves the newer saved colour',async()=>{
 const teacher=schedulingResource('colour-teacher','teacher','Colour teacher',{version:7,representativeColor:'#112233'}),remote={resources:[teacher],revision:1},a=await resourceUiApp(remote);await openResourceManager(a);await a.click({action:'resource-edit',resourceId:teacher.id});const form=resourceEditorForm(a,{displayName:teacher.displayName,useRepresentativeColor:'on',representativeColor:'#102030'});remote.resources=[{...teacher,version:8,representativeColor:'#405060'}];remote.revision++;await a.set('refreshSharedResources({paint:false})');await a.submit(form.id,form.values,form);assert.equal(a.resourceCalls[0].record.representativeColor,'#102030');assert.equal(a.resourceCalls[0].current.version,7);assert.match(a.nodes['#resource-editor-error'].textContent,/updated|changed|latest/i);assert.equal(form.values.representativeColor,'#102030');assert.ok(a.read('resourceDraft'));await a.submit(form.id,form.values,form);assert.equal(a.resourceCalls[1].key,a.resourceCalls[0].key);assert.equal(a.resourceCalls[1].current.version,7);await a.click({action:'resource-editor-cancel'});assert.equal(a.read('resourceDraft??null'),null);assert.equal(a.read("sharedSchedulingResources.find(row=>row.id==='colour-teacher').representativeColor"),'#405060');assert.equal(remote.resources[0].representativeColor,'#405060');assert.equal(a.resourceCalls.length,2);
});

async function teacherColourApp({series,slot,resources,user=sharedTestUser}={}){
 const A=schedulingResource('colour-A','teacher','Artist A',{representativeColor:'#aabbcc'}),B=schedulingResource('colour-B','teacher','Artist B',{representativeColor:'#ddeeff'}),room=schedulingResource('colour-room','room','Colour studio'),resourceRemote={resources:resources||[A,B,room],revision:1},schedule=series||sharedScheduleRecord({id:'colour-series',startDate:'2026-10-15',count:2,teacherIds:[A.id],roomIds:[room.id],color:'#112233'}),available=slot||formalAvailableSlot({id:'colour-slot',teacherIds:[A.id],roomIds:[room.id],teacherNames:[A.displayName],roomNames:[room.displayName],teacherColors:['#aabbcc'],sourceVersions:{'course:qa-course':1,'resource:colour-A':1,'resource:colour-room':1}});
 const projectedSlot=()=>({...copy(available),teacherColors:available.teacherIds.map(id=>resourceRemote.resources.find(row=>row.id===id)?.representativeColor??null),sourceVersions:{...available.sourceVersions,...Object.fromEntries(available.teacherIds.map(id=>['resource:'+id,resourceRemote.resources.find(row=>row.id===id)?.version||1]))}});
 const a=await resourceUiApp(resourceRemote,{session:async()=>({user:copy(user)}),schedules:async()=>user.role==='teacher'?teacherScheduleFixture(schedule,{date:'2026-10-15'}):{schedules:[copy(schedule)],revision:'colour-series-v1'},availability:async(range)=>({slots:available.date>=range.from&&available.date<=range.to?[projectedSlot()]:[],revision:'colour-slots-'+resourceRemote.revision}),availableSlot:async()=>({slot:projectedSlot()})},{initialQuerySelectorAll:()=>[]});a.set("tab='overview';timetableView='day';selectTimetableDate('2026-10-15');render()");await a.set('refreshSharedResources({paint:false})');await a.set('refreshSharedAvailability()');return Object.assign(a,{colourSeries:schedule,colourSlot:available});
}
function teacherColourRenderedActivity(html,id,view,available=false){
 const key=available?'data-slot-id':'data-open-lesson',pattern=new RegExp(`<button\\b[^>]*${key}="${id}"[^>]*>`);if(view!=='list')return html.match(new RegExp(pattern.source+'[\\s\\S]*?<\\/button>'))?.[0]||'';
 return [...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(match=>match[0]).find(row=>pattern.test(row))||'';
}
async function assertTeacherColourViews(a,colour){
 for(const view of ['day','week','range','month','list']){a.change('',view,{id:'tt-view'});await a.set('refreshSharedSchedules()');await a.set('refreshSharedAvailability()');const html=a.nodes['#app'].innerHTML,property=view==='list'?'--lesson-color':'--tt-lesson-color';for(const[id,available]of [[a.colourSeries.id,false],[a.colourSlot.id,true]])assert.match(teacherColourRenderedActivity(html,id,view,available),new RegExp(property+':'+colour),`${view} must paint the same saved ${available?'available slot':'schedule'} with the effective teacher colour`);}
}

test('teacher representative colour acknowledgements and reads repaint saved schedules and private available slots across all five views without changing their facts',async()=>{
 const a=await teacherColourApp(),scheduleBefore=a.read('db.schedules'),slotBefore=a.read("availabilityRecords.get('colour-slot')"),feesBefore=a.read('sharedFees');await assertTeacherColourViews(a,'#aabbcc');await openResourceManager(a);await a.click({action:'resource-edit',resourceId:'colour-A'});const form=resourceEditorForm(a,{displayName:'Artist A',useRepresentativeColor:'on',representativeColor:'#102030'});await a.submit(form.id,form.values,form);await a.click({action:'resource-close'});
 const unchangedSlotCache=a.read("availabilityRecords.get('colour-slot')");assert.equal(unchangedSlotCache.version,slotBefore.version);assert.deepEqual(a.read('db.schedules'),scheduleBefore,'The colour ACK must not rewrite a schedule record');assert.equal(a.read('db.schedules[0].color'),'#112233');await assertTeacherColourViews(a,'#102030');assert.deepEqual(a.read('sharedFees'),feesBefore);assert.equal(a.read("availabilityRecords.get('colour-slot').version"),slotBefore.version);assert.equal(a.read("availabilityRecords.get('colour-slot').trialReserved"),slotBefore.trialReserved);
 a.change('','day',{id:'tt-view'});await a.set('refreshSharedAvailability()');await a.click({openLesson:a.colourSeries.id,lessonKind:'schedule',lessonDate:'2026-10-15',lessonSequence:'1'});assert.match(a.nodes['#modal-root'].innerHTML,/lesson-color-dot[^>]*background:#102030/);const openedModal=a.read('modal'),dot={style:{background:'#102030'}},lessonMarkers={innerHTML:''};a.nodes['.lesson-color-dot']=dot;a.nodes['.lesson-colour-markers']=lessonMarkers;
 a.resourceRemote.resources=a.resourceRemote.resources.map(row=>row.id==='colour-A'?{...row,version:row.version+1,representativeColor:'#405060'}:row);a.resourceRemote.revision++;await a.set('refreshSharedResources()');assert.equal(dot.style.background,'#405060','A readonly lesson already open must adopt the changed teacher colour');assert.match(lessonMarkers.innerHTML,/#405060/);assert.equal(a.read('modal'),openedModal,'Updating a colour must not rebuild the open lesson dialog');await a.click({action:'lesson-close'});await assertTeacherColourViews(a,'#405060');assert.deepEqual(a.read('db.schedules'),scheduleBefore);assert.equal(a.read("availabilityRecords.get('colour-slot').version"),slotBefore.version);
 await a.click({action:'availability-open',slotId:a.colourSlot.id});assert.match(a.nodes['#modal-root'].innerHTML,/--tt-lesson-color:#405060/);const properties={},dialog={style:{setProperty:(name,value)=>properties[name]=value}},slotMarkers={innerHTML:''};a.nodes['.availability-detail-dialog']=dialog;a.nodes['.availability-detail-colour-markers']=slotMarkers;a.resourceRemote.resources=a.resourceRemote.resources.map(row=>row.id==='colour-A'?{...row,version:row.version+1,representativeColor:'#607080'}:row);a.resourceRemote.revision++;await a.set('refreshSharedResources()');assert.equal(properties['--tt-lesson-color'],'#607080');assert.match(slotMarkers.innerHTML,/#607080/);assert.equal(a.read("availabilityRecords.get('colour-slot').version"),slotBefore.version);await a.click({action:'availability-close'});
 const newerProjection={...a.colourSlot,teacherNames:['Projected artist name v8'],teacherColors:['#90a0b0'],sourceVersions:{...a.colourSlot.sourceVersions,'resource:colour-A':8}};a.client.availableSlot=async()=>({slot:copy(newerProjection)});await a.click({action:'availability-open',slotId:a.colourSlot.id});assert.match(a.nodes['#modal-root'].innerHTML,/--tt-lesson-color:#90a0b0/,'An older resource cache must not overwrite the colour in a newer authoritative Slot projection');assert.match(a.nodes['#modal-root'].innerHTML,/Projected artist name v8/);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/Artist A/,'The same source version fence must keep the newer teacher name paired with its colour');assert.equal(a.read("availabilityRecords.get('colour-slot').version"),slotBefore.version);await a.click({action:'availability-close'});
});

test('teacher colour uses the actual single-occurrence assignment but never infers a primary teacher from multiple ids, order or legacy text',async()=>{
 const original=sharedScheduleRecord({id:'colour-series',startDate:'2026-10-08',teacherIds:['colour-A'],color:'#112233',exceptions:[{sequence:2,overrides:{teacherIds:['colour-B'],teacher:'Artist B'}}]}),a=await teacherColourApp({series:original});let card=teacherColourRenderedActivity(a.nodes['#app'].innerHTML,original.id,'day');assert.match(card,/--tt-lesson-color:#ddeeff/,'The 15 Oct occurrence belongs to B even though the original series belongs to A');assert.doesNotMatch(card,/--tt-lesson-color:#aabbcc/);assert.deepEqual(a.read('db.schedules[0].teacherIds'),['colour-A']);
 const multi={...original,version:2,teacherIds:['colour-A','colour-B'],teacher:'Artist A, Artist B',exceptions:[]};a.client.schedules=async()=>({schedules:[copy(multi)],revision:'multi-colour-assignment'});await a.set('refreshSharedSchedules()');card=teacherColourRenderedActivity(a.nodes['#app'].innerHTML,original.id,'day');assert.match(card,/--tt-lesson-color:#112233/,'Multiple teachers must keep the saved schedule base colour while primary policy is undecided');assert.match(card,/#aabbcc/);assert.match(card,/#ddeeff/);assert.match(card,/Artist A/);assert.match(card,/Artist B/);
 const A=a.resourceRemote.resources.find(row=>row.id==='colour-A'),B=a.resourceRemote.resources.find(row=>row.id==='colour-B');a.resourceRemote.resources=[B,A];a.resourceRemote.revision++;await a.set('refreshSharedResources()');const reversed={...multi,version:3,teacherIds:['colour-B','colour-A']};a.client.schedules=async()=>({schedules:[copy(reversed)],revision:'reordered-colour-assignment'});await a.set('refreshSharedSchedules()');card=teacherColourRenderedActivity(a.nodes['#app'].innerHTML,original.id,'day');assert.match(card,/--tt-lesson-color:#112233/);assert.doesNotMatch(card,/--tt-lesson-color:#(?:aabbcc|ddeeff)/);
 const legacy={...original,version:4,color:'#445566',teacher:'Artist A',exceptions:[]};delete legacy.teacherIds;a.client.schedules=async()=>({schedules:[copy(legacy)],revision:'unmatched-colour-legacy'});await a.set('refreshSharedSchedules()');card=teacherColourRenderedActivity(a.nodes['#app'].innerHTML,original.id,'day');assert.match(card,/--tt-lesson-color:#445566/,'A same-name legacy label must not become a formal teacher colour assignment');assert.doesNotMatch(card,/--tt-lesson-color:#aabbcc/);assert.equal(a.read('db.schedules[0].teacherIds??null'),null);
});

test('teacher representative colour remains readonly for a scoped teacher and an old administrator colour receipt cannot overwrite a new identity draft',async()=>{
 const A=schedulingResource('colour-A','teacher','Artist A',{representativeColor:'#aabbcc'}),teacher=await teacherColourApp({resources:[A],user:{id:'colour-reader',displayName:'Artist A',role:'teacher',accessRevision:'own-A'}});await assertTeacherColourViews(teacher,'#aabbcc');await openResourceManager(teacher);assert.match(teacher.nodes['#modal-root'].innerHTML,/Read only/);await teacher.click({action:'resource-edit',resourceId:A.id});assert.equal(teacher.read('resourceDraft??null'),null);await teacher.submit('scheduling-resource-editor',{displayName:'Forged teacher colour',useRepresentativeColor:'on',representativeColor:'#ff0000'});assert.equal(teacher.resourceCalls.length,0);assert.equal(teacher.read("sharedSchedulingResources.find(row=>row.id==='colour-A').representativeColor"),'#aabbcc');await teacher.click({action:'resource-close'});
 const a=await teacherColourApp(),oldAck=deferred(),newAck=deferred();await openResourceManager(a);await a.click({action:'resource-edit',resourceId:A.id});const oldForm=resourceEditorForm(a,{displayName:'Artist A',useRepresentativeColor:'on',representativeColor:'#ff0000'});let dispatched=0;a.client.saveSchedulingResource=async()=>{dispatched++;return dispatched===1?oldAck.promise:newAck.promise};const oldSave=a.submit(oldForm.id,oldForm.values,oldForm);await until(()=>dispatched===1,'The old administrator colour write must actually be pending');switchSharedIdentity(a);oldForm.isConnected=false;const current=schedulingResource('colour-next','teacher','Next identity artist',{representativeColor:'#789abc'});a.client.schedulingResources=async()=>({resources:[copy(current)],revision:'next-colour-scope'});await openResourceManager(a);await a.click({action:'resource-edit',resourceId:current.id});const newForm=resourceEditorForm(a,{displayName:current.displayName,useRepresentativeColor:'on',representativeColor:'#010203'}),newSave=a.submit(newForm.id,newForm.values,newForm);await until(()=>dispatched===2,'The new identity must have its own in-flight colour draft');oldAck.resolve({resource:{...A,representativeColor:'#ff0000',version:2}});await oldSave;assert.equal(a.read('resourceSaving'),true);assert.equal(a.read('resourceDraft.current.id'),current.id);assert.equal(a.read("sharedSchedulingResources.some(row=>row.id==='colour-A')"),false);assert.equal(newForm.values.representativeColor,'#010203');newAck.reject(serviceError(503,'SERVICE_UNAVAILABLE'));await newSave;assert.equal(a.read('resourceSaving'),false);assert.equal(newForm.values.representativeColor,'#010203');await a.click({action:'resource-editor-cancel'});
});

test('available-slot configuration ACK keeps its newer own version while merging newer teacher source tuples by UUID during a failed list refresh',async()=>{
 for(const assignment of ['single','reordered','new-teacher']){
  const oldNames={A:'Old artist A',B:'Old artist B',C:'Artist C'},oldColours={A:'#112233',B:'#445566',C:'#778899'},newNames={A:'Current artist A',B:'Current artist B'},newColours={A:'#abcdef',B:'#fedcba'},openedIds=assignment==='single'?['A']:['A','B'],ackIds=assignment==='single'?['A']:assignment==='reordered'?['B','A']:['C','B'],oldSlot=formalAvailableSlot({teacherIds:openedIds,teacherNames:openedIds.map(id=>oldNames[id]),teacherColors:openedIds.map(id=>oldColours[id]),roomIds:[],roomNames:[],sourceVersions:{'course:qa-course':1,...Object.fromEntries(openedIds.map(id=>['resource:'+id,1]))}}),resources=Object.keys(oldNames).map(id=>schedulingResource(id,'teacher',oldNames[id],{representativeColor:oldColours[id]})),a=await availabilityUiApp({slots:[oldSlot]},{schedulingResources:async()=>({resources:copy(resources),revision:'old-teacher-source'})}),gate=deferred();await openAvailabilityTimetable(a);await a.click({action:'availability-open',slotId:oldSlot.id});await a.click({action:'availability-edit',slotId:oldSlot.id});const form=availabilityForm(a,availableSlotValues({time:'13:45',totalCapacity:'10',trialCapacity:'3',reschedulingCapacity:'2',reschedulingEnabled:'on',teacherIds:ackIds,roomIds:[]}));let sent;a.client.saveAvailableSlot=async(profile,current,key)=>{sent={profile:copy(profile),current:copy(current),key};return gate.promise};const saving=a.submit(form.id,form.values,form);await until(()=>!!sent,'The configuration write must be pending before a source-only update');const newerSource={...oldSlot,teacherNames:openedIds.map(id=>newNames[id]),teacherColors:openedIds.map(id=>newColours[id]),sourceVersions:{'course:qa-course':1,...Object.fromEntries(openedIds.map(id=>['resource:'+id,2]))}};a.availabilityRemote.slots=[newerSource];a.availabilityRemote.revision++;await a.set('refreshSharedAvailability({paint:false})');assert.equal(a.read("availabilityRecords.get('qa-available-slot').version"),1);assert.equal(a.read("availabilityRecords.get('qa-available-slot').teacherColors[0]"),newColours[openedIds[0]]);a.client.availability=async()=>{throw serviceError(503,'SERVICE_UNAVAILABLE')};const receipt={...oldSlot,...sent.profile,id:oldSlot.id,version:2,teacherNames:ackIds.map(id=>oldNames[id]),teacherColors:ackIds.map(id=>oldColours[id]),sourceVersions:{'course:qa-course':1,...Object.fromEntries(ackIds.map(id=>['resource:'+id,1]))}};gate.resolve({slot:receipt});await saving;await until(()=>a.read('availabilityCache.ready&&!!availabilityCache.error'),'The accepted save must survive its subsequent list failure');const saved=a.read("availabilityRecords.get('qa-available-slot')");assert.equal(sent.current.version,1);assert.ok(sent.key);assert.equal(saved.id,oldSlot.id);assert.equal(saved.version,2,'Do not discard the newer successful configuration acknowledgement');assert.equal(saved.time,'13:45');assert.deepEqual([saved.totalCapacity,saved.trialCapacity,saved.reschedulingCapacity],[10,3,2]);assert.deepEqual(saved.teacherIds,ackIds);assert.deepEqual(saved.teacherNames,ackIds.map(id=>newNames[id]??oldNames[id]),'Preserve a newer teacher name only for the same UUID');assert.deepEqual(saved.teacherColors,ackIds.map(id=>newColours[id]??oldColours[id]),'Names and colours must stay aligned after reorder or a new assignment');for(const id of ackIds)assert.equal(saved.sourceVersions['resource:'+id],Object.hasOwn(newNames,id)?2:1);if(assignment==='new-teacher')assert.equal(Object.hasOwn(saved.sourceVersions,'resource:A'),false,'A newly assigned C must not borrow the previous A tuple');assert.equal(a.read('availabilityAcknowledgement.version'),2);assert.equal(a.read('availabilityOverlay'),null);assert.match(a.nodes['#app'].innerHTML,/role="alert"/);assert.match(a.nodes['#app'].innerHTML,/data-slot-id="qa-available-slot"/);
 }
 for(const linked of [true,false]){
  const source=sharedScheduleRecord({id:'source-series',startDate:'2026-10-15',count:1,time:'23:15',duration:30,teacherIds:['A'],roomIds:['R-A']}),refs=linked?{sourceKind:'linked',scheduleId:source.id,sequence:1}: {sourceKind:'standalone',scheduleId:null,sequence:null},oldSlot=formalAvailableSlot({...refs,time:'23:15',duration:30,teacherIds:['A'],teacherNames:['Artist A v1'],teacherColors:['#112233'],roomIds:['R-A'],roomNames:['Room A'],classCapacity:linked?8:null,sourceVersions:{'course:qa-course':1,'resource:A':1,'resource:R-A':1,...(linked?{'schedule:source-series':1}:{})}}),resources=[schedulingResource('A','teacher','Artist A v1',{representativeColor:'#112233'}),schedulingResource('B','teacher','Artist B',{representativeColor:'#445566'}),schedulingResource('R-A','room','Room A'),schedulingResource('R-B','room','Room B')],a=await availabilityUiApp({slots:[oldSlot]},{schedulingResources:async()=>({resources:copy(resources),revision:'source-resources'}),schedules:async()=>({schedules:[copy(source)],revision:'source-series-1'})}),gate=deferred();await openAvailabilityTimetable(a);a.change('','week',{id:'tt-view'});await a.set('refreshSharedAvailability()');await a.click({action:'availability-open',slotId:oldSlot.id});await a.click({action:'availability-edit',slotId:oldSlot.id});const form=availabilityForm(a,availableSlotValues({mode:linked?'linked':'standalone',occurrenceKey:'source-series:1',date:'2026-10-16',time:'13:00',duration:'45',teacherIds:['B'],roomIds:['R-B'],totalCapacity:'10',trialCapacity:'3',reschedulingCapacity:'2',reschedulingEnabled:'on'}));let sent;a.client.saveAvailableSlot=async(profile,current,key)=>{sent={profile:copy(profile),current:copy(current),key};return gate.promise};const saving=a.submit(form.id,form.values,form);await until(()=>!!sent,'The source test must have an actual configuration write in flight');const newerSource=linked?{...oldSlot,date:'2026-10-16',time:'13:00',duration:45,teacherIds:['B'],teacherNames:['Artist B'],teacherColors:['#445566'],roomIds:['R-B'],roomNames:['Room B'],classCapacity:9,sourceVersions:{'course:qa-course':1,'schedule:source-series':2,'resource:B':1,'resource:R-B':1}}:{...oldSlot,teacherNames:['Artist A v2'],teacherColors:['#abcdef'],sourceVersions:{...oldSlot.sourceVersions,'resource:A':2}};a.availabilityRemote.slots=[newerSource];a.availabilityRemote.revision++;await a.set('refreshSharedAvailability({paint:false})');assert.equal(a.read("availabilityRecords.get('qa-available-slot').date"),newerSource.date,'The newer moved source must actually arrive in this seven-day query before ACK');a.client.availability=async()=>{throw serviceError(503,'SERVICE_UNAVAILABLE')};const receipt={...oldSlot,...sent.profile,version:2,...(!linked?{teacherNames:['Artist B'],teacherColors:['#445566'],roomNames:['Room B'],sourceVersions:{'course:qa-course':1,'resource:B':1,'resource:R-B':1}}:{})};gate.resolve({slot:receipt});await saving;await until(()=>a.read('availabilityCache.ready&&!!availabilityCache.error'),'The linked or standalone saved ACK must survive a read failure');const saved=a.read("availabilityRecords.get('qa-available-slot')");assert.equal(saved.id,oldSlot.id);assert.equal(saved.version,2);assert.deepEqual([saved.totalCapacity,saved.trialCapacity,saved.reschedulingCapacity],[10,3,2]);assert.equal(saved.date,'2026-10-16',linked?'The unchanged linked reference must use the newer real lesson date':'An explicit standalone source change must use the new acknowledged date');assert.equal(saved.time,'13:00');assert.equal(saved.duration,45);assert.deepEqual(saved.teacherIds,['B']);assert.deepEqual(saved.teacherNames,['Artist B']);assert.deepEqual(saved.teacherColors,['#445566']);assert.deepEqual(saved.roomIds,['R-B']);assert.deepEqual(saved.roomNames,['Room B']);assert.equal(saved.classCapacity,linked?9:null);assert.equal(saved.scheduleId,linked?source.id:null);if(linked)assert.equal(saved.sourceVersions['schedule:source-series'],2);assert.equal(a.read('availabilityOverlay'),null);
 }
});

const manualClassStatus=(series,sequence=1,fields={})=>{
 const occurrence=scheduleOccurrence(series,sequence);assert.ok(occurrence,'The fixture must refer to a real formal occurrence');
 return {scheduleId:series.id,sequence,courseId:series.course,date:occurrence.date,time:occurrence.item.time,duration:occurrence.item.duration,classCapacity:occurrence.item.capacity,classOccupied:null,automaticStatus:null,manualStatus:null,effectiveStatus:null,statusSource:'unknown',version:0,sourceVersion:series.version,createdAt:null,updatedAt:null,...fields};
};
async function classCapacityUiApp(remote={},overrides={}){
 remote.series??=sharedScheduleRecord({id:'capacity-series',startDate:'2026-10-15',count:2,teacherIds:['capacity-A'],roomIds:['capacity-room'],color:'#112233'});remote.statuses??=[];remote.revision??=1;remote.user??=copy(sharedTestUser);
 const reads=[],writes=[],windowEvents={},A=schedulingResource('capacity-A','teacher','Artist A',{representativeColor:'#426ea8'}),B=schedulingResource('capacity-B','teacher','Artist B',{representativeColor:'#b9772f'}),room=schedulingResource('capacity-room','room','Studio room'),resources=[A,B,room],statusFor=sequence=>copy(remote.statuses.find(row=>row.scheduleId===remote.series.id&&row.sequence===sequence)||manualClassStatus(remote.series,sequence)),linkedSequence=remote.linkedSequence||1,occurrence=scheduleOccurrence(remote.series,linkedSequence),slot=formalAvailableSlot({id:'capacity-linked-slot',sourceKind:'linked',scheduleId:remote.series.id,sequence:linkedSequence,date:occurrence.date,time:occurrence.item.time,duration:occurrence.item.duration,teacherIds:occurrence.item.teacherIds||[],teacherNames:(occurrence.item.teacherIds||[]).map(id=>resources.find(row=>row.id===id)?.displayName||''),teacherColors:(occurrence.item.teacherIds||[]).map(id=>resources.find(row=>row.id===id)?.representativeColor??null),roomIds:occurrence.item.roomIds||[],roomNames:(occurrence.item.roomIds||[]).map(id=>resources.find(row=>row.id===id)?.displayName||''),classCapacity:occurrence.item.capacity,sourceVersions:{'course:qa-course':1,['schedule:'+remote.series.id]:remote.series.version,'resource:capacity-A':1,'resource:capacity-B':1,'resource:capacity-room':1}});
 const projectedSlot=()=>({...copy(slot),classCapacityStatus:statusFor(linkedSequence),sourceVersions:{...slot.sourceVersions,['class-status:'+remote.series.id+':'+linkedSequence]:statusFor(linkedSequence).version}});
 const a=await availabilityUiApp({slots:[projectedSlot()]},{
  session:async()=>({user:copy(remote.user)}),schedulingResources:async()=>({resources:[A,B,room],revision:'capacity-resources'}),
  schedules:async()=>remote.user.role==='teacher'?teacherScheduleFixture(remote.series,{date:'2026-10-15'}):{schedules:[copy(remote.series)],revision:'capacity-schedule-'+remote.series.version},
  availability:async(range)=>({slots:slot.date>=range.from&&slot.date<=range.to?[projectedSlot()]:[],revision:'capacity-slots-'+remote.revision}),availableSlot:async()=>({slot:projectedSlot()}),
  async classCapacityStatuses(since='',query={}){reads.push({operation:'list',since,query:copy(query)});const revision='capacity-status-'+remote.revision;return since===revision?{unchanged:true,revision}:{statuses:copy(remote.statuses.filter(row=>row.date>=query.from&&row.date<=query.to&&(!query.courseId||row.courseId===query.courseId))),revision}},
  async classCapacityStatus(scheduleId,sequence){reads.push({operation:'detail',scheduleId,sequence});assert.equal(scheduleId,remote.series.id);return {status:statusFor(sequence)}},
  async saveClassCapacityStatus(current,manualStatus,key){writes.push({current:copy(current),manualStatus,key});const previous=statusFor(current.sequence);if(current.version!==previous.version||current.sourceVersion!==remote.series.version)throw serviceError(409,'VERSION_CONFLICT');const saved={...previous,manualStatus,effectiveStatus:manualStatus,statusSource:manualStatus?'manual':'unknown',version:previous.version+1,sourceVersion:remote.series.version,createdAt:previous.createdAt||'2026-10-15T00:00:00Z',updatedAt:'2026-10-15T01:00:00Z'};remote.statuses=remote.statuses.filter(row=>row.sequence!==saved.sequence).concat(saved);remote.revision++;return {status:copy(saved)}},
  ...overrides,
 },{initialQuerySelectorAll:()=>[],onWindowEvent:(type,handler)=>(windowEvents[type]??=[]).push(handler)});
 // A full browser render replaces its nested modal root. This fixture mirrors
 // that standard DOM behaviour without changing the older shared harness.
 const appNode=a.nodes['#app'],modalRoot=a.ctx.document.querySelector('#modal-root');let mainMarkup=appNode.innerHTML;Object.defineProperty(appNode,'innerHTML',{configurable:true,get:()=>mainMarkup,set:value=>{mainMarkup=value;modalRoot.innerHTML=value.match(/<div id="modal-root">([\s\S]*)<\/div>$/)?.[1]||''}});
 a.set("tab='overview';location.pathname='/account';timetableView='day';selectTimetableDate('2026-10-15');render()");await a.set('refreshSharedSchedules({paint:false})');await a.set('refreshSharedResources({paint:false})');await a.set('refreshSharedAvailability()');return Object.assign(a,{capacityRemote:remote,capacityReads:reads,capacityWrites:writes,capacitySlot:slot,windowEvents});
}
async function openClassCapacityEditor(a,sequence=1){
 const occurrence=scheduleOccurrence(a.capacityRemote.series,sequence);await a.click({openLesson:a.capacityRemote.series.id,lessonKind:'schedule',lessonDate:occurrence.date,lessonSequence:String(sequence)});
 assert.match(a.nodes['#modal-root'].innerHTML,/data-action="class-status-open"/,'An admin must enter the dedicated class status editor from the selected formal lesson');
 await a.click({action:'class-status-open'});assert.match(a.nodes['#modal-root'].innerHTML,/id="class-capacity-status-editor"/,'The public action must open a real form for this occurrence');
}
function classCapacityForm(a,manualStatus){
 const markup=a.nodes['#modal-root'].innerHTML,tag=markup.match(/<form\b[^>]*id="class-capacity-status-editor"[^>]*>/)?.[0];assert.ok(tag,'Create DOM nodes only after the actual public editor markup exists');
 const mounted=()=>a.nodes['#modal-root'].innerHTML.includes('id="class-capacity-status-editor"'),attributes={},controls=[],dialog={contains:node=>node===dialog||controls.includes(node),focus(){a.ctx.document.activeElement=this}},form={id:'class-capacity-status-editor',dataset:markupDataset(tag),values:{manualStatus},get isConnected(){return mounted()},setAttribute:(name,value)=>attributes[name]=String(value),removeAttribute:name=>delete attributes[name],closest:()=>dialog};
 const radios=[...markup.matchAll(/<input\b[^>]*name="manualStatus"[^>]*>/g)].map(match=>({name:'manualStatus',value:match[0].match(/value="([^"]*)"/)?.[1]??'',checked:(match[0].match(/value="([^"]*)"/)?.[1]??'')===manualStatus,disabled:/\bdisabled\b/.test(match[0]),matches:selector=>selector.includes('input'),get isConnected(){return mounted()},closest:()=>form,focus(){a.ctx.document.activeElement=this}}));assert.equal(radios.length,3,'The real editor must offer Full, Available and explicit clear');
 const submit={disabled:false,textContent:'Save',focus(){a.ctx.document.activeElement=this}},cancel={disabled:false,dataset:{action:'class-status-cancel'},focus(){a.ctx.document.activeElement=this}},error={textContent:'',get isConnected(){return mounted()}};controls.push(...radios,cancel,submit);form.controls=controls;form.radios=radios;form.submitButton=submit;form.querySelector=selector=>selector.includes('submit')?submit:radios.find(row=>row.checked)||null;form.querySelectorAll=selector=>selector==='[name=manualStatus]'?radios:controls;dialog.querySelectorAll=selector=>selector.includes(':not(:disabled)')?controls.filter(row=>!row.disabled):controls;
 const original=a.ctx.document.querySelector,originalAll=a.ctx.document.querySelectorAll,nodes={'#class-capacity-status-editor':form,'#class-capacity-status-save':submit,'#class-capacity-status-error':error,'.class-status-editor-dialog':dialog};a.ctx.document.querySelector=selector=>Object.hasOwn(nodes,selector)?mounted()?nodes[selector]:null:original(selector);a.ctx.document.querySelectorAll=selector=>selector.includes('class-status-editor-dialog')?mounted()?dialog.querySelectorAll(selector):[]:originalAll?.(selector)||[];Object.assign(a.nodes,nodes);return form;
}
function classStatusRenderedOccurrence(html,scheduleId,date,view){
 const tags=view==='list'?[...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)]:[...html.matchAll(/<button\b[^>]*data-open-lesson="[^"]+"[^>]*>[\s\S]*?<\/button>/g)];return tags.map(match=>match[0]).find(row=>row.includes(`data-open-lesson="${scheduleId}"`)&&row.includes(`data-lesson-date="${date}"`))||'';
}

test('manual formal class status opens a fresh unknown occurrence without reporting an empty roster as Available',async()=>{
 const a=await classCapacityUiApp(),before=a.read('({schedules:db.schedules,fees:sharedFees})');await openClassCapacityEditor(a);
 assert.ok(a.capacityReads.some(read=>read.operation==='detail'&&read.scheduleId==='capacity-series'&&read.sequence===1),'Opening must fetch the current status of the immutable selected occurrence');const html=a.nodes['#modal-root'].innerHTML;assert.match(html,/Shared studio/);assert.match(html,/2026-10-15/);assert.match(html,/10:00/);assert.match(html,/Unknown|unknown/);assert.doesNotMatch(html,/data-class-status="available"/,'No real occupancy data must not mean Available');assert.equal(a.capacityWrites.length,0);await a.click({action:'class-status-cancel'});assert.deepEqual(a.read('({schedules:db.schedules,fees:sharedFees})'),before);assert.equal(a.capacityWrites.length,0);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/id="class-capacity-status-editor"/);assert.match(a.nodes['#modal-root'].innerHTML,/lesson-dialog/,'Cancel must return to the valid selected lesson');
});

test('manual formal class status saves Full immediately on the same occurrence despite a later read failure and reopens Available then clear without changing schedule or quota',async()=>{
 const a=await classCapacityUiApp(),before=a.read('({schedules:db.schedules,fees:sharedFees})'),slotBefore=a.read("availabilityRecords.get('capacity-linked-slot')");await openClassCapacityEditor(a);let form=classCapacityForm(a,'full');a.client.classCapacityStatuses=async()=>{throw serviceError(503,'SERVICE_UNAVAILABLE')};await a.submit(form.id,form.values,form);
 assert.equal(a.capacityWrites.length,1);assert.equal(a.capacityWrites[0].current.version,0);assert.equal(a.capacityWrites[0].current.sourceVersion,1);assert.deepEqual([a.capacityWrites[0].current.scheduleId,a.capacityWrites[0].current.sequence],['capacity-series',1]);assert.ok(a.capacityWrites[0].key);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/id="class-capacity-status-editor"/);assert.match(a.nodes['#modal-root'].innerHTML,/data-class-status="full"/,'A successful save must be visible without requiring a successful subsequent list read');assert.equal(a.read("classStatuses.get(JSON.stringify(['capacity-series',1])).version"),1);assert.deepEqual(a.read('({schedules:db.schedules,fees:sharedFees})'),before);
 await a.click({action:'lesson-close'});a.set('render()');assert.match(teacherColourRenderedActivity(a.nodes['#app'].innerHTML,'capacity-series','day'),/data-class-status="full"/);assert.equal(a.capacityWrites.length,1,'A read failure must not retry the already accepted write');const slotAfter=a.read("availabilityRecords.get('capacity-linked-slot')");for(const key of ['id','version','totalCapacity','trialCapacity','reschedulingCapacity','trialReserved','reschedulingReserved','time','teacherIds'])assert.deepEqual(slotAfter[key],slotBefore[key],key+' must not be rewritten by a class status save');
 await until(()=>!!a.read('classStatusError')&&a.read('classStatusReadPromise')===null,'The first failed status refresh must complete before its identical repeat');const countPaints=observeAppWrites(a);await a.set('refreshClassCapacityStatuses()');assert.equal(countPaints(),0,'A repeated identical 503 must retain the saved Full marker without replacing the timetable DOM or its controls');assert.equal(a.capacityWrites.length,1);
 await openClassCapacityEditor(a);form=classCapacityForm(a,'available');await a.submit(form.id,form.values,form);assert.equal(a.capacityWrites[1].current.version,1);assert.equal(a.capacityWrites[1].manualStatus,'available');assert.match(a.nodes['#modal-root'].innerHTML,/data-class-status="available"/);
 await a.click({action:'lesson-close'});await openClassCapacityEditor(a);form=classCapacityForm(a,'');await a.submit(form.id,form.values,form);assert.equal(a.capacityWrites[2].current.version,2);assert.equal(a.capacityWrites[2].manualStatus,null);assert.equal(a.capacityRemote.statuses[0].version,3);assert.equal(a.capacityRemote.statuses[0].classOccupied,null);assert.equal(a.capacityRemote.statuses[0].effectiveStatus,null);assert.match(a.nodes['#modal-root'].innerHTML,/data-class-status="unknown"/);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/data-class-status="available"/);assert.deepEqual(a.read('({schedules:db.schedules,fees:sharedFees})'),before);
});

test('manual formal class status conflict preserves the selected draft opened version and retry key while Cancel Escape and Back never write another status',async()=>{
 const remote={series:sharedScheduleRecord({id:'capacity-series',startDate:'2026-10-15',count:2}),statuses:[]},a=await classCapacityUiApp(remote);remote.statuses=[manualClassStatus(remote.series,1,{version:4,manualStatus:'available',effectiveStatus:'available',statusSource:'manual'})];remote.revision++;await openClassCapacityEditor(a);const form=classCapacityForm(a,'full');remote.statuses=[{...remote.statuses[0],version:5}];remote.revision++;await a.set('refreshClassCapacityStatuses({paint:false})');await a.submit(form.id,form.values,form);assert.equal(a.capacityWrites[0].current.version,4);assert.equal(a.capacityWrites[0].manualStatus,'full');assert.equal(form.values.manualStatus,'full');assert.match(a.nodes['#class-capacity-status-error'].textContent,/changed|latest|updated|reload/i);assert.ok(a.read('classStatusEditorDraft'));await a.submit(form.id,form.values,form);assert.equal(a.capacityWrites[1].current.version,4);assert.equal(a.capacityWrites[1].key,a.capacityWrites[0].key);assert.equal(remote.statuses[0].manualStatus,'available');
 const writes=a.capacityWrites.length;await a.click({action:'class-status-cancel'});assert.equal(a.read('classStatusEditorDraft'),null);assert.match(a.nodes['#modal-root'].innerHTML,/lesson-dialog/);await a.click({action:'lesson-close'});await openClassCapacityEditor(a);classCapacityForm(a,'full');a.keydown('Escape');assert.equal(a.read('classStatusEditorDraft'),null);assert.match(a.nodes['#modal-root'].innerHTML,/lesson-dialog/);await a.click({action:'lesson-close'});await openClassCapacityEditor(a);classCapacityForm(a,'full');a.ctx.location.pathname='/classes';for(const handler of a.windowEvents?.popstate||[])handler({});if(!a.windowEvents?.popstate?.length)throw new Error('The shared harness must expose the real browser Back handler');assert.equal(a.read('classStatusEditorDraft'),null);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/class-capacity-status-editor/);assert.equal(a.capacityWrites.length,writes);assert.equal(remote.statuses[0].manualStatus,'available');
});

test('manual formal class status marks only its fixed occurrence in five views and linked detail while preserving effective teacher colours and unknown standalone status',async()=>{
 const series=sharedScheduleRecord({id:'capacity-series',startDate:'2026-10-08',count:3,teacherIds:['capacity-A'],roomIds:['capacity-room'],color:'#112233',exceptions:[{sequence:2,overrides:{teacherIds:['capacity-B'],teacher:'Artist B'}}]}),full=manualClassStatus(series,2,{version:1,manualStatus:'full',effectiveStatus:'full',statusSource:'manual'}),a=await classCapacityUiApp({series,statuses:[full],linkedSequence:2});
 for(const view of ['day','week','range','month','list']){a.change('',view,{id:'tt-view'});await a.set('refreshClassCapacityStatuses()');const rendered=classStatusRenderedOccurrence(a.nodes['#app'].innerHTML,series.id,'2026-10-15',view),property=view==='list'?'--lesson-color':'--tt-lesson-color';assert.match(rendered,/data-class-status="full"/,view+' must show the selected occurrence Full marker');assert.match(rendered,new RegExp(property+':#b9772f'),view+' must retain the actual single-occurrence teacher B colour');assert.doesNotMatch(rendered,/data-class-status="available"/);const linked=teacherColourRenderedActivity(a.nodes['#app'].innerHTML,a.capacitySlot.id,view,true);assert.match(linked,/data-class-status="full"/,view+' linked card must project that same occurrence status');assert.match(linked,new RegExp(property+':#b9772f'));}
 a.change('','day',{id:'tt-view'});await a.set('refreshClassCapacityStatuses()');await a.click({openLesson:series.id,lessonKind:'schedule',lessonDate:'2026-10-15',lessonSequence:'2'});assert.match(a.nodes['#modal-root'].innerHTML,/data-class-status="full"/);assert.match(a.nodes['#modal-root'].innerHTML,/lesson-color-dot[^>]*background:#b9772f/);await a.click({action:'lesson-close'});
 await a.click({action:'availability-open',slotId:a.capacitySlot.id});assert.match(a.nodes['#modal-root'].innerHTML,/data-class-status="full"/);assert.match(a.nodes['#modal-root'].innerHTML,/--tt-lesson-color:#b9772f/);await a.click({action:'availability-close'});a.set("selectTimetableDate('2026-10-22');render()");await a.set('refreshClassCapacityStatuses()');assert.doesNotMatch(teacherColourRenderedActivity(a.nodes['#app'].innerHTML,series.id,'day'),/data-class-status="(?:full|available)"/,'The same weekday in another immutable sequence must stay unknown');assert.equal(a.read('db.schedules[0].color'),'#112233');assert.deepEqual(a.read('db.schedules[0].teacherIds'),['capacity-A']);
 const multi={...series,version:2,teacherIds:['capacity-A','capacity-B'],teacher:'Artist A, Artist B',exceptions:[]};a.capacityRemote.series=multi;a.capacityRemote.statuses=[{...full,sourceVersion:2}];a.capacityRemote.revision++;a.set("selectTimetableDate('2026-10-15');render()");await a.set('refreshSharedSchedules()');await a.set('refreshClassCapacityStatuses()');let card=classStatusRenderedOccurrence(a.nodes['#app'].innerHTML,series.id,'2026-10-15','day');assert.match(card,/data-class-status="full"/);assert.match(card,/--tt-lesson-color:#112233/,'The Full point must not choose a primary teacher for a multi-teacher lesson');assert.match(card,/#426ea8/);assert.match(card,/#b9772f/);
 const legacy={...multi,version:3,color:'#445566',teacher:'Artist B'};delete legacy.teacherIds;a.capacityRemote.series=legacy;a.capacityRemote.statuses=[{...full,sourceVersion:3}];a.capacityRemote.revision++;await a.set('refreshSharedSchedules()');await a.set('refreshClassCapacityStatuses()');card=classStatusRenderedOccurrence(a.nodes['#app'].innerHTML,series.id,'2026-10-15','day');assert.match(card,/data-class-status="full"/);assert.match(card,/--tt-lesson-color:#445566/,'A Full point must not bind legacy teacher text to a same-name formal resource');assert.doesNotMatch(card,/--tt-lesson-color:#b9772f/);
 const standalone={...copy(a.capacitySlot),version:2,sourceKind:'standalone',scheduleId:null,sequence:null,classCapacity:null,classOccupied:null};delete standalone.classCapacityStatus;a.client.availableSlot=async()=>({slot:copy(standalone)});await a.click({action:'availability-open',slotId:standalone.id});assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/data-class-status="(?:full|available)"/,'A standalone slot must not borrow the former linked class status by slot ID');assert.equal(a.read("availabilityRecords.get('capacity-linked-slot').scheduleId"),null);await a.click({action:'availability-close'});
});

test('manual formal class status stays readonly for an authorised teacher and old identity failures cannot clear or unlock the next administrator draft',async()=>{
 const series=sharedScheduleRecord({id:'capacity-series',startDate:'2026-10-15',count:2,teacherIds:['capacity-A']}),full=manualClassStatus(series,1,{version:1,manualStatus:'full',effectiveStatus:'full',statusSource:'manual'}),teacher=await classCapacityUiApp({series,statuses:[full],user:{id:'capacity-reader',role:'teacher',displayName:'Artist A',accessRevision:'only-A'}});await teacher.click({openLesson:series.id,lessonKind:'schedule',lessonDate:'2026-10-15',lessonSequence:'1'});assert.match(teacher.nodes['#modal-root'].innerHTML,/data-class-status="full"/);assert.doesNotMatch(teacher.nodes['#modal-root'].innerHTML,/data-action="class-status-open"/);await teacher.click({action:'class-status-open'});await teacher.submit('class-capacity-status-editor',{manualStatus:'available'});assert.equal(teacher.capacityWrites.length,0);assert.equal(teacher.read('classStatusEditorDraft'),null);
 for(const status of [401,403]){
  const a=await classCapacityUiApp(),old=deferred(),next=deferred();await openClassCapacityEditor(a);const oldForm=classCapacityForm(a,'full');let dispatched=0;a.client.saveClassCapacityStatus=async()=>++dispatched===1?old.promise:next.promise;const oldWrite=a.submit(oldForm.id,oldForm.values,oldForm);await until(()=>dispatched===1,'An actual old identity write must be pending');const nextUser={id:'capacity-next-admin',role:'admin',displayName:'Next manager'};a.capacityRemote.user=nextUser;a.ctx.capacityNextIdentity=nextUser;a.set('applySharedUser(capacityNextIdentity);render()');await a.set('refreshSharedCourses()');await a.set('refreshSharedSchedules()');await a.set('refreshSharedResources({paint:false})');await openClassCapacityEditor(a);const nextForm=classCapacityForm(a,'available'),nextWrite=a.submit(nextForm.id,nextForm.values,nextForm);await until(()=>dispatched===2,'The new administrator must own a separate pending draft');old.reject(serviceError(status,status===401?'AUTH_REQUIRED':'FORBIDDEN'));await oldWrite;assert.equal(a.read('authUser.id'),nextUser.id);assert.equal(a.read('classStatusSaving'),true);assert.equal(nextForm.submitButton.disabled,true);assert.equal(nextForm.values.manualStatus,'available');assert.equal(a.read('classStatusEditorDraft.current.scheduleId'),'capacity-series');assert.equal(a.read('location.pathname'),'/account');next.reject(serviceError(503,'SERVICE_UNAVAILABLE'));await nextWrite;assert.equal(a.read('classStatusSaving'),false);assert.equal(nextForm.submitButton.disabled,false);assert.equal(nextForm.values.manualStatus,'available');await a.click({action:'class-status-cancel'});
 }
});

test('manual formal class status keeps the newer same-occurrence status when an older save receipt and linked projection arrive without discarding a newer slot configuration',async()=>{
 const series=sharedScheduleRecord({id:'capacity-series',startDate:'2026-10-15',count:2,teacherIds:['capacity-A'],roomIds:['capacity-room']}),original=manualClassStatus(series,1,{version:1,manualStatus:'full',effectiveStatus:'full',statusSource:'manual'}),remote={series,statuses:[original]},a=await classCapacityUiApp(remote),gate=deferred();await openClassCapacityEditor(a);const form=classCapacityForm(a,'available');let sent;a.client.saveClassCapacityStatus=async(current,manualStatus,key)=>{sent={current:copy(current),manualStatus,key};return gate.promise};const saving=a.submit(form.id,form.values,form);await until(()=>!!sent,'The opened v1 status write must genuinely be pending');remote.statuses=[{...original,version:3,manualStatus:'full',effectiveStatus:'full'}];remote.revision++;await a.set('refreshClassCapacityStatuses({paint:false})');assert.equal(a.read("classStatuses.get(JSON.stringify(['capacity-series',1])).version"),3);a.client.classCapacityStatuses=async()=>{throw serviceError(503,'SERVICE_UNAVAILABLE')};gate.resolve({status:{...original,version:2,manualStatus:'available',effectiveStatus:'available'}});await saving;assert.equal(sent.current.version,1);assert.equal(sent.manualStatus,'available');assert.ok(sent.key);assert.equal(a.read("classStatuses.get(JSON.stringify(['capacity-series',1])).version"),3);assert.match(a.nodes['#modal-root'].innerHTML,/data-class-status="full"/,'A delayed accepted v2 receipt must not downgrade a v3 already read');assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/data-class-status="available"/);await a.click({action:'lesson-close'});
 const staleProjection={...a.capacitySlot,version:2,totalCapacity:10,trialCapacity:3,classCapacityStatus:original,sourceVersions:{...a.capacitySlot.sourceVersions,'class-status:capacity-series:1':1}};a.client.availableSlot=async()=>({slot:copy(staleProjection)});await a.click({action:'availability-open',slotId:a.capacitySlot.id});assert.match(a.nodes['#modal-root'].innerHTML,/data-class-status="full"/);const linked=a.read("availabilityRecords.get('capacity-linked-slot')");assert.equal(linked.version,2,'The newer slot configuration must remain accepted independently');assert.equal(linked.totalCapacity,10);assert.equal(linked.trialCapacity,3);assert.equal(linked.classCapacityStatus.version,3,'The matching linked occurrence must retain the newer class status');assert.equal(linked.sourceVersions['class-status:capacity-series:1'],3);assert.equal(linked.classCapacityStatus.classOccupied,null);assert.equal(a.read('db.schedules[0].version'),series.version);
 const availableV2={...original,version:2,manualStatus:'available',effectiveStatus:'available'},b=await classCapacityUiApp({series,statuses:[availableV2]}),listGate=deferred();await b.set('refreshClassCapacityStatuses()');assert.equal(b.read("classStatuses.get(JSON.stringify(['capacity-series',1])).version"),2);let readStarted=false;b.client.classCapacityStatuses=async()=>{readStarted=true;return listGate.promise};const oldRead=b.set('refreshClassCapacityStatuses({paint:false})');await until(()=>readStarted,'The older status list must genuinely be in flight');const fullV3={...original,version:3},freshLinked={...b.capacitySlot,classCapacityStatus:fullV3,sourceVersions:{...b.capacitySlot.sourceVersions,'class-status:capacity-series:1':3}};b.client.availableSlot=async()=>({slot:copy(freshLinked)});
 try{
  await b.click({action:'availability-open',slotId:freshLinked.id});assert.equal(b.read("availabilityRecords.get('capacity-linked-slot').classCapacityStatus.version"),3);assert.match(b.nodes['#modal-root'].innerHTML,/data-class-status="full"/);assert.equal(b.read("classStatuses.get(JSON.stringify(['capacity-series',1])).version"),3,'A newer authorised linked projection must update the same ordinary occurrence status, not leave two contradictory views');listGate.resolve({statuses:[availableV2],revision:'late-class-list-v2'});await oldRead;await b.click({action:'availability-close'});b.set('render()');assert.equal(b.read("classStatuses.get(JSON.stringify(['capacity-series',1])).version"),3);assert.match(classStatusRenderedOccurrence(b.nodes['#app'].innerHTML,series.id,'2026-10-15','day'),/data-class-status="full"/,'The late older list must not change the ordinary lesson back to Available');assert.equal(b.read("availabilityRecords.get('capacity-linked-slot').classCapacityStatus.version"),3);
 }finally{listGate.resolve({statuses:[availableV2],revision:'late-class-list-v2'});await oldRead.catch(()=>{});}
});

const regularTypeId='00000000-0000-4000-8000-000000000001',specialTypeId='00000000-0000-4000-8000-000000000002';
const formalClassType=(fields={})=>({id:regularTypeId,kind:'regular',name:'Regular Class',studentReschedulingAllowed:null,active:true,version:1,createdAt:'2026-10-15T00:00:00Z',updatedAt:'2026-10-15T00:00:00Z',...fields});
const typeSnapshot=type=>type?Object.fromEntries(['id','kind','name','studentReschedulingAllowed','version'].map(key=>[key,type[key]])):null;
async function classTypeUiApp(remote={},overrides={}){
 remote.types??=[formalClassType(),formalClassType({id:specialTypeId,kind:'special',name:'Special Class'})];remote.typeRevision??=1;remote.rows??=[sharedScheduleRecord({id:'type-series',startDate:'2026-10-15',count:3,classType:null})];remote.courses??=[{...copy(sharedTestCourse),classTypeId:null}];const typeReads=[],typeWrites=[],typeCourseWrites=[],typeScheduleWrites=[],scheduleStore={rows:remote.rows,revision:1};let serial=0;
 const a=await sharedScheduleApp(scheduleStore,{
  async courses(){return {courses:copy(remote.courses)}},
  async updateCourseMetadata(id,fields){typeCourseWrites.push({id,fields:copy(fields)});const previous=remote.courses.find(row=>row.id===id);if(previous?.version!==fields.version)throw serviceError(409,'VERSION_CONFLICT');const {version,classTypeVersion,...metadata}=fields,type=metadata.classTypeId&&remote.types.find(row=>row.id===metadata.classTypeId);if(metadata.classTypeId&&type?.version!==classTypeVersion)throw serviceError(409,'CLASS_TYPE_VERSION_CONFLICT');const course={...previous,...metadata,version:version+1};remote.courses=remote.courses.map(row=>row.id===id?course:row);return {course:copy(course)}},
  async saveSchedule(record,current,key){typeScheduleWrites.push({record:copy(record),current:current?copy(current):null,key});const course=remote.courses.find(row=>row.id===record.course),previous=current&&scheduleStore.rows.find(row=>row.id===current.id);if(!current&&!Object.hasOwn(record,'classTypeId')&&record.classTypeCourseVersion!==course.version)throw serviceError(409,'COURSE_VERSION_CONFLICT');const typeId=Object.hasOwn(record,'classTypeId')?record.classTypeId:current?previous.classType?.id:course.classTypeId,type=remote.types.find(row=>row.id===typeId);if((!current||Object.hasOwn(record,'classTypeId'))&&typeId&&record.classTypeVersion!==type?.version)throw serviceError(409,'CLASS_TYPE_VERSION_CONFLICT');const {classTypeId,classTypeVersion,classTypeCourseVersion,...fields}=record,schedule=sharedScheduleRecord({...fields,id:current?.id||'qa-type-created-series',version:current?current.version+1:1,classType:current&&!Object.hasOwn(record,'classTypeId')?copy(previous.classType):typeSnapshot(type)});scheduleStore.rows=scheduleStore.rows.filter(row=>row.id!==schedule.id).concat(schedule);scheduleStore.revision++;return {schedule:copy(schedule)}},
  async classTypes(since=''){typeReads.push(since);const revision='types-'+remote.typeRevision;return revision===since?{revision,unchanged:true}:{types:copy(remote.types),revision}},
  async createClassType(fields,key){typeWrites.push({operation:'create',fields:copy(fields),key});const type=formalClassType({...fields,id:'00000000-0000-4000-8000-'+String(10+(++serial)).padStart(12,'0'),kind:'custom'});remote.types.push(type);remote.typeRevision++;return {type:copy(type)}},
  async updateClassType(current,fields,key){typeWrites.push({operation:'update',current:copy(current),fields:copy(fields),key});const previous=remote.types.find(type=>type.id===current.id);if(previous?.version!==current.version)throw serviceError(409,'VERSION_CONFLICT');const type={...previous,...fields,version:previous.version+1};remote.types=remote.types.map(row=>row.id===type.id?type:row);remote.typeRevision++;return {type:copy(type)}},
  ...overrides,
 },{initialQuerySelectorAll:()=>[]});
 const appNode=a.nodes['#app'],modalRoot=a.ctx.document.querySelector('#modal-root');let mainMarkup=appNode.innerHTML;Object.defineProperty(appNode,'innerHTML',{configurable:true,get:()=>mainMarkup,set:value=>{mainMarkup=value;modalRoot.innerHTML=value.match(/<div id="modal-root">([\s\S]*)<\/div>$/)?.[1]||''}});
 return Object.assign(a,{typeRemote:remote,typeReads,typeWrites,typeCourseWrites,typeScheduleWrites});
}
async function openClassTypesManager(a){
 if(!a.nodes['#app'].innerHTML.includes('data-action="class-types-open"'))a.set("tab='catalog';render()");assert.match(a.nodes['#app'].innerHTML,/data-action="class-types-open"/,'An administrator must enter Class Type Settings from Courses');await a.click({action:'class-types-open'});assert.match(a.nodes['#modal-root'].innerHTML,/id="class-types-manager"/,'The public action must open the actual type catalogue');
}
function classTypeEditorForm(a,values={}){
 const markup=a.nodes['#modal-root'].innerHTML,tag=markup.match(/<form\b[^>]*id="class-type-editor"[^>]*>/)?.[0];assert.ok(tag,'A real type editor must exist before creating test DOM nodes');const mounted=()=>a.nodes['#modal-root'].innerHTML.includes('id="class-type-editor"'),attributes={},current=a.read('classTypeDraft.current??null'),form={id:'class-type-editor',dataset:markupDataset(tag),values:{name:current?.name||'',studentReschedulingAllowed:current?.studentReschedulingAllowed===true?'yes':current?.studentReschedulingAllowed===false?'no':'',...(current?.active===false?{}:{active:'on'}),...values},get isConnected(){return mounted()},setAttribute:(name,value)=>attributes[name]=String(value),removeAttribute:name=>delete attributes[name]},fields=Object.fromEntries(Object.entries(form.values).map(([name,value])=>[name,{name,value,disabled:false,focus(){a.ctx.document.activeElement=this},get isConnected(){return mounted()}}])),submit={disabled:false,textContent:'Save',focus(){a.ctx.document.activeElement=this}},cancel={disabled:false,dataset:{action:'class-type-cancel'},focus(){a.ctx.document.activeElement=this}},controls=[...Object.values(fields),cancel,submit],dialog={contains:node=>node===dialog||controls.includes(node),focus(){a.ctx.document.activeElement=this},querySelectorAll:selector=>selector.includes(':not(:disabled)')?controls.filter(row=>!row.disabled):controls},error={textContent:'',get isConnected(){return mounted()}};
 form.controls=controls;form.fields=fields;form.submitButton=submit;form.querySelectorAll=()=>controls;form.querySelector=selector=>selector.includes('submit')?submit:fields[selector.match(/name=["']?([^\]"']+)/)?.[1]]||null;form.closest=()=>dialog;
 const original=a.ctx.document.querySelector,all=a.ctx.document.querySelectorAll,nodes={'#class-type-editor':form,'#class-type-save':submit,'#class-type-error':error,'.class-type-editor-dialog':dialog};a.ctx.document.querySelector=selector=>Object.hasOwn(nodes,selector)?mounted()?nodes[selector]:null:original(selector);a.ctx.document.querySelectorAll=selector=>selector.includes('class-type-editor-dialog')?mounted()?dialog.querySelectorAll(selector):[]:all?.(selector)||[];Object.assign(a.nodes,nodes);return form;
}

test('formal class type settings create explicit unknown allow and deny rules without hardcoding Special policy or repeating a saved write after a read failure',async()=>{
 const a=await classTypeUiApp();await openClassTypesManager(a);assert.equal(a.typeRemote.types.find(row=>row.kind==='special').studentReschedulingAllowed,null,'A Special name must not invent a rescheduling prohibition');await a.click({action:'class-type-new'});let form=classTypeEditorForm(a,{name:'QA workshop',studentReschedulingAllowed:''});await a.submit(form.id,form.values,form);assert.equal(a.typeWrites.length,1);assert.deepEqual(a.typeWrites[0].fields,{name:'QA workshop',studentReschedulingAllowed:null,active:true});assert.ok(a.typeWrites[0].key);const created=a.typeRemote.types.find(row=>row.kind==='custom');assert.ok(created);assert.match(a.nodes['#modal-root'].innerHTML,/QA workshop/);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/id="class-type-editor"/);
 await a.click({action:'class-type-edit',classTypeEdit:created.id});form=classTypeEditorForm(a,{name:'QA workshop',studentReschedulingAllowed:'yes'});a.client.classTypes=async()=>{throw serviceError(503,'SERVICE_UNAVAILABLE')};await a.submit(form.id,form.values,form);assert.equal(a.typeWrites[1].current.version,1);assert.equal(a.typeWrites[1].fields.studentReschedulingAllowed,true);assert.equal(a.typeRemote.types.find(row=>row.id===created.id).version,2);assert.match(a.nodes['#modal-root'].innerHTML,/QA workshop/);await until(()=>!!a.read('classTypesError')&&a.read('classTypeReadPromise')===null,'The post-save catalogue read must really fail before recovery');assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/Could not save|amount \(at most two decimal places\)/,'A failed catalogue read must not tell the user that the acknowledged type save or a fee amount failed');assert.match(a.nodes['#modal-root'].innerHTML,/data-action="class-types-refresh"/);const reads=a.typeReads.length;a.client.classTypes=async since=>{a.typeReads.push(since);return {types:copy(a.typeRemote.types),revision:'types-'+a.typeRemote.typeRevision}};await a.click({action:'class-types-refresh'});await until(()=>a.typeReads.length>reads&&!a.read('classTypesError')&&a.read('classTypeReadPromise')===null,'Reload must recover the catalogue with a GET');assert.equal(a.typeWrites.length,2,'Reload after a saved acknowledgement must not repeat its mutation');assert.equal(a.read('sharedClassTypes.find(row=>row.id==='+JSON.stringify(created.id)+').version'),2);await a.click({action:'class-type-edit',classTypeEdit:created.id});form=classTypeEditorForm(a,{name:'QA workshop',studentReschedulingAllowed:'no'});delete form.values.active;await a.submit(form.id,form.values,form);assert.equal(a.typeWrites[2].current.version,2);assert.equal(a.typeWrites[2].fields.studentReschedulingAllowed,false);assert.equal(a.typeWrites[2].fields.active,false);assert.equal(a.typeRemote.types.find(row=>row.id===created.id).id,created.id);assert.equal(a.typeWrites.length,3);
});

test('formal class type settings preserve the opened version and selected rule through a background update conflict and Cancel Escape Back do not write',async()=>{
 const original=formalClassType({version:7}),remote={types:[original]},a=await classTypeUiApp(remote);await openClassTypesManager(a);await a.click({action:'class-type-edit',classTypeEdit:original.id});const form=classTypeEditorForm(a,{name:'QA typed rule',studentReschedulingAllowed:'no'});remote.types=[{...original,name:'QA remote rule',studentReschedulingAllowed:true,version:8}];remote.typeRevision++;await a.set('refreshSharedClassTypes({paint:true})');assert.equal(form.values.name,'QA typed rule');assert.equal(form.values.studentReschedulingAllowed,'no');await a.submit(form.id,form.values,form);assert.equal(a.typeWrites[0].current.version,7);assert.equal(a.typeWrites[0].fields.studentReschedulingAllowed,false);assert.match(a.nodes['#class-type-error'].textContent,/changed|updated|latest|reload/i);await a.submit(form.id,form.values,form);assert.equal(a.typeWrites[1].key,a.typeWrites[0].key);assert.equal(a.typeWrites[1].current.version,7);const writes=a.typeWrites.length;await a.click({action:'class-type-cancel'});assert.equal(a.read('classTypeDraft'),null);assert.match(a.nodes['#modal-root'].innerHTML,/QA remote rule/);await a.click({action:'class-type-edit',classTypeEdit:original.id});classTypeEditorForm(a,{name:'Unsaved rule',studentReschedulingAllowed:''});a.keydown('Escape');assert.equal(a.read('classTypeDraft'),null);await a.click({action:'class-type-edit',classTypeEdit:original.id});classTypeEditorForm(a,{name:'Unsaved back rule',studentReschedulingAllowed:''});a.ctx.location.pathname='/classes';for(const handler of a.windowEvents.popstate||[])handler({});assert.equal(a.read('classTypeDraft'),null);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/id="class-type-editor"/);assert.equal(a.typeWrites.length,writes);assert.equal(remote.types[0].name,'QA remote rule');
});

async function classTypeScheduleForm(a,values={}){
 await until(()=>a.nodes['#modal-root'].innerHTML.includes('id="schedule-editor"'),'The public action must finish opening the real schedule editor');const markup=a.nodes['#modal-root'].innerHTML,tag=markup.match(/<form\b[^>]*id="schedule-editor"[^>]*>/)?.[0],draft=a.read('scheduleDraft'),form=sharedScheduleForm({id:draft.id,version:draft.version||'',values:{...draft,classTypeId:draft.typeContext?.selected,...values}});form.dataset=markupDataset(tag);const controls=Object.fromEntries(Object.entries(form.values).map(([name,value])=>[name,{name,value,disabled:false,focus(){a.ctx.document.activeElement=this}}])),buttons=form.querySelectorAll('button'),attributes={},dialog={inert:false,setAttribute:(name,value)=>attributes[name]=String(value),removeAttribute:name=>delete attributes[name]};form.controls=controls;form.dialog=dialog;form.closest=selector=>selector==='.schedule-modal'?dialog:null;form.querySelectorAll=()=>[...buttons,...Object.values(controls)];form.querySelector=selector=>controls[selector.match(/\[name=["']?([a-zA-Z]+)/)?.[1]]||form.submitButton;a.nodes['#schedule-editor']=form;a.nodes['.schedule-modal']=dialog;a.nodes['.schedule-dialog header button']={disabled:false};return form;
}
function selectClassType(a,form,value){form.values.classTypeId=value;const summary={innerHTML:''},wrapper={querySelector:()=>summary};a.change('classTypeId',value,{closest:selector=>selector==='.class-type-selection'?wrapper:selector==='#schedule-editor'&&form.id==='schedule-editor'?form:selector==='#create-course-editor,#course-metadata-editor'&&form.id==='course-metadata-editor'?form:null});return summary;}

test('formal class type course default creates a new schedule snapshot while preserving earlier untyped lessons and all fees',async()=>{
 const a=await classTypeUiApp(),fees=a.read('sharedFees'),old=a.read('db.schedules');await a.click({editCourse:'qa-course'});await until(()=>a.nodes['#modal-root'].innerHTML.includes('course-metadata-editor'),'The actual course edit action must load the type selector');assert.match(a.nodes['#modal-root'].innerHTML,/name="classTypeId"/);let form=catalogueMetadataForm(a,'qa-course',{classTypeId:regularTypeId});selectClassType(a,form,regularTypeId);await a.submit(form.id,form.values,form);assert.equal(a.typeCourseWrites.length,1);assert.equal(a.typeCourseWrites[0].fields.classTypeId,regularTypeId);assert.equal(a.typeCourseWrites[0].fields.classTypeVersion,1,'Course default selection must submit the opened rule version');assert.equal(a.read("courseSettingsFor('qa-course').classTypeId"),regularTypeId);assert.deepEqual(a.read('sharedFees'),fees);assert.deepEqual(a.read('db.schedules'),old,'Changing the default cannot assign a guessed type to existing lessons');
 await a.click({action:'tt-add-schedule'});form=await classTypeScheduleForm(a,{course:'qa-course',startDate:'2026-10-15',weekdays:[4],count:'3',endMode:'count',time:'14:00',duration:'45',classTypeId:'__inherit'});assert.match(a.nodes['#modal-root'].innerHTML,/value="__inherit" selected/);assert.match(a.nodes['#modal-root'].innerHTML,/Regular Class/);await a.submit(form.id,form.values,form);assert.equal(a.typeScheduleWrites.length,1);const sent=a.typeScheduleWrites[0];assert.equal(sent.current,null);assert.equal(Object.hasOwn(sent.record,'classTypeId'),false,'Inherit sends source versions, not a client-authored type snapshot');assert.equal(sent.record.classTypeCourseVersion,2);assert.equal(sent.record.classTypeVersion,1);assert.ok(sent.key);assert.deepEqual(a.read("db.schedules.find(row=>row.id==='qa-type-created-series').classType"),typeSnapshot(a.typeRemote.types[0]));assert.equal(a.read("db.schedules.find(row=>row.id==='type-series').classType"),null);assert.deepEqual(a.read('sharedFees'),fees);
 a.typeRemote.types[0]={...a.typeRemote.types[0],name:'New future regular name',studentReschedulingAllowed:true,version:2};a.typeRemote.typeRevision++;await a.set('refreshSharedClassTypes({paint:false})');assert.equal(a.read("db.schedules.find(row=>row.id==='qa-type-created-series').classType.name"),'Regular Class');assert.equal(a.read("db.schedules.find(row=>row.id==='qa-type-created-series').classType.studentReschedulingAllowed"),null,'Changing catalogue policy must not retroactively permit self-rescheduling');
 a.typeRemote.types[0]={...a.typeRemote.types[0],active:false,version:3};a.typeRemote.typeRevision++;await a.set('refreshSharedClassTypes({paint:false})');await a.click({editCourse:'qa-course'});await until(()=>a.nodes['#modal-root'].innerHTML.includes('course-metadata-editor'),'Reopen the real existing course editor with its inactive default');assert.match(a.nodes['#modal-root'].innerHTML,new RegExp('<option value="'+regularTypeId+'" selected disabled>'),'The historical inactive default is a disabled selected option');form=catalogueMetadataForm(a,'qa-course',{courseName:'Renamed course retaining inactive default'});assert.equal(Object.hasOwn(form.values,'classTypeId'),false,'Native FormData omits a selected disabled option; the test must not forge that omitted field');const beforeWrites=a.typeCourseWrites.length;await a.submit(form.id,form.values,form);assert.equal(a.typeCourseWrites.length,beforeWrites+1);assert.equal(Object.hasOwn(a.typeCourseWrites.at(-1).fields,'classTypeId'),false,'A name-only save must retain the frozen inactive default instead of interpreting the omitted control as explicit clear');assert.equal(Object.hasOwn(a.typeCourseWrites.at(-1).fields,'classTypeVersion'),false);assert.equal(a.read("courseSettingsFor('qa-course').classTypeId"),regularTypeId);assert.deepEqual(a.read('sharedFees'),fees);
 await a.click({editCourse:'qa-course'});await until(()=>a.nodes['#modal-root'].innerHTML.includes('course-metadata-editor'),'Open again before explicitly clearing the inactive default');form=catalogueMetadataForm(a,'qa-course',{classTypeId:''});selectClassType(a,form,'');await a.submit(form.id,form.values,form);assert.equal(a.typeCourseWrites.at(-1).fields.classTypeId,null,'Choosing the enabled No class type option must still explicitly clear the default');assert.equal(a.read("courseSettingsFor('qa-course').classTypeId"),null);assert.deepEqual(a.read('sharedFees'),fees);assert.equal(a.read("db.schedules.find(row=>row.id==='qa-type-created-series').classType.id"),regularTypeId,'Clearing the future default must not erase an already saved lesson snapshot');
});

test('formal class type selected lesson keeps its historical rule during a time-only following edit and adopts the latest rule only after an explicit choice',async()=>{
 const historical=typeSnapshot(formalClassType()),special=typeSnapshot(formalClassType({id:specialTypeId,kind:'special',name:'Historical special',studentReschedulingAllowed:false})),latest=formalClassType({name:'Future regular renamed',studentReschedulingAllowed:true,version:2}),types=[latest,formalClassType({id:specialTypeId,kind:'special',name:'Future special',version:2})],series=scopedScheduleRecord({classType:historical,exceptions:[{sequence:3,overrides:{classType:special}}]}),a=await scopedScheduleApp([series],{classTypes:async()=>({types:copy(types),revision:'types-latest'}),createClassType:async()=>{throw new Error('No catalogue write expected')},updateClassType:async()=>{throw new Error('No catalogue write expected')}});await a.set('refreshSharedClassTypes({paint:false})');
 await a.click({editActivity:series.id,activityKind:'schedule',activityDate:'2026-10-21',activitySequence:'2'});let form=await classTypeScheduleForm(a,{time:'13:00',classTypeId:'__keep'});assert.match(a.nodes['#modal-root'].innerHTML,/value="__keep" selected/);const summary=a.nodes['#modal-root'].innerHTML.match(/<div\b[^>]*data-class-type-summary[^>]*>([\s\S]*?)<\/div>/)?.[1]||'';assert.match(summary,/Regular Class/);assert.match(summary,/data-class-type-policy="unknown"/);assert.doesNotMatch(summary,/Future regular renamed|data-class-type-policy="allowed"/);
 a.receipt={...copy(series),version:2,segments:[{fromSequence:2,rule:{...scheduleFollowingRule(series,2),time:'13:00',classType:historical}}]};await a.submit(form.id,form.values,form);chooseScopedSave(a,'following');await confirmScopedSave(a);assert.equal(a.occurrenceCalls.length,1);for(const key of ['classTypeId','classTypeVersion','classTypeCourseVersion','classType'])assert.equal(Object.hasOwn(a.occurrenceCalls[0].record,key),false,'Keep must omit '+key+' rather than resend a snapshot');assert.equal(scheduleOccurrence(a.read('db.schedules[0]'),2).item.classType.version,1);assert.deepEqual(scheduleOccurrence(a.read('db.schedules[0]'),3).item.classType,special,'A time-only following save must keep the later lesson’s distinct type');assert.equal(scheduleOccurrence(a.read('db.schedules[0]'),3).item.time,'13:00');
 await a.click({editActivity:series.id,activityKind:'schedule',activityDate:'2026-10-21',activitySequence:'2'});form=await classTypeScheduleForm(a);const selected=selectClassType(a,form,regularTypeId);assert.match(selected.innerHTML,/Future regular renamed/);assert.match(selected.innerHTML,/data-class-type-policy="allowed"/);a.receipt={...copy(a.remote.rows[0]),version:3,exceptions:[{sequence:2,overrides:{classType:typeSnapshot(latest)}},{sequence:3,overrides:{classType:special}}]};await a.submit(form.id,form.values,form);chooseScopedSave(a,'single');await confirmScopedSave(a);assert.equal(a.occurrenceCalls[1].record.classTypeId,regularTypeId);assert.equal(a.occurrenceCalls[1].record.classTypeVersion,2);assert.equal(a.occurrenceCalls[1].sequence,2);assert.equal(a.occurrenceCalls[1].scope,'single');assert.deepEqual(scheduleOccurrence(a.read('db.schedules[0]'),1).item.classType,historical);assert.deepEqual(scheduleOccurrence(a.read('db.schedules[0]'),2).item.classType,typeSnapshot(latest));assert.deepEqual(scheduleOccurrence(a.read('db.schedules[0]'),3).item.classType,special);
 // The service acknowledgement is external: this verifies the public form keeps
 // the selected exception when changing recurrence, not the server's algorithm.
 const saved=copy(a.remote.rows[0]);await a.click({editActivity:series.id,activityKind:'schedule',activityDate:'2026-10-21',activitySequence:'2'});form=await classTypeScheduleForm(a,{startDate:'2026-10-22',endMode:'count',count:'2',time:'14:00',classTypeId:'__keep'});a.input({name:'startDate',value:'2026-10-22',closest:selector=>selector==='#schedule-editor'?form:null});a.receipt={...saved,version:4,segments:[{fromSequence:2,rule:{...scheduleFollowingRule(saved,2),startDate:'2026-10-22',weekdays:[4],endMode:'count',count:2,time:'14:00',classType:typeSnapshot(latest)}}],exceptions:[{sequence:3,overrides:{classType:special}}]};await a.submit(form.id,form.values,form);chooseScopedSave(a,'following');await confirmScopedSave(a);assert.equal(a.occurrenceCalls[2].record.startDate,'2026-10-22');assert.deepEqual(a.occurrenceCalls[2].record.weekdays,[4]);assert.equal(Object.hasOwn(a.occurrenceCalls[2].record,'classTypeId'),false);assert.equal(Object.hasOwn(a.occurrenceCalls[2].record,'classType'),false);assert.deepEqual(scheduleOccurrence(a.read('db.schedules[0]'),2).item.classType,typeSnapshot(latest));assert.deepEqual(scheduleOccurrence(a.read('db.schedules[0]'),3).item.classType,special);assert.equal(scheduleOccurrence(a.read('db.schedules[0]'),2).date,'2026-10-22');assert.equal(scheduleOccurrence(a.read('db.schedules[0]'),1).date,'2026-10-14');
});

test('formal class type filtering uses saved occurrence snapshots across five views and linked slots while teachers remain read-only',async()=>{
 const historical=typeSnapshot(formalClassType({name:'Saved <regular> rule',studentReschedulingAllowed:false})),special=typeSnapshot(formalClassType({id:specialTypeId,kind:'special',name:'Saved special rule'})),series=sharedScheduleRecord({id:'type-calendar-series',startDate:'2026-10-15',count:2,classType:historical,exceptions:[{sequence:2,overrides:{classType:special}}]}),untyped=sharedScheduleRecord({id:'type-untyped-series',startDate:'2026-10-15',count:1,time:'16:00',classType:null}),linked=formalAvailableSlot({id:'type-linked-slot',sourceKind:'linked',scheduleId:series.id,sequence:1,date:'2026-10-15',classType:historical,sourceVersions:{'schedule:type-calendar-series':1}}),standalone=formalAvailableSlot({id:'type-standalone-slot',date:'2026-10-15',time:'17:00'}),slots=[linked,standalone],a=await classTypeUiApp({rows:[series,untyped],types:[formalClassType({name:'Future regular catalogue',version:2,studentReschedulingAllowed:true}),formalClassType({id:specialTypeId,kind:'special',name:'Future special catalogue',version:2})]},{availability:async(range,since)=>({slots:copy(slots.filter(row=>row.date>=range.from&&row.date<=range.to)),revision:'type-slots-'+range.from+range.to}),availableSlot:async id=>({slot:copy(slots.find(row=>row.id===id))})});await a.set('refreshSharedClassTypes({paint:false})');const before=a.read('({schedules:db.schedules,fees:sharedFees})');
 for(const view of ['day','week','range','month','list']){
  a.set(`timetableView=${JSON.stringify(view)};timetableViewSettings.rangeDays=14;selectTimetableDate('2026-10-15');render()`);await a.set('refreshSharedAvailability()');a.change('',regularTypeId,{id:'tt-class-type-filter'});let html=a.nodes['#app'].innerHTML;assert.match(html,/data-open-lesson="type-calendar-series"[^>]*data-lesson-date="2026-10-15"/,view+' must show the saved regular occurrence');assert.match(html,/data-slot-id="type-linked-slot"/,view+' must show the same linked snapshot');assert.doesNotMatch(html,/data-open-lesson="type-untyped-series"|data-slot-id="type-standalone-slot"|data-lesson-date="2026-10-22"/,view+' must not guess a type for unassigned or standalone activities');
  a.change('','__none',{id:'tt-class-type-filter'});html=a.nodes['#app'].innerHTML;assert.match(html,/data-open-lesson="type-untyped-series"/);assert.doesNotMatch(html,/data-open-lesson="type-calendar-series"|data-slot-id="type-linked-slot"|data-slot-id="type-standalone-slot"/);a.change('','',{id:'tt-class-type-filter'});assert.match(a.nodes['#app'].innerHTML,/data-slot-id="type-standalone-slot"/,'Clearing a display filter must restore the untyped standalone slot without mutating it');
 }
 a.change('',regularTypeId,{id:'tt-class-type-filter'});const list=a.nodes['#app'].innerHTML;assert.match(list,/Saved &lt;regular&gt; rule/);assert.doesNotMatch(list,/<regular>/);await a.click({openLesson:series.id,lessonKind:'schedule',lessonDate:'2026-10-15',lessonSequence:'1'});assert.match(a.nodes['#modal-root'].innerHTML,/Saved &lt;regular&gt; rule/);assert.match(a.nodes['#modal-root'].innerHTML,/data-class-type-policy="disallowed"/);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/Future regular catalogue/);await a.click({action:'lesson-close'});await a.click({action:'availability-open',slotId:linked.id});assert.match(a.nodes['#modal-root'].innerHTML,/Saved &lt;regular&gt; rule/);assert.match(a.nodes['#modal-root'].innerHTML,/data-class-type-policy="disallowed"/);await a.click({action:'availability-close'});assert.deepEqual(a.read('({schedules:db.schedules,fees:sharedFees})'),before,'Filters and catalogue names cannot rewrite stored lesson rules, colours or prices');
 const teacher={...copy(sharedTestUser),id:'type-readonly-teacher',role:'teacher',accessRevision:'only-type-seq1'};a.state.user=teacher;a.ctx.typeTeacher=teacher;a.client.schedules=async()=>teacherScheduleFixture(series,{date:'2026-10-15'});a.set('applySharedUser(typeTeacher)');await a.set('refreshSharedCourses({paint:false})');a.set("tab='overview';selectTimetableDate('2026-10-15');render()");await a.set('refreshSharedSchedules()');await a.set('refreshSharedClassTypes({paint:false})');assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-action="class-types-open"/);await a.click({openLesson:series.id,lessonKind:'schedule',lessonDate:'2026-10-15',lessonSequence:'1'});assert.match(a.nodes['#modal-root'].innerHTML,/Saved &lt;regular&gt; rule/);assert.match(a.nodes['#modal-root'].innerHTML,/data-class-type-policy="disallowed"/);await a.click({action:'lesson-close'});await a.click({action:'class-types-open'});await a.submit('class-type-editor',{name:'Forged rule',studentReschedulingAllowed:'yes',active:'on'},sharedForm('class-type-editor'));assert.equal(a.read('classTypeManager'),null);assert.equal(a.typeWrites.length,0);assert.equal(a.read('db.schedules.length'),0,'Teacher occurrence data must not be promoted into the complete recurring series');
});

test('formal class type opened choices freeze rule and course versions through conflicts and pending old-account receipts cannot alter a new editor',async()=>{
 const remote={types:[formalClassType({version:7}),formalClassType({id:specialTypeId,kind:'special',name:'Special Class'})],courses:[{...copy(sharedTestCourse),classTypeId:regularTypeId,version:3}]},a=await classTypeUiApp(remote);await a.set('refreshSharedClassTypes({paint:false})');await a.click({action:'tt-add-schedule'});let form=await classTypeScheduleForm(a,{classTypeId:'__inherit',course:'qa-course',startDate:'2026-10-15',count:'1',endMode:'count',time:'14:00',duration:'45',remark:'Keep my typed scheduling note'}),html=a.nodes['#modal-root'].innerHTML;assert.match(html,/data-class-type-policy="unknown"/);remote.types[0]={...remote.types[0],name:'Background changed rule',studentReschedulingAllowed:true,version:8};remote.typeRevision++;remote.courses[0]={...remote.courses[0],classTypeId:specialTypeId,version:4};await a.set('refreshSharedClassTypes({paint:true})');await a.set('refreshSharedCourses({paint:false})');assert.equal(a.nodes['#modal-root'].innerHTML,html,'An open selector and its policy summary cannot be silently replaced by a background catalogue');
 await a.submit(form.id,form.values,form);assert.equal(a.typeScheduleWrites.length,1,a.nodes['#schedule-error']?.textContent||'The public schedule save should reach the shared service');assert.equal(a.typeScheduleWrites[0].record.classTypeCourseVersion,3);assert.equal(a.typeScheduleWrites[0].record.classTypeVersion,7);assert.match(a.nodes['#schedule-error'].textContent,/changed|updated|latest|reopen/i);assert.equal(form.values.remark,'Keep my typed scheduling note');assert.equal(form.values.classTypeId,'__inherit');await a.submit(form.id,form.values,form);assert.equal(a.typeScheduleWrites[1].key,a.typeScheduleWrites[0].key);selectClassType(a,form,regularTypeId);await a.submit(form.id,form.values,form);assert.equal(a.typeScheduleWrites[2].record.classTypeVersion,7,'Choosing the already-open option must use its displayed version, not the new hidden rule');assert.equal(a.typeScheduleWrites[2].key,a.typeScheduleWrites[0].key);assert.equal(a.remote.rows.length,1);await a.click({action:'close'});assert.equal(a.read('scheduleDraft'),null);
 for(const outcome of ['success',401,403]){
  await openClassTypesManager(a);await a.click({action:'class-type-edit',classTypeEdit:regularTypeId});form=classTypeEditorForm(a,{name:'Old account pending name',studentReschedulingAllowed:'no'});const gate=deferred();let started=false;a.client.updateClassType=async()=>{started=true;return gate.promise};const pending=a.submit(form.id,form.values,form);await until(()=>started,'The old identity write must actually be pending');assert.ok(form.controls.every(control=>control.disabled),'Pending metadata saves must lock fields as well as buttons');a.keydown('Escape');assert.ok(a.read('classTypeDraft'),'Escape while saving cannot discard an in-flight operation');a.ctx.document.activeElement=a.ctx.document.body;let trapped=false;a.keydown('Tab',{preventDefault(){trapped=true}});assert.equal(trapped,true);assert.ok(a.nodes['.class-type-editor-dialog'].contains(a.ctx.document.activeElement),'A saving dialog without enabled controls must still capture keyboard focus');
  const user={...copy(sharedTestUser),id:'next-type-admin-'+outcome};a.state.user=user;a.ctx.nextTypeUser=copy(user);a.set('applySharedUser(nextTypeUser);render()');await a.set('refreshSharedCourses({paint:false})');await a.set('refreshSharedClassTypes({paint:false})');await openClassTypesManager(a);await a.click({action:'class-type-edit',classTypeEdit:regularTypeId});const current=classTypeEditorForm(a,{name:'New account unsaved name',studentReschedulingAllowed:''});if(outcome==='success')gate.resolve({type:formalClassType({name:'Old account pending name',version:9,studentReschedulingAllowed:false})});else gate.reject(serviceError(outcome,outcome===401?'AUTH_REQUIRED':'FORBIDDEN'));await pending;assert.equal(a.read('authUser.id'),user.id);assert.equal(a.read('classTypeSaving'),false);assert.equal(a.read('classTypeDraft.current.version'),8);assert.equal(current.values.name,'New account unsaved name');assert.equal(current.fields.name.disabled,false);assert.equal(a.read('sharedClassTypes.find(row=>row.id==='+JSON.stringify(regularTypeId)+').name'),'Background changed rule');assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/Old account pending name/);await a.click({action:'class-type-cancel'});await a.click({action:'class-types-close'});
 }
 const oldBack=deferred();await openClassTypesManager(a);await a.click({action:'class-type-edit',classTypeEdit:regularTypeId});form=classTypeEditorForm(a,{name:'Detached back draft',studentReschedulingAllowed:'no'});let backStarted=false;a.client.updateClassType=async()=>{backStarted=true;return oldBack.promise};const leaving=a.submit(form.id,form.values,form);await until(()=>backStarted,'Back must interrupt a real pending operation');a.ctx.location.pathname='/classes';for(const handler of a.windowEvents.popstate||[])handler({});assert.equal(a.read('classTypeDraft'),null);assert.equal(a.read('classTypeManager'),null);a.ctx.location.pathname='/account';a.set("tab='overview';render()");await openClassTypesManager(a);await a.click({action:'class-type-edit',classTypeEdit:regularTypeId});const reopened=classTypeEditorForm(a,{name:'Current page unsaved name'});oldBack.resolve({type:formalClassType({name:'Detached back draft',version:9})});await leaving;assert.equal(a.read('classTypeDraft.current.version'),8);assert.equal(reopened.values.name,'Current page unsaved name');assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/Detached back draft/);assert.equal(a.read('classTypeSaving'),false);await a.click({action:'class-type-cancel'});await a.click({action:'class-types-close'});
 for(const entry of [{editCourse:'qa-course'},{action:'tt-add-schedule'}])for(const outcome of ['success','failure']){
  const loading=deferred();let requested=false;a.set("classTypesReady=false;classTypesRevision='';classTypesError=''");a.client.classTypes=async()=>{requested=true;return loading.promise};await a.click(entry);await until(()=>requested,'A real course or schedule opening must await its type catalogue');await a.click({action:'class-types-open'});assert.match(a.nodes['#modal-root'].innerHTML,/id="class-types-manager"/);if(outcome==='success')loading.resolve({types:copy(remote.types),revision:'opening-race-types'});else loading.reject(serviceError(503,'SERVICE_UNAVAILABLE'));await until(()=>(a.read('classTypesReady')||!!a.read('classTypesError'))&&a.read('classTypeReadPromise')===null,'The original catalogue request must finish before checking competing opening intents');await Promise.resolve();await Promise.resolve();assert.match(a.nodes['#modal-root'].innerHTML,/id="class-types-manager"/,'A late older Course or Schedule opening must not overwrite the newer manager');assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/id="course-metadata-editor"|id="schedule-editor"/);const close=a.nodes['#modal-root'].innerHTML.match(/<button\b[^>]*data-action="class-types-close"[^>]*>/)?.[0];assert.ok(close);assert.doesNotMatch(close,/\bdisabled\b/,'The manager must leave loading state after the coalesced read, so its actual Close button works');if(outcome==='failure'){assert.match(a.nodes['#modal-root'].innerHTML,/data-action="class-types-refresh"/);assert.match(a.nodes['#modal-root'].innerHTML,/Could not refresh/);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/aria-busy="true"/);}await a.click({action:'class-types-close'});assert.equal(a.read('modal'),'');assert.equal(a.read('classTypeManager'),null);assert.equal(a.read('classTypeCourseDraft'),null);assert.equal(a.read('scheduleDraft'),null);
 }
});

const orderUiRecord=(extra={})=>({id:'qa-order',studentId:'qa-child',studentName:'QA Child',source:'teacher',items:[{courseId:'qa-course',courseName:'Shared studio',feeId:'qa-fee',feeName:'Shared lesson fee',lessons:[{scheduleId:'qa-schedule',sequence:1,sourceVersion:1,date:'2026-10-08',time:'10:00',duration:45}]}],amountCents:30000,orderStatus:'draft',paymentStatus:'draft',version:1,...extra});
function orderUiClient(remote={orders:[],students:[{id:'qa-child',displayName:'QA Child'}],links:[]}){const writes=[];return {remote,writes,client:{orders:async()=>({orders:copy(remote.orders),revision:'orders-'+remote.orders.length}),order:async id=>({order:copy(remote.orders.find(row=>row.id===id))}),studentAccountLinks:async()=>({students:copy(remote.students),accounts:[{id:'qa-parent',displayName:'QA Parent',email:'parent@example.test'}],links:copy(remote.links),revision:'links'}),async createOrder(payload,key){writes.push({action:'create',payload:copy(payload),key});const order=orderUiRecord({...payload,id:'qa-order',studentName:'QA Child',items:[{...payload.items[0],courseName:'Shared studio',feeName:'Shared lesson fee',lessons:payload.items[0].lessons.map(row=>({...row,date:'2026-10-08',time:'10:00',duration:45}))}]});remote.orders.push(order);return {order:copy(order)};},async sendOrder(current,key){writes.push({action:'send',version:current.version,key});const order=remote.orders.find(row=>row.id===current.id);Object.assign(order,{orderStatus:'sent',paymentStatus:'awaiting-confirmation',version:order.version+1});return {order:copy(order)};},async respondOrder(current,action,reason,key){writes.push({action:'respond',response:action,version:current.version,key});const order=remote.orders.find(row=>row.id===current.id);Object.assign(order,{orderStatus:action==='confirm'?'parent-confirmed':action==='reject'?'rejected':'changes-requested',paymentStatus:action==='confirm'?'awaiting-payment':'awaiting-confirmation',version:order.version+1});return {order:copy(order)};},async confirmOrderPayment(current,key){writes.push({action:'paid',version:current.version,key});const order=remote.orders.find(row=>row.id===current.id);Object.assign(order,{paymentStatus:'paid',version:order.version+1});return {order:copy(order)};},lessonStudents:async()=>({students:[],occupied:0,capacity:8})}};}

async function courseRosterOrderApp(accountRole='admin',options={}){
 const series=scopedScheduleRecord(),selection={id:series.id,kind:'schedule',date:'2026-10-21',sequence:2},order=orderUiRecord({paymentStatus:'paid',orderStatus:'parent-confirmed',items:[{...orderUiRecord().items[0],lessons:[{scheduleId:series.id,sequence:2,sourceVersion:1,date:selection.date,time:series.time,duration:45}]}]}),orders=orderUiClient({orders:[order],students:[{id:'qa-child',displayName:'QA Child'}],links:[]}),roster={students:[{id:'qa-session',studentId:'qa-child',displayName:'QA Child',orderId:order.id,paymentStatus:'paid',attendance:'unmarked',remark:''}],occupied:1,capacity:8};
 const client={...orders.client,session:async()=>({user:{...copy(sharedTestUser),role:accountRole}}),lessonStudents:async()=>copy(roster)};
 if(accountRole==='teacher')client.schedules=async()=>teacherScheduleFixture(series,{sequence:2,date:selection.date});
 const a=await sharedScheduleApp({rows:[series],revision:1},client,options);a.set("courseDetailMonth=new Date(2026,9,1);courseDetailTab='general';location.pathname='/account/courses/qa-course';render()");await a.set('refreshSharedSchedules()');
 const tag=[...a.nodes['#app'].innerHTML.matchAll(/<button\b[^>]*data-open-lesson="qa-scoped-series"[^>]*>/g)].map(row=>row[0]).find(row=>row.includes('data-lesson-date="2026-10-21"'));assert.ok(tag);await a.click(markupDataset(tag));await a.set('refreshLessonStudents()');return {...a,orders,roster,selection};
}

test('shared lesson host resolves exact paid students through an opaque ticket after the parent selection is hidden',async()=>{
 for(const accountRole of ['admin','teacher']){
  let settings;const a=await courseRosterOrderApp(accountRole,{preview:true,initialQuerySelectorAll:()=>[],onPreviewSettings:value=>settings=value});
  a.roster.students.unshift({id:'qa-other-session',studentId:'qa-other-child',displayName:'Other private child',paymentStatus:'paid',attendance:'present'});await a.set('refreshLessonStudents()');
  assert.equal(typeof settings.resolveSharedLesson,'function');const opened=settings.resolveSharedLesson({sessionId:'qa-session',student:{id:'forged',displayName:'Forged name'}});assert.equal(opened.status,'ready');assert.equal(opened.facts.student.id,'qa-child');assert.equal(opened.facts.lesson.sequence,2);assert.equal(opened.facts.lesson.scheduleId,a.selection.id);assert.equal(opened.facts.student.attendance,'unmarked');assert.ok(opened.returnTicket&&typeof opened.returnTicket==='object');assert.doesNotMatch(JSON.stringify(opened.returnTicket),/qa-child|qa-session|Other private/);
  a.set("selectedTimetableLesson=null;modal='opaque overlay'");const current=settings.resolveSharedLesson({sessionId:'qa-session',returnTicket:opened.returnTicket});assert.equal(current.status,'ready');assert.equal(current.facts.student.id,'qa-child');assert.equal(settings.resolveSharedLesson({sessionId:'qa-other-session',returnTicket:opened.returnTicket}).status,'unavailable');assert.equal(settings.resolveSharedLesson({sessionId:'qa-session',returnTicket:{}}).status,'unavailable');assert.deepEqual(a.orders.writes,[]);
 }
});

test('canonical roster names open the exact second same-name student lesson and return to the original course roster position',async()=>{
 for(const accountRole of ['admin','teacher']){
  const a=await courseRosterOrderApp(accountRole,{preview:true,initialQuerySelectorAll:()=>[]});a.roster.students.unshift({id:'same-name-first-session',studentId:'same-name-first-child',displayName:'QA Child',paymentStatus:'paid',attendance:'present',remark:'Unrelated first student private note'});a.roster.students[1].remark='Selected student lesson note';await a.set('refreshLessonStudents()');
  const tag=a.nodes['#modal-root'].innerHTML.match(/<button\b[^>]*data-ui-view="student"[^>]*data-ui-id="qa-session"[^>]*>/)?.[0];assert.ok(tag,'The actual selected roster name must be an actionable student-lesson entry');assert.doesNotMatch(tag,/disabled/);assert.match(tag,/aria-label="View lesson details for QA Child"/);
  const dataset=markupDataset(tag),scroll={scrollTop:231,scrollLeft:9};a.nodes['.lesson-dialog-scroll']=scroll;let focused='';const opener={dataset,isConnected:true,closest:selector=>selector==='.lesson-dialog'?{}:null,focus(options){assert.equal(options?.preventScroll,true);focused='selected'}};a.ctx.document.activeElement=opener;
  await a.nativeClick({closest:selector=>selector.split(',').includes('[data-action]')?opener:null});let html=a.nodes['#modal-root'].innerHTML;assert.match(html,/class="modal slw-modal"/);assert.match(html,/data-student-id="qa-child" data-session-id="qa-session"/);assert.match(html,/Selected student lesson note/);assert.doesNotMatch(html,/Unrelated first student private note|same-name-first-child|Chloe|Alex Chan/);assert.match(html,/Age|年齡/);assert.match(html,/Remaining|剩餘/);assert.doesNotMatch(html,/0 years|0 歲|7 lessons remaining|剩餘 7 堂|shared-lesson-workflow-form/);assert.equal(a.read('selectedTimetableLesson'),null);
  opener.isConnected=false;const returned={...opener,isConnected:true},wrong={...returned,dataset:{...dataset,uiId:'same-name-first-session'},focus(){focused='wrong'}};a.ctx.document.querySelectorAll=selector=>selector==='.lesson-dialog button'?[wrong,returned]:[];scroll.scrollTop=0;scroll.scrollLeft=0;
  if(accountRole==='teacher')a.keydown('Escape');else await a.click({action:'ui-shared-lesson',uiCommand:'close'});assert.deepEqual(a.read('selectedTimetableLesson'),a.selection);assert.equal(a.read('lessonDetailTab'),'students');assert.equal(a.read('courseDetailMonth.getMonth()'),9);assert.equal(a.read('location.pathname'),'/account/courses/qa-course');assert.equal(scroll.scrollTop,231);assert.equal(scroll.scrollLeft,9);assert.equal(focused,'selected');assert.match(a.nodes['#modal-root'].innerHTML,/class="modal lesson-modal"/);a.set("lang='zh';modal=lessonDetailMarkup();renderModal()");assert.match(a.nodes['#modal-root'].innerHTML,/aria-label="查看QA Child的課堂資料"/);assert.deepEqual(a.orders.writes,[]);
 }
});

test('roster student-detail names cannot launch when the exact source is unpaid duplicated missing or failed',async()=>{
 for(const scenario of ['unpaid','duplicate','missing-student','missing-name','read-error']){
  const a=await courseRosterOrderApp('admin',{preview:true,initialQuerySelectorAll:()=>[]});if(scenario==='unpaid')a.roster.students[0].paymentStatus='awaiting-payment';if(scenario==='duplicate')a.roster.students.push({...a.roster.students[0]});if(scenario==='missing-student')a.roster.students[0].studentId='';if(scenario==='missing-name')delete a.roster.students[0].displayName;if(scenario==='read-error')a.client.lessonStudents=async()=>{throw serviceError(503,'SOURCE_UNAVAILABLE')};await a.set('refreshLessonStudents()');
  const tag=a.nodes['#modal-root'].innerHTML.match(/<button\b[^>]*data-ui-view="student"[^>]*data-ui-id="qa-session"[^>]*>/)?.[0];if(tag)assert.match(tag,/disabled/,scenario);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/View lesson details for undefined/);await a.click({action:'ui-lesson',uiCommand:'launch',uiView:'student',uiId:'qa-session'});assert.equal(a.read('interfacePreview.isOpen'),false,scenario);assert.equal(a.read('sharedLessonReturn'),null,scenario);assert.match(a.nodes['#modal-root'].innerHTML,/class="modal lesson-modal"/);assert.deepEqual(a.orders.writes,[]);
 }
});

test('student lesson detail follows refreshed source data and disappears on authoritative access revocation or an unrelated student role',async()=>{
 const a=await courseRosterOrderApp('teacher',{preview:true,initialQuerySelectorAll:()=>[]});const tag=a.nodes['#modal-root'].innerHTML.match(/<button\b[^>]*data-ui-view="student"[^>]*data-ui-id="qa-session"[^>]*>/)?.[0];assert.ok(tag);mountPeopleModalRoot(a);await a.nativeClick({closest:selector=>selector.split(',').includes('[data-action]')?{dataset:markupDataset(tag)}:null});assert.match(a.nodes['#modal-root'].innerHTML,/QA Child/);
 a.roster.students[0].remark='Updated canonical lesson note';await a.set('refreshLessonStudents()');assert.match(a.nodes['#modal-root'].innerHTML,/Updated canonical lesson note/);a.client.lessonStudents=async()=>{throw serviceError(503,'SOURCE_UNAVAILABLE')};await a.set('refreshLessonStudents()');assert.match(a.nodes['#modal-root'].innerHTML,/Could not update lesson details/);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/0 years|0 歲|0 lessons remaining|剩餘 0 堂/);
 a.client.session=async()=>({user:{...copy(sharedTestUser),role:'teacher',accessRevision:'revoked-student-detail-scope',teacherResourceIds:[]}});await a.set('refreshSharedSession()');assert.equal(a.read('interfacePreview.isOpen'),false);assert.equal(a.read('sharedLessonReturn'),null);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/QA Child|Updated canonical lesson note|slw-modal/);
 a.set("applySharedUser({id:'unrelated-student-login',role:'student',displayName:'Other student'});render();renderModal()");await a.click({action:'ui-lesson',uiCommand:'launch',uiView:'student',uiId:'qa-session'});assert.equal(a.read('interfacePreview.isOpen'),false);assert.equal(a.read('sharedLessonReturn'),null);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/QA Child|Updated canonical lesson note|slw-modal/);assert.deepEqual(a.orders.writes,[]);
});

test('shared lesson host closes back to the exact course lesson and restores tab body position and opener',async()=>{
 let settings;const a=await courseRosterOrderApp('admin',{preview:true,initialQuerySelectorAll:()=>[],onPreviewSettings:value=>settings=value}),scroll={scrollTop:177,scrollLeft:4};a.nodes['.lesson-dialog-scroll']=scroll;
 let focused=0;const opener={dataset:{action:'ui-lesson',uiCommand:'launch',uiView:'attendance',uiId:'qa-session'},isConnected:true,closest:selector=>selector==='.lesson-dialog'?{}:null,focus(){focused++;}};
 const opened=settings.resolveSharedLesson({sessionId:'qa-session',opener});assert.equal(opened.status,'ready');a.set("selectedTimetableLesson=null;lessonDetailTab='materials';courseLessonReturn=null;modal='opaque overlay'");scroll.scrollTop=0;scroll.scrollLeft=0;settings.onCloseSharedLesson(opened.returnTicket,{restore:true});assert.deepEqual(a.read('selectedTimetableLesson'),a.selection);assert.equal(a.read('lessonDetailTab'),'students');assert.ok(a.read('courseLessonReturn'));assert.equal(a.read('location.pathname'),'/account/courses/qa-course');assert.equal(scroll.scrollTop,177);assert.equal(scroll.scrollLeft,4);assert.equal(focused,1);assert.match(a.nodes['#modal-root'].innerHTML,/QA Child/);assert.deepEqual(a.orders.writes,[]);
});

test('shared lesson host refuses unknown failed duplicate stale identity and changed route or occurrence contexts',async()=>{
 for(const scenario of ['loading','error','duplicate','unknown','identity','route','moved']){
  let settings;const a=await courseRosterOrderApp('admin',{preview:true,initialQuerySelectorAll:()=>[],onPreviewSettings:value=>settings=value}),opened=settings.resolveSharedLesson({sessionId:'qa-session'});assert.equal(opened.status,'ready');
  if(scenario==='loading')a.set("lessonStudentCaches.set('qa-scoped-series:2',{ready:false,students:[]})");
  if(scenario==='error')a.set("lessonStudentCaches.get('qa-scoped-series:2').error='Private refresh failure'");
  if(scenario==='duplicate')a.set("lessonStudentCaches.get('qa-scoped-series:2').students.push({...lessonStudentCaches.get('qa-scoped-series:2').students[0]})");
  if(scenario==='unknown')a.set("lessonStudentCaches.get('qa-scoped-series:2').students=[]");
  if(scenario==='identity')a.set("applySharedUser({id:'other-admin',role:'admin',displayName:'Other account'})");
  if(scenario==='route')a.set("location.pathname='/account';tab='overview'");
  if(scenario==='moved')a.set("db.schedules.find(row=>row.id==='qa-scoped-series').exceptions=[{sequence:2,overrides:{date:'2026-10-22'}}]");
  const next=settings.resolveSharedLesson({sessionId:'qa-session',returnTicket:opened.returnTicket});assert.equal(next.status,scenario==='loading'?'loading':scenario==='error'?'error':'unavailable',scenario);assert.equal(next.facts,undefined);settings.onCloseSharedLesson(opened.returnTicket,{restore:false});assert.equal(settings.resolveSharedLesson({sessionId:'qa-session',returnTicket:opened.returnTicket}).status,'unavailable');assert.deepEqual(a.orders.writes,[]);
 }
});

test('shared canonical Attendance and Make Up launch review and cancel for Admin and Teacher without business writes',async()=>{
 for(const role of ['admin','teacher'])for(const view of ['attendance','arrange']){
  const a=await courseRosterOrderApp(role,{preview:true,initialQuerySelectorAll:()=>[]}),before=a.read('db');await a.click({action:'ui-lesson',uiCommand:'launch',uiView:view,uiId:'qa-session'});
  assert.match(a.nodes['#modal-root'].innerHTML,/class="modal slw-modal"/);assert.match(a.nodes['#modal-root'].innerHTML,/data-student-id="qa-child" data-session-id="qa-session"/);assert.match(a.nodes['#modal-root'].innerHTML,/QA Child|2026-10-21/);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/Chloe|Alex|已儲存|saved successfully/);
  if(view==='attendance'){
   const form=sharedForm('shared-lesson-workflow-form');form.values={attendance:'sick',remark:'Canonical local draft',sticker:'yellow',showRemark:'yes'};a.nodes['#shared-lesson-workflow-form']=form;await a.submit(form.id,form.values,form);assert.match(a.nodes['#modal-root'].innerHTML,/Canonical local draft/);assert.match(a.nodes['#modal-root'].innerHTML,/data-ui-command="final-save"[^>]*disabled/);await a.click({action:'ui-shared-lesson',uiCommand:'back'});assert.match(a.nodes['#modal-root'].innerHTML,/name="attendance" value="sick"[^>]*checked/);assert.match(a.nodes['#modal-root'].innerHTML,/Canonical local draft/);
  }else{assert.match(a.nodes['#modal-root'].innerHTML,/unavailable|not available/i);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/data-ui-command="select-slot"/);await a.click({action:'ui-shared-lesson',uiCommand:'pending'});assert.match(a.nodes['#modal-root'].innerHTML,/Pending Confirmation/);assert.match(a.nodes['#modal-root'].innerHTML,/data-ui-command="final-confirm"[^>]*disabled/);}
  for(const uiCommand of ['final-save','final-confirm'])await a.click({action:'ui-shared-lesson',uiCommand});assert.deepEqual(a.read('db'),before);assert.deepEqual(a.orders.writes,[]);await a.click({action:'ui-shared-lesson',uiCommand:'close'});assert.deepEqual(a.read('selectedTimetableLesson'),a.selection);assert.match(a.nodes['#modal-root'].innerHTML,/class="modal lesson-modal"/);
 }
});

test('shared lesson background refresh keeps an unfinished draft across source metadata updates and handles read failure without reopening a parent',async()=>{
 const a=await courseRosterOrderApp('admin',{preview:true,initialQuerySelectorAll:()=>[]});mountPeopleModalRoot(a);await a.click({action:'ui-lesson',uiCommand:'launch',uiView:'attendance',uiId:'qa-session'});const form=sharedForm('shared-lesson-workflow-form');form.values={attendance:'late',remark:'Keep unfinished context draft'};a.nodes['#shared-lesson-workflow-form']=form;a.input({name:'remark',value:form.values.remark,closest:selector=>selector==='#shared-lesson-workflow-form'?form:null});
 a.remote.rows[0]={...a.remote.rows[0],version:2,time:'15:00'};a.remote.revision++;await a.set('refreshSharedSchedules()');assert.match(a.nodes['#modal-root'].innerHTML,/Keep unfinished context draft/);assert.match(a.nodes['#modal-root'].innerHTML,/15:00/);assert.equal(a.read('selectedTimetableLesson'),null);
 a.client.lessonStudents=async()=>{throw serviceError(503,'TEMPORARY_FAILURE')};await a.set('refreshLessonStudents()');assert.match(a.nodes['#modal-root'].innerHTML,/Keep unfinished context draft/);assert.match(a.nodes['#modal-root'].innerHTML,/data-ui-command="review"[^>]*disabled/);assert.equal(a.read('selectedTimetableLesson'),null);
 a.set("applySharedUser({id:'different-account',role:'teacher',displayName:'Other teacher'});render();renderModal()");assert.equal(a.read('sharedLessonReturn'),null);assert.equal(a.read('interfacePreview.isOpen'),false);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/Keep unfinished context draft|QA Child/);assert.deepEqual(a.orders.writes,[]);
});

test('native shared Attendance fields keep their normal radio checkbox and text clicks until Review is chosen',async()=>{
 const a=await courseRosterOrderApp('admin',{preview:true,initialQuerySelectorAll:()=>[]}),entry=a.nodes['#modal-root'].innerHTML.match(/<button\b[^>]*data-ui-view="attendance"[^>]*>/)?.[0];assert.ok(entry);
 const opener={dataset:markupDataset(entry),isConnected:true,closest:()=>null};await a.nativeClick({closest:selector=>selector.split(',').includes('[data-action]')?opener:null});
 const initial=a.nodes['#modal-root'].innerHTML,formTag=initial.match(/<form\b[^>]*id="shared-lesson-workflow-form"[^>]*>/)?.[0];assert.ok(formTag);const form=sharedForm('shared-lesson-workflow-form');form.dataset=markupDataset(formTag);form.values={attendance:'sick',remark:'Keep this real form draft',sticker:'yellow',showRemark:'yes'};a.nodes['#shared-lesson-workflow-form']=form;
 for(const name of ['attendance','showRemark','remark']){
  // Browser closest() climbs to an actionable form too; normal controls must
  // have no such ancestor, so their native click is never preventDefault'd.
  const target={name,closest:selector=>selector.split(',').includes('[data-action]')&&form.dataset.action?form:null};await a.nativeClick(target);assert.equal(!!target.prevented,false,name);assert.equal(a.nodes['#modal-root'].innerHTML,initial,name+' must not run Review or replace the form');
 }
 await a.submit(form.id,form.values,form);assert.match(a.nodes['#modal-root'].innerHTML,/Keep this real form draft/);assert.match(a.nodes['#modal-root'].innerHTML,/data-ui-command="final-save"[^>]*disabled/);assert.deepEqual(a.orders.writes,[]);
});

test('a failed current schedule or course refresh preserves a shared lesson draft but disables Review until that source recovers',async()=>{
 for(const source of ['schedule','course']){
  const a=await courseRosterOrderApp('admin',{preview:true,initialQuerySelectorAll:()=>[]});await a.click({action:'ui-lesson',uiCommand:'launch',uiView:'attendance',uiId:'qa-session'});const form=sharedForm('shared-lesson-workflow-form');form.values={attendance:'late',remark:'Keep draft while source retries'};a.nodes['#shared-lesson-workflow-form']=form;a.input({name:'remark',value:form.values.remark,closest:selector=>selector==='#shared-lesson-workflow-form'?form:null});
  const method=source==='schedule'?'schedules':'courses',retry=a.client[method];a.client[method]=async()=>{throw serviceError(503,'CURRENT_SOURCE_UNAVAILABLE')};await a.set(source==='schedule'?'refreshSharedSchedules()':'refreshSharedCourses()');
  let html=a.nodes['#modal-root'].innerHTML;assert.match(html,/data-ui-command="review"[^>]*disabled/,source+' failure cannot remain ready');assert.match(html,/Keep draft while source retries/);assert.match(html,/Could not update lesson details/);assert.equal(a.read('selectedTimetableLesson'),null);
  a.client[method]=retry;await a.set(source==='schedule'?'refreshSharedSchedules()':'refreshSharedCourses()');html=a.nodes['#modal-root'].innerHTML;assert.match(html,/Keep draft while source retries/);const review=html.match(/<button\b[^>]*data-ui-command="review"[^>]*>/)?.[0];assert.ok(review);assert.doesNotMatch(review,/disabled/);assert.deepEqual(a.orders.writes,[]);
 }
});

test('shared workflow loses its opaque return context after navigation a moved lesson or changed student membership',async()=>{
 for(const scenario of ['route','course-month','moved','removed-student','different-student']){
  const a=await courseRosterOrderApp('admin',{preview:true,initialQuerySelectorAll:()=>[]});mountPeopleModalRoot(a);await a.click({action:'ui-lesson',uiCommand:'launch',uiView:'attendance',uiId:'qa-session'});assert.match(a.nodes['#modal-root'].innerHTML,/slw-modal/);
  if(scenario==='route')await a.click({go:'/account'});
  else if(scenario==='course-month')a.set('courseDetailMonth=new Date(2026,10,1);render()');
  else if(scenario==='moved'){a.remote.rows[0]={...a.remote.rows[0],version:2,exceptions:[{sequence:2,overrides:{date:'2026-10-22'}}]};a.remote.revision++;await a.set('refreshSharedSchedules()');}
  else{a.roster.students=scenario==='removed-student'?[]:[{...a.roster.students[0],studentId:'another-child',displayName:'Different private child'}];await a.set('refreshLessonStudents()');}
  assert.equal(a.read('sharedLessonReturn'),null,scenario);assert.equal(a.read('interfacePreview.isOpen'),false,scenario);assert.equal(a.read('selectedTimetableLesson'),null,scenario);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/slw-modal|lesson-modal|QA Child|Different private child/,scenario);await a.click({action:'ui-shared-lesson',uiCommand:'close'});assert.equal(a.read('selectedTimetableLesson'),null,scenario+' must not reopen an expired parent');assert.deepEqual(a.orders.writes,[]);
 }
});

test('course roster order details and enrollment cancellation return to the exact lesson with its tab, scroll and opener',async()=>{
 for(const accountRole of ['admin','teacher'])for(const action of accountRole==='admin'?['orders-open','orders-enroll']:['orders-open'])for(const escape of [false,true]){
  const a=await courseRosterOrderApp(accountRole),dataset={action,...(action==='orders-open'?{orderId:'qa-order'}:{})},opener={dataset,isConnected:true,closest:selector=>selector==='.lesson-dialog'?{}:null};
  const scroll={scrollTop:228,scrollLeft:0};a.nodes['.lesson-dialog-scroll']=scroll;await a.click(dataset,opener);assert.equal(a.read('selectedTimetableLesson'),null);assert.equal(a.read('enrollmentOverlay.kind'),action==='orders-open'?'details':'editor');
  opener.isConnected=false;let focused=0;const returned={dataset,isConnected:true,focus(options){focused++;assert.equal(options?.preventScroll,true)}};a.ctx.document.querySelectorAll=selector=>selector==='.lesson-dialog button'?[returned]:[];scroll.scrollTop=0;
  if(escape)a.keydown('Escape');else await a.click({action:'orders-close'});
  assert.equal(a.read('enrollmentOverlay'),null);assert.deepEqual(a.read('selectedTimetableLesson'),a.selection);assert.equal(a.read('lessonDetailTab'),'students');assert.ok(a.read('courseLessonReturn'));assert.equal(a.read('location.pathname'),'/account/courses/qa-course');assert.equal(a.read('courseDetailMonth.getMonth()'),9);assert.match(a.nodes['#modal-root'].innerHTML,/lesson-dialog/);assert.match(a.nodes['#modal-root'].innerHTML,/QA Child/);assert.equal(scroll.scrollTop,228);assert.equal(focused,1);assert.deepEqual(a.orders.writes,[]);
 }
});

test('unchanged roster polling keeps the mounted lesson while changed data preserves its scroll and focused control',async()=>{
 const a=await courseRosterOrderApp(),root=a.nodes['#modal-root'],dataset={action:'orders-open',orderId:'qa-order'};let paints=0,html=root.innerHTML,focused=0;
 let control={dataset,isConnected:true,closest:selector=>selector==='.lesson-dialog'?{}:null,focus(options){focused++;assert.equal(options?.preventScroll,true)}};a.ctx.document.activeElement=control;
 const scroll={scrollTop:184,scrollLeft:0};a.nodes['.lesson-dialog-scroll']=scroll;a.ctx.document.querySelectorAll=selector=>selector==='.lesson-dialog button'?[control]:[];
 Object.defineProperty(root,'innerHTML',{configurable:true,get:()=>html,set(value){paints++;html=value;control.isConnected=false;control={...control,isConnected:true};scroll.scrollTop=0;}});
 await a.set('refreshLessonStudents()');assert.equal(paints,0,'An unchanged five-second response must not replace the dialog');assert.equal(scroll.scrollTop,184);
 a.roster.students[0].displayName='Updated Child';await a.set('refreshLessonStudents()');assert.equal(paints,1);assert.match(root.innerHTML,/Updated Child/);assert.equal(scroll.scrollTop,184);assert.equal(focused,1);assert.deepEqual(a.read('selectedTimetableLesson'),a.selection);
});

test('unchanged roster polling refreshes changed lesson metadata and resource labels without losing the reading position',async()=>{
 const a=await courseRosterOrderApp(),root=a.nodes['#modal-root'],dataset={action:'orders-open',orderId:'qa-order'};let paints=0,html=root.innerHTML,focused=0;
 let control={dataset,isConnected:true,closest:selector=>selector==='.lesson-dialog'?{}:null,focus(options){focused++;assert.equal(options?.preventScroll,true)}};a.ctx.document.activeElement=control;
 const scroll={scrollTop:164,scrollLeft:0};a.nodes['.lesson-dialog-scroll']=scroll;a.ctx.document.querySelectorAll=selector=>selector==='.lesson-dialog button'?[control]:[];
 Object.defineProperty(root,'innerHTML',{configurable:true,get:()=>html,set(value){paints++;html=value;control.isConnected=false;control={...control,isConnected:true};scroll.scrollTop=0;}});
 a.set(`sharedSchedulingResources=${JSON.stringify([schedulingResource('metadata-teacher','teacher','Updated teaching artist',{representativeColor:'#123456'}),schedulingResource('metadata-room','room','Updated studio')])}`);
 a.remote.rows=[scopedScheduleRecord({version:2,time:'15:00',duration:60,teacherIds:['metadata-teacher'],roomIds:['metadata-room'],remark:'Updated lesson remark',detail:'Updated preparation',moreInfo:'Updated supplies'})];a.remote.revision++;await a.set('refreshSharedSchedules()');await a.set('refreshLessonStudents()');
 assert.equal(paints,1);for(const text of ['15:00','16:00','Updated teaching artist','Updated studio','Updated lesson remark','Updated preparation','Updated supplies'])assert.ok(root.innerHTML.includes(text),text);assert.equal(scroll.scrollTop,164);assert.equal(focused,1);assert.deepEqual(a.read('selectedTimetableLesson'),a.selection);
 a.set("sharedSchedulingResources[0].displayName='Renamed teaching artist';sharedSchedulingResources[0].representativeColor='#abcdef';sharedSchedulingResources[1].displayName='Renamed studio'");await a.set('refreshLessonStudents()');
 assert.equal(paints,2);assert.match(root.innerHTML,/Renamed teaching artist/);assert.match(root.innerHTML,/Renamed studio/);assert.match(root.innerHTML,/#abcdef/);assert.equal(scroll.scrollTop,164);assert.equal(focused,2);
 await a.set('refreshLessonStudents()');assert.equal(paints,2,'An unchanged lesson and roster must leave the mounted dialog intact');assert.deepEqual(a.orders.writes,[]);
});

test('a removed focused roster row falls back to the lesson close control without scrolling',async()=>{
 const a=await courseRosterOrderApp(),root=a.nodes['#modal-root'],dataset={action:'orders-open',orderId:'qa-order'},focusOptions=[];
 const oldControl={dataset,isConnected:true,closest:selector=>selector==='.lesson-dialog'?{}:null};a.ctx.document.activeElement=oldControl;
 const close={dataset:{action:'lesson-close'},isConnected:true,focus(options){focusOptions.push(options);a.ctx.document.activeElement=this}};a.nodes['[data-action="lesson-close"]']=close;a.ctx.document.querySelectorAll=selector=>selector==='.lesson-dialog button'?[close]:[];
 const scroll={scrollTop:177,scrollLeft:0};a.nodes['.lesson-dialog-scroll']=scroll;let html=root.innerHTML;Object.defineProperty(root,'innerHTML',{configurable:true,get:()=>html,set(value){html=value;oldControl.isConnected=false;a.ctx.document.activeElement=a.ctx.document.body;scroll.scrollTop=0;}});
 a.roster.students=[];a.roster.occupied=0;await a.set('refreshLessonStudents()');assert.equal(a.ctx.document.activeElement,close);assert.equal(focusOptions.length,1);assert.equal(focusOptions[0]?.preventScroll,true);assert.equal(scroll.scrollTop,177);assert.match(root.innerHTML,/No paid students yet/);
});

test('a changed roster does not steal focus from an unrelated external control',async()=>{
 const a=await courseRosterOrderApp(),external={dataset:{action:'unrelated-control'},isConnected:true,closest:()=>null};a.ctx.document.activeElement=external;
 let closeFocus=0;a.nodes['[data-action="lesson-close"]']={focus(){closeFocus++}};a.roster.students=[];a.roster.occupied=0;await a.set('refreshLessonStudents()');assert.equal(a.ctx.document.activeElement,external);assert.equal(closeFocus,0);assert.match(a.nodes['#modal-root'].innerHTML,/No paid students yet/);
});

test('a roster enrollment editor receives its raw course name and escapes it once for display',async()=>{
 const a=await courseRosterOrderApp(),courseName='Studio <spring> & "friends"';a.set(`db.courseSettings.find(row=>row.id==='qa-course').courseName=${JSON.stringify(courseName)}`);await a.click({action:'orders-enroll'});
 assert.equal(a.read('enrollmentOverlay.draft.courseName'),courseName);assert.match(a.nodes['#modal-root'].innerHTML,/Studio &lt;spring&gt; &amp; &quot;friends&quot;/);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/Studio <spring>|&amp;lt;spring/);assert.deepEqual(a.orders.writes,[]);
});

async function enrollmentPricingApp(pricingModel,price=300.25){
 const a=await courseRosterOrderApp();await a.click({action:'orders-enroll'});a.ctx.pricingFees=[{id:'qa-fee',feeName:'Selected fee',pricingModel,price},{id:'other-fee',feeName:'Other fee',pricingModel,price:410.5}];a.set('enrollmentOverlay.draft.fees=pricingFees');
 const form=sharedForm('enrollment-order-editor');form.values={studentId:'qa-child',feeId:'qa-fee',lessonScope:'single',lesson:['qa-scoped-series:2'],amount:'0.00'};
 const control=(name,value)=>({name,value,form,isConnected:true,closest:selector=>['form','#enrollment-order-editor'].includes(selector)?form:null});
 const amount=control('amount','0.00'),suggestion={textContent:''};form.querySelector=selector=>selector==='[name=amount]'?amount:form.submitButton;a.nodes['#enrollment-order-editor [name=amount]']=amount;a.nodes['#enrollment-order-editor [data-enrollment-suggested-amount]']=suggestion;
 return {a,form,amount,suggestion,control,change(name,value){form.values[name]=value;a.change(name,value,control(name,value));}};
}

test('enrollment lesson checkboxes recalculate automatic monthly lesson prices without repainting or losing selection and focus',async()=>{
 const {a,form,amount,suggestion,control,change}=await enrollmentPricingApp('monthly-lessons');change('lessonScope','all');
 const body={scrollTop:247,scrollLeft:8};a.nodes['#enrollment-order-editor .enrollment-order-body']=body;let paints=0,html=a.nodes['#modal-root'].innerHTML;Object.defineProperty(a.nodes['#modal-root'],'innerHTML',{get:()=>html,set(value){paints++;html=value}});
 const checkbox=control('lesson','qa-scoped-series:3');checkbox.checked=false;a.ctx.document.activeElement=checkbox;form.values.lesson=['qa-scoped-series:2'];a.input(checkbox);a.change('lesson',checkbox.value,checkbox);
 assert.equal(a.read('enrollmentOverlay.draft.amountCents'),30025);assert.equal(amount.value,'300.25');assert.match(suggestion.textContent,/300\.25/);assert.deepEqual(a.read('enrollmentOverlay.draft.selectedLessonKeys'),['qa-scoped-series:2']);assert.equal(a.ctx.document.activeElement,checkbox);assert.equal(body.scrollTop,247);assert.equal(body.scrollLeft,8);assert.equal(paints,0,'Checking a lesson must leave the current checkbox and its scroll position intact');
 form.values.lesson=[];a.change('lesson',checkbox.value,checkbox);assert.equal(a.read('enrollmentOverlay.draft.amountCents'),0);assert.equal(amount.value,'0.00');assert.deepEqual(a.read('enrollmentOverlay.draft.selectedLessonKeys'),[]);assert.equal(form.submitButton.disabled,true);await a.submit(form.id,form.values,form);assert.deepEqual(a.orders.writes,[]);assert.match(a.nodes['#enrollment-order-error'].textContent,/at least one lesson/);
 form.values.lesson=['qa-scoped-series:2','qa-scoped-series:3'];a.change('lesson',checkbox.value,checkbox);assert.equal(a.read('enrollmentOverlay.draft.amountCents'),60050);assert.equal(amount.value,'600.50');assert.deepEqual(a.orders.writes,[]);
});

test('enrollment fixed monthly suggestions use only selected actual lesson dates across month boundaries',async()=>{
 const {a,form,amount,suggestion,change}=await enrollmentPricingApp('fixed-monthly',850);a.ctx.monthBoundarySchedule=scopedScheduleRecord({count:5,exceptions:[{sequence:2,overrides:{date:'2026-10-31'}},{sequence:3,overrides:{date:'2026-11-01'}},{sequence:4,overrides:{date:'2026-11-30'}},{sequence:5,overrides:{date:'2026-12-01'}}]});a.set("enrollmentOverlay.draft.source=monthBoundarySchedule;enrollmentOverlay.draft.date='2026-10-31'");change('lessonScope','all');
 assert.deepEqual(a.read('enrollmentOverlay.draft.occurrences.map(row=>row.date)'),['2026-10-31','2026-11-01','2026-11-30','2026-12-01']);
 for(const [selected,expected] of [[['qa-scoped-series:3','qa-scoped-series:4'],'850.00'],[['qa-scoped-series:2','qa-scoped-series:3'],'1700.00'],[['qa-scoped-series:4','qa-scoped-series:5'],'1700.00'],[[],'0.00']]){change('lesson',selected);assert.equal(amount.value,expected);assert.equal(a.read('enrollmentOverlay.draft.amountCents'),Number(expected)*100);assert.deepEqual(a.read('enrollmentOverlay.draft.selectedLessonKeys'),selected);assert.doesNotMatch(suggestion.textContent,/NaN|Infinity/);}
 assert.deepEqual(a.orders.writes,[]);
});

test('enrollment manual final amounts survive lesson and fee changes while the separate suggestion stays current',async()=>{
 for(const entered of ['123.45','']){
  const {a,form,amount,suggestion,control,change}=await enrollmentPricingApp('monthly-lessons');change('lessonScope','all');amount.value=entered;form.values.amount=entered;a.input(amount);
  form.values.lesson=['qa-scoped-series:3'];a.change('lesson','qa-scoped-series:2',control('lesson','qa-scoped-series:2'));assert.equal(amount.value,entered);assert.match(suggestion.textContent,/300\.25/);assert.deepEqual(a.read('enrollmentOverlay.draft.selectedLessonKeys'),['qa-scoped-series:3']);
  change('feeId','other-fee');assert.match(a.nodes['#modal-root'].innerHTML,new RegExp('name="amount"[^>]*value="'+entered.replace('.','\\.')+'"'));assert.match(a.nodes['#modal-root'].innerHTML,/Suggested amount:[\s\S]*410\.50/);assert.match(a.nodes['#modal-root'].innerHTML,/value="qa-scoped-series:2"\s*>/);assert.match(a.nodes['#modal-root'].innerHTML,/value="qa-scoped-series:3" checked/);assert.deepEqual(a.read('enrollmentOverlay.draft.selectedLessonKeys'),['qa-scoped-series:3']);assert.deepEqual(a.orders.writes,[]);
 }
});

test('enrollment saves an explicitly entered final amount with only the remaining selected lesson',async()=>{
 for(const pricingModel of ['monthly-lessons','fixed-monthly']){
  const {a,form,amount,control,change}=await enrollmentPricingApp(pricingModel);change('lessonScope','all');amount.value='123.45';form.values.amount='123.45';a.input(amount);form.values.lesson=['qa-scoped-series:3'];a.change('lesson','qa-scoped-series:2',control('lesson','qa-scoped-series:2'));
  await a.submit(form.id,form.values,form);assert.equal(a.orders.writes.length,1);assert.equal(a.orders.writes[0].payload.amountCents,12345);assert.deepEqual(a.orders.writes[0].payload.items[0].lessons,[{scheduleId:'qa-scoped-series',sequence:3,sourceVersion:1}]);
 }
});

test('enrollment rejects a manually entered amount whose cents cannot be represented safely before sending any order',async()=>{
 const {a,form,amount,control}=await enrollmentPricingApp('monthly-lessons');amount.value='1e100';form.values.amount=amount.value;a.input(amount);a.change('lesson','qa-scoped-series:2',control('lesson','qa-scoped-series:2'));assert.equal(amount.value,'1e100');
 await a.submit(form.id,form.values,form);assert.deepEqual(a.orders.writes,[]);assert.match(a.nodes['#enrollment-order-error'].textContent,/valid amount/);assert.equal(a.read('enrollmentOverlay.kind'),'editor');assert.equal(a.read('enrollmentBusy'),false);
});

test('cancelling or changing identity discards an enrollment manual amount instead of carrying it to another draft',async()=>{
 const {a,form,amount}=await enrollmentPricingApp('monthly-lessons');amount.value='123.45';form.values.amount='123.45';a.input(amount);await a.click({action:'orders-close'});assert.equal(a.read('enrollmentOverlay'),null);await a.click({action:'orders-enroll'});assert.equal(a.read('enrollmentOverlay.draft.amountEdited'),false);assert.equal(a.read('enrollmentOverlay.draft.amountCents'),30000);assert.equal(a.read('enrollmentOverlay.draft.amountInput'),'300.00');
 a.set("applySharedUser({...authUser,id:'other-enrollment-admin'})");assert.equal(a.read('enrollmentOverlay'),null);assert.doesNotMatch(a.read('modal'),/123\.45/);assert.deepEqual(a.orders.writes,[]);
});

test('enrollment range changes retain unchecked existing lessons and automatically select only newly included lessons',async()=>{
 const {a,form,amount,change}=await enrollmentPricingApp('monthly-lessons',300);change('lessonScope','all');change('lesson',[]);a.set("enrollmentOverlay.draft.source.endMode='forever'");form.values.lesson=[];form.values.lessonTo='2026-11-04';change('lessonTo','2026-11-04');
 assert.deepEqual(a.read('enrollmentOverlay.draft.selectedLessonKeys'),['qa-scoped-series:4']);assert.match(a.nodes['#modal-root'].innerHTML,/name="amount"[^>]*value="300.00"/);assert.match(a.nodes['#modal-root'].innerHTML,/value="qa-scoped-series:2"\s*>/);assert.match(a.nodes['#modal-root'].innerHTML,/value="qa-scoped-series:3"\s*>/);assert.match(a.nodes['#modal-root'].innerHTML,/value="qa-scoped-series:4" checked/);
});

test('changing enrollment fee, lesson scope or end date preserves the focused control and scrolled form body',async()=>{
 for(const field of ['feeId','lessonScope','lessonTo']){
  const a=await courseRosterOrderApp();await a.click({action:'orders-enroll'});if(field==='lessonTo')a.set("enrollmentOverlay.draft.source.endMode='forever'");const form=sharedForm('enrollment-order-editor');form.values={studentId:'qa-child',feeId:'qa-fee',lessonScope:'all',lessonTo:field==='lessonTo'?'2026-11-04':''};const value=form.values[field],original={name:field,value,form,isConnected:true,closest:selector=>['form','#enrollment-order-editor'].includes(selector)?form:null};a.ctx.document.activeElement=original;
  let body={scrollTop:219,scrollLeft:7},returned=null,focusCount=0,html=a.nodes['#modal-root'].innerHTML;a.nodes['#enrollment-order-editor .enrollment-order-body']=body;Object.defineProperty(a.nodes['#modal-root'],'innerHTML',{configurable:true,get:()=>html,set(markup){html=markup;original.isConnected=false;a.ctx.document.activeElement=a.ctx.document.body;body={scrollTop:0,scrollLeft:0};a.nodes['#enrollment-order-editor .enrollment-order-body']=body;returned={name:field,form,isConnected:true,focus(options){focusCount++;assert.equal(options?.preventScroll,true);a.ctx.document.activeElement=this}};a.nodes['#enrollment-order-editor [name='+field+']']=returned;}});
  a.change(field,value,original);assert.equal(a.ctx.document.activeElement,returned,field+' must retain keyboard position');assert.equal(focusCount,1);assert.equal(body.scrollTop,219);assert.equal(body.scrollLeft,7);assert.equal(a.read('enrollmentOverlay.draft.studentId'),'qa-child');assert.equal(a.read('enrollmentOverlay.draft.feeId'),'qa-fee');assert.equal(a.read('enrollmentOverlay.draft.scope'),'all');assert.ok(a.read('enrollmentOverlay.draft.occurrences.length')>=2);if(field==='lessonTo'){assert.equal(a.read('enrollmentOverlay.draft.to'),'2026-11-04');assert.equal(a.read('enrollmentOverlay.draft.needsEnd'),true);}assert.deepEqual(a.orders.writes,[]);
 }
});

test('a programmatic enrollment change preserves body scrolling without stealing an external focus',async()=>{
 const a=await courseRosterOrderApp();await a.click({action:'orders-enroll'});const form=sharedForm('enrollment-order-editor');form.values={studentId:'qa-child',feeId:'qa-fee',lessonScope:'all'};const external={name:'outside',closest:()=>null};a.ctx.document.activeElement=external;let body={scrollTop:183,scrollLeft:0},html=a.nodes['#modal-root'].innerHTML,focused=0;a.nodes['#enrollment-order-editor .enrollment-order-body']=body;a.nodes['#enrollment-order-editor [name=lessonScope]']={focus(){focused++}};Object.defineProperty(a.nodes['#modal-root'],'innerHTML',{configurable:true,get:()=>html,set(markup){html=markup;body={scrollTop:0,scrollLeft:0};a.nodes['#enrollment-order-editor .enrollment-order-body']=body;}});
 a.change('lessonScope','all',{form,closest:selector=>['form','#enrollment-order-editor'].includes(selector)?form:null});assert.equal(a.ctx.document.activeElement,external);assert.equal(focused,0);assert.equal(body.scrollTop,183);assert.deepEqual(a.orders.writes,[]);
});

test('late roster order and editor openings cannot replace a closed, different or revisited source lesson',async()=>{
 for(const action of ['orders-open','orders-enroll'])for(const leaving of ['close','other-lesson','back-and-return']){
  const a=await courseRosterOrderApp(),wait=deferred();if(action==='orders-open')a.client.order=()=>wait.promise;else a.client.orders=()=>wait.promise;
  const pending=a.click({action,orderId:'qa-order'});
  if(leaving==='close')await a.click({action:'lesson-close'});
  else if(leaving==='other-lesson')await a.click({openLesson:'qa-scoped-series',lessonKind:'schedule',lessonDate:'2026-10-28',lessonSequence:'3'});
  else{a.set("location.pathname='/account'");for(const handler of a.windowEvents.popstate||[])await handler();a.set("location.pathname='/account/courses/qa-course';render()");}
  const selection=a.read('selectedTimetableLesson'),modal=a.read('modal');wait.resolve(action==='orders-open'?{order:a.orders.remote.orders[0]}:{orders:copy(a.orders.remote.orders),revision:'late-preflight'});await pending;
  assert.equal(a.read('enrollmentOverlay'),null);assert.deepEqual(a.read('selectedTimetableLesson'),selection);assert.equal(a.read('modal'),modal,'A late opening cannot restore or replace a newer source dialog');assert.deepEqual(a.orders.writes,[]);
 }
});

test('saved enrollment retains its lesson return while busy close is guarded and changed source invalidates detached replies',async()=>{
 for(const invalidated of [false,true]){
  const a=await courseRosterOrderApp(),wait=deferred();await a.click({action:'orders-enroll'});a.client.createOrder=()=>wait.promise;
  const form=sharedForm('enrollment-order-editor');form.values={studentId:'qa-child',feeId:'qa-fee',lessonScope:'single',lesson:['qa-scoped-series:2'],amount:'300.00'};const pending=a.submit(form.id,form.values,form);assert.equal(a.read('enrollmentBusy'),true);await a.click({action:'orders-close'});a.keydown('Escape');assert.equal(a.read('enrollmentOverlay.kind'),'editor');
  if(invalidated){a.remote.rows=[scopedScheduleRecord({version:2,exceptions:[{sequence:2,cancelled:true}]})];a.remote.revision++;await a.set('refreshSharedSchedules()');assert.equal(a.read('enrollmentOverlay'),null);}
  wait.resolve({order:orderUiRecord({id:'created-enrollment'})});await pending;
  if(invalidated){assert.equal(a.read('enrollmentOverlay'),null);assert.equal(a.read('selectedTimetableLesson'),null);assert.equal(a.read('modal'),'');}
  else{assert.equal(a.read('enrollmentOverlay.kind'),'details');await a.click({action:'orders-close'});assert.deepEqual(a.read('selectedTimetableLesson'),a.selection);assert.ok(a.read('courseLessonReturn'));}
 }
});
test('a roster PDF preview returns through its order and a revoked teacher source cannot restore the old roster',async()=>{
 const a=await courseRosterOrderApp('admin',{preview:true,initialQuerySelectorAll:()=>[]});await a.click({action:'orders-open',orderId:'qa-order'});await a.click({action:'ui-order-document'});assert.match(a.nodes['#modal-root'].innerHTML,/Order document layout preview/);
 await a.click({action:'ui-operations',uiCommand:'close'});assert.equal(a.read('enrollmentOverlay.kind'),'details');assert.match(a.nodes['#modal-root'].innerHTML,/Order details/);await a.click({action:'orders-close'});assert.deepEqual(a.read('selectedTimetableLesson'),a.selection);assert.deepEqual(a.orders.writes,[]);
 const teacher=await courseRosterOrderApp('teacher');await teacher.click({action:'orders-open',orderId:'qa-order'});teacher.client.schedules=async()=>({revision:'revoked-course-source',readScope:'occurrences',occurrences:[]});await teacher.set('refreshSharedSchedules()');assert.equal(teacher.read('enrollmentOverlay'),null);assert.equal(teacher.read('courseLessonReturn'),null);assert.equal(teacher.read('selectedTimetableLesson'),null);assert.equal(teacher.read('modal'),'');
});
test('returning after a saved enrollment starts a fresh roster read and ignores an older failed poll',async()=>{
 const a=await courseRosterOrderApp(),old=deferred();a.client.lessonStudents=()=>old.promise;const pending=a.set('refreshLessonStudents()');await a.click({action:'orders-enroll'});a.client.createOrder=async()=>({order:orderUiRecord({id:'new-draft'})});
 const form=sharedForm('enrollment-order-editor');form.values={studentId:'qa-child',feeId:'qa-fee',lessonScope:'single',lesson:['qa-scoped-series:2'],amount:'300.00'};await a.submit(form.id,form.values,form);
 let freshReads=0;a.client.lessonStudents=async()=>{freshReads++;return {...copy(a.roster),students:[{...copy(a.roster.students[0]),displayName:'Fresh roster child'}]}};await a.click({action:'orders-close'});for(let turn=0;turn<20;turn++)await Promise.resolve();
 try{assert.equal(freshReads,1,'A stale in-flight roster read must not block the post-save source refresh');assert.match(a.nodes['#modal-root'].innerHTML,/Fresh roster child/);}
 finally{old.reject(serviceError(503,'SERVICE_UNAVAILABLE'));await pending;}
 assert.match(a.nodes['#modal-root'].innerHTML,/Fresh roster child/);assert.equal(a.read("lessonStudentCaches.get('qa-scoped-series:2').error"),'');assert.deepEqual(a.read('selectedTimetableLesson'),a.selection);
});

test('shared enrollment UI saves a draft then explicitly sends, receives parent confirmation and separately verifies payment',async()=>{const remote=orderUiClient(),a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1},remote.client);a.set("openTimetableLesson('qa-schedule','schedule','2026-10-08',1)");await a.click({action:'orders-enroll'});assert.match(a.nodes['#modal-root'].innerHTML,/Enroll student · New order/);assert.equal(a.read('enrollmentOverlay.draft.occurrences.length'),1);const form=sharedForm('enrollment-order-editor');form.values={studentId:'qa-child',feeId:'qa-fee',lessonScope:'single',lesson:['qa-schedule:1'],amount:'280.00'};await a.submit(form.id,form.values,form);assert.equal(remote.writes.length,1);assert.equal(remote.writes[0].action,'create');assert.equal(remote.writes[0].payload.amountCents,28000);assert.equal(remote.remote.orders[0].paymentStatus,'draft');assert.match(a.nodes['#modal-root'].innerHTML,/Send to parent/);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/Confirm verified payment/);await a.click({action:'orders-send'});assert.deepEqual(remote.writes.map(row=>row.action),['create','send']);assert.equal(remote.remote.orders[0].paymentStatus,'awaiting-confirmation');await a.click({action:'orders-close'});a.set("applySharedUser({id:'qa-parent',role:'student',displayName:'QA Parent'});tab='payments';render()");await a.click({action:'orders-open',orderId:'qa-order'});await a.click({action:'orders-respond',response:'confirm'});assert.equal(remote.remote.orders[0].paymentStatus,'awaiting-payment');assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/Confirm verified payment/);await a.click({action:'orders-close'});a.set("applySharedUser({id:'qa-admin-again',role:'admin',displayName:'QA Admin'});tab='new-enrolments';render()");await a.click({action:'orders-open',orderId:'qa-order'});assert.match(a.nodes['#modal-root'].innerHTML,/Confirm verified payment/);await a.click({action:'orders-confirm-payment'});assert.deepEqual(remote.writes.map(row=>row.action),['create','send','respond','paid']);assert.equal(remote.remote.orders[0].paymentStatus,'paid');assert.equal(remote.writes[3].version,3);});

test('shared own student timetable replaces legacy bookings and updates the same stable occurrence in month and range views',async()=>{let lessons=[{id:'student-session',studentId:'qa-child',studentName:'QA Child',courseName:'Shared studio',scheduleId:'qa-schedule',sequence:2,date:'2026-10-16',time:'14:00',duration:60,teachers:[{displayName:'Teaching artist'}],rooms:[{displayName:'Studio A'}],attendance:'unmarked'}],reads=[];const a=await sharedApp({studentTimetable:async(range,since)=>{reads.push({range:copy(range),since});return {lessons:copy(lessons),students:[{id:'qa-child',displayName:'QA Child'}],revision:'student-'+lessons[0].time}}});a.set("applySharedUser({id:'qa-parent',role:'student',displayName:'QA Parent'});calendarMonth=new Date(2026,9,1);tab='overview';render()");await a.set('refreshStudentTimetable()');assert.match(a.nodes['#app'].innerHTML,/Shared studio/);assert.match(a.nodes['#app'].innerHTML,/14:00/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/David Leung|Ryan Yu/);assert.equal(a.read('db.schedules.length'),0);assert.deepEqual(a.read('studentTimetableCache.lessons.map(row=>[row.scheduleId,row.sequence])'),[['qa-schedule',2]]);lessons[0]={...lessons[0],date:'2026-10-17',time:'15:00'};await a.set('refreshStudentTimetable()');assert.match(a.nodes['#app'].innerHTML,/15:00/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/14:00/);a.set("calendarView='range';calendarStart='2026-10-16';render()");await a.set('refreshStudentTimetable()');assert.match(a.nodes['#app'].innerHTML,/tt-student-range-groups/);assert.match(a.nodes['#app'].innerHTML,/15:00/);assert.ok(reads.every(row=>row.range.from&&row.range.to));assert.equal(a.read('db.bookings.length'),4,'Shared reads must not rewrite legacy demonstration bookings');});

test('a paid shared roster exposes canonical review entries while final business actions remain separate',async()=>{const remote=orderUiClient({orders:[orderUiRecord({paymentStatus:'paid',orderStatus:'parent-confirmed'})],students:[],links:[]}),a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1},{...remote.client,lessonStudents:async(id,sequence)=>{assert.equal(id,'qa-schedule');assert.equal(sequence,1);return {students:[{id:'qa-session',studentId:'qa-child',displayName:'QA Child',orderId:'qa-order',paymentStatus:'paid',attendance:'unmarked',remark:''}],occupied:1,capacity:8}}},{preview:true,initialQuerySelectorAll:()=>[]});a.set("openTimetableLesson('qa-schedule','schedule','2026-10-08',1)");await a.set('refreshLessonStudents()');assert.match(a.nodes['#modal-root'].innerHTML,/<h3>Students \(1\)<\/h3>/);assert.match(a.nodes['#modal-root'].innerHTML,/QA Child/);assert.match(a.nodes['#modal-root'].innerHTML,/data-order-id="qa-order"/);for(const view of ['attendance','arrange']){const entry=a.nodes['#modal-root'].innerHTML.match(new RegExp('<button[^>]*data-ui-view="'+view+'"[^>]*>'))?.[0];assert.ok(entry,'The roster keeps the '+view+' entry visible');assert.doesNotMatch(entry,/\bdisabled\b/,'Ready canonical roster entries may open the readonly workflow');}await a.click({action:'orders-open',orderId:'qa-order'});assert.match(a.nodes['#modal-root'].innerHTML,/Shared studio/);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/data-action="orders-confirm-payment"/);});

test('duplicate payment clicks stay one request and a timed out retry keeps its immutable operation key and opened version',async()=>{const remote=orderUiClient({orders:[orderUiRecord({orderStatus:'parent-confirmed',paymentStatus:'awaiting-payment',version:5})],students:[],links:[]}),wait=deferred(),a=await sharedApp(remote.client);let calls=[];a.client.confirmOrderPayment=async(current,key)=>{calls.push({version:current.version,key});return wait.promise};await a.click({action:'orders-open',orderId:'qa-order'});const first=a.click({action:'orders-confirm-payment'});await a.click({action:'orders-confirm-payment'});assert.equal(calls.length,1);assert.equal(a.read('enrollmentBusy'),true);wait.reject(serviceError(0,'connection_failed'));await first;assert.equal(a.read('enrollmentBusy'),false);a.client.confirmOrderPayment=async(current,key)=>{calls.push({version:current.version,key});return {order:orderUiRecord({orderStatus:'parent-confirmed',paymentStatus:'paid',version:6})}};await a.click({action:'orders-confirm-payment'});assert.equal(calls.length,2);assert.equal(calls[1].key,calls[0].key);assert.equal(calls[1].version,5);assert.equal(a.read('enrollmentOverlay.order.paymentStatus'),'paid');});

test('the student request host refreshes on current loading, ready, error and recovery without accepting old window or identity replies',async()=>{
 const a=await sharedApp(),first=deferred();a.ctx.requestRefreshEvents=[];a.set("applySharedUser({id:'qa-request-parent',role:'student',displayName:'Test family'});tab='payments';calendarMonth=new Date(2026,9,1);interfacePreview={clear(){},refreshSharedStudentRequest(){requestRefreshEvents.push({ready:studentTimetableCache.ready,error:studentTimetableCache.error,key:studentTimetableCache.key,students:studentTimetableCache.students.map(row=>row.id)})}};modal='existing request overlay'");a.client.studentTimetable=()=>first.promise;const initial=a.set('refreshStudentTimetable({paint:false})');assert.deepEqual(a.read('requestRefreshEvents.map(row=>row.ready)'),[false]);first.resolve({lessons:[],students:[{id:'qa-child',displayName:'Current child'}],revision:'current-1'});await initial;assert.equal(a.read('requestRefreshEvents.at(-1).ready'),true);assert.deepEqual(a.read('requestRefreshEvents.at(-1).students'),['qa-child']);
 a.client.studentTimetable=async()=>{throw serviceError(503,'SERVICE_UNAVAILABLE')};await a.set('refreshStudentTimetable({paint:false})');assert.ok(a.read('requestRefreshEvents.at(-1).error'));a.client.studentTimetable=async()=>({unchanged:true});let count=a.read('requestRefreshEvents.length');await a.set('refreshStudentTimetable({paint:false})');assert.equal(a.read('requestRefreshEvents.length'),count+1);assert.equal(a.read('requestRefreshEvents.at(-1).ready'),true);assert.equal(a.read('requestRefreshEvents.at(-1).error'),'');count=a.read('requestRefreshEvents.length');await a.set('refreshStudentTimetable({paint:false})');assert.equal(a.read('requestRefreshEvents.length'),count+1,'A current unchanged response may re-enable an already open request');
 const oldWindow=deferred(),currentWindow=deferred();a.client.studentTimetable=()=>oldWindow.promise;a.set('calendarMonth=new Date(2026,10,1)');const oldRead=a.set('refreshStudentTimetable({paint:false})');assert.equal(a.read('requestRefreshEvents.at(-1).ready'),false);a.client.studentTimetable=()=>currentWindow.promise;a.set('calendarMonth=new Date(2026,11,1)');const currentRead=a.set('refreshStudentTimetable({paint:false})');count=a.read('requestRefreshEvents.length');oldWindow.resolve({lessons:[],students:[{id:'old-window-child'}],revision:'old-window'});await oldRead;assert.equal(a.read('requestRefreshEvents.length'),count);currentWindow.resolve({lessons:[],students:[{id:'current-window-child'}],revision:'current-window'});await currentRead;assert.deepEqual(a.read('requestRefreshEvents.at(-1).students'),['current-window-child']);
 const oldIdentity=deferred();a.client.studentTimetable=()=>oldIdentity.promise;const identityRead=a.set('refreshStudentTimetable({paint:false})');a.set("applySharedUser({id:'other-parent',role:'student',displayName:'Other family'})");count=a.read('requestRefreshEvents.length');oldIdentity.reject(serviceError(503,'SERVICE_UNAVAILABLE'));await identityRead;assert.equal(a.read('requestRefreshEvents.length'),count);assert.equal(a.read('studentTimetableCache.error'),'');assert.deepEqual(a.read('studentTimetableCache.students'),[]);
});

test('old identity order replies and student timetable reads cannot populate a newly signed in account',async()=>{const old=deferred(),remote=orderUiClient({orders:[orderUiRecord()],students:[],links:[]}),a=await sharedApp({...remote.client,order:()=>old.promise});const pending=a.click({action:'orders-open',orderId:'qa-order'});a.set("applySharedUser({id:'new-student',role:'student',displayName:'New family'});tab='payments';render()");const before=a.nodes['#modal-root']?.innerHTML||'';old.resolve({order:orderUiRecord({studentName:'Old private family'})});await pending;assert.equal(a.nodes['#modal-root']?.innerHTML||'',before);assert.equal(a.read('enrollmentOverlay'),null);const read=deferred();a.client.studentTimetable=()=>read.promise;a.set("tab='overview';calendarMonth=new Date(2026,9,1)");const timetable=a.set('refreshStudentTimetable()');a.set("applySharedUser({id:'another-student',role:'student',displayName:'Another family'});tab='payments';render()");read.resolve({revision:'old',lessons:[{id:'old',studentName:'Old private family',courseName:'Private course'}]});await timetable;assert.deepEqual(a.read('studentTimetableCache.lessons'),[]);assert.doesNotMatch(a.nodes['#app'].innerHTML,/Old private family|Private course/);});

test('an older order list read cannot replace an acknowledged sent order with its former draft',async()=>{const remote=orderUiClient({orders:[orderUiRecord()],students:[],links:[]}),a=await sharedApp(remote.client);await a.click({action:'orders-open',orderId:'qa-order'});const old=deferred();a.client.orders=()=>old.promise;const pending=a.set('refreshEnrollmentOrders({paint:false})');await a.click({action:'orders-send'});assert.equal(a.read('enrollmentCache.orders[0].orderStatus'),'sent');old.resolve({orders:[orderUiRecord()],revision:'old-draft'});await pending;assert.equal(a.read('enrollmentCache.orders[0].orderStatus'),'sent');assert.equal(a.read('enrollmentCache.orders[0].version'),2);});

test('a successful scoped order refresh closes a revoked student order even while its private details modal is open',async()=>{const remote=orderUiClient({orders:[orderUiRecord({studentName:'Revoked private child',orderStatus:'sent',paymentStatus:'awaiting-confirmation'})],students:[],links:[]}),a=await sharedApp(remote.client);a.set("applySharedUser({id:'qa-parent',role:'student',displayName:'QA Parent'});tab='payments';render()");await a.click({action:'orders-open',orderId:'qa-order'});assert.match(a.nodes['#modal-root'].innerHTML,/Revoked private child/);a.set("studentTimetableCache={lessons:[{studentName:'Revoked private child'}],students:[],revision:'private-old',key:'old',ready:true,error:''}");remote.remote.orders=[];await a.set('refreshEnrollmentOrders()');assert.equal(a.read('enrollmentOverlay'),null);assert.equal(a.read('modal'),'');assert.deepEqual(a.read('studentTimetableCache.lessons'),[]);assert.doesNotMatch(a.nodes['#app'].innerHTML+a.nodes['#modal-root'].innerHTML,/Revoked private child/);assert.equal(a.read('enrollmentCache.orders.length'),0);});

test('administrator can explicitly revoke an existing student login link using Not linked and its opened version',async()=>{const remote=orderUiClient({orders:[],students:[{id:'qa-child',displayName:'QA Child'}],links:[{studentId:'qa-child',userId:'qa-parent',version:4}]}),a=await sharedApp(remote.client),writes=[];a.client.saveStudentAccountLink=async(...args)=>{writes.push(args);remote.remote.links=[{studentId:'qa-child',userId:null,version:5}];return {link:copy(remote.remote.links[0]),revision:'unlinked'}};a.set("tab='new-enrolments';render()");await a.set('refreshEnrollmentOrders({paint:false,links:true})');const button={disabled:false},error={textContent:''},form={dataset:{studentId:'qa-child',version:'4'},values:{userId:''},isConnected:true,querySelector:selector=>selector==='button'?button:error};a.ctx.unlinkForm=form;await a.set('saveStudentAccountLink(unlinkForm)');assert.equal(writes.length,1);assert.deepEqual(writes[0].slice(0,3),['qa-child',null,4]);assert.ok(writes[0][3]);assert.equal(error.textContent,'');assert.equal(button.disabled,false);});

test('open parent order details adopts a newer verified payment on polling while a service failure retains the last authorized details',async()=>{const remote=orderUiClient({orders:[orderUiRecord({orderStatus:'parent-confirmed',paymentStatus:'awaiting-payment',version:3})],students:[],links:[]}),a=await sharedApp(remote.client);a.set("applySharedUser({id:'qa-parent',role:'student',displayName:'QA Parent'});tab='payments';render()");await a.click({action:'orders-open',orderId:'qa-order'});remote.remote.orders[0]={...remote.remote.orders[0],paymentStatus:'paid',version:4};await a.set('refreshEnrollmentOrders()');assert.equal(a.read('enrollmentOverlay.order.paymentStatus'),'paid');assert.equal(a.read('enrollmentOverlay.order.version'),4);assert.match(a.nodes['#modal-root'].innerHTML,/Parent confirmed · Paid/);a.client.orders=async()=>{throw serviceError(503,'SERVICE_UNAVAILABLE')};await a.set('refreshEnrollmentOrders()');assert.equal(a.read('enrollmentOverlay.order.paymentStatus'),'paid');assert.match(a.nodes['#modal-root'].innerHTML,/QA Child/);});


test('interface-first pages replace blank product accounting and staff views with complete preview screens',async()=>{
 const a=app({},undefined,false,null,{preview:true,initialQuerySelectorAll:()=>[]});a.set("role='teacher';lang='en';location.pathname='/account';tab='products';render()");assert.match(a.nodes['#app'].innerHTML,/Create product/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/ops-preview-note|Interface preview/);
 await a.click({action:'ui-operations',uiCommand:'create-product',uiSection:'products'});assert.match(a.nodes['#modal-root'].innerHTML,/ui-operations-form/);await a.click({action:'ui-operations',uiCommand:'close'});assert.equal(a.nodes['#modal-root'].innerHTML,'');
 a.set("tab='accounting';render()");assert.match(a.nodes['#app'].innerHTML,/Invoices/);a.set("tab='management';render()");assert.match(a.nodes['#app'].innerHTML,/Maya Lam/);assert.match(a.nodes['#app'].innerHTML,/View profile/);await a.click({action:'ui-staff',uiCommand:'open-detail',uiId:'leo'});assert.match(a.nodes['#modal-root'].innerHTML,/Permissions/);await a.click({action:'ui-staff',uiCommand:'close-dialog'});
 a.set("tab='settings';render()");assert.match(a.nodes['#app'].innerHTML,/News management/);a.set("tab='teacher-home';render()");assert.match(a.nodes['#app'].innerHTML,/My workspace/);assert.match(a.nodes['#app'].innerHTML,/To-do/);
});
test('interface-first family and course file tools open previews without creating business records',async()=>{
 const a=app({},undefined,false,null,{preview:true,initialQuerySelectorAll:()=>[]});a.set("role='student';lang='en';location.pathname='/account';tab='overview';render()");assert.match(a.nodes['#app'].innerHTML,/Family members/);
 const before=a.read('db.bookings');await a.click({action:'ui-lesson',uiCommand:'launch',uiView:'family'});assert.match(a.nodes['#modal-root'].innerHTML,/Add Family Member/);await a.click({action:'ui-lesson',uiCommand:'close'});assert.deepEqual(a.read('db.bookings'),before);
 a.set("role='teacher';tab='catalog';render()");assert.match(a.nodes['#app'].innerHTML,/data-action="ui-data-tools"/);await a.click({action:'ui-data-tools',uiCommand:'launch',uiView:'import',uiSection:'courses'});assert.match(a.nodes['#modal-root'].innerHTML,/Import courses/);
});


test('student calendar actions carry the chosen lesson rather than silently taking the first lesson',async()=>{
 const a=app({},undefined,false,null,{preview:true,initialQuerySelectorAll:()=>[]});
 a.set("role='student';lang='en';location.pathname='/account';tab='overview';db.bookings=[{...db.bookings[0],id:'calendar-first',classId:'a',studentId:'demo',student:db.student.name,paid:true,status:'confirmed'},{...db.bookings[0],id:'calendar-chosen',classId:'b',studentId:'demo',student:db.student.name,paid:true,status:'confirmed'}];calendarMonth=new Date(2026,9,1);render()");
 const first=a.read("db.bookings[1]"),date=a.read(`bookingLessonDates(db.bookings.find(row=>row.id===${JSON.stringify('calendar-chosen')}))[0]`);
 a.set(`calendarMonth=new Date('${date}T12:00:00');render()`);
 assert.match(a.nodes['#app'].innerHTML,/calendar-event-button/);
 await a.click({action:'ui-lesson',uiCommand:'launch',uiView:'student-request',uiId:first.id,uiDate:date});
 assert.match(a.nodes['#modal-root'].innerHTML,new RegExp(date));assert.match(a.nodes['#modal-root'].innerHTML,/14:00/);assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/10:00/);assert.match(a.nodes['#modal-root'].innerHTML,/Request Rescheduling/);
 await a.click({action:'ui-lesson',uiCommand:'close'});
 await a.click({action:'ui-lesson',uiCommand:'launch',uiView:'student-request',uiId:'not-my-lesson',uiDate:date});assert.equal(a.nodes['#modal-root'].innerHTML,'');
});


test('interface-first student pages, notifications and public trial entry are reachable without business writes',async()=>{
 const a=app({},undefined,false,null,{preview:true,initialQuerySelectorAll:()=>[]});
 a.set("role='student';lang='en';location.pathname='/account';tab='student-profile';render()");assert.match(a.nodes['#app'].innerHTML,/Student profile/);assert.match(a.nodes['#app'].innerHTML,/My requests/);
 const before=a.read('db.bookings');a.set("tab='student-requests';render()");assert.match(a.nodes['#app'].innerHTML,/Request to Pay/);
 await a.click({action:'ui-student',uiCommand:'request-payment'});assert.match(a.nodes['#modal-root'].innerHTML,/ui-student-form/);await a.click({action:'ui-student',uiCommand:'close'});
 a.set("tab='notifications';render()");assert.match(a.nodes['#app'].innerHTML,/System notifications/);assert.match(a.nodes['#app'].innerHTML,/Messages from teachers/);
 a.set("role='teacher';tab='notifications';render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,/Current student|Family members/);
 a.set("role='';location.pathname='/join';document.querySelector('#app').innerHTML=sharedTrialUnavailable()");assert.match(a.nodes['#app'].innerHTML,/Explore courses/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-ui-view="trial-application"/);
 await a.click({action:'ui-account-actions',uiCommand:'launch',uiView:'trial-application'});assert.match(a.nodes['#modal-root'].innerHTML,/Trial application/);assert.deepEqual(a.read('db.bookings'),before);
});


test('permanent order PDF preview returns to its order without sending or changing payment',async()=>{
 const remote=orderUiClient({orders:[orderUiRecord({orderStatus:'parent-confirmed',paymentStatus:'awaiting-payment',version:3})]}),a=await sharedApp(remote.client,{}, {preview:true,initialQuerySelectorAll:()=>[]});
 a.set("tab='new-enrolments';lang='en';render()");await a.click({action:'orders-open',orderId:'qa-order'});assert.match(a.nodes['#modal-root'].innerHTML,/PDF Receipt/);
 await a.click({action:'ui-order-document'});assert.match(a.nodes['#modal-root'].innerHTML,/Order document layout preview/);assert.match(a.nodes['#modal-root'].innerHTML,/Order version 3/);
 await a.click({action:'ui-operations',uiCommand:'close'});assert.match(a.nodes['#modal-root'].innerHTML,/Order details/);assert.match(a.nodes['#modal-root'].innerHTML,/Confirm verified payment/);assert.deepEqual(remote.writes,[]);assert.equal(remote.remote.orders[0].paymentStatus,'awaiting-payment');
});
test('student sidebar clicks reach each new profile request notification and information page',async()=>{
 const a=app({},undefined,false,null,{preview:true,initialQuerySelectorAll:()=>[]});a.set("role='student';lang='en';location.pathname='/account';tab='overview';render()");
 for(const [tab,section] of [['student-profile','profile'],['student-requests','requests'],['notifications','notifications'],['student-information','information']]){
  await a.click({tab});assert.equal(a.read('tab'),tab);assert.match(a.nodes['#app'].innerHTML,new RegExp(`data-student-section="${section}"`));
 }
 await a.click({tab:'management'});assert.equal(a.read('tab'),'student-information','Private staff sections remain outside student navigation');
});


test('daily timetable excludes setup and demonstration shortcuts while Settings retains the real setup flows',async()=>{
 const a=await sharedApp({schedulingResources:async()=>({resources:[],revision:'rooms-v1'}),classTypes:async()=>({types:[],revision:'types-v1'}),createClassType:async()=>{},updateClassType:async()=>{}},{},{preview:true,initialQuerySelectorAll:()=>[]});
 for(const language of ['zh','en']){a.set(`lang='${language}';tab='overview';render()`);const html=a.nodes['#app'].innerHTML;assert.match(html,/data-action="tt-add-schedule"/);assert.doesNotMatch(html,/data-action="(?:resource-open|access-open|class-types-open)"|interface-preview-tools|Interface preview|介面預覽/);}
 a.set("tab='settings';render()");assert.match(a.nodes['#app'].innerHTML,/Scheduling settings/);assert.match(a.nodes['#app'].innerHTML,/data-action="resource-open"/);assert.match(a.nodes['#app'].innerHTML,/data-action="class-types-open"/);
 await a.click({action:'resource-open'});assert.match(a.nodes['#modal-root'].innerHTML,/scheduling-resource-search/);await a.click({action:'resource-close'});
 await a.click({action:'class-types-open'});assert.match(a.nodes['#modal-root'].innerHTML,/id="class-types-manager"/);
});


test('administrator login account setup remains reachable in Staff after removing timetable setup actions',async()=>{
 const a=await sharedApp({schedulingResources:async()=>({resources:[],revision:'rooms-v1'}),accessControl:async()=>({accounts:[],teacherLinks:[],grants:[],revision:'access-v1'})},{},{preview:true,initialQuerySelectorAll:()=>[]});
 a.set("lang='en';tab='management';render()");assert.match(a.nodes['#app'].innerHTML,/Login account settings/);
 await a.click({action:'access-open'});assert.match(a.nodes['#modal-root'].innerHTML,/id="access-control-title"/);for(let turn=0;turn<20&&!a.read('teacherAccessReady');turn++)await Promise.resolve();assert.equal(a.read('teacherAccessReady'),true);await a.click({action:'access-close'});
 a.set("applySharedUser({id:'scoped-teacher',role:'teacher',displayName:'Teacher'});tab='management';render()");assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-action="access-open"/);
});

test('the shared staff projection uses current resource and authorized occurrence identities',()=>{
 const a=app({},'2026-10-15T12:00:00',false,null,{preview:true});
 assert.equal(a.read('sharedStaffSnapshot()'),null);
 a.set("sharedMode=true;authUser={id:'leo-login',role:'teacher',displayName:'Current Leo'};sharedCatalogRevision='catalog';resourceRevision='resources';resourceReady=true;sharedSchedulesRevision='schedules';sharedSchedulingResources=[{id:'leo-resource',kind:'teacher',displayName:'Current Leo',active:true}];db.courseSettings=[{id:'live-course',courseName:'Current painting'}];sharedScheduleOccurrences=[{sequence:2,date:'2026-10-16',item:{id:'live-schedule',course:'live-course',time:'10:00',duration:60,teacherIds:['leo-resource'],roomIds:[],capacity:8}}];db.schedules=[{id:'private-unassigned-series'}]");
 assert.deepEqual(a.read('sharedStaffSnapshot().occurrences.map(row=>[row.item.id,row.sequence])'),[['live-schedule',2]]);
 assert.equal(a.read('sharedStaffSnapshot().user.id'),'leo-login');
 assert.equal(a.read('sharedStaffSnapshot().ready'),true);
 a.set("sharedScheduleOccurrences[0].item.time='11:00'");
 assert.equal(a.read('sharedStaffSnapshot().occurrences[0].item.time'),'11:00');
 a.set("applySharedUser({id:'other-login',role:'teacher',displayName:'Other teacher',accessRevision:'new'})");
 assert.deepEqual(a.read('sharedStaffSnapshot().occurrences'),[]);
 assert.equal(a.read('sharedStaffSnapshot().ready'),false);
});

test('profile-only shared student changes redraw the family page without changing lessons',async()=>{
 let displayName='Original child';
 const a=await sharedApp({studentTimetable:async()=>({lessons:[],students:[{id:'same-person',displayName,email:'same@example.test'}],revision:displayName})},{},{preview:true,initialQuerySelectorAll:()=>[]});
 a.set("applySharedUser({id:'same-login',role:'student',displayName:'Family login'});tab='student-profile';location.pathname='/account';lang='en';render()");
 await a.set('refreshStudentTimetable()');
 assert.match(a.nodes['#app'].innerHTML,/Original child/);
 displayName='Updated child';await a.set('refreshStudentTimetable()');
 assert.match(a.nodes['#app'].innerHTML,/Updated child/);
 assert.doesNotMatch(a.nodes['#app'].innerHTML,/Original child|Ethan Ho|Creative drawing/);
});

test('editing a shared staff profile opens the actual resource editor and updates the common directory',async()=>{
 const teacher=schedulingResource('actual-teacher','teacher','Original teacher'),remote={resources:[teacher],revision:1};
 const a=await resourceUiApp(remote,{accessControl:async()=>({accounts:[],teacherLinks:[],grants:[],revision:'actual-links'})},{preview:true});
 a.set("tab='management';sharedCatalogRevision='actual-catalog';render()");await a.set('refreshTeacherAccess({paint:false})');a.set('render()');
 await a.click({action:'ui-staff',uiCommand:'open-edit',uiId:'actual-teacher'});
 assert.match(a.nodes['#modal-root'].innerHTML,/id="scheduling-resource-editor"/);
 assert.equal(a.read('resourceDraft.current.id'),'actual-teacher');
 const form=resourceEditorForm(a,{displayName:'Updated teacher'});await a.submit(form.id,form.values,form);
 assert.equal(remote.resources[0].id,'actual-teacher');assert.equal(remote.resources[0].displayName,'Updated teacher');
 assert.equal(a.read('resourceManager'),null);assert.equal(a.read('modal'),'');
 a.set('render()');assert.match(a.nodes['#app'].innerHTML,/Updated teacher/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/Original teacher|Maya Lam|Leo Chan/);
});

test('staff source failures show a real retry which refetches the catalog, schedules and access',async()=>{
 for(const source of ['catalog','schedules','resources','access']){
  const a=await resourceUiApp({resources:[schedulingResource('staff-read','teacher','Actual staff')],revision:1},{accessControl:async()=>({accounts:[],teacherLinks:[],grants:[],revision:'links'})},{preview:true});
  a.set("tab='management';lang='en';sharedCatalogRevision='catalog';teacherAccessReady=true;render()");
  const fail=async()=>{throw new Error('Private upstream error')};
  if(source==='catalog'){a.client.catalog=fail;a.set("sharedCatalogRevision=''");await a.set('refreshSharedCourses()');}
  if(source==='schedules'){a.client.schedules=fail;a.set("sharedSchedulesRevision=''");await a.set('refreshSharedSchedules()');}
  if(source==='resources'){a.client.schedulingResources=fail;a.set('resourceReady=false');await a.set('refreshSharedResources()');}
  if(source==='access'){a.client.accessControl=fail;a.set('teacherAccessReady=false');await a.set('refreshTeacherAccess()');}
  a.set('render()');const snapshot=a.read('sharedStaffSnapshot()'),html=a.nodes['#app'].innerHTML;
  assert.ok(snapshot.error,source);assert.equal(snapshot.loading,false,source);assert.match(html,/Retry/);assert.doesNotMatch(html,/Private upstream error|Loading staff|No staff yet/);
  const reads=[];a.client.catalog=async()=>{reads.push('catalog');return {courses:[],fees:[],revision:'retry-catalog'}};
  a.client.schedulingResources=async()=>{reads.push('resources');return {resources:[schedulingResource('staff-read','teacher','Actual staff')],revision:'retry-resources'}};
  a.client.schedules=async()=>{reads.push('schedules');return {schedules:[],revision:'retry-schedules'}};
  a.client.accessControl=async()=>{reads.push('access');return {accounts:[],teacherLinks:[],grants:[],revision:'retry-access'}};
  await a.click({action:'ui-staff',uiCommand:'retry'});
  for(let turn=0;turn<30&&a.read('!!sharedStaffRetry');turn++)await Promise.resolve();
  assert.deepEqual([...reads].sort(),['access','catalog','resources','schedules']);
  assert.equal(a.read('sharedStaffSnapshot().error'),'');assert.equal(a.read('sharedStaffSnapshot().loading'),false);assert.equal(a.read('sharedStaffSnapshot().ready'),true);
 }
});

test('shared staff cancel and saved acknowledgement return to the exact second teacher teaching tab',async()=>{
 for(const save of [false,true]){
  const remote={resources:[schedulingResource('first-staff','teacher','First teacher'),schedulingResource('second-staff','teacher','Second teacher')],revision:1};
  const a=await resourceUiApp(remote,{accessControl:async()=>({accounts:[],teacherLinks:[],grants:[],revision:'links'})},{preview:true});
  a.set("tab='management';sharedCatalogRevision='catalog';teacherAccessReady=true;render()");
  await a.click({action:'ui-staff',uiCommand:'open-detail',uiId:'second-staff'});
  await a.click({action:'ui-staff',uiCommand:'detail-tab',uiId:'second-staff',uiTab:'teaching'});
  await a.click({action:'ui-staff',uiCommand:'open-edit',uiId:'second-staff'});
  assert.equal(a.read('resourceDraft.current.id'),'second-staff');
  if(save){const form=resourceEditorForm(a,{displayName:'Second teacher saved'});a.client.schedulingResources=async()=>{throw new Error('Offline after accepted save')};await a.submit(form.id,form.values,form);for(let turn=0;turn<10;turn++)await Promise.resolve();}
  else await a.click({action:'resource-editor-cancel'});
  const html=a.read('modal');assert.match(html,save?/Second teacher saved/:/Second teacher/);assert.match(html,/data-ui-tab="teaching" aria-current="page"/);assert.doesNotMatch(html,/First teacher|scheduling-resource-editor/);
  assert.equal(a.read('resourceDraft'),null);assert.equal(a.resourceCalls.length,save?1:0);
 }
});

test('individual staff access opens the exact linked teacher and returns to that person without permission writes',async()=>{
 const remote={teacherLinks:[{teacherResourceId:'access-teacher-resource',userId:'access-artist-B',version:4}]};
 const a=await accessUiApp(remote,{}, {preview:true});a.set("tab='management';sharedCatalogRevision='catalog';render()");
 await a.set("openSharedStaffAccess({resourceId:'access-teacher-resource'})");
 assert.equal(a.read('teacherAccessManager.lockedUserId'),'access-artist-B');
 assert.equal(a.read('teacherAccessManager.tab'),'grants');
 assert.match(a.nodes['#modal-root'].innerHTML,/Teaching artist/);
 await a.click({action:'access-grant-add'});
 assert.match(a.nodes['#modal-root'].innerHTML,/value="access-artist-B"/);
 assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/value="access-artist-A"/);
 const form=accessEditorForm(a,'access-grant-editor',{userId:'access-artist-A',kind:'course',courseId:'qa-course'});
 await a.submit(form.id,form.values,form);assert.equal(a.accessCalls.length,0);
 assert.match(a.nodes['#access-editor-error'].textContent,/teacher|老師/i);
 await a.click({action:'access-editor-cancel'});await a.click({action:'access-close'});
 assert.equal(a.read('teacherAccessManager'),null);assert.match(a.nodes['#modal-root'].innerHTML,/Teaching artist/);
 assert.match(a.nodes['#modal-root'].innerHTML,/Login and data access/);assert.equal(a.accessCalls.length,0);
});

test('unlinked staff access opens that resource without choosing another teacher and cancellation returns to its profile',async()=>{
 const a=await accessUiApp({}, {}, {preview:true});a.set("tab='management';sharedCatalogRevision='catalog';render()");
 await a.set("openSharedStaffAccess({resourceId:'access-teacher-resource'})");
 assert.equal(a.read('teacherAccessDraft.resourceId'),'access-teacher-resource');assert.equal(a.read('teacherAccessDraft.current'),null);
 assert.match(a.nodes['#modal-root'].innerHTML,/<option value="">/);
 await a.click({action:'access-editor-cancel'});
 assert.equal(a.read('teacherAccessManager'),null);assert.match(a.nodes['#modal-root'].innerHTML,/Teaching artist/);
 assert.match(a.nodes['#modal-root'].innerHTML,/No linked login account/);assert.equal(a.accessCalls.length,0);
});

test('closing an individual staff access read prevents its late reply from reopening any dialog',async()=>{
 const a=await accessUiApp({}, {}, {preview:true}),wait=deferred();a.client.accessControl=()=>wait.promise;
 a.set("tab='management';sharedCatalogRevision='catalog'");const pending=a.set("openSharedStaffAccess({resourceId:'access-teacher-resource'})");
 await until(()=>!!a.read('teacherAccessManager'),'The individual settings manager must be open');
 await a.click({action:'access-close'});const afterClose=a.read('modal');
 wait.resolve({...copy(a.accessRemote),revision:'late-links'});await pending;
 assert.equal(a.read('teacherAccessManager'),null);assert.equal(a.read('modal'),afterClose);assert.equal(a.accessCalls.length,0);
});

test('a changed staff account link cannot receive grants through an already opened individual settings panel',async()=>{
 const remote={teacherLinks:[{teacherResourceId:'access-teacher-resource',userId:'access-artist-B',version:4}]};
 const a=await accessUiApp(remote,{}, {preview:true});a.set("tab='management';sharedCatalogRevision='catalog';render()");
 await a.set("openSharedStaffAccess({resourceId:'access-teacher-resource'})");await a.click({action:'access-grant-add'});
 const form=accessEditorForm(a,'access-grant-editor',{userId:'access-artist-B',kind:'course',courseId:'qa-course'});
 remote.teacherLinks=[{teacherResourceId:'access-teacher-resource',userId:'access-artist-A',version:5}];remote.revision++;
 await a.set('refreshTeacherAccess({paint:false})');await a.submit(form.id,form.values,form);
 assert.equal(a.accessCalls.length,0);assert.match(a.nodes['#access-editor-error'].textContent,/changed/);
});

test('an administrator teaching profile uses account links without offering teacher-only grants',async()=>{
 const a=await accessUiApp({teacherLinks:[{teacherResourceId:'access-teacher-resource',userId:sharedTestUser.id,version:1}]},{},{preview:true});
 a.set("tab='management';sharedCatalogRevision='catalog';render()");await a.set("openSharedStaffAccess({resourceId:'access-teacher-resource'})");
 assert.equal(a.read('teacherAccessManager.lockedUserId'),'');assert.equal(a.read('teacherAccessManager.tab'),'links');
 await a.click({action:'access-grant-add'});assert.equal(a.read('teacherAccessDraft'),null);assert.equal(a.accessCalls.length,0);
});

function mountedPortalProfile(a,{open=true}={}){
 let html=a.nodes['#app'].innerHTML,writes=0,profile,summary;
 const mount=value=>{
  if(profile)profile.isConnected=false;if(summary)summary.isConnected=false;
  if(!value.includes('class="portal-profile"')){profile=null;summary=null;return;}
  profile={open:/<details class="portal-profile"[^>]*\sopen(?:\s|>)/.test(value),isConnected:true,matches:selector=>selector==='.portal-profile',contains:node=>node===summary};
  summary={isConnected:true,matches:()=>false,closest:selector=>selector==='.portal-profile'?profile:null,focus(){a.ctx.document.activeElement=this;}};
 };
 mount(html);profile.open=open;
 Object.defineProperty(a.nodes['#app'],'innerHTML',{configurable:true,get:()=>html,set(value){writes++;html=value;mount(value);a.ctx.document.activeElement=a.ctx.document.body;}});
 const query=a.ctx.document.querySelector;
 a.ctx.document.querySelector=selector=>selector==='.portal-profile'?profile:selector==='.portal-profile > summary'?summary:query(selector);
 return {get profile(){return profile;},get summary(){return summary;},get writes(){return writes;},close(){const target=profile;target.open=false;a.ctx.profileToggleEvent={target};a.set('handlePortalProfileToggle(profileToggleEvent)');}};
}
async function teacherProfilePollingApp(){
 const user={id:'profile-teacher',role:'teacher',displayName:'Profile teacher',email:'teacher@example.test',accessRevision:'profile-access-1'},remote={version:1,time:'10:00'};
 const a=await sharedScheduleApp({rows:[],revision:1},{session:async()=>({user:copy(user)}),catalog:async since=>since==='profile-catalog'?{revision:since,unchanged:true}:{revision:'profile-catalog',courses:[copy(sharedTestCourse)],fees:[copy(sharedTestFee)]},schedulingResources:async since=>since==='profile-resources'?{revision:since,unchanged:true}:{revision:'profile-resources',resources:[{id:'profile-teacher-resource',kind:'teacher',displayName:user.displayName,active:true,version:1}]},schedules:async since=>since==='profile-schedule-'+remote.version?{revision:since,unchanged:true}:teacherScheduleFixture(sharedScheduleRecord({teacherIds:['profile-teacher-resource'],time:remote.time}),{date:'2026-10-15',revision:'profile-schedule-'+remote.version})},{preview:true});
 a.set("tab='teacher-home';render()");for(let turn=0;turn<60;turn++)await Promise.resolve();
 return {a,user,remote,view:mountedPortalProfile(a)};
}

test('changed teacher polling keeps the open account menu mounted while loading the latest records and closing flushes the view',async()=>{
 const {a,remote,view}=await teacherProfilePollingApp(),profile=view.profile,summary=view.summary;a.ctx.document.activeElement=summary;
 await a.polls[0].handler();assert.equal(view.writes,0,'An unchanged poll must not reconstruct the account menu');
 remote.version++;remote.time='11:30';await a.polls[0].handler();assert.equal(a.read('sharedScheduleOccurrences[0].item.time'),'11:30','The open menu must not prevent current data being loaded');
 assert.equal(view.writes,0,'Background painting must wait while the menu is open');assert.equal(view.profile,profile);assert.equal(profile.open,true);assert.equal(a.ctx.document.activeElement,summary);assert.equal(a.read('sharedViewDirty'),true);
 await a.polls[0].handler();assert.equal(view.writes,0,'An unchanged reply must not flush deferred data through an open menu');
 view.close();assert.equal(view.writes,1);assert.equal(view.profile.open,false);assert.equal(a.read('sharedViewDirty'),false);assert.equal(a.ctx.document.activeElement,view.summary,'Closing and flushing retains the account-menu focus');assert.match(a.nodes['#app'].innerHTML,/11:30/);
});

test('the delayed teacher-home window read after login does not dismiss the newly opened account menu',async()=>{
 const a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1},{},{preview:true});await a.click({action:'logout'});
 const user={id:'profile-leo-after-admin',role:'teacher',displayName:'Leo',email:'teacher@example.test',accessRevision:'leo-access'},late=deferred();let reads=0;
 a.client.login=async()=>({user});a.client.catalog=async()=>({revision:'teacher-catalogue',courses:[copy(sharedTestCourse)],fees:[copy(sharedTestFee)]});a.client.schedulingResources=async()=>({revision:'teacher-resources',resources:[{id:'leo-resource',kind:'teacher',displayName:'Leo',active:true,version:1}]});
 a.client.schedules=async()=>++reads===1?teacherScheduleFixture(sharedScheduleRecord({teacherIds:['leo-resource']}),{date:'2026-10-15',revision:'teacher-month'}):late.promise;
 const form=sharedForm('login');form.values={username:user.email,password:'fictional-password'};await a.submit('login',form.values,form);await until(()=>reads===2,'The teacher workspace requests its own range after the initial month read');assert.equal(a.read('tab'),'teacher-home');
 const view=mountedPortalProfile(a);a.ctx.document.activeElement=view.summary;late.resolve(teacherScheduleFixture(sharedScheduleRecord({teacherIds:['leo-resource'],time:'12:30'}),{date:'2026-10-15',revision:'teacher-workspace'}));await until(()=>a.read('sharedSchedulesRevision')==='teacher-workspace','The late teacher-home read must genuinely complete');for(let turn=0;turn<10;turn++)await Promise.resolve();
 assert.equal(view.writes,0);assert.equal(view.profile.open,true);assert.equal(a.read('sharedScheduleOccurrences[0].item.time'),'12:30');view.close();assert.equal(view.writes,1);assert.match(a.nodes['#app'].innerHTML,/12:30/);
});

test('an open account menu never postpones authoritative sign-out, revocation or a different role',async()=>{
 for(const change of ['logout','expired','signed-out','revoked','student']){
  const {a,user,remote,view}=await teacherProfilePollingApp();remote.version++;remote.time='11:30';await a.polls[0].handler();
  a.set("materialCaches.set('private',{items:[{name:'Old private material'}]});materialAttachmentDraft=[{name:'Old queued file'}]");
  a.client.catalog=async()=>({revision:'next-catalog',courses:[],fees:[]});a.client.schedules=async()=>({revision:'next-scope',readScope:'occurrences',occurrences:[]});a.client.session=async()=>{if(change==='expired')throw serviceError(401,'AUTH_REQUIRED');return {user:change==='signed-out'?null:{...user,...(change==='student'?{id:'next-student',role:'student'}:{accessRevision:'revoked-access'})}};};
  const old=view.profile;if(change==='logout')await a.click({action:'logout'});else await a.set('refreshSharedSession()');assert.equal(old.isConnected,false,change);assert.equal(view.profile?.open||false,false,change);assert.equal(a.read('materialCaches.size'),0,change);assert.equal(a.read('materialAttachmentDraft.length'),0,change);assert.ok(view.writes>0,change);
  if(['logout','expired','signed-out'].includes(change)){assert.equal(a.read('authUser'),null);assert.equal(a.read('location.pathname'),'/login');}else assert.equal(a.read('authUser.role'),change==='student'?'student':'teacher');
  const writes=view.writes,focus=a.ctx.document.activeElement;old.open=false;a.ctx.profileToggleEvent={target:old};a.set('handlePortalProfileToggle(profileToggleEvent)');assert.equal(view.writes,writes,'A detached old menu toggle must not paint the new identity');assert.equal(a.ctx.document.activeElement,focus);
 }
});

function capturePeopleRelatedLaunches(a){
 a.ctx.peopleRelatedLaunches=[];
 a.set("interfacePreview={...interfacePreview,openLesson:(view,facts)=>peopleRelatedLaunches.push({channel:'lesson',view,facts}),openAccount:(view,facts)=>peopleRelatedLaunches.push({channel:'account',view,facts})}");
 return ()=>a.read('peopleRelatedLaunches');
}
async function openReadyPeopleProfile(a,id){
 await a.click({action:'people-open',personId:id});await until(()=>a.read('peopleDetails.get('+JSON.stringify(id)+')?.ready')&&!a.read('peopleReads.size'),'The exact profile must be loaded before related actions are available');
}

test('People related actions live only in the exact loaded profile and pass the second same-name person without fixture facts',async()=>{
 let context;const first=formalPerson({id:'people-first',displayName:'Same display name',email:'first@example.test'}),second=formalPerson({id:'people-second',displayName:'Same display name',email:'second@example.test'}),a=await peopleUiApp({people:[first,second],revision:1},{},{preview:true,onPreviewContext:value=>context=value}),launches=capturePeopleRelatedLaunches(a);
 await openPeopleDirectory(a);assert.doesNotMatch(a.nodes['#app'].innerHTML,/class="interface-preview-tools"|people-profile-related/);assert.deepEqual(copy(context().peopleContext),{personId:null,person:null,ready:false,allowed:true});
 for(const person of [first,second]){
  await openReadyPeopleProfile(a,person.id);const html=a.nodes['#app'].innerHTML;assert.doesNotMatch(html,/class="interface-preview-tools"/);assert.match(html,/people-profile-related/);
  const buttons=[...html.matchAll(/<button\b[^>]*data-ui-command="launch"[^>]*>/g)].map(match=>markupDataset(match[0]));assert.equal(buttons.length,4);assert.ok(buttons.every(button=>button.personId===person.id));
  const before=launches().length;for(const button of buttons)await a.click(button);const opened=launches().slice(before);assert.equal(opened.length,4);assert.equal(context().peopleContext.person.id,person.id);
  for(const {channel,facts}of opened){assert.equal(facts.shared,true);assert.equal(facts.sharedPerson,true);assert.equal(facts.personId,person.id);assert.equal(facts.student.id,person.id);assert.equal(facts.student.email,person.email);assert.deepEqual(facts.data.slots,[]);assert.equal(Object.hasOwn(facts,'accountLink'),false);if(channel==='lesson'){assert.deepEqual(facts.lesson,{});assert.deepEqual(facts.data.students.map(row=>row.id),[person.id]);assert.deepEqual(facts.data.trialHistory,[]);}else{assert.equal(facts.data.student.id,person.id);assert.deepEqual(facts.data.courses,[]);}}
  assert.doesNotMatch(JSON.stringify(opened),/example-child|child-1|Creative Drawing|2026-10-16/);
 }
 const before=launches().length;for(const personId of [undefined,first.id,'missing-person'])for(const action of ['ui-lesson','ui-account-actions'])await a.click({action,uiCommand:'launch',uiView:action==='ui-lesson'?'family':'activation',...(personId?{personId}:{})});assert.equal(launches().length,before,'The previous same-name profile and missing IDs cannot be substituted for the route');
});

test('People loaded Students cannot convert and profile launches require the current authorized role',async()=>{
 let context;const person=formalPerson({id:'people-student',kind:'student',displayName:'Existing student'}),a=await peopleUiApp({people:[person],revision:1},{},{preview:true,onPreviewContext:value=>context=value}),launches=capturePeopleRelatedLaunches(a);await openReadyPeopleProfile(a,person.id);
 assert.match(a.nodes['#app'].innerHTML,/people-profile-related/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-ui-view="convert"/);await a.click({action:'ui-lesson',uiCommand:'launch',uiView:'convert',personId:person.id});assert.equal(launches().length,0);
 await a.click({action:'ui-lesson',uiCommand:'launch',uiView:'family',personId:person.id});assert.equal(launches().length,1);
 a.set("applySharedUser({id:'people-readonly-teacher',role:'teacher',displayName:'Teacher'});render()");assert.equal(context().peopleContext.allowed,false);assert.equal(context().peopleContext.person,null);for(const action of ['ui-lesson','ui-account-actions'])await a.click({action,uiCommand:'launch',uiView:action==='ui-lesson'?'family':'activation',personId:person.id});assert.equal(launches().length,1);
});

test('People directory, loading, forbidden and missing profiles expose no related actions or borrowed identity',async()=>{
 for(const scenario of ['directory','loading','forbidden','missing','wrong-record']){
  let context;const gate=deferred(),person=formalPerson({id:'people-guarded',displayName:'Guarded profile'}),a=await peopleUiApp({people:[person],revision:1},{},{preview:true,onPreviewContext:value=>context=value}),launches=capturePeopleRelatedLaunches(a);
  if(scenario==='directory')await openPeopleDirectory(a);
  else{a.client.person=()=>scenario==='loading'?gate.promise:scenario==='wrong-record'?Promise.resolve({person:{...person,id:'different-id'}}):Promise.reject(serviceError(scenario==='forbidden'?403:404,scenario==='forbidden'?'FORBIDDEN':'PERSON_NOT_FOUND'));await a.click({action:'people-open',personId:person.id});if(scenario!=='loading')await until(()=>!a.read('peopleReads.size'),'A failed profile read must settle before its actions are tested');}
  const html=a.nodes['#app'].innerHTML;assert.doesNotMatch(html,/class="interface-preview-tools"|people-profile-related/,scenario);assert.equal(context().peopleContext.person,null,scenario);assert.equal(context().peopleContext.ready,false,scenario);
  for(const personId of [undefined,person.id])for(const [action,uiView]of [['ui-lesson','applicant'],['ui-lesson','convert'],['ui-lesson','family'],['ui-account-actions','activation']])await a.click({action,uiCommand:'launch',uiView,...(personId?{personId}:{})});assert.equal(launches().length,0,scenario);
  if(scenario==='loading'){gate.resolve({person});await until(()=>!a.read('peopleReads.size'),'The delayed authorized profile read must finish');assert.equal(context().peopleContext.person.id,person.id);assert.match(a.nodes['#app'].innerHTML,/people-profile-related/);}
 }
});

test('People real related surfaces show only the selected profile and unavailable actions cannot complete or write records',async()=>{
 const first=formalPerson({id:'real-people-first',displayName:'Same person name',email:'first-only@example.test'}),second=formalPerson({id:'real-people-second',displayName:'Same person name',email:'second-only@example.test'}),a=await peopleUiApp({people:[first,second],revision:1},{},{preview:true,mountModalRoot:true,initialQuerySelectorAll:()=>[]}),before=a.read('db.bookings');
 for(const person of [first,second]){
  await openReadyPeopleProfile(a,person.id);
  const buttons=[...a.nodes['#app'].innerHTML.matchAll(/<button\b[^>]*data-ui-command="launch"[^>]*>/g)].map(match=>markupDataset(match[0]));assert.equal(buttons.length,4);
  for(const button of buttons){
   await a.click(button);let html=a.nodes['#modal-root'].innerHTML;assert.equal(a.read('interfacePreview.isOpen'),true);assert.match(html,new RegExp(person.email.replace(/\./g,'\\.')));assert.doesNotMatch(html,new RegExp((person.id===first.id?second:first).email.replace(/\./g,'\\.')));assert.doesNotMatch(html,/Alex Chan|child-1|Creative Drawing|2026-10-16|interface-preview-banner/);
   if(button.action==='ui-account-actions'){assert.match(html,/Account status could not be confirmed/);assert.match(html,/<button\b[^>]*disabled[^>]*>Activate Account<\/button>/);assert.match(html,/<button\b[^>]*disabled[^>]*>Reset Password<\/button>/);}
   else{assert.match(html,/not available yet|not connected yet/);assert.match(html,/<button\b[^>]*disabled[^>]*>/);}
   for(const uiCommand of ['review','confirm-preview','save-preview','complete'])await a.click({...button,uiCommand});
   html=a.nodes['#modal-root'].innerHTML;assert.match(html,new RegExp(person.email.replace(/\./g,'\\.')));assert.doesNotMatch(html,/Request received|Saved successfully|Completed|已完成|已儲存/);
   await a.click({action:button.action,uiCommand:'close'});assert.equal(a.read('interfacePreview.isOpen'),false);assert.equal(a.nodes['#modal-root'].innerHTML,'');assert.equal(a.read('location.pathname'),'/account/people/'+person.id);
  }
 }
 assert.deepEqual(a.read('db.bookings'),before);assert.deepEqual(a.peopleWrites,[]);assert.deepEqual(a.calls,[]);
});

test('People real overlays close immediately when a profile refresh removes or denies the selected record',async()=>{
 for(const failure of [404,403,503,'wrong-record']){
  const person=formalPerson({id:'people-expiring',displayName:'Private selected profile',email:'private-record@example.test'}),a=await peopleUiApp({people:[person],revision:1},{},{preview:true,mountModalRoot:true,initialQuerySelectorAll:()=>[]});await openReadyPeopleProfile(a,person.id);
  await a.click({action:'ui-lesson',uiCommand:'launch',uiView:'family',personId:person.id});assert.match(a.nodes['#modal-root'].innerHTML,/private-record@example.test/);assert.equal(a.read('interfacePreview.isOpen'),true);
  a.client.person=async()=>{if(failure==='wrong-record')return {person:{...person,id:'another-person'}};throw serviceError(failure,failure===404?'PERSON_NOT_FOUND':failure===403?'FORBIDDEN':'SERVICE_UNAVAILABLE')};
  await a.set("refreshPersonProfile('people-expiring')");assert.equal(a.read('interfacePreview.isOpen'),false,String(failure));assert.equal(a.read('modal'),'',String(failure));assert.equal(a.nodes['#modal-root'].innerHTML,'',String(failure));
  await a.click({action:'ui-lesson',uiCommand:'launch',uiView:'family',personId:person.id});assert.equal(a.read('interfacePreview.isOpen'),false,String(failure));assert.deepEqual(a.peopleWrites,[]);
 }
});

test('People real overlay navigation and browser Back discard the prior profile without reviving stale commands',async()=>{
 const first=formalPerson({id:'people-route-first',displayName:'Same route name',email:'route-first@example.test'}),second=formalPerson({id:'people-route-second',displayName:'Same route name',email:'route-second@example.test'}),a=await peopleUiApp({people:[first,second],revision:1},{},{preview:true,mountModalRoot:true,initialQuerySelectorAll:()=>[]});
 await openReadyPeopleProfile(a,first.id);await a.click({action:'ui-lesson',uiCommand:'launch',uiView:'family',personId:first.id});assert.equal(a.read('interfacePreview.isOpen'),true);
 await openReadyPeopleProfile(a,second.id);assert.equal(a.read('interfacePreview.isOpen'),false);assert.equal(a.nodes['#modal-root'].innerHTML,'');await a.click({action:'ui-account-actions',uiCommand:'launch',uiView:'activation',personId:second.id});assert.match(a.nodes['#modal-root'].innerHTML,/route-second@example.test/);
 a.set('history.back()');assert.equal(a.read('location.pathname'),'/account/people/'+first.id);assert.equal(a.read('interfacePreview.isOpen'),false);assert.equal(a.read('modal'),'');assert.doesNotMatch(a.nodes['#app'].innerHTML,/route-second@example.test/);await a.click({action:'ui-lesson',uiCommand:'launch',uiView:'family',personId:second.id});assert.equal(a.read('interfacePreview.isOpen'),false);assert.deepEqual(a.peopleWrites,[]);
});

test('People real conversion closes after the selected Applicant changes kind and background identity loss clears an open profile surface',async()=>{
 const person=formalPerson({id:'people-conversion-source',displayName:'Conversion source',email:'conversion-only@example.test'}),a=await peopleUiApp({people:[person],revision:1},{},{preview:true,mountModalRoot:true,initialQuerySelectorAll:()=>[]});await openReadyPeopleProfile(a,person.id);
 await a.click({action:'ui-lesson',uiCommand:'launch',uiView:'convert',personId:person.id});assert.match(a.nodes['#modal-root'].innerHTML,/Confirm conversion/);a.peopleRemote.people[0]={...person,kind:'student',version:2};await a.set("refreshPersonProfile('people-conversion-source')");assert.equal(a.read('interfacePreview.isOpen'),false,'The related conversion view must not survive a confirmed Student classification');assert.equal(a.nodes['#modal-root'].innerHTML,'');
 await a.click({action:'ui-lesson',uiCommand:'launch',uiView:'family',personId:person.id});assert.match(a.nodes['#modal-root'].innerHTML,/conversion-only@example.test/);const gate=deferred();a.client.person=()=>gate.promise;const pending=a.set("refreshPersonProfile('people-conversion-source')");a.set("applySharedUser({id:'different-readonly-teacher',role:'teacher',displayName:'Another teacher'});render()");assert.equal(a.read('interfacePreview.isOpen'),false);assert.equal(a.read('modal'),'');gate.resolve({person:{...person,displayName:'Late private identity'}});await pending;assert.equal(a.read('peopleDetails.size'),0);assert.doesNotMatch(a.nodes['#app'].innerHTML,/Late private identity|conversion-only@example.test/);assert.deepEqual(a.peopleWrites,[]);
});

test('People real overlay refresh updates the authorized contact while unchanged profile polling leaves the modal intact',async()=>{
 const person=formalPerson({id:'people-contact-update',displayName:'Contact update',email:'before-contact@example.test'}),a=await peopleUiApp({people:[person],revision:1},{},{preview:true,mountModalRoot:true,initialQuerySelectorAll:()=>[]});await openReadyPeopleProfile(a,person.id);await a.click({action:'ui-lesson',uiCommand:'launch',uiView:'family',personId:person.id});
 const node=a.nodes['#modal-root'];let html=node.innerHTML,writes=0;Object.defineProperty(node,'innerHTML',{get:()=>html,set:value=>{html=value;writes++}});await a.set("refreshPersonProfile('people-contact-update')");assert.equal(writes,0,'Unchanged profile reads must not remount a modal the user is reading');
 a.peopleRemote.people[0]={...person,email:'after-contact@example.test',version:2};await a.set("refreshPersonProfile('people-contact-update')");assert.equal(a.read('interfacePreview.isOpen'),true);assert.match(node.innerHTML,/after-contact@example.test/);assert.doesNotMatch(node.innerHTML,/before-contact@example.test/);assert.deepEqual(a.peopleWrites,[]);
});

test('shared Leads directory has no unscoped trial or conversion launcher that can borrow a fixture person',async()=>{
 const a=await peopleUiApp({people:[],revision:1},{},{preview:true,initialQuerySelectorAll:()=>[]});await a.click({tab:'leads'});const html=a.nodes['#app'].innerHTML;assert.equal(a.read('tab'),'leads');assert.match(html,/Leads/);assert.doesNotMatch(html,/class="interface-preview-tools"|data-ui-view="(?:applicant|convert)"/);assert.match(html,/data-action="lead-create"/);assert.match(html,/data-action="lead-columns"/);assert.deepEqual(a.peopleWrites,[]);
});

test('a restored student session opens all authorized My classes without an extra click while requests keep their calendar month',async()=>{
 const user={id:'restored-parent',role:'student',displayName:'Restored parent',email:'student@example.test',accessRevision:'restored-scope'},student={id:'restored-child',displayName:'Authorized child'},dates=['2026-10-16','2026-10-17','2026-10-23','2026-10-24','2026-10-30','2026-10-31','2026-11-07'],reads=[];
 const lessons=dates.map((date,index)=>({id:'restored-lesson-'+index,studentId:student.id,studentName:student.displayName,scheduleId:'restored-series',sequence:index+1,date,time:'13:30',duration:60,courseName:'Authorized course',teachers:[],rooms:[],attendance:'unmarked'})),foreign={...lessons[0],id:'foreign-private-lesson',studentId:'different-family-child',studentName:'Private other family',courseName:'Private other course'};
 const client={health:async()=>({mode:'shared-test'}),session:async()=>({user}),catalog:async()=>({revision:'restored-catalog',courses:[],fees:[]}),async studentTimetable(range,since){reads.push({range:copy(range),since});const revision='restored-'+range.key;if(since===revision)return {revision,unchanged:true};return {revision,students:[student],lessons:[...lessons,foreign].filter(row=>row.date>=range.from&&row.date<=range.to)};}};
 const a=app({'beamal-language':'en'},'2026-10-15T12:00:00',false,client,{pathname:'/account',preview:true,initialQuerySelectorAll:()=>[]});await until(()=>a.read('sharedReady')&&a.read('studentTimetableCache.ready')&&!a.read('studentTimetableRead'),'The restored session and its first visible lesson window must fully settle');
 assert.equal(a.read('authUser.id'),user.id);assert.equal(a.read('authUser.role'),'student');assert.equal(a.read('tab'),'catalog','The existing restored-session default is preserved');assert.equal(a.read('portalActiveTab()'),'courses');assert.equal(a.read('studentTimetableCache.key'),'classes|2026-10-15');assert.equal(a.read('studentTimetableCache.lessons.length'),7);assert.equal((a.nodes['#app'].innerHTML.match(/class="shared-student-lesson panel"/g)||[]).length,7);assert.match(a.nodes['#app'].innerHTML,/2026-11-07/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/Private other family|Private other course/);assert.deepEqual(reads.map(row=>[row.range.from,row.range.to]),[['2026-10-15','2027-10-15']]);
 await a.set('refreshStudentTimetable()');assert.equal(a.read('studentTimetableCache.lessons.length'),7);assert.equal(a.read('studentTimetableCache.key'),'classes|2026-10-15');
 await a.click({tab:'student-requests'});await until(()=>a.read('studentTimetableCache.ready')&&!a.read('studentTimetableRead'),'Requests must load the calendar window after leaving My classes');assert.equal(a.read('studentTimetableCache.key'),'2026-10-01|2026-10-31');assert.equal(a.read('studentTimetableCache.lessons.length'),6);assert.equal(reads.at(-1).range.to,'2026-10-31');
 await a.click({tab:'courses'});await until(()=>a.read('studentTimetableCache.ready')&&!a.read('studentTimetableRead'),'The explicit My classes entry must load the same range as its restored-session alias');assert.equal(a.read('studentTimetableCache.key'),'classes|2026-10-15');assert.equal(a.read('studentTimetableCache.lessons.length'),7);assert.match(a.nodes['#app'].innerHTML,/2026-11-07/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/Private other family|Private other course/);assert.deepEqual(a.read('studentTimetableCache.students.map(person=>person.id)'),[student.id]);assert.equal(a.read('db.bookings.length'),4,'Restoring a session must not rebuild or overwrite the existing local records');
});

async function studentWindowRaceApp(){
 const user={id:'window-parent',role:'student',displayName:'Window parent',accessRevision:'window-family-scope'},child={id:'window-child',displayName:'Window child'},dates=['2026-10-16','2026-10-17','2026-10-23','2026-10-24','2026-10-30','2026-10-31','2026-11-07'],reads=[];
 const lessons=dates.map((date,index)=>({id:'window-lesson-'+index,studentId:child.id,studentName:child.displayName,scheduleId:'window-series',sequence:index+1,date,time:'13:30',duration:60,courseName:'Window course',teachers:[],rooms:[],attendance:'unmarked'}));
 const reply=(range,revision='window-'+range.key)=>({revision,students:[child],lessons:lessons.filter(row=>row.date>=range.from&&row.date<=range.to)}),client={health:async()=>({mode:'shared-test'}),session:async()=>({user}),catalog:async()=>({revision:'window-catalog',courses:[],fees:[]}),async studentTimetable(range,since){reads.push({range:copy(range),since});return reply(range)}};
 const a=app({'beamal-language':'en'},'2026-10-15T12:00:00',false,client,{pathname:'/account',preview:true,initialQuerySelectorAll:()=>[]});await until(()=>a.read('sharedReady')&&a.read('studentTimetableCache.ready')&&!a.read('studentTimetableRead'),'The initial seven authorized classes must finish loading');assert.equal(a.read('studentTimetableCache.lessons.length'),7);return Object.assign(a,{client,child,lessons,reads,reply});
}

test('student window changes start the current read while an old month is pending and deduplicate only the same window',async()=>{
 for(const order of ['year-first','month-first']){
  const a=await studentWindowRaceApp(),month=deferred(),year=deferred();a.client.studentTimetable=(range,since)=>{a.reads.push({range:copy(range),since});return range.key.startsWith('classes|')?year.promise:month.promise;};
  await a.click({tab:'student-requests'});assert.equal(a.reads.at(-1).range.key,'2026-10-01|2026-10-31');const oldRead=a.set('studentTimetableRead');await a.click({tab:'courses'});
  assert.equal(a.reads.length,3,'The new My classes range must dispatch immediately without waiting for the previous month');assert.equal(a.reads.at(-1).range.key,'classes|2026-10-15');assert.equal(a.read('studentTimetableCache.key'),'classes|2026-10-15');assert.equal(a.read('studentTimetableCache.ready'),false);assert.match(a.nodes['#app'].innerHTML,/Loading lessons/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/class="shared-student-lesson panel"/);
  const currentRead=a.set('studentTimetableRead'),duplicate=a.set('refreshStudentTimetable()');a.set('render();render()');assert.equal(a.reads.length,3,'Re-rendering and refreshing the same pending window must reuse its request');
  const oldReply={revision:'old-month-six',students:[a.child],lessons:a.lessons.filter(row=>row.date<'2026-11-01')},newReply={revision:'current-year-seven',students:[a.child],lessons:a.lessons};
  if(order==='month-first'){month.resolve(oldReply);await oldRead;assert.equal(a.read('studentTimetableCache.ready'),false);assert.equal(a.read('studentTimetableCache.key'),'classes|2026-10-15');assert.ok(a.read('!!studentTimetableRead'),'An old finally must not unlock the current pending window');assert.doesNotMatch(a.nodes['#app'].innerHTML,/class="shared-student-lesson panel"/);year.resolve(newReply);await currentRead;}
  else{year.resolve(newReply);await currentRead;month.resolve(oldReply);await oldRead;}
  await duplicate;assert.equal(a.read('studentTimetableCache.key'),'classes|2026-10-15');assert.equal(a.read('studentTimetableCache.lessons.length'),7);assert.equal(a.read('studentTimetableRead'),null);assert.equal((a.nodes['#app'].innerHTML.match(/class="shared-student-lesson panel"/g)||[]).length,7);assert.match(a.nodes['#app'].innerHTML,/2026-11-07/);
 }
});

test('student My classes shows loading instead of a completed six-lesson month while the future window is pending',async()=>{
 const a=await studentWindowRaceApp();await a.click({tab:'student-requests'});await until(()=>a.read('studentTimetableCache.ready')&&!a.read('studentTimetableRead'),'The shorter calendar month must first be fully loaded');assert.equal(a.read('studentTimetableCache.lessons.length'),6);
 const future=deferred();a.client.studentTimetable=(range,since)=>{a.reads.push({range:copy(range),since});return future.promise;};await a.click({tab:'courses'});const currentRead=a.set('studentTimetableRead');assert.equal(a.read('studentTimetableCache.key'),'classes|2026-10-15');assert.equal(a.read('studentTimetableCache.ready'),false);assert.match(a.nodes['#app'].innerHTML,/Loading lessons/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/class="shared-student-lesson panel"/,'A completed old monthly result must not look like the full My classes list');
 future.resolve({revision:'loaded-future-seven',students:[a.child],lessons:a.lessons});await currentRead;assert.equal(a.read('studentTimetableCache.lessons.length'),7);assert.match(a.nodes['#app'].innerHTML,/2026-11-07/);
});

test('named timetable filter editor is reachable and cancelling leaves the visible calendar and preference untouched',()=>{
 const a=app({},'2026-10-08T12:00:00');a.set("role='teacher';tab='overview';location.pathname='/account';selectTimetableDate('2026-10-08');render()");
 const before=a.read('db');a.click({action:'tt-named-add'});assert.match(a.nodes['#modal-root'].innerHTML,/id="tt-named-filter-editor"/);
 a.change('filterName','Friday art');a.change('conditionField-0','date');a.change('conditionValue-0','2026-10-09');a.click({action:'tt-named-cancel'});
 assert.equal(a.read('modal'),'');assert.equal(a.read('timetableNamedFilters.filters.length'),0);assert.deepEqual(a.read('db'),before);
});
test('named timetable filters save exact course conditions, apply only by explicit intent and can restore all without altering lessons',()=>{
 const a=app({},'2026-10-08T12:00:00');a.set("role='teacher';tab='overview';location.pathname='/account';selectTimetableDate('2026-10-08');render()");const before=a.read('db');
 a.click({action:'tt-named-add'});a.submit('tt-named-filter-editor',{filterName:'Art lessons',filterMatch:'all','conditionField-0':'course','conditionValue-0':'art',filterIntent:'only'});
 assert.equal(a.read('timetableNamedFilters.filters.length'),1);assert.equal(a.read('timetableNamedFilters.only'),a.read('timetableNamedFilters.filters[0].id'));
 assert.ok(a.read('timetableDays().flatMap(date=>timetableClasses(date)).every(c=>c.course==="art")'));assert.ok(a.read('timetableDays().flatMap(date=>timetableClasses(date)).length')>0);
 const id=a.read('timetableNamedFilters.only');a.click({action:'tt-named-toggle',filterId:id});assert.equal(a.read('timetableDays().flatMap(date=>timetableClasses(date)).length'),0,'Hiding the current only view must remain genuinely empty');
 a.click({action:'tt-named-clear'});assert.equal(a.read('timetableNamedFilters.only'),null);assert.equal(a.read('timetableNamedFilters.filters[0].visible'),true);assert.ok(a.read('timetableDays().flatMap(date=>timetableClasses(date)).length')>0);assert.deepEqual(a.read('db'),before);
 const saved=a.read('JSON.parse(localStorage.getItem(timetableNamedPreferenceKey()))');assert.equal(saved.filters[0].name,'Art lessons');assert.equal(Object.hasOwn(saved,'lessons'),false);
});
test('resource eyes exclude matching lessons and turning every room off does not restore all lessons',()=>{
 const a=app({},'2026-10-08T12:00:00');a.set("role='teacher';tab='overview';location.pathname='/account';selectTimetableDate('2026-10-08');db.classes[0].room='Room A';render()");const before=a.read('db');
 a.click({action:'tt-named-resource',resourceKind:'rooms',resourceId:'Room A'});assert.ok(a.read('timetableDays().flatMap(date=>timetableClasses(date)).every(c=>c.room!=="Room A")'));
 a.click({action:'tt-named-resource',resourceKind:'rooms',resourceId:'unassigned'});assert.equal(a.read('timetableDays().flatMap(date=>timetableClasses(date)).length'),0);assert.deepEqual(a.read('db'),before);
 a.click({action:'tt-named-resource',resourceKind:'rooms',resourceId:'forged-other-room'});assert.deepEqual(a.read('timetableNamedFilters.hiddenResources.rooms'),['Room A','unassigned']);
});
test('named preference storage failure retains the editor and original filter state instead of claiming a saved result',()=>{
 const a=app({},'2026-10-08T12:00:00',false,null,{localWriteError:key=>key.startsWith('beamal-timetable-filters-')?new Error('Storage full'):null});a.set("role='teacher';tab='overview';location.pathname='/account';render()");a.click({action:'tt-named-add'});
 a.submit('tt-named-filter-editor',{filterName:'Keep my draft',filterMatch:'all','conditionField-0':'course','conditionValue-0':'art',filterIntent:'only'});
 assert.equal(a.read('timetableNamedFilters.filters.length'),0);assert.equal(a.read('timetableNamedDraft.name'),'Keep my draft');assert.match(a.nodes['#modal-root'].innerHTML,/Could not save|未能儲存/);assert.notEqual(a.read('modal'),'');
});
test('named filters reject unsupported or stale source conditions and student forged actions cannot open or save the editor',()=>{
 const a=app({},'2026-10-08T12:00:00');a.set("role='teacher';tab='overview';location.pathname='/account';render()");a.click({action:'tt-named-add'});
 a.submit('tt-named-filter-editor',{filterName:'Wrong source',filterMatch:'any','conditionField-0':'course','conditionValue-0':'missing-course',filterIntent:'only'});assert.equal(a.read('timetableNamedFilters.filters.length'),0);assert.notEqual(a.read('modal'),'');
 a.click({action:'tt-named-cancel'});a.set("role='student'");a.click({action:'tt-named-add'});assert.equal(a.read('timetableNamedDraft'),null);a.submit('tt-named-filter-editor',{filterName:'Forged',filterMatch:'all','conditionField-0':'course','conditionValue-0':'art'});assert.equal(a.read('timetableNamedFilters.filters.length'),0);
});

test('named student gender and age conditions use paid lesson facts for one member while fee ranges keep their pricing basis',async()=>{
 const lessons=[sharedScheduleRecord({id:'same-class',count:1})],facts=[{scheduleId:'same-class',sequence:1,date:'2026-10-08',students:[{id:'girl-id',displayName:'Same Name',gender:'Female',age:{years:7,months:4,asOf:'2026-10-08'}},{id:'boy-id',displayName:'Same Name',gender:'Male',age:{years:10,months:0,asOf:'2026-10-08'}}]}];
 const a=await sharedScheduleApp({rows:lessons,revision:1},{timetableFilterFacts:async()=>({revision:'student-facts-1',facts:copy(facts)})});await a.set('refreshTimetableFilterFacts({paint:false})');
 const save=conditions=>{a.click({action:'tt-named-add'});a.set('timetableNamedDraft.conditions='+JSON.stringify(conditions));a.submit('tt-named-filter-editor',{filterName:'Chosen students',filterMatch:'all',filterIntent:'only'});};
 save([{field:'gender',value:'Female'},{field:'age',value:'10',end:'10'}]);assert.equal(a.read('timetableClasses(timetableDateObject("2026-10-08")).length'),0,'Different children cannot jointly satisfy ALL student conditions');
 a.click({action:'tt-named-clear'});save([{field:'student',value:'girl-id'},{field:'gender',value:'Female'},{field:'age',value:'7',end:'7'}]);assert.equal(a.read('timetableClasses(timetableDateObject("2026-10-08")).length'),1);
 a.click({action:'tt-named-clear'});save([{field:'price',basis:'package',value:'300',end:'300'}]);assert.equal(a.read('timetableClasses(timetableDateObject("2026-10-08")).length'),0,'Per-lesson HK$300 is not a HK$300 package');
 a.click({action:'tt-named-clear'});save([{field:'price',basis:'monthly-lessons',value:'300',end:'300'}]);assert.equal(a.read('timetableClasses(timetableDateObject("2026-10-08")).length'),1);assert.equal(a.scheduleCalls.filter(call=>call.operation==='save').length,0);
});
test('named student facts reject late old-window replies and clear private candidates and drafts on identity changes',async()=>{
 const gate=deferred();let delayed=false;
 const a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1},{timetableFilterFacts:async()=>delayed?gate.promise:{revision:'visible-facts',facts:[{scheduleId:'qa-schedule',sequence:1,date:'2026-10-08',students:[{id:'private-student-id',displayName:'Previous authorized name',gender:'Female',age:{years:7,months:0,asOf:'2026-10-08'}}]}]}});
 await a.set('refreshTimetableFilterFacts({paint:false})');assert.match(JSON.stringify(a.read('namedTimetableOptions().student')),/Previous authorized name/);
 delayed=true;const pending=a.set('refreshTimetableFilterFacts({paint:false})');a.set("selectTimetableDate('2026-11-12');render()");gate.resolve({revision:'late-old-window',facts:[{scheduleId:'qa-schedule',sequence:1,date:'2026-10-08',students:[{id:'private-student-id',displayName:'Late old name'}]}]});await pending;assert.doesNotMatch(JSON.stringify(a.read('namedTimetableOptions().student')),/Late old name|Previous authorized name/);
 a.click({action:'tt-named-add'});a.change('filterName','Private draft');a.ctx.newIdentity={...sharedTestUser,id:'different-manager'};a.set('applySharedUser(newIdentity)');assert.equal(a.read('timetableNamedDraft'),null);assert.equal(a.read('timetableNamedFilters.filters.length'),0);assert.deepEqual(a.read('timetableFilterFacts.facts'),[]);assert.equal(a.read('modal'),'');
});
test('undoing a removed named filter preserves later resource eye choices and course navigation restores display preferences',async()=>{
 const a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1});a.click({action:'tt-named-add'});a.submit('tt-named-filter-editor',{filterName:'My course',filterMatch:'all','conditionField-0':'course','conditionValue-0':'qa-course',filterIntent:'only'});const id=a.read('timetableNamedFilters.only');a.click({action:'tt-named-remove',filterId:id});a.click({action:'tt-named-preset',preset:'regular'});a.click({action:'tt-named-undo'});assert.deepEqual(a.read('timetableNamedFilters.hiddenPresets'),['regular']);assert.equal(a.read('timetableNamedFilters.only'),id);
 const saved=a.read('timetableNamedFilters');a.set("tab='catalog';render()");await a.click({openCourse:'qa-course'});a.set('courseDetailMonth=new Date(2026,9,1)');a.change('','timetable',{id:'course-detail-view'});assert.equal(a.read('timetableNamedFilters.only'),null);assert.deepEqual(a.read('timetableNamedFilters.hiddenPresets'),[]);await a.click({action:'tt-back-course'});assert.deepEqual(a.read('timetableNamedFilters'),saved);
});

test('out-of-window student filter replies cannot populate current private candidates or an unchanged empty first response',async()=>{
 const a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1},{timetableFilterFacts:async()=>({revision:'bad-window',facts:[{scheduleId:'qa-schedule',sequence:1,date:'2026-12-31',students:[{id:'outside-private',displayName:'Outside window'}]}]})});await a.set('refreshTimetableFilterFacts({paint:false})');
 assert.deepEqual(a.read('namedTimetableOptions().student'),[]);assert.equal(a.read('timetableFilterFacts.ready'),false);assert.match(a.read('timetableFilterFacts.error'),/Could not load|未能讀取/);
 a.client.timetableFilterFacts=async()=>({revision:'first-unchanged',unchanged:true});a.set('clearTimetableFilterFacts()');await a.set('refreshTimetableFilterFacts({paint:false})');assert.equal(a.read('timetableFilterFacts.ready'),false);assert.match(a.read('timetableFilterFacts.error'),/Could not load|未能讀取/);
});

test('cancelling a named filter restores both 14-day calendar grid scroll positions',()=>{
 const a=app({},'2026-10-08T12:00:00');a.set("role='teacher';tab='overview';location.pathname='/account';timetableView='range';timetableViewSettings.rangeDays=14;render()");
 const grids=[{scrollTop:122,scrollLeft:51},{scrollTop:733,scrollLeft:312}],sidebar={scrollTop:89};a.nodes['.tt-grid-scroll']=grids[0];a.nodes['.tt-sidebar']=sidebar;a.ctx.document.querySelectorAll=selector=>selector==='.tt-grid-scroll'?grids:[];
 let html=a.nodes['#app'].innerHTML;Object.defineProperty(a.nodes['#app'],'innerHTML',{get:()=>html,set:value=>{html=value;grids.forEach(grid=>{grid.scrollTop=0;grid.scrollLeft=0});sidebar.scrollTop=0;}});
 a.click({action:'tt-named-add'});a.click({action:'tt-named-cancel'});assert.deepEqual(grids,[{scrollTop:122,scrollLeft:51},{scrollTop:733,scrollLeft:312}]);assert.equal(sidebar.scrollTop,89);
});

test('staff personal data reaches the shared snapshot and source errors do not masquerade as an empty profile',async()=>{
 let fail=false;const record={staffId:'actual-teacher',version:1,staffNumber:'B004',fullName:'Ava Hui',localName:'許悅童',gender:'female',dateOfBirth:'1994-06-12',contactEmail:'ava@example.test',position:'Art teacher',employment:'part-time',joined:'2023-09-01'};
 const a=await sharedApp({staffPersonalProfiles:async()=>{if(fail)throw new Error('Private upstream detail');return {revision:'profiles-1',records:[record]};}});
 a.set("tab='management';location.pathname='/account'");await a.set('refreshSharedStaffProfiles({paint:false})');
 assert.equal(a.read('sharedStaffSnapshot().staffProfileReady'),true);assert.equal(a.read('sharedStaffSnapshot().staffProfileRecords[0].dateOfBirth'),'1994-06-12');
 fail=true;await a.set('refreshSharedStaffProfiles({paint:false})');assert.ok(a.read('sharedStaffSnapshot().staffProfileError'));assert.deepEqual(a.read('sharedStaffSnapshot().staffProfileRecords'),[]);assert.doesNotMatch(a.read('sharedStaffSnapshot().staffProfileError'),/Private upstream/);
});
test('staff personal profile replies from an old identity are discarded and students cannot read this source',async()=>{
 const gate=deferred();const a=await sharedApp({staffPersonalProfiles:()=>gate.promise});a.set("tab='management';location.pathname='/account'");const pending=a.set('refreshSharedStaffProfiles({paint:false})');
 a.set("applySharedUser({id:'student-next',role:'student',displayName:'Student'});tab='overview'");gate.resolve({revision:'private-old',records:[{staffId:'old',version:1,fullName:'Private old profile'}]});await pending;
 assert.deepEqual(a.read('sharedStaffSnapshot().staffProfileRecords'),[]);assert.equal(a.read('sharedStaffSnapshot().staffProfileReady'),false);assert.equal(a.read('staffPersonalProfilesCache.revision'),'');
 let reads=0;a.client.staffPersonalProfiles=async()=>{reads++;return {revision:'forged',records:[]}};await a.set('refreshSharedStaffProfiles()');assert.equal(reads,0);
});
test('an unchanged first staff profile response is rejected rather than inventing a ready empty source',async()=>{
 const a=await sharedApp({staffPersonalProfiles:async()=>({revision:'first',unchanged:true})});a.set("tab='management';location.pathname='/account'");await a.set('refreshSharedStaffProfiles({paint:false})');assert.equal(a.read('sharedStaffSnapshot().staffProfileReady'),false);assert.ok(a.read('sharedStaffSnapshot().staffProfileError'));
});

test('an already loaded staff profile stays stable while its unchanged background source is pending',async()=>{
 const gate=deferred();let refresh=false;const a=await sharedApp({staffPersonalProfiles:()=>refresh?gate.promise:Promise.resolve({revision:'profile-base',records:[{staffId:'one',version:1,fullName:'Leo Chan'}]})});a.set("tab='management';location.pathname='/account'");await a.set('refreshSharedStaffProfiles({paint:false})');
 refresh=true;const pending=a.set('refreshSharedStaffProfiles({paint:false})');assert.equal(a.read('sharedStaffSnapshot().staffProfileReady'),true);assert.equal(a.read('sharedStaffSnapshot().staffProfileLoading'),false,'Background reads must not replace live editor controls with an updating state');gate.resolve({revision:'profile-base',unchanged:true});await pending;assert.equal(a.read('sharedStaffSnapshot().staffProfileRecords[0].fullName'),'Leo Chan');
});

test('a date note opens for the exact visible day, reviews and returns without saving or touching lesson data',async()=>{
 const a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1});a.set('renderModal()');const before=a.read('db');a.click({action:'tt-note-open',noteKind:'date',date:'2026-10-08'});assert.match(a.nodes['#modal-root']?.innerHTML||'',/id="tt-note-form"/);assert.match(a.nodes['#modal-root'].innerHTML,/2026-10-08/);
 a.submit('tt-note-form',{text:'下午核對畫材\n提醒老師準備工作坊'});assert.match(a.nodes['#modal-root'].innerHTML,/下午核對畫材/);assert.match(a.nodes['#modal-root'].innerHTML,/disabled/);assert.equal(a.read('timetableNoteDraft.stage'),'review');
 a.click({action:'tt-note-back'});assert.equal(a.read('timetableNoteDraft.draft.text'),'下午核對畫材\n提醒老師準備工作坊');a.click({action:'tt-note-save'});assert.equal(a.read('timetableNoteDraft.stage'),'edit');a.click({action:'tt-note-close'});assert.equal(a.read('modal'),'');assert.deepEqual(a.read('db'),before);assert.equal(a.scheduleCalls.filter(x=>x.operation==='save').length,0);
});
test('a teacher may compose visible calendar date drafts and notes for an exact authorized lesson',async()=>{
 const row=sharedScheduleRecord(),user={...sharedTestUser,id:'linked-teacher',role:'teacher',teacherResourceIds:['own-teacher']},a=await sharedScheduleApp({rows:[row],revision:1},{session:async()=>({user}),schedules:async()=>teacherScheduleFixture(row)});
 a.set('renderModal()');a.click({action:'tt-note-open',noteKind:'date',date:'2026-09-01'});assert.equal(a.nodes['#modal-root'].innerHTML,'');a.click({action:'tt-note-open',noteKind:'date',date:'2026-10-07'});assert.match(a.nodes['#modal-root']?.innerHTML||'',/tt-note-form/);a.click({action:'tt-note-close'});a.click({action:'tt-note-open',noteKind:'date',date:'2026-10-08'});assert.match(a.nodes['#modal-root']?.innerHTML||'',/tt-note-form/);a.click({action:'tt-note-close'});
 a.click({openLesson:'qa-schedule',lessonKind:'schedule',lessonDate:'2026-10-08',lessonSequence:'1'});a.click({action:'tt-note-open',noteKind:'lesson',scheduleId:'qa-schedule',sequence:'2',date:'2026-10-08'});assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/tt-note-form/);
 a.click({action:'tt-note-open',noteKind:'lesson',scheduleId:'qa-schedule',sequence:'1',date:'2026-10-08'});assert.match(a.nodes['#modal-root']?.innerHTML||'',/tt-note-form/);assert.equal(a.read('timetableNoteDraft.scheduleId'),'qa-schedule');a.click({action:'tt-note-close'});assert.match(a.nodes['#modal-root'].innerHTML,/lesson-detail-title/);
});
test('student forged note actions and submissions cannot expose an editor or mutate shared data',async()=>{
 const a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1});a.set("applySharedUser({id:'student',role:'student',displayName:'Student'});tab='overview';location.pathname='/account';render();renderModal()");a.set('renderModal()');const before=a.read('db');for(const noteKind of ['date','lesson'])a.click({action:'tt-note-open',noteKind,date:'2026-10-08',scheduleId:'qa-schedule',sequence:'1'});a.submit('tt-note-form',{text:'forged'});a.click({action:'tt-note-save'});assert.doesNotMatch(a.nodes['#modal-root'].innerHTML,/tt-note-form/);assert.deepEqual(a.read('db'),before);
});
test('a note is discarded on identity changes or when its exact occurrence moves and does not reopen from delayed roster reads',async()=>{
 const remote={rows:[sharedScheduleRecord()],revision:1},a=await sharedScheduleApp(remote);a.click({openLesson:'qa-schedule',lessonKind:'schedule',lessonDate:'2026-10-08',lessonSequence:'1'});a.click({action:'tt-note-open',noteKind:'lesson',scheduleId:'qa-schedule',sequence:'1',date:'2026-10-08'});assert.match(a.nodes['#modal-root']?.innerHTML||'',/tt-note-form/);
 remote.rows[0]=sharedScheduleRecord({exceptions:[{sequence:1,overrides:{date:'2026-10-09'}}]});remote.revision++;await a.set('refreshSharedSchedules()');assert.equal(a.read('timetableNoteDraft'),null);assert.equal(a.read('modal'),'');assert.doesNotMatch(a.nodes['#app'].innerHTML,/tt-note-form/);
 a.click({action:'tt-note-open',noteKind:'date',date:'2026-10-08'});a.set("applySharedUser({id:'student-next',role:'student',displayName:'Student'});render()");assert.equal(a.read('timetableNoteDraft'),null);assert.equal(a.read('modal'),'');
});
test('closing a date note restores both fourteen-day grids and the exact originating date control',async()=>{
 const a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1});a.set("timetableView='range';timetableViewSettings.rangeDays=14;render()");const grids=[{scrollTop:182,scrollLeft:14},{scrollTop:702,scrollLeft:221}],sidebar={scrollTop:111},opener={dataset:{action:'tt-note-open',noteKind:'date',date:'2026-10-15'},isConnected:false,focus(){this.focused=true;}};a.ctx.document.activeElement=opener;a.nodes['.tt-sidebar']=sidebar;a.ctx.document.querySelectorAll=selector=>selector==='.tt-grid-scroll'?grids:selector==='[data-action="tt-note-open"]'?[opener]:[];
 let html=a.nodes['#app'].innerHTML;Object.defineProperty(a.nodes['#app'],'innerHTML',{get:()=>html,set:value=>{html=value;grids.forEach(grid=>{grid.scrollTop=0;grid.scrollLeft=0});sidebar.scrollTop=0;}});a.click({action:'tt-note-open',noteKind:'date',date:'2026-10-15'});assert.match(a.nodes['#modal-root']?.innerHTML||'',/tt-note-form/);a.set('sharedViewDirty=true');a.click({action:'tt-note-close'});assert.deepEqual(grids,[{scrollTop:182,scrollLeft:14},{scrollTop:702,scrollLeft:221}]);assert.equal(sidebar.scrollTop,111);assert.equal(opener.focused,true);
});
test('notes preserve native multiline drafts and ignore IME escape until composition finishes',async()=>{
 const a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1});a.click({action:'tt-note-open',noteKind:'date',date:'2026-10-08'});assert.match(a.nodes['#modal-root']?.innerHTML||'',/tt-note-form/);const input={name:'text',value:'中文輸入\n下一行',closest:selector=>selector==='#tt-note-form'?{}:null};a.input(input);a.keydown('Escape',{isComposing:true});assert.ok(a.read('timetableNoteDraft'));assert.equal(a.read('timetableNoteDraft.draft.text'),'中文輸入\n下一行');a.submit('tt-note-form',{text:input.value});a.keydown('Escape');assert.equal(a.read('timetableNoteDraft.stage'),'edit');assert.equal(a.read('timetableNoteDraft.draft.text'),input.value);a.keydown('Escape');assert.equal(a.read('timetableNoteDraft'),null);
});

test('late lesson roster refresh leaves an active note editor and native draft untouched',async()=>{
 const gate=deferred(),a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1},{lessonStudents:()=>gate.promise});a.click({openLesson:'qa-schedule',lessonKind:'schedule',lessonDate:'2026-10-08',lessonSequence:'1'});a.click({action:'tt-note-open',noteKind:'lesson',scheduleId:'qa-schedule',sequence:'1',date:'2026-10-08'});
 const input={name:'text',value:'正在輸入中文\n下一行',closest:selector=>selector==='#tt-note-form'?{}:null};a.input(input);a.ctx.document.activeElement=input;const root=a.nodes['#modal-root'];let html=root.innerHTML,writes=0;Object.defineProperty(root,'innerHTML',{get:()=>html,set:value=>{writes++;html=value;}});
 const pending=a.set('refreshLessonStudents()');gate.resolve({students:[{id:'new-session',studentId:'exact-student',displayName:'Updated roster'}],occupied:1});await pending;await Promise.resolve();
 assert.match(root.innerHTML,/tt-note-form/);assert.equal(writes,0);assert.equal(a.read('timetableNoteDraft.draft.text'),input.value);assert.equal(a.ctx.document.activeElement,input);a.click({action:'tt-note-close'});assert.match(root.innerHTML,/Updated roster/,'Fresh roster is available when returning to the parent lesson');
});
test('note Review Back preserves textarea selection and both editor and body scrolling',async()=>{
 const a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1});a.click({action:'tt-note-open',noteKind:'date',date:'2026-10-08'});const body={scrollTop:191,scrollLeft:7},textarea={selectionStart:2,selectionEnd:5,selectionDirection:'backward',scrollTop:82,scrollLeft:9,focus(){a.ctx.document.activeElement=this;},setSelectionRange(start,end,direction){this.selectionStart=start;this.selectionEnd=end;this.selectionDirection=direction;}};a.nodes['.tt-note-body']=body;a.nodes['#tt-note-text']=textarea;
 a.submit('tt-note-form',{text:'中文草稿\n第二行'});body.scrollTop=0;body.scrollLeft=0;Object.assign(textarea,{selectionStart:0,selectionEnd:0,selectionDirection:'none',scrollTop:0,scrollLeft:0});a.click({action:'tt-note-back'});
 assert.equal(body.scrollTop,191);assert.equal(body.scrollLeft,7);assert.equal(textarea.selectionStart,2);assert.equal(textarea.selectionEnd,5);assert.equal(textarea.selectionDirection,'backward');assert.equal(textarea.scrollTop,82);assert.equal(textarea.scrollLeft,9);assert.equal(a.ctx.document.activeElement,textarea);assert.equal(a.read('timetableNoteDraft.draft.text'),'中文草稿\n第二行');
});
test('note modal Tab recaptures external focus and handles an empty control list',async()=>{
 const a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1});a.click({action:'tt-note-open',noteKind:'date',date:'2026-10-08'});const control=()=>({focus(){a.ctx.document.activeElement=this;}}),first=control(),last=control(),dialog=control();a.nodes['.tt-note-dialog']=dialog;a.ctx.document.querySelectorAll=selector=>selector.startsWith('.tt-note-dialog')?[first,last]:[];
 for(const shiftKey of [false,true]){a.ctx.document.activeElement=control();let prevented=false;a.keydown('Tab',{shiftKey,preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(a.ctx.document.activeElement,shiftKey?last:first);}
 a.ctx.document.querySelectorAll=()=>[];a.ctx.document.activeElement=control();let prevented=false;a.keydown('Tab',{preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(a.ctx.document.activeElement,dialog);
});

test('schedule scope Tab recaptures outside focus and falls back to the dialog while busy',async()=>{
 const a=await scopedScheduleApp(),form=scopedEditor(a,{values:{time:'12:45'}});await a.submit(form.id,form.values,form);const controls=a.nodes['.schedule-scope-modal'].querySelectorAll('button,input');for(const control of controls)control.focus=function(){a.ctx.document.activeElement=this;};const dialog={focus(){a.ctx.document.activeElement=this;}};a.nodes['.schedule-scope-dialog']=dialog;a.ctx.document.querySelectorAll=selector=>selector.startsWith('.schedule-scope-dialog')?controls.filter(control=>!control.disabled):[];
 for(const shiftKey of [false,true]){const outside={id:'background'};a.ctx.document.activeElement=outside;let prevented=false;a.keydown('Tab',{shiftKey,preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.notEqual(a.ctx.document.activeElement,outside);}
 controls.forEach(control=>control.disabled=true);a.ctx.document.activeElement={id:'outside'};let prevented=false;a.keydown('Tab',{preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(a.ctx.document.activeElement,dialog);assert.equal(a.occurrenceCalls.length,0);
});
test('a dirty schedule editor close restores the replacement exact opener and consumes its saved return',async()=>{
 const a=await scopedScheduleApp(),grid={scrollTop:277,scrollLeft:31,isConnected:true},replacementGrid={scrollTop:0,scrollLeft:0,isConnected:true},dataset={editActivity:'qa-scoped-series',activityKind:'schedule',activityDate:'2026-10-21',activitySequence:'2'};let restored=0;const opener={dataset,isConnected:true,closest:selector=>selector==='.tt-grid-scroll'?grid:null,focus(){a.ctx.document.activeElement=this;}},replacement={dataset:{...dataset},isConnected:true,closest:selector=>selector==='.tt-grid-scroll'?replacementGrid:null,focus(){restored++;a.ctx.document.activeElement=this;}};a.ctx.document.activeElement=opener;scopedEditor(a);
 let html=a.nodes['#app'].innerHTML;Object.defineProperty(a.nodes['#app'],'innerHTML',{get:()=>html,set:value=>{html=value;opener.isConnected=false;grid.isConnected=false;a.ctx.document.activeElement=a.ctx.document.body;}});a.ctx.document.querySelectorAll=selector=>selector==='button'?[replacement]:[];a.set('sharedViewDirty=true');a.click({action:'close'});assert.equal(a.read('modal'),'');assert.equal(a.read('courseEditorReturnFocus'),null);assert.equal(restored,1);assert.equal(replacementGrid.scrollTop,277);assert.equal(replacementGrid.scrollLeft,31);assert.equal(a.occurrenceCalls.length,0);
});
test('Course exact lesson Edit cancel restores the same lesson tab scroll and full Course return chain',async()=>{
 const a=await scopedScheduleApp();a.set("location.pathname='/account/courses/qa-course';courseDetailMonth=new Date(2026,9,1);courseDetailTab='general';render()");const dateButton={dataset:{openLesson:'qa-scoped-series',lessonKind:'schedule',lessonDate:'2026-10-21',lessonSequence:'2'},isConnected:true,focus(){a.ctx.document.activeElement=this;}},courseScroll={scrollTop:77,scrollLeft:211},detail={scrollTop:348,scrollLeft:9};a.nodes['.course-schedule-scroll']=courseScroll;a.nodes['.lesson-dialog-scroll']=detail;a.ctx.document.querySelectorAll=selector=>selector==='[data-open-lesson]'?[dateButton]:[];a.ctx.document.activeElement=dateButton;a.click(dateButton.dataset,dateButton);const editButton={dataset:{action:'lesson-edit'},isConnected:true,focus(){a.ctx.document.activeElement=this;}};a.ctx.document.activeElement=editButton;await a.click({action:'lesson-edit'});assert.match(a.read('modal'),/id="schedule-editor"/);a.click({action:'close'});
 assert.equal(a.read('selectedTimetableLesson.id'),'qa-scoped-series');assert.equal(a.read('selectedTimetableLesson.sequence'),2);assert.equal(a.read('selectedTimetableLesson.date'),'2026-10-21');assert.match(a.read('modal'),/lesson-detail-title/);assert.equal(detail.scrollTop,348);assert.equal(a.read('courseLessonReturn.path'),'/account/courses/qa-course');a.click({action:'lesson-close'});assert.equal(a.read('location.pathname'),'/account/courses/qa-course');assert.equal(courseScroll.scrollLeft,211);assert.equal(a.ctx.document.activeElement,dateButton);assert.equal(a.occurrenceCalls.length,0);
});

test('cancelling a new schedule after dirty repaint restores both range grids sidebar and exact replacement cell',async()=>{
 const a=await scopedScheduleApp();a.set("location.pathname='/account';tab='overview';timetableView='range';timetableViewSettings.rangeDays=14;selectTimetableDate('2026-10-14');render()");
 const grids=[{scrollTop:134,scrollLeft:16,isConnected:true},{scrollTop:711,scrollLeft:263,isConnected:true}],sidebar={scrollTop:99},dataset={action:'tt-add-cell',date:'2026-10-22',time:'10:15'};
 const makeCell=()=>({dataset:{...dataset},isConnected:true,focus(){a.ctx.document.activeElement=this},closest:selector=>selector==='.tt-grid-scroll'?grids[1]:null});let cell=makeCell();
 a.ctx.document.activeElement=cell;a.nodes['.tt-sidebar']=sidebar;a.ctx.document.querySelectorAll=selector=>selector==='.tt-grid-scroll'?grids:selector==='button'?[cell]:[];
 let html=a.nodes['#app'].innerHTML;Object.defineProperty(a.nodes['#app'],'innerHTML',{get:()=>html,set:value=>{html=value;cell.isConnected=false;cell=makeCell();grids.forEach(grid=>{grid.scrollTop=0;grid.scrollLeft=0});sidebar.scrollTop=0}});
 await a.click(dataset,cell);assert.ok(a.read('scheduleDraft'));a.set('sharedViewDirty=true');await a.click({action:'close'});
 assert.deepEqual(grids.map(grid=>[grid.scrollTop,grid.scrollLeft]),[[134,16],[711,263]]);assert.equal(sidebar.scrollTop,99);assert.equal(a.ctx.document.activeElement,cell);assert.equal(a.read('modal'),'');assert.equal(a.scheduleCalls.filter(call=>call.operation==='save').length,0);
});

test('pending schedule preparation is invalidated by Course month change Back to the same route and identity change',async()=>{
 for(const outcome of ['month','back','identity']){
  const gate=deferred();let reads=0;
  const a=await scopedScheduleApp(undefined,{classTypes:async()=>{reads++;return gate.promise},createClassType:async()=>({}),updateClassType:async()=>({})});
  a.set("location.pathname='/account/courses/qa-course';tab='catalog';courseDetailMonth=new Date(2026,9,1);courseDetailTab='general';history.replaceState({},'',location.pathname);render()");
  await a.click({action:'course-add-schedule'});for(let i=0;i<40;i++)await Promise.resolve();assert.ok(reads>0);assert.equal(a.read('scheduleDraft'),null);
  if(outcome==='month')await a.click({action:'course-month-next'});
  else if(outcome==='back')a.set("history.pushState({},'','/account');history.back()");
  else a.set("applySharedUser({id:'next-admin',role:'admin',displayName:'Next identity'});render()");
  gate.resolve({types:[],revision:'late-preparation'});for(let i=0;i<40;i++)await Promise.resolve();
  assert.equal(a.read('scheduleDraft'),null,outcome);assert.doesNotMatch(a.read('modal'),/id="schedule-editor"/,outcome);
 }
});

test('Browser Back discards a selected-lesson editor even when class types are unavailable',async()=>{
 const a=await scopedScheduleApp();a.set("location.pathname='/account/courses/qa-course';tab='catalog';courseDetailMonth=new Date(2026,9,1);courseDetailTab='general';render()");
 await a.click({openLesson:'qa-scoped-series',lessonKind:'schedule',lessonDate:'2026-10-21',lessonSequence:'2'});await a.click({action:'lesson-edit'});
 assert.equal(a.read('scheduleDraft.id'),'qa-scoped-series');assert.equal(a.read('scheduleDraft.typeContext??null'),null);
 a.set("history.replaceState({},'','/account/courses/qa-course');history.pushState({},'','/account');history.back()");
 assert.equal(a.read('scheduleDraft'),null);assert.equal(a.read('scheduleScopeDraft'),null);assert.equal(a.read('selectedTimetableLesson'),null);assert.doesNotMatch(a.read('modal'),/schedule-editor|lesson-detail-title/);
 await a.click({action:'close'});assert.equal(a.read('modal'),'');assert.equal(a.occurrenceCalls.length,0);
});

test('a busy whole-schedule editor cannot close and empty enabled controls retain focus in its dialog',async()=>{
 const a=await scopedScheduleApp();a.set("location.pathname='/account';tab='overview';render()");await a.click({action:'tt-add-schedule'});
 const form=sharedScheduleForm({values:{course:'qa-course',startDate:'2026-10-14',endMode:'count',count:'1',time:'13:30',duration:'45'}}),gate=deferred();a.client.saveSchedule=()=>gate.promise;
 const saving=a.submit(form.id,form.values,form);for(let i=0;i<40;i++)await Promise.resolve();assert.equal(a.read('scheduleSaving'),true);
 const modal=a.read('modal');await a.click({action:'close'});a.keydown('Escape');const retained=a.read('modal')===modal;
 let focused=false,prevented=false;a.nodes['.schedule-dialog']={focus(){focused=true}};a.ctx.document.activeElement={};a.ctx.document.querySelectorAll=()=>[];a.keydown('Tab',{preventDefault(){prevented=true}});
 gate.reject(serviceError(503,'SERVICE_UNAVAILABLE'));await saving;
 assert.equal(retained,true);assert.equal(prevented,true);assert.equal(focused,true);assert.equal(a.read('scheduleSaving'),false);assert.ok(a.read('scheduleDraft'));
});

test('schedule Escape lets Chinese composition finish before cancelling the draft or nested scope',async()=>{
 const a=await scopedScheduleApp(),form=scopedEditor(a,{values:{remark:'尚在輸入的中文備註'}});a.set("scheduleDraft.remark='尚在輸入的中文備註'");
 for(const composition of [{isComposing:true},{keyCode:229}]){a.keydown('Escape',composition);assert.equal(a.read('scheduleDraft.remark'),'尚在輸入的中文備註');assert.match(a.read('modal'),/id="schedule-editor"/);}
 await a.submit(form.id,form.values,form);assert.ok(a.read('scheduleScopeDraft'));
 for(const composition of [{isComposing:true},{keyCode:229}]){a.keydown('Escape',composition);assert.ok(a.read('scheduleScopeDraft'));}
 a.keydown('Escape');assert.equal(a.read('scheduleScopeDraft'),null);assert.ok(a.read('scheduleDraft'));a.keydown('Escape');assert.equal(a.read('scheduleDraft'),null);assert.equal(a.occurrenceCalls.length,0);
});

test('an administrator previews the exact Course public projection without private slot facts or writes',async()=>{
 const a=await availabilityUiApp();await a.click({openCourse:'qa-course'});a.set("selectTimetableDate('2026-10-15')");assert.match(a.nodes['#app'].innerHTML,/data-action="availability-preview-open"/);
 await a.click({action:'availability-preview-open',courseId:'qa-course'});await until(()=>a.read("availabilityOverlay?.kind==='public-preview'&&!availabilityOverlay.loading"),'Published Course preview must load');
 assert.match(a.read('modal'),/Published authoritative studio/);assert.match(a.read('modal'),/data-action="availability-preview-manage" data-slot-id="qa-available-slot"/);assert.doesNotMatch(a.read('modal'),/PRIVATE slot preparation|PRIVATE excluded person|qa-slot-teacher/);assert.equal(a.publicAvailabilityReads.at(-1).id,'qa-course');assert.equal(a.availabilityWrites.length,0);
 await a.click({action:'availability-preview-close'});assert.equal(a.read('modal'),'');assert.equal(a.read('location.pathname'),'/account/courses/qa-course');
});

test('a public preview slot opens its exact formal detail and standalone edit cancels through both parents',async()=>{
 const a=await availabilityUiApp();await a.click({openCourse:'qa-course'});a.set("selectTimetableDate('2026-10-15')");await a.click({action:'availability-preview-open',courseId:'qa-course'});await until(()=>a.read("availabilityOverlay?.kind==='public-preview'&&!availabilityOverlay.loading"),'Preview must load');
 await a.click({action:'availability-preview-manage',slotId:'qa-available-slot'});assert.equal(a.read('availabilityOverlay.kind'),'detail');assert.equal(a.read('availabilityOverlay.slot.id'),'qa-available-slot');
 await a.click({action:'availability-edit',slotId:'qa-available-slot'});assert.equal(a.read('availabilityOverlay.kind'),'editor');availabilityForm(a,availableSlotValues({remark:'Unsaved preview source draft'}));
 await a.click({action:'availability-editor-cancel'});assert.equal(a.read('availabilityOverlay.kind'),'detail');assert.equal(a.read('availabilityOverlay.slot.id'),'qa-available-slot');await a.click({action:'availability-close'});assert.equal(a.read('availabilityOverlay.kind'),'public-preview');assert.equal(a.read('availabilityOverlay.from'),'2026-10-15');assert.equal(a.availabilityWrites.length,0);
});

test('preview management is unavailable to students teachers and forged slots absent from the published range',async()=>{
 const a=await availabilityUiApp();await a.click({openCourse:'qa-course'});a.set("selectTimetableDate('2026-10-15')");await a.click({action:'availability-preview-open',courseId:'qa-course'});await until(()=>a.read("availabilityOverlay?.kind==='public-preview'&&!availabilityOverlay.loading"),'Preview must load');const reads=a.availabilityReads.length;
 await a.click({action:'availability-preview-manage',slotId:'forged-private-slot'});assert.equal(a.availabilityReads.length,reads);assert.equal(a.read('availabilityOverlay.kind'),'public-preview');
 for(const role of ['teacher','student']){a.set(`applySharedUser({id:'new-${role}',role:'${role}',displayName:'Changed role'});tab='overview';render()`);const count=a.publicAvailabilityReads.length;await a.click({action:'availability-preview-open',courseId:'qa-course'});assert.equal(a.read('availabilityOverlay'),null);assert.equal(a.publicAvailabilityReads.length,count);}
});

test('public preview linked time edits its exact occurrence and cancels back to the formal slot then preview',async()=>{
 const slot=formalAvailableSlot({sourceKind:'linked',scheduleId:'qa-scoped-series',sequence:2,date:'2026-10-21'}),record=scopedScheduleRecord(),a=await availabilityUiApp({slots:[slot]});a.set(`db.schedules=${JSON.stringify([record])}`);await a.click({openCourse:'qa-course'});a.set("selectTimetableDate('2026-10-21')");await a.click({action:'availability-preview-open',courseId:'qa-course'});await until(()=>a.read("availabilityOverlay?.kind==='public-preview'&&!availabilityOverlay.loading"),'Preview must load');await a.click({action:'availability-preview-manage',slotId:slot.id});assert.match(a.read('modal'),/data-action="availability-source-edit"/);
 await a.click({action:'availability-source-edit',slotId:slot.id});assert.equal(a.read('scheduleDraft.id'),'qa-scoped-series');assert.equal(a.read('scheduleDraft.occurrenceSequence'),2);assert.equal(a.read('scheduleDraft.occurrenceDate'),'2026-10-21');assert.equal(a.read('availabilityOverlay'),null);await a.click({action:'close'});assert.equal(a.read('availabilityOverlay.kind'),'detail');assert.equal(a.read('availabilityOverlay.slot.id'),slot.id);await a.click({action:'availability-close'});assert.equal(a.read('availabilityOverlay.kind'),'public-preview');assert.equal(a.read('availabilityOverlay.from'),'2026-10-21');assert.equal(a.availabilityWrites.length,0);
});

test('Course public preview rejects mismatched public DTOs without falling back to private Course or slot records',async()=>{
 for(const invalid of ['course','range','date','duplicate']){
  const remote={},a=await availabilityUiApp(remote);await a.click({openCourse:'qa-course'});a.set("selectTimetableDate('2026-10-15')");
  const original=a.client.publicCourseDetails;a.client.publicCourseDetails=async(...args)=>{const value=await original(...args);if(invalid==='course')value.course.id='different-course';if(invalid==='range')value.rangeDays=31;if(invalid==='date')value.slots[0].date='2026-10-22';if(invalid==='duplicate')value.slots.push(copy(value.slots[0]));return value;};
  await a.click({action:'availability-preview-open',courseId:'qa-course'});assert.equal(a.read('availabilityOverlay.loading'),false);assert.ok(a.read('availabilityOverlay.error'));assert.equal(a.read('availabilityOverlay.course'),null);assert.deepEqual(a.read('availabilityOverlay.slots'),[]);assert.doesNotMatch(a.read('modal'),/PRIVATE slot preparation|PRIVATE excluded person|data-action="availability-preview-manage"/);assert.equal(a.availabilityWrites.length,0);
 }
});

test('Course public preview handles unpublished errors and retries its public source with the selected seven-day date',async()=>{
 const a=await availabilityUiApp(),original=a.client.publicCourseDetails;let reads=0;a.client.publicCourseDetails=async(...args)=>{reads++;if(reads===1)throw serviceError(404,'COURSE_NOT_FOUND');return original(...args);};await a.click({openCourse:'qa-course'});a.set("selectTimetableDate('2026-10-15')");await a.click({action:'availability-preview-open',courseId:'qa-course'});assert.ok(a.read('availabilityOverlay.error'));assert.match(a.read('modal'),/not published/i);assert.doesNotMatch(a.read('modal'),/PRIVATE slot preparation|data-action="availability-preview-manage"/);await a.click({action:'availability-preview-refresh'});assert.equal(a.read('availabilityOverlay.error'),'');assert.equal(a.read('availabilityOverlay.from'),'2026-10-15');assert.equal(a.read('availabilityOverlay.to'),'2026-10-21');assert.equal(reads,2);assert.equal(a.availabilityWrites.length,0);
});

test('late Course public projection cannot recreate a preview after close month navigation or identity change',async()=>{
 for(const outcome of ['close','month','identity']){const gate=deferred(),a=await availabilityUiApp(),original=a.client.publicCourseDetails;a.client.publicCourseDetails=async(...args)=>{const value=await original(...args);await gate.promise;return value;};await a.click({openCourse:'qa-course'});a.set("selectTimetableDate('2026-10-15')");const pending=a.click({action:'availability-preview-open',courseId:'qa-course'});await until(()=>a.read("availabilityOverlay?.kind==='public-preview'&&availabilityOverlay.loading"),'The preview must actually be pending');if(outcome==='close')await a.click({action:'availability-preview-close'});else if(outcome==='month'){a.set('courseDetailMonth=new Date(2026,10,1);render()');assert.equal(a.read('courseDetailMonth.getMonth()'),10);}else a.set("applySharedUser({id:'different-admin',role:'admin',displayName:'Different'});render()");gate.resolve();await pending;assert.equal(a.read('availabilityOverlay'),null,outcome);assert.doesNotMatch(a.read('modal'),/availability-preview-dialog|Published authoritative studio/,outcome);assert.equal(a.availabilityWrites.length,0);}
});

test('preview slot editing stays bound to its formal detail and Chinese composition preserves its native draft',async()=>{
 const a=await availabilityUiApp();await a.click({openCourse:'qa-course'});a.set("selectTimetableDate('2026-10-15')");await a.click({action:'availability-preview-open',courseId:'qa-course'});await a.click({action:'availability-preview-manage',slotId:'qa-available-slot'});
 a.set("availabilityRecords.set('other-hidden-slot',{...availabilityOverlay.slot,id:'other-hidden-slot'})");await a.click({action:'availability-edit',slotId:'other-hidden-slot'});assert.equal(a.read('availabilityOverlay.kind'),'detail');assert.equal(a.read('availabilityOverlay.slot.id'),'qa-available-slot');
 await a.click({action:'availability-edit',slotId:'qa-available-slot'});const form=availabilityForm(a,availableSlotValues({remark:'正在輸入的中文備註'}));
 for(const composition of [{isComposing:true},{keyCode:229}]){a.keydown('Escape',composition);assert.equal(a.read('availabilityOverlay.kind'),'editor');assert.equal(a.nodes['#availability-editor'],form);assert.equal(form.values.remark,'正在輸入的中文備註');}
 a.keydown('Escape');assert.equal(a.read('availabilityOverlay.kind'),'detail');assert.equal(a.availabilityWrites.length,0);
});

test('closing availability details cancels a pending editor resource preparation',async()=>{
 const a=await availabilityUiApp();await a.click({openCourse:'qa-course'});a.set("selectTimetableDate('2026-10-15')");await a.click({action:'availability-preview-open',courseId:'qa-course'});await a.click({action:'availability-preview-manage',slotId:'qa-available-slot'});const gate=deferred(),original=a.client.schedulingResources;let reads=0;a.client.schedulingResources=async()=>{reads++;await gate.promise;return original();};a.set('resourceReady=false');const opening=a.click({action:'availability-edit',slotId:'qa-available-slot'});await until(()=>reads>0,'The editor resources must really be pending');assert.equal(a.read('availabilityOverlay.kind'),'detail');await a.click({action:'availability-close'});assert.equal(a.read('availabilityOverlay.kind'),'public-preview');gate.resolve();await opening;assert.equal(a.read('availabilityOverlay.kind'),'public-preview');assert.equal(a.availabilityWrites.length,0);
});
test('invalid public preview dates also block forged slot management reads',async()=>{
 const a=await availabilityUiApp();await a.click({openCourse:'qa-course'});a.set("selectTimetableDate('2026-10-15')");await a.click({action:'availability-preview-open',courseId:'qa-course'});a.change('from','2026-02-30',{id:'availability-preview-from'});assert.ok(a.read('availabilityOverlay.dateError'));assert.doesNotMatch(a.read('modal'),/data-action="availability-preview-manage"/);const reads=a.availabilityReads.length;await a.click({action:'availability-preview-manage',slotId:'qa-available-slot'});assert.equal(a.availabilityReads.length,reads);assert.equal(a.read('availabilityOverlay.kind'),'public-preview');assert.equal(a.availabilityWrites.length,0);
});

test('saving a preview managed time returns through a fresh public read rather than a copied private acknowledgement',async()=>{
 const a=await availabilityUiApp();await a.click({openCourse:'qa-course'});a.set("selectTimetableDate('2026-10-15')");await a.click({action:'availability-preview-open',courseId:'qa-course'});await a.click({action:'availability-preview-manage',slotId:'qa-available-slot'});await a.click({action:'availability-edit',slotId:'qa-available-slot'});
 const form=availabilityForm(a,availableSlotValues({time:'14:30'})),save=a.client.saveAvailableSlot;a.client.saveAvailableSlot=async(...args)=>{const result=await save(...args);a.availabilityRemote.publishedSlots=[publicAvailableSlot(result.slot)];a.availabilityRemote.publicRevision++;return result;};const before=a.publicAvailabilityReads.length;await a.submit(form.id,form.values,form);await until(()=>a.read("availabilityOverlay?.kind==='public-preview'&&!availabilityOverlay.loading"),'The saved preview must complete a fresh public read');
 assert.equal(a.availabilityWrites.length,1);assert.equal(a.publicAvailabilityReads.length,before+1);assert.equal(a.read('availabilityOverlay.slots[0].time'),'14:30');assert.match(a.read('modal'),/14:30/);assert.doesNotMatch(a.read('modal'),/Typed private slot note/);
});

test('invalid preview date input retains the empty value that needs correction rather than displaying a valid date with an error',async()=>{
 const a=await availabilityUiApp();await a.click({openCourse:'qa-course'});a.set("selectTimetableDate('2026-10-15')");await a.click({action:'availability-preview-open',courseId:'qa-course'});a.change('from','',{id:'availability-preview-from'});assert.ok(a.read('availabilityOverlay.dateError'));assert.equal(a.read('availabilityOverlay.from'),'2026-10-15');const input=a.read('modal').match(/<input[^>]*id="availability-preview-from"[^>]*>/)?.[0]||'';assert.match(input,/value=""/);assert.doesNotMatch(a.read('modal'),/data-action="availability-preview-manage"/);
 await a.click({action:'availability-preview-refresh'});assert.equal(a.read('availabilityOverlay.dateError'),'');assert.match(a.read('modal').match(/<input[^>]*id="availability-preview-from"[^>]*>/)?.[0]||'',/value="2026-10-15"/);
});

const publicRangeReply=(a,id,from,days)=>{const rangeDays=days??a.availabilityRemote.settings.rangeDays;const to=new Date(Math.min(Date.parse(from+'T00:00:00Z')+(rangeDays-1)*86400000,Date.parse('9999-12-31T00:00:00Z'))).toISOString().slice(0,10);return {course:copy(a.availabilityRemote.publicCourse),slots:copy(a.availabilityRemote.publishedSlots.filter(slot=>slot.date>=from&&slot.date<=to)),from,to,rangeDays,revision:`${from}-${rangeDays}`};};

test('public visitor uses centre default and can change range without losing the course or accepting a late older window',async()=>{
 const a=await availabilityUiApp({settings:{showFullTrialSlots:false,showReschedulingSlots:false,rangeDays:14,version:2}}),reads=[];let gate;
 a.client.publicCourseDetails=async(id,from,revision,days)=>{reads.push({id,from,days});if(gate&&days===30)return gate.promise;return publicRangeReply(a,id,from,days);};
 a.set("applySharedUser(null);lang='en'");await a.click({action:'availability-public-course',courseId:'qa-course'});await until(()=>a.read("publicAvailabilityDetails.get('qa-course')?.ready"),'Default public window must load');
 assert.equal((a.nodes['#app'].innerHTML.match(/data-availability-date=/g)||[]).length,14);assert.equal(reads[0].days,undefined);
 gate=deferred();a.change('days','30',{id:'availability-public-days'});await until(()=>reads.some(r=>r.days===30),'30-day selection must dispatch');
 a.change('days','8',{id:'availability-public-days'});await until(()=>a.read("publicAvailabilityDetails.get('qa-course')?.rangeDays")===8,'Eight-day result must be selected');
 gate.resolve(publicRangeReply(a,'qa-course',reads[0].from,30));await until(()=>!a.read('publicAvailabilityReads.size'),'Both requests settle');
 assert.equal((a.nodes['#app'].innerHTML.match(/data-availability-date=/g)||[]).length,8);assert.equal(a.read('publicAvailabilityDays'),8);assert.equal(a.availabilityWrites.length,0);
});

test('management preview uses same public range default and keeps explicit range through exact detail cancellation',async()=>{
 const a=await availabilityUiApp({settings:{showFullTrialSlots:false,showReschedulingSlots:false,rangeDays:14,version:2}}),reads=[];
 a.client.publicCourseDetails=async(id,from,revision,days)=>{reads.push({id,from,days});return publicRangeReply(a,id,from,days);};
 await a.click({openCourse:'qa-course'});a.set("selectTimetableDate('2026-10-15')");await a.click({action:'availability-preview-open',courseId:'qa-course'});
 assert.equal(a.read('availabilityOverlay.rangeDays'),14);assert.equal(a.read('availabilityOverlay.to'),'2026-10-28');
 a.change('days','30',{id:'availability-preview-days'});await until(()=>a.read('availabilityOverlay.rangeDays')===30&&!a.read('availabilityOverlay.loading'),'Preview range must refresh');
 assert.equal(a.read('availabilityOverlay.to'),'2026-11-13');assert.equal(reads.at(-1).days,30);
 await a.click({action:'availability-preview-manage',slotId:'qa-available-slot'});await a.click({action:'availability-close'});
 assert.equal(a.read('availabilityOverlay.kind'),'public-preview');assert.equal(a.read('availabilityOverlay.rangeDays'),30);assert.match(a.read('modal'),/Next 30 days/);assert.equal(a.availabilityWrites.length,0);
});

test('public default range saves with other settings and invalid values preserve the open draft without a write',async()=>{
 const a=await availabilityUiApp();await openAvailabilityTimetable(a);await a.click({action:'availability-public-settings-open'});
 let values={rangeDays:'6',showFullTrialSlots:'on'},f=availabilityForm(a,values,'availability-public-settings');await a.submit(f.id,values,f);
 assert.equal(a.availabilityWrites.length,0);assert.ok(a.nodes['#availability-settings-error'].textContent);assert.equal(a.read('availabilityOverlay.kind'),'settings');
 values={rangeDays:'30',showFullTrialSlots:'on'};f=availabilityForm(a,values,'availability-public-settings');await a.submit(f.id,values,f);
 assert.equal(a.availabilityWrites.length,1);assert.equal(a.availabilityWrites[0].settings.rangeDays,30);assert.equal(a.availabilityRemote.settings.rangeDays,30);
});

test('public date draft is retained with a clear error and refresh restores the last canonical window',async()=>{
 const a=await availabilityUiApp();a.set("applySharedUser(null);lang='en'");await a.click({action:'availability-public-course',courseId:'qa-course'});await until(()=>a.read("publicAvailabilityDetails.get('qa-course')?.ready"),'Public source must load');
 const canonical=a.read('publicAvailabilityFrom'),reads=a.publicAvailabilityReads.length;
 a.change('from','',{id:'availability-public-from'});
 assert.match(a.nodes['#app'].innerHTML,/id="availability-public-from"[^>]*value=""[^>]*aria-invalid="true"/);assert.match(a.nodes['#app'].innerHTML,/Choose a valid start date/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-availability-slot-id=|No available times/);assert.equal(a.publicAvailabilityReads.length,reads);
 await a.click({action:'availability-public-refresh'});await until(()=>a.read("publicAvailabilityDetails.get('qa-course')?.ready"),'Refresh restores canonical range');
 assert.equal(a.read('publicAvailabilityFrom'),canonical);assert.doesNotMatch(a.nodes['#app'].innerHTML,/aria-invalid|Choose a valid start date/);assert.equal(a.availabilityWrites.length,0);
});

test('public range navigation restores the matching previous or next button focus',async()=>{
 const a=await availabilityUiApp();a.set("applySharedUser(null);lang='en'");await a.click({action:'availability-public-course',courseId:'qa-course'});await until(()=>a.read("publicAvailabilityDetails.get('qa-course')?.ready"),'Public source must load');
 let focused=false;const next={focus(){focused=true},isConnected:true};a.nodes['[data-action="availability-public-range"][data-direction="next"]']=next;
 await a.click({action:'availability-public-range',from:'2026-10-22',direction:'next'});assert.equal(focused,true);
});

test('an initial unchanged public response cannot invent a loaded empty course',async()=>{
 const a=await availabilityUiApp();a.client.publicCourseDetails=async()=>({unchanged:true,rangeDays:14,from:'2026-10-14',to:'2026-10-27',revision:'not-a-source'});a.set("applySharedUser(null);lang='en'");await a.click({action:'availability-public-course',courseId:'qa-course'});await until(()=>a.read("publicAvailabilityDetails.get('qa-course')?.ready"),'Malformed response settles as an error');assert.ok(a.read("publicAvailabilityDetails.get('qa-course').error"));assert.doesNotMatch(a.nodes['#app'].innerHTML,/No available times/);
});

test('explicit public reload requests a full source for both directory and course instead of rejecting a valid conditional reply',async()=>{
 const a=await availabilityUiApp();let details=0,directories=0;
 a.client.publicCourses=async revision=>{directories++;return revision?{unchanged:true,revision}:{courses:[copy(a.availabilityRemote.publicCourse)],revision:'directory-current'};};
 a.client.publicCourseDetails=async(id,from,revision,days)=>{details++;const result=publicRangeReply(a,id,from,days);return revision?{unchanged:true,revision,from,to:result.to,rangeDays:result.rangeDays}:result;};
 a.set("applySharedUser(null);lang='en';go('/classes')");await until(()=>a.read('publicCoursesCache.ready'),'Directory source loads');await a.click({action:'availability-public-refresh'});await until(()=>directories>=2&&a.read('publicCoursesCache.ready'),'Directory force reload settles');assert.equal(a.read('publicCoursesCache.error'),'');
 await a.click({action:'availability-public-course',courseId:'qa-course'});await until(()=>a.read("publicAvailabilityDetails.get('qa-course')?.ready"),'Course source loads');await a.click({action:'availability-public-refresh'});await until(()=>details>=2&&a.read("publicAvailabilityDetails.get('qa-course')?.ready"),'Course force reload settles');assert.equal(a.read("publicAvailabilityDetails.get('qa-course').error"),'');assert.match(a.nodes['#app'].innerHTML,/Published authoritative studio/);
});

async function publicTrialApp(remote={}){const a=await availabilityUiApp(remote);a.set("applySharedUser(null);lang='en'");await a.click({action:'availability-public-course',courseId:'qa-course'});await until(()=>a.read("publicAvailabilityDetails.get('qa-course')?.ready"),'Published course must load before selecting a trial');return a;}
const publicFilterSlots=()=>[
 {...publicAvailableSlot(formalAvailableSlot()),classAvailability:'unknown',classType:null},
 {...publicAvailableSlot(formalAvailableSlot({id:'trial-only'})),classAvailability:null,classType:null,reschedulingVisible:false},
];

test('public time type filters are local views and keep the chosen type through range and trial return',async()=>{
 const a=await publicTrialApp({publishedSlots:publicFilterSlots()}),reads=a.publicAvailabilityReads.length;
 a.change('slotType','class',{id:'availability-public-type'});assert.equal(a.read('publicAvailabilityType'),'class');assert.match(a.nodes['#app'].innerHTML,/<option value="class" selected>/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-availability-slot-id="trial-only"/);assert.equal(a.publicAvailabilityReads.length,reads);assert.equal(a.availabilityWrites.length,0);
 await a.click({action:'availability-trial-open',courseId:'qa-course',slotId:'qa-available-slot'});assert.match(a.read('modal'),/public-trial-form/);await a.click({action:'public-trial-command',command:'close'});assert.equal(a.read('publicAvailabilityType'),'class');
 a.change('days','14',{id:'availability-public-days'});await until(()=>a.read("publicAvailabilityDetails.get('qa-course')?.ready"),'Range refresh settles');assert.equal(a.read('publicAvailabilityType'),'class');assert.match(a.nodes['#app'].innerHTML,/<option value="class" selected>/);
});

test('a filtered-out public trial cannot be opened with an old button payload and clear returns to all',async()=>{
 const a=await publicTrialApp({publishedSlots:publicFilterSlots()});a.change('slotType','class',{id:'availability-public-type'});
 await a.click({action:'availability-trial-open',courseId:'qa-course',slotId:'trial-only'});assert.equal(a.read('publicTrialOverlay'),null);assert.equal(a.read('modal'),'');
 await a.click({action:'availability-public-type-reset'});assert.equal(a.read('publicAvailabilityType'),'all');assert.match(a.nodes['#app'].innerHTML,/data-availability-slot-id="trial-only"/);assert.equal(a.availabilityWrites.length,0);
});

test('management preview type survives source details and filtered-out Manage cannot fetch private facts',async()=>{
 const a=await availabilityUiApp({publishedSlots:publicFilterSlots()});await a.click({openCourse:'qa-course'});a.set("selectTimetableDate('2026-10-15')");await a.click({action:'availability-preview-open',courseId:'qa-course'});await until(()=>a.read("availabilityOverlay?.kind==='public-preview'&&!availabilityOverlay.loading"),'Preview loads');
 a.change('slotType','class',{id:'availability-preview-type'});assert.equal(a.read('availabilityOverlay.slotType'),'class');assert.match(a.read('modal'),/<option value="class" selected>/);const reads=a.availabilityReads.length;
 await a.click({action:'availability-preview-manage',slotId:'trial-only'});assert.equal(a.read('availabilityOverlay.kind'),'public-preview');assert.equal(a.availabilityReads.length,reads);
 await a.click({action:'availability-preview-manage',slotId:'qa-available-slot'});assert.equal(a.read('availabilityOverlay.kind'),'detail');await a.click({action:'availability-close'});assert.equal(a.read('availabilityOverlay.slotType'),'class');assert.match(a.read('modal'),/<option value="class" selected>/);assert.equal(a.availabilityWrites.length,0);
});

test('a changed public class state repaints while the committed type select keeps its focus',async()=>{
 const a=await publicTrialApp({publishedSlots:publicFilterSlots()});a.change('slotType','class',{id:'availability-public-type'});
 const control={id:'availability-public-type',value:'class',matches:s=>s.includes('select'),focus(){a.ctx.document.activeElement=this}};a.nodes['#availability-public-type']=control;a.ctx.document.activeElement=control;
 a.availabilityRemote.publishedSlots[0].classAvailability='full';a.availabilityRemote.publicRevision++;await a.set('refreshPublicAvailability()');assert.match(a.nodes['#app'].innerHTML,/data-public-class-status="full"/);assert.equal(a.ctx.document.activeElement,control);assert.equal(a.availabilityWrites.length,0);
});

test('invalid public time type values normalize to All without new reads or writes',async()=>{
 const a=await publicTrialApp({publishedSlots:publicFilterSlots()});a.change('slotType','class',{id:'availability-public-type'});const reads=a.publicAvailabilityReads.length;
 a.change('slotType','<script>',{id:'availability-public-type'});assert.equal(a.read('publicAvailabilityType'),'all');assert.match(a.nodes['#app'].innerHTML,/<option value="all" selected>/);assert.equal(a.publicAvailabilityReads.length,reads);assert.equal(a.availabilityWrites.length,0);
});

const trialTyped={localName:'  林欣怡  ',fullName:'Isabel Lam',dateOfBirth:'2018-05-20',gender:'female',school:'晴川小學',referrer:'朋友介紹：梁太',parentName:'林嘉雯',whatsapp:'+852 0000 3333',email:'guardian@example.test',remark:'希望與同齡學生一起學水彩。'};

test('public trial starts at exact selected time with a blank person draft and no second course selection',async()=>{
 const a=await publicTrialApp();await a.click({action:'availability-trial-open',courseId:'qa-course',slotId:'qa-available-slot'});
 assert.match(a.read('modal'),/public-trial-form/);assert.match(a.read('modal'),/Published authoritative studio/);assert.match(a.read('modal'),/2026-10-15/);assert.match(a.read('modal'),/13:00/);
 assert.doesNotMatch(a.read('modal'),/Chloe|example-child|example-slot|PRIVATE|Choose a course|Confirm preview/);assert.equal(a.read('publicTrialOverlay.model.step'),'details');assert.ok(Object.values(a.read('publicTrialOverlay.model.draft')).every(value=>value===''));assert.equal(a.availabilityWrites.length,0);
});

test('public trial review and return retain typed registration fields and forged submission never creates a result',async()=>{
 const a=await publicTrialApp();await a.click({action:'availability-trial-open',courseId:'qa-course',slotId:'qa-available-slot'});assert.match(a.read('modal'),/public-trial-form/);
 await a.submit('public-trial-form',trialTyped);assert.equal(a.read('publicTrialOverlay.model.step'),'review');assert.match(a.read('modal'),/Isabel Lam/);assert.match(a.read('modal'),/guardian@example.test/);assert.match(a.read('modal'),/data-command="submit"[^>]*disabled/);
 await a.click({action:'public-trial-command',command:'submit'});assert.equal(a.read('publicTrialOverlay.model.step'),'review');assert.equal(a.availabilityWrites.length,0);
 await a.click({action:'public-trial-command',command:'back'});assert.equal(a.read('publicTrialOverlay.model.step'),'details');for(const [key,value]of Object.entries(trialTyped))assert.equal(a.read(`publicTrialOverlay.model.draft.${key}`),value,key);
 await a.click({action:'public-trial-command',command:'close'});assert.equal(a.read('publicTrialOverlay'),null);assert.equal(a.read('modal'),'');assert.equal(a.ctx.location.pathname,'/classes/qa-course');
});

test('public trial rejects forged or unavailable selection and missing selection join goes back to published courses',async()=>{
 for(const selection of [{courseId:'other-course',slotId:'qa-available-slot'},{courseId:'qa-course',slotId:'other-slot'}]){const a=await publicTrialApp();await a.click({action:'availability-trial-open',...selection});assert.doesNotMatch(a.read('modal'),/public-trial-form/);}
 const a=await publicTrialApp({publishedSlots:[publicAvailableSlot(formalAvailableSlot({trialRemaining:0,trialStatus:'full'}))]});await a.click({action:'availability-trial-open',courseId:'qa-course',slotId:'qa-available-slot'});assert.doesNotMatch(a.read('modal'),/public-trial-form/);
 a.set("go('/join')");assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-ui-view="trial-application"/);assert.match(a.nodes['#app'].innerHTML,/data-go="\/classes"/);
});

test('public trial preserves the draft when fresh source becomes full changed or unavailable and retry can recover',async()=>{
 for(const failure of ['full','moved','error']){
  const a=await publicTrialApp();await a.click({action:'availability-trial-open',courseId:'qa-course',slotId:'qa-available-slot'});assert.match(a.read('modal'),/public-trial-form/);
  a.set(`publicTrialOverlay.model.draft=${JSON.stringify(trialTyped)}`);
  if(failure==='full')a.availabilityRemote.publishedSlots[0].trialRemaining=0;
  if(failure==='moved')a.availabilityRemote.publishedSlots[0].time='15:00';
  const original=a.client.publicCourseDetails;if(failure==='error')a.client.publicCourseDetails=async()=>{throw serviceError(503,'UNAVAILABLE')};
  await a.submit('public-trial-form',trialTyped);assert.equal(a.read('publicTrialOverlay.model.step'),'details');assert.notEqual(a.read('publicTrialOverlay.model.sourceStatus'),'ready');assert.equal(a.read('publicTrialOverlay.model.draft.fullName'),'Isabel Lam');
  a.client.publicCourseDetails=original;a.availabilityRemote.publishedSlots[0]=publicAvailableSlot(formalAvailableSlot());await a.click({action:'public-trial-command',command:'retry'});assert.equal(a.read('publicTrialOverlay.model.sourceStatus'),'ready');assert.equal(a.availabilityWrites.length,0);
 }
});

test('pending public trial open cannot reopen after closing navigation or identity change',async()=>{
 for(const exit of ['close','navigation','identity']){
  const a=await publicTrialApp(),gate=deferred(),original=a.client.publicCourseDetails;a.client.publicCourseDetails=async(...args)=>{const value=await original(...args);await gate.promise;return value;};
  const pending=a.click({action:'availability-trial-open',courseId:'qa-course',slotId:'qa-available-slot'});await until(()=>a.read('modal').includes('public-trial-form'),'Opening must have a real loading dialog');
  if(exit==='close')await a.click({action:'public-trial-command',command:'close'});else if(exit==='navigation')a.set("go('/classes')");else a.set("applySharedUser({id:'new-user',role:'student',displayName:'Other identity'});render()");
  gate.resolve();await pending;assert.equal(a.read('publicTrialOverlay'),null,exit);assert.doesNotMatch(a.read('modal'),/public-trial-form/,exit);assert.equal(a.availabilityWrites.length,0);
 }
});

test('public trial source refresh does not remount an in-progress Chinese composition',async()=>{
 const a=await publicTrialApp();await a.click({action:'availability-trial-open',courseId:'qa-course',slotId:'qa-available-slot'});assert.match(a.read('modal'),/public-trial-form/);
 const before=a.read('modal');a.set('publicTrialComposing=true');a.availabilityRemote.publishedSlots[0].trialRemaining=0;await a.set('refreshPublicTrialSource()');
 assert.equal(a.read('modal'),before,'A source change must not replace the live IME field mid-composition');assert.equal(a.read('publicTrialOverlay.model.sourceStatus'),'unavailable');
 a.set('publicTrialComposing=false;drawPublicTrial()');assert.notEqual(a.read('modal'),before);assert.equal(a.availabilityWrites.length,0);
});

test('an unchanged public trial poll keeps the live native form instead of remounting typed input',async()=>{
 const a=await publicTrialApp();await a.click({action:'availability-trial-open',courseId:'qa-course',slotId:'qa-available-slot'});assert.match(a.read('modal'),/public-trial-form/);
 const form={id:'public-trial-form',values:copy(trialTyped)};a.nodes['#public-trial-form']=form;
 let writes=0,html=a.nodes['#modal-root'].innerHTML;Object.defineProperty(a.nodes['#modal-root'],'innerHTML',{get:()=>html,set:value=>{writes++;html=value},configurable:true});
 await a.set('refreshPublicTrialSource()');assert.equal(a.read('publicTrialOverlay.model.draft.localName'),trialTyped.localName);assert.equal(writes,0,'A read of unchanged source facts must not recreate the input controls');
});

test('public trial refuses malformed published time facts rather than opening a plausible blank-source form',async()=>{
 for(const patch of [{time:'25:00'},{duration:0},{time:'23:30',duration:60}]){const a=await publicTrialApp({publishedSlots:[publicAvailableSlot(formalAvailableSlot(patch))]});await a.click({action:'availability-trial-open',courseId:'qa-course',slotId:'qa-available-slot'});assert.doesNotMatch(a.read('modal'),/public-trial-form/);assert.equal(a.availabilityWrites.length,0);}
});

test('public trial validation brings the invalid field and its correction into view without losing the draft',async()=>{
 for(const invalid of [{email:'not-an-email'},{dateOfBirth:'2027-05-22'}]){
  const a=await publicTrialApp();await a.click({action:'availability-trial-open',courseId:'qa-course',slotId:'qa-available-slot'});
  let focused=0,scrolled=0;const field={focus(){focused++},scrollIntoView(){scrolled++}};a.nodes['.public-trial-dialog [aria-invalid="true"]']=field;
  await a.submit('public-trial-form',{...trialTyped,...invalid});assert.equal(a.read('publicTrialOverlay.model.step'),'details');assert.ok(focused>0,'The invalid field receives focus');assert.ok(scrolled>0,'The correction is brought into the scrollable body');assert.equal(a.read('publicTrialOverlay.model.draft.localName'),trialTyped.localName);assert.equal(a.availabilityWrites.length,0);
 }
});

test('public trial review starts at the selected lesson and Edit restores the previous body position',async()=>{
 const a=await publicTrialApp();await a.click({action:'availability-trial-open',courseId:'qa-course',slotId:'qa-available-slot'});
 const body={scrollTop:480,scrollLeft:0};a.nodes['.public-trial-body']=body;
 await a.submit('public-trial-form',trialTyped);assert.equal(a.read('publicTrialOverlay.model.step'),'review');assert.equal(body.scrollTop,0,'Review begins at the selected course and lesson');
 await a.click({action:'public-trial-command',command:'back'});assert.equal(body.scrollTop,480,'Edit returns to the previous field area');
});

test('an initial roster reply updates the parent cache without replacing an active class capacity editor',async()=>{
 let resolveRoster;
 const a=await classCapacityUiApp({}, {lessonStudents:async()=>new Promise(resolve=>{resolveRoster=resolve;})});
 await openClassCapacityEditor(a);
 const form=classCapacityForm(a,'full'),root=a.nodes['#modal-root'],editorMarkup=root.innerHTML,selection=a.read('selectedTimetableLesson');
 const chosen=form.radios.find(radio=>radio.value==='full');chosen.focus();
 assert.equal(form.isConnected,true);
 resolveRoster({students:[{id:'roster-session',studentId:'roster-child',displayName:'Fresh roster child',orderId:'roster-order',paymentStatus:'paid',attendance:'unmarked',remark:''}],occupied:1,capacity:8});
 // This waits on the same in-flight read started by openTimetableLesson.
 await a.set('refreshLessonStudents()');
 assert.equal(root.innerHTML,editorMarkup,'The pending parent read must not replace or remount the child editor');
 assert.equal(form.isConnected,true);assert.equal(chosen.isConnected,true);assert.equal(chosen.checked,true);assert.equal(a.ctx.document.activeElement,chosen);
 assert.equal(a.read('!!classStatusEditorDraft'),true);assert.deepEqual(a.read('selectedTimetableLesson'),selection);
 assert.equal(a.read("lessonStudentCaches.get('capacity-series:1').ready"),true);
 assert.equal(a.read("lessonStudentCaches.get('capacity-series:1').students[0].displayName"),'Fresh roster child','The authoritative parent cache should still update while the child is open');
 assert.deepEqual(a.capacityWrites,[]);
 await a.click({action:'class-status-cancel'});
 assert.equal(a.read('classStatusEditorDraft'),null);assert.deepEqual(a.read('selectedTimetableLesson'),selection);
 assert.match(root.innerHTML,/lesson-dialog/);assert.match(root.innerHTML,/Fresh roster child/);
 assert.deepEqual(a.capacityWrites,[],'Cancelling the child must not save its dirty Full selection');
});

test('a retained public class cannot open a hidden trial even from a forged old entry button',async()=>{
 const slots=[{...publicAvailableSlot(formalAvailableSlot()),classAvailability:'available',classType:{kind:'regular',name:'Regular Class'},trialVisible:false}],a=await publicTrialApp({publishedSlots:slots});
 for(const type of ['all','class']){
  a.change('slotType',type,{id:'availability-public-type'});assert.match(a.nodes['#app'].innerHTML,/data-availability-slot-id="qa-available-slot"/);
  const reads=a.publicAvailabilityReads.length;await a.click({action:'availability-trial-open',courseId:'qa-course',slotId:'qa-available-slot'});
  assert.equal(a.read('publicTrialOverlay'),null);assert.equal(a.read('modal'),'');assert.equal(a.publicAvailabilityReads.length,reads);
 }
 assert.equal(a.availabilityWrites.length,0);
});

test('trial visibility changing during registration preserves the draft and returns to the same published class filter',async()=>{
 const slots=[{...publicAvailableSlot(formalAvailableSlot()),classAvailability:'available',classType:{kind:'regular',name:'Regular Class'},trialVisible:true}],a=await publicTrialApp({publishedSlots:slots});a.change('slotType','class',{id:'availability-public-type'});
 await a.click({action:'availability-trial-open',courseId:'qa-course',slotId:'qa-available-slot'});assert.match(a.read('modal'),/public-trial-form/);
 a.set(`publicTrialOverlay.model.draft=${JSON.stringify(trialTyped)}`);a.availabilityRemote.publishedSlots[0].trialVisible=false;
 await a.submit('public-trial-form',trialTyped);assert.equal(a.read('publicTrialOverlay.model.step'),'details');assert.equal(a.read('publicTrialOverlay.model.sourceStatus'),'unavailable');assert.equal(a.read('publicTrialOverlay.model.draft.fullName'),'Isabel Lam');
 await a.click({action:'public-trial-command',command:'close'});await until(()=>a.read("publicAvailabilityDetails.get('qa-course')?.slots[0]?.trialVisible===false"),'Return loads the changed public visibility');
 assert.equal(a.read('publicAvailabilityType'),'class');assert.match(a.nodes['#app'].innerHTML,/data-availability-slot-id="qa-available-slot"/);assert.doesNotMatch(a.nodes['#app'].innerHTML,/data-action="availability-trial-open"/);assert.equal(a.availabilityWrites.length,0);
});
