import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {materialPanelMarkup,materialEditorMarkup,materialVideoRow,safeMaterialUrl} from '../client/materials-ui.js';
import {materialAttachmentDrafts} from '../client/attachments-ui.js';
import {attachmentIssue} from '../client/attachment-client.js';
import {courseScheduleTableMarkup} from '../client/course-schedule-ui.js';
import {scheduleScopeMarkup} from '../client/schedule-scope-ui.js';
import {schedulingResourcesMarkup,schedulingResourceEditorMarkup,scheduleResourcePickerMarkup} from '../client/scheduling-resources-ui.js';
import {timetableDateRange,timetableRangeControlMarkup} from '../client/timetable-range.js';
import {accessControlMarkup,accessTeacherLinkEditorMarkup,accessGrantEditorMarkup} from '../client/access-control-ui.js';
import {peopleDirectoryMarkup,peopleProfileMarkup,peopleEditorMarkup} from '../client/people-ui.js';
import {availabilityEditorMarkup,availabilityDetailMarkup,availabilityPublicSettingsMarkup,availabilityOccurrenceSummaryMarkup,publicCourseDirectoryMarkup,publicCourseDetailsMarkup} from '../client/availability-ui.js';
import {scheduleOccurrences,scheduleOccurrence,scheduleFollowingRule} from '../shared/schedule-occurrences.js';
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
function app(seed={},clock,mobile=false,injectedClient=null,options={}){const handlers={},store=new Map(Object.entries(seed)),session=new Map(),nodes={};const storage=(m,local=false)=>({getItem:k=>m.get(k)??null,setItem:(k,v)=>{const failure=local?options.localWriteError?.(k,v):null;if(failure)throw failure;return m.set(k,v)},removeItem:k=>m.delete(k)});const ctx=vm.createContext({availabilityEditorMarkup,availabilityDetailMarkup,availabilityPublicSettingsMarkup,availabilityOccurrenceSummaryMarkup,publicCourseDirectoryMarkup,publicCourseDetailsMarkup,peopleDirectoryMarkup,peopleProfileMarkup,peopleEditorMarkup,accessControlMarkup,accessTeacherLinkEditorMarkup,accessGrantEditorMarkup,timetableDateRange,timetableRangeControlMarkup,schedulingResourcesMarkup,schedulingResourceEditorMarkup,scheduleResourcePickerMarkup,scheduleOccurrences,scheduleOccurrence,scheduleFollowingRule,scheduleScopeMarkup,courseScheduleTableMarkup,materialPanelMarkup,materialEditorMarkup,materialVideoRow,safeMaterialUrl,materialAttachmentDrafts,attachmentIssue,AbortController,...(injectedClient?{createApiClient:()=>injectedClient}:{}),localStorage:storage(store,true),sessionStorage:storage(session),navigator:{language:'zh-HK'},location:{pathname:options.pathname||'/'},history:{pushState:(_,__,p)=>ctx.location.pathname=p,replaceState:(_,__,p)=>ctx.location.pathname=p},window:{scrollTo(){},addEventListener:(type,handler)=>options.onWindowEvent?.(type,handler),setInterval:(handler,ms)=>options.onInterval?.(handler,ms)??0,clearInterval(){},matchMedia:()=>({matches:mobile,addEventListener(){}})},document:{documentElement:{},querySelector:s=>nodes[s]??(nodes[s]=(()=>{const classes=new Set(),attributes={};return {innerHTML:'',textContent:'',focus(){},setAttribute:(k,v)=>attributes[k]=String(v),getAttribute:k=>attributes[k],classList:{toggle:(k,on)=>on?classes.add(k):classes.delete(k),contains:k=>classes.has(k)}}})()),addEventListener:(e,h)=>{if(e==='change')(handlers.change??=[]).push(h);else handlers[e]=h},createElement:()=>({remove(){}}),body:{append(){}}},FormData:class{constructor(f){return Object.entries(f.values).flatMap(([k,v])=>Array.isArray(v)?v.map(x=>[k,x]):[[k,v]])}},setTimeout(){},confirm:()=>true,Date:clock?class extends Date{constructor(...args){super(...(args.length?args:[clock]))}static now(){return new Date(clock).getTime()}}:Date,console});vm.runInContext(fs.readFileSync(new URL('../src.js',import.meta.url),'utf8').replace(/^import .*;$/gm,''),ctx);return {ctx,read:s=>JSON.parse(vm.runInContext(`JSON.stringify(${s})`,ctx)),submit:(id,values,extra={})=>handlers.submit({preventDefault(){},target:{id,values,classList:{contains:()=>false},...extra}}),click:dataset=>handlers.click({preventDefault(){},target:{closest:()=>({dataset})}}),input:target=>handlers.input({target}),keydown:(key,extra={})=>handlers.keydown({key,preventDefault(){},...extra}),change:(name,value,extra={})=>handlers.change.forEach(handler=>handler({target:{name,value,...extra}})),set:s=>vm.runInContext(s,ctx),nodes};}
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
 for(const username of ['1','2']){const a=app();a.set("lang='en'");a.submit('login',{username,password:''});const html=a.nodes['#app'].innerHTML;assert.match(html,/class="portal-topbar"/);assert.match(html,/beamal-logo.jpg/);assert.match(html,/beamal-login_icon.png/);assert.match(html,/INTERNAL SAMPLE — FOR REVIEW ONLY/);assert.match(html,/banner-reset/);const nav=html.match(/<nav id="portal-sidebar"[\s\S]*?<\/nav>/)[0];
  if(username==='2'){assert.equal(a.read('tab'),'catalog');assert.match(nav,/data-tab="catalog" class="active"/);assert.ok(nav.indexOf('Sales')<nav.indexOf('Timetable'));for(const label of ['Courses','Fees','Products','Messages','Students','Leads','Accounting','Reports','Staffs','Channels','Settings'])assert.ok(nav.includes(label));assert.equal((html.match(/<th(?:\s[^>]*)?>/g)||[]).filter(tag=>!tag.includes('portal-select-cell')).length,7,'Count the seven data columns separately from the selection checkbox')}
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
 a.change('','timetable',{id:'course-detail-view'});assert.equal(a.read('location.pathname'),'/account');assert.equal(a.read('tab'),'overview');assert.equal(a.read('timetableSearch'),'Course 2');assert.match(a.nodes['#app'].innerHTML,new RegExp(`data-open-lesson="${id}"`));
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
 a.click({action:'lesson-edit'});assert.match(a.nodes['#modal-root'].innerHTML,/id="schedule-editor"/);assert.equal(a.read('scheduleDraft.id'),id);a.click({action:'close'});
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
 a.click({action:'schedule-end-open'});a.submit('schedule-editor',scheduleValues(),{dataset:{id:''}});assert.equal(a.read('db.schedules.length'),0);a.click({action:'close'});assert.equal(a.read('scheduleEndDraft'),null);assert.equal(a.read('scheduleDraft'),null);
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
 const node=a.nodes['#app'];let html=node.innerHTML,writes=0;
 Object.defineProperty(node,'innerHTML',{configurable:true,get:()=>html,set:value=>{writes++;html=value}});
 return ()=>writes;
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
 const detail=a.nodes['#modal-root'].innerHTML;assert.match(detail,/<h3>Students \(—\)<\/h3>/,'An unavailable enrolment list must not be presented as a confirmed count of zero students');assert.doesNotMatch(detail,/<h3>Students \(0\)<\/h3>/);assert.match(detail,/student list for this lesson is not available yet/i);
 a.click({action:'lesson-close'});
 a.set(`openSchedule('${id}')`);const editMarkup=a.nodes['#modal-root'].innerHTML,openedVersion=editMarkup.match(/id="schedule-editor"[^>]*data-version="([^"]+)"/)?.[1];assert.equal(openedVersion,'1');assert.match(editMarkup,/Changes or deletion apply to the entire recurring schedule/);assert.match(editMarkup,/Use Undo to restore a deleted schedule/);const edit=sharedScheduleForm({id,version:openedVersion,values:{time:'11:00',duration:'60',remark:'Updated shared lesson'}});
 a.input({name:'time',value:'11:00',closest:()=>({})});await a.submit(edit.id,edit.values,edit);
 assert.equal(remote.rows.length,1);assert.equal(remote.rows[0].id,id);assert.equal(remote.rows[0].course,'qa-course');assert.equal(remote.rows[0].version,2);assert.equal(remote.rows[0].time,'11:00');assert.deepEqual(a.read("db.courseSettings.map(course=>({id:course.id,price:course.price,fees:course.fees,feeIds:course.feeIds}))"),pricing,'Scheduling must preserve the existing course and its fee amounts/associations');
 const other=await sharedScheduleApp(remote,{session:async()=>({user:{...copy(sharedTestUser),id:'qa-second-admin',email:'second@example.test'}})});
 assert.equal(other.read('authUser.id'),'qa-second-admin');assert.equal(other.read('db.schedules[0].id'),id);assert.equal(other.read('db.schedules[0].time'),'11:00');
 other.set("courseDetailMonth=new Date(2026,9,1);courseDetailTab='general';location.pathname='/account/courses/qa-course';render()");html=other.nodes['#app'].innerHTML;
 assert.match(html,/Shared studio/);assert.match(html,/11:00–12:00/);assert.equal((html.match(/class="course-schedule-columns course-schedule-row"/g)||[]).length,4);
 other.change('','timetable',{id:'course-detail-view'});
 assert.equal(other.read('location.pathname'),'/account');assert.equal(other.read('timetableSearch'),'Shared studio','View in Timetable must use the readable course name rather than exposing an internal course ID');
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

test('shared alignment Courses view-classes navigation opens the shared timetable rather than legacy local class settings',async()=>{
 const a=await sharedScheduleApp({rows:[sharedScheduleRecord()],revision:1});a.set("tab='catalog';location.pathname='/account';render()");
 const button=a.nodes['#app'].innerHTML.match(/<button\b[^>]*>(?:View classes and times|View timetable)<\/button>/i)?.[0];assert.ok(button,'The course list must expose its schedule navigation');
 const dataset=Object.fromEntries([...button.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(([,name,value])=>[name.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()),value]));
 a.click(dataset);
 assert.equal(a.read('location.pathname'),'/account');assert.ok(a.nodes['#app'].innerHTML.includes('class="teacher-timetable"'),'The actual rendered button must navigate into the shared timetable');
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
 const dateButton=[...a.nodes['#app'].innerHTML.matchAll(/<button\b[^>]*class="course-schedule-date-edit"[^>]*>/g)].map(match=>match[0]).find(tag=>tag.includes('data-activity-date="2026-10-28"'));assert.ok(dateButton);await a.click(markupDataset(dateButton));
 assert.equal(a.read('scheduleDraft.id'),'qa-scoped-series');assert.equal(a.read('scheduleDraft.occurrenceSequence'),3);assert.equal(a.read('scheduleDraft.session'),3);assert.equal(a.read('scheduleDraft.count'),1);assert.equal(a.read('scheduleDraft.startDate'),'2026-10-28');assert.equal(a.read('scheduleDraft.time'),'13:00');
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
async function resourceUiApp(remote={resources:[],revision:1},overrides={}){
 const resourceCalls=[],resourceReads=[];let serial=0;
 const a=await sharedScheduleApp({rows:[],revision:1},{
  async schedulingResources(since){resourceReads.push(since);const revision='resources-'+remote.revision;return since===revision?{revision,unchanged:true}:{revision,resources:copy(remote.resources)}},
  async saveSchedulingResource(record,current,key){
   resourceCalls.push({record:copy(record),current:current?copy(current):null,key});const previous=current&&remote.resources.find(row=>row.id===current.id);
   if(current&&previous?.version!==current.version)throw serviceError(409,'VERSION_CONFLICT');
   const resource=schedulingResource(current?.id||'qa-created-resource-'+(++serial),current?.kind||record.kind,record.displayName,{...record,version:current?current.version+1:1});remote.resources=remote.resources.filter(row=>row.id!==resource.id);remote.resources.push(resource);remote.revision++;return {resource:copy(resource)};
  },...overrides,
 });
 a.ctx.document.querySelectorAll=selector=>selector.includes('.resource-editor-dialog')?(a.resourceForm?.allControls||[]).filter(control=>!selector.includes(':not(:disabled)')||!control.disabled):[];
 a.set("timetableResource='teachers'");return Object.assign(a,{resourceCalls,resourceReads,resourceRemote:remote});
}
async function openResourceManager(a){await a.set('openSchedulingResources()');assert.ok(a.read('resourceManager'));assert.match(a.nodes['#modal-root'].innerHTML,/resource-manager-modal/);}
function resourceEditorForm(a,values={}){
 const markup=a.nodes['#modal-root'].innerHTML,tag=markup.match(/<form\b[^>]*id="scheduling-resource-editor"[^>]*>/)?.[0];assert.ok(tag,'A real resource editor must be open before submitting');
 const current=a.read('resourceDraft.current??null'),kind=a.read('resourceDraft.kind'),form=sharedForm('scheduling-resource-editor');form.dataset=markupDataset(tag);form.values={displayName:current?.displayName||'',...(current?.active===false?{}:{active:'on'}),...(kind==='room'?{capacity:current?.capacity==null?'':String(current.capacity),detail:current?.detail||'',remark:current?.remark||'',...(current?.externalLocation?{externalLocation:'on'}:{})}:{}),...values};form.isConnected=true;
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
async function accessUiApp(remote={},overrides={}){
 remote.accounts??=[accessAccount('access-artist-A','Artist A'),accessAccount('access-artist-B','Artist B'),accessAccount(sharedTestUser.id,'Administrator','admin')];remote.teacherLinks??=[];remote.grants??=[];remote.revision??=1;
 const resource=schedulingResource('access-teacher-resource','teacher','Teaching artist'),resources=[resource,schedulingResource('access-room-resource','room','Studio')],calls=[],reads=[];
 const a=await resourceUiApp({resources,revision:1},{schedules:async()=>({revision:'access-editor-schedules',schedules:[sharedScheduleRecord()]}),
  async accessControl(since){reads.push(since);return {...copy(remote),revision:'access-'+remote.revision}},
  async saveTeacherLink(resourceId,userId,version,key){calls.push({operation:'link',resourceId,userId,version,key});const current=remote.teacherLinks.find(link=>link.teacherResourceId===resourceId);if((current?.version||0)!==version)throw serviceError(409,'VERSION_CONFLICT');const teacherLink={teacherResourceId:resourceId,userId,version:version+1};remote.teacherLinks=remote.teacherLinks.filter(link=>link.teacherResourceId!==resourceId);remote.teacherLinks.push(teacherLink);remote.revision++;return {teacherLink:copy(teacherLink),revision:'access-'+remote.revision}},
  async createScopeGrant(grant,key){calls.push({operation:'grant',grant:copy(grant),key});const value={...copy(grant),id:'access-grant-'+(remote.grants.length+1),active:true,version:1};remote.grants.push(value);remote.revision++;return {grant:copy(value),revision:'access-'+remote.revision}},
  async setScopeGrantActive(grant,active,key){calls.push({operation:'toggle',grant:copy(grant),active,key});const current=remote.grants.find(row=>row.id===grant.id);if(current?.version!==grant.version)throw serviceError(409,'VERSION_CONFLICT');const value={...current,active,version:current.version+1};remote.grants=remote.grants.map(row=>row.id===grant.id?value:row);remote.revision++;return {grant:copy(value),revision:'access-'+remote.revision}},...overrides});
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
