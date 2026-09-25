import test from 'node:test';
import assert from 'node:assert/strict';
import { FocusEngine, BlinkDetector, calculateEAR, EYE_LANDMARKS } from '../src/core/engine.js';
import { summarize } from '../demo/session.js';

function calibrate(engine, ear = .3) {
  engine.start(0);
  for (let t = 100; t <= 30000; t += 100) engine.calculate({ blinkFrequency: 10, blinkDuration: 200, ear, blinkCompleted: t % 6000 === 0 }, t);
  return engine.calculate({ blinkFrequency: 10, blinkDuration: 200, ear }, 30100);
}

test('baseline uses completed blinks and 30 seconds of observations', () => {
  const engine = new FocusEngine();
  const result = calibrate(engine);
  assert.equal(result.isCalibrating, false);
  assert.equal(result.baseline.blinkFrequency, 10);
  assert.equal(result.baseline.blinkDuration, 200);
  assert.ok(Math.abs(result.baseline.ear - .3) < 1e-10);
  assert.equal(result.status, 'Stable');
});

test('a long gap cannot complete calibration', () => {
  const engine = new FocusEngine(); engine.start(0);
  const result = engine.calculate({ blinkFrequency: 0, blinkDuration: 0, ear: .3 }, 60000);
  assert.equal(result.isCalibrating, true);
  assert.ok(result.calibrationProgress < .01);
});

test('restarting clears baseline samples and personalized duration history', () => {
  const engine = new FocusEngine(); calibrate(engine, .3);
  engine.stop(); engine.start(40000);
  const result = engine.calculate({ blinkFrequency: 0, blinkDuration: 0, ear: .2 }, 40100);
  assert.equal(result.baseline.ear, .2);
  assert.equal(result.baseline.blinkDuration, 0);
  assert.equal(result.baseline.blinkFrequency, 0);
  assert.equal(result.isCalibrating, true);
});

test('zero calibration blinks remain unavailable without a fabricated duration', () => {
  const engine = new FocusEngine(); engine.start(0);
  for (let t = 100; t <= 30000; t += 100) engine.calculate({ blinkFrequency: 0, blinkDuration: 0, ear: .3 }, t);
  const result = engine.calculate({ blinkFrequency: 0, blinkDuration: 200, ear: .3 }, 30100);
  assert.equal(result.baseline.blinkDuration, 0);
  assert.equal(result.durationScore, 30);
});

test('blink duration is measured on reopening and window expires', () => {
  const detector = new BlinkDetector();
  detector.update(.1, 100);
  assert.equal(detector.update(.1, 650).isFatigued, true);
  const blink = detector.update(.3, 700);
  assert.equal(blink.duration, 600);
  assert.equal(blink.completed, true);
  assert.equal(blink.frequency, 1);
  assert.equal(detector.update(.3, 800).completed, false);
  assert.equal(detector.update(.3, 61000).frequency, 0);
});

test('EAR calculation retains aspect-ratio correction', () => {
  const landmarks = Array.from({length: 468}, () => ({x: 0, y: 0}));
  for (const indices of Object.values(EYE_LANDMARKS)) {
    [[0,0],[.25,.1],[.75,.1],[1,0],[.75,-.1],[.25,-.1]].forEach(([x,y], i) => { landmarks[indices[i]] = { x, y }; });
  }
  assert.ok(Math.abs(calculateEAR(landmarks, 640, 480) - .15) < 1e-10);
});

test('longer closures suggest a break without attention claims', () => {
  const engine = new FocusEngine(); calibrate(engine);
  const result = engine.calculate({ blinkFrequency: 10, blinkDuration: 200, ear: .1, isFatigued: true }, 30200);
  assert.equal(result.status, 'Break suggested');
});

test('report uses real gaps and requires a sustained shift', () => {
  const samples = Array.from({length: 50}, (_, i) => ({t: i + 1, score: i < 20 ? 90 : i < 25 ? null : 60}));
  const report = summarize(samples, 50);
  assert.equal(report.quality, 90);
  assert.deepEqual(report.best, {start: 1, end: 20});
  assert.equal(report.firstShift, 26);
  assert.equal(report.suggested, null);
});

test('empty and brief reports do not invent results', () => {
  assert.equal(summarize([], 0).quality, null);
  const report = summarize([{t: 1, score: 90}, {t: 2, score: 60}], 2);
  assert.equal(report.best, null);
  assert.equal(report.firstShift, null);
  assert.equal(report.suggested, null);
});

test('report averages usable engine scores and ignores gaps', () => {
  const report = summarize([{t: 1, score: 80}, {t: 2, score: null}, {t: 3, score: 91}], 3);
  assert.equal(report.averageScore, 86);
  assert.equal(summarize([], 0).averageScore, null);
});

test('report suppresses a final focus estimate below 60 percent coverage', () => {
  const samples = [{t: 1, score: 80}, {t: 2, score: null}, {t: 3, score: null}];
  const report = summarize(samples, 3);
  assert.equal(report.quality, 33);
  assert.equal(report.rawAverageScore, 80);
  assert.equal(report.averageScore, null);
});

test('a normal completed blink remains valid input rather than a tracking gap', () => {
  const detector = new BlinkDetector();
  detector.update(.1, 100);
  const blink = detector.update(.3, 280);
  assert.equal(blink.completed, true);
  assert.equal(blink.isFatigued, false);
  assert.equal(blink.duration, 180);
});

test('suggestions require enough signal and an observed later shift', () => {
  const samples = Array.from({length: 400}, (_, i) => ({t: i + 1, score: i < 360 ? 90 : 60}));
  assert.equal(summarize(samples, 400).suggested, '5–8 min');
  for (let i = 0; i < 200; i++) samples[i].score = null;
  assert.equal(summarize(samples, 400).suggested, null);
});

test('time-based smoothing behaves consistently at different frame rates', () => {
  const run = (step) => {
    const engine = new FocusEngine(); calibrate(engine);
    let result;
    for (let t = 30100 + step; t <= 33100; t += step) result = engine.calculate({ blinkFrequency: 40, blinkDuration: 200, ear: .3 }, t);
    return result.focusScore;
  };
  assert.ok(Math.abs(run(20) - run(100)) <= .1);
});

test('a zero-blink baseline does not penalize subsequent normal blinks', () => {
  const engine = new FocusEngine(); engine.start(0);
  for (let t = 100; t <= 30000; t += 100) engine.calculate({ blinkFrequency: 0, blinkDuration: 0, ear: .3 }, t);
  const result = engine.calculate({ blinkFrequency: 15, blinkDuration: 150, ear: .3 }, 30100);
  assert.equal(result.blinkScore, 50);
  assert.equal(result.durationScore, 30);
});
