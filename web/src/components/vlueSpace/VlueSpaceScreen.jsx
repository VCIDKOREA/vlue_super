import { useState } from "react";
import DeviceIdFlow from "./DeviceIdFlow.jsx";
import HiddenCamFlow from "./HiddenCamFlow.jsx";
import HomeGuardFlow from "./HomeGuardFlow.jsx";
import SpaceTofFlow from "./SpaceTofFlow.jsx";
import VlueSpaceHub from "./VlueSpaceHub.jsx";

export default function VlueSpaceScreen({ open, onClose }) {
  const [moduleId, setModuleId] = useState(null);
  if (!open) return null;

  const close = () => {
    setModuleId(null);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[230] flex bg-[#05080d] text-slate-100" role="dialog" aria-modal="true" aria-label="VLUE SPACE">
      <div className="mx-auto flex h-full w-full max-w-lg flex-col px-4 pb-4 pt-[max(4.5rem,calc(var(--vlue-safe-top,env(safe-area-inset-top,0px))+1.25rem))]">
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black tracking-[0.18em] text-cyan-300">VLUE SPACE</p>
            <h2 className="text-[20px] font-black">안전 점검</h2>
          </div>
          <button type="button" onClick={close} className="min-h-11 rounded-lg border border-white/15 px-3 text-[12px] font-bold">닫기</button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">
          {moduleId === "hidden-cam" ? <HiddenCamFlow onBack={() => setModuleId(null)} /> : null}
          {moduleId === "device-id" ? <DeviceIdFlow onBack={() => setModuleId(null)} /> : null}
          {moduleId === "home-guard" ? <HomeGuardFlow onBack={() => setModuleId(null)} /> : null}
          {moduleId === "space-tof" ? <SpaceTofFlow onBack={() => setModuleId(null)} /> : null}
          {moduleId ? null : <VlueSpaceHub onOpen={setModuleId} />}
        </div>
      </div>
    </div>
  );
}
