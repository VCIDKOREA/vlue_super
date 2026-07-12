import { buildUserLetteringCard, withLetteringBizcardPreviewFallback } from "./letteringBizcardProfile.js";
import { isPaidLetteringTier, normalizeMembershipKind } from "./letteringMembership.js";
import { applyShowcasePreviewExampleIdentity } from "./vlueShowcasePreviewIdentity.js";

/**
 * VLUE Showcase · VLUE Case — 동일 명함/프로필 데이터 소스
 * (홈 빅푸시 미리보기 ↔ 프로필 사이드바 미리보기)
 * @param {{ membershipTier?: string, previewExample?: boolean }} [opts]
 */
export function resolveVlueShowcaseCard({ membershipTier = "free", previewExample = false } = {}) {
  const kind = normalizeMembershipKind(membershipTier);
  const tier = isPaidLetteringTier(kind) ? kind : "free";
  const base = withLetteringBizcardPreviewFallback(buildUserLetteringCard({ membershipTier: tier }));
  if (!previewExample) return base;
  return applyShowcasePreviewExampleIdentity({ ...base, membershipTier: tier });
}

/** 유료 Showcase — 통화 중 송출 데모 상태 */
export const VLUE_SHOWCASE_DEMO_RECORDING_SEC = 4 * 60 + 31;
