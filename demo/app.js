import { localizeReportHtml } from '../src/ui/language.js';
import { mountTutorial, TUTORIAL_KEY } from '../src/ui/tutorial.js';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import { FaceTracker } from '../src/core/tracker.js';
import { buildRecommendations, formatTime, interpretFocus, renderChart, summarize } from './session.js';
import { readReflections, saveReflection, clearReflections } from './workflow.js';
import { buildRatingControls, getResearchConsent, postAggregateUsage, postResearchEvent, setResearchConsent, submitResearchFeedback, PRODUCT_VERSION } from './research.js';
import { buildSessionCsv, buildSessionReportHtml, reportBaseName } from './report-export.js';
import { readWebPreferences, writeWebPreferences } from '../src/ui/preferences.js';

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
let preferences = readWebPreferences();
let sessionMode = 'camera';

function applyPreferences(next = preferences) {
  preferences = writeWebPreferences(next);
  previewHidden = preferences.cameraPreview === 'hide';
  $('session').dataset.view = preferences.studyView;
  $('video-frame').classList.toggle('preview-hidden', previewHidden);
  $('preview-toggle').textContent = previewHidden ? 'Show preview' : 'Hide preview';
  $('preview-toggle').setAttribute('aria-pressed', String(previewHidden));
  $('recommended-duration').textContent = `${preferences.defaultCheckIn} min`;
  document.documentElement.dataset.studyView = preferences.studyView;
  $('start').classList.toggle('preferred-mode', preferences.sessionMode === 'camera');
  $('timer-start').classList.toggle('preferred-mode', preferences.sessionMode === 'timer');
}

function renderBuildLog() {
  const entries = [
    { date: 'OCT 05, 2026', title: 'I made LearnFit quieter, more optional, and better supported.', summary: 'Settings became a real control center, timer-only study no longer requires a camera, reports lead with a clear summary, and the scientific basis is linked directly.', noticed: 'A mentor could understand the features but still had to search for the main result, while the live screen showed more detail than a learner needs during a study block. Camera-conscious users also had no useful session path.', changed: 'I added persistent Quiet and Detailed views, camera-preview and check-in controls, a timer-only session with honest no-score reports, a report verdict card, and an evidence-and-limitations section with peer-reviewed sources.', technical: 'Preferences use localStorage on the website and chrome.storage.local in the extension. Session mode travels through report and CSV generation; timer-only sessions never create eye samples or enter score correlation. Camera sessions retain the existing personal baseline, signal gating, and 60% coverage rule.', learned: 'A focus tool should fade into the background while someone studies. Optional measurement, plain summaries, and visible evidence make the product easier to use without making its scientific claim larger.' },
    { date: 'SEP 30, 2026', title: 'I redesigned around what testers actually disliked.', summary: 'The camera language, tab workflow, reports, and research evidence changed after real users challenged the product.', noticed: 'Testers thought they had to stare at the camera, felt that adding every study page was annoying, and could not tell why missing eye data sometimes changed the result.', changed: 'I made No signal an explicit data gap instead of a low score, kept normal blinking valid, automatically included the starting tab, preserved same-tab navigation, and let child tabs inherit the study context. I also separated session time, valid observation, off-task time, and coverage in reports.', technical: 'I added an eye-signal gate before scoring, kept completed normal blinks inside the valid sample stream, and withheld the final estimate below 60% coverage. In the extension, tab IDs remain verified across URL changes and chrome.tabs.Tab.openerTabId allows a child tab to inherit status only from its verified parent. These relationships never enter a network request.', learned: 'A technically correct rule can still fail if the interface makes people behave unnaturally. Reducing friction and explaining uncertainty are part of the measurement itself.' },
    { date: 'SEP 26, 2026', title: 'I stopped treating a hidden webpage as proof that learning stopped.', summary: 'The web timer now respects the difference between elapsed study time and camera observation.', noticed: 'A learner may switch to a textbook, notes, or another window while still studying. The website cannot know whether that other place is useful or distracting.', changed: 'I kept the web session clock running across tab and window changes. If the browser slows or stops the camera, that period becomes No signal and is excluded from the Focus Estimate rather than being labeled off task.', technical: 'The session clock uses elapsed wall time, while observation time advances only when the tracker produces a usable one-second sample. The Page Visibility API describes whether the LearnFit document is visible, but it is never treated as proof of task behavior. Coverage is valid observation time divided by eligible session time.', learned: 'Unknown behavior should remain unknown. A fair product should show the boundary of its evidence instead of turning missing information into a judgment.' },
    { date: 'SEP 25, 2026', title: 'I made the experiment understandable before asking people to trust it.', summary: 'A four-step tutorial and clearer reports explain the camera, task context, score, and limitations.', noticed: 'Early testers could start the tool, but some did not understand what the score meant, why page confirmation mattered, or what happened when the camera lost their eyes.', changed: 'I added first-use tutorials to the website and extension, a permanent How to use entry, optional post-session feedback, a 60% coverage requirement, and clearer explanations of normal blinking and screen-based limitations.', technical: 'The tutorial is an accessible four-step dialog and stores completion only in localStorage on the web or chrome.storage.local in the extension. Report generation reuses one session summary model for on-screen results, standalone HTML, and CSV, keeping displayed and downloaded metrics consistent.', learned: 'Ease of use is more than reaching the Start button. People need a mental model of the system so they can interpret the result without overtrusting it.' },
    { date: 'SEP 19–20, 2026', title: 'I moved from a demo to something people could use in ordinary study.', summary: 'The Chrome extension, public deployment, privacy flow, and research dashboard made real-world testing possible.', noticed: 'A webpage alone could not follow a study session across Chrome tabs, and a local prototype could not produce credible evidence from other users.', changed: 'I moved user-started tracking into an extension offscreen document, deployed the website on Cloudflare Pages, added anonymous aggregate counts, and created consent-based detailed records and a private research dashboard.', technical: 'Manifest V3 uses a service worker for session state and an offscreen document for user-authorized camera processing beyond the popup lifetime. Vite builds the public site for Cloudflare Pages; same-origin Pages Functions validate a narrow event schema before writing aggregate and consented research records to D1.', learned: 'A working algorithm is only one layer of a product. Permissions, privacy, installation, deployment, and evidence collection decide whether anyone can test it responsibly.' },
    { date: 'SEP 18, 2026', title: 'I changed the score from a verdict into an estimate.', summary: 'The interface became more honest about what eye signals can and cannot show.', noticed: 'Words such as attention detection and pupil-size measurement sounded more certain than the browser data justified. Missing frames could also make a polished score look more reliable than it was.', changed: 'I renamed the result Focus Estimate, retained the 50/30/20 eye-signal structure while comparing it with a personal baseline, removed unsupported pupil-millimeter claims, and made tracking gaps and coverage visible.', technical: 'The engine compares blink frequency, completed-blink duration, and eye openness against the learner’s calibrated baseline. It aggregates usable time samples instead of filling gaps with zeroes, and the final score is the mean of valid, task-eligible observations rather than a claim about unobserved cognition.', learned: 'A smaller, defensible claim is stronger than an impressive claim I cannot validate. Product language should match the quality of the evidence.' },
    { date: 'AUG 07, 2026', title: 'I rebuilt LearnFit inside the browser.', summary: 'The Python pipeline became a browser-native MediaPipe app and the first Chrome extension.', noticed: 'The Python and WebSocket setup worked on my computer but created too many installation steps for another student. It also made the privacy story harder to understand.', changed: 'I moved camera access to getUserMedia, face landmarks to MediaPipe JavaScript, and the scoring engine into reusable browser modules. Camera frames could now be processed on the learner’s device without a Python server.', technical: 'navigator.mediaDevices.getUserMedia supplies the local video stream. MediaPipe Face Mesh runs in browser JavaScript and extracts landmarks on-device; the tracker converts selected eye landmarks into normalized measurements and passes only numeric features to the scoring engine. No frame-upload endpoint exists.', learned: 'Architecture changes the audience. Removing setup was not just an engineering improvement; it turned a personal prototype into something another person could open and try.' },
    { date: 'JUL 05–12, 2026', title: 'I learned that one noisy frame is not a human state.', summary: 'The first live prototype led to a blink state machine, personal calibration, and time smoothing.', noticed: 'A fixed EAR threshold varied between faces and camera angles. A blink could be counted several times, and a brief noisy frame could make the score jump even when nothing meaningful changed.', changed: 'I tracked the beginning and end of each blink, separated normal blinks from longer closures, added a 30-second personal baseline, and used recent observations over time instead of trusting one frame.', technical: 'EAR is calculated from vertical and horizontal eye-landmark distances with aspect-ratio correction. A state machine records open-to-closed-to-open transitions once, measures duration when the eye reopens, and distinguishes ordinary blinks from sustained closure. Time-based exponential smoothing keeps behavior consistent across camera frame rates.', learned: 'Human behavior is temporal. Completed events, sustained changes, and personal baselines are more useful than a universal threshold applied to a single image.' },
    { date: 'MAR–JUN 2026', title: 'The project began with a problem I felt while studying.', summary: 'I questioned why every learner should follow the same focus-and-break schedule.', noticed: 'Pomodoro timers were useful, but their fixed intervals did not match every task or every day. Sometimes I could work for an hour; sometimes my focus changed much earlier.', changed: 'I defined LearnFit as an experiment for discovering a personal study rhythm. I began exploring eye aspect ratio, blink frequency, blink duration, and eye openness as observable signals that might support reflection.', technical: 'The first proof of concept used Python, OpenCV camera capture, MediaPipe facial landmarks, and a local WebSocket server. A dashboard received EAR and blink events in real time, displayed a changing score, and logged minute-level observations for early calibration experiments.', learned: 'The goal should not be to prescribe the perfect number of minutes. It should help a learner notice patterns, test adjustments, and make a more personal decision.' },
  ];
  document.querySelector('.log-list')?.replaceChildren(...entries.map((entry, index) => {
    const item = document.createElement('details');
    item.className = 'log-entry';
    item.open = index === 0;
    const summary = document.createElement('summary');
    summary.innerHTML = `<span class="log-date"></span><span class="log-intro"><strong></strong><em></em></span><span class="log-toggle" aria-hidden="true">+</span>`;
    summary.querySelector('.log-date').textContent = entry.date;
    summary.querySelector('strong').textContent = entry.title;
    summary.querySelector('em').textContent = entry.summary;
    const body = document.createElement('div');
    body.className = 'log-detail';
    for (const [label, text] of [['What I noticed', entry.noticed], ['What I changed', entry.changed], ['Technical implementation', entry.technical], ['What I learned', entry.learned]]) {
      const section = document.createElement('section');
      const heading = document.createElement('h3'); heading.textContent = label;
      const paragraph = document.createElement('p'); paragraph.textContent = text;
      section.append(heading, paragraph); body.append(section);
    }
    item.append(summary, body); return item;
  }));
}
renderBuildLog();

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

function revealLiveSession() {
  requestAnimationFrame(() => $('session').scrollIntoView({ behavior: 'smooth', block: 'start' }));
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
    $('score-main').style.color = '';
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
    $('score-main').style.color = '';
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
      $('session-subtitle').textContent = 'A focus estimate for the visible, screen-based task you chose.';
      $('baseline-note').textContent = data.baseline.blinkDuration > 0 ? 'Baseline established from your first 30 seconds of usable eye tracking.' : 'Baseline established. No completed blinks were observed, so blink-duration comparisons are unavailable.';
    }
    const interpretation = interpretFocus(data.focusScore, 100);
    $('rhythm-status').textContent = interpretation.label;
    $('rhythm-description').textContent = interpretation.description;
    $('score-main').style.color = interpretation.color;
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
  if (sessionMode === 'timer') {
    seconds = Math.floor((performance.now() - studyStartedAt) / 1000);
    $('timer').textContent = formatTime(seconds);
    return;
  }
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

async function start(mode = preferences.sessionMode) {
  if (!['ready', 'report'].includes(phase)) return;
  setError();
  closeSurvey();
  resetSurveyForm();
  const generation = ++startGeneration;
  sessionMode = mode === 'timer' ? 'timer' : 'camera';
  isExample = false;
  sessionId = crypto.randomUUID();
  researchEnabled = $('research-consent').checked;
  setResearchConsent(researchEnabled);
  postAggregateUsage({ source: 'web', eventType: 'started' }).catch(() => {});
  if (researchEnabled) postResearchEvent({ sessionId, source: 'web', eventType: 'started' }).catch(() => {});
  sessionTask = $('task').value.trim();
  $('session-task').textContent = sessionTask ? `Your task: ${sessionTask}` : 'On-screen study · session time continues across tab changes';
  for (const id of ['completion', 'energy', 'reflection-note']) $(id).value = '';
  $('save-status').textContent = '';
  latest = null; lastDataAt = 0; studyStartedAt = null; seconds = 0; samples = []; lastSampleSecond = 0; signalWindow = []; noFace = false;
  $('start').disabled = true;
  $('timer-start').disabled = true;
  $('start').textContent = 'Connecting to your camera…';
  $('stop').disabled = false;
  $('timer').textContent = '00:00';
  $('score-main').textContent = '—';
  $('recommended-duration').textContent = `${preferences.defaultCheckIn} min`;
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
  $('camera-card').hidden = sessionMode === 'timer';
  document.querySelector('.trend-card').hidden = sessionMode === 'timer';
  document.querySelector('.live-details').hidden = sessionMode === 'timer';
  if (sessionMode === 'timer') {
    phase = 'active';
    studyStartedAt = performance.now();
    $('calibration').hidden = true;
    $('session-label').textContent = 'TIMER-ONLY SESSION';
    $('session-subtitle').textContent = 'A private study clock without camera processing or a focus estimate.';
    $('rhythm-status').textContent = 'Timer only · no focus score';
    $('rhythm-description').textContent = 'You can still record your task, reflect, and download a report.';
    $('signal').textContent = 'Camera off';
    showPhase('active');
    revealLiveSession();
    tick = setInterval(updateClock, 500);
    $('start').disabled = false;
    $('timer-start').disabled = false;
    return;
  }
  showPhase('loading');
  tracker = new FaceTracker({ video: $('video'), assetBaseUrls: ['/vendor/mediapipe-0.4.1633559619'], onData, onError: ({ message }) => setError(message), onStatus: ({ status }) => {
    if (generation !== startGeneration) return;
    if (status === 'running') { showPhase('calibrating'); setError(); revealLiveSession(); }
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
      $('timer-start').disabled = false;
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
  if (sessionMode === 'camera') await tracker?.stop();
  setError();
  renderReport();
  showPhase('report');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  openSurvey();
}

function renderReport() {
  const report = summarize(samples, seconds);
  const interpretation = sessionMode === 'timer'
    ? { key: 'timer', label: 'Timer-only session', description: 'No camera was used, so LearnFit did not calculate a focus estimate.' }
    : interpretFocus(report.averageScore, report.quality);
  latestReport = report;
  reportCreatedAt = new Date();
  $('example-banner').hidden = !isExample;
  $('reflection').hidden = isExample;
  $('open-survey').hidden = isExample || sessionMode === 'timer';
  $('report-task').textContent = sessionTask ? `Task: ${sessionTask}` : '';
  $('report-date').textContent = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeStyle: 'short' }).format(reportCreatedAt);
  const stats = sessionMode === 'timer' ? [
    ['Session mode', 'Timer only', 'No camera processing or focus estimate'],
    ['Session time', formatTime(seconds), 'Excludes manual pauses'],
    ['Focus estimate', 'Not measured', 'Start a camera session to compare eye signals with a personal baseline'],
    ['Check-in', `${preferences.defaultCheckIn} min`, 'A reminder chosen in Settings, not a measured limit'],
  ] : [
    ['Average focus estimate', report.averageScore !== null ? `${report.averageScore} / 100` : 'Not enough data', 'Average of valid post-baseline focus observations; hidden below 60% coverage'],
    ['Focus interpretation', interpretation.label, interpretation.description],
    ['Session time', formatTime(seconds), 'Continues across tab and window changes; excludes calibration and manual pauses'],
    ['Suggested check-in', report.suggested ?? 'Choose your pace', report.suggested ? 'An experiment around your observed shift, not a limit' : 'No supported duration suggestion from this session'],
    ['Most stable period', report.best ? `${formatTime(report.best.start)}–${formatTime(report.best.end)}` : 'Not enough data', 'Longest uninterrupted stable period, at least 10 seconds'],
    ['Focus shift detected', report.firstShift !== null ? `Around ${formatTime(report.firstShift)}` : report.usable < 10 ? 'Not enough data' : 'None observed', 'First shift sustained for at least 10 seconds'],
    ['Tracking coverage', report.quality === null ? 'No study data' : `${report.quality}%`, report.quality !== null && report.quality < 60 ? 'Below 60%, so no final focus estimate is reported' : 'Share of study-time seconds with valid eye tracking'],
    ['Valid observation time', formatTime(report.usable), 'Seconds with usable eye signals included in the focus estimate'],
    ['No-signal time', formatTime(Math.max(0, seconds - report.usable)), 'Missing eye data; excluded from the focus estimate and never treated as a low score'],
    ['Personal Baseline', studyStartedAt !== null ? 'Established' : 'Incomplete', studyStartedAt !== null ? '30 seconds of usable tracking' : 'Complete calibration for a focus estimate'],
  ];
  $('summary-grid').replaceChildren(...stats.map(([label, value, note]) => {
    const card = document.createElement('article'); card.className = 'card';
    for (const [tag, text] of [['span', label], ['strong', value], ['p', note]]) { const element = document.createElement(tag); element.textContent = text; card.append(element); }
    return card;
  }));
  $('report-verdict').className = `report-verdict ${interpretation.key}`;
  $('report-verdict').innerHTML = `<span>${sessionMode === 'timer' ? 'SESSION SUMMARY' : 'FOCUS SUMMARY'}</span><strong>${interpretation.label}</strong><p>${interpretation.description}</p>`;
  document.querySelector('.report-trend').hidden = sessionMode === 'timer';
  renderChart($('report-chart'), samples, seconds, 'No post-calibration observations to show');
  $('report-explanation').textContent = sessionMode === 'timer' ? '' : `${report.usable} usable one-second observations. The session clock continues if you switch tabs or windows, but browsers may slow or stop camera processing in the background. Those seconds appear as unavailable tracking and are excluded from the focus estimate. The website cannot tell whether another tab is study or entertainment; use the Chrome extension for verified study pages. ${report.quality !== null && report.quality < 70 ? 'Limited tracking makes patterns less reliable.' : 'Empty sections show unavailable tracking.'}`;
  const recommendations = sessionMode === 'timer' ? [
    'Before the next session, write one concrete outcome and close unrelated tabs.',
    `Try a gentle self-check around ${preferences.defaultCheckIn} minutes; use task progress and energy to decide whether to continue.`,
    'At the end, close the material and write three ideas from memory.',
  ] : buildRecommendations(report, seconds);
  reportRecommendations = recommendations;
  $('recommendations').replaceChildren(...recommendations.map((text) => { const li = document.createElement('li'); li.textContent = text; return li; }));
  if (!isExample) postAggregateUsage({ source: 'web', eventType: 'completed', durationSeconds: seconds }).catch(() => {});
  if (!isExample && researchEnabled) postResearchEvent({ sessionId, source: 'web', eventType: 'completed', durationSeconds: seconds, score: report.averageScore }).catch(() => {});
}

$('start').addEventListener('click', () => start('camera'));
$('timer-start').addEventListener('click', () => start('timer'));
$('task').addEventListener('keydown', (event) => { if (event.key === 'Enter') start(preferences.sessionMode); });
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
  downloadText(`${reportBaseName(reportCreatedAt)}-data.csv`, buildSessionCsv({ samples, sessionMode, durationSeconds: seconds }), 'text/csv;charset=utf-8');
});

$('download-report').addEventListener('click', () => {
  if (!latestReport || !reportCreatedAt) return;
  downloadText(`${reportBaseName(reportCreatedAt)}-report.html`, localizeReportHtml(buildSessionReportHtml({
    createdAt: reportCreatedAt, task: sessionTask, durationSeconds: seconds, report: latestReport,
    recommendations: reportRecommendations, samples, example: isExample, sessionMode,
  })), 'text/html;charset=utf-8');
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
  if (isExample || sessionMode === 'timer' || !latestReport || $('research-survey-dialog').open) return;
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
// A tab change does not prove that study stopped. Keep wall-clock session time
// running and let background camera throttling appear honestly as missing data.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && phase === 'active') updateClock();
});

function pauseSession() {
  if (!['active', 'calibrating'].includes(phase)) return;
  updateClock();
  pausedPhase = phase;
  pausedAt = performance.now();
  if (sessionMode === 'camera') tracker?.pause();
  lastDataAt = 0; noFace = true;
  showPhase('paused');
  $('pause-message').textContent = sessionMode === 'timer'
    ? 'You paused this timer. The study clock is paused until you choose Resume.'
    : 'You paused this session. Camera processing and the study clock are paused until you choose Resume.';
  $('signal').textContent = 'Paused';
}

$('pause').addEventListener('click', () => {
  if (phase !== 'paused') { pauseSession(); return; }
  if (document.hidden) return;
  if (studyStartedAt !== null) studyStartedAt += performance.now() - pausedAt;
  if (sessionMode === 'camera') tracker?.resume();
  showPhase(pausedPhase);
  if (sessionMode === 'camera') renderSignal();
  else { $('signal').textContent = 'Camera off'; $('rhythm-status').textContent = 'Timer only · no focus score'; }
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
  sessionMode = 'camera';
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
      verifiedSeconds: seconds, offTaskSeconds: 0, trackingCoverage: latestReport.quality ?? 0,
      appVersion: PRODUCT_VERSION, ease: Number(data.get('ease')), usefulness: Number(data.get('usefulness')),
      trust: Number(data.get('trust')), selfReportedFocus: Number(data.get('selfReportedFocus')),
      onTaskShare: data.get('onTaskShare'), wouldUse: data.get('wouldUse'), mostUseful: data.get('mostUseful'),
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
    const heading = document.createElement('h3'); heading.textContent = entry.task || 'Study session'; if (entry.task) heading.dataset.noTranslate = '';
    const summary = document.createElement('p'); summary.textContent = `${new Date(entry.date).toLocaleDateString()} · ${formatTime(entry.seconds)} · ${entry.completion || 'No progress reflection'} · ${entry.energy || 'No energy reflection'}`;
    const note = document.createElement('p'); note.textContent = entry.note; note.dataset.noTranslate = '';
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

const tutorial = mountTutorial({ entry: $('tutorial-help'), read: () => localStorage.getItem(TUTORIAL_KEY), write: () => localStorage.setItem(TUTORIAL_KEY, 'done'), isBusy: () => !['ready', 'report'].includes(phase) });
applyPreferences(preferences);
window.addEventListener('learnfit-preferences-changed', (event) => applyPreferences(event.detail));
new MutationObserver(() => tutorial.maybeShow()).observe($('ready'), { attributes: true, attributeFilter: ['hidden'] });
const extensionDownload = document.querySelector('a[download][href*="LearnFit-Chrome-Extension"]');
if (extensionDownload) {
  extensionDownload.href = '/downloads/LearnFit-Chrome-Extension-v1.3.6.zip';
  document.querySelector('#extension .eyebrow').textContent = 'CHROME EXTENSION · v1.3.6';
}
