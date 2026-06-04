import { useEffect, useMemo, useState } from "react";

function pad2(n) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function splitRemain(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { h, m, s, total };
}

/**
 * 서버 remainMs 기준 + 로컬 100ms 보간으로 째깍째깍 카운트다운
 */
export default function CountdownTicker({ remainMs = 0, ended = false, className = "" }) {
  const [localRemain, setLocalRemain] = useState(remainMs);
  const anchorRef = useMemo(() => ({ at: Date.now(), ms: remainMs }), [remainMs]);

  useEffect(() => {
    anchorRef.at = Date.now();
    anchorRef.ms = remainMs;
    setLocalRemain(remainMs);
  }, [remainMs, anchorRef]);

  useEffect(() => {
    if (ended) return undefined;
    const id = window.setInterval(() => {
      const elapsed = Date.now() - anchorRef.at;
      setLocalRemain(Math.max(0, anchorRef.ms - elapsed));
    }, 100);
    return () => window.clearInterval(id);
  }, [ended, anchorRef]);

  const { h, m, s, total } = splitRemain(localRemain);
  const urgent = total > 0 && total <= 600;

  if (ended || total <= 0) {
    return (
      <div className={`rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-center ${className}`}>
        <p className="text-[12px] font-bold text-slate-600">마감되었습니다</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border px-3 py-3 ${
        urgent ? "border-rose-300 bg-gradient-to-r from-rose-50 to-amber-50" : "border-indigo-200 bg-indigo-50/80"
      } ${className}`}
    >
      <p className={`text-center text-[11px] font-bold ${urgent ? "text-rose-700" : "text-indigo-800"}`}>
        {urgent ? "마감 임박" : "공동구매 마감까지"}
      </p>
      <div className="mt-2 flex items-center justify-center gap-1.5 font-mono tabular-nums">
        {[
          { v: h, label: "시" },
          { v: m, label: "분" },
          { v: s, label: "초" }
        ].map((unit, idx) => (
          <span key={unit.label} className="flex items-center gap-1.5">
            {idx > 0 ? <span className="text-[20px] font-black text-slate-400 animate-pulse">:</span> : null}
            <span
              className={`flex min-w-[52px] flex-col items-center rounded-xl px-2 py-1.5 shadow-sm ${
                urgent ? "bg-white text-rose-700 ring-1 ring-rose-200" : "bg-white text-indigo-900 ring-1 ring-indigo-100"
              }`}
            >
              <b className="text-[22px] font-black leading-none tracking-tight">{pad2(unit.v)}</b>
              <span className="mt-0.5 text-[9px] font-bold text-slate-500">{unit.label}</span>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
