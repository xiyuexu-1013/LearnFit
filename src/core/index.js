import { FaceTracker } from './tracker.js';

export { BlinkDetector, calculateEAR, EYE_LANDMARKS, FocusEngine } from './engine.js';
export { FaceTracker, TrackerError } from './tracker.js';

/**
 * LearnFit SDK 主入口。
 *
 * @example
 * const tracker = new EyeFocusTracker({ video: document.querySelector('video') });
 * tracker.on('data', console.log);
 * await tracker.start();
 */
export class EyeFocusTracker {
  constructor(options = {}) {
    this.listeners = new Map();
    this.tracker = new FaceTracker({
      ...options,
      onData: (data) => this.#emit('data', data),
      onStatus: (status) => this.#emit('status', status),
      onError: (error) => this.#emit('error', error),
    });
  }

  on(event, listener) {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
    return () => this.off(event, listener);
  }

  off(event, listener) {
    this.listeners.get(event)?.delete(listener);
  }

  start() {
    return this.tracker.start();
  }

  stop() {
    return this.tracker.stop();
  }

  #emit(event, payload) {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }
}

export default EyeFocusTracker;
