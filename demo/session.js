export const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

// 使用真实时间采样；缺失信号不能当作低分或连续稳定区间。
export function summarize(samples, duration) {
  const usable = samples.filter((sample) => Number.isFinite(sample.score));
  let best = null;
  let run = null;
  let shiftRun = null;
  let firstShift = null;
  for (const sample of samples) {
    if (Number.isFinite(sample.score) && sample.score >= 75) {
      if (!run || sample.t - run.end > 2) run = { start: sample.t, end: sample.t };
      else run.end = sample.t;
      if (!best || run.end - run.start > best.end - best.start) best = { ...run };
    } else run = null;
    if (Number.isFinite(sample.score) && sample.score < 75) {
      if (!shiftRun || sample.t - shiftRun.end > 2) shiftRun = { start: sample.t, end: sample.t };
      else shiftRun.end = sample.t;
      if (firstShift === null && shiftRun.end - shiftRun.start >= 10) firstShift = shiftRun.start;
    } else shiftRun = null;
  }
  const quality = samples.length ? Math.round(usable.length / samples.length * 100) : null;
  const averageScore = usable.length
    ? Math.round(usable.reduce((total, sample) => total + sample.score, 0) / usable.length)
    : null;
  const enough = usable.length >= 60 && quality >= 70;
  const suggested = enough && firstShift !== null && firstShift >= 300
    ? `${Math.max(5, Math.floor(firstShift / 60) - 2)}–${Math.max(7, Math.floor(firstShift / 60) + 2)} min`
    : null;
  return { duration, usable: usable.length, quality, averageScore, best: best && best.end - best.start >= 10 ? best : null, firstShift, suggested };
}

export function renderChart(element, samples, duration, emptyText) {
  const width = Math.max(280, element.clientWidth || 900);
  const height = 185;
  const left = 35;
  const right = width - 12;
  const top = 9;
  const bottom = 155;
  const end = Math.max(1, duration);
  const start = element.id === 'live-chart' ? Math.max(0, end - 60) : 0;
  const span = element.id === 'live-chart' ? 60 : end;
  const x = (t) => left + (t - start) / span * (right - left);
  const y = (score) => bottom - score / 100 * (bottom - top);
  let path = '';
  let previous = null;
  for (const sample of samples) {
    if (sample.t < start) continue;
    if (!Number.isFinite(sample.score)) { previous = null; continue; }
    const connected = previous && sample.t - previous.t <= 2;
    path += `${connected ? 'L' : 'M'}${x(sample.t).toFixed(1)},${y(sample.score).toFixed(1)} `;
    if (!connected) path += `L${(x(sample.t) + .01).toFixed(2)},${y(sample.score).toFixed(1)} `;
    previous = sample;
  }
  const grid = [0, 25, 50, 75, 100].map((v) => `<line x1="${left}" y1="${y(v)}" x2="${right}" y2="${y(v)}" stroke="#eaf0ec" stroke-dasharray="3 4"/><text x="23" y="${y(v) + 4}" text-anchor="end" fill="#92a097" font-size="10">${v}</text>`).join('');
  const ticks = [0, .25, .5, .75, 1].map((v) => `<text x="${left + v * (right - left)}" y="180" text-anchor="${v === 0 ? 'start' : v === 1 ? 'end' : 'middle'}" fill="#92a097" font-size="10">${formatTime(start + v * span)}</text>`).join('');
  element.innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Rhythm index over time, from 0 to 100. ${samples.filter((s) => Number.isFinite(s.score)).length} usable observations.">${grid}${ticks}<path d="${path}" fill="none" stroke="#458875" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>${path ? '' : '<div class="chart-empty"></div>'}`;
  if (!path) element.querySelector('.chart-empty').textContent = emptyText;
}
