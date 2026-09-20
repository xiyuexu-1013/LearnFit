const STORAGE_KEY = 'learnfit.reflections.v1';

export function readReflections(storage) {
  try {
    const values = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(values) ? values.filter((v) => v && typeof v.task === 'string' && typeof v.date === 'string' && Number.isFinite(v.seconds) && typeof v.completion === 'string' && typeof v.energy === 'string' && typeof v.note === 'string').slice(0, 10) : [];
  } catch { return []; }
}

export function saveReflection(storage, entry) {
  // 只保存主动选择的摘要，不保存摄像头、眼部特征或逐秒数据。
  const next = [entry, ...readReflections(storage).filter((v) => v.id !== entry.id)].slice(0, 10);
  storage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearReflections(storage) { storage.removeItem(STORAGE_KEY); }
