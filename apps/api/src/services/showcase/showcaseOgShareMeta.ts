import { prisma } from "../../db/client.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";

export type ShowcaseOgShareMeta = {
  name: string;
  org: string;
  role: string;
  handle: string;
  cardId: string;
  photo: string;
  shareCover: string;
};

const FRESH_MS = 10 * 60 * 1000;
const STALE_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 400;

type HtmlRow = { html: string; freshUntil: number; staleUntil: number };
const htmlCache = new Map<string, HtmlRow>();
const inflight = new Map<string, Promise<string>>();

function touch(phone: string, row: HtmlRow) {
  htmlCache.delete(phone);
  htmlCache.set(phone, row);
  while (htmlCache.size > CACHE_MAX) {
    const oldest = htmlCache.keys().next().value;
    if (!oldest) break;
    htmlCache.delete(oldest);
  }
}

export function getCachedOgHtml(phone: string): { html: string; stale: boolean } | null {
  const row = htmlCache.get(phone);
  if (!row) return null;
  const now = Date.now();
  if (now >= row.staleUntil) {
    htmlCache.delete(phone);
    return null;
  }
  return { html: row.html, stale: now >= row.freshUntil };
}

export function setCachedOgHtml(phone: string, html: string) {
  const now = Date.now();
  touch(phone, {
    html,
    freshUntil: now + FRESH_MS,
    staleUntil: now + STALE_MS
  });
}

export function coalesceOgHtmlBuild(phone: string, build: () => Promise<string>): Promise<string> {
  const hit = inflight.get(phone);
  if (hit) return hit;
  const p = build().finally(() => inflight.delete(phone));
  inflight.set(phone, p);
  return p;
}

function pickHttpUrl(...candidates: unknown[]): string {
  for (const c of candidates) {
    const s = String(c || "").trim();
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
  }
  return "";
}

/** 한글 파일명 때문에 카카오 스크래퍼가 재시도하지 않도록 경로만 인코딩 */
export function toAsciiOgImageUrl(raw: string): string {
  const src = pickHttpUrl(raw);
  if (!src) return "";
  try {
    const u = new URL(src);
    u.pathname = u.pathname
      .split("/")
      .map((seg) => {
        if (!seg) return seg;
        try {
          return encodeURIComponent(decodeURIComponent(seg));
        } catch {
          return encodeURIComponent(seg);
        }
      })
      .join("/");
    return u.toString();
  } catch {
    return src;
  }
}

export async function loadShowcaseOgShareMeta(digits: string): Promise<ShowcaseOgShareMeta> {
  const empty: ShowcaseOgShareMeta = {
    name: "",
    org: "",
    role: "",
    handle: "",
    cardId: "",
    photo: "",
    shareCover: ""
  };
  const e164 = normalizeToE164KR(digits);
  if (!e164) return empty;

  const rows = await prisma.$queryRaw<
    Array<{
      name: string | null;
      handle: string | null;
      org: string | null;
      role: string | null;
      card_id: string | null;
      photo_url: string | null;
      share_cover: string | null;
      kakao_bg: string | null;
    }>
  >`
    SELECT
      COALESCE(NULLIF(TRIM(dc.display_name), ''), NULLIF(TRIM(u.legal_name), '')) AS name,
      NULLIF(TRIM(u.public_handle), '') AS handle,
      COALESCE(NULLIF(TRIM(bp.company_name), ''), NULLIF(TRIM(dc.organization), '')) AS org,
      COALESCE(NULLIF(TRIM(bp.job_title), ''), NULLIF(TRIM(dc.title_snapshot), '')) AS role,
      dc.id AS card_id,
      NULLIF(TRIM(dc.photo_url), '') AS photo_url,
      NULLIF(TRIM(dc.export_snapshot_json->>'shareCoverUrl'), '') AS share_cover,
      NULLIF(TRIM(dc.export_snapshot_json->>'kakaoFeedBgUrl'), '') AS kakao_bg
    FROM users u
    LEFT JOIN digital_cards dc ON dc.user_id = u.id
    LEFT JOIN user_business_profiles bp ON bp.user_id = u.id
    WHERE u.phone_e164 = ${e164}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return empty;
  return {
    name: String(row.name || "").trim(),
    org: String(row.org || "").trim(),
    role: String(row.role || "").trim(),
    handle: String(row.handle || "").trim().replace(/^@/, ""),
    cardId: String(row.card_id || "").trim(),
    photo: pickHttpUrl(row.photo_url),
    shareCover: pickHttpUrl(row.share_cover, row.kakao_bg)
  };
}
