export const RESEARCH_CONSENT_KEY = 'learnfitResearchConsent';
export const ANONYMOUS_ID_KEY = 'learnfitAnonymousId';
export const PRODUCT_VERSION = 'web-0.9';

export function getAnonymousId(storage = localStorage) {
  let id = storage.getItem(ANONYMOUS_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem(ANONYMOUS_ID_KEY, id);
  }
  return id;
}

export function getResearchConsent(storage = localStorage) {
  return storage.getItem(RESEARCH_CONSENT_KEY) === 'true';
}

export function setResearchConsent(value, storage = localStorage) {
  storage.setItem(RESEARCH_CONSENT_KEY, String(Boolean(value)));
}

async function postJson(path, payload) {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The research service is temporarily unavailable.');
  return body;
}

export function postResearchEvent({ sessionId, source, eventType, durationSeconds = 0, score = null, appVersion = PRODUCT_VERSION }) {
  return postJson('/api/events', {
    anonymousId: getAnonymousId(), sessionId, source, eventType,
    durationSeconds, score, appVersion,
  });
}

export function postAggregateUsage({ source, eventType, durationSeconds = 0 }) {
  return postJson('/api/usage', { source, eventType, durationSeconds });
}

export function submitResearchFeedback({ sessionId, source, durationSeconds, verifiedSeconds = durationSeconds, offTaskSeconds = 0, trackingCoverage = 0, score, appVersion, ease, usefulness, trust, selfReportedFocus, onTaskShare, wouldUse, mostUseful, confusing, consent }) {
  return postJson('/api/feedback', {
    anonymousId: getAnonymousId(), sessionId, source, durationSeconds, verifiedSeconds, offTaskSeconds, trackingCoverage, score,
    appVersion, ease, usefulness, trust, selfReportedFocus, onTaskShare, wouldUse, mostUseful, confusing, consent,
  });
}

export function parseFeedbackHash(hash = location.hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const durationSeconds = Number(params.get('durationSeconds'));
  const verifiedSeconds = Number(params.get('verifiedSeconds'));
  const offTaskSeconds = Number(params.get('offTaskSeconds'));
  const trackingCoverage = Number(params.get('trackingCoverage'));
  const scoreValue = params.get('score');
  const score = scoreValue === '' || scoreValue === null ? null : Number(scoreValue);
  return {
    sessionId: params.get('sessionId') || crypto.randomUUID(),
    source: params.get('source') === 'extension' ? 'extension' : 'web',
    durationSeconds: Number.isFinite(durationSeconds) ? Math.max(0, Math.round(durationSeconds)) : 0,
    verifiedSeconds: Number.isFinite(verifiedSeconds) ? Math.max(0, Math.round(verifiedSeconds)) : 0,
    offTaskSeconds: Number.isFinite(offTaskSeconds) ? Math.max(0, Math.round(offTaskSeconds)) : 0,
    trackingCoverage: Number.isFinite(trackingCoverage) ? Math.max(0, Math.min(100, trackingCoverage)) : 0,
    score: Number.isFinite(score) ? score : null,
    appVersion: (params.get('appVersion') || 'unknown').slice(0, 32),
  };
}

export function buildRatingControls(container) {
  const name = container.dataset.rating;
  const labels = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];
  container.replaceChildren(...labels.map((label, index) => {
    const wrapper = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = String(index + 1); input.required = true;
    const number = document.createElement('span'); number.textContent = String(index + 1);
    const title = document.createElement('small'); title.textContent = label;
    wrapper.append(input, number, title);
    return wrapper;
  }));
}
