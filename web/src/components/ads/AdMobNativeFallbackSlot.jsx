import { useEffect, useRef, useState } from "react";
import { ADMOB_TEST } from "../../lib/ads/adMobUnitIds.js";

const LOAD_TIMEOUT_MS = 12000;

/**
 * Android WebView 위에 네이티브 MediaView를 정렬하는 투명 슬롯.
 * `vlue-native-ad-status` 로 무한 로딩을 끊고, 로드 후 배경을 비워 mediaContent가 보이게 함.
 *
 * @param {{ compact?: boolean, className?: string, variant?: "landscape" | "portrait" }} props
 */
export default function AdMobNativeFallbackSlot({
  compact = false,
  className = "",
  variant = "landscape"
}) {
  const ref = useRef(null);
  const [status, setStatus] = useState("idle");
  const hasBridge =
    typeof window !== "undefined" &&
    typeof (window.VlueLettering || window.Android)?.showNativeAdFallback === "function";

  const sizeClass =
    variant === "portrait"
      ? "h-[220px] w-[124px] shrink-0"
      : compact
        ? "h-[180px] min-w-[min(100%,280px)] flex-1"
        : "h-[246px] w-full";

  useEffect(() => {
    const onStatus = (ev) => {
      const next = ev?.detail?.status;
      if (next === "loaded" || next === "failed" || next === "loading" || next === "showcase_open") {
        setStatus(next === "showcase_open" ? "loaded" : next);
      }
    };
    window.addEventListener("vlue-native-ad-status", onStatus);
    return () => window.removeEventListener("vlue-native-ad-status", onStatus);
  }, []);

  useEffect(() => {
    if (!hasBridge) {
      setStatus("unsupported");
      return undefined;
    }
    const bridge = window.VlueLettering || window.Android;
    if (!ref.current || typeof bridge?.showNativeAdFallback !== "function") {
      setStatus("unsupported");
      return undefined;
    }

    setStatus("loading");
    let frame = 0;
    let cancelled = false;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        bridge.showNativeAdFallback(
          JSON.stringify({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            visible: rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 8,
            unitId: ADMOB_TEST.NATIVE
          })
        );
      });
    };

    const timeoutId = window.setTimeout(() => {
      setStatus((prev) => (prev === "loading" || prev === "idle" ? "failed" : prev));
    }, LOAD_TIMEOUT_MS);

    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(sync) : null;
    observer?.observe(ref.current);
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    sync();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
      bridge.hideNativeAdFallback?.();
    };
  }, [hasBridge]);

  const showLoading = hasBridge && (status === "idle" || status === "loading");
  const showFailed = status === "failed" || status === "unsupported";
  const loaded = status === "loaded";

  return (
    <div
      ref={ref}
      className={`home-banner-slide relative flex snap-start items-center justify-center overflow-hidden rounded-[18px] border border-slate-200/80 ${sizeClass} ${
        loaded ? "border-transparent bg-transparent" : "bg-slate-100"
      } ${className}`.trim()}
      aria-label="맞춤 광고"
      data-ad-unit={ADMOB_TEST.NATIVE}
      data-ad-status={status}
    >
      {!loaded ? <span className="vlue-ad-test-badge absolute left-2 top-2 z-[1]">Test Ad</span> : null}
      {showLoading ? (
        <span className="text-[11px] font-bold text-slate-400">맞춤 광고 불러오는 중…</span>
      ) : null}
      {showFailed ? (
        <span className="px-3 text-center text-[11px] font-bold leading-snug text-slate-400">
          {status === "unsupported" ? "앱에서 AdMob 맞춤 광고가 표시됩니다" : "광고를 불러오지 못했습니다"}
        </span>
      ) : null}
    </div>
  );
}
