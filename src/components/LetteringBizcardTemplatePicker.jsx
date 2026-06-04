import { LETTERING_BIZCARD_TEMPLATES, normalizeLetteringBizcardTemplate } from "../lib/letteringBizcardTemplates.js";

export default function LetteringBizcardTemplatePicker({ value, onChange, isDarkMode = false }) {
  const current = normalizeLetteringBizcardTemplate(value);

  return (
    <div className="space-y-2">
      <p className={`text-[12px] font-black ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>명함 디자인 테마</p>
      <p className={`text-[10px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
        테마를 바꿔도 보안 홀로그램·실시간 시각·QR은 항상 최상단에 고정됩니다.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {LETTERING_BIZCARD_TEMPLATES.map((tpl) => {
          const active = current === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onChange?.(tpl.id)}
              className={`rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99] ${
                active
                  ? isDarkMode
                    ? "border-cyan-400 bg-cyan-950/55 shadow-sm shadow-cyan-500/10"
                    : "border-blue-500 bg-blue-50 shadow-sm"
                  : isDarkMode
                    ? "border-white/10 bg-white/5"
                    : "border-gray-200 bg-white"
              }`}
            >
              <p className={`text-[11px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>{tpl.label}</p>
              <p className={`mt-0.5 text-[10px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{tpl.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
