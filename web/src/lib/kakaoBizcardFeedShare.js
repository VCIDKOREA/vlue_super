import { ensureKakaoSdk } from "./kakaoSocialLogin.js";
import { ensureDigitalCardId, syncDigitalCardExportSnapshot } from "./digitalCardApi.js";
import { apiUrl } from "./apiBase.js";
import {
  buildPublicShowcaseSpaUrl,
  getVlueViralLinks,
  isLocalDevHost,
  isLocalDevOrigin,
  resolvePublicCardApiBase,
  resolvePublicShowcaseShareOrigin
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

/** 전화번호를 010… 형태로 — 쇼케이스 cover 경로용 */
function phoneDigitsLocal(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("82") && digits.length >= 10) return `0${digits.slice(2)}`;
  return digits;
}

/**
 * 카카오 Feed imageUrl — m.vlue.kr 프록시 cover만 사용.
 * R2·data URL 직접 전달 시 카카오 스크래퍼가 실패해 이미지가 통째로 빠짐.
 */
export function getKakaoShowcaseCoverImageUrl(phone, cacheKey = "") {
  const local = phoneDigitsLocal(phone);
  if (!local) return "";
  const origin = resolvePublicShowcaseShareOrigin();
  const base = `${origin}/showcase/${encodeURIComponent(local)}`;
  const v = String(cacheKey || "")
    .replace(/[^\w.-]/g, "")
    .slice(-40);
  return v ? `${base}/t/${encodeURIComponent(v)}/cover.jpg` : `${base}/cover.jpg`;
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
  const viral = getVlueViralLinks();
  const createUrl =
    String(viral.createUrl || "").startsWith("http") && viral.createUrl.includes("vlue")
      ? viral.createUrl
      : `${KAKAO_PUBLIC_ORIGIN}/membership`;
  const snap = scrubLetteringDemoPollution(withLetteringBizcardPreviewFallback(card || {}));
  const ed = readLetteringBizcardEditable();
  const titlePhotoHint = ed.noTitlePhoto
    ? ""
    : String(
        snap.titlePhotoUrl ||
          card?.titlePhotoUrl ||
          ed.titlePhotoDataUrl ||
          ed.titlePhotoUrl ||
          ""
      ).trim();
  const coverHint = String(
    snap.shareCoverUrl ||
      card?.shareCoverUrl ||
      ed.kakaoFeedBgDataUrl ||
      ed.kakaoFeedBgUrl ||
      titlePhotoHint ||
      ""
  ).trim();
  const coverKey = coverHint
    ? coverHint.replace(/[^\w]/g, "").slice(-32)
    : String(Date.now());
  const phone = String(
    readLetteringFixedIdentity()?.phone || snap.phone || card?.phone || ""
  ).trim();
  /* 카톡 SDK: 검증된 m.vlue.kr/cover.jpg 만 사용 (R2 직접 URL 금지) */
  const showcaseCover = getKakaoShowcaseCoverImageUrl(phone, coverKey);
  const feedImageUrl =
    (isKakaoPublicImageUrl(showcaseCover) ? showcaseCover : "") ||
    (cardId ? getKakaoFeedCardPublicImageUrl(cardId, coverKey) : getKakaoShareButtonImageUrl());
  /* 카카오 버튼은 www 도메인 공개 쇼케이스. api.vlue.kr 는 콘솔 미등록이라 홈으로 떨어짐 */
  const showcaseUrl = phone ? buildPublicShowcaseSpaUrl(phone) : "";
  const viewUrl = showcaseUrl || `${KAKAO_PUBLIC_ORIGIN}/s/`;
  /* OG 랜딩(showcaseOgLandingPage)과 동일: org · role · handle · phone · 태그라인 중 최대 3 */
  const role = [snap.title, snap.department].filter(Boolean).join(" · ");
  let handle = "";
  try {
    const raw = String(localStorage.getItem("vlue_member_handle") || "").trim();
    if (raw) handle = raw.startsWith("@") ? raw : `@${raw}`;
  } catch {
    /* ignore */
  }
  const feedDescParts = [
    String(snap.organization || "").trim(),
    role,
    handle,
    phone,
    "VLUE 인증 · 안심 통신 프로필"
  ].filter(Boolean);
  return {
    buttonImageUrl: feedImageUrl,
    buttonPreviewUrl: cardId
      ? `${getKakaoFeedCardPreviewUrl(cardId)}${coverKey ? `?v=${encodeURIComponent(coverKey)}` : ""}`
      : getKakaoShareButtonImageUrl(),
    viewUrl,
    createUrl,
    feedTitle: `${String(snap.name || "회원").trim()}님의 VLUE 쇼케이스`,
    feedDescription: feedDescParts.slice(0, 3).join(" · ").slice(0, 100) || "VLUE 디지털 쇼케이스",
    shareCoverUrl: showcaseCover || feedImageUrl
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
 *
 * 중요: Kakao.Share.sendDefault 는 클릭 제스처 직후 동기 호출해야 함.
 * await(동기화·이미지 업로드) 뒤에 호출하면 focus null / 팝업 차단으로 실패함.
 * → prepareKakaoBizcardShare 로 미리 준비하고, openPreparedKakaoBizcardShare 로 즉시 연다.
 */
export async function prepareKakaoBizcardShare(card) {
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
    shareCoverUrl:
      sync?.shareCoverUrl ||
      card?.shareCoverUrl ||
      sync?.titlePhotoUrl ||
      card?.titlePhotoUrl ||
      "",
    titlePhotoUrl: sync?.titlePhotoUrl || card?.titlePhotoUrl || ""
  };
  const urls = buildKakaoBizcardPublicUrls(cardId, mergedCard);
  if (!isKakaoPublicImageUrl(urls.buttonImageUrl)) {
    return {
      ok: false,
      error: "카카오가 불러올 공개 썸네일 URL이 없습니다. 배경 썸네일을 다시 설정해 주세요."
    };
  }

  /* 가능하면 CDN 업로드. 실패해도 cover URL로 페이로드는 준비 (공유 자체는 열리게) */
  let feedImageUrl = urls.buttonImageUrl;
  try {
    const hosted = await resolveKakaoCdnImageUrl(Kakao, urls.buttonImageUrl);
    if (isKakaoPublicImageUrl(hosted)) feedImageUrl = hosted;
  } catch {
    /* keep cover url */
  }

  const viewLink = { mobileWebUrl: urls.viewUrl, webUrl: urls.viewUrl };
  const createLink = { mobileWebUrl: urls.createUrl, webUrl: urls.createUrl };

  const payload = {
    objectType: "feed",
    content: {
      title: urls.feedTitle,
      description: urls.feedDescription,
      imageUrl: feedImageUrl,
      imageWidth: KAKAO_FEED_IMAGE_WIDTH,
      imageHeight: KAKAO_FEED_IMAGE_HEIGHT,
      link: viewLink
    },
    buttons: [
      { title: "쇼케이스 열기", link: viewLink },
      { title: "나도 VLUE 만들기", link: createLink }
    ]
  };

  return {
    ok: true,
    payload,
    viewUrl: urls.viewUrl,
    buttonImageUrl: feedImageUrl
  };
}

/**
 * 클릭 핸들러에서 await 없이 호출. 준비된 페이로드로 카톡 공유 창만 연다.
 * @returns {{ ok: boolean, cancelled?: boolean, error?: string, viewUrl?: string, buttonImageUrl?: string }}
 */
export function openPreparedKakaoBizcardShare(prepared) {
  if (!prepared?.ok || !prepared?.payload) {
    return { ok: false, error: prepared?.error || "카카오 공유 준비가 되지 않았습니다." };
  }
  const Kakao = typeof window !== "undefined" ? window.Kakao : null;
  if (!Kakao?.Share?.sendDefault) {
    return { ok: false, error: "카카오 Share API를 사용할 수 없습니다." };
  }
  try {
    Kakao.Share.sendDefault(prepared.payload);
    return {
      ok: true,
      channel: "kakao_feed_card",
      viewUrl: prepared.viewUrl,
      buttonImageUrl: prepared.buttonImageUrl
    };
  } catch (err) {
    const msg =
      err?.error_msg ||
      err?.message ||
      (typeof err === "string" ? err : "") ||
      "카카오톡 공유를 완료하지 못했습니다.";
    if (/cancel|취소|abort|focus/i.test(msg)) {
      return {
        ok: false,
        error:
          "카카오톡 공유 창을 열지 못했습니다. 팝업 차단을 해제한 뒤, 버튼을 다시 눌러 주세요."
      };
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

/** @deprecated 클릭 직후 긴 await 때문에 실패할 수 있음 — prepare + openPrepared 사용 */
export async function shareBizcardViaKakaoFeed(card) {
  const prepared = await prepareKakaoBizcardShare(card);
  if (!prepared.ok) return prepared;
  return openPreparedKakaoBizcardShare(prepared);
}

/**
 * 외부 이미지 → 카카오 CDN URL.
 * uploadImage(브라우저 fetch) 우선, 실패 시 scrapImage.
 */
async function resolveKakaoCdnImageUrl(Kakao, imageUrl) {
  const src = String(imageUrl || "").trim();
  if (!src) return "";
  if (/kakaocdn\.net|kakao\.co\.kr|daumcdn\.net/i.test(src)) return src;

  const pickHosted = (res) =>
    String(
      res?.infos?.original?.url ||
        res?.infos?.[0]?.url ||
        res?.infos?.url ||
        res?.url ||
        ""
    ).trim();

  if (typeof Kakao?.Share?.uploadImage === "function") {
    try {
      const fetched = await fetch(src, { mode: "cors", credentials: "omit" });
      if (fetched.ok) {
        const blob = await fetched.blob();
        if (blob && blob.size > 32) {
          const type = blob.type || "image/jpeg";
          const ext = /png/i.test(type) ? "png" : /webp/i.test(type) ? "webp" : "jpg";
          const file = new File([blob], `vlue-cover.${ext}`, { type });
          const uploaded = await Kakao.Share.uploadImage({ file: [file] });
          const hosted = pickHosted(uploaded);
          if (isKakaoPublicImageUrl(hosted)) return hosted;
        }
      }
    } catch {
      /* scrapImage 로 폴백 */
    }
  }

  if (typeof Kakao?.Share?.scrapImage === "function") {
    try {
      const scraped = await Kakao.Share.scrapImage({ imageUrl: src });
      const hosted = pickHosted(scraped);
      if (isKakaoPublicImageUrl(hosted)) return hosted;
    } catch {
      /* ignore */
    }
  }

  return src;
}
