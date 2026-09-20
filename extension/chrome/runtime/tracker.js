// src/core/utils.js
var clamp = (value, min, max) => Math.min(max, Math.max(min, value));
var average = (values, fallback = 0) => {
  if (!values.length) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};
var round = (value, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
var distance = (pointA, pointB, width = 1, height = 1) => Math.hypot(
  (pointA.x - pointB.x) * width,
  (pointA.y - pointB.y) * height
);

// src/core/engine.js
var EYE_LANDMARKS = {
  LEFT: [33, 160, 158, 133, 153, 144],
  RIGHT: [362, 385, 387, 263, 373, 380]
};
function calculateEAR(landmarks, width = 1, height = 1) {
  const eyeEAR = (indices) => {
    const points = indices.map((index) => landmarks[index]);
    const horizontal = distance(points[0], points[3], width, height);
    if (!horizontal) return 0;
    return (distance(points[1], points[5], width, height) + distance(points[2], points[4], width, height)) / (2 * horizontal);
  };
  return (eyeEAR(EYE_LANDMARKS.LEFT) + eyeEAR(EYE_LANDMARKS.RIGHT)) / 2;
}
var BlinkDetector = class {
  constructor({ earThreshold = 0.22, fatigueDurationMs = 500 } = {}) {
    this.earThreshold = earThreshold;
    this.fatigueDurationMs = fatigueDurationMs;
    this.reset();
  }
  reset() {
    this.timestamps = [];
    this.isBlinking = false;
    this.blinkStartedAt = 0;
    this.latestDurationMs = 0;
  }
  update(ear, now = performance.now()) {
    this.timestamps = this.timestamps.filter((timestamp) => now - timestamp <= 6e4);
    let completed = false;
    if (ear < this.earThreshold && !this.isBlinking) {
      this.isBlinking = true;
      this.blinkStartedAt = now;
    } else if (ear >= this.earThreshold && this.isBlinking) {
      this.isBlinking = false;
      this.latestDurationMs = Math.round(now - this.blinkStartedAt);
      this.timestamps.push(now);
      completed = true;
    }
    const currentClosureMs = this.isBlinking ? now - this.blinkStartedAt : 0;
    return {
      completed,
      frequency: this.timestamps.length,
      duration: this.latestDurationMs,
      isFatigued: currentClosureMs >= this.fatigueDurationMs
    };
  }
};
var FocusEngine = class {
  constructor() {
    this.history = { blinkFrequency: [], blinkDuration: [], ear: [] };
    this.baseline = { blinkFrequency: 15, blinkDuration: 150, ear: 0.3 };
    this.optimalDurationSec = 1500;
    this.updateCount = 1;
    this.resetSession();
  }
  resetSession() {
    this.sessionStartedAt = null;
    this.scoreWindow = [];
    this.smoothedScore = null;
    this.minuteScoreBuffer = [];
    this.lastUpdateAt = 0;
  }
  start(now = performance.now()) {
    this.sessionStartedAt = now;
    this.history = { blinkFrequency: [], blinkDuration: [], ear: [] };
    this.calibrationMs = 0;
    this.calibrationBlinks = 0;
    this.lastSampleAt = now;
    this.optimalDurationSec = 1500;
    this.updateCount = 1;
    this.scoreWindow = [];
    this.smoothedScore = null;
    this.minuteScoreBuffer = [];
    this.lastUpdateAt = now;
  }
  stop() {
    this.sessionStartedAt = null;
  }
  calculate({ blinkFrequency, blinkDuration, ear, isFatigued = false, blinkCompleted = false }, now = performance.now()) {
    const optimalDuration = Math.max(1, Math.floor(this.optimalDurationSec / 60));
    if (this.sessionStartedAt === null) {
      return this.#result(0, 0, 0, 0, "Ready", optimalDuration, false);
    }
    const sampleMs = Math.min(250, Math.max(0, now - this.lastSampleAt));
    this.lastSampleAt = now;
    if (this.calibrationMs < 3e4) {
      this.calibrationMs += sampleMs;
      this.history.ear.push(Math.max(ear, 1e-6));
      if (blinkCompleted) {
        this.calibrationBlinks += 1;
        this.history.blinkDuration.push(blinkDuration);
      }
      this.baseline.blinkFrequency = this.calibrationBlinks * 6e4 / Math.max(1, this.calibrationMs);
      this.baseline.blinkDuration = average(this.history.blinkDuration, 0);
      this.baseline.ear = Math.max(average(this.history.ear, 0.3), 1e-6);
      return this.#result(0, 0, 0, 0, "Calibrating your baseline", optimalDuration, true);
    }
    const baseFrequency = this.baseline.blinkFrequency;
    const baseDuration = this.baseline.blinkDuration;
    const baseEAR = Math.max(this.baseline.ear, 1e-6);
    const frequencyPenalty = baseFrequency > 0 && blinkFrequency > baseFrequency * 1.3 ? (blinkFrequency - baseFrequency * 1.3) * 3 : 0;
    const blinkScore = clamp(50 - frequencyPenalty, 0, 50);
    const durationPenalty = baseDuration > 0 && blinkDuration > baseDuration + 50 ? (blinkDuration - (baseDuration + 50)) / 50 * 6 : 0;
    const durationScore = clamp(30 - durationPenalty, 0, 30);
    let eyeScore = 0;
    if (ear >= baseEAR * 0.85) {
      eyeScore = 20;
    } else if (ear >= baseEAR * 0.7) {
      eyeScore = 10 + (ear - baseEAR * 0.7) / Math.max(baseEAR * 0.15, 1e-6) * 10;
    }
    const rawScore = isFatigued ? Math.min(blinkScore + durationScore + eyeScore, 35) : blinkScore + durationScore + eyeScore;
    const alpha = 1 - Math.exp(-sampleMs / 1500);
    this.smoothedScore = this.smoothedScore === null ? rawScore : this.smoothedScore + alpha * (rawScore - this.smoothedScore);
    const focusScore = this.smoothedScore;
    this.minuteScoreBuffer.push(focusScore);
    if (now - this.lastUpdateAt >= 6e4) {
      const minuteAverage = average(this.minuteScoreBuffer);
      const observedDuration = this.optimalDurationSec * (minuteAverage / 75);
      const gain = Math.max(0.05, 1 / (1 + this.updateCount * 0.6));
      this.optimalDurationSec = (1 - gain) * this.optimalDurationSec + gain * observedDuration;
      this.updateCount += 1;
      this.minuteScoreBuffer = [];
      this.lastUpdateAt = now;
    }
    const status = isFatigued ? "Break suggested" : focusScore >= 75 ? "Stable" : focusScore >= 60 ? "Shifting" : "Break suggested";
    return this.#result(
      blinkScore,
      durationScore,
      eyeScore,
      focusScore,
      status,
      Math.max(1, Math.floor(this.optimalDurationSec / 60)),
      false
    );
  }
  #result(blinkScore, durationScore, eyeScore, focusScore, status, optimalDuration, isCalibrating) {
    return {
      baseline: { ...this.baseline },
      calibrationProgress: Math.min(1, (this.calibrationMs ?? 0) / 3e4),
      focusScore: round(focusScore),
      blinkScore: round(blinkScore),
      durationScore: round(durationScore),
      eyeScore: round(eyeScore),
      status,
      optimalDuration,
      isCalibrating
    };
  }
};

// src/core/tracker.js
var FACE_MESH_CDNS = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619",
  "https://unpkg.com/@mediapipe/face_mesh@0.4.1633559619"
];
var mediaPipeLoader;
var mediaPipeBaseUrl;
var TrackerError = class extends Error {
  constructor(code, message, { cause, recoverable = true } = {}) {
    super(message, { cause });
    this.name = "TrackerError";
    this.code = code;
    this.recoverable = recoverable;
  }
};
function loadScript(baseUrl) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      script.remove();
      reject(new Error("Eye-tracking assets took too long to load."));
    }, 2e4);
    script.src = `${baseUrl}/face_mesh.js`;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      clearTimeout(timeout);
      if (globalThis.FaceMesh) {
        resolve(baseUrl);
      } else {
        script.remove();
        reject(new Error(`FaceMesh was not provided by ${baseUrl}.`));
      }
    };
    script.onerror = () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error(`Could not load FaceMesh from ${baseUrl}.`));
    };
    document.head.append(script);
  });
}
async function loadMediaPipe(assetBaseUrls = FACE_MESH_CDNS) {
  if (globalThis.FaceMesh) {
    mediaPipeBaseUrl ??= assetBaseUrls[0];
    return mediaPipeBaseUrl;
  }
  if (mediaPipeLoader) return mediaPipeLoader;
  mediaPipeLoader = (async () => {
    const failures = [];
    for (const baseUrl of assetBaseUrls) {
      try {
        mediaPipeBaseUrl = await loadScript(baseUrl);
        return mediaPipeBaseUrl;
      } catch (error) {
        failures.push(error);
      }
    }
    throw new TrackerError(
      "MEDIAPIPE_LOAD_FAILED",
      "Could not load eye tracking. Check your internet connection and try again.",
      { cause: new AggregateError(failures, "All MediaPipe asset providers failed.") }
    );
  })().catch((error) => {
    mediaPipeLoader = null;
    throw error;
  });
  return mediaPipeLoader;
}
function normalizeCameraError(error) {
  const errors = {
    NotAllowedError: [
      "CAMERA_PERMISSION_DENIED",
      "Camera permission was denied. Allow camera access in your browser and try again."
    ],
    NotFoundError: [
      "CAMERA_NOT_FOUND",
      "No camera found. Connect a camera and try again."
    ],
    NotReadableError: [
      "CAMERA_IN_USE",
      "Your camera is unavailable. Close other apps using it and try again."
    ],
    SecurityError: [
      "CAMERA_INSECURE_CONTEXT",
      "Camera access requires HTTPS or localhost."
    ]
  };
  const [code, message] = errors[error?.name] ?? [
    "CAMERA_ACCESS_FAILED",
    "Cannot access your camera. Check your device and browser settings."
  ];
  return new TrackerError(code, message, { cause: error });
}
var FaceTracker = class {
  constructor({ video, width = 640, height = 480, onData, onStatus, onError, assetBaseUrls = FACE_MESH_CDNS } = {}) {
    if (!video) throw new TypeError("FaceTracker requires an HTMLVideoElement.");
    this.video = video;
    this.width = width;
    this.height = height;
    this.onData = onData;
    this.onStatus = onStatus;
    this.onError = onError;
    this.assetBaseUrls = assetBaseUrls;
    this.lifecycle = 0;
    this.starting = false;
    this.framePromise = null;
    this.engine = new FocusEngine();
    this.blinkDetector = new BlinkDetector();
    this.running = false;
    this.processing = false;
    this.animationFrame = 0;
    this.frameCounter = 0;
    this.fpsStartedAt = 0;
    this.lastProcessingErrorAt = Number.NEGATIVE_INFINITY;
  }
  async start() {
    if (this.running || this.starting) return;
    const lifecycle = ++this.lifecycle;
    this.starting = true;
    try {
      if (!globalThis.document || !globalThis.navigator?.mediaDevices?.getUserMedia) {
        throw new TrackerError(
          "BROWSER_UNSUPPORTED",
          "Camera tracking is unavailable. Use a current browser on HTTPS or localhost.",
          { recoverable: false }
        );
      }
      this.onStatus?.({ status: "loading-mediapipe" });
      const assetBaseUrl = await loadMediaPipe(this.assetBaseUrls);
      if (lifecycle !== this.lifecycle) return;
      try {
        this.faceMesh = new globalThis.FaceMesh({
          locateFile: (file) => `${assetBaseUrl}/${file}`
        });
        this.faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        this.faceMesh.onResults((results) => this.#handleResults(results));
      } catch (error) {
        throw new TrackerError(
          "MEDIAPIPE_INITIALIZATION_FAILED",
          "Eye tracking could not initialize. Refresh and try again.",
          { cause: error }
        );
      }
      this.onStatus?.({ status: "requesting-camera" });
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: this.width },
            height: { ideal: this.height }
          }
        });
        if (lifecycle !== this.lifecycle) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        this.stream = stream;
        for (const track of stream.getVideoTracks()) {
          track.addEventListener?.("ended", () => {
            if (!this.running) return;
            this.#emitError(new TrackerError("CAMERA_DISCONNECTED", "Your camera disconnected. End this session and reconnect your camera to try again."));
            this.onStatus?.({ status: "no-face" });
          });
        }
      } catch (error) {
        throw normalizeCameraError(error);
      }
      this.video.srcObject = this.stream;
      try {
        await this.video.play();
        if (lifecycle !== this.lifecycle) return;
      } catch (error) {
        throw new TrackerError(
          "VIDEO_PLAYBACK_FAILED",
          "Camera connected, but video could not play. Check browser playback settings.",
          { cause: error }
        );
      }
      this.onStatus?.({ status: "initializing-tracker" });
      await this.faceMesh.initialize?.();
      if (lifecycle !== this.lifecycle) return;
      this.running = true;
      this.paused = false;
      this.pausedMs = 0;
      this.processing = false;
      this.frameCounter = 0;
      this.fpsStartedAt = performance.now();
      this.blinkDetector.reset();
      this.lastValidFrameAt = 0;
      this.engine.start();
      this.onStatus?.({ status: "running" });
      this.#processFrame();
    } catch (error) {
      if (lifecycle !== this.lifecycle) return;
      const trackerError = error instanceof TrackerError ? error : new TrackerError("TRACKER_START_FAILED", "Eye tracking could not start. Please try again.", { cause: error });
      await this.#cleanup();
      this.#emitError(trackerError);
      throw trackerError;
    } finally {
      if (lifecycle === this.lifecycle) this.starting = false;
    }
  }
  async stop() {
    this.lifecycle += 1;
    this.starting = false;
    this.running = false;
    this.engine.stop();
    await this.#cleanup();
    this.onStatus?.({ status: "stopped" });
  }
  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.pauseStartedAt = performance.now();
    this.stream?.getVideoTracks().forEach((track) => {
      track.enabled = false;
    });
    this.blinkDetector.isBlinking = false;
  }
  resume() {
    if (!this.running || !this.paused) return;
    this.pausedMs += performance.now() - this.pauseStartedAt;
    this.stream?.getVideoTracks().forEach((track) => {
      track.enabled = true;
    });
    this.engine.lastSampleAt = performance.now() - this.pausedMs;
    this.lastValidFrameAt = 0;
    this.paused = false;
  }
  async #processFrame() {
    if (!this.running) return;
    if (!this.paused && !this.processing && this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.processing = true;
      try {
        this.framePromise = this.faceMesh.send({ image: this.video });
        await this.framePromise;
      } catch (error) {
        const now = performance.now();
        if (now - this.lastProcessingErrorAt >= 5e3) {
          this.lastProcessingErrorAt = now;
          this.#emitError(new TrackerError(
            "MEDIAPIPE_PROCESSING_FAILED",
            "Tracking was interrupted. Trying again automatically.",
            { cause: error }
          ));
        }
      } finally {
        this.processing = false;
        this.framePromise = null;
      }
    }
    if (this.running) this.animationFrame = requestAnimationFrame(() => this.#processFrame());
  }
  #handleResults(results) {
    if (!this.running || this.paused) return;
    const landmarks = results.multiFaceLandmarks?.[0];
    if (!landmarks) {
      this.engine.lastSampleAt = performance.now() - this.pausedMs;
      this.blinkDetector.isBlinking = false;
      this.onStatus?.({ status: "no-face" });
      return;
    }
    const now = performance.now() - this.pausedMs;
    const ear = Math.max(calculateEAR(landmarks, this.video.videoWidth, this.video.videoHeight), 1e-6);
    if (this.lastValidFrameAt && now - this.lastValidFrameAt > 500) {
      this.blinkDetector.isBlinking = false;
      this.engine.lastSampleAt = now;
    }
    this.lastValidFrameAt = now;
    const blink = this.blinkDetector.update(ear, now);
    const observedSeconds = Math.min(60, Math.max(1, (now - this.engine.sessionStartedAt) / 1e3));
    const blinkFrequency = blink.frequency * 60 / observedSeconds;
    const score = this.engine.calculate({
      blinkFrequency,
      blinkDuration: blink.duration,
      ear,
      isFatigued: blink.isFatigued,
      blinkCompleted: blink.completed
    }, now);
    this.frameCounter += 1;
    const elapsed = Math.max((now - this.fpsStartedAt) / 1e3, 1e-3);
    const fps = this.frameCounter / elapsed;
    this.onData?.({
      ...score,
      ear,
      blinkFrequency,
      blinkDuration: blink.duration,
      isFatigued: blink.isFatigued,
      fps,
      timestamp: Date.now()
    });
  }
  async #cleanup() {
    cancelAnimationFrame(this.animationFrame);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
    try {
      await this.framePromise;
      await this.faceMesh?.close?.();
    } catch {
    }
    this.faceMesh = null;
  }
  #emitError(error) {
    this.onError?.({
      code: error.code,
      message: error.message,
      recoverable: error.recoverable,
      cause: error.cause
    });
  }
};
export {
  FaceTracker,
  TrackerError
};
