import { useEffect, useRef, useState } from "react";
import {
  completeSafetyPatch,
  fetchSafetyPatchStatus,
  formatPatchCountdown,
  openCoupangAffiliateSession,
  PATCH_WARN_MS,
  readLocalPatch,
  remainingFrom,
  remindSafetyPatch,
  showLocalPatchNotice,
  writeLocalPatch
} from "../lib/safetyPatch.js";

const PROMPT_KEY = "vlue_safety_patch_prompted";
const NOTICE =
  "TODAY 안심패치가 아직 적용되지 않았습니다. 패치를 진행하여 최신 안전 상태를 동기화하세요.";
const DISCLOSURE =
  "본 VLUÉ 안심패치 동기화 서비스는 쿠팡 파트너스 활동의 일환으로, 구매 발생 시 일정액의 수수료를 제공받습니다.";

export default function TodaySafetyPatch({ isDarkMode = false }) {
  const [lastPatchedAt, setLastPatchedAt] = useState(() => readLocalPatch()?.lastPatchedAt || null);
  const [now, setNow] = useState(() => Date.now());
  const [promptOpen, setPromptOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [statusChecked, setStatusChecked] = useState(false);
  const remindedRef = useRef(false);
  const wasCompleteRef = useRef(false);

  const remaining = remainingFrom(lastPatchedAt, now);
  const complete = remaining > 0;

  useEffect(() => {
    document.documentElement.classList.add("vlue-safety-patch");
    return () => document.documentElement.classList.remove("vlue-safety-patch");
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSafetyPatchStatus()
      .then((data) => {
        if (cancelled) return;
        if (data?.lastPatchedAt) {
          setLastPatchedAt((prev) => {
            const serverMs = new Date(data.lastPatchedAt).getTime();
            const localMs = new Date(prev || 0).getTime();
            const next = serverMs >= localMs ? data.lastPatchedAt : prev;
            if (next) writeLocalPatch(next);
            return next || null;
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStatusChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (complete) {
      wasCompleteRef.current = true;
      return;
    }
    const expiredWhileOpen = wasCompleteRef.current;
    wasCompleteRef.current = false;
    if (!statusChecked || scanning) return;
    if (expiredWhileOpen) {
      try {
        sessionStorage.removeItem(PROMPT_KEY);
      } catch {
        /* ignore */
      }
    }
    try {
      if (sessionStorage.getItem(PROMPT_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setPromptOpen(true);
  }, [complete, statusChecked, scanning]);

  useEffect(() => {
    if (!complete || remaining > PATCH_WARN_MS || remindedRef.current) return;
    remindedRef.current = true;
    remindSafetyPatch()
      .then((data) => {
        if (data?.checked > 0 && !data?.sent) {
          showLocalPatchNotice(
            "TODAY 안심패치",
            "안심패치 유효 시간이 곧 종료됩니다. 패치를 진행해 최신 안전 상태를 동기화하세요."
          );
        }
      })
      .catch(() => {
        showLocalPatchNotice(
          "TODAY 안심패치",
          "안심패치 유효 시간이 곧 종료됩니다. 패치를 진행해 최신 안전 상태를 동기화하세요."
        );
      });
  }, [complete, remaining]);

  const dismissPrompt = () => {
    try {
      sessionStorage.setItem(PROMPT_KEY, "1");
    } catch {
      /* ignore */
    }
    setPromptOpen(false);
  };

  const runPatch = async () => {
    if (scanning || complete) return;
    dismissPrompt();
    setScanError("");
    setScanning(true);
    try {
      openCoupangAffiliateSession();
    } catch (error) {
      setScanning(false);
      setScanError(error?.message || "쿠팡 연결을 열지 못했습니다.");
      setPromptOpen(true);
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 2200));
    const stamped = new Date().toISOString();
    setLastPatchedAt(stamped);
    writeLocalPatch(stamped);
    remindedRef.current = false;
    try {
      const data = await completeSafetyPatch();
      if (data?.lastPatchedAt) {
        setLastPatchedAt(data.lastPatchedAt);
        writeLocalPatch(data.lastPatchedAt);
      }
    } catch (error) {
      setScanError(error?.message || "패치 시각을 서버에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setScanning(false);
    }
  };

  const stickerClass = complete
    ? "bg-emerald-600 text-white"
    : isDarkMode
      ? "bg-slate-900 text-white ring-1 ring-amber-300/70"
      : "bg-white text-slate-900 ring-1 ring-amber-400 shadow-lg";

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 z-[148] flex flex-col items-center gap-1 px-3" style={{ bottom: "calc(54px + env(safe-area-inset-bottom, 0px) + 8px)" }}>
        {scanError && !promptOpen && !scanning ? (
          <p className="pointer-events-auto max-w-md rounded-2xl bg-rose-600 px-3 py-1.5 text-center text-[11px] font-bold text-white">{scanError}</p>
        ) : null}
        {complete ? (
          <div className={`pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-black tracking-tight ${stickerClass}`}>
            <span className="truncate">🟢 TODAY 안심패치 완료 | {formatPatchCountdown(remaining)}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void runPatch()}
            className={`pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-black tracking-tight ${stickerClass}`}
          >
            <span className="truncate">🛡️ TODAY 안심패치 미완료</span>
          </button>
        )}
      </div>

      {promptOpen && !scanning ? (
        <div className="fixed inset-0 z-[640] flex items-end justify-center bg-black/45 px-4 pb-[calc(54px+env(safe-area-inset-bottom,0px)+64px)]">
          <div className={`w-full max-w-md rounded-3xl p-4 shadow-2xl ${isDarkMode ? "bg-[#111827] text-white" : "bg-white text-slate-900"}`}>
            <p className="text-[15px] font-black">TODAY 안심패치</p>
            <p className="mt-2 text-[13px] font-medium leading-relaxed">{NOTICE}</p>
            {scanError ? <p className="mt-2 text-[12px] font-semibold text-rose-500">{scanError}</p> : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={dismissPrompt}
                className={`flex-1 rounded-full px-3 py-2 text-[13px] font-bold ${isDarkMode ? "bg-white/10" : "bg-slate-100"}`}
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => void runPatch()}
                className="flex-1 rounded-full bg-[#00D2FF] px-3 py-2 text-[13px] font-black text-[#04121a]"
              >
                패치 진행
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {scanning ? (
        <div className="fixed inset-0 z-[720] flex items-center justify-center bg-[#04121a]/88 px-6 text-white">
          <div className="safety-patch-scan relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/15 bg-[#0c1220]/90 px-5 py-8 text-center shadow-2xl">
            <p className="text-[13px] font-black tracking-wide text-[#00D2FF]">TODAY 안심패치</p>
            <p className="mt-3 text-[15px] font-bold leading-relaxed">가족 안전 데이터 동기화 및 안심패치 수신 중...</p>
            <div className="mx-auto mt-5 h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
              <div className="safety-patch-scan__bar h-full w-1/2 rounded-full bg-[#00D2FF]" />
            </div>
            <p className="mt-8 text-[10px] font-medium leading-relaxed text-white/55">{DISCLOSURE}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
