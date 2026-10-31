import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

const schedulerWrapper = fileURLToPath(new URL('./src/instrument/scheduler-wrapper.js', import.meta.url));

// In the built file, a CSP blocks every network request. This proves the deck is offline.
const offlineCsp = {
  name: 'offline-csp',
  apply: 'build',
  transformIndexHtml(html) {
    const csp = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
      "img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'";
    return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`);
  },
};

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true }), offlineCsp],
  resolve: {
    // react-dom does `require("scheduler")`. Point it at a wrapper that records real
    // task start / yield / end events, then forwards to the real package.
    alias: [{ find: /^scheduler$/, replacement: schedulerWrapper }],
  },
  optimizeDeps: { include: ['scheduler/index.js'] },
  build: {
    target: 'es2022',
    // Readable output: the playable deck is also something people can read. It also keeps
    // React's function names, which the live timeline uses to label tasks.
    minify: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 20000,
    reportCompressedSize: false,
  },
});
