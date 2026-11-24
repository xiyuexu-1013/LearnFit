import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePreferences, readWebPreferences, writeWebPreferences } from '../src/ui/preferences.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('preferences validate modes and clamp check-in minutes', () => {
  assert.equal(normalizePreferences({}).defaultCheckIn, 25);
  assert.deepEqual(normalizePreferences({ studyView: 'quiet', cameraPreview: 'hide', defaultCheckIn: 200, sessionMode: 'timer' }), {
    studyView: 'quiet', cameraPreview: 'hide', defaultCheckIn: 90, sessionMode: 'timer',
  });
  assert.equal(normalizePreferences({ defaultCheckIn: 'bad' }).defaultCheckIn, 25);
});

test('web preferences round-trip under local-only namespaced keys', () => {
  const storage = memoryStorage();
  writeWebPreferences({ studyView: 'quiet', cameraPreview: 'hide', defaultCheckIn: 35, sessionMode: 'timer' }, storage);
  assert.deepEqual(readWebPreferences(storage), { studyView: 'quiet', cameraPreview: 'hide', defaultCheckIn: 35, sessionMode: 'timer' });
});
