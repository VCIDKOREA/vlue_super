import { ensureKakaoSdk } from "./kakaoSocialLogin.js";
import { getInviteSenderName, getInviteSenderHandle } from "./contactInviteShare.js";
import { getVlueViralLinks } from "./vlueViralLinks.js";
import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

const FALLBACK_APP = "https://www.vlue.kr/app";
const FALLBACK_THUMB = "https://www.vlue.kr/vlue-eye-closed-icon.png";
const FEED_IMAGE_W = 800;
const FEED_IMAGE_H = 400;

/** V-Map 방 입장 딥링크 (토큰 기반) */
export function buildVmapInviteUrl(token) {
  const t = String(token || "").trim();
  if (!t) return FALLBACK_APP;
  const viral = getVlueViralLinks();
  const base = String(viral?.landing || "").replace(/\/$/, "") || "https://www.vlue.kr";
  return `${base}/app?vmapInvite=${encodeURIComponent(t)}`;
}

/** V-Map 방 입장 딥링크 (roomId 기반 - 레거시 호환) */
export function buildVmapJoinUrl(roomId) {
  const id = String(roomId || "").trim();
  if (!id) return FALLBACK_APP;
  const viral = getVlueViralLinks();
  const base = String(viral?.landing || "").replace(/\/$/, "") || "https://www.vlue.kr";
  return `${base}/app?vmapJoin=${encodeURIComponent(id)}`;
}

/** 목적지 좌표 기반 공개 썸네일 (카카오 Share imageUrl용 HTTPS) */
export function buildVmapShareImageUrl(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return FALLBACK_THUMB;
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${encodeURIComponent(
    `${la},${ln}`
  )}&zoom=15&size=${FEED_IMAGE_W}x${FEED_IMAGE_H}&maptype=mapnik&markers=${encodeURIComponent(
    `${la},${ln},lightblue1`
  )}`;
}

/** 초대 토큰 발급 API 호출 */
export async function createVmapInviteToken(roomId) {
  const id = String(roomId || "").trim();
  if (!id) throw new Error("V-Map 방이 없습니다. 목적지를 먼저 설정해 주세요.");
  const res = await vlueAuthFetch(apiUrl(`/api/location/vmap/${id}/invite-token`), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `초대 토큰 생성 실패 (${res.status})`);
  }
  if (!data?.token) throw new Error("초대 토큰 응답이 올바르지 않습니다.");
  return data;
}

/** 초대 토큰 검증 API 호출 (비회원도 가능) */
export async function validateVmapInviteToken(token) {
  const headers = {};
  try {
    const auth = vlueAuthHeaders();
    if (auth.Authorization) Object.assign(headers, auth);
  } catch {
    /* 비회원 */
  }
  const res = await fetch(apiUrl(`/api/location/vmap/invite/${encodeURIComponent(token)}`), {
    headers
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error, code: data.code };
  return { ok: true, ...data };
}

/** 초대 토큰으로 방 입장 */
export async function acceptVmapInviteToken(token, displayName) {
  const res = await vlueAuthFetch(
    apiUrl(`/api/location/vmap/invite/${encodeURIComponent(token)}/accept`),
    {
      method: "POST",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ displayName })
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "방 입장 실패");
  return data;
}

/**
 * @param {{
 *   token?: string,
 *   roomId?: string,
 *   placeLabel?: string,
 *   inviterName?: string,
 *   etaMinutes?: number|null,
 *   lat?: number|null,
 *   lng?: number|null,
 *   placeLat?: number|null,
 *   placeLng?: number|null
 * }} opts
 */
export function buildVmapInviteMessage(opts = {}) {
  const sender = opts.inviterName || getInviteSenderName();
  const handle = getInviteSenderHandle();
  const who = handle && !opts.inviterName ? `${sender}(${handle})` : sender;
  const place = String(opts.placeLabel || "약속").trim() || "약속";
  const joinUrl = opts.token ? buildVmapInviteUrl(opts.token) : buildVmapJoinUrl(opts.roomId);
  const eta =
    Number.isFinite(opts.etaMinutes) && opts.etaMinutes >= 0
      ? `예상 도착(ETA): 약 ${Math.round(opts.etaMinutes)}분`
      : null;
  const live =
    Number.isFinite(opts.lat) && Number.isFinite(opts.lng)
      ? `실시간 좌표: ${Number(opts.lat).toFixed(5)}, ${Number(opts.lng).toFixed(5)}`
      : null;
  const dest =
    Number.isFinite(opts.placeLat) && Number.isFinite(opts.placeLng)
      ? `목적지 좌표: ${Number(opts.placeLat).toFixed(5)}, ${Number(opts.placeLng).toFixed(5)}`
      : null;

  return [
    `[V-Map 초대] ${who}님이 V-Map 목적지·경로를 공유했습니다.`,
    "",
    `목적지: ${place}`,
    eta,
    dest,
    live,
    "",
    "아래 링크로 VLUÉ 앱에서 바로 입장·동기화하세요.",
    joinUrl,
    "",
    "비회원도 간편 가입 후 바로 입장 가능합니다!"
  ]
    .filter((line) => line != null && line !== "")
    .join("\n");
}

function buildFeedDescription(opts = {}) {
  const parts = [];
  const place = String(opts.placeLabel || "약속").trim() || "약속";
  parts.push(`목적지: ${place}`);
  if (Number.isFinite(opts.etaMinutes) && opts.etaMinutes >= 0) {
    parts.push(`예상 도착 약 ${Math.round(opts.etaMinutes)}분`);
  }
  if (Number.isFinite(opts.placeLat) && Number.isFinite(opts.placeLng)) {
    parts.push(`${Number(opts.placeLat).toFixed(5)}, ${Number(opts.placeLng).toFixed(5)}`);
  }
  parts.push("버튼을 눌러 VLUÉ에서 위치를 확인하세요.");
  return parts.join(" · ").slice(0, 200);
}

/**
 * 카카오톡으로 V-Map 초대 공유 (토큰 자동 발급 + Feed 리치 카드)
 * @param {{
 *   roomId: string,
 *   placeLabel?: string,
 *   etaMinutes?: number|null,
 *   lat?: number|null,
 *   lng?: number|null,
 *   placeLat?: number|null,
 *   placeLng?: number|null,
 *   onToast?: (m: string) => void
 * }} opts
 */
export async function shareVmapInviteViaKakao(opts = {}) {
  let tokenData;
  try {
    tokenData = await createVmapInviteToken(opts.roomId);
  } catch (e) {
    opts.onToast?.(e?.message || "초대 토큰 생성에 실패했습니다.");
    return { ok: false, error: e?.message || "token_failed" };
  }

  const placeLabel = String(opts.placeLabel || tokenData.placeLabel || "약속").trim() || "약속";
  const placeLat = Number.isFinite(opts.placeLat)
    ? opts.placeLat
    : Number.isFinite(tokenData.placeLat)
      ? tokenData.placeLat
      : null;
  const placeLng = Number.isFinite(opts.placeLng)
    ? opts.placeLng
    : Number.isFinite(tokenData.placeLng)
      ? tokenData.placeLng
      : null;
  const linkUrl = buildVmapInviteUrl(tokenData.token);
  const imageUrl = buildVmapShareImageUrl(placeLat, placeLng);
  const inviter = tokenData.inviterName || getInviteSenderName();
  const text = buildVmapInviteMessage({
    token: tokenData.token,
    placeLabel,
    inviterName: inviter,
    etaMinutes: opts.etaMinutes,
    lat: opts.lat,
    lng: opts.lng,
    placeLat,
    placeLng
  });

  /* 1. 카카오 Feed 템플릿 우선 (썸네일·목적지·버튼) */
  let Kakao;
  try {
    Kakao = await ensureKakaoSdk();
  } catch (e) {
    Kakao = null;
    if (import.meta.env.DEV) console.warn("[vmap kakao sdk]", e?.message || e);
  }

  if (Kakao?.Share?.sendDefault) {
    try {
      const link = { mobileWebUrl: linkUrl, webUrl: linkUrl };
      await new Promise((resolve, reject) => {
        let settled = false;
        const done = (err) => {
          if (settled) return;
          settled = true;
          if (err) reject(err);
          else resolve();
        };
        try {
          Kakao.Share.sendDefault({
            objectType: "feed",
            content: {
              title: `${inviter}님의 V-Map 초대`,
              description: buildFeedDescription({
                placeLabel,
                etaMinutes: opts.etaMinutes,
                placeLat,
                placeLng
              }),
              imageUrl,
              imageWidth: FEED_IMAGE_W,
              imageHeight: FEED_IMAGE_H,
              link
            },
            buttons: [{ title: "위치 확인하기", link }],
            installTalk: true,
            callback: () => done()
          });
          window.setTimeout(() => done(), 800);
        } catch (err) {
          done(err);
        }
      });
      opts.onToast?.("카카오톡으로 목적지 초대가 공유되었습니다.");
      return { ok: true, channel: "kakao_feed", token: tokenData.token, linkUrl, imageUrl };
    } catch (e) {
      if (e?.name === "AbortError") return { ok: false, cancelled: true };
      if (import.meta.env.DEV) console.warn("[vmap kakao feed]", e);
      /* fallback below */
    }
  }

  /* 2. Web Share API */
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: "V-Map 초대",
        text: text.slice(0, 200),
        url: linkUrl
      });
      opts.onToast?.("초대가 공유되었습니다.");
      return { ok: true, channel: "web_share", token: tokenData.token, linkUrl };
    } catch (e) {
      if (e?.name === "AbortError") return { ok: false, cancelled: true };
    }
  }

  /* 3. 클립보드 fallback */
  try {
    await navigator.clipboard?.writeText?.(text);
    opts.onToast?.(
      "초대 링크가 복사되었습니다. 카카오톡에 붙여넣어 보내 주세요. (카카오 JS 키·웹 도메인 등록을 확인하면 카드 공유가 가능합니다.)"
    );
    return { ok: true, channel: "clipboard", token: tokenData.token, linkUrl };
  } catch {
    opts.onToast?.("공유에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    return { ok: false, error: "share_failed" };
  }
}

/**
 * @deprecated 전화번호부 기반 SMS 초대는 더 이상 사용하지 않습니다.
 */
export async function shareVmapInviteViaSms(opts = {}) {
  console.warn("[vmap] SMS 초대는 deprecated 되었습니다. shareVmapInviteViaKakao를 사용하세요.");
  return shareVmapInviteViaKakao(opts);
}
