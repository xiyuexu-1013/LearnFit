export const PREFERENCE_KEYS = ['studyView', 'cameraPreview', 'defaultCheckIn', 'sessionMode'];

export const DEFAULT_PREFERENCES = Object.freeze({
  studyView: 'detailed', cameraPreview: 'show', defaultCheckIn: 25, sessionMode: 'camera',
});

export function normalizePreferences(value = {}) {
  const hasMinutes = value.defaultCheckIn !== null && value.defaultCheckIn !== undefined && value.defaultCheckIn !== '';
  const minutes = hasMinutes ? Number(value.defaultCheckIn) : NaN;
  return {
    studyView: value.studyView === 'quiet' ? 'quiet' : 'detailed',
    cameraPreview: value.cameraPreview === 'hide' ? 'hide' : 'show',
    defaultCheckIn: Number.isFinite(minutes) ? Math.max(5, Math.min(90, Math.round(minutes))) : 25,
    sessionMode: value.sessionMode === 'timer' ? 'timer' : 'camera',
  };
}

export function readWebPreferences(storage = localStorage) {
  const raw = Object.fromEntries(PREFERENCE_KEYS.map((key) => [key, storage.getItem(`learnfit.${key}`)]));
  return normalizePreferences(raw);
}

export function writeWebPreferences(preferences, storage = localStorage) {
  const normalized = normalizePreferences(preferences);
  for (const key of PREFERENCE_KEYS) storage.setItem(`learnfit.${key}`, String(normalized[key]));
  return normalized;
}
