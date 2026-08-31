import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import LetteringIncomingNotification from "./LetteringIncomingNotification.jsx";
import { resolveEffectiveMembershipTier } from "../lib/effectiveMembership.js";
import { canUseV1PaidDccFeatures } from "../lib/v1PaidPackageGate.js";
import {
  resolveVlueShowcaseCard,
  VLUE_SHOWCASE_DEMO_RECORDING_SEC
} from "../lib/vlueShowcaseCard.js";
import { applyShowcaseStyleToCard } from "../lib/showcase/applyShowcaseStyleToCard.js";
import { VLUE_SHOWCASE } from "../lib/vlueBrandSpaces.js";
import { SHOWCASE_STYLE_CHANGED_EVENT, SHOWCASE_LIVE_STYLE_CHANGED_EVENT } from "../lib/showcase/showcaseStyleStorage.js";
import { hydrateLiveBroadcastFromServer } from "../lib/showcase/syncMycaseLiveBroadcast.js";
import { LETTERING_BIZCARD_CHANGED_EVENT } from "../lib/letteringBizcardStorage.js";
import { v1AppShell } from "../lib/v1ReleaseScope.js";
import {
  readShowcasePreviewDigitalCardApplied
} from "../lib/vlueShowcasePreviewIdentity.js";
import { readVcidBroadcastOn } from "../lib/bizcardAccountSync.js";
import { pushAndroidBackHandler } from "../lib/androidBackStack.js";
import { CLOSE_SHOWCASE_OVERLAYS_EVENT } from "../lib/showcase/closeShowcaseOverlays.js";
import { trackCallInterfaceUse, trackShowcaseView } from "../lib/productMetrics.js";
import { useShowcaseBgm } from "../context/ShowcaseBgmContext.jsx";

/**
 * VLUE Showcase — 홈 메인 통화 빅푸시(픽푸시) 미리보기
 * 켜짐/꺼짐 모두 접힘→전체화면 펼침. 꺼짐은 내용만 번호+VLUE 인증.
 * 「통화화면」으로 실통화와 같은 하단 제어바 미리보기 가능.
 *
 * @param {"portal"|"inline"} [expandMode]
 *   portal = 앱 홈(document 전체화면)
 *   inline = www 쇼케이스 관리 — 빅푸시 아래(빨간박스)에 동일 전체화면 UI
 * @param {boolean} [suppressExpandGuide] www 데스크 — 접기/펼치기 안내 토스트 생략(레이아웃 밀림 방지)
 */
export default function CallBigPushPreviewSection({
  membershipTier = "free",
  className = "",
  onToast,
  isDarkMode = false,
  expandMode = "portal",
  defaultExpanded = false,
  suppressExpandGuide = false
}) {
  const showTierTabs = v1AppShell.callBigPushTierTabs;
  const inlineExpand = expandMode === "inline";
  /** 프로필 「쇼케이스 켜짐/꺼짐」과 동일 — 꺼짐이면 미리보기도 VLUE 인증 팝업만 */
  const [showcaseOn, setShowcaseOn] = useState(() => readVcidBroadcastOn());
  const [expanded, setExpanded] = useState(Boolean(defaultExpanded));
  const [callChromePreview, setCallChromePreview] = useState(false);
  const [previewTick, setPreviewTick] = useState(0);
  const [liveCallOverlayActive, setLiveCallOverlayActive] = useState(false);
  const { unlockFromUserGesture, setPlaybackPhase } = useShowcaseBgm();

  const isOn = showcaseOn;
  /** 무료 회원 미리보기에 premium tier를 주입하지 않음 — 실제 청구·가족플랜 effective tier 사용 */
  const effectiveTier = isOn ? resolveEffectiveMembershipTier(membershipTier) : "free";

  useEffect(() => {
    const readActive = () => {
      try {
        const raw =
          window.Android?.isCompanionOverlayActive?.() ||
          window.VlueLettering?.isCompanionOverlayActive?.() ||
          "";
        setLiveCallOverlayActive(String(raw) === "1" || String(raw) === "true");
      } catch {
        setLiveCallOverlayActive(false);
      }
    };
    readActive();
    const t = window.setInterval(readActive, 700);
    const onNative = () => readActive();
    window.addEventListener("vlue-native-call-state", onNative);
    window.addEventListener("focus", onNative);
    window.addEventListener("visibilitychange", onNative);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("vlue-native-call-state", onNative);
      window.removeEventListener("focus", onNative);
      window.removeEventListener("visibilitychange", onNative);
    };
  }, []);

  useEffect(() => {
    const syncBroadcast = () => setShowcaseOn(readVcidBroadcastOn());
    window.addEventListener("vlue-vcid-changed", syncBroadcast);
    return () => window.removeEventListener("vlue-vcid-changed", syncBroadcast);
  }, []);

  useEffect(() => {
    if (isOn) return undefined;
    setPlaybackPhase("idle", { steal: true, fade: true, owner: "home-showcase-off" });
    return () => {
      setPlaybackPhase("idle", { release: true, owner: "home-showcase-off" });
    };
  }, [isOn, setPlaybackPhase]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await hydrateLiveBroadcastFromServer();
      if (cancelled || !res.applied) return;
      setPreviewTick((n) => n + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const bump = () => setPreviewTick((n) => n + 1);
    window.addEventListener(SHOWCASE_STYLE_CHANGED_EVENT, bump);
    window.addEventListener(SHOWCASE_LIVE_STYLE_CHANGED_EVENT, bump);
    window.addEventListener(LETTERING_BIZCARD_CHANGED_EVENT, bump);
    window.addEventListener("vlue-digital-card-changed", bump);
    window.addEventListener("vlue-avatar-changed", bump);
    window.addEventListener("vlue-dcc-line-changed", bump);
    return () => {
      window.removeEventListener(SHOWCASE_STYLE_CHANGED_EVENT, bump);
      window.removeEventListener(SHOWCASE_LIVE_STYLE_CHANGED_EVENT, bump);
      window.removeEventListener(LETTERING_BIZCARD_CHANGED_EVENT, bump);
      window.removeEventListener("vlue-digital-card-changed", bump);
      window.removeEventListener("vlue-avatar-changed", bump);
      window.removeEventListener("vlue-dcc-line-changed", bump);
    };
  }, []);

  useEffect(() => {
    if (!expanded) return undefined;
    trackCallInterfaceUse(callChromePreview ? "preview_incall" : "preview");
    trackShowcaseView("home_preview");
    return pushAndroidBackHandler(() => {
      setExpanded(false);
      setCallChromePreview(false);
      return true;
    });
  }, [expanded, callChromePreview]);

  useEffect(() => {
    const onCloseOverlays = () => {
      setExpanded(false);
      setCallChromePreview(false);
    };
    window.addEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onCloseOverlays);
    return () => window.removeEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onCloseOverlays);
  }, []);

  const card = useMemo(() => {
    const base = applyShowcaseStyleToCard(
      resolveVlueShowcaseCard({ membershipTier: effectiveTier, previewExample: true }),
      effectiveTier
    );
    if (isOn) return { ...base, membershipTier: effectiveTier };
    return { ...base, membershipTier: "free" };
  }, [effectiveTier, isOn, previewTick]);

  const digitalCardApplied = readShowcasePreviewDigitalCardApplied();
  const incomingNumber = card.phone || "";
  const useFullscreenPortal = expanded && !inlineExpand;

  const handleExpandedChange = (next) => {
    setExpanded(next);
  };

  useEffect(() => {
    if (expanded) return undefined;
    const t = window.setTimeout(() => setCallChromePreview(false), 520);
    return () => window.clearTimeout(t);
  }, [expanded]);

  const notificationProps = {
    verified: true,
    previewMode: true,
    showOwnerSettings: true,
    showcaseOffPreview: !isOn,
    includeDigitalCard: isOn && canUseV1PaidDccFeatures(membershipTier) && digitalCardApplied,
    callPhase: "connected",
    platform: "android",
    isRecording: isOn,
    callDurationSec: isOn ? VLUE_SHOWCASE_DEMO_RECORDING_SEC : 0,
    recordingDurationSec: isOn ? VLUE_SHOWCASE_DEMO_RECORDING_SEC : 0,
    incomingNumber,
    savedContactName: "",
    isKnownContact: isOn,
    card,
    expanded,
    onExpandedChange: handleExpandedChange,
    inCallChromePreview: callChromePreview,
    onInCallChromePreviewChange: setCallChromePreview,
    onEndCall: () => {
      setCallChromePreview(false);
      setExpanded(false);
    },
    onToast,
    suppressExpandGuide: Boolean(suppressExpandGuide || inlineExpand)
  };

  const tabTrackCls = isDarkMode ? "flex gap-1 rounded-full bg-slate-800 p-1" : "flex gap-1 rounded-full bg-slate-100 p-1";
  const statusOnCls = isDarkMode
    ? "border border-blue-400/35 bg-blue-500/20 text-blue-100"
    : "border border-blue-100 bg-blue-50 text-blue-900";
  const statusOffCls = isDarkMode
    ? "border border-slate-600 bg-slate-800 text-slate-200"
    : "border border-slate-200 bg-slate-50 text-slate-700";

  const embedClass = [
    "lettering-home-push-embed",
    inlineExpand ? "lettering-home-push-embed--web-inline" : "",
    inlineExpand && expanded ? "is-expanded" : "",
    inlineExpand && expanded && callChromePreview ? "is-call-chrome" : ""
  ]
    .filter(Boolean)
    .join(" ");

  /* 접힘·펼침 동일 크롬(home-glass) — 클래스 교체로 흔들림 방지 */
  const pushClassName =
    "lettering-ongoing--on-call lettering-ongoing--fullscreen-tent lettering-ongoing--home-glass";

  /* 실통화 오버레이가 떠 있으면 홈 미리보기를 숨겨 미니 UI 뒤 본인 쇼케이스 겹침을 막는다 */
  if (liveCallOverlayActive && !inlineExpand) {
    return null;
  }

  return (
    <section
      className={`mx-auto w-full max-w-md px-0 pb-0 pt-0 ${className}`.trim()}
      aria-label={VLUE_SHOWCASE.nameEn}
      onPointerDownCapture={() => {
        /* 펼친 미리보기에서만 autoplay 잠금 해제 — 접힌 상태 클릭으로 재생 재개 금지 */
        if (!expanded) return;
        try {
          unlockFromUserGesture?.();
        } catch {
          /* ignore */
        }
      }}
    >
      {showTierTabs ? (
        <div className="mb-1.5 space-y-1.5">
          <div className={tabTrackCls} role="tablist" aria-label="쇼케이스 켜짐 꺼짐">
            <button
              type="button"
              role="tab"
              aria-selected={isOn}
              className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition ${
                isOn
                  ? "bg-blue-600 text-white shadow-sm"
                  : isDarkMode
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => {
                setShowcaseOn(true);
                setExpanded(false);
                setCallChromePreview(false);
              }}
            >
              쇼케이스 켜짐
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isOn}
              className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition ${
                !isOn
                  ? "bg-slate-700 text-white shadow-sm"
                  : isDarkMode
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => {
                setShowcaseOn(false);
                setExpanded(false);
                setCallChromePreview(false);
              }}
            >
              쇼케이스 꺼짐
            </button>
          </div>
          <p
            className={`rounded-xl px-3 py-2 text-[10px] font-semibold leading-snug ${isOn ? statusOnCls : statusOffCls}`}
            style={{ wordBreak: "keep-all" }}
          >
            {isOn ? "켜짐 · 쇼케이스 전면" : "꺼짐 · 번호·인증만"}
          </p>
        </div>
      ) : null}

      {!useFullscreenPortal ? (
        <div className={embedClass}>
          <LetteringIncomingNotification {...notificationProps} className={pushClassName} />
        </div>
      ) : (
        <div className="lettering-home-push-embed lettering-home-push-embed--placeholder" aria-hidden>
          <p className={`px-3 py-8 text-center text-[11px] font-semibold ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
            전체화면 쇼케이스 미리보기 중
          </p>
        </div>
      )}

      {useFullscreenPortal && typeof document !== "undefined"
        ? createPortal(
            <div className="lettering-showcase-fs" role="dialog" aria-modal="true" aria-label="쇼케이스 미리보기">
              <div className="lettering-showcase-fs__shell">
                <LetteringIncomingNotification
                  {...notificationProps}
                  className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent"
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
