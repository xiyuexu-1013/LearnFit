const SOURCE = 'learnfit-sandbox';
const ASSET_BASE = new URL('vendor/mediapipe-0.4.1633559619/', location.href).href;
let faceMesh;
let initializing;
let announceTimer;

function reply(type, extra = {}) {
  parent.postMessage({ source: SOURCE, type, ...extra }, '*');
}

async function initialize() {
  clearInterval(announceTimer);
  if (faceMesh) return reply('ready');
  if (initializing) return initializing;
  initializing = (async () => {
    faceMesh = new FaceMesh({ locateFile: (file) => `${ASSET_BASE}${file}` });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    faceMesh.onResults((results) => {
      const landmarks = results.multiFaceLandmarks?.[0];
      reply('result', { landmarks: landmarks ? landmarks.map(({ x, y, z }) => ({ x, y, z })) : null });
    });
    await faceMesh.initialize();
    reply('ready');
  })().catch((error) => {
    faceMesh = null;
    reply('error', { message: error.message || 'The local eye-tracking engine could not start.' });
  }).finally(() => { initializing = null; });
  return initializing;
}

window.addEventListener('message', async (event) => {
  if (event.source !== parent || event.data?.source !== 'learnfit-host') return;
  if (event.data.type === 'initialize') await initialize();
  if (event.data.type === 'frame') {
    try {
      if (!faceMesh) await initialize();
      await faceMesh.send({ image: event.data.bitmap });
    } catch (error) {
      reply('error', { message: error.message || 'Eye tracking was interrupted.' });
    } finally {
      event.data.bitmap?.close?.();
    }
  }
  if (event.data.type === 'reset') await faceMesh?.reset?.();
});

reply('loaded');
announceTimer = setInterval(() => reply('loaded'), 250);
