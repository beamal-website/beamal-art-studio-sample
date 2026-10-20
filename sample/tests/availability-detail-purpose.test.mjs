import test from 'node:test';
import assert from 'node:assert/strict';
import {availabilityDetailMarkup} from '../client/availability-ui.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
for(const language of ['en','zh'])for(const [trialEnabled,reschedulingEnabled]of [[true,false],[false,true],[true,true],[false,false]]){
 test(`${language} detail only shows enabled purposes: trial=${trialEnabled}, rescheduling=${reschedulingEnabled}`,()=>{
  const slot={id:'a',courseName:'Course 1',date:'2026-10-21',time:'11:00',duration:60,teacherNames:['林雅晴'],roomNames:['B11'],trialEnabled,reschedulingEnabled,trialCapacity:8,trialReserved:2,reschedulingCapacity:5,reschedulingReserved:1,totalCapacity:13,totalReserved:null,publicVisibility:'show',remark:'private',teacherIds:['t'],teacherColors:['#b9772f']},t=(zh,en)=>language==='en'?en:zh;
  const html=availabilityDetailMarkup({slot,canEdit:true},{t,esc});
  for(const label of [t('試堂名額','Trial capacity'),t('已確認試堂','Confirmed trials'),t('試堂資格','Trial enabled'),t('公開顯示','Public visibility')])assert.equal(html.includes(`<dt>${label}</dt>`),trialEnabled,label);
  for(const label of [t('調課名額','Rescheduling capacity'),t('已約調課','Rescheduling reserved'),t('調課資格','Rescheduling enabled')])assert.equal(html.includes(`<dt>${label}</dt>`),reschedulingEnabled,label);
  assert.equal(html.includes('<h3>'+t('試堂名單','Trial list')+'</h3>'),trialEnabled);assert.equal(html.includes('<h3>'+t('調堂名單','Rescheduling list')+'</h3>'),reschedulingEnabled);assert.match(html,/Course 1/);assert.match(html,/B11/);assert.match(html,/private/);assert.doesNotMatch(html,/availability-colour-header/);
  assert.match(html,/data-teacher-id="t"/);
  const readonly=availabilityDetailMarkup({slot},{t,esc});assert.doesNotMatch(readonly,/private/);
 });
}
