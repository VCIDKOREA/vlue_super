import { useEffect, useRef, useState } from "react";

function tabLabel(tab) {
  return tab.id === "favorites" ? "즐겨찾기" : tab.label;
}

export default function ChatListTabDropdown({ tabs, activeId, unreadByTab, isDarkMode, onSelect }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const active = tabs.find((tab) => tab.id === activeId) || tabs[0];
  const activeLabel = tabLabel(active);
  const otherUnread = tabs.some((tab) => tab.id !== activeId && (unreadByTab[tab.id] || 0) > 0);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[12px] font-bold ${
          isDarkMode ? "border-white/10 bg-[#0f172a] text-gray-100" : "border-indigo-100 bg-white text-gray-900"
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`대화 필터: ${activeLabel}`}
      >
        <span className="relative pl-0.5">
          {activeLabel}
          {otherUnread ? <span className="absolute -right-2.5 top-0 h-1.5 w-1.5 rounded-full bg-blue-500" /> : null}
        </span>
        <span
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center text-[10px] transition-transform ${
            open ? "rotate-180" : ""
          } ${isDarkMode ? "text-gray-400" : "text-gray-400"}`}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="대화 필터"
          className={`absolute left-0 right-0 z-40 mt-1 overflow-hidden rounded-xl border shadow-lg ${
            isDarkMode ? "border-white/10 bg-[#0f172a]" : "border-indigo-100 bg-white"
          }`}
        >
          {tabs.map((tab) => {
            const label = tabLabel(tab);
            const isActive = tab.id === activeId;
            const unread = unreadByTab[tab.id] || 0;
            return (
              <button
                key={tab.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onSelect(tab.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-[12px] font-bold ${
                  isActive
                    ? isDarkMode
                      ? "bg-white/10 text-blue-400"
                      : "bg-blue-50 text-blue-600"
                    : isDarkMode
                      ? "text-gray-300 hover:bg-white/5"
                      : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="relative">
                  {label}
                  {unread > 0 && !isActive ? (
                    <span className="absolute -right-2.5 top-0 h-1.5 w-1.5 rounded-full bg-blue-500" />
                  ) : null}
                </span>
                {isActive ? (
                  <span className={`text-[10px] ${isDarkMode ? "text-blue-400" : "text-blue-500"}`}>✓</span>
                ) : unread > 0 ? (
                  <span className={`text-[10px] ${isDarkMode ? "text-blue-400" : "text-blue-500"}`}>
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
