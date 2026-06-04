import sharp from "sharp";

const W = 800;
const H = 450;

/** 카카오 Feed용 — VLUE 공식 '명함 보기' 파란 버튼 카드 (개인 데이터 없음) */
export async function renderKakaoShareButtonPng(): Promise<Buffer> {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" rx="28" fill="url(#bg)" filter="url(#sh)"/>
  <rect x="24" y="24" width="120" height="36" rx="18" fill="rgba(255,255,255,0.15)"/>
  <text x="84" y="48" text-anchor="middle" font-family="Pretendard,Apple SD Gothic Neo,sans-serif" font-size="14" font-weight="900" fill="#bfdbfe" letter-spacing="0.08em">VLUE</text>
  <text x="400" y="200" text-anchor="middle" font-family="Pretendard,Apple SD Gothic Neo,sans-serif" font-size="32" font-weight="900" fill="#ffffff">VLUE 디지털 인증명함 보기</text>
  <text x="400" y="238" text-anchor="middle" font-family="Pretendard,Apple SD Gothic Neo,sans-serif" font-size="15" font-weight="600" fill="#dbeafe">탭하여 실시간 라이브 홀로그램 검증</text>
  <g transform="translate(400,310)">
    <circle r="42" fill="rgba(255,255,255,0.95)"/>
    <polygon points="-14,-20 22,0 -14,20" fill="#2563eb"/>
  </g>
  <rect x="200" y="380" width="400" height="48" rx="24" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>
  <text x="400" y="411" text-anchor="middle" font-family="Pretendard,Apple SD Gothic Neo,sans-serif" font-size="16" font-weight="800" fill="#ffffff">지금 인증 명함 열기 →</text>
</svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
