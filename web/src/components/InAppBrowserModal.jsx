import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink, RotateCw, Lock, Globe } from "lucide-react";
import { pushAndroidBackHandler } from "../lib/androidBackStack.js";

function extractHostname(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function openExternal(url) {
  if (!url) return;
  try {
    const native = typeof window !== "undefined" ? window.Android || window.VlueLettering : null;
    if (native && typeof native.openExternalUrl === "function") {
      native.openExternalUrl(url);
      return;
    }
  } catch {
    /* ignore */
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * [VLUÉ] 실시간 뉴스 인앱 브라우저 모달 (InAppBrowserModal)
 * - 외부 브라우저 이탈 없이 VLUÉ 앱 내에서 기사 원문을 직접 열람
 * - 상단 헤더: 언론사명, 기사 제목, 외부 브라우저 열기, 새로고침, 닫기 [X]
 * - 상단 프로그레스 바(Progress Bar)로 로딩 상태 시각화
 * - Android 뒤로가기 버튼 및 ESC 키 지원
 */
export default function InAppBrowserModal({
  open = false,
  url = "",
  title = "",
  source = "",
  formattedDate = "",
  onClose,
  isDarkMode = false
}) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(15);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef(null);
  const progressTimerRef = useRef(null);

  const hostname = extractHostname(url);

  // 로딩 프로그레스 바 제어
  useEffect(() => {
    if (!open || !url) return;
    setLoading(true);
    setProgress(20);

    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          clearInterval(progressTimerRef.current);
          return prev;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 200);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [open, url, iframeKey]);

  const handleIframeLoad = useCallback(() => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setProgress(100);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleReload = useCallback(() => {
    setIframeKey((prev) => prev + 1);
  }, []);

  const handleOpenExternal = useCallback(() => {
    openExternal(url);
  }, [url]);

  // Android 뒤로가기 및 ESC 키 핸들러
  useEffect(() => {
    if (!open) return undefined;

    const unpop = pushAndroidBackHandler(() => {
      onClose?.();
      return true;
    });

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // 배경 스크롤 방지
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      unpop();
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  if (!open || !url || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${source || "뉴스"} 기사 원문`}
      className="fixed inset-0 z-[9999] flex flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 animate-in fade-in duration-200"
    >
      {/* 1. 상단 Safe-area 겸 헤더 바 */}
      <header className="relative flex flex-col border-b border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 pt-[env(safe-area-inset-top,0px)]">
        {/* 기사 로딩 프로그레스 바 */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-slate-100 dark:bg-slate-800 overflow-hidden">
          {loading ? (
            <div
              className="h-full bg-blue-600 dark:bg-sky-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          ) : null}
        </div>

        <div className="flex h-14 items-center justify-between px-3 gap-2">
          {/* 좌측: 언론사 뱃지, 도메인, 헤드라인 */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                {source ? (
                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-black text-blue-700 dark:bg-blue-900/40 dark:text-sky-300 shrink-0">
                    {source}
                  </span>
                ) : null}
                <span className="flex items-center gap-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500 truncate">
                  <Lock size={10} className="shrink-0 text-emerald-500" />
                  {hostname || "news.naver.com"}
                </span>
                {formattedDate ? (
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    · {formattedDate}
                  </span>
                ) : null}
              </div>
              <h2 className="text-[13px] font-bold tracking-tight text-slate-900 dark:text-white truncate max-w-[220px] sm:max-w-md">
                {title || "뉴스 기사 원문"}
              </h2>
            </div>
          </div>

          {/* 우측 액션 버튼들: 새로고침, 외부 브라우저로 열기, 닫기 [X] */}
          <div className="flex items-center gap-1 shrink-0">
            {/* 새로고침 버튼 */}
            <button
              type="button"
              onClick={handleReload}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-95 transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="새로고침"
              aria-label="웹뷰 새로고침"
            >
              <RotateCw size={17} className={loading ? "animate-spin" : ""} />
            </button>

            {/* 외부 브라우저로 열기 버튼 */}
            <button
              type="button"
              onClick={handleOpenExternal}
              className="flex h-9 items-center gap-1 px-2.5 rounded-full text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 active:scale-95 transition-colors dark:text-sky-300 dark:bg-sky-950/60 dark:hover:bg-sky-900/80"
              title="외부 브라우저로 열기"
              aria-label="외부 브라우저에서 열기"
            >
              <ExternalLink size={14} />
              <span className="hidden xs:inline">브라우저</span>
            </button>

            {/* 닫기 [X] 버튼 */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ml-1"
              title="닫기"
              aria-label="인앱 브라우저 닫기"
            >
              <X size={19} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. 웹뷰 컨테이너 (iframe) */}
      <div className="relative flex-1 w-full h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm pointer-events-none transition-opacity duration-300">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-sky-400" />
            <p className="mt-3 text-[12px] font-medium text-slate-500 dark:text-slate-400">
              기사를 불러오는 중입니다…
            </p>
          </div>
        ) : null}

        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={url}
          title={title || "기사 원문"}
          onLoad={handleIframeLoad}
          className="h-full w-full border-0 bg-white"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
          referrerPolicy="no-referrer-when-downgrade"
        />

        {/* 하단 보조 툴바: 언론사 보안 정책으로 iframe 렌더링이 막힌 경우 신속 대응 힌트 */}
        <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-slate-900/90 text-white backdrop-blur-md text-[11px] pb-[calc(8px+env(safe-area-inset-bottom,0px))]">
          <div className="flex items-center gap-1.5 min-w-0">
            <Globe size={13} className="text-sky-400 shrink-0" />
            <span className="truncate text-slate-300">
              화면이 정상 표시되지 않으면 우측 버튼을 누르세요.
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenExternal}
            className="shrink-0 ml-2 rounded-md bg-sky-500 px-2.5 py-1 text-[10.5px] font-black text-slate-950 hover:bg-sky-400 active:scale-95 transition-all"
          >
            외부 브라우저로 보기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
