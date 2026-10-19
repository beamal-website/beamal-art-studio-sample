import test from 'node:test';
import assert from 'node:assert/strict';
import {syncSidebarGroups,sidebarClickWave} from '../client/sidebar-motion.js';
test('compacting and reopening the sidebar restores each group without changing its saved expansion',()=>{
 const make=open=>{const attributes={},subnav={},group={classList:{contains:()=>open},querySelector:selector=>selector==='.portal-sales-subnav'?subnav:{setAttribute:(name,value)=>attributes[name]=value}};return {group,attributes,subnav};};
 const sales=make(true),accounting=make(true),closed=make(false),sidebar={querySelectorAll:()=>[sales.group,accounting.group,closed.group]};
 syncSidebarGroups(sidebar,{compact:true});
 for(const row of [sales,accounting,closed]){assert.equal(row.subnav.inert,true);assert.equal(row.attributes['aria-expanded'],'false');}
 syncSidebarGroups(sidebar,{compact:false});
 for(const row of [sales,accounting]){assert.equal(row.subnav.inert,false);assert.equal(row.attributes['aria-expanded'],'true');}
 assert.equal(closed.subnav.inert,true);assert.equal(closed.attributes['aria-expanded'],'false');
});
test('click wave attaches to the repainted button, starts from the click and removes itself',()=>{
 let added,finish,removed=false;
 const original={matches:()=>true,dataset:{tab:'sales'},getAttribute:()=>null},button={dataset:{tab:'sales'},getAttribute:()=>null,getBoundingClientRect:()=>({left:10,right:210,top:20,bottom:80,width:200,height:60}),append:wave=>added=wave};
 const wave={style:{},setAttribute(){},addEventListener:(name,callback)=>{assert.equal(name,'animationend');finish=callback;},remove:()=>removed=true};
 const document={querySelectorAll:()=>[{...button,getAttribute:()=> 'Parent group',append:()=>assert.fail('The wave must stay on the clicked child link')},button],createElement:()=>wave},window={matchMedia:()=>({matches:false})};
 const event={target:{closest:()=>original},detail:1,clientX:30,clientY:40};
 sidebarClickWave(event,{document,window});assert.equal(added,wave);assert.equal(wave.className,'portal-click-wave');assert.match(wave.style.cssText,/left:-180px;top:-180px/);finish();assert.equal(removed,true);
 added=null;sidebarClickWave(event,{document,window:{matchMedia:()=>({matches:true})}});assert.equal(added,null);
});
