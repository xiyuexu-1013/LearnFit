const DEFAULT_SESSION = {
  sessionId: null,
  running: false,
  phase: 'ready',
  previousPhase: null,
  score: null,
  status: 'Ready to begin',
  startedAt: null,
  lastResumedAt: null,
  elapsedMs: 0,
  optimalDuration: 25,
  calibrationProgress: 0,
  error: null,
};

let creatingOffscreen;
const FEEDBACK_URL = 'https://learnfit.pages.dev/feedback';

function feedbackUrl(session) {
  const params = new URLSearchParams({
    source: 'extension',
    sessionId: session.sessionId || crypto.randomUUID(),
    durationSeconds: String(Math.max(0, Math.round((session.elapsedMs || 0) / 1000))),
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

async function hasOffscreenDocument() {
  const documentUrl = chrome.runtime.getURL('offscreen.html');
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [documentUrl],
  });
  return contexts.length > 0;
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) return;
  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Continue the user-started, on-device study rhythm analysis while normal tabs change or close.',
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

async function startSession() {
  await saveSession({ ...DEFAULT_SESSION, sessionId: crypto.randomUUID(), running: true, phase: 'starting', status: 'Starting private tracking…' });
  try {
    await sendToTracker('LEARNFIT_TRACKER_START');
    return getSession();
  } catch (error) {
    return saveSession({ ...DEFAULT_SESSION, phase: 'error', status: 'Camera tracking could not start', error: error.message });
  }
}

async function pauseSession() {
  const session = await getSession();
  if (!session.running || session.phase === 'paused') return session;
  await sendToTracker('LEARNFIT_TRACKER_PAUSE');
  const now = Date.now();
  return saveSession({
    ...session,
    phase: 'paused',
    previousPhase: session.phase,
    status: 'Paused',
    elapsedMs: session.lastResumedAt ? session.elapsedMs + now - session.lastResumedAt : session.elapsedMs,
    lastResumedAt: null,
  });
}

async function resumeSession() {
  const session = await getSession();
  if (!session.running || session.phase !== 'paused') return session;
  await sendToTracker('LEARNFIT_TRACKER_RESUME');
  const phase = session.previousPhase === 'calibrating' ? 'calibrating' : 'active';
  return saveSession({
    ...session,
    phase,
    previousPhase: null,
    status: phase === 'calibrating' ? 'Calibrating your baseline' : 'Tracking your study rhythm',
    lastResumedAt: phase === 'active' ? Date.now() : null,
  });
}

async function stopSession() {
  const session = await getSession();
  const now = Date.now();
  const completed = await saveSession({
    ...session,
    running: false,
    phase: 'complete',
    previousPhase: null,
    status: session.score === null ? 'Session ended before a score was ready' : 'Session complete',
    elapsedMs: session.lastResumedAt ? session.elapsedMs + now - session.lastResumedAt : session.elapsedMs,
    lastResumedAt: null,
  });
  if (await hasOffscreenDocument()) {
    await chrome.runtime.sendMessage({ type: 'LEARNFIT_TRACKER_STOP', target: 'offscreen' }).catch(() => {});
    await chrome.offscreen.closeDocument().catch(() => {});
  }
  await openFeedback(completed).catch(() => {});
  return completed;
}

chrome.runtime.onInstalled.addListener(() => saveSession(DEFAULT_SESSION));
chrome.runtime.onStartup.addListener(async () => {
  const session = await getSession();
  if (session.running) await saveSession({ ...DEFAULT_SESSION, status: 'Chrome restarted · start a new session' });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target === 'offscreen' || message.type === 'LEARNFIT_STATE_CHANGED') return false;
  (async () => {
    if (message.type === 'LEARNFIT_GET_STATE') sendResponse(await getSession());
    if (message.type === 'LEARNFIT_OPEN_SETUP') {
      const tab = await chrome.tabs.create({ url: chrome.runtime.getURL('permission.html') });
      sendResponse({ ok: true, tabId: tab.id });
    }
    if (message.type === 'LEARNFIT_START') sendResponse(await startSession());
    if (message.type === 'LEARNFIT_PAUSE') sendResponse(await pauseSession());
    if (message.type === 'LEARNFIT_RESUME') sendResponse(await resumeSession());
    if (message.type === 'LEARNFIT_STOP') sendResponse(await stopSession());
    if (message.type === 'LEARNFIT_OPEN_FEEDBACK') sendResponse(await openFeedback());
    if (message.type === 'LEARNFIT_TRACKER_STATUS') {
      const session = await getSession();
      if (!session.running) return;
      sendResponse(await saveSession({
        ...session,
        phase: message.phase ?? session.phase,
        status: message.status ?? session.status,
        calibrationProgress: message.calibrationProgress ?? session.calibrationProgress,
        error: message.error ?? null,
      }));
    }
    if (message.type === 'LEARNFIT_TRACKER_DATA') {
      const session = await getSession();
      if (!session.running || session.phase === 'paused') return;
      const now = Date.now();
      const becameActive = session.phase !== 'active' && !message.isCalibrating;
      sendResponse(await saveSession({
        ...session,
        phase: message.isCalibrating ? 'calibrating' : 'active',
        score: message.isCalibrating ? null : message.score,
        status: message.status,
        optimalDuration: message.optimalDuration,
        calibrationProgress: message.calibrationProgress,
        startedAt: becameActive ? now : session.startedAt,
        lastResumedAt: becameActive ? now : session.lastResumedAt,
        error: null,
      }));
    }
  })().catch(async (error) => {
    const session = await getSession();
    sendResponse(await saveSession({ ...session, status: 'Extension error', error: error.message }));
  });
  return true;
});
