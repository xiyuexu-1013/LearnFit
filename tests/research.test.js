import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEvent, validateFeedback, validateUsage } from '../worker/validation.js';

const base = {
  anonymousId: '11111111-1111-4111-8111-111111111111',
  sessionId: '22222222-2222-4222-8222-222222222222',
  source: 'web', durationSeconds: 321, score: 82, appVersion: 'web-0.7',
};

test('accepts a minimal anonymous session event', () => {
  assert.deepEqual(validateEvent({ ...base, eventType: 'completed' }), { ...base, eventType: 'completed' });
});

test('aggregate usage accepts only source and event type', () => {
  assert.deepEqual(validateUsage({ source: 'extension', eventType: 'started', extra: 'ignored' }), { source: 'extension', eventType: 'started' });
  assert.throws(() => validateUsage({ source: 'unknown', eventType: 'started' }));
});

test('rejects identifiers and values outside the research schema', () => {
  assert.throws(() => validateEvent({ ...base, anonymousId: 'short', eventType: 'started' }));
  assert.throws(() => validateEvent({ ...base, eventType: 'completed', score: 101 }));
  assert.throws(() => validateEvent({ ...base, eventType: 'unknown' }));
});

test('requires explicit consent and complete five-minute feedback', () => {
  const valid = validateFeedback({ ...base, ease: 4, usefulness: 5, trust: 4, wouldUse: 'yes', mostUseful: 'The clear final score.', confusing: 'Calibration took a while.', consent: true });
  assert.equal(valid.mostUseful, 'The clear final score.');
  assert.throws(() => validateFeedback({ ...base, ease: 4, usefulness: 5, trust: 4, wouldUse: 'yes', mostUseful: 'Useful', confusing: 'Nothing', consent: false }));
  assert.throws(() => validateFeedback({ ...base, ease: 6, usefulness: 5, trust: 4, wouldUse: 'yes', mostUseful: 'Useful', confusing: 'Nothing', consent: true }));
});
