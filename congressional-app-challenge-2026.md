# LearnFit — 2026 Congressional App Challenge draft

## App title

LearnFit

## One-sentence purpose

LearnFit helps students discover a personal study rhythm through private, on-device eye-behavior feedback instead of one-size-fits-all schedules.

## Target audience

Middle and high school students who study on a computer and want clear feedback without surveillance, streaks, or rigid productivity rules.

## Inspiration

Study advice often tells every student to work and rest for the same amount of time. I wanted to build a quieter tool that starts with each student’s own baseline and helps them experiment with what actually works for them.

## What the app accomplishes

LearnFit uses a short personal baseline and local camera processing to summarize changes in blink frequency, completed blink duration, and eye openness. It presents a clear rhythm score, effective study time, and a suggested check-in duration while explaining the limits of the measurement.

## Tools and languages

JavaScript ES modules, HTML, CSS, MediaPipe FaceMesh, Chrome Manifest V3, the Chrome Offscreen API, Vite, esbuild, Node.js tests, and Cloudflare Workers static assets.

## Technical challenge

The main challenge was continuing a privacy-preserving camera session after an ordinary webpage was hidden or closed. A normal tab is throttled in the background and stops entirely when closed. I moved the user-started camera pipeline into a Manifest V3 offscreen document, kept session state in the extension service worker and local Chrome storage, and added explicit pause, resume, and camera-release behavior. I also made missing signal appear as a gap instead of inventing a low score.

## Version 2.0 improvements

I would add an optional desktop companion for studying in PDFs and non-browser apps, improve accessibility and multilingual support, and run a larger opt-in usability study to evaluate whether students understand the score and make healthier study choices. I would keep all camera processing local and avoid claims that the app can measure attention or diagnose health.

## Three-minute demo outline

1. **0:00–0:20 — Problem:** show rigid online study schedules and explain why one schedule does not fit every student.
2. **0:20–0:40 — Product:** open LearnFit and state the one-sentence purpose and target audience.
3. **0:40–1:15 — Privacy and baseline:** start a session, allow the camera, explain the 30-second personal baseline and local processing.
4. **1:15–1:55 — Core experience:** show the rhythm score, effective study time, suggested check-in, signal gaps, and score ingredients.
5. **1:55–2:25 — Technical work:** close the website, open the Chrome extension, and show that the background session continues using an offscreen document.
6. **2:25–2:45 — Report:** end the session and show the average score, timeline, data quality, and personal reflection.
7. **2:45–3:00 — Closing:** explain that LearnFit helps students learn about themselves rather than judge whether they are “focused.”

## Submission checklist

- Confirm student eligibility and participating congressional district.
- Register through the official 2026 student portal.
- Record a public 1–3 minute demonstration video.
- Add participant name or team names.
- Add the final public app URL.
- Prepare a team photo if requested by the application.
- Disclose any AI-assisted development accurately and be ready to explain the code and architecture.
