import test from 'node:test';
import assert from 'node:assert/strict';
import {applyClearedSearch} from '../client/search-clear.js';
function field({live=false,formId='people-search',action=false,editor=false}={}){
 const events=[];const form={id:formId,isConnected:true,matches:()=>false,requestSubmit:()=>events.push('submit')};
 const button={isConnected:true,disabled:false,click:()=>events.push('action')};
 const input={value:'Maya',isConnected:true,form:editor?{...form,id:'student-editor'}:form,closest:()=>action?{querySelector:()=>button}:null,dispatchEvent(event){events.push(event.type);assert.equal(this.value,'');if(live)this.isConnected=false;}};
 return {input,events};
}
test('clear submits an empty query through the existing search form',()=>{const {input,events}=field();assert.equal(applyClearedSearch(input),true);assert.deepEqual(events,['input','change','submit']);});
test('live search redraw needs no stale form submission',()=>{const {input,events}=field({live:true});applyClearedSearch(input);assert.deepEqual(events,['input']);});
test('product/message filters and student picker use their search action',()=>{const {input,events}=field({action:true,editor:true});applyClearedSearch(input);assert.deepEqual(events,['input','change','action']);});
test('clear never submits an enclosing student editor',()=>{const {input,events}=field({editor:true});applyClearedSearch(input);assert.deepEqual(events,['input','change']);});
test('disabled and read-only fields cannot change',()=>{for(const property of ['disabled','readOnly']){const {input,events}=field();input[property]=true;assert.equal(applyClearedSearch(input),false);assert.equal(input.value,'Maya');assert.deepEqual(events,[]);}});

test('an editor containing filter in its name is never submitted',()=>{const {input,events}=field({formId:'search-filter-editor'});applyClearedSearch(input);assert.deepEqual(events,['input','change']);});
test('clearing leaves other field values untouched',()=>{const {input}=field();input.form.status='inactive';input.form.date='2026-10-20';applyClearedSearch(input);assert.equal(input.form.status,'inactive');assert.equal(input.form.date,'2026-10-20');});
