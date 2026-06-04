export default function FraudAlertBanner({ alert, onDismiss, isDarkMode = false }) {
  if (!alert) return null;
  const level = alert.risk_level || "medium";
  const tones = {
    low: "border-slate-300 bg-slate-50 text-slate-800",
    medium: "border-amber-300 bg-amber-50 text-amber-900",
    high: "border-orange-400 bg-orange-50 text-orange-950",
    critical: "border-red-500 bg-red-600 text-white"
  };
  const cls = isDarkMode && level !== "critical" ? "border-white/15 bg-white/10 text-white" : tones[level] || tones.medium;

  return (
    <div className={`mx-3 mb-2 flex items-start gap-2 rounded-xl border px-3 py-2 text-[12px] ${cls}`}>
      <div className="min-w-0 flex-1">
        <p className="font-bold">사기 의심 감지 ({level})</p>
        <p className="mt-0.5 opacity-90">{alert.reason || alert.pattern_type}</p>
      </div>
      <button type="button" className="shrink-0 text-[11px] font-bold underline opacity-80" onClick={onDismiss}>
        닫기
      </button>
    </div>
  );
}
