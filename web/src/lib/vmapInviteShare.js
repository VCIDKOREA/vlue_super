import { ensureKakaoSdk } from "./kakaoSocialLogin.js";
import { getInviteSenderName, getInviteSenderHandle } from "./contactInviteShare.js";
import { getVlueViralLinks } from "./vlueViralLinks.js";
import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

const FALLBACK_APP = "https://www.vlue.kr/app";
/** 카카오 Feed 썸네일 — OSM 등은 스크래퍼 차단으로 카드에 안 뜸. 반드시 vlue.kr HTTPS */
const FALLBACK_THUMB = "https://www.vlue.kr/vlue-eye-closed-icon.png";
const FEED_IMAGE_W = 800;
const FEED_IMAGE_H = 400;
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;
export const VMAP_PENDING_INVITE_KEY = "vlue_pending_vmap_invite";

/** 앱 커스텀 스킴 — 설치 사용자 즉시 오픈 */
export function buildVmapAppDeepLink(token, extra = {}) {
  const t = String(token || "").trim();
  if (!t) return "vlue://vmap";
  const q = new URLSearchParams();
  q.set("inviteToken", t);
  q.set("vmapInvite", t);
  q.set("target", "vmap");
  const roomId = String(extra.roomId || "").trim();
  const placeLabel = String(extra.placeLabel || "").trim();
  if (roomId) q.set("roomId", roomId);
  if (placeLabel) q.set("placeLabel", placeLabel);
  if (Number.isFinite(extra.placeLat)) q.set("placeLat", String(extra.placeLat));
  if (Number.isFinite(extra.placeLng)) q.set("placeLng", String(extra.placeLng));
  return `vlue://vmap?${q.toString()}`;
}

/** 카카오 android/iosExecutionParams (쿼리스트링, ? 없이) */
export function buildVmapKakaoExecutionParams(token, extra = {}) {
  const t = String(token || "").trim();
  if (!t) return "";
  const q = new URLSearchParams();
  q.set("inviteToken", t);
  q.set("vmapInvite", t);
  q.set("target", "vmap");
  const roomId = String(extra.roomId || "").trim();
  const placeLabel = String(extra.placeLabel || "").trim();
  if (roomId) q.set("roomId", roomId);
  if (placeLabel) q.set("placeLabel", placeLabel);
  if (Number.isFinite(extra.placeLat)) q.set("placeLat", String(extra.placeLat));
  if (Number.isFinite(extra.placeLng)) q.set("placeLng", String(extra.placeLng));
  return q.toString();
}

/**
 * 카카오 mobileWebUrl — /app 이 아니라 브리지(/invite/vmap).
 * 카톡 인앱 브라우저가 /app 을 열면 '앱 전용' 차단 페이지만 보이므로,
 * intent://vlue 로 앱을 먼저 띄우는 핸드오프 페이지를 쓴다.
 */
export function buildVmapInviteUrl(token) {
  const t = String(token || "").trim();
  const viral = getVlueViralLinks();
  const base = String(viral?.landing || "").replace(/\/$/, "") || "https://www.vlue.kr";
  if (!t) return `${base}/invite/vmap`;
  return `${base}/invite/vmap?vmapInvite=${encodeURIComponent(t)}`;
}

/** 네이티브 셸(/app) 직접 진입용 — Android WebView 등 */
export function buildVmapInviteAppShellUrl(token) {
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

/**
 * 카카오 Feed imageUrl — 목적지 Static Map (api.vlue.kr 프록시).
 * 좌표 없거나 생성 불가 시 브랜딩 로고 Fallback.
 */
export function buildVmapShareImageUrl(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return FALLBACK_THUMB;
  if (Math.abs(la) > 90 || Math.abs(ln) > 180) return FALLBACK_THUMB;
  /* 카카오 스크래퍼는 등록된 공개 HTTPS 만 안정적으로 가져옴 */
  const q = new URLSearchParams({
    lat: la.toFixed(5),
    lng: ln.toFixed(5),
    w: String(FEED_IMAGE_W),
    h: String(FEED_IMAGE_H),
    t: String(Date.now())
  });
  return `https://api.vlue.kr/api/location/static-map?${q.toString()}`;
}

function pickKakaoHostedImageUrl(res) {
  return String(
    res?.infos?.original?.url ||
      res?.infos?.[0]?.url ||
      res?.infos?.url ||
      res?.url ||
      ""
  ).trim();
}

/**
 * Static Map URL → 카카오 CDN 업로드/스크랩. 실패 시 FALLBACK_THUMB.
 */
async function resolveVmapShareImageUrl(Kakao, lat, lng) {
  const candidate = buildVmapShareImageUrl(lat, lng);
  if (!candidate || candidate === FALLBACK_THUMB) return FALLBACK_THUMB;

  if (typeof Kakao?.Share?.uploadImage === "function") {
    try {
      const fetched = await fetch(candidate, { mode: "cors", credentials: "omit" });
      if (fetched.ok) {
        const blob = await fetched.blob();
        if (blob && blob.size > 32) {
          const type = blob.type || "image/png";
          const ext = /png/i.test(type) ? "png" : /webp/i.test(type) ? "webp" : "jpg";
          const file = new File([blob], `vmap-map.${ext}`, { type });
          const uploaded = await Kakao.Share.uploadImage({ file: [file] });
          const hosted = pickKakaoHostedImageUrl(uploaded);
          if (hosted && /^https:\/\//i.test(hosted)) return hosted;
        }
      }
    } catch {
      /* scrapImage 폴백 */
    }
  }

  if (typeof Kakao?.Share?.scrapImage === "function") {
    try {
      const scraped = await Kakao.Share.scrapImage({ imageUrl: candidate });
      const hosted = pickKakaoHostedImageUrl(scraped);
      if (hosted && /^https:\/\//i.test(hosted)) return hosted;
    } catch {
      /* fallback */
    }
  }

  /* 카카오 CDN 실패여도 좌표 지도 URL을 그대로 씀 — 로고는 좌표 없을 때만 */
  return candidate;
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

function isLocalDevOrigin(origin) {
  const o = String(origin || "").toLowerCase();
  return (
    o.includes("localhost") ||
    o.includes("127.0.0.1") ||
    o.includes("0.0.0.0") ||
    /^https?:\/\/192\.168\./.test(o) ||
    /^https?:\/\/10\./.test(o)
  );
}

function kakaoShareOriginBlockedMessage() {
  const origin =
    typeof window !== "undefined" ? String(window.location?.origin || "").replace(/\/$/, "") : "";
  const allowLocal = String(import.meta.env.VITE_KAKAO_ALLOW_LOCAL || "").trim() === "1";
  if (allowLocal) return "";
  if (!isLocalDevOrigin(origin)) return "";
  return (
    `로컬(${origin || "localhost"})에서는 카카오 공유 인증이 실패합니다. ` +
    `https://www.vlue.kr/app 에서 보내거나, 카카오 개발자 콘솔 → 앱 → 플랫폼(Web)에 「${origin || "http://localhost:5173"}」 도메인을 등록하세요.`
  );
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(`${label} 시간이 초과되었습니다.`)), ms);
    Promise.resolve(promise).then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      }
    );
  });
}

/** 준비된 초대 토큰이 곧 만료되는지 */
export function isVmapKakaoInviteStale(prepared) {
  if (!prepared?.ok || !prepared?.expiresAt) return true;
  const exp = Date.parse(prepared.expiresAt);
  if (!Number.isFinite(exp)) return true;
  return exp - Date.now() < TOKEN_REFRESH_MARGIN_MS;
}

/**
 * 토큰·SDK·Feed 페이로드를 미리 준비.
 * 클릭 핸들러에서는 openPreparedVmapKakaoInviteShare 만 동기 호출해야 친구 선택 창이 열림.
 *
 * @param {{
 *   roomId: string,
 *   placeLabel?: string,
 *   etaMinutes?: number|null,
 *   lat?: number|null,
 *   lng?: number|null,
 *   placeLat?: number|null,
 *   placeLng?: number|null
 * }} opts
 */
export async function prepareVmapKakaoInviteShare(opts = {}) {
  const roomId = String(opts.roomId || "").trim();
  if (!roomId) {
    return { ok: false, error: "V-Map 방이 없습니다. 목적지를 먼저 설정해 주세요." };
  }

  const originBlock = kakaoShareOriginBlockedMessage();
  if (originBlock) {
    return { ok: false, error: originBlock };
  }

  let tokenData;
  try {
    tokenData = await withTimeout(createVmapInviteToken(roomId), 12_000, "초대 토큰 발급");
  } catch (e) {
    return {
      ok: false,
      error: e?.message || "초대 토큰 생성에 실패했습니다."
    };
  }

  let Kakao;
  try {
    Kakao = await withTimeout(ensureKakaoSdk(), 8_000, "카카오 SDK 로드");
  } catch (e) {
    const raw = String(e?.message || "");
    return {
      ok: false,
      error: /키|KEY|설정/i.test(raw)
        ? "카카오톡 공유를 사용할 수 없습니다. (공유 키 미설정)"
        : raw || "카카오 SDK를 불러오지 못했습니다."
    };
  }

  if (!Kakao?.Share?.sendDefault) {
    return { ok: false, error: "카카오 Share API를 사용할 수 없습니다." };
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
  let imageUrl = buildVmapShareImageUrl(placeLat, placeLng);
  try {
    const resolved = await withTimeout(
      resolveVmapShareImageUrl(Kakao, placeLat, placeLng),
      10_000,
      "지도 썸네일 생성"
    );
    if (resolved && /^https:\/\//i.test(resolved)) imageUrl = resolved;
  } catch {
    /* 좌표 지도 URL 유지 */
  }
  if (!imageUrl || !/^https:\/\//i.test(imageUrl)) {
    imageUrl = FALLBACK_THUMB;
  }
  const inviter = tokenData.inviterName || getInviteSenderName();
  const execParams = buildVmapKakaoExecutionParams(tokenData.token, {
    roomId: tokenData.roomId || roomId,
    placeLabel,
    placeLat,
    placeLng
  });
  /* androidExecutionParams → 카카오가 등록된 앱을 kakaolink 로 기동. 실패 시 mobileWebUrl 브리지 */
  const link = {
    mobileWebUrl: linkUrl,
    webUrl: linkUrl,
    androidExecutionParams: execParams,
    iosExecutionParams: execParams
  };

  if (!imageUrl || !/^https:\/\//i.test(imageUrl)) {
    return { ok: false, error: "카카오 공유 썸네일(imageUrl)을 준비하지 못했습니다." };
  }

  const payload = {
    objectType: "feed",
    content: {
      title: "VLUÉ 위치/목적지 초대",
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
    buttons: [{ title: "위치/초대 확인하기", link }],
    installTalk: true
  };

  return {
    ok: true,
    payload,
    token: tokenData.token,
    linkUrl,
    imageUrl,
    placeLabel,
    inviterName: inviter,
    expiresAt: tokenData.expiresAt || null,
    roomId
  };
}

/**
 * 클릭 핸들러에서 await 없이 호출. 준비된 Feed로 카톡 친구 선택 창만 연다.
 * @returns {{ ok: boolean, cancelled?: boolean, error?: string, channel?: string, token?: string, linkUrl?: string }}
 */
export function openPreparedVmapKakaoInviteShare(prepared) {
  if (!prepared?.ok || !prepared?.payload) {
    return { ok: false, error: prepared?.error || "카카오 초대 공유 준비가 되지 않았습니다." };
  }
  if (isVmapKakaoInviteStale(prepared)) {
    return {
      ok: false,
      error: "초대 링크가 만료되었습니다. 잠시 후 다시 눌러 주세요."
    };
  }
  const Kakao = typeof window !== "undefined" ? window.Kakao : null;
  if (!Kakao) {
    return {
      ok: false,
      error: "카카오 SDK가 초기화되지 않았습니다. 앱을 다시 실행한 뒤 초대해 주세요."
    };
  }
  if (!Kakao.isInitialized?.()) {
    return {
      ok: false,
      error: "카카오 SDK 키가 맞지 않거나 미초기화 상태입니다. (Key Mismatch)"
    };
  }
  if (!Kakao?.Share?.sendDefault) {
    return { ok: false, error: "카카오 Share API를 사용할 수 없습니다." };
  }
  try {
    if (import.meta.env.DEV) {
      console.info("[vmap kakao share]", {
        imageUrl: prepared.payload?.content?.imageUrl,
        mobileWebUrl: prepared.payload?.content?.link?.mobileWebUrl,
        androidExecutionParams: prepared.payload?.content?.link?.androidExecutionParams
      });
    }
    Kakao.Share.sendDefault(prepared.payload);
    return {
      ok: true,
      channel: "kakao_feed",
      token: prepared.token,
      linkUrl: prepared.linkUrl,
      imageUrl: prepared.imageUrl
    };
  } catch (err) {
    const msg =
      err?.error_msg ||
      err?.message ||
      (typeof err === "string" ? err : "") ||
      "카카오톡 공유를 완료하지 못했습니다.";
    console.warn("[vmap kakao share failed]", err);
    if (/cancel|취소|abort|focus/i.test(msg)) {
      return {
        ok: false,
        error:
          "카카오톡 공유 창을 열지 못했습니다. 팝업 차단을 해제한 뒤, 버튼을 다시 눌러 주세요."
      };
    }
    if (/인증|invalid request|잘못된 요청|KOE|key|키/i.test(msg)) {
      return {
        ok: false,
        error:
          "카카오 공유 인증에 실패했습니다. JS 키·Web 도메인(www.vlue.kr)·Android 패키지(kr.vlue.app) 등록을 확인해 주세요."
      };
    }
    return { ok: false, error: msg };
  }
}

/**
 * @deprecated 클릭 직후 긴 await 때문에 카톡 창이 막힐 수 있음.
 * UI는 prepareVmapKakaoInviteShare + openPreparedVmapKakaoInviteShare 를 사용하세요.
 */
export async function shareVmapInviteViaKakao(opts = {}) {
  const prepared = await prepareVmapKakaoInviteShare(opts);
  if (!prepared.ok) {
    opts.onToast?.(prepared.error || "초대 준비에 실패했습니다.");
    return { ok: false, error: prepared.error || "prepare_failed" };
  }
  const opened = openPreparedVmapKakaoInviteShare(prepared);
  if (!opened.ok) {
    opts.onToast?.(opened.error || "카카오톡 공유 창을 열지 못했습니다.");
    return opened;
  }
  opts.onToast?.("카카오톡 친구 선택 창을 열었습니다.");
  return opened;
}

/**
 * @deprecated 전화번호부 기반 SMS 초대는 더 이상 사용하지 않습니다.
 */
export async function shareVmapInviteViaSms(opts = {}) {
  console.warn("[vmap] SMS 초대는 deprecated 되었습니다. shareVmapInviteViaKakao를 사용하세요.");
  return shareVmapInviteViaKakao(opts);
}
