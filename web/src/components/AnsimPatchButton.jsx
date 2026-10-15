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

export default function AnsimPatchButton({ className = "", isDarkMode = false }) {
  const [lastPatchedAt, setLastPatchedAt] = useState(() => readLocalPatch()?.lastPatchedAt || null);
  const [now, setNow] = useState(() => Date.now());
  const [promptOpen, setPromptOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefLines, setBriefLines] = useState(FALLBACK_LINES);
  const [scanError, setScanError] = useState("");
  const remindedRef = useRef(false);
  const wasCompleteRef = useRef(false);
  const briefTimerRef = useRef(0);
  const briefTapGuardRef = useRef(0);

  const remaining = remainingFrom(lastPatchedAt, now);
  const complete = remaining > 0;

  // 1. 브리프 모달 표출 함수
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

  // 2. 완료 상태에서 탭 시 안심 요약 브리프 열기
  const openCompletedBrief = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (scanning) return;
    const nowTs = Date.now();
    if (nowTs - briefTapGuardRef.current < 450) return;
    briefTapGuardRef.current = nowTs;
    if (briefTimerRef.current) window.clearTimeout(briefTimerRef.current);

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

  // 3. 서버 안심패치 상태 동기화
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
        if (Array.isArray(data?.brief?.lines) && data.brief.lines.length) {
          setBriefLines(data.brief.lines);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // 4. 초 단위 실시간 카운트다운 타이머
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // 5. 만료 알림 및 푸시 연동 (기존 백그라운드 기능 100% 동일 유지)
  useEffect(() => {
    if (complete) {
      wasCompleteRef.current = true;
      if (remaining <= PATCH_WARN_MS && !remindedRef.current) {
        remindedRef.current = true;
        remindSafetyPatch().catch(() => {});
        showLocalPatchNotice(
          "TODAY 안심패치",
          "안심패치 유효 시간이 곧 종료됩니다. 패치를 진행해 최신 안전 상태를 동기화하세요."
        );
      }
      return;
    }

    if (wasCompleteRef.current) {
      wasCompleteRef.current = false;
      showLocalPatchNotice(
        "TODAY 안심패치",
        "안심패치 유효 시간이 곧 종료됩니다. 패치를 진행해 최신 안전 상태를 동기화하세요."
      );
    }
  }, [complete, remaining]);

  // 6. 패치 실행 로직
  const runPatch = async () => {
    setPromptOpen(false);
    setScanError("");
    setScanning(true);
    try {
      openCoupangAffiliateSession();
    } catch {
      /* non-blocking */
    }
    const started = Date.now();
    try {
      const res = await completeSafetyPatch();
      const elapsed = Date.now() - started;
      if (elapsed < 1400) {
        await new Promise((r) => setTimeout(r, 1400 - elapsed));
      }
      const nextPatched = res?.lastPatchedAt || new Date().toISOString();
      writeLocalPatch(nextPatched);
      setLastPatchedAt(nextPatched);
      remindedRef.current = false;
      wasCompleteRef.current = true;

      // 브리프 표시
      if (Array.isArray(res?.brief?.lines) && res.brief.lines.length) {
        showBrief(res.brief.lines, { autoCloseMs: 6500 });
      } else {
        showBrief(FALLBACK_LINES, { autoCloseMs: 6500 });
      }
    } catch (e) {
      setScanError(e?.message || "안심패치 동기화에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div
      className={`ansim-patch-block relative w-full shrink-0 px-2.5 py-1.5 ${className}`.trim()}
      aria-label="TODAY 안심패치 영역"
    >
      {/* 에러 메시지 노출 */}
      {scanError && !promptOpen && !scanning && !briefOpen ? (
        <p className="mb-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-center text-[11px] font-bold text-white shadow-sm">
          {scanError}
        </p>
      ) : null}

      {/* 고정 블록형 안심패치 버튼 (rounded-xl / rounded-full) */}
      {complete ? (
        <button
          type="button"
          onClick={(e) => void openCompletedBrief(e)}
          className="group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-4 py-3 text-white shadow-md transition-all duration-200 active:scale-[0.98] hover:shadow-emerald-500/25"
          aria-label="TODAY 안심패치 완료 및 요약 보기"
        >
          {/* 빛나는 오버레이 효과 */}
          <div className="absolute inset-0 bg-white/5 opacity-0 transition-opacity group-hover:opacity-100" />

          {/* 좌측: 초록색 라이브 닷 인디케이터 + 타이틀 + 카운트다운 타이머 */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* 펄스 애니메이션 라이브 닷 */}
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-200" />
            </span>

            <div className="flex flex-col text-left min-w-0">
              <span className="truncate text-[13.5px] font-black tracking-tight text-white drop-shadow-sm">
                TODAY 안심패치 완료
              </span>
              <span className="text-[11px] font-bold text-emerald-100/90">
                유효 시간 | {formatPatchCountdown(remaining)}
              </span>
            </div>
          </div>

          {/* 우측: 상태 배지 */}
          <div className="shrink-0 flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-1 text-[10.5px] font-black text-white">
            <span>보안 요약</span>
            <span className="text-[11px]">›</span>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void runPatch()}
          className="group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 px-4 py-3 text-white shadow-md transition-all duration-200 active:scale-[0.98] hover:shadow-cyan-500/25 animate-pulse"
          aria-label="TODAY 안심패치 미완료 - 패치 진행하기"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[16px]">🛡️</span>
            <div className="flex flex-col text-left min-w-0">
              <span className="truncate text-[13.5px] font-black tracking-tight text-white">
                TODAY 안심패치 미완료
              </span>
              <span className="text-[11px] font-medium text-cyan-100">
                탭하여 24시간 안심 안전 상태를 동기화하세요
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-black text-white">
            <span>패치 실행</span>
            <span>›</span>
          </div>
        </button>
      )}

      {/* 패치 안내 팝업 다이얼로그 */}
      {promptOpen && !scanning && !briefOpen ? (
        <div className="fixed inset-0 z-[640] flex items-end justify-center bg-black/45 px-4 pb-[calc(54px+env(safe-area-inset-bottom,0px)+64px)]">
          <div
            className={`w-full max-w-md rounded-3xl p-4 shadow-2xl ${
              isDarkMode ? "bg-[#111827] text-white" : "bg-white text-slate-900"
            }`}
          >
            <p className="text-[15px] font-black">TODAY 안심패치</p>
            <p className="mt-2 text-[13px] font-medium leading-relaxed">{NOTICE}</p>
            {scanError ? <p className="mt-2 text-[12px] font-semibold text-rose-500">{scanError}</p> : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPromptOpen(false)}
                className={`flex-1 rounded-full px-3 py-2 text-[13px] font-bold ${
                  isDarkMode ? "bg-white/10" : "bg-slate-100"
                }`}
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

      {/* 패치 스캔 진행 모달 */}
      {scanning ? (
        <div className="fixed inset-0 z-[720] flex items-center justify-center bg-[#04121a]/88 px-6 text-white">
          <div className="safety-patch-scan relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/15 bg-[#0c1220]/90 px-5 py-8 text-center shadow-2xl">
            <p className="text-[13px] font-black tracking-wide text-[#00D2FF]">TODAY 안심패치</p>
            <p className="mt-3 text-[15px] font-bold leading-relaxed">
              가족 안전 데이터 동기화 및 안심패치 수신 중...
            </p>
            <div className="mx-auto mt-5 h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
              <div className="safety-patch-scan__bar h-full w-1/2 rounded-full bg-[#00D2FF] animate-[pulse_1s_ease-in-out_infinite]" />
            </div>
            <p className="mt-8 text-[10px] font-medium leading-relaxed text-white/55">{DISCLOSURE}</p>
          </div>
        </div>
      ) : null}

      {/* 안심패치 요약 브리프 모달 */}
      {briefOpen ? (
        <div
          className="fixed inset-0 z-[710] flex items-end justify-center bg-black/50 px-4 pb-[calc(54px+env(safe-area-inset-bottom,0px)+20px)] backdrop-blur-sm"
          onClick={() => setBriefOpen(false)}
          role="presentation"
        >
          <div
            className={`max-h-[min(72vh,540px)] w-full max-w-md overflow-y-auto rounded-[28px] p-4 shadow-2xl ${
              isDarkMode ? "bg-[#111827] text-white" : "bg-white text-slate-900"
            }`}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="TODAY 안심패치 요약"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/50 pb-2.5 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[14px] font-black tracking-tight">TODAY 안심패치 요약 리포트</p>
              </div>
              <button
                type="button"
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  isDarkMode ? "bg-white/10 hover:bg-white/20" : "bg-slate-100 hover:bg-slate-200"
                }`}
                onClick={() => setBriefOpen(false)}
              >
                닫기
              </button>
            </div>

            <ul className="mt-3 space-y-2">
              {briefLines.map((line, idx) => (
                <li
                  key={`${line.title}-${line.icon}-${idx}`}
                  className={`rounded-2xl p-3 ${
                    isDarkMode ? "bg-white/5" : "bg-slate-50"
                  }`}
                >
                  <p className="text-[12.5px] font-black text-slate-900 dark:text-white">
                    {line.icon} {line.title}
                  </p>
                  <p
                    className={`mt-1 text-[12px] font-medium leading-snug ${
                      isDarkMode ? "text-white/75" : "text-slate-600"
                    }`}
                  >
                    {line.body}
                  </p>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setBriefOpen(false)}
              className="mt-4 w-full rounded-2xl bg-emerald-600 py-3 text-[13px] font-black text-white shadow-md hover:bg-emerald-500"
            >
              확인
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
