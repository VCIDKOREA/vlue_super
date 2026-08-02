/** 공개 명함·카카오·QR — 프로덕션 베이스 URL */
export function getVluePublicOrigin() {
  return (
    process.env.VLUE_PUBLIC_ORIGIN?.trim() ||
    process.env.VITE_VLUE_LANDING_URL?.trim()?.replace(/\/$/, "") ||
    "https://www.vlue.kr"
  ).replace(/\/$/, "");
}

export function getVlueCreateUrl() {
  return (
    process.env.VLUE_CREATE_CARD_URL?.trim() ||
    process.env.VITE_VLUE_CREATE_CARD_URL?.trim() ||
    `${getVluePublicOrigin()}/membership`
  );
}

/** 카카오 Feed — 정지 명함 대신 공용 버튼 (개인 thumb 미사용) */
export function getKakaoShareButtonImageUrl(origin?: string) {
  const base = (origin || getVluePublicOrigin()).replace(/\/$/, "");
  const custom = process.env.VLUE_KAKAO_SHARE_BUTTON_IMAGE?.trim();
  if (custom?.startsWith("http")) return custom;
  return `${base}/images/btn_view_secure_card.png`;
}

/** 정적 CDN 경로 (프로덕션 nginx → 동일 PNG 미러 시) */
export function getKakaoShareButtonStaticPath() {
  return "/images/btn_view_secure_card.png";
}

export function cardViewUrl(origin: string, cardId: string) {
  return `${origin.replace(/\/$/, "")}/api/v1/card/view/${encodeURIComponent(cardId)}`;
}

/** 카카오 Feed — 개인화 명함 카드 PNG */
export function kakaoFeedCardImageUrl(origin: string, cardId: string, cacheKey = "") {
  const base = origin.replace(/\/$/, "");
  const id = encodeURIComponent(String(cardId || "").trim());
  const url = `${base}/api/v1/card/kakao-feed/${id}.png`;
  const v = String(cacheKey || "")
    .replace(/[^\w.-]/g, "")
    .slice(-40);
  return v ? `${url}?v=${encodeURIComponent(v)}` : url;
}

export function cardVerifyPageUrl(origin: string, cardId: string) {
  return `${origin.replace(/\/$/, "")}/api/v1/card/verify/${encodeURIComponent(cardId)}`;
}

export function cardValidateApiUrl(origin: string, cardId: string) {
  return `${origin.replace(/\/$/, "")}/api/v1/card/validate/${encodeURIComponent(cardId)}`;
}
