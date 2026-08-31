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
import EnterpriseDccApplyWizard from "./EnterpriseDccApplyWizard.jsx";
import BackButton from "./common/BackButton";
import { isBillableMembershipKind, normalizeMembershipKind } from "../lib/membershipBm.js";
import { pricingNumbers } from "../lib/pricingConfig.js";
import { probeEnterpriseSidebarAccess } from "../lib/enterpriseLineManageAccess.js";
import { fileToFittedAvatarDataUrl, readProfilePhotoAvatar, writeAvatar, scrubBrandAvatarsFromStorage } from "../lib/vlueAvatar.js";
import { AVATAR_IMAGE_GUIDE } from "../lib/fitImageFile.js";
import UserProfileAvatar from "./UserProfileAvatar.jsx";
import { getMemberHandle, getProfileHeaderName } from "../lib/memberCardStorage.js";
import { formatPhoneE164ForKoreaDisplay } from "../lib/phoneDisplay.js";
import { readLetteringFixedIdentity } from "../lib/letteringBizcardStorage.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import { fetchEmailForwardingMapping, readLocalLoginPrefix } from "../lib/vlueEmailMappingsApi.js";
import { membershipTierStyleClass, isFamilyProtectionActiveFromPeers } from "../lib/membershipTierDisplay.js";
import { v1AppShell } from "../lib/v1ReleaseScope.js";
import { SHOWCASE_OPEN_SETTINGS_EVENT } from "../lib/showcase/showcaseStyleStorage.js";
import { fetchFamilyProtection } from "../lib/familyProtectionApi.js";
import { familyPeersFromProtectionData } from "../lib/familyProtectionPeers.js";
import { pushAndroidBackHandler } from "../lib/androidBackStack.js";
import {
  readCachedActiveRegion,
  resolveActiveRegion
} from "../lib/activeRegion.js";
import { openNativeAppSettings } from "../lib/letteringSettings.js";
import { useDccFeatureAccess } from "../hooks/useDccFeatureAccess.js";
import { isDccSettingsDisabled } from "../lib/dccAccessPolicy.js";
import {
  canUseV1PaidDccFeatures,
  requestV1PaidPackageGate,
  V1_PAID_PACKAGE_UPGRADE_EVENT
} from "../lib/v1PaidPackageGate.js";
import { formatClientMembershipPathLabel, readFamilyPlanBeneficiary } from "../lib/effectiveMembership.js";
import { readDccBroadcastOn, readVcidBroadcastOn } from "../lib/bizcardAccountSync.js";

function tierLabelStyle(tier, isDarkMode, familyProtectionActive = false) {
  return membershipTierStyleClass(tier, isDarkMode, { familyProtectionActive });
}

/** 등급 칸 — 유료/무료만 (가족보호는 별도 버튼) */
function MembershipTierLabelText({ parts, className = "" }) {
  return <span className={className}>{parts?.base || parts?.label || ""}</span>;
}

/** 가족보호 상태 버튼 — 신청가능(앰버) ↔ 작동중(초록) */
function FamilyProtectionActionButton({ active, isDarkMode, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick?.()}
      className={`vlue-family-protect-btn mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-[13px] font-black tracking-tight shadow-sm transition-all duration-300 active:scale-[0.98] ${
        active
          ? isDarkMode
            ? "bg-emerald-500 text-white ring-1 ring-emerald-300/50"
            : "bg-emerald-500 text-white shadow-emerald-500/25"
          : isDarkMode
            ? "bg-amber-500 text-white ring-1 ring-amber-200/50"
            : "bg-amber-500 text-white shadow-amber-500/25"
      }`}
      aria-label={active ? "가족보호 작동중" : "가족보호 신청가능"}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-white/95" : "bg-white animate-pulse"}`}
        aria-hidden
      />
      {active ? "가족보호 작동중" : "가족보호 신청가능"}
    </button>
  );
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
  onPhoneUpdated,
  /** "profileSettings" → 설정 화면으로 진입 */
  initialView = "main",
  onMembershipTierChange,
  onRequestTierChange,
}) {
  const [familyPlanPathLabel, setFamilyPlanPathLabel] = useState(() => {
    const b = readFamilyPlanBeneficiary();
    return b?.active && b.pathLabel ? b.pathLabel : "";
  });
  const [isVCIDOn, setIsVCIDOn] = useState(false);
  const [dccBroadcastOn, setDccBroadcastOn] = useState(() => readDccBroadcastOn());
  const [showBroadcastName, setShowBroadcastName] = useState(true);
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
  const [familyProtectionActive, setFamilyProtectionActive] = useState(false);
  const { vluerLocked, membershipCtx } = useB2bMembership();
  const mainPanelScrollRef = useRef(null);
  const [virtualEmail, setVirtualEmail] = useState(null);
  const [virtualEmailConfigured, setVirtualEmailConfigured] = useState(false);
  const [activeRegionLabel, setActiveRegionLabel] = useState(
    () => readCachedActiveRegion()?.label || "위치 확인 중…"
  );
  const [activeRegionBusy, setActiveRegionBusy] = useState(false);
  const { access: dccAccess } = useDccFeatureAccess();
  const dccBlocked = isDccSettingsDisabled(dccAccess);

  const reloadVirtualEmail = useCallback(() => {
    fetchEmailForwardingMapping().then((data) => {
      const m = data.mapping || {};
      const fromApi = m.fullVirtualEmail || null;
      const prefix = m.loginPrefix || m.virtualEmailPrefix || readLocalLoginPrefix();
      const fallback = prefix ? `${prefix}@vlue.kr` : null;
      setVirtualEmail(fromApi || fallback);
      setVirtualEmailConfigured(Boolean(m.configured && fromApi));
    });
  }, []);

  const displayMailAddress = useMemo(() => {
    if (virtualEmail) return virtualEmail;
    const prefix = readLocalLoginPrefix();
    return prefix ? `${prefix}@vlue.kr` : "메일 설정 필요";
  }, [virtualEmail]);

  const companyLockedName = useMemo(
    () =>
      String(localStorage.getItem("vlue_company_locked") || "").trim() ||
      String(myCard?.organization || "").trim(),
    [myCard?.organization, open]
  );

  useEffect(() => {
    if (!open) return;
    reloadVirtualEmail();
  }, [open, panelView, settingsSubView, reloadVirtualEmail]);

  useEffect(() => {
    if (!open) return;
    const onMappingChanged = () => reloadVirtualEmail();
    window.addEventListener("vlue-email-mapping-changed", onMappingChanged);
    return () => window.removeEventListener("vlue-email-mapping-changed", onMappingChanged);
  }, [open, reloadVirtualEmail]);

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
  const hasDigitalCertCard =
    canUseV1PaidDccFeatures(membershipTier) &&
    Boolean(digitalCardActive) &&
    digitalCardIssued !== false;

  useEffect(() => {
    setIsVCIDOn(readVcidBroadcastOn());
    setDccBroadcastOn(readDccBroadcastOn());
    try {
      import("../lib/showcase/showcaseStyleStorage.js").then((m) => {
        const style = m.readShowcaseStyle?.() || m.readLiveShowcaseStyle?.() || {};
        setShowBroadcastName(style.showBroadcastName !== false);
      });
    } catch {
      setShowBroadcastName(true);
    }
  }, [open, hasDigitalCertCard]);

  useEffect(() => {
    const syncDccBroadcast = () => setDccBroadcastOn(readDccBroadcastOn());
    window.addEventListener("vlue-dcc-broadcast-changed", syncDccBroadcast);
    return () => window.removeEventListener("vlue-dcc-broadcast-changed", syncDccBroadcast);
  }, []);

  const onToggleBroadcastName = (next) => {
    const on = Boolean(next);
    setShowBroadcastName(on);
    try {
      import("../lib/showcase/showcaseStyleStorage.js").then((m) => {
        try {
          m.writeShowcaseStyle?.({ showBroadcastName: on });
          const live = m.readLiveShowcaseStyle?.();
          if (live) m.writeLiveShowcaseStyle?.({ ...live, showBroadcastName: on });
        } catch {
          /* ignore */
        }
      });
    } catch {
      /* ignore */
    }
    showSettingNotice(
      on
        ? "이름 송출 ON — 빅푸시에 이름이 표시됩니다."
        : "이름 송출 OFF — VLUE 인증회원으로만 표시됩니다."
    );
  };

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
    if (initialView === "passwordChange") {
      setPanelView("settings");
      setSettingsSubView("passwordChange");
      setDigitalCardMode("edit");
      setUpgradeOpen(false);
      return;
    }
    if (initialView === "phoneChange") {
      setPanelView("settings");
      setSettingsSubView("contactInfo");
      setDigitalCardMode("edit");
      setUpgradeOpen(false);
      return;
    }
    if (initialView === "digitalCardApply" || initialView === "digitalCardEdit" || initialView === "letteringBizcard") {
      if (dccBlocked) {
        setPanelView("main");
        setUpgradeOpen(false);
        return;
      }
      if (!canUseV1PaidDccFeatures(membershipTier)) {
        setPanelView("main");
        setUpgradeOpen(false);
        requestV1PaidPackageGate();
        return;
      }
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
    if (initialView === "showcaseStyle") {
      setPanelView("main");
      setUpgradeOpen(false);
      window.dispatchEvent(new Event(SHOWCASE_OPEN_SETTINGS_EVENT));
      return;
    }
    setPanelView("main");
    setDigitalCardMode("edit");
    setUpgradeOpen(false);
  }, [open, initialView, dccBlocked]);

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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const applyPeers = (peers) => {
      if (!cancelled) setFamilyProtectionActive(isFamilyProtectionActiveFromPeers(peers));
    };
    const refresh = async () => {
      try {
        const d = await fetchFamilyProtection();
        applyPeers(familyPeersFromProtectionData(d));
        const b = d?.familyPlanBeneficiary;
        setFamilyPlanPathLabel(b?.active && b.pathLabel ? b.pathLabel : "");
      } catch {
        if (!cancelled) {
          setFamilyProtectionActive(false);
          setFamilyPlanPathLabel("");
        }
      }
    };
    refresh();
    const onPeers = (ev) => applyPeers(ev?.detail);
    const onChanged = () => refresh();
    window.addEventListener("vlue-family-peers-updated", onPeers);
    window.addEventListener("vlue-family-protection-changed", onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("vlue-family-peers-updated", onPeers);
      window.removeEventListener("vlue-family-protection-changed", onChanged);
    };
  }, [open]);

  const broadcastMonthlyKrw = useMemo(() => pricingNumbers().broadcastMonthly, []);
  const tierUi = useMemo(() => {
    const base = tierLabelStyle(membershipTier, isDarkMode, familyProtectionActive);
    const pathLabel = formatClientMembershipPathLabel(membershipTier);
    if (pathLabel && pathLabel !== "유료" && pathLabel !== "무료" && pathLabel !== "B2B") {
      return {
        ...base,
        label: pathLabel,
        parts: { ...base.parts, base: pathLabel, label: pathLabel }
      };
    }
    return base;
  }, [membershipTier, isDarkMode, familyProtectionActive, familyPlanPathLabel]);
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
    () => v1AppShell.vluerPartnerSection && enterpriseLineAccessChecked && !isCorporateAccount,
    [enterpriseLineAccessChecked, isCorporateAccount]
  );
  const headerName = useMemo(
    () => getProfileHeaderName(String(myCard?.name || "").trim()),
    [myCard?.name, nickTick, open]
  );
  const memberIdDisplay = getMemberHandle();
  const profilePhoneDisplay = useMemo(() => {
    const fromIdentity = String(readLetteringFixedIdentity().phone || "").trim();
    const raw = String(fromIdentity || myPhone || myCard?.phone || "").trim();
    const formatted = formatPhoneE164ForKoreaDisplay(raw);
    return formatted || raw || "—";
  }, [myPhone, myCard?.phone, open]);
  const headText = isDarkMode ? "text-gray-100" : "text-gray-900";
  const subText = isDarkMode ? "text-gray-400" : "text-gray-400";
  const profileFieldLabelText = isVCIDOn
    ? isDarkMode
      ? "text-blue-400"
      : "text-blue-600"
    : subText;
  /** 사용자가 올린 프로필 사진만 — 회사 로고·VLUE 브랜드와 혼용하지 않음 */
  const primaryAva = useMemo(() => {
    scrubBrandAvatarsFromStorage();
    return readProfilePhotoAvatar();
  }, [avatarTick, open]);

  const handleHeaderClose = useCallback(() => {
    if (upgradeOpen) {
      setUpgradeOpen(false);
      return;
    }
    if (logoutConfirmOpen) {
      setLogoutConfirmOpen(false);
      return;
    }
    if (withdrawConsultOpen) {
      setWithdrawConsultOpen(false);
      return;
    }
    if (withdrawTermsOpen) {
      setWithdrawTermsOpen(false);
      return;
    }
    if (partnerInquiryOpen) {
      setPartnerInquiryOpen(false);
      return;
    }
    if (panelView === "settings" && settingsSubView) {
      setSettingsSubView(null);
      return;
    }
    if (panelView !== "main") {
      setPanelView("main");
      return;
    }
    onClose?.();
  }, [
    upgradeOpen,
    logoutConfirmOpen,
    withdrawConsultOpen,
    withdrawTermsOpen,
    partnerInquiryOpen,
    panelView,
    settingsSubView,
    onClose
  ]);

  useEffect(() => {
    if (!open) return undefined;
    return pushAndroidBackHandler(() => {
      handleHeaderClose();
      return true;
    });
  }, [open, handleHeaderClose]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setActiveRegionBusy(true);
    resolveActiveRegion().then((r) => {
      if (cancelled) return;
      setActiveRegionLabel(r.label || "위치를 확인할 수 없습니다");
      setActiveRegionBusy(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const refreshActiveRegion = useCallback(() => {
    setActiveRegionBusy(true);
    setActiveRegionLabel("위치 확인 중…");
    resolveActiveRegion().then((r) => {
      setActiveRegionLabel(r.label || "위치를 확인할 수 없습니다");
      setActiveRegionBusy(false);
      if (r.error === "denied") {
        setSettingNotice("위치 권한이 필요합니다. 앱 설정 화면으로 이동합니다.");
        openNativeAppSettings();
      } else if (r.error === "unavailable" || r.error === "timeout") {
        setSettingNotice(
          r.error === "timeout"
            ? "위치 수신이 지연됩니다. 야외·GPS 켠 뒤 다시 탭해 주세요."
            : "앱 위치 권한은 허용됐지만 GPS/위치 서비스가 꺼져 있거나 수신이 안 됩니다. 폰 설정에서 위치(GPS)를 켠 뒤 다시 탭해 주세요."
        );
      }
    });
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

  useEffect(() => {
    const onUpgrade = () => setUpgradeOpen(true);
    window.addEventListener(V1_PAID_PACKAGE_UPGRADE_EVENT, onUpgrade);
    return () => window.removeEventListener(V1_PAID_PACKAGE_UPGRADE_EVENT, onUpgrade);
  }, []);

  const onToggle = (next) => {
    const paidDcc = canUseV1PaidDccFeatures(membershipTier);
    setIsVCIDOn(next);
    localStorage.setItem("vcid", String(next));
    try {
      import("../lib/bizcardAccountSync.js").then((m) => {
        try {
          if (paidDcc) m.writeDccBroadcastOn?.(Boolean(next));
        } catch {
          /* ignore */
        }
      });
    } catch {
      /* ignore */
    }
    try {
      import("../lib/showcase/showcaseStyleStorage.js").then((m) => {
        try {
          const patch = paidDcc ? { includeDigitalCard: Boolean(next) } : { includeDigitalCard: false };
          m.writeShowcaseStyle?.(patch);
          const live = m.readLiveShowcaseStyle?.();
          if (live) m.writeLiveShowcaseStyle?.({ ...live, ...patch });
        } catch {
          /* ignore */
        }
      });
    } catch {
      /* ignore */
    }
    try {
      window.dispatchEvent(new Event("vlue-vcid-changed"));
    } catch {
      /* ignore */
    }
    showSettingNotice(next ? "통화 중 쇼케이스가 송출됩니다." : "통화 중 쇼케이스 송출이 꺼졌습니다. 이름 표시만 선택할 수 있습니다.");
  };

  const onToggleDccBroadcast = useCallback(
    (next) => {
      if (!canUseV1PaidDccFeatures(membershipTier)) {
        requestV1PaidPackageGate();
        return;
      }
      setDccBroadcastOn(Boolean(next));
      try {
        import("../lib/bizcardAccountSync.js").then((m) => {
          m.writeDccBroadcastOn?.(Boolean(next));
        });
      } catch {
        /* ignore */
      }
      try {
        import("../lib/showcase/showcaseStyleStorage.js").then((m) => {
          m.writeShowcaseStyle?.({ includeDigitalCard: Boolean(next) });
          const live = m.readLiveShowcaseStyle?.();
          if (live) m.writeLiveShowcaseStyle?.({ ...live, includeDigitalCard: Boolean(next) });
        });
      } catch {
        /* ignore */
      }
      try {
        window.dispatchEvent(new Event("vlue-vcid-changed"));
      } catch {
        /* ignore */
      }
      showSettingNotice(
        next ? "디지털인증명함 송출이 켜졌습니다." : "디지털인증명함 송출이 꺼졌습니다."
      );
    },
    [membershipTier, showSettingNotice]
  );

  const openLetteringBizcardHub = useCallback(() => {
    if (dccBlocked) {
      showSettingNotice(dccAccess?.message || "디지털인증명함을 이용할 수 없습니다.");
      return;
    }
    if (!canUseV1PaidDccFeatures(membershipTier)) {
      requestV1PaidPackageGate();
      return;
    }
    setPanelView("letteringBizcard");
  }, [dccBlocked, dccAccess?.message, membershipTier, showSettingNotice]);

  const handleApplyDigitalCard = useCallback(() => {
    if (dccBlocked) {
      showSettingNotice(dccAccess?.message || "디지털인증명함을 이용할 수 없습니다.");
      return;
    }
    if (!canUseV1PaidDccFeatures(membershipTier)) {
      requestV1PaidPackageGate();
      return;
    }
    openLetteringBizcardHub();
  }, [dccBlocked, dccAccess?.message, membershipTier, openLetteringBizcardHub, showSettingNotice]);

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
  const hideProfileTopChrome = panelView === "letteringBizcard";

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
    <div className={`fixed inset-0 ${open ? "z-[160]" : "z-[70] pointer-events-none"}`}>
      <button className={`absolute inset-0 bg-black/30 transition ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <aside
        id="profile-menu"
        className={`absolute right-0 top-0 h-full w-[85%] max-w-[340px] shadow-2xl flex flex-col overflow-hidden transition-all duration-300 border-l ${
          isDarkMode ? "border-white/10 bg-[#111827]" : "border-gray-100 bg-white"
        } ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {hideProfileTopChrome ? null : (
        <div
          className={`px-5 py-2.5 flex justify-between items-center shrink-0 border-b ${isDarkMode ? "border-white/10" : "border-gray-50"}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`h-9 w-9 shrink-0 rounded-full border overflow-hidden flex items-center justify-center ${
                isDarkMode ? "border-white/15" : "border-gray-200"
              }`}
              aria-label={primaryAva ? "프로필 사진" : "프로필 미설정"}
            >
              <UserProfileAvatar src={primaryAva} />
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
          <button onClick={handleHeaderClose} className={`p-2 text-2xl ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
            ✕
          </button>
        </div>
        )}

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
        ) : panelView === "enterpriseDcc" ? (
          <EnterpriseDccApplyWizard
            isDarkMode={isDarkMode}
            onBack={() => setPanelView("main")}
            onToast={showSettingNotice}
            onRequestPayment={() => {
              setUpgradeOpen(true);
              showSettingNotice("승인 완료 · 유료 결제 후 디지털 인증명함이 활성화됩니다.");
            }}
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
        ) : panelView === "shoppingCart" && v1AppShell.shoppingCart ? (
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
            dccBroadcastOn={dccBroadcastOn}
            onToggleDccBroadcast={onToggleDccBroadcast}
            onToggleVCID={onToggle}
            showBroadcastName={showBroadcastName}
            onToggleBroadcastName={onToggleBroadcastName}
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
            onPhoneUpdated={onPhoneUpdated}
            myEmail={displayMailAddress}
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
                <MembershipTierLabelText
                  parts={tierUi.parts}
                  className={`vlue-profile-info__value font-extrabold ${tierUi.className}`}
                />
              </div>
              <label className="vlue-profile-info__cell vlue-profile-info__cell--right cursor-pointer">
                <span className={`vlue-profile-info__label transition-colors duration-300 ${profileFieldLabelText}`}>
                  쇼케이스 {isVCIDOn ? "켜짐" : "꺼짐"}
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
          {v1AppShell.familyProtection && tierUi.parts?.familyStatus ? (
            <FamilyProtectionActionButton
              active={familyProtectionActive}
              isDarkMode={isDarkMode}
              onClick={() => {
                onClose?.();
                onOpenFamilyProtection?.();
              }}
            />
          ) : null}
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
            onClick={() => setPanelView("enterpriseDcc")}
            className={`relative mb-4 flex w-full items-center justify-between gap-3 rounded-[26px] border-2 p-4 text-left shadow-sm transition-all active:scale-[0.98] ${
              isDarkMode
                ? "border-blue-500/40 bg-blue-500/15"
                : "border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className={`text-[15px] font-black leading-tight ${headText}`}>기업·대표번호 인증명함</p>
              <p className={`mt-0.5 text-[11px] font-semibold ${subText}`}>
                사업자 검증 · 관계자 인증 · 승인 후 발급·결제
              </p>
            </div>
            <span className={`shrink-0 text-lg ${subText}`} aria-hidden>
              ›
            </span>
          </button>

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
            dccBlocked={dccBlocked}
            dccBlockMessage={dccAccess?.message || ""}
            onApplyDigitalCard={handleApplyDigitalCard}
            onEditLettering={openLetteringBizcardHub}
            onOpenShowcaseStyle={() => {
              onClose?.();
              window.dispatchEvent(new Event(SHOWCASE_OPEN_SETTINGS_EVENT));
            }}
            onToast={(msg) => showSettingNotice(msg)}
          />

          {v1AppShell.walletCash ? <WalletRevealCard isDarkMode={isDarkMode} /> : null}

          <div
            className={`relative z-[1] mt-6 grid gap-3 px-1 ${
              v1AppShell.shoppingCart ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {v1AppShell.shoppingCart ? (
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
            ) : null}
            {v1AppShell.personalVault ? (
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
                  케이스
                </p>
                <p className="mt-1 text-[9px] font-bold text-orange-700">명함저장 · 저장된케이스 · 내문서</p>
              </div>
            </button>
            ) : null}
          </div>

          {v1AppShell.printerRemote ? (
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
          ) : null}

          {v1AppShell.personalMail ? (
          <div className="relative mt-3 px-1">
            <div
              className={`relative flex items-center justify-between rounded-[28px] border p-4 ${
                isDarkMode
                  ? "border-white/10 bg-white/5"
                  : "border-blue-100/50 bg-blue-50/40"
              }`}
            >
              {showCopied ? (
                <div
                  className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center"
                  role="status"
                  aria-live="polite"
                >
                  <span className="whitespace-nowrap rounded-full bg-gray-800 px-4 py-1.5 text-[12px] font-medium text-white shadow-lg">
                    메일주소가 복사되었습니다!
                  </span>
                </div>
              ) : null}
              <div
                onClick={() => {
                  if (!virtualEmail && !readLocalLoginPrefix()) {
                    setSettingsSubView("vlueEmailSettings");
                    setPanelView("settings");
                    return;
                  }
                  copyToClipboard(displayMailAddress);
                }}
                className="flex min-w-0 flex-1 cursor-pointer flex-col active:opacity-60 transition-all group"
              >
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">Personal Mail</p>
                <p className="truncate text-[15px] font-black tracking-tight text-gray-800 border-b-2 border-blue-200/50 group-hover:border-blue-400 transition-colors dark:text-gray-100">
                  {displayMailAddress}
                </p>
                {!virtualEmailConfigured && displayMailAddress !== "메일 설정 필요" ? (
                  <p className={`mt-1 text-[10px] font-medium ${subText}`}>탭하여 적용 · 메일 설정에서 저장</p>
                ) : null}
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
          </div>
          ) : null}

          {showVluerPartner ? (
            <VluerPartnerSection
              isDarkMode={isDarkMode}
              onForceMainView={() => setPanelView("main")}
            />
          ) : null}

          <div className="mt-6 px-1">
            <button
              type="button"
              onClick={refreshActiveRegion}
              disabled={activeRegionBusy}
              className="flex w-full items-center gap-3 rounded-[28px] border-2 border-gray-50 bg-white p-5 shadow-sm transition-all active:scale-[0.98] disabled:opacity-70"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-red-50">
                <span className="text-lg">📍</span>
              </div>
              <div className="flex min-w-0 flex-col text-left">
                <p className="mb-0.5 text-[11px] font-bold uppercase tracking-tight text-gray-400">Active Region</p>
                <p className="truncate whitespace-nowrap text-[clamp(13px,3.8vw,15px)] font-black tracking-tight text-gray-900">
                  {activeRegionBusy ? "위치 확인 중…" : activeRegionLabel}
                </p>
              </div>
              <div className="ml-auto text-gray-300">›</div>
            </button>
          </div>

          <div
            className={`mt-6 mx-1 flex items-center justify-between gap-2 rounded-[28px] border-2 p-5 shadow-sm transition-all active:scale-[0.98] ${
              isDarkMode ? "border-white/10 bg-white/5" : "border-gray-50 bg-white"
            }`}
          >
            <div className="flex min-w-0 flex-nowrap items-baseline gap-x-2">
              <span className={`shrink-0 text-[14px] font-black ${headText}`}>등급:</span>
              <MembershipTierLabelText
                parts={tierUi.parts}
                className={`min-w-0 truncate text-[clamp(13px,3.5vw,14px)] font-extrabold ${tierUi.className}`}
              />
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
            <p className={`mt-0.5 text-[10px] ${subText}`}>
              프로필 사진은 헤더·쇼케이스·마이케이스에 함께 반영됩니다. 회사 로고는 디지털인증명함 설정에서 바꿔 주세요.
            </p>
            <p className={`mt-1 text-[10px] leading-snug ${subText}`} style={{ wordBreak: "keep-all" }}>
              {AVATAR_IMAGE_GUIDE.uploadHint}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className={`cursor-pointer rounded-lg border px-2 py-1.5 text-[10px] font-bold ${isDarkMode ? "border-white/20 text-gray-200" : "border-gray-200 text-gray-700"}`}>
                프로필 사진
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const u = await fileToFittedAvatarDataUrl(f);
                      writeAvatar("primary", u);
                      setAvatarTick((n) => n + 1);
                    } catch {
                      /* ignore */
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          {v1AppShell.referralProgram ? <VluerCodeChangeSidebar isDarkMode={isDarkMode} /> : null}

          {v1AppShell.chat || !v1AppShell.vaultTabsMinimal ? (
          <div className="mt-4 space-y-2 px-1">
            {!v1AppShell.vaultTabsMinimal || v1AppShell.chat ? (
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
            ) : null}
            {v1AppShell.mypageShop ? (
            <button
              type="button"
              onClick={() => onOpenPageManager?.()}
              className="flex w-full items-center justify-center rounded-[20px] border border-blue-100 bg-blue-50 py-2.5 text-center text-[12px] font-black text-blue-700 shadow-sm active:scale-[0.98]"
            >
              페이지관리
            </button>
            ) : null}
          </div>
          ) : null}

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
            className="pointer-events-none absolute inset-x-0 z-[90] flex justify-center px-3"
            style={{ bottom: "max(5.75rem, calc(env(safe-area-inset-bottom, 0px) + 4.75rem))" }}
            role="status"
            aria-live="polite"
          >
            <p className="mx-auto max-w-[min(100%,20rem)] rounded-2xl bg-[#121212] px-4 py-2.5 text-center text-[12px] font-bold leading-snug text-white shadow-[0_8px_24px_rgba(0,0,0,0.38)] ring-1 ring-black/15 break-keep">
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
                onClick={async () => {
                  const { requirePinForSensitiveAction } = await import("../lib/appLockBridge.js");
                  const auth = await requirePinForSensitiveAction("profile_edit");
                  if (!auth.ok) return;
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
