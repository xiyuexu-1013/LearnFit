import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEvent, validateFeedback, validateUsage } from '../pages-function/validation.js';
import worker, { sameOrigin } from '../pages-function/index.js';

const base = {
  anonymousId: '11111111-1111-4111-8111-111111111111',
  sessionId: '22222222-2222-4222-8222-222222222222',
  source: 'web', durationSeconds: 321, score: 82, appVersion: 'web-0.7',
};

test('accepts a minimal anonymous session event', () => {
  assert.deepEqual(validateEvent({ ...base, eventType: 'completed' }), { ...base, eventType: 'completed' });
});

test('aggregate usage accepts a duration only for completed sessions', () => {
  assert.deepEqual(validateUsage({ source: 'extension', eventType: 'started', durationSeconds: 125, extra: 'ignored' }), { source: 'extension', eventType: 'started', durationSeconds: 0 });
  assert.deepEqual(validateUsage({ source: 'web', eventType: 'completed', durationSeconds: 125 }), { source: 'web', eventType: 'completed', durationSeconds: 125 });
  assert.throws(() => validateUsage({ source: 'unknown', eventType: 'started' }));
  assert.throws(() => validateUsage({ source: 'web', eventType: 'completed', durationSeconds: 86401 }));
});

test('rejects identifiers and values outside the research schema', () => {
  assert.throws(() => validateEvent({ ...base, anonymousId: 'short', eventType: 'started' }));
  assert.throws(() => validateEvent({ ...base, eventType: 'completed', score: 101 }));
  assert.throws(() => validateEvent({ ...base, eventType: 'unknown' }));
});

test('requires explicit consent and complete quantitative feedback', () => {
  const valid = validateFeedback({ ...base, ease: 4, usefulness: 5, trust: 4, wouldUse: 'yes', mostUseful: 'The clear final score.', confusing: 'Calibration took a while.', consent: true });
  assert.equal(valid.mostUseful, 'The clear final score.');
  const concise = validateFeedback({ ...base, ease: 4, usefulness: 5, trust: 4, wouldUse: 'maybe', mostUseful: '', confusing: '', consent: true });
  assert.equal(concise.confusing, '');
  assert.throws(() => validateFeedback({ ...base, ease: 4, usefulness: 5, trust: 4, wouldUse: 'yes', mostUseful: 'Useful', confusing: 'Nothing', consent: false }));
  assert.throws(() => validateFeedback({ ...base, ease: 6, usefulness: 5, trust: 4, wouldUse: 'yes', mostUseful: 'Useful', confusing: 'Nothing', consent: true }));
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
