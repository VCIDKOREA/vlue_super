import { useEffect, useRef, useState } from "react";
import { ADMOB_TEST } from "../../lib/ads/adMobUnitIds.js";
import { openAdMobShowcase } from "../../lib/ads/openAdMobShowcase.js";

const LOAD_TIMEOUT_MS = 12000;
const POLL_MS = 800;
const CLIP_W = 132;
const CLIP_H = 234;

/**
 * 홈 클립형 썸네일 — AdMob NativeAdView 없음(순수 커스텀 UI).
 * SDK에서 받은 mediaUrl/headline/body만 렌더. 탭 → openNativeAdShowcase().
 */
export default function AdMobNativeFallbackSlot({ className = "" }) {
  const [status, setStatus] = useState("idle");
  const [errorText, setErrorText] = useState("");
  const [assets, setAssets] = useState({
    headline: "",
    body: "",
    advertiser: "",
    mediaUrl: "",
    ctaLabel: "",
    hasVideoContent: false
  });
  const statusRef = useRef("idle");
  const mountedAtRef = useRef(Date.now());

  const bridge =
    typeof window !== "undefined" ? window.VlueLettering || window.Android : null;
  const hasBridge = typeof bridge?.showNativeAdFallback === "function";

  const applyPayload = (payload) => {
    if (!payload || typeof payload !== "object") return;
    const next = String(payload.status || "");
    if (!next) return;
    const normalized = next === "showcase_open" ? "loaded" : next;
    statusRef.current = normalized;
    setStatus(normalized);
    if (payload.headline || payload.mediaUrl || payload.body || payload.ctaLabel) {
      setAssets({
        headline: String(payload.headline || ""),
        body: String(payload.body || ""),
        advertiser: String(payload.advertiser || "스폰서"),
        mediaUrl: String(payload.mediaUrl || ""),
        ctaLabel: String(payload.ctaLabel || "방문하기"),
        hasVideoContent: Boolean(payload.hasVideoContent)
      });
    }
    const msg = String(payload.message || "").trim();
    if (normalized === "failed" || normalized === "timeout") {
      setErrorText(
        msg ||
          (normalized === "timeout" ? "타임아웃: 광고 로드 실패" : "광고를 불러오지 못했습니다")
      );
    } else if (normalized === "loaded") {
      setErrorText("");
    }
  };

  useEffect(() => {
    const onStatus = (ev) => applyPayload(ev?.detail);
    window.addEventListener("vlue-native-ad-status", onStatus);
    const pollId = window.setInterval(() => {
      try {
        if (window.__vlueNativeAdStatus) applyPayload(window.__vlueNativeAdStatus);
        const raw = bridge?.getNativeAdStatusJson?.();
        if (typeof raw === "string" && raw.length > 2) applyPayload(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }, POLL_MS);
    return () => {
      window.removeEventListener("vlue-native-ad-status", onStatus);
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

    statusRef.current = "loading";
    setStatus("loading");
    setErrorText("");
    mountedAtRef.current = Date.now();

    const requestLoad = () => {
      bridge.showNativeAdFallback?.(
        JSON.stringify({
          visible: true,
          unitId: ADMOB_TEST.NATIVE,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight
        })
      );
    };

    const onHide = () => {
      /* 홈 이탈 시 쇼케이스만 닫힘 — 에셋 캐시는 네이티브에 유지 */
    };
    const onShow = () => requestLoad();

    window.addEventListener("vlue-hide-all-ads", onHide);
    window.addEventListener("vlue-hide-home-native-ads", onHide);
    window.addEventListener("vlue-show-home-native-ads", onShow);
    window.addEventListener("vlue-home-visible", onShow);

    requestLoad();

    const timeoutId = window.setTimeout(() => {
      const cur = statusRef.current;
      if (cur === "loading" || cur === "idle") {
        statusRef.current = "timeout";
        setStatus("timeout");
        setErrorText("타임아웃: 광고 로드 실패");
      }
    }, LOAD_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("vlue-hide-all-ads", onHide);
      window.removeEventListener("vlue-hide-home-native-ads", onHide);
      window.removeEventListener("vlue-show-home-native-ads", onShow);
      window.removeEventListener("vlue-home-visible", onShow);
    };
  }, [hasBridge, bridge]);

  const openShowcase = () => {
    if (status !== "loaded") return;
    /* VLUE ShowcaseCallCarousel UI + NativeAdView MediaView/CTA 슬롯 */
    openAdMobShowcase({
      ...assets,
      hasVideoContent: Boolean(assets.hasVideoContent)
    });
  };

  const showLoading = status === "idle" || status === "loading";
  const showFailed = status === "failed" || status === "timeout" || status === "unsupported";
  const loaded = status === "loaded";

  return (
    <button
      type="button"
      onClick={openShowcase}
      disabled={!loaded}
      className={`vlue-native-ad-clip relative shrink-0 snap-start overflow-hidden rounded-[16px] border border-slate-200/80 text-left ${
        loaded ? "border-transparent bg-slate-900" : "bg-slate-100"
      } ${className}`.trim()}
      style={{ width: CLIP_W, height: CLIP_H, flex: `0 0 ${CLIP_W}px`, maxWidth: CLIP_W }}
      aria-label="추천 스폰서 광고"
      data-ad-unit={ADMOB_TEST.NATIVE}
      data-ad-status={status}
      data-ad-clip="portrait"
    >
      {loaded && assets.mediaUrl ? (
        <img src={assets.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      ) : null}
      {loaded ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-2 pb-2.5 pt-12">
          <p className="text-[10px] font-bold text-sky-300">{assets.advertiser || "스폰서"}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] font-black leading-snug text-white">
            {assets.headline || "광고"}
          </p>
          {assets.body ? (
            <p className="mt-0.5 line-clamp-1 text-[9px] text-slate-300">{assets.body}</p>
          ) : null}
        </div>
      ) : null}
      <span className="absolute right-1.5 top-1.5 z-[1] rounded bg-black/55 px-1 py-0.5 text-[8px] font-black text-white">
        AD
      </span>
      {!loaded ? <span className="vlue-ad-test-badge absolute left-1.5 top-1.5 z-[1]">Test Ad</span> : null}
      {showLoading ? (
        <span className="relative z-[1] flex h-full items-center justify-center px-2 text-center text-[10px] font-bold text-slate-400">
          불러오는 중…
        </span>
      ) : null}
      {showFailed ? (
        <span className="relative z-[1] flex h-full items-center justify-center px-2 text-center text-[10px] font-bold leading-snug text-rose-600">
          {errorText || "광고 로드 실패"}
        </span>
      ) : null}
    </button>
  );
}
