import { useState } from "react";
import { sourceAppIcon } from "../../lib/memoUtils.js";

export default function MemoShareReceiveSheet({
  open,
  draft,
  onClose,
  onSave,
  onEditSave,
  isDarkMode = false
}) {
  const [tagInput, setTagInput] = useState("");

  if (!open || !draft) return null;

  const preview = draft.title || draft.content || "";
  const source = draft.sourceApp || "외부 앱";

  const parseTags = () =>
    tagInput
      .split(/[#,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

  const panel = isDarkMode
    ? "border-white/10 bg-[#151821] text-white"
    : "border-slate-200 bg-white text-slate-900";

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${panel}`}>
        <p className="text-[16px] font-black">메모장에 저장할까요?</p>
        <div
          className={`mt-3 max-h-32 overflow-y-auto rounded-xl border p-3 text-[13px] leading-relaxed ${
            isDarkMode ? "border-white/10 bg-black/20" : "border-slate-100 bg-slate-50"
          }`}
        >
          {draft.thumbnailUrl ? (
            <img src={draft.thumbnailUrl} alt="" className="mb-2 max-h-24 w-full rounded-lg object-cover" />
          ) : null}
          <p className="line-clamp-4 whitespace-pre-wrap">{preview}</p>
        </div>
        <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
          출처: {sourceAppIcon(source)} {source}
        </p>
        <label className="mt-3 block text-[12px] font-semibold text-slate-600 dark:text-slate-300">
          태그 추가 (선택)
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="#업무 #중요"
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-[13px] ${
              isDarkMode ? "border-white/15 bg-black/30" : "border-slate-200 bg-white"
            }`}
          />
        </label>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-[13px] font-bold text-white"
            onClick={() => onSave?.({ ...draft, tags: parseTags() })}
          >
            저장
          </button>
          <button
            type="button"
            className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold ${
              isDarkMode ? "bg-white/10 text-white" : "bg-slate-100 text-slate-800"
            }`}
            onClick={() => onEditSave?.({ ...draft, tags: parseTags() })}
          >
            편집 후 저장
          </button>
        </div>
        <button type="button" className="mt-2 w-full py-2 text-[12px] text-slate-500" onClick={onClose}>
          취소
        </button>
      </div>
    </div>
  );
}
