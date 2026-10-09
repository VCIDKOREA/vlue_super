import { useEffect, useState } from "react";
import {
  openNativeAppSettings,
  openNativeLocationSettings,
  readLetteringPermissionStatus,
  requestNativeLocationPermission
} from "../../lib/letteringSettings.js";

export function nativeLocationDenied() {
  const status = readLetteringPermissionStatus();
  return Boolean(status && status.location === false);
}

export default function LocationPermissionSheet({ dark = false, onClose, onGranted }) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const refresh = () => {
      if (!nativeLocationDenied()) onGranted?.();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("vlue-location-permission", refresh);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("vlue-location-permission", refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [onGranted]);

  const ask = () => {
    setBusy(true);
    const result = requestNativeLocationPermission();
    if (!result.ok) openNativeAppSettings();
    window.setTimeout(() => setBusy(false), 600);
  };

  const ink = dark ? "text-white" : "text-slate-900";
  const muted = dark ? "text-white/70" : "text-slate-600";
  const card = dark ? "border-white/10 bg-white/8" : "border-slate-200 bg-slate-50";

  return (
    <div className={`flex h-full flex-col px-5 pb-8 pt-4 ${ink}`}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[18px] font-black">위치 권한이 필요합니다</p>
        {onClose ? (
          <button type="button" onClick={onClose} className={`h-10 w-10 rounded-full text-lg ${dark ? "bg-white/10" : "bg-slate-100"}`} aria-label="닫기">
            ×
          </button>
        ) : null}
      </div>
      <p className={`text-[14px] font-medium leading-relaxed ${muted}`}>
        가족 지도는 내 위치를 알아야 열립니다. 아래 순서대로 하시면 됩니다.
      </p>
      <ol className="mt-4 space-y-2 text-[14px] font-semibold leading-snug">
        <li className={`rounded-2xl border px-3 py-3 ${card}`}>1. 「위치 허용」을 누릅니다.</li>
        <li className={`rounded-2xl border px-3 py-3 ${card}`}>2. 위치 → 앱 사용 중에만 허용을 고릅니다.</li>
        <li className={`rounded-2xl border px-3 py-3 ${card}`}>3. 지도가 안 열리면 휴대폰 위치(GPS)를 켭니다.</li>
      </ol>
      <button
        type="button"
        disabled={busy}
        onClick={ask}
        className="mt-6 rounded-2xl bg-[#00D2FF] px-4 py-3.5 text-[15px] font-black text-[#04121a] disabled:opacity-60"
      >
        위치 허용
      </button>
      <button
        type="button"
        onClick={() => openNativeAppSettings()}
        className={`mt-2 rounded-2xl px-4 py-3.5 text-[15px] font-black ${dark ? "bg-white/10" : "bg-slate-100"}`}
      >
        앱 설정에서 허용
      </button>
      <button
        type="button"
        onClick={() => openNativeLocationSettings()}
        className={`mt-2 rounded-2xl px-4 py-3.5 text-[15px] font-black ${dark ? "bg-white/10" : "bg-slate-100"}`}
      >
        휴대폰 위치(GPS) 켜기
      </button>
    </div>
  );
}
