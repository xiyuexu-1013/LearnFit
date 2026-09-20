/**
 * LearnFit 通用数学工具。
 * 所有函数均无副作用，便于 SDK 使用者单独测试。
 */

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const average = (values, fallback = 0) => {
  if (!values.length) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const round = (value, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const distance = (pointA, pointB, width = 1, height = 1) =>
  Math.hypot(
    (pointA.x - pointB.x) * width,
    (pointA.y - pointB.y) * height,
  );
