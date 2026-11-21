/** VLUÉ SPACE 관측 콘솔의 화면 장식. 측정값이나 센서 상태를 만들지 않는다. */

export function SpaceMotionStyle() {
  return (
    <style>{`
      @keyframes vlue-space-scan {
        from { transform: translateY(10%); }
        to { transform: translateY(88%); }
      }
      @keyframes vlue-space-hold {
        0%, 100% { opacity: 0.45; }
        50% { opacity: 1; }
      }
      @media (prefers-reduced-motion: reduce) {
        .vlue-scan, .vlue-hold { animation: none !important; opacity: 1 !important; }
      }
    `}</style>
  );
}

export function SpaceCorners({ className = "" }) {
  const arm = "pointer-events-none absolute h-5 w-5 border-white/75";
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden>
      <span className={`${arm} left-1.5 top-1.5 border-l border-t`} />
      <span className={`${arm} right-1.5 top-1.5 border-r border-t`} />
      <span className={`${arm} bottom-1.5 left-1.5 border-b border-l`} />
      <span className={`${arm} bottom-1.5 right-1.5 border-b border-r`} />
    </div>
  );
}

export function SpaceChannel({ code, title, action, onAction }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onAction}
        className="min-h-11 rounded-sm border border-white/30 bg-black/50 px-3 text-[12px] font-semibold tracking-wide text-white"
      >
        {action}
      </button>
      <div className="min-w-0 text-right">
        <p className="truncate text-[10px] font-semibold tracking-[0.16em] text-white/80">{code}</p>
        <p className="truncate text-[11px] text-white/45">{title}</p>
      </div>
    </div>
  );
}

export function SpaceButton({ variant = "solid", className = "", children, ...props }) {
  const look =
    variant === "solid"
      ? "bg-white text-black disabled:bg-white/15 disabled:text-white/35"
      : variant === "quiet"
        ? "border border-white/15 bg-white/10 text-white disabled:text-white/30"
        : "border border-white/30 bg-black/40 text-white";
  return (
    <button
      type="button"
      className={`min-h-12 w-full rounded-sm px-3 text-[13px] font-semibold tracking-wide ${look} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SpacePanel({ kicker, children, className = "" }) {
  return (
    <section className={`relative rounded-sm border border-white/15 bg-white/[0.03] p-3 ${className}`}>
      {kicker ? <p className="text-[10px] font-semibold tracking-[0.14em] text-white/45">{kicker}</p> : null}
      {children}
    </section>
  );
}
