/**
 * V1 통화·통화목록 — 정제된 규제 매트릭스
 *
 * 판별축: VLUE 회원 / 기기 주소록 / 앱 보관함(쇼케이스 스크랩)
 * 0.1초 내 동기 판별 → resolveCallPeerMatrixSync
 * 네이티브 주소록 갱신 → resolveCallPeerMatrix (async)
 */

import { isShowcaseScrapWalletItem, readCardWallet } from "../cardWalletStorage.js";
import { normalizePhoneDigits } from "../letteringPhoneMatch.js";
import {
  phonesMatchLoose,
  resolveIsKnownContact,
  resolveIsKnownContactSync
} from "../contacts/hybridKnownContact.js";
import { readDeviceContactsCache } from "../contacts/deviceContactsCache.js";
import { readContactMatchCache } from "../contactSyncStorage.js";

/** @typedef {'none'|'save_contacts_and_vault'|'save_vault_only'|'kakao_share'} CallPeerCta */

export const CALL_PEER_CTA = Object.freeze({
  NONE: "none",
  /** 회원 + 주소록 없음 + 보관함 없음 → 주소록+보관함 */
  SAVE_CONTACTS_AND_VAULT: "save_contacts_and_vault",
  /** 회원 + 주소록 있음 + 보관함 없음 → 보관함만 */
  SAVE_VAULT_ONLY: "save_vault_only",
  /** 미회원 + 주소록 있음 → 카톡 전달 */
  KAKAO_SHARE: "kakao_share"
});

const DEVICE_SOURCES = new Set(["device", "device_synced"]);

/**
 * 앱 보관함(개인 쇼케이스 스크랩)에 이미 있는지
 * @param {string} phone
 */
export function isInShowcaseVault(phone) {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return false;
  const wantId = `showcase-${digits}`;

  for (const item of readCardWallet()) {
    if (!isShowcaseScrapWalletItem(item)) continue;
    if (String(item.userId || "") === wantId) return true;
    const idDigits = String(item.userId || "").replace(/^showcase-/, "").replace(/\D/g, "");
    if (idDigits && (idDigits === digits || phonesMatchLoose(idDigits, digits))) return true;
    const snapPhone = item?.snapshot?.phone;
    if (snapPhone && phonesMatchLoose(snapPhone, phone)) return true;
  }
  return false;
}

/**
 * 기기 실제 전화번호부(및 동기화 미가입 연락처)만 — VLUE 친구 인덱스는 제외
 * @param {string} phone
 * @param {{ sources?: string[], matchedName?: string } | null} [knownHint]
 */
export function isInDeviceAddressBook(phone, knownHint = null) {
  const target = String(phone || "").trim();
  if (!target) return { inContacts: false, matchedName: "" };

  if (knownHint?.sources?.length) {
    const deviceSrc = knownHint.sources.filter((s) => DEVICE_SOURCES.has(s) || s === "device" || s === "device_synced");
    if (deviceSrc.length) {
      return { inContacts: true, matchedName: String(knownHint.matchedName || "").trim() };
    }
  }

  let matchedName = "";
  const device = readDeviceContactsCache();
  for (const c of device?.contacts || []) {
    if (!phonesMatchLoose(target, c.phone)) continue;
    matchedName = String(c.name || "").trim();
    return { inContacts: true, matchedName };
  }

  const cache = readContactMatchCache();
  for (const u of cache?.unregistered || []) {
    const p = u.phoneDisplay || u.phoneE164 || u.phone || "";
    if (!phonesMatchLoose(target, p)) continue;
    matchedName = String(u.contactName || u.name || "").trim();
    return { inContacts: true, matchedName };
  }

  return { inContacts: false, matchedName: "" };
}

/**
 * @param {{
 *   phone?: string,
 *   isVlueMember?: boolean,
 *   verified?: boolean,
 *   knownContact?: { isKnownContact?: boolean, matchedName?: string, sources?: string[] } | null
 * }} input
 */
export function resolveCallPeerMatrixSync(input = {}) {
  const phone = String(input.phone || "").trim();
  const isVlueMember = Boolean(input.isVlueMember ?? input.verified);
  const known = input.knownContact || null;
  const contacts = isInDeviceAddressBook(phone, known);
  const inVault = isInShowcaseVault(phone);
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();

  /** @type {CallPeerCta} */
  let cta = CALL_PEER_CTA.NONE;
  let label = "";
  let description = "";

  if (isVlueMember) {
    if (inVault) {
      cta = CALL_PEER_CTA.NONE;
    } else if (contacts.inContacts) {
      cta = CALL_PEER_CTA.SAVE_VAULT_ONLY;
      label = "쇼케이스 보관함에 담기";
      description = "앱 보관함에만 저장합니다.";
    } else {
      cta = CALL_PEER_CTA.SAVE_CONTACTS_AND_VAULT;
      label = "상대방 쇼케이스 저장하기";
      description = "기기 주소록과 앱 보관함에 저장합니다.";
    }
  } else if (contacts.inContacts) {
    cta = CALL_PEER_CTA.KAKAO_SHARE;
    label = "카톡으로 쇼케이스 전달하기";
    description = "VLUE 앱 미사용자입니다. 쇼케이스를 전달하세요.";
  }

  const elapsedMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;

  return {
    phone,
    isVlueMember,
    inDeviceContacts: contacts.inContacts,
    contactName: contacts.matchedName || String(known?.matchedName || "").trim(),
    inShowcaseVault: inVault,
    cta,
    label,
    description,
    /** 통화 중 화면: 카톡 CTA만 허용 */
    showInCallKakao: cta === CALL_PEER_CTA.KAKAO_SHARE,
    /** 통화 목록: 저장/카톡 버튼 */
    showCallLogAction: cta !== CALL_PEER_CTA.NONE,
    elapsedMs
  };
}

/**
 * 기기 주소록 네이티브 동기화 후 매트릭스 (비동기, 가능하면 호출)
 */
export async function resolveCallPeerMatrix(input = {}) {
  const phone = String(input.phone || "").trim();
  let known = input.knownContact || null;
  if (phone && !known) {
    try {
      known = await resolveIsKnownContact(phone, { refreshDevice: true });
    } catch {
      known = resolveIsKnownContactSync(phone);
    }
  }
  return resolveCallPeerMatrixSync({ ...input, phone, knownContact: known });
}

/**
 * 통화 중 중앙 하단 — 카톡 영역만 (그 외 전부·문구 없음)
 * @param {ReturnType<typeof resolveCallPeerMatrixSync>} matrix
 */
export function resolveInCallKakaoSlot(matrix) {
  if (!matrix?.showInCallKakao) {
    return { visible: false, label: "", description: "" };
  }
  return {
    visible: true,
    label: matrix.label || "카톡으로 쇼케이스 전달하기",
    description: matrix.description || "VLUE 앱 미사용자입니다. 쇼케이스를 전달하세요."
  };
}
