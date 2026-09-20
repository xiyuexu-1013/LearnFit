# LearnFit SDK

Import `EyeFocusTracker`, `FaceTracker`, `FocusEngine`, `BlinkDetector`, or `calculateEAR` from `dist/index.js` after `npm run build`. The local package metadata is `@learnfit/core`.

## EyeFocusTracker

`new EyeFocusTracker({ video, width = 640, height = 480 })` requires an HTML video element. Audio is disabled. `start()` requests camera access and starts local tracking. `stop()` releases the stream and tracking runtime. Both return promises. `on(event, listener)` returns an unsubscribe function; `off(event, listener)` removes a subscription.

## Data events

- `focusScore`: a smoothed 0–100 heuristic rhythm index, not a percentage of attention. Unavailable during calibration (returned as zero; check `isCalibrating`).
- `blinkScore`, `durationScore`, `eyeScore`: contributions out of 50, 30, and 20.
- `status`: Ready, Calibrating your baseline, Stable, Shifting, or Break suggested.
- `isCalibrating`: true while gathering 30 seconds of usable observations.
- `calibrationProgress`: a fraction from 0 to 1.
- `baseline`: `{ blinkFrequency, blinkDuration, ear }`; duration zero means no completed calibration blink was observed, and duration penalties are skipped.
- `ear`: average Eye Aspect Ratio from both eyes, corrected for video aspect ratio.
- `blinkFrequency`: rolling 60-second blink count, scaled to a per-minute rate during the first minute.
- `blinkDuration`: duration in milliseconds of the last completed blink; zero means unavailable.
- `isFatigued`: legacy field name for an observed eye closure of at least 500 ms, not a medical fatigue assessment.
- `optimalDuration`: legacy algorithm output retained for SDK compatibility; not a validated maximum attention span. The web report does not use this value.
- `fps`: average processed frames per second since tracking began.
- `timestamp`: Unix milliseconds.

Calibration restarts for every session. It accumulates valid sample intervals capped at 250 ms, preventing a long tracking gap from completing calibration. No-face frames reset the pending blink to avoid counting a tracking gap as a long blink.

## Status and error events

Status payloads are `{ status }`, with loading-mediapipe, requesting-camera, running, no-face, and stopped.

Errors include `{ code, message, recoverable, cause }`. Codes include BROWSER_UNSUPPORTED, MEDIAPIPE_LOAD_FAILED, MEDIAPIPE_INITIALIZATION_FAILED, MEDIAPIPE_PROCESSING_FAILED, CAMERA_PERMISSION_DENIED, CAMERA_NOT_FOUND, CAMERA_IN_USE, CAMERA_INSECURE_CONTEXT, CAMERA_ACCESS_FAILED, VIDEO_PLAYBACK_FAILED, and TRACKER_START_FAILED. Start failures reject `start()` as well as emitting an error. Processing failures allow retries.

## Privacy and limitations

MediaPipe FaceMesh performs pretrained landmark inference locally. The Focus Rhythm Engine is rule-based and does not train a model. Asset requests go to third-party CDNs; camera frames do not. The SDK does not persist observations. The optional extension stores its own session state locally.

LearnFit estimates changes in study rhythm from observable eye behavior. It does not directly measure attention or provide medical or psychological assessment.
