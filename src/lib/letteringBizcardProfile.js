import { normalizeLetteringCard } from "./letteringCardNormalize.js";
import { resolveLetteringDemoLogoUrl } from "./letteringDemoAssets.js";
import {
  readLetteringBizcardEditable,
  readLetteringFixedIdentity
} from "./letteringBizcardStorage.js";
import { normalizeLetteringBizcardTemplate } from "./letteringBizcardTemplates.js";

const PREVIEW_FALLBACK_CARD = {
  name: "\uD64D\uAE38\uB3D9",
  title: "\uB300\uB9AC",
  organization: "\uC0BC\uC131\uC0DD\uBA85",
  department: "\uBCF4\uD5D8\uC124\uACC4\uC601\uC5C5\uD300",
  phone: "010-1234-5678",
  fax: "02-123-7895",
  email: "hgildong@sam-life.co.kr",
  website: "samsunglife.com"
};

function pickPreviewField(card, key) {
  const value = String(card?.[key] ?? "").trim();
  if (!value || value === "\u2014") return String(PREVIEW_FALLBACK_CARD[key] || "").trim();
  return value;
}

/** \uBBF8\uB9AC\uBCF4\uAE30\uB9CC \u2014 \uBE44\uC5B4 \uC788\uB294 \uAC00\uC785 \uD56D\uBAA9\uC744 \uB370\uBAA8 \uAC12\uC73C\uB85C \uCC44\uC6C0 (\uC67C\uCABD \uBD80\uC11C\u00B7\uC131\uBA85 \uC601\uC5ED \uBCF4\uC7A5) */
export function withLetteringBizcardPreviewFallback(card = {}) {
  const organization = pickPreviewField(card, "organization");
  const merged = {
    ...PREVIEW_FALLBACK_CARD,
    ...card,
    name: pickPreviewField(card, "name"),
    title: pickPreviewField(card, "title"),
    organization,
    department: pickPreviewField(card, "department"),
    phone: pickPreviewField(card, "phone"),
    fax: pickPreviewField(card, "fax"),
    email: pickPreviewField(card, "email"),
    website: pickPreviewField(card, "website"),
    logoUrl: String(card.logoUrl || "").trim() || resolveLetteringDemoLogoUrl({ organization })
  };
  return merged;
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

/** 가입 고정값 + 사용자 편집 → Lettering 명함 카드 */
export function buildUserLetteringCard({ membershipTier = "free" } = {}) {
  const fixed = readLetteringFixedIdentity();
  const ed = readLetteringBizcardEditable();
  const fallbackAddress = readOnboardingAddress();
  const userId = readUserId();

  return normalizeLetteringCard({
    designTemplate: normalizeLetteringBizcardTemplate(ed.designTemplate),
    name: fixed.name || "\u2014",
    displayName: fixed.name,
    organization: fixed.organization,
    phone: fixed.phone,
    title: ed.title,
    department: ed.department,
    fax: ed.fax,
    email: ed.email,
    website: ed.website,
    companyIntro: ed.companyIntro,
    address: ed.address || fallbackAddress,
    logoUrl: ed.logoDataUrl,
    photoUrl: "",
    membershipTier,
    feedId: userId ? `user-${userId}` : "",
    feedType: "personal",
    verificationItems: fixed.name
      ? ["PASS \uBCF8\uC778\uC778\uC99D \uC644\uB8CC", "VLUE \uBA85\uD568 \uC2B9\uC778"]
      : []
  });
}
