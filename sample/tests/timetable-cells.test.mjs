import test from 'node:test';
import assert from 'node:assert/strict';
import {timetableGridMinimum,timetableCreateCells,timetableCreateCellMarkup} from '../client/timetable-cells.js';
const en={t:(_zh,en)=>en},zh={t:zh=>zh};

test('fixed grid width depends on day count only, including an empty view, without growing for overlapping lanes',()=>{
 assert.equal(timetableGridMinimum(7),1456);assert.equal(timetableGridMinimum(1),256);assert.equal(timetableGridMinimum(0),256);assert.equal(timetableGridMinimum(14),2856);
 for(const invalid of [-1,1.5,'7',NaN,Infinity,Number.MAX_SAFE_INTEGER])assert.throws(()=>timetableGridMinimum(invalid),RangeError);
});

test('fixed cells start on actual quarter hours and keep exact fractional geometry for an unaligned visible start',()=>{
 const cells=timetableCreateCells({start:560,lastTime:600,interval:30});
 assert.deepEqual(cells,[{time:'09:30',top:10/30,height:15/30},{time:'09:45',top:25/30,height:15/30},{time:'10:00',top:40/30,height:15/30}]);
 assert.doesNotMatch(JSON.stringify(cells),/09:15|09:20/);
});

test('fixed cells preserve midnight and stop at 23:45 even when the source tail extends beyond this day',()=>{
 const cells=timetableCreateCells({start:0,lastTime:1500,interval:15});assert.equal(cells.length,96);assert.deepEqual(cells[0],{time:'00:00',top:0,height:1});assert.deepEqual(cells.at(-1),{time:'23:45',top:95,height:1});
 assert.deepEqual(timetableCreateCells({start:1430,lastTime:1439,interval:15}),[]);
});

test('invalid fixed geometry cannot create NaN, infinite, negative or out-of-day controls',()=>{
 for(const fields of [{start:0,lastTime:60,interval:0},{start:0,lastTime:60,interval:-1},{start:NaN,lastTime:60,interval:15},{start:0,lastTime:Infinity,interval:15},{start:-1,lastTime:60,interval:15},{start:1440,lastTime:1500,interval:15},{start:60,lastTime:30,interval:15},{start:0.5,lastTime:60,interval:15},{start:'0',lastTime:60,interval:15},{start:0,lastTime:60,interval:Number.MIN_VALUE}])assert.deepEqual(timetableCreateCells(fields),[]);
});

test('compact cells use explicit valid quarter-hour times at their original nonlinear row indices',()=>{
 const cells=timetableCreateCells({start:560,lastTime:600,interval:30,compactTimes:[540,555,560,NaN,'10:00',0,1425,1440]});
 assert.deepEqual(cells,[{time:'09:00',top:0,height:1},{time:'09:15',top:1,height:1},{time:'00:00',top:5,height:1},{time:'23:45',top:6,height:1}]);
 assert.deepEqual(timetableCreateCells({compactTimes:[]}),[]);assert.deepEqual(timetableCreateCells({compactTimes:'09:15'}),[]);
});

test('create controls are native buttons with explicit date and time and one roving tab stop per day',()=>{
 const cells=timetableCreateCells({start:540,lastTime:570,interval:15}),html=timetableCreateCellMarkup(cells,'2026-10-16',en);
 assert.equal((html.match(/<button\b/g)||[]).length,3);assert.equal((html.match(/tabindex="0"/g)||[]).length,1);assert.equal((html.match(/tabindex="-1"/g)||[]).length,2);
 assert.match(html,/class="tt-cell-add"/);assert.match(html,/type="button"/);assert.match(html,/data-action="tt-add-cell"/);assert.match(html,/data-date="2026-10-16"/);assert.match(html,/data-time="09:15"/);assert.match(html,/--tt-cell-top:1;--tt-cell-height:1/);assert.match(html,/aria-label="Add schedule[^\"]*2026-10-16[^\"]*09:15/);assert.match(html,/aria-hidden="true"[^>]*>\+ 09:15/);
 assert.match(timetableCreateCellMarkup(cells,'2026-10-16',zh),/新增排課/);assert.doesNotMatch(html,/data-open-lesson|tt-lesson|<div[^>]*role="button"/);
});

test('markup rejects invalid dates, invalid time steps and unsafe geometry before rendering a focus target',()=>{
 for(const invalidDate of ['2026-02-30','2026-10-16" onclick="bad','0000-01-01',''])assert.equal(timetableCreateCellMarkup([{time:'09:15',top:0,height:1}],invalidDate,en),'');
 const cells=[{time:'09:15',top:'0; color:red',height:1},{time:'09:20',top:1,height:1},{time:'09:30',top:2,height:NaN},{time:'24:00',top:0,height:1},{time:'09:45',top:-1,height:1},{time:'10:00',top:1,height:0},{time:'10:15',top:2.5,height:.5}];
 const html=timetableCreateCellMarkup(cells,'2026-10-16',en);assert.equal((html.match(/<button\b/g)||[]).length,1);assert.match(html,/data-time="10:15"/);assert.match(html,/tabindex="0"/);assert.doesNotMatch(html,/color:red|NaN|Infinity/);
});

test('day count validation rejects unsupported primitive types before doing arithmetic',()=>{
 for(const invalid of [Symbol('days'),7n,{},null,undefined])assert.throws(()=>timetableGridMinimum(invalid),RangeError);
});
