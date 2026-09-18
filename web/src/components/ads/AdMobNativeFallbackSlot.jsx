import { useEffect, useRef, useState } from "react";
import { ADMOB_TEST } from "../../lib/ads/adMobUnitIds.js";

const LOAD_TIMEOUT_MS = 12000;
const POLL_MS = 750;
const CLIP_W = 132;
const CLIP_H = 234;

/**
 * Android WebView 위 네이티브 MediaView 슬롯 (세로 클립/릴스형).
 * - 팔로우 바텀시트 위로 뜨지 않음 (시트 mid/full 또는 교차 시 hide)
 * - 탭 복귀 시 네이티브가 다시 바인딩되도록 sync 유지
 */
export default function AdMobNativeFallbackSlot({
  compact = false,
  className = "",
  variant = "portrait"
}) {
  const ref = useRef(null);
  const [status, setStatus] = useState("idle");
  const [errorText, setErrorText] = useState("");
  const statusRef = useRef("idle");
  const mountedAtRef = useRef(Date.now());
  const sheetLevelRef = useRef("collapsed");

  const bridge =
    typeof window !== "undefined" ? window.VlueLettering || window.Android : null;
  const hasBridge = typeof bridge?.showNativeAdFallback === "function";

  const isPortrait = variant === "portrait";
  const sizeClass = isPortrait
    ? "h-[234px] w-[132px] max-w-[132px] shrink-0 grow-0 basis-[132px]"
    : compact
      ? "h-[180px] min-w-[min(100%,280px)] flex-1"
      : "h-[246px] w-full";

  const applyPayload = (payload) => {
    if (!payload || typeof payload !== "object") return;
    const next = String(payload.status || "");
    if (!next) return;
    const normalized = next === "showcase_open" ? "loaded" : next;
    statusRef.current = normalized;
    setStatus(normalized);
    const msg = String(payload.message || "").trim();
    if (normalized === "failed" || normalized === "timeout") {
      setErrorText(
        msg ||
          (normalized === "timeout"
            ? "타임아웃: 광고 로드 실패"
            : "광고를 불러오지 못했습니다")
      );
    } else if (normalized === "loaded") {
      setErrorText("");
    }
  };

  useEffect(() => {
    const onStatus = (ev) => applyPayload(ev?.detail);
    const onSheet = (ev) => {
      sheetLevelRef.current = String(ev?.detail?.level || "collapsed");
    };
    window.addEventListener("vlue-native-ad-status", onStatus);
    window.addEventListener("vlue-friend-sheet-level", onSheet);

    const pollId = window.setInterval(() => {
      try {
        if (window.__vlueNativeAdStatus) {
          applyPayload(window.__vlueNativeAdStatus);
        }
        const raw = bridge?.getNativeAdStatusJson?.();
        if (typeof raw === "string" && raw.length > 2) {
          applyPayload(JSON.parse(raw));
        }
      } catch {
        /* ignore */
      }
    }, POLL_MS);

    return () => {
      window.removeEventListener("vlue-native-ad-status", onStatus);
      window.removeEventListener("vlue-friend-sheet-level", onSheet);
      window.clearInterval(pollId);
    };
  }, [bridge]);

  useEffect(() => {
    if (!hasBridge) {
      statusRef.current = "unsupported";
      setStatus("unsupported");
      setErrorText("앱에서 AdMob 맞춤 광고가 표시됩니다");
      return undefined;
    }
    if (!ref.current) return undefined;

    let pausedByShowcase = false;
    const setPaused = (paused) => {
      pausedByShowcase = paused;
      if (paused) bridge.hideNativeAdFallback?.();
    };

    const onHideHomeNative = () => setPaused(true);
    const onShowHome = () => {
      /* 홈 복귀 — 일시정지 해제 후 sync */
      pausedByShowcase = false;
    };
    window.addEventListener("vlue-hide-home-native-ads", onHideHomeNative);
    window.addEventListener("vlue-hide-all-ads", onHideHomeNative);
    window.addEventListener("vlue-show-home-native-ads", onShowHome);

    if (statusRef.current !== "failed" && statusRef.current !== "timeout") {
      statusRef.current = "loading";
      setStatus("loading");
      setErrorText("");
      mountedAtRef.current = Date.now();
    }

    let frame = 0;
    let cancelled = false;

    const overlapsFriendSheet = (adRect) => {
      const panel = document.querySelector(".friend-showcase-list__sheet-panel");
      if (!panel) return false;
      const level = sheetLevelRef.current || panel.getAttribute("data-level") || "collapsed";
      if (level === "mid" || level === "full") return true;
      const sr = panel.getBoundingClientRect();
      /* 접힌 시트와도 겹치면 숨김 (네이티브 오버레이가 시트 위에 뜨는 것 방지) */
      return adRect.bottom > sr.top + 4 && adRect.top < sr.bottom - 4;
    };

    const buildRectJson = () => {
      const el = ref.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const covered =
        pausedByShowcase ||
        Boolean(document.querySelector(".lettering-ongoing--expanded[data-expanded='true']")) ||
        overlapsFriendSheet(rect);
      const width = isPortrait ? Math.min(rect.width || CLIP_W, CLIP_W) : rect.width;
      const height = isPortrait ? CLIP_H : rect.height;
      return JSON.stringify({
        left: rect.left,
        top: rect.top,
        width: isPortrait ? CLIP_W : width,
        height: isPortrait ? CLIP_H : height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        visible:
          !covered &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight &&
          rect.width > 8,
        clipPortrait: isPortrait,
        unitId: ADMOB_TEST.NATIVE
      });
    };

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        const json = buildRectJson();
        if (!json) return;
        const parsed = JSON.parse(json);
        if (!parsed.visible) {
          bridge.hideNativeAdFallback?.();
          return;
        }
        if (pausedByShowcase) return;
        bridge.showNativeAdFallback(json);
      });
    };

    const onSheetLevel = () => sync();
    window.addEventListener("vlue-friend-sheet-level", onSheetLevel);

    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      const cur = statusRef.current;
      if (cur === "loading" || cur === "idle") {
        statusRef.current = "timeout";
        setStatus("timeout");
        setErrorText("타임아웃: 광고 로드 실패");
      }
    }, LOAD_TIMEOUT_MS);

    const watchdogId = window.setInterval(() => {
      if (cancelled) return;
      const cur = statusRef.current;
      if (
        (cur === "loading" || cur === "idle") &&
        Date.now() - mountedAtRef.current >= LOAD_TIMEOUT_MS
      ) {
        statusRef.current = "timeout";
        setStatus("timeout");
        setErrorText("타임아웃: 광고 로드 실패");
      }
    }, 1000);

    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(sync) : null;
    observer?.observe(ref.current);
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    sync();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.clearInterval(watchdogId);
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
      window.removeEventListener("vlue-hide-home-native-ads", onHideHomeNative);
      window.removeEventListener("vlue-hide-all-ads", onHideHomeNative);
      window.removeEventListener("vlue-show-home-native-ads", onShowHome);
      window.removeEventListener("vlue-friend-sheet-level", onSheetLevel);
      bridge.hideNativeAdFallback?.();
    };
  }, [hasBridge, bridge, variant, isPortrait]);

  /* 홈(main) 복귀 시 다시 노출 */
  useEffect(() => {
    const onPage = () => {
      window.dispatchEvent(new CustomEvent("vlue-show-home-native-ads"));
    };
    window.addEventListener("vlue-home-visible", onPage);
    return () => window.removeEventListener("vlue-home-visible", onPage);
  }, []);

  const showLoading = status === "idle" || status === "loading";
  const showFailed =
    status === "failed" || status === "timeout" || status === "unsupported";
  const loaded = status === "loaded";

  return (
    <div
      ref={ref}
      className={`vlue-native-ad-clip relative flex snap-start items-center justify-center overflow-hidden rounded-[16px] border border-slate-200/80 ${sizeClass} ${
        loaded ? "border-transparent bg-transparent" : "bg-slate-100"
      } ${className}`.trim()}
      style={
        isPortrait
          ? { width: CLIP_W, height: CLIP_H, flex: `0 0 ${CLIP_W}px`, maxWidth: CLIP_W }
          : undefined
      }
      aria-label="맞춤 광고"
      data-ad-unit={ADMOB_TEST.NATIVE}
      data-ad-status={status}
      data-ad-clip="portrait"
    >
      {!loaded ? <span className="vlue-ad-test-badge absolute left-2 top-2 z-[1]">Test Ad</span> : null}
      {showLoading ? (
        <span className="px-2 text-center text-[10px] font-bold text-slate-400">불러오는 중…</span>
      ) : null}
      {showFailed ? (
        <span className="px-2 text-center text-[10px] font-bold leading-snug text-rose-600">
          {errorText ||
            (status === "timeout"
              ? "타임아웃: 광고 로드 실패"
              : status === "unsupported"
                ? "앱에서 AdMob 표시"
                : "광고 로드 실패")}
        </span>
      ) : null}
    </div>
  );
}
