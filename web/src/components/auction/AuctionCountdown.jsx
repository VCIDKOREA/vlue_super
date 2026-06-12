import { useEffect, useState } from "react";

function formatRemain(ms) {
  const total = Math.max(0, Number(ms) || 0);
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function AuctionCountdown({ endsAt, remainMs, urgent = false, className = "" }) {
  const [left, setLeft] = useState(remainMs ?? 0);

  useEffect(() => {
    if (remainMs != null) {
      setLeft(remainMs);
      const id = window.setInterval(() => setLeft((v) => Math.max(0, v - 1000)), 1000);
      return () => window.clearInterval(id);
    }
    if (!endsAt) return undefined;
    const tick = () => setLeft(Math.max(0, new Date(endsAt).getTime() - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt, remainMs]);

  const isUrgent = urgent || left <= 60 * 60 * 1000;

  return (
    <span className={`font-mono font-black tabular-nums ${isUrgent ? "text-red-600" : "text-slate-800"} ${className}`.trim()}>
      {formatRemain(left)}
    </span>
  );
}
