/** 카카오톡 스타일 설정 리스트 UI */

export function ChevronIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 opacity-40 ${className}`}
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function SettingsSection({ title, children, isDarkMode }) {
  return (
    <section className="mb-4">
      {title ? (
        <p className={`mb-2 px-1 text-[11px] font-medium tracking-wide ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
          {title}
        </p>
      ) : null}
      <div
        className={`overflow-hidden rounded-2xl border ${isDarkMode ? "border-white/10 bg-[#151821]" : "border-gray-100 bg-white"}`}
      >
        {children}
      </div>
    </section>
  );
}

export function SettingsDivider({ isDarkMode }) {
  return <div className={`mx-4 border-t ${isDarkMode ? "border-white/8" : "border-gray-100"}`} />;
}

export function SettingsRowButton({ label, sublabel, value, onClick, isDarkMode, destructive, danger }) {
  const isDanger = destructive || danger;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition active:bg-black/5 ${
        isDanger ? (isDarkMode ? "text-rose-400" : "text-rose-600") : isDarkMode ? "text-gray-100" : "text-gray-900"
      }`}
    >
      <span className="min-w-0 text-left">
        <span className="block text-[14px] font-medium">{label}</span>
        {sublabel ? (
          <span className={`mt-0.5 block text-[11px] font-normal ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
            {sublabel}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {value ? (
          <span className={`max-w-[88px] truncate text-[12px] font-normal ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
            {value}
          </span>
        ) : null}
        <ChevronIcon />
      </span>
    </button>
  );
}

export function SettingsToggleRow({ label, checked, onChange, isDarkMode, subtitle }) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 ${
        isDarkMode ? "text-gray-100" : "text-gray-900"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-[14px] font-medium">{label}</span>
        {subtitle ? (
          <span className={`mt-0.5 block text-[11px] font-normal ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
            {subtitle}
          </span>
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 accent-blue-600"
      />
    </label>
  );
}

export function SettingsSubpageShell({ title, subtitle, onBack, children, isDarkMode }) {
  return (
    <div className={`flex h-full min-h-0 flex-1 flex-col ${isDarkMode ? "bg-[#0b0c10] text-gray-100" : "bg-[#f4f6fa] text-gray-900"}`}>
      <div
        className={`flex shrink-0 items-center gap-2 border-b px-3 py-3 ${
          isDarkMode ? "border-white/10 bg-[#151821]" : "border-gray-100 bg-white"
        }`}
      >
        <button
          type="button"
          onClick={onBack}
          className={`grid h-9 w-9 place-items-center rounded-full text-[20px] ${
            isDarkMode ? "text-gray-300 hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"
          }`}
          aria-label="뒤로"
        >
          ‹
        </button>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[15px] font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>{title}</p>
          {subtitle ? (
            <p className={`truncate text-[11px] font-normal ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="vlue-scroll-pad-profile-panel flex-1 overflow-y-auto px-4 py-4 no-scrollbar">{children}</div>
    </div>
  );
}

export function FontScalePicker({ value, onChange, isDarkMode }) {
  const options = [
    { id: "small", label: "작게" },
    { id: "medium", label: "보통" },
    { id: "large", label: "크게" }
  ];
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`flex-1 rounded-xl border py-2.5 text-[12px] font-bold transition ${
            value === opt.id
              ? "border-blue-600 bg-blue-600 text-white"
              : isDarkMode
                ? "border-white/15 bg-white/5 text-gray-300"
                : "border-gray-200 bg-gray-50 text-gray-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
