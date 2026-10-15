import test from 'node:test';
import assert from 'node:assert/strict';
import {productFixture,copy} from './helpers/product-host.mjs';
for(const mode of ['error','changed'])test('a composing product field stays mounted when its source becomes '+mode,()=>{
 const p=productFixture();p.filter({query:'Same product title'});p.action('edit-product','exact-product-21');
 const field=p.type('remark','中文輸入候選');field.focus();field.setSelectionRange(3,3,'none');field.scrollTop=29;p.body.scrollTop=207;
 const writes=p.modalWrites,rows=copy(p.records);rows[20].price=999;
 p.current.productsContext=mode==='error'?{status:'error',records:[],revision:'temporary-error',error:'Product source unavailable'}:{status:'ready',records:rows,revision:'new-current-price'};
 p.key('Escape',{isComposing:true,keyCode:229});
 assert.equal(p.ui.isOpen,true);assert.equal(p.inputs.find(n=>n.name==='remark')?.value,'中文輸入候選');
 assert.equal(p.modalWrites,writes,'Source-only error/status must not replace the composing form');const alert=p.controls.find(n=>n.id==='ops-product-source-error');assert.ok(alert);assert.equal(alert.hidden,false);assert.match(alert.textContent,/unavailable|changed/i);assert.equal(p.controls.find(n=>n.tagName==='BUTTON'&&n.type==='submit')?.disabled,true);
 assert.equal(field.isConnected,true);assert.equal(p.dom.activeElement,field);assert.equal(field.scrollTop,29);assert.equal(p.body.scrollTop,207);
});


test('stock Review keeps the canonical quantity unchanged and Back restores exact draft selection and reading position',()=>{
 const p=productFixture();p.filter({query:'ART-021'});p.action('view-product','exact-product-21');p.action('stock-product','exact-product-21');
 p.change('direction','add');p.type('quantity','2');const reason=p.type('reason','  Class materials\nKeep this reason  ');
 reason.focus();reason.setSelectionRange(3,12,'backward');reason.scrollTop=29;p.body.scrollTop=207;p.ui.input(reason);
 const before=JSON.stringify(p.records);p.submit();
 assert.match(p.html,/Review stock adjustment/);assert.equal(p.body.scrollTop,0);assert.equal(p.dom.activeElement,p.body);
 assert.ok(p.controls.find(n=>n.type==='submit')?.disabled);assert.equal(JSON.stringify(p.records),before);assert.doesNotMatch(p.main,/Stock preview updated/);
 p.back();const restored=p.inputs.find(n=>n.name==='reason');
 assert.equal(restored.value,'  Class materials\nKeep this reason  ');assert.equal(p.dom.activeElement,restored);assert.equal(restored.selectionStart,3);assert.equal(restored.selectionEnd,12);assert.equal(restored.selectionDirection,'backward');assert.equal(restored.scrollTop,29);assert.equal(p.body.scrollTop,207);
 p.action('cancel-product');assert.match(p.html,/ART-021|Cabinet 21/);assert.doesNotMatch(p.html,/name="quantity"/);assert.equal(p.dom.activeElement?.dataset.uiCommand,'stock-product');p.action('close');assert.equal(p.ui.isOpen,false);assert.equal(p.dom.activeElement?.dataset.uiId,'exact-product-21');assert.equal(JSON.stringify(p.records),before);
});


test('a validation error survives native focusout during the controlled repaint and an unchanged source poll',()=>{
 for(const omitSource of [false,true]){
  const p=productFixture({omitSource,focusoutOnRepaint:true});const id=omitSource?'product-2':'exact-product-21';
  p.action('edit-product',id,{forged:true});p.type('price','90071992547409.91');p.submit();
  assert.match(p.html,/cannot be represented accurately/,'A rejected review must explain how to correct the amount');
  assert.equal(p.dom.activeElement?.name,'price');p.repaint();assert.match(p.html,/cannot be represented accurately/);
  assert.equal(p.inputs.find(n=>n.name==='price').value,'90071992547409.91');
 }
});
