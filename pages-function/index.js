import { validateEvent, validateFeedback, validateUsage } from './validation.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

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

function safeEqual(a = '', b = '') {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function isAdmin(request, env) {
  const header = request.headers.get('Authorization') || '';
  return header.startsWith('Bearer ') && safeEqual(header.slice(7), env.ADMIN_KEY || '');
}

async function readBody(request) {
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) throw new Error('Use a JSON request body.');
  const size = Number(request.headers.get('Content-Length') || 0);
  if (size > 16_384) throw new Error('Request body is too large.');
  const raw = await request.text();
  if (raw.length > 16_384) throw new Error('Request body is too large.');
  return JSON.parse(raw);
}

export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  const url = new URL(request.url);
  return origin === url.origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

async function recordUsage(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (!sameOrigin(request) && !origin.startsWith('chrome-extension://')) return json({ error: 'Cross-site submissions are not accepted.' }, 403);
  const usage = validateUsage(await readBody(request));
  await env.DB.prepare(`INSERT INTO daily_usage (day, source, event_type, event_count)
    VALUES (date('now'), ?, ?, 1)
    ON CONFLICT(day, source, event_type) DO UPDATE SET event_count=event_count+1`)
    .bind(usage.source, usage.eventType).run();
  return json({ ok: true }, 201);
}

async function recordEvent(request, env) {
  if (!sameOrigin(request)) return json({ error: 'Cross-site submissions are not accepted.' }, 403);
  const event = validateEvent(await readBody(request));
  await env.DB.prepare(`INSERT OR IGNORE INTO events
    (id, created_at, anon_id, session_id, source, event_type, duration_seconds, score, app_version)
    VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), event.anonymousId, event.sessionId, event.source, event.eventType, event.durationSeconds, event.score, event.appVersion).run();
  return json({ ok: true }, 201);
}

async function recordFeedback(request, env) {
  if (!sameOrigin(request)) return json({ error: 'Cross-site submissions are not accepted.' }, 403);
  const feedback = validateFeedback(await readBody(request));
  const statements = [
    env.DB.prepare(`INSERT OR IGNORE INTO events
      (id, created_at, anon_id, session_id, source, event_type, duration_seconds, score, app_version)
      VALUES (?, datetime('now'), ?, ?, ?, 'started', 0, NULL, ?)`)
      .bind(crypto.randomUUID(), feedback.anonymousId, feedback.sessionId, feedback.source, feedback.appVersion),
    env.DB.prepare(`INSERT OR IGNORE INTO events
      (id, created_at, anon_id, session_id, source, event_type, duration_seconds, score, app_version)
      VALUES (?, datetime('now'), ?, ?, ?, 'completed', ?, ?, ?)`)
      .bind(crypto.randomUUID(), feedback.anonymousId, feedback.sessionId, feedback.source, feedback.durationSeconds, feedback.score, feedback.appVersion),
    env.DB.prepare(`INSERT INTO feedback
      (id, created_at, anon_id, session_id, source, duration_seconds, score, app_version, ease, usefulness, trust, would_use, most_useful, confusing)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET ease=excluded.ease, usefulness=excluded.usefulness,
      trust=excluded.trust, would_use=excluded.would_use, most_useful=excluded.most_useful, confusing=excluded.confusing`)
      .bind(crypto.randomUUID(), feedback.anonymousId, feedback.sessionId, feedback.source, feedback.durationSeconds, feedback.score, feedback.appVersion, feedback.ease, feedback.usefulness, feedback.trust, feedback.wouldUse, feedback.mostUseful, feedback.confusing),
  ];
  await env.DB.batch(statements);
  return json({ ok: true }, 201);
}

async function pruneOldResearchData(env) {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM feedback WHERE created_at < datetime('now','-12 months')`),
    env.DB.prepare(`DELETE FROM events WHERE created_at < datetime('now','-12 months')`),
    env.DB.prepare(`DELETE FROM daily_usage WHERE day < date('now','-12 months')`),
  ]);
}

async function summary(env) {
  const [people, detailedEvents, usage, ratings, sources, daily, recent] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(DISTINCT anon_id) AS count FROM (SELECT anon_id FROM events UNION ALL SELECT anon_id FROM feedback)`).first(),
    env.DB.prepare(`SELECT SUM(event_type='started') AS started, SUM(event_type='completed') AS completed FROM events`).first(),
    env.DB.prepare(`SELECT SUM(CASE WHEN event_type='started' THEN event_count ELSE 0 END) AS started, SUM(CASE WHEN event_type='completed' THEN event_count ELSE 0 END) AS completed FROM daily_usage`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS responses, ROUND(AVG(ease),2) AS ease, ROUND(AVG(usefulness),2) AS usefulness, ROUND(AVG(trust),2) AS trust, SUM(would_use='yes') AS would_yes, SUM(would_use='maybe') AS would_maybe, SUM(would_use='no') AS would_no FROM feedback`).first(),
    env.DB.prepare(`SELECT source, SUM(event_count) AS completed FROM daily_usage WHERE event_type='completed' GROUP BY source ORDER BY source`).all(),
    env.DB.prepare(`SELECT day, SUM(CASE WHEN event_type='started' THEN event_count ELSE 0 END) AS started, SUM(CASE WHEN event_type='completed' THEN event_count ELSE 0 END) AS completed FROM daily_usage WHERE day >= date('now','-30 days') GROUP BY day ORDER BY day`).all(),
    env.DB.prepare(`SELECT created_at, source, duration_seconds, score, ease, usefulness, trust, would_use, most_useful, confusing FROM feedback ORDER BY created_at DESC LIMIT 100`).all(),
  ]);
  const started = Number(usage?.started || 0);
  const completed = Number(usage?.completed || 0);
  return {
    generatedAt: new Date().toISOString(), uniqueTesters: Number(people?.count || 0), started, completed,
    completionRate: started ? Math.round((completed / started) * 1000) / 10 : 0,
    detailedSessions: Number(detailedEvents?.completed || 0),
    feedback: { responses: Number(ratings?.responses || 0), ease: ratings?.ease, usefulness: ratings?.usefulness, trust: ratings?.trust, wouldUse: { yes: Number(ratings?.would_yes || 0), maybe: Number(ratings?.would_maybe || 0), no: Number(ratings?.would_no || 0) } },
    sources: sources.results, daily: daily.results, recent: recent.results,
  };
}

function csvCell(value) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }
async function exportCsv(env) {
  const { results } = await env.DB.prepare(`SELECT created_at, source, duration_seconds, score, app_version, ease, usefulness, trust, would_use, most_useful, confusing FROM feedback ORDER BY created_at DESC`).all();
  const columns = ['created_at','source','duration_seconds','score','app_version','ease','usefulness','trust','would_use','most_useful','confusing'];
  const body = [columns.join(','), ...results.map((row) => columns.map((key) => csvCell(row[key])).join(','))].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="learnfit-research.csv"', 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/health') return json({ ok: true });
      if (url.pathname === '/api/usage' && request.method === 'POST') return await recordUsage(request, env);
      if (url.pathname === '/api/events' && request.method === 'POST') return await recordEvent(request, env);
      if (url.pathname === '/api/feedback' && request.method === 'POST') {
        const response = await recordFeedback(request, env);
        ctx.waitUntil(pruneOldResearchData(env));
        return response;
      }
      if (url.pathname.startsWith('/api/admin/')) {
        if (!isAdmin(request, env)) return json({ error: 'Admin key required.' }, 401);
        if (url.pathname === '/api/admin/summary' && request.method === 'GET') return json(await summary(env));
        if (url.pathname === '/api/admin/export.csv' && request.method === 'GET') return exportCsv(env);
      }
      if (url.pathname.startsWith('/api/')) return json({ error: 'Not found.' }, 404);
      return withSecurityHeaders(await env.ASSETS.fetch(request), url.pathname);
    } catch (error) {
      const expected = error instanceof SyntaxError || /Invalid|Complete|range|JSON|large/.test(error.message);
      return json({ error: expected ? error.message : 'The research service could not complete the request.' }, expected ? 400 : 500);
    }
  },
};
