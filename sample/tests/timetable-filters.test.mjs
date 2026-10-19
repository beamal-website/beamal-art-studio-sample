import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTimetableFilterState as normalize,validateTimetableFilterDraft as validate,matchesTimetableFilter as matches,matchesTimetableFilterState as visible,timetableNamedFiltersMarkup as list,timetableFilterEditorMarkup as editor} from '../client/timetable-filters.js';
const record=(extra={})=>({courseId:'course-2',teacherIds:['teacher-2'],roomIds:['room-1'],classTypeId:'type-regular',classTypeKind:'regular',kind:'class',isMine:true,date:'2026-10-31',time:'13:20',category:'Art',level:'Beginner',...extra});
const filter=(extra={})=>({id:'filter-a',name:'My art class',match:'all',visible:true,conditions:[{field:'course',value:'course-2'}],...extra});
const state=(extra={})=>({version:1,hiddenResources:{teachers:[],rooms:[]},hiddenPresets:[],filters:[],only:null,...extra});

test('normalization keeps bounded white-listed filter definitions and explicit hidden IDs without mutating input',()=>{
 const raw={...state(),hiddenResources:{teachers:['teacher-2','teacher-2','',null],rooms:['room-1'],privateName:'private'},hiddenPresets:['trial','unknown','trial'],filters:[{...filter(),privateStudent:{name:'private'},conditions:[{field:'course',value:'course-2',privateData:'private'}]}],only:'filter-a',privatePeople:['private']},before=structuredClone(raw),n=normalize(raw);
 assert.deepEqual(n,{...state(),hiddenResources:{teachers:['teacher-2'],rooms:['room-1']},hiddenPresets:['trial'],filters:[filter()],only:'filter-a'});assert.deepEqual(raw,before);assert.doesNotMatch(JSON.stringify(n),/private/);n.filters[0].conditions[0].value='changed';assert.equal(raw.filters[0].conditions[0].value,'course-2');
});
test('invalid duplicate over-limit filters do not become weaker positive matches',()=>{
 const invalid=filter({id:'invalid',conditions:[{field:'course',value:'course-2'},{field:'unsupported',value:'child'}]});const n=normalize(state({filters:[invalid,filter(),filter({name:'Conflicting duplicate'})],only:'invalid'}));assert.deepEqual(n.filters,[]);assert.equal(n.only,'invalid');assert.equal(visible(record(),n),false);assert.equal(visible(record(),state({filters:[invalid],only:'invalid'})),false);
 const many=Array.from({length:25},(_,i)=>filter({id:'filter-'+i}));assert.equal(normalize(state({filters:many})).filters.length,20);assert.equal(visible(record(),normalize(state({filters:many,only:'filter-24'}))),false);
});
test('draft validation rejects empty names unsupported conditions invalid values and reversed date or time ranges',()=>{
 for(const name of ['', ' ', 'n'.repeat(81)])assert.equal(validate(filter({name})),'name');for(const conditions of [[],Array(7).fill({field:'course',value:'course-2'}),[{field:'unsupported',value:'child'}],[{field:'guardian',value:'female'}],[{field:'payment',value:'100'}]])assert.equal(validate(filter({conditions})),'conditions');
 for(const condition of [{field:'course',value:''},{field:'teacher',value:'v'.repeat(161)},{field:'kind',value:'unknown'},{field:'date',value:'2026-02-30'},{field:'time',value:'24:00'}])assert.equal(validate(filter({conditions:[condition]})),'value');
 for(const condition of [{field:'date',value:'2026-11-01',end:'2026-10-31'},{field:'time',value:'23:00',end:'01:00'}])assert.equal(validate(filter({conditions:[condition]})),'range');assert.equal(validate(filter({match:'anything'})),'conditions');assert.equal(validate(filter()),'');
});
test('IDs and text match exactly and missing data never borrows a display name or another teacher',()=>{
 for(const [field,value]of [['course','course-2'],['teacher','teacher-2'],['room','room-1'],['type','type-regular'],['category','Art'],['level','Beginner']]){assert.equal(matches(record(),filter({conditions:[{field,value}]})),true,field);assert.equal(matches(record(),filter({conditions:[{field,value:value+'-different'}]})),false,field);}
 assert.equal(matches(record({teacherIds:[],teacher:'teacher-2'}),filter({conditions:[{field:'teacher',value:'teacher-2'}]})),false);assert.equal(matches(record({classTypeId:null}),filter({conditions:[{field:'type',value:'__none'}]})),false);assert.equal(matches(record({category:'art'}),filter({conditions:[{field:'category',value:'Art'}]})),false);
});
test('all and any refer only to conditions within one filter and invalid conditions never silently disappear',()=>{
 const conditions=[{field:'teacher',value:'teacher-2'},{field:'room',value:'other-room'}];assert.equal(matches(record(),filter({conditions,match:'all'})),false);assert.equal(matches(record(),filter({conditions,match:'any'})),true);assert.equal(matches(record(),filter({conditions:[...conditions,{field:'unsupported',value:'anything'}],match:'any'})),false);assert.equal(matches(record(),filter({conditions:[]})),false);
});
test('date and time ranges include both endpoints allow exact single points and reject invalid source values',()=>{
 for(const [field,value,end,inside]of [['date','2026-10-30','2026-11-01','2026-10-31'],['time','13:00','13:40','13:20']]){const f=filter({conditions:[{field,value,end}]});for(const point of [value,inside,end])assert.equal(matches(record({[field]:point}),f),true);assert.equal(matches(record({[field]:field==='date'?'2026-02-30':'24:00'}),f),false);assert.equal(matches(record({[field]:undefined}),f),false);assert.equal(matches(record({[field]:value}),filter({conditions:[{field,value,end:''}]})),true);}
 assert.equal(matches(record(),filter({conditions:[{field:'date',value:'2026-11-01'}]})),false);assert.equal(matches(record(),filter({conditions:[{field:'time',value:'13:21'}]})),false);
});
test('kind presets distinguish classes availability flags saved type and explicit own assignment',()=>{
 const cases=[['class',record(),true],['available',record(),false],['trial',record({kind:'available',trialEnabled:true}),true],['trial',record({kind:'available',trialEnabled:'true'}),false],['rescheduling',record({kind:'available',reschedulingEnabled:true}),true],['regular',record(),true],['special',record(),false],['mine',record({isMine:true}),true],['mine',record({isMine:undefined,teacherIds:['viewer-id']}),false]];for(const [kind,r,result]of cases)assert.equal(matches(r,filter({conditions:[{field:'kind',value:kind}]})),result,kind);
 assert.equal(matches(record({kind:'available',classTypeKind:undefined}),filter({conditions:[{field:'kind',value:'regular'}]})),false);
});
test('hidden resources presets and custom filters form one exclusion union without changing business records',()=>{
 const r=record(),before=structuredClone(r);for(const extra of [{hiddenResources:{teachers:['teacher-2'],rooms:[]}},{hiddenResources:{teachers:[],rooms:['room-1']}},{hiddenPresets:['regular']},{filters:[filter({visible:false})]}])assert.equal(visible(r,state(extra)),false);assert.equal(visible(r,state({hiddenPresets:['trial'],hiddenResources:{teachers:['other'],rooms:[]},filters:[filter({visible:false,conditions:[{field:'course',value:'other'}]})]})),true);assert.deepEqual(r,before);
});
test('only selects one existing positive filter and never overrides Eye-off exclusions or falls back to all',()=>{
 const a=filter(),b=filter({id:'filter-b',conditions:[{field:'room',value:'other-room'}]});assert.equal(visible(record(),state({filters:[a,b],only:a.id})),true);assert.equal(visible(record(),state({filters:[a,b],only:b.id})),false);assert.equal(visible(record(),state({filters:[a],only:'missing'})),false);assert.equal(visible(record(),state({filters:[{...a,visible:false}],only:a.id})),false);assert.equal(visible(record(),state({filters:[a],only:a.id,hiddenPresets:['mine']})),false);assert.equal(visible(record(),state({filters:[a,b]})),true);
});
test('malformed persisted only references stay closed instead of widening a view',()=>{
 for(const only of ['unknown','',' '.repeat(2),'x'.repeat(101),42,true,{}])assert.equal(visible(record(),normalize({...state(),only})),false);for(const raw of [null,undefined,[],42])assert.deepEqual(normalize(raw),state());
});
test('advanced filters are saved name and eye rows with one trailing create button',()=>{
 const empty=list(state());assert.equal((empty.match(/<button/g)||[]).length,1);assert.match(empty,/data-action="tt-named-add"/);assert.doesNotMatch(empty,/tnf-empty|tnf-list-heading|tt-named-toggle/);
 const html=list(state({filters:[filter(),filter({id:'filter-hidden',name:'Hidden class',visible:false})]}));assert.equal((html.match(/data-action="tt-named-add"/g)||[]).length,1);assert.equal((html.match(/data-action="tt-named-toggle"/g)||[]).length,2);assert.match(html,/data-action="tt-named-edit"[^>]*data-filter-id="filter-a"/);assert.match(html,/aria-pressed="false"/);assert.ok(html.lastIndexOf('tt-named-add')>html.lastIndexOf('</article>'));assert.doesNotMatch(html,/tt-named-remove|tt-named-only|tnf-row-actions|Teacher 1/);
 assert.match(editor(filter(),{creating:false}),/data-action="tt-named-remove"/);assert.doesNotMatch(editor(filter(),{creating:true}),/data-action="tt-named-remove"/);
});
test('editor uses native named controls preserves unavailable selected IDs and exposes all required fields',()=>{
 const draft=filter({conditions:[{field:'teacher',value:'unavailable-teacher'},{field:'date',value:'2026-10-30',end:'2026-11-02'},{field:'time',value:'13:20',end:'14:00'}]}),html=editor(draft,{options:{teacher:[{id:'teacher-2',label:'Canonical teacher'}]},error:'range'});assert.match(html,/id="tt-named-filter-editor"/);assert.doesNotMatch(html,/<form[^>]*data-action=/);for(const name of ['filterName','filterMatch','conditionField-0','conditionValue-0','conditionEnd-1'])assert.match(html,new RegExp('name="'+name+'"'));assert.match(html,/<option[^>]*value="unavailable-teacher"[^>]*selected/);for(const field of ['student','gender','age','price']){const tag=html.match(new RegExp('<option[^>]*value="'+field+'"[^>]*>'))?.[0];assert.ok(tag);assert.doesNotMatch(tag,/disabled/);}assert.match(html,/role="alert"/);assert.match(html,/name="filterIntent" value="save"/);assert.match(html,/name="filterIntent" value="only"/);assert.match(html,/data-action="tt-named-add-condition"/);assert.match(html,/data-action="tt-named-remove-condition"[^>]*data-index="1"/);
});
test('six-condition cap and unknown fields remain visible for repair without fabricating a valid choice',()=>{
 const html=editor(filter({conditions:Array.from({length:6},(_,i)=>({field:i?'course':'guardian',value:i?'course-2':'private-child'}))}));assert.match(html,/<option[^>]*value="guardian"[^>]*selected[^>]*disabled/);assert.match(html,/<button[^>]*data-action="tt-named-add-condition"[^>]*disabled/);assert.doesNotMatch(html,/Private child|Chloe/);
});
test('names source labels and option values are escaped and localization does not change canonical IDs',()=>{
 const f=filter({id:'filter-<second>',name:'<img src=x onerror=alert(1)>'}),n=normalize(state({filters:[f]})),zh={t:(z,_e)=>z,options:{course:[{id:'course-2',label:'<script>private</script>'}]}};assert.equal(n.filters[0].id,f.id);for(const html of [list(n),editor(f,zh)]){assert.doesNotMatch(html,/<img|<script>/);assert.match(html,/&lt;/);}assert.match(editor(f,zh),/儲存並只看/);
});

test('student gender and age ALL conditions must match the same authorized member of this class',()=>{
 const r=record({students:[{id:'child-alice',displayName:'Alice',gender:'Female',age:{years:5,months:3,asOf:'2026-10-31'}},{id:'child-bob',displayName:'Bob',gender:'Male',age:{years:10,months:0,asOf:'2026-10-31'}}]});
 const clauses=[{field:'gender',value:'Female'},{field:'age',value:'10'}];assert.equal(validate(filter({conditions:clauses})),'');assert.equal(matches(r,filter({conditions:clauses})),false,'Alice gender and Bob age must not combine');assert.equal(matches(r,filter({conditions:clauses,match:'any'})),true);assert.equal(matches(r,filter({conditions:[{field:'student',value:'child-alice'},{field:'age',value:'10'}]})),false);assert.equal(matches(r,filter({conditions:[{field:'student',value:'child-bob'},{field:'gender',value:'Male'},{field:'age',value:'9',end:'10'}]})),true);assert.equal(matches(r,filter({conditions:[{field:'student',value:'Bob'}]})),false);assert.equal(matches(r,filter({conditions:[{field:'gender',value:'male'}]})),false);
});

test('unknown student facts do not become zero age and valid zero-year age is measured on the actual lesson date',()=>{
 const f=filter({conditions:[{field:'age',value:'0'}]});for(const students of [undefined,[],[{id:'child',age:null}],[{id:'child',age:{years:0,months:8,asOf:'2026-10-30'}}],[{id:'child',age:{years:0,months:12,asOf:'2026-10-31'}}]])assert.equal(matches(record({students}),f),false);assert.equal(matches(record({students:[{id:'child',age:{years:0,months:8,asOf:'2026-10-31'}}]}),f),true);
 for(const value of ['-1','121','1.5','unknown'])assert.equal(validate(filter({conditions:[{field:'age',value}]})),'value');assert.equal(validate(filter({conditions:[{field:'age',value:'10',end:'9'}]})),'range');for(const field of ['student','gender'])assert.equal(matches(record({students:undefined}),filter({conditions:[{field,value:'child'}]})),false);
});

test('price conditions use the exact current fee basis and one offer for all price conditions',()=>{
 const r=record({feePrices:[{amount:100,basis:'monthly-lessons'},{amount:200,basis:'package'}]});assert.equal(matches(r,filter({conditions:[{field:'price',value:'100',basis:'monthly-lessons'}]})),true);assert.equal(matches(r,filter({conditions:[{field:'price',value:'100',basis:'fixed-monthly'}]})),false);assert.equal(matches(r,filter({conditions:[{field:'price',value:'100',basis:'monthly-lessons'},{field:'price',value:'200',basis:'package'}]})),false);assert.equal(matches(r,filter({conditions:[{field:'price',value:'80',end:'120',basis:'monthly-lessons'},{field:'price',value:'100',end:'150',basis:'monthly-lessons'}]})),true);assert.equal(matches(r,filter({match:'any',conditions:[{field:'price',value:'100',basis:'monthly-lessons'},{field:'price',value:'200',basis:'package'}]})),true);
});

test('zero fee price remains distinct from unknown and invalid or excessive decimal money is rejected',()=>{
 const f=filter({conditions:[{field:'price',value:'0',basis:'package'}]});assert.equal(matches(record({feePrices:[{amount:0,basis:'package'}]}),f),true);for(const feePrices of [undefined,[],[{amount:null,basis:'package'}],[{amount:'0',basis:'package'}],[{amount:0.001,basis:'package'}],[{amount:0,basis:'other'}]])assert.equal(matches(record({feePrices}),f),false);
 for(const change of [{value:'1.001'},{value:'1e2'},{value:'-0.01'},{value:'10000000000'},{basis:''},{basis:'other'}])assert.equal(validate(filter({conditions:[{field:'price',value:'10',basis:'package',...change}]})),'value');assert.equal(validate(filter({conditions:[{field:'price',value:'10.01',end:'10',basis:'package'}]})),'range');assert.equal(validate(filter({conditions:[{field:'price',value:'9999999999.99',basis:'package'}]})),'');
});

test('extended conditions serialize only safe student IDs range values and explicit fee basis',()=>{
 const f=filter({conditions:[{field:'student',value:'child-second',privateName:'Other private person'},{field:'gender',value:'Female'},{field:'age',value:'0',end:'18'},{field:'price',value:'0',end:'2400.50',basis:'package',orderPayment:'private'}]}),n=normalize(state({filters:[f]}));assert.equal(n.filters.length,1);assert.deepEqual(n.filters[0].conditions,[{field:'student',value:'child-second'},{field:'gender',value:'Female'},{field:'age',value:'0',end:'18'},{field:'price',value:'0',end:'2400.50',basis:'package'}]);assert.doesNotMatch(JSON.stringify(n),/private|orderPayment|privateName/);assert.equal(visible(record(),state({filters:[filter({conditions:[{field:'price',value:'0',basis:'unknown'}]})],only:'filter-a'})),false);
});

test('enabled student gender age and current fee inputs show canonical options and explicit fee-basis choices',()=>{
 const html=editor(filter({conditions:[{field:'student',value:'child-second'},{field:'gender',value:'Female'},{field:'age',value:'0',end:'18'},{field:'price',value:'0',end:'2000.50',basis:'package'}]}),{options:{student:[{id:'child-second',label:'Canonical second student'}],gender:[{id:'Female',label:'Female'}]}});assert.match(html,/<option[^>]*value="child-second"[^>]*selected>Canonical second student/);assert.match(html,/<option[^>]*value="Female"[^>]*selected>Female/);assert.match(html,/Age at lesson \(years\)/);assert.match(html,/Current course fee \(HKD\)/);assert.match(html,/name="conditionBasis-3"/);assert.match(html,/<option[^>]*value="package"[^>]*selected/);assert.match(html,/name="conditionValue-2"[^>]*value="0"/);assert.doesNotMatch(html,/Student, gender and price conditions are not available yet/);
});

test('canonical two-decimal fee amounts retain cent accuracy at ordinary fractions and the supported maximum',()=>{
 for(const amount of [0.29,10.01,9999999999.97,9999999999.99])assert.equal(matches(record({feePrices:[{amount,basis:'package'}]}),filter({conditions:[{field:'price',value:String(amount),basis:'package'}]})),true,String(amount));
});

test('course visibility normalizes stable IDs and filters only the selected course',()=>{
 const n=normalize(state({hiddenCourses:['course-2','course-2','',null]}));assert.deepEqual(n.hiddenCourses,['course-2']);assert.equal(visible(record(),n),false);assert.equal(visible(record({courseId:'course-3'}),n),true);assert.deepEqual(normalize(state({hiddenCourses:[]})),state());assert.deepEqual(normalize(state()),state());
});
