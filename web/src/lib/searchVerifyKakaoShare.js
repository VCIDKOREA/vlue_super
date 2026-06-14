import { ensureKakaoSdk } from "./kakaoSocialLogin.js";
import { getKakaoShareButtonImageUrl, KAKAO_FEED_IMAGE_HEIGHT, KAKAO_FEED_IMAGE_WIDTH } from "./kakaoBizcardFeedShare.js";
import { getVlueViralLinks } from "./vlueViralLinks.js";

const SOURCE_LABELS = {
  kakao: "카카오 인증",
  naver: "네이버 인증",
  public: "공공·국세청",
  vlue: "VLUE 인증"
};

function maskCeoName(raw) {
  const name = String(raw || "").trim();
  if (!name || name === "미확인") return "";
  const first = [...name][0];
  return first ? `${first}**` : "";
}

/** 카카오·문자 공유용 VLUE 검색 딥링크 */
export function buildCrossVerifyShareUrl(query) {
  const { landing } = getVlueViralLinks();
  const base = String(landing || "https://www.vlue.kr").replace(/\/$/, "");
  const q = String(query || "").trim();
  if (!q) return `${base}/#search`;
  return `${base}/?vlue_verify=${encodeURIComponent(q)}#search`;
}

function buildShareLines(data, tab) {
  const query = String(data?.query || "").trim();
  const footer = "✅ VLUE(www.vlue.kr) 통합 교차검증에서 공유된 정보입니다.";

  if (tab === "kakao") {
    const k = data?.kakao || {};
    if (!k.place_name && k.unavailable_reason) {
      return [query, `출처: 카카오 인증`, k.unavailable_reason, footer].filter(Boolean);
    }
    return [
      k.place_name || query,
      `출처: 카카오 인증`,
      k.category,
      k.telephone ? `전화 ${k.telephone}` : "",
      k.road_address || k.address,
      footer
    ].filter(Boolean);
  }

  if (tab === "naver") {
    const n = data?.naver || {};
    return [
      n.title || query,
      `출처: 네이버 인증`,
      n.category,
      n.road_address || n.address,
      footer
    ].filter(Boolean);
  }

  if (tab === "public") {
    const p = data?.public || {};
    const c = p.candidates?.[0];
    const store = c?.store_name || p.store_name || query;
    return [
      store,
      `출처: 공공·국세청`,
      p.category,
      c?.business_number || p.business_number ? `사업자 ${c?.business_number || p.business_number}` : "",
      c?.business_status || p.business_status ? `상태 ${c?.business_status || p.business_status}` : "",
      c?.telephone || p.telephone ? `전화 ${c?.telephone || p.telephone}` : "",
      c?.address || p.address,
      p.fail_safe_message,
      footer
    ].filter(Boolean);
  }

  const v = data?.vlue_auth || {};
  const premium = Boolean(data?.is_registered);
  return [
    v.partner_name || query,
    `출처: VLUE 인증`,
    premium ? "VLUE PREMIUM PARTNER" : "VLUE 미등록 · 교차검증 요약",
    v.category,
    v.status_text,
    premium && v.safety_score != null ? `안심지수 ${v.safety_score}` : "",
    v.cert_number ? `인증번호 ${v.cert_number}` : "",
    v.phone ? `연락처 ${v.phone}` : "",
    v.address,
    footer
  ].filter(Boolean);
}

function buildShareTitle(data, tab) {
  const source = SOURCE_LABELS[tab] || "VLUE 인증";
  const query = String(data?.query || "").trim();
  let name = query;

  if (tab === "kakao") name = data?.kakao?.place_name || query;
  else if (tab === "naver") name = data?.naver?.title || query;
  else if (tab === "public") {
    const p = data?.public;
    name = p?.candidates?.[0]?.store_name || p?.store_name || query;
  } else if (tab === "vlue") name = data?.vlue_auth?.partner_name || query;

  return `[VLUE 교차검증·${source}] ${name}`.slice(0, 80);
}

/**
 * VLUE 통합 교차검증 — 카카오톡 Feed 공유 (탭별)
 * @param {import('../site/bolt/components/SearchVerifyCrossTabs').CrossVerifyData} data
 * @param {'kakao'|'naver'|'public'|'vlue'} tab
 */
export async function shareCrossVerifyViaKakao(data, tab) {
  if (!data?.query?.trim()) {
    return { ok: false, error: "공유할 검색어가 없습니다." };
  }

  let Kakao;
  try {
    Kakao = await ensureKakaoSdk();
  } catch (e) {
    return { ok: false, error: e?.message || "카카오 SDK를 불러오지 못했습니다." };
  }

  if (!Kakao?.Share?.sendDefault) {
    return { ok: false, error: "카카오 Share API를 사용할 수 없습니다." };
  }

  const shareUrl = buildCrossVerifyShareUrl(data.query);
  const link = { mobileWebUrl: shareUrl, webUrl: shareUrl };
  const { createUrl } = getVlueViralLinks();
  const createLink = { mobileWebUrl: createUrl, webUrl: createUrl };
  const description = buildShareLines(data, tab).join("\n").slice(0, 200);
  const title = buildShareTitle(data, tab);

  const payload = {
    objectType: "feed",
    content: {
      title,
      description,
      imageUrl: getKakaoShareButtonImageUrl(),
      imageWidth: KAKAO_FEED_IMAGE_WIDTH,
      imageHeight: KAKAO_FEED_IMAGE_HEIGHT,
      link
    },
    buttons: [
      { title: "VLUE에서 교차검증", link },
      { title: "VLUE 가입하기", link: createLink }
    ]
  };

  try {
    await Kakao.Share.sendDefault(payload);
    return { ok: true, tab, shareUrl };
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

export { SOURCE_LABELS };

/**
 * VLUE 통합 교차검증 — 탭별 공유
 * - 카카오: 카카오톡 Feed
 * - 네이버/공공/VLUE: Web Share API → 클립보드 → 카카오 폴백
 */
export async function shareCrossVerify(data, tab) {
  if (tab === "kakao") {
    return shareCrossVerifyViaKakao(data, tab);
  }
  return shareCrossVerifyNative(data, tab);
}

async function shareCrossVerifyNative(data, tab) {
  if (!data?.query?.trim()) {
    return { ok: false, error: "공유할 검색어가 없습니다." };
  }

  const shareUrl = buildCrossVerifyShareUrl(data.query);
  const title = buildShareTitle(data, tab);
  const text = `${buildShareLines(data, tab).join("\n")}\n\n${shareUrl}`;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url: shareUrl });
      return { ok: true, tab, channel: "native", shareUrl };
    } catch (err) {
      const name = err?.name || "";
      if (name === "AbortError" || /cancel|취소/i.test(String(err?.message || ""))) {
        return { ok: false, cancelled: true };
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true, tab, channel: "clipboard", message: "클립보드에 복사했습니다." };
    } catch {
      /* fall through */
    }
  }

  return shareCrossVerifyViaKakao(data, tab);
}
