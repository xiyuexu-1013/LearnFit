# Third-party tools and notices

LearnFit's original application code is licensed under the [MIT License](LICENSE). The project also uses the following external tools and libraries. Their names are listed for attribution; their authors do not endorse LearnFit.

## Runtime dependencies

| Component | Version | Purpose | License / terms |
| --- | ---: | --- | --- |
| [MediaPipe Face Mesh](https://google.github.io/mediapipe/solutions/face_mesh) | 0.4.1633559619 | On-device facial landmark detection | Apache-2.0 |
| [Instrument Serif via Fontsource](https://fontsource.org/fonts/instrument-serif) | 5.2.8 | Display typeface packaged with the site | SIL Open Font License 1.1 |
| [Chrome Extensions APIs](https://developer.chrome.com/docs/extensions/) | Manifest V3 | Offscreen tracking page, service worker, local session state, and popup | Google Chrome platform terms |

## Development and deployment tools

| Component | Version | Purpose | License / terms |
| --- | ---: | --- | --- |
| [Vite](https://vite.dev/) | 7.x | Website development and production build | MIT |
| [esbuild](https://esbuild.github.io/) | 0.25.x | Core SDK bundle | MIT |
| [node-qrcode](https://github.com/soldair/node-qrcode) | 1.5.4 | Locally generated promotional QR artwork | MIT |
| [resvg-js](https://github.com/yisibl/resvg-js) | 2.6.2 | Local SVG-to-PNG asset generation | MPL-2.0 |
| [Wrangler](https://developers.cloudflare.com/workers/wrangler/) | 4.x | Cloudflare development and deployment CLI | MIT OR Apache-2.0 |
| [Cloudflare Pages, Workers, and D1](https://www.cloudflare.com/developer-platform/) | Hosted service | Static hosting, API routing, anonymous usage totals, and opt-in evaluation storage | Cloudflare service terms |

Exact dependency versions are recorded in `package-lock.json`. License files distributed by installed packages remain under their respective terms.
