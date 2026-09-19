import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import AppFullScreenView from "../AppFullScreenView.jsx";
import PeerShowcasePreview from "../showcase/PeerShowcasePreview.jsx";
import ShowcaseIdentityCertMark from "../showcase/ShowcaseIdentityCertMark.jsx";
import { buildAdMobShowcaseCard } from "../../lib/ads/buildAdMobShowcaseCard.js";
import {
  VLUE_CLOSE_ADMOB_SHOWCASE,
  VLUE_OPEN_ADMOB_SHOWCASE
} from "../../lib/ads/openAdMobShowcase.js";
import { fetchSignatureSounds } from "../../lib/showcase/showcaseSoundApi.js";
import { CLOSE_SHOWCASE_OVERLAYS_EVENT } from "../../lib/showcase/closeShowcaseOverlays.js";
import { pushAndroidBackHandler } from "../../lib/androidBackStack.js";

/**
 * AdMob 쇼케이스 — VLUE 쇼케이스 크롬 + 명시적 빅푸시.
 * 이미지: 웹 미디어 / 동영상만 MediaView 슬롯.
 * 띠배너 금지 → 하단 CTA(설치/방문).
 */
export default function AdMobShowcaseOverlay({ onToast }) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState(null);
  const [signatureBgm, setSignatureBgm] = useState(null);
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
    /* 쇼케이스 종료 후 일반 띠배너 재표시 */
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
  const advertiser = String(assets?.advertiser || card?.name || "스폰서").trim() || "스폰서";
  const avatarUrl = String(assets?.iconUrl || assets?.mediaUrl || card?.photoUrl || "").trim();

  const syncNativeSlots = useCallback(() => {
    if (!open || !bridge?.syncNativeAdShowcaseSlots) return;
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
          hasVideoContent: hasVideo,
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
            label: ctaLabel,
            visible: !ctaPaused
          }
        })
      );
    } catch {
      /* ignore */
    }
  }, [open, bridge, hasVideo, ctaLabel, ctaPaused]);

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

  useEffect(() => {
    if (!open || !hasVideo) return undefined;
    const onClick = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest(".showcase-bgm-transport__btn--main") || t.closest(".showcase-bgm-chip")) {
        e.preventDefault();
        e.stopPropagation();
        try {
          bridge?.toggleNativeAdShowcaseAudio?.();
        } catch {
          /* ignore */
        }
      }
    };
    document.addEventListener("pointerup", onClick, true);
    return () => document.removeEventListener("pointerup", onClick, true);
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
        <style>{`
          [data-admob-showcase] .lettering-live-bar { display: none !important; }
          [data-admob-showcase] .lettering-ongoing-summary { display: none !important; }
          [data-admob-showcase] .showcase-dcc-bottom-banner { display: none !important; }
          [data-admob-showcase] .lettering-ongoing-actions-secondary { display: none !important; }
          [data-admob-showcase] .showcase-call-carousel__slide-settings { display: none !important; }
          [data-admob-showcase] .showcase-social-rail { z-index: 40; pointer-events: auto !important; }
          [data-admob-showcase] .lettering-live-indicator__bar {
            background: linear-gradient(180deg, #67e8f9 0%, #22d3ee 50%, #06b6d4 100%);
          }
          [data-admob-showcase] .lettering-live-indicator {
            filter: drop-shadow(0 0 5px rgba(34, 211, 238, 0.9));
          }
          ${hasVideo ? "[data-admob-showcase] .showcase-media-page__img{opacity:0!important}" : ""}
        `}</style>

        {/* 빅푸시 — 이퀄라이저 + AD Sponsor · 우측에 ⓧ 단독 */}
        <header
          className="admob-big-push shrink-0 border-b border-white/10 bg-[#0B101B] px-3 pb-2.5 pt-[max(10px,var(--vlue-safe-top,10px))]"
          data-admob-big-push
        >
          <div className="mb-2 flex min-w-0 items-center gap-2">
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
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800 ring-1 ring-white/15">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
              ) : (
                <span className="text-[14px] font-black text-white">{advertiser.slice(0, 1)}</span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[14px] font-black text-white">
                <span className="truncate">스폰서 광고주</span>
                <ShowcaseIdentityCertMark verified size={15} />
              </p>
              <p className="truncate text-[11px] font-semibold text-slate-400">Sponsor</p>
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/55 text-white active:scale-95"
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

        {/* 띠배너 자리 = CTA only */}
        <div className="shrink-0 bg-[#0B101B] px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            data-admob-cta-slot
            className="flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3.5 text-[16px] font-black text-white"
            style={{
              pointerEvents: "none",
              visibility: ctaPaused ? "hidden" : "visible",
              height: ctaPaused ? 0 : undefined,
              paddingTop: ctaPaused ? 0 : undefined,
              paddingBottom: ctaPaused ? 0 : undefined,
              margin: 0,
              overflow: "hidden"
            }}
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
