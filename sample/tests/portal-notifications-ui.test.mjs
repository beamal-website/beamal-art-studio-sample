import test from 'node:test';
import assert from 'node:assert/strict';
import {portalNotificationsMarkup,createPortalNotificationsController} from '../client/portal-notifications-ui.js';
test('confirmation notifications render names dates and course facts safely in both languages with independent read controls',()=>{
 const notifications=[{id:'trial:<id>',type:'trial-confirmed',titleZh:'試堂已確認',titleEn:'Trial confirmed',bodyZh:'小明的試堂已確認：繪畫課，2030-01-02 13:00。',bodyEn:'<Name> confirmed: Art, 2030-01-02 13:00.',createdAt:'2026-10-20T01:00:00Z',read:false}];
 for(const t of [(_zh,en)=>en,zh=>zh]){const html=portalNotificationsMarkup({notifications},{t});assert.match(html,/2030-01-02 13:00/);assert.match(html,/data-portal-notification="read"/);assert.doesNotMatch(html,/<Name>|<id>/);}
 assert.match(portalNotificationsMarkup(),/No notifications yet/);
 assert.match(portalNotificationsMarkup({loading:true}),/Loading/);
 assert.match(portalNotificationsMarkup({error:'Could not load'}),/role="alert"/);
});
test('notification responses from an old signed-in identity cannot populate another user badge',async()=>{
 let identity='admin-a',finish,reads=0;const badge={textContent:'',hidden:true};
 const dom={body:{},querySelectorAll:()=>[badge],addEventListener(){}};
 const controller=createPortalNotificationsController({api:{notifications:()=>{reads++;return new Promise(resolve=>finish=resolve);}},context:()=>({identity,t:(_zh,en)=>en}),dom});
 controller.afterRender();assert.equal(reads,1);identity='';controller.afterRender();finish({revision:'old',notifications:[],unread:9});for(let i=0;i<10;i++)await Promise.resolve();assert.equal(badge.hidden,true);assert.equal(badge.textContent,'');
});
test('notification polling pauses in hidden tabs and runs at a lower background frequency',()=>{
 let interval,reads=0;const dom={body:{},visibilityState:'hidden',defaultView:{setInterval(callback,delay){interval={callback,delay};}},querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
 createPortalNotificationsController({api:{notifications:async()=>{reads++;return {revision:'r',notifications:[],unread:0};}},context:()=>({identity:'admin-a',t:(_zh,en)=>en}),dom});
 assert.equal(interval.delay,30000);interval.callback();assert.equal(reads,0);dom.visibilityState='visible';interval.callback();assert.equal(reads,1);
});
