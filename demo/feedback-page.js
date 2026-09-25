import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import { buildRatingControls, parseFeedbackHash, submitResearchFeedback } from './research.js';
import { formatTime } from './session.js';

const context = parseFeedbackHash();
history.replaceState(null, '', '/feedback');
for (const rating of document.querySelectorAll('.rating')) buildRatingControls(rating);

const score = context.score === null ? 'Not available' : `${Math.round(context.score)} / 100`;
document.querySelector('#session-context').textContent = `Session: ${formatTime(context.verifiedSeconds || context.durationSeconds)} verified study · ${formatTime(context.offTaskSeconds)} off task · ${context.trackingCoverage}% tracking coverage · focus estimate: ${score} · ${context.source === 'extension' ? 'Chrome extension' : 'website'}`;

document.querySelector('#survey-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const button = form.querySelector('button[type="submit"]');
  const status = document.querySelector('#survey-status');
  button.disabled = true;
  status.textContent = 'Sending your anonymous feedback…';
  try {
    await submitResearchFeedback({
      ...context, ease: Number(data.get('ease')), usefulness: Number(data.get('usefulness')),
      trust: Number(data.get('trust')), selfReportedFocus: Number(data.get('selfReportedFocus')),
      onTaskShare: data.get('onTaskShare'), wouldUse: data.get('wouldUse'), mostUseful: data.get('mostUseful'),
      confusing: data.get('confusing'), consent: data.get('consent') === 'on',
    });
    status.textContent = 'Thank you. Your anonymous response was recorded.';
    for (const control of form.elements) control.disabled = true;
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
  }
});
