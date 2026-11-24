import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEvent, validateFeedback, validatePartner, validateUsage } from '../pages-function/validation.js';
import worker, { sameOrigin } from '../pages-function/index.js';
import { getPartnerCode, PARTNER_CODE_KEY } from '../demo/research.js';

const base = {
  anonymousId: '11111111-1111-4111-8111-111111111111',
  sessionId: '22222222-2222-4222-8222-222222222222',
  source: 'web', durationSeconds: 321, score: 82, appVersion: 'web-0.7',
};

test('accepts a minimal anonymous session event', () => {
  assert.deepEqual(validateEvent({ ...base, eventType: 'completed' }), { ...base, eventType: 'completed', partnerCode: null });
});

test('aggregate usage accepts a duration only for completed sessions', () => {
  assert.deepEqual(validateUsage({ source: 'extension', eventType: 'started', durationSeconds: 125, extra: 'ignored' }), { source: 'extension', eventType: 'started', durationSeconds: 0, partnerCode: null });
  assert.deepEqual(validateUsage({ source: 'web', eventType: 'completed', durationSeconds: 125 }), { source: 'web', eventType: 'completed', durationSeconds: 125, partnerCode: null });
  assert.throws(() => validateUsage({ source: 'unknown', eventType: 'started' }));
  assert.throws(() => validateUsage({ source: 'web', eventType: 'completed', durationSeconds: 86401 }));
});

test('accepts opaque institution codes without exposing institution names', () => {
  assert.equal(validateUsage({ source: 'web', eventType: 'started', partnerCode: 'p_a1b2c3d4e5f6' }).partnerCode, 'p_a1b2c3d4e5f6');
  assert.throws(() => validateUsage({ source: 'web', eventType: 'started', partnerCode: 'Stony-Brook-School' }));
  assert.deepEqual(validatePartner({ name: '  Local Youth Center  ' }), { name: 'Local Youth Center' });
  assert.throws(() => validatePartner({ name: 'A' }));
});

test('an institution invite code persists locally for later anonymous usage events', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.equal(getPartnerCode(storage, '?partner=p_a1b2c3d4e5f6&utm_source=email'), 'p_a1b2c3d4e5f6');
  assert.equal(values.get(PARTNER_CODE_KEY), 'p_a1b2c3d4e5f6');
  assert.equal(getPartnerCode(storage, ''), 'p_a1b2c3d4e5f6');
  assert.equal(getPartnerCode(storage, '?partner=school-name'), 'p_a1b2c3d4e5f6');
});

test('rejects identifiers and values outside the research schema', () => {
  assert.throws(() => validateEvent({ ...base, anonymousId: 'short', eventType: 'started' }));
  assert.throws(() => validateEvent({ ...base, eventType: 'completed', score: 101 }));
  assert.throws(() => validateEvent({ ...base, eventType: 'unknown' }));
});

test('requires explicit consent and complete quantitative feedback', () => {
  const fields = { selfReportedFocus: 4, onTaskShare: 'most', verifiedSeconds: 280, offTaskSeconds: 41, trackingCoverage: 88 };
  const valid = validateFeedback({ ...base, ...fields, ease: 4, usefulness: 5, trust: 4, wouldUse: 'yes', mostUseful: 'The clear final score.', confusing: 'Calibration took a while.', consent: true });
  assert.equal(valid.mostUseful, 'The clear final score.');
  assert.equal(valid.trackingCoverage, 88);
  const concise = validateFeedback({ ...base, ...fields, ease: 4, usefulness: 5, trust: 4, wouldUse: 'maybe', mostUseful: '', confusing: '', consent: true });
  assert.equal(concise.confusing, '');
  assert.throws(() => validateFeedback({ ...base, ...fields, ease: 4, usefulness: 5, trust: 4, wouldUse: 'yes', mostUseful: 'Useful', confusing: 'Nothing', consent: false }));
  assert.throws(() => validateFeedback({ ...base, ...fields, ease: 6, usefulness: 5, trust: 4, wouldUse: 'yes', mostUseful: 'Useful', confusing: 'Nothing', consent: true }));
  assert.throws(() => validateFeedback({ ...base, ...fields, selfReportedFocus: 6, ease: 4, usefulness: 5, trust: 4, wouldUse: 'yes', mostUseful: '', confusing: '', consent: true }));
});

test('accepts same-origin Pages requests and rejects unrelated sites', () => {
  assert.equal(sameOrigin(new Request('https://learnfit.pages.dev/api/feedback', { headers: { Origin: 'https://learnfit.pages.dev' } })), true);
  assert.equal(sameOrigin(new Request('https://learnfit.pages.dev/api/feedback', { headers: { Origin: 'https://example.com' } })), false);
});

test('answers Chrome extension usage preflights with restricted CORS headers', async () => {
  const origin = 'chrome-extension://mhpdljhlapkmlncihnpmbchppjnplloo';
  const response = await worker.fetch(new Request('https://learnfit.pages.dev/api/usage', {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  }), {}, {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');

  const rejected = await worker.fetch(new Request('https://learnfit.pages.dev/api/usage', {
    method: 'OPTIONS', headers: { Origin: 'https://example.com' },
  }), {}, {});
  assert.equal(rejected.status, 403);
  assert.equal(rejected.headers.get('Access-Control-Allow-Origin'), null);
});
