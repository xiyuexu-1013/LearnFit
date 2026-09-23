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

async function adminFetch(path) {
  const key = sessionStorage.getItem(KEY_NAME) || '';
  const response = await fetch(path, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' });
  if (!response.ok) throw new Error(response.status === 401 ? 'That admin key did not work.' : 'The dashboard could not load.');
  return response;
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
  const minutes = Math.round(Number(seconds || 0) / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function stat(label, value, note) {
  const card = element('article');
  card.append(element('span', '', label), element('strong', '', String(value)), element('p', '', note));
  return card;
}

async function load() {
  $('admin-error').textContent = '';
  try {
    const data = await (await adminFetch('/api/admin/summary')).json();
    $('admin-login').hidden = true; $('admin-content').hidden = false;
    $('generated-at').textContent = `Updated ${new Date(data.generatedAt).toLocaleString()}`;
    $('admin-stats').replaceChildren(
      stat('ALL SESSION STARTS', data.started, 'Aggregate count; no IDs or session details'),
      stat('ALL COMPLETED SESSIONS', data.completed, `${data.completionRate}% completion rate`),
      stat('TOTAL STUDY TIME', formatDuration(data.totalDurationSeconds), 'Anonymous combined time since September 22, 2026'),
      stat('AVERAGE SESSION', formatDuration(data.averageDurationSeconds), 'Across completed sessions tracked since this update'),
      stat('CONSENTING TESTERS', data.uniqueTesters, 'Random test IDs; no names collected'),
      stat('DETAILED SESSIONS', data.detailedSessions, 'Consented duration and final score'),
      stat('SURVEY RESPONSES', data.feedback.responses, 'Post-session evaluations'),
      stat('EASE OF USE', data.feedback.ease ?? '—', 'Average out of 5'),
      stat('USEFULNESS', data.feedback.usefulness ?? '—', 'Average out of 5'),
      stat('SCORE CLARITY', data.feedback.trust ?? '—', 'Average out of 5'),
      stat('WOULD USE AGAIN', data.feedback.wouldUse.yes, `${data.feedback.wouldUse.maybe} maybe · ${data.feedback.wouldUse.no} no`),
    );
    renderBars($('daily-list'), data.daily.map((row) => ({ ...row, total: Number(row.completed || 0) })), 'day', 'total');
    renderBars($('source-list'), data.sources, 'source', 'duration_seconds', formatDuration);
    $('responses').replaceChildren(...data.recent.map((response) => {
      const card = element('article', 'feedback-card');
      card.append(element('small', '', `${new Date(`${response.created_at}Z`).toLocaleString()} · ${response.source} · ${Math.round(response.duration_seconds / 60)} min · score ${response.score ?? '—'}`), element('h3', '', response.most_useful || 'No written highlight.'), element('p', '', response.confusing || 'No written improvement note.'), element('span', '', `Ease ${response.ease}/5 · Useful ${response.usefulness}/5 · Clear ${response.trust}/5 · Again: ${response.would_use}`));
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
if (sessionStorage.getItem(KEY_NAME)) load();
