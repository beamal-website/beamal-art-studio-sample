import test from 'node:test';
import assert from 'node:assert/strict';
import {orderPackageSummaryMarkup} from '../client/order-package-summary-ui.js';
const en={t:(_z,e)=>e},zh={t:z=>z};
const item=overrides=>({courseId:'course-A',feeId:'fee-A',pricing:{pricingModel:'package',packageType:'minutes',packageTotal:720},lessons:[{date:'2026-10-16',duration:60},{date:'2026-10-23',duration:60}],...overrides});

test('paid minutes quota stays in original units and selected lessons are a separate count, never a remaining balance',()=>{
 const html=orderPackageSummaryMarkup(item(),{paymentStatus:'paid'},en);
 assert.match(html,/Original purchased quota<\/dt><dd>720 minutes/);assert.match(html,/Selected lessons on this order<\/dt><dd>2 lessons/);assert.match(html,/Remaining balance<\/dt><dd>Not provided/);assert.doesNotMatch(html,/12 visits|718|600 minutes|data-action=|<button|<input/);
});

test('unpaid package statuses never imply purchased quota and visits and legacy lessons retain their meaning',()=>{
 for(const paymentStatus of ['', 'draft','awaiting-confirmation','awaiting-payment','unknown','PAID'])for(const packageType of ['visits','lessons']){
  const html=orderPackageSummaryMarkup(item({pricing:{pricingModel:'package',packageType,packageTotal:12}}),{paymentStatus},en);
  assert.match(html,/Quota on this order<\/dt><dd>12 visits/);assert.doesNotMatch(html,/Original purchased quota|12 minutes/);
 }
});

test('Chinese visits quota uses the same 次 unit as Fee while selected lessons remain 堂',()=>{
 for(const packageType of ['visits','lessons']){
  const html=orderPackageSummaryMarkup(item({pricing:{pricingModel:'package',packageType,packageTotal:4}}),{paymentStatus:'paid'},zh);
  assert.match(html,/原購額度<\/dt><dd>4 次/);assert.match(html,/本單所選課堂<\/dt><dd>2 堂/);assert.doesNotMatch(html,/原購額度<\/dt><dd>4 堂/);
 }
});

test('absent malformed and zero package quotas are unknown rather than zero or inferred from lesson counts',()=>{
 for(const pricing of [undefined,null,{},...[0,-1,1.5,NaN,Infinity,'720',Number.MAX_SAFE_INTEGER+1].map(packageTotal=>({pricingModel:'package',packageType:'minutes',packageTotal})),...['hours','',null].map(packageType=>({pricingModel:'package',packageType,packageTotal:720}))]){
  const html=orderPackageSummaryMarkup(item({pricing,purchasedLessons:99}),{},en);assert.match(html,/Quota on this order<\/dt><dd>Not provided/);assert.doesNotMatch(html,/<dd>0|99 visits|NaN|Infinity/);
 }
});

test('known monthly models are not package visits while an unknown model remains unknown',()=>{
 for(const pricingModel of ['monthly-lessons','per-lesson','fixed-monthly']){
  const html=orderPackageSummaryMarkup(item({pricing:{pricingModel,price:300,months:3,packageType:'visits',packageTotal:9}}),{},en);assert.match(html,/Quota on this order<\/dt><dd>Not applicable/);assert.doesNotMatch(html,/9 visits|900/);
 }
 const unknown=orderPackageSummaryMarkup(item({pricing:{pricingModel:'something-else',packageType:'minutes',packageTotal:720}}),{},en);assert.match(unknown,/Quota on this order<\/dt><dd>Not provided/);
});

test('remaining validity and components cannot be reconstructed from dates expiry totals or current fee data',()=>{
 const source=item({remaining:718,balance:{remaining:718,unit:'minutes'},validFrom:'2026-01-01',validTo:'2026-12-31',components:[{name:'UNSAVED component'}],purchasedLessons:44});source.pricing.bookingExpiry={value:3,unit:'months'};
 Object.defineProperty(source,'currentFee',{get(){throw Error('Current fee must not be consulted');}});
 const html=orderPackageSummaryMarkup(source,{},en);for(const label of ['Remaining balance','Validity period','Package contents'])assert.ok(html.includes(label+'</dt><dd>Not provided'));
 assert.doesNotMatch(html,/718|44|2026-|UNSAVED|3 months/);
});

test('known empty lesson selection is zero but missing or invalid lesson source is not provided',()=>{
 for(const lessons of [undefined,null,{},'two lessons']){const html=orderPackageSummaryMarkup(item({lessons,purchasedLessons:99}),{},en);assert.match(html,/Selected lessons on this order<\/dt><dd>Not provided/);}
 assert.match(orderPackageSummaryMarkup(item({lessons:[]}),{},en),/Selected lessons on this order<\/dt><dd>0 lessons/);
 assert.match(orderPackageSummaryMarkup(item({lessons:[{}]}),{},en),/Selected lessons on this order<\/dt><dd>1 lesson/);
});

test('summary identifiers are escaped without leaking unrelated item content and labels support both languages',()=>{
 const source=item({courseId:'c"><img src=x onerror=alert(1)>',feeId:'f&"<script>',courseName:'PRIVATE COURSE',feeName:'PRIVATE FEE'}),english=orderPackageSummaryMarkup(source,{paymentStatus:'paid'},en),chinese=orderPackageSummaryMarkup(source,{paymentStatus:'paid'},zh);
 assert.match(english,/data-course-id="c&quot;&gt;&lt;img/);assert.match(english,/data-fee-id="f&amp;&quot;&lt;script&gt;"/);assert.doesNotMatch(english,/<img|<script|PRIVATE COURSE|PRIVATE FEE/);
 assert.match(chinese,/原購額度<\/dt><dd>720 分鐘/);assert.match(chinese,/本單所選課堂<\/dt><dd>2 堂/);assert.match(chinese,/剩餘額度<\/dt><dd>未提供/);assert.match(chinese,/有效期間<\/dt><dd>未提供/);assert.match(chinese,/組合內容<\/dt><dd>未提供/);
});

test('summary reads only the exact order pricing snapshot and never mutates it or follows changed current fees',()=>{
 const pricing=Object.freeze({pricingModel:'package',packageType:'visits',packageTotal:8}),source=Object.freeze(item({pricing})),currentFee={packageType:'minutes',packageTotal:720};
 const first=orderPackageSummaryMarkup(source,{paymentStatus:'paid'},{...en,currentFee});currentFee.packageTotal=999;currentFee.packageType='visits';assert.equal(orderPackageSummaryMarkup(source,{paymentStatus:'paid'},{...en,currentFee}),first);assert.match(first,/8 visits/);assert.doesNotMatch(first,/720|999/);
 assert.match(orderPackageSummaryMarkup(undefined,{},en),/Quota on this order<\/dt><dd>Not provided/);
});
