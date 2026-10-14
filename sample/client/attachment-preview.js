const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 200 && !['.', '..'].includes(value) && !/[\p{Cc}]/u.test(value);
export function parsePreviewIds(search) {
  const params = new URLSearchParams(search);
  const materialId = params.get('materialId'), attachmentId = params.get('attachmentId');
  return params.getAll('materialId').length === 1 && params.getAll('attachmentId').length === 1 && validId(materialId) && validId(attachmentId) ? { materialId, attachmentId } : null;
}
export const attachmentApiPath = (materialId, attachmentId) => `/api/materials/${encodeURIComponent(materialId)}/attachments/${encodeURIComponent(attachmentId)}`;
export const previewKind = type => type === 'application/pdf' ? 'pdf' : /^image\/(png|jpeg|gif)$/.test(type) ? 'image' : /^audio\/(mpeg|wav|x-m4a)$/.test(type) ? 'audio' : /^video\/(mp4|quicktime|vnd\.avi)$/.test(type) ? 'video' : 'unsupported';
export const canDownloadAttachment = (user, material) => !!user && (['admin', 'teacher'].includes(user.role) || user.role === 'student' && material?.studentDownload === true);

const copy = {
  title: ['附件預覽', 'Attachment preview'], back: ['返回課程', 'Back to course'], download: ['下載附件', 'Download attachment'], retry: ['重新載入', 'Try again'], previous: ['上一頁', 'Previous page'], next: ['下一頁', 'Next page'], text: ['本頁文字', 'Text on this page'], login: ['登入', 'Sign in'],
  'loading-auth': ['正在確認附件權限…', 'Checking attachment access…'], 'loading-preview': ['正在載入預覽…', 'Loading preview…'],
  'signed-out': ['請先登入，再重新開啟附件。', 'Sign in before opening this attachment.'], 'identity-changed': ['登入身份已改變。請重新載入以確認此身份的附件權限。', 'Your signed-in account changed. Reload to check attachment access for this account.'],
  unavailable: ['此附件已移除，或你目前沒有閱讀權限。', 'This attachment was removed or is not available to your account.'], 'invalid-link': ['附件連結不完整，請從課程重新開啟附件。', 'This attachment link is incomplete. Open the attachment again from its course.'],
  'connection-error': ['暫時無法確認附件權限，預覽已清空。請重新載入。', 'Attachment access could not be checked. The preview was cleared. Please try again.'],
  'preview-error': ['無法預覽此檔案。請重新載入；如有下載權限，也可下載後開啟。', 'This file could not be previewed. Try again, or download it if downloads are available to your account.'],
  'password-protected': ['此 PDF 需要密碼，暫不支援在這裡開啟。', 'This PDF requires a password and cannot be opened here.'],
  unsupported: ['這個檔案格式暫時無法在瀏覽器預覽。', 'This file format cannot be previewed in this browser.'], ready: ['', ''],
};
export const previewText = (language, key) => (copy[key] || copy['preview-error'])[language === 'en' ? 1 : 0];

function lazyPdfFactory(settings) {
  let renderer, destroyed = false;
  const ready = import('./pdf-preview.js').then(module => {
    if (destroyed) throw new DOMException('Preview closed.', 'AbortError');
    renderer = module.createPdfPreview(settings);
    return renderer.ready;
  });
  return { ready, async renderPage(number) { await ready; if (!destroyed) return renderer.renderPage(number); }, destroy() { destroyed = true; return renderer?.destroy(); } };
}

export function createAttachmentPreview({ materialId, attachmentId, api, view, pdfFactory = lazyPdfFactory, scheduleInterval = setInterval, cancelInterval = clearInterval }) {
  let destroyed = false, timer, sequence = 0, scope = 0, renderSequence = 0, activeCheck, identity = '', blockedIdentity = false;
  let renderer, mediaCleanup, fingerprint = '', pageNumber = 1, pageCount = 0, blockedFileStatus = '';
  const clear = () => {
    scope++; renderSequence++; fingerprint = ''; pageCount = 0;
    const old = renderer; renderer = null;
    Promise.resolve(old?.destroy()).catch(() => {});
    mediaCleanup?.(); mediaCleanup = null;
    view.clearPrivate();
  };
  const current = epoch => !destroyed && epoch === scope;
  const statusFor = error => error?.status === 401 ? 'signed-out' : [403, 404].includes(error?.status) ? 'unavailable' : 'connection-error';
  async function render(number) {
    if (destroyed || !renderer || !pageCount) return;
    const epoch = scope, version = ++renderSequence, target = renderer;
    pageNumber = Math.max(1, Math.min(pageCount, number));
    view.showPdfControls({ pageNumber, pageCount, busy: true });
    try {
      await target.renderPage(pageNumber);
      if (current(epoch) && version === renderSequence) { view.showStatus('ready'); view.showPdfControls({ pageNumber, pageCount, busy: false }); }
    } catch (error) {
      if (!current(epoch) || version !== renderSequence) return;
      await fileFailed(error);
    }
  }
  async function fileFailed(error) {
    clear();
    blockedFileStatus = [401, 403, 404].includes(error?.status) ? 'unavailable' : error?.code === 'password-protected' ? 'password-protected' : 'preview-error';
    await check({ force: true });
  }
  async function showFile(user, material, attachment) {
    const fileUrl = attachmentApiPath(materialId, attachmentId), canDownload = canDownloadAttachment(user, material);
    const nextFingerprint = JSON.stringify([user.id, user.role, attachment.id, attachment.name, attachment.mimeType, attachment.size, attachment.createdAt]);
    if (fingerprint === nextFingerprint) { view.showMetadata({ user, material, attachment, fileUrl, canDownload, downloadUrl: canDownload ? `${fileUrl}?download=1` : null }); return; }
    clear(); fingerprint = nextFingerprint;
    view.showMetadata({ user, material, attachment, fileUrl, canDownload, downloadUrl: canDownload ? `${fileUrl}?download=1` : null });
    const epoch = scope, kind = previewKind(attachment.mimeType);
    if (kind === 'unsupported') { view.showStatus('unsupported'); return; }
    view.showStatus('loading-preview');
    if (kind !== 'pdf') {
      mediaCleanup = view.showMedia({ kind, url: fileUrl, attachment, onError: async () => { if (current(epoch)) await fileFailed({ nativeMedia: true }); } });
      return;
    }
    try {
      renderer = pdfFactory({ url: fileUrl, canvas: view.canvas, width: view.width, pixelRatio: view.pixelRatio, onText: text => { if (current(epoch)) view.showPdfText(text); } });
      const target = renderer, count = await target.ready;
      if (!current(epoch) || target !== renderer) return;
      if (!Number.isSafeInteger(count) || count < 1) throw new Error('PDF has no pages.');
      pageCount = count; await render(pageNumber);
    } catch (error) {
      if (!current(epoch)) return;
      await fileFailed(error);
    }
  }
  async function check({ force = false } = {}) {
    if (destroyed || activeCheck && !force) return;
    activeCheck?.abort();
    if (force) clear();
    const request = new AbortController(), version = ++sequence;
    activeCheck = request;
    const winning = () => !destroyed && version === sequence;
    try {
      const session = await api.session({ signal: request.signal });
      if (!winning()) return;
      const user = session?.user;
      if (!user || typeof user.id !== 'string' || !['admin', 'teacher', 'student'].includes(user.role)) { clear(); view.showStatus('signed-out'); return; }
      const key = `${user.id}:${user.role}`;
      if (blockedIdentity || identity && identity !== key) { blockedIdentity = true; clear(); view.showStatus('identity-changed'); return; }
      const result = await api.material(materialId, { signal: request.signal });
      if (!winning()) return;
      const material = result?.material, attachment = material?.attachments?.find(file => file.id === attachmentId);
      if (material?.id !== materialId || !validId(material?.courseId) || !attachment || user.role === 'student' && material.visibleToStudents !== true) { clear(); view.showStatus('unavailable'); return; }
      identity = key;
      if (blockedFileStatus) {
        if (['preview-error', 'password-protected'].includes(blockedFileStatus)) {
          const fileUrl = attachmentApiPath(materialId, attachmentId), canDownload = canDownloadAttachment(user, material);
          view.showMetadata({ user, material, attachment, fileUrl, canDownload, downloadUrl: canDownload ? `${fileUrl}?download=1` : null });
        }
        view.showStatus(blockedFileStatus); return;
      }
      // Permission polling remains active while a PDF is still loading/rendering.
      if (activeCheck === request) activeCheck = null;
      await showFile(user, material, attachment);
    } catch (error) { if (winning()) { clear(); blockedFileStatus = statusFor(error); view.showStatus(blockedFileStatus); } }
    finally { if (activeCheck === request) activeCheck = null; }
  }
  return {
    async start() { if (destroyed || timer !== undefined) return; view.showStatus('loading-auth'); timer = scheduleInterval(() => check(), 5000); await check(); }, check,
    async retry() { if (destroyed) return; activeCheck?.abort(); sequence++; blockedIdentity = false; blockedFileStatus = ''; identity = ''; pageNumber = 1; clear(); view.showStatus('loading-auth'); await check({ force: true }); },
    previous: () => render(pageNumber - 1), next: () => render(pageNumber + 1), resize: () => render(pageNumber),
    destroy() { if (destroyed) return; destroyed = true; sequence++; activeCheck?.abort(); if (timer !== undefined) cancelInterval(timer); clear(); },
  };
}

export function createPreviewApi(fetchImpl = fetch) {
  async function request(path, { signal } = {}) {
    const controller = new AbortController(), abort = () => controller.abort();
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 10000);
    try {
      const response = await fetchImpl(path, { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, signal: controller.signal });
      if (!response.ok) throw Object.assign(new Error('Attachment request failed.'), { status: response.status });
      return await response.json();
    } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
  }
  return { session: settings => request('/api/auth/session', settings), material: (id, settings) => request(`/api/materials/${encodeURIComponent(id)}`, settings) };
}

function mountPreview(document, window) {
  const element = id => document.getElementById(id);
  const text = (id, value) => { element(id).textContent = value; };
  let language = 'zh', status = 'loading-auth', controls, filename = '', nativeMedia, canvas = element('preview-canvas');
  try { language = window.localStorage.getItem('beamal-language') === 'en' ? 'en' : 'zh'; } catch {}
  const translate = () => {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-Hant';
    for (const [id, key] of [['preview-back', 'back'], ['preview-download', 'download'], ['preview-retry', 'retry'], ['preview-previous', 'previous'], ['preview-next', 'next'], ['preview-text-label', 'text'], ['preview-login', 'login']]) text(id, previewText(language, key));
    text('preview-name', filename || previewText(language, 'title'));
    text('preview-status', previewText(language, status));
    text('preview-language', language === 'en' ? '中文' : 'EN');
    document.title = `${filename || previewText(language, 'title')} · Beamal`;
    canvas.setAttribute('aria-label', previewText(language, 'title'));
    if (controls) text('preview-page-count', language === 'en' ? `Page ${controls.pageNumber} of ${controls.pageCount}` : `第 ${controls.pageNumber} / ${controls.pageCount} 頁`);
  };
  const view = {
    get canvas() { return canvas; }, width: () => Math.max(1, element('preview-surface').clientWidth - 48), pixelRatio: () => window.devicePixelRatio || 1,
    clearPrivate() {
      filename = ''; controls = null; text('preview-meta', ''); text('preview-pdf-text', ''); text('preview-page-count', '');
      nativeMedia?.remove(); nativeMedia = null;
      canvas.width = 0; canvas.height = 0;
      // A retired render can only touch its detached canvas, never a new identity's view.
      const replacement = document.createElement('canvas'); replacement.id = 'preview-canvas'; replacement.hidden = true;
      canvas.replaceWith(replacement); canvas = replacement;
      element('preview-pager').hidden = true; element('preview-text').hidden = true;
      element('preview-download').hidden = true; element('preview-download').removeAttribute('href'); element('preview-back').href = '/account/courses';
      translate();
    },
    showStatus(code) {
      status = code; element('preview-status').hidden = code === 'ready';
      element('preview-status').setAttribute('role', ['ready', 'loading-auth', 'loading-preview'].includes(code) ? 'status' : 'alert');
      element('preview-surface').setAttribute('aria-busy', code.startsWith('loading') ? 'true' : 'false');
      element('preview-retry').hidden = ['ready', 'loading-auth', 'loading-preview', 'invalid-link'].includes(code);
      element('preview-login').hidden = code !== 'signed-out';
      element('preview-error-actions').hidden = element('preview-retry').hidden && element('preview-login').hidden; translate();
    },
    showMetadata({ material, attachment, downloadUrl, canDownload }) {
      filename = attachment.name;
      const size = attachment.size < 1_000_000 ? `${Math.max(1, Math.ceil(attachment.size / 1000))} KB` : `${(attachment.size / 1_000_000).toFixed(1)} MB`;
      text('preview-meta', `${attachment.mimeType} · ${size}`);
      element('preview-back').href = `/account/courses/${encodeURIComponent(material.courseId)}`;
      element('preview-download').hidden = !canDownload;
      if (canDownload) element('preview-download').href = downloadUrl; else element('preview-download').removeAttribute('href');
      translate();
    },
    showMedia({ kind, url, attachment, onError }) {
      const media = document.createElement(kind === 'image' ? 'img' : kind), loaded = () => { if (media.isConnected) view.showStatus('ready'); };
      nativeMedia = media; media.className = `preview-media preview-${kind}`;
      if (kind === 'image') media.alt = attachment.name;
      else { media.controls = true; media.preload = 'metadata'; if (kind === 'video') media.playsInline = true; }
      media.addEventListener(kind === 'image' ? 'load' : 'loadedmetadata', loaded); media.addEventListener('error', onError);
      element('preview-surface').append(media); media.src = url;
      return () => { media.removeEventListener(kind === 'image' ? 'load' : 'loadedmetadata', loaded); media.removeEventListener('error', onError); if (kind !== 'image') media.pause(); media.removeAttribute('src'); if (kind !== 'image') media.load(); media.remove(); };
    },
    showPdfControls(value) {
      controls = value; canvas.hidden = false; element('preview-pager').hidden = false;
      element('preview-previous').disabled = value.busy || value.pageNumber <= 1;
      element('preview-next').disabled = value.busy || value.pageNumber >= value.pageCount; translate();
    },
    showPdfText(value) { text('preview-pdf-text', value); element('preview-text').hidden = !value; },
  };
  const listeners = [], listen = (target, type, action) => { target.addEventListener(type, action); listeners.push(() => target.removeEventListener(type, action)); };
  listen(element('preview-language'), 'click', () => { language = language === 'en' ? 'zh' : 'en'; try { window.localStorage.setItem('beamal-language', language); } catch {} translate(); });
  listen(window, 'storage', event => { if (event.key === 'beamal-language') { language = event.newValue === 'en' ? 'en' : 'zh'; translate(); } });
  const ids = parsePreviewIds(window.location.search);
  translate();
  if (!ids) { view.showStatus('invalid-link'); listen(window, 'pagehide', () => listeners.forEach(remove => remove())); return; }
  const controller = createAttachmentPreview({ ...ids, api: createPreviewApi(window.fetch.bind(window)), view });
  listen(element('preview-retry'), 'click', () => controller.retry());
  listen(element('preview-previous'), 'click', () => controller.previous()); listen(element('preview-next'), 'click', () => controller.next());
  listen(window, 'focus', () => controller.check({ force: true }));
  let resizeTimer;
  listen(window, 'resize', () => { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(() => controller.resize(), 150); });
  listen(window, 'pagehide', () => { window.clearTimeout(resizeTimer); listeners.forEach(remove => remove()); controller.destroy(); });
  controller.start();
}

if (typeof document !== 'undefined' && document.getElementById('attachment-preview')) {
  mountPreview(document, window);
  window.addEventListener('pageshow', event => { if (event.persisted) mountPreview(document, window); });
}
