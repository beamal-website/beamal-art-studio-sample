import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validatePackageContentDraft} from '../client/package-content-ui.js';

const source=readFileSync(new URL('../src.js',import.meta.url),'utf8');
const start=source.indexOf('function packageContentContextCurrent('),end=source.indexOf('function portalFees(',start);
const production=source.slice(start,end);
const dto=(version=0,components=[])=>({feeId:'fee-b',feeVersion:3,version,components,updatedAt:version?'2026-10-16T00:00:00Z':null});
const draft=[{id:'seg-a',name:' 繪畫 & Art ',minutes:'60'},{id:'seg-b',name:'Interview',minutes:'30'}];
const deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return {promise,resolve};};
function host({read=async()=>({contents:dto()}),write=async()=>({contents:dto(1,draft.map(row=>({...row,minutes:Number(row.minutes)})))})}={}){
 let c;const writes=[],parent={isConnected:true,inert:false,setAttribute(){},removeAttribute(){}};
 const child={outerHTML:'',remove(){}},body={scrollTop:0},focusNode={focus(){c.focused=true;}};
 const fee={id:'fee-b',version:3,pricingModel:'package',courseIds:['course-b']};
 const owner={feeId:'fee-b',sourceCourseId:'course-b',identity:'admin',location:'here',editor:false};
 c=vm.createContext({feeOverview:owner,packageContentReturn:null,sharedMode:true,authUser:{role:'admin'},courseSaving:false,feePricingReturn:null,sharedFees:[fee],feeReadContextCurrent:s=>!!s&&s.identity===c.identity&&s.location===c.location,identity:'admin',location:'here',
  courseSettingsFor:()=>({id:'course-b'}),feeReadSourceError:()=>'',feePricingSnapshotKey:f=>JSON.stringify(f),feeLinkedCourseNames:()=>['Course B'],courseUiIdentity:()=>c.identity,scheduleEditorViewContext:()=>c.location,
  sharedClient:{packageContents:read,savePackageContents:async(...args)=>{writes.push(structuredClone(args));return write(...args);}},
  refreshSharedCourses:async()=>{},refreshSharedSession:async()=>{},applySharedUser:()=>{},go:()=>{},
  validatePackageContentDraft,packageContentMarkup:state=>JSON.stringify(state),t:(_zh,en)=>en,esc:String,newOperationKey:()=> 'package-key',
  discardFeeEditorNavigation(){c.packageContentReturn=null;},renderModal(){},renderFeeOverview(){},showCatalogueEditorError(){},
  document:{activeElement:null,querySelector(selector){if(selector==='.fee-overview-dialog')return {closest:()=>parent};if(selector==='#modal-root')return {insertAdjacentHTML(){}};if(selector==='.package-content-modal')return child;if(selector==='#package-content-body'||selector==='.fee-overview-body')return body;if(selector==='#package-content-editor')return {querySelectorAll:()=>[]};return focusNode;},querySelectorAll:()=>[]},
 });vm.runInContext(production,c);return {c,writes,fee,owner,parent,state:()=>c.packageContentReturn,async open(){c.openPackageContent();await new Promise(resolve=>setImmediate(resolve));},edit(){c.editPackageContent();},review(){c.packageContentReturn.components=structuredClone(draft);c.reviewPackageContent();}};
}
test('opening loads exact saved contents, editing prefills stable segments, cancel writes nothing',async()=>{
 const e=host({read:async()=>({contents:dto(4,draft.map(row=>({...row,minutes:Number(row.minutes)})))})});await e.open();assert.equal(e.state().contentStatus,'ready');e.edit();assert.equal(e.state().components[0].id,'seg-a');assert.equal(e.state().components[0].minutes,'60');e.c.closePackageContent();assert.equal(e.state(),null);assert.deepEqual(e.writes,[]);assert.equal(e.parent.inert,false);
});
test('review saves only composition and exact two versions, then shows actual acknowledged contents',async()=>{
 const e=host();await e.open();e.edit();e.review();assert.equal(e.state().step,'review');await e.c.savePackageContent();assert.equal(e.writes.length,1);assert.equal(e.writes[0][0],'fee-b');assert.deepEqual(e.writes[0][1],{version:0,feeVersion:3,components:draft.map(row=>({...row,minutes:Number(row.minutes)}))});assert.equal(e.state().step,'saved');assert.equal(e.state().savedContents.version,1);assert.equal(e.fee.version,3);assert.equal(e.fee.packageTotal,undefined);
});
test('failed or malformed acknowledgement locks draft and retries identical operation without duplicate-key drift',async()=>{
 let calls=0;const e=host({write:async()=>{if(++calls===1)throw new Error('lost reply');return {contents:dto(1,draft.map(row=>({...row,minutes:Number(row.minutes)})))};}});await e.open();e.edit();e.review();await e.c.savePackageContent();assert.equal(e.state().unconfirmed,true);e.c.backPackageContent();assert.equal(e.state().step,'review');await e.c.savePackageContent();assert.deepEqual(e.writes[0],e.writes[1]);assert.equal(e.state().step,'saved');
 const bad=host({write:async()=>({contents:{...dto(1,draft),feeId:'fee-a'}})});await bad.open();bad.edit();bad.review();await bad.c.savePackageContent();assert.equal(bad.state().step,'review');assert.equal(bad.state().unconfirmed,true);
});
test('pending write blocks duplicate save, cancel and Escape; late route result cannot repaint another screen',async()=>{
 const gate=deferred(),e=host({write:()=>gate.promise});await e.open();e.edit();e.review();const save=e.c.savePackageContent();await e.c.savePackageContent();e.c.closePackageContent();e.c.packageContentKeyboard({key:'Escape',preventDefault(){}});assert.equal(e.writes.length,1);assert.ok(e.state());assert.equal(e.state().saving,true);e.c.location='another';gate.resolve({contents:dto(1,draft)});await save;assert.notEqual(e.state().step,'saved');
});
test('failed initial read is unknown rather than empty and a late read cannot resurrect closed modal',async()=>{
 const e=host({read:async()=>{throw new Error('offline');}});await e.open();assert.equal(e.state().contentStatus,'error');assert.equal(e.state().savedContents,null);e.edit();assert.equal(e.state().step,'details');
 const gate=deferred(),late=host({read:()=>gate.promise});late.c.openPackageContent();late.c.closePackageContent();gate.resolve({contents:dto(1,draft)});await new Promise(resolve=>setImmediate(resolve));assert.equal(late.state(),null);
});
test('version conflict keeps entries and explicit reload rebases them for a fresh review',async()=>{
 let saved=dto();const e=host({read:async()=>({contents:saved}),write:async()=>{throw Object.assign(new Error('conflict'),{status:409});}});await e.open();e.edit();e.review();await e.c.savePackageContent();assert.equal(e.state().stale,true);await e.c.savePackageContent();assert.equal(e.writes.length,1);saved=dto(2,[{id:'other',name:'Other',minutes:20}]);await e.c.reloadPackageContent();assert.equal(e.state().savedContents.version,2);assert.equal(e.state().components[0].name,draft[0].name);assert.equal(e.state().step,'edit');assert.equal(e.state().stale,false);
});
test('truncated HTTP success can recover the same payload and a reordered response object is a valid acknowledgement',async()=>{
 let calls=0;const e=host({write:async()=>{if(++calls===1)throw Object.assign(new Error('truncated'),{status:201,code:'service_unavailable'});return {contents:dto(1,draft.map(row=>({minutes:Number(row.minutes),name:row.name,id:row.id})))};}});await e.open();e.edit();e.review();await e.c.savePackageContent();assert.equal(e.state().unconfirmed,true);await e.c.reloadPackageContent();assert.equal(e.state().step,'review');await e.c.savePackageContent();assert.deepEqual(e.writes[0],e.writes[1]);assert.equal(e.state().step,'saved');
});
test('identity changes reject late reads and teachers cannot create editing or forged save state',async()=>{
 const gate=deferred(),e=host({read:()=>gate.promise});e.c.openPackageContent();e.c.identity='another';gate.resolve({contents:dto(1,draft)});await new Promise(resolve=>setImmediate(resolve));assert.notEqual(e.state().contentStatus,'ready');
 const teacher=host();await teacher.open();teacher.c.authUser.role='teacher';teacher.edit();assert.equal(teacher.state().step,'details');teacher.state().step='review';teacher.state().components=structuredClone(draft);await teacher.c.savePackageContent();assert.deepEqual(teacher.writes,[]);
});
test('clearing existing composition reviews and saves an explicit empty list without touching the fee',async()=>{
 const e=host({read:async()=>({contents:dto(1,draft.map(row=>({...row,minutes:Number(row.minutes)})))}),write:async()=>({contents:dto(2,[])})});await e.open();e.edit();e.state().components=[];e.c.reviewPackageContent();assert.equal(e.state().step,'review');await e.c.savePackageContent();assert.deepEqual(e.writes[0][1],{version:1,feeVersion:3,components:[]});assert.equal(e.state().step,'saved');assert.equal(e.state().savedContents.version,2);assert.equal(e.fee.version,3);
});
