import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceDataTools,dataToolsMarkup} from '../client/data-tools-ui.js';

const en={t:(_zh,en)=>en};
const selectedFields=html=>[...html.matchAll(/<input\b[^>]*name="column"[^>]*>/g)]
 .filter(([tag])=>/\bchecked\b/.test(tag)).map(([tag])=>tag.match(/value="([^"]+)"/)[1]);

test('export review includes only selected columns and returning retains format, range and choices',()=>{
 const initial={view:'export',entity:'students',step:'edit'};
 const reviewed=advanceDataTools(initial,'review',{format:'Excel',range:'page',columns:['name','remark']});
 const review=dataToolsMarkup(reviewed,en),rows=review.match(/<tbody>(.*?)<\/tbody>/s)[1];
 assert.match(rows,/>Name</);assert.match(rows,/>Remark</);
 assert.doesNotMatch(rows,/>Category<|>Level<|>Email</);
 assert.match(review,/Excel/);assert.match(review,/Current page/);
 const back=advanceDataTools(reviewed,'back'),edit=dataToolsMarkup(back,en);
 assert.deepEqual(selectedFields(edit),['name','remark']);
 assert.match(edit,/<option value="Excel" selected>/);
 assert.match(edit,/<option value="page" selected>/);
 assert.deepEqual(initial,{view:'export',entity:'students',step:'edit'});
});

test('export cannot advance without a valid column and keeps the other draft options',()=>{
 for(const columns of [[],['unknown','<script>']]){
  const state=advanceDataTools({view:'export',entity:'courses',step:'edit'},'review',{format:'Excel',range:'page',columns});
  assert.equal(state.step,'edit');assert.equal(state.error,'columns-required');
  const html=dataToolsMarkup(state,en);
  assert.match(html,/role="alert"/);assert.match(html,/Choose at least one column/);
  assert.deepEqual(selectedFields(html),[]);
  assert.match(html,/<option value="Excel" selected>/);
  assert.match(html,/<option value="page" selected>/);
 }
});

test('column choices use known fields once and keep their order when language changes',()=>{
 const state=advanceDataTools({view:'export',entity:'fees',step:'edit'},'review',{columns:['remark','name','remark','unknown'],format:'CSV',range:'filtered'});
 assert.deepEqual(state.columns,['name','remark']);
 const back=advanceDataTools(state,'back'),html=dataToolsMarkup(back,{t:zh=>zh});
 assert.deepEqual(selectedFields(html),['name','remark']);
 assert.match(html,/<option value="filtered" selected>目前篩選結果/);
 assert.match(html,/<option value="page"\s*>目前頁面/);
});

test('a new export starts with all fields while import keeps its existing example mapping',()=>{
 assert.deepEqual(selectedFields(dataToolsMarkup({view:'export',entity:'courses',step:'edit'},en)),['name','category','level','email','remark']);
 const state=advanceDataTools({view:'import',entity:'courses',step:'edit'},'review',{filename:'<Class examples>.csv',duplicates:'review'});
 const html=dataToolsMarkup(state,en);
 assert.equal(state.step,'review');assert.match(html,/&lt;Class examples&gt;.csv/);
 assert.match(html,/>Name</);assert.match(html,/>Category</);assert.match(html,/>Email</);
 assert.doesNotMatch(html,/Choose at least one column/);
});
