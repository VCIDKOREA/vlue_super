import { createPortal } from "react-dom";

const DEFAULT_WARNING =
  "🚨 현재 번호는 비정상 발신 번호로 의심됩니다! 즉시 통화를 종료하고 공식 정보를 확인하세요!!";

export default function AgencyRouteWarningOverlay({
  open = false,
  warning = DEFAULT_WARNING,
  agencyName = "",
  officialWebsite = "",
  onClose
}) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="agency-dcp-warning" role="alertdialog" aria-modal="true" aria-label="비정상 발신 경고">
      <div className="agency-dcp-warning__card">
        <p className="agency-dcp-warning__kicker">경로 검증 · 비정상</p>
        <p className="agency-dcp-warning__text">{warning || DEFAULT_WARNING}</p>
        {agencyName ? <p className="agency-dcp-warning__meta">{agencyName}</p> : null}
        {officialWebsite ? <p className="agency-dcp-warning__meta">{officialWebsite}</p> : null}
        {onClose ? (
          <button type="button" className="agency-dcp-warning__btn" onClick={onClose}>
            확인
          </button>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
