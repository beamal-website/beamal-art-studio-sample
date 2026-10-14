import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { cp, readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

function pdfAssets() {
  const vendor = fileURLToPath(new URL('./node_modules/pdfjs-dist/', import.meta.url));
  const folders = ['cmaps', 'standard_fonts'];
  let outDir;
  return {
    name: 'beamal-pdf-assets',
    configResolved(config) { outDir = resolve(config.root, config.build.outDir); },
    async configureServer(server) {
      const files = new Map();
      for (const folder of folders) for (const name of await readdir(join(vendor, folder))) files.set(`/pdf-assets/${folder}/${name}`, join(vendor, folder, name));
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url, 'http://localhost').pathname;
        if (!pathname.startsWith('/pdf-assets/')) return next();
        const path = files.get(pathname);
        if (!path || !['GET', 'HEAD'].includes(request.method)) { response.writeHead(404); response.end('Asset was not found.'); return; }
        try {
          const bytes = await readFile(path);
          response.writeHead(200, { 'Content-Type': path.endsWith('.ttf') ? 'font/ttf' : 'application/octet-stream', 'Content-Length': bytes.length, 'X-Content-Type-Options': 'nosniff' });
          response.end(request.method === 'HEAD' ? undefined : bytes);
        } catch { response.writeHead(404); response.end('Asset was not found.'); }
      });
    },
    async writeBundle() {
      for (const folder of folders) await cp(join(vendor, folder), join(outDir, 'pdf-assets', folder), { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [pdfAssets()],
  server: {
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.data/**', '**/*.sqlite*', '**/*.sqlite*/**'] },
    proxy: { '/api': { target: process.env.BEAMAL_API_TARGET || 'http://127.0.0.1:5180', changeOrigin: false } },
  },
  build: { rollupOptions: { input: {
    main: fileURLToPath(new URL('./index.html', import.meta.url)),
    attachmentPreview: fileURLToPath(new URL('./attachment-preview.html', import.meta.url)),
  } } },
});
