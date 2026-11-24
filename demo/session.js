export const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function interpretFocus(score, quality = 100) {
  if (!Number.isFinite(score) || !Number.isFinite(quality) || quality < 60) return {
    key: 'unavailable', label: 'Not enough tracking data', color: '#7d8882',
    description: 'LearnFit cannot make a reliable focus estimate from this session.',
  };
  if (score >= 75) return {
    key: 'steady', label: 'Steady relative to your baseline', color: '#458875',
    description: 'Observed eye signals stayed mostly close to your personal baseline during measured periods.',
  };
  if (score >= 60) return {
    key: 'changing', label: 'Some focus-pattern change', color: '#d59a2d',
    description: 'Observed eye signals changed moderately from your baseline. Check this against how the task felt.',
  };
  return {
    key: 'shifted', label: 'Marked focus-pattern change', color: '#c75b4b',
    description: 'Observed eye signals differed noticeably from your baseline. A shorter work block or brief reset may help.',
  };
}

export function buildRecommendations(report, durationSeconds) {
  const interpretation = interpretFocus(report.averageScore, report.quality);
  const recommendations = [];
  if (interpretation.key === 'unavailable') {
    recommendations.push('Improve tracking before interpreting the score: use even front lighting, keep the camera near eye level, and let your eyes remain visible when practical.');
  } else if (interpretation.key === 'steady') {
    recommendations.push(`Your measured periods were mostly steady (${report.averageScore}/100). Keep a similar work-block length, then close the material and write three ideas from memory.`);
  } else if (interpretation.key === 'changing') {
    recommendations.push(`Your measured periods showed some change (${report.averageScore}/100). Work on one source at a time, silence notifications, and check your progress before the pattern usually shifts.`);
  } else {
    recommendations.push(`Your measured periods showed a marked change (${report.averageScore}/100). Try a work block about 5 minutes shorter, take a 2–5 minute screen break, then restart with one small next action.`);
  }
  recommendations.push('Before the next session, write one concrete outcome—such as finishing one section or solving five problems—and close unrelated tabs.');
  if (report.firstShift !== null) recommendations.push(`A sustained change first appeared around ${formatTime(report.firstShift)}. Next time, check task progress and energy 2–3 minutes before that point.`);
  else if (report.usable >= 60) recommendations.push('No sustained shift was detected. Keep your own task progress and effort as the main evidence when choosing when to rest.');
  const noSignal = Math.max(0, durationSeconds - report.usable);
  if (report.quality === null || report.quality < 80) recommendations.push(`${formatTime(noSignal)} had no usable eye signal. Improve camera angle or lighting before comparing this result with another session.`);
  else recommendations.push(`Tracking coverage was ${report.quality}%. Keep a similar camera position and lighting so future sessions are easier to compare.`);
  if (durationSeconds < 300) recommendations.push('This session was under five minutes. Repeat the same kind of task for longer before treating the pattern as representative.');
  recommendations.push('Compare the estimate with what you finished and your own focus rating; the score describes observed eye-pattern changes, not your complete mental state.');
  return recommendations;
}

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
  const rawAverageScore = usable.length
    ? Math.round(usable.reduce((total, sample) => total + sample.score, 0) / usable.length)
    : null;
  const averageScore = quality !== null && quality >= 60 ? rawAverageScore : null;
  const enough = usable.length >= 60 && quality >= 70;
  const suggested = enough && firstShift !== null && firstShift >= 300
    ? `${Math.max(5, Math.floor(firstShift / 60) - 2)}–${Math.max(7, Math.floor(firstShift / 60) + 2)} min`
    : null;
  return { duration, usable: usable.length, quality, averageScore, rawAverageScore, best: best && best.end - best.start >= 10 ? best : null, firstShift, suggested };
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
  const segments = [];
  let previous = null;
  for (const sample of samples) {
    if (sample.t < start) continue;
    if (!Number.isFinite(sample.score)) { previous = null; continue; }
    const connected = previous && sample.t - previous.t <= 2;
    path += `${connected ? 'L' : 'M'}${x(sample.t).toFixed(1)},${y(sample.score).toFixed(1)} `;
    if (!connected) path += `L${(x(sample.t) + .01).toFixed(2)},${y(sample.score).toFixed(1)} `;
    if (connected) {
      const midpoint = (previous.score + sample.score) / 2;
      const color = midpoint >= 75 ? '#458875' : midpoint >= 60 ? '#d59a2d' : '#c75b4b';
      segments.push(`<line x1="${x(previous.t).toFixed(1)}" y1="${y(previous.score).toFixed(1)}" x2="${x(sample.t).toFixed(1)}" y2="${y(sample.score).toFixed(1)}" stroke="${color}" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`);
    } else {
      const color = sample.score >= 75 ? '#458875' : sample.score >= 60 ? '#d59a2d' : '#c75b4b';
      segments.push(`<circle cx="${x(sample.t).toFixed(1)}" cy="${y(sample.score).toFixed(1)}" r="2" fill="${color}"/>`);
    }
    previous = sample;
  }
  const bands = `<rect x="${left}" y="${top}" width="${right - left}" height="${y(75) - top}" fill="#45887518"/><rect x="${left}" y="${y(75)}" width="${right - left}" height="${y(60) - y(75)}" fill="#d59a2d20"/><rect x="${left}" y="${y(60)}" width="${right - left}" height="${bottom - y(60)}" fill="#c75b4b12"/>`;
  const grid = [0, 25, 50, 75, 100].map((v) => `<line x1="${left}" y1="${y(v)}" x2="${right}" y2="${y(v)}" stroke="#eaf0ec" stroke-dasharray="3 4"/><text x="23" y="${y(v) + 4}" text-anchor="end" fill="#92a097" font-size="10">${v}</text>`).join('');
  const ticks = [0, .25, .5, .75, 1].map((v) => `<text x="${left + v * (right - left)}" y="180" text-anchor="${v === 0 ? 'start' : v === 1 ? 'end' : 'middle'}" fill="#92a097" font-size="10">${formatTime(start + v * span)}</text>`).join('');
  element.innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Focus estimate over time. Green means steady relative to baseline, amber means some change, coral means marked change, and gaps mean no usable signal.">${bands}${grid}${ticks}${segments.join('')}</svg>${path ? '' : '<div class="chart-empty"></div>'}`;
  if (!path) element.querySelector('.chart-empty').textContent = emptyText;
}
