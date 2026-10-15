import test from 'node:test';
import assert from 'node:assert/strict';
import {getReportGroups,getReportQueryDefaults,reportsPageMarkup,reportQueryMarkup} from '../client/reports-ui.js';

const en={t:(_zh,text)=>text,today:'2026-10-15'};
const zh={t:text=>text,today:'2026-10-15'};
const buttonTags=html=>[...html.matchAll(/<button\b([^>]*)>/g)].map(match=>match[1]);

test('catalogue retains all 19 source reports and adds the PDF course payment summary in Sales',()=>{
 const groups=getReportGroups(),items=groups.flatMap(group=>group.items);
 assert.deepEqual(groups.map(group=>group.key),['sales','enrollment','product','staff']);
 assert.equal(items.length,20);
 assert.equal(new Set(items.map(item=>item.id)).size,20);
 const sourceNames=['Payment Summary','Payment Detail','Sales Summary','Sales Detail','Earned Revenue Summary','Earned Revenue Detail','Discount Summary','Discount Detail','Deferred Revenue By Package','First Enrollment','Last Enrollment','Enrollment Detail','Lesson Detail By Staff','Package Usage','Enrollment Metrics','Product Summary','Product Detail','Salary Summary','Time Clock Detail'];
 for(const name of sourceNames)assert.ok(items.find(item=>item.en===name),name);
 assert.equal(groups.find(group=>group.key==='sales').items.find(item=>item.en==='Course Payment Summary')?.id,'course-payment-summary');
});

test('every official report entry is disabled and explains its availability without fake actions or routes',()=>{
 for(const ctx of [en,zh]){
  const html=reportsPageMarkup(ctx),buttons=buttonTags(html);
  assert.equal(buttons.length,20);
  assert.ok(buttons.every(attrs=>/\bdisabled\b/.test(attrs)));
  assert.match(html,/id="reports-availability"/);
  assert.equal((html.match(/aria-describedby="reports-availability /g)||[]).length,20);
  assert.match(html,/queries and exports are not available yet|報告查詢及匯出暫未開放/);
  assert.doesNotMatch(html,/data-action=|href=|onclick=|虛構|QA|工程|undefined|NaN/);
 }
});

test('catalogue metadata can be read without later calls inheriting external mutations',()=>{
 const first=getReportGroups();
 first[0].items[0].en='Changed label';
 first[0].items.pop();
 const next=getReportGroups();
 assert.equal(next[0].items[0].en,'Payment Summary');
 assert.equal(next.flatMap(group=>group.items).length,20);
});

test('report date defaults use the supplied local day and leave dates unknown when unavailable',()=>{
 assert.deepEqual(getReportQueryDefaults('product-summary',en),{period:'month',month:'2026-10',year:'2026',quarter:'4',from:'',to:'',asOf:'2026-10-15'});
 assert.equal(getReportQueryDefaults('deferred-revenue-by-package',en).period,'as-of');
 const unknown=getReportQueryDefaults('product-summary',{});
 assert.equal(unknown.month,'');
 assert.equal(unknown.year,'');
 assert.equal(unknown.asOf,'');
 assert.equal(getReportQueryDefaults('not-a-report',en),null);
});

test('monthly quarterly yearly and custom date controls preserve the supplied draft and have no live submit',()=>{
 for(const period of ['month','quarter','year','custom']){
  const html=reportQueryMarkup('course-payment-summary',{filters:{period,month:'2026-09',year:'2025',quarter:'2',from:'2026-10-20',to:'2026-10-10',course:'course-2'}},en);
  assert.match(html,/Course Payment Summary/);
  assert.match(html,new RegExp(`value="${period}" selected`));
  assert.ok(buttonTags(html).every(attrs=>/\bdisabled\b/.test(attrs)));
  assert.doesNotMatch(html,/data-action=|href=|onclick=/);
  if(period==='month')assert.match(html,/name="month"[^>]*value="2026-09"/);
  if(period==='quarter'){assert.match(html,/name="year"[^>]*value="2025"/);assert.match(html,/value="2" selected/);}
  if(period==='year')assert.match(html,/name="year"[^>]*value="2025"/);
  if(period==='custom'){assert.match(html,/name="from"[^>]*value="2026-10-20"/);assert.match(html,/name="to"[^>]*value="2026-10-10"/);}
 }
});

test('filters fit the report task rather than presenting irrelevant course product and staff controls everywhere',()=>{
 const product=reportQueryMarkup('product-summary',{},en);
 assert.match(product,/name="product"/);
 assert.match(product,/name="category"/);
 assert.doesNotMatch(product,/name="teacher"|name="attendance"/);
 const course=reportQueryMarkup('course-payment-summary',{},en);
 assert.match(course,/name="course"/);
 assert.match(course,/name="category"/);
 assert.doesNotMatch(course,/name="product"|name="staff"/);
 const enrollment=reportQueryMarkup('enrollment-detail',{},en);
 assert.match(enrollment,/name="teacher"/);
 assert.match(enrollment,/name="attendance"/);
 const salary=reportQueryMarkup('salary-summary',{},en);
 assert.match(salary,/name="staff"/);
 assert.doesNotMatch(salary,/name="product"|name="attendance"/);
});

test('package deferred revenue is an as-of snapshot rather than a misleading date interval',()=>{
 const html=reportQueryMarkup('deferred-revenue-by-package',{filters:{asOf:'2026-09-30'}},en);
 assert.match(html,/name="asOf"[^>]*value="2026-09-30"/);
 assert.doesNotMatch(html,/name="period"|name="from"|name="to"/);
});

test('unknown loading empty and error results are distinct and never manufacture zero totals',()=>{
 const initial=reportQueryMarkup('payment-summary',{},en);
 assert.match(initial,/Report data has not been loaded/);
 assert.doesNotMatch(initial,/HK\$0|0 records|<table|No records/);
 const loading=reportQueryMarkup('payment-summary',{result:{status:'loading'}},en);
 assert.match(loading,/aria-busy="true"/);
 assert.match(loading,/Loading report/);
 assert.doesNotMatch(loading,/No records|<table/);
 const empty=reportQueryMarkup('payment-summary',{result:{status:'empty'}},en);
 assert.match(empty,/No records match these filters/);
 assert.doesNotMatch(empty,/HK\$0|<table/);
 const error=reportQueryMarkup('payment-summary',{result:{status:'error',message:'Temporary <network> failure'}},en);
 assert.match(error,/role="alert"/);
 assert.match(error,/Temporary &lt;network&gt; failure/);
 assert.doesNotMatch(error,/<network>|No records|HK\$0/);
});

test('invalid date drafts show an actionable error and cannot masquerade as ready results or an empty report',()=>{
 const cases=[
  {period:'custom',from:'2026-10-20',to:'2026-10-10'},
  {period:'custom',from:'2026-02-29',to:'2026-03-01'},
  {period:'month',month:'2026-13'},
  {period:'quarter',year:'2026',quarter:'5'},
  {period:'year',year:'0'}
 ];
 for(const filters of cases)for(const status of ['ready','empty']){
  const html=reportQueryMarkup('payment-summary',{filters,result:{status,rows:[{paymentMethod:'Must not appear',paidAmount:100}]}},en);
  assert.match(html,/role="alert"/);
  assert.doesNotMatch(html,/<table|Must not appear|No records match|HK\$0/);
 }
 const custom=reportQueryMarkup('payment-summary',{filters:cases[0]},en);
 assert.match(custom,/name="from"[^>]*value="2026-10-20"/);
 assert.match(custom,/name="to"[^>]*value="2026-10-10"/);
 assert.match(custom,/end date cannot be earlier than the start date/i);
 const asOf=reportQueryMarkup('deferred-revenue-by-package',{filters:{asOf:'2026-02-29'}},zh);
 assert.match(asOf,/role="alert"/);
 assert.match(asOf,/有效的截至日期/);
 const leap=reportQueryMarkup('payment-summary',{filters:{period:'custom',from:'2028-02-29',to:'2028-03-01'}},en);
 assert.doesNotMatch(leap,/role="alert"/);
 assert.match(leap,/Report data has not been loaded/);
});

test('ready output reads only supplied rows and keeps unavailable values distinct from genuine zero',()=>{
 const state={result:{status:'ready',rows:[{paymentMethod:'FPS',paymentCount:0,paidAmount:0},{paymentMethod:'Cash',paymentCount:null,paidAmount:null}]}},before=JSON.stringify(state);
 const html=reportQueryMarkup('payment-summary',state,en);
 assert.match(html,/<table/);
 assert.match(html,/FPS/);
 assert.match(html,/Cash/);
 assert.match(html,/HK\$0\.00/);
 assert.equal((html.match(/>—<\/td>/g)||[]).length,2);
 assert.doesNotMatch(html,/HK\$1,120|Chloe|Maya|Leo/);
 assert.equal(JSON.stringify(state),before);
 const malformed=reportQueryMarkup('payment-summary',{result:{status:'ready'}},en);
 assert.match(malformed,/Report data has not been loaded/);
 assert.doesNotMatch(malformed,/<table|No records/);
});

test('clock detail presents independent recorded events without pairing an In with an invented Out or hours',()=>{
 const state={result:{status:'ready',rows:[{date:'2026-10-15',staffName:'Leo Chan',time:'09:02',eventType:'in'},{date:'2026-10-16',staffName:'Leo Chan',time:'17:06',eventType:'out'}]}};
 const enHtml=reportQueryMarkup('time-clock-detail',state,en);
 assert.match(enHtml,/>Recorded time<\/th>/);
 assert.match(enHtml,/>Event<\/th>/);
 assert.match(enHtml,/>09:02<\/td>/);
 assert.match(enHtml,/>Clock in<\/td>/);
 assert.match(enHtml,/>17:06<\/td>/);
 assert.match(enHtml,/>Clock out<\/td>/);
 assert.doesNotMatch(enHtml,/>Clock in<\/th>|>Clock out<\/th>|Total hours|Duration|NaN/);
 const zhHtml=reportQueryMarkup('time-clock-detail',state,zh);
 assert.match(zhHtml,/>上班打卡<\/td>/);
 assert.match(zhHtml,/>下班打卡<\/td>/);
});

test('provided options and result text are escaped, with no silent substitution for an unknown report',()=>{
 const html=reportQueryMarkup('product-summary',{filters:{product:'p<1'},result:{status:'ready',rows:[{productName:'<script>bad()</script>',category:'Art & tools',quantity:3,paidAmount:144}]}},{...en,products:[{id:'p<1',name:'Brush <set>'}]});
 assert.match(html,/Brush &lt;set&gt;/);
 assert.match(html,/&lt;script&gt;bad\(\)&lt;\/script&gt;/);
 assert.match(html,/Art &amp; tools/);
 assert.doesNotMatch(html,/<script>|value="p<1"/);
 const unknown=reportQueryMarkup('missing-record',{},en);
 assert.match(unknown,/Report not found/);
 assert.doesNotMatch(unknown,/Payment Summary|Course Payment Summary|<form|<table/);
});

test('all report query states render both languages without leaking internal or undefined labels',()=>{
 for(const ctx of [en,zh])for(const report of getReportGroups().flatMap(group=>group.items))for(const status of ['unknown','loading','empty','error']){
  const html=reportQueryMarkup(report.id,{result:{status}},ctx);
  assert.ok(html.includes(ctx===zh?report.zh:report.en));
  assert.doesNotMatch(html,/undefined|NaN|\[object Object\]|QA|虛構|data-action=/);
 }
});
