import { createPortal } from "react-dom";
import { Phone, ShieldCheck } from "lucide-react";
import { formatLetteringPhoneDisplay } from "../lib/letteringPhoneMatch.js";
import "./vlue-auth-member-popup.css";

/**
 * DCC·쇼케이스 미설정 회원 — 빈 쇼케이스 대신 VLUE 인증 확인 팝업
 * (무료/유료 공통)
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
      <article className="vlue-auth-member-popup">
        <p className="vlue-auth-member-popup__badge">
          <ShieldCheck size={14} strokeWidth={2.4} aria-hidden />
          VLUE 인증 · 확인
        </p>
        <p className="vlue-auth-member-popup__msg">
          VLUE 인증 회원으로 확인되었습니다. 등록된 디지털인증명함·쇼케이스가 없어 인증 정보만
          표시합니다.
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
    </div>,
    document.body
  );
}
