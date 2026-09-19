/**
 * 통화 목록·재생 — 매트릭스 CTA 실행
 */

import { CALL_PEER_CTA } from "./callPeerMatrix.js";
import { shareShowcaseInviteViaKakao } from "./shareShowcaseInviteKakao.js";
import { shareVlueInviteViaSms } from "../contactInviteShare.js";
import { resolveCallHistoryShowcasePeer } from "../resolveCallHistoryShowcasePeer.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pickPeerUserId(card, call) {
  const candidates = [
    card?.userId,
    card?.ownerUserId,
    call?.userId,
    call?.ownerUserId,
    call?.cardSnapshot?.userId
  ];
  for (const c of candidates) {
    const id = String(c || "").trim();
    if (id && UUID_RE.test(id)) return id;
  }
  return "";
}

/**
 * @param {{
 *   matrix: ReturnType<import('./callPeerMatrix.js').resolveCallPeerMatrixSync>,
 *   card?: object,
 *   call?: object,
 *   phone?: string,
 *   shareChannel?: 'kakao'|'sms'|null,
 *   onToast?: (msg: string) => void,
 *   onBeforeNavigate?: () => void
 * }} args
 */
export async function runCallPeerMatrixAction({
  matrix,
  card,
  call = null,
  phone,
  shareChannel = null,
  onToast,
  onBeforeNavigate
}) {
  if (!matrix || matrix.cta === CALL_PEER_CTA.NONE) {
    return { ok: false, skipped: true };
  }

  const peerPhone = phone || card?.phone || matrix.phone;
  const toast = (msg) => onToast?.(msg);

  /* 하위 호환: 옛 kakao_share → share_showcase */
  const cta =
    matrix.cta === CALL_PEER_CTA.KAKAO_SHARE
      ? CALL_PEER_CTA.SHARE_SHOWCASE
      : matrix.cta === CALL_PEER_CTA.SAVE_VAULT_ONLY ||
          matrix.cta === CALL_PEER_CTA.SAVE_CONTACTS_AND_VAULT
        ? CALL_PEER_CTA.OPEN_CASE_ARCHIVE
        : matrix.cta;

  if (cta === CALL_PEER_CTA.SHARE_SHOWCASE) {
    if (!shareChannel) {
      return { ok: false, needsChannel: true };
    }
    /* 통화목록·전달: 상대 별명 넣지 않음 (카톡 피커에서 다른 사람을 고를 수 있음) */
    if (shareChannel === "kakao") {
      return shareShowcaseInviteViaKakao({
        inviteeName: "",
        omitInvitee: true,
        phone: peerPhone,
        onToast: toast
      });
    }
    if (shareChannel === "sms") {
      return shareVlueInviteViaSms({
        phoneE164: peerPhone,
        omitInvitee: true,
        onToast: toast
      });
    }
    return { ok: false, error: "unknown_channel" };
  }

  if (cta === CALL_PEER_CTA.OPEN_CASE_ARCHIVE) {
    let userId = pickPeerUserId(card, call);
    let handle = String(card?.publicHandle || call?.publicHandle || "").replace(/^@/, "").trim();
    let name = String(card?.name || call?.name || matrix.contactName || "").trim();

    if (!userId && peerPhone) {
      try {
        const payload = await resolveCallHistoryShowcasePeer(peerPhone);
        userId = pickPeerUserId(payload?.card, call);
        if (!handle) handle = String(payload?.card?.publicHandle || "").replace(/^@/, "").trim();
        if (!name) name = String(payload?.card?.name || "").trim();
      } catch {
        /* ignore */
      }
    }

    if (!userId) {
      toast("상대 케이스함을 열 수 없습니다. 잠시 후 다시 시도해 주세요.");
      return { ok: false, error: "no_user_id" };
    }

    try {
      onBeforeNavigate?.();
    } catch {
      /* ignore */
    }
    window.dispatchEvent(
      new CustomEvent("vlue-open-case-user", {
        detail: { userId, handle, name: name || "케이스함" }
      })
    );
    return { ok: true, channel: "case_archive" };
  }

  return { ok: false, skipped: true };
}
