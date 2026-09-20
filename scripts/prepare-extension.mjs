import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { Resvg } from '@resvg/resvg-js';

const root = new URL('../', import.meta.url);
const extension = new URL('extension/chrome/', root);
const runtime = new URL('runtime/', extension);
const icons = new URL('icons/', extension);
await mkdir(runtime, { recursive: true });
await mkdir(icons, { recursive: true });

await build({
  entryPoints: [new URL('src/core/tracker.js', root).pathname],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: new URL('tracker.js', runtime).pathname,
});

await build({
  entryPoints: [new URL('src/core/engine.js', root).pathname],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: new URL('engine.js', runtime).pathname,
});

const mediaPipeVersion = JSON.parse(await readFile(new URL('node_modules/@mediapipe/face_mesh/package.json', root), 'utf8')).version;
await cp(new URL('public/vendor/mediapipe-0.4.1633559619/', root), new URL(`vendor/mediapipe-${mediaPipeVersion}/`, extension), { recursive: true });

const iconSvg = await readFile(new URL('public/brand/learnfit-icon.svg', root), 'utf8');
for (const size of [16, 32, 128]) {
  const png = new Resvg(iconSvg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  await writeFile(new URL(`icon-${size}.png`, icons), png);
}

console.log('Prepared the self-contained Chrome extension runtime.');
