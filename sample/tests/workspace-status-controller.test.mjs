import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspaceStatusController} from '../client/workspace-status-ui.js';
import {defaultStatusTags} from '../shared/workspace-status.js';
const tick=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
function setup(api){let root=null,identity='teacher-a',inputs=[];const events={},header={dataset:{wsHeader:'trial'},getBoundingClientRect:()=>({left:100,bottom:150})},cell={dataset:{wsCategory:'trial',wsKey:'trial:a'},innerHTML:''};const dom={defaultView:{innerWidth:1024,innerHeight:768},body:{append(node){root=node;}},createElement:()=>({style:{},setAttribute(){},remove(){root=null;},innerHTML:''}),querySelector(selector){if(selector==='#workspace-status-popup')return root;if(selector.includes('[data-ws-header='))return header;return null;},querySelectorAll(selector){return selector.includes('input[name="status-name"]')?inputs:selector==='[data-ws-header]'?[header]:selector.startsWith('.workspace-status-cell')?[cell]:[];},addEventListener(type,callback){events[type]=callback;}};
 const controller=createWorkspaceStatusController({api,dom,context:()=>({identity,role:'teacher',t:(_zh,en)=>en}),newKey:()=> 'random-operation-id'});
 return {controller,events,cell,header,root:()=>root,inputs:value=>inputs=value,identity:value=>identity=value,event(target){return {target,clientX:100,clientY:150,preventDefault(){}};}};
}
const data=tagId=>({tags:defaultStatusTags(),version:0,items:[{key:'trial:a',tagId,version:0}]});
test('Status settings open only on right-click, save through the shared API and leave the surrounding table alone',async()=>{
 const writes=[],a=setup({workspaceStatuses:async()=>data(null),saveWorkspaceStatusTags:async(category,tags,version,key)=>{writes.push({category,tags,version,key});return {settings:{tags,version:1}};}});a.controller.afterRender();await tick();
 const headerTarget={getBoundingClientRect:()=>({left:100,bottom:150}),closest:selector=>selector==='[data-ws-header]'?a.header:null};
 a.events.click(a.event(headerTarget));assert.equal(a.root(),null);
 a.events.contextmenu(a.event(headerTarget));await tick();assert.match(a.root().innerHTML,/workspace-status-form/);assert.match(a.root().innerHTML,/Light blue/);
 const form={id:'workspace-status-form'};a.events.submit({target:form,preventDefault(){}});await tick();assert.equal(writes.length,1);assert.equal(writes[0].category,'trial');assert.equal(a.root(),null);assert.match(a.cell.innerHTML,/data-ws-pick="trial"/);
});
test('an old colleague or identity response cannot replace the current account status',async()=>{
 let resolve;const a=setup({workspaceStatuses:()=>new Promise(done=>{resolve=done;})});a.controller.afterRender();await tick();a.identity('');a.controller.afterRender();resolve(data('done'));await tick();assert.doesNotMatch(a.cell.innerHTML,/Done/);
});

test('choosing a row status uses its own version and updates just that row after the shared acknowledgement',async()=>{
 const writes=[],a=setup({workspaceStatuses:async()=>data(null),assignWorkspaceStatus:async(category,payload,key)=>{writes.push({category,payload,key});return {item:{...payload,version:1}};}});a.controller.afterRender();await tick();
 const picker={disabled:false,dataset:{wsPick:'trial',wsKey:'trial:a'}},target={getBoundingClientRect:()=>({left:100,bottom:150}),closest:selector=>selector==='[data-ws-pick]'?picker:null};a.events.click(a.event(target));await tick();assert.match(a.root().innerHTML,/data-ws-assign="done"/);
 const button={disabled:false,dataset:{wsAssign:'done'},hasAttribute:name=>name==='data-ws-assign'},selection={closest:selector=>selector==='#workspace-status-popup'?a.root():selector==='button'?button:null};a.events.click(a.event(selection));await tick();assert.deepEqual(writes[0].payload,{key:'trial:a',tagId:'done',version:0});assert.equal(writes[0].category,'trial');assert.equal(a.root(),null);assert.match(a.cell.innerHTML,/Done/);
});


test('Status colours are visible swatches; choosing one preserves typed names and saves the actual colour',async()=>{
 const writes=[],a=setup({workspaceStatuses:async()=>data(null),saveWorkspaceStatusTags:async(category,tags)=>{writes.push(tags);return {settings:{tags,version:1}};}});
 a.controller.afterRender();await tick();
 const target={getBoundingClientRect:()=>({left:100,bottom:150}),closest:selector=>selector==='[data-ws-header]'?a.header:null};
 a.events.contextmenu(a.event(target));await tick();
 assert.doesNotMatch(a.root().innerHTML,/<select/);
 assert.equal((a.root().innerHTML.match(/data-ws-command="color"/g)||[]).length,18);
 assert.match(a.root().innerHTML,/aria-pressed="true"/);assert.match(a.root().innerHTML,/--ws-swatch:#f8d7da/);
 assert.equal(a.root().style.width,'480px');
 a.inputs([{dataset:{index:'1'},value:'Following up'}]);
 const button={disabled:false,dataset:{wsCommand:'color',index:'1',color:'red'},hasAttribute:()=>false};
 a.events.click(a.event({closest:selector=>selector==='#workspace-status-popup'?a.root():selector==='button'?button:null}));
 assert.match(a.root().innerHTML,/value="Following up"/);
 a.events.submit({target:{id:'workspace-status-form'},preventDefault(){}});await tick();
 assert.equal(writes[0][1].color,'red');assert.equal(writes[0][1].name,'Following up');
});
