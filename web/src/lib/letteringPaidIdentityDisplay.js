/** 유료 Lettering·명함 — 회사명 / 직책·성명 표시 */
import { formatLetteringPhoneDisplay, isUnknownPhoneToken } from "./letteringPhoneMatch.js";

/** 브랜드명만 있는 상호 — 빅푸시에 「VLUE · 이름」처럼 붙이지 않음 */
export function isVlueBrandOrganization(org) {
  return /^vlue$/i.test(String(org || "").trim());
}

/** 상호·직책 없는 DCC — 이름 아래 고정 표기 (이름 중복 금지) */
export const DCC_CERTIFIED_MEMBER_LABEL = "[VLUE 인증회원]";

/**
 * DCC 앞면 Digital ID 헤드라인 2줄
 * - 상호 있음: 1줄 상호 / 2줄 이름(＋직책·부서)
 * - 상호 없음·직책 있음: 1줄 이름 / 2줄 직책·부서
 * - 상호·직책 없음: 1줄 이름 / 2줄 [VLUE 인증회원]
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

/** 빅푸시·수신 UI — 상호 / 번호·직함 한 줄 포맷 */
export function formatLetteringReceptionLines(card = {}, { incomingNumber = "" } = {}) {
  const identity = formatLetteringPaidIdentity(card);
  const org = identity.organization;
  const name = identity.name;
  const title = identity.title;
  const liveIncoming = isUnknownPhoneToken(incomingNumber) ? "" : String(incomingNumber || "").trim();
  const cardPhone = isUnknownPhoneToken(card.phone) ? "" : String(card.phone || "").trim();
  const phoneRaw = liveIncoming || cardPhone;
  const phone = formatLetteringPhoneDisplay(phoneRaw) || phoneRaw;
  /* 디지털 인증명함 — 상호·이름 동시 표현 (사업자 상호 우선) */
  const collapsedPrimary = identity.orgAndName || org || name || "\u2014";
  const expandedOrgLine = org || name || "\u2014";
  const expandedContactLine = [name && org ? name : null, phone, title].filter(Boolean).join(" / ");

  return {
    ...identity,
    phone,
    phoneRaw,
    collapsedPrimary,
    expandedOrgLine,
    expandedContactLine,
    collapsedHasOrgPhone: Boolean((org || name) && phone)
  };
}
