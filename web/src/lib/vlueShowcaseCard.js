import { buildUserLetteringCard, withLetteringBizcardPreviewFallback } from "./letteringBizcardProfile.js";
import { isPaidLetteringTier, normalizeMembershipKind } from "./letteringMembership.js";
import { applyShowcasePreviewExampleIdentity } from "./vlueShowcasePreviewIdentity.js";
import { readDccLinePreview } from "./dccLineState.js";
import { formatLetteringPhoneDisplay } from "./letteringPhoneMatch.js";

/**
 * VLUÉ Showcase · VLUÉ Case — 동일 명함/프로필 데이터 소스
 * (홈 빅푸시 미리보기 ↔ 프로필 사이드바 미리보기)
 * @param {{ membershipTier?: string, previewExample?: boolean }} [opts]
 */
export function resolveVlueShowcaseCard({ membershipTier = "free", previewExample = false } = {}) {
  const kind = normalizeMembershipKind(membershipTier);
  const tier = isPaidLetteringTier(kind) ? kind : "free";
  const base = withLetteringBizcardPreviewFallback(buildUserLetteringCard({ membershipTier: tier }));
  const withExample = previewExample
    ? applyShowcasePreviewExampleIdentity({ ...base, membershipTier: tier })
    : base;
  return applyDccLinePreviewOverlay(withExample);
}

/** 선택한 내선·대표·인증번호의 이름·번호·사진을 미리보기에 덮어쓴다. 대표 DigitalCard는 건드리지 않음. */
export function applyDccLinePreviewOverlay(card = {}) {
  const line = readDccLinePreview();
  if (!line?.id) return card;
  const name = String(line.displayName || "").trim();
  const phone = formatLetteringPhoneDisplay(line.displayPhone) || String(line.displayPhone || "").trim();
  const photo = String(line.photoUrl || "").trim();
  const lineClearsPhoto = Boolean(line.noProfilePhoto) || ("photoUrl" in line && !photo);
  const resolvedPhoto = lineClearsPhoto ? "" : photo || card.photoUrl;
  const title = String(line.title || "").trim();
  const department = String(line.department || "").trim();
  const email = String(line.email || "").trim();
  const address = String(line.address || "").trim();
  const website = String(line.website || "").trim();
  const fax = String(line.fax || "").trim();
  const organization = String(line.organization || "").trim();
  const logoUrl = String(line.logoUrl || "").trim();
  const companyIntro = String(line.companyIntro || "").trim();
  const customBackText = String(line.customBackText || "").trim();
  const contactPatch = {
    email: email || card.email,
    address: address || card.address,
    website: website || card.website,
    fax: fax || card.fax,
    organization: organization || card.organization,
    logoUrl: logoUrl || card.logoUrl,
    companyIntro: companyIntro || card.companyIntro,
    customBackText: customBackText || card.customBackText,
    accountType: card.accountType,
    bankName: card.bankName,
    accountNumber: card.accountNumber,
    accountHolder: card.accountHolder,
    isGroupVerified: card.isGroupVerified
  };
  if (line.isCertified) {
    return {
      ...card,
      name: name || card.name,
      displayName: name || card.displayName,
      phone: phone || card.phone,
      photoUrl: resolvedPhoto,
      titlePhotoUrl: line.titlePhotoUrl || card.titlePhotoUrl,
      noTitlePhoto: line.noTitlePhoto != null ? Boolean(line.noTitlePhoto) : Boolean(card.noTitlePhoto),
      photoFocus: line.photoFocus || card.photoFocus,
      title: title || card.title,
      department: department || card.department,
      ...contactPatch,
      previewShowcaseId: name || phone || card.previewShowcaseId || ""
    };
  }
  /*
   * 내선·대표: 송출 신원(이름·번호·직함·사진)만 라인 값으로 덮고,
   * 이메일·주소·웹·팩스·상호·로고·뒷면 문구는 마스터 명함(또는 라인 DCC)을 유지한다.
   * (빈 문자열로 강제 지우면 앞면 입력 정보가 통째로 사라짐)
   */
  return {
    ...card,
    name: name || card.name,
    displayName: name || card.displayName,
    phone: phone || card.phone,
    photoUrl: resolvedPhoto,
    titlePhotoUrl: line.titlePhotoUrl || card.titlePhotoUrl,
    noTitlePhoto: line.noTitlePhoto != null ? Boolean(line.noTitlePhoto) : Boolean(card.noTitlePhoto),
    photoFocus: line.photoFocus || card.photoFocus || "center",
    title: title || card.title,
    department: department || card.department,
    ...contactPatch,
    previewShowcaseId: name || phone || card.previewShowcaseId || ""
  };
}

/** 유료 Showcase — 통화 중 송출 데모 상태 */
export const VLUE_SHOWCASE_DEMO_RECORDING_SEC = 4 * 60 + 31;
