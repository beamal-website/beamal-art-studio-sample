import { ATTACHMENT_ACCEPT } from './attachment-client.js';

const sizeText = size => size >= 1_000_000 ? `${(size / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.ceil(size / 1000))} KB`;
const previewUrl = (materialId, id) => `/api/materials/${encodeURIComponent(materialId)}/attachments/${encodeURIComponent(id)}`;

function links(materialId, attachment, { t, esc }, canDownload) {
  const url = previewUrl(materialId, attachment.id), viewer = `/attachment-preview.html?materialId=${encodeURIComponent(materialId)}&attachmentId=${encodeURIComponent(attachment.id)}`, name = esc(attachment.name);
  return `<div class="material-file-links"><a href="${esc(viewer)}" target="_blank" rel="noopener noreferrer" aria-label="${t('預覽', 'Preview')} ${name}">${t('預覽', 'Preview')}</a>${canDownload ? `<a href="${esc(url)}?download=1" download aria-label="${t('下載', 'Download')} ${name}">${t('下載', 'Download')}</a>` : ''}</div>`;
}

export function materialAttachmentDrafts(entries, helpers) {
  const { t, esc } = helpers;
  if (!entries.length) return `<li class="material-no-files">${t('尚未選擇檔案', 'No files selected')}</li>`;
  return entries.map(entry => {
    const percent = Math.max(0, Math.min(100, entry.percent || 0));
    const label = entry.issue ? t('不能上載，請移除或替換', 'Cannot upload; remove or replace') : entry.status === 'uploading' ? percent === 100 ? t('正在核對檔案…', 'Checking file…') : t(`上載中 ${percent}%`, `Uploading ${percent}%`) : entry.status === 'ready' ? entry.existingMaterialId ? t('已儲存', 'Saved') : t('已上載，等待儲存教材', 'Uploaded; waiting to save material') : entry.status === 'error' ? t('未上載；再次儲存可重試', 'Not uploaded; save again to retry') : t('儲存時上載', 'Uploads when you save');
    return `<li class="material-file-row"><div class="material-file-info"><strong>${esc(entry.name)}</strong><small>${sizeText(entry.size)} · <span role="status">${label}</span></small>${entry.status === 'uploading' ? `<div class="material-file-progress" role="progressbar" aria-label="${t('上載', 'Upload')} ${esc(entry.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div>` : ''}${entry.error ? `<p class="error">${esc(entry.error)}</p>` : ''}${entry.existingMaterialId && entry.result ? links(entry.existingMaterialId, entry.result, helpers, true) : ''}</div><button type="button" class="ghost" data-action="material-remove-attachment" data-attachment-id="${esc(entry.localId)}" aria-label="${t('移除', 'Remove')} ${esc(entry.name)}" ${entry.status === 'uploading' ? 'disabled' : ''}>×</button></li>`;
  }).join('');
}

export function materialAttachmentEditor(entries, helpers) {
  const { t } = helpers;
  return `<div id="material-file-dropzone" class="material-attachment-zone"><input type="file" id="material-attachment-input" multiple accept="${ATTACHMENT_ACCEPT}" hidden><button type="button" class="portal-secondary" data-action="material-choose-files">${t('選擇檔案', 'Choose files')}</button><p>${t('選擇檔案或拖放至此；儲存教材時才上載。', 'Choose files or drop them here. Files upload when you save.')}</p><small>PNG, JPG, GIF, MP4, AVI, MOV, MP3, WAV, M4A, PDF · ${t('每檔最多 50 MB，最多 20 檔', 'Up to 50 MB per file, 20 files')}</small></div><ul id="material-attachment-drafts" class="material-file-list" aria-label="${t('教材附件', 'Material attachments')}">${materialAttachmentDrafts(entries, helpers)}</ul>`;
}

export function materialAttachmentList(material, helpers, { canDownload = true } = {}) {
  const { t, esc } = helpers;
  return !(material.attachments || []).length ? '' : `<h3>${t('附件', 'Attachments')}</h3><ul class="material-file-list material-saved-files">${material.attachments.map(item => `<li class="material-file-row"><div class="material-file-info"><strong>${esc(item.name)}</strong><small>${sizeText(item.size)}</small>${links(material.id, item, helpers, canDownload)}</div></li>`).join('')}</ul>`;
}
