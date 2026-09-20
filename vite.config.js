import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('./demo', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  server: {
    host: '127.0.0.1',
    fs: { allow: [fileURLToPath(new URL('./', import.meta.url))] },
  },
  build: {
    outDir: fileURLToPath(new URL('./site-dist', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./demo/index.html', import.meta.url)),
        privacy: fileURLToPath(new URL('./demo/privacy.html', import.meta.url)),
        feedback: fileURLToPath(new URL('./demo/feedback.html', import.meta.url)),
        admin: fileURLToPath(new URL('./demo/admin.html', import.meta.url)),
      },
    },
  },
});
