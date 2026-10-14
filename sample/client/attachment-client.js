export const ATTACHMENT_LIMIT = 50_000_000;
export const ATTACHMENT_ACCEPT = '.png,.jpg,.jpeg,.gif,.mp4,.avi,.mov,.mp3,.wav,.m4a,.pdf';
const types = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', mp4: 'video/mp4', avi: 'video/x-msvideo', mov: 'video/quicktime', mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', pdf: 'application/pdf' };
const extension = file => String(file?.name || '').split('.').at(-1).toLowerCase();

export function attachmentIssue(file) {
  if (!file || typeof file.name !== 'string' || !file.name.trim() || [...file.name].length > 255 || /[\x00-\x1f\x7f/\\]/.test(file.name)) return 'name';
  if (!Number.isSafeInteger(file.size) || file.size <= 0) return 'empty';
  if (file.size > ATTACHMENT_LIMIT) return 'size';
  return types[extension(file)] ? '' : 'type';
}

export class AttachmentUploadError extends Error {
  constructor(message, status = 0, code = 'UPLOAD_CONNECTION_FAILED') { super(message); this.name = 'AttachmentUploadError'; this.status = status; this.code = code; }
}

// XHR exposes upload progress. Files are transferred as binary data, never as
// base64 JSON or browser storage, and every retry keeps its operation key.
export function uploadMaterialAttachment(courseId, file, { csrfToken = '', operationKey, signal, onProgress = () => {}, createRequest = () => new XMLHttpRequest() } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new AttachmentUploadError('Upload cancelled.', 0, 'UPLOAD_CANCELLED')); return; }
    if (attachmentIssue(file)) { reject(new AttachmentUploadError('Choose a supported file up to 50 MB.', 400, 'INVALID_ATTACHMENT')); return; }
    let request, settled = false;
    const cancel = () => request?.abort();
    const finish = (error, data) => { if (settled) return; settled = true; signal?.removeEventListener('abort', cancel); error ? reject(error) : resolve(data); };
    try {
      request = createRequest();
      request.open('POST', `/api/courses/${encodeURIComponent(courseId)}/material-uploads`);
      request.withCredentials = true;
      request.timeout = 180_000;
      request.setRequestHeader('Accept', 'application/json');
      request.setRequestHeader('Content-Type', types[extension(file)]);
      request.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
      request.setRequestHeader('X-CSRF-Token', csrfToken);
      if (operationKey) request.setRequestHeader('Idempotency-Key', operationKey);
      request.upload.onprogress = event => {
        if (settled || signal?.aborted) return;
        const total = event.lengthComputable && event.total > 0 ? event.total : file.size;
        const loaded = Math.max(0, Math.min(total, event.loaded || 0));
        onProgress({ loaded, total, percent: Math.round(loaded / total * 100) });
      };
      request.onload = () => {
        let data;
        try { data = JSON.parse(request.responseText); }
        catch { finish(new AttachmentUploadError('The upload service did not return a valid result.', request.status, 'INVALID_UPLOAD_RESPONSE')); return; }
        if (request.status < 200 || request.status >= 300) { finish(new AttachmentUploadError(data.error?.message || 'The file could not be uploaded.', request.status, data.error?.code)); return; }
        if (!data.upload || typeof data.upload.id !== 'string' || !data.upload.id) { finish(new AttachmentUploadError('The upload was not confirmed.', request.status, 'INVALID_UPLOAD_RESPONSE')); return; }
        finish(null, data);
      };
      request.onabort = () => finish(new AttachmentUploadError('Upload cancelled.', 0, 'UPLOAD_CANCELLED'));
      request.onerror = () => finish(new AttachmentUploadError('The upload connection was interrupted. Please retry.'));
      request.ontimeout = () => finish(new AttachmentUploadError('The upload timed out. Please retry.', 0, 'UPLOAD_TIMEOUT'));
      signal?.addEventListener('abort', cancel, { once: true });
      request.send(file);
    } catch { finish(new AttachmentUploadError('The upload could not start. Please retry.')); }
  });
}
