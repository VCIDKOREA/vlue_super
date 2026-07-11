import { ensureKakaoSdk } from "./kakaoSocialLogin.js";
import { ensureDigitalCardId, syncDigitalCardExportSnapshot } from "./digitalCardApi.js";
import { apiUrl } from "./apiBase.js";
import { getVlueViralLinks } from "./vlueViralLinks.js";
import { withLetteringBizcardPreviewFallback } from "./letteringBizcardProfile.js";

const KAKAO_PUBLIC_ORIGIN = "https://www.vlue.kr";
export const KAKAO_FEED_IMAGE_WIDTH = 800;
export const KAKAO_FEED_IMAGE_HEIGHT = 520;

/** 카카오·OG가 접근할 공개 API 베이스 (실기기 공유용) */
export function getCardPublicApiBase() {
  const fromEnv = String(import.meta.env.VITE_CARD_PUBLIC_API_BASE ?? "").trim().replace(/\/$/, "");
  if (fromEnv.startsWith("http")) return fromEnv;
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    return window.location.origin.replace(/\/$/, "");
  }
  return KAKAO_PUBLIC_ORIGIN;
}

/** 카카오 Feed 이미지 — 공용 버튼 (cardId 없을 때 폴백) */
export function getKakaoShareButtonImageUrl() {
  const fromEnv = String(import.meta.env.VITE_KAKAO_BIZCARD_BUTTON_IMAGE ?? "").trim();
  if (fromEnv.startsWith("http")) return fromEnv;
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    return `${window.location.origin.replace(/\/$/, "")}/images/btn_view_secure_card.svg`;
  }
  return `${KAKAO_PUBLIC_ORIGIN}/images/btn_view_secure_card.png`;
}

/** 앱 미리보기·동일 오리진 PNG (Vite 프록시 → API) */
export function getKakaoFeedCardPreviewUrl(cardId) {
  const id = encodeURIComponent(String(cardId || "").trim());
  if (!id) return "";
  return apiUrl(`/api/v1/card/kakao-feed/${id}.png`);
}

/** 카카오 SDK가 불러올 공개 PNG URL */
export function getKakaoFeedCardPublicImageUrl(cardId) {
  const id = encodeURIComponent(String(cardId || "").trim());
  if (!id) return getKakaoShareButtonImageUrl();
  return `${getCardPublicApiBase()}/api/v1/card/kakao-feed/${id}.png`;
}

export function buildKakaoBizcardPublicUrls(cardId, card) {
  const id = encodeURIComponent(String(cardId || "").trim());
  const origin = KAKAO_PUBLIC_ORIGIN;
  const viral = getVlueViralLinks();
  const createUrl =
    String(viral.createUrl || "").startsWith("http") && viral.createUrl.includes("vlue")
      ? viral.createUrl
      : `${origin}/membership`;
  const snap = withLetteringBizcardPreviewFallback(card || {});
  const feedImageUrl = cardId ? getKakaoFeedCardPublicImageUrl(cardId) : getKakaoShareButtonImageUrl();
  return {
    buttonImageUrl: feedImageUrl,
    buttonPreviewUrl: cardId ? getKakaoFeedCardPreviewUrl(cardId) : getKakaoShareButtonImageUrl(),
    viewUrl: `${origin}/api/v1/card/view/${id}`,
    createUrl,
    feedTitle: `${String(snap.name || "회원").trim()}님의 VLUE 인증명함`,
    feedDescription: [snap.organization, snap.title, snap.department].filter(Boolean).join(" · ").slice(0, 80)
  };
}

/**
 * 카카오톡 Feed — 개인화 명함 카드 PNG + VLUE 인증 버튼
 */
export async function shareBizcardViaKakaoFeed(card) {
  const cardId = (await ensureDigitalCardId()) || "";
  if (!cardId) {
    return { ok: false, error: "명함 ID가 없습니다. 명함을 저장한 뒤 다시 시도해 주세요." };
  }

  await syncDigitalCardExportSnapshot(card);

  let Kakao;
  try {
    Kakao = await ensureKakaoSdk();
  } catch (e) {
    const raw = String(e?.message || "");
    const friendly = /키|KEY|설정/i.test(raw)
      ? "카카오톡 공유를 사용할 수 없습니다. (공유 키 미설정)"
      : raw || "카카오 SDK를 불러오지 못했습니다.";
    return { ok: false, error: friendly };
  }

  if (!Kakao?.Share?.sendDefault) {
    return { ok: false, error: "카카오 Share API를 사용할 수 없습니다." };
  }

  const urls = buildKakaoBizcardPublicUrls(cardId, card);
  const viewLink = { mobileWebUrl: urls.viewUrl, webUrl: urls.viewUrl };
  const createLink = { mobileWebUrl: urls.createUrl, webUrl: urls.createUrl };

  const payload = {
    objectType: "feed",
    content: {
      title: urls.feedTitle,
      description: urls.feedDescription,
      imageUrl: urls.buttonImageUrl,
      imageWidth: KAKAO_FEED_IMAGE_WIDTH,
      imageHeight: KAKAO_FEED_IMAGE_HEIGHT,
      link: viewLink
    },
    buttons: [
      { title: "명함 확인", link: viewLink },
      { title: "나도 명함 만들기", link: createLink }
    ]
  };

  try {
    await Kakao.Share.sendDefault(payload);
    return { ok: true, channel: "kakao_feed_card", viewUrl: urls.viewUrl, buttonImageUrl: urls.buttonImageUrl };
  } catch (err) {
    const msg =
      err?.error_msg ||
      err?.message ||
      (typeof err === "string" ? err : "") ||
      "카카오톡 공유를 완료하지 못했습니다.";
    if (/cancel|취소|abort/i.test(msg)) {
      return { ok: false, cancelled: true };
    }
    return { ok: false, error: msg };
  }
}
