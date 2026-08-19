import { normalizePhotoFocus } from "./letteringBizcardStorage.js";

/** GET /api/cards/by-number 응답 → LetteringIncomingNotification card */
export function mapLookupToLetteringCard(body = {}, incomingPhone = "") {
  if (!body?.matched) return null;

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
      (body.is_premium_line || body.digitalCardActive || body.is_verified ? "paid" : "free"),
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
