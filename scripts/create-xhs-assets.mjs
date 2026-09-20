import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const output = new URL('../social/xhs/', import.meta.url);
await mkdir(output, { recursive: true });
const logo = (await readFile(new URL('../public/brand/learnfit-icon.svg', import.meta.url), 'utf8'))
  .replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const frame = (content, page) => `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">
<rect width="1080" height="1440" fill="#f2ede3"/><rect x="44" y="44" width="992" height="1352" rx="38" fill="#fffdf8" stroke="#17362c" stroke-width="3"/>
<text x="94" y="130" font-family="Georgia,serif" font-size="48" fill="#17362c">LearnFit.</text><text x="920" y="126" font-family="monospace" font-size="20" fill="#b94b36">0${page}/03</text>
${content}<text x="94" y="1340" font-family="monospace" font-size="18" fill="#5f7067">LEARNFIT · BUILT BY A STUDENT · PRIVATE BY DEFAULT</text></svg>`;

const pages = [
  frame(`<text x="94" y="275" font-family="monospace" font-size="22" letter-spacing="4" fill="#b94b36">自建产品日记 / 招募真实测试者</text>
  <text x="94" y="430" font-family="PingFang SC,Hiragino Sans GB,sans-serif" font-size="92" font-weight="700" fill="#17362c"><tspan x="94">我做了一个</tspan><tspan x="94" dy="125">不催你学习的</tspan><tspan x="94" dy="125" fill="#b94b36">专注工具。</tspan></text>
  <text x="96" y="865" font-family="PingFang SC,Hiragino Sans GB,sans-serif" font-size="34" fill="#395247"><tspan x="96">不规定你应该学多久。</tspan><tspan x="96" dy="62">先了解自己的节奏，再自己决定。</tspan></text>
  <rect x="94" y="1035" width="520" height="86" rx="43" fill="#d9ee5e"/><text x="135" y="1091" font-family="PingFang SC,Hiragino Sans GB,sans-serif" font-size="30" font-weight="700" fill="#17362c">正在找 15 位学生测试</text>
  <g transform="translate(760 1010) scale(1.35)"><rect width="128" height="128" rx="30" fill="#357a6d"/>${logo}</g>`, 1),
  frame(`<text x="94" y="275" font-family="monospace" font-size="22" letter-spacing="4" fill="#b94b36">NOT ANOTHER POMODORO TIMER</text>
  <text x="94" y="405" font-family="PingFang SC,Hiragino Sans GB,sans-serif" font-size="72" font-weight="700" fill="#17362c"><tspan x="94">先观察你的</tspan><tspan x="94" dy="100" fill="#b94b36">个人基线。</tspan></text>
  <g font-family="PingFang SC,Hiragino Sans GB,sans-serif"><rect x="94" y="650" width="892" height="145" rx="15" fill="#10352a"/><text x="132" y="710" font-size="23" fill="#d9ee5e">01 / 30 秒</text><text x="132" y="760" font-size="32" fill="#fffdf8">建立你自己的眼部行为基线</text>
  <rect x="94" y="820" width="892" height="145" rx="15" fill="#10352a"/><text x="132" y="880" font-size="23" fill="#d9ee5e">02 / 学习中</text><text x="132" y="930" font-size="32" fill="#fffdf8">显示节奏分数、学习时长和提醒点</text>
  <rect x="94" y="990" width="892" height="145" rx="15" fill="#10352a"/><text x="132" y="1050" font-size="23" fill="#d9ee5e">03 / 结束后</text><text x="132" y="1100" font-size="32" fill="#fffdf8">留下报告，也告诉我哪里不好用</text></g>
  <text x="94" y="1225" font-family="PingFang SC,Hiragino Sans GB,sans-serif" font-size="26" fill="#5f7067">分数是一个线索，不是对注意力的判决。</text>`, 2),
  frame(`<text x="94" y="275" font-family="monospace" font-size="22" letter-spacing="4" fill="#b94b36">15-MINUTE REAL-USER TEST</text>
  <text x="94" y="410" font-family="PingFang SC,Hiragino Sans GB,sans-serif" font-size="70" font-weight="700" fill="#17362c"><tspan x="94">想请你用 15 分钟，</tspan><tspan x="94" dy="100">告诉我哪里</tspan><tspan fill="#b94b36">不好用。</tspan></text>
  <g font-family="PingFang SC,Hiragino Sans GB,sans-serif" fill="#17362c"><text x="100" y="740" font-size="34"><tspan fill="#b94b36" font-weight="700">1</tspan><tspan dx="28">用电脑打开 LearnFit</tspan></text><line x1="100" y1="785" x2="970" y2="785" stroke="#d5cec1" stroke-width="2"/><text x="100" y="865" font-size="34"><tspan fill="#b94b36" font-weight="700">2</tspan><tspan dx="28">做一次真实的短学习任务</tspan></text><line x1="100" y1="910" x2="970" y2="910" stroke="#d5cec1" stroke-width="2"/><text x="100" y="990" font-size="34"><tspan fill="#b94b36" font-weight="700">3</tspan><tspan dx="28">结束后填 5 分钟匿名问卷</tspan></text></g>
  <rect x="94" y="1090" width="892" height="104" rx="12" fill="#d9ee5e"/><text x="130" y="1155" font-family="PingFang SC,Hiragino Sans GB,sans-serif" font-size="28" font-weight="700" fill="#17362c">真实测试正在进行中 · 后续会分享结果</text>
  <text x="94" y="1260" font-family="PingFang SC,Hiragino Sans GB,sans-serif" font-size="24" fill="#5f7067">摄像头画面和眼动测量不会上传 · 详细数据需主动同意</text>`, 3),
];

for (let index = 0; index < pages.length; index += 1) {
  await writeFile(new URL(`learnfit-xhs-${index + 1}.png`, output), new Resvg(pages[index], { fitTo: { mode: 'width', value: 1080 } }).render().asPng());
}
console.log('Created three Xiaohongshu images in social/xhs/.');
