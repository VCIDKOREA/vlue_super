import { createPortal } from "react-dom";
import ModalCloseButton from "./common/ModalCloseButton";
import { formatLetteringPhoneDisplay } from "../lib/letteringPhoneMatch.js";
import { VLUE_CARD_CAUTION } from "../lib/vlueDigitalCardUi.js";

/** 인증정보 — 앱 내 신원 보증 스펙 모달 (하단 내비 z-150 위로) */
export default function LetteringCertModal({ open, payload, onClose }) {
  if (!open || !payload) return null;

  const card = payload.card || {};
  const items = payload.verificationItems || [];
  const phoneMatched = Boolean(payload.phoneMatched);
  const incoming = payload.incomingNumber || "";

  const node = (
    <div
      className="lettering-cert-modal-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lettering-cert-modal-title"
      onMouseDown={onClose}
    >
      <div className="lettering-cert-modal" onMouseDown={(e) => e.stopPropagation()}>
        <ModalCloseButton variant="default" onClick={onClose} />
        <div className="lettering-cert-modal__body">
          <header className="mb-3">
            <h2 id="lettering-cert-modal-title" className="text-[17px] font-black text-slate-900">
              VLUE {"\uC778\uC99D\uC815\uBCF4"}
            </h2>
            <p className="mt-1 text-[12px] font-semibold text-slate-600">
              {card.name || "\u2014"}
              {card.title ? ` · ${card.title}` : ""}
            </p>
          </header>

          {phoneMatched ? (
            <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
              VLUE {"\uC778\uC99D \uB4F1\uB85D\uBC88\uD638 \uC785\uB2C8\uB2E4."}
            </p>
          ) : incoming ? (
            <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              {"\uAC78\uB824\uC628 \uBC88\uD638"}: {formatLetteringPhoneDisplay(incoming)}
            </p>
          ) : null}

          <div className="lettering-cert-block lettering-cert-block--modal">
            <p className="lettering-cert-block__title">{"\uD575\uC2EC \uC778\uC99D"}</p>
            <ul className="lettering-cert-block__list">
              {items.map((line) => (
                <li key={line}>
                  <span className="lettering-cert-block__check" aria-hidden>
                    {"\u2713"}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="lettering-caution mt-3">{VLUE_CARD_CAUTION}</p>
        </div>

        <div className="lettering-cert-modal__footer">
          <button type="button" onClick={onClose} className="lettering-action lettering-action--primary w-full">
            {"\uB2EB\uAE30"}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return node;
  return createPortal(node, document.body);
}
