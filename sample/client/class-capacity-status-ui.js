const effectiveStatus = current => current?.effectiveStatus === 'full' || current?.effectiveStatus === 'available' ? current.effectiveStatus : 'unknown';
const statusLabel = (status, t) => status === 'full' ? t('已滿', 'Full') : status === 'available' ? t('尚有名額', 'Available') : t('未知', 'Unknown');
const count = value => Number.isSafeInteger(value) && value >= 0 ? String(value) : '—';
const text = value => typeof value === 'string' && value.trim() ? value : '—';

export function classCapacityStatusMarkup(current, { t, esc, compact = false }) {
  const status = effectiveStatus(current), label = statusLabel(status, t), description = t(`班額：${label}`, `Class capacity: ${label}`);
  return `<span class="class-capacity-status-badge${compact ? ' class-capacity-status-compact' : ''}" data-class-status="${status}" role="img" aria-label="${esc(description)}" title="${esc(description)}"><span class="class-capacity-status-dot" aria-hidden="true"></span><span class="${compact ? 'class-status-sr-only' : 'class-capacity-status-label'}" aria-hidden="true">${esc(label)}</span></span>`;
}

export function classCapacityStatusEditorMarkup({ current = null, lesson = null, busy = false, error = '' } = {}, { t, esc }) {
  const validIdentity = typeof current?.scheduleId === 'string' && current.scheduleId.trim() && Number.isSafeInteger(current.sequence) && current.sequence >= 1;
  const manual = current?.manualStatus === 'full' || current?.manualStatus === 'available' ? current.manualStatus : '';
  const fields = [
    [t('課程', 'Course'), text(lesson?.courseName)],
    [t('指定課堂', 'Selected lesson'), validIdentity ? t(`第 ${current.sequence} 堂`, `Lesson #${current.sequence}`) : '—'],
    [t('日期', 'Date'), text(current?.date || lesson?.date)],
    [t('時間', 'Time'), text(current?.time || lesson?.time)],
    [t('時長（分鐘）', 'Duration (minutes)'), count(current?.duration ?? lesson?.duration)],
    [t('班容量', 'Class capacity'), count(current?.classCapacity)],
    [t('已確認人數', 'Confirmed occupancy'), count(current?.classOccupied)],
  ];
  const choices = [
    ['full', t('已滿（Full）', 'Full'), t('手動標記這一堂的班額已滿。', 'Manually mark this lesson as full.')],
    ['available', t('尚有名額（Available）', 'Available'), t('手動標記這一堂尚有名額。', 'Manually mark this lesson as available.')],
    ['', t('清除手動標記', 'Clear manual status'), t('恢復按已確認學生人數判斷；目前人數資料未提供，清除後顯示未知。', 'Restore assessment by confirmed students. Occupancy data is currently unavailable; clearing displays Unknown.')],
  ];
  return `<div class="modal class-status-modal" role="dialog" aria-modal="true" aria-labelledby="class-capacity-status-title" aria-describedby="class-capacity-status-note"><div class="dialog class-status-editor-dialog" tabindex="-1"><header class="class-status-header"><h2 id="class-capacity-status-title">${esc(t('班額狀態', 'Class capacity status'))}</h2><button type="button" class="class-status-close" data-action="class-status-cancel" aria-label="${esc(t('關閉', 'Close'))}"${busy ? ' disabled' : ''}>×</button></header>
  <form id="class-capacity-status-editor" data-schedule-id="${esc(current?.scheduleId || '')}" data-sequence="${esc(current?.sequence ?? '')}" data-version="${esc(current?.version ?? 0)}" data-source-version="${esc(current?.sourceVersion ?? '')}" aria-busy="${busy}"><div class="class-status-body"><p id="class-capacity-status-note" class="class-status-note">${esc(t('只修改以下一堂的班額狀態。', 'Changes the capacity status of this lesson only.'))}</p><dl class="class-status-facts">${fields.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><div class="class-status-current"><span>${esc(t('目前狀態', 'Current status'))}</span>${classCapacityStatusMarkup(current, { t, esc })}</div>
  <fieldset class="class-status-options"${busy || !validIdentity ? ' disabled' : ''}><legend>${esc(t('手動班額標記', 'Manual capacity status'))}</legend>${choices.map(([value, label, description], index) => `<label class="class-status-option" for="class-status-choice-${index}"><input id="class-status-choice-${index}" type="radio" name="manualStatus" value="${value}"${manual === value ? ' checked' : ''}><span><strong>${esc(label)}</strong><small>${esc(description)}</small></span></label>`).join('')}</fieldset><p class="class-status-notice">${esc(t('班額狀態供管理參考；報名仍需通過名額和資格檢查。', 'Capacity status guides management. Enrolment still requires capacity and eligibility checks.'))}</p><p id="class-capacity-status-error" class="class-status-error" role="alert">${esc(error)}</p>${busy ? `<p class="class-status-loading" role="status">${esc(t('正在儲存…', 'Saving…'))}</p>` : ''}</div>
  <footer class="class-status-footer"><button type="button" class="ghost" data-action="class-status-cancel"${busy ? ' disabled' : ''}>${esc(t('取消', 'Cancel'))}</button><button type="submit" id="class-capacity-status-save"${busy || !validIdentity ? ' disabled' : ''}>${esc(t('儲存', 'Save'))}</button></footer></form></div></div>`;
}
