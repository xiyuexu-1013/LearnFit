import { classifyTaskPage, finalFocusEstimate, normalizePage, trackingCoverage } from './task-context.js';

const DEFAULT_SESSION = {
  sessionId: null, running: false, phase: 'ready', previousPhase: null,
  score: null, currentScore: null, scoreTotal: 0, scoreSamples: 0,
  status: 'Ready to begin', startedAt: null, optimalDuration: 25,
  calibrationProgress: 0, error: null, contextState: 'off-task',
  activePage: null, allowedPages: [], verifiedMs: 0, offTaskMs: 0,
  noSignalMs: 0, validSignalMs: 0, signalAvailable: false, lastAccountedAt: null,
};

let creatingOffscreen;
let contextUpdate;
let browserFocused = true;
const FEEDBACK_URL = 'https://learnfit.pages.dev/feedback';
const USAGE_URL = 'https://learnfit.pages.dev/api/usage';

async function postAggregateUsage(eventType, durationSeconds = 0) {
  const response = await fetch(USAGE_URL, {
    method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'extension', eventType, durationSeconds }),
  });
  if (!response.ok) throw new Error('Anonymous usage total could not be updated.');
}

function feedbackUrl(session) {
  const params = new URLSearchParams({
    source: 'extension', sessionId: session.sessionId || crypto.randomUUID(),
    durationSeconds: String(Math.max(0, Math.round(session.verifiedMs / 1000))),
    verifiedSeconds: String(Math.max(0, Math.round(session.verifiedMs / 1000))),
    offTaskSeconds: String(Math.max(0, Math.round(session.offTaskMs / 1000))),
    trackingCoverage: String(trackingCoverage(session)),
    score: session.score === null ? '' : String(session.score),
    appVersion: `extension-${chrome.runtime.getManifest().version}`,
  });
  return `${FEEDBACK_URL}#${params}`;
}

async function openFeedback(session) {
  session ||= await getSession();
  const tab = await chrome.tabs.create({ url: feedbackUrl(session) });
  return { ok: true, tabId: tab.id };
}

async function getSession() {
  const { learnfitSession } = await chrome.storage.local.get('learnfitSession');
  return { ...DEFAULT_SESSION, ...learnfitSession };
}

async function saveSession(session) {
  await chrome.storage.local.set({ learnfitSession: session });
  chrome.runtime.sendMessage({ type: 'LEARNFIT_STATE_CHANGED', session }).catch(() => {});
  return session;
}

function account(session, now = Date.now()) {
  if (!session.running || !session.lastAccountedAt || session.phase === 'paused' || !['active', 'calibrating'].includes(session.phase)) {
    return { ...session, lastAccountedAt: session.running ? now : null };
  }
  const elapsed = Math.max(0, now - session.lastAccountedAt);
  const next = { ...session, lastAccountedAt: now };
  if (session.contextState !== 'study') next.offTaskMs += elapsed;
  else if (session.phase === 'active') {
    next.verifiedMs += elapsed;
    if (session.signalAvailable) next.validSignalMs += elapsed;
    else next.noSignalMs += elapsed;
  }
  return next;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab || null;
}

function publicPage(tab) {
  const url = normalizePage(tab?.url);
  if (!url) return null;
  return { tabId: tab.id, url, title: String(tab.title || new URL(url).hostname).slice(0, 160) };
}

async function hasOffscreenDocument() {
  const documentUrl = chrome.runtime.getURL('offscreen.html');
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [documentUrl] });
  return contexts.length > 0;
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) return;
  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: 'offscreen.html', reasons: ['USER_MEDIA'],
      justification: 'Continue the user-started, on-device focus estimate while verified study tabs are active.',
    }).finally(() => { creatingOffscreen = null; });
  }
  await creatingOffscreen;
}

async function sendToTracker(type) {
  await ensureOffscreenDocument();
  let lastError;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const result = await chrome.runtime.sendMessage({ type, target: 'offscreen' });
      if (result?.ok === false) throw new Error(result.error ?? 'Background tracking could not start.');
      if (result) return result;
    } catch (error) {
      lastError = error;
      if (!error.message.includes('Receiving end does not exist')) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError ?? new Error('The private background tracker did not become ready.');
}

function contextStatus(state, phase) {
  if (state === 'needs-confirmation') return 'Confirm this page before tracking';
  if (state === 'off-task') return 'Off task · focus score paused';
  return phase === 'calibrating' ? 'Calibrating on your study page' : 'Estimating focus on your study page';
}

async function refreshTaskContext() {
  if (contextUpdate) return contextUpdate;
  contextUpdate = (async () => {
    let session = await getSession();
    if (!session.running) return session;
    const tab = browserFocused ? await activeTab() : null;
    const state = browserFocused ? classifyTaskPage(tab, session.allowedPages) : 'off-task';
    const changed = state !== session.contextState;
    session = account(session);
    session.contextState = state;
    session.activePage = publicPage(tab);
    session.status = contextStatus(state, session.phase);
    session.signalAvailable = state === 'study' ? session.signalAvailable : false;
    if (changed && await hasOffscreenDocument()) {
      await sendToTracker(state === 'study' && session.phase !== 'paused' ? 'LEARNFIT_TRACKER_RESUME' : 'LEARNFIT_TRACKER_PAUSE').catch(() => {});
    }
    return saveSession(session);
  })().finally(() => { contextUpdate = null; });
  return contextUpdate;
}

async function startSession() {
  const stored = await chrome.storage.local.get('pendingStudyPage');
  const pending = stored.pendingStudyPage;
  const initial = pending?.url ? [{ tabId: pending.tabId, url: normalizePage(pending.url), title: pending.title || 'Study page' }] : [];
  await saveSession({
    ...DEFAULT_SESSION, sessionId: crypto.randomUUID(), running: true, phase: 'starting',
    status: 'Starting private tracking…', allowedPages: initial, activePage: pending || null,
    contextState: initial.length ? 'study' : 'off-task', lastAccountedAt: Date.now(),
  });
  try {
    if (pending?.tabId) await chrome.tabs.update(pending.tabId, { active: true }).catch(() => {});
    await sendToTracker('LEARNFIT_TRACKER_START');
    await postAggregateUsage('started').catch(() => {});
    await chrome.storage.local.remove('pendingStudyPage');
    return refreshTaskContext();
  } catch (error) {
    return saveSession({ ...DEFAULT_SESSION, phase: 'error', status: 'Camera tracking could not start', error: error.message });
  }
}

async function pauseSession() {
  let session = await getSession();
  if (!session.running || session.phase === 'paused') return session;
  session = account(session);
  await sendToTracker('LEARNFIT_TRACKER_PAUSE');
  return saveSession({ ...session, phase: 'paused', previousPhase: session.phase, status: 'Paused', signalAvailable: false });
}

async function resumeSession() {
  let session = await getSession();
  if (!session.running || session.phase !== 'paused') return session;
  const phase = session.previousPhase === 'calibrating' ? 'calibrating' : 'active';
  session = { ...session, phase, previousPhase: null, lastAccountedAt: Date.now() };
  if (session.contextState === 'study') await sendToTracker('LEARNFIT_TRACKER_RESUME');
  return saveSession({ ...session, status: contextStatus(session.contextState, phase) });
}

async function allowCurrentPage() {
  let session = account(await getSession());
  const page = publicPage(await activeTab());
  if (!session.running || !page) return session;
  const allowedPages = session.allowedPages.filter((item) => item.tabId !== page.tabId && item.url !== page.url).concat(page);
  session = { ...session, allowedPages, activePage: page, contextState: 'study', status: contextStatus('study', session.phase), lastAccountedAt: Date.now() };
  if (session.phase !== 'paused') await sendToTracker('LEARNFIT_TRACKER_RESUME').catch(() => {});
  return saveSession(session);
}

async function stopSession() {
  let session = await getSession();
  if (!session.running) return session;
  session = account(session);
  const score = finalFocusEstimate(session);
  const completed = await saveSession({
    ...session, running: false, phase: 'complete', previousPhase: null, score,
    currentScore: null, signalAvailable: false, lastAccountedAt: null,
    status: score === null ? 'Not enough tracking data' : 'Session complete',
  });
  if (await hasOffscreenDocument()) {
    await chrome.runtime.sendMessage({ type: 'LEARNFIT_TRACKER_STOP', target: 'offscreen' }).catch(() => {});
    await chrome.offscreen.closeDocument().catch(() => {});
  }
  await postAggregateUsage('completed', Math.max(0, Math.round(completed.verifiedMs / 1000))).catch(() => {});
  await openFeedback(completed).catch(() => {});
  return completed;
}

chrome.runtime.onInstalled.addListener(() => saveSession(DEFAULT_SESSION));
chrome.runtime.onStartup.addListener(async () => {
  const session = await getSession();
  if (session.running) await saveSession({ ...DEFAULT_SESSION, status: 'Chrome restarted · start a new session' });
});
chrome.tabs.onActivated.addListener(() => refreshTaskContext().catch(() => {}));
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) refreshTaskContext().catch(() => {});
});
chrome.windows.onFocusChanged.addListener((windowId) => {
  browserFocused = windowId !== chrome.windows.WINDOW_ID_NONE;
  refreshTaskContext().catch(() => {});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target === 'offscreen' || message.type === 'LEARNFIT_STATE_CHANGED') return false;
  (async () => {
    if (message.type === 'LEARNFIT_GET_STATE') sendResponse(await getSession());
    if (message.type === 'LEARNFIT_OPEN_SETUP') {
      const page = publicPage(await activeTab());
      if (page) await chrome.storage.local.set({ pendingStudyPage: page });
      const setup = await chrome.tabs.create({ url: chrome.runtime.getURL('permission.html') });
      sendResponse({ ok: true, tabId: setup.id });
    }
    if (message.type === 'LEARNFIT_START') sendResponse(await startSession());
    if (message.type === 'LEARNFIT_PAUSE') sendResponse(await pauseSession());
    if (message.type === 'LEARNFIT_RESUME') sendResponse(await resumeSession());
    if (message.type === 'LEARNFIT_ALLOW_CURRENT_PAGE') sendResponse(await allowCurrentPage());
    if (message.type === 'LEARNFIT_STOP') sendResponse(await stopSession());
    if (message.type === 'LEARNFIT_OPEN_FEEDBACK') sendResponse(await openFeedback());
    if (message.type === 'LEARNFIT_TRACKER_SIGNAL') {
      let session = account(await getSession());
      if (!session.running || session.phase === 'paused' || session.contextState !== 'study') return sendResponse(session);
      session.signalAvailable = Boolean(message.available);
      if (!message.available && session.phase === 'active') session.status = 'No signal · focus score paused';
      sendResponse(await saveSession(session));
    }
    if (message.type === 'LEARNFIT_TRACKER_STATUS') {
      let session = account(await getSession());
      if (!session.running) return;
      const phase = message.phase ?? session.phase;
      sendResponse(await saveSession({
        ...session, phase, status: session.contextState === 'study' ? (message.status ?? session.status) : contextStatus(session.contextState, phase),
        calibrationProgress: message.calibrationProgress ?? session.calibrationProgress, error: message.error ?? null,
      }));
    }
    if (message.type === 'LEARNFIT_TRACKER_DATA') {
      let session = account(await getSession());
      if (!session.running || session.phase === 'paused' || session.contextState !== 'study') return sendResponse(session);
      const phase = message.isCalibrating ? 'calibrating' : 'active';
      const isScored = phase === 'active' && Number.isFinite(message.score);
      sendResponse(await saveSession({
        ...session, phase, currentScore: isScored ? message.score : null,
        scoreTotal: session.scoreTotal + (isScored ? message.score : 0), scoreSamples: session.scoreSamples + (isScored ? 1 : 0),
        signalAvailable: true, status: message.isCalibrating ? 'Calibrating on your study page' : message.status,
        optimalDuration: message.optimalDuration, calibrationProgress: message.calibrationProgress,
        startedAt: phase === 'active' && !session.startedAt ? Date.now() : session.startedAt, error: null,
      }));
    }
  })().catch(async (error) => {
    const session = await getSession();
    sendResponse(await saveSession({ ...session, status: 'Extension error', error: error.message }));
  });
  return true;
});
