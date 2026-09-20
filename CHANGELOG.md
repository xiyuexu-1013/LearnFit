# LearnFit build log

This log records the product decisions behind LearnFit. Git history contains the implementation details; this page keeps the changes readable for testers, reviewers, and competition judges.

## 2026-09-20 — Free public mirror

- Published the redesigned app at <https://learnfit.pages.dev/> on Cloudflare Pages.
- Added a Pages Function that keeps research API calls connected to the existing Cloudflare Worker and D1 database.
- Updated public links, sitemap, privacy page, recruitment posters, and QR codes to the Pages address.
- Kept the Worker address as the private API origin rather than asking testers to open it directly.

## 2026-09-19 — v0.7 website and v1.2.1 extension

- Replaced the template-like interface with a warmer editorial design using Instrument Serif, asymmetrical layouts, and a maker note.
- Made the final rhythm score and elapsed study time prominent throughout a session and in the final report.
- Added a 30-second personal baseline, honest unavailable-data gaps, local reflections, example data, and clearer limits around what the score can mean.
- Added a Manifest V3 Chrome extension with an offscreen document so a user-started session can continue when ordinary tabs change or close.
- Added an optional five-minute anonymous evaluation after a completed session.
- Added privacy-separated research collection: basic usage totals contain no identifier; detailed session data and feedback require explicit consent.
- Added a protected research dashboard, CSV export, Cloudflare Worker API, D1 migrations, retention cleanup, and source/session summaries.
- Added Chrome Web Store copy, Congressional App Challenge notes, user-testing materials, and social recruitment posters.

## 2026-09-18 — v0.4 personal baseline rebuild

- Moved the active product from the Python/WebSocket prototype to a browser-first JavaScript app.
- Rebuilt scoring around each learner's own baseline while retaining the original EAR, blink, smoothing, and component-weight logic.
- Removed invented percentiles and unsupported attention claims.
- Added time-based smoothing, completed-blink duration, minimum evidence rules, and explicit uncertainty in reports.
- Archived the original research prototype in `legacy/` so the evolution remains inspectable.

## Earlier prototype — v0.1

- Explored MediaPipe landmarks, eye-aspect ratio, blink behavior, head pose, fatigue heuristics, and a WebSocket dashboard.
- Learned that a single confident “attention score” overstated what webcam observations could show. That limitation drove the personal-baseline and study-rhythm framing used now.

## Verification

The automated suite covers calibration, long gaps, session resets, blink duration, aspect-ratio correction, score smoothing, report evidence, local reflections, pause/resume behavior, anonymous usage validation, and consent-gated feedback. Run it with:

```sh
npm test
```
