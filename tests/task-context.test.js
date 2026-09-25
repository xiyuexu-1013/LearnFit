import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTaskPage, finalFocusEstimate, normalizePage, trackingCoverage } from '../extension/chrome/task-context.js';

test('verified pages are local exact-page matches', () => {
  const allowed = [{ tabId: 7, url: 'https://example.com/chapter?unit=2', title: 'Chapter' }];
  assert.equal(classifyTaskPage({ id: 7, url: 'https://example.com/chapter?unit=2#notes' }, allowed), 'study');
  assert.equal(classifyTaskPage({ id: 7, url: 'https://example.com/game' }, allowed), 'needs-confirmation');
  assert.equal(classifyTaskPage({ id: 9, url: 'https://video.example/watch' }, allowed), 'off-task');
  assert.equal(normalizePage('chrome://extensions'), '');
});

test('final focus estimate requires 60 percent signal coverage', () => {
  const session = { verifiedMs: 100_000, validSignalMs: 59_000, scoreTotal: 160, scoreSamples: 2 };
  assert.equal(trackingCoverage(session), 59);
  assert.equal(finalFocusEstimate(session), null);
  assert.equal(finalFocusEstimate({ ...session, validSignalMs: 60_000 }), 80);
});
