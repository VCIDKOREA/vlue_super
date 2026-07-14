import { useEffect, useMemo, useState } from "react";
import { LETTERING_BIZCARD_CHANGED_EVENT } from "../lib/letteringBizcardStorage.js";
import { fetchDigitalCardMeta } from "../lib/digitalCardApi.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import { resolveVlueShowcaseCard } from "../lib/vlueShowcaseCard.js";
import { applyShowcaseStyleToCard } from "../lib/showcase/applyShowcaseStyleToCard.js";
import { showcasePreviewLabel, VLUE_SHOWCASE } from "../lib/vlueBrandSpaces.js";
import { SHOWCASE_OPEN_SETTINGS_EVENT, SHOWCASE_STYLE_CHANGED_EVENT } from "../lib/showcase/showcaseStyleStorage.js";
import LetteringBizcardSharePanel from "./LetteringBizcardSharePanel.jsx";

/**
 * 프로필 사이드바 — 디지털 인증명함 신청 / 승인 후 레터링 명함 미리보기
 */
export default function MyPageDigitalLetteringSection({
  membershipTier = "free",
  digitalCardActive = false,
  digitalCardIssued = true,
  isVCIDOn = false,
  isDarkMode = false,
  onApplyDigitalCard,
  onEditLettering,
  onOpenShowcaseStyle,
  onToast
}) {
  const [previewTick, setPreviewTick] = useState(0);
  const [cardIssuedAt, setCardIssuedAt] = useState(null);

  const openSettings = () => {
    if (onOpenShowcaseStyle) {
      onOpenShowcaseStyle();
      return;
    }
    window.dispatchEvent(new Event(SHOWCASE_OPEN_SETTINGS_EVENT));
  };

  const isApproved = Boolean(digitalCardActive) && digitalCardIssued !== false;

  const previewCard = useMemo(() => {
    const base = resolveVlueShowcaseCard({ membershipTier, previewExample: true });
    const tier = isPaidLetteringTier(membershipTier) ? membershipTier : "free";
    return applyShowcaseStyleToCard({ ...base, membershipTier: tier, issuedAt: cardIssuedAt }, tier);
  }, [membershipTier, previewTick, cardIssuedAt]);

  useEffect(() => {
    const bump = () => setPreviewTick((n) => n + 1);
    window.addEventListener(LETTERING_BIZCARD_CHANGED_EVENT, bump);
    window.addEventListener(SHOWCASE_STYLE_CHANGED_EVENT, bump);
    return () => {
      window.removeEventListener(LETTERING_BIZCARD_CHANGED_EVENT, bump);
      window.removeEventListener(SHOWCASE_STYLE_CHANGED_EVENT, bump);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchDigitalCardMeta().then((meta) => {
      if (cancelled) return;
      setCardIssuedAt(meta.issuedAt || null);
    });
    return () => {
      cancelled = true;
    };
  }, [previewTick]);

  if (!isApproved) {
    return (
      <div
        className={`relative w-full overflow-hidden rounded-[26px] p-4 text-center ring-1 ring-inset ${
          isDarkMode ? "bg-white/[0.03] ring-white/15" : "bg-slate-50/80 ring-slate-300"
        }`}
      >
        <button
          type="button"
          onClick={() => onApplyDigitalCard?.()}
          className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 text-[14px] font-black text-white shadow-lg shadow-blue-500/25 active:scale-[0.99] dark:shadow-blue-900/50"
        >
          디지털인증명함 신청
        </button>
        <p className={`mt-2 text-[10px] font-medium leading-relaxed ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
          신청·승인 후 블루 케이스 미리보기와 통화 중 노출이 활성화됩니다.
        </p>
      </div>
    );
  }

  const statusTone = isVCIDOn
    ? isDarkMode
      ? "text-blue-300"
      : "text-blue-600"
    : isDarkMode
      ? "text-red-400"
      : "text-red-600";

  return (
    <section className="w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={openSettings}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openSettings();
          }
        }}
        className={`relative mb-3 flex w-full cursor-pointer flex-col gap-3 rounded-[26px] border-2 p-4 text-left shadow-sm transition-all active:scale-[0.98] ${
          isDarkMode
            ? "border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-indigo-500/10"
            : "border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-[15px] font-black leading-tight ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
              {showcasePreviewLabel()}
            </p>
            <p className={`mt-1 text-[11px] font-semibold leading-relaxed ${isDarkMode ? "text-gray-400" : "text-slate-600"}`}>
              스타일 설정을 누르면 전체 화면에서 꾸밀 수 있습니다
            </p>
          </div>
          <span className={`shrink-0 text-lg ${isDarkMode ? "text-gray-400" : "text-slate-400"}`} aria-hidden>
            ›
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openSettings();
            }}
            className={`rounded-full px-3 py-1.5 text-[11px] font-black ${
              isDarkMode ? "bg-blue-500/20 text-blue-200" : "bg-white text-blue-700 ring-1 ring-blue-100"
            }`}
          >
            스타일 설정
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditLettering?.();
            }}
            className={`rounded-full px-3 py-1.5 text-[11px] font-black ${
              isDarkMode ? "bg-white/10 text-cyan-200" : "bg-white text-cyan-800 ring-1 ring-cyan-100"
            }`}
          >
            명함 수정
          </button>
        </div>
        <p className={`text-[10px] font-bold ${statusTone}`}>
          {isVCIDOn
            ? `현재 ${VLUE_SHOWCASE.nameKo}가 송출중입니다.`
            : `현재 ${VLUE_SHOWCASE.nameKo}가 꺼짐 상태입니다.`}
        </p>
      </div>

      <LetteringBizcardSharePanel
        card={previewCard}
        isDarkMode={isDarkMode}
        embedded
        onToast={onToast}
      />
    </section>
  );
}
