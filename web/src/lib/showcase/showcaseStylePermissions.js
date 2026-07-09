import { isPaidLetteringTier } from "../letteringMembership.js";
import { SHOWCASE_STYLE_TYPES } from "./showcaseStyleTypes.js";

/** 등급별 Showcase 기능 권한 */
export function getShowcasePermissions(membershipTier = "free") {
  const isPaid = isPaidLetteringTier(membershipTier);

  return {
    isPaid,
    /** 통화 송출 — 이름·상호 */
    showNameOrg: isPaid,
    /** 상업: 파일·안내장 업로드 */
    fileUpload: isPaid,
    /** 상업: 외부 아웃링크 버튼 */
    outlinkButtons: isPaid,
    /** 상업: 위치·쿠폰·메뉴 */
    locationShare: isPaid,
    couponDownload: isPaid,
    menuWrite: isPaid,
    /** BGM 유튜브 지정 */
    youtubeBgm: isPaid,
    /** 해시태그 등록 (V2 검색) */
    hashtagRegister: isPaid,
    /** 상품 소개 링크아웃 */
    productLinkout: isPaid,
    /** 프리미엄 폰트·이모티 — V1 무료 폰트 5종 전원 개방 */
    premiumFonts: true,
    premiumEmoji: true,
    /** 인증 배지 · 명함형 */
    verifiedBadgeToggle: isPaid,
    certificateStyle: isPaid,
    /** 무료: 인스타/카톡 피드만 (링크·메뉴 버튼 없음) */
    platformFeedOnly: !isPaid,
    allowedStyleIds: isPaid
      ? Object.keys(SHOWCASE_STYLE_TYPES)
      : ["default", "kakao", "instagram", "rich_custom"]
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
    nameOrg: p.showNameOrg
  };
  return map[feature] === false;
}
