import sharp from "sharp";
import type { BizcardClassicSnapshot } from "./bizcardClassicSpec.js";

/** 카카오 Feed content 이미지 (2:1에 가깝게 — 800×520) */
export const KAKAO_FEED_CARD_WIDTH = 800;
export const KAKAO_FEED_CARD_HEIGHT = 520;

const FONT = "NanumGothic, Nanum Gothic, Noto Sans CJK KR, Pretendard, Apple SD Gothic Neo, Malgun Gothic, sans-serif";
const NAVY = "#0b1a33";
const HEADER_H = 268;

function esc(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function trunc(s: string, max: number) {
  const t = String(s || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(1, max - 1))}…`;
}

function buildTags(snap: BizcardClassicSnapshot): string[] {
  const tags: string[] = [];
  const dept = String(snap.department || "").trim();
  const title = String(snap.title || "").trim();
  const org = String(snap.organization || "").trim();
  if (dept) tags.push(trunc(dept, 16));
  if (title && title !== dept) tags.push(trunc(title, 16));
  if (tags.length < 3 && org) tags.push(trunc(org, 18));
  return tags.slice(0, 3);
}

async function fetchRemoteImage(url: string): Promise<Buffer | null> {
  try {
    const raw = String(url || "").trim();
    if (!raw) return null;
    if (raw.startsWith("data:image/")) {
      const comma = raw.indexOf(",");
      if (comma < 0) return null;
      const b64 = raw.slice(comma + 1);
      const buf = Buffer.from(b64, "base64");
      return buf.length >= 32 ? buf : null;
    }
    if (!/^https?:\/\//i.test(raw)) return null;
    const res = await fetch(raw, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 32) return null;
    return buf;
  } catch {
    return null;
  }
}

async function circleAvatarPng(source: Buffer, size: number): Promise<Buffer> {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
  );
  return sharp(source)
    .resize(size, size, { fit: "cover" })
    .png()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

function buildFeedCardSvg(snap: BizcardClassicSnapshot, withAvatarSlot: boolean, headerTransparent: boolean): string {
  const W = KAKAO_FEED_CARD_WIDTH;
  const H = KAKAO_FEED_CARD_HEIGHT;
  const name = trunc(snap.name || "회원", 14);
  const org = trunc(snap.organization || "", 24);
  const dept = String(snap.department || "").trim();
  const title = String(snap.title || "").trim();
  const roleLine = trunc([dept, title].filter(Boolean).join(" | "), 40);
  const tags = buildTags(snap);
  const initial = (name.replace(/\s/g, "").slice(0, 1) || "V").toUpperCase();

  let tagX = 28;
  const tagY = 200;
  const tagParts: string[] = [];
  for (const tag of tags) {
    const tw = Math.min(240, tag.length * 15 + 32);
    tagParts.push(`
      <rect x="${tagX}" y="${tagY}" width="${tw}" height="34" rx="8" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.2)"/>
      <text x="${tagX + tw / 2}" y="${tagY + 23}" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="700" fill="#e2e8f0">${esc(tag)}</text>
    `);
    tagX += tw + 10;
  }

  const avatarPlaceholder = withAvatarSlot
    ? ""
    : `
  <circle cx="84" cy="86" r="44" fill="#334155" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>
  <text x="84" y="98" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="900" fill="#f8fafc">${esc(initial)}</text>`;

  const orgY = roleLine ? 132 : 108;
  const headerFill = headerTransparent ? "transparent" : NAVY;
  const textShadow = headerTransparent
    ? `filter="drop-shadow(0 1px 2px rgba(0,0,0,0.65))"`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="24" fill="#ffffff"/>
  <rect width="${W}" height="${HEADER_H}" fill="${headerFill}"/>
  ${avatarPlaceholder}
  <text x="152" y="74" font-family="${FONT}" font-size="34" font-weight="900" fill="#ffffff" ${textShadow}>${esc(name)}</text>
  ${roleLine ? `<text x="152" y="108" font-family="${FONT}" font-size="18" font-weight="600" fill="#e2e8f0" ${textShadow}>${esc(roleLine)}</text>` : ""}
  ${org ? `<text x="152" y="${orgY}" font-family="${FONT}" font-size="17" font-weight="500" fill="#cbd5e1" ${textShadow}>${esc(org)}</text>` : ""}
  ${tagParts.join("")}
  <rect y="${HEADER_H}" width="${W}" height="${H - HEADER_H}" fill="#ffffff"/>
  <text x="400" y="${HEADER_H + 46}" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="700" fill="#1e293b">
    <tspan font-weight="900" fill="#0f172a">${esc(name)}</tspan><tspan font-weight="600" fill="#475569">님의 명함을 확인하세요.</tspan>
  </text>
  <rect x="28" y="${HEADER_H + 66}" width="${W - 56}" height="54" rx="14" fill="#eceff3"/>
  <text x="400" y="${HEADER_H + 102}" text-anchor="middle" font-family="${FONT}" font-size="24" font-weight="900" fill="#1e293b">명함 확인</text>
  <line x1="28" y1="${H - 54}" x2="${W - 28}" y2="${H - 54}" stroke="#f1f5f9" stroke-width="2"/>
  <rect x="28" y="${H - 42}" width="22" height="22" rx="6" fill="#2563eb"/>
  <text x="58" y="${H - 24}" font-family="${FONT}" font-size="18" font-weight="900" fill="#334155">VLUE</text>
  <text x="${W - 36}" y="${H - 22}" text-anchor="middle" font-family="${FONT}" font-size="30" font-weight="700" fill="#94a3b8">›</text>
</svg>`;
}

/** 카카오 Feed — 개인화 명함 카드 PNG (미리보기·카카오 imageUrl 공용) */
export async function renderKakaoFeedCardPng(snapshot: BizcardClassicSnapshot): Promise<Buffer> {
  const logoUrl = String(snapshot.logoUrl || "").trim();
  const coverUrl = String(snapshot.shareCoverUrl || "").trim();
  const avatarBuf = logoUrl ? await fetchRemoteImage(logoUrl) : null;
  const coverBuf = coverUrl ? await fetchRemoteImage(coverUrl) : null;

  const svgBuf = await sharp(Buffer.from(buildFeedCardSvg(snapshot, Boolean(avatarBuf), Boolean(coverBuf))))
    .png({ compressionLevel: 9 })
    .toBuffer();

  const layers: sharp.OverlayOptions[] = [];

  if (coverBuf) {
    const cover = await sharp(coverBuf)
      .resize(KAKAO_FEED_CARD_WIDTH, HEADER_H, { fit: "cover", position: "centre" })
      .modulate({ brightness: 0.7 })
      .png()
      .toBuffer();
    const dim = await sharp({
      create: {
        width: KAKAO_FEED_CARD_WIDTH,
        height: HEADER_H,
        channels: 4,
        background: { r: 11, g: 26, b: 51, alpha: 0.38 }
      }
    })
      .png()
      .toBuffer();
    const header = await sharp(cover)
      .composite([{ input: dim, blend: "over" }])
      .png()
      .toBuffer();
    layers.push({ input: header, left: 0, top: 0 });
  }

  layers.push({ input: svgBuf, left: 0, top: 0 });

  if (avatarBuf) {
    layers.push({ input: await circleAvatarPng(avatarBuf, 88), left: 40, top: 42 });
  }

  return sharp({
    create: {
      width: KAKAO_FEED_CARD_WIDTH,
      height: KAKAO_FEED_CARD_HEIGHT,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toBuffer();
}
