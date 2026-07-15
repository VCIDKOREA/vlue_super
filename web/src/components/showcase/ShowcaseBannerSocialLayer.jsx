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

const OWNER_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function firstText(...values) {
  for (const v of values) {
    const s = String(v || "").trim();
    if (s) return s;
  }
  return "";
}

/**
 * 배너 슬라이드용 소셜 오버레이 (1~6) — V1
 * 실통화 중에는 부모에서 socialOverlayEnabled=false로 숨김
 */
export default function ShowcaseBannerSocialLayer({
  card,
  slide,
  previewMode: _previewMode = false,
  onToast,
  onReport: onReportProp
}) {
  const style = card?.showcaseStyle || null;
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

  /* ownerUserId가 있으면 미리보기에서도 실제 좋아요·댓글 API 사용 (본인 쇼케이스 포함) */
  const localOnly = !ownerUserId;
  const bgm = useShowcaseBgm();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [seedComments, setSeedComments] = useState([]);
  const [commentOpen, setCommentOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

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
      setLiked((v) => {
        setLikeCount((n) => (v ? Math.max(0, n - 1) : n + 1));
        return !v;
      });
      return;
    }
    const res = await toggleShowcaseLikeApi(ownerUserId, { slideId });
    if (!res.ok) {
      onToast?.(res.error || (res.status === 401 ? "로그인 후 좋아요할 수 있습니다." : "좋아요에 실패했습니다."));
      return;
    }
    setLiked(res.likedByMe);
    setLikeCount(res.likeCount);
  }, [ownerUserId, slideId, localOnly, onToast]);

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
      <ShowcaseBannerFooter
        avatarUrl={avatarUrl}
        caption={caption || "VLUE Showcase"}
        logoLetter={logoLetter}
      />
      <ShowcaseSocialRail
        liked={liked}
        likeCount={likeCount}
        commentCount={commentCount}
        onLike={() => void onLike()}
        onComment={() => setCommentOpen(true)}
        onShare={() => void onShare()}
        onMore={() => setMoreOpen(true)}
      />
      <ShowcaseCommentSheet
        open={commentOpen}
        onClose={() => setCommentOpen(false)}
        ownerUserId={ownerUserId}
        slideId={slideId}
        previewMode={localOnly}
        seedComments={seedComments}
        onCountChange={setCommentCount}
        onToast={onToast}
      />
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
