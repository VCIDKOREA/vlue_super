import { useEffect, useState } from "react";
import { SPACE_MODULES, readSpaceSupport } from "../../lib/vlueSpace/support.js";
import { SpaceCorners } from "./SpaceConsole.jsx";

const CONSOLE = {
  "hidden-cam": { index: "01", name: "야간 광학 관측" },
  "device-id": { index: "02", name: "장비 식별" },
  "home-guard": { index: "03", name: "네트워크 감시" },
  "space-tof": { index: "04", name: "공간 깊이 측정" }
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
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <p className="mb-3 text-[12px] leading-snug text-white/50">기능을 고르면 그 기능의 소개와 확인만 진행합니다. 다른 기능의 센서는 켜지 않습니다.</p>
      <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-2 overflow-y-auto">
        {SPACE_MODULES.map((item) => {
          const state = support?.[item.id];
          const look = CONSOLE[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen?.(item.id)}
              className="relative flex min-h-[92px] items-stretch gap-3 border border-white/15 bg-white/[0.03] px-3 py-3 text-left"
            >
              <SpaceCorners />
              <span className="w-8 pt-1 text-[11px] font-semibold tracking-[0.14em] text-white/40">{look.index}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold tracking-wide">{item.title}</span>
                <span className="mt-0.5 block text-[12px] text-white/70">{look.name}</span>
                <span className="mt-1 block text-[11px] leading-snug text-white/40">{item.summary}</span>
              </span>
              <span className="self-start border border-white/25 px-2 py-1 text-[10px] font-semibold tracking-wide text-white/80">
                {state?.headline || "확인 중"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
