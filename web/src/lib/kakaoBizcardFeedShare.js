import { ensureKakaoSdk } from "./kakaoSocialLogin.js";
import { ensureDigitalCardId, syncDigitalCardExportSnapshot } from "./digitalCardApi.js";
import { apiUrl } from "./apiBase.js";
import {
  buildPublicShowcaseUrl,
  getVlueViralLinks,
  isLocalDevHost,
  isLocalDevOrigin,
  resolvePublicCardApiBase
} from "./vlueViralLinks.js";
import { withLetteringBizcardPreviewFallback } from "./letteringBizcardProfile.js";
import { scrubLetteringDemoPollution } from "./letteringDemoPollution.js";
import { readLetteringFixedIdentity, readLetteringBizcardEditable } from "./letteringBizcardStorage.js";

const KAKAO_PUBLIC_ORIGIN = "https://www.vlue.kr";
export const KAKAO_FEED_IMAGE_WIDTH = 800;
export const KAKAO_FEED_IMAGE_HEIGHT = 520;

/** 카카오 스크래퍼가 받을 수 있는 공개 https 이미지 URL만 */
export function isKakaoPublicImageUrl(url) {
  const raw = String(url || "").trim();
  if (!/^https:\/\//i.test(raw)) return false;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    if (isLocalDevHost(host)) return false;
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

/** 카카오·OG가 접근할 공개 API 베이스 (실기기 공유용) — www SPA 금지 */
export function getCardPublicApiBase() {
  return resolvePublicCardApiBase(
    typeof window !== "undefined" ? window.location?.origin || "" : ""
  );
}

/** 카카오 Feed 이미지 — 공용 버튼 (cardId 없을 때 폴백) */
export function getKakaoShareButtonImageUrl() {
  const fromEnv = String(import.meta.env.VITE_KAKAO_BIZCARD_BUTTON_IMAGE ?? "").trim();
  if (isKakaoPublicImageUrl(fromEnv)) return fromEnv;
  return `${KAKAO_PUBLIC_ORIGIN}/images/btn_view_secure_card.png`;
}

/** 앱 미리보기·동일 오리진 PNG (Vite 프록시 → API) */
export function getKakaoFeedCardPreviewUrl(cardId) {
  const id = encodeURIComponent(String(cardId || "").trim());
  if (!id) return "";
  return apiUrl(`/api/v1/card/kakao-feed/${id}.png`);
}

/** 카카오 SDK가 불러올 공개 PNG URL — v 로 캐시 무효화(배경 썸네일 변경 반영) */
export function getKakaoFeedCardPublicImageUrl(cardId, cacheKey = "") {
  const id = encodeURIComponent(String(cardId || "").trim());
  if (!id) return getKakaoShareButtonImageUrl();
  const base = `${getCardPublicApiBase()}/api/v1/card/kakao-feed/${id}.png`;
  const v = String(cacheKey || "")
    .replace(/[^\w.-]/g, "")
    .slice(-40);
  return v ? `${base}?v=${encodeURIComponent(v)}` : base;
}

export function buildKakaoBizcardPublicUrls(cardId, card) {
  const id = encodeURIComponent(String(cardId || "").trim());
  const apiBase = getCardPublicApiBase();
  const viral = getVlueViralLinks();
  const createUrl =
    String(viral.createUrl || "").startsWith("http") && viral.createUrl.includes("vlue")
      ? viral.createUrl
      : `${KAKAO_PUBLIC_ORIGIN}/membership`;
  const snap = scrubLetteringDemoPollution(withLetteringBizcardPreviewFallback(card || {}));
  const ed = readLetteringBizcardEditable();
  const coverHint = String(
    snap.shareCoverUrl || card?.shareCoverUrl || ed.kakaoFeedBgDataUrl || ed.kakaoFeedBgUrl || ""
  ).trim();
  const coverKey = coverHint
    ? coverHint.replace(/[^\w]/g, "").slice(-32)
    : String(Date.now());
  /* 카카오가 긁을 수 있는 https 배경만 직접 전달 — localhost/data/http 는 Feed PNG로 */
  const coverHttp = isKakaoPublicImageUrl(coverHint) ? coverHint : "";
  const feedImageUrl =
    coverHttp ||
    (cardId ? getKakaoFeedCardPublicImageUrl(cardId, coverKey) : getKakaoShareButtonImageUrl());
  const phone = String(
    readLetteringFixedIdentity()?.phone || snap.phone || card?.phone || ""
  ).trim();
  const showcaseUrl = phone ? buildPublicShowcaseUrl(phone) : "";
  const viewUrl = showcaseUrl || `${apiBase}/api/v1/card/view/${id}`;
  return {
    buttonImageUrl: feedImageUrl,
    buttonPreviewUrl: cardId
      ? `${getKakaoFeedCardPreviewUrl(cardId)}${coverKey ? `?v=${encodeURIComponent(coverKey)}` : ""}`
      : getKakaoShareButtonImageUrl(),
    viewUrl,
    createUrl,
    feedTitle: `${String(snap.name || "회원").trim()}님의 VLUE 쇼케이스`,
    feedDescription: [snap.organization, snap.title, snap.department].filter(Boolean).join(" · ").slice(0, 80),
    shareCoverUrl: coverHttp
  };
}

function kakaoShareOriginBlockedMessage() {
  const origin =
    typeof window !== "undefined" ? String(window.location?.origin || "").replace(/\/$/, "") : "";
  const allowLocal = String(import.meta.env.VITE_KAKAO_ALLOW_LOCAL || "").trim() === "1";
  if (allowLocal) return "";
  if (!isLocalDevOrigin(origin)) return "";
  return (
    `로컬(${origin || "localhost"})에서는 카카오 공유 인증이 실패합니다. ` +
    `https://www.vlue.kr/app 에서 보내거나, 카카오 개발자 콘솔 → 앱 → 플랫폼(Web)에 「${origin || "http://localhost:5173"}」 도메인을 등록하세요.`
  );
}

/**
 * 카카오톡 Feed — 개인화 명함 카드 PNG + VLUE 인증 버튼
 */
export async function shareBizcardViaKakaoFeed(card) {
  const originBlock = kakaoShareOriginBlockedMessage();
  if (originBlock) {
    return { ok: false, error: originBlock };
  }

  const cardId = (await ensureDigitalCardId()) || "";
  if (!cardId) {
    return { ok: false, error: "명함 ID가 없습니다. 명함을 저장한 뒤 다시 시도해 주세요." };
  }

  const sync = await syncDigitalCardExportSnapshot(card);
  if (sync?.ok === false) {
    return {
      ok: false,
      error:
        sync.error ||
        "명함·썸네일 서버 동기화에 실패해 카카오 공유를 열 수 없습니다. 네트워크를 확인한 뒤 다시 시도해 주세요."
    };
  }

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

  const mergedCard = {
    ...(card || {}),
    shareCoverUrl: sync?.shareCoverUrl || card?.shareCoverUrl || ""
  };
  const urls = buildKakaoBizcardPublicUrls(cardId, mergedCard);
  if (!isKakaoPublicImageUrl(urls.buttonImageUrl)) {
    return {
      ok: false,
      error: "카카오가 불러올 공개 썸네일 URL이 없습니다. 배경 썸네일을 다시 설정해 주세요."
    };
  }

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
      { title: "쇼케이스 열기", link: viewLink },
      { title: "나도 VLUE 만들기", link: createLink }
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
    if (/인증|invalid request|잘못된 요청|KOE/i.test(msg)) {
      return {
        ok: false,
        error:
          "카카오 공유 인증에 실패했습니다. 카카오 콘솔 Web 도메인에 현재 사이트(예: www.vlue.kr)가 등록돼 있는지 확인해 주세요."
      };
    }
    return { ok: false, error: msg };
  }
}
