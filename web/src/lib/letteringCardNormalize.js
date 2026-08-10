import { clampLetteringBizcardEmail, normalizePhotoFocus } from "./letteringBizcardStorage.js";

/** Lettering·명함 카드 객체 정규화 — 빈 칸을 데모값으로 채우지 않음 */
export function normalizeLetteringCard(raw = {}) {
  const photoUrl = String(raw.photoUrl || raw.image_url || raw.imageUrl || "").trim();
  const name = String(raw.name || raw.displayName || "").trim();
  const merged = { ...raw, name };
  /* 회사 로고 없으면 비움(카카오 무지 스타일). VLUE 데모 로고로 채우지 않음 */
  const logoUrl = String(raw.logoUrl || "").trim();

  return {
    ...merged,
    name,
    displayName: String(raw.displayName || name || "").trim(),
    title: String(raw.title || raw.jobTitle || "").trim(),
    organization: String(raw.organization || raw.companyName || "").trim(),
    department: String(
      raw.department || raw.dept || raw.team || raw.division || raw.departmentName || ""
    ).trim(),
    phone: String(raw.phone || "").trim(),
    fax: String(raw.fax || raw.officePhone || raw.faxNumber || raw.tel || raw.landline || "").trim(),
    email: clampLetteringBizcardEmail(String(raw.email || "").trim()),
    website: String(raw.website || raw.homepage || raw.url || raw.web || "").trim(),
    photoUrl,
    photoFocus: normalizePhotoFocus(raw.photoFocus || "center"),
    logoUrl,
    noCompanyLogo: Boolean(raw.noCompanyLogo) || !logoUrl,
    companyIntro: String(raw.companyIntro || raw.intro || "").trim(),
    salesContent: String(raw.salesContent || raw.salesPitch || raw.pitch || "").trim(),
    feedId: String(raw.feedId || raw.userId || "").trim(),
    userId: String(raw.userId || raw.ownerUserId || "").trim(),
    ownerUserId: String(raw.ownerUserId || raw.userId || "").trim(),
    feedType: raw.feedType === "company" ? "company" : "personal",
    verificationItems: Array.isArray(raw.verificationItems) ? raw.verificationItems : [],
    membershipTier: String(raw.membershipTier || "free").toLowerCase(),
    customBackText: String(raw.customBackText || "").trim(),
    promo: String(raw.promo || "").trim(),
    address: String(
      raw.address || raw.businessAddress || raw.companyAddress || raw.officeAddress || ""
    ).trim(),
    roadAddress: String(raw.roadAddress || raw.companyAddressRoad || "").trim(),
    addressDetail: String(raw.addressDetail || "").trim()
  };
}
