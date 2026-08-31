import { isPaidLetteringTier } from "../letteringMembership.js";
import { resolveEffectiveMembershipTier } from "../effectiveMembership.js";
import { SHOWCASE_STYLE_TYPES } from "./showcaseStyleTypes.js";

/** 등급별 Showcase 기능 권한 (가족플랜 effective tier 반영) */
export function getShowcasePermissions(membershipTier = "free") {
  const effectiveTier = resolveEffectiveMembershipTier(membershipTier);
  const isPaid = isPaidLetteringTier(effectiveTier);

  return {
    isPaid,
    /** 통화 송출 — 이름·상호 */
    showNameOrg: isPaid,
    /** 상업: 파일·안내장 업로드 */
    fileUpload: isPaid,
    /** 상업: 외부 아웃링크 버튼 */
    outlinkButtons: isPaid,
    /** 페이지당 비즈니스 링크 (홍보 버튼) — 무료 불가 */
    businessPageLink: isPaid,
    /** 쇼셜링크 — 유·무료 동일 */
    socialOutlinks: true,
    /** 상업: 위치·쿠폰·메뉴 */
    locationShare: isPaid,
    couponDownload: isPaid,
    menuWrite: isPaid,
    /** BGM 유튜브 지정 · 다곡 — 유료 / 무료 1곡은 API 쿼터 */
    youtubeBgm: isPaid,
    /** V1 — 해시태그 등록·홈 검색 노출 (유료 전용) */
    hashtagRegister: isPaid,
    /** 상품 소개 링크아웃 */
    productLinkout: isPaid,
    /** 프리미엄 폰트·이모티 — V1 무료 폰트 5종 전원 개방 */
    premiumFonts: true,
    premiumEmoji: true,
    /** 인증 배지 · 명함형 */
    verifiedBadgeToggle: isPaid,
    certificateStyle: isPaid,
    /** 무료: 인스타 피드 등 (링크·메뉴 버튼 없음) */
    platformFeedOnly: !isPaid,
    allowedStyleIds: isPaid
      ? Object.keys(SHOWCASE_STYLE_TYPES).filter((id) => id !== "kakao")
      : ["default", "instagram", "rich_custom"]
  };
}

export function canUseShowcaseStyle(styleId, membershipTier) {
  return getShowcasePermissions(membershipTier).allowedStyleIds.includes(styleId);
}

export function requiresPremium(feature, membershipTier) {
  const p = getShowcasePermissions(membershipTier);
  const map = {
    youtubeBgm: p.youtubeBgm,
    hashtag: p.hashtagRegister,
    product: p.productLinkout,
    customBgm: p.youtubeBgm,
    premiumFont: p.premiumFonts,
    premiumEmoji: p.premiumEmoji,
    fileUpload: p.fileUpload,
    outlink: p.outlinkButtons,
    menu: p.menuWrite,
    location: p.locationShare,
    coupon: p.couponDownload,
    certificate: p.certificateStyle,
    verifiedBadge: p.verifiedBadgeToggle,
    nameOrg: p.showNameOrg,
    businessLink: p.businessPageLink,
    social: p.socialOutlinks === false
  };
  return map[feature] === false;
}
