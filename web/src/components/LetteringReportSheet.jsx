import { useEffect, useState } from "react";
import { LETTERING_REPORT_REASONS } from "../lib/letteringReport.js";
import { formatLetteringPhoneDisplay } from "../lib/letteringPhoneMatch.js";

/**
 * 신고 — 사유 토글 선택 + 선택 상세 + 취소/확인
 * (자세한 내용 없이도 확인 가능)
 */
export default function LetteringReportSheet({
  open,
  phone,
  cardName,
  onClose,
  onSubmit,
  onBlockOnly,
  contained = false
}) {
  const defaultReasonId = LETTERING_REPORT_REASONS[0]?.id || "impersonation_vishing";
  const [reasonId, setReasonId] = useState(defaultReasonId);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReasonId(defaultReasonId);
    setDetail("");
    setSubmitting(false);
    setBlocking(false);
  }, [open, defaultReasonId]);

  if (!open) return null;

  const busy = submitting || blocking;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit?.({ reasonId, detail: String(detail || "").trim() });
      setDetail("");
      setReasonId(defaultReasonId);
      onClose?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlockOnly = async () => {
    if (!onBlockOnly) return;
    setBlocking(true);
    try {
      await onBlockOnly?.();
      setDetail("");
      setReasonId(defaultReasonId);
      onClose?.();
    } finally {
      setBlocking(false);
    }
  };

  const rootClass = contained
    ? "lettering-report-sheet-root lettering-report-sheet-root--contained absolute inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 pointer-events-auto"
    : "lettering-report-sheet-root fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4";

  const sheetClass = contained
    ? "lettering-report-sheet w-full max-h-[82%] overflow-y-auto rounded-t-2xl border border-slate-200/80 p-4 shadow-2xl"
    : "lettering-report-sheet w-full max-w-[390px] max-h-[86vh] overflow-y-auto rounded-2xl border border-slate-200/80 p-4 shadow-2xl";

  return (
    <div
      className={rootClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lettering-report-title"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose?.();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose?.();
      }}
    >
      <div className={sheetClass} onClick={(e) => e.stopPropagation()}>
        <header className="lettering-report-sheet__header">
          <h2 id="lettering-report-title" className="lettering-report-sheet__title">
            신고
          </h2>
          <p className="lettering-report-sheet__meta">
            {cardName ? `${cardName} · ` : ""}
            {formatLetteringPhoneDisplay(phone)}
          </p>
          <p className="lettering-report-sheet__hint">사유를 선택한 뒤 확인해 주세요.</p>
        </header>

        <div className="lettering-report-sheet__reasons" role="radiogroup" aria-label="신고 사유">
          {LETTERING_REPORT_REASONS.map((r) => {
            const active = reasonId === r.id;
            return (
              <label
                key={r.id}
                className={`lettering-report-sheet__reason ${
                  active ? "lettering-report-sheet__reason--active" : ""
                }`}
              >
                <input
                  type="radio"
                  name="lettering-report-reason"
                  value={r.id}
                  checked={active}
                  onChange={() => setReasonId(r.id)}
                  className="lettering-report-sheet__radio"
                  disabled={busy}
                />
                <span className="lettering-report-sheet__radio-mark" aria-hidden>
                  {active ? "●" : "○"}
                </span>
                <span className="lettering-report-sheet__reason-label">{r.label}</span>
              </label>
            );
          })}
        </div>

        <label className="lettering-report-sheet__detail">
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            maxLength={500}
            disabled={busy}
            aria-label="자세한 내용 (선택)"
            placeholder="자세한 내용을 입력하세요."
            className="lettering-report-sheet__textarea"
          />
        </label>

        <div className="lettering-report-sheet__actions">
          <button
            type="button"
            disabled={busy}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!busy) onClose?.();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!busy) onClose?.();
            }}
            className="lettering-report-sheet__btn lettering-report-sheet__btn--cancel"
          >
            취소
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleSubmit}
            className="lettering-report-sheet__btn lettering-report-sheet__btn--confirm"
          >
            {submitting ? "처리 중…" : "확인"}
          </button>
        </div>

        {onBlockOnly ? (
          <button
            type="button"
            disabled={busy}
            onClick={handleBlockOnly}
            className="lettering-report-sheet__block-link"
          >
            {blocking ? "차단 중…" : "신고 없이 차단만"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
