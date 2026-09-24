import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import { FaceTracker } from '../src/core/tracker.js';
import { formatTime, renderChart, summarize } from './session.js';
import { readReflections, saveReflection, clearReflections } from './workflow.js';
import { buildRatingControls, getResearchConsent, postAggregateUsage, postResearchEvent, setResearchConsent, submitResearchFeedback, PRODUCT_VERSION } from './research.js';
import { buildSessionCsv, buildSessionReportHtml, reportBaseName } from './report-export.js';

const $ = (id) => document.getElementById(id);
let phase = 'ready';
let tracker;
let latest = null;
let lastDataAt = 0;
let studyStartedAt = null;
let seconds = 0;
let samples = [];
let tick;
let lastSampleSecond = 0;
let previewHidden = false;
let signalWindow = [];
let noFace = false;
let pausedPhase = null;
let pausedAt = 0;
let sessionTask = '';
let sessionId = '';
let isExample = false;
let startGeneration = 0;
let latestReport = null;
let reportCreatedAt = null;
let reportRecommendations = [];
let researchEnabled = false;

function showPhase(next) {
  phase = next;
  $('ready').hidden = next !== 'ready' && next !== 'loading';
  $('session').hidden = !['calibrating', 'active', 'paused'].includes(next);
  $('report').hidden = next !== 'report';
  $('setup-guide').hidden = next !== 'ready';
  $('saved-section').hidden = next !== 'ready' || !$('saved-list').childElementCount;
  $('example').hidden = next === 'loading';
  $('cancel-loading').hidden = next !== 'loading';
  $('loading-help').hidden = next !== 'loading';
  $('pause-message').hidden = next !== 'paused';
  $('pause').textContent = next === 'paused' ? 'Resume' : 'Pause';
  document.querySelector('.maker-note').hidden = next !== 'ready';
  document.querySelector('.build-log').hidden = next !== 'ready';
}

function setError(message = '') {
  $('error').textContent = message;
  $('error').hidden = !message;
}

function signalGood() {
  return !noFace && lastDataAt > 0 && performance.now() - lastDataAt < 1500 && !document.hidden;
}

function renderSignal() {
  const good = signalGood();
  const ratio = signalWindow.length ? signalWindow.filter(Boolean).length / signalWindow.length : 0;
  $('signal').textContent = !good ? 'Insufficient signal' : ratio >= .8 ? 'Good signal' : 'Limited signal';
  if (!good && phase === 'active') {
    $('score-main').textContent = '—';
    $('rhythm-status').textContent = 'Waiting for a clear signal';
    $('rhythm-description').textContent = 'Keep your face in view and check your lighting. No rhythm estimate is made while tracking is unavailable.';
    $('why').hidden = true;
    for (const id of ['metric-frequency', 'metric-duration', 'metric-ear', 'metric-score']) $(id).textContent = '—';
  }
}

function onData(data) {
  if (!['active', 'calibrating'].includes(phase)) return;
  if (!$('error').hidden) setError();
  latest = data;
  lastDataAt = performance.now();
  noFace = false;
  $('camera-placeholder').hidden = !previewHidden;
  if (data.isCalibrating) {
    $('score-main').textContent = '—';
    const percentage = Math.floor(data.calibrationProgress * 100);
    $('progress').value = percentage;
    $('progress').textContent = `${percentage}%`;
    $('progress-text').textContent = `${percentage}%`;
    $('calibration-caption').textContent = `${Math.max(0, Math.ceil(30 * (1 - data.calibrationProgress)))} seconds of usable tracking remaining`;
  } else {
    if (phase === 'calibrating') {
      showPhase('active');
      studyStartedAt = performance.now();
      $('calibration').hidden = true;
      $('session-label').textContent = 'YOUR FOCUS SESSION';
      $('session-subtitle').textContent = 'A little insight, while you do your thing.';
      $('baseline-note').textContent = data.baseline.blinkDuration > 0 ? 'Baseline established from your first 30 seconds of usable eye tracking.' : 'Baseline established. No completed blinks were observed, so blink-duration comparisons are unavailable.';
    }
    if ($('rhythm-status').textContent !== data.status) $('rhythm-status').textContent = data.status;
    $('rhythm-description').textContent = data.status === 'Stable' ? 'Your eye behavior is close to your personal baseline. Keep going at your own pace.' : data.status === 'Shifting' ? 'Some eye patterns have changed. Take a moment to check in with yourself.' : 'Your eye behavior has shifted more noticeably. Consider a short break if it feels right.';
    $('why').hidden = false;
    const reasons = [];
    if (data.baseline.blinkFrequency > 0 && data.blinkFrequency > data.baseline.blinkFrequency * 1.3) reasons.push('Blink frequency is above your baseline.');
    if (data.baseline.blinkDuration > 0 && data.blinkDuration > data.baseline.blinkDuration + 50) reasons.push('Your latest blink lasted longer than your baseline.');
    if (data.ear < data.baseline.ear * .85) reasons.push('Eye openness has decreased relative to your baseline.');
    if (data.isFatigued) reasons.push('A longer eye closure was observed.');
    if (!reasons.length) reasons.push('Current measurements are within the engine’s baseline thresholds.');
    reasons.push('The rhythm index is smoothed over recent samples, so changes may appear gradually.');
    if (!data.baseline.blinkFrequency) reasons.push('No blink-frequency baseline is available; no frequency penalty is applied.');
    if (!data.baseline.blinkDuration) reasons.push('No blink-duration baseline is available for this session.');
    $('reasons').replaceChildren(...reasons.map((reason) => { const li = document.createElement('li'); li.textContent = reason; return li; }));
    $('metric-score').textContent = data.focusScore;
    $('score-main').textContent = data.focusScore;
    $('recommended-duration').textContent = `${data.optimalDuration} min`;
    $('components').textContent = `Component scores: blink frequency ${data.blinkScore}/50 · blink duration ${data.durationScore}/30${data.baseline.blinkDuration ? '' : ' (comparison unavailable; no penalty applied)'} · eye openness ${data.eyeScore}/20. These are rule-based contributions, not percentages of attention.`;
  }
  $('metric-frequency').textContent = data.blinkFrequency.toFixed(1);
  $('metric-duration').textContent = data.blinkDuration > 0 ? data.blinkDuration : '—';
  $('metric-ear').textContent = data.ear.toFixed(3);
  renderSignal();
}

function updateClock() {
  if (!['active', 'calibrating'].includes(phase)) return;
  signalWindow.push(signalGood());
  if (signalWindow.length > 20) signalWindow.shift();
  renderSignal();
  if (phase !== 'active') return;
  seconds = Math.floor((performance.now() - studyStartedAt) / 1000);
  $('timer').textContent = formatTime(seconds);
  // 后台标签页恢复后显式补齐空白，避免误报为持续有效追踪。
  if (seconds > lastSampleSecond) {
    for (let t = lastSampleSecond + 1; t <= seconds; t += 1) {
      samples.push({ t, score: t === seconds && signalGood() ? latest.focusScore : null });
    }
    lastSampleSecond = seconds;
    renderChart($('live-chart'), samples.slice(-61), seconds, 'Waiting for usable tracking');
  }
}

async function start() {
  if (!['ready', 'report'].includes(phase)) return;
  setError();
  closeSurvey();
  resetSurveyForm();
  const generation = ++startGeneration;
  isExample = false;
  sessionId = crypto.randomUUID();
  researchEnabled = $('research-consent').checked;
  setResearchConsent(researchEnabled);
  postAggregateUsage({ source: 'web', eventType: 'started' }).catch(() => {});
  if (researchEnabled) postResearchEvent({ sessionId, source: 'web', eventType: 'started' }).catch(() => {});
  sessionTask = $('task').value.trim();
  $('session-task').textContent = sessionTask ? `Your task: ${sessionTask}` : 'On-screen study · Keep LearnFit visible beside your work';
  for (const id of ['completion', 'energy', 'reflection-note']) $(id).value = '';
  $('save-status').textContent = '';
  latest = null; lastDataAt = 0; studyStartedAt = null; seconds = 0; samples = []; lastSampleSecond = 0; signalWindow = []; noFace = false;
  $('start').disabled = true;
  $('start').textContent = 'Connecting to your camera…';
  $('stop').disabled = false;
  $('timer').textContent = '00:00';
  $('score-main').textContent = '—';
  $('recommended-duration').textContent = '25 min';
  $('calibration').hidden = false;
  $('why').hidden = true;
  $('why').open = false;
  document.querySelector('.live-details').open = false;
  $('progress').value = 0;
  $('progress-text').textContent = '0%';
  $('calibration-caption').textContent = '30 seconds of usable tracking';
  $('rhythm-status').textContent = 'Calibrating your baseline';
  $('rhythm-description').textContent = 'Look naturally at your screen while LearnFit observes your typical eye behavior.';
  $('session-label').textContent = 'BASELINE SETUP';
  $('session-subtitle').textContent = 'A moment to get to know your rhythm.';
  $('baseline-note').textContent = 'A short observation of your typical eye behavior, unique to this session.';
  $('components').textContent = 'Component scores become available after calibration.';
  for (const id of ['metric-frequency', 'metric-duration', 'metric-ear', 'metric-score']) $(id).textContent = '—';
  renderChart($('live-chart'), [], 60, 'Your trend will appear after calibration');
  showPhase('loading');
  tracker = new FaceTracker({ video: $('video'), assetBaseUrls: ['/vendor/mediapipe-0.4.1633559619'], onData, onError: ({ message }) => setError(message), onStatus: ({ status }) => {
    if (generation !== startGeneration) return;
    if (status === 'running') { showPhase('calibrating'); setError(); if (document.hidden) pauseSession(); }
    if (status === 'no-face') { noFace = true; renderSignal(); }
    if (status === 'loading-mediapipe') $('start').textContent = 'Loading private tracking…';
    if (status === 'requesting-camera') $('start').textContent = 'Allow camera access to continue…';
    if (status === 'initializing-tracker') $('start').textContent = 'Preparing your session…';
  } });
  try {
    await tracker.start();
    if (generation === startGeneration) tick = setInterval(updateClock, 500);
  } catch (error) {
    if (generation !== startGeneration) return;
    showPhase('ready');
    setError(error.message);
  } finally {
    if (generation === startGeneration) {
      $('start').disabled = false;
      $('start').innerHTML = 'Start Focus Session <span aria-hidden="true">→</span>';
    }
  }
}

async function stop() {
  if (!['active', 'calibrating', 'paused'].includes(phase)) return;
  $('stop').disabled = true;
  updateClock();
  clearInterval(tick);
  // 在异步清理前停止接收数据，保证报告不再变化。
  phase = 'stopping';
  await tracker.stop();
  setError();
  renderReport();
  showPhase('report');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  openSurvey();
}

function renderReport() {
  const report = summarize(samples, seconds);
  latestReport = report;
  reportCreatedAt = new Date();
  $('example-banner').hidden = !isExample;
  $('reflection').hidden = isExample;
  $('open-survey').hidden = isExample;
  $('report-task').textContent = sessionTask ? `Task: ${sessionTask}` : '';
  $('report-date').textContent = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeStyle: 'short' }).format(reportCreatedAt);
  const stats = [
    ['Average rhythm score', report.averageScore !== null ? `${report.averageScore} / 100` : 'Not enough data', 'Average of usable post-baseline observations'],
    ['Study time', formatTime(seconds), 'Excludes calibration and paused time'],
    ['Suggested check-in', report.suggested ?? 'Choose your pace', report.suggested ? 'An experiment around your observed shift, not a limit' : 'No supported duration suggestion from this session'],
    ['Most stable period', report.best ? `${formatTime(report.best.start)}–${formatTime(report.best.end)}` : 'Not enough data', 'Longest uninterrupted stable period, at least 10 seconds'],
    ['Rhythm shift detected', report.firstShift !== null ? `Around ${formatTime(report.firstShift)}` : report.usable < 10 ? 'Not enough data' : 'None observed', 'First shift sustained for at least 10 seconds'],
    ['Data quality', report.quality === null ? 'No study data' : `${report.quality}% usable`, 'Share of study-time seconds with recent tracking'],
    ['Personal Baseline', studyStartedAt !== null ? 'Established' : 'Incomplete', studyStartedAt !== null ? '30 seconds of usable tracking' : 'Complete calibration for a rhythm estimate'],
  ];
  $('summary-grid').replaceChildren(...stats.map(([label, value, note]) => {
    const card = document.createElement('article'); card.className = 'card';
    for (const [tag, text] of [['span', label], ['strong', value], ['p', note]]) { const element = document.createElement(tag); element.textContent = text; card.append(element); }
    return card;
  }));
  renderChart($('report-chart'), samples, seconds, 'No post-calibration observations to show');
  $('report-explanation').textContent = `${report.usable} usable one-second observations. The rhythm index summarizes eye behavior relative to your baseline; it is not a percentage of attention. ${report.quality !== null && report.quality < 70 ? 'Limited tracking makes patterns less reliable.' : 'Empty sections show unavailable tracking.'}`;
  const recommendations = [
    report.firstShift !== null ? `Check in with yourself around ${formatTime(report.firstShift)} next time; consider a short break if you want one.` : 'Choose one manageable task for your next session, and check in with how it feels.',
    report.quality === null || report.quality < 80 ? 'Try even lighting and a camera positioned at eye level to improve tracking.' : 'Keep a similar camera position and lighting for a more consistent baseline.',
    'Use the report alongside your own experience. Adjust your study plan based on what helps you learn.',
  ];
  reportRecommendations = recommendations;
  $('recommendations').replaceChildren(...recommendations.map((text) => { const li = document.createElement('li'); li.textContent = text; return li; }));
  if (!isExample) postAggregateUsage({ source: 'web', eventType: 'completed', durationSeconds: seconds }).catch(() => {});
  if (!isExample && researchEnabled) postResearchEvent({ sessionId, source: 'web', eventType: 'completed', durationSeconds: seconds, score: report.averageScore }).catch(() => {});
}

$('start').addEventListener('click', start);
$('new-session').addEventListener('click', () => { closeSurvey(); showPhase('ready'); window.scrollTo({ top: 0, behavior: 'smooth' }); $('start').focus(); });
$('stop').addEventListener('click', stop);
$('session-nav').addEventListener('click', () => { if (phase === 'report') showPhase('ready'); window.scrollTo({ top: 0, behavior: 'smooth' }); });
$('export').addEventListener('click', () => window.print());

function downloadText(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$('download-csv').addEventListener('click', () => {
  if (!latestReport || !reportCreatedAt) return;
  downloadText(`${reportBaseName(reportCreatedAt)}-data.csv`, buildSessionCsv({ samples }), 'text/csv;charset=utf-8');
});

$('download-report').addEventListener('click', () => {
  if (!latestReport || !reportCreatedAt) return;
  downloadText(`${reportBaseName(reportCreatedAt)}-report.html`, buildSessionReportHtml({
    createdAt: reportCreatedAt, task: sessionTask, durationSeconds: seconds, report: latestReport,
    recommendations: reportRecommendations, samples, example: isExample,
  }), 'text/html;charset=utf-8');
});
$('preview-toggle').addEventListener('click', () => {
  previewHidden = !previewHidden;
  $('video-frame').classList.toggle('preview-hidden', previewHidden);
  $('preview-toggle').textContent = previewHidden ? 'Show preview' : 'Hide preview';
  $('preview-toggle').setAttribute('aria-pressed', String(previewHidden));
  $('camera-placeholder').textContent = previewHidden ? 'Preview hidden · Tracking continues' : 'Connecting to your camera…';
  $('camera-placeholder').hidden = !previewHidden && !!lastDataAt;
});
for (const button of document.querySelectorAll('[data-how]')) button.addEventListener('click', () => $('how-dialog').showModal());
for (const id of ['close-how', 'got-it']) $(id).addEventListener('click', () => $('how-dialog').close());
$('how-dialog').addEventListener('click', (event) => { if (event.target === $('how-dialog')) { const rect = $('how-dialog').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('how-dialog').close(); } });

function openSurvey() {
  if (isExample || !latestReport || $('research-survey-dialog').open) return;
  $('research-survey-dialog').showModal();
}

function closeSurvey() {
  if ($('research-survey-dialog').open) $('research-survey-dialog').close();
}

function resetSurveyForm() {
  const form = $('survey-form');
  form.reset();
  for (const control of form.elements) control.disabled = false;
  form.querySelector('button[type="submit"]').textContent = 'Send anonymous feedback';
  $('skip-survey').textContent = 'Not now';
  $('open-survey').textContent = 'Give 2-minute feedback';
  $('survey-status').textContent = '';
}

$('open-survey').addEventListener('click', openSurvey);
for (const id of ['close-survey', 'skip-survey']) $(id).addEventListener('click', closeSurvey);
$('research-survey-dialog').addEventListener('click', (event) => {
  if (event.target !== $('research-survey-dialog')) return;
  const rect = event.target.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeSurvey();
});
window.addEventListener('pagehide', () => { startGeneration += 1; clearInterval(tick); tracker?.stop(); });
window.addEventListener('pageshow', (event) => { if (event.persisted) { showPhase('ready'); $('start').disabled = false; $('start').textContent = 'Start Focus Session →'; } });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseSession(); });

function pauseSession() {
  if (!['active', 'calibrating'].includes(phase)) return;
  updateClock();
  pausedPhase = phase;
  pausedAt = performance.now();
  tracker.pause();
  lastDataAt = 0; noFace = true;
  showPhase('paused');
  $('signal').textContent = 'Paused';
}

$('pause').addEventListener('click', () => {
  if (phase !== 'paused') { pauseSession(); return; }
  if (document.hidden) return;
  if (studyStartedAt !== null) studyStartedAt += performance.now() - pausedAt;
  tracker.resume();
  showPhase(pausedPhase);
  renderSignal();
});
$('cancel-loading').addEventListener('click', () => {
  startGeneration += 1;
  tracker?.stop();
  $('start').disabled = false;
  $('start').textContent = 'Start Focus Session →';
  showPhase('ready');
});
$('example').addEventListener('click', () => {
  isExample = true;
  sessionTask = 'Example: read a chapter and write three takeaways';
  seconds = 480; studyStartedAt = 1;
  // 示例始终带有醒目标记，不写入真实会话或本机历史。
  samples = Array.from({ length: seconds }, (_, i) => ({ t: i + 1, score: i >= 180 && i < 205 ? null : i >= 360 ? 63 : 88 }));
  renderReport(); showPhase('report'); window.scrollTo({ top: 0 });
});

for (const rating of document.querySelectorAll('.rating')) buildRatingControls(rating);
$('research-consent').checked = getResearchConsent();
$('research-consent').addEventListener('change', () => setResearchConsent($('research-consent').checked));
$('survey-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isExample || !latestReport) return;
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  const data = new FormData(form);
  submit.disabled = true;
  $('survey-status').textContent = 'Sending your anonymous feedback…';
  try {
    await submitResearchFeedback({
      sessionId, source: 'web', durationSeconds: seconds, score: latestReport.averageScore,
      appVersion: PRODUCT_VERSION, ease: Number(data.get('ease')), usefulness: Number(data.get('usefulness')),
      trust: Number(data.get('trust')), wouldUse: data.get('wouldUse'), mostUseful: data.get('mostUseful'),
      confusing: data.get('confusing'), consent: data.get('consent') === 'on',
    });
    researchEnabled = true;
    $('research-consent').checked = true;
    setResearchConsent(true);
    $('survey-status').textContent = 'Thank you. Your anonymous response was recorded.';
    submit.textContent = 'Feedback sent ✓';
    $('skip-survey').textContent = 'Close';
    $('open-survey').textContent = 'Feedback sent ✓';
    for (const control of form.elements) control.disabled = true;
    $('skip-survey').disabled = false;
  } catch (error) {
    $('survey-status').textContent = error.message;
    submit.disabled = false;
  }
});

function refreshSaved() {
  let entries = [];
  try { entries = readReflections(localStorage); } catch { /* 禁用存储不影响追踪。 */ }
  $('saved-list').replaceChildren(...entries.map((entry) => {
    const article = document.createElement('article'); article.className = 'saved-entry';
    const heading = document.createElement('h3'); heading.textContent = entry.task || 'Study session';
    const summary = document.createElement('p'); summary.textContent = `${new Date(entry.date).toLocaleDateString()} · ${formatTime(entry.seconds)} · ${entry.completion || 'No progress reflection'} · ${entry.energy || 'No energy reflection'}`;
    const note = document.createElement('p'); note.textContent = entry.note;
    article.append(heading, summary, note); return article;
  }));
  $('saved-section').hidden = phase !== 'ready' || !entries.length;
}
$('save-reflection').addEventListener('click', () => {
  if (phase !== 'report' || isExample) return;
  try {
    saveReflection(localStorage, { id: sessionId, date: new Date().toISOString(), task: sessionTask, seconds, completion: $('completion').value, energy: $('energy').value, note: $('reflection-note').value.trim() });
    $('save-status').textContent = 'Saved on this browser. Find it on the home screen.';
    refreshSaved();
  } catch { $('save-status').textContent = 'This browser could not save the summary. You can still use Export PDF.'; }
});
$('clear-saved').addEventListener('click', () => {
  try { clearReflections(localStorage); refreshSaved(); } catch { setError('Saved reflections could not be deleted. Check your browser storage settings.'); }
});
refreshSaved();

const chartResize = new ResizeObserver(() => {
  if (phase === 'active' || phase === 'calibrating') renderChart($('live-chart'), samples.slice(-61), seconds || 60, phase === 'calibrating' ? 'Your trend will appear after calibration' : 'Waiting for usable tracking');
  if (phase === 'report') renderChart($('report-chart'), samples, seconds, 'No post-calibration observations to show');
});
chartResize.observe($('live-chart'));
chartResize.observe($('report-chart'));
