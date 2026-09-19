import { createPortal } from "react-dom";
import { Phone } from "lucide-react";
import { formatLetteringPhoneDisplay } from "../lib/letteringPhoneMatch.js";
import AdMobBannerSlot from "./ads/AdMobBannerSlot.jsx";
import { AD_SLOT, ADMOB_TEST } from "../lib/ads/adMobUnitIds.js";
import "./vlue-auth-member-popup.css";

/**
 * DCC·쇼케이스 미설정 회원 — 「경로 검증 · 정상」스타일 (웹 폴백).
 * 띠배너는 카드 상자 외부 하단에 분리 부착.
 */
export default function VlueAuthMemberPopup({
  open = false,
  name = "",
  phone = "",
  handle = "",
  onClose
}) {
  if (!open || typeof document === "undefined") return null;
  const phoneDisp = formatLetteringPhoneDisplay(phone) || String(phone || "").trim() || "—";
  const title =
    String(name || "").trim() ||
    (handle ? `@${String(handle).replace(/^@/, "")}` : "") ||
    phoneDisp;

  return createPortal(
    <div
      className="vlue-auth-member-popup-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vlue-auth-member-popup-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="vlue-auth-member-popup-stack">
        <article className="vlue-auth-member-popup">
          <p className="vlue-auth-member-popup__badge">경로 검증 · 정상</p>
          <p className="vlue-auth-member-popup__msg">
            VLUÉ 인증 회원으로 확인되었습니다. 공개 설정된 디지털인증명함·쇼케이스가 없습니다.
          </p>
          <h1 id="vlue-auth-member-popup-title" className="vlue-auth-member-popup__name">
            {title}
          </h1>
          <p className="vlue-auth-member-popup__phone">
            <Phone size={16} aria-hidden />
            <span>{phoneDisp}</span>
          </p>
          <button type="button" className="vlue-auth-member-popup__ok" onClick={() => onClose?.()}>
            확인
          </button>
        </article>
        <div className="vlue-auth-member-popup__ad" aria-label="광고">
          <AdMobBannerSlot
            slotId={`${AD_SLOT.DCC_BOTTOM || "dcc_bottom"}_auth_popup`}
            heightPx={50}
            unitId={ADMOB_TEST.BANNER}
            label="안심 팝업 배너"
            enabled={open}
            preferredSize="BANNER"
            className="w-full overflow-hidden rounded-xl"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
