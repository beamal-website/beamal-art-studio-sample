const fields = ['localName', 'fullName', 'dateOfBirth', 'gender', 'school', 'referrer', 'parentName', 'whatsapp', 'email', 'remark'];
const requiredFields = ['localName', 'fullName', 'dateOfBirth', 'gender', 'whatsapp'];
const limits = { localName: 200, fullName: 200, school: 200, referrer: 200, parentName: 200, whatsapp: 80, email: 254, remark: 2000 };
const policies=new Set(['name-birth-whatsapp','name-whatsapp','name-contact']);
const text = value => typeof value === 'string' ? value : '';
const identified = value => typeof value === 'string' && Boolean(value.trim());
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(text(value)) && value >= '0001-01-01' && value <= '9999-12-31' && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
const validSource = state => identified(state?.publicCourse?.id) && identified(state?.slot?.id) && state.slot.courseId === state.publicCourse.id && validDate(state.slot.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(text(state.slot.time)) && Number.isSafeInteger(state.slot.duration) && state.slot.duration > 0 && state.slot.duration <= 1440 - Number(state.slot.time.slice(0, 2)) * 60 - Number(state.slot.time.slice(3));
const sourceStatus = state => validSource(state) && ['ready', 'loading', 'error', 'unavailable'].includes(state?.sourceStatus) ? state.sourceStatus : 'unavailable';
const mergeDraft = (draft, values) => Object.fromEntries(fields.map(key => [key, Object.hasOwn(values || {}, key) && typeof values[key] === 'string' ? values[key] : text(draft?.[key])]));
const age = (birth, today) => {
  if (!validDate(birth) || !validDate(today) || birth > today) return null;
  const [by, bm, bd] = birth.split('-').map(Number), [ty, tm, td] = today.split('-').map(Number);
  const months = (ty - by) * 12 + tm - bm - (td < bd ? 1 : 0);
  return { years: Math.floor(months / 12), months: months % 12 };
};

export function createPublicTrialDraft({ course = null, slot = null, today = '', policy=null } = {}) {
  const publicCourse = course ? Object.fromEntries(['id', 'courseName', 'category', 'level'].map(key => [key, text(course[key])])) : null;
  const publicSlot = slot ? {
    ...Object.fromEntries(['id', 'courseId', 'date', 'time'].map(key => [key, text(slot[key])])),
    duration: slot.duration,
    teacherNames: Array.isArray(slot.teacherNames) ? slot.teacherNames.filter(name => typeof name === 'string') : [],
    roomNames: Array.isArray(slot.roomNames) ? slot.roomNames.filter(name => typeof name === 'string') : [],
    ...Object.fromEntries(['trialEnabled', 'trialRemaining', 'trialStatus', 'trialVisible'].filter(key => Object.hasOwn(slot, key)).map(key => [key, slot[key]])),
  } : null;
  const state = { publicCourse, slot: publicSlot, today: text(today), step: 'details', draft: mergeDraft(), error: '', sourceStatus: 'ready', sourceMessage: '', capabilities: { submit: false },policy:policies.has(policy)?policy:null,busy:false,uncertain:false,stale:false,submitError:'',submission:null };
  return validSource(state) ? state : { ...state, sourceStatus: 'unavailable' };
}

function validation(draft, today) {
  if (Object.entries(limits).some(([key, limit]) => draft[key].length > limit)) return 'length';
  if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) return 'email';
  if (draft.dateOfBirth.trim()) {
    if (!validDate(draft.dateOfBirth)) return 'birth-date';
    if (!validDate(today)) return 'birth-context';
    if (draft.dateOfBirth > today) return 'birth-future';
  }
  if (!['', 'male', 'female', 'unspecified'].includes(draft.gender)) return 'gender';
  for (const [key, error] of [['localName','local-name-required'],['fullName','full-name-required'],['dateOfBirth','birth-required'],['gender','gender-required'],['whatsapp','whatsapp-required']]) {
    if (!draft[key].trim()) return error;
  }
  return '';
}
const received=state=>state?.submission?.outcome==='received'&&typeof state.submission.reference==='string'&&!!state.submission.reference.trim()&&state.submission.reference.length<=100;
const activePolicy=state=>state?.capabilities?.submit===true&&policies.has(state.policy)?state.policy:null;
export function publicTrialCanSubmit(state={}){
  return state.step==='review'&&state.capabilities?.submit===true&&policies.has(state.policy)&&!state.busy&&!state.stale&&!received(state)&&validSource(state)&&!validation(mergeDraft(state.draft),state.today)&&(state.uncertain===true||sourceStatus(state)==='ready');
}

export function advancePublicTrial(state = {}, command, values = {}) {
  if(state.busy||state.uncertain===true||received(state))return state;
  if (!['draft', 'review', 'back'].includes(command)) return state;
  const draft = mergeDraft(state.draft, values);
  if (command === 'draft') return { ...state, draft, error: '' };
  if (command === 'back') return { ...state, draft, step: 'details', error: '',stale:false,submitError:'' };
  const error = sourceStatus(state) === 'ready' ? validation(draft, state.today) : 'source';
  return { ...state, draft, step: error ? 'details' : 'review', error };
}

const labels = {
  localName: ['中文姓名', 'Chinese name'], fullName: ['英文姓名', 'English name'], dateOfBirth: ['出生日期', 'Date of birth'],
  gender: ['性別', 'Gender'], school: ['學校', 'School'], referrer: ['介紹人', 'Referrer'], parentName: ['家長姓名', 'Parent name'],
  whatsapp: ['WhatsApp', 'WhatsApp'], email: ['電郵', 'Email'], remark: ['備註', 'Remark'],
};
const errorLabels = {
  email: ['請輸入有效的電郵地址，或留空。', 'Enter a valid email address, or leave it blank.'],
  'birth-date': ['請輸入有效的出生日期，或留空。', 'Enter a valid date of birth, or leave it blank.'],
  'birth-future': ['出生日期不能晚於今天。', 'Date of birth cannot be in the future.'],
  'birth-context': ['暫時無法核對出生日期，請重新載入時段。', 'The date of birth cannot be checked yet. Please reload this time.'],
  gender: ['請選擇有效的性別選項。', 'Choose a valid gender option.'],
  'gender-required': ['請選擇性別。', 'Choose a gender option.'],
  'local-name-required': ['請填寫中文姓名。', 'Enter a Chinese name.'],
  'full-name-required': ['請填寫英文姓名。', 'Enter an English name.'],
  length: ['部分資料過長，請縮短後再核對。', 'Some entries are too long. Please shorten them before reviewing.'],
  source: ['暫時無法核對此時段，請重新載入。', 'This time cannot be checked yet. Please reload it.'],
  'name-required':['請填寫中文姓名或英文姓名。','Enter a Chinese or English name.'],
  'birth-required':['請填寫出生日期。','Enter a date of birth.'],
  'whatsapp-required':['請填寫 WhatsApp 聯絡號碼。','Enter a WhatsApp contact number.'],
  'contact-required':['請填寫 WhatsApp 或電郵作聯絡。','Enter a WhatsApp number or email address.'],
};
const genderLabels = { male: ['男', 'Male'], female: ['女', 'Female'], unspecified: ['不透露', 'Prefer not to say'] };
const fallbackEscape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const ageText = (state, t) => {
  const value = age(state.draft?.dateOfBirth, state.today);
  return value ? t(`${value.years} 歲 ${value.months} 個月`, `${value.years} years ${value.months} months`) : '';
};
const buttonMarkup = (command, label, { esc, primary = false, disabled = false, submit = false,icon=false,ariaLabel='' } = {}) => `<button type="${submit ? 'submit' : 'button'}" class="public-trial-button${primary ? ' public-trial-primary' : ''}${icon?' public-trial-close':''}" data-action="public-trial-command" data-command="${command}"${disabled ? ' disabled' : ''}${ariaLabel?` aria-label="${esc(ariaLabel)}"`:''}>${esc(label)}</button>`;

function sourceMarkup(state, { t, esc }) {
  const status = sourceStatus(state);
  if (status === 'ready') return '';
  const fallback = status === 'loading' ? t('正在載入此時段…', 'Loading this time…') : status === 'error' ? t('暫時未能更新此時段，請重試。', 'Could not refresh this time. Please try again.') : t('此時段已不可使用，請返回選擇其他時段。', 'This time is no longer available. Please choose another time.');
  return `<div class="public-trial-source" role="${status === 'loading' ? 'status' : 'alert'}"><p>${esc(text(state.sourceMessage).trim() ? state.sourceMessage : fallback)}</p>${status !== 'loading' ? buttonMarkup('retry', t('重新載入', 'Retry'), { esc,disabled:!!state.busy }) : ''}</div>`;
}

function summaryMarkup(state, { t, esc }) {
  if (!validSource(state)) return '';
  return `<section class="public-trial-context" aria-label="${esc(t('已選時段', 'Selected time'))}"><h3>${esc(state.publicCourse.courseName || t('課程', 'Course'))}</h3><p><time datetime="${esc(state.slot.date)}">${esc(state.slot.date)}</time> · ${esc(state.slot.time)} · ${esc(t(`${state.slot.duration} 分鐘`, `${state.slot.duration} minutes`))}</p><p>${esc(t('老師', 'Teachers'))}：${esc(state.slot.teacherNames?.filter(name => typeof name === 'string').join(t('、', ', ')) || '—')}</p></section>`;
}

function formField(key, state, { t, esc }) {
  const required = requiredFields.includes(key);
  const value = text(state.draft?.[key]), label = t(...labels[key]);
  const fieldErrors = {localName:['local-name-required'],fullName:['full-name-required'],whatsapp:['whatsapp-required'],email:['email'],dateOfBirth:['birth-date','birth-future','birth-context','birth-required'],gender:['gender','gender-required']};
  const invalid = fieldErrors[key]?.includes(state.error), described = invalid ? 'public-trial-'+key+'-error' : '';
  const shared = `id="public-trial-${key}" name="${key}"${required?' aria-required="true" required':''}${invalid?' aria-invalid="true"':''}${described?` aria-describedby="${described}"`:''}${state.busy||state.uncertain===true?' disabled':''}`;
  let control;
  if (key === 'gender') control = `<select ${shared}><option value=""${value === '' ? ' selected' : ''}>${esc(t('請選擇', 'Choose'))}</option>${Object.entries(genderLabels).map(([option, names]) => `<option value="${option}"${value === option ? ' selected' : ''}>${esc(t(...names))}</option>`).join('')}</select>`;
  else if (key === 'remark') control = `<textarea ${shared} maxlength="2000" rows="4">${esc(value)}</textarea>`;
  else control = `<input ${shared} type="${key === 'dateOfBirth' ? 'date' : key === 'email' ? 'email' : 'text'}" value="${esc(value)}"${limits[key] ? ` maxlength="${limits[key]}"` : ''}${key === 'dateOfBirth' && validDate(state.today) ? ` max="${esc(state.today)}"` : ''}>`;
  const displayedAge = key === 'dateOfBirth' ? ageText(state, t) : '';
  const correction = invalid ? `<small id="public-trial-${key}-error" class="public-trial-field-error" role="alert">${esc(t(...errorLabels[state.error]))}</small>` : '';
  return `<label class="public-trial-field${key === 'remark' ? ' public-trial-wide' : ''}" for="public-trial-${key}"><span>${esc(label)}${required?' <span class="public-trial-required" aria-hidden="true">*</span>':''}</span>${control}${displayedAge ? `<small class="public-trial-age">${esc(displayedAge)} · ${esc(t('截至', 'As of'))} ${esc(state.today)}</small>` : ''}${correction}</label>`;
}

function reviewMarkup(state, { t, esc }) {
  const rows = fields.map(key => {
    const value = text(state.draft?.[key]), shown = key === 'gender' && Object.hasOwn(genderLabels, value) ? t(...genderLabels[value]) : value;
    return `<div><dt>${esc(t(...labels[key]))}</dt><dd>${shown ? esc(shown) : '—'}</dd></div>`;
  });
  const displayedAge = ageText(state, t);
  if (displayedAge) rows.splice(3, 0, `<div><dt>${esc(t('年齡', 'Age'))}</dt><dd>${esc(displayedAge)}<small>${esc(t('截至', 'As of'))} ${esc(state.today)}</small></dd></div>`);
  return `<dl class="public-trial-summary">${rows.join('')}</dl>`;
}

export function publicTrialMarkup(state = {}, { t = (_zh, en) => en, esc = fallbackEscape } = {}) {
  const success=received(state),busy=!!state.busy,uncertain=state.uncertain===true,review=state.step==='review',ready=sourceStatus(state)==='ready',title=success?t('已收到試課申請','Application received'):review?t('核對試課資料','Review trial details'):t('試課資料','Trial details');
  const inlineErrors=['email','birth-date','birth-future','birth-context','gender','gender-required','local-name-required','full-name-required','name-required','birth-required','whatsapp-required','contact-required'],error=Object.hasOwn(errorLabels,state.error)&&!inlineErrors.includes(state.error)?errorLabels[state.error]:null,context={t,esc};
  const message=uncertain?t('暫未確認提交結果，你填寫的資料已保留。','Submission has not been confirmed. Your details are retained.'):state.stale?t('所選時段資料已更新。請返回修改資料，再重新核對。','The selected time changed. Return to edit and review the details again.'):text(state.submitError);
  const feedback=`<p id="public-trial-submit-error" class="public-trial-error public-trial-submit-error" role="alert" tabindex="-1"${!success&&message?'':' hidden'}>${esc(!success?message:'')}</p>`;
  const notice=activePolicy(state)?review?`<p class="public-trial-note">${esc(t('申請尚未提交。','This application has not been submitted.'))}</p>`:'':`<p class="public-trial-note">${esc(t('試課申請暫未開放，可先填寫及核對資料。','Trial applications are not yet open. You can fill in and review the details first.'))}</p>`;
  const body=success?`${summaryMarkup(state,context)}<section id="public-trial-success" class="public-trial-received" role="status" tabindex="-1"><p>${esc(t('我們已收到申請，將會聯絡你跟進。','We have received your application and will contact you.'))}</p><dl><div><dt>${esc(t('申請編號','Application reference'))}</dt><dd>${esc(state.submission.reference)}</dd></div></dl></section>`:`${summaryMarkup(state,context)}${notice}${uncertain?'':sourceMarkup(state,context)}${review?reviewMarkup(state,context):`<section class="public-trial-field-group" aria-labelledby="public-trial-required-heading"><h3 id="public-trial-required-heading">${esc(t('必填資料','Required information'))}</h3><div class="public-trial-fields">${requiredFields.map(key=>formField(key,state,context)).join('')}</div></section><section class="public-trial-field-group" aria-labelledby="public-trial-optional-heading"><h3 id="public-trial-optional-heading">${esc(t('選填資料','Optional information'))}</h3><div class="public-trial-fields">${fields.filter(key=>!requiredFields.includes(key)).map(key=>formField(key,state,context)).join('')}</div></section>`}${error?`<p id="public-trial-error" class="public-trial-error" role="alert" tabindex="-1">${esc(t(...error))}</p>`:''}`;
  const footer=success?buttonMarkup('close',t('返回課表','Return to timetable'),{esc}):review?`${buttonMarkup('back',t('修改資料','Edit details'),{esc,disabled:busy||uncertain})}${buttonMarkup('close',t('關閉','Close'),{esc,disabled:busy})}${buttonMarkup('submit',busy?t('正在提交…','Submitting…'):uncertain?t('重試提交','Retry submission'):t('提交申請','Submit application'),{esc,primary:true,disabled:!publicTrialCanSubmit(state)})}`:`${buttonMarkup('close',t('取消','Cancel'),{esc,disabled:busy})}${buttonMarkup('review',t('下一步：核對資料','Next: review details'),{esc,primary:true,disabled:!ready||busy||uncertain,submit:true})}`;
  const reading=review||success;
  return `<div class="modal public-trial-modal" role="dialog" aria-modal="true" aria-labelledby="public-trial-title"><div class="dialog public-trial-dialog" tabindex="-1"><header class="public-trial-header"><h2 id="public-trial-title">${esc(title)}</h2>${buttonMarkup('close','×',{esc,disabled:busy,icon:true,ariaLabel:t('關閉','Close')})}</header>${feedback}${reading?`<div class="public-trial-content" aria-busy="${busy}">`:`<form id="public-trial-form" novalidate aria-busy="${busy}">`}<div id="public-trial-body" class="public-trial-body" tabindex="0" aria-busy="${sourceStatus(state)==='loading'||busy}">${body}</div><footer class="public-trial-footer">${review&&!success?`<p class="public-trial-contact-note">${esc(t('提交試堂申請後，老師會聯絡你跟進安排。','A teacher will contact you after you submit your trial application.'))}</p>`:''}${footer}</footer>${reading?'</div>':'</form>'}</div></div>`;
}
