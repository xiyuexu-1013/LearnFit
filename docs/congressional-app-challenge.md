# Congressional App Challenge submission notes

Use this as a factual preparation checklist. Confirm the current rules and district deadline on the official Congressional App Challenge site before submitting.

## Project description

LearnFit is a privacy-first study tool that helps students notice changes in their study rhythm. It uses the device camera to find eye landmarks in the browser, establishes a 30-second personal baseline, and compares later eye openness and blink patterns with that baseline. It shows explainable feedback and a session report without uploading video or requiring an account.

## Audience and problem

Students often study for long stretches without an easy way to reflect on when their rhythm changes. LearnFit gives them a private check-in based on their own baseline instead of comparing them with other people. The result is a heuristic study aid, not a measure of attention and not a medical assessment.

## Technologies

- HTML, CSS, and JavaScript ES modules
- MediaPipe FaceMesh for browser-side facial landmark detection
- A rule-based Focus Rhythm Engine for EAR, blink detection, personal calibration, and feedback
- Vite and esbuild for builds
- Node's test runner for engine tests
- Cloudflare Workers static assets for deployment

## Features to demonstrate

1. Open the live site and explain that the camera data stays in the browser.
2. Start a session and show that calibration advances only with usable tracking.
3. Explain EAR, blink frequency, blink duration, and the personal baseline in plain language.
4. Show signal-loss handling by briefly moving out of frame.
5. End the session and show the real-data trend, data quality, recommendations, and PDF export.
6. Explain the limitation: the rhythm index is a transparent heuristic and does not equal attention.

## Original work and update history

The repository contains work from before the current competition cycle. Submit LearnFit only under the current rules for an eligible updated app, and describe the new work precisely. The substantial update includes the redesigned responsive experience, usable-data calibration, signal-gap handling, explainable component scores, session summary and print export, locally hosted tracking runtime, automated engine tests, install/share icons, and Cloudflare Workers deployment.

Keep dated evidence of the new work, such as source files, test output, deployment records, design drafts, and a screen recording. Do not describe older code as newly created during the competition period.

## AI tool disclosure draft

Review and adapt this to match the final submission form:

> I used an AI coding assistant during the 2026 LearnFit update to help redesign the interface, refactor browser code, prepare tests and documentation, create deployment configuration, and troubleshoot. I reviewed the generated changes, tested the application, and am responsible for understanding and explaining the submitted work. LearnFit does not use generative AI at runtime. Its landmark detector is the pretrained MediaPipe FaceMesh model, while its study-rhythm estimate is produced by documented rules and a personal baseline.

## Video outline

- 0:00–0:20 — problem, audience, and one-sentence solution
- 0:20–0:45 — privacy and on-device architecture
- 0:45–1:35 — live calibration and focus-session demo
- 1:35–2:05 — explain the rules, personal baseline, and limitations
- 2:05–2:35 — summary report, data quality, and PDF export
- 2:35–3:00 — technologies, biggest technical challenge, and what was built in the current cycle

Before recording, test the site in the same browser, camera, lighting, and network environment that will appear in the video.
