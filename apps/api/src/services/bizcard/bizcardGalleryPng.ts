import sharp from "sharp";
import {
  buildBizcardCardSvgDocument,
  BIZCARD_ASPECT
} from "../../../../../src/lib/bizcardSvgEngineCore.js";
import type { BizcardClassicSnapshot } from "./bizcardClassicSpec.js";
import { cardVerifyPageUrl } from "./bizcardPublicUrls.js";

const CARD_W = 1200;
const CARD_H = Math.round(CARD_W / BIZCARD_ASPECT);
const FOOTER_H = 320;
const QR_SIZE = 200;
const PAD = 48;

async function fetchQrPng(dataUrl: string, size: number) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=1&data=${encodeURIComponent(dataUrl)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("QR 생성 실패");
  return Buffer.from(await res.arrayBuffer());
}

/** 갤러리 저장용 — 명함 + 진본 검증 QR + 안내 문구 */
export async function renderBizcardGalleryPng(
  snapshot: BizcardClassicSnapshot,
  cardId: string,
  apiBase: string,
  invalidated = false
) {
  const origin = apiBase.replace(/\/$/, "");
  const verifyUrl = cardVerifyPageUrl(origin, cardId);

  const cardSvg = buildBizcardCardSvgDocument(snapshot, {
    width: CARD_W,
    height: CARD_H,
    invalidated
  });
  const cardPng = await sharp(Buffer.from(cardSvg)).png().toBuffer();

  const totalH = CARD_H + FOOTER_H;
  const footerSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${FOOTER_H}">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <text x="${CARD_W / 2}" y="36" text-anchor="middle" font-family="Pretendard,Apple SD Gothic Neo,sans-serif" font-size="22" font-weight="800" fill="#0f172a">실시간 진본 검증 QR</text>
  <text x="${CARD_W / 2}" y="${FOOTER_H - 36}" text-anchor="middle" font-family="Pretendard,Apple SD Gothic Neo,sans-serif" font-size="18" font-weight="600" fill="#475569">스마트폰 카메라로 QR을 스캔하면 실시간 진본 여부와 라이브 홀로그램이 확인됩니다</text>
</svg>`;
  const footerPng = await sharp(Buffer.from(footerSvg)).png().toBuffer();
  const qrPng = await fetchQrPng(verifyUrl, QR_SIZE);
  const qrLeft = Math.round((CARD_W - QR_SIZE) / 2);
  const qrTop = CARD_H + 56;

  return sharp({
    create: {
      width: CARD_W,
      height: totalH,
      channels: 4,
      background: { r: 22, g: 22, b: 28, alpha: 1 }
    }
  })
    .composite([
      { input: cardPng, top: 0, left: 0 },
      { input: footerPng, top: CARD_H, left: 0 },
      { input: qrPng, top: qrTop, left: qrLeft }
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}
