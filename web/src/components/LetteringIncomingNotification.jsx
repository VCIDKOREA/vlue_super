import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getLetteringCallStatusLabel } from "../lib/letteringCallStatus.js";
import { compareLetteringPhones, formatLetteringPhoneDisplay, normalizePhoneDigits } from "../lib/letteringPhoneMatch.js";
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
import { LETTERING_DEMO_COMPANY_LOGO } from "../lib/letteringDemoAssets.js";
import { normalizeLetteringCard } from "../lib/letteringCardNormalize.js";
import { resolveShowcasePeerAvatar } from "../lib/showcase/resolveShowcasePeerAvatar.js";
import { buildAuthValidityVerificationItems } from "../lib/authValidityPeriod.js";
import { getLocalVlueUserId } from "../lib/showcase/resolveShowcaseOwnerUserId.js";
import { nativeEndCall, nativeEndCallKeepOverlay, nativeRevealSystemCallUi, nativeRestoreShowcaseOverlay, nativeSetOverlayFullscreen } from "../lib/call/nativeCallControl.js";
import { resolveIsKnownContact } from "../lib/contacts/hybridKnownContact.js";
import {
  resolveCallPeerMatrixSync,
  resolveInCallKakaoSlot
} from "../lib/call/callPeerMatrix.js";
import { runCallPeerMatrixAction } from "../lib/call/runCallPeerMatrixAction.js";
import { shareShowcaseInviteViaKakao } from "../lib/call/shareShowcaseInviteKakao.js";
import InCallKakaoShareSlot from "./call/InCallKakaoShareSlot.jsx";
import InCallControlBar from "./call/InCallControlBar.jsx";
import InCallDtmfPad from "./call/InCallDtmfPad.jsx";
import CompanionMiniCase, { resetCompanionMiniCaseSessionPos } from "./call/CompanionMiniCase.jsx";
import CompanionSamsungCallCta from "./call/CompanionSamsungCallCta.jsx";
import { COMPANION_MVP_DELEGATE_CALL_UI } from "../lib/call/companionMvpFlags.js";
import { Phone, PhoneOff, Settings, ShieldCheck } from "lucide-react";
import ShowcaseDialConfirmModal from "./showcase/ShowcaseDialConfirmModal.jsx";
import { SHOWCASE_OPEN_SETTINGS_EVENT } from "../lib/showcase/showcaseStyleStorage.js";
import { LETTERING_OPEN_BIZCARD_SETTINGS_EVENT } from "../lib/letteringBizcardStorage.js";
import { getMemberHandle } from "../lib/memberCardStorage.js";
import "../styles/showcase-call-glass.css";
import "../styles/incall-controls.css";

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
  verificationItems: ["인증유효기간 : 2027.04.10"]
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
  verificationItems: ["인증유효기간 : 2027.04.10"]
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

  const peer = resolveShowcasePeerAvatar({
    style: card?.showcaseStyle,
    card,
    displayName: card?.name || card?.displayName || "",
    exposeCustom: true
  });
  /* 프로필 썸네일 = 프로필 사진만 (회사 로고로 대체하지 않음) */
  const photoUrl = peer.type === "image" ? peer.url : String(card?.photoUrl || "").trim();
  const fallbackLabel =
    peer.type === "initial" ? peer.initial : (card.name || card.organization || "?").slice(0, 1);
  const showImg = Boolean(photoUrl) && !imgBroken;

  return (
    <span
      className={`lettering-profile-thumb relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-[#c5d4e8] bg-white shadow-sm ${dim}`}
    >
      {showImg ? (
        <img
          src={photoUrl}
          alt=""
          className="h-full w-full object-cover object-top"
          onError={() => setImgBroken(true)}
        />
      ) : (
        <span className="lettering-profile-thumb__initial font-black text-slate-700">{fallbackLabel}</span>
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
  card = null,
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
  /** 통화 목록에서 다시보기일 때만 저장/카톡 CTA 노출 */
  fromCallHistory = false,
  /** 홈 미리보기: 명함 신청자만 true — 미신청 시 쇼케이스만 */
  includeDigitalCard = true,
  /** true면 디지털인증명함 페이지만 (마이케이스 명함 버튼) */
  digitalCardOnly = false,
  /** 공개 링크 — 명함 다음 콘텐츠 슬라이드부터 */
  preferContentSlide = false,
  /**
   * false면 펼침 화살표·외부 액션만 쓰고 디지털명함/쇼케이스 본문은 열지 않음
   * (개인케이스 명함저장 등 — 보여줄 송출 콘텐츠 없음)
   */
  expandContent = true,
  /** 통화 종료 (연결 중·미리보기 전체화면) */
  onEndCall,
  /** 주소록 판별 — 미지정 시 하이브리드 해석 */
  isKnownContact: isKnownContactProp,
  /** 홈 본인 미리보기 전용 — 통화 중 상대방 오버레이에는 절대 true 금지 */
  showOwnerSettings = false,
  /**
   * 홈 미리보기에서 실제 통화와 동일한 하단 제어바(키패드·음소거·스피커·종료)를 보여 줌
   * — 쇼케이스 사진이 통화옵션에 가리는지 확인할 때 사용
   */
  inCallChromePreview = false,
  onInCallChromePreviewChange,
  /** 상대 열람 — 설정 자리에 닫기 */
  showPeerClose = false,
  onPeerClose,
  /** 쇼케이스 꺼짐 미리보기 — 이름 숨김, 번호+VLUE 인증만 */
  showcaseOffPreview = false,
  /** true면 캐러셀 BGM 비활성 (케이스함 BGM과 중복 방지) */
  suppressBgm = false,
  /** www 데스크 — 접기/펼치기 「미리보기입니다…」 안내 생략 */
  suppressExpandGuide = false,
  /** 미리보기·액션 안내 토스트 */
  onToast,
  className = ""
}) {
  const [expandedInternal, setExpandedInternal] = useState(defaultExpanded);
  const [receptionFace, setReceptionFace] = useState("front");
  const [guideToast, setGuideToast] = useState("");
  const [dialOpen, setDialOpen] = useState(false);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [carouselSlideType, setCarouselSlideType] = useState(includeDigitalCard ? "card" : "banner");
  const [knownContact, setKnownContact] = useState(() => ({
    isKnownContact: Boolean(savedContactName),
    matchedName: savedContactName || "",
    sources: savedContactName ? ["prop"] : []
  }));
  const expanded = expandedProp !== undefined ? expandedProp : expandedInternal;
  /** 접힘 애니메이션 끝날 때까지 --expanded 레이아웃 유지 (뚝뚝 끊김 방지) */
  const [keepExpandedLayout, setKeepExpandedLayout] = useState(false);
  const expandSlotRef = useRef(null);

  const showGuide = useCallback(
    (message) => {
      const msg = String(message || "").trim();
      if (!msg) return;
      /* App onToast 가 있으면 그쪽만 — 로컬 guideToast와 이중 표시 방지 */
      if (typeof onToast === "function") {
        onToast(msg);
        return;
      }
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

  const openOwnerSettings = useCallback(
    (kind) => {
      const settingsKind =
        kind === "card" || kind === "showcase"
          ? kind
          : carouselSlideType === "card"
            ? "card"
            : "showcase";
      if (expanded) {
        if (typeof onExpandedChange === "function") onExpandedChange(false);
        else if (typeof onEndCall === "function") onEndCall();
        else setExpanded(false);
      }
      window.setTimeout(() => {
        if (settingsKind === "card") {
          window.dispatchEvent(new Event(LETTERING_OPEN_BIZCARD_SETTINGS_EVENT));
        } else {
          window.dispatchEvent(new Event(SHOWCASE_OPEN_SETTINGS_EVENT));
        }
      }, 40);
    },
    [carouselSlideType, expanded, onExpandedChange, onEndCall, setExpanded]
  );

  const toggle = () => {
    if (previewMode && !suppressExpandGuide) {
      showGuide(
        expanded
          ? "미리보기입니다. 실제 통화 화면에서 명함을 접을 수 있습니다."
          : "미리보기입니다. 실제 통화 화면에서 명함을 펼칠 수 있습니다."
      );
    }
    const next = !expanded;
    setExpanded(next);
    /* Companion: 통화 중 접기=Mini Case+삼성 UI, 펼치기=Showcase 복귀 (BigPush로 복귀하지 않음) */
    const liveOnCall = callPhase === "active" || callPhase === "connected";
    if (COMPANION_MVP_DELEGATE_CALL_UI && liveOnCall && !previewMode && !fromCallHistory) {
      try {
        if (next) {
          nativeRestoreShowcaseOverlay();
          nativeSetOverlayFullscreen(true);
        } else {
          nativeSetOverlayFullscreen(false);
          nativeRevealSystemCallUi();
        }
      } catch {
        /* ignore */
      }
    }
    if (next && typeof window !== "undefined" && window.__vlueUnlockShowcaseBgm) {
      window.__vlueUnlockShowcaseBgm();
      window.setTimeout(() => window.__vlueUnlockShowcaseBgm?.(), 80);
      window.setTimeout(() => window.__vlueUnlockShowcaseBgm?.(), 280);
    }
    if (expanded) {
      setReceptionFace("front");
      setKeypadOpen(false);
    }
  };
  const c = normalizeLetteringCard(
    card && typeof card === "object"
      ? card
      : verified
        ? {
            name: "",
            displayName: "",
            organization: "",
            title: "",
            department: "",
            phone: incomingNumber || "",
            membershipTier: "free",
            verificationItems: []
          }
        : {
            name: "",
            displayName: "",
            organization: "",
            title: "",
            department: "",
            phone: incomingNumber || "",
            membershipTier: "free",
            verificationItems: []
          }
  );
  const onCall = callPhase === "active" || callPhase === "connected";
  const useCompanionDelegate =
    COMPANION_MVP_DELEGATE_CALL_UI && onCall && !previewMode && !fromCallHistory;
  const [callTick, setCallTick] = useState(0);
  const callStartedAtRef = useRef(null);
  useEffect(() => {
    if (!useCompanionDelegate) {
      callStartedAtRef.current = null;
      resetCompanionMiniCaseSessionPos();
      return undefined;
    }
    if (!callStartedAtRef.current) callStartedAtRef.current = Date.now();
    const id = window.setInterval(() => setCallTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [useCompanionDelegate]);
  const companionDurationLabel = useMemo(() => {
    void callTick;
    if (callDurationSec > 0) {
      const n = Math.floor(Number(callDurationSec) || 0);
      const m = Math.floor(n / 60);
      const s = n % 60;
      return `${m}:${String(s).padStart(2, "0")}`;
    }
    const started = callStartedAtRef.current;
    if (!started) return "0:00";
    const sec = Math.max(0, Math.floor((Date.now() - started) / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }, [callTick, callDurationSec, useCompanionDelegate]);
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
    const raw = Array.isArray(c.verificationItems) ? c.verificationItems : [];
    const cleaned = raw
      .map((line) => String(line || "").trim())
      .filter(Boolean)
      .filter((line) => !/PASS\s*본인인증|명함\s*승인|유료\s*명함\s*등급|사업자\s*정보|전화번호\s*일치/i.test(line));
    const hasValidity = cleaned.some((line) => /만료일|인증유효기간/.test(line));
    if (hasValidity) {
      return cleaned
        .map((line) => line.replace(/^인증유효기간/, "만료일"))
        .slice(0, 4);
    }
    if (showcaseOffPreview) return [];
    const peerId = String(c.userId || c.ownerUserId || "").trim();
    const me = getLocalVlueUserId();
    const isPeer = Boolean(peerId && me && peerId !== me);
    return buildAuthValidityVerificationItems({
      paidAt: c.authPaidAt || null,
      cycleEndAt: c.authCycleEndAt || c.cycleEndAt || null,
      billingCycle: c.billingCycle || null,
      useLocalFallback: !isPeer
    });
  }, [c.verificationItems, c.authPaidAt, c.authCycleEndAt, c.cycleEndAt, c.billingCycle, c.userId, c.ownerUserId, showcaseOffPreview]);

  const phoneMatched = useMemo(() => {
    if (!verified) return false;
    const result = compareLetteringPhones(incoming, c.phone);
    return result?.status === "match";
  }, [verified, incoming, c.phone]);

  const handleSaveCard = () => {
    if (previewMode) {
      showGuide("미리보기입니다. 실제 통화 중에는 쇼케이스를 저장할 수 있습니다.");
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

  const isExpandedView = expanded && canExpand && expandContent !== false;
  const showExpandedLayout = isExpandedView || keepExpandedLayout;
  const prevExpandedViewRef = useRef(isExpandedView);

  useLayoutEffect(() => {
    const wasExpanded = prevExpandedViewRef.current;
    prevExpandedViewRef.current = isExpandedView;

    if (isExpandedView) {
      setKeepExpandedLayout(false);
      return undefined;
    }

    if (!wasExpanded) {
      setKeepExpandedLayout(false);
      return undefined;
    }

    const slot = expandSlotRef.current;
    if (!slot) {
      setKeepExpandedLayout(false);
      return undefined;
    }

    setKeepExpandedLayout(true);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setKeepExpandedLayout(false);
    };
    const onEnd = (e) => {
      if (e.target !== slot) return;
      if (e.propertyName && e.propertyName !== "grid-template-rows") return;
      finish();
    };
    slot.addEventListener("transitionend", onEnd);
    const t = window.setTimeout(finish, 560);
    return () => {
      slot.removeEventListener("transitionend", onEnd);
      window.clearTimeout(t);
    };
  }, [isExpandedView]);

  const shellTone = !verified
    ? "lettering-ongoing--unverified"
    : isPaidMember
      ? "lettering-ongoing--verified lettering-ongoing--paid"
      : "lettering-ongoing--verified lettering-ongoing--free-tier";
  const platformClass = platform === "ios" ? "lettering-ongoing--ios" : "lettering-ongoing--android";
  const heightClass = showExpandedLayout
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
      savedContactName: savedContactName || knownContact.matchedName || "",
      savedContactPhone
    });
  }, [isFreeMember, incoming, c.phone, savedContactName, savedContactPhone, walletTick, knownContact.matchedName]);

  const unverifiedCollapsedPhone = useMemo(() => {
    if (!isUnverified) return "";
    const phoneDisplay = formatLetteringPhoneDisplay(incoming);
    return phoneDisplay && phoneDisplay !== "\u2014" ? phoneDisplay : "";
  }, [isUnverified, incoming]);

  const hideBroadcastName = Boolean(
    showcaseOffPreview || c.hideBroadcastName || c.showcaseStyle?.showBroadcastName === false
  );
  const contactSavedName = String(savedContactName || knownContact.matchedName || "").trim();

  /** 접힘 빅푸시 — 웹 기준: 상호·이름 + 번호 / 이름 송출 OFF 시 전화부 저장명·번호 */
  const receptionLines = !isUnverified
    ? formatLetteringReceptionLines(c, { incomingNumber: incoming })
    : null;
  const collapsedPhoneDisplay = receptionLines?.phone
    ? formatLetteringPhoneDisplay(receptionLines.phone)
    : freeTierSummary?.phoneDisplay || formatLetteringPhoneDisplay(incoming) || "";
  const previewShowcaseId = useMemo(() => {
    const fromCard = String(c.loginId || c.publicHandle || c.handle || "").trim().replace(/^@+/, "");
    if (fromCard) return fromCard;
    const peerId = String(c.userId || c.ownerUserId || "").trim();
    let meId = "";
    try {
      meId = String(localStorage.getItem("vlue_server_user_id") || "").trim();
    } catch {
      /* ignore */
    }
    const isPeer = Boolean(peerId && meId && peerId !== meId);
    /* 상대 카드면 내 로컬 핸들로 채우지 않음 (ceo Showcase 오염 방지) */
    if (!isPeer) {
      const handle = String(getMemberHandle() || "").trim().replace(/^@+/, "");
      if (handle && handle !== "user") return handle;
    }
    const fromName = String(c.name || c.displayName || "").trim();
    return fromName || "VLUE";
  }, [c.loginId, c.publicHandle, c.handle, c.name, c.displayName, c.userId, c.ownerUserId]);

  const displayLabel = isUnverified
    ? null
    : showcaseOffPreview
      ? collapsedPhoneDisplay || formatLetteringPhoneDisplay(incoming) || "—"
      : hideBroadcastName
        ? contactSavedName || collapsedPhoneDisplay || "—"
        : receptionLines?.collapsedPrimary ||
          c.name ||
          freeTierSummary?.primary ||
          contactSavedName ||
          "—";
  const phoneSameAsPrimary =
    Boolean(collapsedPhoneDisplay) &&
    normalizePhoneDigits(displayLabel) === normalizePhoneDigits(collapsedPhoneDisplay) &&
    Boolean(normalizePhoneDigits(collapsedPhoneDisplay));
  const showCollapsedOrg =
    !showcaseOffPreview &&
    !hideBroadcastName &&
    Boolean(receptionLines?.organization) &&
    String(receptionLines.organization).trim() !== String(displayLabel || "").trim();
  const showCollapsedPhoneSubline =
    !showcaseOffPreview && Boolean(collapsedPhoneDisplay) && !phoneSameAsPrimary;

  const isInCallChromePreview = Boolean(previewMode && inCallChromePreview);
  const previewStatusLabel = previewMode ? "" : statusLabel;

  const openInCallChromePreview = useCallback(() => {
    if (!previewMode) return;
    onInCallChromePreviewChange?.(true);
    if (!isExpandedView) setExpanded(true);
  }, [previewMode, onInCallChromePreviewChange, isExpandedView, setExpanded]);

  const closeInCallChromePreview = useCallback(() => {
    setKeypadOpen(false);
    onInCallChromePreviewChange?.(false);
  }, [onInCallChromePreviewChange]);

  const toggleInCallChromePreview = useCallback(
    (e) => {
      e?.stopPropagation?.();
      if (isInCallChromePreview) {
        /* 쇼케이스 펼침은 유지 — 통화 옵션만 끄고 일반 미리보기로 복귀 */
        closeInCallChromePreview();
      } else {
        openInCallChromePreview();
      }
    },
    [isInCallChromePreview, closeInCallChromePreview, openInCallChromePreview]
  );

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
      if (isInCallChromePreview) {
        /* 하단 통화종료도 창 닫기가 아니라 일반 쇼케이스 미리보기로 복귀 */
        closeInCallChromePreview();
        return;
      }
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
      /* 통화 신호만 끊고 쇼케이스 유지 */
      nativeEndCallKeepOverlay();
    }
  };

  const peerMatrix = useMemo(
    () =>
      resolveCallPeerMatrixSync({
        phone: incoming || c.phone,
        isVlueMember: Boolean(verified),
        knownContact: {
          isKnownContact,
          matchedName: knownContact.matchedName || savedContactName || "",
          sources: knownContact.sources || (isKnownContact ? ["hybrid"] : [])
        }
      }),
    [
      incoming,
      c.phone,
      verified,
      isKnownContact,
      knownContact.matchedName,
      knownContact.sources,
      savedContactName,
      walletTick
    ]
  );
  const inCallKakao = resolveInCallKakaoSlot(peerMatrix);
  const [matrixBusy, setMatrixBusy] = useState(false);
  const inCallDemoMode = Boolean(previewMode);
  /** 실통화 중에는 소셜 레일 숨김 — 미리보기·다시보기·열람만 노출 */
  const socialOverlayEnabled = Boolean(previewMode || fromCallHistory || !onCall);

  const handleMatrixAction = async () => {
    if (!peerMatrix.showCallLogAction || matrixBusy) return;
    setMatrixBusy(true);
    try {
      if (peerMatrix.cta === "kakao_share") {
        await shareShowcaseInviteViaKakao({
          inviteeName: peerMatrix.contactName || c.name || savedContactName,
          phone: incoming || c.phone,
          onToast: showGuide
        });
      } else {
        await runCallPeerMatrixAction({
          matrix: peerMatrix,
          card: c,
          phone: incoming || c.phone,
          onToast: showGuide
        });
      }
    } finally {
      setMatrixBusy(false);
    }
  };

  const handleDialPeer = () => {
    if (!incoming) {
      showGuide("연결할 전화번호가 없습니다.");
      return;
    }
    setDialOpen(true);
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

  /** 통화 중: 종료 / 다시보기·미리보기: 전화걸기 */
  const showLiveEndCall = onCall && !previewMode;
  const showReplayDial = Boolean(fromCallHistory);
  /** 홈「통화화면」미리보기 — 펼친 상태에서만 실통화와 같은 하단 제어바 */
  const showChromePreviewControls = Boolean(isInCallChromePreview && isExpandedView);
  const showCallEndBar =
    showLiveEndCall ||
    showReplayDial ||
    Boolean(onEndCall && onCall && !previewMode) ||
    showChromePreviewControls;
  const isGlassTent = /\blettering-ongoing--fullscreen-tent\b/.test(String(className || ""));
  /** 통화목록 다시보기에서만 저장 CTA — 홈 미리보기·실통화 풀케이스에는 미노출 */
  const showCallLogSaveCta = Boolean(fromCallHistory && peerMatrix.showCallLogAction);
  /** Companion MVP: 실통화·「통화화면」미리보기 모두 4버튼 숨김 → 삼성 CTA */
  const showLegacyInCallControls = Boolean(
    !COMPANION_MVP_DELEGATE_CALL_UI && showChromePreviewControls
  );
  const showCompanionSamsungCta = Boolean(
    COMPANION_MVP_DELEGATE_CALL_UI &&
      isExpandedView &&
      !fromCallHistory &&
      (useCompanionDelegate || showChromePreviewControls)
  );
  const showInCallControls = Boolean(showLegacyInCallControls || showCompanionSamsungCta);

  const openSamsungCallOptions = useCallback(() => {
    if (previewMode) {
      onToast?.("미리보기입니다. 실제 통화에서는 삼성 전화앱으로 이동합니다.");
      /* 미리보기에서도 Mini Case 전환 체감 */
      setExpanded(false);
      return;
    }
    setExpanded(false);
    try {
      nativeSetOverlayFullscreen(false);
      nativeRevealSystemCallUi();
    } catch {
      /* ignore */
    }
    onToast?.("삼성 전화앱에서 키패드·음소거·스피커·종료를 사용하세요.");
  }, [setExpanded, onToast, previewMode]);

  const expandShowcaseFromMiniCase = useCallback(() => {
    setExpanded(true);
    try {
      nativeRestoreShowcaseOverlay();
      nativeSetOverlayFullscreen(true);
    } catch {
      /* ignore */
    }
  }, [setExpanded]);

  /** 홈 미리보기·마케팅 데모도 앱과 동일 풀 쇼케이스 캐러셀 */
  const useShowcaseCarousel = isGlassTent || previewMode;
  const carouselScrollEnabled = isPaidMember && (previewMode || onCall || isExpandedView);
  /** 홈 미리보기 접힘: BGM 재생 중지 */
  const carouselSuppressBgm =
    Boolean(suppressBgm) || Boolean(previewMode && !isExpandedView);
  const showcasePhotos = c.showcaseStyle?.gallery?.photos || [];
  const showcaseStyleConfig = c.showcaseStyle || null;

  const renderCircleAction = () => {
    /* Companion MVP — 원형 종료 버튼도 숨김 (삼성 전화앱 위임) */
    if (useCompanionDelegate) {
      return null;
    }
    if (showLiveEndCall) {
      return (
        <button
          type="button"
          onClick={handleEndCall}
          className="lettering-action lettering-action--end-call-circle"
          aria-label="통화 종료"
        >
          <PhoneOff size={22} strokeWidth={2.2} aria-hidden />
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={handleDialPeer}
        className="lettering-action lettering-action--dial-call-circle"
        aria-label="전화걸기"
      >
        <Phone size={22} strokeWidth={2.2} aria-hidden />
      </button>
    );
  };

  const renderExpandedFooter = () => {
    /* 홈·설정 쇼케이스 미리보기 — 통화화면 미리보기일 때만 하단 제어바 */
    if (previewMode && !fromCallHistory && !showChromePreviewControls) return null;

    return (
    <div
      className={`lettering-ongoing-actions-secondary relative z-[2] shrink-0 ${
        showCallEndBar
          ? `lettering-ongoing-actions-secondary--call${isGlassTent ? " lettering-ongoing-actions-secondary--glass" : ""}`
          : "lettering-ongoing-actions-secondary--reception grid grid-cols-3 gap-1.5 px-3 py-2"
      }`}
    >
      {showCallEndBar ? (
        <>
          {/* 실통화: 미회원+주소록일 때만 카톡 CTA */}
          {!previewMode && showLiveEndCall && inCallKakao.visible ? (
            <InCallKakaoShareSlot
              visible
              description={inCallKakao.description}
              label={inCallKakao.label}
              busy={matrixBusy}
              onShare={handleMatrixAction}
            />
          ) : null}
          {showCallLogSaveCta ? (
            <div
              className={`lettering-ongoing-actions-secondary__row lettering-ongoing-actions-secondary__row--save-end${
                isGlassTent ? " lettering-ongoing-actions-secondary__row--glass" : ""
              }`}
            >
              <button
                type="button"
                onClick={handleMatrixAction}
                disabled={matrixBusy}
                className={`lettering-action lettering-action--save-inline ${
                  isGlassTent ? "lettering-action--glass" : "lettering-action--primary"
                }`}
              >
                {matrixBusy ? "처리 중…" : peerMatrix.label}
              </button>
              <button
                type="button"
                onClick={handleDialPeer}
                className="lettering-action lettering-action--dial-call-circle"
                aria-label="전화걸기"
              >
                <Phone size={22} strokeWidth={2.2} aria-hidden />
              </button>
            </div>
          ) : showCompanionSamsungCta ? (
            <CompanionSamsungCallCta onOpen={openSamsungCallOptions} />
          ) : showLegacyInCallControls ? (
            <div className="lettering-ongoing-actions-secondary__row lettering-ongoing-actions-secondary__row--controls">
              <InCallControlBar
                platform={platform}
                onEnd={handleEndCall}
                showEndButton
                endLabel="통화종료"
                demoMode={Boolean(previewMode)}
                keypadOpen={keypadOpen}
                onKeypadOpenChange={setKeypadOpen}
              />
            </div>
          ) : fromCallHistory ? (
            <div className="lettering-ongoing-actions-secondary__row lettering-ongoing-actions-secondary__row--dial">
              <button
                type="button"
                onClick={handleDialPeer}
                className="lettering-action lettering-action--dial-call-bar"
                aria-label="전화걸기"
              >
                <Phone size={20} strokeWidth={2.2} aria-hidden />
                <span>전화걸기</span>
              </button>
            </div>
          ) : (
            renderCircleAction()
          )}
        </>
      ) : (
        <>
          <p className="lettering-caution lettering-caution--reception-footer col-span-3">{VLUE_CARD_CAUTION}</p>
          <button type="button" onClick={handleOpenFeed} className="lettering-action lettering-action--primary">
            인증정보
          </button>
          {showCallLogSaveCta ? (
            <button
              type="button"
              onClick={handleMatrixAction}
              disabled={matrixBusy}
              className="lettering-action lettering-action--ghost"
            >
              {peerMatrix.label}
            </button>
          ) : (
            <span className="lettering-action lettering-action--ghost opacity-0 pointer-events-none" aria-hidden>
              —
            </span>
          )}
          <button type="button" onClick={handleReport} className="lettering-action lettering-action--danger">
            신고/차단
          </button>
        </>
      )}
    </div>
    );
  };

  /* Companion MVP — 통화 중 접기 = Mini Case (Floating Controller, BigPush 아님) */
  if (useCompanionDelegate && !isExpandedView) {
    const phoneDisp =
      formatLetteringPhoneDisplay(incoming) ||
      unverifiedCollapsedPhone ||
      incoming ||
      "—";
    const nameDisp = isUnverified
      ? phoneDisp
      : String(displayLabel || "").trim() || phoneDisp;
    return (
      <div
        className={`companion-mini-case-layer ${className || ""}`.trim()}
        data-companion-surface="mini-case"
        data-platform={platform}
      >
        <CompanionMiniCase
          displayName={nameDisp}
          phoneLabel={phoneDisp}
          statusLabel={isUnverified ? "미인증" : verified ? "인증" : "미인증"}
          durationLabel={companionDurationLabel}
          verified={Boolean(verified && !isUnverified)}
          onExpand={expandShowcaseFromMiniCase}
        />
      </div>
    );
  }

  return (
    <article
      className={`${shellBase} ${shellTone} ${platformClass} ${heightClass} ${shellPreviewClass} ${className}`.trim()}
      data-platform={platform}
      data-expanded={isExpandedView ? "true" : "false"}
      data-companion-surface={useCompanionDelegate ? "showcase" : undefined}
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
          <span className="lettering-live-bar__brand">
            {previewMode ? `${previewShowcaseId} Showcase` : "VLUE 작동중"}
          </span>
        </div>
        {previewMode && showOwnerSettings ? (
          <button
            type="button"
            onClick={toggleInCallChromePreview}
            className="lettering-incall-preview-btn lettering-live-bar__call-preview"
            aria-pressed={isInCallChromePreview}
            aria-label={isInCallChromePreview ? "통화화면 닫기" : "통화화면 보기 (실제 통화 옵션 포함)"}
            title={isInCallChromePreview ? "통화화면 닫기" : "통화화면 보기"}
          >
            <Phone className="h-3 w-3" strokeWidth={2.5} aria-hidden />
            {isInCallChromePreview ? "통화화면 닫기" : "통화화면 보기"}
          </button>
        ) : previewStatusLabel ? (
          <span className="lettering-live-bar__status">{previewStatusLabel}</span>
        ) : (
          <span className="lettering-live-bar__status lettering-live-bar__status--empty" aria-hidden />
        )}
      </div>

      <div className="lettering-ongoing-body relative flex min-h-0 flex-col">
        <div
          className={`lettering-ongoing-summary relative z-[2] flex gap-2.5 px-3 py-2.5 items-center ${
            isFreeMember ? "lettering-ongoing-summary--free" : ""
          } ${isUnverified ? "lettering-ongoing-summary--unverified" : ""} ${
            !showExpandedLayout && (isPaidMember || isFreeMember) ? "pb-3" : ""
          }`}
        >
          {verified && !showcaseOffPreview ? <LetteringProfileThumb card={c} verified={verified} size="sm" /> : null}
          {verified && showcaseOffPreview ? (
            <span
              className="lettering-vlue-verified-badge lettering-vlue-verified-badge--metal inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/25 ring-1 ring-blue-300/35"
              title="VLUE 인증"
              aria-label="VLUE 인증됨"
            >
              <ShieldCheck className="h-5 w-5 text-blue-200" strokeWidth={2.4} aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0 flex-1 overflow-hidden">
            {isUnverified ? (
              <p className="lettering-ongoing-name-row min-w-0">
                <span className="lettering-unverified-collapsed-phone">
                  {unverifiedCollapsedPhone || "\u2014"}
                </span>
              </p>
            ) : (
              <>
                <p className="lettering-ongoing-name-row flex min-w-0 items-center gap-1.5 overflow-hidden">
                  <span className="lettering-ongoing-name min-w-0 font-semibold">
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
                {showCollapsedPhoneSubline ? (
                  <p className="lettering-ongoing-subline mt-0.5 min-w-0">
                    {showCollapsedOrg ? (
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
                {showcaseOffPreview && !isExpandedView ? (
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-400">VLUE 인증 번호</p>
                ) : null}
              </>
            )}
            {!isUnverified && !showCollapsedPhoneSubline && !phoneSameAsPrimary && receptionLines?.expandedContactLine ? (
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
          {previewMode && showOwnerSettings ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openOwnerSettings(carouselSlideType === "card" ? "card" : "showcase");
              }}
              className="lettering-owner-settings-btn inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-blue-600 px-2.5 text-[11px] font-black text-white shadow-sm active:scale-95"
              aria-label={carouselSlideType === "card" ? "디지털 인증명함 설정" : "블루 쇼케이스 설정"}
              title={carouselSlideType === "card" ? "명함 설정" : "쇼케이스 설정"}
            >
              <Settings className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
              설정
            </button>
          ) : null}
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
            ref={expandSlotRef}
            className="lettering-ongoing-expand-slot lettering-ongoing-expand-slot--emotional"
            data-open={isExpandedView ? "true" : "false"}
            aria-hidden={!isExpandedView}
          >
            <div className="lettering-ongoing-expand-slot__inner">
              <div className="lettering-ongoing-reception relative z-[2] flex min-h-0 flex-1 flex-col">
                <div
                  className={`lettering-ongoing-scroll flex-1 min-h-0 ${
                    useShowcaseCarousel
                      ? "lettering-ongoing-scroll--carousel"
                      : "lettering-ongoing-scroll--emotional"
                  }`}
                >
                  {useShowcaseCarousel ? (
                    <ShowcaseCallCarousel
                      card={c}
                      verified={verified}
                      incomingNumber={incoming}
                      photos={showcasePhotos}
                      membershipTier="free"
                      isKnownContact={isKnownContact}
                      scrollEnabled={Boolean(previewMode)}
                      previewMode={previewMode}
                      includeDigitalCard={false}
                      showcaseOffPreview={showcaseOffPreview}
                      keypadOpen={keypadOpen}
                      onKeypadClose={() => setKeypadOpen(false)}
                      keypadDemoMode={inCallDemoMode}
                      onKeypadToast={showGuide}
                      socialOverlayEnabled={socialOverlayEnabled}
                      onReport={handleReport}
                      showOwnerSettings={Boolean(previewMode && showOwnerSettings)}
                      onOpenSlideSettings={openOwnerSettings}
                      showPeerClose={Boolean(previewMode && showPeerClose)}
                      onPeerClose={onPeerClose}
                      onSlideTypeChange={setCarouselSlideType}
                      showcaseStyle={showcaseStyleConfig}
                      suppressBgm={carouselSuppressBgm}
                    />
                  ) : keypadOpen ? (
                    <InCallDtmfPad
                      demoMode={inCallDemoMode}
                      onClose={() => setKeypadOpen(false)}
                      onToast={showGuide}
                    />
                  ) : (
                    <FreeTierCallShowcase
                      isKnownContact={isKnownContact}
                      card={c}
                      phone={incoming}
                      verified={verified}
                      showcaseOffPreview={showcaseOffPreview}
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
            ref={expandSlotRef}
            className="lettering-ongoing-expand-slot lettering-ongoing-expand-slot--reception"
            data-open={isExpandedView ? "true" : "false"}
            aria-hidden={!isExpandedView}
          >
            <div className="lettering-ongoing-expand-slot__inner">
              <div className="lettering-ongoing-reception relative z-[2] flex min-h-0 flex-1 flex-col">
                <div
                  className={`lettering-ongoing-scroll flex-1 min-h-0 ${
                    useShowcaseCarousel
                      ? "lettering-ongoing-scroll--carousel"
                      : "lettering-ongoing-scroll--reception"
                  }`}
                >
                  {useShowcaseCarousel ? (
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
                      includeDigitalCard={includeDigitalCard}
                      digitalCardOnly={digitalCardOnly}
                      preferContentSlide={preferContentSlide}
                      face={receptionFace}
                      onFaceChange={handleFaceChange}
                      keypadOpen={keypadOpen}
                      onKeypadClose={() => setKeypadOpen(false)}
                      keypadDemoMode={inCallDemoMode}
                      onKeypadToast={showGuide}
                      socialOverlayEnabled={socialOverlayEnabled}
                      onReport={handleReport}
                      showOwnerSettings={Boolean(previewMode && showOwnerSettings)}
                      onOpenSlideSettings={openOwnerSettings}
                      showPeerClose={Boolean(previewMode && showPeerClose)}
                      onPeerClose={onPeerClose}
                      onSlideTypeChange={setCarouselSlideType}
                      showcaseStyle={showcaseStyleConfig}
                      suppressBgm={carouselSuppressBgm}
                      callChromeSafe={showInCallControls}
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
                      keypadOpen={keypadOpen}
                      onKeypadClose={() => setKeypadOpen(false)}
                      keypadDemoMode={inCallDemoMode}
                      onToast={showGuide}
                      callChromeSafe={showInCallControls}
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
            ref={expandSlotRef}
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

      <ShowcaseDialConfirmModal
        open={dialOpen}
        phone={incoming}
        displayName={hideBroadcastName ? contactSavedName : c.name || contactSavedName || ""}
        onClose={() => setDialOpen(false)}
      />
    </article>
  );
}
