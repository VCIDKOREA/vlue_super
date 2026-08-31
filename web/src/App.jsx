import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ChatList from "./components/ChatList";
import ChatListTabDropdown from "./components/ChatListTabDropdown.jsx";
import ChatListChannelSwitch from "./components/mailTalk/ChatListChannelSwitch.jsx";
import MailTalkRoomList from "./components/mailTalk/MailTalkRoomList.jsx";
import MailTalkRoomView from "./components/mailTalk/MailTalkRoomView.jsx";
import MailTalkComposeModal from "./components/mailTalk/MailTalkComposeModal.jsx";
import MailTalkElectronShell from "./components/mailTalk/MailTalkElectronShell.jsx";
import ChatRoom from "./components/ChatRoom";
import BlueAIChat from "./components/BlueAIChat";
import FriendSearch from "./components/FriendSearch";
import ContactSyncConsentModal from "./components/ContactSyncConsentModal.jsx";
import AppRuntimePermissionsModal from "./components/AppRuntimePermissionsModal.jsx";
import FeedManager from "./components/FeedManager";
import Home from "./components/Home";
import MyPage from "./components/MyPage";
import MyCaseScreen from "./components/mycase/MyCaseScreen.jsx";
import VlueCalendarScreen from "./components/calendar/VlueCalendarScreen.jsx";
import PersonalMemoScreen from "./components/memo/PersonalMemoScreen.jsx";
import MemoShareReceiveSheet from "./components/memo/MemoShareReceiveSheet.jsx";
import { readCalendarBadge, setCalendarBadge, clearCalendarBadge } from "./lib/calendarStorage.js";
import { fetchMemoMeta, receiveShareMemo } from "./lib/memoApi.js";
import { LOCAL_MEMO_CHANGED } from "./lib/localMemoStorage.js";
import { OPEN_CALENDAR_EVENT_KEY } from "./lib/calendarConstants.js";
import { SHOWCASE_OPEN_SETTINGS_EVENT } from "./lib/showcase/showcaseStyleStorage.js";
import { LETTERING_OPEN_BIZCARD_SETTINGS_EVENT } from "./lib/letteringBizcardStorage.js";
import { OPEN_POS_DASHBOARD_KEY, requestOpenFamilyProtectionTab } from "./lib/posDashboardConstants.js";
import { publishCalendarAsRoomNotice } from "./lib/chatRoomNoticeService.js";
import BetaLaunchGuide from "./components/BetaLaunchGuide.jsx";
import Subscription from "./components/Subscription.jsx";
import WalletHubModal from "./components/WalletHubModal.jsx";
import AppNotificationSheet from "./components/AppNotificationSheet.jsx";
import ShowcaseStyleSettingsSheet from "./components/showcase/ShowcaseStyleSettingsSheet.jsx";
import OwnShowcaseSlideOverlay from "./components/showcase/OwnShowcaseSlideOverlay.jsx";
import HashtagSearchPopup from "./components/showcase/HashtagSearchPopup.jsx";
import UserCaseArchiveView from "./components/mycase/UserCaseArchiveView.jsx";
import CallShowcaseHistorySheet from "./components/CallShowcaseHistorySheet.jsx";
import { getLocalVlueUserId } from "./lib/showcase/resolveShowcaseOwnerUserId.js";
import { dispatchCloseShowcaseOverlays } from "./lib/showcase/closeShowcaseOverlays.js";
import OfficeRemoteModal from "./components/office/OfficeRemoteModal.jsx";
import PersonalFeed from "./components/PersonalFeed";
import ProfilePanel from "./components/ProfilePanel";
import V1PaidPackageGateModal from "./components/V1PaidPackageGateModal.jsx";
import {
  canUseV1PaidDccFeatures,
  requestMembershipUpgradePanel,
  V1_PAID_PACKAGE_GATE_EVENT
} from "./lib/v1PaidPackageGate.js";
import { readMembershipTier } from "./lib/bizcardAccountSync.js";
import VlueEmailSettingsSection from "./components/settings/VlueEmailSettingsSection.jsx";
import VluePillToast from "./components/VluePillToast.jsx";
import PushNotificationInbox from "./components/PushNotificationInbox.jsx";
import {
  readRoomPrefs,
  CHAT_ROOM_PREFS_CHANGED,
  toggleRoomPinned,
  setRoomDisplayName,
  toggleRoomMuted,
  setRoomHidden,
  scheduleAutoRequestVming
} from "./lib/chatRoomPrefsStorage.js";
import { addPushNotification, countUnreadPush, PUSH_INBOX_CHANGED } from "./lib/pushNotificationInbox.js";
import { syncOwnerInboxFromServer } from "./lib/ownerInboxSync.js";
import { deliverLocalPushNotification, postAndroidFamilyInviteNotification, postAndroidSystemNotification } from "./lib/androidSystemNotification.js";
import Splash from "./components/Splash";
import VlueOnboarding from "./components/VlueOnboarding";
import PostSignupPaymentModal from "./components/PostSignupPaymentModal.jsx";
import LineBillingGraceModal from "./components/LineBillingGraceModal.jsx";
import ParentalConsentApproveModal from "./components/ParentalConsentApproveModal.jsx";
import { fetchPendingParentalConsents } from "./lib/parentalConsentApi.js";
import { bindFcmForegroundListener, registerFcmWebPushToken } from "./lib/fcmWebPush.js";
import {
  bindNativeFcmTokenListener,
  isNativeFcmAvailable,
  registerNativeFcmPushToken
} from "./lib/fcmNativeRegister.js";
import SignupErrorBoundary from "./components/SignupErrorBoundary.jsx";
import LoginScreen from "./components/LoginScreen";
import AppLockPinResetModal, { useAppLockResetListener } from "./components/AppLockPinResetModal.jsx";
import { isPasswordChangeCertPending, readPasswordChangeResume } from "./lib/passwordChangeApi.js";
import { isPhoneChangeCertPending, readPhoneChangeResume } from "./lib/phoneChangeApi.js";
import { GUEST_PROTECTED_SUBHUB_TABS, runWithGuestAuthGate } from "./lib/guestAuthGate.js";
import { VlueNavLogoMark } from "./components/VlueNavLogoMark.jsx";
import BackButton from "./components/common/BackButton";
import ModalCloseButton from "./components/common/ModalCloseButton";

const CsScannerScreen = lazy(() => import("./components/office/CsScannerScreen.jsx"));
const BizcardScannerScreen = lazy(() => import("./components/office/BizcardScannerScreen.jsx"));
const VlueUnifiedInboxScreen = lazy(() => import("./components/email/VlueUnifiedInboxScreen.jsx"));
import UserProfileAvatar from "./components/UserProfileAvatar.jsx";
import { clearBiometricSessionOnly } from "./lib/webauthnBiometric";
import {
  getDefaultMemberVlueEmail,
  readCardEmail,
  readCardEmailKind,
  readCardFax,
  readCardPromo,
  scrubBrandDisplayName
} from "./lib/memberCardStorage.js";
import { readCardWallet, writeCardWallet, buildCardSnapshot } from "./lib/cardWalletStorage.js";
import { saveProfileToDeviceContacts } from "./lib/contactVcfSave.js";
import {
  markContactSyncPending,
  readContactMatchCache,
  shouldShowContactSyncPrompt
} from "./lib/contactSyncStorage.js";
import {
  markRuntimePermissionsPending,
  shouldShowRuntimePermissionsPrompt
} from "./lib/appRuntimePermissions.js";
import { upsertKnownPhonesFromFriends } from "./lib/contacts/knownPhonesIndex.js";
import { syncDeviceContactsFromNative } from "./lib/contacts/deviceContactsCache.js";
import { effectiveCardJobTitle } from "./lib/jobTitleVerify.js";
import { readAvatar, readProfilePhotoAvatar } from "./lib/vlueAvatar.js";
import { fetchActiveMarketingPopup, fetchLatestNotice } from "./lib/vlueOfficeApi.js";
import MarketingPopupModal, { shouldShowMarketingPopup } from "./components/marketing/MarketingPopupModal.jsx";
import NoticeDetailSheet, { NoticeReleaseToast } from "./components/marketing/NoticeReleaseUI.jsx";
import VmingUpgradePromptModal from "./components/vming/VmingUpgradePromptModal.jsx";
import {
  readAppMode,
  writeAppMode,
  readActiveOfficeCardId,
  writeActiveOfficeCardId,
  forcePersonalMode
} from "./lib/vlueOfficeMode.js";
import { startVlueSse, VLUE_SSE_CHAT_MESSAGE } from "./lib/vlueSse.js";
import {
  fetchMailTalkRooms,
  isMailTalkRoomId,
  mailTalkNavRoomId,
  mailTalkRoomIdFromNav
} from "./lib/mailTalkApi.js";
import {
  getElectronRoomBootParams,
  isElectronRoomWindow,
  openElectronExternalSignup,
  openElectronRoomWindow,
  shouldOpenSignupInExternalBrowser
} from "./lib/electronBridge.js";
import { emitAssetFilesChanged, emitOfficeEmailInboxChanged } from "./lib/vlueAssetFilesStorage.js";
import { emitEmailInboxChanged } from "./lib/vlueEmailMappingsApi.js";
import { startFamilyProtectionPresence } from "./lib/familyProtectionPresence.js";
import { registerFamilyCallBridge } from "./lib/familyProtectionCallBridge.js";
import { registerFamilyDeviceBridge } from "./lib/familyProtectionDeviceBridge.js";
import { registerDocumentOcrBridge } from "./lib/documentOcrBridge.js";
import { registerMlKitTranslationBridge } from "./lib/mlKitTranslationBridge.js";
import { registerPosOcrBridge } from "./lib/posBillNativeOcr.js";
import { promptIosChildWardNoticeOnce } from "./lib/familyPlatformCapabilities.js";
import FamilyIosRestrictedDialog from "./components/FamilyIosRestrictedDialog.jsx";
import { registerFamilyNativeRelay } from "./lib/familyProtectionNativeRelay.js";
import { installFamilySiteGuard, setFamilyChildWardActive } from "./lib/familyProtectionSiteGuard.js";
import { fetchFamilyProtection } from "./lib/familyProtectionApi.js";
import { requestOpenMyPageComposer } from "./lib/pageProfileStorage.js";
import {
  dispatchPushToShopSubscribers,
  getCurrentUserId,
  SHOP_OWNER_POSTED,
  SHOP_PUSH_TO_SUBSCRIBER
} from "./lib/shopPushStorage.js";
import { familyPeersFromProtectionData, roomMatchesFamilyPeer } from "./lib/familyProtectionPeers.js";
import {
  demoFamilyMetaForRoom,
  getDemoFamilyPeers,
  getDemoFamilyRoomIds,
  mergeFamilyPeers
} from "./lib/familyProtectionDemo.js";
import { apiUrl } from "./lib/apiBase.js";
import { readStoreFeedTab, writeStoreFeedTab, STORE_FEED_PREFS_CHANGED } from "./lib/storeFeedPrefs.js";
import { v1AppShell, coerceAppPageForV1, isAppPageV1Enabled } from "./lib/v1ReleaseScope.js";
import { getDeviceToken, saveDeviceToken, clientKindHeaders, detectAuthPlatform } from "./lib/deviceAuth.js";
import { runUnifiedSearch, tabForRoom } from "./lib/appUnifiedSearch.js";
import {
  vlueAuthHeaders,
  vlueAuthFetch,
  setVlueSessionTokens,
  clearVlueSessionTokens,
  syncNativeAuthSession,
  getRefreshToken
} from "./lib/vlueAuthHeaders.js";
import { fetchKakaoUserMeClient, getKakaoAccessTokenWithLogin } from "./lib/kakaoSocialLogin.js";
import { consumeSocialOAuthReturn } from "./lib/socialOAuthReturn.js";
import { consumeInstagramLinkReturn } from "./lib/instagramLinkApi.js";
import { consumeKakaoLinkReturn } from "./lib/kakaoLinkApi.js";
import { formatSocialLoginError, isSnsUnlinkedError } from "./lib/socialLoginPolicy.js";
import { VLUE_MARKETING_SIGNUP_KEY, withdrawVlueAccount } from "./lib/vlueAuthApi.js";
import LetteringNotificationPreviewPage from "./components/LetteringNotificationPreviewPage.jsx";
import LetteringOverlayHost from "./components/LetteringOverlayHost.jsx";
import LetteringCertModal from "./components/LetteringCertModal.jsx";
import { readLetteringEnabled, writeLetteringEnabled } from "./lib/letteringSettings.js";
import { readLetteringFixedIdentity } from "./lib/letteringBizcardStorage.js";
import { B2bMembershipProvider } from "./context/B2bMembershipContext.jsx";
import { ShowcaseBgmProvider } from "./context/ShowcaseBgmContext.jsx";
import { runAndroidBackHandlers } from "./lib/androidBackStack.js";
import { normalizeMembershipKind, isBillableMembershipKind, PAID_EVENT_MONTHLY_KRW } from "./lib/membershipBm.js";
import { writePendingPayment, readPendingPayment } from "./lib/postSignupPayment.js";
import { readEffectiveMembershipTier } from "./lib/effectiveMembership.js";
import { clearAccountScopedLocalStorage } from "./lib/clearAccountScopedLocalStorage.js";
import { persistDccAccessHintsFromSession } from "./lib/dccAccessSession.js";

const ONBOARDING_DONE_KEY = "vlue_onboarding_complete_v1";
/** "1" 발급·활성, "0" 가입 시 미신청, 미설정은 기존 사용자용(온보딩 완료면 명함 있음으로 간주) */
const DIGITAL_CARD_ACTIVE_KEY = "vlue_digital_card_active";
const SERVER_DM_ROOM_MAP_KEY = "vlue_server_dm_room_map_v1";
const FAMILY_BADGE_ROOM_IDS_KEY = "vlue_family_badge_room_ids_v1";

function readFamilyBadgeRoomIds() {
  try {
    const raw = localStorage.getItem(FAMILY_BADGE_ROOM_IDS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function readDigitalCardActive() {
  try {
    return localStorage.getItem(DIGITAL_CARD_ACTIVE_KEY) === "1";
  } catch {
    return false;
  }
}

const SESSION_KEY = "vlue_logged_in";
const SAVED_LOGIN_ID_KEY = "vlue_saved_login_id";
const SAVED_LOGIN_PASSWORD_KEY = "vlue_saved_login_password";
const REMEMBER_LOGIN_KEY = "vlue_remember_login";
const TIER_CHANGE_TARGET_KEY = "vlue_tier_change_target";
const TIER_CHANGE_STATE_KEY = "vlue_tier_change_state";
const FEED_AUTO_EXPIRY_REGISTRY_KEY = "vlue_feed_auto_expiry_registry_v1";

function createExposureCode(prefix = "VL") {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const raw = new Uint8Array(10);
  try {
    crypto.getRandomValues(raw);
  } catch {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
  }
  let token = "";
  for (let i = 0; i < raw.length; i += 1) token += alphabet[raw[i] % alphabet.length];
  return `${prefix}-${token}`;
}

function readVcidLetteringFromStorage() {
  try {
    return localStorage.getItem("vcid") === "true";
  } catch {
    return false;
  }
}

/* V1 실가입 UX — 시드 채팅/예시 친구·업체를 넣지 않음 (가입 직후 빈 목록) */
const seedData = {
  family: [],
  friends: [],
  work: [],
  subscribe: []
};

const seedMessages = {
  "family:mom": [
    { id: "m0", type: "target", text: "[갤러리] 가족사진.jpg를 보냈어요." },
    { id: "m1", type: "target", text: "오늘 저녁에 다들 모이니? 🍖" },
    { id: "m2", type: "me", text: "네! 금방 가요!" },
    { id: "m3", type: "me", text: "[파일] 저녁메뉴.pdf" }
  ],
  "family:brother": [
    { id: "b1", type: "me", text: "야 너 내 방 들어갔었냐?" },
    { id: "b2", type: "target", text: "형 내 충전기 어디갔어?" }
  ],
  "friends:friend-kim": [{ id: "f1", type: "target", text: "주말에 축구 고?" }],
  "work:park": [
    { id: "w1", type: "target", text: "파일 확인 부탁드려요." },
    { id: "w1b", type: "target", text: "[파일] 제안서_최종.hwp" },
    { id: "w2", type: "me", text: "네, 확인하겠습니다!" }
  ],
  "subscribe:soul-cafe": [
    { id: "sc-intro", type: "system", text: "Soul Cafe 안내: 매장 이벤트/신메뉴/예약 공지를 이 채팅방에서 확인할 수 있습니다." },
    { id: "sc-1", type: "target", text: "안녕하세요. 예약 문의 주시면 순서대로 빠르게 도와드릴게요!" }
  ],
  "subscribe:blue-repair": [
    { id: "br-intro", type: "system", text: "역삼 블루정비 안내: 채팅 상담 활성화 중입니다. 견적/예약/정비 이력을 바로 조회할 수 있습니다." },
    { id: "br-1", type: "target", text: "AI 상담: 차량 증상을 입력하시면 예상 점검 항목을 추천해드립니다." }
  ],
  "subscribe:career-center": [
    { id: "cc-intro", type: "system", text: "강남 커리어센터 안내: 기업 전용 오픈 상담방입니다. 구직/이력서/면접 관련 문의를 남겨주세요." },
    { id: "cc-1", type: "target", text: "상담팀이 접속했습니다. 원하시는 직무와 경력을 알려주세요." }
  ],
  "vlue:official": [
    { id: "vo-sys", type: "system", text: "VLUE 공식 알림입니다. 서비스 공지·이벤트·보안 안내가 이 곳으로 모입니다." },
    { id: "vo-1", type: "target", text: "안녕하세요. 신뢰 인증(Vouch) 요청은 회원 목록에서 보내실 수 있고, 승인 결과는 별도 메시지로 안내드립니다." },
    { id: "vo-2", type: "target", text: "정기 점검이 예정되어 있으면 이 채널에서 먼저 공지드립니다." }
  ]
};

const initialRoomCatalog = () => JSON.parse(JSON.stringify(seedData));

const roomPhoneByKey = {
  "family:mom": "010-2280-9283",
  "family:brother": "010-3333-4401",
  "friends:friend-kim": "010-9001-2200",
  "work:park": "010-2000-7788",
  "subscribe:soul-cafe": "02-512-8891",
  "subscribe:blue-repair": "02-557-1120",
  "subscribe:career-center": "02-561-7782"
};
const DEFAULT_MY_PHONE = "010-7777-1111";

const tabs = [
  { id: "all", label: "전체" },
  { id: "favorites", label: "즐겨찾기" },
  { id: "clients", label: "비지니스" },
  { id: "unread", label: "미확인" },
  { id: "subscribe", label: "구독" },
  { id: "push", label: "알림" }
];

const fmt = (d) => d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
const asBadgeText = (count) => (count > 99 ? "99+" : String(count));
const initialUnreadByRoom = Object.entries(seedMessages).reduce((acc, [roomId, list]) => {
  acc[roomId] = (list || []).filter((m) => m.type === "target").length;
  return acc;
}, {});

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(() => localStorage.getItem(ONBOARDING_DONE_KEY) === "1");
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem(SESSION_KEY) === "1");
  const [familyActivePeers, setFamilyActivePeers] = useState(() => ({
    userIds: new Set(),
    handles: new Set()
  }));
  const [familyBadgeRoomIds, setFamilyBadgeRoomIds] = useState(() => {
    const stored = readFamilyBadgeRoomIds();
    for (const id of getDemoFamilyRoomIds()) stored.add(id);
    return stored;
  });
  const [signupOnboardingOpen, setSignupOnboardingOpen] = useState(() => {
    try {
      if (sessionStorage.getItem("vlue_pass_cert_draft_v1")) return true;
      const q = new URLSearchParams(window.location.search || "");
      if (q.get("imp_uid") || q.get("impUid")) return true;
    } catch {
      /* ignore */
    }
    return false;
  });
  const [signupIntent, setSignupIntent] = useState(/** @type {'general' | 'trust'} */ ("general"));

  const [pendingAuthAction, setPendingAuthAction] = useState(null);
  const [guestAuthOverlay, setGuestAuthOverlay] = useState(false);
  const [snsUnlinkedAlert, setSnsUnlinkedAlert] = useState("");

  /** 마케팅 웹(www) 회원가입 탭 → /app 동일 온보딩 (PC file:// 앱은 외부 브라우저) */
  useEffect(() => {
    try {
      const flag = sessionStorage.getItem(VLUE_MARKETING_SIGNUP_KEY);
      if (!flag) return;
      sessionStorage.removeItem(VLUE_MARKETING_SIGNUP_KEY);
      if (shouldOpenSignupInExternalBrowser()) {
        openElectronExternalSignup();
        setBottomToast("브라우저에서 가입을 완료한 뒤, PC 앱에서 로그인해 주세요.");
        const t = setTimeout(() => setBottomToast(""), 5000);
        return () => clearTimeout(t);
      }
      localStorage.removeItem(ONBOARDING_DONE_KEY);
      localStorage.setItem(SESSION_KEY, "0");
      setIsLoggedIn(false);
      setShowSplash(false);
      setOnboardingComplete(false);
      setSignupOnboardingOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  /** PASS 본인인증 redirect 복귀 시 온보딩 재오픈 */
  useEffect(() => {
    try {
      if (isPasswordChangeCertPending() || isPhoneChangeCertPending()) return;
      const hasDraft = Boolean(sessionStorage.getItem("vlue_pass_cert_draft_v1"));
      const q = new URLSearchParams(window.location.search || "");
      const hasCertReturn = Boolean(q.get("imp_uid") || q.get("impUid") || q.get("success"));
      if (!hasDraft && !hasCertReturn) return;
      setShowSplash(false);
      setSignupOnboardingOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  /** 비밀번호 변경 PASS redirect 복귀 — 설정 화면으로 */
  useEffect(() => {
    try {
      if (isPhoneChangeCertPending()) return;
      if (!isPasswordChangeCertPending()) return;
      if (readPasswordChangeResume() !== "settings") return;
      setShowSplash(false);
      setProfileInitialView("passwordChange");
      setProfileOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  /** 전화번호 변경 PASS redirect 복귀 — 설정 > 전화번호 */
  useEffect(() => {
    try {
      if (!isPhoneChangeCertPending()) return;
      if (readPhoneChangeResume() !== "settings") return;
      setShowSplash(false);
      setProfileInitialView("phoneChange");
      setProfileOpen(true);
    } catch {
      /* ignore */
    }
  }, []);
  /** 생체·24h 유예 갱신 후 메인으로 넘기기 위한 리렌더 트리거 */
  const [biometricSeq, setBiometricSeq] = useState(0);
  const [appLockResetOpen, setAppLockResetOpen] = useState(false);
  useAppLockResetListener(setAppLockResetOpen);
  const [page, setPage] = useState("main");

  useEffect(() => {
    if (!isAppPageV1Enabled(page)) setPage("main");
  }, [page]);
  const [calendarBadge, setCalendarBadgeCount] = useState(() => readCalendarBadge());
  const [calendarNav, setCalendarNav] = useState({ eventId: "", groupId: "", groupName: "" });
  const [memoMeta, setMemoMeta] = useState({ count: 0, preview: "", unreadShareCount: 0 });
  const [memoNav, setMemoNav] = useState({ memoId: "" });
  const [shareReceiveDraft, setShareReceiveDraft] = useState(null);
  const [shareReceiveOpen, setShareReceiveOpen] = useState(false);
  const [memoPillToast, setMemoPillToast] = useState({ message: "", memoId: "" });
  const [posBillToast, setPosBillToast] = useState({ message: "", entryId: "" });
  const [myPageMountKey, setMyPageMountKey] = useState(0);
  const [subscriptionSubTab, setSubscriptionSubTab] = useState(() => readStoreFeedTab("all"));
  const handleSubscriptionSubTab = useCallback((tab) => {
    setSubscriptionSubTab(tab);
    writeStoreFeedTab(tab);
  }, []);
  const [chatPrefsTick, setChatPrefsTick] = useState(0);
  const [pushUnreadCount, setPushUnreadCount] = useState(() => countUnreadPush());
  const [floatingRoomIds, setFloatingRoomIds] = useState(() => new Set());
  const [isDesktopPd, setIsDesktopPd] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 900px)").matches : false
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileInitialView, setProfileInitialView] = useState("main");
  const [v1PaidGateOpen, setV1PaidGateOpen] = useState(false);
  useEffect(() => {
    const openShowcaseSettings = () => {
      setAppNotificationOpen(false);
      setCallShowcaseSheetOpen(false);
      setProfileOpen(false);
      setShowcaseStyleSheetOpen(true);
    };
    const openBizcardSettings = () => {
      setAppNotificationOpen(false);
      setCallShowcaseSheetOpen(false);
      setShowcaseStyleSheetOpen(false);
      if (!canUseV1PaidDccFeatures(readEffectiveMembershipTier())) {
        setV1PaidGateOpen(true);
        return;
      }
      setProfileInitialView("letteringBizcard");
      setProfileOpen(true);
    };
    const onV1PaidGate = () => setV1PaidGateOpen(true);
    window.addEventListener(SHOWCASE_OPEN_SETTINGS_EVENT, openShowcaseSettings);
    window.addEventListener(LETTERING_OPEN_BIZCARD_SETTINGS_EVENT, openBizcardSettings);
    window.addEventListener(V1_PAID_PACKAGE_GATE_EVENT, onV1PaidGate);
    return () => {
      window.removeEventListener(SHOWCASE_OPEN_SETTINGS_EVENT, openShowcaseSettings);
      window.removeEventListener(LETTERING_OPEN_BIZCARD_SETTINGS_EVENT, openBizcardSettings);
      window.removeEventListener(V1_PAID_PACKAGE_GATE_EVENT, onV1PaidGate);
    };
  }, []);
  const [parentalConsentRequest, setParentalConsentRequest] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const searchInputRef = useRef(null);
  const appBodyRef = useRef(null);
  const [activeTab, setActiveTab] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedFeedProfile, setSelectedFeedProfile] = useState(null);
  const [friendRequests, setFriendRequests] = useState([]);
  const [bottomToast, setBottomToast] = useState("");
  const [hashtagSearchTag, setHashtagSearchTag] = useState("");
  const [caseArchiveUser, setCaseArchiveUser] = useState(null);
  const [vmingUpgradePrompt, setVmingUpgradePrompt] = useState({
    open: false,
    message: "",
    blockedReasonType: "GENERAL_LIMIT_EXCEEDED"
  });
  const [csScannerOpen, setCsScannerOpen] = useState(false);
  const [emailInboxOpen, setEmailInboxOpen] = useState(false);
  const [emailForwardingSettingsOpen, setEmailForwardingSettingsOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.location.hash === "#email" || window.location.hash === "#email-settings")
  );
  const [marketingPopup, setMarketingPopup] = useState(null);
  const [marketingPopupOpen, setMarketingPopupOpen] = useState(false);
  const [noticeReleaseToastOpen, setNoticeReleaseToastOpen] = useState(false);
  const [noticeReleaseMessage, setNoticeReleaseMessage] = useState("");
  const [activeNotice, setActiveNotice] = useState(null);
  const [noticeDetailOpen, setNoticeDetailOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [qrManualValue, setQrManualValue] = useState("");
  const [qrCameraError, setQrCameraError] = useState("");
  const [lastScannedQr, setLastScannedQr] = useState("");
  const qrVideoRef = useRef(null);
  const qrStreamRef = useRef(null);
  const qrScanLoopRef = useRef(0);
  const tabWasHiddenForEyeBlinkRef = useRef(false);
  /** 탭 이동마다 증가 → 헤더 눈 SVG 리마운트로 깜빡임 재생 */
  const [eyeNavSeq, setEyeNavSeq] = useState(0);
  const [tierBillingPrompt, setTierBillingPrompt] = useState({ open: false, targetTier: "" });
  const [friendInboxRequests, setFriendInboxRequests] = useState([]);
  const [blockedFriendIds, setBlockedFriendIds] = useState([]);
  const [contactSyncModalOpen, setContactSyncModalOpen] = useState(false);
  const [runtimePermsModalOpen, setRuntimePermsModalOpen] = useState(false);
  const [contactMatchData, setContactMatchData] = useState(() => readContactMatchCache());
  const [messagesByRoom, setMessagesByRoom] = useState(() => JSON.parse(JSON.stringify(seedMessages)));
  const [roomCatalog, setRoomCatalog] = useState(initialRoomCatalog);
  const [unreadByRoom, setUnreadByRoom] = useState(() => ({ ...initialUnreadByRoom }));
  const [lastMessageTimeByRoom, setLastMessageTimeByRoom] = useState({});
  const [favoriteRooms, setFavoriteRooms] = useState(() => {
    try {
      const raw = localStorage.getItem("vlue_favorite_rooms");
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });
  const [cardWallet, setCardWallet] = useState(() => readCardWallet());
  const [cardWalletModalOpen, setCardWalletModalOpen] = useState(false);
  const [walletDefaultTab, setWalletDefaultTab] = useState("received");
  const [appNotificationOpen, setAppNotificationOpen] = useState(false);
  const [callShowcaseSheetOpen, setCallShowcaseSheetOpen] = useState(false);
  const [showcaseStyleSheetOpen, setShowcaseStyleSheetOpen] = useState(false);
  const [officeRemoteOpen, setOfficeRemoteOpen] = useState(false);
  const [appMode, setAppMode] = useState(() => readAppMode());
  const [activeOfficeCardId, setActiveOfficeCardId] = useState(() => readActiveOfficeCardId());
  const [hasOfficeGrant, setHasOfficeGrant] = useState(false);
  const [chatListChannel, setChatListChannel] = useState(() => {
    try {
      const v = localStorage.getItem("vlue_chat_list_channel_v1");
      return v === "mailTalk" ? "mailTalk" : "general";
    } catch {
      return "general";
    }
  });
  const [mailTalkRooms, setMailTalkRooms] = useState([]);
  const [mailTalkRoomsLoading, setMailTalkRoomsLoading] = useState(false);
  const [mailTalkRoomsError, setMailTalkRoomsError] = useState("");
  const [mailTalkSseVersion, setMailTalkSseVersion] = useState(0);
  const [mailTalkComposeOpen, setMailTalkComposeOpen] = useState(false);
  const [electronRoomBoot] = useState(() => getElectronRoomBootParams());
  const isElectronRoomWindowMode = isElectronRoomWindow();
  const cardAccessSnapRef = useRef("");
  const [digitalCardActive, setDigitalCardActive] = useState(() => readDigitalCardActive());
  const [cardFieldsTick, setCardFieldsTick] = useState(0);
  const [avatarTick, setAvatarTick] = useState(0);
  const [vcidProfileTick, setVcidProfileTick] = useState(0);
  const [nicknameTick, setNicknameTick] = useState(0);
  useEffect(() => {
    const h = () => setVcidProfileTick((n) => n + 1);
    window.addEventListener("vlue-vcid-changed", h);
    return () => window.removeEventListener("vlue-vcid-changed", h);
  }, []);
  useEffect(() => {
    const h = () => setNicknameTick((n) => n + 1);
    window.addEventListener("vlue-nicknames-changed", h);
    return () => window.removeEventListener("vlue-nicknames-changed", h);
  }, []);
  useEffect(() => {
    if (subscriptionSubTab === "notice") setSubscriptionSubTab("cart");
  }, [subscriptionSubTab]);
  useEffect(() => {
    const onStorePrefs = (e) => {
      const tab = e?.detail?.tab;
      if (!tab || tab === subscriptionSubTab) return;
      setSubscriptionSubTab(tab);
    };
    window.addEventListener(STORE_FEED_PREFS_CHANGED, onStorePrefs);
    return () => window.removeEventListener(STORE_FEED_PREFS_CHANGED, onStorePrefs);
  }, [subscriptionSubTab]);
  useEffect(() => {
    const bumpPrefs = () => setChatPrefsTick((n) => n + 1);
    window.addEventListener(CHAT_ROOM_PREFS_CHANGED, bumpPrefs);
    return () => window.removeEventListener(CHAT_ROOM_PREFS_CHANGED, bumpPrefs);
  }, []);
  useEffect(() => {
    const syncPush = () => setPushUnreadCount(countUnreadPush());
    syncPush();
    window.addEventListener(PUSH_INBOX_CHANGED, syncPush);
    return () => window.removeEventListener(PUSH_INBOX_CHANGED, syncPush);
  }, []);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const apply = () => setIsDesktopPd(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  useEffect(() => {
    const sync = () => setCardWallet(readCardWallet());
    window.addEventListener("vlue-card-wallet-changed", sync);
    return () => window.removeEventListener("vlue-card-wallet-changed", sync);
  }, []);

  useEffect(() => {
    const onSearchAuth = (e) => {
      const d = e?.detail || {};
      const msg =
        d.error ||
        (d.code === "LOGIN_REQUIRED"
          ? "쇼케이스 검색은 로그인 후 이용할 수 있습니다."
          : d.code === "IDENTITY_REQUIRED"
            ? "휴대폰 본인인증 후 검색할 수 있습니다."
              : d.code === "RATE_LIMITED"
                ? "검색 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
                : "");
      if (!msg) return;
      setBottomToast(msg);
      setTimeout(() => setBottomToast(""), 4200);
      if (d.code === "LOGIN_REQUIRED") {
        try {
          window.dispatchEvent(new CustomEvent("vlue-require-login", { detail: d.meta }));
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("vlue-showcase-search-auth", onSearchAuth);
    return () => window.removeEventListener("vlue-showcase-search-auth", onSearchAuth);
  }, []);

  const [membershipTier, setMembershipTier] = useState(() => {
    const fromOnboard =
      localStorage.getItem("vlue_membership_kind") || localStorage.getItem("vlue_membership_tier");
    const legacy = localStorage.getItem("membershipTier");
    const tier = normalizeMembershipKind(fromOnboard || legacy || "free");
    localStorage.setItem("membershipTier", tier);
    localStorage.setItem("vlue_membership_tier", tier);
    localStorage.setItem("vlue_membership_kind", tier);
    return tier;
  });
  const [postSignupPaymentOpen, setPostSignupPaymentOpen] = useState(false);
  const [postSignupPending, setPostSignupPending] = useState(() => readPendingPayment());
  const [blockedRooms, setBlockedRooms] = useState(() => {
    try {
      const raw = localStorage.getItem("vlue_blocked_rooms");
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });
  /** 메인 채팅(friends:uuid) → 서버 DM(roomId) 매핑 */
  const [serverDmRoomByPeer, setServerDmRoomByPeer] = useState(() => {
    try {
      const raw = localStorage.getItem(SERVER_DM_ROOM_MAP_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === "object" ? obj : {};
    } catch {
      return {};
    }
  });
  const serverDmCursorRef = useRef({});
  const serverDmEnabledRoomsRef = useRef(new Set());
  const [officialChannelMeta, setOfficialChannelMeta] = useState({
    lastMsg: "VLUE 공식 알림을 확인해 주세요.",
    time: "",
    pendingCount: 0
  });
  /** 블루AI: 사용자가 전송해 AI 답변이 붙은 뒤, 탭 밖에 있으면 하단 아이콘 펄스 */
  const [blueAiActivitySeq, setBlueAiActivitySeq] = useState(0);
  const [blueAiSeenSeq, setBlueAiSeenSeq] = useState(0);
  const pageRef = useRef(page);
  const selectedRoomRef = useRef(selectedRoomId);
  const navHistoryRef = useRef([]);

  useEffect(() => {
    pageRef.current = page;
    selectedRoomRef.current = selectedRoomId;
  }, [page, selectedRoomId]);

  useEffect(() => {
    try {
      localStorage.setItem(SERVER_DM_ROOM_MAP_KEY, JSON.stringify(serverDmRoomByPeer || {}));
    } catch {
      /* ignore */
    }
    serverDmEnabledRoomsRef.current = new Set(
      Object.keys(serverDmRoomByPeer || {}).map((peerId) => `friends:${peerId}`)
    );
  }, [serverDmRoomByPeer]);

  useEffect(() => {
    if (page === "blueai") setBlueAiSeenSeq((s) => Math.max(s, blueAiActivitySeq));
  }, [page, blueAiActivitySeq]);

  useEffect(() => {
    if (!isLoggedIn) {
      setPage("main");
      setActiveTab(null);
      setSelectedRoomId(null);
      setIsSearchOpen(false);
      navHistoryRef.current = [];
      return undefined;
    }
    setDigitalCardActive(readDigitalCardActive());
    setMembershipTier(readMembershipTier());
    let cancelled = false;
    void (async () => {
      try {
        const { syncBizcardAccountFromApi } = await import("./lib/bizcardAccountSync.js");
        await syncBizcardAccountFromApi({ force: false });
        if (!cancelled) setMembershipTier(readMembershipTier());
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const syncTier = () => setMembershipTier(readMembershipTier());
    window.addEventListener("vlue-membership-tier-changed", syncTier);
    window.addEventListener("vlue-bizcard-account-synced", syncTier);
    return () => {
      window.removeEventListener("vlue-membership-tier-changed", syncTier);
      window.removeEventListener("vlue-bizcard-account-synced", syncTier);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    const sync = () => {
      setAppMode(readAppMode());
      setActiveOfficeCardId(readActiveOfficeCardId());
    };
    window.addEventListener("vlue-app-mode-changed", sync);
    window.addEventListener("vlue-office-card-changed", sync);
    window.addEventListener("vlue-card-access-revoked", sync);
    return () => {
      window.removeEventListener("vlue-app-mode-changed", sync);
      window.removeEventListener("vlue-office-card-changed", sync);
      window.removeEventListener("vlue-card-access-revoked", sync);
    };
  }, []);

  useEffect(() => {
    const onAvatar = () => setAvatarTick((n) => n + 1);
    window.addEventListener("vlue-avatar-changed", onAvatar);
    return () => window.removeEventListener("vlue-avatar-changed", onAvatar);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const uid = localStorage.getItem("vlue_server_user_id");
    if (!uid) {
      setHasOfficeGrant(false);
      return undefined;
    }
    const tick = async () => {
      try {
        const res = await vlueAuthFetch(apiUrl("/api/cards/me-context"), {
          headers: vlueAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) return;
        const granted = Boolean((data.memberships || []).length || (data.owned || []).length);
        setHasOfficeGrant(granted);
        if (!granted && appMode === "office") {
          forcePersonalMode("membership_revoked");
          setAppMode("personal");
          setActiveOfficeCardId("");
        }
        const snap = JSON.stringify({ memberships: data.memberships || [], owned: data.owned || [] });
        const prev = cardAccessSnapRef.current;
        if (prev && appMode === "office" && activeOfficeCardId) {
          const stillMember = (data.memberships || []).some((m) => m.cardId === activeOfficeCardId);
          const stillOwned = (data.owned || []).some((o) => o.id === activeOfficeCardId);
          if (!stillMember && !stillOwned) {
            forcePersonalMode("membership_revoked");
            setAppMode("personal");
            setActiveOfficeCardId("");
            setBottomToast("직장내선 권한이 만료되어 개인모드로 전환되었습니다.");
          }
        }
        cardAccessSnapRef.current = snap;
      } catch {
        /* ignore */
      }
    };
    const id = setInterval(tick, 30000);
    tick();
    return () => clearInterval(id);
  }, [isLoggedIn, appMode, activeOfficeCardId]);

  const refreshMailTalkRooms = useCallback(async () => {
    if (!isLoggedIn) {
      setMailTalkRooms([]);
      return;
    }
    setMailTalkRoomsLoading(true);
    setMailTalkRoomsError("");
    try {
      const rooms = await fetchMailTalkRooms();
      setMailTalkRooms(Array.isArray(rooms) ? rooms : []);
    } catch (e) {
      setMailTalkRoomsError(e instanceof Error ? e.message : "목록 불러오기 실패");
    } finally {
      setMailTalkRoomsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (chatListChannel === "mailTalk" && isLoggedIn) {
      refreshMailTalkRooms();
    }
  }, [chatListChannel, isLoggedIn, refreshMailTalkRooms]);

  const handleChatListChannelChange = useCallback(
    (channel) => {
      setChatListChannel(channel);
      try {
        localStorage.setItem("vlue_chat_list_channel_v1", channel);
      } catch {
        /* ignore */
      }
      if (channel === "mailTalk") refreshMailTalkRooms();
    },
    [refreshMailTalkRooms]
  );

  useEffect(() => {
    if (!isLoggedIn) setHasOfficeGrant(false);
  }, [isLoggedIn]);

  useEffect(() => {
    const onUpgradePrompt = (ev) => {
      setVmingUpgradePrompt({
        open: true,
        message: String(ev?.detail?.message || ""),
        blockedReasonType: String(ev?.detail?.blockedReasonType || "GENERAL_LIMIT_EXCEEDED")
      });
    };
    window.addEventListener("vlue-open-vming-upgrade", onUpgradePrompt);
    return () => window.removeEventListener("vlue-open-vming-upgrade", onUpgradePrompt);
  }, []);

  const refreshFamilyPeers = useCallback(async () => {
    if (!isLoggedIn) {
      setFamilyActivePeers({ userIds: new Set(), handles: new Set() });
      return;
    }
    try {
      const d = await fetchFamilyProtection();
      const peers = mergeFamilyPeers(familyPeersFromProtectionData(d));
      setFamilyActivePeers(peers);
      const matched = new Set();
      Object.entries(roomCatalog).forEach(([group, list]) => {
        (list || []).forEach((room) => {
          const roomId = `${group}:${room.id}`;
          if (roomMatchesFamilyPeer({ ...room, roomId }, peers)) matched.add(roomId);
        });
      });
      const stored = readFamilyBadgeRoomIds();
      for (const id of matched) stored.add(id);
      if (matched.size > 0) {
        localStorage.setItem(FAMILY_BADGE_ROOM_IDS_KEY, JSON.stringify([...stored]));
        setFamilyBadgeRoomIds(stored);
      }
      window.dispatchEvent(new CustomEvent("vlue-family-peers-updated", { detail: peers }));
    } catch {
      setFamilyActivePeers(mergeFamilyPeers({ userIds: new Set(), handles: new Set() }));
    }
  }, [isLoggedIn, roomCatalog]);

  useEffect(() => {
    if (!isLoggedIn) return;
    setFamilyActivePeers((prev) => mergeFamilyPeers(prev));
    const stored = readFamilyBadgeRoomIds();
    let changed = false;
    for (const id of getDemoFamilyRoomIds()) {
      if (!stored.has(id)) {
        stored.add(id);
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(FAMILY_BADGE_ROOM_IDS_KEY, JSON.stringify([...stored]));
      setFamilyBadgeRoomIds(stored);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let cancelled = false;
    void import("./lib/showcase/showcaseStyleSync.js")
      .then(async (m) => {
        if (cancelled) return null;
        /* 재설치 후 로컬이 비면 무조건 서버에서 강제 복원 */
        if (m.needsShowcaseStyleLocalRestore()) {
          return m.restoreShowcaseStyleFromServer();
        }
        m.seedEditorFromLocalLiveIfEmpty?.();
        return m.hydrateShowcaseStyleFromServer();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setParentalConsentRequest(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPendingParentalConsents();
        const first = data?.pending?.[0];
        if (!cancelled && first?.wardUserId) {
          setParentalConsentRequest((prev) =>
            prev?.wardUserId === first.wardUserId
              ? prev
              : { wardUserId: first.wardUserId, wardLabel: first.wardLabel || "자녀" }
          );
        }
      } catch {
        /* ignore — 비보호자·미로그인 등 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  /** FCM — Android 앱은 네이티브 토큰, 웹은 Web Push */
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    syncNativeAuthSession();
    let cancelled = false;
    const unbindNative = bindNativeFcmTokenListener();
    (async () => {
      try {
        if (isNativeFcmAvailable()) {
          const result = await registerNativeFcmPushToken();
          if (!cancelled && !result.ok && !result.skipped) {
            console.warn("[fcm] native_register_failed", result.error);
          }
          return;
        }
        const result = await registerFcmWebPushToken();
        if (!cancelled && !result.ok && !result.skipped) {
          console.warn("[fcm] register_failed", result.error);
        }
      } catch (err) {
        if (!cancelled) console.warn("[fcm] register_error", err);
      }
    })();
    return () => {
      cancelled = true;
      unbindNative();
    };
  }, [isLoggedIn]);

  /** 앱 복귀 시 FCM 토큰·네이티브 세션 재동기화 (백그라운드 푸시 수신률) */
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      syncNativeAuthSession();
      if (isNativeFcmAvailable()) {
        void registerNativeFcmPushToken();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isLoggedIn]);

  /** 알림 수락/거절·딥링크 → 앱에서 수락 처리 */
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const onDeepLink = async (e) => {
      const linkId = String(e?.detail?.linkId || "").trim();
      const action = String(e?.detail?.action || "open").trim();
      if (!linkId) return;
      void syncOwnerInboxFromServer();
      window.dispatchEvent(new CustomEvent("vlue-family-protection-changed"));
      if (action === "accept" || action === "reject") {
        try {
          const { acceptFamilyProtectionLink, rejectFamilyProtectionLink } = await import(
            "./lib/familyProtectionApi.js"
          );
          if (action === "accept") await acceptFamilyProtectionLink(linkId);
          else await rejectFamilyProtectionLink(linkId);
          setBottomToast(
            action === "accept" ? "가족 보호 초대를 수락했습니다." : "가족 보호 초대를 거절했습니다."
          );
          setTimeout(() => setBottomToast(""), 4000);
          window.dispatchEvent(new CustomEvent("vlue-family-protection-changed"));
          void syncOwnerInboxFromServer();
        } catch (err) {
          setBottomToast(err?.message || "가족 초대 처리에 실패했습니다.");
          setTimeout(() => setBottomToast(""), 4500);
        }
      }
    };
    window.addEventListener("vlue-family-invite-deep-link", onDeepLink);
    return () => window.removeEventListener("vlue-family-invite-deep-link", onDeepLink);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let unsubscribe = () => {};
    bindFcmForegroundListener()
      .then((off) => {
        if (typeof off === "function") unsubscribe = off;
      })
      .catch(() => {});
    void syncOwnerInboxFromServer();
    const onFcmForeground = (e) => {
      const data = e.detail?.data || {};
      const n = e.detail?.notification || {};
      if (data.type === "vlue-parental-consent-request" && data.wardUserId) {
        setParentalConsentRequest({
          wardUserId: data.wardUserId,
          wardLabel: data.wardLabel || "자녀"
        });
      }
      if (data.type === "vlue-payment-receipt") {
        const title = String(n.title || data.title || "결제 완료 · 구매확인 안내");
        const productName = String(data.orderName || data.productName || "VLUE 상품");
        const productDetail = String(
          data.productDetail || `${productName} 결제가 정상 처리되었습니다.`
        );
        const amountTotal = Number(data.amountTotal || 0);
        const paymentId = String(data.paymentId || "");
        const body = String(
          n.body ||
            data.body ||
            [
              "구매해 주셔서 진심으로 감사합니다.",
              "",
              `구매 상품: ${productName}`,
              `상품 설명: ${productDetail}`,
              `결제 금액: ${amountTotal.toLocaleString("ko-KR")}원`,
              paymentId ? `결제 번호: ${paymentId}` : "",
              "",
              "아래 [구매확인]을 눌러 주시면 구매가 확정됩니다.",
              "환불이 필요하시면 [환불 문의]로 고객센터(support@vlue.kr)에 신청해 주세요."
            ]
              .filter(Boolean)
              .join("\n")
          );
          addPushNotification({
            category: "결제",
            kind: "payment",
            title,
            body,
            productName,
            productDetail,
            amountKrw: amountTotal,
            paymentId,
            needsPurchaseConfirm: true
          });
          setBottomToast("결제 완료 · 알림함에서 구매확인해 주세요");
        setTimeout(() => setBottomToast(""), 5200);
      }
      if (
        data.type === "vlue-follow" ||
        data.type === "vlue-follow-request" ||
        data.type === "vlue-follow-accepted"
      ) {
        const title = String(n.title || data.title || "팔로우 알림");
        const body = String(n.body || data.body || data.message || "새 팔로우 알림이 있습니다.");
        addPushNotification({ category: "팔로우", title, body });
        setBottomToast(body);
        setTimeout(() => setBottomToast(""), 4200);
      }
      if (data.type === "vlue-friend-request") {
        const title = String(n.title || data.title || "친구 신청");
        const body = String(
          n.body || data.body || data.message || "새 친구 신청이 있습니다."
        );
        addPushNotification({
          category: "친구",
          title,
          body,
          kind: "friend_request"
        });
        setBottomToast(body);
        setTimeout(() => setBottomToast(""), 4200);
      }
      if (
        data.type === "vlue-showcase-like" ||
        data.type === "vlue-showcase-comment" ||
        data.type === "vlue-showcase-comment-reply" ||
        data.type === "vlue-showcase-share"
      ) {
        const title = String(n.title || data.title || "쇼케이스 알림");
        const body = String(n.body || data.body || data.message || "쇼케이스에 새 활동이 있습니다.");
        addPushNotification({
          category: "쇼케이스",
          title,
          body,
          serverId: data.notificationId,
          kind: data.type,
          actorUserId: data.actorUserId,
          actorHandle: data.actorHandle,
          actorName: data.actorName,
          showcaseNotifyType: data.type,
          showcaseSlideId: data.slideId,
          showcaseContentOrdinal: Number(data.contentOrdinal) || null,
          showcaseSlideLabel: data.slideLabel
        });
        deliverLocalPushNotification(title, body, String(data.notificationId || data.type || "showcase-like"));
        setBottomToast(body);
        setTimeout(() => setBottomToast(""), 4200);
      }
      if (data.type === "vlue-admin-broadcast") {
        const title = String(n.title || data.title || "VLUE 공지");
        const body = String(n.body || data.body || data.message || title);
        const category = String(data.category || "공지");
        addPushNotification({ category, title, body });
        deliverLocalPushNotification(title, body, `admin-broadcast-${data.audience || "all"}`);
        setBottomToast(body);
        setTimeout(() => setBottomToast(""), 5200);
        void syncOwnerInboxFromServer();
      }
    };
    window.addEventListener("vlue-fcm-foreground", onFcmForeground);
    return () => {
      unsubscribe();
      window.removeEventListener("vlue-fcm-foreground", onFcmForeground);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    refreshFamilyPeers();
  }, [refreshFamilyPeers]);

  useEffect(() => {
    const onPeers = (e) => {
      const peers = mergeFamilyPeers(e.detail || { userIds: new Set(), handles: new Set() });
      setFamilyActivePeers(peers);
      const matched = new Set();
      Object.entries(roomCatalog).forEach(([group, list]) => {
        (list || []).forEach((room) => {
          const roomId = `${group}:${room.id}`;
          if (roomMatchesFamilyPeer({ ...room, roomId }, peers)) matched.add(roomId);
        });
      });
      if (matched.size > 0) {
        const stored = readFamilyBadgeRoomIds();
        for (const id of matched) stored.add(id);
        localStorage.setItem(FAMILY_BADGE_ROOM_IDS_KEY, JSON.stringify([...stored]));
        setFamilyBadgeRoomIds(stored);
      }
    };
    window.addEventListener("vlue-family-peers-updated", onPeers);
    return () => window.removeEventListener("vlue-family-peers-updated", onPeers);
  }, [roomCatalog]);

  /** 상점 게시 시 — 알림 설정한 회원에게만 푸시 (상점 주인 본인 제외) */
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const me = getCurrentUserId();
    const onOwnerPosted = (ev) => {
      const { ownerKey, title, shopName } = ev.detail || {};
      if (!ownerKey) return;
      const { count } = dispatchPushToShopSubscribers(ownerKey, { title, shopName });
      if (ownerKey === me && count > 0) {
        setBottomToast(`알림 설정 회원 ${count}명에게 푸시를 보냈습니다.`);
        setTimeout(() => setBottomToast(""), 4200);
      }
    };
    const onPushToMe = (ev) => {
      const { targetUserId, shopName, title } = ev.detail || {};
      if (targetUserId !== me) return;
      setBottomToast(`[${shopName}] ${title}`);
      setTimeout(() => setBottomToast(""), 5200);
    };
    window.addEventListener(SHOP_OWNER_POSTED, onOwnerPosted);
    window.addEventListener(SHOP_PUSH_TO_SUBSCRIBER, onPushToMe);
    return () => {
      window.removeEventListener(SHOP_OWNER_POSTED, onOwnerPosted);
      window.removeEventListener(SHOP_PUSH_TO_SUBSCRIBER, onPushToMe);
    };
  }, [isLoggedIn]);

  /** §8 실시간(SSE) — 권한 회수 · §6 문의 푸시 알림 */
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const uid = localStorage.getItem("vlue_server_user_id");
    if (!uid) return undefined;
    const stop = startVlueSse(uid, {
      onEvent: (data) => {
        if (data?.type === "vlue-card-access-revoked") {
          forcePersonalMode("sse_revoked");
          setAppMode("personal");
          setActiveOfficeCardId("");
          setBottomToast("직장내선 권한이 해제되어 개인모드로 전환되었습니다.");
          setTimeout(() => setBottomToast(""), 3200);
        }
        if (data?.type === "vlue-onboarding-auto-approved") {
          setBottomToast(String(data.message || "사업자 가입이 자동 승인되었습니다."));
          setTimeout(() => setBottomToast(""), 4200);
        }
        if (data?.type === "vlue-office-email-arrived") {
          setBottomToast(String(data.message || "이메일 첨부파일이 자료실에 도착했습니다!"));
          setTimeout(() => setBottomToast(""), 4200);
          emitAssetFilesChanged();
          emitOfficeEmailInboxChanged();
          setEmailInboxOpen(true);
        }
        if (data?.type === "vlue-email-forwarded") {
          setBottomToast(String(data.message || "새 메일이 도착했습니다."));
          setTimeout(() => setBottomToast(""), 4200);
          emitEmailInboxChanged();
          setEmailInboxOpen(true);
          setMailTalkSseVersion((v) => v + 1);
          if (chatListChannel === "mailTalk") refreshMailTalkRooms();
        }
        if (data?.type === "mail-talk-received" || data?.type === "mail-talk-sent") {
          setMailTalkSseVersion((v) => v + 1);
          if (chatListChannel === "mailTalk") refreshMailTalkRooms();
          if (data?.type === "mail-talk-received") {
            setBottomToast("메일톡: 새 메시지가 도착했습니다.");
            setTimeout(() => setBottomToast(""), 3200);
          }
        }
        if (data?.type === "vlue-notice-released") {
          const notice = data.notice || null;
          if (notice) setActiveNotice(notice);
          const noticeMsg = String(data.message || "📢 새로운 시스템 업데이트가 배포되었습니다!");
          setNoticeReleaseMessage(noticeMsg);
          setNoticeReleaseToastOpen(true);
          addPushNotification({
            category: "공지",
            title: String(notice?.title || "시스템 공지"),
            body: noticeMsg
          });
        }
        if (data?.type === "vlue-admin-broadcast") {
          const title = String(data.title || "VLUE 공지");
          const body = String(data.body || data.message || title);
          const category = String(data.category || "공지");
          setBottomToast(body);
          setTimeout(() => setBottomToast(""), 5200);
          addPushNotification({ category, title, body });
          deliverLocalPushNotification(title, body, `admin-broadcast-${data.audience || "all"}`);
          void syncOwnerInboxFromServer();
        }
        if (data?.type === VLUE_SSE_CHAT_MESSAGE) {
          mergeIncomingServerChatMessage(data.message, {
            peerUserId: data.peerUserId,
            serverRoomId: data.serverRoomId
          });
        }
        if (data?.type === "vlue-push-inquiry") {
          const msg = String(data.message || "명함 문의 알림");
          setBottomToast(msg);
          setTimeout(() => setBottomToast(""), 4200);
          addPushNotification({ category: "앱", title: "명함 문의", body: msg });
        }
        if (
          data?.type === "vlue-follow" ||
          data?.type === "vlue-follow-request" ||
          data?.type === "vlue-follow-accepted"
        ) {
          const title = String(data.title || "팔로우 알림");
          const body = String(data.body || data.message || "새 팔로우 알림이 있습니다.");
          setBottomToast(body);
          setTimeout(() => setBottomToast(""), 4200);
          addPushNotification({ category: "팔로우", title, body });
        }
        if (data?.type === "vlue-friend-request") {
          const title = String(data.title || "친구 신청");
          const body = String(data.body || data.message || "새 친구 신청이 있습니다.");
          setBottomToast(body);
          setTimeout(() => setBottomToast(""), 4200);
          addPushNotification({
            category: "친구",
            title,
            body,
            kind: "friend_request",
            serverId: data.notificationId
          });
        }
        if (
          data?.type === "vlue-showcase-like" ||
          data?.type === "vlue-showcase-comment" ||
          data?.type === "vlue-showcase-comment-reply" ||
          data?.type === "vlue-showcase-share"
        ) {
          const title = String(data.title || "쇼케이스 알림");
          const body = String(data.body || data.message || "쇼케이스에 새 활동이 있습니다.");
          setBottomToast(body);
          setTimeout(() => setBottomToast(""), 4200);
          addPushNotification({
            category: "쇼케이스",
            title,
            body,
            serverId: data.notificationId,
            kind: data.type,
            actorUserId: data.actorUserId,
            actorHandle: data.actorHandle,
            actorName: data.actorName,
            showcaseNotifyType: data.type,
            showcaseSlideId: data.slideId,
            showcaseContentOrdinal: Number(data.contentOrdinal) || null,
            showcaseSlideLabel: data.slideLabel
          });
          deliverLocalPushNotification(title, body, String(data.notificationId || data.type || "showcase-social"));
        }
        if (data?.type === "vlue-payment-receipt") {
          const title = String(data.title || "결제 완료 · 구매확인 안내");
          const productName = String(data.productName || data.orderName || "VLUE 상품");
          const productDetail = String(
            data.productDetail ||
              `${productName} 결제가 정상 처리되었습니다. 결제 내역은 VLUE 계정에 보관됩니다.`
          );
          const amountTotal = Number(data.amountTotal || 0);
          const paymentId = String(data.paymentId || "");
          const body =
            String(data.body || "").trim() ||
            [
              "구매해 주셔서 진심으로 감사합니다.",
              "",
              `구매 상품: ${productName}`,
              `상품 설명: ${productDetail}`,
              `결제 금액: ${amountTotal.toLocaleString("ko-KR")}원`,
              paymentId ? `결제 번호: ${paymentId}` : "",
              "",
              "아래 [구매확인]을 눌러 주시면 구매가 확정됩니다.",
              "환불이 필요하시면 [환불 문의]로 고객센터(support@vlue.kr)에 신청해 주세요."
            ]
              .filter(Boolean)
              .join("\n");
          setBottomToast("결제 완료 · 알림함에서 구매확인해 주세요");
          setTimeout(() => setBottomToast(""), 5200);
          addPushNotification({
            category: "결제",
            kind: "payment",
            title,
            body,
            productName,
            productDetail,
            amountKrw: amountTotal,
            paymentId,
            needsPurchaseConfirm: true
          });
        }
        if (data?.type === "vlue-family-protection-alert") {
          const title = String(data.title || "가족 보호");
          const body = String(data.body || title || "가족 보호 알림");
          setBottomToast(body);
          setTimeout(() => setBottomToast(""), 6000);
          addPushNotification({ category: "가족보호", title, body });
          postAndroidSystemNotification(title, body, String(data.linkId || "family-alert"));
          window.dispatchEvent(new CustomEvent("vlue-family-alert", { detail: data }));
        }
        if (data?.type === "vlue-family-protection-invite") {
          const body = String(data.body || "가족 보호 승인 요청이 도착했습니다.");
          const title = String(data.title || "가족 보호 초대");
          setBottomToast(body);
          setTimeout(() => setBottomToast(""), 6000);
          addPushNotification({
            category: "가족보호",
            title,
            body,
            kind: "family_invite",
            linkId: data.linkId,
            familyRelation: data.familyRelation,
            familyInvitePending: true
          });
          postAndroidFamilyInviteNotification(title, body, String(data.linkId || ""));
        }
        if (data?.type === "vlue-family-protection-rejected") {
          const body = String(data.body || "가족이 보호 초대를 거절했습니다.");
          setBottomToast(body);
          setTimeout(() => setBottomToast(""), 4000);
          addPushNotification({ category: "가족보호", title: "가족 보호 거절", body });
          postAndroidSystemNotification("가족 보호 거절", body, "family-rejected");
        }
        if (data?.type === "enterprise-group-chat" && data.message) {
          window.dispatchEvent(new CustomEvent("vlue-enterprise-chat", { detail: data }));
        }
        if (data?.type === "enterprise-group-chat-ready") {
          window.dispatchEvent(new CustomEvent("vlue-enterprise-chat", { detail: data }));
        }
        if (data?.type === "vlue-family-bank-consent-request") {
          const body = String(data?.body || "계좌 모니터링 동의 요청이 도착했습니다.");
          setBottomToast(body);
          setTimeout(() => setBottomToast(""), 4500);
          addPushNotification({ category: "가족보호", title: "계좌 모니터링 동의", body });
          postAndroidSystemNotification("계좌 모니터링 동의", body, String(data.linkId || "bank-consent"));
        }
        if (data?.type === "vlue-family-protection-accepted") {
          const body = String(data.body || "가족이 보호 초대를 수락했습니다.");
          const title = String(data.title || "가족 보호 수락");
          setBottomToast(body);
          setTimeout(() => setBottomToast(""), 4000);
          addPushNotification({ category: "가족보호", title, body });
          postAndroidSystemNotification(title, body, "family-accepted");
        }
        if (data?.type === "vlue-parental-consent-request") {
          const body = String(data.body || "자녀 가입 승인 요청이 도착했습니다.");
          setBottomToast(body);
          setTimeout(() => setBottomToast(""), 6000);
          addPushNotification({ category: "가족보호", title: "자녀 가입 승인", body });
          postAndroidSystemNotification("자녀 가입 승인", body, String(data.wardUserId || "parental"));
          if (data.wardUserId) {
            setParentalConsentRequest({
              wardUserId: data.wardUserId,
              wardLabel: data.wardLabel || "자녀"
            });
          }
        }
        if (data?.type === "vlue-parental-consent-approved") {
          setParentalConsentRequest((prev) =>
            prev?.wardUserId === data.wardUserId ? null : prev
          );
          window.dispatchEvent(new CustomEvent("vlue-parental-consent-approved", { detail: data }));
          window.dispatchEvent(new CustomEvent("vlue-family-protection-changed"));
          if (data.message) {
            setBottomToast(String(data.message));
            setTimeout(() => setBottomToast(""), 5000);
            addPushNotification({
              category: "가족보호",
              title: "자녀 가입 승인 완료",
              body: String(data.message)
            });
          }
        }
        if (
          data?.type === "vlue-calendar-new" ||
          data?.type === "vlue-calendar-update" ||
          data?.type === "vlue-calendar-remind"
        ) {
          setCalendarBadge(1);
          setCalendarBadgeCount(readCalendarBadge());
          const msg = String(data.message || "📅 새 일정 알림");
          setBottomToast(msg);
          setTimeout(() => setBottomToast(""), 5200);
          if (data.eventId) {
            try {
              sessionStorage.setItem(OPEN_CALENDAR_EVENT_KEY, String(data.eventId));
            } catch {
              /* ignore */
            }
          }
        }
        if (data?.type === "vlue-calendar-delete") {
          setBottomToast(String(data.message || "📅 일정이 삭제되었습니다."));
          setTimeout(() => setBottomToast(""), 3200);
        }
        if (data?.type === "vlue-memo-reminder") {
          const msg = String(data.message || "📝 메모 리마인더");
          setMemoPillToast({ message: msg, memoId: String(data.memoId || "") });
        }
        if (data?.type === "vlue-vming-consent-update" || data?.type === "vlue-vming-consent-expiring") {
          window.dispatchEvent(new CustomEvent("vlue-vming-consent-update", { detail: data }));
          if (data?.type === "vlue-vming-consent-expiring") {
            setBottomToast(String(data.message || "브이밍 동의가 곧 만료됩니다."));
            setTimeout(() => setBottomToast(""), 5200);
          }
        }
        if (data?.type === "vlue-fraud-alert") {
          window.dispatchEvent(new CustomEvent("vlue-fraud-alert", { detail: data }));
          if (data.risk_level === "critical" || data.risk_level === "high") {
            setBottomToast(String(data.reason || "사기 의심 메시지가 감지되었습니다."));
            setTimeout(() => setBottomToast(""), 6000);
          }
        }
        if (data?.type === "vlue-pos-staff-bill-submitted") {
          const msg = String(data.body || data.title || "직원이 마감 빌지를 전송했습니다.");
          setPosBillToast({
            message: `${msg} · 탭하여 매출 대시보드`,
            entryId: String(data.entryId || "")
          });
          try {
            sessionStorage.setItem(OPEN_POS_DASHBOARD_KEY, String(data.entryId || "1"));
          } catch {
            /* ignore */
          }
          requestOpenFamilyProtectionTab();
        }
      }
    });
    return stop;
  }, [isLoggedIn, refreshMailTalkRooms, chatListChannel]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const refresh = () => {
      fetchMemoMeta()
        .then(setMemoMeta)
        .catch(() => {});
    };
    refresh();
    window.addEventListener(LOCAL_MEMO_CHANGED, refresh);
    return () => window.removeEventListener(LOCAL_MEMO_CHANGED, refresh);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    try {
      const pending = sessionStorage.getItem("vlue_pending_memo_share");
      if (!pending) return;
      sessionStorage.removeItem("vlue_pending_memo_share");
      const payload = JSON.parse(pending);
      receiveShareMemo({ ...payload, save: false }).then((res) => {
        setShareReceiveDraft(res.draft || res.memo);
        setShareReceiveOpen(true);
      });
    } catch {
      /* ignore */
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const onBadge = () => setCalendarBadgeCount(readCalendarBadge());
    window.addEventListener("vlue-calendar-badge", onBadge);
    return () => window.removeEventListener("vlue-calendar-badge", onBadge);
  }, []);

  const calendarGroups = useMemo(() => {
    const labels = { family: "가족", friends: "친구", work: "직장", subscribe: "구독" };
    const out = [];
    for (const tab of ["family", "friends", "work", "subscribe"]) {
      for (const r of roomCatalog[tab] || []) {
        out.push({ id: `${tab}:${r.id}`, name: r.name, label: labels[tab] || tab });
      }
    }
    return out;
  }, [roomCatalog]);

  const roomNameById = useMemo(() => {
    const map = {};
    calendarGroups.forEach((r) => {
      map[r.id] = r.name;
    });
    return map;
  }, [calendarGroups]);

  /** 홈 진입 시 활성 마케팅 팝업 */
  useEffect(() => {
    if (!isLoggedIn || page !== "main") return undefined;
    let cancelled = false;
    fetchActiveMarketingPopup()
      .then((data) => {
        if (cancelled) return;
        const popup = data.popup || null;
        setMarketingPopup(popup);
        if (popup && shouldShowMarketingPopup(popup)) {
          setMarketingPopupOpen(true);
        } else {
          setMarketingPopupOpen(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMarketingPopup(null);
          setMarketingPopupOpen(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, page]);

  /** 가족 보호 — 포그라운드 접속 기록 · 자녀 URL 감시 · 통화 브릿지 */
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    registerFamilyCallBridge();
    registerFamilyDeviceBridge();
    registerPosOcrBridge();
    registerDocumentOcrBridge();
    registerMlKitTranslationBridge();
    registerFamilyNativeRelay();
    installFamilySiteGuard();
    const onWardRole = (e) => {
      const isChild = e?.detail?.wardRole === "child";
      setFamilyChildWardActive(isChild);
      if (isChild) promptIosChildWardNoticeOnce();
    };
    window.addEventListener("vlue-family-ward-role", onWardRole);
    const stopPresence = startFamilyProtectionPresence();
    return () => {
      stopPresence();
      window.removeEventListener("vlue-family-ward-role", onWardRole);
      setFamilyChildWardActive(false);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem("darkMode", String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    const syncDigitalCard = () => setDigitalCardActive(readDigitalCardActive());
    window.addEventListener("vlue-digital-card-changed", syncDigitalCard);
    return () => window.removeEventListener("vlue-digital-card-changed", syncDigitalCard);
  }, []);

  useEffect(() => {
    if (page !== "room" || !selectedRoomId) return;
    setUnreadByRoom((prev) => ({ ...prev, [selectedRoomId]: 0 }));
  }, [page, selectedRoomId]);

  /** P0-3: 메인 채팅(friends:uuid)에서 서버 DM 읽음 + 재동기화(after) */
  useEffect(() => {
    if (page !== "room" || !selectedRoomId) return undefined;
    if (!isLoggedIn) return undefined;
    if (!selectedRoomId.startsWith("friends:")) return undefined;

    const peerId = String(selectedRoomId.split(":")[1] || "").trim();
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidLike.test(peerId)) return undefined;

    const ensureServerRoomId = async () => {
      const cached = serverDmRoomByPeer?.[peerId];
      if (cached) return String(cached);
      const res = await vlueAuthFetch("/api/chat/rooms/open", {
        method: "POST",
        headers: vlueAuthHeaders(),
        body: JSON.stringify({ peerId })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.roomId) throw new Error(j?.error || "server_room_open_failed");
      const rid = String(j.roomId);
      setServerDmRoomByPeer((prev) => ({ ...(prev || {}), [peerId]: rid }));
      return rid;
    };

    const mapApiMessage = (m, myId) => {
      const createdAt = String(m.createdAt || "");
      if (m.messageType === "system") {
        return { id: `sv:${m.id}`, type: "system", text: m.content || "", at: createdAt };
      }
      const mine = String(m.senderId || "") === String(myId || "");
      return { id: `sv:${m.id}`, type: mine ? "me" : "target", text: m.content || "", at: createdAt, senderName: m.senderName };
    };

    const syncOnce = async (isInitial) => {
      const uid = localStorage.getItem("vlue_server_user_id") || "";
      if (!uid) return;
      const serverRoomId = await ensureServerRoomId();
      const cursorKey = `${peerId}`;
      const after = serverDmCursorRef.current?.[cursorKey] || "";
      const url = after && !isInitial
        ? `/api/chat/rooms/${encodeURIComponent(serverRoomId)}/messages?after=${encodeURIComponent(after)}`
        : `/api/chat/rooms/${encodeURIComponent(serverRoomId)}/messages`;
      const res = await vlueAuthFetch(url, { headers: vlueAuthHeaders() });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "chat_sync_failed");
      const list = Array.isArray(j?.messages) ? j.messages : [];
      if (!list.length) return;

      // cursor update (raw server message id)
      const lastRawId = String(list[list.length - 1]?.id || "");
      if (lastRawId) serverDmCursorRef.current = { ...(serverDmCursorRef.current || {}), [cursorKey]: lastRawId };

      // merge into local room messages (dedupe by id)
      const mapped = list.map((m) => mapApiMessage(m, uid));
      setMessagesByRoom((prev) => {
        const cur = prev?.[selectedRoomId] || [];
        const seen = new Set(cur.map((x) => x?.id).filter(Boolean));
        const add = mapped.filter((x) => x?.id && !seen.has(x.id));
        if (!add.length) return prev;
        return { ...prev, [selectedRoomId]: [...cur, ...add] };
      });

      // mark read to server
      if (lastRawId) {
        vlueAuthFetch(`/api/chat/rooms/${encodeURIComponent(serverRoomId)}/read`, {
          method: "POST",
          headers: vlueAuthHeaders(),
          body: JSON.stringify({ lastReadMessageId: lastRawId })
        }).catch(() => {});
      }
    };

    (async () => {
      try {
        await syncOnce(true);
      } catch {
        /* ignore */
      }
    })();

    return undefined;
  }, [page, selectedRoomId, isLoggedIn, serverDmRoomByPeer]);

  useEffect(() => {
    const onDocClick = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      const isSearchArea =
        t.closest("#search-trigger") ||
        t.closest("#search-input-wrap") ||
        t.closest("#global-search-dropdown");
      if (!isSearchArea) setIsSearchOpen(false);

      /* 우편번호·주소 레이어는 body에 붙음 — 닫기 클릭이 사이드바 전체 닫힘으로 전파되면 안 됨 */
      if (t.closest("#vlue-daum-postcode-layer") || t.closest("[data-vlue-postcode-close]")) {
        return;
      }
      const postcodeLayer = document.getElementById("vlue-daum-postcode-layer");
      if (postcodeLayer && postcodeLayer.style.display !== "none" && postcodeLayer.style.display !== "") {
        return;
      }

      const isProfileArea = t.closest("#profile-trigger") || t.closest("#profile-menu");
      if (!isProfileArea) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const refreshVouchPreview = useCallback(() => {
    try {
      const sid = localStorage.getItem("vlue_server_user_id");
      if (!sid) {
        setOfficialChannelMeta({
          lastMsg: "서버 연동 후 신뢰 인증 알림을 받을 수 있습니다.",
          time: "",
          pendingCount: 0
        });
        return;
      }
      vlueAuthFetch("/api/vouch/inbox", { headers: vlueAuthHeaders() })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => {
          const items = data.items || [];
          const first = items[0];
          setOfficialChannelMeta({
            lastMsg: first ? `${first.fromName}님이 신뢰 인증을 요청했습니다.` : "받은 신뢰 인증 요청이 없습니다.",
            time: first ? fmt(new Date(first.createdAt)) : "",
            pendingCount: typeof data.pendingCount === "number" ? data.pendingCount : items.length
          });
        })
        .catch(() => {});
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || page !== "list") return;
    refreshVouchPreview();
  }, [isLoggedIn, page, activeTab, refreshVouchPreview]);

  /** 채팅 목록 탭 미선택 시(null)에는 전체 목록과 동일하게 취급 */
  const listFilterTab = activeTab ?? "all";

  const sortByPinned = (rooms) =>
    [...rooms].sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)));

  const currentRoomsForList = useMemo(() => {
    const withMeta = (groupId, list) =>
      (list || [])
        .map((room) => {
          const roomId = `${groupId}:${room.id}`;
          const prefs = readRoomPrefs(roomId);
          if (prefs.hidden) return null;
          const enriched = {
            ...room,
            roomId,
            name: prefs.displayName || room.name,
            unreadCount: unreadByRoom[roomId] || 0,
            isFavorite: favoriteRooms.has(roomId),
            isPinned: Boolean(prefs.pinned),
            notificationsMuted: Boolean(prefs.muted)
          };
          const demoMeta = demoFamilyMetaForRoom(roomId, enriched);
          if (demoMeta) Object.assign(enriched, demoMeta);
          enriched.isFamilyMember =
            !enriched.isOfficial &&
            (Boolean(enriched.familyRegistered) ||
              roomMatchesFamilyPeer(enriched, familyActivePeers) ||
              familyBadgeRoomIds.has(roomId));
          return enriched;
        })
        .filter(Boolean);
    const allRooms = [
      ...withMeta("friends", roomCatalog.friends),
      ...withMeta("work", roomCatalog.work),
      ...withMeta("family", roomCatalog.family),
      ...withMeta("subscribe", roomCatalog.subscribe)
    ];

    const officialEntry = {
      id: "official",
      roomId: "vlue:official",
      name: "VLUE 공식 알림",
      lastMsg: officialChannelMeta.lastMsg,
      time: officialChannelMeta.time || "—",
      membershipTier: "free",
      isOfficial: true,
      cardName: "VLUE",
      cardOrg: "VLUE",
      unreadCount: officialChannelMeta.pendingCount,
      isFavorite: favoriteRooms.has("vlue:official")
    };

    const memoEntry = {
      id: "memo",
      roomId: "vlue:memo",
      name: "나의 메모장",
      lastMsg: memoMeta.preview
        ? memoMeta.preview
        : memoMeta.count > 0
          ? `저장된 메모 ${memoMeta.count}개`
          : "메모를 작성하거나 외부 앱에서 공유해보세요",
      time: "—",
      isMemo: true,
      isPinned: true,
      unreadCount: memoMeta.unreadShareCount || 0,
      membershipTier: "free"
    };

    const withOfficialFirst = (rooms) => {
      const officialPrefs = readRoomPrefs("vlue:official");
      const memoPrefs = readRoomPrefs("vlue:memo");
      const head = [];
      if (!officialPrefs.hidden) {
        head.push({
          ...officialEntry,
          name: officialPrefs.displayName || officialEntry.name,
          isPinned: Boolean(officialPrefs.pinned),
          notificationsMuted: Boolean(officialPrefs.muted)
        });
      }
      if (!memoPrefs.hidden) {
        head.push({
          ...memoEntry,
          name: memoPrefs.displayName || memoEntry.name,
          notificationsMuted: Boolean(memoPrefs.muted)
        });
      }
      if (!head.length) return sortByPinned(rooms);
      return [...head, ...sortByPinned(rooms)];
    };

    if (listFilterTab === "push") return [];

    if (listFilterTab === "all") {
      return withOfficialFirst(allRooms);
    }
    if (listFilterTab === "favorites") {
      const favOnly = allRooms.filter((room) => room.isFavorite);
      return favoriteRooms.has("vlue:official") ? withOfficialFirst(favOnly) : sortByPinned(favOnly);
    }
    if (listFilterTab === "clients") return sortByPinned(withMeta("work", roomCatalog.work));
    if (listFilterTab === "unread") {
      const withUnread = allRooms.filter((room) => (room.unreadCount || 0) > 0);
      return officialChannelMeta.pendingCount > 0 ? withOfficialFirst(withUnread) : sortByPinned(withUnread);
    }
    if (listFilterTab === "subscribe") return sortByPinned(withMeta("subscribe", roomCatalog.subscribe));
    return [];
  }, [
    listFilterTab,
    roomCatalog,
    unreadByRoom,
    favoriteRooms,
    officialChannelMeta,
    familyActivePeers,
    familyBadgeRoomIds,
    chatPrefsTick,
    memoMeta
  ]);
  const currentRoomInfo = useMemo(() => {
    const defaults = {
      name: "상대방",
      membershipTier: "free",
      cardName: "상대방",
      cardTitle: "사용자",
      cardOrg: "상대방 조직",
      vcidLettering: true
    };
    if (!selectedRoomId) return defaults;
    if (selectedRoomId === "vlue:official") {
      return {
        name: "VLUE 공식 알림",
        membershipTier: "free",
        cardName: "VLUE",
        cardTitle: "",
        cardOrg: "VLUE",
        vcidLettering: false
      };
    }
    const [group, id] = selectedRoomId.split(":");
    const found = (roomCatalog[group] || []).find((r) => r.id === id);
    if (!found) return defaults;
    return { ...found, vcidLettering: found.vcidLettering !== false };
  }, [selectedRoomId, roomCatalog]);

  const peerPhone = useMemo(() => {
    if (!selectedRoomId) return "";
    return roomPhoneByKey[selectedRoomId] || "010-0000-0000";
  }, [selectedRoomId]);

  const myCardProfile = useMemo(() => {
    let legalName = "";
    try {
      legalName = String(localStorage.getItem("vlue_legal_name") || "").trim();
    } catch {
      legalName = "";
    }
    const org = localStorage.getItem("myCardOrganization");
    const displayName = localStorage.getItem("myCardDisplayName");
    const effectiveJobTitle = effectiveCardJobTitle();
    /* 미설정 시 VLUE 로고로 채우지 않음 — 프로필/로고 자리는 무지(빈) 상태 유지 */
    const logoResolved = (readAvatar("card") || readAvatar("primary") || "").trim();
    const phone = readLetteringFixedIdentity().phone || localStorage.getItem("myCardPhone") || DEFAULT_MY_PHONE;

    if (!digitalCardActive) {
      return {
        digitalCardIssued: false,
        organization: org || "",
        title: effectiveJobTitle || "",
        name: scrubBrandDisplayName(displayName || legalName || "") || "",
        phone,
        email: "",
        address: "",
        landline: "",
        fax: "",
        backNote: "",
        introBack:
          "가입 시 VLUE 명함 발급을 신청하지 않았습니다. 추후 고객센터·설정에서 발급 신청이 열리면 연결됩니다.",
        logoUrl: logoResolved
      };
    }

    const storedFax = readCardFax();
    const storedPromo = readCardPromo();
    const storedEmail = readCardEmail();
    const cardEmail = storedEmail || getDefaultMemberVlueEmail();
    const promoText = storedPromo || "";
    const fixed = readLetteringFixedIdentity();
    const identityName = scrubBrandDisplayName(displayName || legalName || fixed.name || "");
    const identityOrg = org || fixed.organization || "";
    if (/^vlue$/i.test(String(displayName || "").trim())) {
      try {
        localStorage.removeItem("myCardDisplayName");
      } catch {
        /* ignore */
      }
    }

    return {
      digitalCardIssued: true,
      organization: identityOrg,
      title: effectiveJobTitle || "",
      name: identityName,
      phone,
      email: readCardEmailKind() === "personal" && storedEmail ? storedEmail : cardEmail,
      address: "",
      landline: "",
      fax: storedFax || "",
      backNote: promoText,
      introBack: promoText,
      logoUrl: logoResolved
    };
  }, [membershipTier, digitalCardActive, cardFieldsTick, avatarTick]);
  const headerProfileAvatar = useMemo(() => readProfilePhotoAvatar(), [avatarTick]);
  const profileByRoomId = useMemo(() => {
    const out = {};
    Object.entries(roomCatalog).forEach(([tab, rooms]) => {
      (rooms || []).forEach((room) => {
        const rid = `${tab}:${room.id}`;
        out[rid] = {
          userId: rid,
          membershipTier: room.membershipTier || "free",
          organization: room.cardOrg || room.name,
          title: room.cardTitle || "",
          name: room.cardName || room.name,
          legalName: String(room.verifiedLegalName || "").trim(),
          phone: roomPhoneByKey[rid] || "",
          introBack: room.membershipTier === "premium" ? `${room.name} 공식 채널\n문의 환영합니다.` : "",
          vcidLettering: room.vcidLettering !== false
        };
      });
    });
    out.me = {
      userId: "me",
      membershipTier,
      digitalCardIssued: myCardProfile.digitalCardIssued !== false,
      organization: myCardProfile.organization,
      title: myCardProfile.title,
      name: myCardProfile.name,
      phone: myCardProfile.phone,
      email: myCardProfile.email || "",
      address: myCardProfile.address || "",
      landline: myCardProfile.landline || "",
      fax: myCardProfile.fax || "",
      backNote: myCardProfile.backNote || "",
      introBack: myCardProfile.introBack || "",
      logoUrl: myCardProfile.logoUrl || "",
      vcidLettering: readVcidLetteringFromStorage()
    };
    return out;
  }, [roomCatalog, membershipTier, myCardProfile, vcidProfileTick]);

  const saveToContacts = useCallback(async (profile) => {
    const r = await saveProfileToDeviceContacts(profile);
    if (!r.ok && !r.cancelled) {
      setBottomToast(r.error || "연락처 저장에 실패했습니다.");
      setTimeout(() => setBottomToast(""), 3200);
    } else if (r.ok) {
      const hint =
        r.method === "share"
          ? "공유 메뉴에서 연락처 앱을 선택하세요."
          : r.method === "native"
            ? "연락처 앱으로 전달했습니다."
            : "vCard 파일을 받았습니다. 열어 주소록에 추가하세요.";
      setBottomToast(hint);
      setTimeout(() => setBottomToast(""), 3200);
    }
    return r;
  }, []);

  const saveCardToWallet = useCallback(async (card) => {
    if (!card?.userId) return;
    const nextItem = {
      id: `${card.userId}-${Date.now()}`,
      userId: card.userId,
      savedAt: new Date().toISOString(),
      snapshot: buildCardSnapshot(card)
    };
    setCardWallet((prev) => {
      const deduped = prev.filter((item) => item.userId !== card.userId);
      const next = [nextItem, ...deduped];
      writeCardWallet(next);
      return next;
    });
    // 명함첩은 localStorage 전용 — Supabase REST(card_wallet) 직접 쓰기는 RLS 보안상 사용하지 않음
  }, []);

  const removeCardFromWallet = useCallback((userId) => {
    if (!userId) return;
    setCardWallet((prev) => {
      const next = prev.filter((item) => item.userId !== userId);
      writeCardWallet(next);
      return next;
    });
  }, []);

  const inviteCandidates = useMemo(() => {
    if (!selectedRoomId) return [];
    const out = [];
    Object.entries(roomCatalog).forEach(([g, rooms]) => {
      (rooms || []).forEach((r) => {
        if (r.isGroup) return;
        const roomKey = `${g}:${r.id}`;
        if (roomKey === selectedRoomId) return;
        out.push({ roomKey, group: g, id: r.id, name: r.name });
      });
    });
    return out;
  }, [selectedRoomId, roomCatalog]);
  const totalUnread = useMemo(() => Object.values(unreadByRoom).reduce((sum, c) => sum + (c || 0), 0), [unreadByRoom]);
  const unreadByTab = useMemo(() => {
    const sumByPrefix = (prefix) =>
      Object.entries(unreadByRoom).reduce((sum, [roomId, count]) => (roomId.startsWith(`${prefix}:`) ? sum + (count || 0) : sum), 0);
    return {
      all: sumByPrefix("family") + sumByPrefix("friends") + sumByPrefix("work") + sumByPrefix("subscribe"),
      favorites: sumByPrefix("friends"),
      clients: sumByPrefix("work"),
      unread: sumByPrefix("family"),
      subscribe: sumByPrefix("subscribe"),
      push: pushUnreadCount
    };
  }, [unreadByRoom, pushUnreadCount]);

  const subscribeHubRooms = useMemo(
    () =>
      (roomCatalog.subscribe || []).map((r) => ({
        roomId: `subscribe:${r.id}`,
        name: r.cardName || r.name,
        time: r.time || "—",
        lastMsg: r.lastMsg || "",
        unreadCount: unreadByRoom[`subscribe:${r.id}`] || 0
      })),
    [roomCatalog, unreadByRoom]
  );
  const subscribeChatUnreadTotal = useMemo(
    () => subscribeHubRooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0),
    [subscribeHubRooms]
  );

  const floatingRooms = useMemo(() => {
    if (!floatingRoomIds.size) return [];
    const byId = new Map();
    Object.entries(roomCatalog).forEach(([group, list]) => {
      (list || []).forEach((room) => {
        const roomId = `${group}:${room.id}`;
        if (floatingRoomIds.has(roomId)) {
          const prefs = readRoomPrefs(roomId);
          byId.set(roomId, { roomId, name: prefs.displayName || room.name });
        }
      });
    });
    if (floatingRoomIds.has("vlue:official")) {
      byId.set("vlue:official", { roomId: "vlue:official", name: "VLUE 공식 알림" });
    }
    return [...byId.values()];
  }, [floatingRoomIds, roomCatalog, chatPrefsTick]);

  const hasUnreadChatsForMarkAll = useMemo(
    () => totalUnread + (officialChannelMeta.pendingCount || 0) > 0,
    [totalUnread, officialChannelMeta.pendingCount]
  );

  const markAllChatsRead = useCallback(() => {
    setUnreadByRoom((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        next[k] = 0;
      });
      return next;
    });
    setOfficialChannelMeta((prev) => ({
      ...prev,
      pendingCount: 0
    }));
  }, []);

  const toggleBlockRoom = useCallback((roomId) => {
    setBlockedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      localStorage.setItem("vlue_blocked_rooms", JSON.stringify([...next]));
      return next;
    });
  }, []);
  const toggleFavoriteRoom = useCallback((roomId) => {
    setFavoriteRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      localStorage.setItem("vlue_favorite_rooms", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const finishOnboarding = useCallback((payload) => {
    const tier = normalizeMembershipKind(payload?.membershipKind || payload?.membershipTier);
    setMembershipTier(tier);
    localStorage.setItem("membershipTier", tier);
    localStorage.setItem("vlue_membership_tier", tier);
    localStorage.setItem("vlue_membership_kind", tier);
    if (payload?.postSignupPayment && isBillableMembershipKind(tier)) {
      writePendingPayment(payload.postSignupPayment);
      setPostSignupPending(payload.postSignupPayment);
      setPostSignupPaymentOpen(true);
    }
    localStorage.setItem(ONBOARDING_DONE_KEY, "1");
    localStorage.setItem(SESSION_KEY, "1");
    markRuntimePermissionsPending();
    setDigitalCardActive(readDigitalCardActive());
    setOnboardingComplete(true);
    setSignupOnboardingOpen(false);
    setIsLoggedIn(true);
    setCardFieldsTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || signupOnboardingOpen) return;
    const pending = readPendingPayment();
    if (pending?.membershipKind && isBillableMembershipKind(pending.membershipKind)) {
      setPostSignupPending(pending);
      setPostSignupPaymentOpen(true);
    }
  }, [isLoggedIn, signupOnboardingOpen]);

  const applyMembershipTierFromHub = useCallback((tier) => {
    const normalized = normalizeMembershipKind(tier);
    if (!normalized) return;
    setMembershipTier(normalized);
    localStorage.setItem("membershipTier", normalized);
    localStorage.setItem("vlue_membership_tier", normalized);
    localStorage.setItem("vlue_membership_kind", normalized);
    setCardFieldsTick((n) => n + 1);
  }, []);

  /** 로그인·소셜 세션 — API billing tier → React state (무료 포함 항상 반영) */
  const applyLoginMembershipTier = useCallback(
    (data) => {
      const handle = String(data?.publicHandle || "")
        .trim()
        .toLowerCase()
        .replace(/^@/, "");
      if (handle === "ceo") {
        applyMembershipTierFromHub("paid");
        return;
      }
      const er = String(data?.enterpriseRole || "").trim().toUpperCase();
      if (er && er !== "NONE") {
        applyMembershipTierFromHub("b2b");
        return;
      }
      const raw = String(data?.membershipTier || data?.membershipKind || "")
        .trim()
        .toLowerCase();
      if (raw === "standard" || raw === "premium" || raw === "paid") {
        applyMembershipTierFromHub("paid");
      } else if (raw === "b2b") {
        applyMembershipTierFromHub("b2b");
      } else {
        applyMembershipTierFromHub("free");
      }
    },
    [applyMembershipTierFromHub]
  );

  const handleSignup = useCallback((intent = "general") => {
    const nextIntent = intent === "trust" ? "trust" : "general";
    setSignupIntent(nextIntent);
    if (shouldOpenSignupInExternalBrowser()) {
      openElectronExternalSignup();
      setGuestAuthOverlay(false);
      setPendingAuthAction(null);
      setBottomToast("브라우저에서 가입을 완료한 뒤, PC 앱에서 로그인해 주세요.");
      setTimeout(() => setBottomToast(""), 5000);
      return;
    }
    localStorage.removeItem(ONBOARDING_DONE_KEY);
    try {
      localStorage.removeItem(DIGITAL_CARD_ACTIVE_KEY);
      localStorage.removeItem("vlue_digital_card_id");
      localStorage.setItem(SESSION_KEY, "0");
      if (nextIntent === "trust") {
        sessionStorage.setItem("vlue_onboarding_prefer_trust", "1");
      } else {
        sessionStorage.removeItem("vlue_onboarding_prefer_trust");
      }
    } catch {
      /* ignore */
    }
    setIsLoggedIn(false);
    setShowSplash(false);
    setDigitalCardActive(false);
    setOnboardingComplete(false);
    setSignupOnboardingOpen(true);
  }, []);

  const persistAuthSessionAfterLogin = useCallback((data) => {
    if (data.userId) localStorage.setItem("vlue_server_user_id", data.userId);
    if (data.accessToken || data.refreshToken) {
      setVlueSessionTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      });
    }
    if (data.publicHandle) localStorage.setItem("vlue_member_handle", `@${String(data.publicHandle)}`);
    if (data.legalName) localStorage.setItem("vlue_legal_name", String(data.legalName).trim());
    if (data.accountStatus != null) localStorage.setItem("vlue_account_status", String(data.accountStatus));
    persistDccAccessHintsFromSession(data);
    localStorage.setItem(SESSION_KEY, "1");
    setIsLoggedIn(true);
    setCardFieldsTick((n) => n + 1);
  }, []);

  const processTierChangeFromLoginData = useCallback(
    (data) => {
      try {
        const approvedByApi =
          data?.membershipChangeApproved === true ||
          data?.membershipChangeStatus === "approved" ||
          data?.tierChangeStatus === "approved";
        const rawTarget = String(
          data?.membershipChangeTarget || data?.tierChangeTarget || data?.approvedTier || ""
        ).trim();
        const approvedTarget =
          rawTarget === "standard" || rawTarget === "premium" ? "paid" : rawTarget;
        if (approvedByApi && approvedTarget && approvedTarget !== membershipTier) {
          localStorage.setItem(TIER_CHANGE_TARGET_KEY, approvedTarget);
          localStorage.setItem(TIER_CHANGE_STATE_KEY, "approved");
          setTierBillingPrompt({ open: true, targetTier: approvedTarget });
        }
      } catch {
        /* ignore */
      }
    },
    [membershipTier]
  );

  useEffect(() => {
    const ig = consumeInstagramLinkReturn();
    if (ig.handled) {
      if (ig.success) {
        const name = ig.username ? `@${ig.username}` : "Instagram";
        setBottomToast(`${name} 인증완료 · 게시물 사진을 선택할 수 있습니다.`);
      } else {
        setBottomToast(ig.message || "Instagram 연동에 실패했습니다.");
      }
      const t = setTimeout(() => setBottomToast(""), 3200);
      return () => clearTimeout(t);
    }

    const kakao = consumeKakaoLinkReturn();
    if (kakao.handled) {
      if (kakao.success) {
        const name = kakao.nickname ? String(kakao.nickname) : "카카오";
        setBottomToast(`${name} 카카오 프로필 인증이 완료되었습니다.`);
      } else {
        setBottomToast(kakao.message || "카카오 연동에 실패했습니다.");
      }
      const t = setTimeout(() => setBottomToast(""), 3200);
      return () => clearTimeout(t);
    }

    const result = consumeSocialOAuthReturn();
    if (!result.handled) return;
    if (result.success && result.session) {
      clearAccountScopedLocalStorage({ keepRememberLogin: false, keepOnboarding: true });
      persistAuthSessionAfterLogin(result.session);
      processTierChangeFromLoginData(result.session);
      applyLoginMembershipTier(result.session);
      void (async () => {
        try {
          const { hydrateBizcardFromLoginPayload, syncBizcardAccountFromApi } = await import(
            "./lib/bizcardAccountSync.js"
          );
          hydrateBizcardFromLoginPayload(result.session);
          await syncBizcardAccountFromApi({ force: true });
        } catch {
          /* ignore */
        }
        try {
          const { hydrateShowcaseStyleFromServer, restoreShowcaseStyleFromServer, needsShowcaseStyleLocalRestore } =
            await import("./lib/showcase/showcaseStyleSync.js");
          if (needsShowcaseStyleLocalRestore()) {
            await restoreShowcaseStyleFromServer();
          } else {
            await hydrateShowcaseStyleFromServer({ forceServer: true });
          }
        } catch {
          /* ignore */
        }
        try {
          const { restoreDigitalCardFromServer } = await import("./lib/digitalCardApi.js");
          const meta = await restoreDigitalCardFromServer({ force: true });
          if (meta?.issued) {
            localStorage.setItem(DIGITAL_CARD_ACTIVE_KEY, "1");
            setDigitalCardActive(true);
          } else {
            localStorage.setItem(DIGITAL_CARD_ACTIVE_KEY, "0");
            setDigitalCardActive(false);
          }
        } catch {
          /* ignore */
        }
        setCardFieldsTick((n) => n + 1);
      })();
      const label =
        result.provider === "google"
          ? "Google"
          : result.provider === "kakao"
            ? "카카오"
            : result.provider === "naver"
              ? "네이버"
              : result.provider === "instagram"
                ? "Instagram"
                : "소셜";
      setBottomToast(`${label}로 로그인되었습니다.`);
      const t = setTimeout(() => setBottomToast(""), 2200);
      return () => clearTimeout(t);
    }
    const formatted = formatSocialLoginError(result.message);
    if (isSnsUnlinkedError(result.message || formatted)) {
      setSnsUnlinkedAlert(formatted);
      return undefined;
    }
    setBottomToast(formatted || "소셜 로그인에 실패했습니다. 다시 시도해 주세요.");
    const t = setTimeout(() => setBottomToast(""), 3200);
    return () => clearTimeout(t);
  }, [persistAuthSessionAfterLogin, processTierChangeFromLoginData, applyLoginMembershipTier]);

  const handleLogin = useCallback(
    async (payload) => {
      const id = String(payload?.id || "").trim().toLowerCase();
      const password = String(payload?.password ?? "");
      const remember = !!payload?.rememberLogin;
      if (!id || !password) {
        const msg = "아이디와 비밀번호를 입력해 주세요.";
        setBottomToast(msg);
        setTimeout(() => setBottomToast(""), 2200);
        return { ok: false, error: msg };
      }
      try {
        const deviceToken = getDeviceToken();
        const headers = { "Content-Type": "application/json", ...clientKindHeaders() };
        let res;
        if (payload?.deviceEmailTicket && payload?.emailCode) {
          res = await fetch(apiUrl("/api/auth/verify-code"), {
            method: "POST",
            headers,
            body: JSON.stringify({
              purpose: "login_device",
              ticket: payload.deviceEmailTicket,
              code: payload.emailCode,
              deviceToken
            })
          });
        } else {
          res = await fetch(apiUrl("/api/auth/login"), {
            method: "POST",
            headers,
            body: JSON.stringify({
              loginId: id,
              password,
              deviceToken,
              platform: detectAuthPlatform()
            })
          });
        }
        const data = await res.json().catch(() => ({}));
        if (data?.status === "email_code_required") {
          if (data.deviceToken) saveDeviceToken(data.deviceToken);
          return {
            ok: false,
            emailCodeRequired: true,
            ticket: data.ticket,
            maskedEmail: data.maskedEmail,
            message: data.message,
            supportEmail: data.supportEmail || "support@vlue.kr"
          };
        }
        if (data?.status === "email_unavailable") {
          const msg = data?.message || data?.error || "가입 이메일이 없어 새 기기 확인을 할 수 없습니다.";
          setBottomToast(msg);
          setTimeout(() => setBottomToast(""), 4500);
          return { ok: false, error: msg };
        }
        if (data?.status === "device_pending" || (res.status === 403 && data?.deviceToken && !data?.ticket)) {
          if (data.deviceToken) saveDeviceToken(data.deviceToken);
          const msg =
            data?.message || "이 PC는 기기 승인이 필요합니다. 승인된 기기에서 승인 후 다시 로그인해 주세요.";
          setBottomToast(msg);
          setTimeout(() => setBottomToast(""), 4500);
          return { ok: false, error: msg, devicePending: true };
        }
        if (!res.ok) {
          const msg = data?.error || "로그인에 실패했습니다.";
          setBottomToast(msg);
          setTimeout(() => setBottomToast(""), 2800);
          return { ok: false, error: msg };
        }
        try {
          if (remember && id) {
            localStorage.setItem(SAVED_LOGIN_ID_KEY, id);
            localStorage.setItem(SAVED_LOGIN_PASSWORD_KEY, password);
            localStorage.setItem(REMEMBER_LOGIN_KEY, "1");
          } else {
            localStorage.removeItem(SAVED_LOGIN_ID_KEY);
            localStorage.removeItem(SAVED_LOGIN_PASSWORD_KEY);
            localStorage.removeItem(REMEMBER_LOGIN_KEY);
          }
        } catch {
          /* ignore */
        }
        /* 이전 계정 로컬 잔여 제거 후 서버 세션·hydrate */
        clearAccountScopedLocalStorage({ keepRememberLogin: true, keepOnboarding: true });
        persistAuthSessionAfterLogin(data);
        if (data.deviceToken) saveDeviceToken(data.deviceToken);
        try {
          const { hydrateBizcardFromLoginPayload } = await import("./lib/bizcardAccountSync.js");
          hydrateBizcardFromLoginPayload(data);
          try {
            const { syncBizcardAccountFromApi } = await import("./lib/bizcardAccountSync.js");
            await syncBizcardAccountFromApi({ force: true });
          } catch {
            /* ignore */
          }
          try {
            const {
              hydrateShowcaseStyleFromServer,
              restoreShowcaseStyleFromServer,
              needsShowcaseStyleLocalRestore
            } = await import("./lib/showcase/showcaseStyleSync.js");
            if (needsShowcaseStyleLocalRestore()) {
              await restoreShowcaseStyleFromServer();
            } else {
              await hydrateShowcaseStyleFromServer({ forceServer: true });
            }
          } catch {
            /* ignore */
          }
          const handle = String(data.publicHandle || id || "")
            .trim()
            .toLowerCase()
            .replace(/^@/, "");
          applyLoginMembershipTier(data);
          if (data.phoneE164) localStorage.setItem("vlue_phone_e164", String(data.phoneE164));
          if (handle === "ceo") {
            localStorage.setItem("vlue_phone_e164", "+821080144666");
            localStorage.setItem("myCardPhone", "010-8014-4666");
            localStorage.setItem("myCardDisplayName", "이종근");
            localStorage.setItem("vlue_legal_name", "이종근");
            localStorage.setItem("myCardOrganization", "VCID KOREA");
            localStorage.setItem("vlue_company_locked", "VCID KOREA");
            const { readLetteringFixedIdentity } = await import("./lib/letteringBizcardStorage.js");
            readLetteringFixedIdentity();
          }
          try {
            const { syncMemberIdentityToNative } = await import("./lib/showcaseSmsShare.js");
            syncMemberIdentityToNative();
          } catch {
            /* ignore */
          }
          /* 디지털 명함 — 재설치 대비 서버 스냅샷 전체 복원 */
          try {
            const { restoreDigitalCardFromServer } = await import("./lib/digitalCardApi.js");
            const meta = await restoreDigitalCardFromServer({ force: true });
            if (meta?.issued || handle === "ceo") {
              localStorage.setItem(DIGITAL_CARD_ACTIVE_KEY, "1");
              setDigitalCardActive(true);
            } else {
              localStorage.setItem(DIGITAL_CARD_ACTIVE_KEY, "0");
              setDigitalCardActive(false);
            }
          } catch {
            if (handle === "ceo") {
              localStorage.setItem(DIGITAL_CARD_ACTIVE_KEY, "1");
              setDigitalCardActive(true);
            }
          }
          if (data.enterpriseRole) {
            localStorage.setItem("vlue_enterprise_role", data.enterpriseRole);
          }
          if (data.lineType) localStorage.setItem("vlue_line_type", data.lineType);
          setCardFieldsTick((n) => n + 1);
        } catch {
          /* ignore */
        }
        setBottomToast("로그인되었습니다. 이 기기에서는 로그아웃 전까지 연결을 유지합니다.");
        setTimeout(() => setBottomToast(""), 2200);
        processTierChangeFromLoginData(data);
        return { ok: true };
      } catch (e) {
        const url = apiUrl("/api/auth/login");
        const raw = e?.message || "Load failed";
        const msg = /load failed|failed to fetch|networkerror/i.test(raw)
          ? `네트워크 오류 (${url}) — PC·폰 같은 Wi‑Fi, Safari 로컬 네트워크 허용, 페이지 강력 새로고침을 확인해 주세요.`
          : raw;
        setBottomToast(msg);
        setTimeout(() => setBottomToast(""), 4500);
        return { ok: false, error: msg };
      }
    },
    [persistAuthSessionAfterLogin, processTierChangeFromLoginData, applyLoginMembershipTier]
  );

  const handleSocialLogin = useCallback(
    async (provider) => {
      if (provider === "find_account") {
        try {
          sessionStorage.setItem("vlue_open_account_recovery", "1");
        } catch {
          /* ignore */
        }
        return true;
      }

      const labels = {
        kakao: "카카오",
        google: "Google",
        naver: "네이버",
        instagram: "Instagram",
        apple: "Apple",
        pass: "PASS"
      };

      if (provider === "google") {
        window.location.assign(apiUrl("/api/v1/auth/google"));
        return true;
      }

      if (provider === "naver") {
        window.location.assign(apiUrl("/api/v1/auth/naver"));
        return true;
      }

      if (provider === "instagram") {
        window.location.assign(apiUrl("/api/v1/auth/instagram"));
        return true;
      }

      if (provider !== "kakao") {
        const msg = `${labels[provider] || provider} 간편 로그인은 준비 중입니다. 카카오·Google·네이버·Instagram 또는 아이디 로그인을 이용해 주세요.`;
        throw new Error(msg);
      }

      const accessToken = await getKakaoAccessTokenWithLogin();
      const me = await fetchKakaoUserMeClient(accessToken);
      const res = await fetch(apiUrl("/api/auth/social-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          socialToken: accessToken,
          provider: "kakao",
          email: me.email || "",
          nickname: me.nickname || ""
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const formatted = formatSocialLoginError(data?.error);
        if (isSnsUnlinkedError(data?.error || formatted)) {
          setSnsUnlinkedAlert(formatted);
          return false;
        }
        throw new Error(formatted);
      }
      try {
        localStorage.removeItem(SAVED_LOGIN_ID_KEY);
        localStorage.removeItem(SAVED_LOGIN_PASSWORD_KEY);
        localStorage.removeItem(REMEMBER_LOGIN_KEY);
      } catch {
        /* ignore */
      }
      clearAccountScopedLocalStorage({ keepRememberLogin: false, keepOnboarding: true });
      try {
        localStorage.setItem("vlue_social_login_provider", "kakao");
      } catch {
        /* ignore */
      }
      persistAuthSessionAfterLogin(data);
      processTierChangeFromLoginData(data);
      applyLoginMembershipTier(data);
      try {
        const { hydrateBizcardFromLoginPayload, syncBizcardAccountFromApi } = await import(
          "./lib/bizcardAccountSync.js"
        );
        hydrateBizcardFromLoginPayload(data);
        await syncBizcardAccountFromApi({ force: true });
      } catch {
        /* ignore */
      }
      try {
        const { hydrateShowcaseStyleFromServer, restoreShowcaseStyleFromServer, needsShowcaseStyleLocalRestore } =
          await import("./lib/showcase/showcaseStyleSync.js");
        if (needsShowcaseStyleLocalRestore()) {
          await restoreShowcaseStyleFromServer();
        } else {
          await hydrateShowcaseStyleFromServer({ forceServer: true });
        }
      } catch {
        /* ignore */
      }
      try {
        const { restoreDigitalCardFromServer } = await import("./lib/digitalCardApi.js");
        const meta = await restoreDigitalCardFromServer({ force: true });
        if (meta?.issued) {
          localStorage.setItem(DIGITAL_CARD_ACTIVE_KEY, "1");
          setDigitalCardActive(true);
        } else {
          localStorage.setItem(DIGITAL_CARD_ACTIVE_KEY, "0");
          setDigitalCardActive(false);
        }
      } catch {
        /* ignore */
      }
      setBottomToast(`${labels.kakao}로 로그인되었습니다.`);
      setTimeout(() => setBottomToast(""), 2200);
      return true;
    },
    [persistAuthSessionAfterLogin, processTierChangeFromLoginData, applyLoginMembershipTier]
  );

  const handleRequestTierChange = useCallback(async (tier) => {
    const nextTier = String(tier || "").trim();
    if (!nextTier) return false;
    const uid = localStorage.getItem("vlue_server_user_id") || "";
    try {
      const res = await vlueAuthFetch(apiUrl("/api/auth/membership-change/request"), {
        method: "POST",
        headers: vlueAuthHeaders(),
        body: JSON.stringify({ targetTier: nextTier, via: "ai_consult" })
      });
      if (!res.ok) throw new Error();
      localStorage.setItem(TIER_CHANGE_TARGET_KEY, nextTier);
      localStorage.setItem(TIER_CHANGE_STATE_KEY, "pending");
      setBottomToast("등급 변경 승인 요청이 접수되었습니다. 승인 후 로그인 시 결제 안내가 표시됩니다.");
      setTimeout(() => setBottomToast(""), 3200);
      return true;
    } catch {
      localStorage.setItem(TIER_CHANGE_TARGET_KEY, nextTier);
      localStorage.setItem(TIER_CHANGE_STATE_KEY, "pending");
      setBottomToast("승인 요청이 등록되었습니다. 관리자 승인 후 로그인 시 결제 안내가 표시됩니다.");
      setTimeout(() => setBottomToast(""), 3200);
      return true;
    }
  }, []);

  const handleLogout = useCallback(() => {
    try {
      const rt = getRefreshToken();
      if (rt) {
        fetch(apiUrl("/api/auth/logout"), {
          method: "POST",
          headers: vlueAuthHeaders(),
          body: JSON.stringify({ refreshToken: rt })
        }).catch(() => {});
      }
    } catch {
      /* ignore */
    }
    clearVlueSessionTokens();
    clearAccountScopedLocalStorage({ keepRememberLogin: true, keepOnboarding: true });
    localStorage.setItem(SESSION_KEY, "0");
    clearBiometricSessionOnly();
    setDigitalCardActive(false);
    setIsLoggedIn(false);
    setProfileOpen(false);
    setPage("main");
    setActiveTab(null);
    setSelectedRoomId(null);
    setIsSearchOpen(false);
    navHistoryRef.current = [];
    setBiometricSeq((s) => s + 1);
  }, []);

  const handleWithdrawAccount = useCallback(async () => {
    try {
      await withdrawVlueAccount();
    } catch (e) {
      setBottomToast(e instanceof Error ? e.message : "탈퇴에 실패했습니다.");
      setTimeout(() => setBottomToast(""), 3200);
      return;
    }
    clearVlueSessionTokens();
    try {
      const extraKeys = [
        "membershipTier",
        "vcid",
        "myCardOrganization",
        "myCardDisplayName",
        "myCardPhone",
        "vlue_social_login_provider"
      ];
      extraKeys.forEach((k) => localStorage.removeItem(k));
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("vlue_")) localStorage.removeItem(k);
      });
      localStorage.setItem(ONBOARDING_DONE_KEY, "0");
      localStorage.removeItem(DIGITAL_CARD_ACTIVE_KEY);
      localStorage.setItem(SESSION_KEY, "0");
    } catch {
      /* ignore */
    }
    clearBiometricSessionOnly();
    setMembershipTier("free");
    setDigitalCardActive(false);
    setOnboardingComplete(false);
    setCardWallet([]);
    writeCardWallet([]);
    setCardFieldsTick((n) => n + 1);
    setIsLoggedIn(false);
    setProfileOpen(false);
    setPage("main");
    setActiveTab(null);
    setSelectedRoomId(null);
    setIsSearchOpen(false);
    navHistoryRef.current = [];
    setBottomToast("회원탈퇴가 완료되었습니다. 재가입 시 본인인증부터 다시 진행됩니다.");
    setTimeout(() => setBottomToast(""), 3200);
    setBiometricSeq((s) => s + 1);
  }, []);

  const showOnboardingFlow = signupOnboardingOpen;

  /** file:// PC 앱에서 인앱 온보딩이 열리면 외부 브라우저로 우회 */
  useEffect(() => {
    if (!signupOnboardingOpen || !shouldOpenSignupInExternalBrowser()) return;
    setSignupOnboardingOpen(false);
    openElectronExternalSignup();
    setBottomToast("브라우저에서 가입을 완료한 뒤, PC 앱에서 로그인해 주세요.");
    const t = setTimeout(() => setBottomToast(""), 5000);
    return () => clearTimeout(t);
  }, [signupOnboardingOpen]);

  const biometricAllowed = true;

  const createGroupRoom = useCallback(
    (parentRoomId, invitees, options = {}) => {
      const [tab, peerId] = parentRoomId.split(":");
      const parentPeer = (roomCatalog[tab] || []).find((r) => r.id === peerId);
      const parentName = parentPeer?.name || "상대";
      const names = invitees.map((i) => i.name);
      const groupTitle = [parentName, ...names].join(", ");
      const shortTitle = groupTitle.length > 26 ? `${groupTitle.slice(0, 26)}…` : groupTitle;
      const newId = `grp-${Date.now()}`;
      const newRoomKey = `${tab}:${newId}`;
      setRoomCatalog((prev) => ({
        ...prev,
        [tab]: [
          ...(prev[tab] || []),
          {
            id: newId,
            name: shortTitle,
            lastMsg: options.vmingOnCreate
              ? "브이밍 AI 동의를 요청했습니다."
              : "단체 채팅방이 열렸습니다.",
            time: "방금",
            isGroup: true
          }
        ]
      }));
      setMessagesByRoom((prev) => ({
        ...prev,
        [newRoomKey]: [
          {
            id: `sys-${Date.now()}`,
            type: "system",
            text: `「${shortTitle}」 단체 방이 생성되었습니다. 기존 1:1 대화는 그대로 유지됩니다.`
          }
        ]
      }));

      if (options.vmingOnCreate) {
        const requesterName = myCardProfile?.name || "방장";
        let requesterId = "me";
        try {
          requesterId = localStorage.getItem("vlue_server_user_id") || "me";
        } catch {
          /* ignore */
        }
        const uuidRe =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const members = [{ userId: requesterId, userName: requesterName }];
        if (uuidRe.test(peerId)) {
          members.push({ userId: peerId, userName: parentName });
        }
        for (const inv of invitees) {
          const uid = inv.userId || "";
          if (uid && uuidRe.test(uid)) {
            members.push({ userId: uid, userName: inv.name || "멤버" });
          } else if (inv.name) {
            members.push({ userId: inv.roomKey || `guest-${inv.name}`, userName: inv.name });
          }
        }
        scheduleAutoRequestVming(newRoomKey, {
          members,
          config: { consentMode: "all", validityDays: 90, sessionOnly: false }
        });
        navHistoryRef.current.push({
          page: pageRef.current,
          activeTab,
          selectedRoomId: selectedRoomRef.current
        });
        setActiveTab(tab);
        setSelectedRoomId(newRoomKey);
        setPage("room");
      }
    },
    [activeTab, myCardProfile?.name, roomCatalog]
  );

  const mapServerMessageToUi = useCallback((m, myId) => {
    const createdAt = String(m?.createdAt || "");
    const content = String(m?.content || "");
    if (m?.messageType === "system") {
      const isSecurityGuard = content.includes("[VLUE 보안 가드]");
      return {
        id: `sv:${m.id}`,
        type: "system",
        text: content,
        at: createdAt,
        disableAutoReply: true,
        ...(isSecurityGuard
          ? {
              securityGuard: true,
              intent_type: "generate_evidence",
              securityVaultPath: "/mypage?tab=security-vault"
            }
          : {})
      };
    }
    const mine = String(m?.senderId || "") === String(myId || "");
    return {
      id: `sv:${m.id}`,
      type: mine ? "me" : "target",
      text: content,
      at: createdAt,
      senderName: m?.senderName,
      status: mine ? "sent" : undefined
    };
  }, []);

  const mergeIncomingServerChatMessage = useCallback(
    (message, meta = {}) => {
      const peerUserId = String(meta.peerUserId || "");
      if (!peerUserId || !message?.id) return;
      const clientRoomId = `friends:${peerUserId}`;
      const uid = localStorage.getItem("vlue_server_user_id") || "";
      const mapped = mapServerMessageToUi(message, uid);
      if (!mapped?.id) return;

      setMessagesByRoom((prev) => {
        const cur = prev?.[clientRoomId] || [];
        if (cur.some((x) => x?.id === mapped.id)) return prev;
        return { ...prev, [clientRoomId]: [...cur, mapped] };
      });

      if (page !== "room" || selectedRoomId !== clientRoomId) {
        setUnreadByRoom((prev) => ({ ...prev, [clientRoomId]: (prev[clientRoomId] || 0) + 1 }));
        return;
      }

      const serverRoomId = meta.serverRoomId || serverDmRoomByPeer?.[peerUserId];
      const rawId = String(message.id || "");
      if (serverRoomId && rawId) {
        serverDmCursorRef.current = { ...(serverDmCursorRef.current || {}), [peerUserId]: rawId };
        vlueAuthFetch(`/api/chat/rooms/${encodeURIComponent(serverRoomId)}/read`, {
          method: "POST",
          headers: vlueAuthHeaders(),
          body: JSON.stringify({ lastReadMessageId: rawId })
        }).catch(() => {});
      }
    },
    [mapServerMessageToUi, page, selectedRoomId, serverDmRoomByPeer]
  );

  const appendOutgoingMessage = (roomId, payload) => {
    const now = new Date();
    const prev = lastMessageTimeByRoom[roomId];
    const sameMinute =
      prev &&
      prev.getFullYear() === now.getFullYear() &&
      prev.getMonth() === now.getMonth() &&
      prev.getDate() === now.getDate() &&
      prev.getHours() === now.getHours() &&
      prev.getMinutes() === now.getMinutes();
    const messageId = `me-${Date.now()}`;
    const content = typeof payload === "string" ? { text: payload } : payload || { text: "" };
    const messageType = content.type === "system" ? "system" : "me";
    const shouldAutoReply =
      content.disableAutoReply !== true && !serverDmEnabledRoomsRef.current.has(roomId);
    const next = {
      id: messageId,
      type: messageType,
      text: content.text || "",
      imageUrl: content.imageUrl,
      audioUrl: content.audioUrl,
      audioDurationSec: content.audioDurationSec,
      location: content.location,
      card: content.card,
      scheduledAt: content.scheduledAt,
      vmingEvent: content.vmingEvent,
      vmingMeta: content.vmingMeta,
      calendarEventId: content.calendarEventId,
      showTime: !prev || !sameMinute,
      timeText: fmt(now),
      at: now.toISOString(),
      status: "sent"
    };
    setMessagesByRoom((m) => ({ ...m, [roomId]: [...(m[roomId] || []), next] }));
    setLastMessageTimeByRoom((m) => ({ ...m, [roomId]: now }));
    if (messageType === "system") return;

    // 서버 DM 연결된 방이면: 실제 API로 전송하고, 성공 시 id를 sv:<serverId>로 치환해 중복 유입을 방지
    if (serverDmEnabledRoomsRef.current.has(roomId) && roomId.startsWith("friends:")) {
      const peerId = String(roomId.split(":")[1] || "").trim();
      const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidLike.test(peerId) && String(content.text || "").trim()) {
        (async () => {
          try {
            const uid = localStorage.getItem("vlue_server_user_id") || "";
            if (!uid) throw new Error("no_user");

            let serverRoomId = serverDmRoomByPeer?.[peerId];
            if (!serverRoomId) {
              const openRes = await vlueAuthFetch("/api/chat/rooms/open", {
                method: "POST",
                headers: vlueAuthHeaders(),
                body: JSON.stringify({ peerId })
              });
              const oj = await openRes.json().catch(() => ({}));
              if (!openRes.ok || !oj?.roomId) throw new Error(oj?.error || "server_room_open_failed");
              serverRoomId = String(oj.roomId);
              setServerDmRoomByPeer((prev) => ({ ...(prev || {}), [peerId]: serverRoomId }));
            }

            const sendRes = await vlueAuthFetch(`/api/chat/rooms/${encodeURIComponent(serverRoomId)}/messages`, {
              method: "POST",
              headers: vlueAuthHeaders(),
              body: JSON.stringify({ content: String(content.text || "").trim(), messageType: "normal" })
            });
            const sj = await sendRes.json().catch(() => ({}));
            if (!sendRes.ok || !sj?.message?.id) throw new Error(sj?.error || "send_failed");

            const serverMsgId = String(sj.message.id);
            const createdAt = String(sj.message.createdAt || new Date().toISOString());

            // cursor 갱신 + 읽음 처리
            serverDmCursorRef.current = { ...(serverDmCursorRef.current || {}), [peerId]: serverMsgId };
            vlueAuthFetch(`/api/chat/rooms/${encodeURIComponent(serverRoomId)}/read`, {
              method: "POST",
              headers: vlueAuthHeaders(),
              body: JSON.stringify({ lastReadMessageId: serverMsgId })
            }).catch(() => {});

            // 로컬 optimistic 메시지를 서버 id로 치환(중복 방지)
            setMessagesByRoom((m) => ({
              ...m,
              [roomId]: (m[roomId] || []).map((msg) =>
                msg.id === messageId
                  ? { ...msg, id: `sv:${serverMsgId}`, at: createdAt, status: "sent" }
                  : msg
              )
            }));
          } catch {
            setMessagesByRoom((m) => ({
              ...m,
              [roomId]: (m[roomId] || []).map((msg) =>
                msg.id === messageId ? { ...msg, status: "failed" } : msg
              )
            }));
          }
        })();
        return;
      }
    }

    // 기존 데모 방: 1.5초 후 읽음 처리(모의)
    setTimeout(() => {
      setMessagesByRoom((m) => ({
        ...m,
        [roomId]: (m[roomId] || []).map((msg) => (msg.id === messageId ? { ...msg, status: "read" } : msg))
      }));
    }, 1500);

    // 데모 수신 메시지: 채팅방 밖에 있으면 unread 증가
    if (!shouldAutoReply) return;
    setTimeout(() => {
      const replyAt = new Date().toISOString();
      const incoming = {
        id: `tg-${Date.now()}`,
        type: "target",
        text: "확인했어요. 곧 답드릴게요!",
        at: replyAt,
        timeText: fmt(new Date(replyAt))
      };
      setMessagesByRoom((m) => ({ ...m, [roomId]: [...(m[roomId] || []), incoming] }));
      const inSameRoom = pageRef.current === "room" && selectedRoomRef.current === roomId;
      if (!inSameRoom) {
        setUnreadByRoom((prev) => ({ ...prev, [roomId]: (prev[roomId] || 0) + 1 }));
      }
    }, 2200);
  };

  /** 하단 탭·홈·브라우저 탭 복귀 시 눈 연속 깜빡임(리마운트로 재생 보장) */
  const triggerHeaderEyeNavBlink = useCallback(() => {
    setEyeNavSeq((n) => n + 1);
  }, []);

  const [letteringPreviewOpen, setLetteringPreviewOpen] = useState(
    () => typeof window !== "undefined" && window.location.hash === "#lettering-preview"
  );
  const [letteringOverlayOpen, setLetteringOverlayOpen] = useState(
    () => typeof window !== "undefined" && window.location.hash.startsWith("#lettering-overlay")
  );
  const [letteringCertOpen, setLetteringCertOpen] = useState(false);
  const [letteringCertPayload, setLetteringCertPayload] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") window.VLUE_APP_MAIN = true;
    /* 네이티브가 이미 ON 이면 웹이 false 로 덮어쓰지 않음 (권한 다이얼로그만 켠 경우) */
    (async () => {
      try {
        const { readLetteringPermissionStatus } = await import("./lib/letteringSettings.js");
        const st = readLetteringPermissionStatus();
        if (st?.letteringEnabled && !readLetteringEnabled()) {
          writeLetteringEnabled(true);
          return;
        }
      } catch {
        /* ignore */
      }
      const hash = window.location.hash || "";
      if (hash.includes("forceLettering=1") || hash.includes("native=1")) {
        writeLetteringEnabled(true);
        return;
      }
      writeLetteringEnabled(readLetteringEnabled());
    })();
  }, []);

  /* 재설치 후 세션만 남은 경우 — 빈 로컬 명함·쇼케이스를 서버에서 복원 */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const uid = String(localStorage.getItem("vlue_server_user_id") || "").trim();
        if (!uid) return;
        const { needsDigitalCardLocalRestore, restoreDigitalCardFromServer } = await import(
          "./lib/digitalCardApi.js"
        );
        if (needsDigitalCardLocalRestore()) {
          await restoreDigitalCardFromServer({ force: true });
        }
        const showcase = await import("./lib/showcase/showcaseStyleSync.js");
        if (showcase.needsShowcaseStyleLocalRestore()) {
          await showcase.restoreShowcaseStyleFromServer();
        }
        if (!cancelled) setCardFieldsTick((n) => n + 1);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash || "";
      setLetteringPreviewOpen(h === "#lettering-preview");
      setLetteringOverlayOpen(h.startsWith("#lettering-overlay"));
      if (h === "#email-settings" || h === "#email") {
        setEmailForwardingSettingsOpen(true);
        setProfileOpen(false);
        return;
      }
      if (h === "#email-inbox" || h === "#mail") {
        setEmailForwardingSettingsOpen(false);
        setEmailInboxOpen(true);
      }
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onCert = (e) => {
      setLetteringCertPayload(e.detail || null);
      setLetteringCertOpen(true);
    };
    window.addEventListener("vlue-lettering-open-cert", onCert);
    return () => window.removeEventListener("vlue-lettering-open-cert", onCert);
  }, []);

  const goMainAndReset = () => {
    triggerHeaderEyeNavBlink();
    const resetAllScrollableToTop = () => {
      try {
        const root = appBodyRef.current || document.getElementById("app-body");
        window.scrollTo(0, 0);
        if (document?.documentElement) document.documentElement.scrollTop = 0;
        if (document?.body) document.body.scrollTop = 0;
        if (!root) return;
        const nodes = [root, ...Array.from(root.querySelectorAll("*"))];
        nodes.forEach((node) => {
          if (!node || typeof node.scrollTop !== "number") return;
          if (node.scrollHeight > node.clientHeight + 2) node.scrollTop = 0;
        });
      } catch {
        /* ignore */
      }
    };
    resetAllScrollableToTop();
    requestAnimationFrame(resetAllScrollableToTop);
    setTimeout(resetAllScrollableToTop, 60);
    setPage("main");
    setActiveTab(null);
    setSelectedRoomId(null);
    setIsSearchOpen(false);
    setGlobalSearchQuery("");
    navHistoryRef.current = [];
  };

  const ensureFriendRoom = useCallback((userId, userName) => {
    setRoomCatalog((prev) => {
      const exists = (prev.friends || []).some((r) => r.id === userId);
      if (exists) return prev;
      return {
        ...prev,
        friends: [
          ...(prev.friends || []),
          {
            id: userId,
            name: userName,
            lastMsg: "친구가 되었습니다. 인사 메시지를 보내보세요.",
            time: "방금",
            membershipTier: "free",
            cardName: userName,
            cardTitle: "",
            cardOrg: ""
          }
        ]
      };
    });
    setMessagesByRoom((prev) => {
      const key = `friends:${userId}`;
      if (prev[key]) return prev;
      return {
        ...prev,
        [key]: [{ id: `sys-${Date.now()}`, type: "system", text: `${userName}님과 친구가 되어 대화가 가능합니다.` }]
      };
    });
  }, []);

  const makingSendTargets = useMemo(() => {
    const out = [];
    const subscribe = [];
    const friends = [];
    Object.entries(roomCatalog).forEach(([tab, rooms]) => {
      (rooms || []).forEach((r) => {
        if (r.isOfficial) return;
        const roomId = `${tab}:${r.id}`;
        const label = `${r.cardName || r.name} (${tab})`;
        const item = { roomId, label, tab };
        out.push(item);
        if (tab === "subscribe") subscribe.push(item);
        if (tab === "friends") friends.push(item);
      });
    });
    return { all: out, subscribe, friends };
  }, [roomCatalog]);

  const cleanupExpiredAutoFeedPosts = useCallback(async () => {
    let registry = [];
    try {
      const raw = localStorage.getItem(FEED_AUTO_EXPIRY_REGISTRY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      registry = Array.isArray(parsed) ? parsed : [];
    } catch {
      registry = [];
    }
    if (!registry.length) return;
    const now = Date.now();
    const keep = [];
    for (const row of registry) {
      const expiresTs = new Date(row?.expiresAt || "").getTime();
      if (!row?.postId || Number.isNaN(expiresTs)) continue;
      if (expiresTs > now) {
        keep.push(row);
        continue;
      }
      try {
        await vlueAuthFetch(apiUrl(`/api/feed/posts/${encodeURIComponent(row.postId)}`), {
          method: "DELETE",
          headers: vlueAuthHeaders()
        });
      } catch {
        keep.push(row);
      }
    }
    try {
      localStorage.setItem(FEED_AUTO_EXPIRY_REGISTRY_KEY, JSON.stringify(keep));
    } catch {
      /* ignore */
    }
  }, []);

  const handleSendMakingAsset = useCallback(async (asset, options) => {
    if (!asset) return false;
    const audience = String(options?.audience || "all");
    const exclude = Array.isArray(options?.excludeRoomIds) ? options.excludeRoomIds : [];
    const autoFeedUpload = options?.autoFeedUpload === true;

    const allTargets = makingSendTargets.all || [];
    const subscribeTargets = makingSendTargets.subscribe || [];
    const friendTargets = makingSendTargets.friends || [];

    let targets = allTargets;
    if (audience === "subscribe") targets = subscribeTargets;
    if (audience === "friends") targets = friendTargets;
    if (audience === "exclude") {
      const ex = new Set(exclude);
      targets = allTargets.filter((t) => !ex.has(t.roomId));
    }
    if (!targets.length) return false;

    const badge = asset.type === "coupon" ? "[이벤트 쿠폰]" : "[홍보 카드]";
    const expiresTs = asset.expiresAt ? new Date(asset.expiresAt).getTime() : NaN;
    if (!Number.isNaN(expiresTs) && expiresTs <= Date.now()) return false;
    const lines = [
      `${badge} ${asset.title || ""}`.trim(),
      String(asset.body || "").trim(),
      asset.code ? `코드: ${asset.code}` : "",
      asset.expiresAt ? `유효기간: ${new Date(asset.expiresAt).toLocaleString("ko-KR")}` : "",
      asset.cta ? `안내: ${asset.cta}` : ""
    ].filter(Boolean);
    targets.forEach((t) => {
      const exposureCode = createExposureCode(asset.type === "coupon" ? "CP" : "PR");
      appendOutgoingMessage(t.roomId, {
        text: badge,
        promoCard: {
          type: asset.type,
          assetName: asset.assetName || asset.title || "",
          title: asset.title || "",
          body: asset.body || "",
          code: asset.code || exposureCode,
          exposureCode,
          expiresAt: asset.expiresAt || null,
          templateCode: asset.templateCode || "",
          masterCode: asset.masterCode || "",
          imageDataUrl: asset.imageDataUrl || "",
          fileMeta: asset.fileMeta || null,
          cta: asset.cta || "",
          font: asset.font || "sans",
          templateTone: asset.templateTone || "from-blue-600 to-indigo-700"
        },
        disableAutoReply: false
      });
      window.dispatchEvent(new CustomEvent("vlue-kpi-event", { detail: { kind: "promo_sent" } }));
    });

    if (autoFeedUpload) {
      try {
        await cleanupExpiredAutoFeedPosts();
        const ctxRes = await vlueAuthFetch(apiUrl("/api/cards/me-context"), { headers: vlueAuthHeaders() });
        const ctx = await ctxRes.json().catch(() => ({}));
        const cardId = ctx?.owned?.[0]?.id || "";
        if (ctxRes.ok && cardId) {
          const postRes = await vlueAuthFetch(apiUrl("/api/feed/posts"), {
            method: "POST",
            headers: vlueAuthHeaders(),
            body: JSON.stringify({
              cardId,
              title: asset.title || "이벤트 안내",
              body: lines.join("\n"),
              expiresAt: asset.expiresAt || undefined
            })
          });
          const postData = await postRes.json().catch(() => ({}));
          if (postRes.ok && asset.expiresAt && postData?.id) {
            const raw = localStorage.getItem(FEED_AUTO_EXPIRY_REGISTRY_KEY);
            const prev = raw ? JSON.parse(raw) : [];
            const next = Array.isArray(prev) ? prev : [];
            next.push({ postId: postData.id, expiresAt: asset.expiresAt });
            localStorage.setItem(FEED_AUTO_EXPIRY_REGISTRY_KEY, JSON.stringify(next.slice(-120)));
          }
        }
      } catch {
        /* 피드 업로드 실패는 발송 성공에 영향 없음 */
      }
    }
    return true;
  }, [cleanupExpiredAutoFeedPosts, makingSendTargets]);

  useEffect(() => {
    cleanupExpiredAutoFeedPosts();
    const id = window.setInterval(() => {
      cleanupExpiredAutoFeedPosts();
    }, 60 * 1000);
    return () => window.clearInterval(id);
  }, [cleanupExpiredAutoFeedPosts]);

  const navigate = useCallback(
    ({ nextPage, nextTab = activeTab, nextRoomId = selectedRoomId, resetSearch = true }) => {
      if (pageRef.current === "mypage" && nextPage !== "mypage") {
        try {
          const myPageRoot = document.querySelector(".vlue-mypage");
          if (myPageRoot) myPageRoot.scrollTop = 0;
          const myPageInnerScrolls = document.querySelectorAll("[data-mypage-scroll='1']");
          myPageInnerScrolls.forEach((el) => {
            el.scrollTop = 0;
          });
          window.scrollTo(0, 0);
        } catch {
          /* ignore */
        }
      }
      navHistoryRef.current.push({
        page: pageRef.current,
        activeTab,
        selectedRoomId: selectedRoomRef.current
      });
      setActiveTab(nextTab);
      setSelectedRoomId(nextRoomId);
      const safePage = coerceAppPageForV1(nextPage);
      if (safePage === "mypage") setMyPageMountKey((n) => n + 1);
      setPage(safePage);
      if (safePage === "main") {
        requestAnimationFrame(() => {
          try {
            const root = appBodyRef.current || document.getElementById("app-body");
            if (!root) return;
            const nodes = [root, ...Array.from(root.querySelectorAll("*"))];
            nodes.forEach((node) => {
              if (!node || typeof node.scrollTop !== "number") return;
              if (node.scrollHeight > node.clientHeight + 2) node.scrollTop = 0;
            });
            window.scrollTo(0, 0);
          } catch {
            /* ignore */
          }
        });
      }
      if (resetSearch) {
        setIsSearchOpen(false);
        setGlobalSearchQuery("");
      }
    },
    [activeTab, selectedRoomId]
  );

  useEffect(() => {
    if (!electronRoomBoot || electronRoomBoot.roomType !== "GENERAL") return;
    setPage("room");
    setSelectedRoomId(electronRoomBoot.roomId);
  }, [electronRoomBoot]);

  const handleGeneralRoomDoubleClick = useCallback((room) => {
    openElectronRoomWindow({
      roomId: room.roomId,
      roomType: "GENERAL",
      title: room.name || room.roomId
    });
  }, []);

  const handleMailTalkRoomDoubleClick = useCallback((room) => {
    openElectronRoomWindow({
      roomId: room.id,
      roomType: "MAIL_TALK",
      title: room.counterpartyEmail,
      counterpartyEmail: room.counterpartyEmail
    });
  }, []);

  const openPosSalesDashboard = useCallback(() => {
    try {
      sessionStorage.setItem(OPEN_POS_DASHBOARD_KEY, "1");
    } catch {
      /* ignore */
    }
    requestOpenFamilyProtectionTab();
    setPosBillToast({ message: "", entryId: "" });
    navigate({ nextPage: "friendSearch", nextTab: activeTab, nextRoomId: null });
  }, [activeTab, navigate]);

  const openCalendarScreen = useCallback(
    ({ eventId = "", groupId = "", groupName = "" } = {}) => {
      clearCalendarBadge();
      setCalendarBadgeCount(0);
      setCalendarNav({ eventId, groupId, groupName });
      navigate({ nextPage: "calendar", nextTab: activeTab, nextRoomId: null });
    },
    [activeTab, navigate]
  );

  const openMemoScreen = useCallback(
    ({ memoId = "" } = {}) => {
      setMemoNav({ memoId });
      navigate({ nextPage: "memo", nextTab: activeTab, nextRoomId: null });
    },
    [activeTab, navigate]
  );

  useEffect(() => {
    const readMyHandle = () => {
      try {
        return String(localStorage.getItem("vlue_member_handle") || "")
          .replace(/^@+/, "")
          .trim()
          .toLowerCase();
      } catch {
        return "";
      }
    };

    const openAccountCase = ({ userId = "", name = "", handle = "" } = {}) => {
      const id = String(userId || "").trim();
      const bareHandle = String(handle || "")
        .replace(/^@+/, "")
        .trim()
        .toLowerCase();
      const me = getLocalVlueUserId();
      const myHandle = readMyHandle();
      const isSelf =
        (id && me && id === me) || (bareHandle && myHandle && bareHandle === myHandle);

      dispatchCloseShowcaseOverlays();
      setHashtagSearchTag("");

      if (isSelf) {
        setCaseArchiveUser(null);
        navigate({ nextPage: "mycase", nextTab: activeTab, nextRoomId: null });
        return;
      }

      if (!id) return;
      setCaseArchiveUser({
        userId: id,
        name: String(name || handle || "").trim() || "케이스함",
        handle: String(handle || "")
          .replace(/^@+/, "")
          .trim()
      });
    };

    const onHashtag = (e) => {
      const tag = String(e?.detail?.tag || "")
        .replace(/^#/, "")
        .trim();
      if (!tag) return;
      setHashtagSearchTag(tag);
    };
    const onCaseUser = (e) => {
      openAccountCase({
        userId: e?.detail?.userId,
        name: e?.detail?.name,
        handle: e?.detail?.handle
      });
    };
    const onMention = async (e) => {
      const handle = String(e?.detail?.handle || "")
        .replace(/^@+/, "")
        .trim();
      if (!handle) return;
      const myHandle = readMyHandle();
      if (myHandle && handle.toLowerCase() === myHandle) {
        openAccountCase({ handle, name: handle });
        return;
      }
      try {
        const { lookupUserByHandle } = await import("./lib/showcase/showcaseSocialApi.js");
        const res = await lookupUserByHandle(handle);
        if (!res.ok || !res.user?.id) {
          setBottomToast(`@${handle} 회원을 찾지 못했습니다.`);
          window.setTimeout(() => setBottomToast(""), 2400);
          return;
        }
        openAccountCase({
          userId: res.user.id,
          name: String(res.user.displayName || res.user.name || handle).trim() || handle,
          handle
        });
      } catch {
        setBottomToast("회원 조회에 실패했습니다.");
        window.setTimeout(() => setBottomToast(""), 2400);
      }
    };
    window.addEventListener("vlue-open-hashtag-search", onHashtag);
    window.addEventListener("vlue-open-member-by-handle", onMention);
    window.addEventListener("vlue-open-case-user", onCaseUser);
    return () => {
      window.removeEventListener("vlue-open-hashtag-search", onHashtag);
      window.removeEventListener("vlue-open-member-by-handle", onMention);
      window.removeEventListener("vlue-open-case-user", onCaseUser);
    };
  }, [activeTab, navigate]);

  const shareMemoToChat = useCallback(
    (memo) => {
      if (!memo) return;
      const text = [memo.title, memo.content].filter(Boolean).join("\n").trim();
      if (!text) return;
      const rooms = Object.keys(messagesByRoom).filter((id) => id !== "vlue:official" && id !== "vlue:memo");
      const pick = rooms[0];
      if (!pick) {
        setBottomToast("공유할 채팅방이 없습니다.");
        setTimeout(() => setBottomToast(""), 2400);
        return;
      }
      appendOutgoingMessage(pick, { type: "text", text: `📝 [메모장]\n${text}` });
      setBottomToast("메모를 채팅방에 전송했습니다.");
      setTimeout(() => setBottomToast(""), 2800);
      navigate({ nextPage: "room", nextTab: activeTab, nextRoomId: pick });
    },
    [activeTab, appendOutgoingMessage, messagesByRoom, navigate]
  );

  const shareCalendarEventToChat = useCallback(
    (event) => {
      const roomId = event?.groupId;
      if (!roomId) return;
      const who = myCardProfile?.name || "나";
      const when = new Date(event.startAt).toLocaleString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      appendOutgoingMessage(roomId, {
        type: "system",
        text: `📅 [${who}]님이 새 일정을 등록했어요.\n${when} — ${event.title}\n👉 일정 확인하기`,
        calendarEventId: event.id
      });
      navigate({ nextPage: "room", nextTab: activeTab, nextRoomId: roomId });
    },
    [activeTab, appendOutgoingMessage, myCardProfile?.name, navigate]
  );

  const publishCalendarRoomNotice = useCallback(
    async (roomId, event) => {
      const myUserId = localStorage.getItem("vlue_server_user_id") || "me";
      await publishCalendarAsRoomNotice({
        roomId,
        roomName: roomNameById[roomId] || roomId,
        event,
        authorUserId: myUserId,
        authorName: myCardProfile?.name || "나",
        appendMessage: appendOutgoingMessage
      });
      setBottomToast("채팅방 공지로 등록했습니다. 푸시 알림을 발송했습니다.");
      setTimeout(() => setBottomToast(""), 3200);
      navigate({ nextPage: "room", nextTab: activeTab, nextRoomId: roomId });
    },
    [activeTab, appendOutgoingMessage, myCardProfile?.name, navigate, roomNameById]
  );

  const handleMarketingPopupLink = useCallback(
    (popup) => {
      const url = String(popup?.linkUrl || "").trim();
      if (!url) return;
      setMarketingPopupOpen(false);
      if (popup.linkType === "internal" || (!/^https?:\/\//i.test(url) && !url.startsWith("//"))) {
        const path = url.replace(/^\//, "").toLowerCase();
        if (path === "subhub" || path === "store") {
          navigate({ nextPage: "subhub", nextTab: "all" });
          return;
        }
        if (path === "wallet" || path === "vault") {
          setCardWalletModalOpen(true);
          return;
        }
        if (path === "profile" || path === "mypage") {
          setProfileInitialView("main");
          setProfileOpen(true);
          return;
        }
        if (path === "email" || path === "mail") {
          setEmailForwardingSettingsOpen(true);
          return;
        }
        if (path === "email-inbox") {
          setEmailInboxOpen(true);
          return;
        }
        setBottomToast(`내부 경로: ${url}`);
        setTimeout(() => setBottomToast(""), 2400);
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [navigate]
  );

  const handleChatRoomAction = useCallback(
    (roomId, action) => {
      if (!roomId) return;
      if (action === "pin") {
        const pinned = toggleRoomPinned(roomId);
        setBottomToast(pinned ? "채팅방을 상단에 고정했습니다." : "상단 고정을 해제했습니다.");
        setTimeout(() => setBottomToast(""), 2400);
        return;
      }
      if (action === "rename") {
        const prefs = readRoomPrefs(roomId);
        const [group, id] = roomId.split(":");
        const found =
          roomId === "vlue:official" ? { name: "VLUE 공식 알림" } : (roomCatalog[group] || []).find((r) => r.id === id);
        const current = prefs.displayName || found?.name || "";
        const next = window.prompt("채팅방 이름", current);
        if (next != null && next.trim()) {
          setRoomDisplayName(roomId, next.trim());
          setBottomToast("채팅방 이름을 변경했습니다.");
          setTimeout(() => setBottomToast(""), 2400);
        }
        return;
      }
      if (action === "delete") {
        setRoomHidden(roomId, true);
        if (selectedRoomId === roomId) navigate({ nextPage: "list", nextTab: listFilterTab, nextRoomId: null });
        setBottomToast("채팅방을 목록에서 삭제했습니다.");
        setTimeout(() => setBottomToast(""), 2400);
        return;
      }
      if (action === "toggleNotify") {
        const muted = toggleRoomMuted(roomId);
        setBottomToast(muted ? "이 채팅방 알림을 끕니다." : "이 채팅방 알림을 켭니다.");
        setTimeout(() => setBottomToast(""), 2400);
        return;
      }
      if (action === "markRead") {
        setUnreadByRoom((prev) => ({ ...prev, [roomId]: 0 }));
        if (roomId === "vlue:official") {
          setOfficialChannelMeta((prev) => ({ ...prev, pendingCount: 0 }));
        }
        if (roomId === "vlue:memo") {
          setMemoMeta((prev) => ({ ...prev, unreadShareCount: 0 }));
        }
        return;
      }
      if (roomId === "vlue:memo" && action === "leave") return;
      if (action === "toggleFloat") {
        if (!isDesktopPd) {
          setBottomToast("PC(PD) 화면에서만 플로팅을 사용할 수 있습니다.");
          setTimeout(() => setBottomToast(""), 2800);
          return;
        }
        setFloatingRoomIds((prev) => {
          const next = new Set(prev);
          if (next.has(roomId)) next.delete(roomId);
          else next.add(roomId);
          return next;
        });
        return;
      }
      if (action === "leave") {
        if (roomId === "vlue:official") return;
        const [group, id] = roomId.split(":");
        if (group === "subscribe") {
          setRoomCatalog((cat) => ({
            ...cat,
            subscribe: (cat.subscribe || []).filter((r) => r.id !== id)
          }));
        } else {
          setRoomHidden(roomId, true);
        }
        setFloatingRoomIds((prev) => {
          const next = new Set(prev);
          next.delete(roomId);
          return next;
        });
        if (selectedRoomId === roomId) navigate({ nextPage: "list", nextTab: listFilterTab, nextRoomId: null });
        setBottomToast("채팅방을 나갔습니다.");
        setTimeout(() => setBottomToast(""), 2400);
      }
    },
    [roomCatalog, selectedRoomId, navigate, listFilterTab, isDesktopPd]
  );

  const unifiedSearchResults = useMemo(
    () =>
      runUnifiedSearch(globalSearchQuery, {
        roomCatalog,
        messagesByRoom,
        officialChannelMeta,
        membershipTier
      }),
    [globalSearchQuery, roomCatalog, messagesByRoom, officialChannelMeta, membershipTier]
  );

  const executeUnifiedSearchAction = useCallback(
    (action) => {
      setGlobalSearchQuery("");
      setIsSearchOpen(false);
      if (action.type === "room") {
        const tab = tabForRoom(action.roomId);
        setUnreadByRoom((prev) => ({ ...prev, [action.roomId]: 0 }));
        navigate({ nextPage: "room", nextTab: tab, nextRoomId: action.roomId, resetSearch: false });
        return;
      }
      if (action.type === "page") {
        if (action.subscriptionSubTab) setSubscriptionSubTab(action.subscriptionSubTab);
        navigate({
          nextPage: action.page,
          nextTab: action.tab !== undefined ? action.tab : activeTab ?? "all",
          nextRoomId: null,
          resetSearch: false
        });
        return;
      }
      if (action.type === "main") {
        goMainAndReset();
        return;
      }
      if (action.type === "profile") {
        setProfileInitialView(action.view || "main");
        setProfileOpen(true);
        return;
      }
      if (action.type === "wallet") {
        setWalletDefaultTab(action.tab || "received");
        setCardWalletModalOpen(true);
      }
    },
    [navigate, activeTab, setSubscriptionSubTab]
  );

  useEffect(() => {
    if (!isSearchOpen) return;
    const id = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [isSearchOpen]);

  const goBackStep = useCallback(() => {
    const prev = navHistoryRef.current.pop();
    if (!prev) {
      goMainAndReset();
      return;
    }
    setPage(prev.page);
    setActiveTab(prev.activeTab);
    setSelectedRoomId(prev.selectedRoomId);
    setIsSearchOpen(false);
    setGlobalSearchQuery("");
  }, []);

  /** Android WebView 기기 뒤로가기 — SPA 스택이 있으면 소비, 홈이면 false → 네이티브가 앱을 백그라운드로 */
  useEffect(() => {
    window.VlueAndroidBack = () => {
      try {
        if (runAndroidBackHandlers()) return true;
        if (appNotificationOpen) {
          setAppNotificationOpen(false);
          return true;
        }
        if (callShowcaseSheetOpen) {
          setCallShowcaseSheetOpen(false);
          return true;
        }
        if (showcaseStyleSheetOpen) {
          setShowcaseStyleSheetOpen(false);
          return true;
        }
        if (cardWalletModalOpen) {
          setCardWalletModalOpen(false);
          return true;
        }
        if (letteringCertOpen) {
          setLetteringCertOpen(false);
          return true;
        }
        if (emailInboxOpen) {
          setEmailInboxOpen(false);
          return true;
        }
        if (qrScannerOpen) {
          setQrScannerOpen(false);
          return true;
        }
        if (isSearchOpen) {
          setIsSearchOpen(false);
          return true;
        }
        if (profileOpen) {
          setProfileOpen(false);
          return true;
        }
        if (navHistoryRef.current.length > 0) {
          goBackStep();
          return true;
        }
        if (page !== "main") {
          goMainAndReset();
          return true;
        }
      } catch {
        /* ignore */
      }
      return false;
    };
    return () => {
      try {
        delete window.VlueAndroidBack;
      } catch {
        /* ignore */
      }
    };
  }, [
    page,
    appNotificationOpen,
    callShowcaseSheetOpen,
    showcaseStyleSheetOpen,
    cardWalletModalOpen,
    letteringCertOpen,
    emailInboxOpen,
    qrScannerOpen,
    isSearchOpen,
    profileOpen,
    goBackStep
  ]);

  useEffect(() => {
    if (page !== "documentTemplates") return;
    setWalletDefaultTab("mydocs");
    setCardWalletModalOpen(true);
    setPage("mypage");
  }, [page]);

  const activeBottomTab = useMemo(() => {
    if (showcaseStyleSheetOpen) return "home";
    if (callShowcaseSheetOpen) return "calls";
    if (appNotificationOpen) return "notifications";
    if (page === "main") return "";
    if (page === "friendSearch") return "home";
    if (page === "calendar") return "mypage";
    if (page === "memo") return "chat";
    if (page === "blueai") return "blueai";
    if (page === "mycase") return "mycase";
    if (page === "mypage") return "mypage";
    if (page === "betaGuide") return "mypage";
    if (page === "subhub") return "shopping";
    if (page === "manage") return "chat";
    if (page === "list" || page === "room" || page === "feed") return "chat";
    return "";
  }, [page, appNotificationOpen, callShowcaseSheetOpen, showcaseStyleSheetOpen]);

  const bottomNavPulseChat = totalUnread > 0 && activeBottomTab !== "chat";
  const bottomNavPulseFriendSearch = friendInboxRequests.length > 0 && activeBottomTab !== "home";

  const closeQrScanner = useCallback(() => {
    setQrScannerOpen(false);
  }, []);

  const handleQrDecoded = useCallback(
    (rawValue) => {
      const code = String(rawValue || "").trim();
      if (!code) return;
      setLastScannedQr(code);
      setQrScannerOpen(false);
      // PersonalFeed는 page === "feed" 에서만 렌더됨 (personalFeed 문자열은 라우트 없음)
      setSelectedFeedProfile({
        roomId: null,
        name: myCardProfile.name || "내 활동",
        membershipTier,
        organization: myCardProfile.organization || "VLUE",
        lastQrToken: code
      });
      navigate({ nextPage: "feed", nextTab: activeTab ?? "all", nextRoomId: null });
      setBottomToast(`QR 스캔 완료: ${code.slice(0, 26)}${code.length > 26 ? "..." : ""}`);
      setTimeout(() => setBottomToast(""), 2600);
    },
    [navigate, activeTab, membershipTier, myCardProfile.name, myCardProfile.organization]
  );

  useEffect(() => {
    if (!qrScannerOpen) return;
    let cancelled = false;
    let detector = null;
    const canUseBarcodeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;
    if (canUseBarcodeDetector) {
      try {
        detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      } catch {
        detector = null;
      }
    }

    const stopStream = () => {
      if (qrScanLoopRef.current) {
        cancelAnimationFrame(qrScanLoopRef.current);
        qrScanLoopRef.current = 0;
      }
      const stream = qrStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        qrStreamRef.current = null;
      }
    };

    const loop = async () => {
      if (cancelled || !detector || !qrVideoRef.current) return;
      try {
        const video = qrVideoRef.current;
        if (video.readyState >= 2) {
          const codes = await detector.detect(video);
          if (codes?.length && codes[0]?.rawValue) {
            handleQrDecoded(codes[0].rawValue);
            return;
          }
        }
      } catch {
        // ignore detector read errors, keep scanning
      }
      qrScanLoopRef.current = requestAnimationFrame(loop);
    };

    (async () => {
      setQrCameraError("");
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setQrCameraError("이 환경(HTTP/구형 브라우저 등)에서는 카메라를 쓸 수 없습니다. QR 토큰을 수동 입력해 주세요.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        qrStreamRef.current = stream;
        if (qrVideoRef.current) {
          qrVideoRef.current.srcObject = stream;
          await qrVideoRef.current.play().catch(() => {});
        }
        if (detector) {
          qrScanLoopRef.current = requestAnimationFrame(loop);
        } else {
          setQrCameraError("이 브라우저는 자동 QR 인식 미지원입니다. 아래에 QR 토큰을 붙여넣어 주세요.");
        }
      } catch {
        setQrCameraError("카메라 접근 권한이 필요합니다. 권한 허용 후 다시 시도해 주세요.");
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [qrScannerOpen, handleQrDecoded]);

  /** 브라우저 탭을 다른 탭으로 두었다 다시 활성화하면 헤더 눈 깜빡임 */
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        tabWasHiddenForEyeBlinkRef.current = true;
        return;
      }
      if (document.visibilityState === "visible" && tabWasHiddenForEyeBlinkRef.current) {
        tabWasHiddenForEyeBlinkRef.current = false;
        triggerHeaderEyeNavBlink();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [triggerHeaderEyeNavBlink]);

  const bottomNavPulseMy =
    friendRequests.some((r) => r.status === "pending") && activeBottomTab !== "mypage";
  const bottomNavPulseBlueAi = blueAiActivitySeq > blueAiSeenSeq && activeBottomTab !== "blueai";
  const bottomNavPulseShopping = subscribeChatUnreadTotal > 0 && activeBottomTab !== "shopping";
  const bottomNavPulseNotifications = pushUnreadCount > 0 && activeBottomTab !== "notifications";

  const isBrowseGuest =
    Boolean(v1AppShell.guestBrowse) &&
    !isLoggedIn &&
    !showSplash &&
    !signupOnboardingOpen &&
    !showOnboardingFlow;
  const showAppShell =
    !showSplash && !showOnboardingFlow && ((isLoggedIn && biometricAllowed) || isBrowseGuest);
  /** 스플래시 이후 · 미로그인 · 가입 온보딩 아님 → 로그인 전면 (둘러보기 없음) */
  const showLoginGate =
    !showSplash && !isLoggedIn && !signupOnboardingOpen && !showOnboardingFlow && !isBrowseGuest;

  useEffect(() => {
    if (!shouldShowRuntimePermissionsPrompt({ isLoggedIn, showAppShell })) return;
    setRuntimePermsModalOpen(true);
  }, [isLoggedIn, showAppShell]);

  useEffect(() => {
    if (shouldShowRuntimePermissionsPrompt({ isLoggedIn, showAppShell })) return;
    if (!shouldShowContactSyncPrompt({ isLoggedIn, showAppShell })) return;
    setContactSyncModalOpen(true);
  }, [isLoggedIn, showAppShell, runtimePermsModalOpen]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const cached = readContactMatchCache();
    if (cached) setContactMatchData(cached);
  }, [isLoggedIn]);

  /** 하이브리드 주소록 인덱스 — VLUE 친구 + 디바이스 주소록 동기화 */
  useEffect(() => {
    if (!showAppShell) return undefined;
    upsertKnownPhonesFromFriends({
      catalogFriends: roomCatalog?.friends || [],
      contactMatchData
    });
    void syncDeviceContactsFromNative();
    return undefined;
  }, [showAppShell, roomCatalog?.friends, contactMatchData]);

  const promptGuestSignup = useCallback((action) => {
    if (!v1AppShell.guestBrowse) return;
    setPendingAuthAction(() => (typeof action === "function" ? action : null));
    setGuestAuthOverlay(true);
  }, []);

  const closeGuestAuthOverlay = useCallback(() => {
    setGuestAuthOverlay(false);
    setPendingAuthAction(null);
  }, []);

  const denyDesktopAuth = useCallback(() => {
    setBottomToast("로그인 후 이용할 수 있습니다.");
    setTimeout(() => setBottomToast(""), 1800);
  }, []);

  const requireAuth = useCallback(
    (action) =>
      runWithGuestAuthGate({
        isLoggedIn,
        isBrowseGuest,
        onPromptSignup: promptGuestSignup,
        onDesktopDenied: denyDesktopAuth,
        action
      }),
    [isLoggedIn, isBrowseGuest, promptGuestSignup, denyDesktopAuth]
  );

  const headerVisible = page === "main" || page === "list" || page === "subhub";
  const homeHeaderMinimal = page === "main" && v1AppShell.homeHeaderMinimal;
  const electronRoomChromeHidden = isElectronRoomWindowMode && page === "room";
  const topHeaderVisible = showAppShell && headerVisible && !electronRoomChromeHidden;
  const subhubUtilBack =
    page === "subhub" && (subscriptionSubTab === "gifts" || subscriptionSubTab === "chat" || subscriptionSubTab === "cart");
  const isChatSurface = page === "list" || page === "room";
  const showBottomNav =
    showAppShell &&
    page !== "room" &&
    !csScannerOpen &&
    !electronRoomChromeHidden &&
    !(guestAuthOverlay && !isLoggedIn) &&
    !profileOpen;

  /** 로그인·회원가입 온보딩은 전역 dark-mode 미적용(글자 대비 유지) */
  const shellIsAuthOrSignupOnboarding =
    signupOnboardingOpen || (!showSplash && !isLoggedIn && !isBrowseGuest);

  const bottomNavPulseSyncRef = useRef(null);
  useLayoutEffect(() => {
    const root = bottomNavPulseSyncRef.current;
    if (!root) return;
    const period = 2400;
    root.style.setProperty("--nav-pulse-delay", `${-(performance.now() % period)}ms`);
  }, [showBottomNav]);
  const requireApp = (fn) => {
    requireAuth(fn);
  };

  const executeUnifiedSearchActionGuarded = useCallback(
    (action) => {
      const browseAllowed =
        action?.type === "main" ||
        (action?.type === "page" &&
          (action.page === "main" || action.page === "subhub") &&
          (!action.subscriptionSubTab || !GUEST_PROTECTED_SUBHUB_TABS.has(action.subscriptionSubTab)));

      if (isBrowseGuest && !browseAllowed) {
        requireAuth(() => executeUnifiedSearchAction(action));
        return;
      }
      executeUnifiedSearchAction(action);
    },
    [executeUnifiedSearchAction, isBrowseGuest, requireAuth]
  );

  if (letteringPreviewOpen) {
    return <LetteringNotificationPreviewPage />;
  }

  if (letteringOverlayOpen) {
    return (
      <ShowcaseBgmProvider>
        <LetteringOverlayHost />
      </ShowcaseBgmProvider>
    );
  }

  if (isElectronRoomWindowMode && electronRoomBoot?.roomType === "MAIL_TALK") {
    return (
      <MailTalkElectronShell
        roomId={electronRoomBoot.roomId}
        counterpartyEmail={electronRoomBoot.counterpartyEmail}
        isDarkMode={isDarkMode}
      />
    );
  }

  return (
    <B2bMembershipProvider enabled={isLoggedIn}>
    <ShowcaseBgmProvider>
    <div
      id="app-body"
      ref={appBodyRef}
      className={`flex h-[100dvh] w-full max-w-none min-w-0 flex-col overflow-hidden relative ${
        shellIsAuthOrSignupOnboarding
          ? "bg-[#F8F9FA] text-[#1A1F27]"
          : isDarkMode
            ? "bg-[#111827] text-gray-100"
            : isChatSurface
              ? "bg-[#f3f8ff] text-[#1A1F27]"
              : "bg-[#F8F9FA] text-[#1A1F27]"
      } ${!shellIsAuthOrSignupOnboarding && isDarkMode ? "dark-mode" : ""} ${showBottomNav ? "has-bottom-nav" : ""}`}
    >
      {showSplash && !showOnboardingFlow && <Splash onDone={() => setShowSplash(false)} />}
      {showOnboardingFlow && (
        <SignupErrorBoundary onCancel={() => setSignupOnboardingOpen(false)}>
          <VlueOnboarding
            layout="app"
            signupIntent={signupIntent}
            onComplete={finishOnboarding}
            onCancel={() => {
              setSignupOnboardingOpen(false);
              setSignupIntent("general");
            }}
          />
        </SignupErrorBoundary>
      )}

      <PostSignupPaymentModal
        open={postSignupPaymentOpen && Boolean(postSignupPending)}
        pending={postSignupPending}
        onComplete={(result) => {
          const tier = result?.membershipTier === "b2b" ? "b2b" : "paid";
          applyMembershipTierFromHub(tier);
          try {
            localStorage.setItem(DIGITAL_CARD_ACTIVE_KEY, "1");
          } catch {
            /* ignore */
          }
          setDigitalCardActive(true);
          setPostSignupPaymentOpen(false);
          setPostSignupPending(null);
        }}
        onSkip={() => {
          setPostSignupPaymentOpen(false);
          setPostSignupPending(null);
        }}
      />

      <LineBillingGraceModal enabled={isLoggedIn && showAppShell} />

      <AppRuntimePermissionsModal
        open={runtimePermsModalOpen && isLoggedIn && showAppShell}
        onClose={() => setRuntimePermsModalOpen(false)}
        onContinueContacts={() => setContactSyncModalOpen(true)}
      />

      <ContactSyncConsentModal
        open={contactSyncModalOpen && isLoggedIn && showAppShell && !runtimePermsModalOpen}
        onClose={() => setContactSyncModalOpen(false)}
        onSynced={(result) => {
          setContactMatchData(result);
          setBottomToast("연락처 동기화가 완료되었습니다.");
          setTimeout(() => setBottomToast(""), 2800);
        }}
      />

      <ParentalConsentApproveModal
        open={Boolean(parentalConsentRequest)}
        request={parentalConsentRequest}
        isDarkMode={isDarkMode}
        onClose={() => setParentalConsentRequest(null)}
        onApproved={() => {
          setParentalConsentRequest(null);
          window.dispatchEvent(new CustomEvent("vlue-family-protection-changed"));
        }}
        onToast={(text) => {
          setBottomToast(text);
          setTimeout(() => setBottomToast(""), 5000);
        }}
      />

      {showLoginGate ? (
        <div className="fixed inset-0 z-[220] bg-[#fafbfc]">
          <LoginScreen
            onLogin={async (payload) => handleLogin(payload)}
            onSignup={(intent) => handleSignup(intent)}
            onSocialLogin={handleSocialLogin}
            snsUnlinkedAlert={snsUnlinkedAlert}
            onDismissSnsAlert={() => setSnsUnlinkedAlert("")}
          />
        </div>
      ) : null}

      {v1AppShell.guestBrowse && guestAuthOverlay && !isLoggedIn && (
        <div className="fixed inset-0 z-[220] bg-[#fafbfc]">
          <LoginScreen
            browsePrompt="이 기능은 회원가입 후 이용할 수 있습니다. VLUE 인증을 시작해 주세요."
            snsUnlinkedAlert={snsUnlinkedAlert}
            onDismissSnsAlert={() => setSnsUnlinkedAlert("")}
            onDismiss={closeGuestAuthOverlay}
            onLogin={async (payload) => {
              const result = await handleLogin(payload);
              if (result?.ok) {
                setGuestAuthOverlay(false);
                const resume = pendingAuthAction;
                setPendingAuthAction(null);
                if (resume) setTimeout(() => resume(), 0);
              }
              return result;
            }}
            onSignup={(intent) => {
              closeGuestAuthOverlay();
              handleSignup(intent);
            }}
            onSocialLogin={handleSocialLogin}
          />
        </div>
      )}

      {!showSplash && isLoggedIn && !showOnboardingFlow ? (
        <AppLockPinResetModal
          open={appLockResetOpen}
          onClose={() => setAppLockResetOpen(false)}
          onPinResetReady={() => setAppLockResetOpen(false)}
        />
      ) : null}

      {showAppShell && (
        <>
      <header className={`sticky top-0 z-50 relative w-full backdrop-blur-lg border-b ${
        isDarkMode ? "bg-[#111827]/95 border-white/10" : "bg-white/90 border-gray-100"
      } ${topHeaderVisible ? "block" : "hidden"}`}>
        <div className="flex h-[52px] w-full items-center justify-between gap-2 px-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {subhubUtilBack ? (
              <BackButton variant="inline" onBack={() => setSubscriptionSubTab("all")} />
            ) : (
            <button
              type="button"
              onClick={goMainAndReset}
              className="shrink-0 overflow-visible border-0 bg-transparent p-0 shadow-none active:scale-90 transition-transform cursor-pointer"
              aria-label="VLUE 홈"
              title="홈"
            >
              <VlueNavLogoMark blinkSeq={eyeNavSeq} size={36} className="shadow-md shrink-0" />
            </button>
            )}
            {isSearchOpen ? (
              <div id="search-input-wrap" className="relative z-[55] min-w-0 flex-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  id="search-input"
                  role="combobox"
                  aria-expanded={isSearchOpen}
                  aria-controls="global-search-dropdown"
                  autoComplete="off"
                  placeholder="메뉴·상점·대화 검색…"
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setIsSearchOpen(false);
                      setGlobalSearchQuery("");
                    }
                  }}
                  className="min-w-0 w-full max-w-full truncate rounded-full border border-transparent bg-gray-100 py-1.5 pl-3 pr-3 text-[13px] shadow-sm focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            ) : page === "list" ? (
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <div className="min-w-0 flex-1 text-left leading-tight">
                  <p className="vlue-fluid-header-line font-black text-gray-900">VLUE 채팅</p>
                  <p className="vlue-fluid-header-line font-semibold text-blue-600">대화 목록</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    requireAuth(() => {
                      setProfileInitialView("profileSettings");
                      setProfileOpen(true);
                    })
                  }
                  className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 active:scale-95"
                  aria-label="채팅 프로필 설정"
                  title="채팅 프로필 설정"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="6" x2="14" y2="6" />
                    <line x1="10" y1="18" x2="20" y2="18" />
                    <circle cx="17" cy="6" r="3" />
                    <circle cx="7" cy="18" r="3" />
                  </svg>
                </button>
              </div>
            ) : page === "subhub" ? (
              <div className="min-w-0 flex-1 text-left leading-tight">
                <p className="vlue-fluid-header-line font-black text-gray-900">VLUE 스토어</p>
                <p className="vlue-fluid-header-line font-semibold text-blue-600">
                  {subscriptionSubTab === "gifts"
                    ? "선물함 · 쿠폰 · 교환"
                    : subscriptionSubTab === "cart"
                      ? "파트너십 보관함"
                      : subscriptionSubTab === "chat"
                        ? "구독 채팅"
                        : subscriptionSubTab === "list"
                          ? "구독 목록"
                          : subscriptionSubTab === "all"
                            ? "전체"
                            : subscriptionSubTab === "media"
                            ? "미디어 쇼핑"
                            : subscriptionSubTab === "page"
                              ? "페이지 쇼핑"
                              : subscriptionSubTab === "groupbuy"
                                ? "공동구매"
                                : "하이브리드 커머스"}
                </p>
              </div>
            ) : (
              <span className="vlue-app-brand-title min-w-0 flex-1 select-none font-black tracking-tight text-blue-600 transition-opacity duration-150">
                VLUE
              </span>
            )}
          </div>

          <div className="relative flex shrink-0 items-center gap-1">
            {v1AppShell.bizcardScanner && homeHeaderMinimal ? (
            <button
              type="button"
              onClick={() => requireAuth(() => setCsScannerOpen(true))}
              className="shrink-0 rounded-full p-1.5 text-gray-500 active:scale-90 transition-transform"
              aria-label="명함 스캐너"
              title="명함 스캐너 — 종이 명함 인식 후 연락처 저장"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h4l2-3h4l2 3h4v12H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </button>
            ) : null}
            {!homeHeaderMinimal && v1AppShell.storeScanner ? (
            <button
              type="button"
              onClick={() => requireAuth(() => setCsScannerOpen(true))}
              className="shrink-0 rounded-full p-1.5 text-gray-500 active:scale-90 transition-transform"
              aria-label="VLUE 스캐너"
              title="VLUE 스캐너 — 일반 문서 / POS 빌지"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h4l2-3h4l2 3h4v12H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </button>
            ) : null}
            {!homeHeaderMinimal ? (
            <button
              type="button"
              onClick={() =>
                requireAuth(() => {
                  setQrManualValue("");
                  setQrCameraError("");
                  setQrScannerOpen(true);
                })
              }
              className="shrink-0 rounded-full p-1.5 text-gray-500 active:scale-90 transition-transform"
              aria-label="QR 스캐너 열기"
              title="QR 스캐너"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8V5a1 1 0 0 1 1-1h3" />
                <path d="M20 8V5a1 1 0 0 0-1-1h-3" />
                <path d="M4 16v3a1 1 0 0 0 1 1h3" />
                <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
                <path d="M8 12h8" />
              </svg>
            </button>
            ) : null}
            {!homeHeaderMinimal ? (
            <button
              type="button"
              id="search-trigger"
              onClick={() => setIsSearchOpen((v) => !v)}
              className="shrink-0 rounded-full p-1.5 text-gray-500 active:scale-90 transition-transform"
              aria-label={isSearchOpen ? "검색 닫기" : "통합검색 열기"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
            ) : null}
            {isBrowseGuest ? (
              <button
                type="button"
                onClick={() => {
                  setPendingAuthAction(null);
                  setGuestAuthOverlay(true);
                }}
                className="shrink-0 rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white shadow-sm active:scale-95"
              >
                로그인/가입
              </button>
            ) : (
              <div
                id="profile-trigger"
                onClick={() => {
                  setProfileInitialView("main");
                  setProfileOpen(true);
                }}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-gray-400"
              >
                <UserProfileAvatar src={headerProfileAvatar || ""} />
              </div>
            )}
          </div>
        </div>

        {isSearchOpen ? (
          <div className="absolute left-0 right-0 top-full z-[56] border-t border-transparent">
            <div className="w-full px-2 pb-3">
              <div
                id="global-search-dropdown"
                role="listbox"
                className="max-h-[min(65vh,420px)] w-full overflow-y-auto overscroll-contain rounded-2xl border border-gray-100 bg-white py-2 shadow-xl"
              >
                {!globalSearchQuery.trim() ? (
                  <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wide text-gray-400">자주 찾는 메뉴</div>
                ) : unifiedSearchResults.length === 0 ? (
                  <div className="px-2 py-8 text-center text-[13px] text-gray-500">관련 화면이 없습니다. 다른 단어로 검색해 보세요.</div>
                ) : null}
                {unifiedSearchResults.map((row) => {
                  const kind = row.action?.type || "main";
                  const thumbTone =
                    kind === "room"
                      ? "bg-blue-50 text-blue-600"
                      : kind === "page"
                        ? "bg-indigo-50 text-indigo-600"
                        : kind === "profile"
                          ? "bg-violet-50 text-violet-600"
                          : kind === "wallet"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-600";
                  const thumbText =
                    kind === "room"
                      ? "채"
                      : kind === "page"
                        ? "탭"
                        : kind === "profile"
                          ? "설"
                          : kind === "wallet"
                            ? "갑"
                            : "홈";
                  return (
                    <div key={row.id} className="px-1">
                      <button
                        type="button"
                        role="option"
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left active:bg-blue-50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => executeUnifiedSearchActionGuarded(row.action)}
                      >
                        <span
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${thumbTone}`}
                          aria-hidden
                        >
                          {thumbText}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[10px] font-bold text-blue-600">{row.category}</span>
                          <span className="block truncate text-[13px] font-bold leading-tight text-gray-900">{row.title}</span>
                          {row.subtitle ? (
                            <span className="block truncate text-[11px] leading-tight text-gray-500">{row.subtitle}</span>
                          ) : null}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      {page === "subhub" && (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Subscription
            isDarkMode={isDarkMode}
            activeSubTab={subscriptionSubTab}
            onChangeSubTab={(tab) => {
              if (isBrowseGuest && GUEST_PROTECTED_SUBHUB_TABS.has(tab)) {
                requireAuth(() => handleSubscriptionSubTab(tab));
                return;
              }
              handleSubscriptionSubTab(tab);
            }}
            chatRooms={subscribeHubRooms}
            chatUnreadTotal={subscribeChatUnreadTotal}
            isGuestMode={isBrowseGuest}
            onRequireAuth={requireAuth}
            onFamilyAlertToast={(text) => {
              addPushNotification({ category: "가족보호", title: "가족 보호", body: text });
              setBottomToast(text);
              setTimeout(() => setBottomToast(""), 4000);
            }}
            onOpenChat={(roomId) =>
              requireAuth(() => {
                if (!roomId) return;
                setUnreadByRoom((prev) => ({ ...prev, [roomId]: 0 }));
                navigate({ nextPage: "room", nextTab: "subscribe", nextRoomId: roomId });
              })
            }
          />
        </div>
      )}

      {page === "main" && (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Home
          onOpenStoryTarget={(payload) =>
            requireAuth(() => {
            const roomId = payload?.roomId || "";
            const [group, id] = String(roomId).split(":");
            const found = group && id ? (roomCatalog[group] || []).find((r) => r.id === id) : null;
            const titleName = payload?.shopName || found?.cardName || found?.name || "스토리";
            setSelectedFeedProfile({
              roomId: roomId || null,
              name: titleName,
              membershipTier: found?.membershipTier || "standard",
              organization: found?.cardOrg || titleName
            });
            navigate({ nextPage: "feed", nextTab: activeTab, nextRoomId: null });
          })}
          onOpenBlueConsultRoom={(roomId) =>
            requireAuth(() => {
            if (!roomId) return;
            setUnreadByRoom((prev) => ({ ...prev, [roomId]: 0 }));
            navigate({ nextPage: "room", nextTab: "subscribe", nextRoomId: roomId });
          })}
          onOpenBusinessRoom={(roomId) =>
            requireAuth(() => {
            if (!roomId) return;
            const tab = tabForRoom(roomId);
            setUnreadByRoom((prev) => ({ ...prev, [roomId]: 0 }));
            navigate({ nextPage: "room", nextTab: tab, nextRoomId: roomId });
          })}
          onOpenGuideFeature={(featureId) =>
            requireAuth(() => {
            if (featureId === "pricing") {
              setProfileInitialView("upgrade");
              setProfileOpen(true);
              return;
            }
            if (featureId === "digital-bizcard" || featureId === "lettering") {
              setProfileInitialView("letteringBizcard");
              setProfileOpen(true);
              return;
            }
            if (featureId === "family-protection") {
              requestOpenFamilyProtectionTab();
              navigate({ nextPage: "friendSearch", nextTab: activeTab, nextRoomId: null });
              return;
            }
            if (featureId === "direct-chat") {
              setSubscriptionSubTab("chat");
              navigate({ nextPage: "subhub", nextTab: activeTab, nextRoomId: null });
              return;
            }
            if (featureId === "live") {
              handleSubscriptionSubTab("media");
              navigate({ nextPage: "subhub", nextTab: activeTab, nextRoomId: null });
              return;
            }
            if (featureId === "hotplace") {
              requestOpenMyPageComposer({ alsoStore: true });
              navigate({ nextPage: "mypage", nextTab: activeTab, nextRoomId: null });
            }
          })}
          onOpenFamilyProtection={() =>
            requireAuth(() => {
            requestOpenFamilyProtectionTab();
            navigate({ nextPage: "friendSearch", nextTab: activeTab, nextRoomId: null });
          })}
          onOpenMyPageFeed={() =>
            requireAuth(() => {
            requestOpenMyPageComposer({ alsoStore: true });
            navigate({ nextPage: "mypage", nextTab: activeTab, nextRoomId: null });
          })}
          onOpenFriendSearch={() =>
            requireAuth(() => {
            navigate({ nextPage: "friendSearch", nextTab: activeTab, nextRoomId: null });
          })}
          catalogFriends={roomCatalog.friends || []}
          contactMatchData={contactMatchData}
          membershipTier={membershipTier}
          isDarkMode={isDarkMode}
          browseAsGuest={isBrowseGuest}
        />
        </div>
      )}
      {page === "friendSearch" && (
        <FriendSearch
          approvedFriendIds={(roomCatalog.friends || []).map((f) => f.id)}
          requests={friendRequests}
          inboxRequests={friendInboxRequests}
          blockedUserIds={blockedFriendIds}
          contactMatchData={contactMatchData}
          isDarkMode={isDarkMode}
          onContactMatchUpdate={setContactMatchData}
          onContactResyncRequest={() => setContactSyncModalOpen(true)}
          onOpenContactChat={(user) => {
            ensureFriendRoom(user.userId, user.displayName || user.contactName);
            navigate({ nextPage: "list", nextTab: "friends", nextRoomId: `friends:${user.userId}` });
          }}
          onFamilyToast={(text) => {
            setBottomToast(text);
            setTimeout(() => setBottomToast(""), 3200);
          }}
          onGoMain={goBackStep}
          onSendRequest={(user, message) => {
            if (blockedFriendIds.includes(user.id)) return;
            setFriendRequests((prev) => {
              const exists = prev.some((r) => r.toUserId === user.id && r.status !== "rejected");
              if (exists) return prev;
              return [
                {
                  id: `fr-${Date.now()}`,
                  toUserId: user.id,
                  toUserName: user.name,
                  message: String(message || "").trim(),
                  status: "pending",
                  createdAt: new Date().toISOString()
                },
                ...prev
              ];
            });
          }}
          onApproveRequest={(requestId) => {
            setFriendInboxRequests((prev) => {
              const req = prev.find((r) => r.id === requestId);
              if (req) ensureFriendRoom(req.fromUserId, req.fromUserName);
              return prev.filter((r) => r.id !== requestId);
            });
            setFriendRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "approved", approvedAt: new Date().toISOString() } : r)));
          }}
          onRejectRequest={(requestId) => {
            setFriendInboxRequests((prev) => prev.filter((r) => r.id !== requestId));
            setFriendRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "rejected" } : r)));
          }}
          onBlockUser={(userId, requestId) => {
            setBlockedFriendIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
            setFriendInboxRequests((prev) => prev.filter((r) => r.id !== requestId));
            setFriendRequests((prev) => prev.map((r) => (r.toUserId === userId ? { ...r, status: "rejected" } : r)));
          }}
        />
      )}
      {page === "list" && (
        <>
          <div className="flex min-h-0 min-w-0 w-full max-w-none flex-1 flex-col">
          <div className="shrink-0 px-2 pt-3">
            {isLoggedIn && (
              <>
                <ChatListChannelSwitch
                  value={chatListChannel}
                  onChange={handleChatListChannelChange}
                  isDarkMode={isDarkMode}
                />
                {hasOfficeGrant ? (
                  <div
                    className={`mb-2 flex items-center justify-end gap-2 text-[10px] font-bold ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        writeAppMode("personal");
                        setAppMode("personal");
                      }}
                      className={appMode === "personal" ? "text-blue-600" : ""}
                    >
                      개인
                    </button>
                    <span className="opacity-40">|</span>
                    <button
                      type="button"
                      onClick={async () => {
                        const uid = localStorage.getItem("vlue_server_user_id");
                        if (!uid) return;
                        try {
                          const res = await vlueAuthFetch(apiUrl("/api/cards/me-context"), {
                            headers: vlueAuthHeaders()
                          });
                          const data = await res.json();
                          const cid =
                            readActiveOfficeCardId() ||
                            data.owned?.[0]?.id ||
                            data.memberships?.[0]?.cardId ||
                            "";
                          if (!cid) return;
                          writeActiveOfficeCardId(cid);
                          setActiveOfficeCardId(cid);
                          writeAppMode("office");
                          setAppMode("office");
                        } catch {
                          /* ignore */
                        }
                      }}
                      className={appMode === "office" ? "text-blue-600" : ""}
                    >
                      직장내선
                    </button>
                  </div>
                ) : null}
              </>
            )}
            {chatListChannel === "general" ? (
              <ChatListTabDropdown
                tabs={tabs}
                activeId={listFilterTab}
                unreadByTab={unreadByTab}
                isDarkMode={isDarkMode}
                onSelect={(tabId) => navigate({ nextPage: "list", nextTab: tabId, nextRoomId: null })}
              />
            ) : null}
          </div>
          {chatListChannel === "mailTalk" ? (
            <MailTalkRoomList
              rooms={mailTalkRooms}
              loading={mailTalkRoomsLoading}
              error={mailTalkRoomsError}
              isDarkMode={isDarkMode}
              onCompose={() => requireAuth(() => setMailTalkComposeOpen(true))}
              onRoomDoubleClick={handleMailTalkRoomDoubleClick}
              onSelect={(roomId) =>
                requireAuth(() => {
                  navigate({
                    nextPage: "room",
                    nextTab: listFilterTab,
                    nextRoomId: mailTalkNavRoomId(roomId)
                  });
                })
              }
            />
          ) : listFilterTab === "push" ? (
            <PushNotificationInbox
              onUnreadChange={setPushUnreadCount}
              onOpenFamilyProtection={() =>
                requireAuth(() => {
                  requestOpenFamilyProtectionTab();
                  navigate({ nextPage: "friendSearch", nextTab: activeTab, nextRoomId: null });
                })
              }
            />
          ) : (
            <ChatList
              rooms={currentRoomsForList}
              selectedRoomId={selectedRoomId}
              floatingRoomIds={floatingRoomIds}
              isDesktopPd={isDesktopPd}
              onRoomAction={handleChatRoomAction}
              onRoomDoubleClick={handleGeneralRoomDoubleClick}
              onSelect={(roomId) => {
                if (roomId === "vlue:memo") {
                  openMemoScreen();
                  return;
                }
                setUnreadByRoom((prev) => ({ ...prev, [roomId]: 0 }));
                navigate({ nextPage: "room", nextTab: listFilterTab, nextRoomId: roomId });
              }}
              onOpenProfile={(roomId) => {
                if (!roomId) return;
                const [group, id] = roomId.split(":");
                const found = (roomCatalog[group] || []).find((r) => r.id === id);
                if (!found) return;
                setSelectedFeedProfile({
                  roomId,
                  name: found.cardName || found.name,
                  membershipTier: found.membershipTier || "free",
                  organization: found.cardOrg || found.name
                });
                navigate({ nextPage: "feed", nextTab: listFilterTab, nextRoomId: null });
              }}
            />
          )}
          </div>
        </>
      )}
      {page === "room" && isMailTalkRoomId(selectedRoomId) && (
        <MailTalkRoomView
          roomId={mailTalkRoomIdFromNav(selectedRoomId)}
          onBack={goBackStep}
          isDarkMode={isDarkMode}
          sseVersion={mailTalkSseVersion}
        />
      )}
      {page === "room" && selectedRoomId === "vlue:official" && (
        <ChatRoom
          roomId="vlue:official"
          roomName="VLUE 공식 알림"
          messages={messagesByRoom["vlue:official"] || []}
          appendOutgoingMessage={appendOutgoingMessage}
          readOnlyBroadcast
          onBack={goBackStep}
          membershipTier={membershipTier}
          digitalCardActive={digitalCardActive}
          myCard={myCardProfile}
          myCardUserId="me"
          myPhone={myCardProfile.phone}
          peerMembershipTier="free"
          peerCard={{
            name: "VLUE",
            title: "공식 알림",
            organization: "VLUE",
            phone: "",
            introBack: ""
          }}
          peerLegalName=""
          peerPhone=""
          inviteCandidates={[]}
          onCreateGroupRoom={undefined}
          isBlocked={false}
          onToggleBlock={() => {}}
          walletCards={cardWallet}
          profileByRoomId={profileByRoomId}
          onSaveCardToWallet={saveCardToWallet}
          onSaveToContacts={saveToContacts}
          onRemoveCardFromWallet={removeCardFromWallet}
          isFavoriteRoom={favoriteRooms.has("vlue:official")}
          onToggleFavoriteRoom={() => toggleFavoriteRoom("vlue:official")}
          onOpenPeerFeed={() => {}}
          isDarkMode={isDarkMode}
        />
      )}
      {page === "room" && selectedRoomId && selectedRoomId !== "vlue:official" && !isMailTalkRoomId(selectedRoomId) && (
        <ChatRoom
          roomId={selectedRoomId}
          roomName={currentRoomInfo.name}
          messages={messagesByRoom[selectedRoomId] || []}
          appendOutgoingMessage={appendOutgoingMessage}
          onRealtimeChatMessage={mergeIncomingServerChatMessage}
          onBack={goBackStep}
          membershipTier={membershipTier}
          onOpenSubscription={() => setPage("mypage")}
          digitalCardActive={digitalCardActive}
          myCard={myCardProfile}
          myCardUserId="me"
          myPhone={myCardProfile.phone}
          peerMembershipTier={currentRoomInfo.membershipTier || "free"}
          peerCard={{
            name: currentRoomInfo.cardName || currentRoomInfo.name,
            title: currentRoomInfo.cardTitle || "",
            organization: currentRoomInfo.cardOrg || "",
            phone: peerPhone,
            legalName: String(currentRoomInfo.verifiedLegalName || "").trim(),
            introBack: currentRoomInfo.membershipTier === "premium" ? `${currentRoomInfo.name} 채널입니다.\n서비스 소개와 프로모션 내용을 확인하세요.` : "",
            vcidLettering: currentRoomInfo.vcidLettering !== false
          }}
          peerLegalName={String(currentRoomInfo.verifiedLegalName || "").trim()}
          peerPhone={peerPhone}
          inviteCandidates={inviteCandidates}
          onCreateGroupRoom={createGroupRoom}
          isBlocked={blockedRooms.has(selectedRoomId)}
          onToggleBlock={() => toggleBlockRoom(selectedRoomId)}
          walletCards={cardWallet}
          profileByRoomId={profileByRoomId}
          onSaveCardToWallet={saveCardToWallet}
          onSaveToContacts={saveToContacts}
          onRemoveCardFromWallet={removeCardFromWallet}
          isFavoriteRoom={favoriteRooms.has(selectedRoomId)}
          onToggleFavoriteRoom={() => toggleFavoriteRoom(selectedRoomId)}
          onOpenPeerFeed={() => {
            setSelectedFeedProfile({
              roomId: selectedRoomId,
              name: currentRoomInfo.cardName || currentRoomInfo.name,
              membershipTier: currentRoomInfo.membershipTier || "free",
              organization: currentRoomInfo.cardOrg || currentRoomInfo.name
            });
            navigate({ nextPage: "feed", nextTab: activeTab, nextRoomId: null });
          }}
          isDarkMode={isDarkMode}
          onOpenGroupCalendar={() =>
            openCalendarScreen({ groupId: selectedRoomId, groupName: currentRoomInfo.name })
          }
          onCreateGroupCalendar={() =>
            openCalendarScreen({ groupId: selectedRoomId, groupName: currentRoomInfo.name })
          }
          canManageGroupCalendar={/^(family|friends|work):/.test(String(selectedRoomId || ""))}
          onOpenCalendarFromNotice={(notice) =>
            openCalendarScreen({ eventId: notice.eventId, groupId: notice.roomId })
          }
        />
      )}
      <MailTalkComposeModal
        open={mailTalkComposeOpen}
        onClose={() => setMailTalkComposeOpen(false)}
        isDarkMode={isDarkMode}
        onSent={(roomId) => {
          refreshMailTalkRooms();
          navigate({
            nextPage: "room",
            nextTab: listFilterTab,
            nextRoomId: mailTalkNavRoomId(roomId)
          });
        }}
      />
      <VmingUpgradePromptModal
        open={vmingUpgradePrompt.open}
        message={vmingUpgradePrompt.message}
        blockedReasonType={vmingUpgradePrompt.blockedReasonType}
        onClose={() =>
          setVmingUpgradePrompt({ open: false, message: "", blockedReasonType: "GENERAL_LIMIT_EXCEEDED" })
        }
      />
      {page === "feed" && (
        <PersonalFeed
          profile={selectedFeedProfile}
          appMode={appMode}
          activeOfficeCardId={activeOfficeCardId}
          membershipTier={membershipTier}
          onGoMain={goBackStep}
          onOpenManager={() => navigate({ nextPage: "manage", nextTab: activeTab, nextRoomId: null })}
          onOpenRoom={(roomId) => {
            if (!roomId) return;
            setUnreadByRoom((prev) => ({ ...prev, [roomId]: 0 }));
            navigate({ nextPage: "room", nextTab: activeTab, nextRoomId: roomId });
          }}
          onRequestPersonalMode={() => {
            writeAppMode("personal");
            setAppMode("personal");
          }}
          onRequestOfficeMode={async () => {
            const uid = localStorage.getItem("vlue_server_user_id");
            if (!uid) return;
            const res = await vlueAuthFetch(apiUrl("/api/cards/me-context"), {
              headers: vlueAuthHeaders()
            });
            const data = await res.json();
            const cid = data.owned?.[0]?.id || data.memberships?.[0]?.cardId || "";
            if (cid) {
              writeActiveOfficeCardId(cid);
              setActiveOfficeCardId(cid);
              writeAppMode("office");
              setAppMode("office");
            }
          }}
        />
      )}
      {page === "memo" && (
        <PersonalMemoScreen
          onBack={goBackStep}
          isDarkMode={isDarkMode}
          initialMemoId={memoNav.memoId}
          onToast={(msg) => {
            setBottomToast(msg);
            setTimeout(() => setBottomToast(""), 2800);
            fetchMemoMeta().then(setMemoMeta).catch(() => {});
          }}
          onShareToChat={shareMemoToChat}
          onOpenCalendar={(memo) => {
            openCalendarScreen();
            setBottomToast("일정 화면에서 메모 내용을 등록해 주세요.");
            setTimeout(() => setBottomToast(""), 3200);
            if (memo?.content) {
              try {
                sessionStorage.setItem("vlue_calendar_draft_from_memo", memo.content.slice(0, 500));
              } catch {
                /* ignore */
              }
            }
          }}
          onOpenSubhub={(url) => {
            try {
              sessionStorage.setItem("vlue_subhub_saved_link", url);
            } catch {
              /* ignore */
            }
            navigate({ nextPage: "subhub", nextTab: "all", nextRoomId: null });
          }}
        />
      )}
      {page === "calendar" && (
        <VlueCalendarScreen
          onBack={goBackStep}
          isDarkMode={isDarkMode}
          calendarGroups={calendarGroups}
          initialEventId={
            calendarNav.eventId ||
            (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(OPEN_CALENDAR_EVENT_KEY) || "" : "")
          }
          initialGroupId={calendarNav.groupId}
          initialGroupName={calendarNav.groupName}
          onToast={(msg) => {
            setBottomToast(msg);
            setTimeout(() => setBottomToast(""), 2800);
          }}
          onShareEventToChat={shareCalendarEventToChat}
          onPublishRoomNotice={publishCalendarRoomNotice}
        />
      )}
      {page === "blueai" && (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <BlueAIChat onGoMain={goBackStep} onAssistantReply={() => setBlueAiActivitySeq((n) => n + 1)} isDarkMode={isDarkMode} />
        </div>
      )}
      {page === "mycase" && (
        <MyCaseScreen
          onGoMain={goBackStep}
          isDarkMode={isDarkMode}
          showcasePickEnabled
          showLineSwitcher
          onToast={(msg) => {
            setBottomToast(msg);
            setTimeout(() => setBottomToast(""), 2800);
          }}
        />
      )}
      {page === "manage" && <FeedManager membershipTier={membershipTier} onGoMain={goBackStep} />}
      {page === "mypage" && (
        <MyPage
          key={myPageMountKey}
          resetNonce={myPageMountKey}
          isDarkMode={isDarkMode}
          membershipTier={membershipTier}
          onOpenManager={() => navigate({ nextPage: "manage", nextTab: activeTab, nextRoomId: null })}
          onGoMain={goBackStep}
          onOpenBetaGuide={() => navigate({ nextPage: "betaGuide", nextTab: activeTab, nextRoomId: null })}
          onOpenCardWallet={() => setCardWalletModalOpen(true)}
          onOpenLetteringBizcardSettings={() => {
            setProfileInitialView("letteringBizcard");
            setProfileOpen(true);
          }}
          onOpenCalendar={() => openCalendarScreen()}
          onOpenUpdateStory={() => {
            window.dispatchEvent(
              new CustomEvent("vlue-home-focus-update-story", { detail: { tab: "subscribe" } })
            );
            navigate({ nextPage: "main", nextTab: activeTab, nextRoomId: null });
          }}
          onOpenFamilyProtection={() => {
            requestOpenFamilyProtectionTab();
            navigate({ nextPage: "friendSearch", nextTab: activeTab, nextRoomId: null });
          }}
          onOpenMycase={() => navigate({ nextPage: "mycase", nextTab: activeTab, nextRoomId: null })}
        />
      )}
      {page === "betaGuide" && <BetaLaunchGuide onGoMain={goBackStep} />}
      <WalletHubModal
        open={cardWalletModalOpen}
        defaultTab={walletDefaultTab}
        onClose={() => setCardWalletModalOpen(false)}
        walletCards={cardWallet}
        profileByRoomId={profileByRoomId}
        membershipTier={membershipTier}
        storageFiles={[]}
        isDarkMode={isDarkMode}
        onRemoveCardFromWallet={removeCardFromWallet}
      />
      <AppNotificationSheet
        open={v1AppShell.notificationInbox && appNotificationOpen}
        onClose={() => setAppNotificationOpen(false)}
        isDarkMode={isDarkMode}
        onOpenFamilyProtection={() => {
          setAppNotificationOpen(false);
          requestOpenFamilyProtectionTab();
          navigate({ nextPage: "friendSearch", nextTab: activeTab, nextRoomId: null });
        }}
      />
      <ShowcaseStyleSettingsSheet
        open={v1AppShell.showcaseStyleSettings && showcaseStyleSheetOpen}
        onClose={() => setShowcaseStyleSheetOpen(false)}
        membershipTier={membershipTier}
        isDarkMode={isDarkMode}
        onOpenUpgrade={() => {
          setShowcaseStyleSheetOpen(false);
          setProfileInitialView("upgrade");
          setProfileOpen(true);
        }}
        onToast={(msg) => {
          setBottomToast(msg);
          setTimeout(() => setBottomToast(""), 2200);
        }}
      />
      <OwnShowcaseSlideOverlay
        onToast={(msg) => {
          setBottomToast(msg);
          setTimeout(() => setBottomToast(""), 2200);
        }}
      />
      <CallShowcaseHistorySheet
        open={v1AppShell.callShowcaseHistoryNav && callShowcaseSheetOpen}
        onClose={() => setCallShowcaseSheetOpen(false)}
        isDarkMode={isDarkMode}
      />
      <OfficeRemoteModal
        open={v1AppShell.printerRemote && officeRemoteOpen}
        onClose={() => setOfficeRemoteOpen(false)}
        isDarkMode={isDarkMode}
        onToast={(msg) => {
          setBottomToast(msg);
          setTimeout(() => setBottomToast(""), 2800);
        }}
      />

      <footer
        className={`fixed bottom-0 left-0 right-0 z-[150] ${showBottomNav ? "block" : "hidden"}`}
      >
        <nav className="fixed bottom-0 left-0 right-0 z-[151] flex justify-center">
          <div
            ref={bottomNavPulseSyncRef}
            data-vlue-bottom-nav
            className={`bottom-nav-pulse-root flex min-h-[48px] w-full max-w-none items-center justify-around border-t px-2 pb-[max(0px,env(safe-area-inset-bottom,0px))] pt-[6px] backdrop-blur-md ${
              isDarkMode
                ? "bg-[#0b1220]/95 border-white/10 shadow-[0_-2px_12px_rgba(2,6,23,0.65)]"
                : "bg-white/95 border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
            }`}
          >
            {v1AppShell.chat ? (
            <button
              type="button"
              onClick={() => {
                triggerHeaderEyeNavBlink();
                if (isBrowseGuest) {
                  requireAuth(() => {
                    const chatSurface = page === "list" || page === "room" || page === "feed" || page === "manage";
                    navigate({
                      nextPage: "list",
                      nextTab: chatSurface && page === "list" ? activeTab || "all" : "all",
                      nextRoomId: null
                    });
                  });
                  return;
                }
                requireApp(() => {
                  const chatSurface = page === "list" || page === "room" || page === "feed" || page === "manage";
                  navigate({
                    nextPage: "list",
                    nextTab: chatSurface && page === "list" ? activeTab || "all" : "all",
                    nextRoomId: null
                  });
                });
              }}
              className="flex flex-col items-center justify-center w-full active:scale-95 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`${
                  activeBottomTab === "chat"
                    ? "text-blue-500"
                    : bottomNavPulseChat
                      ? `${isDarkMode ? "text-blue-300" : "text-gray-500"} nav-bottom-icon-pulse`
                      : isDarkMode
                        ? "text-gray-400"
                        : "text-gray-400"
                }`}
              >
                <path d="M7 10h10M7 14h6" />
                <path d="M21 12c0 4.97-4.03 9-9 9a9.9 9.9 0 0 1-4-.84L3 21l.84-5A9 9 0 1 1 21 12z" />
              </svg>
            </button>
            ) : null}

            {v1AppShell.vumingAi ? (
            <button
              type="button"
              onClick={() => {
                triggerHeaderEyeNavBlink();
                if (isBrowseGuest) {
                  requireAuth(() => navigate({ nextPage: "blueai", nextTab: activeTab, nextRoomId: null }));
                  return;
                }
                requireApp(() => navigate({ nextPage: "blueai", nextTab: activeTab, nextRoomId: null }));
              }}
              className="flex flex-col items-center justify-center w-full active:scale-95 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`${
                  activeBottomTab === "blueai"
                    ? "text-blue-500"
                    : bottomNavPulseBlueAi
                      ? `${isDarkMode ? "text-blue-300" : "text-gray-500"} nav-bottom-icon-pulse`
                      : isDarkMode
                        ? "text-gray-400"
                        : "text-gray-400"
                }`}
              >
                <path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path>
              </svg>
            </button>
            ) : null}

            {v1AppShell.mypageShop ? (
            <button
              type="button"
              onClick={() => {
                triggerHeaderEyeNavBlink();
                if (isBrowseGuest) {
                  requireAuth(() => navigate({ nextPage: "mypage", nextTab: activeTab, nextRoomId: null }));
                  return;
                }
                requireApp(() => navigate({ nextPage: "mypage", nextTab: activeTab, nextRoomId: null }));
              }}
              className="flex flex-col items-center justify-center w-full active:scale-95 transition-all"
            >
              <span
                className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-full ${
                  activeBottomTab === "mypage"
                    ? isDarkMode
                      ? "bg-blue-500 text-white shadow-md shadow-blue-900/40"
                      : "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : isDarkMode
                      ? "bg-slate-800"
                      : "bg-blue-50"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`h-4.5 w-4.5 ${
                    activeBottomTab === "mypage"
                      ? ""
                      : bottomNavPulseMy
                        ? `${isDarkMode ? "text-blue-300" : "text-gray-500"} nav-bottom-icon-pulse`
                        : isDarkMode
                          ? "text-blue-300"
                          : "text-blue-600"
                  }`}
                >
                  <circle cx="12" cy="8" r="3.2" />
                  <path d="M5 19c1.7-3.1 4.3-4.5 7-4.5s5.3 1.4 7 4.5" />
                </svg>
              </span>
            </button>
            ) : null}

            {v1AppShell.shoppingCart ? (
            <button
              type="button"
              onClick={() => {
                triggerHeaderEyeNavBlink();
                if (isBrowseGuest) {
                  handleSubscriptionSubTab("media");
                  navigate({ nextPage: "subhub", nextTab: activeTab || "subscribe", nextRoomId: null });
                  return;
                }
                requireApp(() => {
                  setSubscriptionSubTab("recommend");
                  navigate({ nextPage: "subhub", nextTab: activeTab || "subscribe", nextRoomId: null });
                });
              }}
              className="flex flex-col items-center justify-center w-full active:scale-95 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`${
                  activeBottomTab === "shopping"
                    ? "text-blue-500"
                    : bottomNavPulseShopping
                      ? `${isDarkMode ? "text-blue-300" : "text-gray-500"} nav-bottom-icon-pulse`
                      : isDarkMode
                        ? "text-gray-400"
                        : "text-gray-400"
                }`}
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </button>
            ) : null}

            {v1AppShell.notificationInbox ? (
            <button
              type="button"
              onClick={() => {
                triggerHeaderEyeNavBlink();
                requireApp(() => {
                  setCallShowcaseSheetOpen(false);
                  setShowcaseStyleSheetOpen(false);
                  setAppNotificationOpen(true);
                });
              }}
              className="relative flex flex-col items-center justify-center w-full active:scale-95 transition-all"
              aria-label="앱 알림"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`${
                  activeBottomTab === "notifications"
                    ? "text-blue-500"
                    : bottomNavPulseNotifications
                      ? `${isDarkMode ? "text-blue-300" : "text-gray-500"} nav-bottom-icon-pulse`
                      : isDarkMode
                        ? "text-gray-400"
                        : "text-gray-400"
                }`}
              >
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {pushUnreadCount > 0 ? (
                <span
                  className="absolute right-[calc(50%-14px)] top-0 h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_0_2px_rgba(255,255,255,0.95)]"
                  aria-label={`읽지 않은 알림 ${pushUnreadCount}건`}
                />
              ) : null}
            </button>
            ) : null}

            {v1AppShell.mycase ? (
            <button
              type="button"
              onClick={() => {
                triggerHeaderEyeNavBlink();
                setAppNotificationOpen(false);
                setCallShowcaseSheetOpen(false);
                setShowcaseStyleSheetOpen(false);
                if (isBrowseGuest) {
                  requireAuth(() => navigate({ nextPage: "mycase", nextTab: activeTab, nextRoomId: null }));
                  return;
                }
                requireApp(() => navigate({ nextPage: "mycase", nextTab: activeTab, nextRoomId: null }));
              }}
              className="flex flex-col items-center justify-center w-full active:scale-95 transition-all"
              aria-label="마이케이스"
              title="마이케이스"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`${
                  activeBottomTab === "mycase"
                    ? "text-blue-500"
                    : isDarkMode
                      ? "text-gray-400"
                      : "text-gray-400"
                }`}
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
            ) : null}

            {v1AppShell.callShowcaseHistoryNav ? (
            <button
              type="button"
              onClick={() => {
                triggerHeaderEyeNavBlink();
                requireApp(() => {
                  setAppNotificationOpen(false);
                  setShowcaseStyleSheetOpen(false);
                  setCallShowcaseSheetOpen(true);
                });
              }}
              className="flex flex-col items-center justify-center w-full active:scale-95 transition-all"
              aria-label="통화 목록"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`${
                  activeBottomTab === "calls"
                    ? "text-blue-500"
                    : isDarkMode
                      ? "text-gray-400"
                      : "text-gray-400"
                }`}
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                triggerHeaderEyeNavBlink();
                setAppNotificationOpen(false);
                setCallShowcaseSheetOpen(false);
                setShowcaseStyleSheetOpen(false);
                if (isBrowseGuest) {
                  requireAuth(() => navigate({ nextPage: "friendSearch", nextTab: activeTab, nextRoomId: null }));
                  return;
                }
                requireApp(() => navigate({ nextPage: "friendSearch", nextTab: activeTab, nextRoomId: null }));
              }}
              className="flex flex-col items-center justify-center w-full active:scale-95 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`${
                  activeBottomTab === "home"
                    ? "text-blue-500"
                    : bottomNavPulseFriendSearch
                      ? `${isDarkMode ? "text-blue-300" : "text-gray-500"} nav-bottom-icon-pulse`
                      : isDarkMode
                        ? "text-gray-400"
                        : "text-gray-400"
                }`}
              >
                <circle cx="9" cy="7" r="4" />
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <path d="M19 8v6" />
                <path d="M22 11h-6" />
              </svg>
            </button>
          </div>
        </nav>
      </footer>
      <Suspense fallback={null}>
        {v1AppShell.bizcardScanner && homeHeaderMinimal ? (
          <BizcardScannerScreen
            open={csScannerOpen}
            onClose={() => setCsScannerOpen(false)}
            onToast={(msg) => {
              if (!msg) return;
              setBottomToast(msg);
              setTimeout(() => setBottomToast(""), 2800);
            }}
          />
        ) : (
          <CsScannerScreen
            open={v1AppShell.storeScanner && csScannerOpen}
            documentOnly={false}
            onClose={() => setCsScannerOpen(false)}
            onToast={(msg) => {
              if (!msg) return;
              setBottomToast(msg);
              setTimeout(() => setBottomToast(""), 2800);
            }}
          />
        )}
        <VlueUnifiedInboxScreen
          open={emailInboxOpen}
          isDarkMode={isDarkMode}
          onClose={() => setEmailInboxOpen(false)}
          onOpenSettings={() => {
            setEmailInboxOpen(false);
            setEmailForwardingSettingsOpen(true);
            try {
              window.location.hash = "#email-settings";
            } catch {
              /* ignore */
            }
          }}
        />
      </Suspense>
      {qrScannerOpen && (
        <div className="fixed inset-0 z-[95] flex items-start justify-center bg-black/45 backdrop-blur-md px-3 pt-16 sm:items-center sm:pt-0" onMouseDown={closeQrScanner}>
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <ModalCloseButton variant="default" onClick={closeQrScanner} />
            <div className="border-b border-gray-100 px-4 py-3 pr-14">
              <p className="text-[14px] font-black text-slate-900">매장 QR 스캐너</p>
              <p className="text-[11px] font-semibold text-blue-600">방문 인증 · 향후 QR 결제</p>
            </div>
            <div className="p-3">
              <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-slate-950">
                <video ref={qrVideoRef} className="h-56 w-full object-cover" playsInline muted autoPlay />
                <div className="pointer-events-none absolute inset-0 border-[3px] border-white/20" />
              </div>
              {lastScannedQr ? <p className="mt-2 text-[10px] font-semibold text-slate-500">최근 스캔: {lastScannedQr}</p> : null}
              {qrCameraError ? <p className="mt-2 text-[11px] font-bold text-rose-600">{qrCameraError}</p> : null}
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  className="min-w-0 flex-1 rounded-lg border border-blue-100 px-2 py-2 text-[12px]"
                  placeholder="QR 토큰 수동 입력 (예: VLUE-XXXX)"
                  value={qrManualValue}
                  onChange={(e) => setQrManualValue(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded-lg bg-blue-700 px-3 text-[11px] font-black text-white"
                  onClick={() => handleQrDecoded(qrManualValue)}
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isDesktopPd && floatingRooms.length > 0 ? (
        <div className="pointer-events-none fixed bottom-24 right-4 z-[88] flex max-w-[220px] flex-col gap-2">
          {floatingRooms.map((room) => (
            <div
              key={room.roomId}
              className="pointer-events-auto flex items-center gap-2 rounded-xl border border-gray-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur"
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-[12px] font-bold text-gray-900"
                onClick={() => navigate({ nextPage: "room", nextTab: listFilterTab, nextRoomId: room.roomId })}
              >
                {room.name}
              </button>
              <button
                type="button"
                className="shrink-0 text-[11px] font-bold text-gray-400"
                aria-label="플로팅 접기"
                onClick={() =>
                  setFloatingRoomIds((prev) => {
                    const next = new Set(prev);
                    next.delete(room.roomId);
                    return next;
                  })
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <MarketingPopupModal
        popup={marketingPopup}
        open={marketingPopupOpen && page === "main"}
        onClose={() => setMarketingPopupOpen(false)}
        onOpenLink={handleMarketingPopupLink}
      />
      <NoticeReleaseToast
        open={noticeReleaseToastOpen}
        message={noticeReleaseMessage}
        onTap={() => {
          setNoticeReleaseToastOpen(false);
          if (activeNotice) setNoticeDetailOpen(true);
          else {
            fetchLatestNotice()
              .then((data) => {
                if (data.notice) {
                  setActiveNotice(data.notice);
                  setNoticeDetailOpen(true);
                }
              })
              .catch(() => {
                setBottomToast("공지를 불러오지 못했습니다.");
                setTimeout(() => setBottomToast(""), 2400);
              });
          }
        }}
        onDismiss={() => setNoticeReleaseToastOpen(false)}
      />
      <NoticeDetailSheet notice={activeNotice} open={noticeDetailOpen} onClose={() => setNoticeDetailOpen(false)} />
      <FamilyIosRestrictedDialog />
      <HashtagSearchPopup
        open={Boolean(hashtagSearchTag)}
        tag={hashtagSearchTag}
        onClose={() => setHashtagSearchTag("")}
        onSelectResult={(row) => {
          setHashtagSearchTag("");
          if (!row?.userId) return;
          window.dispatchEvent(
            new CustomEvent("vlue-open-case-user", {
              detail: {
                userId: row.userId,
                handle: row.publicHandle || "",
                name: row.name || row.publicHandle || "케이스함"
              }
            })
          );
        }}
      />
      <UserCaseArchiveView
        open={Boolean(caseArchiveUser?.userId)}
        userId={caseArchiveUser?.userId || null}
        displayName={caseArchiveUser?.name || ""}
        peerHandle={caseArchiveUser?.handle || ""}
        onClose={() => setCaseArchiveUser(null)}
        onToast={(msg) => {
          setBottomToast(String(msg || ""));
          window.setTimeout(() => setBottomToast(""), 2800);
        }}
        isDarkMode={isDarkMode}
      />
      <VluePillToast
        message={bottomToast}
        bottomClassName={
          isLoggedIn || isBrowseGuest
            ? "bottom-[calc(54px+env(safe-area-inset-bottom,0px)+12px)]"
            : "bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))]"
        }
      />
      <VluePillToast
        message={memoPillToast.message}
        onTap={
          memoPillToast.memoId
            ? () => {
                const id = memoPillToast.memoId;
                setMemoPillToast({ message: "", memoId: "" });
                openMemoScreen({ memoId: id });
              }
            : undefined
        }
        bottomClassName="bottom-[calc(54px+env(safe-area-inset-bottom,0px)+72px)]"
        className={memoPillToast.message ? "" : "hidden"}
      />
      <VluePillToast
        message={posBillToast.message}
        onTap={posBillToast.message ? openPosSalesDashboard : undefined}
        bottomClassName="bottom-[calc(54px+env(safe-area-inset-bottom,0px)+72px)]"
        className={posBillToast.message ? "" : "hidden"}
      />
      <MemoShareReceiveSheet
        open={shareReceiveOpen}
        draft={shareReceiveDraft}
        isDarkMode={isDarkMode}
        onClose={() => {
          setShareReceiveOpen(false);
          setShareReceiveDraft(null);
        }}
        onSave={async (draft) => {
          await receiveShareMemo({ ...draft, save: true });
          setShareReceiveOpen(false);
          setShareReceiveDraft(null);
          fetchMemoMeta().then(setMemoMeta).catch(() => {});
          setBottomToast("메모장에 저장했습니다.");
          setTimeout(() => setBottomToast(""), 2600);
        }}
        onEditSave={(draft) => {
          setShareReceiveOpen(false);
          setShareReceiveDraft(null);
          openMemoScreen();
          try {
            sessionStorage.setItem("vlue_memo_editor_draft", JSON.stringify(draft));
          } catch {
            /* ignore */
          }
        }}
      />
      <LetteringCertModal
        open={letteringCertOpen}
        payload={letteringCertPayload}
        onClose={() => setLetteringCertOpen(false)}
      />
      {tierBillingPrompt.open && (
        <div className="fixed inset-0 z-[92] flex items-center justify-center bg-black/45 px-6" onMouseDown={() => setTierBillingPrompt({ open: false, targetTier: "" })}>
          <div className="relative w-full max-w-sm rounded-2xl border border-blue-100 bg-white p-5 pt-12 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <ModalCloseButton variant="default" onClick={() => setTierBillingPrompt({ open: false, targetTier: "" })} />
            <p className="text-[15px] font-black text-gray-900">등급 변경 승인 완료</p>
            <p className="mt-1 text-[12px] leading-relaxed text-gray-600">
              {tierBillingPrompt.targetTier === "paid" || tierBillingPrompt.targetTier === "premium" || tierBillingPrompt.targetTier === "standard"
                ? "유료"
                : "일반"} 멤버십 결제를 진행하면 변경이 적용됩니다.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setTierBillingPrompt({ open: false, targetTier: tierBillingPrompt.targetTier })}
                className="flex-1 rounded-xl bg-gray-100 py-2.5 text-[12px] font-bold text-gray-600"
              >
                나중에
              </button>
              <button
                type="button"
                onClick={() => {
                  applyMembershipTierFromHub(tierBillingPrompt.targetTier);
                  try {
                    localStorage.removeItem(TIER_CHANGE_STATE_KEY);
                    localStorage.removeItem(TIER_CHANGE_TARGET_KEY);
                  } catch {
                    /* ignore */
                  }
                  setTierBillingPrompt({ open: false, targetTier: "" });
                  setBottomToast("결제 안내를 통해 등급 변경이 적용되었습니다.");
                  setTimeout(() => setBottomToast(""), 2600);
                }}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-[12px] font-black text-white"
              >
                결제 진행
              </button>
            </div>
          </div>
        </div>
      )}

      {emailForwardingSettingsOpen && showAppShell ? (
        <div className="fixed inset-0 z-[160] flex flex-col bg-[#F8F9FA] dark:bg-[#0f1118]">
          <VlueEmailSettingsSection
            isDarkMode={isDarkMode}
            membershipTier={membershipTier}
            companyName={
              String(localStorage.getItem("vlue_company_locked") || "").trim() ||
              String(myCardProfile?.organization || "").trim()
            }
            onOpenUpgrade={() => {
              setEmailForwardingSettingsOpen(false);
              try {
                window.history.replaceState(null, "", window.location.pathname + window.location.search);
              } catch {
                /* ignore */
              }
              setProfileInitialView("upgrade");
              setProfileOpen(true);
            }}
            showSettingNotice={(msg) => {
              if (!msg) return;
              setBottomToast(msg);
              setTimeout(() => setBottomToast(""), 2800);
            }}
            onBack={() => {
              setEmailForwardingSettingsOpen(false);
              const h = window.location.hash || "";
              if (h === "#email" || h === "#email-settings") {
                try {
                  window.history.replaceState(null, "", window.location.pathname + window.location.search);
                } catch {
                  /* ignore */
                }
              }
            }}
          />
        </div>
      ) : null}

      <ProfilePanel
        open={profileOpen}
        initialView={profileInitialView}
        onClose={() => setProfileOpen(false)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={setIsDarkMode}
        onShowSettingNotice={(msg) => {
          setBottomToast(msg);
          setTimeout(() => setBottomToast(""), 2800);
        }}
        membershipTier={membershipTier}
        onMembershipTierChange={applyMembershipTierFromHub}
        onRequestTierChange={handleRequestTierChange}
        digitalCardIssued={myCardProfile.digitalCardIssued !== false}
        digitalCardActive={digitalCardActive}
        myCard={myCardProfile}
        onCardFieldsSaved={() => {
          setCardFieldsTick((n) => n + 1);
          setDigitalCardActive(readDigitalCardActive());
        }}
        onOpenPageManager={() => {
          setProfileOpen(false);
          navigate({ nextPage: "manage", nextTab: activeTab, nextRoomId: null });
        }}
        onOpenCalendar={() => {
          setProfileOpen(false);
          openCalendarScreen();
        }}
        calendarBadgeCount={calendarBadge}
        onOpenWallet={() => {
          setProfileOpen(false);
          setWalletDefaultTab("received");
          setCardWalletModalOpen(true);
        }}
        onOpenOfficeRemote={() => {
          setProfileOpen(false);
          setOfficeRemoteOpen(true);
        }}
        onOpenEmailInbox={() => {
          setProfileOpen(false);
          setEmailInboxOpen(true);
        }}
        onOpenStoreCart={() => {
          setProfileOpen(false);
          setSubscriptionSubTab("cart");
          navigate({ nextPage: "subhub", nextTab: activeTab, nextRoomId: null });
          setBottomToast("VLUE 스토어 장바구니로 이동했습니다.");
          setTimeout(() => setBottomToast(""), 2200);
        }}
        onLogout={handleLogout}
        onWithdrawAccount={handleWithdrawAccount}
        onMarkAllChatsRead={markAllChatsRead}
        hasUnreadChats={hasUnreadChatsForMarkAll}
        blockedUserIds={blockedFriendIds}
        onUnblockUser={(userId) => setBlockedFriendIds((prev) => prev.filter((id) => id !== userId))}
        myPhone={myCardProfile?.phone || DEFAULT_MY_PHONE}
        onPhoneUpdated={() => setCardFieldsTick((n) => n + 1)}
        onOpenFamilyProtection={() => {
          setProfileOpen(false);
          requestOpenFamilyProtectionTab();
          navigate({ nextPage: "friendSearch", nextTab: activeTab, nextRoomId: null });
        }}
      />

      <V1PaidPackageGateModal
        open={v1PaidGateOpen}
        onClose={() => setV1PaidGateOpen(false)}
        isDarkMode={isDarkMode}
        onGoSubscribe={() => {
          setV1PaidGateOpen(false);
          const pending = {
            membershipKind: "paid",
            billingCycle: "monthly",
            amountKrw: PAID_EVENT_MONTHLY_KRW,
            label: "유료 멤버십 (V1)"
          };
          writePendingPayment(pending);
          setPostSignupPending(pending);
          setPostSignupPaymentOpen(true);
        }}
      />
        </>
      )}
    </div>
    </ShowcaseBgmProvider>
    </B2bMembershipProvider>
  );
}

export default App;
