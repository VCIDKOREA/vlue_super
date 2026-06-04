import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "../lib/apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "../lib/vlueAuthHeaders.js";
import { generatePostDescription } from "../lib/vmingApi.js";
import ActiveBoard from "./ActiveBoard.jsx";
import ScreenBackHeader from "./common/ScreenBackHeader";

const FEED_SAMPLES = {
  free: [
    {
      id: "f-free-1",
      type: "video",
      title: "오늘의 러닝 기록",
      caption: "퇴근 후 5km 달리기 완료!",
      thumbUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80",
      previewWebpUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=480&q=55&fm=webp",
      videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      likes: 32,
      comments: 8,
      shares: 3
    },
    {
      id: "f-free-2",
      type: "image",
      title: "주말 브런치",
      caption: "친구들이랑 브런치 타임",
      thumbUrl: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=900&q=80",
      likes: 21,
      comments: 6,
      shares: 1
    }
  ],
  standard: [
    {
      id: "f-std-1",
      type: "video",
      title: "신규 서비스 소개",
      caption: "이번 달 프로모션 혜택을 확인하세요.",
      thumbUrl: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=900&q=80",
      previewWebpUrl: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=480&q=55&fm=webp",
      videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      likes: 101,
      comments: 27,
      shares: 9
    },
    {
      id: "f-std-2",
      type: "image",
      title: "매장 신규 입고",
      caption: "이번 주 인기 상품이 입고되었습니다.",
      thumbUrl: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=900&q=80",
      likes: 56,
      comments: 12,
      shares: 4
    }
  ],
  premium: [
    {
      id: "f-pre-1",
      type: "video",
      title: "프리미엄 라이브 예고",
      caption: "구독 탭 추천에서 실시간 라이브 진행 예정",
      thumbUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80",
      previewWebpUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=480&q=55&fm=webp",
      videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      likes: 214,
      comments: 41,
      shares: 19
    },
    {
      id: "f-pre-2",
      type: "image",
      title: "브랜드 스토리",
      caption: "고객 경험을 중심으로 서비스가 확장됩니다.",
      thumbUrl: "https://images.unsplash.com/photo-1552581234-26160f608093?w=900&q=80",
      likes: 133,
      comments: 22,
      shares: 8
    }
  ]
};

function PersonalFeed({
  profile,
  onOpenRoom,
  onOpenManager,
  onGoMain,
  appMode = "personal",
  activeOfficeCardId = "",
  membershipTier: membershipTierProp,
  onRequestPersonalMode,
  onRequestOfficeMode
}) {
  const [activeVideoId, setActiveVideoId] = useState("");
  const [selectedPostId, setSelectedPostId] = useState("");
  const [likedMap, setLikedMap] = useState({});
  const [countsMap, setCountsMap] = useState({});
  const [notice, setNotice] = useState("");
  const [apiPosts, setApiPosts] = useState([]);
  const [personalCardId, setPersonalCardId] = useState("");
  const [composeTitle, setComposeTitle] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [postBusy, setPostBusy] = useState(false);
  const [feedFetchTick, setFeedFetchTick] = useState(0);
  const tier = membershipTierProp || profile?.membershipTier || "free";
  const feedItems = useMemo(() => FEED_SAMPLES[tier] || FEED_SAMPLES.free, [tier]);
  const isPaid = tier === "standard" || tier === "premium";
  const selectedPost = useMemo(() => feedItems.find((item) => item.id === selectedPostId) || null, [feedItems, selectedPostId]);

  useEffect(() => {
    const uid = localStorage.getItem("vlue_server_user_id");
    if (!uid) {
      setPersonalCardId("");
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await vlueAuthFetch(apiUrl("/api/cards/me-context"), { headers: vlueAuthHeaders() });
        const data = await res.json();
        if (!cancelled && res.ok && data.owned?.[0]?.id) setPersonalCardId(data.owned[0].id);
      } catch {
        if (!cancelled) setPersonalCardId("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cardId = appMode === "office" ? activeOfficeCardId : personalCardId;
    if (!cardId) {
      setApiPosts([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const url = apiUrl(`/api/feed/posts?cardId=${encodeURIComponent(cardId)}`);
        const res = await fetch(url, { headers: vlueAuthHeaders() });
        const data = await res.json();
        if (!cancelled && res.ok && Array.isArray(data.posts)) setApiPosts(data.posts);
      } catch {
        if (!cancelled) setApiPosts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appMode, activeOfficeCardId, personalCardId, feedFetchTick]);

  const effectiveFeedCardId = appMode === "office" ? activeOfficeCardId : personalCardId;

  const submitServerPost = async () => {
    const uid = localStorage.getItem("vlue_server_user_id");
    const cardId = effectiveFeedCardId;
    const body = composeBody.trim();
    if (!uid || !cardId || !body) {
      setNotice("API·카드·본문을 확인해 주세요. (Wallet에서 명함 등록 필요할 수 있음)");
      setTimeout(() => setNotice(""), 2400);
      return;
    }
    setPostBusy(true);
    try {
      const res = await vlueAuthFetch(apiUrl("/api/feed/posts"), {
        method: "POST",
        headers: vlueAuthHeaders(),
        body: JSON.stringify({
          cardId,
          title: composeTitle.trim() || undefined,
          body
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `오류 ${res.status}`);
      setComposeBody("");
      setComposeTitle("");
      setNotice("서버 활동 보드에 게시되었습니다.");
      setFeedFetchTick((n) => n + 1);
      setTimeout(() => setNotice(""), 2000);
    } catch (e) {
      setNotice(e?.message || String(e));
      setTimeout(() => setNotice(""), 3200);
    } finally {
      setPostBusy(false);
    }
  };

  const getCounts = (item) => ({
    likes: countsMap[item.id]?.likes ?? item.likes,
    comments: countsMap[item.id]?.comments ?? item.comments,
    shares: countsMap[item.id]?.shares ?? item.shares
  });

  const onLike = (item) => {
    const already = !!likedMap[item.id];
    setLikedMap((prev) => ({ ...prev, [item.id]: !already }));
    setCountsMap((prev) => {
      const base = getCounts(item);
      return {
        ...prev,
        [item.id]: {
          ...base,
          likes: Math.max(0, base.likes + (already ? -1 : 1))
        }
      };
    });
  };

  const onComment = () => {
    setNotice("댓글은 곧 오픈됩니다. 현재는 공유로 소통해 주세요.");
    setTimeout(() => setNotice(""), 1200);
  };

  const onShare = async (item) => {
    try {
      await navigator.clipboard.writeText(`${item.title}\n${item.caption}`);
    } catch {
      // ignore clipboard permission issue
    }
    setCountsMap((prev) => {
      const base = getCounts(item);
      return {
        ...prev,
        [item.id]: {
          ...base,
          shares: base.shares + 1
        }
      };
    });
    setNotice("해당 게시물이 복사되었습니다.");
    setTimeout(() => setNotice(""), 1300);
  };

  return (
    <section className="mx-auto flex w-full max-w-none flex-1 flex-col overflow-hidden">
      <ScreenBackHeader title={profile?.name || "프로필"} onBack={onGoMain} />
      <div className="flex-1 overflow-y-auto px-3 pb-24 pt-3">
        <div className="mb-4">
          <p className="mb-1 text-[12px] font-black text-slate-900">내 활동 · 체험단 활동 보드</p>
          <p className="mb-2 text-[11px] font-semibold text-slate-500">요청하신 매칭/인증/리뷰/정산 흐름을 내 활동 영역 내부에 배치했습니다.</p>
          <ActiveBoard embedded onGoMain={onGoMain} />
        </div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50/90 px-3 py-2">
          <p className="text-[11px] font-black text-indigo-950">
            활동 범위: {appMode === "office" ? `직장내선 · ${activeOfficeCardId ? activeOfficeCardId.slice(0, 8) + "…" : "카드 미선택"}` : "개인"}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onRequestPersonalMode?.()}
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${appMode === "personal" ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-indigo-200"}`}
            >
              개인
            </button>
            <button type="button" onClick={() => onRequestOfficeMode?.()} className={`rounded-full px-2 py-0.5 text-[10px] font-black ${appMode === "office" ? "bg-indigo-800 text-white" : "bg-white text-indigo-900 ring-1 ring-indigo-200"}`}>
              직장내선
            </button>
          </div>
        </div>
        {effectiveFeedCardId && (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 shadow-sm">
            <p className="text-[11px] font-black text-emerald-950">서버 활동 작성 (§7 · POST /api/feed/posts)</p>
            <input
              value={composeTitle}
              onChange={(e) => setComposeTitle(e.target.value)}
              placeholder="제목 (선택)"
              className="mt-2 w-full rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-[12px]"
            />
            <textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              placeholder="본문을 입력하세요."
              rows={3}
              className="mt-2 w-full rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-[12px]"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  const seed = [composeTitle.trim(), composeBody.trim()].filter(Boolean).join("\n");
                  const r = await generatePostDescription({
                    message:
                      seed ||
                      "피드 게시물 상세설명을 자연스럽고 정중한 톤으로 3~4문장 작성해줘. 과장 문구는 줄이고 신뢰형 문장으로."
                  });
                  const text = String(r?.reply || "").trim();
                  if (text) setComposeBody(text);
                } catch (e) {
                  setNotice(
                    e instanceof Error
                      ? e.message
                      : "오늘 제공된 무료 체험 한도를 모두 소모하셨습니다. 월 4,900원 무제한 패키지를 이용해 보세요!"
                  );
                  setTimeout(() => setNotice(""), 2200);
                }
              }}
              className="mt-2 w-full rounded-lg border border-violet-200 bg-violet-50 py-2 text-[12px] font-black text-violet-700"
            >
              🤖 AI 본문 생성
            </button>
            <button
              type="button"
              disabled={postBusy}
              onClick={submitServerPost}
              className="mt-2 w-full rounded-lg bg-emerald-800 py-2 text-[12px] font-black text-white disabled:opacity-50"
            >
              {postBusy ? "게시 중…" : "서버에 게시"}
            </button>
            {!personalCardId && appMode === "personal" ? (
              <p className="mt-1 text-[10px] text-amber-900">개인 카드가 없습니다. Wallet에서 내선 등록·승인 후 소유 카드가 생기면 작성할 수 있습니다.</p>
            ) : null}
          </div>
        )}
        {effectiveFeedCardId && apiPosts.length > 0 && (
          <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-black text-slate-800">서버 활동 목록 (card_id)</p>
            <ul className="mt-2 space-y-1.5 text-[11px] text-slate-700">
              {apiPosts.slice(0, 12).map((p) => (
                <li key={p.id} className="rounded-lg bg-slate-50 px-2 py-1">
                  <span className="font-bold text-slate-500">{p.authorHandle || p.authorUserId?.slice(0, 6)}</span> · {p.body?.slice(0, 120)}
                  {p.metaJson?.internalAuthorUserId ? (
                    <span className="ml-1 text-[9px] text-amber-700">(감사 ID 저장됨)</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="relative rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full border border-gray-200 bg-gray-100" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-black text-gray-900">{profile?.name || "프로필"}</p>
              <p className="text-[11px] font-bold text-blue-600 uppercase">{tier}</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-blue-50 p-2.5 text-[11px] leading-relaxed text-blue-700">
            {isPaid
              ? "유료회원 활동 보드: 최대 15초 숏폼, 썸네일 기반 목록, 영상은 탭/정지 시점에만 로드됩니다. 비즈니스 버튼 사용 가능."
              : "무료회원 활동 보드: 최대 10초 숏폼, 광고 링크 없이 좋아요/댓글/공유 중심 커뮤니티 활동 공간입니다."}
          </div>
          <p className="mt-2 text-[10px] text-gray-400">
            운영 가이드: 영상 업로드는 720p 이하, 외부 스토리지 + CDN + 지연 로딩(현재 UI 프로토타입 반영)
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-lg bg-gray-900 py-2 text-[12px] font-black text-white"
            >
              {isPaid ? "구독" : "팔로우"}
            </button>
            <button
              type="button"
              onClick={() => profile?.roomId && onOpenRoom?.(profile.roomId)}
              className="rounded-lg border border-blue-200 bg-blue-50 py-2 text-[12px] font-black text-blue-700"
            >
              메시지보내기
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-black text-gray-800">게시물</p>
            <span className="text-[11px] font-bold text-gray-400">{feedItems.length}개</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {feedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedPostId(item.id);
                  if (item.type === "video") setActiveVideoId("");
                }}
                className="group relative aspect-square overflow-hidden rounded-md border border-gray-100"
              >
                <img src={item.previewWebpUrl || item.thumbUrl} alt="" className="h-full w-full object-cover transition group-active:scale-[0.98]" loading="lazy" />
                {item.type === "video" && (
                  <span className="absolute right-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-bold text-white">▶</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {selectedPost && (
          <article className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="relative h-64 w-full bg-gray-100">
              {selectedPost.type === "video" ? (
                activeVideoId === selectedPost.id ? (
                  <video
                    src={selectedPost.videoUrl}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <button type="button" onClick={() => setActiveVideoId(selectedPost.id)} className="relative h-full w-full">
                    <img src={selectedPost.previewWebpUrl || selectedPost.thumbUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">WebP 3초 미리보기</span>
                    <span className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/85 text-[18px] text-gray-900">▶</span>
                  </button>
                )
              ) : (
                <img src={selectedPost.thumbUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              )}
            </div>

            <div className="p-3">
              <p className="text-[14px] font-black text-gray-900">{selectedPost.title}</p>
              <p className="mt-1 text-[12px] text-gray-600">{selectedPost.caption}</p>
              <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold">
                <button type="button" onClick={() => onLike(selectedPost)} className={`rounded-md px-2 py-1 ${likedMap[selectedPost.id] ? "bg-rose-50 text-rose-600" : "bg-gray-100 text-gray-600"}`}>
                  좋아요 {getCounts(selectedPost).likes}
                </button>
                <button type="button" onClick={onComment} className="rounded-md bg-gray-100 px-2 py-1 text-gray-600">
                  댓글 {getCounts(selectedPost).comments}
                </button>
                <button type="button" onClick={() => onShare(selectedPost)} className="rounded-md bg-gray-100 px-2 py-1 text-gray-600">
                  공유 {getCounts(selectedPost).shares}
                </button>
              </div>
              {isPaid && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("vlue-kpi-event", { detail: { kind: "shop_clicked" } }));
                      window.open("https://shop.vlue.kr/my-store", "_blank", "noopener,noreferrer");
                    }}
                    className="rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] font-black text-white"
                  >
                    상점 바로가기
                  </button>
                  <button type="button" className="rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-black text-white">쿠폰 받기</button>
                  <button type="button" className="rounded-lg bg-violet-600 px-2.5 py-1 text-[10px] font-black text-white">통역 보이스톡 연결</button>
                </div>
              )}
            </div>
          </article>
        )}
        {notice && (
          <div className="mt-3 rounded-full bg-gray-900 px-4 py-2 text-center text-[11px] font-bold text-white">
            {notice}
          </div>
        )}
      </div>
    </section>
  );
}

export default PersonalFeed;
