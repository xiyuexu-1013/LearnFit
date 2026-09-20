import { average, clamp, distance, round } from './utils.js';

export const EYE_LANDMARKS = {
  LEFT: [33, 160, 158, 133, 153, 144],
  RIGHT: [362, 385, 387, 263, 373, 380],
};

/**
 * EAR 公式移植自 legacy/backend/eye.py。
 * EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
 */
export function calculateEAR(landmarks, width = 1, height = 1) {
  const eyeEAR = (indices) => {
    const points = indices.map((index) => landmarks[index]);
    const horizontal = distance(points[0], points[3], width, height);
    if (!horizontal) return 0;
    return (
      distance(points[1], points[5], width, height)
      + distance(points[2], points[4], width, height)
    ) / (2 * horizontal);
  };

  return (eyeEAR(EYE_LANDMARKS.LEFT) + eyeEAR(EYE_LANDMARKS.RIGHT)) / 2;
}

/**
 * 眨眼状态机移植自 legacy/backend/blink.py。
 * 记录最近 60 秒的眨眼次数，并保留最近一次闭眼时长。
 */
export class BlinkDetector {
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
    this.timestamps = this.timestamps.filter((timestamp) => now - timestamp <= 60_000);

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
      isFatigued: currentClosureMs >= this.fatigueDurationMs,
    };
  }
}

/**
 * 专注度引擎移植自 legacy/backend/attention.py。
 * 保留 30 秒个体校准、50/30/20 分项权重和每分钟动态更新。
 * 原 90 帧平滑改为按时间的指数平滑，避免不同设备帧率改变响应速度。
 */
export class FocusEngine {
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
      return this.#result(0, 0, 0, 0, 'Ready', optimalDuration, false);
    }

    // 沿用 legacy/backend/attention.py 的 30 秒校准；只累计有效追踪时间。
    const sampleMs = Math.min(250, Math.max(0, now - this.lastSampleAt));
    this.lastSampleAt = now;
    if (this.calibrationMs < 30_000) {
      this.calibrationMs += sampleMs;
      this.history.ear.push(Math.max(ear, 1e-6));
      if (blinkCompleted) {
        this.calibrationBlinks += 1;
        this.history.blinkDuration.push(blinkDuration);
      }
      this.baseline.blinkFrequency = this.calibrationBlinks * 60_000 / Math.max(1, this.calibrationMs);
      this.baseline.blinkDuration = average(this.history.blinkDuration, 0);
      this.baseline.ear = Math.max(average(this.history.ear, 0.3), 1e-6);
      return this.#result(0, 0, 0, 0, 'Calibrating your baseline', optimalDuration, true);
    }

    const baseFrequency = this.baseline.blinkFrequency;
    const baseDuration = this.baseline.blinkDuration;
    const baseEAR = Math.max(this.baseline.ear, 1e-6);

    const frequencyPenalty = baseFrequency > 0 && blinkFrequency > baseFrequency * 1.3
      ? (blinkFrequency - baseFrequency * 1.3) * 3
      : 0;
    const blinkScore = clamp(50 - frequencyPenalty, 0, 50);

    const durationPenalty = baseDuration > 0 && blinkDuration > baseDuration + 50
      ? ((blinkDuration - (baseDuration + 50)) / 50) * 6
      : 0;
    const durationScore = clamp(30 - durationPenalty, 0, 30);

    let eyeScore = 0;
    if (ear >= baseEAR * 0.85) {
      eyeScore = 20;
    } else if (ear >= baseEAR * 0.7) {
      eyeScore = 10 + ((ear - baseEAR * 0.7) / Math.max(baseEAR * 0.15, 1e-6)) * 10;
    }

    /*
     * 疲劳分数上限是相对 legacy/backend/attention.py 的新增设计：
     * Python 版本没有把持续闭眼状态接入综合分，可能出现“已疲劳但分数仍高”的矛盾。
     * 选择 35 分是为了稳定落在 Dashboard 的 40 分红色警示阈值以下，明确触发休息建议；
     * 同时保留非零分数，使趋势图仍能表达疲劳期间的相对变化，而不是强制归零。
     */
    const rawScore = isFatigued
      ? Math.min(blinkScore + durationScore + eyeScore, 35)
      : blinkScore + durationScore + eyeScore;
    // 1.5 秒时间常数为工程启发式；追踪中断不累计为有效采样时间。
    const alpha = 1 - Math.exp(-sampleMs / 1500);
    this.smoothedScore = this.smoothedScore === null
      ? rawScore
      : this.smoothedScore + alpha * (rawScore - this.smoothedScore);
    const focusScore = this.smoothedScore;

    this.minuteScoreBuffer.push(focusScore);
    if (now - this.lastUpdateAt >= 60_000) {
      const minuteAverage = average(this.minuteScoreBuffer);
      const observedDuration = this.optimalDurationSec * (minuteAverage / 75);
      const gain = Math.max(0.05, 1 / (1 + this.updateCount * 0.6));
      this.optimalDurationSec = (1 - gain) * this.optimalDurationSec + gain * observedDuration;
      this.updateCount += 1;
      this.minuteScoreBuffer = [];
      this.lastUpdateAt = now;
    }

    // 疲劳判定结合 legacy/backend/blink.py 的持续闭眼状态。
    const status = isFatigued
      ? 'Break suggested'
      : focusScore >= 75
        ? 'Stable'
        : focusScore >= 60
          ? 'Shifting'
          : 'Break suggested';

    return this.#result(
      blinkScore,
      durationScore,
      eyeScore,
      focusScore,
      status,
      Math.max(1, Math.floor(this.optimalDurationSec / 60)),
      false,
    );
  }

  #result(blinkScore, durationScore, eyeScore, focusScore, status, optimalDuration, isCalibrating) {
    return {
      baseline: { ...this.baseline },
      calibrationProgress: Math.min(1, (this.calibrationMs ?? 0) / 30_000),
      focusScore: round(focusScore),
      blinkScore: round(blinkScore),
      durationScore: round(durationScore),
      eyeScore: round(eyeScore),
      status,
      optimalDuration,
      isCalibrating,
    };
  }
}
