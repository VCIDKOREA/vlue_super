import { useEffect, useMemo, useState } from "react";
import { LETTERING_BIZCARD_CHANGED_EVENT, readLetteringBizcardEditable } from "../lib/letteringBizcardStorage.js";
import { buildUserLetteringCard, withLetteringBizcardPreviewFallback } from "../lib/letteringBizcardProfile.js";
import { fetchDigitalCardMeta } from "../lib/digitalCardApi.js";
import LetteringBusinessCardWithMembership from "./LetteringBusinessCardWithMembership.jsx";
import LetteringBizcardSecureFrame from "./LetteringBizcardSecureFrame.jsx";
import LetteringBizcardScaledPreview from "./LetteringBizcardScaledPreview.jsx";
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
  onToast
}) {
  const [previewTick, setPreviewTick] = useState(0);
  const [cardId, setCardId] = useState("");
  const [cardIssuedAt, setCardIssuedAt] = useState(null);

  const isApproved = Boolean(digitalCardActive) && digitalCardIssued !== false;

  const designTemplate = useMemo(() => readLetteringBizcardEditable().designTemplate, [previewTick]);

  const previewCard = useMemo(() => {
    const base = withLetteringBizcardPreviewFallback(buildUserLetteringCard({ membershipTier }));
    return { ...base, issuedAt: cardIssuedAt };
  }, [membershipTier, previewTick, cardIssuedAt]);

  useEffect(() => {
    const bump = () => setPreviewTick((n) => n + 1);
    window.addEventListener(LETTERING_BIZCARD_CHANGED_EVENT, bump);
    return () => window.removeEventListener(LETTERING_BIZCARD_CHANGED_EVENT, bump);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchDigitalCardMeta().then((meta) => {
      if (cancelled) return;
      if (meta.cardId) setCardId(meta.cardId);
      setCardIssuedAt(meta.issuedAt || null);
    });
    return () => {
      cancelled = true;
    };
  }, [previewTick]);

  if (!isApproved) {
    return (
      <div
        className={`relative w-full overflow-hidden rounded-xl border border-dashed p-4 text-center ${
          isDarkMode ? "border-white/15 bg-white/[0.03]" : "border-slate-300 bg-slate-50/80"
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
          신청·승인 후 레터링 명함 미리보기와 통화 중 노출이 활성화됩니다.
        </p>
      </div>
    );
  }

  return (
    <section className="w-full">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className={`text-[12px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
          디지털인증명함 미리보기
        </p>
        <button
          type="button"
          onClick={() => onEditLettering?.()}
          className={`rounded-md px-2 py-0.5 text-[11px] font-bold active:scale-[0.99] ${
            isDarkMode ? "bg-white/10 text-cyan-200" : "bg-slate-100 text-cyan-800"
          }`}
        >
          수정
        </button>
      </div>
      <p
        className={`mb-1 text-[10px] font-semibold leading-relaxed ${
          isVCIDOn
            ? isDarkMode
              ? "text-blue-400"
              : "text-blue-600"
            : isDarkMode
              ? "text-red-400"
              : "text-red-600"
        }`}
      >
        {isVCIDOn ? "현재 디지털인증명함이 송출중입니다." : "현재 디지털인증명함이 꺼짐 상태입니다."}
      </p>
      <LetteringBizcardScaledPreview isDarkMode={isDarkMode}>
        <LetteringBizcardSecureFrame designTemplate={designTemplate} card={previewCard} cardId={cardId}>
          <LetteringBusinessCardWithMembership card={previewCard} />
        </LetteringBizcardSecureFrame>
      </LetteringBizcardScaledPreview>
      <LetteringBizcardSharePanel
        card={previewCard}
        isDarkMode={isDarkMode}
        embedded
        onToast={onToast}
      />
    </section>
  );
}
