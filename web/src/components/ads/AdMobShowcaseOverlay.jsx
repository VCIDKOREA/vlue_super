import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Car, Sparkles, Download, ShieldCheck } from "lucide-react";
import AppFullScreenView from "../AppFullScreenView.jsx";
import PeerShowcasePreview from "../showcase/PeerShowcasePreview.jsx";
import { buildAdMobShowcaseCard } from "../../lib/ads/buildAdMobShowcaseCard.js";
import {
  VLUE_CLOSE_ADMOB_SHOWCASE,
  VLUE_OPEN_ADMOB_SHOWCASE
} from "../../lib/ads/openAdMobShowcase.js";
import { CLOSE_SHOWCASE_OVERLAYS_EVENT } from "../../lib/showcase/closeShowcaseOverlays.js";
import { pushAndroidBackHandler } from "../../lib/androidBackStack.js";

/**
 * AdMob 및 VLUÉ 추천 스폰서 쇼케이스 오버레이
 * - VLUÉ 원본 쇼케이스 세로 카드 프레임(1번 사진 제원) 100% 동일 규격 적용 (PeerShowcasePreview 기반)
 * - 모든 스폰서 광고는 100% 동영상(Video) 오토플레이 (ShowcaseMediaPage 내 video 렌더링)
 * - 가로 영상(16:9 등)도 세로 카드 프레임 내부에서 object-contain 레터박스로 자연스럽게 스케일링
 * - 비디오 카드 내부 최하단 좌측 [@ceo님이 좋아합니다] + [VLUÉ 프로필 / 브랜드명], 우측 하단 소셜 레일(하트, 댓글, 공유, 더보기) 원본 좌표 고정
 * - 최하단 구좌: 원본 쇼케이스 띠배너(468x60) 위치 및 제원과 동일한 높이로 브랜드 맞춤 CTA 버튼 가로 꽉 차게 배치
 * - 광고 원본 오디오 단독 출력 및 메인 BGM 복원 로직 배제로 오디오 꼬임 방지
 */
export default function AdMobShowcaseOverlay({ onToast }) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState(null);
  const [ctaPaused, setCtaPaused] = useState(false);
  const rootRef = useRef(null);
  const syncTimer = useRef(0);

  const bridge =
    typeof window !== "undefined" ? window.VlueLettering || window.Android : null;

  const hideBannersHard = useCallback(() => {
    try {
      bridge?.hideBannerAd?.("dcc_bottom");
      bridge?.hideBannerAd?.("bottom");
      bridge?.hideBannerAd?.("ribbon");
      window.dispatchEvent(new CustomEvent("vlue-hide-all-ads"));
    } catch {
      /* ignore */
    }
  }, [bridge]);

  const close = useCallback(() => {
    setOpen(false);
    setAssets(null);
    setCtaPaused(false);
    try {
      bridge?.closeNativeAdShowcaseSlots?.();
    } catch {
      /* ignore */
    }
    try {
      window.dispatchEvent(new CustomEvent("vlue-resume-ads"));
    } catch {
      /* ignore */
    }
  }, [bridge]);

  useEffect(() => {
    const onOpen = (ev) => {
      const detail = ev?.detail && typeof ev.detail === "object" ? ev.detail : {};
      setAssets(detail);
      setOpen(true);
      setCtaPaused(false);
      hideBannersHard();
    };
    const onClose = () => close();
    window.addEventListener(VLUE_OPEN_ADMOB_SHOWCASE, onOpen);
    window.addEventListener(VLUE_CLOSE_ADMOB_SHOWCASE, onClose);
    window.addEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onClose);
    return () => {
      window.removeEventListener(VLUE_OPEN_ADMOB_SHOWCASE, onOpen);
      window.removeEventListener(VLUE_CLOSE_ADMOB_SHOWCASE, onClose);
      window.removeEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onClose);
    };
  }, [close, hideBannersHard]);

  useEffect(() => {
    if (!open) return undefined;
    hideBannersHard();
    return undefined;
  }, [open, hideBannersHard]);

  useEffect(() => {
    const onPauseCta = (ev) => {
      setCtaPaused(Boolean(ev?.detail?.pause));
    };
    window.addEventListener("vlue-admob-pause-cta", onPauseCta);
    return () => window.removeEventListener("vlue-admob-pause-cta", onPauseCta);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    return pushAndroidBackHandler(() => {
      close();
      return true;
    });
  }, [open, close]);

  const card = useMemo(() => {
    if (!assets) return null;
    return buildAdMobShowcaseCard(assets, null);
  }, [assets]);

  const advertiser = String(assets?.advertiser || card?.name || "스폰서").trim() || "스폰서";
  const accentColor = String(assets?.accentColor || "#38bdf8").trim();

  // 맞춤형 CTA 버튼 분석
  const ctaMeta = useMemo(() => {
    const rawLabel = String(assets?.ctaLabel || "").trim();
    const type = String(assets?.ctaType || "").toLowerCase();
    const category = String(assets?.category || "").toLowerCase();
    const brand = advertiser.toUpperCase();

    const isCar =
      type === "car" ||
      category.includes("자동차") ||
      category.includes("모빌리티") ||
      brand.includes("GENESIS") ||
      brand.includes("TESLA") ||
      brand.includes("PORSCHE") ||
      brand.includes("BMW") ||
      brand.includes("MAYBACH") ||
      brand.includes("BENZ");

    const isSafe =
      type === "safe" ||
      category.includes("금융") ||
      category.includes("보안") ||
      brand.includes("금융") ||
      brand.includes("감독원") ||
      brand.includes("위원회");

    const isApp = type === "app" || category.includes("앱") || category.includes("서비스");

    let finalLabel = rawLabel;
    let Icon = Sparkles;

    if (isCar) {
      Icon = Car;
      if (!finalLabel || finalLabel === "자세히 보기") finalLabel = "시승 신청하기";
    } else if (isSafe) {
      Icon = ShieldCheck;
      if (!finalLabel || finalLabel === "자세히 보기") finalLabel = "지금 안심 확인";
    } else if (isApp) {
      Icon = Download;
      if (!finalLabel || finalLabel === "자세히 보기") finalLabel = "지금 설치하기";
    } else {
      Icon = Sparkles;
      if (!finalLabel || finalLabel === "자세히 보기") {
        finalLabel = brand.includes("ROLEX") ? "컬렉션 상세보기" : "신제품 상세보기";
      }
    }

    return { label: finalLabel, Icon };
  }, [assets, advertiser]);

  const syncNativeSlots = useCallback(() => {
    if (!open || !bridge?.syncNativeAdShowcaseSlots) return;
    if (assets && assets.isAdMob === false) return;
    const root = rootRef.current;
    if (!root) return;
    const mediaEl =
      root.querySelector(".showcase-call-carousel__banner .showcase-media-page__frame") ||
      root.querySelector(".showcase-media-page__frame") ||
      root.querySelector(".showcase-call-carousel__banner");
    const ctaEl = root.querySelector("[data-admob-cta-slot]");
    if (!mediaEl || !ctaEl) return;

    const media = mediaEl.getBoundingClientRect();
    const cta = ctaEl.getBoundingClientRect();
    if (media.width < 40 || media.height < 40) return;
    if (!ctaPaused && (cta.width < 40 || cta.height < 20)) return;

    try {
      bridge.syncNativeAdShowcaseSlots(
        JSON.stringify({
          visible: true,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          hasVideoContent: Boolean(assets?.videoUrl || assets?.hasVideoContent),
          media: {
            left: media.left,
            top: media.top,
            width: media.width,
            height: media.height
          },
          cta: {
            left: cta.left,
            top: ctaPaused ? window.innerHeight + 80 : cta.top,
            width: Math.max(cta.width, 40),
            height: Math.max(cta.height, 40),
            label: ctaMeta.label,
            visible: !ctaPaused
          }
        })
      );
    } catch {
      /* ignore */
    }
  }, [open, bridge, assets, ctaMeta.label, ctaPaused]);

  useEffect(() => {
    if (!open) return undefined;
    const run = () => {
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(syncNativeSlots, 80);
    };
    run();
    const retries = [160, 400, 800, 1400].map((ms) => window.setTimeout(run, ms));
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(run) : null;
    if (rootRef.current && ro) ro.observe(rootRef.current);
    window.addEventListener("resize", run);
    return () => {
      window.clearTimeout(syncTimer.current);
      retries.forEach((id) => window.clearTimeout(id));
      ro?.disconnect();
      window.removeEventListener("resize", run);
    };
  }, [open, card, syncNativeSlots, ctaPaused]);

  // CTA 버튼 클릭 시 이동
  const handleCtaClick = () => {
    const targetUrl = assets?.landingUrl || assets?.link;
    if (!targetUrl) return;
    try {
      if (bridge?.openExternalUrl) {
        bridge.openExternalUrl(targetUrl);
        return;
      }
    } catch {
      /* ignore */
    }
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  if (!open || !card || typeof document === "undefined") return null;

  const isNativeAdMob = Boolean(assets?.isAdMob && bridge?.syncNativeAdShowcaseSlots);
  const CtaIcon = ctaMeta.Icon;

  return createPortal(
    <AppFullScreenView
      open
      onClose={close}
      hideHeader
      showFloatingClose={false}
      coverBottomNav
      isDarkMode
      className="admob-showcase-overlay bg-[#0B101B]"
      captureAndroidBack={false}
    >
      <div
        ref={rootRef}
        className="relative flex h-full min-h-0 flex-1 flex-col select-none bg-[#0B101B]"
        data-admob-showcase="1"
        data-admob-has-video={Boolean(assets?.videoUrl || assets?.hasVideoContent) ? "1" : "0"}
      >
        <style>{`
          [data-admob-showcase] .lettering-live-bar { display: none !important; }
          [data-admob-showcase] .lettering-ongoing-summary { display: none !important; }
          [data-admob-showcase] .showcase-dcc-bottom-banner { display: none !important; }
          [data-admob-showcase] .lettering-ongoing-actions-secondary { display: none !important; }
          [data-admob-showcase] .showcase-call-carousel__slide-settings { display: none !important; }
          [data-admob-showcase] .showcase-call-carousel__slide-call { display: none !important; }
          [data-admob-showcase] .showcase-call-carousel__slide-corner { display: none !important; }
          [data-admob-showcase] .showcase-photo-text-overlay { display: none !important; }
          [data-admob-showcase] .showcase-social-rail { z-index: 40; pointer-events: auto !important; }
          [data-admob-showcase] .lettering-live-indicator__bar {
            background: linear-gradient(180deg, #67e8f9 0%, #22d3ee 50%, #06b6d4 100%);
          }
          [data-admob-showcase] .lettering-live-indicator {
            filter: drop-shadow(0 0 5px rgba(34, 211, 238, 0.9));
          }
          [data-admob-showcase] .showcase-call-carousel__banner {
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            background: #000000 !important;
          }
          [data-admob-showcase] .showcase-banner-footer {
            margin-bottom: 2px !important;
          }
          [data-admob-showcase] .showcase-like-summary {
            margin-bottom: 4px !important;
          }
        `}</style>

        {/* 상단 슬림 타이틀 헤더 */}
        <header
          className="admob-slim-title shrink-0 border-b border-white/10 bg-[#0B101B] px-3 pb-2.5 pt-[max(10px,var(--vlue-safe-top,10px))]"
          data-admob-slim-title
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="lettering-live-indicator" aria-hidden>
              <span className="lettering-live-indicator__bar" />
              <span className="lettering-live-indicator__bar" />
              <span className="lettering-live-indicator__bar" />
            </span>
            <p className="min-w-0 flex-1 truncate text-[12px] font-black tracking-tight text-white">
              {advertiser && advertiser !== "스폰서"
                ? `${advertiser} AD Sponsor Showcase`
                : "AD Sponsor Showcase"}
            </p>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/55 text-white active:scale-95 transition-transform"
              aria-label="닫기"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                close();
              }}
            >
              <X size={18} strokeWidth={2.6} aria-hidden />
            </button>
          </div>
        </header>

        {/* VLUÉ 원본 쇼케이스 뷰어 (PeerShowcasePreview 규격 100% 동일) */}
        <div className="relative min-h-0 flex-1">
          <PeerShowcasePreview
            card={card}
            onClose={close}
            onToast={onToast}
            includeDigitalCard={false}
            digitalCardOnly={false}
            preferContentSlide
          />
        </div>

        {/* 원본 쇼케이스 최하단 띠배너(468x60) 위치 및 규격과 100% 일치하는 맞춤형 CTA 구좌 */}
        <div className="shrink-0 bg-[#0B101B] px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-1.5 border-t border-white/5">
          <button
            type="button"
            data-admob-cta-slot
            onClick={handleCtaClick}
            className="flex w-full h-[52px] items-center justify-center gap-2 rounded-2xl px-4 text-[15.5px] font-black text-white active:brightness-90 transition-all cursor-pointer shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${accentColor} 0%, #1e40af 100%)`,
              boxShadow: `0 4px 16px ${accentColor}44`,
              pointerEvents: isNativeAdMob ? "none" : "auto",
              visibility: ctaPaused ? "hidden" : "visible"
            }}
            tabIndex={0}
          >
            <CtaIcon size={18} strokeWidth={2.4} />
            <span>{ctaMeta.label}</span>
          </button>
        </div>
      </div>
    </AppFullScreenView>,
    document.body
  );
}
