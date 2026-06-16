import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DigitalCardEditorView from "./DigitalCardEditorView.jsx";
import MembershipUpgradeModal from "./MembershipUpgradeModal.jsx";
import LetteringSettingsSection from "./LetteringSettingsSection.jsx";
import LetteringBizcardSettingsView from "./LetteringBizcardSettingsView.jsx";
import VluerPartnerSection from "./VluerPartnerSection.jsx";
import { useB2bMembership } from "../context/B2bMembershipContext.jsx";
import VluerCodeChangeSidebar from "./VluerCodeChangeSidebar.jsx";
import ModalCloseButton from "./common/ModalCloseButton";
import VlueSettingsPanel from "./settings/VlueSettingsPanel.jsx";
import { applyAppSettingsToDocument } from "../lib/vlueAppSettings.js";
import WalletRevealCard from "./WalletRevealCard.jsx";
import MyPageDigitalLetteringSection from "./MyPageDigitalLetteringSection.jsx";
import EnterpriseLineManagePanel from "./EnterpriseLineManagePanel.jsx";
import ShoppingCartHubPanel from "./ShoppingCartHubPanel.jsx";
import BroadcastLineSetupPanel from "./BroadcastLineSetupPanel.jsx";
import BackButton from "./common/BackButton";
import { isBillableMembershipKind, normalizeMembershipKind } from "../lib/membershipBm.js";
import { pricingNumbers } from "../lib/pricingConfig.js";
import { probeEnterpriseSidebarAccess } from "../lib/enterpriseLineManageAccess.js";
import { fileToDataUrl, readAvatar, writeAvatar } from "../lib/vlueAvatar.js";
import { getMemberHandle, getChatDisplayName } from "../lib/memberCardStorage.js";
import { formatPhoneE164ForKoreaDisplay } from "../lib/phoneDisplay.js";
import { fetchEmailForwardingMapping } from "../lib/vlueEmailMappingsApi.js";

function tierLabelStyle(tier, isDarkMode) {
  if (tier === "premium") return { label: "프리미엄", className: "text-[#722f37]" };
  if (tier === "standard") return { label: "스탠다드", className: "text-blue-600" };
  /* 일반: 라이트는 진한 글자, 사이드바 다크모드는 흰색 (html.dark 미사용 대비) */
  return { label: "일반", className: isDarkMode ? "text-white" : "text-gray-900" };
}

function SettingsSlidersIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="4" y1="6" x2="14" y2="6" />
      <line x1="10" y1="18" x2="20" y2="18" />
      <circle cx="17" cy="6" r="3" />
      <circle cx="7" cy="18" r="3" />
    </svg>
  );
}

function ProfilePanel({
  open,
  onClose,
  isDarkMode,
  onToggleDarkMode,
  onShowSettingNotice,
  membershipTier = "free",
  digitalCardIssued = true,
  digitalCardActive = true,
  myCard,
  onCardFieldsSaved,
  onOpenPageManager,
  /** 그룹 · 개인 일정 캘린더 */
  onOpenCalendar,
  calendarBadgeCount = 0,
  /** Wallet · 개인 자료실 (§2) */
  onOpenWallet,
  /** PC 복합기 리모컨 */
  onOpenOfficeRemote,
  /** @vlue.kr 통합 이메일함 */
  onOpenEmailInbox,
  /** 무료 회원 — 스토어 일반 장바구니로 이동 */
  onOpenStoreCart,
  onLogout,
  onWithdrawAccount,
  /** 모든 채팅방 읽지 않음 수를 0으로 (공식 알림 대기 건 포함) */
  onMarkAllChatsRead,
  hasUnreadChats = false,
  blockedUserIds = [],
  onUnblockUser,
  onOpenFamilyProtection,
  myPhone = "",
  /** "profileSettings" → 설정 화면으로 진입 */
  initialView = "main",
  onMembershipTierChange,
  onRequestTierChange,
}) {
  const [isVCIDOn, setIsVCIDOn] = useState(false);
  const [settingNotice, setSettingNotice] = useState("");
  const settingNoticeTimerRef = useRef(null);
  const [showCopied, setShowCopied] = useState(false);
  const [panelView, setPanelView] = useState("main");
  const [digitalCardMode, setDigitalCardMode] = useState("edit");
  const [nickTick, setNickTick] = useState(0);
  const [settingsSubView, setSettingsSubView] = useState(null);
  const [avatarTick, setAvatarTick] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [withdrawConsultOpen, setWithdrawConsultOpen] = useState(false);
  const [partnerInquiryOpen, setPartnerInquiryOpen] = useState(false);
  const [partnerInquiryBody, setPartnerInquiryBody] = useState("");
  const [partnerInquiryNotice, setPartnerInquiryNotice] = useState("");
  const [withdrawTermsOpen, setWithdrawTermsOpen] = useState(false);
  const [withdrawGrantUntil, setWithdrawGrantUntil] = useState(0);
  const [agreeRefund, setAgreeRefund] = useState(false);
  const [agreeReverify, setAgreeReverify] = useState(false);
  const [agreeFinal, setAgreeFinal] = useState(false);
  const [enterpriseLineAccess, setEnterpriseLineAccess] = useState(false);
  const [isEnterpriseMember, setIsEnterpriseMember] = useState(false);
  const [enterpriseLineAccessChecked, setEnterpriseLineAccessChecked] = useState(false);
  const { vluerLocked, membershipCtx } = useB2bMembership();
  const mainPanelScrollRef = useRef(null);
  const [virtualEmail, setVirtualEmail] = useState(null);

  const companyLockedName = useMemo(
    () =>
      String(localStorage.getItem("vlue_company_locked") || "").trim() ||
      String(myCard?.organization || "").trim(),
    [myCard?.organization, open]
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchEmailForwardingMapping().then((data) => {
      if (!cancelled) {
        setVirtualEmail(data.mapping?.fullVirtualEmail || null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, panelView]);

  const openSettings = useCallback(() => {
    setSettingsSubView(null);
    setPanelView("settings");
  }, []);

  useEffect(() => {
    applyAppSettingsToDocument();
  }, []);
  useEffect(() => {
    const a = () => setAvatarTick((n) => n + 1);
    window.addEventListener("vlue-avatar-changed", a);
    return () => window.removeEventListener("vlue-avatar-changed", a);
  }, []);
  const hasDigitalCertCard = Boolean(digitalCardActive) && digitalCardIssued !== false;

  useEffect(() => {
    const storedOn = localStorage.getItem("vcid") === "true";
    if (storedOn && !hasDigitalCertCard) {
      localStorage.setItem("vcid", "false");
      setIsVCIDOn(false);
      return;
    }
    setIsVCIDOn(storedOn && hasDigitalCertCard);
  }, [hasDigitalCertCard]);
  useEffect(() => {
    const h = () => setNickTick((n) => n + 1);
    window.addEventListener("vlue-nicknames-changed", h);
    return () => window.removeEventListener("vlue-nicknames-changed", h);
  }, []);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setEnterpriseLineAccessChecked(false);
    probeEnterpriseSidebarAccess(membershipTier)
      .then((result) => {
        if (!cancelled) {
          setEnterpriseLineAccess(Boolean(result?.canManage));
          setIsEnterpriseMember(Boolean(result?.isEnterpriseMember));
        }
      })
      .finally(() => {
        if (!cancelled) setEnterpriseLineAccessChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, membershipTier]);

  useEffect(() => {
    if (!open) {
      setPanelView("main");
      setSettingsSubView(null);
      setDigitalCardMode("edit");
      setUpgradeOpen(false);
      setLogoutConfirmOpen(false);
      setWithdrawConsultOpen(false);
      setWithdrawTermsOpen(false);
      return;
    }
    if (initialView === "profileSettings" || initialView === "settings") {
      setPanelView("settings");
      setSettingsSubView(null);
      setDigitalCardMode("edit");
      setUpgradeOpen(false);
      return;
    }
    if (initialView === "emailSettings") {
      setPanelView("settings");
      setSettingsSubView("vlueEmailSettings");
      setDigitalCardMode("edit");
      setUpgradeOpen(false);
      return;
    }
    if (initialView === "digitalCardApply" || initialView === "digitalCardEdit" || initialView === "letteringBizcard") {
      setPanelView("letteringBizcard");
      setUpgradeOpen(false);
      return;
    }
    if (initialView === "upgrade") {
      setPanelView("main");
      setDigitalCardMode("edit");
      setUpgradeOpen(true);
      return;
    }
    if (initialView === "broadcastSetup") {
      setPanelView("broadcastSetup");
      setUpgradeOpen(false);
      return;
    }
    setPanelView("main");
    setDigitalCardMode("edit");
    setUpgradeOpen(false);
  }, [open, initialView]);

  useEffect(() => {
    if (!open) return;
    const resetTop = () => {
      if (panelView === "main" && mainPanelScrollRef.current) mainPanelScrollRef.current.scrollTop = 0;
    };
    resetTop();
    const raf = requestAnimationFrame(resetTop);
    const timer = setTimeout(resetTop, 50);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [open, panelView]);

  const broadcastMonthlyKrw = useMemo(() => pricingNumbers().broadcastMonthly, []);
  const tierUi = useMemo(() => tierLabelStyle(membershipTier, isDarkMode), [membershipTier, isDarkMode]);
  const membershipKind = useMemo(() => normalizeMembershipKind(membershipTier), [membershipTier]);
  const canUseShoppingCartHub = useMemo(() => isBillableMembershipKind(membershipKind), [membershipKind]);
  const isCorporateAccount = useMemo(
    () =>
      isEnterpriseMember ||
      vluerLocked ||
      Boolean(membershipCtx?.corporate_active || membershipCtx?.override_by_company),
    [isEnterpriseMember, vluerLocked, membershipCtx]
  );
  const showVluerPartner = useMemo(
    () => enterpriseLineAccessChecked && !isCorporateAccount,
    [enterpriseLineAccessChecked, isCorporateAccount]
  );
  const headerName = useMemo(
    () => getChatDisplayName(String(myCard?.name || "").trim() || "회원"),
    [myCard?.name, nickTick]
  );
  const memberIdDisplay = getMemberHandle();
  const profilePhoneDisplay = useMemo(() => {
    const raw = String(myPhone || myCard?.phone || "").trim();
    const formatted = formatPhoneE164ForKoreaDisplay(raw);
    return formatted || raw || "—";
  }, [myPhone, myCard?.phone]);
  const headText = isDarkMode ? "text-gray-100" : "text-gray-900";
  const subText = isDarkMode ? "text-gray-400" : "text-gray-400";
  const profileFieldLabelText = isVCIDOn
    ? isDarkMode
      ? "text-blue-400"
      : "text-blue-600"
    : subText;
  const primaryAva = useMemo(() => readAvatar("primary"), [avatarTick, open]);

  const openLetteringBizcardHub = useCallback(() => {
    setPanelView("letteringBizcard");
  }, []);

  const showSettingNotice = useCallback(
    (msg) => {
      setSettingNotice(msg);
      if (settingNoticeTimerRef.current) clearTimeout(settingNoticeTimerRef.current);
      settingNoticeTimerRef.current = setTimeout(() => {
        setSettingNotice("");
        settingNoticeTimerRef.current = null;
      }, 2500);
      if (!open) onShowSettingNotice?.(msg);
    },
    [open, onShowSettingNotice]
  );

  useEffect(() => {
    if (!open) setSettingNotice("");
    return () => {
      if (settingNoticeTimerRef.current) clearTimeout(settingNoticeTimerRef.current);
    };
  }, [open]);

  const onToggle = (next) => {
    if (next && !hasDigitalCertCard) {
      showSettingNotice("디지털인증명함을 신청해주세요");
      return;
    }
    setIsVCIDOn(next);
    localStorage.setItem("vcid", String(next));
    try {
      window.dispatchEvent(new Event("vlue-vcid-changed"));
    } catch {
      /* ignore */
    }
    showSettingNotice(next ? "통화중 디지털인증명함이 송출됩니다." : "통화중 일반문구만 송출됩니다.");
  };

  const handleDarkModeToggle = (next) => {
    onToggleDarkMode?.(next);
    showSettingNotice(next ? "다크모드로 설정되었습니다." : "다크모드가 해제되었습니다.");
  };
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    });
  };
  const withdrawUnlocked = withdrawGrantUntil > Date.now();
  const canSubmitWithdraw = agreeRefund && agreeReverify && agreeFinal;

  const submitPartnerInquiry = () => {
    if (!partnerInquiryBody.trim()) {
      setPartnerInquiryNotice("문의 내용을 입력해 주세요.");
      setTimeout(() => setPartnerInquiryNotice(""), 2000);
      return;
    }
    setPartnerInquiryOpen(false);
    setPartnerInquiryBody("");
    setPartnerInquiryNotice("블루 채팅으로 문의 접수 신청이 완료되었습니다. 관련 담당자가 안내해드립니다.");
    setTimeout(() => setPartnerInquiryNotice(""), 3000);
  };
  return (
    <div className={`fixed inset-0 ${open ? "z-[140]" : "z-[70] pointer-events-none"}`}>
      <button className={`absolute inset-0 bg-black/30 transition ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <aside
        id="profile-menu"
        className={`absolute right-0 top-0 h-full w-[85%] max-w-[340px] shadow-2xl flex flex-col overflow-hidden transition-all duration-300 border-l ${
          isDarkMode ? "border-white/10 bg-[#111827]" : "border-gray-100 bg-white"
        } ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div
          className={`px-5 py-2.5 flex justify-between items-center shrink-0 border-b ${isDarkMode ? "border-white/10" : "border-gray-50"}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`h-9 w-9 shrink-0 rounded-full border overflow-hidden flex items-center justify-center font-bold ${
                isDarkMode ? "border-white/15 bg-white/10 text-gray-200" : "border-gray-200 bg-gray-100 text-gray-500"
              }`}
            >
              {primaryAva ? (
                <img src={primaryAva} alt="" className="h-full w-full object-cover" />
              ) : headerName ? (
                headerName.slice(0, 1)
              ) : (
                "이"
              )}
            </div>
            <div className="min-w-0 flex flex-1 items-center gap-1.5 overflow-hidden">
              <p className={`vlue-fluid-profile-name max-w-full font-normal py-[1px] ${headText}`}>{headerName}</p>
              <button
                type="button"
                onClick={openSettings}
                className={`rounded-lg p-1 active:scale-95 ${isDarkMode ? "text-gray-400 hover:bg-white/10 hover:text-gray-300" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
                aria-label="설정"
                title="설정"
              >
                <SettingsSlidersIcon />
              </button>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 text-2xl ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
            ✕
          </button>
        </div>

        {panelView === "digitalCard" ? (
          <DigitalCardEditorView
            mode={digitalCardMode}
            myCard={myCard}
            isDarkMode={isDarkMode}
            onBack={() => setPanelView("main")}
            onSaved={() => onCardFieldsSaved?.()}
          />
        ) : panelView === "letteringBizcard" ? (
          <LetteringBizcardSettingsView
            membershipTier={membershipTier}
            isDarkMode={isDarkMode}
            isFirstApply={!digitalCardActive || digitalCardIssued === false}
            onBack={() => setPanelView("main")}
            onApplied={() => {
              onCardFieldsSaved?.();
              try {
                window.dispatchEvent(new CustomEvent("vlue-digital-card-changed"));
              } catch {
                /* ignore */
              }
            }}
          />
        ) : panelView === "enterpriseLines" ? (
          <EnterpriseLineManagePanel
            isDarkMode={isDarkMode}
            onBack={() => setPanelView("main")}
            onToast={showSettingNotice}
          />
        ) : panelView === "broadcastSetup" ? (
          <div className={`flex min-h-0 flex-1 flex-col ${isDarkMode ? "text-gray-100" : ""}`}>
            <div
              className={`flex shrink-0 items-center gap-1 border-b px-3 py-2.5 ${isDarkMode ? "border-white/10" : "border-gray-100"}`}
            >
              <BackButton variant="inline" onBack={() => setPanelView("main")} isDarkMode={isDarkMode} />
              <div className="min-w-0 flex-1">
                <p className={`text-[17px] font-black ${headText}`}>영업용 명함 송출</p>
                <p className={`text-[11px] ${subText}`}>발신번호 등록 · 송출 옵션</p>
              </div>
            </div>
            <div className="vlue-scroll-pad-profile-panel min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <BroadcastLineSetupPanel onToast={showSettingNotice} />
            </div>
          </div>
        ) : panelView === "shoppingCart" ? (
          <ShoppingCartHubPanel
            membershipTier={membershipTier}
            isDarkMode={isDarkMode}
            onBack={() => setPanelView("main")}
            onToast={showSettingNotice}
          />
        ) : panelView === "settings" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <VlueSettingsPanel
            isDarkMode={isDarkMode}
            onToggleDarkMode={handleDarkModeToggle}
            subView={settingsSubView}
            onSubView={setSettingsSubView}
            onBackToMain={() => {
              setSettingsSubView(null);
              setPanelView("main");
            }}
            showSettingNotice={showSettingNotice}
            membershipTierLabel={tierUi.label}
            onOpenUpgrade={() => setUpgradeOpen(true)}
            isVCIDOn={isVCIDOn}
            hasDigitalCertCard={hasDigitalCertCard}
            onToggleVCID={onToggle}
            onMarkAllChatsRead={onMarkAllChatsRead}
            hasUnreadChats={hasUnreadChats}
            onLogout={() => setLogoutConfirmOpen(true)}
            onOpenWithdrawConsult={() => setWithdrawConsultOpen(true)}
            withdrawUnlocked={withdrawUnlocked}
            onOpenWithdrawTerms={() => setWithdrawTermsOpen(true)}
            onOpenPartnerInquiry={() => setPartnerInquiryOpen(true)}
            onOpenCustomerCenter={() => setPartnerInquiryOpen(true)}
            onOpenFamilyProtection={onOpenFamilyProtection}
            blockedUserIds={blockedUserIds}
            onUnblockUser={onUnblockUser}
            myPhone={myPhone || myCard?.phone || ""}
            myEmail={virtualEmail || "(미설정)"}
            membershipTier={membershipTier}
            companyName={companyLockedName}
            openLetteringBizcardHub={openLetteringBizcardHub}
          />
          </div>
        ) : panelView === "main" ? (
        <>
        <div className={`px-5 py-2 ${isDarkMode ? "text-gray-300" : ""}`}>
          <div className="vlue-profile-info">
            <div className="vlue-profile-info__row">
              <div className="vlue-profile-info__cell">
                <span className={`vlue-profile-info__label transition-colors duration-300 ${profileFieldLabelText}`}>ID</span>
                <span className={`vlue-profile-info__value tracking-tight ${headText}`}>{memberIdDisplay}</span>
              </div>
              <div className="vlue-profile-info__cell vlue-profile-info__cell--right">
                <span className={`vlue-profile-info__label transition-colors duration-300 ${profileFieldLabelText}`}>tel</span>
                <span className={`vlue-profile-info__value tabular-nums ${headText}`}>{profilePhoneDisplay}</span>
              </div>
            </div>
            <div className="vlue-profile-info__row">
              <div className="vlue-profile-info__cell">
                <span className={`vlue-profile-info__label transition-colors duration-300 ${profileFieldLabelText}`}>등급</span>
                <span className={`vlue-profile-info__value font-extrabold ${tierUi.className}`}>{tierUi.label}</span>
              </div>
              <label className="vlue-profile-info__cell vlue-profile-info__cell--right cursor-pointer">
                <span className={`vlue-profile-info__label transition-colors duration-300 ${profileFieldLabelText}`}>
                  인증명함 {isVCIDOn ? "켜짐" : "꺼짐"}
                </span>
                <div className="vlue-profile-info__toggle relative">
                  <input
                    type="checkbox"
                    checked={isVCIDOn}
                    onChange={(e) => onToggle(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`vlue-vcid-toggle-circle flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isVCIDOn
                        ? "border-blue-600 bg-blue-600 vlue-vcid-toggle-blink"
                        : isDarkMode
                          ? "border-gray-500 bg-gray-800"
                          : "border-gray-300 bg-gray-100"
                    }`}
                    aria-hidden
                  >
                    <span
                      className={`h-2 w-2 rounded-full bg-white transition-opacity duration-200 ${
                        isVCIDOn ? "opacity-90" : "opacity-0"
                      }`}
                    />
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div ref={mainPanelScrollRef} className="vlue-scroll-pad-profile-panel flex-1 overflow-y-auto px-6 py-6 no-scrollbar">
          {isCorporateAccount ? (
            <button
              type="button"
              onClick={() => {
                if (!enterpriseLineAccessChecked) {
                  showSettingNotice("기업 권한 확인 중입니다. 잠시만 기다려 주세요.");
                  return;
                }
                if (enterpriseLineAccess) {
                  setPanelView("enterpriseLines");
                  return;
                }
                showSettingNotice("기업 회선·직원 관리는 대표(또는 대리인)만 가능합니다.");
              }}
              className={`relative mb-4 flex w-full items-center justify-between gap-3 rounded-[26px] border-2 p-4 text-left shadow-sm transition-all active:scale-[0.98] ${
                enterpriseLineAccess
                  ? isDarkMode
                    ? "border-indigo-500/40 bg-indigo-500/15"
                    : "border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50"
                  : isDarkMode
                    ? "border-white/10 bg-white/5"
                    : "border-slate-200 bg-white"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className={`text-[15px] font-black leading-tight ${headText}`}>기업 관리</p>
                <p className={`mt-0.5 text-[11px] font-semibold ${subText}`}>
                  {enterpriseLineAccess
                    ? "회선·직원 목록 등록 · 수정 · 추가"
                    : "대표(또는 대리인) 전용 — 권한이 없으면 숨겨집니다"}
                </p>
              </div>
              <span className={`shrink-0 text-lg ${subText}`} aria-hidden>
                ›
              </span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setPanelView("broadcastSetup")}
            className={`relative mb-4 flex w-full items-center justify-between gap-3 rounded-[26px] border-2 p-4 text-left shadow-sm transition-all active:scale-[0.98] ${
              isDarkMode
                ? "border-teal-500/40 bg-teal-500/15"
                : "border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className={`text-[15px] font-black leading-tight ${headText}`}>영업용 명함 송출</p>
              <p className={`mt-0.5 text-[11px] font-semibold ${subText}`}>
                발신번호 등록 · 월 {broadcastMonthlyKrw.toLocaleString("ko-KR")}원(부가세 포함)
              </p>
            </div>
            <span className={`shrink-0 text-lg ${subText}`} aria-hidden>
              ›
            </span>
          </button>

          <MyPageDigitalLetteringSection
            isDarkMode={isDarkMode}
            membershipTier={membershipTier}
            digitalCardActive={digitalCardActive}
            digitalCardIssued={digitalCardIssued}
            isVCIDOn={isVCIDOn}
            onApplyDigitalCard={openLetteringBizcardHub}
            onEditLettering={openLetteringBizcardHub}
            onToast={(msg) => showSettingNotice(msg)}
          />

          <WalletRevealCard isDarkMode={isDarkMode} />

          <div className="relative z-[1] mt-6 grid grid-cols-2 gap-3 px-1">
            <button
              type="button"
              onClick={() => {
                if (canUseShoppingCartHub) {
                  setPanelView("shoppingCart");
                  return;
                }
                onOpenStoreCart?.();
                if (!onOpenStoreCart) {
                  showSettingNotice("무료 회원은 쇼핑 탭의 장바구니를 이용해 주세요.");
                }
              }}
              className={`relative flex min-h-[128px] flex-col justify-between rounded-[28px] p-4 text-left shadow-lg transition-all active:scale-95 ${
                canUseShoppingCartHub
                  ? "bg-gradient-to-br from-indigo-600 to-violet-600 shadow-indigo-500/25"
                  : "border-2 border-slate-200 bg-white shadow-sm"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                  canUseShoppingCartHub ? "bg-white/20" : "bg-indigo-50"
                }`}
              >
                <span className="text-xl" aria-hidden>
                  {canUseShoppingCartHub ? "🛒" : "🧺"}
                </span>
              </div>
              <div className="min-w-0">
                <p
                  className={`text-[14px] font-black leading-tight ${
                    canUseShoppingCartHub ? "text-white" : "text-gray-900"
                  }`}
                >
                  {canUseShoppingCartHub ? (
                    <>
                      쇼핑
                      <br />
                      카트
                    </>
                  ) : (
                    <>
                      스토어
                      <br />
                      장바구니
                    </>
                  )}
                </p>
                <p
                  className={`mt-1 text-[9px] font-bold ${
                    canUseShoppingCartHub ? "text-white/85" : "text-indigo-700"
                  }`}
                >
                  {canUseShoppingCartHub ? "구독·예약·결제·관심상품" : "쇼핑 탭 · 일반"}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onOpenWallet?.()}
              className="relative flex min-h-[128px] flex-col justify-between rounded-[28px] border-2 border-gray-100 bg-white p-4 text-left shadow-sm transition-all active:scale-95"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50">
                <span className="text-xl" aria-hidden>
                  📂
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-black leading-tight text-gray-900">
                  개인
                  <br />
                  자료실
                </p>
                <p className="mt-1 text-[9px] font-bold text-orange-700">명함 · 내 문서</p>
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenOfficeRemote?.()}
            className={`relative z-[1] mx-1 mt-3 flex w-[calc(100%-0.5rem)] items-center gap-3 rounded-[22px] border-2 p-4 text-left shadow-sm transition-all active:scale-[0.99] ${
              isDarkMode ? "border-white/10 bg-white/5" : "border-gray-100 bg-white"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg">
              🖨
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-[14px] font-black ${headText}`}>복합기 리모컨</p>
              <p className={`text-[10px] font-semibold ${subText}`}>PC 연동 · 인쇄 · 팩스</p>
            </div>
            <span className={`shrink-0 text-lg ${subText}`}>›</span>
          </button>

          <div className="relative mt-3 px-1">
            <div
              className={`flex items-center justify-between rounded-[28px] border p-4 ${
                isDarkMode
                  ? "border-white/10 bg-white/5"
                  : "border-blue-100/50 bg-blue-50/40"
              }`}
            >
              <div
                onClick={() => copyToClipboard("blue_user@vlue.kr")}
                className="flex min-w-0 flex-1 cursor-pointer flex-col active:opacity-60 transition-all group"
              >
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">Personal Mail</p>
                <p className="text-[15px] font-black tracking-tight text-gray-800 border-b-2 border-blue-200/50 group-hover:border-blue-400 transition-colors dark:text-gray-100">
                  user@vlue.kr
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEmailInbox?.();
                }}
                className={`shrink-0 rounded-2xl border p-3 shadow-sm active:scale-90 transition-all ${
                  isDarkMode ? "border-white/10 bg-white/10" : "border-blue-100 bg-white"
                }`}
                aria-label="통합 이메일함 열기"
              >
                ✉
              </button>
            </div>
            <div
              className={`pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full rounded-full bg-gray-800 px-4 py-1.5 text-[12px] text-white transition-opacity ${
                showCopied ? "opacity-100" : "opacity-0"
              }`}
            >
              메일주소가 복사되었습니다!
            </div>
          </div>

          {showVluerPartner ? (
            <VluerPartnerSection
              isDarkMode={isDarkMode}
              onForceMainView={() => setPanelView("main")}
            />
          ) : null}

          <div className="mt-6 px-1">
            <div className="bg-white rounded-[28px] p-5 border-2 border-gray-50 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-all">
              <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-lg">📍</span>
              </div>
              <div className="flex min-w-0 flex-col">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tight mb-0.5">Active Region</p>
                <p className="truncate whitespace-nowrap text-[clamp(13px,3.8vw,15px)] font-black tracking-tight text-gray-900">서울 강남구 역삼동</p>
              </div>
              <div className="ml-auto text-gray-300">›</div>
            </div>
          </div>

          <div
            className={`mt-6 mx-1 flex items-center justify-between gap-2 rounded-[28px] border-2 p-5 shadow-sm transition-all active:scale-[0.98] ${
              isDarkMode ? "border-white/10 bg-white/5" : "border-gray-50 bg-white"
            }`}
          >
            <div className="flex min-w-0 flex-nowrap items-baseline gap-x-2">
              <span className={`shrink-0 text-[14px] font-black ${headText}`}>등급:</span>
              <span className={`min-w-0 truncate text-[clamp(13px,3.5vw,14px)] font-extrabold ${tierUi.className}`}>
                {tierUi.label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setUpgradeOpen(true)}
              className="shrink-0 rounded-full bg-[#1a1c21] px-3 py-2 text-[10px] font-black tracking-tight text-white transition-colors hover:bg-black"
            >
              등급 변경
            </button>
          </div>

          <div className={`mx-1 mt-4 rounded-2xl border p-3 ${isDarkMode ? "border-white/10 bg-white/5" : "border-gray-100 bg-gray-50/90"}`}>
            <p className={`text-[12px] font-black ${headText}`}>프로필 이미지</p>
            <p className={`mt-0.5 text-[10px] ${subText}`}>대표 이미지가 채팅·활동·명함 기본값으로 쓰입니다. 슬롯별로 따로 넣으면 해당 영역에 우선합니다.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className={`cursor-pointer rounded-lg border px-2 py-1.5 text-[10px] font-bold ${isDarkMode ? "border-white/20 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                대표
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const u = await fileToDataUrl(f);
                    writeAvatar("primary", u);
                    setAvatarTick((n) => n + 1);
                    e.target.value = "";
                  }}
                />
              </label>
              <label className={`cursor-pointer rounded-lg border px-2 py-1.5 text-[10px] font-bold ${isDarkMode ? "border-white/20 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                채팅
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    writeAvatar("chat", await fileToDataUrl(f));
                    setAvatarTick((n) => n + 1);
                    e.target.value = "";
                  }}
                />
              </label>
              <label className={`cursor-pointer rounded-lg border px-2 py-1.5 text-[10px] font-bold ${isDarkMode ? "border-white/20 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                활동
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    writeAvatar("feed", await fileToDataUrl(f));
                    setAvatarTick((n) => n + 1);
                    e.target.value = "";
                  }}
                />
              </label>
              <label className={`cursor-pointer rounded-lg border px-2 py-1.5 text-[10px] font-bold ${isDarkMode ? "border-white/20 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                명함
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    writeAvatar("card", await fileToDataUrl(f));
                    setAvatarTick((n) => n + 1);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <VluerCodeChangeSidebar isDarkMode={isDarkMode} />

          <div className="mt-4 space-y-2 px-1">
            <button
              type="button"
              onClick={() => {
                onClose?.();
                onOpenCalendar?.();
              }}
              className={`relative flex w-full items-center justify-center rounded-[20px] border py-2.5 text-center text-[12px] font-black shadow-sm active:scale-[0.98] ${
                isDarkMode
                  ? "border-white/15 bg-white/5 text-gray-100 hover:bg-white/10"
                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              내 일정 · 그룹 캘린더
              {calendarBadgeCount > 0 ? (
                <span className="absolute right-3 top-1/2 flex h-5 min-w-[20px] -translate-y-1/2 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white">
                  {calendarBadgeCount > 9 ? "9+" : calendarBadgeCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => onOpenPageManager?.()}
              className="flex w-full items-center justify-center rounded-[20px] border border-blue-100 bg-blue-50 py-2.5 text-center text-[12px] font-black text-blue-700 shadow-sm active:scale-[0.98]"
            >
              페이지관리
            </button>
          </div>

          <div className="mt-8 mb-10 flex flex-col items-center justify-center gap-2">
            <div className="w-full h-[1px] bg-gray-100 mb-4 px-4"></div>
            <p className="text-[11px] font-bold text-gray-300 uppercase tracking-[0.2em]">Official Website</p>
            <a href="https://www.vlue.kr" target="_blank" rel="noreferrer" className="group flex items-center gap-1.5 active:scale-95 transition-all">
              <span className="text-[14px] font-black text-gray-400 group-hover:text-blue-500 transition-colors border-b border-gray-200 group-hover:border-blue-200">www.vlue.kr</span>
            </a>
            <p className="text-[10px] text-gray-300 mt-1">© VCID KOREA All rights reserved.</p>
            <p className="mt-2 max-w-[280px] px-2 text-center text-[9px] leading-relaxed text-gray-300">
              <a
                href="https://icons8.com/icon/gMWepjYoqP6M/eye"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 underline underline-offset-2 hover:text-blue-500"
              >
                명백한
              </a>{" "}
              icon by{" "}
              <a
                href="https://icons8.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 underline underline-offset-2 hover:text-blue-500"
              >
                Icons8
              </a>
            </p>
          </div>
          
        </div>
        </>
        ) : null}
        {settingNotice ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[90] flex justify-center px-4 pb-[max(14px,env(safe-area-inset-bottom,0px))] pt-2"
            role="status"
            aria-live="polite"
          >
            <p className="mx-auto w-fit max-w-full rounded-full bg-[#121212] px-5 py-2.5 text-center text-[12px] font-bold leading-snug text-white shadow-[0_8px_24px_rgba(0,0,0,0.38)] ring-1 ring-black/15">
              {settingNotice}
            </p>
          </div>
        ) : null}
      </aside>
      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 px-6" onMouseDown={() => setLogoutConfirmOpen(false)}>
          <div
            className={`relative w-full max-w-xs rounded-2xl border p-4 pt-12 shadow-2xl ${
              isDarkMode ? "border-white/10 bg-[#111827] text-gray-100" : "border-gray-100 bg-white text-gray-900"
            }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ModalCloseButton variant={isDarkMode ? "subtle" : "default"} onClick={() => setLogoutConfirmOpen(false)} />
            <p className="text-[15px] font-black">로그아웃 하시겠어요?</p>
            <p className={`mt-1 text-[12px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              현재 기기에서 로그인 상태가 종료됩니다.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className={`flex-1 rounded-xl py-2.5 text-[12px] font-bold ${
                  isDarkMode ? "bg-white/10 text-gray-200" : "bg-gray-100 text-gray-600"
                }`}
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  setLogoutConfirmOpen(false);
                  onLogout?.();
                  onClose?.();
                }}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-[12px] font-bold text-white"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      {withdrawConsultOpen && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/45 px-6" onMouseDown={() => setWithdrawConsultOpen(false)}>
          <div
            className={`relative w-full max-w-sm rounded-2xl border p-4 pt-12 shadow-2xl ${
              isDarkMode ? "border-white/10 bg-[#111827] text-gray-100" : "border-gray-100 bg-white text-gray-900"
            }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ModalCloseButton variant={isDarkMode ? "subtle" : "default"} onClick={() => setWithdrawConsultOpen(false)} />
            <p className="text-[15px] font-black">AI 상담 확인</p>
            <p className={`mt-1 text-[12px] leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              회원탈퇴는 오탈퇴 방지를 위해 AI 상담 확인 후에만 진행할 수 있습니다.
            </p>
            <ul className={`mt-3 space-y-1 text-[12px] ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              <li>• 탈퇴 시 계정 데이터는 복구되지 않을 수 있습니다.</li>
              <li>• 환불은 결제 수단/결제사 정책에 따라 처리됩니다.</li>
              <li>• 재가입 시 본인인증 및 인증명함 절차를 처음부터 다시 진행합니다.</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setWithdrawConsultOpen(false)}
                className={`flex-1 rounded-xl py-2.5 text-[12px] font-bold ${
                  isDarkMode ? "bg-white/10 text-gray-200" : "bg-gray-100 text-gray-600"
                }`}
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => {
                  setWithdrawGrantUntil(Date.now() + 10 * 60 * 1000);
                  setWithdrawConsultOpen(false);
                }}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-[12px] font-black text-white"
              >
                상담 확인 완료
              </button>
            </div>
          </div>
        </div>
      )}
      {partnerInquiryOpen && (
        <div className="fixed inset-0 z-[97] flex items-center justify-center bg-black/45 px-6" onMouseDown={() => setPartnerInquiryOpen(false)}>
          <div
            className={`relative w-full max-w-sm rounded-2xl border p-4 pt-12 shadow-2xl ${
              isDarkMode ? "border-white/10 bg-[#111827] text-gray-100" : "border-gray-100 bg-white text-gray-900"
            }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ModalCloseButton variant={isDarkMode ? "subtle" : "default"} onClick={() => setPartnerInquiryOpen(false)} />
            <p className="text-[15px] font-black">제휴문의</p>
            <button
              type="button"
              onClick={() => window.open("tel:01080144666", "_self")}
              className="mt-3 w-full rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-[12px] font-black text-blue-700 active:scale-[0.99]"
            >
              상담 전화 예약하기
            </button>
            <label className={`mt-3 block text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              문의 내용
              <textarea
                value={partnerInquiryBody}
                onChange={(e) => setPartnerInquiryBody(e.target.value)}
                placeholder="문의 내용을 입력해 주세요."
                maxLength={500}
                className={`mt-1 min-h-[100px] w-full rounded-xl border px-3 py-2 text-[12px] leading-relaxed outline-none ${
                  isDarkMode
                    ? "border-white/15 bg-[#1f2937] text-gray-100 placeholder:text-gray-500"
                    : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
                }`}
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPartnerInquiryOpen(false)}
                className={`flex-1 rounded-xl py-2.5 text-[12px] font-bold ${
                  isDarkMode ? "bg-white/10 text-gray-200" : "bg-gray-100 text-gray-600"
                }`}
              >
                취소
              </button>
              <button
                type="button"
                onClick={submitPartnerInquiry}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-[12px] font-black text-white"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      {partnerInquiryNotice ? (
        <div className="fixed inset-x-0 bottom-[calc(54px+env(safe-area-inset-bottom,0px)+12px)] z-[98] flex justify-center px-4">
          <p className="rounded-full bg-blue-600 px-4 py-2 text-center text-[11px] font-bold text-white shadow-lg">
            {partnerInquiryNotice}
          </p>
        </div>
      ) : null}
      {withdrawTermsOpen && (
        <div className="fixed inset-0 z-[97] flex items-center justify-center bg-black/55 px-6" onMouseDown={() => setWithdrawTermsOpen(false)}>
          <div
            className={`relative w-full max-w-sm rounded-2xl border p-4 pt-12 shadow-2xl ${
              isDarkMode ? "border-white/10 bg-[#111827] text-gray-100" : "border-gray-100 bg-white text-gray-900"
            }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ModalCloseButton variant={isDarkMode ? "subtle" : "default"} onClick={() => setWithdrawTermsOpen(false)} />
            <p className="text-[15px] font-black text-red-500">회원탈퇴 약관 동의</p>
            <p className={`mt-1 text-[12px] leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              아래 항목 모두 동의해야 탈퇴가 진행됩니다.
            </p>
            <div className="mt-3 space-y-2 text-[12px]">
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={agreeRefund} onChange={(e) => setAgreeRefund(e.target.checked)} className="mt-0.5" />
                <span>환불은 결제 정책 및 사용 이력 검토 후 처리되는 것에 동의합니다.</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={agreeReverify} onChange={(e) => setAgreeReverify(e.target.checked)} className="mt-0.5" />
                <span>재가입 시 본인인증/인증명함 발급 절차를 처음부터 다시 진행함에 동의합니다.</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={agreeFinal} onChange={(e) => setAgreeFinal(e.target.checked)} className="mt-0.5" />
                <span>탈퇴 후 데이터 복구가 제한될 수 있음을 확인했습니다.</span>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setWithdrawTermsOpen(false)}
                className={`flex-1 rounded-xl py-2.5 text-[12px] font-bold ${
                  isDarkMode ? "bg-white/10 text-gray-200" : "bg-gray-100 text-gray-600"
                }`}
              >
                취소
              </button>
              <button
                type="button"
                disabled={!canSubmitWithdraw}
                onClick={() => {
                  setWithdrawTermsOpen(false);
                  onWithdrawAccount?.();
                  onClose?.();
                }}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                탈퇴 진행
              </button>
            </div>
          </div>
        </div>
      )}
      <MembershipUpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        membershipTier={membershipTier}
        isDarkMode={isDarkMode}
        onMembershipTierChange={onMembershipTierChange}
        onRequestTierChange={onRequestTierChange}
      />
    </div>
  );
}

export default ProfilePanel;
