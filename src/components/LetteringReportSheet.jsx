import { useState } from "react";
import { LETTERING_REPORT_REASONS } from "../lib/letteringReport.js";
import { formatLetteringPhoneDisplay } from "../lib/letteringPhoneMatch.js";

export default function LetteringReportSheet({
  open,
  phone,
  cardName,
  onClose,
  onSubmit,
  onBlockOnly,
  contained = false
}) {
  const [reasonId, setReasonId] = useState("spam");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [blocking, setBlocking] = useState(false);

  if (!open) return null;

  const busy = submitting || blocking;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit?.({ reasonId, detail });
      setDetail("");
      setReasonId("spam");
      onClose?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlockOnly = async () => {
    setBlocking(true);
    try {
      await onBlockOnly?.();
      setDetail("");
      setReasonId("spam");
      onClose?.();
    } finally {
      setBlocking(false);
    }
  };

  const rootClass = contained
    ? "lettering-report-sheet-root lettering-report-sheet-root--contained absolute inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 pointer-events-auto"
    : "lettering-report-sheet-root fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4";

  const sheetClass = contained
    ? "lettering-report-sheet w-full max-h-[78%] overflow-y-auto rounded-t-2xl border border-slate-200/80 p-4 shadow-2xl"
    : "lettering-report-sheet w-full max-w-[390px] rounded-2xl border border-slate-200/80 p-4 shadow-2xl";

  return (
    <div
      className={rootClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lettering-report-title"
      onClick={() => onClose?.()}
    >
      <div className={sheetClass} onClick={(e) => e.stopPropagation()}>
        <header className="lettering-report-sheet__header">
          <h2 id="lettering-report-title" className="lettering-report-sheet__title">
            {"\uC2E0\uACE0 / \uCC28\uB2E8"}
          </h2>
          <p className="lettering-report-sheet__meta">
            {cardName ? `${cardName} \u00B7 ` : ""}
            {formatLetteringPhoneDisplay(phone)}
          </p>
          <p className="lettering-report-sheet__hint">
            <strong className="font-black text-slate-700">{"\uCC28\uB2E8\uB9CC"}</strong>
            {"\uC740 \uC2E0\uACE0 \uC5C6\uC774 \uBC88\uD638\uB97C \uB9C9\uC2B5\uB2C8\uB2E4. "}
            <strong className="font-black text-slate-700">{"\uC2E0\uACE0"}</strong>
            {"\uB294 \uB0B4\uC6A9 \uC800\uC7A5 \uD6C4 \uC790\uB3D9 \uCC28\uB2E8\uB429\uB2C8\uB2E4."}
          </p>
        </header>

        <button
          type="button"
          disabled={busy}
          onClick={handleBlockOnly}
          className="lettering-report-sheet__block-only mt-3 w-full"
        >
          {blocking ? "\uCC28\uB2E8 \uC911\u2026" : "\uCC28\uB2E8\uB9CC (\uC2E0\uACE0 \uC5C6\uC74C)"}
        </button>

        <p className="lettering-report-sheet__divider-label">
          {"\uC2E0\uACE0\uAC00 \uD544\uC694\uD560 \uB54C"}
        </p>

        <div className="lettering-report-sheet__reasons" role="radiogroup" aria-label={"\uC2E0\uACE0 \uC0AC\uC720"}>
          {LETTERING_REPORT_REASONS.map((r) => (
            <label
              key={r.id}
              className={`lettering-report-sheet__reason ${
                reasonId === r.id ? "lettering-report-sheet__reason--active" : ""
              }`}
            >
              <input
                type="radio"
                name="lettering-report-reason"
                value={r.id}
                checked={reasonId === r.id}
                onChange={() => setReasonId(r.id)}
                className="shrink-0 accent-red-600"
                disabled={busy}
              />
              <span>{r.label}</span>
            </label>
          ))}
        </div>

        <label className="mt-3 block text-[10px] font-bold leading-snug text-slate-600">
          {"\uCD94\uAC00 \uC124\uBA85 (\uC120\uD0DD)"}
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            maxLength={500}
            disabled={busy}
            placeholder={"\uC2E0\uACE0 \uB0B4\uC6A9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694."}
            className="mt-1.5 box-border w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-medium leading-snug text-slate-800 outline-none focus:border-red-300 disabled:opacity-60"
          />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onClose?.()}
            className="rounded-xl border border-slate-200 py-2.5 text-[12px] font-black text-slate-600 disabled:opacity-60"
          >
            {"\uCDE8\uC18C"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleSubmit}
            className="rounded-xl bg-red-600 py-2.5 text-[12px] font-black text-white disabled:opacity-60"
          >
            {submitting ? "\uCC98\uB9AC \uC911\u2026" : "\uC2E0\uACE0 \u00B7 \uC790\uB3D9 \uCC28\uB2E8"}
          </button>
        </div>
      </div>
    </div>
  );
}
