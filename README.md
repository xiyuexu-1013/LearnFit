# LearnFit

**Live app:** <https://learnfit.pages.dev/> · **Build history:** [CHANGELOG.md](CHANGELOG.md)

Understand your personal study rhythm. LearnFit is a privacy-first, browser-based study tool that compares observable eye behavior with a personal session baseline.

## Run the app

```sh
npm install
npm run dev
```

Open `/` on the local server. The former `/demo/index.html` and `/demo/eye-score.html` routes also lead to the redesigned app. Camera access requires HTTPS or localhost. The tracking runtime is packaged with the site.

Choose **Start Focus Session**, allow camera access, and look naturally at your screen for 30 seconds of usable tracking. Calibration pauses when a face is not detected. Study time starts after calibration. End the session to view a summary, then choose **Export PDF** and **Save as PDF** in your browser’s print dialog.

## Product behavior

- Clean English interface with responsive ready, calibration, active-session, and summary views.
- Stable, Shifting, and Break suggested are heuristic rhythm states, not diagnoses or measures of attention.
- An actual 60-second trend uses one-second observations and shows gaps when tracking is unavailable.
- Blink frequency, completed blink duration, EAR, and component scores appear under Live Details.
- Reports use real session observations. No percentile rankings or fabricated measurements.
- The most stable period requires at least 10 consecutive seconds at an index of 75 or higher. A shift requires at least 10 seconds below 75. These are reporting heuristics, not validated scientific cutoffs.
- Duration suggestions require sufficient usable data and an observed sustained shift after at least five minutes. Otherwise the report asks you to choose your pace.

## How it works

Camera → eye landmarks → EAR → blink detection → temporal features → personal baseline → focus-rhythm estimate → study feedback.

The Focus Rhythm Engine is rule-based. It retains the existing EAR calculation, blink detector, 50/30/20 component weights, time-based score smoothing, and longer-closure rule. Calibration uses 30 seconds of usable observations, estimates blink frequency from completed blinks per observed minute, averages completed blink durations rather than repeated frame values, and resets each session. If no blinks are observed, frequency and duration comparisons are unavailable and neither applies a penalty. Smoothing uses a 1.5-second exponential time constant instead of a fixed frame count; this is an engineering heuristic, not a validated attention model.

**Technical distinction:** the existing MediaPipe FaceMesh dependency uses a pretrained computer-vision model to locate landmarks. LearnFit does not train a model or use a trained attention model to produce its rhythm estimates. Calling the entire pipeline “free of machine learning” would be inaccurate.

LearnFit estimates changes in study rhythm from observable eye behavior. It does not directly measure attention or provide medical or psychological assessment.

## Privacy

Camera frames are processed on-device, never uploaded or recorded. Live measurements and reports are held in page memory, cleared by closing or refreshing the page. Users may explicitly save up to 10 task summaries and subjective reflections in localStorage; no eye measurements or video are saved, and the home screen offers deletion. No account is required and there are no third-party analytics trackers. Basic start/completion totals contain no identifier. Detailed session data and the optional five-minute evaluation are sent only after explicit consent. Exported reports are saved only through the browser print flow. MediaPipe runtime files are served from the same LearnFit site; frames and session measurements never leave the page. Charts are rendered locally without an external chart dependency.

The optional Chrome extension stores its session state in `chrome.storage.local` and runs the camera tracker in an offscreen extension document. A user-started session can therefore continue while ordinary Chrome tabs change or close. Ending the session releases the camera.

## Development

```sh
npm run check
npm test
npm run build
npm run build:site
npm run build:pages
npm run build:extension
```

The public site is deployed on the free Cloudflare Pages address <https://learnfit.pages.dev/>. `npm run build:pages` prepares the static site and its Pages Function. The function forwards only `/api/*` requests to the Cloudflare Worker that owns the D1 research database.

The package metadata is now `@learnfit/core`; this does not publish a new package. Source imports and public SDK classes remain available. Build output is `dist/index.js`.

```js
import { EyeFocusTracker } from './dist/index.js';
const tracker = new EyeFocusTracker({ video: document.querySelector('video') });
tracker.on('data', (data) => console.log(data.status, data.focusScore));
tracker.on('error', (error) => console.error(error.message));
await tracker.start();
// await tracker.stop();
```

See [SDK documentation](docs/api/README.md). `legacy/` remains an unchanged historical archive, not the current application.

## License

[MIT](LICENSE)

## Study workflow update

Use LearnFit beside on-screen reading in a separate visible window. Pause/resume preserves calibration while excluding paused time; hiding the tab automatically pauses and requires explicit resume. Camera video tracks are disabled during a pause (the browser may retain its camera permission/indicator). The example report is labeled illustrative and cannot be saved as a real session. Optional local reflections capture task progress, energy, and a next-step note.

Browser integration fixture: while Vite runs, open `/@fs/<absolute-project-path>/tests/browser.html`. This fixture uses simulated landmarks and accelerated time, never a real camera. It is not included in the production build.

## Chrome extension

Build the self-contained Manifest V3 extension:

```bash
npm run build:extension
```

Then open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `extension/chrome`. Start a session from the LearnFit toolbar popup and allow camera access when Chrome asks. The extension uses a local offscreen document, so tracking continues when ordinary website tabs change or close. Pausing or ending the session stops the study clock; ending also releases the camera.

All MediaPipe files and the LearnFit scoring engine are bundled inside the extension. Camera frames, eye landmarks, scores, and session state are not sent to a server.
