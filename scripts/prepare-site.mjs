import { mkdir, readFile, writeFile, readdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = new URL('../', import.meta.url);
const brand = new URL('public/brand/', root);
await mkdir(brand, { recursive: true });
const icon = await readFile(new URL('learnfit-icon.svg', brand), 'utf8');
let faviconPng;
for (const size of [16, 32, 180, 192, 512, 1024]) {
  const renderer = new Resvg(icon, { fitTo: { mode: 'width', value: size } });
  const png = renderer.render().asPng();
  await writeFile(new URL(`icon-${size}.png`, brand), png);
  if (size === 32) faviconPng = png;
}

// ICO 可以直接嵌入 PNG；保留传统 /favicon.ico 以兼容 Safari 和标签页缓存策略。
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
icoHeader.writeUInt8(32, 6);
icoHeader.writeUInt8(32, 7);
icoHeader.writeUInt16LE(1, 10);
icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(faviconPng.length, 14);
icoHeader.writeUInt32LE(22, 18);
await writeFile(new URL('public/favicon.ico', root), Buffer.concat([icoHeader, faviconPng]));
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#357a6d"/><g transform="translate(51.2 51.2) scale(3.2)">${icon.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</g></svg>`;
await writeFile(new URL('icon-maskable-512.png', brand), new Resvg(maskable).render().asPng());
const share = await readFile(new URL('learnfit-share.svg', brand), 'utf8');
await writeFile(new URL('learnfit-share.png', brand), new Resvg(share).render().asPng());

// 将固定版本的追踪运行时放在同源目录，发布后不依赖第三方 CDN。
const source = new URL('node_modules/@mediapipe/face_mesh/', root);
const packageInfo = JSON.parse(await readFile(new URL('package.json', source), 'utf8'));
const target = new URL(`public/vendor/mediapipe-${packageInfo.version}/`, root);
await mkdir(target, { recursive: true });
for (const file of await readdir(source)) {
  if (/\.(js|wasm|data|binarypb|tflite)$/.test(file)) {
    await copyFile(new URL(file, source), new URL(file, target));
  }
}
console.log(`Prepared favicon, icons, and MediaPipe ${packageInfo.version} at ${fileURLToPath(target)}`);
