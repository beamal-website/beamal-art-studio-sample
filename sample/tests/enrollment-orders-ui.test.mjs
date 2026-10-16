import test from 'node:test';
import assert from 'node:assert/strict';
import { enrollmentOrdersMarkup, enrollmentOrderDetailsMarkup, enrollmentOrderEditorMarkup, studentAccountLinksMarkup, sharedStudentClassesMarkup, enrollmentLessons, suggestedOrderCents } from '../client/enrollment-orders-ui.js';
const en = { t: (_z,e)=>e };
const order = {id:'o-1',studentId:'p-1',studentName:'Chloe <Ho>',source:'teacher',items:[{courseId:'c',courseName:'Drawing',feeId:'f',feeName:'Weekly',lessons:[{scheduleId:'s',sequence:1,sourceVersion:2,date:'2026-10-16',time:'13:00',duration:60}]}],amountCents:30000,orderStatus:'sent',paymentStatus:'awaiting-confirmation',version:2};
test('parent order confirmation never labels an order paid or exposes administrator payment control',()=>{const html=enrollmentOrderDetailsMarkup(order,{role:'student'},en);assert.match(html,/Confirm order/);assert.match(html,/Request changes/);assert.match(html,/Reject order/);assert.doesNotMatch(html,/data-action="orders-confirm-payment"/);assert.match(html,/Awaiting confirmation/);assert.match(html,/order as placed/);assert.match(html,/2026-10-16.*13:00/);assert.doesNotMatch(html,/Download/);assert.match(html,/data-action="ui-order-document"[^>]*>PDF Receipt/);});
test('administrator sends a saved draft separately and confirms payment only after parent confirmation',()=>{let html=enrollmentOrderDetailsMarkup({...order,orderStatus:'draft'},{role:'admin'},en);assert.match(html,/Send to parent/);assert.doesNotMatch(html,/data-action="orders-confirm-payment"/);html=enrollmentOrderDetailsMarkup({...order,orderStatus:'parent-confirmed',paymentStatus:'awaiting-payment'},{role:'admin'},en);assert.match(html,/data-action="orders-confirm-payment"/);assert.match(html,/Verify the payment/);});
test('order and person display text is escaped and ordinary teachers get no mutation controls',()=>{const html=enrollmentOrdersMarkup({orders:[order],ready:true},{role:'teacher'},en);assert.match(html,/Chloe &lt;Ho&gt;/);assert.doesNotMatch(html,/orders-create|orders-confirm-payment|orders-send/);});
test('editor exposes actual lesson list, saved draft action and separate amount',()=>{const html=enrollmentOrderEditorMarkup({courseName:'Drawing & <print>',students:[{id:'p',displayName:'Chloe'}],fees:[{id:'f',feeName:'Weekly',price:300}],occurrences:[{scheduleId:'s',sequence:7,sourceVersion:3,date:'2026-10-17',time:'13:00',duration:60}],amountCents:30000},en);assert.match(html,/2026-10-17/);assert.match(html,/value="s:7"/);assert.match(html,/Save draft/);assert.match(html,/name="amount"/);assert.match(html,/Drawing &amp; &lt;print&gt;/);assert.doesNotMatch(html,/<print>|Send to parent/);});
test('account links are explicit choices, never email auto matching',()=>{const html=studentAccountLinksMarkup({students:[{id:'p',displayName:'Child'}],accounts:[{id:'u',displayName:'Parent',email:'parent@example.test'}],links:[]},en);assert.match(html,/name="userId"/);assert.match(html,/Not linked/);assert.match(html,/Link account/);assert.match(html,/data-student-id="p"/);});
test('shared student classes render only supplied confirmed service lessons and stable occurrence identifiers',()=>{const html=sharedStudentClassesMarkup({ready:true,lessons:[{id:'a',studentName:'Child',courseName:'Drawing',scheduleId:'s',sequence:8,date:'2026-10-16',time:'13:00',duration:60,teachers:[{displayName:'Leo'}],rooms:[{displayName:'Studio'}],attendance:'unmarked'}]},en);assert.match(html,/Drawing/);assert.match(html,/Leo/);assert.match(html,/Studio/);assert.match(html,/2026-10-16/);assert.doesNotMatch(html,/Apply|Pay now|Alex/);});
test('remaining all-lessons selection follows actual recurrence including moved and cancelled occurrences',()=>{const schedule={id:'s',course:'c',version:4,startDate:'2026-10-16',time:'13:00',duration:60,weekdays:[5],endMode:'count',count:6,exceptions:[{sequence:3,cancelled:true},{sequence:5,overrides:{date:'2026-11-14',time:'15:00'}}]};const list=enrollmentLessons(schedule,{sequence:2,date:'2026-10-23',scope:'all'});assert.deepEqual(list.map(row=>row.sequence),[2,4,5,6]);assert.equal(list.find(row=>row.sequence===5).date,'2026-11-14');assert.equal(list[0].sourceVersion,4);assert.equal(enrollmentLessons(schedule,{sequence:2,date:'2026-10-23',scope:'single'}).length,1);});
test('fee suggestions distinguish per-lesson, fixed monthly and package pricing',()=>{const lessons=[{date:'2026-10-16'},{date:'2026-10-23'},{date:'2026-11-06'}];assert.equal(suggestedOrderCents({pricingModel:'per-lesson',price:300},lessons),90000);assert.equal(suggestedOrderCents({pricingModel:'fixed-monthly',price:850,months:2},lessons),170000);assert.equal(suggestedOrderCents({pricingModel:'package',price:1200},lessons),120000);});

test('retry draft retains the exact checked lessons and adjusted final amount',()=>{const html=enrollmentOrderEditorMarkup({occurrences:[{scheduleId:'s',sequence:1,date:'2026-10-16',time:'13:00',duration:60},{scheduleId:'s',sequence:2,date:'2026-10-23',time:'13:00',duration:60}],selectedLessonKeys:['s:2'],amountCents:28000},en);assert.match(html,/value="s:1" >/) ;assert.match(html,/value="s:2" checked/);assert.match(html,/value="280.00"/);assert.match(html,/Suggested amount/);});

test('editor shows the current suggestion separately from an explicitly entered final amount including a cleared field',()=>{
 for(const amountInput of ['123.45','']){const html=enrollmentOrderEditorMarkup({amountCents:12345,amountInput,amountEdited:true,suggestedAmountCents:60050},en);assert.match(html,new RegExp('name="amount"[^>]*value="'+amountInput.replace('.','\\.')+'"'));assert.match(html,/id="enrollment-order-amount-note"[^>]*aria-live="polite"/);assert.match(html,/Suggested amount:[\s\S]*data-enrollment-suggested-amount[^>]*>[^<]*600\.50/);assert.doesNotMatch(html,/NaN|Infinity/);}
});

test('fee suggestions remain finite for unavailable or invalid prices and actual dates',()=>{
 for(const price of [undefined,'not a price',Infinity,-1,Number.MAX_VALUE])for(const pricingModel of ['monthly-lessons','fixed-monthly','package'])assert.equal(suggestedOrderCents({price,pricingModel},[{date:'2026-10-31'}]),0);
 for(const date of [undefined,'invalid','2026-02-31'])assert.equal(suggestedOrderCents({price:300,pricingModel:'fixed-monthly'},[{date}]),0);
 assert.equal(suggestedOrderCents({price:300.25,pricingModel:'monthly-lessons'},[{date:'2026-10-31'},{date:'2026-11-01'}]),60050);
});

test('order package summaries show each exact paid snapshot before its selected lessons without using order totals as balances',()=>{
 const first={...order.items[0],courseId:'course-A',feeId:'fee-A',feeName:'Same package',pricing:{pricingModel:'package',packageType:'minutes',packageTotal:720}},second={...order.items[0],courseId:'course-B',feeId:'fee-B',feeName:'Same package',pricing:{pricingModel:'package',packageType:'visits',packageTotal:8}};
 const html=enrollmentOrderDetailsMarkup({...order,paymentStatus:'paid',purchasedLessons:99,items:[first,second]},{role:'student'},en),summaries=[...html.matchAll(/<dl\b[^>]*data-order-package-summary[^>]*>[\s\S]*?<\/dl>/g)].map(match=>match[0]);
 assert.equal(summaries.length,2);assert.match(summaries[0],/data-fee-id="fee-A"/);assert.match(summaries[0],/Original purchased quota[\s\S]*720 minutes/);assert.match(summaries[1],/data-fee-id="fee-B"/);assert.match(summaries[1],/Original purchased quota[\s\S]*8 visits/);
 for(const summary of summaries){assert.match(summary,/Selected lessons on this order[\s\S]*1 lesson/);assert.match(summary,/Remaining balance<\/dt><dd>Not provided/);assert.doesNotMatch(summary,/99|719|719 minutes/);}
 assert.ok(html.indexOf('data-order-package-summary')<html.indexOf('class="enrollment-order-lessons"'));assert.match(html,/order as placed/);assert.doesNotMatch(html,/orders-confirm-payment|orders-send|orders-respond/);
});

test('order package summaries distinguish unpaid quota and known zero selected lessons while keeping existing administrator actions',()=>{
 const item={...order.items[0],lessons:[],pricing:{pricingModel:'package',packageType:'lessons',packageTotal:12}},html=enrollmentOrderDetailsMarkup({...order,orderStatus:'draft',paymentStatus:'draft',purchasedLessons:45,items:[item]},{role:'admin'},en);
 assert.match(html,/Quota on this order<\/dt><dd>12 visits/);assert.match(html,/Selected lessons on this order<\/dt><dd>0 lessons/);assert.doesNotMatch(html,/Original purchased quota|Remaining balance<\/dt><dd>0/);assert.match(html,/data-action="orders-send"/);assert.match(html,/data-action="ui-order-document"/);
});

test('order package summaries do not manufacture quota from monthly prices lesson dates or current fee objects',()=>{
 const item={...order.items[0],pricing:{pricingModel:'fixed-monthly',months:3,price:850},currentFee:{pricingModel:'package',packageType:'visits',packageTotal:88}},html=enrollmentOrderDetailsMarkup({...order,items:[item]},{role:'teacher'},en);
 assert.match(html,/Quota on this order<\/dt><dd>Not applicable/);assert.match(html,/Validity period<\/dt><dd>Not provided/);assert.match(html,/Package contents<\/dt><dd>Not provided/);assert.doesNotMatch(html,/88 visits|orders-send|orders-confirm-payment|orders-respond/);
});

test('order details scrolling summary is keyboard focusable without making each package summary a separate tab stop',()=>{
 const html=enrollmentOrderDetailsMarkup({...order,items:[{...order.items[0],pricing:{pricingModel:'package',packageType:'visits',packageTotal:8}}]},{role:'student'},en);
 assert.match(html,/<div class="enrollment-order-summary"[^>]*tabindex="0"/);assert.doesNotMatch(html,/<dl\b[^>]*tabindex=/);assert.doesNotMatch(html,/<ol\b[^>]*tabindex=/);
});

test('My classes exposes an order button only for each exact authorized, successful lesson source',()=>{
 const first={id:'session-first',studentId:'child-a',orderId:'paid-order',courseId:'course-a',scheduleId:'schedule-a',sequence:1,date:'2026-10-23',time:'13:30',duration:60,teachers:[],rooms:[],studentName:'Same child',courseName:'Same course'},second={...first,id:'session-second',sequence:2,date:'2026-10-30'};
 const cache={ready:true,error:'',students:[{id:'child-a'}],lessons:[first,second]};
 const html=sharedStudentClassesMarkup(cache,en);
 assert.equal((html.match(/data-action="orders-open-student-class"/g)||[]).length,2);
 for(const id of ['session-first','session-second'])assert.match(html,new RegExp(`data-action="orders-open-student-class"[^>]*data-session-id="${id}"[^>]*data-student-id="child-a"[^>]*data-order-id="paid-order"`));
 assert.match(html,/View order/);
 assert.match(sharedStudentClassesMarkup(cache,{t:z=>z}),/查看訂單/);
 for(const source of [{...cache,ready:false},{...cache,error:'Read failed'},{...cache,students:[]},{...cache,lessons:[first,{...first}]}])assert.doesNotMatch(sharedStudentClassesMarkup(source,en),/orders-open-student-class/);
});

test('My classes order button IDs and accessible lesson context are escaped without borrowing a sibling',()=>{
 const row={id:'session"evil',studentId:'child-a',orderId:'order"evil',courseId:'course-a',scheduleId:'schedule-a',sequence:1,date:'2026-10-23',time:'13:30',duration:60,teachers:[],rooms:[],studentName:'A <child>',courseName:'Art & <print>'},html=sharedStudentClassesMarkup({ready:true,students:[{id:'child-a'}],lessons:[row]},en);
 assert.match(html,/data-session-id="session&quot;evil"/);assert.match(html,/data-order-id="order&quot;evil"/);assert.match(html,/aria-label="[^"]*Art &amp; &lt;print&gt;[^"]*2026-10-23[^"]*13:30/);
 assert.doesNotMatch(html,/<child>|<print>|data-session-id="session"evil/);
});

test('My classes read error offers an explicit bilingual retry and no stale order entry',()=>{
 const row={id:'session-a',studentId:'child-a',orderId:'order-a',courseId:'course-a',scheduleId:'schedule-a',sequence:1,date:'2026-10-23',time:'13:30',duration:60,teachers:[],rooms:[],courseName:'Drawing',studentName:'Chloe'},cache={ready:true,error:'Read <failed>',students:[{id:'child-a'}],lessons:[row]};
 for(const [context,label]of[[en,'Retry'],[{t:z=>z},'重試']]){
  const html=sharedStudentClassesMarkup(cache,context);
  assert.match(html,/role="alert"[^>]*>Read &lt;failed&gt;/);
  assert.match(html,new RegExp(`<button type="button"[^>]*data-action="orders-refresh"[^>]*>${label}<\/button>`));
  assert.doesNotMatch(html,/orders-open-student-class/);
 }
 assert.doesNotMatch(sharedStudentClassesMarkup({...cache,error:''},en),/data-action="orders-refresh"/);
});

test('student classes translate all saved attendance states and never show internal remarks or stickers',()=>{
 for(const [attendance,zh,english]of[['present','出席','Present'],['late','遲到','Late'],['absent','缺席','Absent'],['leave','請假','Leave'],['sick','病假','Sick leave'],['other','其他','Other']]){
  const row={id:'session',studentId:'child',courseName:'Drawing',date:'2026-10-16',time:'13:00',attendance,remark:'PRIVATE LESSON NOTE',stickerColor:'blue',showRemark:true};
  for(const [ctx,label]of[[{t:zh=>zh},zh],[en,english]]){const html=sharedStudentClassesMarkup({ready:true,lessons:[row]},ctx);assert.ok(html.includes(label));assert.doesNotMatch(html,/PRIVATE LESSON NOTE|Blue sticker|showRemark/);}
 }
});
