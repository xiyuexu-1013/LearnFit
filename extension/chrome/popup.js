import { mountLanguage, localizeReportHtml } from './runtime/language.js';
mountLanguage({ extension: true });
import { mountTutorial, TUTORIAL_KEY } from './runtime/tutorial.js';
import { trackingCoverage } from './task-context.js';

const cameraNote = document.createElement('p');
cameraNote.className = 'tagline';
cameraNote.innerHTML = '<strong>You do not need to stare at the camera.</strong> Study naturally; missing eye signal creates a gap, not a low score.';
document.querySelector('#tutorial-help').before(cameraNote);

const elements = Object.fromEntries([
  'score','status','duration','coverage','off-task','no-signal','progress','progress-row','error','start','timer-start','allow-page',
  'pause','stop','feedback','download-report','download-csv','context','context-state',
].map((id) => [id.replaceAll('-', '_'), document.querySelector(`#${id}`)]));

let session = { running: false, phase: 'ready', score: null, currentScore: null, verifiedMs: 0, offTaskMs: 0, noSignalMs: 0, validSignalMs: 0 };
const send = (type) => chrome.runtime.sendMessage({ type });

function liveSession(now = Date.now()) {
  const next = { ...session };
  if (!next.running || !next.lastAccountedAt || next.phase === 'paused' || !['active', 'calibrating'].includes(next.phase)) return next;
  const elapsed = Math.max(0, now - next.lastAccountedAt);
  if (next.sessionMode === 'timer' && next.phase === 'active') { next.verifiedMs += elapsed; return next; }
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

function focusInterpretation(score, coverage = 100) {
  if (!Number.isFinite(score) || coverage < 60) return { label: 'Not enough tracking data', description: 'Improve camera coverage before interpreting this session.' };
  if (score >= 75) return { label: 'Steady relative to your baseline', description: 'Measured eye signals stayed mostly close to your personal baseline.' };
  if (score >= 60) return { label: 'Some focus-pattern change', description: 'Measured eye signals changed moderately from your personal baseline.' };
  return { label: 'Marked focus-pattern change', description: 'Measured eye signals differed noticeably from your personal baseline.' };
}

function render() {
  const live = liveSession();
  elements.score.textContent = live.sessionMode === 'timer' ? '—' : live.running ? (live.contextState === 'study' && live.signalAvailable ? live.currentScore ?? '—' : '—') : live.score ?? '—';
  elements.status.textContent = live.status ?? 'Ready to begin';
  elements.duration.textContent = formatDuration(live.verifiedMs);
  elements.coverage.textContent = live.sessionMode === 'timer' ? '—' : `${trackingCoverage(live)}%`;
  elements.off_task.textContent = formatDuration(live.offTaskMs);
  elements.no_signal.textContent = formatDuration(live.noSignalMs);
  elements.context.hidden = !live.running || live.sessionMode === 'timer';
  elements.context_state.textContent = contextLabel(live.contextState);
  const unsupportedPage = live.running && live.sessionMode !== 'timer' && !live.activePage;
  elements.allow_page.textContent = unsupportedPage ? 'Open a webpage or PDF first' : 'I’m studying on this page';
  elements.progress.value = Math.round((live.calibrationProgress ?? 0) * 100);
  elements.progress_row.hidden = live.phase !== 'calibrating' && live.phase !== 'starting';
  const visibleError = live.error ?? live.pageError ?? '';
  elements.error.textContent = visibleError;
  elements.error.hidden = !visibleError;
  elements.start.hidden = live.running;
  elements.timer_start.hidden = live.running;
  elements.allow_page.hidden = !live.running || live.sessionMode === 'timer' || live.contextState === 'study' || live.phase === 'paused';
  elements.allow_page.disabled = unsupportedPage;
  elements.pause.hidden = !live.running;
  elements.stop.hidden = !live.running;
  elements.feedback.hidden = live.phase !== 'complete' || live.sessionMode === 'timer';
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
elements.timer_start.addEventListener('click', () => update('LEARNFIT_START_TIMER'));
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
  if (session.sessionMode === 'timer') return [
    'Before the next session, write one concrete outcome and close unrelated tabs.',
    'Use your chosen check-in as a prompt to review task progress and energy, not as a hard limit.',
    'At the end, close the material and write three ideas from memory.',
  ];
  const coverage = trackingCoverage(session);
  const interpretation = focusInterpretation(session.score, coverage);
  const scoreAdvice = interpretation.label === 'Steady relative to your baseline'
    ? `Your measured periods were mostly steady (${session.score}/100). Keep a similar study-block length, then close the material and write three ideas from memory.`
    : interpretation.label === 'Some focus-pattern change'
      ? `Your measured periods showed some change (${session.score}/100). Work on one source at a time, silence notifications, and check progress before the suggested check-in.`
      : interpretation.label === 'Marked focus-pattern change'
        ? `Your measured periods showed a marked change (${session.score}/100). Try a block about 5 minutes shorter, take a 2–5 minute screen break, then restart with one small next action.`
        : 'Improve tracking before interpreting the score: use even front lighting and keep the camera near eye level.';
  return [
    scoreAdvice,
    'Before the next session, write one concrete outcome—such as finishing one section or solving five problems—and close unrelated tabs.',
    `Try a gentle self-check around ${session.optimalDuration ?? 25} minutes; check task progress and energy instead of treating this as a hard limit.`,
    coverage < 80 ? `${formatDuration(session.noSignalMs)} had no usable eye signal. Adjust lighting or camera position before comparing scores.` : `Tracking coverage was ${coverage}%. Keep lighting and camera position similar when comparing sessions.`,
    'Compare the estimate with what you completed and your own focus rating; eye-pattern changes are not your complete mental state.',
  ];
}

elements.download_csv.addEventListener('click', () => {
  const rows = [
    ['metric', 'value'],
    ['session_mode', session.sessionMode || 'camera'],
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
  const score = session.sessionMode === 'timer' ? 'Not measured' : session.score === null ? 'Not enough tracking data' : `${session.score} / 100`;
  const interpretation = session.sessionMode === 'timer'
    ? { label: 'Timer-only session', description: 'No camera was used, so no focus estimate was calculated.' }
    : focusInterpretation(session.score, trackingCoverage(session));
  const sessionTime = session.verifiedMs + session.offTaskMs;
  const metrics = session.sessionMode === 'timer'
    ? `<div><small>SESSION MODE</small><strong>TIMER ONLY</strong></div><div><small>SESSION TIME</small><strong>${formatDuration(sessionTime)}</strong></div><div><small>FOCUS ESTIMATE</small><strong>NOT MEASURED</strong></div><div><small>CHECK-IN</small><strong>${session.optimalDuration ?? 25} min</strong></div>`
    : `<div><small>SESSION TIME</small><strong>${formatDuration(sessionTime)}</strong></div><div><small>VERIFIED STUDY</small><strong>${formatDuration(session.verifiedMs)}</strong></div><div><small>VALID OBSERVATION</small><strong>${formatDuration(session.validSignalMs)}</strong></div><div><small>FOCUS ESTIMATE</small><strong>${score}</strong></div><div><small>FOCUS INTERPRETATION</small><strong>${interpretation.label}</strong></div><div><small>TRACKING COVERAGE</small><strong>${trackingCoverage(session)}%</strong></div><div><small>OFF TASK</small><strong>${formatDuration(session.offTaskMs)}</strong></div><div><small>NO SIGNAL</small><strong>${formatDuration(session.noSignalMs)}</strong></div><div><small>CHECK-IN</small><strong>${session.optimalDuration ?? 25} min</strong></div>`;
  const boundary = session.sessionMode === 'timer'
    ? 'The camera stayed off. No eye measurements, tracking coverage, or focus estimate were created for this session.'
    : 'LearnFit estimates changes in focus only while a verified study tab is active and usable eye signals are available. You do not need to stare at the camera: study naturally, blink normally, and let unavailable eye tracking become a data gap rather than a low score. The starting tab, navigation within an included tab, and tabs opened directly from an included study tab stay connected. Independently opened tabs remain off task until you include them. Camera frames, eye measurements, page addresses, page titles, and tab relationships stayed on this device.';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LearnFit report</title><style>body{max-width:850px;margin:40px auto;padding:0 22px;font-family:Arial;color:#17362c;background:#f2ede3}h1,h2,strong{font-family:Georgia,serif}h1{font-size:54px}.card{background:#fffdf8;border:1px solid #17362c;padding:22px;margin:16px 0}.metrics{display:grid;grid-template-columns:repeat(3,1fr)}.metrics div{border:1px solid #17362c;padding:18px}.metrics small{display:block;color:#b94b36}.metrics strong{display:block;font-size:24px;margin-top:12px}li{margin:12px 0;line-height:1.5}.fine{font-size:11px;color:#5f7067;line-height:1.6}@media(max-width:600px){.metrics{grid-template-columns:1fr}}</style></head><body><small>LEARNFIT · CHROME EXTENSION REPORT</small><h1>${session.sessionMode === 'timer' ? 'Your study session.' : 'Your focus estimate.'}</h1><p>${new Date().toLocaleString()}</p><section class="metrics">${metrics}</section><section class="card"><h2>Small experiments to try</h2><ul>${items}</ul></section><p class="fine">${boundary}</p></body></html>`;
  downloadText(`learnfit-extension-report-${new Date().toISOString().slice(0, 10)}.html`, localizeReportHtml(html), 'text/html;charset=utf-8');
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'LEARNFIT_STATE_CHANGED') { session = message.session; render(); tutorial.maybeShow(); }
});
let stateLoaded = false;
const tutorial = mountTutorial({ extension: true, entry: document.querySelector('#tutorial-help'), read: async () => (await chrome.storage.local.get(TUTORIAL_KEY))[TUTORIAL_KEY], write: () => chrome.storage.local.set({ [TUTORIAL_KEY]: 'done' }), isBusy: () => !stateLoaded || session.running });
send('LEARNFIT_GET_STATE').then((state) => { session = state; stateLoaded = true; render(); tutorial.maybeShow(); });
setInterval(() => { if (session.running) render(); }, 1000);

window.addEventListener('learnfit-preferences-changed', (event) => {
  document.body.classList.toggle('quiet', event.detail.studyView === 'quiet');
  elements.start.classList.toggle('preferred-mode', event.detail.sessionMode === 'camera');
  elements.timer_start.classList.toggle('preferred-mode', event.detail.sessionMode === 'timer');
});
