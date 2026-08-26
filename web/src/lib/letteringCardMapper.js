import { normalizePhotoFocus } from "./letteringBizcardStorage.js";

/** 네이티브/API 조회 본문이 회원 매칭인지 — matched 누락·is_verified 만 있는 주입도 수용 */
export function isLookupMatchedBody(body = {}) {
  if (!body || typeof body !== "object") return false;
  if (body.matched === false) return false;
  if (body.matched === true) return true;
  if (body.is_verified === true || body.verified === true) return true;
  const nested = body.card && typeof body.card === "object" ? body.card : null;
  if (nested && (nested.is_verified === true || nested.verified === true)) return true;
  const name = String(body.displayName || body.name || nested?.displayName || nested?.name || "").trim();
  const userId = String(body.userId || body.cardId || nested?.userId || "").trim();
  return Boolean(name && userId);
}

/** GET /api/cards/by-number 응답 → LetteringIncomingNotification card */
export function mapLookupToLetteringCard(body = {}, incomingPhone = "") {
  if (!isLookupMatchedBody(body)) return null;

  const profile = body.profile && typeof body.profile === "object" ? body.profile : {};
  const nested = body.card && typeof body.card === "object" ? body.card : {};
  const feedId = String(body.userId || body.cardId || nested.userId || "").trim();
  const phone = body.phoneE164 || nested.phoneE164 || incomingPhone || "";
  const handle = String(
    body.publicHandle ||
      body.vlueId ||
      body.loginId ||
      nested.publicHandle ||
      nested.vlueId ||
      nested.loginId ||
      ""
  )
    .trim()
    .replace(/^@+/, "");

  return {
    name: body.displayName || nested.displayName || nested.name || "\u2014",
    displayName: body.displayName || nested.displayName || nested.name || "",
    title: body.jobTitle || nested.jobTitle || nested.title || "",
    organization:
      body.companyName ||
      nested.companyName ||
      body.organization ||
      nested.organization ||
      profile.companyName ||
      profile.organization ||
      (handle.toLowerCase() === "ceo" ? "VCID KOREA" : ""),
    publicHandle: handle,
    loginId: handle,
    vlueId: handle,
    phone,
    email:
      body.email ||
      profile.email ||
      profile.contactEmail ||
      nested.email ||
      "",
    fax:
      profile.fax ||
      profile.officePhone ||
      profile.faxNumber ||
      profile.tel ||
      profile.landline ||
      nested.fax ||
      "",
    website:
      body.website ||
      nested.website ||
      profile.website ||
      profile.homepage ||
      profile.url ||
      profile.web ||
      "",
    address:
      profile.address ||
      profile.businessAddress ||
      profile.companyAddress ||
      nested.address ||
      "",
    roadAddress: profile.roadAddress || profile.companyAddressRoad || "",
    addressDetail: profile.addressDetail || "",
    companyIntro: profile.intro || profile.companyIntro || nested.companyIntro || "",
    salesContent: profile.salesPitch || profile.promo || profile.salesContent || "",
    customBackText:
      profile.customBackText ||
      profile.backText ||
      profile.letteringBackText ||
      profile.promo ||
      "",
    promo: profile.promo || "",
    photoUrl:
      body.image_url ||
      nested.image_url ||
      nested.photoUrl ||
      profile.image_url ||
      profile.photoUrl ||
      "",
    /** 발신자 설정(상단/중앙/하단) — 수신 쇼케이스 object-position */
    photoFocus: normalizePhotoFocus(
      body.photoFocus || nested.photoFocus || profile.photoFocus || "center"
    ),
    titlePhotoUrl:
      body.titlePhotoUrl ||
      body.title_photo_url ||
      nested.titlePhotoUrl ||
      profile.titlePhotoUrl ||
      "",
    noTitlePhoto: Boolean(body.noTitlePhoto || nested.noTitlePhoto || profile.noTitlePhoto),
    logoUrl: profile.logoUrl || profile.logo_url || body.logo_url || body.dcp?.logoUrl || "",
    image_url: body.image_url || nested.image_url || "",
    department:
      profile.department || profile.dept || profile.team || profile.division || nested.department || "",
    userId: feedId,
    ownerUserId: feedId,
    feedId: feedId || (phone ? `phone-${phone.replace(/\D/g, "")}` : ""),
    feedType: body.kind === "company" ? "company" : "personal",
    membershipTier:
      profile.membershipTier ||
      body.membershipTier ||
      nested.membershipTier ||
      (body.is_premium_line || body.digitalCardActive ? "paid" : "free"),
    digitalCardActive: Boolean(body.digitalCardActive || nested.digitalCardActive),
    isPremiumLine: Boolean(body.is_premium_line || nested.is_premium_line),
    showcaseStyle:
      body.showcaseStyle && typeof body.showcaseStyle === "object"
        ? body.showcaseStyle
        : nested.showcaseStyle && typeof nested.showcaseStyle === "object"
          ? nested.showcaseStyle
          : undefined,
    authPaidAt: body.authPaidAt || nested.authPaidAt || profile.authPaidAt || null,
    authCycleEndAt:
      body.authCycleEndAt ||
      nested.authCycleEndAt ||
      profile.authCycleEndAt ||
      body.cycleEndAt ||
      null,
    authValidUntil: body.authValidUntil || nested.authValidUntil || profile.authValidUntil || null,
    billingCycle: body.billingCycle || nested.billingCycle || profile.billingCycle || null,
    profileKind: body.profileKind || nested.profileKind || "",
    lineBillingStatus: body.lineBillingStatus || nested.lineBillingStatus || "",
    expiredSubtitle:
      body.expiredSubtitle || nested.expiredSubtitle || "",
    expiredDetail: body.expiredDetail || nested.expiredDetail || "",
    dcp: body.dcp && typeof body.dcp === "object" ? body.dcp : null,
    verificationItems: Array.isArray(profile.verificationItems)
      ? profile.verificationItems
      : body.is_verified
        ? ["VLUE \uC778\uC99D \uC0AC\uC6A9\uC790", "PASS \uBCF8\uC778\uC778\uC99D \uC644\uB8CC"]
        : []
  };
}
