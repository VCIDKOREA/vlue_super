import { useCallback, useEffect, useMemo, useState } from "react";
import ScreenBackHeader from "../common/ScreenBackHeader";
import PersonalMemoEditor from "./PersonalMemoEditor.jsx";
import {
  MEMO_FILTER_TABS,
  bgClasses,
  formatMemoDate,
  memoCardTitle,
  memoPreviewLine,
  sourceAppIcon,
  splitHighlightParts
} from "../../lib/memoUtils.js";
import { LOCAL_MEMO_CHANGED } from "../../lib/localMemoStorage.js";
import { isVlueNetworkError } from "../../lib/networkError.js";
import {
  deleteMemo,
  fetchMemos,
  requestMemoSummary,
  searchMemos,
  setMemoReminder,
  updateMemo
} from "../../lib/memoApi.js";

function MemoCard({
  memo,
  isDarkMode,
  searchQuery,
  onOpen,
  onLongPress
}) {
  const title = memoCardTitle(memo);
  const preview = memoPreviewLine(memo);
  const parts = splitHighlightParts(title, searchQuery);

  return (
    <button
      type="button"
      onClick={() => onOpen(memo)}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress(memo, e.clientX, e.clientY);
      }}
      className={`mb-2 w-full rounded-2xl border p-3 text-left shadow-sm transition active:scale-[0.99] ${
        isDarkMode ? "border-white/10" : "border-slate-100"
      } ${bgClasses(memo.bgColor, isDarkMode)}`}
    >
      <div className="flex items-start gap-2">
        {memo.isPinned ? <span className="shrink-0 text-[12px]" title="고정">📌</span> : null}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[14px] font-bold leading-snug">
            {parts.map((p, i) =>
              p.hit ? (
                <mark key={i} className="rounded bg-yellow-200/80 dark:bg-yellow-500/30">
                  {p.text}
                </mark>
              ) : (
                <span key={i}>{p.text}</span>
              )
            )}
          </p>
          {preview && preview !== title ? (
            <p className="mt-1 line-clamp-2 text-[12px] opacity-70">{preview}</p>
          ) : null}
          {memo.thumbnailUrl && (memo.type === "link" || memo.type === "image" || memo.type === "share") ? (
            <img src={memo.thumbnailUrl} alt="" className="mt-2 max-h-28 w-full rounded-lg object-cover" />
          ) : null}
          <div className="mt-2 flex items-center gap-2 text-[11px] opacity-60">
            <span>{formatMemoDate(memo.updatedAt)}</span>
            {memo.sourceApp ? (
              <span className="inline-flex items-center gap-0.5">
                {sourceAppIcon(memo.sourceApp)} {memo.sourceApp}
              </span>
            ) : null}
          </div>
        </div>
        {memo.isUnread ? <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" /> : null}
      </div>
    </button>
  );
}

export default function PersonalMemoScreen({
  onBack,
  isDarkMode = false,
  initialMemoId = "",
  onToast,
  onShareToChat,
  onOpenCalendar,
  onOpenSubhub
}) {
  const [filter, setFilter] = useState("all");
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editor, setEditor] = useState(null);
  const [detail, setDetail] = useState(null);
  const [menu, setMenu] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let list;
      if (searchOpen && searchQuery.trim()) {
        list = await searchMemos(searchQuery.trim());
      } else {
        const tag = searchQuery.startsWith("#") ? searchQuery.slice(1) : undefined;
        const data = await fetchMemos({ filter, tag });
        list = data.memos;
      }
      setMemos(list);
    } catch (e) {
      onToast?.(
        isVlueNetworkError(e) ? e.message : e instanceof Error ? e.message : "메모를 불러오지 못했습니다"
      );
      setMemos([]);
    } finally {
      setLoading(false);
    }
  }, [filter, searchOpen, searchQuery, onToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onChange = () => load();
    window.addEventListener(LOCAL_MEMO_CHANGED, onChange);
    return () => window.removeEventListener(LOCAL_MEMO_CHANGED, onChange);
  }, [load]);

  useEffect(() => {
    if (!initialMemoId || loading) return;
    const found = memos.find((m) => m.id === initialMemoId);
    if (found) setDetail(found);
  }, [initialMemoId, memos, loading]);

  const filtered = useMemo(() => {
    if (!searchOpen || !searchQuery.trim()) return memos;
    return memos;
  }, [memos, searchOpen, searchQuery]);

  const openMenu = (memo, x, y) => {
    setMenu({ memo, x: Math.min(x, window.innerWidth - 200), y: Math.min(y, window.innerHeight - 280) });
  };

  const runMenuAction = async (action) => {
    const memo = menu?.memo;
    setMenu(null);
    if (!memo) return;
    if (action === "pin") {
      await updateMemo(memo.id, { isPinned: !memo.isPinned });
      load();
      return;
    }
    if (action === "bookmark") {
      await updateMemo(memo.id, { isBookmarked: !memo.isBookmarked });
      load();
      return;
    }
    if (action === "edit") {
      setEditor(memo);
      setDetail(null);
      return;
    }
    if (action === "reminder") {
      const raw = window.prompt("리마인더 (YYYY-MM-DDTHH:mm)", memo.reminderAt?.slice(0, 16) || "");
      if (raw) {
        await setMemoReminder(memo.id, new Date(raw).toISOString());
        onToast?.("리마인더를 설정했습니다.");
        load();
      }
      return;
    }
    if (action === "delete") {
      if (!window.confirm("이 메모를 삭제할까요?")) return;
      await deleteMemo(memo.id);
      if (detail?.id === memo.id) setDetail(null);
      load();
      return;
    }
    if (action === "share") {
      onShareToChat?.(memo);
    }
  };

  if (editor) {
    return (
      <PersonalMemoEditor
        memoId={editor.id}
        initial={editor}
        isDarkMode={isDarkMode}
        onBack={() => {
          setEditor(null);
          load();
        }}
        onSaved={() => load()}
        onToast={onToast}
      />
    );
  }

  if (detail) {
    return (
      <div className={`flex h-full min-h-0 flex-col ${isDarkMode ? "bg-[#0f1419] text-white" : "bg-slate-50"}`}>
        <ScreenBackHeader
          title="메모"
          onBack={() => setDetail(null)}
          isDarkMode={isDarkMode}
          right={
            <button
              type="button"
              className="text-[12px] font-bold text-blue-600"
              onClick={() => {
                setEditor(detail);
                setDetail(null);
              }}
            >
              편집
            </button>
          }
        />
        <div className={`flex-1 overflow-y-auto p-4 ${bgClasses(detail.bgColor, isDarkMode)}`}>
          {detail.aiSummary ? (
            <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-[13px] dark:border-blue-800 dark:bg-blue-950/40">
              <p className="mb-1 text-[11px] font-bold text-blue-700 dark:text-blue-300">브이밍 요약</p>
              <p className="whitespace-pre-wrap">{detail.aiSummary}</p>
            </div>
          ) : null}
          {detail.title ? <h2 className="text-[18px] font-black">{detail.title}</h2> : null}
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{detail.content}</p>
          {detail.thumbnailUrl ? (
            <img src={detail.thumbnailUrl} alt="" className="mt-3 max-h-48 w-full rounded-xl object-cover" />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 border-t p-3 dark:border-white/10">
          <button
            type="button"
            className="rounded-xl bg-slate-100 px-3 py-2 text-[12px] font-bold dark:bg-white/10"
            onClick={() => onShareToChat?.(detail)}
          >
            채팅방 전송
          </button>
          <button
            type="button"
            className="rounded-xl bg-slate-100 px-3 py-2 text-[12px] font-bold dark:bg-white/10"
            onClick={() => onOpenCalendar?.(detail)}
          >
            일정 등록
          </button>
          {detail.sourceUrl ? (
            <button
              type="button"
              className="rounded-xl bg-slate-100 px-3 py-2 text-[12px] font-bold dark:bg-white/10"
              onClick={() => onOpenSubhub?.(detail.sourceUrl)}
            >
              쇼핑 저장
            </button>
          ) : null}
          <button
            type="button"
            className="ml-auto rounded-xl bg-blue-600 px-3 py-2 text-[12px] font-bold text-white"
            onClick={async () => {
              onToast?.("요약 중…");
              const summary = await requestMemoSummary(detail.content);
              const updated = await updateMemo(detail.id, { aiSummary: summary });
              setDetail(updated);
              onToast?.("요약을 추가했습니다.");
            }}
          >
            브이밍으로 요약하기
          </button>
        </div>
      </div>
    );
  }

  const shell = isDarkMode ? "bg-[#0f1419] text-white" : "bg-white text-slate-900";

  return (
    <div className={`flex h-full min-h-0 flex-col ${shell}`}>
      <ScreenBackHeader
        title="나의 메모장"
        onBack={onBack}
        isDarkMode={isDarkMode}
        right={
          <>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-[18px] leading-none opacity-80"
              aria-label="검색"
              onClick={() => setSearchOpen((v) => !v)}
            >
              🔍
            </button>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-[18px] leading-none opacity-80"
              aria-label="새 메모"
              onClick={() => setEditor({})}
            >
              ✏️
            </button>
          </>
        }
      />
      {searchOpen ? (
        <div className={`px-3 pb-2 ${isDarkMode ? "bg-[#151821]" : "bg-slate-50"}`}>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="제목·본문·#태그 검색"
            className={`w-full rounded-xl border px-3 py-2 text-[14px] ${
              isDarkMode ? "border-white/15 bg-black/30" : "border-slate-200 bg-white"
            }`}
          />
        </div>
      ) : null}
      <div
        className={`flex shrink-0 gap-1 overflow-x-auto border-b px-2 py-2 ${
          isDarkMode ? "border-white/10" : "border-slate-100"
        }`}
      >
        {MEMO_FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${
              filter === tab.id
                ? "bg-blue-600 text-white"
                : isDarkMode
                  ? "bg-white/10 text-slate-300"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-2 pb-20">
        {loading ? (
          <p className="py-8 text-center text-[13px] opacity-50">불러오는 중…</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-4xl">📝</p>
            <p className="mt-3 text-[14px] font-bold">메모를 작성하거나</p>
            <p className="text-[13px] opacity-70">외부 앱에서 공유해보세요</p>
          </div>
        ) : (
          filtered.map((memo) => (
            <MemoCard
              key={memo.id}
              memo={memo}
              isDarkMode={isDarkMode}
              searchQuery={searchQuery}
              onOpen={setDetail}
              onLongPress={openMenu}
            />
          ))
        )}
      </div>
      <button
        type="button"
        className="fixed bottom-[calc(54px+env(safe-area-inset-bottom,0px)+16px)] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl text-white shadow-lg"
        aria-label="새 메모"
        onClick={() => setEditor({})}
      >
        ✏️
      </button>
      {menu ? (
        <>
          <button type="button" className="fixed inset-0 z-[90] bg-black/20" onClick={() => setMenu(null)} />
          <div
            className="fixed z-[91] min-w-[168px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-[#151821]"
            style={{ left: menu.x, top: menu.y }}
          >
            {[
              { id: "pin", label: menu.memo.isPinned ? "고정 해제" : "고정" },
              { id: "bookmark", label: "북마크" },
              { id: "edit", label: "편집" },
              { id: "reminder", label: "리마인더" },
              { id: "share", label: "채팅방 공유" },
              { id: "delete", label: "삭제" }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className="block w-full px-4 py-2.5 text-left text-[13px] font-semibold dark:text-white"
                onClick={() => runMenuAction(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
