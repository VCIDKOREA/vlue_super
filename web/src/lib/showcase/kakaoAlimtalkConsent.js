/**
 * 카카오 알림톡 발송 동의 (쇼케이스 최종 적용 · 설정 토글)
 * isKakaoAgreed === true 일 때만 통화 종료 알림톡 발송
 */

export const KAKAO_ALIMTALK_CONSENT_KEY = "vlue_kakao_alimtalk_agreed_v1";
export const KAKAO_ALIMTALK_CONSENT_CHANGED_EVENT = "vlue-kakao-alimtalk-consent-changed";

export const KAKAO_ALIMTALK_CONSENT_COPY = Object.freeze({
  title: "카카오 알림톡 발송 동의",
  body:
    "보이스피싱 예방 및 정확한 정보 전달을 위해 상대방에게 카카오 알림톡이 발송됩니다.\n" +
    "(무분별한 중복 발송 방지를 위해 발신자와 수신자 기준 최초 1회만 발송됩니다.)",
  agree: "동의함",
  disagree: "동의안함"
});

/** @returns {boolean} */
export function readKakaoAlimtalkAgreed() {
  try {
    return localStorage.getItem(KAKAO_ALIMTALK_CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * @param {boolean} agreed
 * @returns {boolean}
 */
export function writeKakaoAlimtalkAgreed(agreed) {
  const next = Boolean(agreed);
  try {
    localStorage.setItem(KAKAO_ALIMTALK_CONSENT_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(KAKAO_ALIMTALK_CONSENT_CHANGED_EVENT, { detail: { isKakaoAgreed: next } })
    );
  }
  return next;
}

/** 통화 종료 알림톡 발송 가능 여부 */
export function canSendCallEndAlimtalk() {
  return readKakaoAlimtalkAgreed();
}
