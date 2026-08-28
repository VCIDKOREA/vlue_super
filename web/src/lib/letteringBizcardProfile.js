import { normalizeLetteringCard } from "./letteringCardNormalize.js";
import { readProfilePhotoAvatar } from "./vlueAvatar.js";
import {
  readLetteringBizcardEditable,
  readLetteringFixedIdentity,
  formatLetteringContactEmailDisplay,
  combineLetteringBizcardAddress,
  readLetteringBizcardAddressFields,
  writeLetteringBizcardEditable,
  normalizePhotoFocus,
  clampLetteringBizcardIntroFront,
  clampLetteringBizcardBackNote
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

/** 留덉���똿쨌臾몄꽌�슜 �뜲紐� 紐낇븿留�. �떎�궗�슜�옄 誘몃━蹂닿린�뿉�뒗 �젅��� 二쇱엯�븯吏� �븡�쓬. */
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
 * �떎�궗�슜�옄 誘몃━蹂닿린�슜 ��� 鍮� 移몄쓣 �뜲紐④컪�쑝濡� 梨꾩슦吏� �븡�쓬.
 * (怨쇨굅 PREVIEW_FALLBACK�씠 �궪�꽦�깮紐끒룹꽕怨꾪���쓣 �꽔�뼱 異쒖떆 UX瑜� �삤�뿼�떆�궡)
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
      logoUrl: card.noCompanyLogo ? "" : String(card.logoUrl || "").trim(),
      photoUrl: card.noProfilePhoto ? "" : String(card.photoUrl || "").trim(),
      titlePhotoUrl: card.noTitlePhoto ? "" : String(card.titlePhotoUrl || "").trim(),
      noTitlePhoto: Boolean(card.noTitlePhoto)
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
    titlePhotoUrl: scrubbed.noTitlePhoto ? "" : String(scrubbed.titlePhotoUrl || "").trim(),
    noTitlePhoto: Boolean(scrubbed.noTitlePhoto),
    customBackText: clampLetteringBizcardBackNote(cleanField(scrubbed?.customBackText)),
    companyIntro: clampLetteringBizcardIntroFront(cleanField(scrubbed?.companyIntro)),
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
    if (org === "VCID KOREA" || org === "�궪�꽦�깮紐�") {
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
    if (/蹂댁씠�뒪�뵾�떛|�궗移��궗湲�|�옱�궛怨� 媛쒖씤�젙蹂�/i.test(promo)) {
      localStorage.removeItem("vlue_card_promo");
    }
  } catch {
    /* ignore */
  }
}

/** 媛��엯 怨좎젙媛� + �궗�슜�옄 �렪吏� �넂 Lettering 紐낇븿 移대뱶 (誘몄옉�꽦 �븘�뱶�뒗 鍮� 移�) */
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

  const agentName = isCeo ? "" : String(ed.displayName || "").trim();
  const identity = scrubLetteringDemoPollution(
    {
      name: agentName || fixed.name || "",
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
      logoUrl: ed.noCompanyLogo ? "" : String(ed.logoDataUrl || ed.logoUrl || "").trim(),
      logoFileName: ed.noCompanyLogo ? "" : String(ed.logoFileName || "").trim(),
      photoUrl: String(readProfilePhotoAvatar() || "").trim(),
      titlePhotoUrl: ed.noTitlePhoto ? "" : String(ed.titlePhotoDataUrl || ed.titlePhotoUrl || "").trim(),
      noTitlePhoto: Boolean(ed.noTitlePhoto),
      photoFocus: normalizePhotoFocus(ed.photoFocus),
      membershipTier,
      userId: userId || "",
      ownerUserId: userId || "",
      loginId: (() => {
        try {
          return String(localStorage.getItem("vlue_member_handle") || "")
            .trim()
            .replace(/^@/, "");
        } catch {
          return "";
        }
      })(),
      feedId: userId ? `user-${userId}` : "",
      feedType: "personal",
      verificationItems: identity.name
        ? buildAuthValidityVerificationItems({
            cycleEndAt: (() => {
              try {
                return localStorage.getItem("vlue_subscription_cycle_end_at") || null;
              } catch {
                return null;
              }
            })()
          })
        : []
    }),
    { isCeo }
  );
}
