import { createDefaultShowcaseStyle } from "../showcase/showcaseStyleStorage.js";
import { createShowcasePage, SHOWCASE_PAGE_TYPES } from "../showcase/showcasePages.js";
import { getLocalVlueUserId } from "../showcase/resolveShowcaseOwnerUserId.js";

/**
 * 브랜드별 핵심 스펙/키워드 하이라이트 칩 (글래스모피즘 배지용)
 */
export function getBrandHighlightSpecs(assets = {}) {
  if (Array.isArray(assets?.specs) && assets.specs.length > 0) {
    return assets.specs;
  }
  const brand = (assets?.advertiser || assets?.brand || assets?.headline || "").toUpperCase();

  if (brand.includes("GENESIS") || brand.includes("제네시스")) {
    return ["럭셔리 플래그십", "AWD 드라이브", "VIP 리어 시트", "프리미엄 안심케어"];
  }
  if (brand.includes("SAMSUNG") || brand.includes("삼성") || brand.includes("GALAXY") || brand.includes("KNOX")) {
    return ["Galaxy AI", "2억 화소 쿼드", "Knox Vault 보안", "티타늄 프레임"];
  }
  if (brand.includes("TESLA") || brand.includes("테슬라")) {
    return ["FSD 완전자율주행", "0-100km 2.1s", "OTA 업데이트", "AI 슈퍼컴퓨팅"];
  }
  if (brand.includes("APPLE") || brand.includes("IPHONE") || brand.includes("아이폰")) {
    return ["A19 Pro 칩셋", "항공우주 티타늄", "ProMotion 120Hz", "공간 음향"];
  }
  if (brand.includes("MAYBACH") || brand.includes("마이바흐") || brand.includes("BENZ")) {
    return ["하이엔드 럭셔리", "퍼스트 클래스 리어", "Burmester® 4D", "에어매틱"];
  }
  if (brand.includes("PORSCHE") || brand.includes("포르쉐")) {
    return ["최고출력 1,034hp", "Launch Control", "800V 초고속충전", "액티브 라이드"];
  }
  if (brand.includes("BMW")) {
    return ["31.3인치 시어터", "이그제큐티브 라운지", "M 스포츠 xDrive", "크리스탈 헤드라이트"];
  }
  if (brand.includes("LG") || brand.includes("SIGNATURE")) {
    return ["무선 4K 144Hz", "올레드 evo", "α11 AI 프로세서", "돌비 비전"];
  }
  if (brand.includes("DYSON") || brand.includes("다이슨")) {
    return ["지능형 열제어", "코안다 스타일링", "블루투스 무선연동", "손상 없는 케어"];
  }
  if (brand.includes("ROLEX") || brand.includes("롤렉스")) {
    return ["수심 300m 방수", "오이스터스틸", "세라크롬 베젤", "최상급 크로노미터"];
  }
  if (brand.includes("SONY") || brand.includes("소니")) {
    return ["글로벌 셔터", "초당 120연사", "AI 피사체 인식", "블랙아웃 프리"];
  }
  if (brand.includes("BANG") || brand.includes("B&O")) {
    return ["2,100W 출력", "어쿠스틱 렌즈", "액티브 룸 보정", "명품 사운드"];
  }
  if (brand.includes("금융") || brand.includes("감독원") || brand.includes("위원회")) {
    return ["원스톱 지급정지", "24시간 안심대응", "피싱·스미싱 차단", "금융소비자보호"];
  }

  return [
    assets?.badge || "공식 스폰서",
    assets?.category || "프리미엄 파트너",
    "VLUÉ 인증 쇼케이스",
    "VIP 리워드 혜택"
  ];
}

/**
 * AdMob 에셋을 기존 PeerShowcasePreview / ShowcaseCallCarousel 카드로 매핑.
 * 레이아웃은 새로 만들지 않고 쇼케이스 템플릿 데이터만 채운다.
 *
 * @param {{
 *   headline?: string,
 *   body?: string,
 *   advertiser?: string,
 *   mediaUrl?: string,
 *   ctaLabel?: string,
 *   hasVideoContent?: boolean,
 *   iconUrl?: string,
 *   specs?: string[],
 *   badge?: string,
 *   category?: string,
 *   accentColor?: string
 * }} assets
 * @param {{ title?: string, audioUrl?: string } | null} [signatureBgm]
 */
export function buildAdMobShowcaseCard(assets = {}, signatureBgm = null) {
  const headline = String(assets.headline || "").trim() || "광고";
  const body = String(assets.body || "").trim();
  const advertiser = String(assets.advertiser || "").trim() || "스폰서";
  const mediaUrl = String(assets.mediaUrl || "").trim();
  const hasVideo = Boolean(assets.hasVideoContent || assets.videoUrl);
  const iconUrl = String(assets.iconUrl || "").trim();
  const localId = getLocalVlueUserId();
  const specs = getBrandHighlightSpecs(assets);

  const photo = (mediaUrl || assets.videoUrl)
    ? {
        id: "admob-media",
        url: mediaUrl || assets.videoUrl,
        videoUrl: String(assets.videoUrl || "").trim(),
        hasVideoContent: Boolean(assets.videoUrl || assets.hasVideoContent),
        caption: headline,
        overlayText: "", // 상단 짤림 방지: 레거시 텍스트 오버레이 비우고 전용 럭셔리 레이아웃으로 렌더링
        isAdMobSponsor: true,
        headline,
        body,
        advertiser,
        badge: assets.badge || "공식 스폰서",
        category: assets.category || "브랜드 제휴",
        accentColor: assets.accentColor || "#38bdf8",
        specs,
        ctaLabel: assets.ctaLabel || "신제품 상세보기",
        ctaType: assets.ctaType || "tech"
      }
    : null;

  const style = createDefaultShowcaseStyle();
  style.includeDigitalCard = false;
  style.verifiedBadgeOn = true;
  style.gallery = { photos: photo ? [photo] : [] };
  style.pages = [
    createShowcasePage(SHOWCASE_PAGE_TYPES.RICH_CUSTOM, {
      id: "admob-sponsor-page",
      gallery: { photos: photo ? [photo] : [] },
      richCustom: {
        bodyText: body || headline
      }
    })
  ];

  const brandTrackTitle = String(assets.bgmTitle || `${advertiser} AD Original Track`).trim();

  /* 이미지: VLUE Signature BGM / 동영상: 웹 BGM 끄고 MediaView 오디오 */
  if (!hasVideo && signatureBgm?.audioUrl) {
    style.bgm = {
      ...style.bgm,
      mode: "signature",
      title: String(signatureBgm.title || brandTrackTitle).trim() || brandTrackTitle,
      artistName: advertiser || "VLUE",
      audioUrl: String(signatureBgm.audioUrl).trim(),
      attributionLabel: brandTrackTitle,
      linkBroken: false,
      volumeLevel: "medium",
      playMode: "single",
      playlist: []
    };
  } else if (hasVideo) {
    style.bgm = {
      ...style.bgm,
      mode: "signature",
      title: brandTrackTitle,
      artistName: advertiser,
      audioUrl: "",
      attributionLabel: brandTrackTitle,
      linkBroken: true,
      playlist: []
    };
  }

  return {
    name: advertiser,
    displayName: advertiser,
    organization: advertiser,
    companyName: advertiser,
    photoUrl: iconUrl || mediaUrl || "",
    avatarUrl: iconUrl || "",
    phone: "",
    membershipTier: "premium",
    showcaseStyle: style,
    userId: localId || "",
    ownerUserId: localId || "",
    hideBroadcastName: false,
    profileKind: "admob_sponsor",
    admobSponsor: true
  };
}
