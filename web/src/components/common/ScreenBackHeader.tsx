import type { ReactNode } from "react";
import BackButton from "./BackButton";

type ScreenBackHeaderProps = {
  title?: ReactNode;
  onBack?: () => void;
  isDarkMode?: boolean;
  className?: string;
  right?: ReactNode;
  sticky?: boolean;
};

/** 화면 상단 서브 헤더 — 뒤로가기는 항상 좌측, 제목은 그 오른쪽 */
export default function ScreenBackHeader({
  title,
  onBack,
  isDarkMode = false,
  className = "",
  right,
  sticky = true
}: ScreenBackHeaderProps) {
  const bar = isDarkMode
    ? "border-white/10 bg-[#151821]/95 text-white"
    : "border-slate-200 bg-white/95 text-slate-900";
  const stickyCls = sticky ? "sticky top-0 z-10 shrink-0" : "shrink-0";

  return (
    <header className={`flex items-center gap-1 border-b px-2 py-2 ${bar} ${stickyCls} ${className}`}>
      <BackButton variant="inline" onBack={onBack} isDarkMode={isDarkMode} />
      {title != null && title !== "" ? (
        typeof title === "string" ? (
          <h1 className="min-w-0 flex-1 truncate text-[16px] font-black leading-tight">{title}</h1>
        ) : (
          <div className="min-w-0 flex-1">{title}</div>
        )
      ) : (
        <div className="min-w-0 flex-1" />
      )}
      {right ? <div className="flex shrink-0 items-center gap-1">{right}</div> : null}
    </header>
  );
}
