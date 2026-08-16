import { buildUserLetteringCard, withLetteringBizcardPreviewFallback } from "./letteringBizcardProfile.js";
import { isPaidLetteringTier, normalizeMembershipKind } from "./letteringMembership.js";
import { applyShowcasePreviewExampleIdentity } from "./vlueShowcasePreviewIdentity.js";
import { readDccLinePreview } from "./dccLineState.js";
import { formatLetteringPhoneDisplay } from "./letteringPhoneMatch.js";

/**
 * VLUE Showcase · VLUE Case — 동일 명함/프로필 데이터 소스
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
  const title = String(line.title || "").trim();
  const department = String(line.department || "").trim();
  if (line.isCertified) {
    return {
      ...card,
      name: name || card.name,
      displayName: name || card.displayName,
      phone: phone || card.phone,
      photoUrl: photo || card.photoUrl,
      photoFocus: line.photoFocus || card.photoFocus,
      title: title || card.title,
      department: department || card.department,
      previewShowcaseId: name || phone || card.previewShowcaseId || ""
    };
  }
  return {
    ...card,
    name: name || card.name,
    displayName: name || card.displayName,
    phone: phone || card.phone,
    photoUrl: photo,
    photoFocus: line.photoFocus || "center",
    title,
    department,
    email: "",
    logoUrl: "",
    organization: "",
    address: "",
    website: "",
    fax: "",
    companyIntro: "",
    customBackText: "",
    previewShowcaseId: name || phone || ""
  };
}

/** 유료 Showcase — 통화 중 송출 데모 상태 */
export const VLUE_SHOWCASE_DEMO_RECORDING_SEC = 4 * 60 + 31;
