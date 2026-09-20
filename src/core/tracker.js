import { BlinkDetector, calculateEAR, FocusEngine } from './engine.js';

const FACE_MESH_CDNS = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619',
  'https://unpkg.com/@mediapipe/face_mesh@0.4.1633559619',
];

let mediaPipeLoader;
let mediaPipeBaseUrl;

export class TrackerError extends Error {
  constructor(code, message, { cause, recoverable = true } = {}) {
    super(message, { cause });
    this.name = 'TrackerError';
    this.code = code;
    this.recoverable = recoverable;
  }
}

function loadScript(baseUrl) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = setTimeout(() => {
      script.remove();
      reject(new Error('Eye-tracking assets took too long to load.'));
    }, 20_000);
    script.src = `${baseUrl}/face_mesh.js`;
    script.crossOrigin = 'anonymous';
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

  // SDK 按需加载 MediaPipe；jsDelivr 不可用时自动回退到 unpkg。
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
      'MEDIAPIPE_LOAD_FAILED',
      'Could not load eye tracking. Check your internet connection and try again.',
      { cause: new AggregateError(failures, 'All MediaPipe asset providers failed.') },
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
      'CAMERA_PERMISSION_DENIED',
      'Camera permission was denied. Allow camera access in your browser and try again.',
    ],
    NotFoundError: [
      'CAMERA_NOT_FOUND',
      'No camera found. Connect a camera and try again.',
    ],
    NotReadableError: [
      'CAMERA_IN_USE',
      'Your camera is unavailable. Close other apps using it and try again.',
    ],
    SecurityError: [
      'CAMERA_INSECURE_CONTEXT',
      'Camera access requires HTTPS or localhost.',
    ],
  };
  const [code, message] = errors[error?.name] ?? [
    'CAMERA_ACCESS_FAILED',
    'Cannot access your camera. Check your device and browser settings.',
  ];
  return new TrackerError(code, message, { cause: error });
}

/**
 * MediaPipe FaceMesh 浏览器封装。
 * 摄像头帧只传入本页内存中的模型，不会上传到 LearnFit 服务器。
 */
export class FaceTracker {
  constructor({ video, width = 640, height = 480, onData, onStatus, onError, assetBaseUrls = FACE_MESH_CDNS } = {}) {
    if (!video) throw new TypeError('FaceTracker requires an HTMLVideoElement.');
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
          'BROWSER_UNSUPPORTED',
          'Camera tracking is unavailable. Use a current browser on HTTPS or localhost.',
          { recoverable: false },
        );
      }

      this.onStatus?.({ status: 'loading-mediapipe' });
      const assetBaseUrl = await loadMediaPipe(this.assetBaseUrls);
      if (lifecycle !== this.lifecycle) return;

      try {
        this.faceMesh = new globalThis.FaceMesh({
          locateFile: (file) => `${assetBaseUrl}/${file}`,
        });
        this.faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        this.faceMesh.onResults((results) => this.#handleResults(results));
      } catch (error) {
        throw new TrackerError(
          'MEDIAPIPE_INITIALIZATION_FAILED',
          'Eye tracking could not initialize. Refresh and try again.',
          { cause: error },
        );
      }

      this.onStatus?.({ status: 'requesting-camera' });
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: 'user',
            width: { ideal: this.width },
            height: { ideal: this.height },
          },
        });
        // 用户取消后才获批的流必须立即关闭，避免重新点亮摄像头。
        if (lifecycle !== this.lifecycle) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        this.stream = stream;
        for (const track of stream.getVideoTracks()) {
          track.addEventListener?.('ended', () => {
            if (!this.running) return;
            this.#emitError(new TrackerError('CAMERA_DISCONNECTED', 'Your camera disconnected. End this session and reconnect your camera to try again.'));
            this.onStatus?.({ status: 'no-face' });
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
          'VIDEO_PLAYBACK_FAILED',
          'Camera connected, but video could not play. Check browser playback settings.',
          { cause: error },
        );
      }

      this.onStatus?.({ status: 'initializing-tracker' });
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
      this.onStatus?.({ status: 'running' });
      this.#processFrame();
    } catch (error) {
      if (lifecycle !== this.lifecycle) return;
      const trackerError = error instanceof TrackerError
        ? error
        : new TrackerError('TRACKER_START_FAILED', 'Eye tracking could not start. Please try again.', { cause: error });
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
    this.onStatus?.({ status: 'stopped' });
  }

  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.pauseStartedAt = performance.now();
    this.stream?.getVideoTracks().forEach((track) => { track.enabled = false; });
    // 暂停不能被算作长闭眼；保留个人基线及有效学习时间。
    this.blinkDetector.isBlinking = false;
  }

  resume() {
    if (!this.running || !this.paused) return;
    this.pausedMs += performance.now() - this.pauseStartedAt;
    this.stream?.getVideoTracks().forEach((track) => { track.enabled = true; });
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
        // 连续帧错误最多每 5 秒报告一次，避免淹没调用方。
        if (now - this.lastProcessingErrorAt >= 5000) {
          this.lastProcessingErrorAt = now;
          this.#emitError(new TrackerError(
            'MEDIAPIPE_PROCESSING_FAILED',
            'Tracking was interrupted. Trying again automatically.',
            { cause: error },
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
      this.onStatus?.({ status: 'no-face' });
      return;
    }

    const now = performance.now() - this.pausedMs;
    const ear = Math.max(calculateEAR(landmarks, this.video.videoWidth, this.video.videoHeight), 1e-6);
    // 追踪中断不能被计为一次长眨眼（沿用 legacy/backend/blink.py 的事件边界）。
    if (this.lastValidFrameAt && now - this.lastValidFrameAt > 500) {
      this.blinkDetector.isBlinking = false;
      this.engine.lastSampleAt = now;
    }
    this.lastValidFrameAt = now;
    const blink = this.blinkDetector.update(ear, now);
    const observedSeconds = Math.min(60, Math.max(1, (now - this.engine.sessionStartedAt) / 1000));
    const blinkFrequency = blink.frequency * 60 / observedSeconds;
    const score = this.engine.calculate({
      blinkFrequency,
      blinkDuration: blink.duration,
      ear,
      isFatigued: blink.isFatigued,
      blinkCompleted: blink.completed,
    }, now);

    this.frameCounter += 1;
    const elapsed = Math.max((now - this.fpsStartedAt) / 1000, 1e-3);
    const fps = this.frameCounter / elapsed;

    this.onData?.({
      ...score,
      ear,
      blinkFrequency,
      blinkDuration: blink.duration,
      isFatigued: blink.isFatigued,
      fps,
      timestamp: Date.now(),
    });
  }

  async #cleanup() {
    cancelAnimationFrame(this.animationFrame);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
    try {
      // 等待已提交的帧处理完成，再释放 WebAssembly 运行时。
      await this.framePromise;
      await this.faceMesh?.close?.();
    } catch {
      // 清理失败不覆盖原始启动或处理错误。
    }
    this.faceMesh = null;
  }

  #emitError(error) {
    this.onError?.({
      code: error.code,
      message: error.message,
      recoverable: error.recoverable,
      cause: error.cause,
    });
  }
}
