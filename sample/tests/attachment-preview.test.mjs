import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parsePreviewIds,attachmentApiPath,previewKind,canDownloadAttachment,createAttachmentPreview,previewText} from '../client/attachment-preview.js';
import {createPdfPreview,pdfCanvasLayout,PDF_MAX_PIXELS,PDF_MAX_DIMENSION} from '../client/pdf-preview.js';

const ids={materialId:'material-qa',attachmentId:'attachment-qa'};
const manager={id:'admin-qa',displayName:'QA manager',role:'admin'};
const attachment={id:ids.attachmentId,name:'顏色練習.pdf',mimeType:'application/pdf',size:420,createdAt:'2026-10-14T00:00:00Z'};
const material={id:ids.materialId,courseId:'course-qa',name:'Preparation material',visibleToStudents:true,studentDownload:false,attachments:[attachment],version:1};
const copy=value=>JSON.parse(JSON.stringify(value));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}};
const failure=status=>Object.assign(new Error('QA preview request failed'),{status});
async function until(predicate,message){for(let turn=0;turn<50&&!predicate();turn++)await Promise.resolve();assert.ok(predicate(),message);}

function preview(t,options={}){
 const current={user:copy(manager),material:copy(material)},calls=[],jobs=[],intervals=[],cancelled=[],events=[];
 const state={metadata:null,media:null,controls:null,text:'',status:'',clears:0,mediaCleanups:0};
 const sources={session:async()=>({user:copy(current.user)}),material:async()=>({material:copy(current.material)})};
 const api={session(settings){calls.push({kind:'session',settings});return sources.session(settings)},material(id,settings){calls.push({kind:'material',id,settings});return sources.material(id,settings)}};
 const view={canvas:{},width:()=>960,pixelRatio:()=>2,
  clearPrivate(){state.clears++;state.metadata=null;state.media=null;state.controls=null;state.text='';events.push({kind:'clear'})},
  showStatus(code){state.status=code;events.push({kind:'status',code})},
  showMetadata(value){state.metadata=value;events.push({kind:'metadata',value})},
  showMedia(value){state.media=value;events.push({kind:'media',value});return()=>{state.mediaCleanups++;state.media=null}},
  showPdfControls(value){state.controls={...value};events.push({kind:'controls',value:{...value}})},
  showPdfText(text){state.text=text;events.push({kind:'text',text})},
 };
 const pdfFactory=settings=>{
  const job={settings,destroyed:0,pages:[],ready:Promise.resolve(3),render:async number=>settings.onText?.(`Page ${number}`),destroy(){job.destroyed++}};
  job.renderPage=number=>{job.pages.push(number);return job.render(number)};
  jobs.push(job);return options.makePdf?options.makePdf(job):job;
 };
 const controller=createAttachmentPreview({...ids,api,view,pdfFactory,
  scheduleInterval(callback,delay){const id={index:intervals.length};intervals.push({callback,delay,id});return id},
  cancelInterval:id=>cancelled.push(id),
 });
 t.after(()=>controller.destroy());
 return {controller,current,calls,sources,view,state,jobs,intervals,cancelled,events};
}

test('preview links require unique material and attachment IDs and never adopt an arbitrary file URL',()=>{
 const query='?materialId=material-qa&attachmentId=attachment-qa';assert.deepEqual(parsePreviewIds(query),ids);
 assert.deepEqual(parsePreviewIds(query+'&url=https%3A%2F%2Funtrusted.example%2Fprivate.pdf'),ids);
 for(const search of ['', '?url=https://untrusted.example/private.pdf', '?materialId=x', '?attachmentId=x', '?materialId=&attachmentId=x', query+'&materialId=other', query+'&attachmentId=other', '?materialId=..&attachmentId=x', '?materialId=%00&attachmentId=x', '?materialId='+('x'.repeat(201))+'&attachmentId=x'])assert.equal(parsePreviewIds(search),null,search);
 assert.equal(attachmentApiPath('material / 一','file / 一'),'/api/materials/material%20%2F%20%E4%B8%80/attachments/file%20%2F%20%E4%B8%80');
 assert.equal(previewKind('application/pdf'),'pdf');assert.equal(previewKind('image/png'),'image');assert.equal(previewKind('audio/x-m4a'),'audio');assert.equal(previewKind('video/mp4'),'video');assert.equal(previewKind('text/html'),'unsupported');
});

test('a PDF file and its renderer start only after both session and authorised attachment metadata are confirmed',async t=>{
 const fx=preview(t),session=deferred(),metadata=deferred();fx.sources.session=()=>session.promise;fx.sources.material=()=>metadata.promise;
 const pending=fx.controller.start();await until(()=>fx.calls.some(call=>call.kind==='session'),'Session lookup must start');
 assert.equal(fx.calls.filter(call=>call.kind==='material').length,0);assert.equal(fx.jobs.length,0);assert.equal(fx.state.media,null);
 session.resolve({user:copy(manager),csrfToken:'do-not-publish-this-fixture-token'});await until(()=>fx.calls.some(call=>call.kind==='material'),'Metadata must follow the confirmed session');
 assert.equal(fx.jobs.length,0);assert.equal(fx.state.media,null);
 metadata.resolve({material:{...copy(material),attachments:[{...copy(attachment),url:'https://untrusted.example/private.pdf'}]}});await pending;
 assert.equal(fx.jobs.length,1);assert.equal(fx.jobs[0].settings.url,attachmentApiPath(ids.materialId,ids.attachmentId));
 assert.equal(fx.state.metadata.fileUrl,attachmentApiPath(ids.materialId,ids.attachmentId));assert.equal(fx.state.metadata.attachment.name,attachment.name);
 assert.equal(fx.state.controls.pageNumber,1);assert.equal(fx.state.controls.pageCount,3);
 assert.doesNotMatch(JSON.stringify(fx.events),/do-not-publish-this-fixture-token/,'Private session tokens must not enter the viewer presentation state');
});

test('signed out, unauthorised, missing attachment and unsupported types never start a private file or PDF renderer',async t=>{
 for(const kind of ['signed-out','not-authorised','missing-attachment','unsupported']){
  const fx=preview(t);
  if(kind==='signed-out')fx.current.user=null;
  if(kind==='not-authorised')fx.sources.material=async()=>{throw failure(404)};
  if(kind==='missing-attachment')fx.current.material.attachments=[];
  if(kind==='unsupported')fx.current.material.attachments[0].mimeType='text/html';
  await fx.controller.start();assert.equal(fx.jobs.length,0,kind);assert.equal(fx.state.media,null,kind);
  if(kind==='signed-out')assert.equal(fx.calls.filter(call=>call.kind==='material').length,0);
 }
});

test('download permission is strict by role and updates without reloading the still-authorised PDF',async t=>{
 for(const role of ['admin','teacher'])assert.equal(canDownloadAttachment({...manager,role},{studentDownload:false}),true);
 for(const setting of [false,'true',1,undefined])assert.equal(canDownloadAttachment({id:'student',role:'student'},{studentDownload:setting}),false);
 assert.equal(canDownloadAttachment({id:'student',role:'student'},{studentDownload:true}),true);assert.equal(canDownloadAttachment(null,{studentDownload:true}),false);
 const fx=preview(t);fx.current.user={id:'student-qa',role:'student'};fx.current.material.studentDownload=true;await fx.controller.start();
 assert.equal(fx.state.metadata.canDownload,true);assert.equal(fx.state.metadata.downloadUrl,attachmentApiPath(ids.materialId,ids.attachmentId)+'?download=1');
 fx.current.material.studentDownload=false;await fx.controller.check();
 assert.equal(fx.state.metadata.canDownload,false);assert.ok(!fx.state.metadata.downloadUrl);assert.equal(fx.jobs.length,1);assert.equal(fx.jobs[0].destroyed,0);
});

test('five-second permission checks and a forced focus check clear old private content when a session or grant is revoked',async t=>{
 for(const reason of ['signed-out','grant-revoked','identity-changed']){
  const fx=preview(t);await fx.controller.start();assert.equal(fx.intervals.length,1);assert.equal(fx.intervals[0].delay,5000);
  fx.jobs[0].settings.onText('Private old page');
  if(reason==='signed-out')fx.current.user=null;
  if(reason==='grant-revoked')fx.sources.material=async()=>{throw failure(404)};
  if(reason==='identity-changed')fx.current.user={id:'another-account',role:'student'};
  if(reason==='grant-revoked')await fx.controller.check({force:true});else await fx.intervals[0].callback();
  assert.equal(fx.state.metadata,null,reason);assert.equal(fx.state.media,null,reason);assert.equal(fx.state.text,'',reason);assert.ok(fx.jobs[0].destroyed>0,reason);assert.equal(fx.jobs.length,1,reason);
  fx.jobs[0].settings.onText('Late old page');assert.equal(fx.state.text,'',reason);
 }
});

test('a stale session or material response cannot start a file after a newer forced check reports signed out',async t=>{
 for(const stage of ['session','material']){
  const fx=preview(t),slow=deferred();let first=true;
  if(stage==='session')fx.sources.session=()=>first?(first=false,slow.promise):Promise.resolve({user:null});
  else{fx.sources.material=()=>slow.promise;}
  const initial=fx.controller.start();await until(()=>fx.calls.some(call=>call.kind===stage),'The first request must be pending');
  fx.current.user=null;if(stage==='material')fx.sources.session=async()=>({user:null});
  await fx.controller.check({force:true});assert.equal(fx.state.metadata,null);
  slow.resolve(stage==='session'?{user:copy(manager)}:{material:copy(material)});await initial;
  assert.equal(fx.jobs.length,0);assert.equal(fx.state.metadata,null);assert.equal(fx.state.text,'');
 }
});

test('PDF pagination and late renders retain the latest page controls instead of restoring an older page',async t=>{
 const fx=preview(t);await fx.controller.start();const old=deferred(),latest=deferred(),job=fx.jobs[0];
 await fx.controller.previous();assert.equal(fx.state.controls.pageNumber,1);
 let rendering=0;job.render=()=>++rendering===1?old.promise:latest.promise;
 const next=fx.controller.next();await until(()=>job.pages.includes(2),'The requested next page must render');
 const resized=fx.controller.resize();await until(()=>job.pages.filter(page=>page===2).length===2,'Resizing must render the latest layout');
 latest.resolve();await resized;assert.equal(fx.state.controls.pageNumber,2);assert.equal(fx.state.controls.busy,false);
 old.resolve();await next;assert.equal(fx.state.controls.pageNumber,2);assert.equal(fx.state.controls.busy,false);
 job.render=async()=>{};await fx.controller.next();await fx.controller.next();assert.equal(fx.state.controls.pageNumber,3);assert.ok(job.pages.every(page=>page>=1&&page<=3));
});

test('destroying a viewer aborts pending requests, destroys late PDF work and cannot paint private text again',async t=>{
 const ready=deferred(),fx=preview(t,{makePdf:job=>{job.ready=ready.promise;return job}}),pending=fx.controller.start();
 await until(()=>fx.jobs.length===1,'The authorised PDF task must exist');fx.controller.destroy();
 assert.equal(fx.state.metadata,null);assert.equal(fx.state.text,'');assert.ok(fx.jobs[0].destroyed>0);assert.deepEqual(fx.cancelled,[fx.intervals[0].id]);
 ready.resolve(3);await pending;fx.jobs[0].settings.onText('Late private PDF text');assert.equal(fx.state.text,'');assert.equal(fx.state.controls,null);
 await fx.controller.retry();assert.equal(fx.jobs.length,1,'A destroyed viewer must not restart private work');
});

test('a failed permission refresh removes private media and retry requires fresh session and metadata before loading again',async t=>{
 const fx=preview(t);fx.current.material.attachments[0].mimeType='image/png';await fx.controller.start();assert.equal(fx.state.media.kind,'image');assert.equal(fx.jobs.length,0);
 fx.sources.material=async()=>{throw failure(0)};await fx.controller.check();
 assert.equal(fx.state.metadata,null);assert.equal(fx.state.media,null);assert.ok(fx.state.mediaCleanups>0);assert.equal(fx.state.status,'connection-error');
 const before=fx.calls.length;fx.sources.material=async()=>({material:copy(fx.current.material)});await fx.controller.retry();
 assert.deepEqual(fx.calls.slice(before).map(call=>call.kind),['session','material']);assert.equal(fx.state.media.kind,'image');assert.equal(fx.state.media.url,attachmentApiPath(ids.materialId,ids.attachmentId));
});

test('a PDF load failure destroys the failed task and retry creates a new authorised task rather than reusing broken work',async t=>{
 let first=true;const fx=preview(t,{makePdf:job=>{if(first){first=false;job.ready=Promise.reject(new Error('Unreadable test PDF'))}return job}});
 await fx.controller.start();assert.ok(fx.jobs[0].destroyed>0);assert.equal(fx.state.controls,null);
 const before=fx.calls.length;await fx.controller.retry();assert.equal(fx.jobs.length,2);assert.deepEqual(fx.calls.slice(before).map(call=>call.kind),['session','material']);assert.equal(fx.state.controls.pageNumber,1);assert.equal(fx.state.controls.pageCount,3);
});

test('preview language uses meaningful Traditional Chinese and English labels without translating the stored attachment name',async t=>{
 for(const key of ['loading-auth','loading-preview','connection-error','preview-error','signed-out','unavailable','previous','next','download','retry']){
  const chinese=previewText('zh',key),english=previewText('en',key);assert.match(chinese,/[\u3400-\u9fff]/,key);assert.match(english,/[A-Za-z]/,key);assert.notEqual(chinese,english,key);
 }
 assert.match(previewText('en','previous'),/previous/i);assert.match(previewText('zh','previous'),/上一/);
 assert.match(previewText('en','next'),/next/i);assert.match(previewText('zh','next'),/下一/);
 assert.match(previewText('en','download'),/download/i);assert.match(previewText('zh','download'),/下載/);
 assert.equal(previewText('unknown','download'),previewText('zh','download'));
 const fx=preview(t);await fx.controller.start();assert.equal(fx.state.metadata.attachment.name,'顏色練習.pdf');
});

test('a forced focus check blanks the previous private view before waiting for a fresh session response',async t=>{
 const fx=preview(t);await fx.controller.start();fx.jobs[0].settings.onText('Private page before switching tabs');
 const session=deferred();fx.sources.session=()=>session.promise;const pending=fx.controller.check({force:true});
 assert.equal(fx.state.metadata,null);assert.equal(fx.state.text,'');assert.equal(fx.state.controls,null);
 session.resolve({user:null});await pending;assert.equal(fx.state.status,'signed-out');assert.ok(fx.jobs[0].destroyed>0);
});

test('a PDF file authentication failure rechecks permission and cannot leave its old metadata visible',async t=>{
 const fx=preview(t,{makePdf:job=>{job.ready=Promise.reject(failure(401));return job}});let sessions=0;
 fx.sources.session=async()=>({user:++sessions===1?copy(manager):null});await fx.controller.start();
 assert.equal(sessions,2);assert.equal(fx.jobs.length,1);assert.ok(fx.jobs[0].destroyed>0);assert.equal(fx.state.metadata,null);assert.equal(fx.state.text,'');assert.equal(fx.state.status,'signed-out');
});

test('a missing PDF file with still-authorised metadata cannot trigger an automatic load failure loop during polling',async t=>{
 let fail=true;const fx=preview(t,{makePdf:job=>{if(fail)job.ready=Promise.reject(failure(404));return job}});
 await fx.controller.start();assert.equal(fx.jobs.length,1);assert.ok(fx.jobs[0].destroyed>0);assert.equal(fx.state.controls,null);
 assert.ok(['unavailable','preview-error'].includes(fx.state.status));
 for(let check=0;check<3;check++)await fx.intervals[0].callback();
 assert.equal(fx.jobs.length,1,'A persistent file failure must not repeatedly fetch/decode the same broken attachment');
 fail=false;await fx.controller.retry();assert.equal(fx.jobs.length,2);assert.equal(fx.state.controls.pageNumber,1);
});

test('destroying the public viewer aborts a still-pending metadata request and rejects all late private work',async t=>{
 const fx=preview(t),metadata=deferred();fx.sources.material=()=>metadata.promise;
 const pending=fx.controller.start();await until(()=>fx.calls.some(call=>call.kind==='material'),'Metadata must genuinely be pending');
 const request=fx.calls.find(call=>call.kind==='material');assert.equal(request.settings.signal.aborted,false);
 fx.controller.destroy();assert.equal(request.settings.signal.aborted,true);
 metadata.resolve({material:copy(material)});await pending;assert.equal(fx.jobs.length,0);assert.equal(fx.state.metadata,null);assert.equal(fx.state.text,'');
});

test('PDF page geometry fits a mobile width and bounds large or extreme pages without unbounded canvas memory',()=>{
 for(const [base,width,ratio] of [[{width:600,height:800},320,2],[{width:6000,height:12000},100000,8],[{width:100000000,height:1},360,4],[{width:1,height:100000000},360,2]]){
  const layout=pdfCanvasLayout(base,width,ratio);assert.ok(layout.width>=1&&layout.height>=1);assert.ok(layout.width<=PDF_MAX_DIMENSION&&layout.height<=PDF_MAX_DIMENSION);assert.ok(layout.width*layout.height<=PDF_MAX_PIXELS);assert.ok(layout.cssWidth<=width);
 }
 for(const base of [{width:0,height:10},{width:10,height:-1},{width:NaN,height:10},{width:10,height:Infinity}])assert.throws(()=>pdfCanvasLayout(base,320,2));
});

test('closing before the PDF library finishes loading never starts a private file request',async()=>{
 const library=deferred(),canvas={width:99,height:99,style:{}},texts=[];let reads=0;
 const renderer=createPdfPreview({url:attachmentApiPath(ids.materialId,ids.attachmentId),canvas,width:()=>320,pixelRatio:()=>2,onText:text=>texts.push(text),loadLibrary:()=>library.promise});
 renderer.destroy();library.resolve({getDocument(){reads++;throw new Error('Private file must not start after closing')}});
 await assert.rejects(renderer.ready,error=>error.name==='AbortError');assert.equal(reads,0);assert.equal(canvas.width,0);assert.equal(canvas.height,0);assert.equal(texts.at(-1),'');
});

test('destroying the real PDF renderer cancels active rendering and its loading task while preserving authenticated bounded document options',async()=>{
 const canvas={width:0,height:0,style:{}},render=deferred(),texts=[];let parameters,cancels=0,destroys=0,started=false;
 const page={getViewport:({scale})=>({width:600*scale,height:800*scale}),cleanup(){},getTextContent:async()=>({items:[{str:'Must not appear after close'}]}),render(){started=true;return {promise:render.promise,cancel(){cancels++;render.reject(Object.assign(new Error('Cancelled'),{name:'RenderingCancelledException'}))}}}};
 const loading={promise:Promise.resolve({numPages:1,getPage:async()=>page}),destroy(){destroys++;return Promise.resolve()}};
 const renderer=createPdfPreview({url:attachmentApiPath(ids.materialId,ids.attachmentId),canvas,width:()=>320,pixelRatio:()=>2,onText:text=>texts.push(text),loadLibrary:async()=>({getDocument(options){parameters=options;return loading}})});
 assert.equal(await renderer.ready,1);assert.equal(parameters.url,attachmentApiPath(ids.materialId,ids.attachmentId));assert.equal(parameters.withCredentials,true);assert.equal(parameters.isEvalSupported,false);assert.equal(parameters.enableXfa,false);assert.ok(parameters.maxImageSize<=PDF_MAX_PIXELS);
 const pending=renderer.renderPage(1);await until(()=>started,'The real renderer must actually be active before cancellation');await renderer.destroy();
 await assert.rejects(pending,error=>error.name==='RenderingCancelledException');assert.equal(cancels,1);assert.equal(destroys,1);assert.equal(canvas.width,0);assert.equal(canvas.height,0);assert.equal(texts.at(-1),'');assert.ok(!texts.join('').includes('Must not appear'));
 renderer.destroy();assert.equal(destroys,1,'Repeated close must not acquire a second document owner');
});

test('a late old PDF page lookup cannot resize or draw over the newer page canvas',async()=>{
 const first=deferred(),canvas={width:0,height:0,style:{}},texts=[];let oldDraws=0,newDraws=0;
 const page=(width,height,text,isOld)=>({cleanup(){},getViewport:({scale})=>({width:width*scale,height:height*scale}),getTextContent:async()=>({items:[{str:text}]}),render(){isOld?oldDraws++:newDraws++;return {promise:Promise.resolve(),cancel(){}}}});
 const oldPage=page(400,600,'Old page',true),newPage=page(800,1000,'Current page',false),loading={promise:Promise.resolve({numPages:2,getPage:number=>number===1?first.promise:Promise.resolve(newPage)}),destroy:async()=>{}};
 const renderer=createPdfPreview({url:attachmentApiPath(ids.materialId,ids.attachmentId),canvas,width:()=>320,pixelRatio:()=>2,onText:text=>texts.push(text),loadLibrary:async()=>({getDocument:()=>loading})});
 await renderer.ready;const old=renderer.renderPage(1);await Promise.resolve();const current=renderer.renderPage(2);await current;
 const latestSize=[canvas.width,canvas.height];first.resolve(oldPage);await old;
 assert.equal(oldDraws,0);assert.equal(newDraws,1);assert.deepEqual([canvas.width,canvas.height],latestSize);assert.match(texts.at(-1),/Current page/);await renderer.destroy();
});

test('late extracted text from an older PDF page cannot replace the current page accessible text',async()=>{
 const oldText=deferred(),canvas={width:0,height:0,style:{}},texts=[];let oldExtraction=false;
 const page=number=>({cleanup(){},getViewport:({scale})=>({width:600*scale,height:800*scale}),render:()=>({promise:Promise.resolve(),cancel(){}}),getTextContent(){if(number===1){oldExtraction=true;return oldText.promise}return Promise.resolve({items:[{str:'Current accessible text'}]})}});
 const loading={promise:Promise.resolve({numPages:2,getPage:async number=>page(number)}),destroy:async()=>{}};
 const renderer=createPdfPreview({url:attachmentApiPath(ids.materialId,ids.attachmentId),canvas,width:()=>320,pixelRatio:()=>2,onText:text=>texts.push(text),loadLibrary:async()=>({getDocument:()=>loading})});
 await renderer.ready;const old=renderer.renderPage(1);await until(()=>oldExtraction,'Old text extraction must be pending');await renderer.renderPage(2);
 oldText.resolve({items:[{str:'Private old page text'}]});await old;
 assert.match(texts.at(-1),/Current accessible text/);assert.ok(!texts.join('').includes('Private old page text'));await renderer.destroy();
});

function traditionalChinesePdf(){
 const content='BT /F1 24 Tf 72 720 Td <7E419AD44E2D6587> Tj ET\n';
 const objects=[
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 6 0 R >>',
  '<< /Type /Font /Subtype /Type0 /BaseFont /MSung-Light /Encoding /UniCNS-UCS2-H /DescendantFonts [5 0 R] >>',
  '<< /Type /Font /Subtype /CIDFontType0 /BaseFont /MSung-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (CNS1) /Supplement 4 >> /DW 1000 /FontDescriptor 7 0 R >>',
  `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`,
  '<< /Type /FontDescriptor /FontName /MSung-Light /Flags 6 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 700 /StemV 80 >>',
 ];
 let pdf='%PDF-1.7\n';const offsets=[];
 for(let index=0;index<objects.length;index++){offsets.push(Buffer.byteLength(pdf));pdf+=`${index+1} 0 obj\n${objects[index]}\nendobj\n`;}
 const xref=Buffer.byteLength(pdf);
 pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 return new Uint8Array(Buffer.from(pdf));
}

test('the public PDF renderer configures local character maps so a genuine Traditional Chinese CID PDF retains its text',async t=>{
 const library=await import('pdfjs-dist/legacy/build/pdf.mjs');let parameters,loading;
 const renderer=createPdfPreview({url:attachmentApiPath(ids.materialId,ids.attachmentId),canvas:{width:0,height:0,style:{}},width:()=>320,pixelRatio:()=>2,loadLibrary:async()=>({getDocument(options){
  parameters=options;
  loading=library.getDocument({...options,url:undefined,data:traditionalChinesePdf(),useWorkerFetch:false,
   ...(options.cMapUrl?{cMapUrl:fileURLToPath(new URL('../node_modules/pdfjs-dist/cmaps/',import.meta.url))}:{}),
   ...(options.standardFontDataUrl?{standardFontDataUrl:fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/',import.meta.url))}:{}),
  });return loading;
 }})});
 t.after(()=>renderer.destroy());assert.equal(await renderer.ready,1);
 const document=await loading.promise,page=await document.getPage(1),content=await page.getTextContent();
 assert.equal(content.items.map(item=>item.str).join(''),'繁體中文','Actual PDF.js decoding must preserve the CID text, not just open one blank page');
 assert.equal(parameters.cMapUrl,'/pdf-assets/cmaps/');assert.equal(parameters.cMapPacked,true);assert.equal(parameters.standardFontDataUrl,'/pdf-assets/standard_fonts/');
});

test('Vite development serves the exact local PDF character maps and fonts for GET and HEAD without a remote fallback',{timeout:15000},async t=>{
 const {createServer}=await import('vite'),root=fileURLToPath(new URL('../',import.meta.url));
 // Inline watch:null is discarded by Vite's config merge; the resolved
 // fixture must disable watching/HMR so parallel tests cannot restart it.
 const isolation={name:'qa-isolated-pdf-dev-server',configResolved(config){config.server.watch=null;config.server.hmr=false}};
 const server=await createServer({root,configFile:join(root,'vite.config.mjs'),plugins:[isolation],logLevel:'silent',optimizeDeps:{noDiscovery:true},server:{host:'127.0.0.1',port:0,strictPort:false,watch:null,preTransformRequests:false}});
 t.after(()=>{server.httpServer?.closeAllConnections();return server.close()});assert.equal(server.config.server.watch,null);assert.equal(server.config.server.hmr,false);await new Promise((resolve,reject)=>{server.httpServer.once('error',reject);server.httpServer.listen(0,'127.0.0.1',resolve)});const port=server.httpServer.address().port;assert.ok(port>0);assert.notEqual(port,5173,'The PDF fixture must not occupy the preview port');const origin=`http://127.0.0.1:${port}`;
 for(const asset of ['cmaps/UniCNS-UCS2-H.bcmap','cmaps/Adobe-CNS1-UCS2.bcmap','standard_fonts/FoxitSerif.pfb']){
  const expected=await readFile(join(root,'node_modules/pdfjs-dist',asset));
  const response=await fetch(origin+'/pdf-assets/'+asset,{headers:{Connection:'close'},signal:AbortSignal.timeout(5000)});assert.equal(response.status,200,asset);assert.deepEqual(Buffer.from(await response.arrayBuffer()),expected,asset);
  const head=await fetch(origin+'/pdf-assets/'+asset,{method:'HEAD',headers:{Connection:'close'},signal:AbortSignal.timeout(5000)});assert.equal(head.status,200,asset);assert.equal((await head.arrayBuffer()).byteLength,0);assert.equal(Number(head.headers.get('content-length')),expected.length);
 }
 assert.equal((await fetch(origin+'/pdf-assets/cmaps/not-a-vendor-file.json',{headers:{Connection:'close'},signal:AbortSignal.timeout(5000)})).status,404);
});

test('a Vite production build contains the local CID maps, standard fonts and their licences at the renderer URLs',async t=>{
 const {build}=await import('vite'),root=fileURLToPath(new URL('../',import.meta.url)),directory=await mkdtemp(join(tmpdir(),'beamal-pdf-assets-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));const entry=join(directory,'entry.js'),outDir=join(directory,'output');await writeFile(entry,'export default 1;\n');
 await build({root,configFile:join(root,'vite.config.mjs'),logLevel:'silent',build:{outDir,emptyOutDir:true,minify:false,rollupOptions:{input:entry}}});
 for(const asset of ['cmaps/UniCNS-UCS2-H.bcmap','cmaps/Adobe-CNS1-UCS2.bcmap','cmaps/LICENSE','standard_fonts/FoxitSerif.pfb','standard_fonts/LICENSE_FOXIT','standard_fonts/LICENSE_LIBERATION']){
  assert.deepEqual(await readFile(join(outDir,'pdf-assets',asset)),await readFile(join(root,'node_modules/pdfjs-dist',asset)),asset);
 }
});
