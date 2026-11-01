import sharp from "sharp";

/** 카카오 Feed 와이드(2:1) 권장 규격 */
export const VMAP_SHARE_IMAGE_W = 800;
export const VMAP_SHARE_IMAGE_H = 400;
export const VMAP_SHARE_ZOOM = 16;

const GENERIC_LABEL =
  /^(도착지|약속|목적지|약속 장소|여기|나 여기|여기서 만나요|위치|초대)$/i;

const FONT =
  "NanumGothic, Nanum Gothic, Noto Sans CJK KR, Noto Sans KR, Malgun Gothic, Apple SD Gothic Neo, sans-serif";

const MAPBOX_PUBLIC_TOKEN = [
  "pk.eyJ1Ijoi",
  "dmNpZCIsImEiOiJjbXZ3cGZ5cWswYmtpMndxMWhtdGZvZDc4In0",
  ".beCM-pnvtfaRAMhrCFdqQg"
].join("");

function readMapboxToken() {
  return String(
    process.env.MAPBOX_TOKEN ||
      process.env.MAPBOX_ACCESS_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      process.env.VITE_MAPBOX_TOKEN ||
      MAPBOX_PUBLIC_TOKEN
  ).trim();
}

function esc(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clipLabel(raw: string, max = 18) {
  const t = String(raw || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(1, max - 1))}…`;
}

export function isGenericVmapPlaceLabel(raw: unknown) {
  const t = String(raw || "").trim();
  return !t || GENERIC_LABEL.test(t);
}

export function resolveVmapBalloonLabel(placeLabel?: string, address?: string) {
  const name = String(placeLabel || "").trim();
  const addr = String(address || "").trim();
  if (!isGenericVmapPlaceLabel(name)) return name;
  if (addr) return addr;
  return name || addr || "";
}

function measureText(text: string, fontSize: number) {
  let w = 0;
  for (const ch of text) {
    w += /[\u1100-\uFFFD]/.test(ch) ? fontSize : fontSize * 0.58;
  }
  return w;
}

function sniffImage(buf: ArrayBuffer | Buffer) {
  const u8 = buf instanceof Buffer ? buf : Buffer.from(buf);
  if (u8.length < 24) return null;
  const isPng = u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47;
  const isJpg = u8[0] === 0xff && u8[1] === 0xd8;
  if (!isPng && !isJpg) return null;
  return { buf: u8, contentType: isJpg ? "image/jpeg" : "image/png" };
}

async function fetchImageBytes(url: string, headers?: Record<string, string>, ms = 8000) {
  const res = await fetch(url, {
    headers: { Accept: "image/png,image/jpeg,image/*,*/*", ...(headers || {}) },
    signal: AbortSignal.timeout(ms)
  });
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  if (!buf || buf.byteLength < 256) return null;
  return sniffImage(buf);
}

async function fetchBaseMap(lat: number, lng: number, w: number, h: number, zoom: number) {
  const token = readMapboxToken();
  const candidates: Array<{ url: string; headers?: Record<string, string> }> = [];
  if (token) {
    const lon = lng.toFixed(6);
    const la = lat.toFixed(6);
    candidates.push({
      url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${lon},${la},${zoom},0/${w}x${h}?access_token=${encodeURIComponent(token)}`
    });
  }
  const naverId = String(process.env.NAVER_MAP_CLIENT_ID || "").trim();
  const naverSecret = String(process.env.NAVER_MAP_CLIENT_SECRET || "").trim();
  const googleKey = String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
  if (naverId && naverSecret) {
    candidates.push({
      url: `https://naveropenapi.apigw.ntruss.com/map-static/v2/raster?w=${w}&h=${h}&center=${lng},${lat}&level=16&format=png`,
      headers: {
        "X-NCP-APIGW-API-KEY-ID": naverId,
        "X-NCP-APIGW-API-KEY": naverSecret,
        Accept: "image/png,image/*,*/*"
      }
    });
  }
  if (googleKey) {
    candidates.push({
      url: `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${w}x${h}&scale=1&maptype=roadmap&key=${encodeURIComponent(googleKey)}`
    });
  }
  candidates.push({
    url: `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${w}x${h}`
  });
  candidates.push({
    url: `https://static-maps.yandex.ru/1.x/?lang=ko_KR&ll=${lng},${lat}&z=${Math.min(17, zoom)}&size=${Math.min(650, w)},${Math.min(450, h)}&l=map`
  });

  for (const item of candidates) {
    try {
      const image = await fetchImageBytes(item.url, item.headers);
      if (image) return image;
    } catch {
      /* next */
    }
  }
  return null;
}

async function fetchCircleAvatar(url: string, size: number): Promise<Buffer | null> {
  const raw = String(url || "").trim();
  if (!/^https:\/\//i.test(raw)) return null;
  try {
    const res = await fetch(raw, {
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*",
        "User-Agent": "VLUE-vmap-share/1.0",
        Referer: "https://www.vlue.kr/"
      },
      signal: AbortSignal.timeout(4500)
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 32 || buf.length > 2_000_000) return null;
    const mask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
    );
    return await sharp(buf)
      .resize(size, size, { fit: "cover" })
      .png()
      .composite([{ input: mask, blend: "dest-in" }])
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

function buildOverlaySvg(opts: {
  w: number;
  h: number;
  label: string;
  hasAvatar: boolean;
}) {
  const { w, h, hasAvatar } = opts;
  const label = clipLabel(opts.label, 18);
  const cx = w / 2;
  const pinCy = Math.round(h * 0.58);
  const ringR = 34;
  const innerR = 28;
  const fontSize = 22;
  const textW = label ? measureText(label, fontSize) : 0;
  const padX = 18;
  const bh = label ? 44 : 0;
  const bw = label ? Math.min(w - 32, Math.max(96, Math.round(textW + padX * 2))) : 0;
  const bx = cx - bw / 2;
  const by = pinCy - ringR - 18 - bh;
  const tailX = cx;
  const tailY = pinCy - ringR - 6;

  const balloon = label
    ? `
  <g>
    <rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh}" rx="18" fill="#ffffff" stroke="#e5e7eb" stroke-width="1.5"/>
    <polygon points="${(tailX - 9).toFixed(1)},${(by + bh - 1).toFixed(1)} ${(tailX + 9).toFixed(1)},${(by + bh - 1).toFixed(1)} ${tailX.toFixed(1)},${tailY.toFixed(1)}" fill="#ffffff"/>
    <text x="${cx.toFixed(1)}" y="${(by + 29).toFixed(1)}" text-anchor="middle" font-family="${FONT}" font-size="${fontSize}" font-weight="700" fill="#111827">${esc(label)}</text>
  </g>`
    : "";

  const innerFill = hasAvatar ? "none" : "#ffffff";
  const initial = label ? esc(label.replace(/\s/g, "").slice(0, 1) || "V") : "V";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.28"/>
    </filter>
  </defs>
  ${balloon}
  <g filter="url(#shadow)">
    <path d="M ${cx} ${pinCy + ringR - 2} L ${cx - 11} ${pinCy + ringR + 18} L ${cx + 11} ${pinCy + ringR + 18} Z" fill="#00D2FF"/>
    <circle cx="${cx}" cy="${pinCy}" r="${ringR}" fill="#00D2FF"/>
    <circle cx="${cx}" cy="${pinCy}" r="${innerR}" fill="${innerFill}"/>
    ${hasAvatar ? "" : `<text x="${cx}" y="${pinCy + 8}" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="800" fill="#0891b2">${initial}</text>`}
  </g>
</svg>`;
}

export async function composeVmapShareThumbnail(opts: {
  lat: number;
  lng: number;
  w?: number;
  h?: number;
  zoom?: number;
  label?: string;
  address?: string;
  avatarUrl?: string;
}): Promise<{ buf: Buffer; contentType: string } | null> {
  const w = Math.min(VMAP_SHARE_IMAGE_W, Math.max(200, Math.round(opts.w || VMAP_SHARE_IMAGE_W)));
  const h = Math.min(VMAP_SHARE_IMAGE_H, Math.max(120, Math.round(opts.h || VMAP_SHARE_IMAGE_H)));
  const zoom = Math.min(17, Math.max(14, Math.round(opts.zoom || VMAP_SHARE_ZOOM)));
  const label = resolveVmapBalloonLabel(opts.label, opts.address);
  const base = await fetchBaseMap(opts.lat, opts.lng, w, h, zoom);
  if (!base) return null;

  const avatarSize = 56;
  const avatar = await fetchCircleAvatar(String(opts.avatarUrl || ""), avatarSize);
  const overlay = Buffer.from(
    buildOverlaySvg({ w, h, label, hasAvatar: Boolean(avatar) })
  );

  const pinCy = Math.round(h * 0.58);
  const composites: sharp.OverlayOptions[] = [{ input: overlay, top: 0, left: 0 }];
  if (avatar) {
    composites.push({
      input: avatar,
      left: Math.round(w / 2 - avatarSize / 2),
      top: Math.round(pinCy - avatarSize / 2)
    });
  }

  const buf = await sharp(base.buf)
    .resize(w, h, { fit: "cover", position: "center" })
    .composite(composites)
    .png()
    .toBuffer();
  return { buf, contentType: "image/png" };
}
