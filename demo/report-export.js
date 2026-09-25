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

export function buildSessionCsv({ samples = [] }) {
  const columns = ['elapsed_seconds', 'time', 'focus_estimate', 'signal_available'];
  const rows = samples.map((sample) => [
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
  let path = ''; let previous = null;
  for (const sample of samples) {
    if (!Number.isFinite(sample.score)) { previous = null; continue; }
    const connected = previous && sample.t - previous.t <= 2;
    path += `${connected ? 'L' : 'M'}${x(sample.t).toFixed(1)},${y(sample.score).toFixed(1)} `;
    if (!connected) path += `L${(x(sample.t) + .01).toFixed(2)},${y(sample.score).toFixed(1)} `;
    previous = sample;
  }
  const grid = [0, 25, 50, 75, 100].map((value) => `<line x1="${left}" y1="${y(value)}" x2="${right}" y2="${y(value)}"/><text x="34" y="${y(value) + 4}" text-anchor="end">${value}</text>`).join('');
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Rhythm score over time"><g class="grid">${grid}</g><path d="${path}"/></svg>`;
}

export function buildSessionReportHtml({ createdAt, task, durationSeconds, report, recommendations = [], samples = [], example = false }) {
  const created = new Date(createdAt);
  const stable = report.best ? `${clock(report.best.start)}–${clock(report.best.end)}` : 'Not enough data';
  const shift = report.firstShift !== null ? `Around ${clock(report.firstShift)}` : report.usable < 10 ? 'Not enough data' : 'None observed';
  const metrics = [
    ['Average focus estimate', report.averageScore === null ? 'Not enough tracking data' : `${report.averageScore} / 100`],
    ['Study time', clock(durationSeconds)],
    ['Suggested check-in', report.suggested || 'Choose your pace'],
    ['Most stable period', stable],
    ['Rhythm shift', shift],
    ['Tracking coverage', report.quality === null ? 'No study data' : `${report.quality}%`],
  ];
  const cards = metrics.map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('');
  const items = recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LearnFit session report</title><style>
  :root{font-family:Arial,sans-serif;color:#17362c;background:#f2ede3}*{box-sizing:border-box}body{max-width:980px;margin:0 auto;padding:42px 26px}header{border-bottom:2px solid #17362c;padding-bottom:24px}h1,h2{font-family:Georgia,serif;font-weight:400}h1{font-size:58px;margin:8px 0}.tag{font:11px monospace;color:#b94b36}.meta{color:#5f7067;font-size:13px}.notice{background:#fff1e5;border:1px solid #b94b36;padding:12px;margin:20px 0}.metrics{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #17362c;border-left:1px solid #17362c;margin:28px 0}.metrics article{background:#fffdf8;border-right:1px solid #17362c;border-bottom:1px solid #17362c;padding:20px;min-height:105px}.metrics span{display:block;font:10px monospace;color:#b94b36}.metrics strong{display:block;font:27px Georgia,serif;margin-top:16px}.panel{background:#fffdf8;border:1px solid #17362c;padding:24px;margin:18px 0}svg{width:100%;height:auto}.grid line{stroke:#dfe6df;stroke-dasharray:4 5}.grid text{font:10px Arial;fill:#77877d}path{fill:none;stroke:#458875;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}li{margin:10px 0;line-height:1.55}.fine{font-size:11px;line-height:1.6;color:#5f7067}@media(max-width:650px){.metrics{grid-template-columns:1fr}h1{font-size:42px}}@media print{body{padding:0}.panel,.metrics article{break-inside:avoid}}</style></head><body>
  <header><span class="tag">LEARNFIT · PERSONAL SESSION REPORT</span><h1>Your focus estimate.</h1><p class="meta">${escapeHtml(created.toLocaleString('en'))}${task ? ` · ${escapeHtml(task)}` : ''}</p></header>
  ${example ? '<p class="notice">Example report: this file contains illustrative data, not personal measurements.</p>' : ''}
  <section class="metrics">${cards}</section>
  <section class="panel"><span class="tag">THE WHOLE SESSION</span><h2>Focus estimate trace</h2>${chartSvg(samples, durationSeconds)}<p class="fine">Gaps mean tracking was unavailable and never count as a low score. Normal blinking is expected. This website estimates focus only while it remains visible beside a screen-based study task; the Chrome extension can also exclude unverified tabs.</p></section>
  <section class="panel"><span class="tag">TAKE INTO NEXT TIME</span><h2>Small experiments to try</h2><ul>${items}</ul></section>
  <p class="fine">LearnFit is a reflection tool, not a diagnosis or a measure of intelligence, health, or academic ability. Camera frames and eye measurements were processed on this device and are not included in this report.</p>
  </body></html>`;
}
