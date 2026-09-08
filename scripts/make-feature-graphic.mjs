import sharp from "sharp";
import { readFileSync } from "fs";

const logoSvg = readFileSync("web/public/vlue-brand-logo.svg");
const logoPng = await sharp(logoSvg, { density: 400 }).resize(220, 220).png().toBuffer();

const featureSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="45%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <circle cx="900" cy="80" r="160" fill="#ffffff" fill-opacity="0.06"/>
  <circle cx="80" cy="420" r="120" fill="#ffffff" fill-opacity="0.05"/>
  <text x="300" y="200" font-family="Malgun Gothic" font-size="72" font-weight="700" fill="#ffffff">VLUE</text>
  <text x="300" y="270" font-family="Malgun Gothic" font-size="28" fill="#dbeafe">보이스피싱 예방 · 디지털 인증명함</text>
  <text x="300" y="330" font-family="Malgun Gothic" font-size="22" fill="#bfdbfe">신뢰할 수 있는 디지털 명함 플랫폼</text>
</svg>`;

await sharp(Buffer.from(featureSvg))
  .composite([{ input: logoPng, left: 56, top: 140 }])
  .png()
  .toFile("D:/dev/play-store/feature-graphic-1024x500.png");

console.log("feature graphic updated");
