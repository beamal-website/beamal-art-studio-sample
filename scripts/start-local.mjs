// Portable local demo entry. The production service keeps its separate, stricter
// bootstrap; this opt-in launcher never imports or replaces its database.
import {readFile,writeFile,mkdir,stat,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {resolve,dirname,join,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const projectDir=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sampleDir=join(projectDir,'sample');
export function requireSupportedNode(version=process.versions.node){
 const match=/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(String(version));
 if(!match||Number(match[1])<22||Number(match[1])===22&&Number(match[2])<13)throw new Error('需要 Node.js 22.13 或更新版本。請先安裝 Node.js LTS，再重新開啟。 / Node.js 22.13 or newer is required.');
}
export function parseLocalOptions(argv=process.argv.slice(2)){
 const options={open:false,port:5180,dataDir:resolve(sampleDir,'.data','local-demo'),help:false};
 for(let i=0;i<argv.length;i++){
  const arg=argv[i];
  if(arg==='--open')options.open=true;
  else if(arg==='--no-open')options.open=false;
  else if(arg==='--help'||arg==='-h')options.help=true;
  else if(arg==='--port'){
   const value=argv[++i];if(!/^\d+$/.test(value||'')||Number(value)>65535)throw new Error('請提供 0–65535 的本機連接埠。 / Choose a port from 0 to 65535.');options.port=Number(value);
  }else if(arg==='--data-dir'){
   const value=argv[++i];if(!value||value.startsWith('--'))throw new Error('請提供示例資料夾路徑。 / Provide a demo data folder.');options.dataDir=resolve(value);
  }else throw new Error(`無法識別的啟動選項 / Unknown startup option: ${arg}`);
 }
 return options;
}
const exists=path=>stat(path).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;});
const listen=(server,port)=>new Promise((accept,reject)=>{
 const failed=error=>{server.off('listening',ready);reject(error);};
 const ready=()=>{server.off('error',failed);accept();};
 server.once('error',failed);server.once('listening',ready);server.listen(port,'127.0.0.1');
});
export async function startBuiltDemo({staticDir=join(sampleDir,'dist'),dataDir=join(sampleDir,'.data','local-demo'),port=5180,startDate}={}){
 requireSupportedNode();
 staticDir=resolve(staticDir);dataDir=resolve(dataDir);
 if(!Number.isInteger(port)||port<0||port>65535)throw new Error('Choose a valid local port.');
 if(!await exists(join(staticDir,'index.html')))throw new Error('網站尚未成功打包，未啟動資料服務。 / Build the website successfully before starting.');
 if(dataDir===staticDir||dataDir.startsWith(staticDir+sep))throw new Error('示例資料必須放在網站公開資料夾以外。 / Demo data must be outside the public website folder.');
 await mkdir(dataDir,{recursive:true,mode:0o700});
 const [{ensureLocalDemo},{createApplication}]=await Promise.all([import('../sample/server/local-demo.mjs'),import('../sample/server/app.mjs')]);
 const databasePath=join(dataDir,'beamal.sqlite'),demo=await ensureLocalDemo({databasePath,...(startDate?{startDate}:{})});
 const application=await createApplication({databasePath,staticDir});
 let closed=false;const close=async()=>{if(!closed){closed=true;await application.close();}};
 try{
  try{await listen(application.server,port);}catch(error){if(error.code!=='EADDRINUSE'||port===0)throw error;await listen(application.server,0);}
  const url=`http://127.0.0.1:${application.server.address().port}`;
  const response=await fetch(url+'/api/health',{signal:AbortSignal.timeout(5000)}),health=await response.json();
  if(!response.ok||health.service!=='Beamal'||health.storage!=='sqlite')throw new Error('資料服務未通過啟動檢查。 / The data service did not pass its startup check.');
  return {...application,url,databasePath,dataDir,demo,close};
 }catch(error){await close();throw error;}
}
async function runNpm(args){
 const npmCli=process.env.npm_execpath;
 const nodeNpm=npmCli&&await exists(npmCli);
 await new Promise((accept,reject)=>{
  // Arguments below are fixed application commands. Paths use cwd, so folders
  // containing spaces do not become shell command text.
  const child=spawn(nodeNpm?process.execPath:process.platform==='win32'?'npm.cmd':'npm',nodeNpm?[npmCli,...args]:args,{cwd:sampleDir,stdio:'inherit',shell:!nodeNpm&&process.platform==='win32'});
  child.once('error',error=>reject(new Error(error.code==='ENOENT'?'未找到 npm。請安裝包含 npm 的 Node.js LTS。 / Install Node.js LTS with npm.':error.message)));
  child.once('exit',(code,signal)=>code===0?accept():reject(new Error(`啟動已停止，npm ${args.join(' ')} 未成功${signal?' ('+signal+')':''}。 / Setup or build failed; no demo server was started.`)));
 });
}
async function prepareWebsite(){
 const lock=await readFile(join(sampleDir,'package-lock.json'));
 const fingerprint=createHash('sha256').update(lock).update(process.platform+'|'+process.arch+'|'+process.versions.node.split('.')[0]).digest('hex');
 const marker=join(sampleDir,'node_modules','.beamal-install-lock');
 const saved=await readFile(marker,'utf8').catch(error=>{if(error.code==='ENOENT')return '';throw error;});
 const dependencies=await Promise.all(['vite','pdfjs-dist','file-type','write-excel-file'].map(name=>exists(join(sampleDir,'node_modules',name,'package.json'))));
 if(saved!==fingerprint||dependencies.some(value=>!value)){
  console.log('正在安裝此電腦所需套件… / Installing dependencies for this computer…');
  await runNpm(['ci','--no-audit','--no-fund']);await writeFile(marker,fingerprint);
 }
 console.log('正在準備最新網頁… / Building the current website…');
 await runNpm(['run','build']);
}
function openBrowser(url){
 const [command,args]=process.platform==='darwin'?['open',[url]]:process.platform==='win32'?['explorer.exe',[url]]:['xdg-open',[url]];
 const child=spawn(command,args,{stdio:'ignore',detached:true});child.once('error',()=>console.log('請在瀏覽器開啟 / Open in a browser: '+url));child.unref();
}
export async function main(argv=process.argv.slice(2)){
 const options=parseLocalOptions(argv);
 if(options.help){console.log('Beamal local demo: npm start [-- --no-open] [-- --port 5180] [-- --data-dir /private/demo]\nNode.js 22.13+; only the local computer is served. Ctrl+C stops it.');return;}
 requireSupportedNode();await prepareWebsite();
 const app=await startBuiltDemo(options);
 console.log('\nBeamal 本機示例已啟動 / Local demo is ready');
 console.log(`網址 / Website: ${app.url}/login`);
 console.log('初始示例帳戶 / Initial demo accounts: admin@gmail.com · teacher@gmail.com · student@gmail.com');
 console.log('初始示例密碼 / Initial demo password: 000000');
 console.log(`資料會保留在 / Data is kept in: ${app.dataDir}`);
 console.log('關閉此終端或按 Ctrl+C 停止；重開會保留修改。 / Keep this terminal open. Ctrl+C stops the demo; saved changes are retained.');
 console.log('BEAMAL_LOCAL_READY '+JSON.stringify({url:app.url,dataDir:app.dataDir}));
 const stop=async()=>{await app.close();};process.once('SIGINT',stop);process.once('SIGTERM',stop);
 if(options.open)openBrowser(app.url+'/login');return app;
}
const invokedFile=process.argv[1]?await realpath(resolve(process.argv[1])).catch(()=>null):null;
if(invokedFile&&import.meta.url===pathToFileURL(invokedFile).href)main().catch(error=>{console.error('\nBeamal 未能啟動 / Could not start: '+error.message);process.exitCode=1;});
