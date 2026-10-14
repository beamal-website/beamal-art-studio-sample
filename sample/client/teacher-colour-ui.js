const neutralColour = '#27777b';
const formalTeacherId = value => typeof value === 'string' && value.trim().length > 0;

export function representativeColour(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;
}

export function timetableTeacherColour(slot, fallback = neutralColour) {
  const ids = Array.isArray(slot?.teacherIds) ? slot.teacherIds : [];
  const colours = Array.isArray(slot?.teacherColors) ? slot.teacherColors : [];
  const colour = ids.length === 1 && formalTeacherId(ids[0]) ? representativeColour(colours[0]) : null;
  return colour || representativeColour(fallback) || neutralColour;
}

export function teacherColourMarkersMarkup(slot, { t, esc }) {
  const ids = Array.isArray(slot?.teacherIds) ? slot.teacherIds : [];
  const colours = Array.isArray(slot?.teacherColors) ? slot.teacherColors : [];
  const names = Array.isArray(slot?.teacherNames) ? slot.teacherNames : [];
  const samples = ids.map((id, index) => {
    const colour = formalTeacherId(id) ? representativeColour(colours[index]) : null;
    if (!colour) return '';
    const name = typeof names[index] === 'string' && names[index].trim() ? names[index] : t('老師名稱暫未提供', 'Teacher name unavailable');
    return `<span class="teacher-colour-marker" data-teacher-id="${esc(id)}"><span class="teacher-colour-swatch" style="--teacher-colour:${colour}" aria-hidden="true"></span><span class="teacher-colour-name">${esc(name)}</span><span class="teacher-colour-sr-only">${esc(t(`老師代表色 ${colour}`, `Representative colour ${colour}`))}</span></span>`;
  }).filter(Boolean).join('');
  return samples ? `<span class="teacher-colour-markers" aria-label="${esc(t('授課老師代表色', 'Teaching teacher colours'))}">${samples}</span>` : '';
}
