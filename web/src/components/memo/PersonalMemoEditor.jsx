import { useCallback, useEffect, useRef, useState } from "react";
import ScreenBackHeader from "../common/ScreenBackHeader";
import { MEMO_BG_COLORS } from "../../lib/memoUtils.js";
import { isVlueNetworkError } from "../../lib/networkError.js";
import { createMemo, fetchLinkPreview, updateMemo } from "../../lib/memoApi.js";

const AUTOSAVE_MS = 3000;

export default function PersonalMemoEditor({
  memoId = "",
  initial = null,
  onBack,
  onSaved,
  isDarkMode = false,
  onToast
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [content, setContent] = useState(initial?.content || "");
  const [bgColor, setBgColor] = useState(initial?.bgColor || "white");
  const [tags, setTags] = useState(initial?.tags || []);
  const [reminderAt, setReminderAt] = useState(
    initial?.reminderAt ? initial.reminderAt.slice(0, 16) : ""
  );
  const [saveState, setSaveState] = useState("");
  const [showBgPicker, setShowBgPicker] = useState(false);
  const timerRef = useRef(null);
  const idRef = useRef(memoId || initial?.id || "");

  const persist = useCallback(async () => {
    const body = {
      title: title.slice(0, 100) || null,
      content: content.trim(),
      bgColor,
      tags,
      reminderAt: reminderAt ? new Date(reminderAt).toISOString() : null
    };
    if (!body.content) return;
    setSaveState("saving");
    try {
      let saved;
      if (idRef.current) {
        saved = await updateMemo(idRef.current, body);
      } else {
        saved = await createMemo({ ...body, type: initial?.type || "text" });
        idRef.current = saved.id;
      }
      setSaveState("saved");
      onSaved?.(saved);
    } catch (e) {
      setSaveState("");
      onToast?.(isVlueNetworkError(e) ? e.message : e instanceof Error ? e.message : "저장 실패");
    }
  }, [title, content, bgColor, tags, reminderAt, initial?.type, onSaved, onToast]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!content.trim()) return undefined;
    timerRef.current = setTimeout(() => {
      persist();
    }, AUTOSAVE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [title, content, bgColor, tags, reminderAt, persist]);

  const addLink = async () => {
    const url = window.prompt("링크 URL");
    if (!url?.trim()) return;
    try {
      const preview = await fetchLinkPreview(url.trim());
      const block = [preview.title, preview.description, url.trim()].filter(Boolean).join("\n");
      setContent((c) => `${c}\n${block}`.trim());
      if (!title && preview.title) setTitle(preview.title.slice(0, 100));
    } catch {
      setContent((c) => `${c}\n${url.trim()}`.trim());
    }
  };

  const addTagFromContent = () => {
    const m = content.match(/#([^\s#]+)/g);
    if (!m) return;
    const next = [...new Set([...tags, ...m.map((t) => t.slice(1))])];
    setTags(next);
  };

  const surface = isDarkMode ? "bg-[#0f1419] text-white" : "bg-slate-50 text-slate-900";
  const cardBg =
    MEMO_BG_COLORS.find((c) => c.id === bgColor)?.[isDarkMode ? "dark" : "light"] || "bg-white";

  return (
    <div className={`flex h-full min-h-0 flex-col ${surface}`}>
      <ScreenBackHeader
        title="메모 작성"
        onBack={onBack}
        isDarkMode={isDarkMode}
        right={
          <>
            {saveState === "saved" ? (
              <span className="text-[11px] font-bold text-emerald-500">저장됨 ✓</span>
            ) : saveState === "saving" ? (
              <span className="text-[11px] text-slate-400">저장 중…</span>
            ) : null}
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-bold text-white"
              onClick={persist}
            >
              저장
            </button>
          </>
        }
      />
      <div className={`flex-1 overflow-y-auto p-4 ${cardBg}`}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 100))}
          placeholder="제목 (선택)"
          maxLength={100}
          className={`mb-3 w-full border-0 bg-transparent text-[18px] font-bold outline-none placeholder:opacity-40 ${
            isDarkMode ? "text-white" : "text-slate-900"
          }`}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="메모 내용을 입력하세요"
          className={`min-h-[50vh] w-full resize-none border-0 bg-transparent text-[15px] leading-relaxed outline-none ${
            isDarkMode ? "text-white" : "text-slate-800"
          }`}
        />
        {tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                #{t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div
        className={`shrink-0 border-t px-2 py-2 ${
          isDarkMode ? "border-white/10 bg-[#151821]" : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex flex-wrap items-center justify-center gap-1 text-[11px]">
          <button type="button" className="rounded-lg px-2 py-2 opacity-80" onClick={addLink}>
            링크
          </button>
          <button type="button" className="rounded-lg px-2 py-2 opacity-80" onClick={addTagFromContent}>
            태그
          </button>
          <button type="button" className="rounded-lg px-2 py-2 opacity-80" onClick={() => setShowBgPicker((v) => !v)}>
            배경색
          </button>
          <label className="rounded-lg px-2 py-2 opacity-80">
            리마인더
            <input
              type="datetime-local"
              value={reminderAt}
              onChange={(e) => setReminderAt(e.target.value)}
              className="ml-1 max-w-[9rem] text-[10px]"
            />
          </label>
        </div>
        {showBgPicker ? (
          <div className="mt-2 flex justify-center gap-2">
            {MEMO_BG_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                className={`h-8 w-8 rounded-full border-2 ${c.light} ${
                  bgColor === c.id ? "border-blue-500" : "border-transparent"
                }`}
                onClick={() => setBgColor(c.id)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
