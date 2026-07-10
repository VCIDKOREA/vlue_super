import { ChevronLeft } from "lucide-react";

/** 하단 바에서 열리는 전체 화면 패널 */
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
  coverBottomNav = false
}) {
  if (!open) return null;

  const zClass = coverBottomNav ? "z-[220]" : "z-[140]";

  return (
    <div
      className={`fixed inset-x-0 top-0 flex flex-col ${zClass} ${isDarkMode ? "bg-[#111827] text-gray-100" : "bg-white text-slate-900"} ${className}`.trim()}
      style={{
        bottom: reserveBottomNav && !coverBottomNav ? "var(--vlue-bottom-nav-offset, 0px)" : 0
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header
        className={`flex shrink-0 items-center gap-3 border-b px-3 pb-3 pt-[max(10px,env(safe-area-inset-top,0px))] ${
          isDarkMode ? "border-white/10" : "border-slate-100"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            isDarkMode ? "bg-white/10 text-gray-200" : "bg-slate-100 text-slate-700"
          }`}
          aria-label="닫기"
        >
          <ChevronLeft size={20} strokeWidth={2.4} aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {Icon ? <Icon className="h-5 w-5 shrink-0 text-blue-600" aria-hidden /> : null}
          <div className="min-w-0">
            <h2 className={`truncate text-[17px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>{title}</h2>
            {subtitle ? (
              <p className={`truncate text-[11px] ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>{subtitle}</p>
            ) : null}
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
