import { formatPhoneDisplayKR } from "./phoneDisplay.js";

export type AlimtalkButton = {
  name: string;
  type: "WL";
  url_mobile: string;
  url_pc?: string;
};

export type AlimtalkCallEndPayload = {
  templateId: string;
  recipientPhoneE164: string;
  body: string;
  buttons: AlimtalkButton[];
  optOutKey: string;
  /** 본문용 하이픈 번호 (예: 010-1234-5678) */
  phoneDisplayHyphen?: string;
  /** URL용 숫자만 번호 (예: 01012345678) */
  phoneDigitsForUrl?: string;
};

const DEFAULT_SHOWCASE_BASE =
  process.env.VLUE_SHOWCASE_WEB_BASE || process.env.VLUE_APP_WEB_ORIGIN || "https://vlue.app";

const APP_STORE_URL =
  process.env.VLUE_APP_DOWNLOAD_URL || "https://www.vlue.kr/download";

/**
 * 알림톡 본문용 — 하이픈 포함 표시 번호 (010-XXXX-XXXX)
 */
export function formatAlimtalkBodyPhone(raw: string): string {
  return formatPhoneDisplayKR(raw);
}

/**
 * 알림톡 버튼 URL용 — 하이픈 제거 순수 숫자 (010XXXXXXXX)
 * 82 국가코드는 0으로 치환
 */
export function formatAlimtalkUrlPhoneDigits(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("82") && digits.length >= 10) return `0${digits.slice(2)}`;
  return digits;
}

/**
 * 쇼케이스 상세 아웃링크
 * 예: https://vlue.app/site/web/showcase/010XXXXXXXX
 */
export function buildAlimtalkShowcaseUrl(rawPhone: string, base = DEFAULT_SHOWCASE_BASE): string {
  const phoneDigits = formatAlimtalkUrlPhoneDigits(rawPhone);
  const root = String(base || DEFAULT_SHOWCASE_BASE).replace(/\/$/, "");
  return `${root}/site/web/showcase/${phoneDigits}`;
}

/**
 * 카카오 알림톡 — 통화 종료 안심 인증 (번호 중심 본문)
 * - 본문: 하이픈 포함 번호
 * - 버튼 URL: 숫자만 번호
 */
export function buildCallEndAlimtalkPayload(peerPhoneE164: string): AlimtalkCallEndPayload {
  const phoneDisplayHyphen = formatAlimtalkBodyPhone(peerPhoneE164);
  const phoneDigitsForUrl = formatAlimtalkUrlPhoneDigits(peerPhoneE164);
  const showcaseUrl = buildAlimtalkShowcaseUrl(peerPhoneE164);

  const body =
    `[VLUE 스마트 명함·쇼케이스] 방금 통화하신 '${phoneDisplayHyphen}' 번호의 인증 프로필입니다. ` +
    `안전한 연결과 신뢰할 수 있는 디지털 명함, VLUE가 함께합니다. 지금 확인해 보세요.`;

  return {
    templateId: process.env.KAKAO_ALIMTALK_CALL_END_TEMPLATE_ID || "VLUE_CALL_END_V1",
    recipientPhoneE164: peerPhoneE164,
    body,
    phoneDisplayHyphen,
    phoneDigitsForUrl,
    buttons: [
      {
        name: "수신된 번호 인증서보기",
        type: "WL",
        url_mobile: showcaseUrl,
        url_pc: showcaseUrl
      },
      {
        name: "VLUE 앱 다운로드",
        type: "WL",
        url_mobile: APP_STORE_URL,
        url_pc: APP_STORE_URL
      }
    ],
    optOutKey: `optout:${peerPhoneE164}`
  };
}
