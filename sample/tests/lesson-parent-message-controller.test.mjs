import test from 'node:test';
import assert from 'node:assert/strict';
import {createLessonParentMessaging} from '../client/lesson-parent-message-controller.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const contact={sessionId:'session-b',studentId:'child-b',studentName:'Chloe',courseId:'course-b',courseName:'Drawing',date:'2026-10-16',time:'13:00',duration:60,teacherNames:['Leo'],sender:{id:'teacher-b',displayName:'Leo'},whatsApp:{name:'Parent B',number:'+852 6123 4567'},appRecipient:{userId:'family-b',displayName:'Parent account B'},revision:'revision-b'};
const body=' 家長您好\nPlease contact me. ';
const message={id:'message-b',sessionId:'session-b',studentId:'child-b',studentName:'Chloe',senderId:'teacher-b',senderName:'Leo',recipientUserId:'family-b',recipientName:'Parent account B',courseName:'Drawing',date:'2026-10-16',time:'13:00',body,createdAt:'2026-10-16T00:00:00.000Z',channel:'app-test'};
const deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return {promise,resolve};};
function setup({read=async()=>({context:structuredClone(contact)}),send=async()=>({message:structuredClone(message)}),inbox=async()=>({records:[structuredClone(message)],total:1,page:1,pageSize:25,revision:'inbox-r'}),openTemplatePicker,dom={activeElement:null,querySelector:()=>null,querySelectorAll:()=>[]}}={}){
 let currentIdentity='teacher-b',valid=true,view='lesson',last=null,inboxPaints=0;const writes=[],closes=[],ticket={};
 const api={parentMessageContext:read,sendParentMessage:async(...args)=>{writes.push(structuredClone(args));return send(...args);},parentMessagesInbox:inbox};
 const controller=createLessonParentMessaging({api,openTemplatePicker,scope:()=>({identity:currentIdentity,role:currentIdentity==='family-b'?'student':'teacher',inboxVisible:view==='inbox'}),resolve:()=>({status:'ready',returnTicket:ticket,facts:{student:{id:'child-b'},lesson:{id:'session-b',courseId:'course-b',date:'2026-10-16',time:'13:00'}}}),current:t=>t===ticket&&valid,onOpen(){},onClose:(...args)=>closes.push(args),paint:html=>last=html,onInboxChange(){inboxPaints++;},key:()=> 'message-key',markup:state=>structuredClone(state),inboxMarkup:state=>structuredClone(state),dom,t:(_zh,en)=>en});
 return {controller,writes,closes,get inboxPaints(){return inboxPaints;},get state(){return last;},identity(value){currentIdentity=value;},valid(value){valid=value;},leaveInbox(){view='lesson';},inbox(){currentIdentity='family-b';view='inbox';}};
}
test('exact lesson reads canonical parent recipient and Cancel writes nothing and restores the original ticket',async()=>{
 const e=setup();await e.controller.open('session-b');assert.equal(e.state.context.appRecipient.userId,'family-b');e.controller.input({name:'message',value:body});e.controller.command('parent-message-close');assert.equal(e.controller.isOpen(),false);assert.equal(e.writes.length,0);assert.equal(e.closes[0][1].restore,true);
});
test('Preview does not send; send freezes exact raw content and accepts only matching canonical message acknowledgement',async()=>{
 const e=setup();await e.controller.open('session-b');e.controller.input({name:'channel',value:'app'});e.controller.input({name:'message',value:body});e.controller.command('parent-message-preview');assert.equal(e.state.step,'preview');assert.equal(e.writes.length,0);await e.controller.command('parent-message-send');assert.deepEqual(e.writes[0],['session-b',{revision:'revision-b',message:body},'message-key']);assert.equal(e.state.step,'saved');assert.equal(e.state.ack.id,'message-b');
});
test('lost successful reply retries identical operation and cannot edit or double-submit while uncertain',async()=>{
 let calls=0;const e=setup({send:async()=>{if(++calls===1)throw Object.assign(new Error('truncated'),{status:201,code:'service_unavailable'});return {message};}});await e.controller.open('session-b');e.controller.input({name:'channel',value:'app'});e.controller.input({name:'message',value:body});e.controller.command('parent-message-preview');await e.controller.command('parent-message-send');assert.equal(e.state.unconfirmed,true);e.controller.input({name:'message',value:'changed'});e.controller.command('parent-message-back');assert.equal(e.state.step,'preview');await e.controller.command('parent-message-send');assert.deepEqual(e.writes[0],e.writes[1]);assert.equal(e.state.step,'saved');
});
test('wrong recipient acknowledgement never produces saved and a changed preview context requires review again',async()=>{
 let latest=structuredClone(contact);const e=setup({read:async()=>({context:latest}),send:async()=>({message:{...message,recipientUserId:'different-family'}})});await e.controller.open('session-b');e.controller.input({name:'channel',value:'app'});e.controller.input({name:'message',value:body});e.controller.command('parent-message-preview');await e.controller.command('parent-message-send');assert.equal(e.state.unconfirmed,true);assert.notEqual(e.state.step,'saved');
 const changed=setup({read:async()=>({context:latest})});await changed.controller.open('session-b');changed.controller.input({name:'message',value:body});latest={...contact,revision:'new-r',appRecipient:{userId:'new-family',displayName:'New family'}};await changed.controller.refresh();assert.equal(changed.state.stale,true);assert.equal(changed.state.draft.message,body);await changed.controller.command('parent-message-retry');assert.equal(changed.state.context.appRecipient.userId,'new-family');assert.equal(changed.state.step,'edit');assert.equal(changed.state.draft.message,body);
});
test('busy send blocks close and duplicate send, then a late identity result cannot reveal saved data',async()=>{
 const gate=deferred(),e=setup({send:()=>gate.promise});await e.controller.open('session-b');e.controller.input({name:'channel',value:'app'});e.controller.input({name:'message',value:body});e.controller.command('parent-message-preview');const pending=e.controller.command('parent-message-send');await e.controller.command('parent-message-send');e.controller.command('parent-message-close');assert.equal(e.controller.isOpen(),true);assert.equal(e.writes.length,1);e.identity('another');gate.resolve({message});await pending;assert.equal(e.controller.isOpen(),false);
});
test('failed or wrong exact context read is unavailable, and closed or revoked contexts cannot be resurrected',async()=>{
 const e=setup({read:async()=>({context:{...contact,studentId:'other-child'}})});await e.controller.open('session-b');assert.equal(e.state.contextStatus,'error');assert.equal(e.state.context,null);
 const gate=deferred(),late=setup({read:()=>gate.promise});const opening=late.controller.open('session-b');late.controller.command('parent-message-close');gate.resolve({context:contact});await opening;assert.equal(late.controller.isOpen(),false);
 const revoked=setup({read:async()=>{throw Object.assign(new Error('no access'),{status:403});}});await revoked.controller.open('session-b');assert.equal(revoked.controller.isOpen(),false);
});
test('WhatsApp preview never invokes App sending and absent explicit App recipient cannot be sent',async()=>{
 const e=setup();await e.controller.open('session-b');e.controller.input({name:'channel',value:'whatsapp'});e.controller.input({name:'message',value:body});e.controller.command('parent-message-preview');await e.controller.command('parent-message-send');assert.deepEqual(e.writes,[]);
 const missing=setup({read:async()=>({context:{...contact,appRecipient:null}})});await missing.controller.open('session-b');missing.controller.input({name:'channel',value:'app'});missing.controller.input({name:'message',value:body});missing.controller.command('parent-message-preview');await missing.controller.command('parent-message-send');assert.deepEqual(missing.writes,[]);
});
test('student inbox displays true scoped records and identity changes cannot reuse private cached messages',async()=>{
 const e=setup();e.inbox();await e.controller.readInbox();assert.equal(e.controller.inboxPage().records[0].id,'message-b');e.identity('different-family');assert.deepEqual(e.controller.inboxPage().records,[]);
 const gate=deferred(),late=setup({inbox:()=>gate.promise});late.inbox();const reading=late.controller.readInbox();late.identity('other');gate.resolve({records:[message],total:1,page:1,pageSize:25,revision:'r'});await reading;assert.deepEqual(late.controller.inboxPage().records,[]);
});
test('actual host click delegation preserves native channel-radio and message-textarea behavior',async()=>{
 const source=readFileSync(new URL('../src.js',import.meta.url),'utf8'),start=source.indexOf("document.addEventListener('click',async e=>"),end=source.indexOf("document.addEventListener('change',",start);assert.ok(start>0&&end>start);
 for(const action of ['parent-message-channel','parent-message-draft']){let callback,prevented=false,commands=0;const element={dataset:{action}},context=vm.createContext({lessonMenuOpen:false,document:{querySelector:()=>null,addEventListener(_type,handler){callback=handler;}},parentMessaging:{command(){commands++;}}});vm.runInContext(source.slice(start,end),context);await callback({target:{closest:()=>element},preventDefault(){prevented=true;}});assert.equal(prevented,false);assert.equal(commands,0);}
});
test('typing a valid native message enables Preview without remounting its textarea and channel focus stays on its value',async()=>{
 const preview={disabled:true},dom={activeElement:null,querySelector:selector=>selector.includes('parent-message-preview')?preview:null,querySelectorAll:()=>[app,whatsapp]},app={name:'channel',type:'radio',value:'app',focus(){dom.activeElement=this;}},whatsapp={name:'channel',type:'radio',value:'whatsapp',focus(){dom.activeElement=this;}};
 const e=setup({dom});await e.controller.open('session-b');e.controller.input({name:'message',value:body});assert.equal(preview.disabled,false);e.controller.input({name:'message',value:''});assert.equal(preview.disabled,true);dom.activeElement=whatsapp;e.controller.input(whatsapp);assert.equal(dom.activeElement,whatsapp);
});
test('actual lesson return reopens the exact student action menu before focusing the restored contact button',()=>{
 const source=readFileSync(new URL('../src.js',import.meta.url),'utf8'),start=source.indexOf('function restoreLessonView('),end=source.indexOf('function sameLessonSelection(',start);let focused=false;const menu={open:false},button={dataset:{action:'parent-message-open',sessionId:'session-b'},closest:()=>menu,focus(){focused=menu.open;}},context=vm.createContext({document:{querySelectorAll:()=>[button],querySelector:()=>null}});vm.runInContext(source.slice(start,end),context);context.restoreLessonView({focus:{dataset:button.dataset},scroll:[]});assert.equal(menu.open,true);assert.equal(focused,true);
});
test('a pre-send background read failure cannot prevent an exact lost-acknowledgement retry',async()=>{
 const gate=deferred();let reads=0,writes=0;const e=setup({read:async()=>++reads===1?{context:contact}:gate.promise,send:async()=>{if(++writes===1)throw Object.assign(new Error('bad successful body'),{status:201,code:'service_unavailable'});return {message};}});await e.controller.open('session-b');e.controller.input({name:'message',value:body});e.controller.command('parent-message-preview');const refresh=e.controller.refresh();await e.controller.command('parent-message-send');gate.resolve(Promise.reject(Object.assign(new Error('offline'),{status:503})));await refresh;await e.controller.command('parent-message-send');assert.equal(e.writes.length,2);assert.deepEqual(e.writes[0],e.writes[1]);assert.equal(e.state.step,'saved');
});
test('leaving a first inbox read then returning immediately loads again instead of waiting for polling',async()=>{
 const gate=deferred();let reads=0;const e=setup({inbox:async()=>++reads===1?gate.promise:{records:[message],total:1,page:1,pageSize:25,revision:'r2'}});e.inbox();const first=e.controller.readInbox();e.leaveInbox();gate.resolve({records:[],total:0,page:1,pageSize:25,revision:'r1'});await first;e.inbox();e.controller.ensureInbox();await new Promise(resolve=>setImmediate(resolve));assert.equal(reads,2);assert.equal(e.controller.inboxPage().records[0].id,'message-b');
});
test('a first inbox read paints Loading immediately while the real request is still pending',async()=>{
 const gate=deferred(),e=setup({inbox:()=>gate.promise});e.inbox();const reading=e.controller.readInbox();assert.equal(e.controller.inboxPage().status,'loading');assert.equal(e.inboxPaints,1);gate.resolve({records:[],total:0,page:1,pageSize:25,revision:'empty'});await reading;assert.equal(e.controller.inboxPage().status,'ready');assert.equal(e.inboxPaints,2);
});
test('template chooser cancellation preserves raw message/channel and only explicit exact-owner Apply changes body',async()=>{
 let child;const e=setup({openTemplatePicker:async options=>{child=options;return true;}});await e.controller.open('session-b');e.controller.input({name:'channel',value:'whatsapp'});e.controller.input({name:'message',value:body});await e.controller.command('parent-message-template');assert.equal(child.currentMessage,body);assert.equal(child.guard(),true);child.onClose();assert.equal(e.state.draft.message,body);assert.equal(e.state.draft.channel,'whatsapp');await e.controller.command('parent-message-template');child.onSelect({id:'own-template',body:' {{literal}}\nnew body '});child.onClose();assert.equal(e.state.draft.message,' {{literal}}\nnew body ');assert.equal(e.state.draft.channel,'whatsapp');assert.equal(e.writes.length,0);assert.equal(e.state.step,'edit');
 await e.controller.command('parent-message-template');e.valid(false);assert.equal(child.guard(),false);child.onSelect({body:'must not apply'});child.onClose();assert.equal(e.controller.isOpen(),true);e.controller.beforeRender();assert.equal(e.controller.isOpen(),false);
});
test('template controls cannot overwrite a reviewed or uncertain App sending operation',async()=>{
 let opens=0;const e=setup({openTemplatePicker:async()=>{opens++;return true;}});await e.controller.open('session-b');e.controller.input({name:'message',value:body});await e.controller.command('parent-message-preview');await e.controller.command('parent-message-template');assert.equal(opens,0);assert.equal(e.state.draft.message,body);
});
