/** 유료 Lettering·명함 — 회사명 / 직책·성명 표시 */
import { formatLetteringPhoneDisplay, isUnknownPhoneToken } from "./letteringPhoneMatch.js";

/** 브랜드명만 있는 상호 — 빅푸시에 「VLUE · 이름」처럼 붙이지 않음 */
export function isVlueBrandOrganization(org) {
  return /^vlue$/i.test(String(org || "").trim());
}

/** 상호·직책 없는 DCC — 이름 아래 고정 표기 (이름 중복 금지) */
export const DCC_CERTIFIED_MEMBER_LABEL = "Verified Member";

export function isDccCertifiedMemberLabel(value) {
  return String(value || "").trim() === DCC_CERTIFIED_MEMBER_LABEL;
}

/** 이름 미노출·쇼케이스만 — 상단 라이브바 */
export const SHOWCASE_BAR_VLUE_ID_LABEL = "VLUE ID";

/**
 * 상단 「… Showcase」소유자 라벨
 * - 상호 있음 → 상호
 * - 상호 없음·이름 노출 → 이름
 * - DCC 없이 쇼케이스만 / 이름 숨김 → VLUE ID
 * (로그인 아이디·핸들은 쓰지 않음)
 */
export function resolveShowcaseBarOwnerLabel(card = {}, opts = {}) {
  const hideName = Boolean(
    opts.hideBroadcastName ??
      (card.hideBroadcastName || card.showcaseStyle?.showBroadcastName === false)
  );
  const rawOrg = String(card.organization || card.companyName || "").trim();
  const org = isVlueBrandOrganization(rawOrg) ? "" : rawOrg;
  if (org) return org;
  if (!hideName) {
    const name = String(card.name || card.displayName || "").trim();
    if (name) return name;
  }
  return SHOWCASE_BAR_VLUE_ID_LABEL;
}

/**
 * 쇼케이스 하단 VLUE 프로필 바 — 상호 없음
 * - 이름 공개 → 이름
 * - 이름 비공개 → VLUE ID
 */
export function resolveShowcaseProfileBarLabel(card = {}, opts = {}) {
  const hideName = Boolean(
    opts.hideBroadcastName ??
      (card.hideBroadcastName || card.showcaseStyle?.showBroadcastName === false)
  );
  if (!hideName) {
    const name = String(card.name || card.displayName || card.legalName || "").trim();
    if (name) return name;
  }
  return SHOWCASE_BAR_VLUE_ID_LABEL;
}

/**
 * 저장된 케이스 목록 — 상호 아래 인물 줄
 * - 이름 공개 → 이름 ｜ 직책·부서
 * - 이름 비공개 → VLUE ID
 */
export function resolveSavedShowcasePersonLine(card = {}, opts = {}) {
  const personLabel = resolveShowcaseProfileBarLabel(card, opts);
  if (personLabel === SHOWCASE_BAR_VLUE_ID_LABEL) {
    return personLabel;
  }
  const title = String(card.title || card.jobTitle || "").trim();
  const department = String(card.department || "").trim();
  const roleLine = [department, title].filter(Boolean).join(" · ");
  return roleLine ? `${personLabel} ｜ ${roleLine}` : personLabel;
}

/**
 * DCC 앞면 Digital ID 헤드라인 2줄
 * - 상호 있음: 1줄 상호 / 2줄 이름(＋직책·부서)
 * - 상호 없음·직책 있음: 1줄 이름 / 2줄 직책·부서
 * - 상호·직책 없음: 1줄 이름 / 2줄 Verified Member
 */
export function resolveDccFrontIdentityLines(card = {}) {
  const rawOrg = String(card.organization || card.companyName || "").trim();
  const org = isVlueBrandOrganization(rawOrg) ? "" : rawOrg;
  const name = String(card.name || card.displayName || "").trim();
  const title = String(card.title || card.jobTitle || "").trim();
  const department = String(card.department || "").trim();
  const roleParts = [department, title].filter(Boolean);
  const roleLine = roleParts.join(" ｜ ");

  if (org) {
    const secondary = [name, ...roleParts].filter(Boolean).join(" ｜ ");
    return { primary: org, secondary };
  }

  if (roleLine) {
    return { primary: name || "\u2014", secondary: roleLine };
  }

  return {
    primary: name || "\u2014",
    secondary: name ? DCC_CERTIFIED_MEMBER_LABEL : ""
  };
}

export function formatLetteringPaidIdentity(card = {}) {
  const rawOrg = String(card.organization || card.companyName || "").trim();
  const organization = isVlueBrandOrganization(rawOrg) ? "" : rawOrg;
  const title = String(card.title || card.jobTitle || "").trim();
  const name = String(card.name || card.displayName || "").trim();
  const roleLine = [title, name].filter(Boolean).join(" / ");
  const personLine = [name, title].filter(Boolean).join(" / ");
  const orgAndName = [organization, name].filter(Boolean).join(" · ");

  return {
    organization,
    name,
    title,
    roleLine,
    personLine,
    orgAndName,
    companyLine: organization || name || "\u2014",
    hasRoleLine: Boolean(roleLine),
    hasPersonLine: Boolean(name || title)
  };
}

/**
 * 빅푸시·접힘 바·Mini·미리보기·공유 쇼케이스 공통 2줄
 * 1줄: 상호 있으면 상호 / 없으면 이름
 * 2줄: 상호 있으면 「이름 | 전화번호」 / 없으면 전화번호만
 * (직책·부서는 DCC·풀 쇼케이스 본문에만 — 여기 넣지 않음)
 */
export function resolveCallOverlayIdentityLines(card = {}, { incomingNumber = "" } = {}) {
  const identity = formatLetteringPaidIdentity(card);
  const org = identity.organization;
  const name = identity.name;
  const liveIncoming = isUnknownPhoneToken(incomingNumber) ? "" : String(incomingNumber || "").trim();
  const cardPhone = isUnknownPhoneToken(card.phone) ? "" : String(card.phone || "").trim();
  const phoneRaw = liveIncoming || cardPhone;
  const phone = formatLetteringPhoneDisplay(phoneRaw) || phoneRaw;
  const primary = org || name || "\u2014";
  const secondary = org
    ? [name, phone].filter(Boolean).join(" | ")
    : phone || "";
  return {
    ...identity,
    phone,
    phoneRaw,
    primary,
    secondary,
    hasOrganization: Boolean(org)
  };
}

/**
 * 「이름 | 전화」/「이름 ｜ CEO」를 cyan 구분선용으로 분리.
 * @returns {{ plain: string, parts: string[]|null }|null}
 */
export function splitIdentityPipeParts(text) {
  const plain = String(text || "").trim();
  if (!plain) return null;
  const parts = plain.split(/\s*[|｜]\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return { plain, parts: null };
  return { plain, parts };
}

/** 빅푸시·수신 UI — 상호 / 번호 한 줄 포맷 (공통 resolveCallOverlayIdentityLines 기반) */
export function formatLetteringReceptionLines(card = {}, { incomingNumber = "" } = {}) {
  const lines = resolveCallOverlayIdentityLines(card, { incomingNumber });
  const org = lines.organization;
  const name = lines.name;
  const phone = lines.phone;

  return {
    ...lines,
    collapsedPrimary: lines.primary,
    expandedOrgLine: lines.primary,
    expandedContactLine: lines.secondary,
    collapsedHasOrgPhone: Boolean((org || name) && phone),
    bigPushPrimary: lines.primary,
    bigPushSecondary: lines.secondary
  };
}
