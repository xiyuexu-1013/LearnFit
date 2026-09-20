import test from 'node:test';
import assert from 'node:assert/strict';
import { readReflections, saveReflection, clearReflections } from '../demo/workflow.js';
import { FaceTracker } from '../src/core/tracker.js';

test('local reflections recover from corrupt data, update one session, and cap history', () => {
  let value = '{broken';
  const storage = { getItem: () => value, setItem: (_, next) => { value = next; }, removeItem: () => { value = null; } };
  assert.deepEqual(readReflections(storage), []);
  const entry = { date: '2026-09-18', task: 'Read', seconds: 60, completion: 'Completed', energy: 'Okay', note: '' };
  for (let id = 0; id < 12; id++) saveReflection(storage, { ...entry, id });
  assert.equal(readReflections(storage).length, 10);
  saveReflection(storage, { ...entry, id: 11, note: 'Take a break' });
  assert.equal(readReflections(storage).length, 10);
  assert.equal(readReflections(storage)[0].note, 'Take a break');
  clearReflections(storage);
  assert.deepEqual(readReflections(storage), []);
});

test('pause disables camera track and resume excludes paused time without resetting baseline', (t) => {
  let now = 1000;
  t.mock.method(performance, 'now', () => now);
  const track = { enabled: true };
  const tracker = new FaceTracker({ video: {} });
  tracker.running = true; tracker.pausedMs = 0;
  tracker.stream = { getVideoTracks: () => [track] };
  tracker.engine.start(0);
  tracker.engine.calibrationMs = 12000;
  tracker.blinkDetector.isBlinking = true;
  tracker.pause();
  assert.equal(track.enabled, false);
  assert.equal(tracker.blinkDetector.isBlinking, false);
  now = 11000; tracker.pause(); tracker.resume();
  assert.equal(track.enabled, true);
  assert.equal(tracker.pausedMs, 10000);
  assert.equal(tracker.engine.lastSampleAt, 1000);
  assert.equal(tracker.engine.calibrationMs, 12000);
  tracker.resume();
  assert.equal(tracker.pausedMs, 10000);
});
