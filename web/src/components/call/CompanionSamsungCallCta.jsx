/**
 * Companion MVP — 실통화 Showcase 하단.
 * 키패드·음소거·스피커·종료 대신 기본 전화앱으로 위임.
 * (InCallControlBar는 삭제하지 않음 — 미리보기·Advanced용 유지)
 */
import { Phone } from "lucide-react";

export default function CompanionSamsungCallCta({ onOpen, className = "" }) {
  return (
    <div className={`companion-samsung-cta ${className}`.trim()}>
      <button
        type="button"
        className="companion-samsung-cta__btn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpen?.();
        }}
      >
        <span className="companion-samsung-cta__icon" aria-hidden>
          <Phone size={20} strokeWidth={2.4} />
        </span>
        <span className="companion-samsung-cta__title">전화 화면 보기</span>
      </button>
    </div>
  );
}
