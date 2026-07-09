import { useCallback, useEffect, useState } from "react";
import { fetchMyInterestKeywords, postInterestKeyword } from "../../lib/auctionApi.js";

export default function AuctionInterestKeywords({ isLoggedIn, onToast }) {
  const [keywords, setKeywords] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setKeywords([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchMyInterestKeywords();
      setKeywords(rows);
    } catch {
      /* optional panel */
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addKeyword = async () => {
    const kw = draft.trim();
    if (!kw || kw.length < 2) {
      onToast?.("2자 이상 키워드를 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      await postInterestKeyword(kw, "watchlist");
      setDraft("");
      await refresh();
      onToast?.("관심 키워드를 등록했습니다. 새 경매가 올라오면 알려드릴게요.");
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "키워드 등록 실패");
    } finally {
      setBusy(false);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <section className="mb-6 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wider text-violet-600">관심 키워드 알림</p>
      <p className="mt-1 text-sm text-slate-500">등록한 키워드와 맞는 VLUE 경매가 시작되면 푸시로 알려드립니다.</p>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addKeyword();
          }}
          placeholder="예: 아이패드, 레고, 한정판"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          maxLength={80}
        />
        <button
          type="button"
          onClick={addKeyword}
          disabled={busy}
          className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
        >
          등록
        </button>
      </div>

      {loading ? (
        <p className="mt-3 text-xs text-slate-400">불러오는 중…</p>
      ) : keywords.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {keywords.slice(0, 12).map((row) => (
            <span
              key={row.id}
              className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700"
            >
              {row.keyword}
              {row.source === "search" ? (
                <span className="ml-1 font-normal text-violet-400">검색</span>
              ) : null}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-400">아직 등록된 키워드가 없습니다.</p>
      )}
    </section>
  );
}
