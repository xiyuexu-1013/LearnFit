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
  assert.match(html, /Try one chapter &amp; reflect\./);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(reportBaseName('2026-09-23T12:34:00Z'), /^learnfit-session-2026-09-23-1234$/);
});
