/** 채팅 목록 상단 — [일반톡 | 메일톡] 세그먼트 스위치 */
export default function ChatListChannelSwitch({ value, onChange, isDarkMode = false }) {
  const active = value === "mailTalk" ? "mailTalk" : "general";

  return (
    <div
      className={`mb-2 flex w-full overflow-hidden rounded-xl border p-0.5 ${
        isDarkMode ? "border-white/10 bg-[#0f172a]" : "border-indigo-100 bg-indigo-50/80"
      }`}
      role="tablist"
      aria-label="채팅 채널"
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === "general"}
        onClick={() => onChange("general")}
        className={`flex-1 rounded-lg py-2 text-center text-[13px] font-bold transition-all ${
          active === "general"
            ? isDarkMode
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-blue-600 shadow-sm"
            : isDarkMode
              ? "text-gray-400"
              : "text-gray-500"
        }`}
      >
        일반톡
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "mailTalk"}
        onClick={() => onChange("mailTalk")}
        className={`flex-1 rounded-lg py-2 text-center text-[13px] font-bold transition-all ${
          active === "mailTalk"
            ? isDarkMode
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-blue-600 shadow-sm"
            : isDarkMode
              ? "text-gray-400"
              : "text-gray-500"
        }`}
      >
        메일톡
      </button>
    </div>
  );
}
