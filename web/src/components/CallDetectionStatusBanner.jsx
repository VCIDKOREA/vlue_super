import { useCallback, useEffect, useState } from "react";
import {
  CALL_DETECTION_HEALTH_EVENT,
  ensureCallDetectionForBroadcast,
  getCallDetectionHealth,
  healCallDetectionIfNeeded,
  openNativeAppSettings,
  requestLetteringPermissions
} from "../lib/letteringSettings.js";

/**
 * 송출 ON인데 통화 감지/백그라운드가 꺼졌을 때 사용자에게 보이는 상태 카드.
 */
export default function CallDetectionStatusBanner({
  isDarkMode = false,
  broadcastOn = null,
  compact = false,
  onNotice
}) {
  const [health, setHealth] = useState(() => getCallDetectionHealth({ broadcastOn }));

  const refresh = useCallback(
    (nativeStatus) => {
      setHealth(getCallDetectionHealth({ broadcastOn, nativeStatus }));
    },
    [broadcastOn]
  );

  useEffect(() => {
    refresh();
    const onHealth = () => refresh();
    const onFg = (e) => {
      const st = e?.detail?.letteringStatus;
      if (st && typeof st === "object") {
        healCallDetectionIfNeeded({ broadcastOn, nativeStatus: st });
        refresh(st);
      } else {
        healCallDetectionIfNeeded({ broadcastOn });
        refresh();
      }
    };
    const onVcid = () => refresh();
    window.addEventListener(CALL_DETECTION_HEALTH_EVENT, onHealth);
    window.addEventListener("vlue-lettering-settings-changed", onHealth);
    window.addEventListener("vlue-vcid-changed", onVcid);
    window.addEventListener("vlue-app-foreground", onFg);
    const t = window.setInterval(() => refresh(), 8000);
    return () => {
      window.removeEventListener(CALL_DETECTION_HEALTH_EVENT, onHealth);
      window.removeEventListener("vlue-lettering-settings-changed", onHealth);
      window.removeEventListener("vlue-vcid-changed", onVcid);
      window.removeEventListener("vlue-app-foreground", onFg);
      window.clearInterval(t);
    };
  }, [broadcastOn, refresh]);

  if (!health.broadcastOn) return null;

  const ok = health.healthy;
  const box = ok
    ? isDarkMode
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-100"
      : "border-emerald-200 bg-emerald-50 text-emerald-900"
    : isDarkMode
      ? "border-rose-500/40 bg-rose-500/15 text-rose-100"
      : "border-rose-200 bg-rose-50 text-rose-900";

  const title = ok ? "쇼케이스 정상 송출 중" : "통화 감지 중지 — 빅푸시가 표시되지 않습니다";
  const body = ok
    ? compact
      ? "백그라운드 실행 중이면 정상 송출됩니다."
      : "백그라운드 실행 중이면 정상 송출됩니다. (알림창에 없어도 「백그라운드 실행」목록에 VLUE가 있으면 됩니다.)"
    : health.issues[0] || "통화 감지를 다시 켜 주세요.";

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${box}`}>
      <p className="text-[12px] font-black leading-snug">{title}</p>
      <p className="mt-0.5 text-[10px] font-medium leading-snug opacity-90">{body}</p>
      {!ok ? (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className={`flex-1 rounded-lg py-1.5 text-[11px] font-black ${
              isDarkMode ? "bg-white/15 text-white" : "bg-rose-600 text-white"
            }`}
            onClick={() => {
              ensureCallDetectionForBroadcast(true);
              requestLetteringPermissions();
              window.setTimeout(() => refresh(), 400);
              onNotice?.("통화 감지를 다시 켰습니다. 권한을 허용해 주세요.");
            }}
          >
            지금 켜기
          </button>
          <button
            type="button"
            className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold ${
              isDarkMode ? "border-white/25 text-white/90" : "border-rose-300 text-rose-800"
            }`}
            onClick={() => openNativeAppSettings()}
          >
            앱 설정
          </button>
        </div>
      ) : null}
    </div>
  );
}
