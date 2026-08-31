import { useEffect, useMemo, useState } from "react";
import { ChevronRight, CreditCard, Palette } from "lucide-react";
import { LETTERING_BIZCARD_CHANGED_EVENT } from "../lib/letteringBizcardStorage.js";
import { fetchDigitalCardMeta } from "../lib/digitalCardApi.js";
import { canUseV1PaidDccFeatures, requestV1PaidPackageGate } from "../lib/v1PaidPackageGate.js";
import { readEffectiveMembershipTier } from "../lib/effectiveMembership.js";
import { resolveVlueShowcaseCard } from "../lib/vlueShowcaseCard.js";
import { applyShowcaseStyleToCard } from "../lib/showcase/applyShowcaseStyleToCard.js";
import { showcasePreviewLabel, VLUE_SHOWCASE } from "../lib/vlueBrandSpaces.js";
import { SHOWCASE_OPEN_SETTINGS_EVENT, SHOWCASE_STYLE_CHANGED_EVENT } from "../lib/showcase/showcaseStyleStorage.js";
import LetteringBizcardSharePanel from "./LetteringBizcardSharePanel.jsx";

/**
 * 프로필 사이드바 — DCC(유료) · 블루 쇼케이스(무료 1페이지 포함) · 공유
 */
export default function MyPageDigitalLetteringSection({
  membershipTier = "free",
  digitalCardActive = false,
  digitalCardIssued = true,
  isVCIDOn = false,
  isDarkMode = false,
  dccBlocked = false,
  dccBlockMessage = "",
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

  const canUseDcc = canUseV1PaidDccFeatures(membershipTier);
  const effectiveTier = readEffectiveMembershipTier();
  const hasDigitalCertCard =
    canUseDcc && Boolean(digitalCardActive) && digitalCardIssued !== false;
  const tier = canUseDcc ? effectiveTier : membershipTier || "free";

  const previewCard = useMemo(() => {
    const base = resolveVlueShowcaseCard({ membershipTier: tier, previewExample: true });
    return applyShowcaseStyleToCard({ ...base, membershipTier: tier, issuedAt: cardIssuedAt }, tier);
  }, [membershipTier, tier, previewTick, cardIssuedAt]);

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
    fetchDigitalCardMeta({ lite: true }).then((meta) => {
      if (cancelled) return;
      setCardIssuedAt(meta.issuedAt || null);
    });
    return () => {
      cancelled = true;
    };
  }, [previewTick]);

  const dccBlock = dccBlocked ? (
    <div className="mypage-showcase-card mypage-showcase-card--apply mb-3" data-theme={isDarkMode ? "dark" : "light"}>
      <p className="mypage-showcase-card__apply-copy">
        {dccBlockMessage ||
          "디지털인증명함(DCC)은 이 계정에서 이용할 수 없습니다. 쇼케이스는 계속 이용할 수 있습니다."}
      </p>
      <button
        type="button"
        className="mypage-showcase-card__apply-btn"
        disabled
        aria-disabled="true"
        style={{ opacity: 0.55, cursor: "not-allowed" }}
      >
        디지털인증명함 비활성
      </button>
    </div>
  ) : !canUseDcc ? (
    <div className="mypage-showcase-card mypage-showcase-card--apply mb-3" data-theme={isDarkMode ? "dark" : "light"}>
      <p className="mypage-showcase-card__apply-copy">
        디지털인증명함(DCC)은 V1 유료 패키지 기능입니다. 버튼을 누르면 구독플랜으로 이동할 수 있습니다.
      </p>
      <button
        type="button"
        className="mypage-showcase-card__apply-btn"
        onClick={() => requestV1PaidPackageGate()}
      >
        디지털인증명함 설정
      </button>
    </div>
  ) : !hasDigitalCertCard ? (
    <div className="mypage-showcase-card mypage-showcase-card--apply mb-3" data-theme={isDarkMode ? "dark" : "light"}>
      <p className="mypage-showcase-card__apply-copy">
        유료 회원은 명함이 쇼케이스에 함께 표시됩니다. 무료 회원도 이름·VLUE ID·전화번호로 공유할 수 있습니다.
      </p>
      <button type="button" className="mypage-showcase-card__apply-btn" onClick={() => onApplyDigitalCard?.()}>
        디지털인증명함 신청
      </button>
    </div>
  ) : null;

  return (
    <section className="w-full">
      {dccBlock}

      <div
        role="button"
        tabIndex={0}
        className="mypage-showcase-card mb-3"
        data-theme={isDarkMode ? "dark" : "light"}
        onClick={openSettings}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openSettings();
          }
        }}
      >
        <div className="mypage-showcase-card__head">
          <div className="mypage-showcase-card__icon" aria-hidden>
            <span className="mypage-showcase-card__icon-glow" />
            <span className="mypage-showcase-card__icon-core">V</span>
          </div>
          <div className="mypage-showcase-card__copy">
            <p className="mypage-showcase-card__eyebrow">VLUE Showcase</p>
            <p className="mypage-showcase-card__title">{showcasePreviewLabel()}</p>
            <p className="mypage-showcase-card__desc">
              {canUseDcc
                ? "전체 화면에서 스타일을 꾸미고 미리볼 수 있습니다"
                : "무료 회원은 쇼케이스 1페이지 · BGM 1곡 · 케이스함을 이용할 수 있습니다"}
            </p>
          </div>
          <ChevronRight className="mypage-showcase-card__chev" size={18} strokeWidth={2} aria-hidden />
        </div>

        <div className="mypage-showcase-card__actions">
          <button
            type="button"
            className="mypage-showcase-card__action"
            onClick={(e) => {
              e.stopPropagation();
              openSettings();
            }}
          >
            <Palette size={14} strokeWidth={2} aria-hidden />
            쇼케이스 설정
          </button>
          {hasDigitalCertCard ? (
            <button
              type="button"
              className="mypage-showcase-card__action"
              onClick={(e) => {
                e.stopPropagation();
                onEditLettering?.();
              }}
            >
              <CreditCard size={14} strokeWidth={2} aria-hidden />
              명함 수정
            </button>
          ) : null}
        </div>

        <div className="mypage-showcase-card__foot">
          <span className={`mypage-showcase-card__status${isVCIDOn ? " is-live" : ""}`}>
            <span className="mypage-showcase-card__status-dot" aria-hidden />
            {isVCIDOn ? `${VLUE_SHOWCASE.nameKo} 송출 중` : `${VLUE_SHOWCASE.nameKo} 꺼짐`}
          </span>
        </div>
      </div>

      <LetteringBizcardSharePanel
        card={previewCard}
        membershipTier={tier}
        isDarkMode={isDarkMode}
        embedded
        onToast={onToast}
      />
    </section>
  );
}
