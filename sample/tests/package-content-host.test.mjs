import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {packageContentMarkup} from '../client/package-content-ui.js';

const source=readFileSync(new URL('../src.js',import.meta.url),'utf8');
function actualFunction(name,next){const start=source.indexOf(`function ${name}(`),end=source.indexOf(`function ${next}(`,start);assert.ok(start>=0&&end>start);return source.slice(start,end);}
const production=actualFunction('renderPackageContent','packageContentInput')+actualFunction('changePackageContent','backPackageContent');
const attributes=tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match=>[match[1],match[2]]));
function editor(ids,scrollTop,bounds){
 const state={feeId:'package-exact',fee:{id:'package-exact',version:1,pricingModel:'package',packageType:'minutes',packageTotal:720},step:'edit',components:ids.map(id=>({id,name:'Segment '+id,minutes:'60'})),error:'',sourceError:'',editScroll:0};
 const bodyNode=top=>({scrollTop:top,...(bounds?{getBoundingClientRect:()=>bounds.body}:{})});
 let body=bodyNode(scrollTop),fields=[],buttons=[],context;
 const form={id:'package-content-editor'},focusable=(dataset,name)=>({dataset,name,disabled:false,...(bounds?{getBoundingClientRect:()=>bounds.field,scrollIntoView(options){this.revealOptions=options;this.revealCalls=(this.revealCalls||0)+1;}}:{}),closest:selector=>selector==='#package-content-editor'?form:null,focus(options){this.focusOptions=options;context.document.activeElement=this;}});
 function mount(markup){
  fields=[...markup.matchAll(/<input\b[^>]*>/g)].map(match=>{const attrs=attributes(match[0]),node=focusable({componentId:attrs['data-component-id']},attrs.name);node.disabled=/\sdisabled\b/.test(match[0]);return node;});
  buttons=[...markup.matchAll(/<button\b[^>]*>/g)].map(match=>{const attrs=attributes(match[0]),node=focusable({action:attrs['data-action'],componentId:attrs['data-component-id']});node.disabled=/\sdisabled\b/.test(match[0]);return node;});
 }
 const child={set outerHTML(markup){body=bodyNode(0);mount(markup);}};
 context=vm.createContext({packageContentReturn:state,authUser:{role:'admin'},packageContentContextCurrent:()=>true,packageContentMarkup,t:(_zh,en)=>en,esc:value=>String(value??''),readPackageContentInputs:()=>{},document:{activeElement:null,
  querySelector(selector){if(selector==='#package-content-editor')return form;if(selector==='#package-content-body')return body;if(selector==='.package-content-modal')return child;if(selector.includes('[name=packageComponentName]'))return fields.find(node=>node.name==='packageComponentName');const action=selector.match(/data-action="([^"]+)"/)?.[1];return action?buttons.find(node=>node.dataset.action===action):null;},
  querySelectorAll(selector){return selector.includes('[name=packageComponentName]')?fields.filter(node=>node.name==='packageComponentName'):[...fields,...buttons];},
 }});
 mount(packageContentMarkup({...state,role:'admin'}));vm.runInContext(production,context);
 return {state,get body(){return body;},get active(){return context.document.activeElement;},change(action,id){context.document.activeElement=buttons.find(node=>node.dataset.action===action&&node.dataset.componentId===id);context.changePackageContent(action,id);}};
}

test('moving a package segment keeps current scroll and focuses its stable row after the actual renderer remount',()=>{
 const e=editor(['a','b'],487);e.change('package-content-down','a');assert.deepEqual(e.state.components.map(row=>row.id),['b','a']);assert.equal(e.body.scrollTop,487);assert.equal(e.active.name,'packageComponentName');assert.equal(e.active.dataset.componentId,'a');assert.equal(e.active.focusOptions.preventScroll,true);
});
test('removing a middle package segment keeps scroll and focuses the nearest surviving row',()=>{
 const e=editor(['a','b','c'],532);e.change('package-content-remove','b');assert.deepEqual(e.state.components.map(row=>row.id),['a','c']);assert.equal(e.body.scrollTop,532);assert.equal(e.active.name,'packageComponentName');assert.equal(e.active.dataset.componentId,'c');assert.equal(e.active.focusOptions.preventScroll,true);
});
test('removing the last package segment keeps scroll and returns focus to Add content',()=>{
 const e=editor(['a'],318);e.change('package-content-remove','a');assert.deepEqual(e.state.components,[]);assert.equal(e.body.scrollTop,318);assert.equal(e.active.dataset.action,'package-content-add');assert.equal(e.active.focusOptions.preventScroll,true);
});

function orderKeyboard(){
 const start=source.indexOf('function enrollmentKeyboard('),end=source.indexOf('\nasync function refreshLessonStudents(',start);assert.ok(start>=0&&end>start);
 let context,closed=0;const node=()=>({focus(){context.document.activeElement=this;}}),close=node(),body=node(),footer=node(),background=node(),all=[close,body,footer];
 context=vm.createContext({enrollmentOverlay:{kind:'details'},closeEnrollmentOverlay(){closed++;context.enrollmentOverlay=null;},document:{activeElement:close,querySelectorAll(selector){return selector.includes('.enrollment-order-summary[tabindex]')?all:[close,footer];},querySelector(){return close;}}});vm.runInContext(source.slice(start,end),context);
 return {context,close,body,footer,background,get closed(){return closed;},key(key,extra={}){let prevented=false;context.enrollmentKeyboard({key,preventDefault(){prevented=true;},...extra});return prevented;}};
}
test('order details keyboard allows native body traversal and contains forward reverse or background focus',()=>{
 const e=orderKeyboard();e.context.document.activeElement=e.close;assert.equal(e.key('Tab'),false);e.context.document.activeElement=e.body;assert.equal(e.key('Tab'),false,'Reading body must be recognized so native Tab can reach footer');assert.equal(e.key('Tab',{shiftKey:true}),false,'Native Shift Tab can return from body to Close');e.context.document.activeElement=e.footer;assert.equal(e.key('Tab'),true);assert.equal(e.context.document.activeElement,e.close);e.context.document.activeElement=e.close;assert.equal(e.key('Tab',{shiftKey:true}),true);assert.equal(e.context.document.activeElement,e.footer);e.context.document.activeElement=e.background;assert.equal(e.key('Tab'),true);assert.equal(e.context.document.activeElement,e.close);e.context.document.activeElement=e.background;assert.equal(e.key('Tab',{shiftKey:true}),true);assert.equal(e.context.document.activeElement,e.footer);
});
test('order details composition Escape keeps its overlay and normal Escape closes it',()=>{
 const e=orderKeyboard();e.key('Escape',{isComposing:true,keyCode:229});assert.equal(e.closed,0);assert.ok(e.context.enrollmentOverlay);e.key('Escape');assert.equal(e.closed,1);assert.equal(e.context.enrollmentOverlay,null);
});

test('moving a package segment below the reading viewport reveals only the nearest focused control',()=>{
 const e=editor(['a','b'],175,{body:{top:200,bottom:746.5,left:0,right:390},field:{top:820.56,bottom:868.56,left:16,right:370}});e.change('package-content-down','a');assert.equal(e.active.dataset.componentId,'a');assert.equal(e.body.scrollTop,175);assert.equal(e.active.revealCalls,1);assert.equal(e.active.revealOptions.block,'nearest');assert.equal(e.active.revealOptions.inline,'nearest');
});
test('moving an already visible package segment keeps the viewport without an extra reveal scroll',()=>{
 const e=editor(['a','b'],175,{body:{top:200,bottom:746.5,left:0,right:390},field:{top:600,bottom:648,left:16,right:370}});e.change('package-content-down','a');assert.equal(e.active.dataset.componentId,'a');assert.equal(e.body.scrollTop,175);assert.equal(e.active.revealCalls||0,0);
});
