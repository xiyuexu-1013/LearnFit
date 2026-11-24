import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTaskPage, finalFocusEstimate, inheritedStudyPage, normalizePage, trackingCoverage } from '../extension/chrome/task-context.js';

test('one confirmation keeps the same tab verified across navigation', () => {
  const allowed = [{ tabId: 7, url: 'https://example.com/chapter?unit=2', title: 'Chapter' }];
  assert.equal(classifyTaskPage({ id: 7, url: 'https://example.com/chapter?unit=2#notes' }, allowed), 'study');
  assert.equal(classifyTaskPage({ id: 7, url: 'https://example.com/next-chapter' }, allowed), 'study');
  assert.equal(classifyTaskPage({ id: 9, url: 'https://video.example/watch' }, allowed), 'off-task');
  assert.equal(normalizePage('chrome://extensions'), '');
});

test('user-confirmed PDF viewer extension pages can be study pages', () => {
  const pdfUrl = 'chrome-extension://efaidnbmnnnibpcajpcglclefindmkaj/https://drive.usercontent.example/calculus.pdf';
  const normalized = normalizePage(pdfUrl);
  assert.equal(normalized, pdfUrl);
  assert.equal(classifyTaskPage({ id: 12, url: pdfUrl }, [{ tabId: 12, url: normalized, title: 'Calculus PDF' }]), 'study');
});

test('a new tab inherits study status only from its verified opener', () => {
  const allowed = [{ tabId: 7, url: 'https://example.com/chapter', title: 'Chapter' }];
  assert.deepEqual(inheritedStudyPage({ id: 8, openerTabId: 7, url: 'https://reference.example/formula', title: 'Formula' }, allowed), {
    tabId: 8, url: 'https://reference.example/formula', title: 'Formula', inheritedFromTabId: 7,
  });
  assert.equal(inheritedStudyPage({ id: 9, url: 'https://game.example/' }, allowed), null);
  assert.equal(inheritedStudyPage({ id: 10, openerTabId: 99, url: 'https://video.example/' }, allowed), null);
});

test('final focus estimate requires 60 percent signal coverage', () => {
  const session = { verifiedMs: 100_000, validSignalMs: 59_000, scoreTotal: 160, scoreSamples: 2 };
  assert.equal(trackingCoverage(session), 59);
  assert.equal(finalFocusEstimate(session), null);
  assert.equal(finalFocusEstimate({ ...session, validSignalMs: 60_000 }), 80);
});
