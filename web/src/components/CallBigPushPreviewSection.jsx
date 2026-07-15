import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import LetteringIncomingNotification from "./LetteringIncomingNotification.jsx";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import {
  resolveVlueShowcaseCard,
  VLUE_SHOWCASE_DEMO_RECORDING_SEC
} from "../lib/vlueShowcaseCard.js";
import { applyShowcaseStyleToCard } from "../lib/showcase/applyShowcaseStyleToCard.js";
import { showcasePreviewLabel, VLUE_SHOWCASE } from "../lib/vlueBrandSpaces.js";
import {
  SHOWCASE_OPEN_SETTINGS_EVENT,
  SHOWCASE_STYLE_CHANGED_EVENT
} from "../lib/showcase/showcaseStyleStorage.js";
import { LETTERING_BIZCARD_CHANGED_EVENT } from "../lib/letteringBizcardStorage.js";
import { v1AppShell } from "../lib/v1ReleaseScope.js";
import {
  readShowcasePreviewDigitalCardApplied
} from "../lib/vlueShowcasePreviewIdentity.js";
import { useShowcaseBgm } from "../context/ShowcaseBgmContext.jsx";

/**
 * VLUE Showcase — 홈 메인 통화 빅푸시(픽푸시) 미리보기
 * 켜짐/꺼짐 모두 접힘→전체화면 펼침. 꺼짐은 내용만 번호+VLUE 인증.
 */
export default function CallBigPushPreviewSection({
  membershipTier = "free",
  className = "",
  onToast,
  isDarkMode = false
}) {
  const showTierTabs = v1AppShell.callBigPushTierTabs;
  const [showcaseOn, setShowcaseOn] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [previewTick, setPreviewTick] = useState(0);
  const { bindStyleConfig, setPlaybackPhase } = useShowcaseBgm();

  const paidTier = isPaidLetteringTier(membershipTier) ? membershipTier : "premium";
  const isOn = showcaseOn;
  const effectiveTier = isOn ? paidTier : "free";

  useEffect(() => {
    const bump = () => setPreviewTick((n) => n + 1);
    window.addEventListener(SHOWCASE_STYLE_CHANGED_EVENT, bump);
    window.addEventListener(LETTERING_BIZCARD_CHANGED_EVENT, bump);
    window.addEventListener("vlue-digital-card-changed", bump);
    return () => {
      window.removeEventListener(SHOWCASE_STYLE_CHANGED_EVENT, bump);
      window.removeEventListener(LETTERING_BIZCARD_CHANGED_EVENT, bump);
      window.removeEventListener("vlue-digital-card-changed", bump);
    };
  }, []);

  const card = useMemo(() => {
    const base = applyShowcaseStyleToCard(
      resolveVlueShowcaseCard({ membershipTier: effectiveTier, previewExample: true }),
      effectiveTier
    );
    if (isOn) return { ...base, membershipTier: effectiveTier };
    return {
      ...base,
      membershipTier: "free",
      hideBroadcastName: true,
      showcaseStyle: {
        ...(base.showcaseStyle || {}),
        showBroadcastName: false
      }
    };
  }, [effectiveTier, isOn, previewTick]);

  useEffect(() => {
    bindStyleConfig(card?.showcaseStyle);
    /* 홈 미리보기(접힘·펼침)와 명함 슬라이드에서 동일 BGM */
    setPlaybackPhase(isOn ? "preview" : "idle");
    return () => setPlaybackPhase("idle");
  }, [card?.showcaseStyle, isOn, bindStyleConfig, setPlaybackPhase]);

  const digitalCardApplied = readShowcasePreviewDigitalCardApplied();
  const incomingNumber = card.phone || "";
  const useFullscreenPortal = expanded;

  const openSettings = () => {
    setExpanded(false);
    window.setTimeout(() => {
      window.dispatchEvent(new Event(SHOWCASE_OPEN_SETTINGS_EVENT));
    }, 40);
  };

  const notificationProps = {
    verified: true,
    previewMode: true,
    showOwnerSettings: true,
    showcaseOffPreview: !isOn,
    includeDigitalCard: isOn && digitalCardApplied,
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
    onExpandedChange: setExpanded,
    onEndCall: () => setExpanded(false),
    onToast
  };

  const titleCls = isDarkMode ? "text-[12px] font-black text-slate-100" : "text-[12px] font-black text-slate-900";
  const tabTrackCls = isDarkMode ? "flex gap-1 rounded-full bg-slate-800 p-1" : "flex gap-1 rounded-full bg-slate-100 p-1";
  const statusOnCls = isDarkMode
    ? "border border-blue-400/35 bg-blue-500/20 text-blue-100"
    : "border border-blue-100 bg-blue-50 text-blue-900";
  const statusOffCls = isDarkMode
    ? "border border-slate-600 bg-slate-800 text-slate-200"
    : "border border-slate-200 bg-slate-50 text-slate-700";

  return (
    <section
      className={`mx-auto w-full max-w-md px-0 pb-0 pt-0 ${className}`.trim()}
      aria-label={VLUE_SHOWCASE.nameEn}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
        <div>
          <p className={titleCls}>{showcasePreviewLabel()}</p>
        </div>
        <button
          type="button"
          onClick={openSettings}
          className="shrink-0 rounded-full bg-blue-600 px-3 py-1.5 text-[10px] font-black text-white shadow-sm active:scale-95"
        >
          스타일 설정
        </button>
      </div>

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
        <div className="lettering-home-push-embed">
          <LetteringIncomingNotification
            {...notificationProps}
            className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent lettering-ongoing--home-glass"
          />
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
