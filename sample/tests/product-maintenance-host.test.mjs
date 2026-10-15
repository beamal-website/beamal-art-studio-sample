import test from 'node:test';
import assert from 'node:assert/strict';
import {createInterfacePreview} from '../client/interface-preview.js';

function productHost(){
 let html='';
 const ui=createInterfacePreview({
  context:()=>({t:(_zh,en)=>en,role:'admin',sharedMode:true,sharedIdentity:'product-admin',staffViewKey:'products'}),
  dom:{activeElement:null,querySelector:()=>null,querySelectorAll:()=>[]},
  showModal:value=>{html=value;},repaint(){},
 });
 ui.action({action:'ui-operations',uiCommand:'view-product',uiSection:'products',uiId:'product-2'});
 ui.action({action:'ui-operations',uiCommand:'edit-product',uiSection:'products',uiId:'product-2'});
 return {ui,get html(){return html;}};
}

test('Chinese composition Escape keeps the exact product form while ordinary Escape returns to its detail',()=>{
 for(const composition of [{isComposing:true},{keyCode:229}]){
  const host=productHost(),before=host.html;let prevented=false;
  assert.match(before,/name="sku"[^>]*value="ART-002"/);
  host.ui.keyboard({key:'Escape',...composition,preventDefault(){prevented=true;}});
  assert.equal(prevented,false,'Ending composition must not cancel the product edit');
  assert.equal(host.html,before);assert.equal(host.ui.isOpen,true);
  host.ui.keyboard({key:'Escape',preventDefault(){}});
  assert.match(host.html,/Watercolour set/);assert.doesNotMatch(host.html,/name="sku"/);
 }
});

function sourceHost(source,role='admin'){
 let html='',current={t:(_zh,en)=>en,role,sharedMode:true,sharedIdentity:'product-admin',staffViewKey:'products',productsContext:source};
 const ui=createInterfacePreview({context:()=>current,dom:{activeElement:null,querySelector:()=>null,querySelectorAll:()=>[]},showModal:value=>{html=value;},repaint(){}});
 return {ui,get html(){return html;},context:patch=>{current={...current,...patch};}};
}
const suppliedProducts=()=>Array.from({length:27},(_,i)=>({id:'catalog-'+i,nameEn:'Studio supply '+String(i).padStart(2,'0'),nameZh:'畫室用品 '+i,price:i,stock:i,sku:'SUP-'+i,category:'materials',status:'active'}));

test('the product workspace reads its explicit source instead of borrowing unrelated presentation products',()=>{
 const records=suppliedProducts(),host=sourceHost({status:'ready',records,revision:'r1'});
 const page=host.ui.operations('products');
 assert.match(page,/of 27 products/);assert.doesNotMatch(page,/Sketchbook A4|Watercolour set/);
 host.ui.action({action:'ui-operations',uiCommand:'view-product',uiSection:'products',uiId:'catalog-21'});
 assert.match(host.html,/Studio supply 21/);assert.doesNotMatch(host.html,/Sketchbook A4/);
 assert.equal(records[21].price,21);
});

test('explicit loading or unavailable product sources do not fall back to four presentation products',()=>{
 for(const source of [null,{status:'loading'},{status:'error',error:'Read failed'},{status:'ready',records:null}]){
  const host=sourceHost(source),page=host.ui.operations('products');
  assert.doesNotMatch(page,/Sketchbook A4|Watercolour set|Showing 1–4/);
 }
});

test('a teacher cannot open the administrator product editor with a forged UI action',()=>{
 const host=sourceHost({status:'ready',records:suppliedProducts()},'teacher');
 host.ui.action({action:'ui-operations',uiCommand:'edit-product',uiSection:'products',uiId:'product-2'});
 assert.equal(host.ui.isOpen,false);assert.equal(host.html,'');
});

test('changing the active identity or leaving the product workspace discards its old private dialog',()=>{
 for(const changed of [{sharedIdentity:'another-admin'},{staffViewKey:'accounting'},{role:'student'}]){
  const host=sourceHost({status:'ready',records:suppliedProducts()});
  host.ui.operations('products');host.ui.action({action:'ui-operations',uiCommand:'view-product',uiSection:'products',uiId:'catalog-21'});
  assert.equal(host.ui.isOpen,true);host.context(changed);host.ui.operations('products');
  assert.equal(host.ui.isOpen,false);assert.equal(host.html,'');
 }
});

test('a product removed from a successful source read cannot leave its old detail or editor open',()=>{
 for(const command of ['view-product','edit-product']){
  const records=suppliedProducts(),host=sourceHost({status:'ready',records,revision:'r1'});
  host.ui.operations('products');host.ui.action({action:'ui-operations',uiCommand:command,uiSection:'products',uiId:'catalog-21'});
  assert.equal(host.ui.isOpen,true);
  host.context({productsContext:{status:'ready',records:records.filter(row=>row.id!=='catalog-21'),revision:'r2'}});
  host.ui.operations('products');assert.equal(host.ui.isOpen,false);assert.equal(host.html,'');
 }
});
