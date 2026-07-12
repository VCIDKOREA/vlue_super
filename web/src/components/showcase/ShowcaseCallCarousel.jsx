import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import LetteringDigitalReception from "../LetteringDigitalReception.jsx";
import FreeTierCallShowcase from "./FreeTierCallShowcase.jsx";
import ShowcaseIdentityCorner from "./ShowcaseIdentityCorner.jsx";
import {
  maxShowcasePhotosForTier,
  normalizeUserTier,
  USER_TIERS
} from "../../lib/showcase/tentShowcaseTypes.js";
import { resolvePaidShowcaseBanners } from "../../lib/showcase/demoShowcaseBanners.js";

/**
 * 통화 쇼케이스 시네마틱 캐러셀
 * - 유료+명함: 디지털 인증명함(1) + 쇼케이스 배너(최대 10)
 * - 유료·명함 미사용: 쇼케이스만 · 접힘 바(웹과 동일) + 필요 시 좌측 하단 식별
 * - 무료: 단독 1장 · 천막 프로필에 이름·번호 포함 (중복 코너 없음)
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
  includeDigitalCard = true,
  face = "front",
  onFaceChange,
  showcaseOffPreview = false
}) {
  const [index, setIndex] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);

  const tier = normalizeUserTier(membershipTier || card?.membershipTier);
  const isPaid = tier === USER_TIERS.PAID;
  const maxPhotos = maxShowcasePhotosForTier(tier);
  const showDigitalCard = Boolean(includeDigitalCard);
  const showCornerIdentity = !showDigitalCard;
  const banners = useMemo(
    () =>
      isPaid
        ? resolvePaidShowcaseBanners(photos, {
            previewMode: previewMode && showDigitalCard,
            max: maxPhotos
          })
        : [],
    [isPaid, photos, previewMode, maxPhotos, showDigitalCard]
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
    const photoSlides = banners.map((p, i) => ({ type: "banner", id: p.id || `bn-${i}`, ...p }));
    const emptyCount =
      previewMode && showDigitalCard && banners.length < Math.min(3, maxPhotos)
        ? Math.min(3, maxPhotos) - banners.length
        : previewMode && !showDigitalCard && banners.length < 1
          ? 1
          : 0;
    const empties = Array.from({ length: emptyCount }, (_, i) => ({
      type: "empty-slot",
      id: `empty-paid-${i}`,
      slot: Math.max(1, banners.length + i + 1),
      max: maxPhotos
    }));
    const cardSlide = showDigitalCard ? [{ type: "card", id: "cert-card" }] : [];
    const paidBody = [...photoSlides, ...empties];
    if (!showDigitalCard && paidBody.length === 0) {
      return [{ type: "paid-identity", id: "paid-identity-sheet" }];
    }
    return [...cardSlide, ...paidBody];
  }, [isPaid, isKnownContact, banners, previewMode, maxPhotos, showDigitalCard]);

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
    "button, a, input, textarea, select, label, [role='tab'], .ldr-face-tabs, .ldr-face-tab, .showcase-call-carousel__nav, .ldr-front-phone-link--btn, .ldr-contact-row-link";

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

  const photoIndexBase = showDigitalCard ? 1 : 0;
  const slideLabel =
    current?.type === "card"
      ? "디지털 인증명함"
      : current?.type === "banner"
        ? `쇼케이스 ${Math.max(1, index + 1 - photoIndexBase)}/${Math.max(1, count - photoIndexBase)}`
        : current?.type === "empty-slot"
          ? `빈 슬롯 (${current.slot}/${current.max})`
          : current?.type === "paid-identity"
            ? "쇼케이스"
            : showcaseOffPreview
              ? ""
              : "";
  const showMeta = Boolean(slideLabel) && !showcaseOffPreview;

  const cornerName = String(card?.name || card?.displayName || "").trim();
  const cornerOrg = String(card?.organization || "").trim();
  const cornerShowName =
    card?.showcaseStyle?.showBroadcastName !== false && !card?.hideBroadcastName;

  return (
    <div
      className={`showcase-call-carousel${canScroll ? "" : " showcase-call-carousel--locked"}${
        isPaid ? " showcase-call-carousel--paid" : " showcase-call-carousel--free"
      }${showCornerIdentity ? " showcase-call-carousel--corner-id" : ""}`}
      data-index={index}
      data-tier={tier}
      data-known={isKnownContact ? "1" : "0"}
      aria-roledescription={canScroll ? "carousel" : "region"}
    >
      {showMeta ? (
        <div className="showcase-call-carousel__meta">
          <span className="showcase-call-carousel__meta-label">{slideLabel}</span>
          {canScroll ? (
            <span className="showcase-call-carousel__meta-count">
              {index + 1} / {count}
            </span>
          ) : null}
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
                    previewMode={previewMode}
                    enableContactLinks
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

              {slide.type === "paid-identity" ? (
                <div className="showcase-call-carousel__paid-sheet">
                  <div className="showcase-call-carousel__paid-sheet-stage" aria-hidden />
                </div>
              ) : null}

              {slide.type === "free-profile" || slide.type === "free-safe" ? (
                <div className="showcase-call-carousel__free">
                  <FreeTierCallShowcase
                    isKnownContact={slide.type === "free-profile" && !showcaseOffPreview}
                    card={card}
                    phone={incomingNumber}
                    verified={verified}
                    showcaseOffPreview={showcaseOffPreview}
                  />
                </div>
              ) : null}

              {slide.type === "empty-slot" ? (
                <div className="showcase-call-carousel__empty flex h-full min-h-[220px] flex-col items-center justify-center gap-2 border border-dashed border-white/25 bg-slate-900/80 px-6 text-center">
                  <p className="text-[12px] font-black text-indigo-200">유료 사진 슬롯 {slide.slot}</p>
                  <p
                    className="text-[12px] font-semibold leading-relaxed text-white/80"
                    style={{ wordBreak: "keep-all" }}
                  >
                    스타일 설정 → 사진에서 추가하면 여기에 표시됩니다. (최대 {slide.max}장)
                  </p>
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

        {showCornerIdentity && isPaid ? (
          <ShowcaseIdentityCorner
            name={cornerName}
            organization={cornerOrg}
            phone={incomingNumber || card?.phone || ""}
            verified={verified}
            showName={cornerShowName}
            kicker="유료 · 쇼케이스"
          />
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
                aria-label={
                  slide.type === "card"
                    ? "디지털 명함"
                    : slide.type === "empty-slot"
                      ? `빈 슬롯 ${slide.slot}`
                      : `쇼케이스 배너 ${i}`
                }
                aria-selected={i === index}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <p className="showcase-call-carousel__hint">
            {showDigitalCard
              ? "← 밀어서 디지털 명함 · 쇼케이스 전환 →"
              : "← 밀어서 쇼케이스 사진 전환 →"}
          </p>
        </>
      ) : null}

      {isPaid && !scrollEnabled && count > 1 ? (
        <p className="showcase-call-carousel__lock-hint">통화 연결 후 슬라이드할 수 있습니다</p>
      ) : null}
    </div>
  );
}
