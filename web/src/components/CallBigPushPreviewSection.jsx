import { useState } from "react";
import { createPortal } from "react-dom";
import LetteringIncomingNotification from "./LetteringIncomingNotification.jsx";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import {
  resolveVlueShowcaseCard,
  VLUE_SHOWCASE_DEMO_RECORDING_SEC
} from "../lib/vlueShowcaseCard.js";
import { applyShowcaseStyleToCard } from "../lib/showcase/applyShowcaseStyleToCard.js";
import { showcasePreviewLabel, VLUE_SHOWCASE } from "../lib/vlueBrandSpaces.js";
import { SHOWCASE_OPEN_SETTINGS_EVENT } from "../lib/showcase/showcaseStyleStorage.js";
import { v1AppShell } from "../lib/v1ReleaseScope.js";

/**
 * VLUE Showcase — 홈 메인 통화 빅푸시 미리보기
 * 펼침 시 하단 내비까지 덮는 전체화면(천막)으로 전환
 */
export default function CallBigPushPreviewSection({ membershipTier = "free", className = "", onToast }) {
  const showTierTabs = v1AppShell.callBigPushTierTabs;
  const [tier, setTier] = useState(showTierTabs ? "paid" : "free");
  const [expanded, setExpanded] = useState(false);

  const effectiveTier = showTierTabs && tier === "paid" ? "premium" : membershipTier;
  const card = applyShowcaseStyleToCard(resolveVlueShowcaseCard({ membershipTier: effectiveTier }), effectiveTier);
  const isPaid = isPaidLetteringTier(effectiveTier);
  const incomingNumber = card.phone || "";

  const notificationProps = {
    verified: true,
    previewMode: true,
    callPhase: isPaid || expanded ? "connected" : "ringing",
    platform: "android",
    isRecording: isPaid,
    callDurationSec: isPaid ? VLUE_SHOWCASE_DEMO_RECORDING_SEC : 0,
    recordingDurationSec: isPaid ? VLUE_SHOWCASE_DEMO_RECORDING_SEC : 0,
    incomingNumber,
    savedContactName: !isPaid ? card.name || "" : "",
    isKnownContact: !isPaid ? Boolean(card.name) : true,
    card,
    expanded,
    onExpandedChange: setExpanded,
    onEndCall: () => setExpanded(false),
    onToast
  };

  return (
    <section
      className={`mx-auto w-full max-w-md px-2.5 pb-4 pt-1 ${className}`.trim()}
      aria-label={VLUE_SHOWCASE.nameEn}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div>
          <p className="text-[12px] font-black text-slate-900">{showcasePreviewLabel()}</p>
          <p className="text-[10px] font-medium text-slate-500">{VLUE_SHOWCASE.tagline}</p>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(SHOWCASE_OPEN_SETTINGS_EVENT))}
          className="shrink-0 rounded-full bg-blue-600 px-3 py-1.5 text-[10px] font-black text-white shadow-sm active:scale-95"
        >
          스타일 설정
        </button>
      </div>

      {showTierTabs ? (
        <div className="mb-2 flex gap-1 rounded-full bg-slate-100 p-1" role="tablist" aria-label="플랜 미리보기">
          <button
            type="button"
            role="tab"
            aria-selected={!isPaid}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition ${
              !isPaid ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
            onClick={() => {
              setTier("free");
              setExpanded(false);
            }}
          >
            일상 · 무료
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isPaid}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition ${
              isPaid ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
            onClick={() => {
              setTier("paid");
              setExpanded(false);
            }}
          >
            비즈 · 유료
          </button>
        </div>
      ) : null}

      {!expanded ? (
        <LetteringIncomingNotification
          {...notificationProps}
          className="lettering-ongoing--on-call lettering-ongoing--home-preview rounded-[20px] border border-slate-100 bg-white shadow-sm"
        />
      ) : (
        <div
          className="lettering-ongoing--home-preview rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-[11px] font-semibold text-slate-400"
          aria-hidden
        >
          전체화면 쇼케이스 미리보기 중
        </div>
      )}

      {expanded && typeof document !== "undefined"
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
