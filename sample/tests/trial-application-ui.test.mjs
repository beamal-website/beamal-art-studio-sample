import test from 'node:test';
import assert from 'node:assert/strict';
import {trialApplicationMarkup} from '../client/trial-application-ui.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const ui={t:(zh,en)=>en,esc};

test('trial application popup contains every requested field and available time suggestions',()=>{
 const html=trialApplicationMarkup({courseId:'course-id',courseName:'Watercolour Studio',slots:[{date:'2026-10-24',time:'14:00',roomNames:['B11']}],draft:{studentNameZh:'Chinese name',studentNameEn:'English name',interestedTimeslot:'2026-10-24 14:00 · B11'}},ui);
 assert.match(html,/role="dialog" aria-modal="true"/);
 for(const name of ['studentNameZh','studentNameEn','birthDate','school','referrerName','courseName','interestedTimeslot','whatsappNumber','email','parentName'])assert.match(html,new RegExp(`name="${name}"`));
 assert.match(html,/Watercolour Studio/);assert.match(html,/name="interestedTimeslot"[^>]*required/);assert.match(html,/<option value="2026-10-24 14:00 · B11" selected>/);assert.match(html,/Book a trial class/);
});

test('trial application popup has a busy state and a reference-only success state',()=>{
 const busy=trialApplicationMarkup({courseName:'Course',busy:true},ui);assert.match(busy,/Submitting…/);assert.match(busy,/aria-busy="true"/);
 const success=trialApplicationMarkup({reference:'trial-reference-id'},ui);assert.match(success,/Trial application received/);assert.match(success,/trial-reference-id/);assert.doesNotMatch(success,/name="studentNameZh"|name="email"/);
 const noSlots=trialApplicationMarkup({courseName:'Course'},ui);assert.match(noSlots,/type="text" value="" placeholder="No published slots yet/);
});