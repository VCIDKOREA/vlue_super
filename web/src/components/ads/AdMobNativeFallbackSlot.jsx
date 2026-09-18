import { useEffect, useRef, useState } from "react";
import { ADMOB_TEST } from "../../lib/ads/adMobUnitIds.js";

const LOAD_TIMEOUT_MS = 12000;
const POLL_MS = 750;

/**
 * Android WebView 위 네이티브 MediaView 슬롯.
 * - vlue-native-ad-status / __vlueNativeAdStatus / getNativeAdStatusJson 폴링
 * - 12초 타임아웃 시 "타임아웃: 광고 로드 실패" 확정 표시
 * - onAdFailedToLoad → Error Code: N - message 카드에 직접 노출
 */
export default function AdMobNativeFallbackSlot({
  compact = false,
  className = "",
  variant = "landscape"
}) {
  const ref = useRef(null);
  const [status, setStatus] = useState("idle");
  const [errorText, setErrorText] = useState("");
  const statusRef = useRef("idle");
  const mountedAtRef = useRef(Date.now());

  const bridge =
    typeof window !== "undefined" ? window.VlueLettering || window.Android : null;
  const hasBridge = typeof bridge?.showNativeAdFallback === "function";

  const sizeClass =
    variant === "portrait"
      ? "h-[220px] w-[124px] shrink-0"
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

  /* 이벤트 + window 폴링 (evaluateJavascript 이벤트 유실 대비) */
  useEffect(() => {
    const onStatus = (ev) => applyPayload(ev?.detail);
    window.addEventListener("vlue-native-ad-status", onStatus);

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
      window.clearInterval(pollId);
    };
  }, [bridge]);

  /* 브릿지 로드 + 웹 측 12초 하드 타임아웃 (cleanup이 리셋하지 않도록 mountedAt 기준) */
  useEffect(() => {
    if (!hasBridge) {
      statusRef.current = "unsupported";
      setStatus("unsupported");
      setErrorText("앱에서 AdMob 맞춤 광고가 표시됩니다");
      return undefined;
    }
    if (!ref.current) return undefined;

    statusRef.current = "loading";
    setStatus("loading");
    setErrorText("");
    mountedAtRef.current = Date.now();

    let frame = 0;
    let cancelled = false;

    const buildRectJson = () => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return null;
      return JSON.stringify({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        visible: rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 8,
        unitId: ADMOB_TEST.NATIVE
      });
    };

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        const json = buildRectJson();
        if (!json) return;
        bridge.showNativeAdFallback(json);
      });
    };

    /* 벽시계 기준 타임아웃 — effect remount 시에도 이전 타이머를 clear하지만
       새 타이머가 다시 12초. 추가로 절대시각 체크를 rAF로 보조 */
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
      bridge.hideNativeAdFallback?.();
    };
  }, [hasBridge, bridge, variant]);

  const showLoading = status === "idle" || status === "loading";
  const showFailed =
    status === "failed" || status === "timeout" || status === "unsupported";
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
        <span className="px-3 text-center text-[11px] font-bold text-slate-400">
          맞춤 광고 불러오는 중…
        </span>
      ) : null}
      {showFailed ? (
        <span className="px-3 text-center text-[11px] font-bold leading-snug text-rose-600">
          {errorText ||
            (status === "timeout"
              ? "타임아웃: 광고 로드 실패"
              : status === "unsupported"
                ? "앱에서 AdMob 맞춤 광고가 표시됩니다"
                : "광고를 불러오지 못했습니다")}
        </span>
      ) : null}
    </div>
  );
}
