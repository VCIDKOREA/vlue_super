import { Fragment } from "react";
import { FAMILY_PLATFORM_MATRIX, matrixStatusLabel } from "../lib/familyPlatformCapabilities.js";

/** Android vs iOS 기능 비교 — 표 검증용 */
export default function FamilyPlatformMatrixPanel({ isDarkMode = false }) {
  const sub = isDarkMode ? "text-gray-400" : "text-gray-500";
  const strong = isDarkMode ? "text-gray-100" : "text-gray-900";
  const cell = isDarkMode ? "border-white/10" : "border-slate-100";

  const rows = Object.values(FAMILY_PLATFORM_MATRIX);

  return (
    <div className="mt-3">
      <p className={`text-[11px] font-bold ${strong}`}>플랫폼 기능 비교 (Android · iOS)</p>
      <div className={`mt-1.5 overflow-hidden rounded-lg border text-[10px] ${cell}`}>
        <div className={`grid grid-cols-3 gap-px bg-slate-100 ${isDarkMode ? "bg-white/10" : ""}`}>
          <div className={`px-2 py-1.5 font-bold ${isDarkMode ? "bg-[#151821]" : "bg-white"} ${strong}`}>구분</div>
          <div className={`px-2 py-1.5 font-bold ${isDarkMode ? "bg-[#151821]" : "bg-white"} ${strong}`}>안드로이드</div>
          <div className={`px-2 py-1.5 font-bold ${isDarkMode ? "bg-[#151821]" : "bg-white"} ${strong}`}>아이폰</div>
          {rows.map((row) => (
            <Fragment key={row.label}>
              <div className={`px-2 py-1.5 ${isDarkMode ? "bg-[#151821]" : "bg-white"} ${sub}`}>{row.label}</div>
              <div className={`px-2 py-1.5 ${isDarkMode ? "bg-[#151821]" : "bg-white"} text-emerald-700`}>
                {matrixStatusLabel(row.android)}
              </div>
              <div
                className={`px-2 py-1.5 ${isDarkMode ? "bg-[#151821]" : "bg-white"} ${
                  row.ios === false ? "text-rose-600" : row.ios === "limited" ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {matrixStatusLabel(row.ios)}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
