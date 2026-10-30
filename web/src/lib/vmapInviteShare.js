import { ensureKakaoSdk } from "./kakaoSocialLogin.js";
import { getInviteSenderName, getInviteSenderHandle } from "./contactInviteShare.js";
import { getVlueViralLinks } from "./vlueViralLinks.js";
import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

const FALLBACK_APP = "https://www.vlue.kr/app";

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

/** 초대 토큰 발급 API 호출 */
export async function createVmapInviteToken(roomId) {
  const res = await vlueAuthFetch(apiUrl(`/api/location/vmap/${roomId}/invite-token`), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "초대 토큰 생성 실패");
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
  const res = await fetch(apiUrl(`/api/location/vmap/invite/${token}`), { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error, code: data.code };
  return { ok: true, ...data };
}

/** 초대 토큰으로 방 입장 */
export async function acceptVmapInviteToken(token, displayName) {
  const res = await vlueAuthFetch(apiUrl(`/api/location/vmap/invite/${token}/accept`), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ displayName })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "방 입장 실패");
  return data;
}

/**
 * @param {{ token?: string, roomId?: string, placeLabel?: string, inviterName?: string }} opts
 */
export function buildVmapInviteMessage(opts = {}) {
  const sender = opts.inviterName || getInviteSenderName();
  const handle = getInviteSenderHandle();
  const who = handle && !opts.inviterName ? `${sender}(${handle})` : sender;
  const place = String(opts.placeLabel || "약속").trim() || "약속";
  /* 토큰 기반 URL 우선, 없으면 roomId 기반 */
  const joinUrl = opts.token ? buildVmapInviteUrl(opts.token) : buildVmapJoinUrl(opts.roomId);

  return [
    `[V-Map 초대] ${who}님이 V-Map 약속에 초대했습니다.`,
    "",
    `목적지: ${place}`,
    "",
    "아래 링크로 VLUÉ 앱에서 바로 입장하세요.",
    joinUrl,
    "",
    "비회원도 간편 가입 후 바로 입장 가능합니다!"
  ].join("\n");
}

/**
 * 카카오톡으로 V-Map 초대 공유 (토큰 자동 발급)
 * @param {{ roomId: string, placeLabel?: string, onToast?: (m: string) => void }} opts
 */
export async function shareVmapInviteViaKakao(opts = {}) {
  /* 1. 초대 토큰 발급 */
  let tokenData;
  try {
    tokenData = await createVmapInviteToken(opts.roomId);
  } catch (e) {
    opts.onToast?.(e?.message || "초대 토큰 생성에 실패했습니다.");
    return { ok: false, error: e?.message || "token_failed" };
  }

  const text = buildVmapInviteMessage({
    token: tokenData.token,
    placeLabel: opts.placeLabel || tokenData.placeLabel,
    inviterName: tokenData.inviterName
  });
  const linkUrl = buildVmapInviteUrl(tokenData.token);

  /* 2. Web Share API 시도 (모바일 우선) */
  if (navigator.share) {
    try {
      await navigator.share({
        title: "V-Map 초대",
        text: text.slice(0, 200),
        url: linkUrl
      });
      opts.onToast?.("초대가 공유되었습니다.");
      return { ok: true, channel: "web_share", token: tokenData.token };
    } catch (e) {
      if (e?.name === "AbortError") return { ok: false, cancelled: true };
      /* Web Share 실패 시 카카오 SDK fallback */
    }
  }

  /* 3. 카카오 SDK 시도 */
  let Kakao;
  try {
    Kakao = await ensureKakaoSdk();
  } catch {
    Kakao = null;
  }

  if (Kakao?.Share?.sendDefault) {
    try {
      await new Promise((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        Kakao.Share.sendDefault({
          objectType: "text",
          text: text.slice(0, 200),
          link: { mobileWebUrl: linkUrl, webUrl: linkUrl },
          buttonTitle: "V-Map 입장",
          installTalk: true,
          callback: () => done()
        });
        window.setTimeout(() => done(), 600);
      });
      opts.onToast?.("카카오톡 초대가 공유되었습니다.");
      return { ok: true, channel: "kakao_share", token: tokenData.token };
    } catch (e) {
      if (e?.name === "AbortError") return { ok: false, cancelled: true };
      /* 카카오 실패 시 클립보드 fallback */
    }
  }

  /* 4. 클립보드 fallback */
  try {
    await navigator.clipboard?.writeText?.(text);
    opts.onToast?.("초대 링크가 복사되었습니다. 카카오톡에 붙여넣어 보내 주세요.");
    return { ok: true, channel: "clipboard", token: tokenData.token };
  } catch {
    return { ok: false, error: "share_failed" };
  }
}

/**
 * @deprecated 전화번호부 기반 SMS 초대는 더 이상 사용하지 않습니다.
 * 카카오 공유로 단일화되었습니다.
 */
export async function shareVmapInviteViaSms(opts = {}) {
  console.warn("[vmap] SMS 초대는 deprecated 되었습니다. shareVmapInviteViaKakao를 사용하세요.");
  return shareVmapInviteViaKakao(opts);
}
