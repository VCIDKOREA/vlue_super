import { X } from "lucide-react";

/** 하단 바에서 열리는 전체 화면 패널 — 닫기/뒤로가기는 우측 고정 */
export default function AppFullScreenView({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  isDarkMode = false,
  children,
  className = "",
  /** true면 하단 카테고리 바 영역을 비워 둠 */
  reserveBottomNav = false,
  /** true면 하단 내비까지 덮는 진짜 전체화면 (쇼케이스 천막 등) */
  coverBottomNav = false,
  /** reserveBottomNav일 때 CSS 변수 대신 쓸 실측 px (네비 높이) */
  bottomInsetPx = null,
  /** true면 타이틀 헤더 숨김 */
  hideHeader = false,
  /** hideHeader일 때 우상단 플로팅 닫기 (자식이 자체 닫기를 쓰면 false) */
  showFloatingClose = true
}) {
  if (!open) return null;

  const zClass = coverBottomNav ? "z-[220]" : "z-[140]";
  const closeBtnClass = `inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
    isDarkMode
      ? "bg-black/55 text-gray-100 ring-1 ring-white/20 backdrop-blur-md"
      : "bg-white/95 text-slate-700 shadow-sm ring-1 ring-slate-200/80"
  }`;

  let bottom = 0;
  if (!coverBottomNav && reserveBottomNav) {
    bottom =
      bottomInsetPx != null && Number.isFinite(Number(bottomInsetPx))
        ? Number(bottomInsetPx)
        : "var(--vlue-bottom-nav-offset, 0px)";
  }

  return (
    <div
      className={`fixed inset-x-0 top-0 flex flex-col ${zClass} ${isDarkMode ? "bg-[#111827] text-gray-100" : "bg-white text-slate-900"} ${className}`.trim()}
      style={{ bottom, margin: 0, padding: 0 }}
      data-afv-bottom={typeof bottom === "number" ? String(bottom) : "css-var"}
      role="dialog"
      aria-modal="true"
      aria-label={title || "전체 화면"}
    >
      {hideHeader ? null : (
        <header
          className={`flex shrink-0 items-center gap-3 border-b px-3 pb-3 pt-[max(10px,env(safe-area-inset-top,0px))] ${
            isDarkMode ? "border-white/10" : "border-slate-100"
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {Icon ? <Icon className="h-5 w-5 shrink-0 text-blue-600" aria-hidden /> : null}
            <div className="min-w-0">
              <h2 className={`truncate text-[17px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>{title}</h2>
              {subtitle ? (
                <p className={`truncate text-[11px] ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>{subtitle}</p>
              ) : null}
            </div>
          </div>
          <button type="button" onClick={onClose} className={closeBtnClass} aria-label="닫기">
            <X size={18} strokeWidth={2.4} aria-hidden />
          </button>
        </header>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>

      {hideHeader && showFloatingClose ? (
        <button
          type="button"
          onClick={onClose}
          className={`pointer-events-auto absolute right-3 z-[300] ${closeBtnClass}`}
          style={{ top: "max(12px, env(safe-area-inset-top, 0px))" }}
          aria-label="닫기"
        >
          <X size={18} strokeWidth={2.4} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
