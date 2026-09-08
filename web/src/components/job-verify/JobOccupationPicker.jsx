import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import {
  groupJobOccupationsByInitial,
  isOtherJobOccupation,
  JOB_OCCUPATION_LIST
} from "../lib/jobOccupationCatalog.js";

/**
 * 직업 선택 리스트 — ㄱ~ㅎ 그룹 + 행정사 아래 기타(직접입력)
 */
export default function JobOccupationPicker({
  onSelect,
  onBack,
  isDarkMode = false
}) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? JOB_OCCUPATION_LIST.filter((x) => x.label.toLowerCase().includes(needle))
      : JOB_OCCUPATION_LIST;
    return groupJobOccupationsByInitial(filtered);
  }, [q]);

  const shell = isDarkMode ? "bg-slate-950 text-gray-100" : "bg-white text-slate-900";
  const line = isDarkMode ? "border-white/10" : "border-slate-200";
  const muted = isDarkMode ? "text-gray-500" : "text-slate-400";

  return (
    <div className={`flex h-full min-h-0 flex-col ${shell}`}>
      <div className={`flex shrink-0 items-center gap-2 border-b px-3 py-3 ${line}`}>
        {onBack ? (
          <button type="button" className="rounded-lg p-1.5" aria-label="뒤로" onClick={onBack}>
            <ChevronLeft size={22} />
          </button>
        ) : null}
        <h2 className="text-[16px] font-black leading-snug">인증하려는 직업을 선택해 주세요.</h2>
      </div>
      <div className={`shrink-0 border-b px-4 py-2 ${line}`}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="직업 검색"
          className={`w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none ${
            isDarkMode
              ? "border-white/15 bg-slate-900 text-gray-100"
              : "border-slate-200 bg-slate-50 text-slate-900"
          }`}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {groups.map(({ initial, items }) => (
          <div key={initial}>
            <p className={`px-4 py-2 text-[12px] font-bold ${muted}`}>{initial}</p>
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center border-b px-4 py-3.5 text-left text-[15px] font-semibold active:bg-slate-50 ${line} ${
                      isDarkMode ? "active:bg-white/5" : ""
                    }${isOtherJobOccupation(item.id) ? " text-blue-600" : ""}`}
                    onClick={() => onSelect?.(item)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
