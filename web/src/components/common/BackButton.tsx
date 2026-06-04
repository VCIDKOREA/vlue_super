import { useNavigation } from "../../hooks/useNavigation";

export type BackButtonProps = {
  onBack?: () => void;
  hidden?: boolean;
  isDarkMode?: boolean;
  className?: string;
  /** 헤더·툴바 안 인라인(기본) | 패널 내부 절대 좌상단 | 전체화면 오버레이(풀스크린만) */
  variant?: "inline" | "panel" | "overlay";
};

function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

/** VLUE 공통 뒤로가기 — 방향은 항상 좌측(chevron-left) */
export default function BackButton({
  onBack,
  hidden = false,
  isDarkMode = false,
  className = "",
  variant = "inline"
}: BackButtonProps) {
  const { goBack } = useNavigation(onBack);

  if (hidden) return null;

  const tone = isDarkMode
    ? "text-white hover:bg-white/10 active:bg-white/15"
    : "text-slate-800 hover:bg-black/5 active:bg-black/10";

  const base = `flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 ${tone} ${className}`;

  if (variant === "panel") {
    return (
      <button type="button" onClick={goBack} className={`absolute left-0 top-0 ${base}`} aria-label="뒤로가기">
        <ChevronLeftIcon />
      </button>
    );
  }

  if (variant === "overlay") {
    return (
      <button
        type="button"
        onClick={goBack}
        className={`${base} bg-black/45 text-white backdrop-blur-sm hover:bg-black/60`}
        aria-label="뒤로가기"
      >
        <ChevronLeftIcon />
      </button>
    );
  }

  return (
    <button type="button" onClick={goBack} className={base} aria-label="뒤로가기">
      <ChevronLeftIcon />
    </button>
  );
}
