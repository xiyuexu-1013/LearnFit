import { validateEvent, validateFeedback, validatePartner, validateUsage } from './validation.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

function extensionOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  return /^chrome-extension:\/\/[a-p]{32}$/.test(origin) ? origin : '';
}

function withUsageCors(response, origin) {
  if (!origin) return response;
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Max-Age', '86400');
  headers.append('Vary', 'Origin');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

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
  if (!sameOrigin(request) && !extensionOrigin(request)) return json({ error: 'Cross-site submissions are not accepted.' }, 403);
  const usage = validateUsage(await readBody(request));
  const statements = [env.DB.prepare(`INSERT INTO daily_usage (day, source, event_type, event_count, duration_seconds, duration_count)
    VALUES (date('now'), ?, ?, 1, ?, ?)
    ON CONFLICT(day, source, event_type) DO UPDATE SET
      event_count=event_count+1,
      duration_seconds=duration_seconds+excluded.duration_seconds,
      duration_count=duration_count+excluded.duration_count`)
    .bind(usage.source, usage.eventType, usage.durationSeconds, usage.eventType === 'completed' ? 1 : 0)];
  if (usage.partnerCode && await activePartner(env, usage.partnerCode)) {
    statements.push(env.DB.prepare(`INSERT INTO partner_usage (day, partner_code, source, event_type, event_count, duration_seconds, duration_count)
      VALUES (date('now'), ?, ?, ?, 1, ?, ?)
      ON CONFLICT(day, partner_code, source, event_type) DO UPDATE SET
        event_count=event_count+1,
        duration_seconds=duration_seconds+excluded.duration_seconds,
        duration_count=duration_count+excluded.duration_count`)
      .bind(usage.partnerCode, usage.source, usage.eventType, usage.durationSeconds, usage.eventType === 'completed' ? 1 : 0));
  }
  await env.DB.batch(statements);
  return json({ ok: true }, 201);
}

async function activePartner(env, code) {
  if (!code) return false;
  return Boolean(await env.DB.prepare('SELECT code FROM partners WHERE code=? AND active=1').bind(code).first());
}

async function recordEvent(request, env) {
  if (!sameOrigin(request)) return json({ error: 'Cross-site submissions are not accepted.' }, 403);
  const event = validateEvent(await readBody(request));
  const partnerCode = await activePartner(env, event.partnerCode) ? event.partnerCode : null;
  await env.DB.prepare(`INSERT OR IGNORE INTO events
    (id, created_at, anon_id, session_id, source, event_type, duration_seconds, score, app_version, partner_code)
    VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), event.anonymousId, event.sessionId, event.source, event.eventType, event.durationSeconds, event.score, event.appVersion, partnerCode).run();
  return json({ ok: true }, 201);
}

async function recordFeedback(request, env) {
  if (!sameOrigin(request)) return json({ error: 'Cross-site submissions are not accepted.' }, 403);
  const feedback = validateFeedback(await readBody(request));
  const partnerCode = await activePartner(env, feedback.partnerCode) ? feedback.partnerCode : null;
  const statements = [
    env.DB.prepare(`INSERT OR IGNORE INTO events
      (id, created_at, anon_id, session_id, source, event_type, duration_seconds, score, app_version, partner_code)
      VALUES (?, datetime('now'), ?, ?, ?, 'started', 0, NULL, ?, ?)`)
      .bind(crypto.randomUUID(), feedback.anonymousId, feedback.sessionId, feedback.source, feedback.appVersion, partnerCode),
    env.DB.prepare(`INSERT OR IGNORE INTO events
      (id, created_at, anon_id, session_id, source, event_type, duration_seconds, score, app_version, partner_code)
      VALUES (?, datetime('now'), ?, ?, ?, 'completed', ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), feedback.anonymousId, feedback.sessionId, feedback.source, feedback.durationSeconds, feedback.score, feedback.appVersion, partnerCode),
    env.DB.prepare(`INSERT INTO feedback
      (id, created_at, anon_id, session_id, source, duration_seconds, verified_seconds, off_task_seconds, tracking_coverage, score, app_version, ease, usefulness, trust, self_reported_focus, on_task_share, would_use, most_useful, confusing, partner_code)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET ease=excluded.ease, usefulness=excluded.usefulness,
      trust=excluded.trust, self_reported_focus=excluded.self_reported_focus, on_task_share=excluded.on_task_share,
      verified_seconds=excluded.verified_seconds, off_task_seconds=excluded.off_task_seconds, tracking_coverage=excluded.tracking_coverage,
      would_use=excluded.would_use, most_useful=excluded.most_useful, confusing=excluded.confusing,
      partner_code=COALESCE(excluded.partner_code, feedback.partner_code)`)
      .bind(crypto.randomUUID(), feedback.anonymousId, feedback.sessionId, feedback.source, feedback.durationSeconds, feedback.verifiedSeconds, feedback.offTaskSeconds, feedback.trackingCoverage, feedback.score, feedback.appVersion, feedback.ease, feedback.usefulness, feedback.trust, feedback.selfReportedFocus, feedback.onTaskShare, feedback.wouldUse, feedback.mostUseful, feedback.confusing, partnerCode),
  ];
  await env.DB.batch(statements);
  return json({ ok: true }, 201);
}

function correlation(rows) {
  if (rows.length < 10) return null;
  const meanX = rows.reduce((sum, row) => sum + Number(row.score), 0) / rows.length;
  const meanY = rows.reduce((sum, row) => sum + Number(row.self_reported_focus), 0) / rows.length;
  let numerator = 0; let sumX = 0; let sumY = 0;
  for (const row of rows) {
    const x = Number(row.score) - meanX; const y = Number(row.self_reported_focus) - meanY;
    numerator += x * y; sumX += x * x; sumY += y * y;
  }
  const denominator = Math.sqrt(sumX * sumY);
  return denominator ? Math.round(numerator / denominator * 100) / 100 : null;
}

async function summary(env) {
  const [people, detailedEvents, usage, ratings, matched, sources, daily, recent, partners] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(DISTINCT anon_id) AS count FROM (SELECT anon_id FROM events UNION ALL SELECT anon_id FROM feedback)`).first(),
    env.DB.prepare(`SELECT SUM(event_type='started') AS started, SUM(event_type='completed') AS completed FROM events`).first(),
    env.DB.prepare(`SELECT SUM(CASE WHEN event_type='started' THEN event_count ELSE 0 END) AS started, SUM(CASE WHEN event_type='completed' THEN event_count ELSE 0 END) AS completed, SUM(CASE WHEN event_type='completed' THEN duration_seconds ELSE 0 END) AS duration_seconds, SUM(CASE WHEN event_type='completed' THEN duration_count ELSE 0 END) AS duration_count FROM daily_usage`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS responses, ROUND(AVG(ease),2) AS ease, ROUND(AVG(usefulness),2) AS usefulness, ROUND(AVG(trust),2) AS trust, ROUND(AVG(self_reported_focus),2) AS self_reported_focus, SUM(would_use='yes') AS would_yes, SUM(would_use='maybe') AS would_maybe, SUM(would_use='no') AS would_no FROM feedback`).first(),
    env.DB.prepare(`SELECT score, self_reported_focus FROM feedback WHERE score IS NOT NULL AND self_reported_focus IS NOT NULL`).all(),
    env.DB.prepare(`SELECT source, SUM(event_count) AS completed, SUM(duration_seconds) AS duration_seconds FROM daily_usage WHERE event_type='completed' GROUP BY source ORDER BY source`).all(),
    env.DB.prepare(`SELECT day, SUM(CASE WHEN event_type='started' THEN event_count ELSE 0 END) AS started, SUM(CASE WHEN event_type='completed' THEN event_count ELSE 0 END) AS completed, SUM(CASE WHEN event_type='completed' THEN duration_seconds ELSE 0 END) AS duration_seconds FROM daily_usage WHERE day >= date('now','-30 days') GROUP BY day ORDER BY day`).all(),
    env.DB.prepare(`SELECT created_at, source, duration_seconds, verified_seconds, off_task_seconds, tracking_coverage, score, ease, usefulness, trust, self_reported_focus, on_task_share, would_use, most_useful, confusing FROM feedback ORDER BY created_at DESC LIMIT 100`).all(),
    env.DB.prepare(`SELECT p.code, p.name, p.created_at, p.active,
      COALESCE(SUM(CASE WHEN pu.event_type='started' THEN pu.event_count ELSE 0 END),0) AS started,
      COALESCE(SUM(CASE WHEN pu.event_type='completed' THEN pu.event_count ELSE 0 END),0) AS completed,
      COALESCE(SUM(CASE WHEN pu.event_type='completed' THEN pu.duration_seconds ELSE 0 END),0) AS duration_seconds
      FROM partners p LEFT JOIN partner_usage pu ON pu.partner_code=p.code
      GROUP BY p.code, p.name, p.created_at, p.active ORDER BY p.created_at DESC`).all(),
  ]);
  const started = Number(usage?.started || 0);
  const completed = Number(usage?.completed || 0);
  const totalDurationSeconds = Number(usage?.duration_seconds || 0);
  const durationSessionCount = Number(usage?.duration_count || 0);
  return {
    generatedAt: new Date().toISOString(), uniqueTesters: Number(people?.count || 0), started, completed,
    completionRate: started ? Math.round((completed / started) * 1000) / 10 : 0,
    totalDurationSeconds,
    averageDurationSeconds: durationSessionCount ? Math.round(totalDurationSeconds / durationSessionCount) : 0,
    durationSessionCount,
    detailedSessions: Number(detailedEvents?.completed || 0),
    feedback: { responses: Number(ratings?.responses || 0), ease: ratings?.ease, usefulness: ratings?.usefulness, trust: ratings?.trust, selfReportedFocus: ratings?.self_reported_focus, matchedSessions: matched.results.length, focusCorrelation: correlation(matched.results), wouldUse: { yes: Number(ratings?.would_yes || 0), maybe: Number(ratings?.would_maybe || 0), no: Number(ratings?.would_no || 0) } },
    sources: sources.results, daily: daily.results, recent: recent.results, partners: partners.results,
  };
}

function newPartnerCode() {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return `p_${Array.from(bytes, (value) => value.toString(36).padStart(2, '0')).join('').slice(0, 12)}`;
}

async function createPartner(request, env) {
  const { name } = validatePartner(await readBody(request));
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const code = newPartnerCode();
    try {
      await env.DB.prepare(`INSERT INTO partners (code, name, created_at, active) VALUES (?, ?, datetime('now'), 1)`).bind(code, name).run();
      return json({ code, name, url: `https://learnfit.pages.dev/?partner=${code}` }, 201);
    } catch (error) {
      if (!/UNIQUE|constraint/i.test(error.message)) throw error;
    }
  }
  throw new Error('The institution link could not be generated.');
}

function csvCell(value) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }
async function exportCsv(env) {
  const { results } = await env.DB.prepare(`SELECT f.created_at, f.source, f.duration_seconds, f.verified_seconds, f.off_task_seconds, f.tracking_coverage, f.score, f.app_version, f.ease, f.usefulness, f.trust, f.self_reported_focus, f.on_task_share, f.would_use, f.most_useful, f.confusing, f.partner_code, p.name AS partner_name FROM feedback f LEFT JOIN partners p ON p.code=f.partner_code ORDER BY f.created_at DESC`).all();
  const columns = ['created_at','source','duration_seconds','verified_seconds','off_task_seconds','tracking_coverage','score','app_version','ease','usefulness','trust','self_reported_focus','on_task_share','would_use','most_useful','confusing','partner_code','partner_name'];
  const body = [columns.join(','), ...results.map((row) => columns.map((key) => csvCell(row[key])).join(','))].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="learnfit-research.csv"', 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const usageCorsOrigin = url.pathname === '/api/usage' ? extensionOrigin(request) : '';
    try {
      if (url.pathname === '/api/health') return json({ ok: true });
      if (url.pathname === '/api/usage' && request.method === 'OPTIONS') {
        return usageCorsOrigin
          ? withUsageCors(new Response(null, { status: 204 }), usageCorsOrigin)
          : json({ error: 'Cross-site submissions are not accepted.' }, 403);
      }
      if (url.pathname === '/api/usage' && request.method === 'POST') return withUsageCors(await recordUsage(request, env), usageCorsOrigin);
      if (url.pathname === '/api/events' && request.method === 'POST') return await recordEvent(request, env);
      if (url.pathname === '/api/feedback' && request.method === 'POST') {
        return await recordFeedback(request, env);
      }
      if (url.pathname.startsWith('/api/admin/')) {
        if (!isAdmin(request, env)) return json({ error: 'Admin key required.' }, 401);
        if (url.pathname === '/api/admin/summary' && request.method === 'GET') return json(await summary(env));
        if (url.pathname === '/api/admin/partners' && request.method === 'POST') return createPartner(request, env);
        if (url.pathname === '/api/admin/export.csv' && request.method === 'GET') return exportCsv(env);
      }
      if (url.pathname.startsWith('/api/')) return json({ error: 'Not found.' }, 404);
      return withSecurityHeaders(await env.ASSETS.fetch(request), url.pathname);
    } catch (error) {
      const expected = error instanceof SyntaxError || /Invalid|Complete|range|JSON|large|Institution name/.test(error.message);
      return withUsageCors(json({ error: expected ? error.message : 'The research service could not complete the request.' }, expected ? 400 : 500), usageCorsOrigin);
    }
  },
};
