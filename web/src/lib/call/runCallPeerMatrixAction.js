/**
 * 통화 목록·재생 — 매트릭스 CTA 실행
 */

import { CALL_PEER_CTA } from "./callPeerMatrix.js";
import { scrapShowcaseToVault } from "../showcase/scrapShowcaseToVault.js";
import { saveProfileToDeviceContacts } from "../contactVcfSave.js";
import { shareShowcaseInviteViaKakao } from "./shareShowcaseInviteKakao.js";
import { readShowcaseStyle } from "../showcase/showcaseStyleStorage.js";

/**
 * @param {{
 *   matrix: ReturnType<import('./callPeerMatrix.js').resolveCallPeerMatrixSync>,
 *   card: object,
 *   phone?: string,
 *   onToast?: (msg: string) => void
 * }} args
 */
export async function runCallPeerMatrixAction({ matrix, card, phone, onToast }) {
  if (!matrix || matrix.cta === CALL_PEER_CTA.NONE) {
    return { ok: false, skipped: true };
  }

  const peerPhone = phone || card?.phone || matrix.phone;
  const toast = (msg) => onToast?.(msg);

  if (matrix.cta === CALL_PEER_CTA.KAKAO_SHARE) {
    return shareShowcaseInviteViaKakao({
      inviteeName: matrix.contactName || card?.name,
      phone: peerPhone,
      onToast: toast
    });
  }

  if (matrix.cta === CALL_PEER_CTA.SAVE_CONTACTS_AND_VAULT) {
    const profile = {
      ...card,
      name: card?.name || card?.legalName || matrix.contactName,
      phone: peerPhone,
      fax: card?.fax,
      address: card?.address,
      email: card?.email
    };
    const contactResult = await saveProfileToDeviceContacts(profile);
    if (!contactResult?.ok && !contactResult?.cancelled) {
      toast(contactResult?.error || "주소록 저장에 실패했습니다.");
      return contactResult;
    }
    if (contactResult?.cancelled) return contactResult;

    scrapShowcaseToVault({
      card,
      showcaseStyle: card?.showcaseStyle || readShowcaseStyle(),
      phone: peerPhone
    });
    toast("주소록과 쇼케이스 보관함에 저장했습니다.");
    return { ok: true, channel: "contacts_and_vault" };
  }

  if (matrix.cta === CALL_PEER_CTA.SAVE_VAULT_ONLY) {
    scrapShowcaseToVault({
      card,
      showcaseStyle: card?.showcaseStyle || readShowcaseStyle(),
      phone: peerPhone
    });
    toast("쇼케이스 보관함에 담았습니다.");
    return { ok: true, channel: "vault" };
  }

  return { ok: false, skipped: true };
}
