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
};

const DEFAULT_SHOWCASE_BASE =
  process.env.VLUE_SHOWCASE_WEB_BASE || process.env.VLUE_APP_WEB_ORIGIN || "https://vlue.app";

const APP_STORE_URL =
  process.env.VLUE_APP_DOWNLOAD_URL || "https://www.vlue.kr/download";

/**
 * 카카오 알림톡 — 통화 종료 안심 인증 (번호 중심 본문)
 */
export function buildCallEndAlimtalkPayload(peerPhoneE164: string): AlimtalkCallEndPayload {
  const displayPhone = formatPhoneDisplayKR(peerPhoneE164);
  const showcasePath = `/site/web/showcase/${encodeURIComponent(displayPhone.replace(/\D/g, "").replace(/^82/, "0"))}`;
  const showcaseUrl = `${DEFAULT_SHOWCASE_BASE.replace(/\/$/, "")}${showcasePath}`;

  const body =
    `[VLUE 스마트 명함·쇼케이스] 방금 통화하신 '${displayPhone}' 번호의 인증 프로필입니다. ` +
    `안전한 연결과 신뢰할 수 있는 디지털 명함, VLUE가 함께합니다. 지금 확인해 보세요.`;

  return {
    templateId: process.env.KAKAO_ALIMTALK_CALL_END_TEMPLATE_ID || "VLUE_CALL_END_V1",
    recipientPhoneE164: peerPhoneE164,
    body,
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
