import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

test('Vercel routes API traffic to Render before the SPA fallback',()=>{
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.deepEqual(config.rewrites,[
  {source:'/api/:path*',destination:'https://beamal-art-studio-api-50w3.onrender.com/api/:path*'},
  {source:'/(.*)',destination:'/index.html'},
 ]);
});
