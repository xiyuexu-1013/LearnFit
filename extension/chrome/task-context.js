export function normalizePage(url = '') {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) return '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '';
  }
}

export function classifyTaskPage(tab, allowedPages = []) {
  const url = normalizePage(tab?.url);
  if (!url) return 'off-task';
  if (allowedPages.some((page) => page.url === url)) return 'study';
  if (allowedPages.some((page) => page.tabId === tab?.id)) return 'needs-confirmation';
  return 'off-task';
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
