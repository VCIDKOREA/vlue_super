import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { loadStoreFeedPostCandidates } from "../lib/localAdFeedPosts.js";
import { createLocalAd } from "../lib/localAdsApi.js";
import { getPageDisplayProfile } from "../lib/pageProfileStorage.js";

export default function LocalAdRegisterModal({
  open,
  onClose,
  onRegistered,
  onGoPostToFeed,
  isDarkMode = false,
  cardId = ""
}) {
  const [candidates, setCandidates] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const postKey = (p) => `${p.source}:${p.id}`;
  const selected = candidates.find((p) => postKey(p) === selectedKey) || null;
  let page = { storeName: "내 매장", storeApproved: false };
  try {
    page = getPageDisplayProfile();
  } catch {
    /* localStorage unavailable */
  }

  useEffect(() => {
    if (!open) return;
    setError("");
    setSelectedKey("");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let cancelled = false;
    (async () => {
      setLoadingPosts(true);
      try {
        const list = await loadStoreFeedPostCandidates(cardId);
        if (!cancelled) setCandidates(list);
      } catch {
        if (!cancelled) setCandidates([]);
      } finally {
        if (!cancelled) setLoadingPosts(false);
      }
    })();

    const onPostsChanged = () => {
      if (!open) return;
      loadStoreFeedPostCandidates(cardId)
        .then((list) => {
          if (!cancelled) setCandidates(list);
        })
        .catch(() => {});
    };
    window.addEventListener("vlue-page-profile-changed", onPostsChanged);

    return () => {
      cancelled = true;
      window.removeEventListener("vlue-page-profile-changed", onPostsChanged);
      document.body.style.overflow = prev;
    };
  }, [open, cardId]);

  const resetAndClose = () => {
    setSelectedKey("");
    setError("");
    onClose?.();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!selected) {
      setError("상점 피드에서 광고할 게시물을 선택해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await createLocalAd({
        feedPostId: selected.id,
        feedPostSource: selected.source,
        storeName: selected.storeName,
        description: selected.body.slice(0, 300),
        location: selected.location,
        imageUrl: selected.imageUrl || null
      });
      onRegistered?.(data.ad);
      resetAndClose();
    } catch (err) {
      setError(err?.message || "등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (!open || typeof document === "undefined" || !document.body) return null;

  const panel = isDarkMode ? "border-white/10 bg-[#151821]" : "border-gray-200 bg-white";
  const field = isDarkMode
    ? "border-white/15 bg-white/5 text-gray-100"
    : "border-gray-200 bg-white text-gray-900";
  const muted = isDarkMode ? "text-gray-400" : "text-gray-500";

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/45 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className={`relative z-[1] w-full max-w-md rounded-2xl border p-4 shadow-2xl ${panel}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Local Ad</p>
            <h2 className={`text-[17px] font-black ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
              지역 광고 신청
            </h2>
            <p className={`mt-1 text-[11px] leading-relaxed ${muted}`}>
              <strong className="font-bold">상점 피드 게시물</strong>을 선택해 등록하면, AI가 지역·관심도·콘텐츠
              품질을 반영해 「우리동네 핫플레이스」에 송출합니다. 등록 즉시 상단 고정 노출은 없습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className={`rounded-lg px-2 py-1 text-[18px] ${muted}`}
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <p className={`mt-3 text-[10px] font-semibold ${muted}`}>
          매장: {page.storeName}
          {page.storeApproved ? " · 상점 피드" : " · VLUE PAGE 피드"}
        </p>

        <div className="mt-3 max-h-[min(42vh,320px)] overflow-y-auto rounded-xl border border-dashed border-violet-200/80 p-2">
          {loadingPosts ? (
            <p className={`py-6 text-center text-[12px] font-semibold ${muted}`}>피드 게시물 불러오는 중…</p>
          ) : candidates.length === 0 ? (
            <div className={`py-5 text-center ${muted}`}>
              <p className="text-[12px] font-semibold leading-relaxed">
                등록할 게시물이 없습니다.
                <br />
                MY 활동에서 피드 게시물을 올린 뒤 지역 광고로 신청할 수 있습니다.
              </p>
              {onGoPostToFeed ? (
                <button
                  type="button"
                  onClick={() => {
                    onGoPostToFeed();
                    resetAndClose();
                  }}
                  className="mt-4 w-full rounded-xl border-2 border-violet-500 bg-white py-3 text-[13px] font-black text-violet-700 shadow-sm active:scale-[0.99]"
                >
                  게시글 올리기 →
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-2">
              {candidates.map((post) => {
                const active = postKey(post) === selectedKey;
                return (
                  <li key={postKey(post)}>
                    <button
                      type="button"
                      onClick={() => setSelectedKey(postKey(post))}
                      className={`flex w-full gap-3 rounded-xl border p-2.5 text-left transition ${
                        active
                          ? "border-violet-500 bg-violet-50 ring-1 ring-violet-200"
                          : isDarkMode
                            ? "border-white/10 bg-white/5"
                            : "border-gray-100 bg-gray-50"
                      }`}
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-200">
                        {post.imageUrl ? (
                          <img src={post.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className={`flex h-full w-full items-center justify-center text-[9px] font-bold ${muted}`}>
                            VLUE
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`line-clamp-2 text-[12px] font-bold ${
                            isDarkMode ? "text-gray-100" : "text-gray-900"
                          }`}
                        >
                          {post.title}
                        </p>
                        <p className={`mt-0.5 text-[10px] ${muted}`}>
                          {post.source === "card_feed" ? "카드 피드" : "상점 피드"} · {post.location}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selected ? (
          <div className={`mt-3 rounded-xl border px-3 py-2 text-[11px] ${field}`}>
            <p className="font-bold text-violet-700">선택한 게시물 미리보기</p>
            <p className="mt-1 line-clamp-3">{selected.body}</p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-lg bg-red-50 px-2.5 py-2 text-[12px] font-semibold text-red-800">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={busy || !selected}
          className="mt-4 w-full rounded-xl bg-violet-600 py-3.5 text-[14px] font-black text-white shadow-md disabled:opacity-50"
        >
          {busy ? "신청 중…" : "지역 광고 신청 (AI 송출 대기)"}
        </button>
      </form>
    </div>,
    document.body
  );
}
