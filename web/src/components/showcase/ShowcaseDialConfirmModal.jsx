import { createPortal } from "react-dom";
import { Phone } from "lucide-react";
import { formatLetteringPhoneDisplay } from "../../lib/letteringPhoneMatch.js";
import { openPhoneDial } from "../../lib/showcase/showcaseContactActions.js";

/**
 * 전화번호 탭 → 통화 연결 확인 팝업
 */
export default function ShowcaseDialConfirmModal({
  open,
  phone = "",
  displayName = "",
  onClose,
  onConfirm
}) {
  if (!open) return null;

  const phoneLabel = formatLetteringPhoneDisplay(phone) || String(phone || "").trim();
  const name = String(displayName || "").trim();

  const confirm = () => {
    if (onConfirm) onConfirm(phone);
    else openPhoneDial(phone);
    onClose?.();
  };

  const node = (
    <div
      className="showcase-dial-confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="showcase-dial-confirm-title"
    >
      <button type="button" className="showcase-dial-confirm__backdrop" aria-label="닫기" onClick={onClose} />
      <div className="showcase-dial-confirm__panel">
        <div className="showcase-dial-confirm__icon" aria-hidden>
          <Phone className="h-6 w-6" />
        </div>
        <h2 id="showcase-dial-confirm-title" className="showcase-dial-confirm__title">
          통화 연결하기
        </h2>
        {name ? <p className="showcase-dial-confirm__name">{name}</p> : null}
        <p className="showcase-dial-confirm__phone">{phoneLabel}</p>
        <p className="showcase-dial-confirm__hint">이 번호로 전화를 걸까요?</p>
        <div className="showcase-dial-confirm__actions">
          <button type="button" className="showcase-dial-confirm__btn showcase-dial-confirm__btn--ghost" onClick={onClose}>
            취소
          </button>
          <button type="button" className="showcase-dial-confirm__btn showcase-dial-confirm__btn--call" onClick={confirm}>
            통화 연결
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined" || !document.body) return node;
  return createPortal(node, document.body);
}
