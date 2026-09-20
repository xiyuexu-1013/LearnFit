import { writeFile } from 'node:fs/promises';

const target = new URL('../site-dist/_worker.js', import.meta.url);
const source = `const API_ORIGIN = 'https://learnfit.digitaliliad.workers.dev';

function withSecurityHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'");
  if (pathname.startsWith('/vendor/')) headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  if (pathname.startsWith('/brand/')) headers.set('Cache-Control', 'public, max-age=86400');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      const upstream = new URL(url.pathname + url.search, API_ORIGIN);
      return fetch(new Request(upstream, request));
    }
    const response = await env.ASSETS.fetch(request);
    return withSecurityHeaders(response, url.pathname);
  },
};
`;

await writeFile(target, source);
console.log('Prepared the free Pages mirror proxy in site-dist/_worker.js.');
