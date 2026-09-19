import { createDefaultShowcaseStyle } from "../showcase/showcaseStyleStorage.js";
import { createShowcasePage, SHOWCASE_PAGE_TYPES } from "../showcase/showcasePages.js";
import { getLocalVlueUserId } from "../showcase/resolveShowcaseOwnerUserId.js";

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
 *   iconUrl?: string
 * }} assets
 * @param {{ title?: string, audioUrl?: string } | null} [signatureBgm]
 */
export function buildAdMobShowcaseCard(assets = {}, signatureBgm = null) {
  const headline = String(assets.headline || "").trim() || "광고";
  const body = String(assets.body || "").trim();
  const advertiser = String(assets.advertiser || "").trim() || "스폰서";
  const mediaUrl = String(assets.mediaUrl || "").trim();
  const hasVideo = Boolean(assets.hasVideoContent);
  const iconUrl = String(assets.iconUrl || "").trim();
  const localId = getLocalVlueUserId();

  const photo = mediaUrl
    ? {
        id: "admob-media",
        url: mediaUrl,
        caption: headline,
        overlayText: body ? `${headline}\n${body}` : headline,
        overlayY: 0.78,
        overlayColor: "#ffffff"
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

  /* 이미지: VLUE Signature BGM / 동영상: 웹 BGM 끄고 MediaView 오디오 */
  if (!hasVideo && signatureBgm?.audioUrl) {
    style.bgm = {
      ...style.bgm,
      mode: "signature",
      title: String(signatureBgm.title || "Nature Sound").trim() || "Nature Sound",
      artistName: "VLUE",
      audioUrl: String(signatureBgm.audioUrl).trim(),
      attributionLabel: "VLUE Signature Sound",
      linkBroken: false,
      volumeLevel: "medium",
      playMode: "single",
      playlist: []
    };
  } else if (hasVideo) {
    style.bgm = {
      ...style.bgm,
      mode: "signature",
      title: "광고 사운드",
      artistName: "AdMob",
      audioUrl: "",
      attributionLabel: "AdMob Video Sound",
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
