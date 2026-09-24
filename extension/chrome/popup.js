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
  downloadReport: document.querySelector('#download-report'),
  downloadCsv: document.querySelector('#download-csv'),
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
  elements.downloadReport.hidden = session.phase !== 'complete';
  elements.downloadCsv.hidden = session.phase !== 'complete';
  elements.pause.textContent = session.phase === 'paused' ? 'Resume' : 'Pause';
}

async function update(type) {
  for (const button of [elements.start, elements.pause, elements.stop, elements.feedback, elements.downloadReport, elements.downloadCsv]) button.disabled = true;
  try { session = await send(type); } catch (error) { session = { ...session, error: error.message }; }
  for (const button of [elements.start, elements.pause, elements.stop, elements.feedback, elements.downloadReport, elements.downloadCsv]) button.disabled = false;
  render();
}

elements.start.addEventListener('click', async () => {
  await send('LEARNFIT_OPEN_SETUP');
  window.close();
});
elements.pause.addEventListener('click', () => update(session.phase === 'paused' ? 'LEARNFIT_RESUME' : 'LEARNFIT_PAUSE'));
elements.stop.addEventListener('click', () => update('LEARNFIT_STOP'));
elements.feedback.addEventListener('click', async () => { await send('LEARNFIT_OPEN_FEEDBACK'); window.close(); });

function downloadText(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function recommendations() {
  return [
    `Try a gentle self-check around ${session.optimalDuration ?? 25} minutes; treat it as an experiment, not a limit.`,
    'Use the rhythm score as one clue alongside how the work actually felt.',
    'Keep lighting and camera position similar when you want to compare sessions.',
  ];
}

elements.downloadCsv.addEventListener('click', () => {
  const rows = [
    ['metric', 'value'],
    ['study_time_seconds', Math.round(elapsedMs() / 1000)],
    ['final_rhythm_score', session.score ?? ''],
    ['suggested_check_in_minutes', session.optimalDuration ?? 25],
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  downloadText(`learnfit-extension-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
});

elements.downloadReport.addEventListener('click', () => {
  const items = recommendations().map((item) => `<li>${item}</li>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LearnFit report</title><style>body{max-width:760px;margin:40px auto;padding:0 22px;font-family:Arial;color:#17362c;background:#f2ede3}h1,h2,strong{font-family:Georgia,serif}h1{font-size:54px}.card{background:#fffdf8;border:1px solid #17362c;padding:22px;margin:16px 0}.metrics{display:grid;grid-template-columns:repeat(3,1fr)}.metrics div{border:1px solid #17362c;padding:18px}.metrics small{display:block;color:#b94b36}.metrics strong{display:block;font-size:27px;margin-top:12px}li{margin:12px 0;line-height:1.5}.fine{font-size:11px;color:#5f7067;line-height:1.6}@media(max-width:600px){.metrics{grid-template-columns:1fr}}</style></head><body><small>LEARNFIT · CHROME EXTENSION REPORT</small><h1>Your study rhythm.</h1><p>${new Date().toLocaleString()}</p><section class="metrics"><div><small>STUDY TIME</small><strong>${formatDuration(elapsedMs())}</strong></div><div><small>FINAL SCORE</small><strong>${session.score ?? '—'} / 100</strong></div><div><small>CHECK-IN</small><strong>${session.optimalDuration ?? 25} min</strong></div></section><section class="card"><h2>Small experiments to try</h2><ul>${items}</ul></section><p class="fine">The rhythm score is a rule-based reflection signal, not a percentage of attention or a measure of intelligence, health, or academic ability. Camera frames and eye measurements stayed on this device.</p></body></html>`;
  downloadText(`learnfit-extension-report-${new Date().toISOString().slice(0, 10)}.html`, html, 'text/html;charset=utf-8');
});
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'LEARNFIT_STATE_CHANGED') { session = message.session; render(); }
});
send('LEARNFIT_GET_STATE').then((state) => { session = state; render(); });
setInterval(() => { if (session.running) elements.duration.textContent = formatDuration(elapsedMs()); }, 1000);
