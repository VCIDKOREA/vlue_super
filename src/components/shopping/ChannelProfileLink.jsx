/** 채널명·프로필 탭 → 상점 프로필 홈 워프 */
export default function ChannelProfileLink({
  item,
  onOpenStore,
  isDarkMode = false,
  size = "md",
  layout = "row"
}) {
  if (!item?.storeId) return null;
  const avatar =
    size === "sm" ? "h-8 w-8 text-[11px]" : size === "lg" ? "h-11 w-11 text-[14px]" : "h-9 w-9 text-[12px]";
  const nameCls = isDarkMode ? "text-neutral-300 hover:text-white" : "text-slate-700 hover:text-slate-900";

  const open = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onOpenStore?.(item.storeId);
  };

  if (layout === "column") {
    return (
      <button type="button" onClick={open} className="flex flex-col items-center gap-1 text-center">
        <span
          className={`flex ${avatar} items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 font-black text-white ring-2 ring-white/20`}
        >
          {(item.channelName || "?").slice(0, 1)}
        </span>
        <span className={`max-w-[72px] truncate text-[11px] font-bold underline-offset-2 hover:underline ${nameCls}`}>
          {item.channelName}
        </span>
      </button>
    );
  }

  return (
    <button type="button" onClick={open} className="flex min-w-0 items-center gap-2 text-left">
      <span
        className={`flex ${avatar} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 font-black text-white`}
      >
        {(item.channelName || "?").slice(0, 1)}
      </span>
      <span className={`truncate text-[12px] font-semibold underline-offset-2 hover:underline ${nameCls}`}>
        {item.channelName}
      </span>
      {item.verified ? (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-blue-500" aria-label="인증">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      ) : null}
    </button>
  );
}
