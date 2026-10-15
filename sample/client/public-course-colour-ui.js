export function publicCourseColour(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;
}

export function coursePublicColourFields(course, {t, esc}) {
  const colour = publicCourseColour(course?.publicColor);
  return `<fieldset class="course-public-colour"><legend>${esc(t('公開課程顏色', 'Public course colour'))}</legend>
    <input type="hidden" name="publicColorSetting" value="1">
    <label class="course-public-colour-enabled" for="course-public-colour-enabled"><input id="course-public-colour-enabled" type="checkbox" name="usePublicColor"${colour ? ' checked' : ''} aria-describedby="course-public-colour-note"><span>${esc(t('使用課程顏色', 'Use a course colour'))}</span></label>
    <p data-public-colour-state>${esc(colour ? t('已選擇顏色', 'Colour selected') : t('未設定', 'Not set'))}</p>
    <label class="course-public-colour-picker" for="course-public-colour"${colour ? '' : ' hidden'}><span>${esc(t('選擇顏色', 'Choose a colour'))}</span><input id="course-public-colour" type="color" name="publicColor" value="${colour || '#27777b'}"${colour ? '' : ' disabled'}></label>
    <p id="course-public-colour-note">${esc(t('用於公開課表，不影響老師顏色或名額。取消勾選可清除。', 'Used on the public timetable; does not change teacher colours or places. Uncheck to clear.'))}</p>
  </fieldset>`;
}

export function coursePublicColourPayload(data, {t}) {
  if (data.publicColorSetting === '1' && data.usePublicColor !== 'on') return {publicColor: null};
  if (data.publicColorSetting === undefined && !Object.hasOwn(data, 'publicColor')) return {};
  if (data.publicColor === null && data.publicColorSetting === undefined) return {publicColor: null};
  const colour = publicCourseColour(data.publicColor);
  if (!colour) throw new Error(t('請選擇有效的課程顏色，或取消勾選以清除。', 'Choose a valid course colour, or uncheck to clear it.'));
  return {publicColor: colour};
}

export function publicCourseColourSwatch(course, {esc}) {
  const colour = publicCourseColour(course?.publicColor);
  return colour ? `<span class="public-course-colour-swatch" style="--public-course-colour:${esc(colour)}" aria-hidden="true"></span>` : '';
}
