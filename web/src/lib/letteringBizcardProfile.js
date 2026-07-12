import { normalizeLetteringCard } from "./letteringCardNormalize.js";
import { resolveLetteringDemoLogoUrl } from "./letteringDemoAssets.js";
import {
  readLetteringBizcardEditable,
  readLetteringFixedIdentity,
  formatLetteringContactEmailDisplay,
  combineLetteringBizcardAddress,
  readLetteringBizcardAddressFields,
  writeLetteringBizcardEditable
} from "./letteringBizcardStorage.js";
import { normalizeLetteringBizcardTemplate } from "./letteringBizcardTemplates.js";
import { resolveDisplayTitleDepartment } from "./letteringBizcardVerification.js";
import { scrubLetteringDemoPollution, scrubLetteringEditablePollution } from "./letteringDemoPollution.js";
import { buildAuthValidityVerificationItems } from "./authValidityPeriod.js";

function isPlatformCeoHandle() {
  try {
    return (
      String(localStorage.getItem("vlue_member_handle") || "")
        .trim()
        .toLowerCase()
        .replace(/^@/, "") === "ceo"
    );
  } catch {
    return false;
  }
}

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

  const scrubbed = scrubLetteringDemoPollution(card);
  const organization = cleanField(scrubbed?.organization);
  const phoneRaw = cleanField(scrubbed?.phone);
  const emailRaw = cleanField(scrubbed?.email);
  return {
    ...scrubbed,
    name: cleanField(scrubbed?.name),
    title: cleanField(scrubbed?.title),
    organization,
    department: cleanField(scrubbed?.department),
    phone: phoneRaw,
    fax: cleanField(scrubbed?.fax),
    email: formatLetteringContactEmailDisplay(emailRaw) || emailRaw,
    website: cleanField(scrubbed?.website),
    logoUrl: scrubbed.noCompanyLogo ? "" : String(scrubbed.logoUrl || "").trim(),
    photoUrl: scrubbed.noProfilePhoto ? "" : String(scrubbed.photoUrl || "").trim(),
    customBackText: cleanField(scrubbed?.customBackText),
    companyIntro: cleanField(scrubbed?.companyIntro),
    address: cleanField(scrubbed?.address)
  };
}

function readUserId() {
  try {
    return String(localStorage.getItem("vlue_server_user_id") || "").trim();
  } catch {
    return "";
  }
}

function purgePollutedLocalIdentity() {
  try {
    const org = String(localStorage.getItem("vlue_company_locked") || "").trim();
    if (org === "VCID KOREA" || org === "삼성생명") {
      localStorage.removeItem("vlue_company_locked");
      if (String(localStorage.getItem("myCardOrganization") || "").trim() === org) {
        localStorage.removeItem("myCardOrganization");
      }
    }
    const email = String(localStorage.getItem("vlue_card_email") || "")
      .trim()
      .toLowerCase();
    if (["vcid@vlue.kr", "ceo@vlue.kr", "user@vlue.kr", "hgildong@sam-life.co.kr"].includes(email)) {
      localStorage.removeItem("vlue_card_email");
    }
    const promo = String(localStorage.getItem("vlue_card_promo") || "").trim();
    if (/보이스피싱|사칭사기|재산과 개인정보/i.test(promo)) {
      localStorage.removeItem("vlue_card_promo");
    }
  } catch {
    /* ignore */
  }
}

/** 가입 고정값 + 사용자 편집 → Lettering 명함 카드 (미작성 필드는 빈 칸) */
export function buildUserLetteringCard({ membershipTier = "free" } = {}) {
  const isCeo = isPlatformCeoHandle();
  if (!isCeo) purgePollutedLocalIdentity();

  const fixed = readLetteringFixedIdentity();
  const rawEd = readLetteringBizcardEditable();
  const cleanedEd = scrubLetteringEditablePollution(rawEd, { isCeo });
  if (
    !isCeo &&
    (cleanedEd.email !== rawEd.email ||
      cleanedEd.website !== rawEd.website ||
      cleanedEd.customBackText !== rawEd.customBackText ||
      cleanedEd.companyIntro !== rawEd.companyIntro ||
      cleanedEd.address !== rawEd.address ||
      cleanedEd.addressRoad !== rawEd.addressRoad)
  ) {
    writeLetteringBizcardEditable({
      email: cleanedEd.email || "",
      website: cleanedEd.website || "",
      customBackText: cleanedEd.customBackText || "",
      companyIntro: cleanedEd.companyIntro || "",
      address: cleanedEd.address || "",
      addressRoad: cleanedEd.addressRoad || "",
      addressDetail: cleanedEd.addressDetail || ""
    });
  }
  const ed = scrubLetteringEditablePollution(readLetteringBizcardEditable(), { isCeo });
  const userId = readUserId();
  const { road, detail } = readLetteringBizcardAddressFields(ed);
  let address = combineLetteringBizcardAddress(road, detail) || String(ed.address || "").trim();
  const titleDept = resolveDisplayTitleDepartment(ed);

  const identity = scrubLetteringDemoPollution(
    {
      name: fixed.name || "",
      organization: fixed.organization || "",
      email: ed.email,
      website: ed.website,
      address,
      customBackText: ed.customBackText,
      companyIntro: ed.companyIntro
    },
    { isCeo }
  );

  return scrubLetteringDemoPollution(
    normalizeLetteringCard({
      designTemplate: normalizeLetteringBizcardTemplate(ed.designTemplate),
      name: identity.name || "",
      displayName: identity.name || "",
      organization: identity.organization || "",
      phone: fixed.phone || "",
      title: isCeo ? titleDept.title : titleDept.title === "CEO" ? "" : titleDept.title,
      department: titleDept.department,
      titleDeptPending: titleDept.pending,
      fax: ed.noFax ? "" : ed.fax,
      email: identity.email || "",
      website: ed.noWebsite ? "" : identity.website || "",
      companyIntro: identity.companyIntro || "",
      customBackText: identity.customBackText || "",
      address: identity.address || "",
      logoUrl: ed.noCompanyLogo ? "" : ed.logoDataUrl,
      photoUrl: ed.noProfilePhoto ? "" : ed.photoDataUrl || "",
      membershipTier,
      feedId: userId ? `user-${userId}` : "",
      feedType: "personal",
      verificationItems: identity.name ? buildAuthValidityVerificationItems() : []
    }),
    { isCeo }
  );
}
