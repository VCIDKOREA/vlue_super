import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppFullScreenView from "../AppFullScreenView.jsx";
import LetteringIncomingNotification from "../LetteringIncomingNotification.jsx";
import { readDigitalCardActive, readMembershipTier } from "../../lib/bizcardAccountSync.js";
import { isPaidLetteringTier } from "../../lib/letteringMembership.js";
import {
  createDefaultShowcaseStyle,
  readShowcaseStyle
} from "../../lib/showcase/showcaseStyleStorage.js";
import { applyShowcaseStyleToCard } from "../../lib/showcase/applyShowcaseStyleToCard.js";
import { fetchMycaseDetail } from "../../lib/mycaseApi.js";
import { CLOSE_SHOWCASE_OVERLAYS_EVENT } from "../../lib/showcase/closeShowcaseOverlays.js";
import { trackShowcaseView } from "../../lib/productMetrics.js";
import "./my-case-detail.css";

function readPreviewIdentity() {
  let name = "";
  let phone = "";
  let handle = "";
  let org = "";
  try {
    name = String(localStorage.getItem("vlue_legal_name") || "").trim();
    phone = String(localStorage.getItem("myCardPhone") || localStorage.getItem("vlue_phone_e164") || "").trim();
    handle = String(localStorage.getItem("vlue_member_handle") || "")
      .replace(/^@/, "")
      .trim();
    org = String(localStorage.getItem("vlue_company_locked") || "").trim();
  } catch {
    /* ignore */
  }
  return { name: name || handle || "VLUE", phone, handle, org };
}

function buildPreviewCard({ item, detail, owner, selfIdentity, peerIdentity, membershipTier, includeDigitalCard }) {
  let userId = "";
  try {
    userId = String(localStorage.getItem("vlue_server_user_id") || "").trim();
  } catch {
    /* ignore */
  }

  const payload = detail?.item?.payloadJson || item?.payloadJson || {};
  const fromStyle = payload?.style;
  let style = createDefaultShowcaseStyle();
  if (fromStyle && typeof fromStyle === "object") {
    style = { ...style, ...fromStyle };
  } else if (owner) {
    try {
      style = readShowcaseStyle();
    } catch {
      /* ignore */
    }
  }

  const identity = owner
    ? selfIdentity
    : {
        name: String(peerIdentity?.name || item?.title || "VLUE").trim() || "VLUE",
        phone: String(peerIdentity?.phone || "").trim(),
        handle: String(peerIdentity?.handle || "").replace(/^@/, "").trim(),
        org: String(peerIdentity?.organization || "").trim()
      };
  const photoUrl = String(peerIdentity?.photoUrl || item?.thumbnailUrl || "").trim();
  const logoUrl = String(peerIdentity?.logoUrl || "").trim();
  const base = {
    name: identity.name,
    displayName: identity.name,
    phone: identity.phone,
    organization: identity.org,
    membershipTier,
    showcaseStyle: style,
    photoUrl: owner ? "" : photoUrl,
    image_url: owner ? "" : photoUrl,
    logoUrl: owner ? "" : logoUrl,
    publicHandle: identity.handle,
    loginId: identity.handle,
    activityName: identity.name,
    userId: owner ? userId : String(peerIdentity?.userId || item?.ownerUserId || ""),
    ownerUserId: owner ? userId : String(peerIdentity?.userId || item?.ownerUserId || "")
  };
  return {
    card: applyShowcaseStyleToCard(base, membershipTier, {
      style,
      digitalCardActive: Boolean(includeDigitalCard),
      peerMode: !owner
    }),
    identity
  };
}

function FeedSlide({
  item,
  detail,
  loading,
  owner,
  selfIdentity,
  peerIdentity,
  membershipTier,
  includeDigitalCard,
  suppressBgm,
  onToast,
  active
}) {
  const { card, identity } = useMemo(
    () =>
      buildPreviewCard({
        item,
        detail,
        owner,
        selfIdentity,
        peerIdentity,
        membershipTier,
        includeDigitalCard
      }),
    [item, detail, owner, selfIdentity, peerIdentity, membershipTier, includeDigitalCard]
  );

  if (!active) {
    return <div className="my-case-feed__slide-inner my-case-feed__slide-inner--idle" aria-hidden />;
  }

  if (loading && !detail) {
    return (
      <div className="my-case-feed__slide-inner my-case-feed__slide-inner--loading">
        <p>불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="my-case-feed__slide-inner">
      <div className="my-case-detail__broadcast-shell lettering-showcase-fs lettering-showcase-fs--history-embed">
        <div className="lettering-showcase-fs__shell">
          <LetteringIncomingNotification
            className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent lettering-ongoing--mycase-feed"
            verified
            previewMode
            showOwnerSettings={false}
            hideUnverifiedFooter
            callPhase="connected"
            platform="android"
            isRecording={false}
            callDurationSec={0}
            recordingDurationSec={0}
            incomingNumber={identity.phone}
            savedContactName={identity.name}
            isKnownContact
            card={card}
            includeDigitalCard={Boolean(includeDigitalCard)}
            suppressBgm={suppressBgm}
            expanded
            onExpandedChange={() => {}}
            onEndCall={() => {}}
            onToast={onToast}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 마이케이스 게시물 뷰어 — 인스타형 상·하 스와이프로 계정 게시물 연속 열람
 * suppressBgm=true 이면 케이스함 BGM을 끊지 않음
 */
export default function MyCaseDetailModal({
  open,
  item,
  detail,
  feedItems = null,
  startIndex = 0,
  isOwner = false,
  peerIdentity = null,
  suppressBgm = false,
  onClose,
  onToast
}) {
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
  const scrollerRef = useRef(null);
  const ignoreScrollRef = useRef(false);
  const detailCacheRef = useRef(detailCache);
  detailCacheRef.current = detailCache;
  const fetchingRef = useRef(new Set());

  const owner = Boolean(isOwner || detail?.isOwner);
  const selfIdentity = useMemo(() => readPreviewIdentity(), [open]);
  const membershipTier = useMemo(() => {
    if (!owner && peerIdentity?.membershipTier) return peerIdentity.membershipTier;
    return readMembershipTier();
  }, [open, owner, peerIdentity]);

  const includeDigitalCard = useMemo(() => {
    if (!isPaidLetteringTier(membershipTier)) return false;
    if (owner) return readDigitalCardActive();
    return Boolean(peerIdentity?.digitalCardIssued);
  }, [owner, membershipTier, peerIdentity, open]);

  useEffect(() => {
    if (!open) return;
    setIndex(initialIdx);
    setDetailCache((prev) => {
      const id = item?.id;
      if (id && detail) return { ...prev, [id]: detail };
      return prev;
    });
    ignoreScrollRef.current = true;
    requestAnimationFrame(() => {
      const root = scrollerRef.current;
      if (root) {
        const h = root.clientHeight || 1;
        root.scrollTop = initialIdx * h;
      }
      window.setTimeout(() => {
        ignoreScrollRef.current = false;
      }, 80);
    });
  }, [open, initialIdx, item?.id, detail]);

  const ensureDetail = useCallback(async (feedItem) => {
    const id = String(feedItem?.id || "").trim();
    if (!id) return;
    /* 라이브 스타일 합성 항목 — API detail 불필요 */
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
      }
    } finally {
      fetchingRef.current.delete(id);
      setLoadingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, [isOwner]);

  useEffect(() => {
    if (!open || !feed.length) return;
    /* 이웃 ±1 prefetch 금지 — 현재 아이템만 detail GET (Pooler egress) */
    const current = feed[index];
    if (current) void ensureDetail(current);
  }, [open, feed, index, ensureDetail]);

  useEffect(() => {
    if (!open) return undefined;
    const ownerId = String(item?.ownerUserId || peerIdentity?.userId || "").trim();
    trackShowcaseView(isOwner ? "mycase_detail" : "peer_case_detail", ownerId);
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        setIndex((i) => Math.min(feed.length - 1, i + 1));
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    const onCloseOverlays = () => onClose?.();
    window.addEventListener("keydown", onKey);
    window.addEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onCloseOverlays);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onCloseOverlays);
    };
  }, [open, onClose, feed.length, item?.ownerUserId, peerIdentity?.userId, isOwner]);

  useEffect(() => {
    if (!open) return;
    const root = scrollerRef.current;
    if (!root) return;
    ignoreScrollRef.current = true;
    const h = root.clientHeight || 1;
    root.scrollTo({ top: index * h, behavior: "smooth" });
    window.setTimeout(() => {
      ignoreScrollRef.current = false;
    }, 320);
  }, [index, open]);

  const onScroll = () => {
    if (ignoreScrollRef.current) return;
    const root = scrollerRef.current;
    if (!root) return;
    const h = root.clientHeight || 1;
    const next = Math.round(root.scrollTop / h);
    if (next !== index && next >= 0 && next < feed.length) setIndex(next);
  };

  if (!open || !feed.length) return null;

  return (
    <AppFullScreenView
      open={open}
      onClose={onClose}
      title=""
      hideHeader
      showFloatingClose
      coverBottomNav
      className="my-case-detail my-case-detail--broadcast bg-[#0B101B]"
    >
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
              <FeedSlide
                item={feedItem}
                detail={cached}
                loading={Boolean(loadingIds[feedItem.id])}
                owner={owner || Boolean(cached?.isOwner)}
                selfIdentity={selfIdentity}
                peerIdentity={peerIdentity}
                membershipTier={membershipTier}
                includeDigitalCard={includeDigitalCard}
                suppressBgm={suppressBgm}
                onToast={onToast}
                active={active}
              />
              {feed.length > 1 ? (
                <p className="my-case-feed__counter" aria-hidden>
                  {i + 1}/{feed.length}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
    </AppFullScreenView>
  );
}
