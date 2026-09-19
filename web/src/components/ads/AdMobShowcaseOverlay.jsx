import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import AppFullScreenView from "../AppFullScreenView.jsx";
import PeerShowcasePreview from "../showcase/PeerShowcasePreview.jsx";
import { buildAdMobShowcaseCard } from "../../lib/ads/buildAdMobShowcaseCard.js";
import {
  VLUE_CLOSE_ADMOB_SHOWCASE,
  VLUE_OPEN_ADMOB_SHOWCASE
} from "../../lib/ads/openAdMobShowcase.js";
import { fetchSignatureSounds } from "../../lib/showcase/showcaseSoundApi.js";
import { CLOSE_SHOWCASE_OVERLAYS_EVENT } from "../../lib/showcase/closeShowcaseOverlays.js";
import { pushAndroidBackHandler } from "../../lib/androidBackStack.js";

/**
 * AdMob 쇼케이스 — PeerShowcasePreview(ShowcaseCallCarousel) UI 재사용.
 * NativeAdView MediaView·CTA 만 미디어 카드 / 하단 CTA 슬롯에 겹침.
 * DCC 띠배너는 숨기고 CTA(설치/방문)가 그 자리를 차지한다.
 */
export default function AdMobShowcaseOverlay({ onToast }) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState(null);
  const [signatureBgm, setSignatureBgm] = useState(null);
  const rootRef = useRef(null);
  const syncTimer = useRef(0);

  const bridge =
    typeof window !== "undefined" ? window.VlueLettering || window.Android : null;

  const close = useCallback(() => {
    setOpen(false);
    setAssets(null);
    try {
      bridge?.closeNativeAdShowcaseSlots?.();
      bridge?.hideBannerAd?.("dcc_bottom");
      bridge?.hideBannerAd?.("bottom");
      bridge?.hideBannerAd?.("ribbon");
    } catch {
      /* ignore */
    }
  }, [bridge]);

  useEffect(() => {
    const onOpen = (ev) => {
      const detail = ev?.detail && typeof ev.detail === "object" ? ev.detail : {};
      setAssets(detail);
      setOpen(true);
      try {
        /* 네이티브 광고 쇼케이스 — 띠배너 슬롯 전부 숨김 */
        bridge?.hideBannerAd?.("dcc_bottom");
        bridge?.hideBannerAd?.("bottom");
        bridge?.hideBannerAd?.("ribbon");
      } catch {
        /* ignore */
      }
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
  }, [close, bridge]);

  useEffect(() => {
    if (!open) return undefined;
    return pushAndroidBackHandler(() => {
      close();
      return true;
    });
  }, [open, close]);

  useEffect(() => {
    if (!open || assets?.hasVideoContent) return undefined;
    let cancelled = false;
    fetchSignatureSounds()
      .then((res) => {
        if (cancelled) return;
        const first = Array.isArray(res?.items) ? res.items[0] : null;
        const audioUrl = String(first?.audioUrl || "").trim();
        if (!audioUrl) return;
        setSignatureBgm({
          title: String(first?.title || "Nature Sound").trim() || "Nature Sound",
          audioUrl
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, assets?.hasVideoContent]);

  const card = useMemo(() => {
    if (!assets) return null;
    return buildAdMobShowcaseCard(assets, signatureBgm);
  }, [assets, signatureBgm]);

  const ctaLabel = String(assets?.ctaLabel || "방문하기").trim() || "방문하기";
  const hasVideo = Boolean(assets?.hasVideoContent);

  const syncNativeSlots = useCallback(() => {
    if (!open || !bridge?.syncNativeAdShowcaseSlots) return;
    const root = rootRef.current;
    if (!root) return;
    /* 미디어 카드만 — 래퍼/헤더/닫기/소셜 레일을 덮으면 안 됨 */
    const mediaEl =
      root.querySelector(".showcase-call-carousel__banner .showcase-media-page__frame") ||
      root.querySelector(".showcase-media-page__frame") ||
      root.querySelector(".showcase-call-carousel__banner");
    const ctaEl = root.querySelector("[data-admob-cta-slot]");
    if (!mediaEl || !ctaEl) return;

    const media = mediaEl.getBoundingClientRect();
    const cta = ctaEl.getBoundingClientRect();
    if (media.width < 40 || media.height < 40 || cta.width < 40) return;

    const payload = {
      visible: true,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      hasVideoContent: hasVideo,
      media: {
        left: media.left,
        top: media.top,
        width: media.width,
        height: media.height
      },
      cta: {
        left: cta.left,
        top: cta.top,
        width: cta.width,
        height: cta.height,
        label: ctaLabel
      }
    };
    try {
      bridge.syncNativeAdShowcaseSlots(JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [open, bridge, hasVideo, ctaLabel]);

  useEffect(() => {
    if (!open) return undefined;
    const run = () => {
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(syncNativeSlots, 64);
    };
    run();
    const retries = [120, 280, 500, 900].map((ms) => window.setTimeout(run, ms));
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(run) : null;
    if (rootRef.current && ro) ro.observe(rootRef.current);
    window.addEventListener("resize", run);
    window.addEventListener("scroll", run, true);
    return () => {
      window.clearTimeout(syncTimer.current);
      retries.forEach((id) => window.clearTimeout(id));
      ro?.disconnect();
      window.removeEventListener("resize", run);
      window.removeEventListener("scroll", run, true);
    };
  }, [open, card, syncNativeSlots]);

  useEffect(() => {
    if (!open || !hasVideo) return undefined;
    const onClick = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (
        t.closest(".showcase-bgm-transport__btn--main") ||
        t.closest(".showcase-bgm-chip")
      ) {
        e.preventDefault();
        e.stopPropagation();
        try {
          bridge?.toggleNativeAdShowcaseAudio?.();
        } catch {
          /* ignore */
        }
      }
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerup", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerup", onClick, true);
    };
  }, [open, hasVideo, bridge]);

  if (!open || !card || typeof document === "undefined") return null;

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
        className="relative flex h-full min-h-0 flex-1 flex-col"
        data-admob-showcase="1"
        data-admob-has-video={hasVideo ? "1" : "0"}
      >
        {/* 네이티브 MediaView 위에 떠 있는 닫기 — 슬롯 밖이라 터치 가능 */}
        <button
          type="button"
          className="absolute right-3 z-[400] flex h-10 items-center gap-1 rounded-full bg-black/60 px-3 text-[12px] font-black text-white shadow-lg backdrop-blur-sm active:scale-95"
          style={{ top: "max(10px, var(--vlue-safe-top, 10px))", pointerEvents: "auto" }}
          aria-label="닫기"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            close();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            close();
          }}
        >
          <X size={16} strokeWidth={2.6} aria-hidden />
          닫기
        </button>

        <div className="relative min-h-0 flex-1">
          <style>
            {hasVideo
              ? `[data-admob-showcase] .showcase-media-page__img{opacity:0!important}`
              : ""}
            {`[data-admob-showcase] .showcase-dcc-bottom-banner{display:none!important}`}
            {`[data-admob-showcase] .showcase-social-rail{z-index:50;pointer-events:auto}`}
            {`[data-admob-showcase] .showcase-call-carousel__slide-settings{z-index:50;pointer-events:auto}`}
          </style>
          <PeerShowcasePreview
            card={card}
            onClose={close}
            onToast={onToast}
            includeDigitalCard={false}
            digitalCardOnly={false}
            preferContentSlide
          />
        </div>

        {/* 띠배너 자리 → CTA(설치/방문). NativeAdView callToActionView 가 이 슬롯에 겹침 */}
        <div
          className="shrink-0 border-t border-white/10 bg-[#0B101B] px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2"
          data-admob-cta-bar
        >
          <button
            type="button"
            data-admob-cta-slot
            className="flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3.5 text-[16px] font-black text-white"
            style={{ pointerEvents: "none" }}
            tabIndex={-1}
            aria-hidden
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </AppFullScreenView>,
    document.body
  );
}
