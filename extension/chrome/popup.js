import { trackingCoverage } from './task-context.js';

const elements = Object.fromEntries([
  'score','status','duration','coverage','off-task','no-signal','progress','progress-row','error','start','allow-page',
  'pause','stop','feedback','download-report','download-csv','context','context-state',
].map((id) => [id.replaceAll('-', '_'), document.querySelector(`#${id}`)]));

let session = { running: false, phase: 'ready', score: null, currentScore: null, verifiedMs: 0, offTaskMs: 0, noSignalMs: 0, validSignalMs: 0 };
const send = (type) => chrome.runtime.sendMessage({ type });

function liveSession(now = Date.now()) {
  const next = { ...session };
  if (!next.running || !next.lastAccountedAt || next.phase === 'paused' || !['active', 'calibrating'].includes(next.phase)) return next;
  const elapsed = Math.max(0, now - next.lastAccountedAt);
  if (next.contextState !== 'study') next.offTaskMs += elapsed;
  else if (next.phase === 'active') {
    next.verifiedMs += elapsed;
    if (next.signalAvailable) next.validSignalMs += elapsed;
    else next.noSignalMs += elapsed;
  }
  return next;
}

function formatDuration(milliseconds) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function contextLabel(state) {
  if (state === 'study') return 'STUDY';
  if (state === 'needs-confirmation') return 'NEEDS CONFIRMATION';
  return 'OFF TASK';
}

function render() {
  const live = liveSession();
  elements.score.textContent = live.running ? (live.contextState === 'study' && live.signalAvailable ? live.currentScore ?? '—' : '—') : live.score ?? '—';
  elements.status.textContent = live.status ?? 'Ready to begin';
  elements.duration.textContent = formatDuration(live.verifiedMs);
  elements.coverage.textContent = `${trackingCoverage(live)}%`;
  elements.off_task.textContent = formatDuration(live.offTaskMs);
  elements.no_signal.textContent = formatDuration(live.noSignalMs);
  elements.context.hidden = !live.running;
  elements.context_state.textContent = contextLabel(live.contextState);
  elements.progress.value = Math.round((live.calibrationProgress ?? 0) * 100);
  elements.progress_row.hidden = live.phase !== 'calibrating' && live.phase !== 'starting';
  elements.error.textContent = live.error ?? '';
  elements.error.hidden = !live.error;
  elements.start.hidden = live.running;
  elements.allow_page.hidden = !live.running || live.contextState === 'study' || live.phase === 'paused';
  elements.pause.hidden = !live.running;
  elements.stop.hidden = !live.running;
  elements.feedback.hidden = live.phase !== 'complete';
  elements.download_report.hidden = live.phase !== 'complete';
  elements.download_csv.hidden = live.phase !== 'complete';
  elements.pause.textContent = live.phase === 'paused' ? 'Resume' : 'Pause';
}

async function update(type) {
  document.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  try { session = await send(type); } catch (error) { session = { ...session, error: error.message }; }
  document.querySelectorAll('button').forEach((button) => { button.disabled = false; });
  render();
}

elements.start.addEventListener('click', async () => { await send('LEARNFIT_OPEN_SETUP'); window.close(); });
elements.allow_page.addEventListener('click', () => update('LEARNFIT_ALLOW_CURRENT_PAGE'));
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
    'Use the focus estimate alongside what you completed and how focused the task actually felt.',
    trackingCoverage(session) < 60 ? 'Camera coverage was below 60%. Adjust lighting or camera position before comparing scores.' : 'Keep lighting and camera position similar when comparing sessions.',
  ];
}

elements.download_csv.addEventListener('click', () => {
  const rows = [
    ['metric', 'value'],
    ['verified_study_seconds', Math.round(session.verifiedMs / 1000)],
    ['off_task_seconds', Math.round(session.offTaskMs / 1000)],
    ['no_signal_seconds', Math.round(session.noSignalMs / 1000)],
    ['tracking_coverage_percent', trackingCoverage(session)],
    ['final_focus_estimate', session.score ?? ''],
    ['suggested_check_in_minutes', session.optimalDuration ?? 25],
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  downloadText(`learnfit-extension-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
});

elements.download_report.addEventListener('click', () => {
  const items = recommendations().map((item) => `<li>${item}</li>`).join('');
  const score = session.score === null ? 'Not enough tracking data' : `${session.score} / 100`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LearnFit report</title><style>body{max-width:850px;margin:40px auto;padding:0 22px;font-family:Arial;color:#17362c;background:#f2ede3}h1,h2,strong{font-family:Georgia,serif}h1{font-size:54px}.card{background:#fffdf8;border:1px solid #17362c;padding:22px;margin:16px 0}.metrics{display:grid;grid-template-columns:repeat(3,1fr)}.metrics div{border:1px solid #17362c;padding:18px}.metrics small{display:block;color:#b94b36}.metrics strong{display:block;font-size:24px;margin-top:12px}li{margin:12px 0;line-height:1.5}.fine{font-size:11px;color:#5f7067;line-height:1.6}@media(max-width:600px){.metrics{grid-template-columns:1fr}}</style></head><body><small>LEARNFIT · CHROME EXTENSION REPORT</small><h1>Your focus estimate.</h1><p>${new Date().toLocaleString()}</p><section class="metrics"><div><small>VERIFIED STUDY</small><strong>${formatDuration(session.verifiedMs)}</strong></div><div><small>FOCUS ESTIMATE</small><strong>${score}</strong></div><div><small>TRACKING COVERAGE</small><strong>${trackingCoverage(session)}%</strong></div><div><small>OFF TASK</small><strong>${formatDuration(session.offTaskMs)}</strong></div><div><small>NO SIGNAL</small><strong>${formatDuration(session.noSignalMs)}</strong></div><div><small>CHECK-IN</small><strong>${session.optimalDuration ?? 25} min</strong></div></section><section class="card"><h2>Small experiments to try</h2><ul>${items}</ul></section><p class="fine">LearnFit estimates changes in focus only while a page you verified for this screen-based study session is active and usable eye signals are available. A normal blink remains valid data. Switching pages or navigating pauses scoring until the page is verified. LearnFit cannot determine what happens inside an already verified page. Camera frames, eye measurements, page addresses, and page titles stayed on this device.</p></body></html>`;
  downloadText(`learnfit-extension-report-${new Date().toISOString().slice(0, 10)}.html`, html, 'text/html;charset=utf-8');
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'LEARNFIT_STATE_CHANGED') { session = message.session; render(); }
});
send('LEARNFIT_GET_STATE').then((state) => { session = state; render(); });
setInterval(() => { if (session.running) render(); }, 1000);
