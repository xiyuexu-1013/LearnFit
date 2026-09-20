import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import QRCode from 'qrcode';

const output = new URL('../social/nfls-wall/', import.meta.url);
await mkdir(output, { recursive: true });

const siteUrl = 'https://learnfit.pages.dev/?utm_source=nfls_wall&utm_medium=poster';
const displayUrl = 'learnfit.pages.dev';
const qrSvg = await QRCode.toString(siteUrl, {
  type: 'svg',
  errorCorrectionLevel: 'M',
  margin: 0,
  color: { dark: '#17362c', light: '#fffdf8' },
});
const qrBody = qrSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const logo = (await readFile(new URL('../public/brand/learnfit-icon.svg', import.meta.url), 'utf8'))
  .replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const textStyle = 'font-family="PingFang SC,Hiragino Sans GB,Arial,sans-serif"';
const monoStyle = 'font-family="SFMono-Regular,Menlo,monospace"';

const frame = (content, page, footer = 'STUDENT-BUILT · PRIVATE BY DEFAULT') => `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">
  <rect width="1080" height="1440" fill="#ede6da"/>
  <rect x="38" y="38" width="1004" height="1364" rx="42" fill="#fffdf8" stroke="#17362c" stroke-width="3"/>
  <text x="88" y="122" font-family="Georgia,serif" font-size="50" fill="#17362c">LearnFit.</text>
  <text x="930" y="116" ${monoStyle} font-size="18" fill="#bd4d37">0${page}/03</text>
  ${content}
  <text x="88" y="1350" ${monoStyle} font-size="17" fill="#63746c">${footer}</text>
</svg>`;

const posters = [
  frame(`
    <text x="88" y="252" ${monoStyle} font-size="20" letter-spacing="4" fill="#bd4d37">自建产品日记 · 真实用户招募</text>
    <text x="88" y="430" ${textStyle} font-size="86" font-weight="700" fill="#17362c">
      <tspan x="88">想请你帮我</tspan>
      <tspan x="88" dy="112">测一个</tspan><tspan fill="#bd4d37">东西。</tspan>
    </text>
    <text x="92" y="775" ${textStyle} font-size="34" fill="#395247">
      <tspan x="92">我做了一个不催你学习的专注工具。</tspan>
      <tspan x="92" dy="58">它想帮你找到自己的学习节奏，</tspan>
      <tspan x="92" dy="58">而不是再给你一个“标准答案”。</tspan>
    </text>
    <rect x="88" y="1035" width="600" height="94" rx="47" fill="#d9f05b"/>
    <text x="132" y="1096" ${textStyle} font-size="31" font-weight="700" fill="#17362c">只需要约 15 分钟 · 招募 15 位</text>
    <g transform="translate(794 1008) scale(1.45)"><rect width="128" height="128" rx="28" fill="#357a6d"/>${logo}</g>
    <text x="90" y="1228" ${textStyle} font-size="27" fill="#63746c">一个高中生做的产品实验。想听真话，不求夸夸。</text>
  `, 1, 'LEARNFIT · MADE BY A STUDENT · LOOKING FOR HONEST FEEDBACK'),

  frame(`
    <text x="88" y="245" ${monoStyle} font-size="20" letter-spacing="4" fill="#bd4d37">WHY I MADE THIS</text>
    <text x="88" y="385" ${textStyle} font-size="69" font-weight="700" fill="#17362c">
      <tspan x="88">它不会告诉你</tspan>
      <tspan x="88" dy="94">“应该学多久”。</tspan>
    </text>
    <text x="91" y="600" ${textStyle} font-size="29" fill="#50655b">先用 30 秒了解你的个人基线，再陪你完成一次真实学习。</text>
    <g ${textStyle}>
      <rect x="88" y="682" width="904" height="132" rx="18" fill="#17362c"/>
      <text x="126" y="735" font-size="20" letter-spacing="2" fill="#d9f05b">01 / SCORE</text>
      <text x="126" y="781" font-size="31" fill="#fffdf8">清楚看到自己的节奏分数</text>
      <rect x="88" y="835" width="904" height="132" rx="18" fill="#17362c"/>
      <text x="126" y="888" font-size="20" letter-spacing="2" fill="#d9f05b">02 / TIME</text>
      <text x="126" y="934" font-size="31" fill="#fffdf8">知道这次真正学了多久</text>
      <rect x="88" y="988" width="904" height="132" rx="18" fill="#17362c"/>
      <text x="126" y="1041" font-size="20" letter-spacing="2" fill="#d9f05b">03 / CHECK-IN</text>
      <text x="126" y="1087" font-size="31" fill="#fffdf8">在合适的时刻收到温和提醒</text>
    </g>
    <text x="88" y="1212" ${textStyle} font-size="25" fill="#50655b">分数只是参考线索，不是诊断，也不是对注意力的判决。</text>
    <text x="88" y="1260" ${textStyle} font-size="25" font-weight="700" fill="#17362c">摄像头画面与眼动测量默认只在你的电脑中处理。</text>
  `, 2),

  frame(`
    <text x="88" y="235" ${monoStyle} font-size="20" letter-spacing="4" fill="#bd4d37">15-MINUTE TEST · NO SIGN-UP</text>
    <text x="88" y="360" ${textStyle} font-size="65" font-weight="700" fill="#17362c">
      <tspan x="88">扫码打开，</tspan><tspan fill="#bd4d37">用一次，</tspan>
      <tspan x="88" dy="88">然后告诉我哪里不好用。</tspan>
    </text>
    <g ${textStyle} fill="#17362c">
      <text x="94" y="590" font-size="30"><tspan fill="#bd4d37" font-weight="700">1</tspan><tspan dx="24">用电脑 Chrome 打开 LearnFit</tspan></text>
      <line x1="94" y1="626" x2="622" y2="626" stroke="#d3cbbf" stroke-width="2"/>
      <text x="94" y="690" font-size="30"><tspan fill="#bd4d37" font-weight="700">2</tspan><tspan dx="24">完成 30 秒个人基线</tspan></text>
      <line x1="94" y1="726" x2="622" y2="726" stroke="#d3cbbf" stroke-width="2"/>
      <text x="94" y="790" font-size="30"><tspan fill="#bd4d37" font-weight="700">3</tspan><tspan dx="24">真实学习 8–10 分钟</tspan></text>
      <line x1="94" y1="826" x2="622" y2="826" stroke="#d3cbbf" stroke-width="2"/>
      <text x="94" y="890" font-size="30"><tspan fill="#bd4d37" font-weight="700">4</tspan><tspan dx="24">填写约 5 分钟匿名反馈</tspan></text>
    </g>
    <rect x="674" y="560" width="310" height="310" rx="24" fill="#fffdf8" stroke="#17362c" stroke-width="3"/>
    <g transform="translate(704 590) scale(6.75)">${qrBody}</g>
    <rect x="88" y="1000" width="904" height="134" rx="18" fill="#d9f05b"/>
    <text x="132" y="1053" ${textStyle} font-size="22" font-weight="700" fill="#17362c">不能扫码？在电脑浏览器输入：</text>
    <text x="132" y="1100" ${monoStyle} font-size="24" fill="#17362c">${displayUrl}</text>
    <text x="88" y="1228" ${textStyle} font-size="25" fill="#50655b">建议在安静、光线稳定的环境测试 · 无需注册</text>
    <text x="88" y="1273" ${textStyle} font-size="25" fill="#50655b">详细研究数据只有在你主动同意后才会记录</text>
  `, 3, 'SCAN TO TRY · APPROX. 15 MINUTES · HONEST FEEDBACK WANTED'),
];

for (let index = 0; index < posters.length; index += 1) {
  const png = new Resvg(posters[index], { fitTo: { mode: 'width', value: 1080 } }).render().asPng();
  await writeFile(new URL(`learnfit-nfls-${index + 1}.png`, output), png);
}

console.log('Created three NFLS wall posters in social/nfls-wall/.');
