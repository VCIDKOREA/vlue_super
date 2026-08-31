import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import AppFullScreenView from "../AppFullScreenView.jsx";
import MyCaseIgPostViewer from "./MyCaseIgPostViewer.jsx";
import { readProfilePhotoAvatar } from "../../lib/vlueAvatar.js";
import { fetchMycaseDetail } from "../../lib/mycaseApi.js";
import { CLOSE_SHOWCASE_OVERLAYS_EVENT } from "../../lib/showcase/closeShowcaseOverlays.js";
import { trackShowcaseView } from "../../lib/productMetrics.js";
import "./my-case-detail.css";
import "./my-case-ig-post.css";

function readPreviewIdentity() {
  let name = "";
  let handle = "";
  try {
    name = String(localStorage.getItem("vlue_legal_name") || "").trim();
    handle = String(localStorage.getItem("vlue_member_handle") || "")
      .replace(/^@/, "")
      .trim();
  } catch {
    /* ignore */
  }
  return { name: name || handle || "VLUE", handle: handle || "mycase" };
}

/**
 * 마이케이스 게시물 뷰어 — DCC 없이 쇼케이스·피드만 (인스타형)
 */
export default function MyCaseDetailModal({
  open,
  item,
  detail,
  feedItems = null,
  startIndex = 0,
  isOwner = false,
  peerIdentity = null,
  layout = "mobile",
  isDarkMode = false,
  showcasePickEnabled = false,
  onClose,
  onToast,
  onEditPost,
  onDeletePost
}) {
  const isDesktop = layout === "desktop";
  const feed = useMemo(() => {
    const list = Array.isArray(feedItems) && feedItems.length ? feedItems : item ? [item] : [];
    return list.filter((x) => x && x.id);
  }, [feedItems, item]);

  const initialIdx = useMemo(() => {
    if (!item?.id) return Math.max(0, Math.min(startIndex, Math.max(0, feed.length - 1)));
    const found = feed.findIndex((x) => x.id === item.id);
    return found >= 0 ? found : Math.max(0, Math.min(startIndex, Math.max(0, feed.length - 1)));
  }, [feed, item, startIndex]);

  const [index, setIndex] = useState(initialIdx);
  const [detailCache, setDetailCache] = useState(() => {
    const id = item?.id;
    if (id && detail) return { [id]: detail };
    return {};
  });
  const [loadingIds, setLoadingIds] = useState({});
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const scrollerRef = useRef(null);
  const ignoreScrollRef = useRef(false);
  const detailCacheRef = useRef(detailCache);
  detailCacheRef.current = detailCache;
  const fetchingRef = useRef(new Set());

  const owner = Boolean(isOwner || detail?.isOwner);
  const selfIdentity = useMemo(() => readPreviewIdentity(), [open]);
  const displayName = owner
    ? selfIdentity.name
    : String(peerIdentity?.name || item?.title || "VLUE").trim() || "VLUE";
  const displayHandle = owner
    ? selfIdentity.handle
    : String(peerIdentity?.handle || "").replace(/^@/, "").trim() || displayName;
  const avatarUrl = owner
    ? readProfilePhotoAvatar()
    : String(peerIdentity?.photoUrl || item?.thumbnailUrl || "").trim();

  useEffect(() => {
    if (!open) {
      setPostMenuOpen(false);
      return;
    }
    setPostMenuOpen(false);
  }, [open, index]);

  useEffect(() => {
    if (!open) return;
    setIndex(initialIdx);
    setDetailCache((prev) => {
      const id = item?.id;
      if (id && detail) return { ...prev, [id]: detail };
      return prev;
    });
    if (!isDesktop) {
      ignoreScrollRef.current = true;
      requestAnimationFrame(() => {
        const root = scrollerRef.current;
        const slides = root?.querySelectorAll(".my-case-feed__slide");
        slides?.[initialIdx]?.scrollIntoView({ block: "start" });
        window.setTimeout(() => {
          ignoreScrollRef.current = false;
        }, 80);
      });
    }
  }, [open, initialIdx, item?.id, detail, isDesktop]);

  const ensureDetail = useCallback(
    async (feedItem) => {
      const id = String(feedItem?.id || "").trim();
      if (!id) return;
      if (feedItem?.isLiveStyle || id.startsWith("live-style-")) {
        setDetailCache((prev) => ({
          ...prev,
          [id]: prev[id] || { ok: true, item: feedItem, isOwner: Boolean(isOwner) }
        }));
        return;
      }
      if (detailCacheRef.current[id] || fetchingRef.current.has(id)) return;
      fetchingRef.current.add(id);
      setLoadingIds((prev) => ({ ...prev, [id]: true }));
      try {
        const res = await fetchMycaseDetail(id);
        if (res.ok) {
          setDetailCache((prev) => ({ ...prev, [id]: res }));
        } else {
          onToast?.(res.message || "게시물을 불러오지 못했습니다.");
        }
      } finally {
        fetchingRef.current.delete(id);
        setLoadingIds((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [isOwner, onToast]
  );

  useEffect(() => {
    if (!open || !feed.length) return;
    const current = feed[index];
    if (current) void ensureDetail(current);
    const prev = feed[index - 1];
    const next = feed[index + 1];
    if (prev) void ensureDetail(prev);
    if (next) void ensureDetail(next);
  }, [open, feed, index, ensureDetail]);

  useEffect(() => {
    if (!open || !isDesktop || typeof document === "undefined") return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isDesktop]);

  const scrollToFeedIndex = useCallback(
    (nextIdx) => {
      if (isDesktop) return;
      ignoreScrollRef.current = true;
      requestAnimationFrame(() => {
        const root = scrollerRef.current;
        const slides = root?.querySelectorAll(".my-case-feed__slide");
        slides?.[nextIdx]?.scrollIntoView({ block: "start" });
        window.setTimeout(() => {
          ignoreScrollRef.current = false;
        }, 80);
      });
    },
    [isDesktop]
  );

  useEffect(() => {
    if (!open) return undefined;
    const ownerId = String(item?.ownerUserId || peerIdentity?.userId || "").trim();
    trackShowcaseView(isOwner ? "mycase_detail" : "peer_case_detail", ownerId);
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((i) => {
          const next = Math.min(feed.length - 1, i + 1);
          if (!isDesktop) scrollToFeedIndex(next);
          return next;
        });
      }
      if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => {
          const next = Math.max(0, i - 1);
          if (!isDesktop) scrollToFeedIndex(next);
          return next;
        });
      }
    };
    const onCloseOverlays = () => onClose?.();
    window.addEventListener("keydown", onKey);
    window.addEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onCloseOverlays);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onCloseOverlays);
    };
  }, [open, onClose, feed.length, item?.ownerUserId, peerIdentity?.userId, isOwner, isDesktop, scrollToFeedIndex]);

  const onScroll = () => {
    if (ignoreScrollRef.current || isDesktop) return;
    const root = scrollerRef.current;
    if (!root) return;
    const slides = root.querySelectorAll(".my-case-feed__slide");
    const top = root.scrollTop;
    let best = 0;
    let bestDist = Infinity;
    slides.forEach((el, i) => {
      const dist = Math.abs(el.offsetTop - top);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    if (best !== index && best >= 0 && best < feed.length) setIndex(best);
  };

  const goPrevPost = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNextPost = useCallback(() => {
    setIndex((i) => Math.min(feed.length - 1, i + 1));
  }, [feed.length]);

  useEffect(() => {
    if (!postMenuOpen) return undefined;
    const onDoc = (e) => {
      if (e.target?.closest?.(".my-case-feed__topbar-menu-wrap")) return;
      setPostMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [postMenuOpen]);

  useEffect(() => {
    setPostMenuOpen(false);
  }, [index, open]);

  if (!open || !feed.length) return null;

  const currentItem = feed[index];
  const currentDetail = detailCache[currentItem?.id] || null;
  const loading = Boolean(loadingIds[currentItem?.id]);

  const viewerProps = {
    item: currentItem,
    detail: currentDetail,
    owner,
    ownerUserId: owner
      ? (() => {
          try {
            return String(localStorage.getItem("vlue_server_user_id") || "").trim();
          } catch {
            return "";
          }
        })()
      : String(currentItem?.ownerUserId || peerIdentity?.userId || "").trim(),
    peerPhone: String(peerIdentity?.phone || "").trim(),
    displayName,
    displayHandle,
    avatarUrl,
    onClose,
    onToast,
    showcasePickEnabled: showcasePickEnabled && owner
  };

  if (isDesktop) {
    const overlay = (
      <div className="my-case-ig-overlay" role="presentation">
        <button
          type="button"
          className="my-case-ig-overlay__backdrop"
          onClick={onClose}
          aria-label="닫기"
        />
        <button
          type="button"
          className="my-case-ig-overlay__close"
          onClick={onClose}
          aria-label="닫기"
        >
          <X size={28} strokeWidth={1.8} />
        </button>
        <div className="my-case-ig-overlay__stage">
          {index > 0 ? (
            <button
              type="button"
              className="my-case-ig-overlay__post-nav my-case-ig-overlay__post-nav--prev"
              onClick={goPrevPost}
              aria-label="이전 게시물"
            >
              <ChevronLeft size={28} />
            </button>
          ) : (
            <span className="my-case-ig-overlay__post-nav-spacer" aria-hidden />
          )}
          <div className="my-case-ig-overlay__frame my-case-detail--post-viewer">
            {loading && !currentDetail ? (
              <div className="my-case-ig-post my-case-ig-post--modal">
                <div className="my-case-ig-post__empty" style={{ padding: 48 }}>
                  불러오는 중…
                </div>
              </div>
            ) : (
              <MyCaseIgPostViewer {...viewerProps} variant="modal" showClose={false} />
            )}
          </div>
          {index < feed.length - 1 ? (
            <button
              type="button"
              className="my-case-ig-overlay__post-nav my-case-ig-overlay__post-nav--next"
              onClick={goNextPost}
              aria-label="다음 게시물"
            >
              <ChevronRight size={28} />
            </button>
          ) : (
            <span className="my-case-ig-overlay__post-nav-spacer" aria-hidden />
          )}
        </div>
      </div>
    );
    if (typeof document === "undefined") return null;
    return createPortal(overlay, document.body);
  }

  const themeClass = "my-case-detail--dark";
  const activeItem = feed[index] || item || null;
  const activeDetail = activeItem ? detailCache[activeItem.id] || (activeItem.id === item?.id ? detail : null) : null;
  const canManagePost = Boolean(owner && activeItem && !activeItem.isLiveStyle);

  const handleEditPost = () => {
    if (!canManagePost || typeof onEditPost !== "function") return;
    setPostMenuOpen(false);
    onEditPost(activeItem, activeDetail);
  };

  const handleDeletePost = () => {
    if (!canManagePost || typeof onDeletePost !== "function") return;
    setPostMenuOpen(false);
    onDeletePost(activeItem, activeDetail);
  };

  return (
    <AppFullScreenView
      open={open}
      onClose={onClose}
      title=""
      hideHeader
      showFloatingClose={false}
      coverBottomNav
      elevateAbovePeerArchive
      isDarkMode
      className={`my-case-detail my-case-detail--feed my-case-detail--post-viewer ${themeClass}`}
    >
      <header className="my-case-feed__topbar">
        <button type="button" className="my-case-feed__back" onClick={onClose} aria-label="뒤로">
          <ChevronLeft size={26} strokeWidth={2} />
        </button>
        <span className="my-case-feed__topbar-title">게시물</span>
        {canManagePost ? (
          <div className="my-case-feed__topbar-menu-wrap">
            <button
              type="button"
              className="my-case-feed__topbar-menu"
              aria-label="게시물 옵션"
              aria-expanded={postMenuOpen}
              onClick={() => setPostMenuOpen((v) => !v)}
            >
              <Menu size={22} strokeWidth={2.2} aria-hidden />
            </button>
            {postMenuOpen ? (
              <div className="my-case-feed__post-menu" role="menu">
                <button type="button" role="menuitem" onClick={handleEditPost}>
                  게시물 수정
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="is-danger"
                  onClick={handleDeletePost}
                >
                  게시물 삭제
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <span className="my-case-feed__topbar-handle">{displayHandle}</span>
        )}
      </header>
      <div
        ref={scrollerRef}
        className="my-case-feed"
        onScroll={onScroll}
        role="feed"
        aria-label="마이케이스 게시물"
      >
        {feed.map((feedItem, i) => {
          const active = Math.abs(i - index) <= 1;
          const cached = detailCache[feedItem.id] || null;
          return (
            <section
              key={feedItem.id}
              className="my-case-feed__slide"
              aria-label={`${i + 1} / ${feed.length}`}
            >
              {active ? (
                loadingIds[feedItem.id] && !cached ? (
                  <div className="my-case-feed__slide-inner my-case-feed__slide-inner--loading">
                    <p>불러오는 중…</p>
                  </div>
                ) : (
                  <MyCaseIgPostViewer
                    item={feedItem}
                    detail={cached}
                    owner={owner || Boolean(cached?.isOwner)}
                    ownerUserId={
                      owner || Boolean(cached?.isOwner)
                        ? (() => {
                            try {
                              return String(localStorage.getItem("vlue_server_user_id") || "").trim();
                            } catch {
                              return "";
                            }
                          })()
                        : String(feedItem?.ownerUserId || peerIdentity?.userId || "").trim()
                    }
                    peerPhone={String(peerIdentity?.phone || "").trim()}
                    displayName={displayName}
                    displayHandle={displayHandle}
                    avatarUrl={avatarUrl}
                    onClose={onClose}
                    onToast={onToast}
                    showcasePickEnabled={showcasePickEnabled && (owner || Boolean(cached?.isOwner))}
                    variant="fullscreen"
                    showClose={false}
                  />
                )
              ) : null}
            </section>
          );
        })}
      </div>
    </AppFullScreenView>
  );
}
