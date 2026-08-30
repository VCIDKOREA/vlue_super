import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart } from "lucide-react";
import ShowcaseSocialRail from "./ShowcaseSocialRail.jsx";
import ShowcaseBannerFooter from "./ShowcaseBannerFooter.jsx";
import ShowcaseCommentSheet from "./ShowcaseCommentSheet.jsx";
import ShowcaseMoreMenu from "./ShowcaseMoreMenu.jsx";
import {
  fetchShowcaseSocial,
  recordShowcaseShareApi,
  toggleShowcaseLikeApi
} from "../../lib/showcase/showcaseSocialApi.js";
import { resolveShowcaseSocialSlideId } from "../../lib/showcase/resolveShowcaseSocialSlideId.js";
import { scrapShowcaseToVault } from "../../lib/showcase/scrapShowcaseToVault.js";
import { shareShowcaseInviteViaKakao } from "../../lib/call/shareShowcaseInviteKakao.js";
import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";
import { resolveShowcasePeerAvatar } from "../../lib/showcase/resolveShowcasePeerAvatar.js";
import { isVlueBrandAssetUrl } from "../../lib/vlueAvatar.js";
import {
  hasVlueLoggedInSession,
  VLUE_MEMBERSHIP_REQUIRED_MSG
} from "../../lib/vlueGuestAuthGate.js";

const OWNER_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function firstText(...values) {
  for (const v of values) {
    const s = String(v || "").trim();
    if (s) return s;
  }
  return "";
}

function isNetworkLikeError(err) {
  const msg = String(err || "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("network error")
  );
}

function likeErrorMessage(res) {
  if (res?.status === 401 || res?.needsAuth) return VLUE_MEMBERSHIP_REQUIRED_MSG;
  if (isNetworkLikeError(res?.error)) return "서버에 연결할 수 없어 임시로 반영했습니다.";
  const raw = String(res?.error || "").trim();
  if (raw && !/^failed to fetch$/i.test(raw)) return raw;
  return "좋아요에 실패했습니다.";
}

/**
 * 배너 슬라이드용 소셜 오버레이 (1~6) — V1
 * 펼친 쇼케이스에서는 실통화 중에도 노출 (부모 socialOverlayEnabled)
 */
export default function ShowcaseBannerSocialLayer({
  card,
  slide,
  previewMode = false,
  onToast,
  onReport: onReportProp,
  hideFooter = false
}) {
  const style = card?.showcaseStyle || null;
  const commentsEnabled = style?.commentsEnabled !== false;
  const shareEnabled = style?.shareEnabled !== false;
  const slideId = useMemo(
    () => resolveShowcaseSocialSlideId({ slide }),
    [slide]
  );
  const rawOwner = firstText(card?.userId, card?.ownerUserId, String(card?.feedId || "").replace(/^user-/i, ""));
  const ownerUserId = OWNER_UUID_RE.test(rawOwner) ? rawOwner : "";
  const phone = String(card?.phone || "").trim();
  const displayName = firstText(card?.organization, card?.name, card?.displayName);

  const caption = useMemo(
    () =>
      firstText(
        slide?.overlayText,
        slide?.caption,
        style?.richCustom?.bodyText
      ),
    [slide?.overlayText, slide?.caption, style?.richCustom?.bodyText]
  );

  const { avatarUrl, logoLetter } = useMemo(() => {
    const peer = resolveShowcasePeerAvatar({
      style,
      card,
      displayName,
      exposeCustom: true
    });
    if (peer.type === "image" && peer.url && !isVlueBrandAssetUrl(peer.url)) {
      return { avatarUrl: peer.url, logoLetter: displayName };
    }
    const logo = firstText(card?.logoUrl);
    if (logo && !isVlueBrandAssetUrl(logo)) {
      return { avatarUrl: logo, logoLetter: displayName };
    }
    return { avatarUrl: "", logoLetter: peer.initial || displayName };
  }, [style, card, displayName]);

  /* ownerUserId가 있으면 실제 API. 미리보기·오프라인은 로컬 토글 폴백 */
  const localOnly = !ownerUserId;
  const bgm = useShowcaseBgm();
  const likedRef = useRef(false);
  const likeCountRef = useRef(0);
  const likeGenRef = useRef(0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [seedComments, setSeedComments] = useState([]);
  const [commentOpen, setCommentOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [likeBurst, setLikeBurst] = useState(0);

  const popLikeBurst = useCallback(() => {
    setLikeBurst((n) => n + 1);
  }, []);

  const applyLike = useCallback((nextLiked, nextCount) => {
    likedRef.current = nextLiked;
    likeCountRef.current = nextCount;
    setLiked(nextLiked);
    setLikeCount(nextCount);
  }, []);

  useEffect(() => {
    let cancelled = false;
    likeGenRef.current = 0;
    if (!ownerUserId) {
      applyLike(false, 0);
      setCommentCount(0);
      setSeedComments([]);
      return undefined;
    }
    fetchShowcaseSocial(ownerUserId, { slideId }).then((res) => {
      if (cancelled || !res.ok || likeGenRef.current > 0) return;
      applyLike(res.likedByMe, res.likeCount);
      setCommentCount(res.comments.length);
      setSeedComments(res.comments);
    });
    return () => {
      cancelled = true;
    };
  }, [ownerUserId, slideId, applyLike]);

  const onLike = useCallback(
    (opts = {}) => {
      const forceLike = Boolean(opts.forceLike);
      if (!localOnly && !hasVlueLoggedInSession()) {
        onToast?.(VLUE_MEMBERSHIP_REQUIRED_MSG);
        return;
      }
      if (forceLike && likedRef.current) {
        popLikeBurst();
        return;
      }
      const prevLiked = likedRef.current;
      const prevCount = likeCountRef.current;
      const nextLiked = forceLike ? true : !prevLiked;
      const nextCount = nextLiked === prevLiked ? prevCount : nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);
      applyLike(nextLiked, nextCount);
      if (nextLiked) popLikeBurst();
      if (localOnly) return;

      const gen = ++likeGenRef.current;
      void toggleShowcaseLikeApi(ownerUserId, { slideId, liked: nextLiked }).then((res) => {
        if (gen !== likeGenRef.current) return;
        if (res.ok) {
          applyLike(res.likedByMe, res.likeCount);
          return;
        }
        if (res.status === 401) {
          applyLike(prevLiked, prevCount);
          onToast?.(VLUE_MEMBERSHIP_REQUIRED_MSG);
          return;
        }
        if (!res.status || isNetworkLikeError(res.error)) {
          if (isNetworkLikeError(res.error)) onToast?.(likeErrorMessage(res));
          return;
        }
        applyLike(prevLiked, prevCount);
        onToast?.(likeErrorMessage(res));
      });
    },
    [ownerUserId, slideId, localOnly, onToast, applyLike, popLikeBurst]
  );

  useEffect(() => {
    const onDoubleTap = (e) => {
      const sid = String(e?.detail?.slideId || "");
      if (sid && sid !== slideId) return;
      void onLike({ forceLike: true });
    };
    window.addEventListener("vlue-showcase-double-tap-like", onDoubleTap);
    return () => window.removeEventListener("vlue-showcase-double-tap-like", onDoubleTap);
  }, [slideId, onLike]);

  const onComment = useCallback(() => {
    if (!localOnly && !hasVlueLoggedInSession()) {
      onToast?.(VLUE_MEMBERSHIP_REQUIRED_MSG);
      return;
    }
    setCommentOpen(true);
  }, [localOnly, onToast]);

  const onShare = useCallback(async () => {
    await shareShowcaseInviteViaKakao({
      inviteeName: displayName,
      phone,
      onToast
    });
    if (!localOnly && hasVlueLoggedInSession()) {
      void recordShowcaseShareApi(ownerUserId, { slideId });
    }
  }, [displayName, phone, onToast, localOnly, ownerUserId, slideId]);

  const onSave = useCallback(() => {
    const r = scrapShowcaseToVault({
      card,
      showcaseStyle: style,
      phone
    });
    if (r?.ok) onToast?.("개인케이스에 저장되었습니다.");
    else onToast?.("저장에 실패했습니다.");
  }, [card, style, phone, onToast]);

  const handleReport = useCallback(() => {
    if (typeof onReportProp === "function") {
      onReportProp({ card, phone });
      return;
    }
    onToast?.("신고는 VLUE 앱 신고 화면에서 처리할 수 있습니다.");
  }, [onReportProp, card, phone, onToast]);

  return (
    <>
      {!hideFooter ? (
        <ShowcaseBannerFooter
          avatarUrl={avatarUrl}
          caption={caption}
          logoLetter={logoLetter}
        />
      ) : null}
      <ShowcaseSocialRail
        liked={liked}
        likeCount={likeCount}
        commentCount={commentCount}
        commentsEnabled={commentsEnabled}
        shareEnabled={shareEnabled}
        onLike={() => void onLike()}
        onComment={onComment}
        onShare={() => void onShare()}
        onMore={() => setMoreOpen(true)}
      />
      {likeBurst > 0 ? (
        <div key={likeBurst} className="showcase-like-burst" aria-hidden>
          <Heart size={88} strokeWidth={0} fill="currentColor" />
        </div>
      ) : null}
      {commentsEnabled ? (
        <ShowcaseCommentSheet
          open={commentOpen}
          onClose={() => setCommentOpen(false)}
          ownerUserId={ownerUserId}
          slideId={slideId}
          previewMode={localOnly}
          seedComments={seedComments}
          onCountChange={setCommentCount}
          onToast={onToast}
          onHashtag={() => setCommentOpen(false)}
          onMention={() => setCommentOpen(false)}
        />
      ) : null}
      <ShowcaseMoreMenu
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onSave={onSave}
        onReport={handleReport}
        onToggleBgm={() => bgm.toggleMute?.()}
        bgmMuted={Boolean(bgm.effectiveMuted || bgm.userMuted)}
        canToggleBgm={Boolean(bgm.canToggleMute)}
      />
    </>
  );
}
