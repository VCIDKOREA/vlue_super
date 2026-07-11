const VLUE_DOWNLOAD_URL = "https://www.vlue.kr/download";
const VLUE_HOME_URL = "https://www.vlue.kr";

export function getInviteSenderName() {
  try {
    return (
      localStorage.getItem("vlue_legal_name")?.trim() ||
      localStorage.getItem("myCardDisplayName")?.trim() ||
      localStorage.getItem("vlue_member_handle")?.replace(/^@/, "") ||
      "VLUE 회원"
    );
  } catch {
    return "VLUE 회원";
  }
}

export function getInviteSenderHandle() {
  try {
    const h = String(localStorage.getItem("vlue_member_handle") || "").trim();
    if (!h) return "";
    return h.startsWith("@") ? h : `@${h}`;
  } catch {
    return "";
  }
}

/**
 * VLUE 추천(초대) 공유 본문 템플릿
 * @param {string} [inviteeName]
 */
export function buildVlueInviteMessage(inviteeName) {
  const sender = getInviteSenderName();
  const handle = getInviteSenderHandle();
  const who = handle ? `${sender}(${handle})` : sender;
  const target = inviteeName?.trim() ? `${inviteeName.trim()}님` : "지인분";

  return [
    `[VLUE 추천] ${who}님이 ${target}을 VLUE로 초대했습니다.`,
    "",
    "VLUE는 통화 신원 확인·블루 쇼케이스·디지털 인증명함·가족보호로",
    "보이스피싱·기관 사칭을 줄이는 신뢰 플랫폼입니다.",
    "",
    "· 앱 설치: " + VLUE_DOWNLOAD_URL,
    "· 웹: " + VLUE_HOME_URL,
    "",
    "지금 가입하고 안전한 소통을 시작해 보세요."
  ].join("\n");
}

export function buildVlueInviteShareTitle() {
  const sender = getInviteSenderName();
  return `${sender}님이 VLUE로 초대합니다`;
}

function toSmsPhone(phoneE164) {
  const d = String(phoneE164 || "").replace(/\D/g, "");
  if (d.startsWith("82") && d.length >= 10) return `0${d.slice(2)}`;
  if (d.startsWith("0")) return d;
  return phoneE164 || "";
}

async function copyInviteToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

/**
 * 미가입 연락처 추천 — 휴대폰 공유창(카톡·문자 등) · SMS · 클립보드 폴백
 * @param {{ inviteeName?: string, phoneE164?: string }} opts
 */
export async function shareVlueContactInvite(opts = {}) {
  const { inviteeName, phoneE164 } = opts;
  const text = buildVlueInviteMessage(inviteeName);
  const title = buildVlueInviteShareTitle();

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      const payload = { title, text, url: VLUE_DOWNLOAD_URL };
      if (navigator.canShare && !navigator.canShare(payload)) {
        await navigator.share({ title, text });
      } else {
        await navigator.share(payload);
      }
      return { ok: true, channel: "share" };
    } catch (err) {
      if (err?.name === "AbortError") return { ok: false, cancelled: true };
    }
  }

  const smsPhone = toSmsPhone(phoneE164);
  const smsBody = encodeURIComponent(text);
  if (smsPhone) {
    const href =
      /iPhone|iPad|iPod/i.test(navigator.userAgent || "")
        ? `sms:${smsPhone}&body=${smsBody}`
        : `sms:${smsPhone}?body=${smsBody}`;
    window.location.href = href;
    return { ok: true, channel: "sms" };
  }

  const copied = await copyInviteToClipboard(text);
  if (copied) {
    window.alert("추천 문구가 복사되었습니다.\n카카오톡·문자 등 공유 앱에 붙여넣어 보내 주세요.");
    return { ok: true, channel: "clipboard" };
  }

  window.prompt("아래 추천 문구를 복사해 카톡·문자로 보내 주세요.", text);
  return { ok: true, channel: "prompt" };
}
