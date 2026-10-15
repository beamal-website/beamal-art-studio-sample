// Profile-scoped read surfaces. Related services are not connected yet, so
// unknown history stays unknown and no presentation action changes identity.
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const views=new Set(['applicant','family','convert']);

export function sharedPeopleWorkflowMarkup(state={},context={}){
 const person=state.student;
 if(!views.has(state.view)||!person?.id||person.id!==state.personId||!person.displayName||!['applicant','student'].includes(person.kind)||state.view==='convert'&&person.kind!=='applicant')return '';
 const t=context.t||((_zh,en)=>en),esc=context.esc||escape;
 const title={applicant:t('試課記錄','Trial records'),family:t('家庭成員','Family members'),convert:t('轉為學生','Convert to student')}[state.view];
 const button=(text,disabled=false,primary=false)=>`<button type="button" class="lw-button lw-${primary?'primary':'secondary'}"${disabled?' disabled aria-describedby="lw-person-unavailable"':' data-action="ui-lesson" data-ui-command="close"'}>${esc(text)}</button>`;
 const details=[
  [t('名冊分類','Directory classification'),person.kind==='applicant'?t('申請者','Applicant'):t('學生','Student')],
  [t('聯絡電話','Contact number'),person.whatsApp||person.phone||person.mobile||'—'],
  [t('聯絡電郵','Contact email'),person.email||'—'],
  ...(state.view==='applicant'?[[t('介紹人／來源','Referrer'),person.referrer||'—']]:[])
 ];
 const message=state.view==='family'?t('家庭資料暫未提供，暫時不能新增或切換家庭成員。','Family details are not available yet. Adding or switching members is unavailable.'):
  state.view==='convert'?t('學生轉換尚未接通。現有檔案、試課及付款記錄會保持不變。','Student conversion is not connected yet. The profile, trial and payment records remain unchanged.'):
  t('試課資料暫未提供，暫時不能安排試課或登記結果。','Trial records are not available yet. Scheduling a trial and recording its result are unavailable.');
 const actions=state.view==='family'?button(t('新增家庭成員','Add Family Member'),true,true):state.view==='convert'?button(t('確認轉為學生','Confirm conversion'),true,true):button(t('安排試課','Schedule trial'),true)+button(t('登記結果','Record outcome'),true);
 const note=state.view==='convert'?`<p class="lw-note">${esc(t('轉換只更改名冊身份；報名、付款及登入帳戶分開處理。','Conversion changes the directory identity. Enrolment, payment and login accounts are handled separately.'))}</p>`:'';
 return `<div class="modal lw-modal" role="dialog" aria-modal="true" aria-labelledby="lw-title" aria-describedby="lw-person-unavailable"><div class="dialog lw-dialog" tabindex="-1"><header class="lw-header"><h2 id="lw-title">${esc(title)}</h2><button type="button" class="lw-button lw-icon" data-action="ui-lesson" data-ui-command="close" aria-label="${esc(t('關閉','Close'))}">×</button></header><div class="lw-body"><section class="lw-context" aria-label="${esc(t('目前人物檔案','Current profile'))}"><span class="lw-avatar" aria-hidden="true">${esc(person.displayName.slice(0,1))}</span><strong>${esc(person.displayName)}</strong></section><dl class="lw-summary">${details.map(([key,value])=>`<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><p id="lw-person-unavailable" class="lw-note" role="status">${esc(message)}</p>${note}</div><footer class="lw-footer">${button(t('關閉','Close'))}${actions}</footer></div></div>`;
}
