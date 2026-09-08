import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const outDir = "D:/dev/play-store";
const root = process.cwd();
mkdirSync(outDir, { recursive: true });

const shortDesc =
  "인증 디지털명함 · 통화 시 보이스피싱 예방을 돕는 VLUE";

const fullDesc = `VLUE는 직장·사업자 인증 기반 디지털 명함(DCC)과 통화 중 안심 정보를 제공하는 플랫폼입니다.

■ 이런 분들께 추천합니다
• 명함을 디지털로 주고받고 싶은 직장인·사업자
• 모르는 번호·사칭 전화가 걱정되는 분
• 팀·에이전트별로 여러 명함을 운영하는 분

■ 주요 기능
• 디지털 인증 명함(DCC): 프로필·연락처·소개를 안전하게 공유
• 멀티 프로필: 상황별 명함을 전환해 사용
• 레터링/쇼케이스: 통화·수신 상황에서 상대 정보 확인을 도움
• 보이스피싱 예방 지원: 인증·안심 정보로 사칭 위험을 줄임
• 웹·앱 연동: www.vlue.kr 기반 서비스

■ 이용 안내
앱 설치 후 계정 로그인과 필요한 권한(통화·오버레이 등)을 설정하면 레터링 기능을 사용할 수 있습니다.
서비스·문의: https://www.vlue.kr

※ 본 앱은 수사기관이 아니며, 모든 사기를 완전 차단한다고 보장하지 않습니다. 의심 전화는 공식 채널로 재확인하세요.`;

writeFileSync(join(outDir, "short-description.txt"), shortDesc, "utf8");
writeFileSync(join(outDir, "full-description.txt"), fullDesc + "\n", "utf8");
console.log("short chars:", [...shortDesc].length);
console.log("full chars:", [...fullDesc].length);

const logoSvg = readFileSync(join(root, "web/public/vlue-brand-logo.svg"));
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
  <text x="300" y="210" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700" fill="#ffffff">VLUE</text>
  <text x="300" y="275" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#dbeafe">Voice phishing prevention</text>
  <text x="300" y="330" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#bfdbfe">Digital certified business card</text>
</svg>`;

await sharp(Buffer.from(featureSvg))
  .composite([{ input: logoPng, left: 56, top: 140 }])
  .png()
  .toFile(join(outDir, "feature-graphic-1024x500.png"));

async function shot(file, title, lines) {
  const lineSvg = lines
    .map(
      (t, i) =>
        `<text x="90" y="${520 + i * 70}" font-family="Arial, Helvetica, sans-serif" font-size="36" fill="#1e293b">${t}</text>`
    )
    .join("");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#eff6ff"/>
      <stop offset="100%" stop-color="#dbeafe"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#g)"/>
  <rect x="60" y="120" width="960" height="1680" rx="48" fill="#ffffff" stroke="#bfdbfe" stroke-width="4"/>
  <rect x="60" y="120" width="960" height="280" rx="48" fill="#1d4ed8"/>
  <rect x="60" y="320" width="960" height="80" fill="#1d4ed8"/>
  <text x="540" y="290" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="700" fill="#ffffff">${title}</text>
  ${lineSvg}
  <text x="540" y="1700" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#64748b">www.vlue.kr</text>
</svg>`;
  const base = await sharp(Buffer.from(svg)).png().toBuffer();
  const mark = await sharp(logoSvg, { density: 300 }).resize(160, 160).png().toBuffer();
  await sharp(base)
    .composite([{ input: mark, left: 460, top: 360 }])
    .png()
    .toFile(file);
}

await shot(join(outDir, "screenshot-1-1080x1920.png"), "VLUE", [
  "- Digital certified card (DCC)",
  "- Multi profile switch",
  "- Secure contact sharing",
]);
await shot(join(outDir, "screenshot-2-1080x1920.png"), "Safe Call", [
  "- Voice phishing prevention",
  "- In-call showcase",
  "- Workplace verification",
]);

const assets = "C:/Users/jg071/.cursor/projects/d-dev/assets";
for (const [src, dest] of [
  ["vlue-play-screenshot-dcc.png", "screenshot-3-ui-1080x1920.png"],
  ["vlue-play-screenshot-call.png", "screenshot-4-call-1080x1920.png"],
]) {
  try {
    await sharp(join(assets, src))
      .resize(1080, 1920, { fit: "cover", position: "centre" })
      .png()
      .toFile(join(outDir, dest));
    console.log("ok", dest);
  } catch (e) {
    console.log("skip", dest, e.message);
  }
}

writeFileSync(
  join(outDir, "UPLOAD-CHECKLIST.txt"),
  `Play Console upload order
1) Short description <- short-description.txt
2) Full description <- full-description.txt
3) App icon <- D:\\dev\\vlue-play-icon-512.png
4) Feature graphic <- feature-graphic-1024x500.png
5) Phone screenshots (min 2) <- screenshot-3 + screenshot-4 recommended
   (or screenshot-1 / screenshot-2)

Korean short/full description files are UTF-8.
`,
  "utf8"
);

console.log("Written to", outDir);
