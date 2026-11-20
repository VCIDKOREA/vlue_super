import { useEffect, useState } from "react";
import { SPACE_MODULES, readSpaceSupport } from "../../lib/vlueSpace/support.js";

const LOOK = {
  "hidden-cam": {
    emoji: "📷",
    card: "border-amber-300/80 bg-amber-400/10 shadow-[0_0_32px_rgba(251,191,36,0.16)]",
    badge: "bg-amber-300/20",
    ink: "text-amber-200",
    pill: "bg-amber-300 text-slate-950"
  },
  "device-id": {
    emoji: "📡",
    card: "border-sky-300/80 bg-sky-400/10 shadow-[0_0_32px_rgba(56,189,248,0.16)]",
    badge: "bg-sky-300/20",
    ink: "text-sky-200",
    pill: "bg-sky-300 text-slate-950"
  },
  "home-guard": {
    emoji: "🏠",
    card: "border-emerald-300/80 bg-emerald-400/10 shadow-[0_0_32px_rgba(52,211,153,0.16)]",
    badge: "bg-emerald-300/20",
    ink: "text-emerald-200",
    pill: "bg-emerald-300 text-slate-950"
  },
  "space-tof": {
    emoji: "📏",
    card: "border-violet-300/80 bg-violet-400/10 shadow-[0_0_32px_rgba(167,139,250,0.18)]",
    badge: "bg-violet-300/20",
    ink: "text-violet-200",
    pill: "bg-violet-300 text-slate-950"
  }
};

export default function VlueSpaceHub({ onOpen }) {
  const [support, setSupport] = useState(null);

  useEffect(() => {
    let alive = true;
    readSpaceSupport().then((next) => {
      if (alive) setSupport(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col justify-center">
      <p className="mb-4 text-center text-[12px] leading-snug text-slate-400">기능을 고르면 그 기능의 소개와 확인만 진행합니다. 다른 기능의 센서는 켜지 않습니다.</p>
      <div className="grid grid-cols-2 gap-3">
        {SPACE_MODULES.map((item) => {
          const state = support?.[item.id];
          const look = LOOK[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen?.(item.id)}
              className={`flex min-h-[188px] flex-col items-center rounded-3xl border p-4 text-center ${look.card}`}
            >
              <span className={`flex h-16 w-16 items-center justify-center rounded-2xl text-[34px] leading-none ${look.badge}`} aria-hidden>
                {look.emoji}
              </span>
              <span className="mt-3 text-[13px] font-black leading-tight">{item.title}</span>
              <span className="mt-1 text-[11px] font-semibold leading-snug text-slate-300">{item.summary}</span>
              <span className={`mt-auto inline-flex min-h-7 items-center rounded-full px-2.5 text-[11px] font-black ${look.pill}`}>
                {state?.headline || "확인 중"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
