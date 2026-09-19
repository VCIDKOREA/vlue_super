/**
 * V1 통화·통화목록 — 정제된 규제 매트릭스
 *
 * 판별축: VLUÉ 회원 / 기기 주소록
 * VLUE 회원 → 케이스함 보기
 * 비회원 → 쇼케이스 전달하기 (카톡·SMS 선택)
 */

import {
  phonesMatchLoose,
  resolveIsKnownContact,
  resolveIsKnownContactSync
} from "../contacts/hybridKnownContact.js";
import { readDeviceContactsCache } from "../contacts/deviceContactsCache.js";
import { readContactMatchCache } from "../contactSyncStorage.js";

/** @typedef {'none'|'open_case_archive'|'share_showcase'} CallPeerCta */

export const CALL_PEER_CTA = Object.freeze({
  NONE: "none",
  /** VLUE 회원 — 상대 케이스함(피드) */
  OPEN_CASE_ARCHIVE: "open_case_archive",
  /** 비회원 — 카톡/SMS 전달 선택 */
  SHARE_SHOWCASE: "share_showcase",
  /** @deprecated 보관함 담기 제거 — 하위 호환 */
  SAVE_CONTACTS_AND_VAULT: "save_contacts_and_vault",
  /** @deprecated */
  SAVE_VAULT_ONLY: "save_vault_only",
  /** @deprecated → SHARE_SHOWCASE */
  KAKAO_SHARE: "kakao_share"
});

const DEVICE_SOURCES = new Set(["device", "device_synced"]);

/**
 * 기기 실제 전화번호부(및 동기화 미가입 연락처)만 — VLUÉ 친구 인덱스는 제외
 * @param {string} phone
 * @param {{ sources?: string[], matchedName?: string } | null} [knownHint]
 */
export function isInDeviceAddressBook(phone, knownHint = null) {
  const target = String(phone || "").trim();
  if (!target) return { inContacts: false, matchedName: "" };

  if (knownHint?.sources?.length) {
    const deviceSrc = knownHint.sources.filter(
      (s) => DEVICE_SOURCES.has(s) || s === "device" || s === "device_synced"
    );
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

/** @deprecated 보관함 CTA 제거 — 호출부 호환용 */
export function isInShowcaseVault(_phone) {
  return false;
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
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();

  /** @type {CallPeerCta} */
  let cta = CALL_PEER_CTA.NONE;
  let label = "";
  let description = "";
  /** @type {'case'|'share'|''} */
  let variant = "";

  if (isVlueMember) {
    cta = CALL_PEER_CTA.OPEN_CASE_ARCHIVE;
    label = "케이스함 보기";
    description = "상대 VLUÉ 케이스함(피드)으로 이동합니다.";
    variant = "case";
  } else if (phone) {
    cta = CALL_PEER_CTA.SHARE_SHOWCASE;
    label = "쇼케이스 전달하기";
    description = "카카오톡 또는 SMS로 VLUÉ 초대를 보냅니다.";
    variant = "share";
  }

  const elapsedMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;

  return {
    phone,
    isVlueMember,
    inDeviceContacts: contacts.inContacts,
    contactName: contacts.matchedName || String(known?.matchedName || "").trim(),
    inShowcaseVault: false,
    cta,
    label,
    description,
    variant,
    /** 통화 중 화면: 비회원 전달 CTA */
    showInCallKakao: cta === CALL_PEER_CTA.SHARE_SHOWCASE,
    /** 통화 목록: 액션 버튼 */
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
      known = await resolveIsKnownContact(phone, {
        refreshDevice: input.refreshDevice === true
      });
    } catch {
      known = resolveIsKnownContactSync(phone);
    }
  }
  return resolveCallPeerMatrixSync({ ...input, phone, knownContact: known });
}

/**
 * 통화 중 중앙 하단 — 전달 영역
 * @param {ReturnType<typeof resolveCallPeerMatrixSync>} matrix
 */
export function resolveInCallKakaoSlot(matrix) {
  if (!matrix?.showInCallKakao) {
    return { visible: false, label: "", description: "" };
  }
  return {
    visible: true,
    label: matrix.label || "쇼케이스 전달하기",
    description: matrix.description || "카카오톡 또는 SMS로 VLUÉ 초대를 보냅니다."
  };
}
