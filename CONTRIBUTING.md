# Contributing to LearnFit

Thank you for helping improve a browser-based behavioral research tool.

## Development workflow

Use Node.js 18 or later. Run `npm ci`, `npm run check`, `npm test`, and `npm run build` from the repository root. Use synthetic landmarks, or synthetic timestamped inputs like the example in examples/. Real-camera testing should be opt-in and local to your device.

Before opening a pull request, explain the behavior being changed, provide a reproducible example, and describe the tests you ran. Preserve existing public exports and report missing data explicitly. Changes that affect privacy, calibration, package contracts or dependency loading need additional review.

## Good first contributions

- Document a no-camera example and its input fields.
- Add synthetic coverage-boundary and blink timing fixtures.
- Improve accessible labels in the demo.
- Document browser compatibility and troubleshooting.

Use existing conventions and avoid committing participant records, camera captures, session exports, or secrets. Preserve existing licenses and third-party attribution.
