import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, X, Heart } from "lucide-react";
import { readMembershipTier } from "../../lib/bizcardAccountSync.js";
import { isPaidLetteringTier } from "../../lib/letteringMembership.js";
import {
  isMycaseShowcasePickSelected,
  toggleMycaseShowcasePick
} from "../../lib/mycase/mycaseShowcasePick.js";
import {
  mycaseCategoryLabel,
  mycaseSocialSlideId,
  parseMycasePostPayload
} from "../../lib/mycase/mycasePostPayload.js";
import ShowcaseCallCarousel from "../showcase/ShowcaseCallCarousel.jsx";
import { createDefaultShowcaseStyle } from "../../lib/showcase/showcaseStyleStorage.js";
import MyCaseIgPostSocial from "./MyCaseIgPostSocial.jsx";
import MyCaseImageCarousel from "./MyCaseImageCarousel.jsx";
import MyCaseIgCaption from "./MyCaseIgCaption.jsx";
import "../../styles/showcase-call-glass.css";
import "./my-case-ig-post.css";

function formatPostDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch {
    return "";
  }
}

/**
 * 인스타형 게시물 상세 — DCC 없이 쇼케이스·피드 이미지만
 */
export default function MyCaseIgPostViewer({
  item,
  detail,
  owner = false,
  ownerUserId = "",
  peerPhone = "",
  displayName = "VLUE",
  displayHandle = "",
  avatarUrl = "",
  onClose,
  onToast,
  showcasePickEnabled = false,
  variant = "fullscreen",
  showClose = true
}) {
  const membershipTier = useMemo(() => readMembershipTier(), []);
  const isFeedMobile = variant === "fullscreen";
  const parsed = useMemo(() => {
    const payload = detail?.item?.payloadJson || item?.payloadJson || {};
    return parseMycasePostPayload(payload, detail?.item || item);
  }, [detail, item]);

  const [imgIndex, setImgIndex] = useState(0);
  const [pickTick, setPickTick] = useState(0);
  const [commentOpen, setCommentOpen] = useState(false);
  const [likeBurst, setLikeBurst] = useState(0);
  const [mediaAspect, setMediaAspect] = useState(16 / 9);
  const likeHandlerRef = useRef(null);

  useEffect(() => {
    setImgIndex(0);
    setCommentOpen(false);
    setLikeBurst(0);
    setMediaAspect(16 / 9);
  }, [item?.id]);

  useEffect(() => {
    const bump = () => setPickTick((n) => n + 1);
    window.addEventListener("vlue-mycase-showcase-pick-changed", bump);
    return () => window.removeEventListener("vlue-mycase-showcase-pick-changed", bump);
  }, []);

  const images = parsed.images;
  const current = images[imgIndex] || images[0] || null;
  const slideId = useMemo(
    () => mycaseSocialSlideId(item?.id, current?.id),
    [item?.id, current?.id]
  );

  const resolvedOwnerUserId = useMemo(() => {
    const raw = String(ownerUserId || item?.ownerUserId || "").trim();
    return raw;
  }, [ownerUserId, item?.ownerUserId]);

  const showcaseCard = useMemo(() => {
    if (parsed.postType !== "showcase" || !parsed.style) return null;
    const style = parsed.style;
    return {
      name: displayName,
      displayName,
      membershipTier,
      showcaseStyle: { ...createDefaultShowcaseStyle(), ...style },
      phone: "",
      organization: ""
    };
  }, [parsed, displayName, membershipTier]);

  const onTogglePick = useCallback(() => {
    if (!owner || !showcasePickEnabled || !current) return;
    const res = toggleMycaseShowcasePick({
      membershipTier,
      caseId: String(item?.id || ""),
      imageId: current.id,
      imageUrl: current.url,
      caption: parsed.caption
    });
    if (!res.ok) {
      onToast?.(res.message);
      return;
    }
    setPickTick((n) => n + 1);
  }, [owner, showcasePickEnabled, current, membershipTier, item?.id, parsed.caption, onToast]);

  const picked = useMemo(() => {
    void pickTick;
    return current
      ? isMycaseShowcasePickSelected(item?.id, current.id, current.url)
      : false;
  }, [pickTick, current, item?.id]);

  const pickButton =
    owner && showcasePickEnabled && current ? (
      <button
        type="button"
        className={`my-case-ig-post__pick-btn${picked ? " is-active" : ""}`}
        onClick={onTogglePick}
      >
        {picked
          ? "쇼케이스 선택 해제"
          : isPaidLetteringTier(membershipTier)
            ? "통화 쇼케이스에 선택"
            : "통화 쇼케이스에 선택 (1장)"}
      </button>
    ) : null;

  const captionText = parsed.caption || item?.title || "";
  const handleLabel = displayHandle || displayName;

  const handleMediaDoubleTap = useCallback(() => {
    likeHandlerRef.current?.();
  }, []);

  const likeBurstOverlay =
    likeBurst > 0 && images.length ? (
      <div key={likeBurst} className="my-case-like-burst" aria-hidden>
        <Heart size={88} fill="currentColor" strokeWidth={1.2} />
      </div>
    ) : null;

  const socialProps = {
    ownerUserId: resolvedOwnerUserId,
    slideId,
    displayName,
    peerPhone,
    variant,
    onToast,
    pickButton,
    likeHandlerRef,
    onBurst: () => setLikeBurst((n) => n + 1)
  };

  const mediaBlock =
    parsed.postType === "showcase" && showcaseCard && images.length === 0 ? (
      <div className="my-case-ig-post__showcase-wrap">
        <ShowcaseCallCarousel
          card={showcaseCard}
          verified
          previewMode
          includeDigitalCard={false}
          preferContentSlide
          digitalCardOnly={false}
          isKnownContact
          callPhase="connected"
        />
      </div>
    ) : images.length ? (
      <MyCaseImageCarousel
        images={images}
        index={imgIndex}
        onIndexChange={setImgIndex}
        onDoubleTap={handleMediaDoubleTap}
        onMediaAspectChange={isFeedMobile ? setMediaAspect : undefined}
      />
    ) : (
      <div className="my-case-ig-post__empty">표시할 사진이 없습니다.</div>
    );

  if (isFeedMobile) {
    return (
      <article
        className="my-case-ig-post my-case-ig-post--feed"
        aria-label="게시물"
      >
        <header className="my-case-ig-post__profile">
          <div className="my-case-ig-post__avatar">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{(displayName || "?").slice(0, 1)}</span>}
          </div>
          <div className="my-case-ig-post__head-text">
            <strong>{handleLabel}</strong>
            {parsed.category && parsed.category !== "archive" ? (
              <span className="my-case-ig-post__category">{mycaseCategoryLabel(parsed.category)}</span>
            ) : null}
          </div>
        </header>

        <div
          className="my-case-ig-post__media"
          style={{ "--feed-media-aspect": mediaAspect }}
        >
          {mediaBlock}
          {likeBurstOverlay}
        </div>

        <div className="my-case-ig-post__body">
          <MyCaseIgPostSocial
            {...socialProps}
            commentOpen={commentOpen}
            onCommentOpenChange={setCommentOpen}
            showFeedCommentPreview
          />
          <MyCaseIgCaption handle={handleLabel} text={captionText} />
          <time className="my-case-ig-post__time">
            {formatPostDate(item?.createdAt || detail?.item?.createdAt)}
          </time>
        </div>
      </article>
    );
  }

  return (
    <div
      className={`my-case-ig-post${variant === "modal" ? " my-case-ig-post--modal" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="게시물"
    >
      {showClose ? (
        <button type="button" className="my-case-ig-post__close" onClick={onClose} aria-label="닫기">
          <X size={28} strokeWidth={1.8} />
        </button>
      ) : null}

      <div className="my-case-ig-post__layout">
        <div className="my-case-ig-post__media">
          {mediaBlock}
          {likeBurstOverlay}
        </div>

        <aside className="my-case-ig-post__side">
          <header className="my-case-ig-post__head">
            <div className="my-case-ig-post__avatar">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{(displayName || "?").slice(0, 1)}</span>}
            </div>
            <div className="my-case-ig-post__head-text">
              <strong>{handleLabel}</strong>
              {parsed.category && parsed.category !== "archive" ? (
                <span className="my-case-ig-post__category">{mycaseCategoryLabel(parsed.category)}</span>
              ) : null}
            </div>
          </header>

          <div className="my-case-ig-post__caption">
            <MyCaseIgCaption handle={handleLabel} text={captionText} />
            <time>{formatPostDate(item?.createdAt || detail?.item?.createdAt)}</time>
          </div>

          <MyCaseIgPostSocial {...socialProps} />
        </aside>
      </div>
    </div>
  );
}
