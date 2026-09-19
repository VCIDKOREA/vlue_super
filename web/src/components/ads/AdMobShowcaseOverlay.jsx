import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
 * AdMob 쇼케이스 — 기존 PeerShowcasePreview(ShowcaseCallCarousel) UI 100% 재사용.
 * NativeAdView MediaView·CTA 만 DOM 슬롯 좌표로 네이티브가 겹침.
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
    } catch {
      /* ignore */
    }
  }, [bridge]);

  useEffect(() => {
    const onOpen = (ev) => {
      const detail = ev?.detail && typeof ev.detail === "object" ? ev.detail : {};
      setAssets(detail);
      setOpen(true);
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
  }, [close]);

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
    const mediaEl =
      root.querySelector(".showcase-call-carousel__banner") ||
      root.querySelector(".showcase-media-page__frame") ||
      root.querySelector("[data-admob-media-slot]");
    const ctaEl = root.querySelector("[data-admob-cta-slot]");
    if (!mediaEl || !ctaEl) return;

    const media = mediaEl.getBoundingClientRect();
    const cta = ctaEl.getBoundingClientRect();
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
      syncTimer.current = window.setTimeout(syncNativeSlots, 48);
    };
    run();
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(run) : null;
    if (rootRef.current && ro) ro.observe(rootRef.current);
    window.addEventListener("resize", run);
    window.addEventListener("scroll", run, true);
    return () => {
      window.clearTimeout(syncTimer.current);
      ro?.disconnect();
      window.removeEventListener("resize", run);
      window.removeEventListener("scroll", run, true);
    };
  }, [open, card, syncNativeSlots]);

  /* 동영상: 웹 BGM 칩 클릭 → AdMob MediaView mute */
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
        className="flex h-full min-h-0 flex-1 flex-col"
        data-admob-showcase="1"
        data-admob-has-video={hasVideo ? "1" : "0"}
      >
        <div className="relative min-h-0 flex-1" data-admob-media-slot>
          {/* 동영상일 때 웹 이미지는 MediaView 아래로 숨김 */}
          <style>{hasVideo ? `[data-admob-showcase] .showcase-media-page__img{opacity:0!important}` : ""}</style>
          <PeerShowcasePreview
            card={card}
            onClose={close}
            onToast={onToast}
            includeDigitalCard={false}
            digitalCardOnly={false}
            preferContentSlide
          />
        </div>
        <div className="shrink-0 border-t border-white/10 bg-[#0B101B] px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
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

