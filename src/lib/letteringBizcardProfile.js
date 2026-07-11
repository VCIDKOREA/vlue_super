import { normalizeLetteringCard } from "./letteringCardNormalize.js";
import { resolveLetteringDemoLogoUrl } from "./letteringDemoAssets.js";
import {
  readLetteringBizcardEditable,
  readLetteringFixedIdentity,
  formatLetteringContactEmailDisplay,
  combineLetteringBizcardAddress,
  readLetteringBizcardAddressFields
} from "./letteringBizcardStorage.js";
import { normalizeLetteringBizcardTemplate } from "./letteringBizcardTemplates.js";
import { resolveDisplayTitleDepartment } from "./letteringBizcardVerification.js";

/** 마케팅·문서용 데모 명함만. 실사용자 미리보기에는 절대 주입하지 않음. */
export const LETTERING_MARKETING_DEMO_CARD = Object.freeze({
  name: "\uD64D\uAE38\uB3D9",
  title: "\uB300\uB9AC",
  organization: "\uC0BC\uC131\uC0DD\uBA85",
  department: "\uBCF4\uD5D8\uC124\uACC4\uC601\uC5C5\uD300",
  phone: "010-1234-5678",
  fax: "02-123-7895",
  email: "hgildong@sam-life.co.kr",
  website: "samsunglife.com"
});

function cleanField(value) {
  const v = String(value ?? "").trim();
  if (!v || v === "\u2014") return "";
  return v;
}

/**
 * 실사용자 미리보기용 — 빈 칸을 데모값으로 채우지 않음.
 * (과거 PREVIEW_FALLBACK이 삼성생명·설계팀을 넣어 출시 UX를 오염시킴)
 */
export function withLetteringBizcardPreviewFallback(card = {}, opts = {}) {
  if (opts.fillMarketingDemo) {
    const demo = LETTERING_MARKETING_DEMO_CARD;
    const pick = (key) => cleanField(card?.[key]) || demo[key] || "";
    const organization = pick("organization");
    return {
      ...demo,
      ...card,
      name: pick("name"),
      title: pick("title"),
      organization,
      department: pick("department"),
      phone: cleanField(card?.phone) || demo.phone,
      fax: pick("fax"),
      email:
        formatLetteringContactEmailDisplay(cleanField(card?.email)) ||
        demo.email,
      website: pick("website"),
      logoUrl: card.noCompanyLogo
        ? ""
        : String(card.logoUrl || "").trim() || resolveLetteringDemoLogoUrl({ organization }),
      photoUrl: card.noProfilePhoto ? "" : String(card.photoUrl || "").trim()
    };
  }

  const organization = cleanField(card?.organization);
  const phoneRaw = cleanField(card?.phone);
  const emailRaw = cleanField(card?.email);
  return {
    ...card,
    name: cleanField(card?.name),
    title: cleanField(card?.title),
    organization,
    department: cleanField(card?.department),
    phone: phoneRaw,
    fax: cleanField(card?.fax),
    email: formatLetteringContactEmailDisplay(emailRaw) || emailRaw,
    website: cleanField(card?.website),
    logoUrl: card.noCompanyLogo ? "" : String(card.logoUrl || "").trim(),
    photoUrl: card.noProfilePhoto ? "" : String(card.photoUrl || "").trim()
  };
}

function readOnboardingAddress() {
  try {
    const road = String(localStorage.getItem("vlue_onboarding_address") || "").trim();
    const detail = String(localStorage.getItem("vlue_onboarding_address_detail") || "").trim();
    if (road && detail) return `${road} ${detail}`;
    return road || detail;
  } catch {
    return "";
  }
}

function readUserId() {
  try {
    return String(localStorage.getItem("vlue_server_user_id") || "").trim();
  } catch {
    return "";
  }
}

/** 가입 고정값 + 사용자 편집 → Lettering 명함 카드 (미작성 필드는 빈 칸) */
export function buildUserLetteringCard({ membershipTier = "free" } = {}) {
  const fixed = readLetteringFixedIdentity();
  const ed = readLetteringBizcardEditable();
  const fallbackAddress = readOnboardingAddress();
  const userId = readUserId();
  const { road, detail } = readLetteringBizcardAddressFields(ed);
  const address = combineLetteringBizcardAddress(road, detail) || String(ed.address || "").trim() || fallbackAddress;
  const titleDept = resolveDisplayTitleDepartment(ed);

  return normalizeLetteringCard({
    designTemplate: normalizeLetteringBizcardTemplate(ed.designTemplate),
    name: fixed.name || "",
    displayName: fixed.name,
    organization: fixed.organization || "",
    phone: fixed.phone || "",
    title: titleDept.title,
    department: titleDept.department,
    titleDeptPending: titleDept.pending,
    fax: ed.noFax ? "" : ed.fax,
    email: ed.email,
    website: ed.noWebsite ? "" : ed.website,
    companyIntro: ed.companyIntro,
    customBackText: ed.customBackText,
    address,
    logoUrl: ed.noCompanyLogo ? "" : ed.logoDataUrl,
    photoUrl: ed.noProfilePhoto ? "" : ed.photoDataUrl || "",
    membershipTier,
    feedId: userId ? `user-${userId}` : "",
    feedType: "personal",
    verificationItems: fixed.name
      ? ["PASS \uBCF8\uC778\uC778\uC99D \uC644\uB8CC", "VLUE \uBA85\uD568 \uC2B9\uC778"]
      : []
  });
}
