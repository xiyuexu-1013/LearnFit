import { BlinkDetector, FocusEngine, calculateEAR } from './runtime/engine.js';

const video = document.querySelector('#camera');
const visionFrame = document.querySelector('#vision');
const engine = new FocusEngine();
const blinkDetector = new BlinkDetector();

let stream;
let running = false;
let paused = false;
let processing = false;
let frameTimer = 0;
let lastFrameAt = 0;
let lastSentAt = 0;
let sandboxLoaded = false;
let sandboxReady = false;
let sandboxError;
let startupResolver;

function send(message) {
  return chrome.runtime.sendMessage(message).catch(() => {});
}

function status(phase, text, extra = {}) {
  return send({ type: 'LEARNFIT_TRACKER_STATUS', phase, status: text, ...extra });
}

function waitForSandbox() {
  if (sandboxReady) return Promise.resolve();
  if (sandboxError) return Promise.reject(new Error(sandboxError));
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('The local eye-tracking engine took too long to start.')), 20_000);
    startupResolver = {
      resolve: () => { clearTimeout(timeout); resolve(); },
      reject: (error) => { clearTimeout(timeout); reject(error); },
    };
    if (sandboxLoaded) visionFrame.contentWindow.postMessage({ source: 'learnfit-host', type: 'initialize' }, '*');
  });
}

function publish(landmarks) {
  if (!landmarks) {
    engine.lastSampleAt = performance.now();
    blinkDetector.isBlinking = false;
    status('calibrating', 'Move into view so calibration can continue');
    return;
  }
  const now = performance.now();
  const ear = Math.max(calculateEAR(landmarks, video.videoWidth, video.videoHeight), 1e-6);
  const blink = blinkDetector.update(ear, now);
  const observedSeconds = Math.min(60, Math.max(1, (now - engine.sessionStartedAt) / 1000));
  const data = engine.calculate({
    blinkFrequency: blink.frequency * 60 / observedSeconds,
    blinkDuration: blink.duration,
    ear,
    isFatigued: blink.isFatigued,
    blinkCompleted: blink.completed,
  }, now);
  if (now - lastSentAt >= 750 || data.isCalibrating) {
    lastSentAt = now;
    send({
      type: 'LEARNFIT_TRACKER_DATA',
      isCalibrating: data.isCalibrating,
      calibrationProgress: data.calibrationProgress,
      score: data.focusScore,
      status: data.isCalibrating ? 'Calibrating your baseline' : data.status,
      optimalDuration: data.optimalDuration,
    });
  }
}

window.addEventListener('message', (event) => {
  if (event.source !== visionFrame.contentWindow || event.data?.source !== 'learnfit-sandbox') return;
  if (event.data.type === 'loaded') {
    sandboxLoaded = true;
    if (startupResolver) visionFrame.contentWindow.postMessage({ source: 'learnfit-host', type: 'initialize' }, '*');
  }
  if (event.data.type === 'ready') {
    sandboxReady = true;
    startupResolver?.resolve();
    startupResolver = null;
  }
  if (event.data.type === 'error') {
    sandboxError = event.data.message || 'The local eye-tracking engine could not start.';
    startupResolver?.reject(new Error(sandboxError));
    startupResolver = null;
    status('error', 'Tracking interrupted', { error: sandboxError });
  }
  if (event.data.type === 'result') {
    processing = false;
    if (running && !paused) publish(event.data.landmarks);
  }
});

async function processFrame() {
  if (!running) return;
  const timestamp = performance.now();
  if (!paused && !processing && timestamp - lastFrameAt >= 100 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    lastFrameAt = timestamp;
    processing = true;
    try {
      const bitmap = await createImageBitmap(video);
      visionFrame.contentWindow.postMessage({ source: 'learnfit-host', type: 'frame', bitmap }, '*', [bitmap]);
    } catch (error) {
      processing = false;
      await status('error', 'Tracking interrupted', { error: error.message });
    }
  }
}

async function startTracking() {
  if (running) return { ok: true };
  try {
    await status('starting', 'Starting private tracking…');
    await waitForSandbox();
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    });
    video.srcObject = stream;
    await video.play();
    engine.start();
    blinkDetector.reset();
    running = true;
    paused = false;
    processing = false;
    lastFrameAt = 0;
    lastSentAt = 0;
    await status('calibrating', 'Calibrating your baseline');
    frameTimer = setInterval(processFrame, 100);
    return { ok: true };
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
    await status('error', 'Camera tracking could not start', { error: error.message });
    return { ok: false, error: error.message };
  }
}

async function stopTracking() {
  running = false;
  paused = false;
  processing = false;
  clearInterval(frameTimer);
  frameTimer = 0;
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  video.srcObject = null;
  engine.stop();
  blinkDetector.reset();
  visionFrame.contentWindow.postMessage({ source: 'learnfit-host', type: 'reset' }, '*');
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'offscreen') return false;
  (async () => {
    if (message.type === 'LEARNFIT_TRACKER_START') sendResponse(await startTracking());
    if (message.type === 'LEARNFIT_TRACKER_PAUSE') {
      paused = true;
      stream?.getVideoTracks().forEach((track) => { track.enabled = false; });
      sendResponse({ ok: true });
    }
    if (message.type === 'LEARNFIT_TRACKER_RESUME') {
      paused = false;
      stream?.getVideoTracks().forEach((track) => { track.enabled = true; });
      engine.lastSampleAt = performance.now();
      sendResponse({ ok: true });
    }
    if (message.type === 'LEARNFIT_TRACKER_STOP') {
      await stopTracking();
      sendResponse({ ok: true });
    }
  })().catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
