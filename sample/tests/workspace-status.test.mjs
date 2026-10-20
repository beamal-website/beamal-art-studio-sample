import test from 'node:test';
import assert from 'node:assert/strict';
import {statusNameLength,validateStatusTags,WORKSPACE_STATUS_COLOURS,defaultStatusTags} from '../shared/workspace-status.js';
test('status names use at most twenty English characters or ten Chinese characters with a mixed-name budget',()=>{
 for(const name of ['A'.repeat(20),'中'.repeat(10),'中'.repeat(5)+'A'.repeat(10)])assert.equal(validateStatusTags([{id:'a',name,color:'red'}])[0].name,name);
 for(const name of ['A'.repeat(21),'中'.repeat(11),'中'.repeat(5)+'A'.repeat(11),' ','line\nbreak'])assert.throws(()=>validateStatusTags([{id:'a',name,color:'red'}]));
 assert.equal(statusNameLength('中文ABC'),7);
});
test('status palette is exactly six requested colours and malformed or duplicate tags are rejected',()=>{
 assert.deepEqual(Object.keys(WORKSPACE_STATUS_COLOURS),['red','green','yellow','light-blue','dark-gray','light-gray']);
 const tags=defaultStatusTags();assert.deepEqual(validateStatusTags(tags),tags);
 assert.throws(()=>validateStatusTags([...tags,tags[0]]));assert.throws(()=>validateStatusTags([{id:'a',name:'A',color:'purple'}]));
 assert.throws(()=>validateStatusTags([{id:'a',name:'A',color:'red'},{id:'b',name:'a',color:'green'}]));
});

test('status headers and chips escape names and have bounded independent category markup',async()=>{
 const {workspaceStatusHeader,workspaceStatusCell,statusTagMarkup}=await import('../client/workspace-status-ui.js');
 for(const category of ['rescheduling','trial','payment','other']){assert.match(workspaceStatusHeader(category),new RegExp('data-ws-header="'+category+'"'));assert.match(workspaceStatusCell(category,'trial:a'),/workspace-status-cell/);}
 assert.match(statusTagMarkup({name:'<script>',color:'red'}),/&lt;script&gt;/);assert.doesNotMatch(statusTagMarkup({name:'<script>',color:'red'}),/<script>/);
});


test('Status header is plain aligned text with no dropdown arrow or left-click button',async()=>{
 const {workspaceStatusHeader}=await import('../client/workspace-status-ui.js');const html=workspaceStatusHeader('trial');assert.match(html,/>Status<\/th>/);assert.match(html,/data-ws-header="trial"/);assert.doesNotMatch(html,/<button|⌄|aria-haspopup/);
});


test('Status header does not display a hover tooltip over the table',async()=>{
 const {workspaceStatusHeader}=await import('../client/workspace-status-ui.js');
 assert.doesNotMatch(workspaceStatusHeader('trial'),/\stitle=/);
 assert.match(workspaceStatusHeader('trial'),/aria-description=/);
});
