import { useCallback, useEffect, useMemo, useState } from "react";
import ShowcaseSocialRail from "./ShowcaseSocialRail.jsx";
import ShowcaseBannerFooter from "./ShowcaseBannerFooter.jsx";
import ShowcaseCommentSheet from "./ShowcaseCommentSheet.jsx";
import ShowcaseMoreMenu from "./ShowcaseMoreMenu.jsx";
import { fetchShowcaseSocial, toggleShowcaseLikeApi } from "../../lib/showcase/showcaseSocialApi.js";
import { scrapShowcaseToVault } from "../../lib/showcase/scrapShowcaseToVault.js";
import { shareShowcaseInviteViaKakao } from "../../lib/call/shareShowcaseInviteKakao.js";
import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";
import { resolveShowcasePeerAvatar } from "../../lib/showcase/resolveShowcasePeerAvatar.js";
import { isVlueBrandAssetUrl } from "../../lib/vlueAvatar.js";
import { readStatusMessage } from "../../lib/vlueAppSettings.js";
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
 * 실통화 중에는 부모에서 socialOverlayEnabled=false로 숨김
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
  const slideId = String(slide?.id || "").trim();
  const rawOwner = firstText(card?.userId, card?.ownerUserId, String(card?.feedId || "").replace(/^user-/i, ""));
  const ownerUserId = OWNER_UUID_RE.test(rawOwner) ? rawOwner : "";
  const phone = String(card?.phone || "").trim();
  const displayName = firstText(card?.organization, card?.name, card?.displayName);

  const caption = useMemo(
    () =>
      firstText(
        slide?.overlayText,
        slide?.caption,
        style?.richCustom?.bodyText,
        card?.statusMessage,
        card?.companyIntro,
        typeof window !== "undefined" ? readStatusMessage() : ""
      ),
    [slide?.overlayText, slide?.caption, style?.richCustom?.bodyText, card?.statusMessage, card?.companyIntro]
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
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [seedComments, setSeedComments] = useState([]);
  const [commentOpen, setCommentOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const applyLocalLikeToggle = useCallback(() => {
    setLiked((v) => {
      setLikeCount((n) => (v ? Math.max(0, n - 1) : n + 1));
      return !v;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!ownerUserId) {
      setLiked(false);
      setLikeCount(0);
      setCommentCount(0);
      setSeedComments([]);
      return undefined;
    }
    fetchShowcaseSocial(ownerUserId, { slideId }).then((res) => {
      if (cancelled || !res.ok) return;
      setLiked(res.likedByMe);
      setLikeCount(res.likeCount);
      setCommentCount(res.comments.length);
      setSeedComments(res.comments);
    });
    return () => {
      cancelled = true;
    };
  }, [ownerUserId, slideId]);

  const onLike = useCallback(async () => {
    if (localOnly) {
      applyLocalLikeToggle();
      return;
    }
    if (!hasVlueLoggedInSession()) {
      onToast?.(VLUE_MEMBERSHIP_REQUIRED_MSG);
      return;
    }
    const res = await toggleShowcaseLikeApi(ownerUserId, { slideId });
    if (res.ok) {
      setLiked(res.likedByMe);
      setLikeCount(res.likeCount);
      return;
    }
    if (res.status === 401) {
      onToast?.(VLUE_MEMBERSHIP_REQUIRED_MSG);
      return;
    }
    /* 로컬 API 미기동·네트워크 오류 시에도 미리보기에서 하트가 동작하도록 */
    if (!res.status || isNetworkLikeError(res.error)) {
      applyLocalLikeToggle();
      if (isNetworkLikeError(res.error)) {
        onToast?.(likeErrorMessage(res));
      }
      return;
    }
    onToast?.(likeErrorMessage(res));
  }, [ownerUserId, slideId, localOnly, onToast, applyLocalLikeToggle]);

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
  }, [displayName, phone, onToast]);

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
