/** 유료 Lettering·명함 — 회사명 / 직책·성명 표시 */
import { isUnknownPhoneToken } from "./letteringPhoneMatch.js";

export function formatLetteringPaidIdentity(card = {}) {
  const organization = String(card.organization || card.companyName || "").trim();
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
  const phone = phoneRaw;
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
