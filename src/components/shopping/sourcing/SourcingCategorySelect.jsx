import { SOURCING_REGISTER_CATEGORIES } from "../../../lib/sourcingRegisterCategories.js";

export default function SourcingCategorySelect({ value, onChange, isDarkMode = false, error = false }) {
  const border = error ? "border-rose-400" : isDarkMode ? "border-white/10" : "border-slate-200";

  return (
    <ul
      className={`max-h-[200px] overflow-y-auto overscroll-y-contain rounded-xl border ${border} ${
        isDarkMode ? "bg-[#0f1218]" : "bg-slate-50/80"
      }`}
    >
      {SOURCING_REGISTER_CATEGORIES.map((name) => {
        const active = value === name;
        return (
          <li key={name}>
            <button
              type="button"
              onClick={() => onChange(name)}
              className={`flex w-full items-center justify-between border-b px-3 py-2.5 text-left text-[13px] transition last:border-b-0 ${
                isDarkMode ? "border-white/5" : "border-slate-100"
              } ${
                active
                  ? isDarkMode
                    ? "bg-violet-600/20 font-bold text-violet-200"
                    : "bg-violet-50 font-bold text-violet-700"
                  : isDarkMode
                    ? "text-gray-300 hover:bg-white/5"
                    : "text-slate-700 hover:bg-white"
              }`}
            >
              <span>{name}</span>
              {active ? <span className="text-[11px]">✓</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
