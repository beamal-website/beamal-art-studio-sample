import { publicCourseDetailsMarkup } from './availability-ui.js';

export function availabilityPublicPreviewMarkup(
  { course = null, slots = [], from = '', to = '', loading = false, error = '', dateError = '', dateInput } = {},
  { t, esc },
) {
  const failure = typeof error === 'string' ? error : '';
  const invalidDate = typeof dateError === 'string' ? dateError : '';
  const busy = loading === true && !failure && !invalidDate;
  const hasCourse = course && typeof course.id === 'string' && course.id.trim();
  const unavailable = !busy && !failure && !invalidDate && !hasCourse
    ? t('課程資料暫未提供。', 'Course details are unavailable.') : '';
  const shownCourse = loading !== true && !failure && hasCourse ? course : null;
  const projection = publicCourseDetailsMarkup({
    course: shownCourse,
    slots: shownCourse && !invalidDate && Array.isArray(slots) ? slots : [],
    from, to, dateInput, loading: busy, error: failure || unavailable, dateError: invalidDate,
  }, { t, esc, managementPreview: true });
  return `<div class="modal availability-modal availability-preview-modal" role="dialog" aria-modal="true" aria-labelledby="availability-preview-title">
    <div class="dialog availability-preview-dialog" tabindex="-1">
      <header class="availability-header">
        <h2 id="availability-preview-title">${esc(t('公開課表', 'Public timetable'))}</h2>
        <button type="button" class="availability-close" data-action="availability-preview-close" aria-label="${esc(t('關閉', 'Close'))}">×</button>
      </header>
      <div class="availability-body availability-preview-body">${projection}</div>
      <footer class="availability-footer">
        <button type="button" class="ghost" data-action="availability-preview-refresh"${busy ? ' disabled' : ''}>${esc(t('重新整理', 'Refresh'))}</button>
        <button type="button" data-action="availability-preview-close">${esc(t('關閉', 'Close'))}</button>
      </footer>
    </div>
  </div>`;
}
