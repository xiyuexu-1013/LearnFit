import test from 'node:test';
import assert from 'node:assert/strict';
import { translate, translations } from '../src/ui/language.js';
import { translationsKo } from '../src/ui/locales/ko.js';
import { translationsEs } from '../src/ui/locales/es.js';
test('English mode preserves source text and Chinese replaces rather than appends', () => {
  assert.equal(translate('Pause', 'en'), 'Pause');
  assert.equal(translate('Pause', 'zh'), '暂停');
  assert.equal(translate(' Step 2 of 4 ', 'en'), ' Step 2 of 4 ');
  assert.equal(translate('Step 2 of 4', 'zh'), '第 2 步，共 4 步');
});
test('localized dynamic metrics preserve measured values', () => {
  assert.equal(translate('28 min', 'zh'), '28 分钟');
  assert.equal(translate('Task: chapter 2', 'zh'), '任务：chapter 2');
  assert.equal(translate('67 / 100', 'zh'), '67 / 100');
  assert.equal(translate('Session: 28:50 verified study · 04:38 off task · 87% tracking coverage · focus estimate: 67 / 100 · Chrome extension', 'zh'), '本次：已确认学习 28:50 · 非任务页面 04:38 · 覆盖率 87% · 专注度估计 67 / 100 · Chrome 插件');
});
test('tutorial, consent and report labels have independent Chinese translations', () => {
  for (const label of ['Choose your study task','Read your results','Average focus estimate','Strongly disagree','Your camera stays yours.','Your study rhythm belongs to you.','You do not need to stare at the camera.','Historical evidence note:','Valid observation time']) {
    assert.notEqual(translate(label,'zh'), label);
    assert.equal(translate(label,'en'), label);
  }
});

test('privacy settings and eye-signal explanation are fully translated', () => {
  assert.equal(translate('Camera & privacy', 'zh'), '摄像头与隐私');
  assert.equal(translate('Why eye signals?', 'zh'), '为什么选择眼部信号？');
  assert.match(translate('Blink rate can change with visual demand, fatigue, dryness, and cognitive load. LearnFit compares completed blinks per minute with your own baseline rather than a universal “normal” number.', 'zh'), /视觉负荷/);
  assert.match(translate('Frames and facial landmarks stay in browser memory and are never uploaded.', 'zh'), /绝不会上传/);
  assert.match(translate('Before the next session, write one concrete outcome—such as finishing one section or solving five problems—and close unrelated tabs.', 'zh'), /具体目标/);
});

test('Korean and Spanish modes translate the complete core product flow', () => {
  const labels = [
    'Settings',
    'Study with camera',
    'Timer only',
    'Choose your study task',
    'Set up your camera',
    'You do not need to stare at the camera.',
    'Camera processing stays on this device.',
    'Why eye signals?',
    'Download report',
    'Give 2-minute feedback',
    'Open dashboard',
  ];
  for (const locale of ['ko', 'es']) {
    for (const label of labels) {
      assert.notEqual(translate(label, locale), label, `${label} should be translated for ${locale}`);
      assert.equal(translate(label, 'en'), label);
    }
  }
});

test('Korean and Spanish dynamic labels preserve measured values', () => {
  assert.equal(translate('Step 2 of 4', 'ko'), '4단계 중 2단계');
  assert.equal(translate('Step 2 of 4', 'es'), 'Paso 2 de 4');
  assert.equal(translate('28 min', 'ko'), '28분');
  assert.equal(translate('28 min', 'es'), '28 min');
  assert.match(translate('Task: chapter 2', 'ko'), /chapter 2/);
  assert.match(translate('Task: chapter 2', 'es'), /chapter 2/);
});

test('long tutorial and privacy explanations are localized in Korean and Spanish', () => {
  const source = 'You do not need to stare at the camera. Look at your study material naturally; just position the camera so it can usually see your eyes. About 30 seconds of usable tracking builds your personal baseline.';
  assert.match(translate(source, 'ko'), /30초/);
  assert.match(translate(source, 'es'), /30 segundos/);
  const privacy = 'Frames and facial landmarks stay in browser memory and are never uploaded.';
  assert.notEqual(translate(privacy, 'ko'), privacy);
  assert.notEqual(translate(privacy, 'es'), privacy);
});

test('Korean and Spanish cover every product string already localized in Chinese', () => {
  for (const source of Object.keys(translations)) {
    assert.ok(Object.hasOwn(translationsKo, source), `missing Korean translation: ${source}`);
    assert.ok(Object.hasOwn(translationsEs, source), `missing Spanish translation: ${source}`);
  }
});

test('maker statement, extension setup, and privacy policy are localized', () => {
  const labels = [
    'A NOTE FROM THE MAKER',
    'Choose the Chrome webpages, online lessons, and PDFs that belong to your task. The extension runs camera tracking independently of this website while Chrome stays open. It pauses scoring on unconfirmed pages. Independent desktop apps are not recognized.',
    'What stays on your device',
    'Why the extension asks for permissions',
    'LEARNFIT · PRIVACY FIRST · ON-DEVICE CAMERA PROCESSING',
  ];
  for (const locale of ['ko', 'es']) {
    for (const label of labels) assert.notEqual(translate(label, locale), label);
  }
});

test('Korean and Spanish localize generated report advice and research rows', () => {
  const advice = 'Your measured periods showed a marked change (58/100). Try a work block about 5 minutes shorter, take a 2–5 minute screen break, then restart with one small next action.';
  const response = 'Ease 4/5 · Useful 5/5 · Clear 4/5 · Self-focus 3/5 · On task: most · Again: yes';
  assert.match(translate(advice, 'ko'), /58\/100/);
  assert.match(translate(advice, 'es'), /58\/100/);
  assert.match(translate(response, 'ko'), /대부분/);
  assert.match(translate(response, 'es'), /la mayor parte/);
});
