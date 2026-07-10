import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import LetteringDigitalReception from "../LetteringDigitalReception.jsx";
import FreeTierCallShowcase from "./FreeTierCallShowcase.jsx";
import {
  maxShowcasePhotosForTier,
  normalizeUserTier,
  USER_TIERS
} from "../../lib/showcase/tentShowcaseTypes.js";
import { resolvePaidShowcaseBanners } from "../../lib/showcase/demoShowcaseBanners.js";

/**
 * 통화 쇼케이스 시네마틱 캐러셀
 * - 유료: 디지털 인증명함(1) + 쇼케이스 배너(최대 10) — 가로 스와이프
 * - 무료: 디지털 명함 제외 · 단독 1장 · 스크롤 차단
 */
export default function ShowcaseCallCarousel({
  card,
  verified = true,
  verificationItems = [],
  incomingNumber = "",
  photos = [],
  membershipTier = "free",
  isKnownContact = false,
  scrollEnabled = true,
  previewMode = false,
  face = "front",
  onFaceChange
}) {
  const [index, setIndex] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);

  const tier = normalizeUserTier(membershipTier || card?.membershipTier);
  const isPaid = tier === USER_TIERS.PAID;
  const maxPhotos = maxShowcasePhotosForTier(tier);
  const banners = useMemo(
    () =>
      isPaid
        ? resolvePaidShowcaseBanners(photos, { previewMode, max: maxPhotos })
        : [],
    [isPaid, photos, previewMode, maxPhotos]
  );

  const slides = useMemo(() => {
    if (!isPaid) {
      return [
        {
          type: isKnownContact ? "free-profile" : "free-safe",
          id: isKnownContact ? "free-profile" : "free-safe"
        }
      ];
    }
    return [
      { type: "card", id: "cert-card" },
      ...banners.map((p, i) => ({ type: "banner", id: p.id || `bn-${i}`, ...p }))
    ];
  }, [isPaid, isKnownContact, banners]);

  const count = slides.length;
  const canScroll = isPaid && scrollEnabled && count > 1;
  const current = slides[index] || slides[0];

  useEffect(() => {
    setIndex(0);
  }, [card?.phone, count, isPaid, isKnownContact]);

  useEffect(() => {
    if (!canScroll && index !== 0) setIndex(0);
  }, [canScroll, index]);

  const go = useCallback(
    (dir) => {
      if (!canScroll) return;
      setIndex((i) => Math.max(0, Math.min(count - 1, i + dir)));
    },
    [canScroll, count]
  );

  const interactiveSelector =
    "button, a, input, textarea, select, label, [role='tab'], .ldr-face-tabs, .ldr-face-tab, .showcase-call-carousel__nav";

  const onPointerDown = (e) => {
    if (!canScroll) return;
    if (e.target?.closest?.(interactiveSelector)) return;
    dragging.current = true;
    startX.current = e.clientX;
  };

  const onPointerUp = (e) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (e.target?.closest?.(interactiveSelector)) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) < 36) return;
    go(dx < 0 ? 1 : -1);
  };

  const slideLabel =
    current?.type === "card"
      ? "디지털 인증명함"
      : current?.type === "banner"
        ? `쇼케이스 ${index}/${Math.max(0, count - 1)}`
        : "쇼케이스";

  return (
    <div
      className={`showcase-call-carousel${canScroll ? "" : " showcase-call-carousel--locked"}${
        isPaid ? " showcase-call-carousel--paid" : " showcase-call-carousel--free"
      }`}
      data-index={index}
      data-tier={tier}
      data-known={isKnownContact ? "1" : "0"}
      aria-roledescription={canScroll ? "carousel" : "region"}
    >
      {isPaid && count > 1 ? (
        <div className="showcase-call-carousel__meta">
          <span className="showcase-call-carousel__meta-label">{slideLabel}</span>
          <span className="showcase-call-carousel__meta-count">
            {index + 1} / {count}
          </span>
        </div>
      ) : null}

      <div
        className="showcase-call-carousel__viewport"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        <div
          className="showcase-call-carousel__track"
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {slides.map((slide) => (
            <article key={slide.id} className="showcase-call-carousel__slide">
              {slide.type === "card" && isPaid ? (
                <div className="showcase-call-carousel__card">
                  <LetteringDigitalReception
                    card={card}
                    verified={verified}
                    verificationItems={verificationItems}
                    incomingNumber={incomingNumber}
                    embeddedInPush
                    face={face}
                    onFaceChange={onFaceChange}
                  />
                </div>
              ) : null}

              {slide.type === "banner" && isPaid ? (
                <div className="showcase-call-carousel__banner">
                  <img src={slide.url} alt="" className="showcase-call-carousel__banner-img" draggable={false} />
                  <div className="showcase-call-carousel__banner-veil" aria-hidden />
                  {(slide.overlayText || slide.caption) && (
                    <p className="showcase-call-carousel__banner-caption">{slide.overlayText || slide.caption}</p>
                  )}
                </div>
              ) : null}

              {slide.type === "free-profile" || slide.type === "free-safe" ? (
                <div className="showcase-call-carousel__free">
                  <FreeTierCallShowcase
                    isKnownContact={slide.type === "free-profile"}
                    card={card}
                    phone={incomingNumber}
                    verified={verified}
                  />
                </div>
              ) : null}
            </article>
          ))}
        </div>

        {canScroll ? (
          <>
            <button
              type="button"
              className="showcase-call-carousel__nav showcase-call-carousel__nav--prev"
              aria-label="이전 슬라이드"
              disabled={index <= 0}
              onClick={() => go(-1)}
            >
              <ChevronLeft size={22} strokeWidth={2.2} aria-hidden />
            </button>
            <button
              type="button"
              className="showcase-call-carousel__nav showcase-call-carousel__nav--next"
              aria-label="다음 슬라이드"
              disabled={index >= count - 1}
              onClick={() => go(1)}
            >
              <ChevronRight size={22} strokeWidth={2.2} aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      {canScroll ? (
        <>
          <div className="showcase-call-carousel__dots" role="tablist" aria-label="쇼케이스 슬라이드">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                className={`showcase-call-carousel__dot${i === index ? " is-active" : ""}`}
                aria-label={slide.type === "card" ? "디지털 명함" : `쇼케이스 배너 ${i}`}
                aria-selected={i === index}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <p className="showcase-call-carousel__hint">← 밀어서 디지털 명함 · 쇼케이스 전환 →</p>
        </>
      ) : null}

      {isPaid && !scrollEnabled && count > 1 ? (
        <p className="showcase-call-carousel__lock-hint">통화 연결 후 슬라이드할 수 있습니다</p>
      ) : null}
    </div>
  );
}
