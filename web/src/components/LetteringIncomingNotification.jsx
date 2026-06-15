import { useCallback, useEffect, useMemo, useState } from "react";
import { getLetteringCallStatusLabel } from "../lib/letteringCallStatus.js";
import { compareLetteringPhones, formatLetteringPhoneDisplay } from "../lib/letteringPhoneMatch.js";
import { openLetteringCertInVlueApp } from "../lib/letteringOpenVlueApp.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import { VLUE_CARD_CAUTION, VLUE_UNVERIFIED_REPORT_DISCLAIMER } from "../lib/vlueDigitalCardUi.js";
import {
  resolveFreeTierSummary,
  VLUE_FREE_TIER_CAUTION
} from "../lib/letteringFreeTierDisplay.js";
import LetteringDigitalReception from "./LetteringDigitalReception.jsx";
import LetteringUnverifiedReportPanel from "./LetteringUnverifiedReportPanel.jsx";
import { getLetteringReportsForPhone } from "../lib/letteringPhoneReports.js";
import { formatLetteringReceptionLines } from "../lib/letteringPaidIdentityDisplay.js";
import { LETTERING_DEMO_COMPANY_LOGO, resolveLetteringDemoLogoUrl } from "../lib/letteringDemoAssets.js";
import { normalizeLetteringCard } from "../lib/letteringCardNormalize.js";

const DEMO_CARD = {
  name: "\uD64D\uAE38\uB3D9",
  displayName: "\uD64D\uAE38\uB3D9",
  title: "\uB300\uB9AC",
  organization: "\uC0BC\uC131\uC0DD\uBA85",
  department: "\uBCF4\uD5D8\uC124\uACC4\uC601\uC5C5\uD300",
  phone: "010-1234-5678",
  fax: "02-123-7895",
  email: "hgildong@sam-life.co.kr",
  website: "samsunglife.com",
  logoUrl: LETTERING_DEMO_COMPANY_LOGO,
  photoUrl: "",
  image_url: "",
  companyIntro:
    "\uC0BC\uC131\uC0DD\uBA85 \uBCF4\uD5D8 \uC804\uBB38 \uC0C1\uB2F4\uC785\uB2C8\uB2E4. VLUE \uC778\uC99D \uBA85\uD568\uC73C\uB85C \uACE0\uAC1D\uB2D8\uACFC \uC548\uC804\uD558\uAC8C \uC5F0\uACB0\uB429\uB2C8\uB2E4.",
  feedId: "user-honggildong",
  feedType: "personal",
  membershipTier: "premium",
  address: "서울특별시 종로구 세종대로 67, 삼성생명빌딩",
  verificationItems: [
    "PASS \uBCF8\uC778\uC778\uC99D \uC644\uB8CC",
    "\uC720\uB8CC \uBA85\uD568 \uB4F1\uAE09 \uC778\uC99D",
    "VLUE \uBA85\uD568 \uC2B9\uC778 (2026.04)",
    "\uC0AC\uC5C5\uC790 \uC815\uBCF4 \uD655\uC778",
    "\uC804\uD654\uBC88\uD638 \uC77C\uCE58 \uD655\uC778"
  ]
};

function VlueVerifiedBadge({ className = "" }) {
  return (
    <span
      className={`lettering-vlue-verified-badge inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[10px] font-black leading-none ${className}`.trim()}
      title="VLUE \uC778\uC99D"
      aria-label="VLUE \uC778\uC99D\uB428"
    >
      {"\u2713"}
    </span>
  );
}

function LetteringProfileThumb({ card, verified, size = "sm" }) {
  const dim = size === "md" ? "h-14 w-14 rounded-[16px] text-[22px]" : "h-9 w-9 rounded-[11px] text-[14px]";
  const [imgBroken, setImgBroken] = useState(false);

  if (!verified) {
    return (
      <span
        className={`lettering-profile-thumb lettering-profile-thumb--unknown relative inline-flex shrink-0 items-center justify-center border-2 border-amber-400/80 bg-amber-50 shadow-sm ${dim}`}
        aria-hidden
      >
        <span className="lettering-profile-thumb__question font-black leading-none text-amber-800">?</span>
      </span>
    );
  }

  const photoUrl = card.photoUrl || "";
  const logoUrl = card.logoUrl || resolveLetteringDemoLogoUrl(card);
  const src = photoUrl || logoUrl;
  const isLogoOnly = !photoUrl && Boolean(logoUrl);
  const fallbackLabel = (card.organization || card.name || "?").slice(0, 1);
  const showImg = Boolean(src) && !imgBroken;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden border-2 border-[#c5d4e8] bg-white shadow-sm ${dim}`}
    >
      {showImg ? (
        <img
          src={src}
          alt=""
          className={`h-full w-full ${isLogoOnly ? "object-contain p-0.5" : "object-cover"}`}
          onError={() => setImgBroken(true)}
        />
      ) : (
        <span className="font-black text-slate-700">{fallbackLabel}</span>
      )}
    </span>
  );
}

/** ?? ? ? ??? ??? (??? ? ??) */
function LetteringLiveIndicator() {
  return (
    <span className="lettering-live-indicator" aria-hidden>
      <span className="lettering-live-indicator__bar" />
      <span className="lettering-live-indicator__bar" />
      <span className="lettering-live-indicator__bar" />
    </span>
  );
}

function LetteringExpandButton({ expanded, onClick, mode = "card" }) {
  const ariaCollapsed = mode === "report" ? "\uC2E0\uACE0\uC774\uB825 \uD3BC\uCE58\uAE30" : "\uBA85\uD568 \uD3BC\uCE58\uAE30";
  const ariaExpanded = mode === "report" ? "\uC2E0\uACE0\uC774\uB825 \uC811\uAE30" : "\uBA85\uD568 \uC811\uAE30";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`lettering-expand-btn ${expanded ? "lettering-expand-btn--expanded" : "lettering-expand-btn--collapsed"}`}
      aria-expanded={expanded}
      aria-label={expanded ? ariaExpanded : ariaCollapsed}
    >
      <span className="lettering-expand-btn__icon" aria-hidden>
        {expanded ? "\u25B2" : "\u25BC"}
      </span>
    </button>
  );
}

export default function LetteringIncomingNotification({
  verified = true,
  callPhase = "ringing",
  platform = "android",
  isRecording = false,
  callDurationSec = 0,
  recordingDurationSec = 0,
  incomingNumber = "",
  savedContactName = "",
  savedContactPhone = "",
  reportHistory = [],
  dragHandleProps = null,
  card = DEMO_CARD,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  onDetail,
  onOpenFeed,
  onSaveCard,
  onReport,
  /** @deprecated */ onMemo,
  /** @deprecated */ onBlock,
  /** @deprecated */ fitBizcard = false,
  /** 미인증 펼침 하단 신고/차단·안내 푸터 숨김(www 데모) */
  hideUnverifiedFooter = false,
  className = ""
}) {
  const [expandedInternal, setExpandedInternal] = useState(defaultExpanded);
  const [receptionFace, setReceptionFace] = useState("front");
  const expanded = expandedProp !== undefined ? expandedProp : expandedInternal;

  const setExpanded = useCallback(
    (next) => {
      if (expandedProp === undefined) setExpandedInternal(next);
      onExpandedChange?.(next);
    },
    [expandedProp, onExpandedChange]
  );

  const toggle = () => {
    setExpanded(!expanded);
    if (expanded) setReceptionFace("front");
  };
  const c = normalizeLetteringCard({ ...DEMO_CARD, ...card });
  const onCall = callPhase === "active";
  const statusLabel = getLetteringCallStatusLabel({
    callActive: onCall,
    isRecording,
    callDurationSec,
    recordingDurationSec,
    platform
  });

  const incoming = String(incomingNumber || (verified ? c.phone : "") || "").trim();
  const verificationList = useMemo(() => {
    const list = c.verificationItems.length ? c.verificationItems : DEMO_CARD.verificationItems;
    return list.slice(0, 8);
  }, [c.verificationItems]);

  const phoneMatched = useMemo(() => {
    if (!verified) return false;
    const result = compareLetteringPhones(incoming, c.phone);
    return result?.status === "match";
  }, [verified, incoming, c.phone]);

  const handleSaveCard = () => {
    if (onSaveCard) {
      onSaveCard({ card: c, incomingNumber: incoming });
      return;
    }
    onMemo?.();
  };

  const handleReport = () => {
    if (onReport) {
      onReport({ card: c, incomingNumber: incoming, verified });
      return;
    }
    onBlock?.();
  };

  const shellBase =
    "lettering-ongoing lettering-incoming-active relative flex w-full flex-col overflow-hidden";
  const isPaidMember = verified && isPaidLetteringTier(c.membershipTier);
  const isFreeMember = verified && !isPaidMember;
  const isUnverified = !verified;
  const canExpand = isPaidMember || isUnverified;
  const [reportTick, setReportTick] = useState(0);
  const [walletTick, setWalletTick] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onReportsChanged = () => setReportTick((n) => n + 1);
    const onWalletChanged = () => setWalletTick((n) => n + 1);
    window.addEventListener("vlue-lettering-reports-changed", onReportsChanged);
    window.addEventListener("vlue-card-wallet-changed", onWalletChanged);
    return () => {
      window.removeEventListener("vlue-lettering-reports-changed", onReportsChanged);
      window.removeEventListener("vlue-card-wallet-changed", onWalletChanged);
    };
  }, []);

  const phoneReports = useMemo(() => {
    if (!isUnverified) return [];
    return getLetteringReportsForPhone(incoming, { extra: reportHistory });
  }, [isUnverified, incoming, reportHistory, reportTick]);

  const isExpandedView = expanded && canExpand;

  const shellTone = !verified
    ? "lettering-ongoing--unverified"
    : isPaidMember
      ? "lettering-ongoing--verified lettering-ongoing--paid"
      : "lettering-ongoing--verified lettering-ongoing--free-tier";
  const platformClass = platform === "ios" ? "lettering-ongoing--ios" : "lettering-ongoing--android";
  const heightClass = isExpandedView
    ? "lettering-ongoing--expanded lettering-ongoing--expanded-layer"
    : "lettering-ongoing--collapsed";

  const freeTierSummary = useMemo(() => {
    if (!isFreeMember) return null;
    return resolveFreeTierSummary({
      incomingNumber: incoming,
      cardPhone: c.phone,
      savedContactName,
      savedContactPhone
    });
  }, [isFreeMember, incoming, c.phone, savedContactName, savedContactPhone, walletTick]);

  const unverifiedCollapsedPhone = useMemo(() => {
    if (!isUnverified) return "";
    const phoneDisplay = formatLetteringPhoneDisplay(incoming);
    return phoneDisplay && phoneDisplay !== "\u2014" ? phoneDisplay : "";
  }, [isUnverified, incoming]);

  const receptionLines = isPaidMember
    ? formatLetteringReceptionLines(c, { incomingNumber: incoming })
    : null;
  const displayLabel = isUnverified || isFreeMember ? null : receptionLines?.collapsedPrimary || c.name;
  const collapsedPhoneDisplay = receptionLines?.phone
    ? formatLetteringPhoneDisplay(receptionLines.phone)
    : "";

  const handleOpenFeed = () => {
    const payload = {
      feedId: c.feedId,
      feedType: c.feedType,
      card: c,
      verificationItems: verificationList,
      phoneMatched,
      incomingNumber: incoming
    };
    const result = openLetteringCertInVlueApp(payload);
    onOpenFeed?.({ ...payload, result });
    onDetail?.({ ...payload, result });
  };

  return (
    <article
      className={`${shellBase} ${shellTone} ${platformClass} ${heightClass} ${className}`.trim()}
      data-platform={platform}
      data-expanded={isExpandedView ? "true" : "false"}
      data-tier={isPaidMember ? "paid" : isFreeMember ? "free" : isUnverified ? "unverified" : "none"}
      aria-live="polite"
    >
      <div
        className={`lettering-live-bar ${dragHandleProps ? "lettering-live-bar--draggable" : ""}`}
        {...(dragHandleProps || {})}
      >
        <div className="lettering-live-bar__left">
          <LetteringLiveIndicator />
          <span className="lettering-live-bar__brand">VLUE {"\uC791\uB3D9\uC911"}</span>
        </div>
        {statusLabel ? (
          <span className="lettering-live-bar__status">{statusLabel}</span>
        ) : (
          <span className="lettering-live-bar__status lettering-live-bar__status--empty" aria-hidden />
        )}
      </div>

      <div className="lettering-ongoing-body relative flex min-h-0 flex-col">
        <div
          className={`lettering-ongoing-summary relative z-[2] flex gap-2.5 px-3 py-2.5 ${
            isExpandedView ? "items-center" : "items-start"
          } ${isFreeMember ? "lettering-ongoing-summary--free" : ""} ${
            isUnverified ? "lettering-ongoing-summary--unverified" : ""
          } ${!isExpandedView && isPaidMember ? "pb-3" : ""}`}
        >
          {isPaidMember || isUnverified ? (
            <LetteringProfileThumb card={c} verified={verified} size="sm" />
          ) : null}
          <div className="min-w-0 flex-1">
            {isFreeMember && freeTierSummary ? (
              <div className="lettering-free-tier-block">
                <p className="lettering-free-tier-row lettering-ongoing-name-row">
                  {freeTierSummary.mode === "saved" ? (
                    <>
                      <span className="lettering-free-tier-name">{freeTierSummary.primary}</span>
                      <VlueVerifiedBadge className="lettering-free-tier-badge" />
                      <span className="lettering-free-tier-phone">{freeTierSummary.phoneDisplay}</span>
                    </>
                  ) : (
                    <>
                      <span className="lettering-free-tier-phone-only">{freeTierSummary.primary}</span>
                      <VlueVerifiedBadge className="lettering-free-tier-badge" />
                    </>
                  )}
                </p>
                <p className="lettering-ongoing-free-caution" role="note">
                  {VLUE_FREE_TIER_CAUTION}
                </p>
              </div>
            ) : isUnverified ? (
              <p className="lettering-ongoing-name-row min-w-0">
                <span className="lettering-unverified-collapsed-phone">
                  {unverifiedCollapsedPhone || "\u2014"}
                </span>
              </p>
            ) : (
              <>
                <p className="lettering-ongoing-name-row flex min-w-0 items-center gap-1.5">
                  <span className="lettering-ongoing-name min-w-0 truncate text-[15px] font-semibold leading-snug">
                    {displayLabel}
                  </span>
                  {verified ? <VlueVerifiedBadge /> : null}
                </p>
                {receptionLines && collapsedPhoneDisplay ? (
                  <p className="lettering-ongoing-subline mt-0.5 min-w-0 truncate text-[11px] leading-snug">
                    {receptionLines.organization ? (
                      <>
                        <span className="font-medium text-slate-600">{receptionLines.organization}</span>
                        <span className="text-slate-400"> / </span>
                      </>
                    ) : null}
                    <span className="lettering-ongoing-phone-em font-bold text-blue-700">
                      {collapsedPhoneDisplay}
                    </span>
                  </p>
                ) : null}
              </>
            )}
            {isPaidMember && !collapsedPhoneDisplay && receptionLines?.expandedContactLine ? (
              <p className="lettering-ongoing-subtitle mt-0.5 truncate text-[11px] font-medium leading-snug text-slate-500">
                {receptionLines.expandedContactLine}
              </p>
            ) : null}
            {isUnverified && phoneReports.length ? (
              <p className="lettering-ongoing-unverified-hint mt-0.5 text-[10px] font-bold text-amber-800">
                {`\uC2E0\uACE0\u00B7\uC81C\uBCF4 ${phoneReports.length}\uAC74 \u00B7 \u25BC \uD655\uC778`}
              </p>
            ) : null}
            {isUnverified && !phoneReports.length ? (
              <p className="lettering-ongoing-unverified-hint mt-0.5 text-[10px] font-semibold text-amber-700/90">
                {"\u25BC \uC2E0\uACE0\u00B7\uC81C\uBCF4 \uC774\uB825 \uD655\uC778"}
              </p>
            ) : null}
          </div>
          {canExpand ? (
            <LetteringExpandButton
              expanded={expanded}
              onClick={toggle}
              mode={isUnverified ? "report" : "card"}
            />
          ) : null}
        </div>

        {canExpand && isPaidMember ? (
          <div
            className="lettering-ongoing-expand-slot lettering-ongoing-expand-slot--reception"
            data-open={isExpandedView ? "true" : "false"}
            aria-hidden={!isExpandedView}
          >
            <div className="lettering-ongoing-expand-slot__inner">
              <div className="lettering-ongoing-reception relative z-[2] flex min-h-0 flex-1 flex-col">
                <div className="lettering-ongoing-scroll lettering-ongoing-scroll--reception flex-1 min-h-0">
                  <LetteringDigitalReception
                    card={c}
                    verified={verified}
                    verificationItems={verificationList}
                    incomingNumber={incoming}
                    embeddedInPush
                    face={receptionFace}
                    onFaceChange={setReceptionFace}
                  />
                </div>
                <div className="lettering-ongoing-actions-secondary lettering-ongoing-actions-secondary--reception relative z-[2] grid shrink-0 grid-cols-3 gap-1.5 px-3 py-2">
                  <p className="lettering-caution lettering-caution--reception-footer col-span-3">
                    {VLUE_CARD_CAUTION}
                  </p>
                  <button type="button" onClick={handleOpenFeed} className="lettering-action lettering-action--primary">
                    {"\uC778\uC99D\uC815\uBCF4"}
                  </button>
                  <button type="button" onClick={handleSaveCard} className="lettering-action lettering-action--ghost">
                    {"\uBA85\uD568\uC800\uC7A5"}
                  </button>
                  <button type="button" onClick={handleReport} className="lettering-action lettering-action--danger">
                    {"\uC2E0\uACE0/\uCC28\uB2E8"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {canExpand && isUnverified ? (
          <div
            className="lettering-ongoing-expand-slot lettering-ongoing-expand-slot--unverified"
            data-open={isExpandedView ? "true" : "false"}
            aria-hidden={!isExpandedView}
          >
            <div className="lettering-ongoing-expand-slot__inner">
              <div className="lettering-unverified-expanded relative z-[2]">
                <div className="lettering-unverified-expanded__scroll lettering-ongoing-scroll--unverified">
                  <LetteringUnverifiedReportPanel incomingNumber={incoming} reportHistory={reportHistory} />
                </div>
                {hideUnverifiedFooter ? null : (
                  <footer className="lettering-unverified-expanded__footer">
                    <p className="lettering-unverified-footer-note">{VLUE_UNVERIFIED_REPORT_DISCLAIMER}</p>
                    <button type="button" onClick={handleReport} className="lettering-action lettering-action--danger w-full">
                      {"\uC2E0\uACE0/\uCC28\uB2E8"}
                    </button>
                  </footer>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
