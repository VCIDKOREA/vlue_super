import { useState } from "react";
import LetteringIncomingNotification from "./LetteringIncomingNotification.jsx";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import {
  resolveVlueShowcaseCard,
  VLUE_SHOWCASE_DEMO_RECORDING_SEC
} from "../lib/vlueShowcaseCard.js";
import { applyShowcaseStyleToCard } from "../lib/showcase/applyShowcaseStyleToCard.js";
import { showcasePreviewLabel, VLUE_SHOWCASE } from "../lib/vlueBrandSpaces.js";
import { v1AppShell } from "../lib/v1ReleaseScope.js";

/**
 * VLUE Showcase — 홈 메인 통화 빅푸시 미리보기
 * 프로필(VLUE Case) 사이드바 미리보기와 동일 카드 데이터
 */
export default function CallBigPushPreviewSection({ membershipTier = "free", className = "" }) {
  const showTierTabs = v1AppShell.callBigPushTierTabs;
  const [tier, setTier] = useState(showTierTabs ? "free" : "free");
  const [expanded, setExpanded] = useState(false);

  const effectiveTier = showTierTabs && tier === "paid" ? "premium" : membershipTier;
  const card = applyShowcaseStyleToCard(resolveVlueShowcaseCard({ membershipTier: effectiveTier }), effectiveTier);
  const isPaid = isPaidLetteringTier(effectiveTier);
  const incomingNumber = card.phone || "";

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

      <LetteringIncomingNotification
        verified
        previewMode
        callPhase={isPaid ? "active" : "ringing"}
        platform="android"
        isRecording={isPaid}
        callDurationSec={isPaid ? VLUE_SHOWCASE_DEMO_RECORDING_SEC : 0}
        recordingDurationSec={isPaid ? VLUE_SHOWCASE_DEMO_RECORDING_SEC : 0}
        incomingNumber={incomingNumber}
        savedContactName={!isPaid ? card.name || "" : ""}
        card={card}
        expanded={expanded}
        onExpandedChange={setExpanded}
        className="lettering-ongoing--on-call lettering-ongoing--home-preview rounded-[20px] border border-slate-100 bg-white shadow-sm"
      />
    </section>
  );
}
