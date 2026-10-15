import test from 'node:test';
import assert from 'node:assert/strict';
import {feePricingMarkup} from '../client/fee-pricing-ui.js';
const fee={id:'saved-fee',feeName:'Term fee',price:850};
test('future pricing is an admin saved-fee surface with truthful unavailable history and disabled saving',()=>{
 const html=feePricingMarkup({fee,role:'admin',courseNames:['Drawing','Watercolour']});
 assert.match(html,/HK\$850.00/);assert.match(html,/<li>Drawing<\/li><li>Watercolour<\/li>/);
 assert.match(html,/name="futurePrice"/);assert.match(html,/name="effectiveDate"/);
 assert.match(html,/order start date/);assert.doesNotMatch(html,/creation date|No pricing history|Saved successfully/);
 assert.match(html,/Pricing history is not available yet/);assert.match(html,/<button type="submit" disabled>/);
 assert.equal(feePricingMarkup({fee,role:'teacher'}),'');assert.equal(feePricingMarkup({fee,role:'student'}),'');
 assert.equal(feePricingMarkup({fee:{price:100},role:'admin'}),'');
});
test('new price drafts retain zero and escape all text without changing the saved fee',()=>{
 const source={...fee,feeName:'Art & <print>'},before=JSON.stringify(source);
 const html=feePricingMarkup({fee:source,role:'admin',courseNames:['<script>bad()</script>'],values:{futurePrice:0,effectiveDate:'2026-11-01" autofocus'}});
 assert.match(html,/Art &amp; &lt;print&gt;/);assert.match(html,/value="0"/);assert.match(html,/2026-11-01&quot; autofocus/);
 assert.doesNotMatch(html,/<script>|" autofocus="/);assert.equal(JSON.stringify(source),before);
 for(const price of [undefined,null,'',NaN]){
  const unknown=feePricingMarkup({fee:{...fee,price},role:'admin'},{t:z=>z});
  assert.match(unknown,/暫未提供/);assert.match(unknown,/價格記錄暫未提供/);assert.doesNotMatch(unknown,/HK\$0/);
 }
});
