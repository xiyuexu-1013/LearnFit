const elements = {
  score: document.querySelector('#score'),
  status: document.querySelector('#status'),
  duration: document.querySelector('#duration'),
  checkIn: document.querySelector('#check-in'),
  progress: document.querySelector('#progress'),
  progressRow: document.querySelector('#progress-row'),
  error: document.querySelector('#error'),
  start: document.querySelector('#start'),
  pause: document.querySelector('#pause'),
  stop: document.querySelector('#stop'),
  feedback: document.querySelector('#feedback'),
};

let session = { running: false, phase: 'ready', score: null, elapsedMs: 0, optimalDuration: 25 };
const send = (type) => chrome.runtime.sendMessage({ type });

function elapsedMs() {
  return session.elapsedMs + (session.phase === 'active' && session.lastResumedAt ? Date.now() - session.lastResumedAt : 0);
}

function formatDuration(milliseconds) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function render() {
  elements.score.textContent = session.score ?? '—';
  elements.status.textContent = session.status ?? 'Ready to begin';
  elements.duration.textContent = formatDuration(elapsedMs());
  elements.checkIn.textContent = `${session.optimalDuration ?? 25} min`;
  elements.progress.value = Math.round((session.calibrationProgress ?? 0) * 100);
  elements.progressRow.hidden = session.phase !== 'calibrating' && session.phase !== 'starting';
  elements.error.textContent = session.error ?? '';
  elements.error.hidden = !session.error;
  elements.start.hidden = session.running;
  elements.pause.hidden = !session.running;
  elements.stop.hidden = !session.running;
  elements.feedback.hidden = session.phase !== 'complete';
  elements.pause.textContent = session.phase === 'paused' ? 'Resume' : 'Pause';
}

async function update(type) {
  for (const button of [elements.start, elements.pause, elements.stop, elements.feedback]) button.disabled = true;
  try { session = await send(type); } catch (error) { session = { ...session, error: error.message }; }
  for (const button of [elements.start, elements.pause, elements.stop, elements.feedback]) button.disabled = false;
  render();
}

elements.start.addEventListener('click', async () => {
  await send('LEARNFIT_OPEN_SETUP');
  window.close();
});
elements.pause.addEventListener('click', () => update(session.phase === 'paused' ? 'LEARNFIT_RESUME' : 'LEARNFIT_PAUSE'));
elements.stop.addEventListener('click', () => update('LEARNFIT_STOP'));
elements.feedback.addEventListener('click', async () => { await send('LEARNFIT_OPEN_FEEDBACK'); window.close(); });
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'LEARNFIT_STATE_CHANGED') { session = message.session; render(); }
});
send('LEARNFIT_GET_STATE').then((state) => { session = state; render(); });
setInterval(() => { if (session.running) elements.duration.textContent = formatDuration(elapsedMs()); }, 1000);
