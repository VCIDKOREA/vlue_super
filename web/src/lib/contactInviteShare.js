const VLUE_DOWNLOAD_URL = "https://www.vlue.kr";

export function getInviteSenderName() {
  try {
    return (
      localStorage.getItem("vlue_legal_name")?.trim() ||
      localStorage.getItem("vlue_member_handle")?.replace(/^@/, "") ||
      "VLUE 회원"
    );
  } catch {
    return "VLUE 회원";
  }
}

/** @param {string} [inviteeName] */
export function buildVlueInviteMessage(inviteeName) {
  const sender = getInviteSenderName();
  const target = inviteeName?.trim() ? `${inviteeName.trim()}님` : "대표님";
  return `${sender}님이 ${target}을 VLUE 비즈니스 인증 메일톡에 초대했습니다. 가짜 메일과 피싱 없는 안전한 소통을 시작해 보세요! 앱 다운로드: ${VLUE_DOWNLOAD_URL}`;
}

function toSmsPhone(phoneE164) {
  const d = String(phoneE164 || "").replace(/\D/g, "");
  if (d.startsWith("82") && d.length >= 10) return `0${d.slice(2)}`;
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
 * 미가입 연락처 초대 — Web Share · SMS · 클립보드 폴백
 * @param {{ inviteeName?: string, phoneE164?: string }} opts
 */
export async function shareVlueContactInvite(opts = {}) {
  const { inviteeName, phoneE164 } = opts;
  const text = buildVlueInviteMessage(inviteeName);

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: "VLUE 비즈니스 메일톡 초대",
        text,
        url: VLUE_DOWNLOAD_URL
      });
      return { ok: true, channel: "share" };
    } catch (err) {
      if (err?.name === "AbortError") return { ok: false, cancelled: true };
    }
  }

  const smsPhone = toSmsPhone(phoneE164);
  const smsBody = encodeURIComponent(text);
  if (smsPhone) {
    window.location.href = `sms:${smsPhone}?body=${smsBody}`;
    return { ok: true, channel: "sms" };
  }

  const copied = await copyInviteToClipboard(text);
  if (copied) {
    window.alert("초대 문구가 복사되었습니다.\n카카오톡·문자 앱에 붙여넣어 보내 주세요.");
    return { ok: true, channel: "clipboard" };
  }

  window.prompt("아래 초대 문구를 복사해 보내 주세요.", text);
  return { ok: true, channel: "prompt" };
}
