import test from 'node:test';
import assert from 'node:assert/strict';
import {createParentMessageTemplates} from '../client/parent-message-template-controller.js';

const row={id:'template-b',title:' 自備作品集 ',body:' 家長您好\n請帶備作品集。 ',version:2,archived:false,createdAt:'2026-10-16T00:00:00.000Z',updatedAt:'2026-10-16T00:00:00.000Z'};
const deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return {promise,resolve};};
function setup(overrides={}){
 let identity='teacher-b',location='settings',last=null,valid=true;const writes=[],selected=[],closed=[];
 const api={parentMessageTemplates:async q=>({records:[row],total:1,page:q.page,pageSize:25,revision:'r1'}),parentMessageTemplate:async()=>({template:row}),createParentMessageTemplate:async input=>({template:{...row,...input,id:'new',version:1}}),updateParentMessageTemplate:async(id,input)=>({template:{...row,...input,id,version:input.version+1}}),archiveParentMessageTemplate:async(id,version)=>({template:{...row,id,version:version+1,archived:true}}),restoreParentMessageTemplate:async(id,version)=>({template:{...row,id,version:version+1,archived:false}}),...overrides};
 for(const name of ['createParentMessageTemplate','updateParentMessageTemplate','archiveParentMessageTemplate','restoreParentMessageTemplate']){const fn=api[name];api[name]=async(...args)=>{writes.push([name,...structuredClone(args)]);return fn(...args);};}
 const controller=createParentMessageTemplates({api,scope:()=>({identity,role:identity.startsWith('student')?'student':'teacher',location}),paint:html=>last=html,onAuth(){},key:()=> 'operation-key',markup:model=>structuredClone(model),dom:{activeElement:null,querySelector:()=>null,querySelectorAll:()=>[]},t:(_zh,en)=>en});
 return {controller,writes,selected,closed,get state(){return last;},setIdentity(value){identity=value;},navigate(){location='other';},invalidate(){valid=false;},open(mode='manage'){return controller.open({mode,currentMessage:'original draft',guard:()=>valid,onSelect:value=>selected.push(value),onClose:()=>closed.push(true)});}};
}
test('teacher maintains a personal template through real review and acknowledged create, not a local-only success',async()=>{
 const e=setup();await e.open();await e.controller.command('parent-template-new');e.controller.input({name:'title',value:row.title});e.controller.input({name:'body',value:row.body});await e.controller.command('parent-template-review');assert.equal(e.state.step,'review');assert.equal(e.writes.length,0);await e.controller.command('parent-template-save');assert.equal(e.writes.length,1);assert.deepEqual(e.writes[0].slice(1),[{title:row.title,body:row.body},'operation-key']);assert.equal(e.state.ack.operation,'create');assert.equal(e.state.step,'list');
});
test('chooser reads exact selected identifier then explicit Apply copies plain body and never sends or changes other context',async()=>{
 const e=setup();await e.open('choose');await e.controller.command('parent-template-choose',{templateId:row.id});assert.equal(e.state.step,'apply-review');assert.equal(e.selected.length,0);await e.controller.command('parent-template-apply');assert.deepEqual(e.selected,[row]);assert.equal(e.writes.length,0);assert.equal(e.controller.isOpen(),false);assert.equal(e.closed.length,1);
});
test('Cancel from chooser and invalid exact result preserve parent draft without choosing first same-name record',async()=>{
 const e=setup({parentMessageTemplate:async()=>({template:{...row,id:'wrong-same-title'}})});await e.open('choose');await e.controller.command('parent-template-choose',{templateId:row.id});assert.notEqual(e.state.step,'apply-review');assert.equal(e.selected.length,0);await e.controller.command('parent-template-close');assert.equal(e.selected.length,0);assert.equal(e.closed.length,1);
});
test('lost save acknowledgement freezes raw payload and key, double-click and edits cannot change retry',async()=>{
 const gate=deferred();let calls=0;const e=setup({updateParentMessageTemplate:async(id,input)=>++calls===1?gate.promise:{template:{...row,...input,id,version:input.version+1}}});await e.open();await e.controller.command('parent-template-edit',{templateId:row.id});e.controller.input({name:'body',value:' changed raw\n '});await e.controller.command('parent-template-review');const saving=e.controller.command('parent-template-save');await e.controller.command('parent-template-save');await e.controller.command('parent-template-close');assert.equal(e.writes.length,1);assert.equal(e.controller.isOpen(),true);gate.resolve(Promise.reject(Object.assign(new Error('malformed201'),{status:201,code:'service_unavailable'})));await saving;assert.equal(e.state.unconfirmed,true);e.controller.input({name:'body',value:'overwrite'});await e.controller.command('parent-template-back');await e.controller.command('parent-template-save');assert.deepEqual(e.writes[0],e.writes[1]);assert.equal(e.state.ack.record.body,' changed raw\n ');
});
test('wrong saved body/version cannot produce saved acknowledgement; source conflict preserves editable draft',async()=>{
 const wrong=setup({updateParentMessageTemplate:async()=>({template:{...row,version:3,body:'wrong'}})});await wrong.open();await wrong.controller.command('parent-template-edit',{templateId:row.id});wrong.controller.input({name:'body',value:'changed'});await wrong.controller.command('parent-template-review');await wrong.controller.command('parent-template-save');assert.equal(wrong.state.ack,null);assert.equal(wrong.state.unconfirmed,true);
 const conflict=setup({updateParentMessageTemplate:async()=>{throw Object.assign(new Error('version'),{status:409});}});await conflict.open();await conflict.controller.command('parent-template-edit',{templateId:row.id});conflict.controller.input({name:'body',value:'keep me'});await conflict.controller.command('parent-template-review');await conflict.controller.command('parent-template-save');assert.equal(conflict.state.stale,true);assert.equal(conflict.state.draft.body,'keep me');await conflict.controller.command('parent-template-back');assert.equal(conflict.state.step,'edit');
});
test('archive and restore require explicit review and exact acknowledgement without changing historical message text',async()=>{
 const e=setup();await e.open();await e.controller.command('parent-template-archive-review',{templateId:row.id});assert.equal(e.state.step,'archive-review');assert.equal(e.writes.length,0);await e.controller.command('parent-template-archive');assert.deepEqual(e.writes[0].slice(1),[row.id,row.version,'operation-key']);assert.equal(e.state.ack.record.archived,true);
 const restored=setup({parentMessageTemplate:async()=>({template:{...row,archived:true}})});await restored.open();await restored.controller.command('parent-template-restore-review',{templateId:row.id});await restored.controller.command('parent-template-restore');assert.equal(restored.state.ack.record.archived,false);
});
test('navigation, logout and obsolete picker owner discard late private data and cannot select into another composer',async()=>{
 const gate=deferred(),e=setup({parentMessageTemplate:()=>gate.promise});await e.open('choose');const reading=e.controller.command('parent-template-choose',{templateId:row.id});e.invalidate();gate.resolve({template:row});await reading;assert.equal(e.controller.isOpen(),false);assert.equal(e.selected.length,0);
 const lost=deferred(),other=setup({parentMessageTemplates:()=>lost.promise});const opening=other.open();other.setIdentity('other-teacher');lost.resolve({records:[row],total:1,page:1,pageSize:25,revision:'r'});await opening;assert.equal(other.controller.isOpen(),false);
});
test('read errors are unknown rather than empty; search and pagination are bounded independent of editor state',async()=>{
 let calls=0;const e=setup({parentMessageTemplates:async q=>{if(++calls===1)throw Error('offline');return {records:[row],total:30,page:q.page,pageSize:25,revision:'r2'};}});await e.open();assert.equal(e.state.status,'error');assert.equal(e.state.total,null);await e.controller.command('parent-template-retry');assert.equal(e.state.status,'ready');await e.controller.command('parent-template-page',{page:'2'});assert.equal(e.state.page,2);await e.controller.command('parent-template-new');await e.controller.command('parent-template-page',{page:'999'});assert.equal(e.state.step,'edit');assert.equal(e.state.page,2);
});
test('a legitimate multi-resource session identity is not mistaken for a short record identifier',async()=>{
 const e=setup();e.setIdentity('teacher-'+ 'resource-link-'.repeat(25));assert.equal(await e.open(),true);assert.equal(e.state.status,'ready');
});
test('a list page removed by another edit recovers to the last real page without inventing an empty collection',async()=>{
 let calls=0;const e=setup({parentMessageTemplates:async q=>({records:q.page===1?[row]:[],total:++calls===1?30:1,page:q.page,pageSize:25,revision:'r'+calls})});await e.open();await e.controller.command('parent-template-page',{page:'2'});assert.equal(e.state.page,1);assert.equal(e.state.status,'ready');assert.equal(e.state.records[0].id,row.id);
});
