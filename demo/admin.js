import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';

const $ = (id) => document.getElementById(id);
const KEY_NAME = 'learnfitAdminKey';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function adminFetch(path, options = {}) {
  const key = sessionStorage.getItem(KEY_NAME) || '';
  const response = await fetch(path, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${key}` }, cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(response.status === 401 ? 'That admin key did not work.' : (body.error || 'The dashboard could not load.'));
  }
  return response;
}

function partnerUrl(code) {
  return `${location.origin}/?partner=${encodeURIComponent(code)}`;
}

function renderPartners(rows = []) {
  const target = $('partner-list');
  if (!rows.length) {
    const row = element('tr', 'partner-empty');
    const cell = element('td', '', 'No institution links yet. Create one above for the next organization you contact.');
    cell.colSpan = 6; row.append(cell); target.replaceChildren(row); return;
  }
  target.replaceChildren(...rows.map((partner) => {
    const starts = Number(partner.started || 0);
    const completed = Number(partner.completed || 0);
    const row = element('tr');
    const identity = element('td', 'partner-identity');
    identity.dataset.label = 'Institution';
    identity.append(element('strong', '', partner.name), element('small', '', `Created ${new Date(`${partner.created_at}Z`).toLocaleDateString()}`));
    const linkCell = element('td');
    linkCell.dataset.label = 'Invitation link';
    const linkGroup = element('div', 'partner-link');
    const code = element('code', '', partnerUrl(partner.code));
    const copy = element('button', 'secondary', 'Copy'); copy.type = 'button';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent);
        copy.textContent = 'Copied'; setTimeout(() => { copy.textContent = 'Copy'; }, 1600);
      } catch {
        const range = document.createRange(); range.selectNodeContents(code); getSelection().removeAllRanges(); getSelection().addRange(range);
        copy.textContent = 'Selected';
      }
    });
    linkGroup.append(code, copy); linkCell.append(linkGroup);
    const completion = starts ? `${Math.round(completed / starts * 1000) / 10}%` : '0%';
    const metricCells = [
      ['Starts', starts], ['Completed', completed], ['Study time', formatDuration(partner.duration_seconds)], ['Completion', completion],
    ].map(([label, value]) => {
      const cell = element('td', 'num', value); cell.dataset.label = label; return cell;
    });
    row.append(identity, linkCell, ...metricCells);
    return row;
  }));
}

function renderBars(target, rows, labelKey, valueKey, formatValue = String) {
  const max = Math.max(1, ...rows.map((row) => Number(row[valueKey] || 0)));
  target.replaceChildren(...rows.map((row) => {
    const line = element('div', 'bar-row');
    line.append(element('span', '', row[labelKey]), element('i', ''), element('strong', '', formatValue(Number(row[valueKey] || 0))));
    line.querySelector('i').style.setProperty('--bar', `${(Number(row[valueKey] || 0) / max) * 100}%`);
    return line;
  }));
}

function formatDuration(seconds) {
  const totalSeconds = Math.round(Number(seconds || 0));
  if (totalSeconds > 0 && totalSeconds < 60) return `${totalSeconds} sec`;
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatAverageDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, '0')}s`;
}

function stat(icon, label, value, note, tone = '') {
  const card = element('article');
  if (tone) card.dataset.tone = tone;
  const symbol = element('i', 'stat-icon', icon); symbol.setAttribute('aria-hidden', 'true');
  const copy = element('div', 'stat-copy');
  copy.append(element('span', '', label), element('strong', '', String(value)), element('p', '', note));
  card.append(symbol, copy);
  return card;
}

function statGroup(title, description, cards) {
  const section = element('section', 'stat-group');
  const heading = element('div', 'stat-group-heading');
  heading.append(element('h2', '', title), element('p', '', description));
  const grid = element('div', 'admin-stats'); grid.append(...cards);
  section.append(heading, grid);
  return section;
}

function svgMarkup(body, label) {
  return `<svg class="chart-svg" viewBox="0 0 340 210" role="img" aria-label="${label}">${body}</svg>`;
}

function renderDailyChart(target, rows) {
  const values = rows.map((row) => Number(row.completed || 0));
  if (!values.length) { target.innerHTML = '<p class="chart-empty">No data yet</p>'; return; }
  const max = Math.max(1, ...values), left = 28, bottom = 178, width = 292, height = 145;
  const points = values.map((value, index) => [left + (index * width / Math.max(1, values.length - 1)), bottom - (value / max * height)]);
  const line = points.map((point) => point.join(',')).join(' ');
  const area = `${left},${bottom} ${line} ${left + width},${bottom}`;
  const dates = [rows[0]?.day?.slice(5), rows.at(-1)?.day?.slice(5)];
  target.innerHTML = svgMarkup(`<line class="axis" x1="${left}" y1="${bottom}" x2="${left + width}" y2="${bottom}"/><line class="grid" x1="${left}" y1="${bottom - height / 2}" x2="${left + width}" y2="${bottom - height / 2}"/><polygon class="area" points="${area}"/><polyline class="line" points="${line}"/>${points.map(([x,y]) => `<circle class="point" cx="${x}" cy="${y}" r="4"/>`).join('')}<text x="4" y="${bottom + 3}">0</text><text x="4" y="${bottom - height + 3}">${max}</text><text x="${left}" y="202">${dates[0]}</text><text x="${left + width}" y="202" text-anchor="end">${dates[1]}</text>`, 'Daily completed sessions line chart');
}

function renderScoreHistogram(target, responses) {
  const scores = responses.map((row) => Number(row.score)).filter(Number.isFinite);
  const bins = [0, 0, 0, 0, 0]; scores.forEach((score) => { bins[Math.min(4, Math.floor(score / 20))] += 1; });
  if (!scores.length) { target.innerHTML = '<p class="chart-empty">No scored sessions yet</p>'; return; }
  const max = Math.max(1, ...bins), bottom = 178, barWidth = 42, gap = 15;
  target.innerHTML = svgMarkup(`<line class="axis" x1="28" y1="${bottom}" x2="320" y2="${bottom}"/>${bins.map((value,index) => { const h = value / max * 132, x = 37 + index * (barWidth + gap); return `<rect class="bar" x="${x}" y="${bottom-h}" width="${barWidth}" height="${h}" rx="3"/><text x="${x+barWidth/2}" y="${bottom-h-7}" text-anchor="middle">${value}</text><text x="${x+barWidth/2}" y="198" text-anchor="middle">${index*20}–${index === 4 ? 100 : index*20+19}</text>`; }).join('')}`, 'Focus score histogram');
}

function renderRatingDotPlot(target, feedback) {
  const rows = [['Ease', feedback.ease], ['Useful', feedback.usefulness], ['Clarity', feedback.trust], ['Self-focus', feedback.selfReportedFocus]];
  const left = 88, width = 220;
  target.innerHTML = svgMarkup(`${[1,2,3,4,5].map((n) => `<line class="grid" x1="${left+(n-1)*width/4}" y1="20" x2="${left+(n-1)*width/4}" y2="174"/><text x="${left+(n-1)*width/4}" y="198" text-anchor="middle">${n}</text>`).join('')}${rows.map(([label,value],index) => { const y=38+index*42, x=left+(Number(value || 1)-1)*width/4; return `<text x="0" y="${y+3}">${label}</text><line class="axis" x1="${left}" y1="${y}" x2="${left+width}" y2="${y}"/><circle class="dot" cx="${x}" cy="${y}" r="7"/><text x="${Math.min(322,x+12)}" y="${y+3}">${value ?? '—'}</text>`; }).join('')}`, 'Average tester rating dot plot');
}

async function load() {
  $('admin-error').textContent = '';
  try {
    const data = await (await adminFetch('/api/admin/summary')).json();
    $('admin-login').hidden = true; $('admin-content').hidden = false;
    $('generated-at').textContent = `Updated ${new Date(data.generatedAt).toLocaleString()}`;
    renderPartners(data.partners);
    if (!document.querySelector('.evidence-note')) {
      const note = element('p', 'evidence-note');
      note.innerHTML = '<strong>Historical evidence note:</strong> totals and charts include all submitted feedback. Some early-version records do not contain verified time, tracking coverage, or self-rated focus; their cards are labeled below.';
      document.querySelector('.admin-toolbar').after(note);
    }
    $('admin-stats').replaceChildren(
      statGroup('Product use', 'Anonymous totals from every completed LearnFit session.', [
        stat('▶', 'ALL SESSION STARTS', data.started, 'Aggregate count; no IDs or session details', 'green'),
        stat('C', 'ALL COMPLETED SESSIONS', data.completed, `${data.completionRate}% completion rate`, 'green'),
        stat('◷', 'TOTAL STUDY TIME', formatDuration(data.totalDurationSeconds), 'Anonymous combined time since September 22, 2026', 'lime'),
        stat('≈', 'AVERAGE SESSION', formatAverageDuration(data.averageDurationSeconds), `Across ${data.durationSessionCount ?? data.completed} completed sessions with recorded time`, 'lime'),
      ]),
      statGroup('Research sample', 'Records available for evaluating the product and score.', [
        stat('◉', 'CONSENTING TESTERS', data.uniqueTesters, 'Random test IDs; no names collected', 'orange'),
        stat('▤', 'DETAILED SESSIONS', data.detailedSessions, 'Consented duration and final score', 'orange'),
        stat('R', 'SURVEY RESPONSES', data.feedback.responses, 'Post-session evaluations', 'orange'),
        stat('↔', 'MATCHED SESSIONS', data.feedback.matchedSessions, data.feedback.focusCorrelation === null ? 'Need 10 matched sessions for correlation' : `Score/self-report correlation ${data.feedback.focusCorrelation}`, 'orange'),
      ]),
      statGroup('Tester ratings', 'Averages from optional post-session evaluations.', [
        stat('E', 'EASE OF USE', data.feedback.ease ?? '—', 'Average out of 5', 'blue'),
        stat('◆', 'USEFULNESS', data.feedback.usefulness ?? '—', 'Average out of 5', 'blue'),
        stat('?', 'SCORE CLARITY', data.feedback.trust ?? '—', 'Average out of 5', 'blue'),
        stat('◎', 'SELF-RATED FOCUS', data.feedback.selfReportedFocus ?? '—', 'Average task focus out of 5', 'blue'),
        stat('↻', 'WOULD USE AGAIN', data.feedback.wouldUse.yes, `${data.feedback.wouldUse.maybe} maybe · ${data.feedback.wouldUse.no} no`, 'blue'),
      ]),
    );
    renderDailyChart($('daily-chart'), data.daily);
    renderScoreHistogram($('score-histogram'), data.recent);
    renderRatingDotPlot($('ratings-dotplot'), data.feedback);
    renderBars($('daily-list'), data.daily.map((row) => ({ ...row, total: Number(row.completed || 0) })), 'day', 'total');
    renderBars($('source-list'), data.sources, 'source', 'duration_seconds', formatDuration);
    $('responses').replaceChildren(...data.recent.map((response) => {
      const card = element('article', 'feedback-card');
      const evidence = element('b', 'evidence-badge', Number(response.verified_seconds) > 0 && Number(response.tracking_coverage) > 0 ? 'MEASURED SESSION' : 'LEGACY / NO USABLE MEASUREMENT');
      const highlight = element('h3', '', response.most_useful || 'No written highlight.');
      const improvement = element('p', '', response.confusing || 'No written improvement note.');
      if (response.most_useful) highlight.dataset.noTranslate = '';
      if (response.confusing) improvement.dataset.noTranslate = '';
      card.append(evidence, element('small', '', `${new Date(`${response.created_at}Z`).toLocaleString()} · ${response.source} · verified ${Math.round(response.verified_seconds / 60)} min · off task ${Math.round(response.off_task_seconds / 60)} min · coverage ${response.tracking_coverage}% · score ${response.score ?? '—'}`), highlight, improvement, element('span', '', `Ease ${response.ease}/5 · Useful ${response.usefulness}/5 · Clear ${response.trust}/5 · Self-focus ${response.self_reported_focus ?? '—'}/5 · On task: ${response.on_task_share ?? '—'} · Again: ${response.would_use}`));
      return card;
    }));
  } catch (error) {
    $('admin-error').textContent = error.message;
    $('admin-login').hidden = false; $('admin-content').hidden = true;
  }
}

$('admin-login').addEventListener('submit', (event) => { event.preventDefault(); sessionStorage.setItem(KEY_NAME, $('admin-key').value); load(); });
$('refresh').addEventListener('click', load);
$('sign-out').addEventListener('click', () => { sessionStorage.removeItem(KEY_NAME); location.reload(); });
$('export-csv').addEventListener('click', async () => {
  try {
    const blob = await (await adminFetch('/api/admin/export.csv')).blob();
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = 'learnfit-research.csv'; link.click(); URL.revokeObjectURL(url);
  } catch (error) { $('admin-error').textContent = error.message; }
});
$('partner-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = $('partner-name').value.trim();
  $('partner-message').textContent = 'Creating link…';
  try {
    const response = await adminFetch('/api/admin/partners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const partner = await response.json();
    $('partner-name').value = '';
    $('partner-message').textContent = `Created for ${partner.name}. The link is ready to copy.`;
    await load();
  } catch (error) { $('partner-message').textContent = error.message; }
});
if (sessionStorage.getItem(KEY_NAME)) load();
