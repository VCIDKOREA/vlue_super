import { ensureKakaoSdk } from "./kakaoSocialLogin.js";
import { getInviteSenderName, getInviteSenderHandle } from "./contactInviteShare.js";
import { getVlueViralLinks } from "./vlueViralLinks.js";

const FALLBACK_APP = "https://www.vlue.kr/app";

/** V-Map 방 입장 딥링크 */
export function buildVmapJoinUrl(roomId) {
  const id = String(roomId || "").trim();
  if (!id) return FALLBACK_APP;
  const viral = getVlueViralLinks();
  const base = String(viral?.landing || "").replace(/\/$/, "") || "https://www.vlue.kr";
  return `${base}/app?vmapJoin=${encodeURIComponent(id)}`;
}

/**
 * @param {{ roomId: string, placeLabel?: string, inviteeName?: string, omitInvitee?: boolean }} opts
 */
export function buildVmapInviteMessage(opts = {}) {
  const sender = getInviteSenderName();
  const handle = getInviteSenderHandle();
  const who = handle ? `${sender}(${handle})` : sender;
  const place = String(opts.placeLabel || "약속").trim() || "약속";
  const joinUrl = buildVmapJoinUrl(opts.roomId);
  const omit = Boolean(opts.omitInvitee) || !String(opts.inviteeName || "").trim();
  const headline = omit
    ? `[V-Map 초대] ${who}님이 V-Map 약속에 초대했습니다.`
    : `[V-Map 초대] ${who}님이 ${String(opts.inviteeName).trim()}님을 V-Map 약속에 초대했습니다.`;

  return [
    headline,
    "",
    `목적지: ${place}`,
    "",
    "아래 링크로 VLUÉ 앱에서 바로 입장하세요.",
    joinUrl,
    "",
    "앱이 없으면 먼저 설치해 주세요: https://www.vlue.kr/download"
  ].join("\n");
}

function toSmsPhone(phoneE164) {
  const d = String(phoneE164 || "").replace(/\D/g, "");
  if (d.startsWith("82") && d.length >= 10) return `0${d.slice(2)}`;
  if (d.startsWith("0")) return d;
  return phoneE164 || "";
}

/**
 * @param {{ roomId: string, placeLabel?: string, phoneE164?: string, inviteeName?: string, omitInvitee?: boolean, onToast?: (m: string) => void }} opts
 */
export async function shareVmapInviteViaSms(opts = {}) {
  const text = buildVmapInviteMessage(opts);
  const smsPhone = toSmsPhone(opts.phoneE164);
  const smsBody = encodeURIComponent(text);
  if (smsPhone) {
    const href = /iPhone|iPad|iPod/i.test(navigator.userAgent || "")
      ? `sms:${smsPhone}&body=${smsBody}`
      : `sms:${smsPhone}?body=${smsBody}`;
    window.location.href = href;
    opts.onToast?.("문자 앱으로 이동합니다.");
    return { ok: true, channel: "sms" };
  }
  try {
    await navigator.clipboard?.writeText?.(text);
  } catch {
    /* ignore */
  }
  try {
    window.location.href = /iPhone|iPad|iPod/i.test(navigator.userAgent || "")
      ? `sms:&body=${smsBody}`
      : `sms:?body=${smsBody}`;
  } catch {
    /* ignore */
  }
  opts.onToast?.("초대 문구가 복사되었습니다. 문자에 붙여넣어 보내 주세요.");
  return { ok: true, channel: "sms_clipboard" };
}

/**
 * @param {{ roomId: string, placeLabel?: string, inviteeName?: string, omitInvitee?: boolean, onToast?: (m: string) => void }} opts
 */
export async function shareVmapInviteViaKakao(opts = {}) {
  const text = buildVmapInviteMessage({ ...opts, omitInvitee: true });
  const linkUrl = buildVmapJoinUrl(opts.roomId);
  let Kakao;
  try {
    Kakao = await ensureKakaoSdk();
  } catch (e) {
    try {
      await navigator.clipboard?.writeText?.(text);
      opts.onToast?.("초대 문구를 복사했습니다. 카카오톡에 붙여넣어 보내 주세요.");
      return { ok: true, channel: "clipboard", error: e?.message };
    } catch {
      return { ok: false, error: e?.message || "kakao_sdk" };
    }
  }
  if (!Kakao?.Share?.sendDefault) {
    try {
      await navigator.clipboard?.writeText?.(text);
      opts.onToast?.("초대 문구를 복사했습니다.");
      return { ok: true, channel: "clipboard" };
    } catch {
      return { ok: false, error: "no_share_api" };
    }
  }
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
    return { ok: true, channel: "kakao_share" };
  } catch (e) {
    if (e?.name === "AbortError") return { ok: false, cancelled: true };
    try {
      await navigator.clipboard?.writeText?.(text);
      opts.onToast?.("초대 문구를 복사했습니다.");
      return { ok: true, channel: "clipboard" };
    } catch {
      return { ok: false, error: e?.message || "share_failed" };
    }
  }
}
