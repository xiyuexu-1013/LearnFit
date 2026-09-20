import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const entryPoint = fileURLToPath(new URL('../pages-function/index.js', import.meta.url));
const outfile = fileURLToPath(new URL('../site-dist/_worker.js', import.meta.url));

await build({
  entryPoints: [entryPoint],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  minify: false,
  sourcemap: false,
});

console.log('Prepared the same-origin Pages Function in site-dist/_worker.js.');
