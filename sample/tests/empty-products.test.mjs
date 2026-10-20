import test from 'node:test';
import assert from 'node:assert/strict';
import {getOperationsPreviewData,operationsPageMarkup} from '../client/operations-ui.js';
import {salesWorkspaceMarkup} from '../client/sales-workspace-ui.js';
import {readFileSync} from 'node:fs';

test('the application keeps Products and stock views but starts with no sample products or linked invoice items',()=>{
 const data=getOperationsPreviewData();assert.deepEqual(data.products,[]);
 for(const invoice of data.invoices)for(const item of invoice.items)assert.doesNotMatch(item.nameEn,/Sketchbook A4|Watercolour set|Creative toolkit|Studio apron/);
 const html=operationsPageMarkup('products',{}, {t:(_,en)=>en});assert.match(html,/Products/);assert.match(html,/Manage stock/);assert.doesNotMatch(html,/ART-001|ART-002|ART-003|KIT-001/);
 const sales=salesWorkspaceMarkup({products:[]},{t:(_,en)=>en});assert.match(sales,/data-section="products"/);
 const src=readFileSync(new URL('../src.js',import.meta.url),'utf8');assert.ok(src.includes("['products','products','產品','Products']"));
});
