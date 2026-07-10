import { KAKAO_ALIMTALK_CONSENT_COPY } from "../../lib/showcase/kakaoAlimtalkConsent.js";

/**
 * 쇼케이스 최종 적용 · 설정 토글용 카카오 알림톡 선택 동의 팝업
 */
export default function KakaoAlimtalkConsentModal({
  open = false,
  onAgree,
  onDisagree,
  isDarkMode = false
}) {
  if (!open) return null;

  return (
    <div
      className="kakao-alimtalk-consent-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kakao-alimtalk-consent-title"
    >
      <button type="button" className="kakao-alimtalk-consent-backdrop" aria-label="닫기" onClick={onDisagree} />
      <div
        className={`kakao-alimtalk-consent-card${isDarkMode ? " kakao-alimtalk-consent-card--dark" : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="kakao-alimtalk-consent-title" className="kakao-alimtalk-consent-title">
          {KAKAO_ALIMTALK_CONSENT_COPY.title}
        </h2>
        <p className="kakao-alimtalk-consent-body">{KAKAO_ALIMTALK_CONSENT_COPY.body}</p>
        <div className="kakao-alimtalk-consent-actions">
          <button type="button" className="kakao-alimtalk-consent-btn kakao-alimtalk-consent-btn--ghost" onClick={onDisagree}>
            {KAKAO_ALIMTALK_CONSENT_COPY.disagree}
          </button>
          <button type="button" className="kakao-alimtalk-consent-btn kakao-alimtalk-consent-btn--primary" onClick={onAgree}>
            {KAKAO_ALIMTALK_CONSENT_COPY.agree}
          </button>
        </div>
      </div>
    </div>
  );
}
