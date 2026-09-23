const ID_PATTERN = /^[A-Za-z0-9-]{8,80}$/;
const SOURCES = new Set(['web', 'extension']);
const EVENT_TYPES = new Set(['started', 'completed']);
const WOULD_USE = new Set(['yes', 'maybe', 'no']);

const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const number = (value, min, max, nullable = false) => {
  if (nullable && (value === null || value === '')) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new Error('A numeric field is outside its allowed range.');
  return Math.round(parsed * 100) / 100;
};

export function validateUsage(body) {
  if (!SOURCES.has(body.source) || !EVENT_TYPES.has(body.eventType)) throw new Error('Invalid aggregate usage event.');
  const durationSeconds = Math.round(number(body.durationSeconds ?? 0, 0, 86400));
  return { source: body.source, eventType: body.eventType, durationSeconds: body.eventType === 'completed' ? durationSeconds : 0 };
}

export function validateEvent(body) {
  if (!ID_PATTERN.test(body.anonymousId || '') || !ID_PATTERN.test(body.sessionId || '')) throw new Error('Invalid anonymous session identifiers.');
  if (!SOURCES.has(body.source) || !EVENT_TYPES.has(body.eventType)) throw new Error('Invalid research event.');
  return {
    anonymousId: body.anonymousId,
    sessionId: body.sessionId,
    source: body.source,
    eventType: body.eventType,
    durationSeconds: number(body.durationSeconds ?? 0, 0, 86400),
    score: number(body.score, 0, 100, true),
    appVersion: text(body.appVersion, 32) || 'unknown',
  };
}

export function validateFeedback(body) {
  const common = validateEvent({ ...body, eventType: 'completed' });
  const ease = number(body.ease, 1, 5);
  const usefulness = number(body.usefulness, 1, 5);
  const trust = number(body.trust, 1, 5);
  const mostUseful = text(body.mostUseful, 600);
  const confusing = text(body.confusing, 600);
  if (!Number.isInteger(ease) || !Number.isInteger(usefulness) || !Number.isInteger(trust)) throw new Error('Ratings must be whole numbers from 1 to 5.');
  if (!WOULD_USE.has(body.wouldUse) || body.consent !== true) throw new Error('Complete the required questions and consent before submitting.');
  return { ...common, ease, usefulness, trust, wouldUse: body.wouldUse, mostUseful, confusing };
}
