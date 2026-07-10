import { useCallback, useEffect, useMemo, useState } from "react";
import { getLetteringCallStatusLabel } from "../lib/letteringCallStatus.js";
import { compareLetteringPhones, formatLetteringPhoneDisplay } from "../lib/letteringPhoneMatch.js";
import { openLetteringCertInVlueApp } from "../lib/letteringOpenVlueApp.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import { VLUE_CARD_CAUTION, VLUE_UNVERIFIED_REPORT_DISCLAIMER } from "../lib/vlueDigitalCardUi.js";
import {
  resolveFreeTierSummary
} from "../lib/letteringFreeTierDisplay.js";
import LetteringDigitalReception from "./LetteringDigitalReception.jsx";
import LetteringUnverifiedReportPanel from "./LetteringUnverifiedReportPanel.jsx";
import ShowcaseCallCarousel from "./showcase/ShowcaseCallCarousel.jsx";
import FreeTierCallShowcase from "./showcase/FreeTierCallShowcase.jsx";
import { getLetteringReportsForPhone } from "../lib/letteringPhoneReports.js";
import { formatLetteringReceptionLines } from "../lib/letteringPaidIdentityDisplay.js";
import { LETTERING_DEMO_COMPANY_LOGO, resolveLetteringDemoLogoUrl } from "../lib/letteringDemoAssets.js";
import { normalizeLetteringCard } from "../lib/letteringCardNormalize.js";
import { nativeEndCall } from "../lib/call/nativeCallControl.js";
import { resolveIsKnownContact } from "../lib/contacts/hybridKnownContact.js";
import { PhoneOff, ShieldCheck } from "lucide-react";
import "../styles/showcase-call-glass.css";

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

/** 무료 플랜 — 인스타 감성 단일 게시물 데모 */
export const LETTERING_EMOTIONAL_DEMO_CARD = {
  name: "\uD64D\uAE38\uB3D9",
  displayName: "\uD64D\uAE38\uB3D9",
  phone: "010-1234-5678",
  photoUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80",
  companyIntro: "\uBAA8\uB974\uB294 \uBC88\uD638\uC5D0 \uC18D\uC9C0 \uB9C8\uB77C \u2014 \uC544\uB294 \uBC88\uD638\uB77C\uB3C4 \uD655\uC778\uD558\uB77C \uD83D\uDC99",
  website: "https://www.vlue.kr",
  membershipTier: "free",
  feedId: "user-honggildong-free",
  feedType: "personal",
  verificationItems: ["PASS \uBCF8\uC778\uC778\uC99D \uC644\uB8CC"]
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
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-[#c5d4e8] bg-white shadow-sm ${dim}`}
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
  /** 홈·친구 쇼케이스 미리보기 — 통화 수신 UI가 아닌 쇼케이스 열람 */
  previewMode = false,
  /** 통화 종료 (연결 중·미리보기 전체화면) */
  onEndCall,
  /** 주소록 판별 — 미지정 시 하이브리드 해석 */
  isKnownContact: isKnownContactProp,
  /** 미리보기·액션 안내 토스트 */
  onToast,
  className = ""
}) {
  const [expandedInternal, setExpandedInternal] = useState(defaultExpanded);
  const [receptionFace, setReceptionFace] = useState("front");
  const [guideToast, setGuideToast] = useState("");
  const [knownContact, setKnownContact] = useState(() => ({
    isKnownContact: Boolean(savedContactName),
    matchedName: savedContactName || "",
    sources: savedContactName ? ["prop"] : []
  }));
  const expanded = expandedProp !== undefined ? expandedProp : expandedInternal;

  const showGuide = useCallback(
    (message) => {
      const msg = String(message || "").trim();
      if (!msg) return;
      onToast?.(msg);
      setGuideToast(msg);
    },
    [onToast]
  );

  useEffect(() => {
    if (!guideToast) return undefined;
    const t = setTimeout(() => setGuideToast(""), 2800);
    return () => clearTimeout(t);
  }, [guideToast]);

  const setExpanded = useCallback(
    (next) => {
      if (expandedProp === undefined) setExpandedInternal(next);
      onExpandedChange?.(next);
    },
    [expandedProp, onExpandedChange]
  );

  const toggle = () => {
    if (previewMode) {
      showGuide(
        expanded
          ? "미리보기입니다. 실제 통화 화면에서 명함을 접을 수 있습니다."
          : "미리보기입니다. 실제 통화 화면에서 명함을 펼칠 수 있습니다."
      );
    }
    setExpanded(!expanded);
    if (expanded) setReceptionFace("front");
  };
  const c = normalizeLetteringCard({ ...DEMO_CARD, ...card });
  const onCall = callPhase === "active" || callPhase === "connected";
  const statusLabel = getLetteringCallStatusLabel({
    callActive: onCall,
    isRecording,
    callDurationSec,
    recordingDurationSec,
    platform
  });

  const incoming = String(incomingNumber || (verified ? c.phone : "") || "").trim();

  useEffect(() => {
    if (typeof isKnownContactProp === "boolean") {
      setKnownContact({
        isKnownContact: isKnownContactProp,
        matchedName: savedContactName || "",
        sources: ["prop"]
      });
      return undefined;
    }
    let cancelled = false;
    resolveIsKnownContact(incoming).then((r) => {
      if (cancelled) return;
      if (savedContactName && !r.isKnownContact) {
        setKnownContact({
          isKnownContact: true,
          matchedName: savedContactName,
          sources: ["savedContactName"]
        });
        return;
      }
      setKnownContact(r);
    });
    return () => {
      cancelled = true;
    };
  }, [incoming, isKnownContactProp, savedContactName]);

  const isKnownContact =
    typeof isKnownContactProp === "boolean"
      ? isKnownContactProp
      : Boolean(knownContact.isKnownContact || savedContactName);

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
    if (previewMode) {
      showGuide("미리보기입니다. 실제 통화 중에는 디지털 명함을 저장할 수 있습니다.");
      return;
    }
    if (onSaveCard) {
      onSaveCard({ card: c, incomingNumber: incoming });
      return;
    }
    onMemo?.();
  };

  const handleReport = () => {
    if (previewMode) {
      showGuide("미리보기입니다. 실제 통화에서 신고·차단할 수 있습니다.");
      return;
    }
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
  const canExpand = isPaidMember || isFreeMember || isUnverified;
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
    ? previewMode
      ? "lettering-ongoing--expanded lettering-ongoing--showcase-preview"
      : "lettering-ongoing--expanded lettering-ongoing--expanded-layer"
    : "lettering-ongoing--collapsed";
  const shellPreviewClass = previewMode ? "lettering-ongoing--showcase-preview" : "";

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

  const incomingStatusShort = previewMode
    ? [c.organization, c.title].filter(Boolean).join(" · ") || "블루 쇼케이스"
    : onCall
      ? isRecording
        ? statusLabel || "통화 중"
        : "통화 중"
      : "수신 중…";

  const previewStatusLabel = previewMode
    ? isPaidMember && onCall && statusLabel
      ? statusLabel
      : isPaidMember
        ? "미리보기"
        : ""
    : statusLabel;

  const handleOpenFeed = () => {
    if (previewMode) {
      showGuide("미리보기입니다. 실제 통화 중에는 VLUE 인증정보를 확인할 수 있습니다.");
      return;
    }
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

  const handleEndCall = () => {
    if (previewMode) {
      showGuide("미리보기를 종료합니다.");
      window.setTimeout(() => {
        if (onEndCall) onEndCall();
        else nativeEndCall();
        if (isExpandedView) setExpanded(false);
      }, 700);
      return;
    }
    if (onEndCall) {
      onEndCall();
    } else {
      nativeEndCall();
    }
  };

  const handleFaceChange = (nextFace) => {
    if (previewMode) {
      showGuide(
        nextFace === "back"
          ? "뒷면 · 연락 미리보기입니다."
          : "앞면 · 프로필 미리보기입니다."
      );
    }
    setReceptionFace(nextFace);
  };

  /** 통화 중·쇼케이스 미리보기: 하단을 통화 종료 중심으로 */
  const showCallEndBar = previewMode || onCall || Boolean(onEndCall);
  const isGlassTent = /\blettering-ongoing--fullscreen-tent\b/.test(String(className || ""));
  const carouselScrollEnabled = isPaidMember && (previewMode || onCall);
  const showcasePhotos = c.showcaseStyle?.gallery?.photos || [];

  const renderExpandedFooter = () => (
    <div
      className={`lettering-ongoing-actions-secondary relative z-[2] shrink-0 ${
        showCallEndBar
          ? `lettering-ongoing-actions-secondary--call${isGlassTent ? " lettering-ongoing-actions-secondary--glass" : ""}`
          : "lettering-ongoing-actions-secondary--reception grid grid-cols-3 gap-1.5 px-3 py-2"
      }`}
    >
      {showCallEndBar ? (
        <>
          {isPaidMember ? (
            <div
              className={`lettering-ongoing-actions-secondary__row lettering-ongoing-actions-secondary__row--save-end${
                isGlassTent ? " lettering-ongoing-actions-secondary__row--glass" : ""
              }`}
            >
              <button
                type="button"
                onClick={handleSaveCard}
                className={`lettering-action lettering-action--save-inline ${
                  isGlassTent ? "lettering-action--glass" : "lettering-action--primary"
                }`}
              >
                명함저장
              </button>
              <button
                type="button"
                onClick={handleEndCall}
                className="lettering-action lettering-action--end-call-circle"
                aria-label="통화 종료"
              >
                <PhoneOff size={22} strokeWidth={2.2} aria-hidden />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleEndCall}
              className="lettering-action lettering-action--end-call-circle"
              aria-label="통화 종료"
            >
              <PhoneOff size={24} strokeWidth={2.2} aria-hidden />
            </button>
          )}
        </>
      ) : (
        <>
          <p className="lettering-caution lettering-caution--reception-footer col-span-3">{VLUE_CARD_CAUTION}</p>
          <button type="button" onClick={handleOpenFeed} className="lettering-action lettering-action--primary">
            인증정보
          </button>
          <button type="button" onClick={handleSaveCard} className="lettering-action lettering-action--ghost">
            명함저장
          </button>
          <button type="button" onClick={handleReport} className="lettering-action lettering-action--danger">
            신고/차단
          </button>
        </>
      )}
    </div>
  );

  return (
    <article
      className={`${shellBase} ${shellTone} ${platformClass} ${heightClass} ${shellPreviewClass} ${className}`.trim()}
      data-platform={platform}
      data-expanded={isExpandedView ? "true" : "false"}
      data-tier={isPaidMember ? "paid" : isFreeMember ? "free" : isUnverified ? "unverified" : "none"}
      aria-live="polite"
    >
      <div
        className={`lettering-live-bar ${dragHandleProps ? "lettering-live-bar--draggable" : ""} ${
          isGlassTent ? "lettering-live-bar--glass" : ""
        }`.trim()}
        {...(dragHandleProps || {})}
      >
        <div className="lettering-live-bar__left">
          <LetteringLiveIndicator />
          <span className="lettering-live-bar__brand">{previewMode ? "쇼케이스 미리보기" : "VLUE 작동중"}</span>
        </div>
        {previewStatusLabel ? (
          <span className="lettering-live-bar__status">{previewStatusLabel}</span>
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
          } ${!isExpandedView && (isPaidMember || isFreeMember) ? "pb-3" : ""}`}
        >
          {verified ? <LetteringProfileThumb card={c} verified={verified} size="sm" /> : null}
          <div className="min-w-0 flex-1">
            {isFreeMember && freeTierSummary ? (
              <>
                <p className="lettering-ongoing-name-row flex min-w-0 items-center gap-1.5">
                  <span className="lettering-ongoing-phone-em min-w-0 truncate text-[15px] font-bold leading-snug text-blue-700">
                    {freeTierSummary.phoneDisplay || freeTierSummary.primary}
                  </span>
                  <VlueVerifiedBadge />
                </p>
                <p className="lettering-ongoing-subline mt-0.5 min-w-0 truncate text-[11px] leading-snug text-slate-500">
                  {freeTierSummary.mode === "saved" ? (
                    <>
                      <span className="font-medium text-slate-600">{freeTierSummary.primary}</span>
                      <span className="text-slate-400"> {"\u00B7"} </span>
                    </>
                  ) : null}
                  <span>{incomingStatusShort}</span>
                </p>
              </>
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
                  {verified ? (
                    isGlassTent ? (
                      <span
                        className="lettering-vlue-verified-badge lettering-vlue-verified-badge--metal inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center"
                        title="VLUE 인증"
                        aria-label="VLUE 인증됨"
                      >
                        <ShieldCheck className="h-3 w-3" strokeWidth={2.6} aria-hidden />
                      </span>
                    ) : (
                      <VlueVerifiedBadge />
                    )
                  ) : null}
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

        {canExpand && isFreeMember ? (
          <div
            className="lettering-ongoing-expand-slot lettering-ongoing-expand-slot--emotional"
            data-open={isExpandedView ? "true" : "false"}
            aria-hidden={!isExpandedView}
          >
            <div className="lettering-ongoing-expand-slot__inner">
              <div className="lettering-ongoing-reception relative z-[2] flex min-h-0 flex-1 flex-col">
                <div
                  className={`lettering-ongoing-scroll flex-1 min-h-0 ${
                    isGlassTent
                      ? "lettering-ongoing-scroll--carousel"
                      : "lettering-ongoing-scroll--emotional"
                  }`}
                >
                  {isGlassTent ? (
                    <ShowcaseCallCarousel
                      card={c}
                      verified={verified}
                      incomingNumber={incoming}
                      photos={showcasePhotos}
                      membershipTier="free"
                      isKnownContact={isKnownContact}
                      scrollEnabled={false}
                      previewMode={previewMode}
                    />
                  ) : (
                    <FreeTierCallShowcase
                      isKnownContact={isKnownContact}
                      card={c}
                      phone={incoming}
                      verified={verified}
                      instagramHandle="@vlue.official"
                      creatorLink={c.website}
                    />
                  )}
                </div>
                {renderExpandedFooter()}
              </div>
            </div>
          </div>
        ) : null}

        {canExpand && isPaidMember ? (
          <div
            className="lettering-ongoing-expand-slot lettering-ongoing-expand-slot--reception"
            data-open={isExpandedView ? "true" : "false"}
            aria-hidden={!isExpandedView}
          >
            <div className="lettering-ongoing-expand-slot__inner">
              <div className="lettering-ongoing-reception relative z-[2] flex min-h-0 flex-1 flex-col">
                <div
                  className={`lettering-ongoing-scroll flex-1 min-h-0 ${
                    isGlassTent
                      ? "lettering-ongoing-scroll--carousel"
                      : "lettering-ongoing-scroll--reception"
                  }`}
                >
                  {isGlassTent ? (
                    <ShowcaseCallCarousel
                      card={c}
                      verified={verified}
                      verificationItems={verificationList}
                      incomingNumber={incoming}
                      photos={showcasePhotos}
                      membershipTier={c.membershipTier}
                      isKnownContact={isKnownContact}
                      scrollEnabled={carouselScrollEnabled}
                      previewMode={previewMode}
                      face={receptionFace}
                      onFaceChange={handleFaceChange}
                    />
                  ) : (
                    <LetteringDigitalReception
                      card={c}
                      verified={verified}
                      verificationItems={verificationList}
                      incomingNumber={incoming}
                      embeddedInPush
                      face={receptionFace}
                      onFaceChange={handleFaceChange}
                    />
                  )}
                </div>
                {renderExpandedFooter()}
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

      {guideToast ? (
        <div className="lettering-preview-guide-toast" role="status" aria-live="polite">
          {guideToast}
        </div>
      ) : null}
    </article>
  );
}
