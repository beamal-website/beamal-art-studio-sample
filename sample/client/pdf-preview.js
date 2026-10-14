export const PDF_MAX_PIXELS = 8_000_000;
export const PDF_MAX_DIMENSION = 8192;

export function pdfCanvasLayout(base, availableWidth, deviceRatio = 1) {
  if (![base.width, base.height].every(value => Number.isFinite(value) && value > 0)) throw new Error('Invalid PDF page dimensions.');
  const width = Number.isFinite(availableWidth) && availableWidth > 0 ? availableWidth : 320;
  const scale = Math.min(2, width / base.width, PDF_MAX_DIMENSION / base.width, PDF_MAX_DIMENSION / base.height);
  const cssWidth = base.width * scale, cssHeight = base.height * scale;
  const ratio = Math.min(Number.isFinite(deviceRatio) ? Math.max(1, deviceRatio) : 1, 2, PDF_MAX_DIMENSION / cssWidth, PDF_MAX_DIMENSION / cssHeight, Math.sqrt(PDF_MAX_PIXELS / (cssWidth * cssHeight)));
  return { scale, ratio, width: Math.max(1, Math.floor(cssWidth * ratio)), height: Math.max(1, Math.floor(cssHeight * ratio)), cssWidth, cssHeight };
}

async function localLibrary() {
  const [library, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ]);
  library.GlobalWorkerOptions.workerSrc = worker.default;
  return library;
}

export function createPdfPreview({ url, canvas, width, pixelRatio, onText, loadLibrary = localLibrary }) {
  let destroyed = false, loadingTask, document, activeRender, activePage, renderVersion = 0, passwordProtected = false;
  const ready = (async () => {
    const library = await loadLibrary();
    if (destroyed) throw new DOMException('Preview closed.', 'AbortError');
    loadingTask = library.getDocument({
      url, withCredentials: true, isEvalSupported: false, enableXfa: false,
      cMapUrl: '/pdf-assets/cmaps/', cMapPacked: true,
      standardFontDataUrl: '/pdf-assets/standard_fonts/',
      maxImageSize: PDF_MAX_PIXELS, canvasMaxAreaInBytes: PDF_MAX_PIXELS * 4,
      disableAutoFetch: true, disableStream: true,
    });
    // PDF.js 6 removed runtime eval support. No scripting manager, annotation
    // layer or document actions are loaded by this canvas-only renderer.
    loadingTask.onPassword = () => { passwordProtected = true; loadingTask.destroy().catch(() => {}); };
    try { document = await loadingTask.promise; }
    catch (error) { if (passwordProtected) throw Object.assign(new Error('This PDF requires a password.'), { code: 'password-protected' }); throw error; }
    if (destroyed) throw new DOMException('Preview closed.', 'AbortError');
    return document.numPages;
  })();
  async function renderPage(number) {
    const version = ++renderVersion;
    activeRender?.cancel();
    await activeRender?.promise.catch(() => {});
    await ready;
    if (destroyed || version !== renderVersion) return;
    activePage?.cleanup();
    const page = await document.getPage(number);
    if (destroyed || version !== renderVersion) return;
    activePage = page;
    const layout = pdfCanvasLayout(page.getViewport({ scale: 1 }), width(), pixelRatio());
    const viewport = page.getViewport({ scale: layout.scale });
    canvas.width = layout.width; canvas.height = layout.height;
    canvas.style.width = `${layout.cssWidth}px`; canvas.style.height = `${layout.cssHeight}px`;
    onText?.('');
    activeRender = page.render({ canvas, viewport, transform: layout.ratio === 1 ? null : [layout.ratio, 0, 0, layout.ratio, 0, 0], background: 'rgb(255,255,255)', annotationMode: 0 });
    await activeRender.promise;
    if (destroyed || version !== renderVersion) return;
    const content = await page.getTextContent();
    if (!destroyed && version === renderVersion) onText?.(content.items.slice(0, 10000).map(item => typeof item.str === 'string' ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').slice(0, 200000));
  }
  return { ready, renderPage, destroy() {
    if (destroyed) return;
    destroyed = true; renderVersion++; activeRender?.cancel();
    canvas.width = 0; canvas.height = 0; onText?.('');
    return loadingTask?.destroy();
  } };
}
