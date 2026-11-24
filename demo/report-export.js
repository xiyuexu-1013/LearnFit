import { interpretFocus } from './session.js';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const clock = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function reportBaseName(createdAt = new Date()) {
  const date = new Date(createdAt);
  const stamp = date.toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  return `learnfit-session-${stamp}`;
}

export function buildSessionCsv({ samples = [], sessionMode = 'camera', durationSeconds = 0 }) {
  const columns = ['session_mode', 'elapsed_seconds', 'time', 'focus_estimate', 'signal_available'];
  if (sessionMode === 'timer') return [columns, ['timer', Math.max(0, Math.round(durationSeconds)), clock(durationSeconds), '', '']].map((row) => row.map(csvCell).join(',')).join('\n');
  const rows = samples.map((sample) => [
    'camera',
    Math.max(0, Math.round(sample.t || 0)),
    clock(Math.max(0, sample.t || 0)),
    Number.isFinite(sample.score) ? Math.round(sample.score * 100) / 100 : '',
    Number.isFinite(sample.score),
  ]);
  return [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

function chartSvg(samples, durationSeconds) {
  const width = 800; const height = 230; const left = 42; const right = 780; const top = 18; const bottom = 190;
  const duration = Math.max(1, durationSeconds || 0);
  const x = (t) => left + Math.min(duration, Math.max(0, t)) / duration * (right - left);
  const y = (score) => bottom - Math.max(0, Math.min(100, score)) / 100 * (bottom - top);
  let path = ''; let previous = null; const segments = [];
  for (const sample of samples) {
    if (!Number.isFinite(sample.score)) { previous = null; continue; }
    const connected = previous && sample.t - previous.t <= 2;
    path += `${connected ? 'L' : 'M'}${x(sample.t).toFixed(1)},${y(sample.score).toFixed(1)} `;
    if (!connected) path += `L${(x(sample.t) + .01).toFixed(2)},${y(sample.score).toFixed(1)} `;
    if (connected) {
      const midpoint = (previous.score + sample.score) / 2;
      const color = midpoint >= 75 ? '#458875' : midpoint >= 60 ? '#d59a2d' : '#c75b4b';
      segments.push(`<line x1="${x(previous.t).toFixed(1)}" y1="${y(previous.score).toFixed(1)}" x2="${x(sample.t).toFixed(1)}" y2="${y(sample.score).toFixed(1)}" stroke="${color}"/>`);
    } else {
      const color = sample.score >= 75 ? '#458875' : sample.score >= 60 ? '#d59a2d' : '#c75b4b';
      segments.push(`<circle cx="${x(sample.t).toFixed(1)}" cy="${y(sample.score).toFixed(1)}" r="2.5" fill="${color}"/>`);
    }
    previous = sample;
  }
  const grid = [0, 25, 50, 75, 100].map((value) => `<line x1="${left}" y1="${y(value)}" x2="${right}" y2="${y(value)}"/><text x="34" y="${y(value) + 4}" text-anchor="end">${value}</text>`).join('');
  const bands = `<rect x="${left}" y="${top}" width="${right-left}" height="${y(75)-top}" fill="#45887518"/><rect x="${left}" y="${y(75)}" width="${right-left}" height="${y(60)-y(75)}" fill="#d59a2d20"/><rect x="${left}" y="${y(60)}" width="${right-left}" height="${bottom-y(60)}" fill="#c75b4b12"/>`;
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Focus estimate over time with green, amber, coral, and missing-signal states">${bands}<g class="grid">${grid}</g><g class="score-lines">${segments.join('')}</g></svg>`;
}

export function buildSessionReportHtml({ createdAt, task, durationSeconds, report, recommendations = [], samples = [], example = false, sessionMode = 'camera' }) {
  const created = new Date(createdAt);
  const interpretation = interpretFocus(report.averageScore, report.quality);
  const stable = report.best ? `${clock(report.best.start)}–${clock(report.best.end)}` : 'Not enough data';
  const shift = report.firstShift !== null ? `Around ${clock(report.firstShift)}` : report.usable < 10 ? 'Not enough data' : 'None observed';
  const metrics = sessionMode === 'timer' ? [
    ['Session mode', 'Timer only'], ['Session time', clock(durationSeconds)], ['Focus estimate', 'Not measured'],
  ] : [
    ['Average focus estimate', report.averageScore === null ? 'Not enough tracking data' : `${report.averageScore} / 100`],
    ['Focus interpretation', interpretation.label],
    ['Session time', clock(durationSeconds)],
    ['Valid observation time', clock(report.usable)],
    ['No-signal time', clock(Math.max(0, durationSeconds - report.usable))],
    ['Suggested check-in', report.suggested || 'Choose your pace'],
    ['Most stable period', stable],
    ['Rhythm shift', shift],
    ['Tracking coverage', report.quality === null ? 'No study data' : `${report.quality}%`],
  ];
  const cards = metrics.map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('');
  const items = recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LearnFit session report</title><style>
  :root{font-family:Arial,sans-serif;color:#17362c;background:#f2ede3}*{box-sizing:border-box}body{max-width:980px;margin:0 auto;padding:42px 26px}header{border-bottom:2px solid #17362c;padding-bottom:24px}h1,h2{font-family:Georgia,serif;font-weight:400}h1{font-size:58px;margin:8px 0}.tag{font:11px monospace;color:#b94b36}.meta{color:#5f7067;font-size:13px}.notice{background:#fff1e5;border:1px solid #b94b36;padding:12px;margin:20px 0}.metrics{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #17362c;border-left:1px solid #17362c;margin:28px 0}.metrics article{background:#fffdf8;border-right:1px solid #17362c;border-bottom:1px solid #17362c;padding:20px;min-height:105px}.metrics span{display:block;font:10px monospace;color:#b94b36}.metrics strong{display:block;font:27px Georgia,serif;margin-top:16px}.panel{background:#fffdf8;border:1px solid #17362c;padding:24px;margin:18px 0}svg{width:100%;height:auto}.grid line{stroke:#dfe6df;stroke-dasharray:4 5}.grid text{font:10px Arial;fill:#77877d}.score-lines line{stroke-width:4;stroke-linecap:round}.chart-key{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.chart-key span{padding:5px 8px;border-radius:99px;font:10px monospace}.steady{background:#dce9df}.changing{background:#f7e7bd}.shifted{background:#f4d5cf}.missing{background:#e2e5e3}li{margin:10px 0;line-height:1.55}.fine{font-size:11px;line-height:1.6;color:#5f7067}@media(max-width:650px){.metrics{grid-template-columns:1fr}h1{font-size:42px}}@media print{body{padding:0}.panel,.metrics article{break-inside:avoid}}</style></head><body>
  <header><span class="tag">LEARNFIT · PERSONAL SESSION REPORT</span><h1>${sessionMode === 'timer' ? 'Your study session.' : 'Your focus estimate.'}</h1><p class="meta">${escapeHtml(created.toLocaleString('en'))}${task ? ` · <span data-no-translate>${escapeHtml(task)}</span>` : ''}</p></header>
  ${example ? '<p class="notice">Example report: this file contains illustrative data, not personal measurements.</p>' : ''}
  <section class="metrics">${cards}</section>
  ${sessionMode === 'timer' ? '<section class="panel"><span class="tag">TIMER ONLY</span><h2>No focus score was calculated.</h2><p>The camera stayed off. This report contains the session clock and your reflection, without eye-signal measurements.</p></section>' : `<section class="panel"><span class="tag">THE WHOLE SESSION</span><h2>Focus estimate over time</h2><div class="chart-key"><span class="steady">75–100 · steady</span><span class="changing">60–74 · some change</span><span class="shifted">0–59 · marked change</span><span class="missing">gap · no signal</span></div>${chartSvg(samples, durationSeconds)}<p class="fine">${escapeHtml(interpretation.description)} Gaps mean tracking was unavailable and never count as a low score. Normal blinking is expected. Unobserved seconds are excluded from the focus estimate.</p></section>`}
  <section class="panel"><span class="tag">TAKE INTO NEXT TIME</span><h2>Small experiments to try</h2><ul>${items}</ul></section>
  <p class="fine">LearnFit is a reflection tool, not a diagnosis or a measure of intelligence, health, or academic ability. Camera frames and eye measurements were processed on this device and are not included in this report.</p>
  </body></html>`;
}
