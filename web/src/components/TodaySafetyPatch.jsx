import { useEffect, useRef, useState } from "react";
import {
  completeSafetyPatch,
  fetchSafetyPatchBrief,
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
const BRIEF_KEY = "vlue_safety_patch_briefed";
const NOTICE =
  "TODAY 안심패치가 아직 적용되지 않았습니다. 패치를 진행하여 최신 안전 상태를 동기화하세요.";
const DISCLOSURE =
  "본 VLUÉ 안심패치 동기화 서비스는 쿠팡 파트너스 활동의 일환으로, 구매 발생 시 일정액의 수수료를 제공받습니다.";

const FALLBACK_LINES = [
  { icon: "🤖", title: "Gemini AI 안심요약", body: "오늘의 가족 안심 요약을 동기화했습니다." },
  { icon: "📍", title: "위치", body: "최근 GPS·주소 정보를 점검했습니다." },
  { icon: "📡", title: "수집 정보", body: "배터리 · 접속 · GPS 상태를 동기화했습니다." },
  { icon: "🦠", title: "기기 악성 APP 감지", body: "최근 24시간 기기 악성·위험 권한 APP 감지 현황을 동기화합니다." },
  { icon: "🖥️", title: "원격앱 활성화", body: "최근 24시간 원격제어 앱 활성화·감지 횟수를 동기화합니다." },
  { icon: "💬", title: "SMS 스미싱", body: "의심 문자 모니터링을 동기화했습니다." },
  { icon: "🛡️", title: "보안패치", body: "24시간 TODAY 안심패치 세션이 활성화되었습니다." }
];

export default function TodaySafetyPatch({ isDarkMode = false }) {
  const [lastPatchedAt, setLastPatchedAt] = useState(() => readLocalPatch()?.lastPatchedAt || null);
  const [now, setNow] = useState(() => Date.now());
  const [promptOpen, setPromptOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefLines, setBriefLines] = useState(FALLBACK_LINES);
  const [scanError, setScanError] = useState("");
  const [statusChecked, setStatusChecked] = useState(false);
  const remindedRef = useRef(false);
  const wasCompleteRef = useRef(false);
  const briefTimerRef = useRef(0);
  const briefTapGuardRef = useRef(0);

  const remaining = remainingFrom(lastPatchedAt, now);
  const complete = remaining > 0;

  useEffect(() => {
    document.documentElement.classList.add("vlue-safety-patch");
    return () => document.documentElement.classList.remove("vlue-safety-patch");
  }, []);

  const showBrief = (lines, { autoCloseMs = 5200 } = {}) => {
    setBriefLines(Array.isArray(lines) && lines.length ? lines : FALLBACK_LINES);
    setBriefOpen(true);
    try {
      sessionStorage.setItem(BRIEF_KEY, "1");
    } catch {
      /* ignore */
    }
    if (briefTimerRef.current) window.clearTimeout(briefTimerRef.current);
    if (autoCloseMs > 0) {
      briefTimerRef.current = window.setTimeout(() => setBriefOpen(false), autoCloseMs);
    } else {
      briefTimerRef.current = 0;
    }
  };

  const openCompletedBrief = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (scanning) return;
    const nowTs = Date.now();
    if (nowTs - briefTapGuardRef.current < 450) return;
    briefTapGuardRef.current = nowTs;
    if (briefTimerRef.current) window.clearTimeout(briefTimerRef.current);
    /* 완료 상태가 아니어도 탭 시 요약은 열어 준다 (로컬/서버 시각 어긋남 대비) */
    setBriefOpen(true);
    showBrief(briefLines.length ? briefLines : FALLBACK_LINES, { autoCloseMs: 0 });
    try {
      const brief = await fetchSafetyPatchBrief();
      if (Array.isArray(brief?.lines) && brief.lines.length) {
        showBrief(brief.lines, { autoCloseMs: 0 });
      }
    } catch {
      /* 이미 FALLBACK 표시 */
    }
  };

  useEffect(() => () => {
    if (briefTimerRef.current) window.clearTimeout(briefTimerRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSafetyPatchStatus()
      .then(async (data) => {
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
        const done = Boolean(data?.complete || remainingFrom(data?.lastPatchedAt) > 0);
        if (!done) return;
        try {
          if (sessionStorage.getItem(BRIEF_KEY) === "1") return;
        } catch {
          /* ignore */
        }
        const brief = await fetchSafetyPatchBrief().catch(() => null);
        if (!cancelled) showBrief(brief?.lines);
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
    if (!statusChecked || scanning || briefOpen) return;
    if (expiredWhileOpen) {
      try {
        sessionStorage.removeItem(PROMPT_KEY);
        sessionStorage.removeItem(BRIEF_KEY);
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
  }, [complete, statusChecked, scanning, briefOpen]);

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
    let lines = FALLBACK_LINES;
    try {
      const data = await completeSafetyPatch();
      if (data?.lastPatchedAt) {
        setLastPatchedAt(data.lastPatchedAt);
        writeLocalPatch(data.lastPatchedAt);
      }
      if (Array.isArray(data?.brief?.lines) && data.brief.lines.length) {
        lines = data.brief.lines;
      } else {
        const brief = await fetchSafetyPatchBrief().catch(() => null);
        if (Array.isArray(brief?.lines) && brief.lines.length) lines = brief.lines;
      }
    } catch (error) {
      setScanError(error?.message || "패치 시각을 서버에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setScanning(false);
      showBrief(lines);
    }
  };

  const stickerClass = complete
    ? "bg-emerald-600 text-white"
    : isDarkMode
      ? "bg-slate-900 text-white ring-1 ring-amber-300/70"
      : "bg-white text-slate-900 ring-1 ring-amber-400 shadow-lg";

  /* 하단 크롬(--vlue-bottom-nav-offset) + 친구시트 접힘 높이 위. pointer-events-none 부모는 쓰지 않음. */
  const stickerBottom =
    "calc(var(--vlue-bottom-nav-offset, calc(54px + env(safe-area-inset-bottom, 0px))) + var(--friend-sheet-collapsed-h, 52px) + 10px)";

  return (
    <>
      <div
        className="fixed inset-x-0 z-[170] flex flex-col items-center gap-1 px-3"
        style={{ bottom: stickerBottom }}
      >
        {scanError && !promptOpen && !scanning && !briefOpen ? (
          <p className="max-w-md rounded-2xl bg-rose-600 px-3 py-1.5 text-center text-[11px] font-bold text-white">{scanError}</p>
        ) : null}
        {complete ? (
          <button
            type="button"
            onClick={(e) => void openCompletedBrief(e)}
            onPointerUp={(e) => {
              /* 일부 WebView는 click이 누락되고 pointerup만 옴 */
              if (e.pointerType === "touch" || e.pointerType === "pen") {
                void openCompletedBrief(e);
              }
            }}
            aria-label="안심패치 내용 보기"
            className={`inline-flex max-w-full cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-black tracking-tight shadow-md active:scale-[0.98] ${stickerClass}`}
          >
            <span className="truncate">🟢 TODAY 안심패치 완료 | {formatPatchCountdown(remaining)}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void runPatch()}
            className={`inline-flex max-w-full cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-black tracking-tight shadow-md active:scale-[0.98] ${stickerClass}`}
          >
            <span className="truncate">🛡️ TODAY 안심패치 미완료</span>
          </button>
        )}
      </div>

      {promptOpen && !scanning && !briefOpen ? (
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

      {briefOpen ? (
        <div
          className="fixed inset-0 z-[710] flex items-end justify-center bg-black/40 px-4 pb-[calc(54px+env(safe-area-inset-bottom,0px)+var(--friend-sheet-collapsed-h,52px)+24px)]"
          onClick={() => setBriefOpen(false)}
          role="presentation"
        >
          <div
            className={`safety-patch-brief max-h-[min(70vh,520px)] w-full max-w-md overflow-y-auto rounded-[28px] p-4 shadow-2xl ${isDarkMode ? "bg-[#111827] text-white" : "bg-white text-slate-900"}`}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="TODAY 안심패치 요약"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[14px] font-black tracking-tight">🟢 TODAY 안심패치 요약</p>
              <button
                type="button"
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isDarkMode ? "bg-white/10" : "bg-slate-100"}`}
                onClick={() => setBriefOpen(false)}
              >
                닫기
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {briefLines.map((line, idx) => (
                <li
                  key={`${line.title}-${line.icon}-${idx}`}
                  className={`rounded-2xl px-3 py-2 ${isDarkMode ? "bg-white/8" : "bg-slate-50"}`}
                >
                  <p className="text-[12px] font-black">
                    {line.icon} {line.title}
                  </p>
                  <p className={`mt-0.5 text-[12px] font-medium leading-snug ${isDarkMode ? "text-white/75" : "text-slate-600"}`}>
                    {line.body}
                  </p>
                </li>
              ))}
            </ul>
            <p className={`mt-3 text-center text-[10px] ${isDarkMode ? "text-white/45" : "text-slate-400"}`}>
              하단 타이머는 계속 유지됩니다. 바깥을 탭하면 닫힙니다.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
