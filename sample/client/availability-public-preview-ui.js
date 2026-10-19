import {publicTimetableMarkup} from './public-timetable-ui.js';
import { publicCourseDetailsMarkup, availabilityPublicSettingsFormMarkup } from './availability-ui.js';

export function availabilityPublicPreviewMarkup(
  { mixed = false, courses = [], courseFilter = '', course = null, slots = [], from = '', to = '', rangeDays = 7, slotType = 'all', loading = false, error = '', dateError = '', dateInput, settings, settingsDraft, settingsLoading=false, settingsSaving=false, settingsError='', settingsNotice='' } = {},
  { t, esc },
) {
  const failure = typeof error === 'string' ? error : '';
  const invalidDate = typeof dateError === 'string' ? dateError : '';
  const busy = loading === true && !failure && !invalidDate;
  const hasCourse = course && typeof course.id === 'string' && course.id.trim();
  const unavailable = !busy && !failure && !invalidDate && !hasCourse
    ? t('課程資料暫未提供。', 'Course details are unavailable.') : '';
  const shownCourse = loading !== true && !failure && hasCourse ? course : null;
  const refreshButton = `<span class="availability-preview-refresh-control"><button type="button" class="availability-preview-refresh-icon" data-action="availability-preview-refresh" aria-label="${esc(t('重新整理','Refresh'))}" aria-describedby="availability-preview-refresh-tip"${busy||settingsSaving?' disabled':''}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7v5h-5"/><path d="M19.1 7A8 8 0 1 0 20 16M20 12l-4-4"/></svg></button><span class="availability-preview-refresh-tooltip" id="availability-preview-refresh-tip" role="tooltip">${esc(t('重新整理','Refresh'))}</span></span>`;
  const projection = mixed ? `<section class="availability-parent-preview" aria-label="${esc(t('家長視角預覽（只供查看）','Parent view preview (view only)'))}">${refreshButton}${publicTimetableMarkup({courses:loading||failure?[]:courses,courseFilter,slots:loading||failure||invalidDate?[]:slots,from,to,rangeDays,slotType,loading:busy,error:failure,dateError:invalidDate,dateInput},{t,esc,trialPreview:true,staticPreview:true})}</section>` : publicCourseDetailsMarkup({
    course: shownCourse,
    slots: shownCourse && !invalidDate && Array.isArray(slots) ? slots : [],
    from, to, rangeDays, slotType, dateInput, loading: busy, error: failure || unavailable, dateError: invalidDate,
  }, { t, esc, managementPreview: true });
  const settingsSection=settings===undefined?'':`<section class="availability-preview-settings" aria-labelledby="availability-preview-settings-title"><h3 id="availability-preview-settings-title">${esc(t('設定','Settings'))}</h3><p class="availability-note">${esc(t('以下設定適用於所有課程的公開課表。','These settings apply to the public timetable for all courses.'))}</p>${settingsLoading?`<p role="status">${esc(t('正在載入設定…','Loading settings…'))}</p>`:settings?availabilityPublicSettingsFormMarkup({settings:settingsDraft||settings,busy:settingsSaving,error:settingsError,embedded:true},{t,esc}):''}${settingsError&&!settings?`<p class="availability-error" role="alert">${esc(settingsError)}</p>`:''}${settingsError?`<button type="button" class="ghost" data-action="availability-preview-settings-reload">${esc(t('重新載入設定','Reload settings'))}</button>`:''}${settingsNotice?`<p role="status">${esc(settingsNotice)}</p>`:''}</section>`;
  return `<div class="modal availability-modal availability-preview-modal" role="dialog" aria-modal="true" aria-labelledby="availability-preview-title">
    <div class="dialog availability-preview-dialog" tabindex="-1">
      <header class="availability-header">
        <h2 id="availability-preview-title">${esc(t('公開課表', 'Public timetable'))}</h2>
        ${mixed?'':refreshButton}
        <button type="button" class="availability-close" data-action="availability-preview-close" aria-label="${esc(t('關閉', 'Close'))}">×</button>
      </header>
      <div class="availability-body availability-preview-body">${projection}${settingsSection}</div>

    </div>
  </div>`;
}
