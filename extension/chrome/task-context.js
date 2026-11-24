export function normalizePage(url = '') {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'file:', 'chrome-extension:'].includes(parsed.protocol)) return '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '';
  }
}

export function classifyTaskPage(tab, allowedPages = []) {
  const url = normalizePage(tab?.url);
  if (!url) return 'off-task';
  // One confirmation covers this Chrome tab for the rest of the session.
  // Navigation inside it should not silently discard verified study time.
  if (allowedPages.some((page) => page.tabId === tab?.id)) return 'study';
  if (allowedPages.some((page) => page.url === url)) return 'study';
  return 'off-task';
}

export function inheritedStudyPage(tab, allowedPages = []) {
  const url = normalizePage(tab?.url);
  const openerTabId = Number(tab?.openerTabId);
  if (!url || !Number.isInteger(openerTabId)) return null;
  if (!allowedPages.some((page) => page.tabId === openerTabId)) return null;
  return {
    tabId: tab.id,
    url,
    title: String(tab.title || new URL(url).hostname).slice(0, 160),
    inheritedFromTabId: openerTabId,
  };
}

export function trackingCoverage(session) {
  const verified = Math.max(0, Number(session?.verifiedMs) || 0);
  const valid = Math.max(0, Number(session?.validSignalMs) || 0);
  return verified ? Math.min(100, Math.round(valid / verified * 100)) : 0;
}

export function finalFocusEstimate(session, minimumCoverage = 60) {
  if (trackingCoverage(session) < minimumCoverage || !session?.scoreSamples) return null;
  return Math.round(session.scoreTotal / session.scoreSamples);
}
