import { SHOPPING_REGISTER_CATEGORIES } from "../../lib/shoppingCategories.js";
import CategoryMenuIcon from "./CategoryMenuIcon.jsx";

/** 소싱·등록 등 — 카테고리 필수 선택 */
export default function CategorySelectField({ value, onChange, isDarkMode = false, error = false }) {
  const border = error ? "border-rose-400" : isDarkMode ? "border-white/10" : "border-slate-200";
  const textStrong = isDarkMode ? "text-gray-100" : "text-slate-900";

  return (
    <div>
      <p className={`text-[13px] font-black ${textStrong}`}>
        상품 카테고리 <span className="text-rose-500">*</span>
      </p>
      <p className={`mt-0.5 text-[11px] ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
        쇼핑 피드 노출·검색에 사용됩니다.
      </p>
      <ul
        className={`mt-2 max-h-[220px] overflow-y-auto overscroll-y-contain rounded-xl border ${border} ${
          isDarkMode ? "bg-[#0f1218]" : "bg-slate-50/80"
        }`}
      >
        {SHOPPING_REGISTER_CATEGORIES.map((name) => {
          const active = value === name;
          return (
            <li key={name}>
              <button
                type="button"
                onClick={() => onChange(name)}
                className={`flex w-full items-center gap-3 border-b px-3 py-2.5 text-left text-[13px] font-medium transition last:border-b-0 ${
                  isDarkMode ? "border-white/5" : "border-slate-100"
                } ${
                  active
                    ? isDarkMode
                      ? "bg-blue-600/25 font-bold text-blue-200"
                      : "bg-blue-50 font-bold text-blue-700"
                    : isDarkMode
                      ? "text-gray-300 hover:bg-white/5"
                      : "text-slate-700 hover:bg-white"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    active
                      ? isDarkMode
                        ? "bg-blue-500/30 text-blue-200"
                        : "bg-blue-100 text-blue-600"
                      : isDarkMode
                        ? "bg-white/[0.06] text-slate-400"
                        : "bg-white text-slate-500 shadow-sm"
                  }`}
                >
                  <CategoryMenuIcon categoryName={name} />
                </span>
                <span className="min-w-0 flex-1">{name}</span>
                {active ? (
                  <span className={`shrink-0 text-[11px] font-bold ${isDarkMode ? "text-blue-300" : "text-blue-600"}`}>
                    ✓
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
