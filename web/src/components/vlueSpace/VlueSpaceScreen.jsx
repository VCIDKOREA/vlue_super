import { useState } from "react";
import DeviceIdFlow from "./DeviceIdFlow.jsx";
import HiddenCamFlow from "./HiddenCamFlow.jsx";
import HomeGuardFlow from "./HomeGuardFlow.jsx";
import SpaceTofFlow from "./SpaceTofFlow.jsx";
import { SpaceMotionStyle } from "./SpaceConsole.jsx";
import VlueSpaceHub from "./VlueSpaceHub.jsx";

export default function VlueSpaceScreen({ open, onClose }) {
  const [moduleId, setModuleId] = useState(null);
  if (!open) return null;

  const close = () => {
    setModuleId(null);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[230] flex bg-black text-white" role="dialog" aria-modal="true" aria-label="VLUE SPACE">
      <SpaceMotionStyle />
      <div className="mx-auto flex h-full w-full max-w-lg flex-col px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-[max(4.5rem,calc(var(--vlue-safe-top,env(safe-area-inset-top,0px))+1.25rem))]">
        <header className="mb-3 flex items-start justify-between gap-3 border-b border-white/15 pb-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.22em] text-white/50">VLUE SPACE</p>
            <h2 className="text-[18px] font-semibold tracking-wide">관측 콘솔</h2>
          </div>
          <button type="button" onClick={close} className="min-h-11 rounded-sm border border-white/30 px-3 text-[12px] font-semibold tracking-wide">닫기</button>
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
