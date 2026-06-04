/** 모달·시트 공통 닫기(X) — 우상단 고정 */

export type ModalCloseButtonProps = {
  onClick: () => void;
  /** default: 밝은 패널 | onDark: 그라데이션·어두운 헤더 | subtle: 반투명 밝은 배경 */
  variant?: "default" | "onDark" | "subtle";
  className?: string;
  /** 패널 padding과 겹침 방지 */
  topClassName?: string;
  rightClassName?: string;
};

const variantClass: Record<NonNullable<ModalCloseButtonProps["variant"]>, string> = {
  default:
    "bg-white text-slate-600 shadow-md ring-1 ring-slate-200/90 hover:bg-slate-50 active:bg-slate-100",
  onDark:
    "bg-black/30 text-white shadow-lg ring-1 ring-white/25 backdrop-blur-sm hover:bg-black/45 active:bg-black/55",
  subtle:
    "bg-slate-100/95 text-slate-600 ring-1 ring-slate-200/80 hover:bg-white active:bg-slate-50"
};

export default function ModalCloseButton({
  onClick,
  variant = "default",
  className = "",
  topClassName = "top-3",
  rightClassName = "right-3"
}: ModalCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="닫기"
      className={`absolute z-20 flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-transform active:scale-95 ${topClassName} ${rightClassName} ${variantClass[variant]} ${className}`}
    >
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
