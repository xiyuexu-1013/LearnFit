import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionCsv, buildSessionReportHtml, reportBaseName } from '../demo/report-export.js';

test('exports one CSV row per observation and preserves missing signal', () => {
  const csv = buildSessionCsv({ samples: [{ t: 1, score: 82 }, { t: 2, score: null }] });
  assert.match(csv, /"1","00:01","82","true"/);
  assert.match(csv, /"2","00:02","","false"/);
});

test('builds a safe standalone report with recommendations', () => {
  const html = buildSessionReportHtml({
    createdAt: '2026-09-23T12:00:00Z', task: '<script>alert(1)</script>', durationSeconds: 90,
    report: { averageScore: 81, suggested: '8–12 min', best: { start: 4, end: 30 }, firstShift: 65, usable: 80, quality: 89 },
    recommendations: ['Try one chapter & reflect.'], samples: [{ t: 1, score: 81 }],
  });
  assert.match(html, /<!doctype html>/);
  assert.match(html, /8–12 min/);
  assert.match(html, /Average focus estimate/);
  assert.match(html, /Focus interpretation/);
  assert.match(html, /75–100 · steady/);
  assert.match(html, /#458875/);
  assert.match(html, /Try one chapter &amp; reflect\./);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(reportBaseName('2026-09-23T12:34:00Z'), /^learnfit-session-2026-09-23-1234$/);
});

test('timer-only exports never invent eye measurements', () => {
  const csv = buildSessionCsv({ sessionMode: 'timer', durationSeconds: 125 });
  assert.match(csv, /"timer","125","02:05","",""/);
  const html = buildSessionReportHtml({
    createdAt: '2026-10-05T12:00:00Z', durationSeconds: 125, sessionMode: 'timer', samples: [],
    report: { averageScore: null, suggested: null, best: null, firstShift: null, usable: 0, quality: null },
    recommendations: ['Write one goal.'],
  });
  assert.match(html, /No focus score was calculated/);
  assert.doesNotMatch(html, /75–100 · steady/);
});
