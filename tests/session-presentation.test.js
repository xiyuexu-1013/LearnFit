import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecommendations, interpretFocus } from '../demo/session.js';

test('focus interpretation uses the same visible score bands as the chart', () => {
  assert.equal(interpretFocus(82, 90).key, 'steady');
  assert.equal(interpretFocus(68, 90).key, 'changing');
  assert.equal(interpretFocus(48, 90).key, 'shifted');
  assert.equal(interpretFocus(82, 59).key, 'unavailable');
});

test('report advice responds to score, first shift, coverage, and session length', () => {
  const recommendations = buildRecommendations({ averageScore: 64, quality: 70, usable: 210, firstShift: 180 }, 240);
  assert.match(recommendations.join(' '), /64\/100/);
  assert.match(recommendations.join(' '), /03:00/);
  assert.match(recommendations.join(' '), /00:30 had no usable eye signal/);
  assert.match(recommendations.join(' '), /under five minutes/);
  assert.match(recommendations.join(' '), /one concrete outcome/);
  assert.match(recommendations.join(' '), /silence notifications/);
});
