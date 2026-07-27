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
 * 카카오 알림톡 — 통화 종료 안심 인증 (신청 템플릿과 동기)
 * - 본문 최상단: 보이스피싱·스미싱 예방 + 최초 1회 제한
 * - 본문 번호: 하이픈 포함
 * - 버튼 URL: 숫자만
 */
export function buildCallEndAlimtalkPayload(peerPhoneE164: string): AlimtalkCallEndPayload {
  const phoneDisplayHyphen = formatAlimtalkBodyPhone(peerPhoneE164);
  const phoneDigitsForUrl = formatAlimtalkUrlPhoneDigits(peerPhoneE164);
  const showcaseUrl = buildAlimtalkShowcaseUrl(peerPhoneE164);

  const body =
    `[보이스피싱·스미싱 예방] 안심하세요. ` +
    `방금 통화하신 '${phoneDisplayHyphen}' 번호의 VLUE 스마트 명함·쇼케이스입니다. ` +
    `(발신자·수신자 기준 최초 1회만 발송됩니다.) ` +
    `안전한 연결과 신뢰할 수 있는 디지털 명함, VLUE가 함께합니다. 지금 확인해 보세요.`;

  return {
    templateId: process.env.KAKAO_ALIMTALK_CALL_END_TEMPLATE_ID || "VLUE_CALL_END_V1",
    recipientPhoneE164: peerPhoneE164,
    body,
    phoneDisplayHyphen,
    phoneDigitsForUrl,
    buttons: [
      {
        name: "▶발신자 쇼케이스 확인하기",
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

const WWW_BASE =
  process.env.VLUE_WWW_ORIGIN || process.env.VLUE_APP_WEB_ORIGIN || "https://www.vlue.kr";

/**
 * 기업 DCC 승인 안내 알림톡/문자 본문
 * 「YYYY년MM월DD일 신청하신 … www.vlue.kr 로그인 … 쇼케이스 꾸며보세요」
 */
export function buildEnterpriseDccApprovalAlimtalk(input: {
  recipientPhoneE164: string;
  appliedAt: Date | string;
  manageLoginId: string;
}): AlimtalkCallEndPayload {
  const applied = input.appliedAt instanceof Date ? input.appliedAt : new Date(input.appliedAt);
  const y = applied.getFullYear();
  const m = String(applied.getMonth() + 1).padStart(2, "0");
  const d = String(applied.getDate()).padStart(2, "0");
  const loginUrl = `${String(WWW_BASE).replace(/\/$/, "")}/#showcase`;
  const body =
    `${y}년${m}월${d}일 신청하신 비즈니스 디지털 인증명함이 승인되었습니다. ` +
    `웹 (www.vlue.kr)에서 등록하신 아이디와 비밀번호로 로그인하여, ` +
    `기업 이미지에 맞게 쇼케이스를 멋지게 꾸며보세요! ` +
    `(관리 아이디: ${input.manageLoginId})`;

  return {
    templateId: process.env.KAKAO_ALIMTALK_ENTERPRISE_DCC_TEMPLATE_ID || "VLUE_ENTERPRISE_DCC_APPROVED_V1",
    recipientPhoneE164: input.recipientPhoneE164,
    body,
    buttons: [
      {
        name: "쇼케이스 관리하기",
        type: "WL",
        url_mobile: loginUrl,
        url_pc: loginUrl
      }
    ],
    optOutKey: `enterprise-dcc:${input.recipientPhoneE164}`
  };
}
