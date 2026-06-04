/** GET /api/cards/by-number 응답 → LetteringIncomingNotification card */
export function mapLookupToLetteringCard(body = {}, incomingPhone = "") {
  if (!body?.matched) return null;

  const profile = body.profile && typeof body.profile === "object" ? body.profile : {};
  const feedId = String(body.userId || body.cardId || "").trim();
  const phone = body.phoneE164 || incomingPhone || "";

  return {
    name: body.displayName || "\u2014",
    displayName: body.displayName || "",
    title: body.jobTitle || "",
    organization: body.companyName || "",
    department:
      profile.department || profile.dept || profile.team || profile.division || "",
    phone,
    fax: profile.fax || profile.officePhone || profile.faxNumber || profile.tel || profile.landline || "",
    email: profile.email || profile.contactEmail || "",
    website: profile.website || profile.homepage || profile.url || profile.web || "",
    photoUrl: body.image_url || profile.image_url || profile.photoUrl || "",
    logoUrl: profile.logoUrl || profile.logo_url || "",
    image_url: body.image_url || "",
    companyIntro: profile.intro || profile.companyIntro || "",
    salesContent: profile.salesPitch || profile.promo || profile.salesContent || "",
    customBackText:
      profile.customBackText ||
      profile.backText ||
      profile.letteringBackText ||
      profile.promo ||
      "",
    promo: profile.promo || "",
    address: profile.address || profile.businessAddress || profile.companyAddress || "",
    roadAddress: profile.roadAddress || profile.companyAddressRoad || "",
    addressDetail: profile.addressDetail || "",
    feedId: feedId || (phone ? `phone-${phone.replace(/\D/g, "")}` : ""),
    feedType: body.kind === "company" ? "company" : "personal",
    membershipTier: profile.membershipTier || body.membershipTier || "free",
    verificationItems: Array.isArray(profile.verificationItems)
      ? profile.verificationItems
      : body.is_verified
        ? ["VLUE \uC778\uC99D \uC0AC\uC6A9\uC790", "PASS \uBCF8\uC778\uC778\uC99D \uC644\uB8CC"]
        : []
  };
}
