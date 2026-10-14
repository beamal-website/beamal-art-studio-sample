import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';

test('the actual Vite dev server denies fictional private data and SQLite files through normal and /@fs URLs while keeping public assets available',{timeout:15000},async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-vite-private-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const configFile=fileURLToPath(new URL('../vite.config.mjs',import.meta.url));
 const privateNames=['.data/database.sqlite','.data/bootstrap-users.json','.data/attachments/0b81558d-947d-4f36-8c0e-41832de2a0f1.bin','legacy.sqlite','legacy.sqlite-wal','.env'];
 for(const name of privateNames){const path=join(directory,name);await mkdir(join(path,'..'),{recursive:true});await writeFile(path,'FICTIONAL_QA_PRIVATE_BYTES');}
 await writeFile(join(directory,'index.html'),'<!doctype html><title>QA public fixture</title>');
 await writeFile(join(directory,'public-script.js'),'export const publicFixture = true;\n');
 const server=await createServer({root:directory,configFile,logLevel:'silent',optimizeDeps:{noDiscovery:true},server:{host:'127.0.0.1',watch:null,preTransformRequests:false,fs:{allow:[directory]}}});
 t.after(()=>{server.httpServer?.closeAllConnections();return server.close()});
 // Vite's server.listen() treats port:0 as its default port. The underlying
 // server must bind zero directly so this test never occupies the user's preview.
 await new Promise((resolve,reject)=>{server.httpServer.once('error',reject);server.httpServer.listen(0,'127.0.0.1',resolve)});
 const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 async function get(path){return fetch(origin+path,{headers:{Connection:'close'},signal:AbortSignal.timeout(5000)})}
 for(const prefix of ['', '/@fs'+directory+'/']){
  const publicPath=prefix?prefix+'public-script.js':'/public-script.js',publicResponse=await get(publicPath);
  assert.equal(publicResponse.status,200,publicPath);assert.match(await publicResponse.text(),/publicFixture/);
  for(const name of privateNames){
   const response=await get(prefix?prefix+name:'/'+name);
   assert.equal(response.status,403,`${prefix?'absolute /@fs':'normal'} access to the fictional ${name} must be denied`);
   assert.doesNotMatch(await response.text(),/FICTIONAL_QA_PRIVATE_BYTES/);
  }
 }
 // The source fixture stays intact: serving restrictions must not delete files.
 assert.equal(await readFile(join(directory,'.data/bootstrap-users.json'),'utf8'),'FICTIONAL_QA_PRIVATE_BYTES');
});
