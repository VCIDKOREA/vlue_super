import { buildUserLetteringCard, withLetteringBizcardPreviewFallback } from "./letteringBizcardProfile.js";
import { isPaidLetteringTier, normalizeMembershipKind } from "./letteringMembership.js";

/**
 * VLUE Showcase · VLUE Case — 동일 명함/프로필 데이터 소스
 * (홈 빅푸시 미리보기 ↔ 프로필 사이드바 미리보기)
 */
export function resolveVlueShowcaseCard({ membershipTier = "free" } = {}) {
  const kind = normalizeMembershipKind(membershipTier);
  const tier = isPaidLetteringTier(kind) ? kind : "free";
  return withLetteringBizcardPreviewFallback(buildUserLetteringCard({ membershipTier: tier }));
}

/** 유료 Showcase — 통화 중 송출 데모 상태 */
export const VLUE_SHOWCASE_DEMO_RECORDING_SEC = 4 * 60 + 31;
