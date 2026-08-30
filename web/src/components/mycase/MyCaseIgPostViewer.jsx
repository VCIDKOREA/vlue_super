import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
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
  variant = "fullscreen"
}) {
  const membershipTier = useMemo(() => readMembershipTier(), []);
  const parsed = useMemo(() => {
    const payload = detail?.item?.payloadJson || item?.payloadJson || {};
    return parseMycasePostPayload(payload, detail?.item || item);
  }, [detail, item]);

  const [imgIndex, setImgIndex] = useState(0);
  const [pickTick, setPickTick] = useState(0);
  const [commentMode, setCommentMode] = useState(false);

  useEffect(() => {
    setImgIndex(0);
    setCommentMode(false);
  }, [item?.id]);

  useEffect(() => {
    setCommentMode(false);
  }, [imgIndex]);

  useEffect(() => {
    const bump = () => setPickTick((n) => n + 1);
    window.addEventListener("vlue-mycase-showcase-pick-changed", bump);
    return () => window.removeEventListener("vlue-mycase-showcase-pick-changed", bump);
  }, []);

  useEffect(() => {
    if (variant === "modal" || !commentMode) return undefined;
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const sync = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--my-case-kb-offset", `${offset}px`);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      document.documentElement.style.removeProperty("--my-case-kb-offset");
    };
  }, [commentMode, variant]);

  const images = parsed.images;
  const hasCarousel = images.length > 1;
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

  const prevImg = () => setImgIndex((i) => Math.max(0, i - 1));
  const nextImg = () => setImgIndex((i) => Math.min(images.length - 1, i + 1));

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

  return (
    <div
      className={`my-case-ig-post${variant === "modal" ? " my-case-ig-post--modal" : ""}${
        commentMode ? " is-comment-mode" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="게시물"
    >
      <button type="button" className="my-case-ig-post__close" onClick={onClose} aria-label="닫기">
        <X size={28} strokeWidth={1.8} />
      </button>

      <div className="my-case-ig-post__layout">
        <div className="my-case-ig-post__media">
          {parsed.postType === "showcase" && showcaseCard && images.length === 0 ? (
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
          ) : current ? (
            <>
              <img className="my-case-ig-post__photo" src={current.url} alt="" />
              {hasCarousel ? (
                <>
                  {imgIndex > 0 ? (
                    <button
                      type="button"
                      className="my-case-ig-post__nav my-case-ig-post__nav--prev"
                      onClick={prevImg}
                      aria-label="이전 사진"
                    >
                      <ChevronLeft size={28} />
                    </button>
                  ) : null}
                  {imgIndex < images.length - 1 ? (
                    <button
                      type="button"
                      className="my-case-ig-post__nav my-case-ig-post__nav--next"
                      onClick={nextImg}
                      aria-label="다음 사진"
                    >
                      <ChevronRight size={28} />
                    </button>
                  ) : null}
                  <div className="my-case-ig-post__dots" aria-hidden>
                    {images.map((img, i) => (
                      <span key={img.id} className={i === imgIndex ? "is-active" : ""} />
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <div className="my-case-ig-post__empty">표시할 사진이 없습니다.</div>
          )}
        </div>

        <aside className="my-case-ig-post__side">
          <header className="my-case-ig-post__head">
            <div className="my-case-ig-post__avatar">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{(displayName || "?").slice(0, 1)}</span>}
            </div>
            <div className="my-case-ig-post__head-text">
              <strong>{displayHandle || displayName}</strong>
              {parsed.category && parsed.category !== "archive" ? (
                <span className="my-case-ig-post__category">{mycaseCategoryLabel(parsed.category)}</span>
              ) : null}
            </div>
          </header>

          <div className="my-case-ig-post__caption">
            <p>
              <strong>{displayHandle || displayName}</strong> {parsed.caption || item?.title || ""}
            </p>
            <time>{formatPostDate(item?.createdAt || detail?.item?.createdAt)}</time>
          </div>

          <MyCaseIgPostSocial
            ownerUserId={resolvedOwnerUserId}
            slideId={slideId}
            displayName={displayName}
            peerPhone={peerPhone}
            variant={variant}
            commentMode={commentMode}
            onCommentModeChange={setCommentMode}
            onToast={onToast}
            pickButton={pickButton}
          />
        </aside>
      </div>
    </div>
  );
}
