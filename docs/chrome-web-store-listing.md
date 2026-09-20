# LearnFit Focus Rhythm — Chrome Web Store listing

## Short description

Find a study rhythm that fits you with private, on-device blink and eye-openness feedback.

## Detailed description

LearnFit is a private study-rhythm experiment built for students who are tired of one-size-fits-all productivity rules.

Start a session, complete a short personal baseline, and LearnFit shows three clear readings:

- a 0–100 rhythm score based on changes from your own baseline;
- effective study time, excluding calibration and pauses;
- a gentle suggested check-in time to help you experiment with session length.

LearnFit processes camera frames locally with MediaPipe FaceMesh. Frames and eye landmarks are never uploaded or recorded. The extension continues the user-started analysis when ordinary Chrome tabs change or close. You can pause or end the session at any time; ending releases the camera.

After a session, LearnFit opens an optional two-minute research survey. Nothing is submitted until the user explicitly consents and chooses Send. Anonymous survey data may include ratings, written feedback, session duration, final summary score, product version, and a random browser ID. It never includes camera frames, eye measurements, browsing history, task text, or saved reflections.

For basic usage measurement, the extension adds one to aggregate start and completion totals. These requests contain only the product source and event type; LearnFit does not attach or store an identifier, score, duration, browsing activity, or camera measurement.

The rhythm score is a rule-based summary of blink frequency, completed blink duration, and eye openness. It is not a measure of attention, intelligence, health, or academic ability.

## Single purpose

Provide user-started, on-device study-rhythm feedback that can continue while ordinary browser tabs change or close.

## Permission justifications

### offscreen

Creates a hidden local extension document for the user-started camera analysis so changing or closing ordinary tabs does not interrupt a study session.

### storage

Stores lightweight session controls and results locally on the device: running state, score, elapsed study time, calibration progress, and suggested check-in duration.

## Privacy practices answers

- Personally identifiable information: not collected.
- Health information: not collected or inferred.
- Authentication information: not collected.
- Personal communications: not collected.
- Location: not collected.
- Web history or website content: not collected.
- User activity: camera frames and derived eye measurements are processed locally only; frames and landmarks are not retained or transmitted. A user may separately choose to submit anonymous session duration and final score in the post-session survey.
- Analytics: first-party aggregate start/completion counts without identifiers, plus optional consent-based detailed evaluation. Advertising, sale, and third-party analytics: none.

Privacy policy: https://learnfit.pages.dev/privacy.html

Homepage: https://learnfit.pages.dev/

Recommended category: Productivity

Recommended visibility for the first review: Unlisted
