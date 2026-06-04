import ChatInput from "./ChatInput";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VmingConsentRequestModal from "./vming/VmingConsentRequestModal.jsx";
import VmingConsentRespondModal from "./vming/VmingConsentRespondModal.jsx";
import VmingInfoSheet, { VmingHeaderIconButton } from "./vming/VmingInfoSheet.jsx";
import FraudAlertBanner from "./fraud/FraudAlertBanner.jsx";
import {
  fetchVmingConsentStatus,
  requestVmingConsent,
  respondVmingConsent,
  withdrawVmingConsent,
  evictVmingFromRoom
} from "../lib/vmingConsentApi.js";
import {
  buildVmingConsentRequestMessage,
  buildVmingDeclinedMessage,
  buildVmingJoinedMessage,
  buildVmingLeftMessage,
  isVmingConsentSatisfied,
  VMING_EVENTS
} from "../lib/vmingChatNotices.js";
import {
  isConsentRequester,
  isSameVlueUser,
  resolveMyIdentityIds,
  votersRequiredCount
} from "../lib/vmingConsentUi.js";
import BackButton from "./common/BackButton";
import ModalCloseButton from "./common/ModalCloseButton";
import GeneralLetteringCard from "./GeneralLetteringCard.jsx";
import MessageList from "./MessageList";
import WeChatMessageContextMenu from "./chat/WeChatMessageContextMenu.jsx";
import ChatRoomSettingsSheet from "./chat/ChatRoomSettingsSheet.jsx";
import ChatRoomNoticeBanner from "./chat/ChatRoomNoticeBanner.jsx";
import { simulatePeerOnline } from "../lib/chatMessageUi.js";
import { postVmingChat } from "../lib/vmingApi.js";
import { subscribeVlueSseAppEvents, VLUE_SSE_CHAT_MESSAGE } from "../lib/vlueSse.js";
import {
  consumeAutoRequestVming,
  readGroupCreateVmingDefault,
  setGroupCreateVmingDefault
} from "../lib/chatRoomPrefsStorage.js";
import { VLUE_CARD_CAUTION, digitalCardBadgeText, digitalCardRoleLine } from "../lib/vlueDigitalCardUi.js";
import { getLegalName } from "../lib/memberCardStorage.js";
import { VlueOfficialChannelAvatar } from "./VlueOfficialChannelAvatar.jsx";

function digitsOnly(s) {
  return String(s || "").replace(/\D/g, "");
}

function maskPhoneTail(phone) {
  const d = digitsOnly(phone);
  if (d.length >= 8) return `···-****-${d.slice(-4)}`;
  if (d.length >= 4) return `···-${d.slice(-4)}`;
  return phone ? String(phone) : "";
}

function extractAttachmentPreviews(messages) {
  const out = [];
  for (const m of messages) {
    if (!m || m.type === "system") continue;
    const t = (m.text || "").trim();
    if (/^\[갤러리\]|^\[카메라\]/i.test(t)) {
      out.push({
        id: m.id,
        kind: "image",
        caption: t.replace(/^\[[^\]]+\]\s*/, "").slice(0, 28) || "이미지"
      });
    } else if (/^\[파일\]/i.test(t) || /\.(pdf|docx?|hwp|pptx?|xlsx?|zip)$/i.test(t)) {
      out.push({
        id: m.id,
        kind: "file",
        caption: t.replace(/^\[[^\]]+\]\s*/, "").slice(0, 28) || "문서"
      });
    }
  }
  return out.slice(-24);
}

function getDigitalCardByTier(membershipTier, peerCard) {
  const tier = membershipTier === "premium" ? "premium" : membershipTier === "standard" ? "standard" : "free";
  const badge = digitalCardBadgeText(tier);
  if (membershipTier === "premium") {
    return {
      badge,
      roleTop: peerCard?.title || "",
      roleName: peerCard?.name || "",
      caution: VLUE_CARD_CAUTION,
      actions: ["상세보기", "인증서보기"]
    };
  }
  if (membershipTier === "standard") {
    return {
      badge,
      roleTop: peerCard?.title || "",
      roleName: peerCard?.name || "",
      caution: VLUE_CARD_CAUTION,
      actions: []
    };
  }
  return {
    badge,
    roleTop: "",
    roleName: "",
    caution: VLUE_CARD_CAUTION,
    actions: []
  };
}

function VcidCard({ membershipTier, peerCard, vcidLetteringOn = true }) {
  const [flipped, setFlipped] = useState(false);
  const isPremium = membershipTier === "premium";
  const isStandard = membershipTier === "standard";

  // 등급별 카드 UI는 vcidLetteringOn 토글과 분리해서 항상 노출 (MVP 등급 송출 요구사항)
  if (membershipTier === "free") {
    return (
      <div className="mx-auto w-[292px] max-w-full">
        <GeneralLetteringCard />
      </div>
    );
  }

  const cardInfo = getDigitalCardByTier(membershipTier, peerCard);
  const orgLabel = peerCard?.organization || "VLUE";
  const roleLine = digitalCardRoleLine({
    title: cardInfo.roleTop,
    name: cardInfo.roleName,
    organization: orgLabel
  });
  const logoUrl = peerCard?.logoUrl || "";
  const backText = String(peerCard?.introBack || "프리미엄 인증 명함입니다.").trim();
  const backLines = [
    { icon: "✉", label: "e-mail", value: peerCard?.email || "" },
    { icon: "📍", label: "주소", value: peerCard?.address || "" },
    { icon: "☎", label: "대표번호", value: peerCard?.landline || "" },
    { icon: "📠", label: "팩스번호", value: peerCard?.fax || "" }
  ].filter((line) => line.value);
  const backNote = String(peerCard?.backNote || backText).trim();
  const BackIcon = ({ type }) => {
    const cls = "h-3.5 w-3.5 shrink-0 text-violet-200/90";
    if (type === "email") {
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.9">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M4 7l8 6 8-6" />
        </svg>
      );
    }
    if (type === "address") {
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.4" />
        </svg>
      );
    }
    if (type === "fax") {
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M7 8V4h10v4" />
          <rect x="5" y="8" width="14" height="10" rx="2" />
          <path d="M8 13h8M8 16h5" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 11.2 19a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.2 4.3 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1z" />
      </svg>
    );
  };
  const tone = {
    wrap: isPremium ? "border-violet-900/70 bg-[#0b1020]" : "border-blue-200/90",
    title: isPremium ? "text-slate-100" : "text-gray-900",
    sub: isPremium ? "text-violet-200" : "text-blue-600",
    badge: isPremium ? "text-violet-200" : "text-blue-700",
    note: isPremium ? "text-slate-300" : "text-gray-500"
  };

  const bgStyle = isPremium
    ? "from-[#0b1020] via-[#1e1b4b] via-[#312e81] to-[#111827]"
    : "from-[#e0efff] via-[#eaf4ff] to-[#d2e8fc]";

  return (
    <button
      type="button"
      onClick={() => {
        if (isPremium) setFlipped((v) => !v);
      }}
      className={`vcid-card relative mx-auto w-[292px] max-w-full overflow-hidden rounded-3xl border-2 p-2.5 text-center shadow-[0_12px_28px_rgba(37,99,235,0.13)] ${tone.wrap} h-[174px]`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${bgStyle}`} />
      {isPremium ? (
        <div className="relative z-20 h-[138px] card-flip-wrap">
          <div className={`card-flip-inner ${flipped ? "is-flipped" : ""}`}>
            <div className="card-face front flex flex-col justify-start pt-0.5 pb-0 text-center">
              <div className="mb-1 flex items-center justify-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="#c4b5fd">
                  <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                </svg>
                <span className="text-[9px] font-black tracking-widest text-violet-200">{cardInfo.badge}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-md border border-violet-300/60 bg-violet-950/30 text-[8px] font-black text-violet-100">
                  {logoUrl ? <img src={logoUrl} alt="logo" className="h-full w-full object-cover" /> : "LOGO"}
                </span>
                <h2 className="text-[18px] font-black tracking-tight text-slate-100">{orgLabel}</h2>
              </div>
              {roleLine ? <p className="mt-1.5 text-[13px] font-bold text-violet-100">{roleLine}</p> : null}
              {peerCard?.phone && <p className="mt-1 text-[11px] font-semibold text-slate-300">{peerCard.phone}</p>}
              <div className="mt-1.5 flex justify-center gap-2">
                {cardInfo.actions.map((action) => (
                  <span key={action} className="rounded-md border border-violet-300/80 bg-violet-950/25 px-2.5 py-0.5 text-[10px] font-bold text-violet-100">
                    {action}
                  </span>
                ))}
              </div>
              <p className="mt-0 text-[10px] leading-tight text-slate-400">{cardInfo.caution}</p>
            </div>
            <div className="card-face back flex flex-col justify-start pt-0.5 pb-0 text-center">
              <div className="mx-auto w-full max-w-[232px] text-left">
                {backLines.map((line) => (
                  <div key={line.label} className="flex items-start gap-1.5 text-[10px] leading-snug text-slate-300">
                    <BackIcon type={line.label === "e-mail" ? "email" : line.label === "주소" ? "address" : line.label === "팩스번호" ? "fax" : "phone"} />
                    <p>{line.label} : {line.value}</p>
                  </div>
                ))}
                {backNote && <p className="mt-1 text-[10px] leading-snug text-slate-300">{backNote}</p>}
              </div>
              <p className="mt-0 text-[10px] leading-tight text-slate-300">탭하면 앞면으로 돌아갑니다.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 z-20 flex flex-col justify-center text-center">
          <div className="relative z-10 px-0.5">
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#2563eb" aria-hidden>
                <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
              </svg>
              <span className={`text-[12px] font-bold ${tone.sub}`}>{cardInfo.badge}</span>
            </div>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg border border-blue-200/90 bg-white text-[8px] font-black text-blue-700 shadow-sm">
                {logoUrl ? <img src={logoUrl} alt="logo" className="h-full w-full object-cover" /> : "LOGO"}
              </span>
              <h2 className="text-[18px] font-black tracking-tight text-[#0f172a]">{orgLabel}</h2>
            </div>
            {roleLine ? <p className="mt-2 text-[13px] font-bold text-[#0f172a]">{roleLine}</p> : null}
            {peerCard?.phone ? <p className="mt-1 text-[12px] font-medium text-[#4b5563]">{peerCard.phone}</p> : null}
            <p className="mt-2.5 text-[10px] leading-snug text-[#6b7280]">{cardInfo.caution}</p>
          </div>
        </div>
      )}
      {isPremium ? (
        <div
          className="pointer-events-none absolute inset-0 z-[1] rounded-3xl bg-gradient-to-r from-transparent via-violet-300/35 via-cyan-300/25 via-fuchsia-300/25 to-transparent shimmer-bg"
          aria-hidden
        />
      ) : (
        <div
          className="pointer-events-none absolute inset-0 z-[1] rounded-3xl bg-gradient-to-r from-blue-100/30 via-sky-400/75 via-blue-500/72 via-blue-600/68 via-sky-300/70 to-blue-100/30 shimmer-bg"
          aria-hidden
        />
      )}
    </button>
  );
}

function IconPhone({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconMsg({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconSearch({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconUserPlus({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function IconCalendar({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconBell({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconPin({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-2a7 7 0 1 0-14 0v2z" />
      <circle cx="12" cy="7" r="2" />
    </svg>
  );
}

function IconFolder({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconShield({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconShieldOff({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" />
    </svg>
  );
}

function MenuRow({ icon: Icon, title, subtitle, onClick, danger, dim }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-start gap-3 rounded-2xl px-3 py-3 text-left transition active:scale-[0.99] ${
        danger ? "bg-red-50/90 hover:bg-red-100/90 border border-red-100" : "bg-gray-50/90 hover:bg-gray-100/80 border border-gray-100/80"
      } ${dim ? "opacity-60" : ""}`}
    >
      <span
        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          danger ? "bg-red-100 text-red-600" : "bg-white text-blue-600 shadow-sm border border-gray-100"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-bold leading-tight ${danger ? "text-red-700" : "text-gray-900"}`}>{title}</span>
        {subtitle && <span className="mt-0.5 block text-[12px] text-gray-500 leading-snug">{subtitle}</span>}
      </span>
      <svg className="mt-2 h-4 w-4 shrink-0 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}

function ChatRoom({
  roomId,
  roomName,
  messages,
  appendOutgoingMessage,
  onBack,
  membershipTier,
  digitalCardActive = true,
  myCard,
  myCardUserId = "me",
  myPhone = "",
  peerMembershipTier = "free",
  peerCard,
  peerLegalName = "",
  peerPhone,
  inviteCandidates,
  onCreateGroupRoom,
  isBlocked,
  onToggleBlock,
  walletCards = [],
  profileByRoomId = {},
  onSaveCardToWallet,
  onSaveToContacts,
  onRemoveCardFromWallet,
  isFavoriteRoom = false,
  onToggleFavoriteRoom,
  onOpenPeerFeed,
  /** VLUE 공식 알림처럼 채팅 UI만 쓰고 입력·통화는 막는 모드 */
  readOnlyBroadcast = false,
  isDarkMode = false,
  onOpenGroupCalendar,
  onCreateGroupCalendar,
  canManageGroupCalendar = false,
  onOpenCalendarFromNotice,
  /** SSE 수신 메시지를 상위 messagesByRoom에 병합 */
  onRealtimeChatMessage
}) {
  const LANG_OPTIONS = [
    { id: "en", label: "영어", badge: "EN" },
    { id: "ja", label: "일본어", badge: "JP" },
    { id: "zh", label: "중국어", badge: "ZH" },
    { id: "vi", label: "베트남어", badge: "VI" },
    { id: "th", label: "태국어", badge: "TH" }
  ];
  const [menuState, setMenuState] = useState({ open: false, anchor: null, message: null });
  const [profileMenu, setProfileMenu] = useState({ open: false, x: 0, y: 0 });
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePick, setInvitePick] = useState(() => new Set());
  const [inviteVmingOn, setInviteVmingOn] = useState(false);
  const [saveInviteVmingDefault, setSaveInviteVmingDefault] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callSec, setCallSec] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isAiLiveMode, setIsAiLiveMode] = useState(false);
  const [targetLang, setTargetLang] = useState("en");
  const [voiceInput, setVoiceInput] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveSubtitles, setLiveSubtitles] = useState([]);
  const [vmingConsent, setVmingConsent] = useState(null);
  const [vmingRequestOpen, setVmingRequestOpen] = useState(false);
  const [vmingRespondOpen, setVmingRespondOpen] = useState(false);
  const [vmingInfoOpen, setVmingInfoOpen] = useState(false);
  const [fraudAlert, setFraudAlert] = useState(null);
  const isPaid = ["premium", "standard"].includes(membershipTier);
  const isGroupRoom = /:grp-/.test(roomId || "");
  const groupMemberCount = isGroupRoom ? Math.max(3, (inviteCandidates?.length || 0) + 2) : 2;
  const peerOnline = useMemo(() => simulatePeerOnline(roomId), [roomId]);
  const isSubscribeRoom = (roomId || "").startsWith("subscribe:");
  const isVmingChatRoom = Boolean(roomId) && !readOnlyBroadcast && !String(roomId).startsWith("vlue:");
  // 서버에서 isActive를 활성 여부로 내려주므로, 아이콘 노출은 isActive 기준으로 단순화합니다.
  // (동의 카운트 계산이 일부 방/상태에서 누락되면 isVmingConsentSatisfied가 false가 될 수 있어 아이콘이 사라지는 문제를 방지)
  const vmingActive = useMemo(() => Boolean(vmingConsent?.isActive), [vmingConsent]);
  const hasJoinedNotice = useMemo(
    () => Array.isArray(messages) && messages.some((m) => m?.type === "system" && m?.vmingEvent === VMING_EVENTS.JOINED),
    [messages]
  );
  // 데모/요청 반영: "엄마" 채팅방은 동의 완료 상태로 가정해 아이콘을 항상 보이게 함
  const isMomDemoRoom = roomId === "family:mom";
  const vmingHeaderActive = useMemo(
    () => vmingActive || hasJoinedNotice || isMomDemoRoom,
    [vmingActive, hasJoinedNotice, isMomDemoRoom]
  );
  const vmingJoinedPostedRef = useRef(false);
  const vmingPeerNoticePostedRef = useRef(false);
  const effectiveMyUserId = useMemo(() => {
    try {
      return localStorage.getItem("vlue_server_user_id") || myCardUserId;
    } catch {
      return myCardUserId;
    }
  }, [myCardUserId]);

  const postVmingNotice = useCallback(
    (payload) => {
      appendOutgoingMessage?.(roomId, payload);
      requestAnimationFrame(() => messageListRef.current?.scrollToBottom?.("smooth"));
    },
    [appendOutgoingMessage, roomId]
  );

  const maybePostJoinNotice = useCallback(
    (status) => {
      if (!status || vmingJoinedPostedRef.current) return;
      if (!isVmingConsentSatisfied(status)) return;
      vmingJoinedPostedRef.current = true;
      postVmingNotice(buildVmingJoinedMessage());
    },
    [postVmingNotice]
  );

  const handleConsentStatusUpdate = useCallback(
    (status, { notifyPeer = false } = {}) => {
      if (!status?.members?.length) return;
      setVmingConsent(status);

      const amRequester = isConsentRequester({
        myUserId: effectiveMyUserId,
        myName: myCard?.name,
        requestedBy: status.requestedBy,
        requesterName: status.requesterName
      });

      if (notifyPeer && status.isActive && !amRequester && !vmingPeerNoticePostedRef.current) {
        vmingPeerNoticePostedRef.current = true;
        postVmingNotice(
          buildVmingConsentRequestMessage({
            requesterName: status.requesterName || roomName,
            requesterUserId: status.requestedBy,
            acceptedCount: status.acceptedCount ?? 0,
            requiredCount: status.requiredCount ?? 1,
            forRequester: false
          })
        );
      }

      maybePostJoinNotice(status);
      if (!status.isActive) {
        vmingJoinedPostedRef.current = false;
        vmingPeerNoticePostedRef.current = false;
      }
    },
    [maybePostJoinNotice, postVmingNotice, effectiveMyUserId, myCard?.name, roomName]
  );

  const refreshVmingConsent = useCallback(
    (opts = {}) => {
      if (!isVmingChatRoom) return;
      fetchVmingConsentStatus(roomId)
        .then((status) => {
          if (status?.members?.length) handleConsentStatusUpdate(status, opts);
          else setVmingConsent(status);
        })
        .catch(() => setVmingConsent(null));
    },
    [roomId, isVmingChatRoom, handleConsentStatusUpdate]
  );

  const runVmingConsentRequest = useCallback(
    async (cfg, memberListOverride) => {
      const requesterName = myCard?.name || "방장";
      let requesterId = effectiveMyUserId;
      try {
        requesterId = localStorage.getItem("vlue_server_user_id") || effectiveMyUserId;
      } catch {
        /* ignore */
      }
      const requiredCount = votersRequiredCount({ isGroupRoom, groupMemberCount });
      vmingJoinedPostedRef.current = false;
      postVmingNotice(
        buildVmingConsentRequestMessage({
          requesterName,
          requesterUserId: requesterId,
          acceptedCount: 0,
          requiredCount,
          forRequester: true
        })
      );
      const uuidRe =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      let memberList = memberListOverride;
      if (!memberList?.length) {
        const peerId = String(roomId.split(":")[1] || "").trim();
        memberList = [{ userId: requesterId, userName: requesterName }];
        if (uuidRe.test(peerId)) {
          memberList.push({ userId: peerId, userName: roomName });
        } else if (isGroupRoom && inviteCandidates?.length) {
          for (const c of inviteCandidates) {
            if (c.userId && uuidRe.test(c.userId)) {
              memberList.push({ userId: c.userId, userName: c.name || c.userName || "멤버" });
            }
          }
        }
      }
      try {
        await requestVmingConsent({
          roomId,
          consentMode: cfg.consentMode || "all",
          validityDays: cfg.validityDays ?? 90,
          sessionOnly: Boolean(cfg.sessionOnly),
          requesterName,
          members: memberList
        });
      } catch {
        /* API 미연결 시에도 채팅 알림은 유지 */
      }
      refreshVmingConsent({ notifyPeer: true });
    },
    [
      effectiveMyUserId,
      groupMemberCount,
      inviteCandidates,
      isGroupRoom,
      myCard?.name,
      postVmingNotice,
      refreshVmingConsent,
      roomId,
      roomName
    ]
  );

  const autoVmingRequestedRef = useRef(false);

  useEffect(() => {
    if (!isVmingChatRoom || !roomId || autoVmingRequestedRef.current) return;
    const pending = consumeAutoRequestVming(roomId);
    if (!pending) return;
    autoVmingRequestedRef.current = true;
    runVmingConsentRequest(pending.config, pending.members);
  }, [isVmingChatRoom, roomId, runVmingConsentRequest]);

  useEffect(() => {
    autoVmingRequestedRef.current = false;
  }, [roomId]);

  useEffect(() => {
    if (inviteOpen) {
      setInviteVmingOn(readGroupCreateVmingDefault());
      setSaveInviteVmingDefault(false);
    }
  }, [inviteOpen]);

  useEffect(() => {
    refreshVmingConsent({ notifyPeer: true });
  }, [refreshVmingConsent]);

  useEffect(() => {
    if (!onRealtimeChatMessage) return undefined;
    return subscribeVlueSseAppEvents((data) => {
      if (data?.type !== VLUE_SSE_CHAT_MESSAGE) return;
      const peerUserId = String(data.peerUserId || "");
      if (!peerUserId || roomId !== `friends:${peerUserId}`) return;
      onRealtimeChatMessage(data.message, { serverRoomId: data.serverRoomId, peerUserId });
    });
  }, [roomId, onRealtimeChatMessage]);

  useEffect(() => {
    const onConsent = (ev) => {
      if (ev.detail?.roomId && ev.detail.roomId !== roomId) return;
      const status = ev.detail?.members ? ev.detail : null;
      if (status?.members?.length) {
        handleConsentStatusUpdate(status, { notifyPeer: true });
      } else {
        refreshVmingConsent({ notifyPeer: true });
      }
      const myIds = resolveMyIdentityIds(effectiveMyUserId);
      const pending = (status?.members || ev.detail?.members)?.find(
        (m) => myIds.some((id) => isSameVlueUser(id, m.userId)) && m.consentStatus === "pending"
      );
      if (pending) setVmingRespondOpen(true);
    };
    const onFraud = (ev) => {
      if (ev.detail?.roomId !== roomId) return;
      setFraudAlert(ev.detail);
      if (ev.detail?.risk_level === "high" || ev.detail?.risk_level === "critical") {
        try {
          navigator.vibrate?.([120, 60, 120]);
        } catch {
          /* ignore */
        }
      }
    };
    const onUpgrade = (ev) => {
      if (ev.detail?.roomId && ev.detail.roomId !== roomId) return;
      setVmingInfoOpen(true);
      if (ev.detail?.message) {
        setFavoriteNotice(ev.detail.message);
        setTimeout(() => setFavoriteNotice(""), 2200);
      }
    };
    window.addEventListener("vlue-vming-consent-update", onConsent);
    window.addEventListener("vlue-fraud-alert", onFraud);
    window.addEventListener("vlue-open-vming-upgrade", onUpgrade);
    return () => {
      window.removeEventListener("vlue-vming-consent-update", onConsent);
      window.removeEventListener("vlue-fraud-alert", onFraud);
      window.removeEventListener("vlue-open-vming-upgrade", onUpgrade);
    };
  }, [roomId, effectiveMyUserId, refreshVmingConsent, handleConsentStatusUpdate]);

  const myConsentPending = vmingConsent?.members?.find(
    (m) =>
      resolveMyIdentityIds(effectiveMyUserId).some((id) => isSameVlueUser(id, m.userId)) &&
      m.consentStatus === "pending"
  );
  const phoneDigits = digitsOnly(peerPhone);
  const messageListRef = useRef(null);
  const subtitleListRef = useRef(null);
  const speechRef = useRef(null);
  const attachmentPreviews = useMemo(() => extractAttachmentPreviews(messages), [messages]);
  const peerVerifiedLegal = String(peerLegalName || peerCard?.legalName || "").trim();
  const [businessClosedNoticeAt, setBusinessClosedNoticeAt] = useState(0);
  const [consultClosed, setConsultClosed] = useState(false);
  const [favoriteNotice, setFavoriteNotice] = useState("");
  const readMyVcidLettering = useCallback(() => {
    try {
      return localStorage.getItem("vcid") === "true";
    } catch {
      return false;
    }
  }, []);
  const [myVcidLettering, setMyVcidLettering] = useState(readMyVcidLettering);
  useEffect(() => {
    const sync = () => setMyVcidLettering(readMyVcidLettering());
    window.addEventListener("vlue-vcid-changed", sync);
    return () => window.removeEventListener("vlue-vcid-changed", sync);
  }, [readMyVcidLettering]);

  useEffect(() => {
    const closeMenu = () => {
      setMenuState((s) => ({ ...s, open: false }));
      setProfileMenu((s) => ({ ...s, open: false }));
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const prevIsCallingRef = useRef(false);
  useEffect(() => {
    if (isCalling && !prevIsCallingRef.current) {
      setCallSec(0);
      setIsMuted(false);
      setIsSpeakerOn(false);
    }
    prevIsCallingRef.current = isCalling;
  }, [isCalling]);

  useEffect(() => {
    if (!isCalling) return;
    const t = setInterval(() => setCallSec((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [isCalling]);

  useEffect(() => {
    if (!messageListRef.current) return;
    messageListRef.current.scrollToBottom("auto");
    const rafId = requestAnimationFrame(() => {
      messageListRef.current?.scrollToBottom("smooth");
      setTimeout(() => messageListRef.current?.scrollToBottom("smooth"), 20);
    });
    return () => cancelAnimationFrame(rafId);
  }, [messages, roomId]);

  useEffect(() => {
    const el = subtitleListRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight + 9999;
  }, [liveSubtitles, isTranslating, isListening]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.trim().toLowerCase();
    return messages.filter((m) => (m.text || "").toLowerCase().includes(q));
  }, [messages, searchQuery]);

  const mm = String(Math.floor(callSec / 60)).padStart(2, "0");
  const ss = String(callSec % 60).padStart(2, "0");

  const simulateTranslate = useCallback((src, lang) => {
    const compact = String(src || "").trim();
    if (!compact) return "";
    const phraseMap = [
      { ko: "안녕하세요", en: "Hello", ja: "こんにちは", zh: "你好", vi: "Xin chao", th: "Sawasdee" },
      { ko: "어디서 봤는데", en: "I think I saw it somewhere.", ja: "どこかで見た気がします。", zh: "我好像在哪里见过。", vi: "Toi nghi toi da thay o dau do.", th: "ฉันเหมือนเคยเห็นที่ไหนสักแห่ง" },
      { ko: "내가 언제 그랬어", en: "When did I do that?", ja: "私がいつそうしたの？", zh: "我什么时候那样做了？", vi: "Khi nao toi da lam vay?", th: "ฉันทำแบบนั้นเมื่อไหร่?" }
    ];
    const selected = LANG_OPTIONS.find((x) => x.id === lang) || LANG_OPTIONS[0];
    const hit = phraseMap.find((p) => compact.includes(p.ko));
    const translated = hit?.[lang] || `[${selected.label} 번역] ${compact}`;
    return `${selected.badge}) ${translated}`;
  }, []);

  const processVoiceText = useCallback((text) => {
    if (!text || isTranslating) return;
    const stamp = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    setLiveSubtitles((prev) => [...prev, { id: `me-${Date.now()}`, speaker: "나", text, stamp }]);
    setIsTranslating(true);
    const translated = simulateTranslate(text, targetLang);
    setTimeout(() => {
      const aiStamp = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      setLiveSubtitles((prev) => [...prev, { id: `ai-${Date.now()}`, speaker: "AI 통역", text: translated, stamp: aiStamp }]);
      setIsTranslating(false);
    }, 900);
  }, [isTranslating, simulateTranslate, targetLang]);

  const submitVoiceSimulation = useCallback(() => {
    const text = voiceInput.trim();
    if (!text) return;
    setVoiceInput("");
    processVoiceText(text);
  }, [processVoiceText, voiceInput]);

  const runVoiceToText = useCallback(() => {
    if (isListening || isTranslating) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setLiveSubtitles((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          speaker: "시스템",
          text: "이 기기에서는 음성 인식을 지원하지 않아 텍스트 입력으로 통역해 주세요.",
          stamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
      return;
    }
    try {
      const rec = new SR();
      speechRef.current = rec;
      rec.lang = "ko-KR";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);
      rec.onresult = (e) => {
        const text = e.results?.[0]?.[0]?.transcript?.trim() || "";
        if (text) processVoiceText(text);
      };
      rec.start();
    } catch {
      setIsListening(false);
    }
  }, [isListening, isTranslating, processVoiceText]);

  const endVoiceCall = useCallback(() => {
    const durationMin = String(Math.floor(callSec / 60)).padStart(2, "0");
    const durationSec = String(callSec % 60).padStart(2, "0");
    const durationText = `${durationMin}:${durationSec}`;
    appendOutgoingMessage?.(roomId, {
      type: "system",
      text: `보안통화 통화 종료 · ${roomName} · ${durationText}`,
      disableAutoReply: true
    });
    if (liveSubtitles.length > 0) {
      const transcript = liveSubtitles.map((line) => `[${line.stamp}] ${line.speaker}: ${line.text}`).join("\n");
      appendOutgoingMessage?.(roomId, {
        type: "system",
        text: `[통화 기록]\n${transcript}`,
        disableAutoReply: true
      });
    }
    setIsCalling(false);
    setCallSec(0);
    setIsMuted(false);
    setIsSpeakerOn(false);
    setIsAiLiveMode(false);
    setTargetLang("en");
    setVoiceInput("");
    setIsListening(false);
    setIsTranslating(false);
    setLiveSubtitles([]);
  }, [appendOutgoingMessage, callSec, liveSubtitles, roomId, roomName]);

  const openChatMenu = (e, message) => {
    e.preventDefault?.();
    e.stopPropagation?.();
    const x = e.clientX ?? 120;
    const y = e.clientY ?? 120;
    setMenuState({ open: true, anchor: { x, y }, message });
  };

  const openProfileMenu = (e) => {
    e.preventDefault?.();
    e.stopPropagation?.();
    setProfileMenu({ open: true, x: e.clientX || 120, y: e.clientY || 120 });
  };

  const handleMenuAction = (action, message) => {
    const text = String(message?.text || "").trim();
    setMenuState({ open: false, anchor: null, message: null });
    if (action === "reply") {
      setReplyTo({ id: message?.id, preview: text.slice(0, 80) || "(미디어)" });
      return;
    }
    if (action === "copy") {
      navigator.clipboard?.writeText(text);
      setFavoriteNotice("메시지가 복사되었습니다.");
      setTimeout(() => setFavoriteNotice(""), 1200);
      return;
    }
    if (action === "forward") {
      setFavoriteNotice("전달 대상 선택은 다음 업데이트에서 연결됩니다.");
      setTimeout(() => setFavoriteNotice(""), 1800);
      return;
    }
    if (action === "delete") {
      setFavoriteNotice("삭제 기능은 보관함 정책 확정 후 활성화됩니다.");
      setTimeout(() => setFavoriteNotice(""), 1800);
      return;
    }
    if (action === "favorite") {
      setFavoriteNotice("메시지를 즐겨찾기에 추가했습니다.");
      setTimeout(() => setFavoriteNotice(""), 1400);
      return;
    }
    if (action === "more") {
      setFavoriteNotice("블루AI 분석·번역은 VLUE Voice·블루AI에서 이용할 수 있습니다.");
      setTimeout(() => setFavoriteNotice(""), 2200);
      return;
    }
    if (action === "analysis") {
      setFavoriteNotice("블루AI 분석 요약이 준비되었습니다.");
      setTimeout(() => setFavoriteNotice(""), 1400);
    }
    if (action === "translate") {
      setFavoriteNotice("번역은 VLUE Voice 다국어 통화에서 바로 사용할 수 있습니다.");
      setTimeout(() => setFavoriteNotice(""), 2000);
    }
  };

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery("");
  }, []);

  const onTapPhoneCall = () => {
    if (isGroupRoom || !phoneDigits) return;
    window.location.href = `tel:${phoneDigits}`;
  };

  const onStartVlueVoiceFromModal = useCallback(() => {
    if (isGroupRoom || !phoneDigits) return;
    setShowPhoneModal(false);
    setIsAiLiveMode(false);
    setLiveSubtitles([]);
    setVoiceInput("");
    setIsListening(false);
    setIsTranslating(false);
    setIsCalling(true);
  }, [isGroupRoom, phoneDigits]);

  const onTapSms = () => {
    if (isGroupRoom || !phoneDigits) return;
    window.location.href = `sms:${phoneDigits}`;
  };

  const toggleInvite = (key) => {
    setInvitePick((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const confirmInvite = () => {
    const chosen = inviteCandidates.filter((c) => invitePick.has(c.roomKey));
    if (!chosen.length) {
      setFavoriteNotice("초대할 상대를 선택해 주세요.");
      setTimeout(() => setFavoriteNotice(""), 1300);
      return;
    }
    if (saveInviteVmingDefault) setGroupCreateVmingDefault(inviteVmingOn);
    onCreateGroupRoom?.(roomId, chosen, { vmingOnCreate: inviteVmingOn });
    setInviteOpen(false);
    setInvitePick(new Set());
    setIsDrawerOpen(false);
    setFavoriteNotice(
      inviteVmingOn
        ? "단체 방이 열렸습니다. 브이밍 AI 동의를 요청합니다."
        : "새 단체 채팅방이 생성되었습니다. 목록에서 확인해 주세요."
    );
    setTimeout(() => setFavoriteNotice(""), 1600);
  };

  const sendSubscribeMessage = useCallback(
    (payload) => {
      appendOutgoingMessage(roomId, payload);
      if (!isSubscribeRoom || consultClosed) return;
      const hour = new Date().getHours();
      const isBusinessHour = hour >= 9 && hour < 18;
      if (isBusinessHour) return;
      const now = Date.now();
      if (now - businessClosedNoticeAt < 90_000) return;
      setBusinessClosedNoticeAt(now);
      setTimeout(() => {
        appendOutgoingMessage(roomId, {
          type: "system",
          text: "영업시간 외 자동응답: 현재 상담 운영시간이 아닙니다. 남겨주신 문의는 영업시간(09:00~18:00)에 순차 답변드립니다.",
          disableAutoReply: true
        });
      }, 350);
    },
    [appendOutgoingMessage, roomId, isSubscribeRoom, consultClosed, businessClosedNoticeAt]
  );

  const handleOutgoing = useCallback(
    async (payload) => {
      const rawText = typeof payload === "string" ? payload : payload?.text || "";
      const commandBody = String(rawText || "").replace(/^\/브이밍\s+/i, "").trim();
      const isHiddenCommand = /^\/브이밍\s+/i.test(String(rawText || ""));
      if (isHiddenCommand) {
        try {
          const r = await postVmingChat({
            message: `/브이밍 ${commandBody}`,
            roomId,
            hiddenCommand: true
          });
          if (r?.shareTemplate) {
            const intentType = String(r?.intent?.intent_type || "general_chat");
            const riskLevel = String(r?.intent?.risk_level || "low");
            const isSecurityGuard = intentType === "generate_evidence" || riskLevel === "high" || riskLevel === "critical";
            appendOutgoingMessage(roomId, {
              type: "system",
              text: r.shareTemplate,
              disableAutoReply: true,
              intent_type: intentType,
              risk_level: riskLevel,
              securityGuard: isSecurityGuard,
              securityVaultPath: "/mypage?tab=security-vault"
            });
          }
          setFavoriteNotice("브이밍 명령을 안전하게 처리했습니다.");
          setTimeout(() => setFavoriteNotice(""), 1500);
        } catch (e) {
          const status = e?.status;
          if (status === 429) {
            setVmingInfoOpen(true);
            setFavoriteNotice("오늘 제공된 호출 사용 횟수를 모두 소모하셨어요. 무제한 패키지를 이용해 보세요.");
          } else {
            setFavoriteNotice("브이밍 명령 처리에 실패했습니다.");
          }
          setTimeout(() => setFavoriteNotice(""), 2200);
        }
        setReplyTo(null);
        return;
      }

      if (!replyTo) {
        sendSubscribeMessage(payload);
        return;
      }
      const quote = `↩ ${replyTo.preview}`;
      if (typeof payload === "string") {
        sendSubscribeMessage(`${quote}\n${payload}`);
      } else {
        sendSubscribeMessage({
          ...payload,
          text: `${quote}\n${payload?.text || ""}`,
          replyToId: replyTo.id
        });
      }
      setReplyTo(null);
    },
    [replyTo, sendSubscribeMessage, roomId, appendOutgoingMessage]
  );

  const sendFaqQuestion = (question) => {
    sendSubscribeMessage(question);
    setTimeout(() => {
      const answer =
        question === "운영시간이 어떻게 되나요?"
          ? "운영시간은 평일 09:00~18:00이며, 주말/공휴일 문의는 다음 영업일에 답변됩니다."
          : question === "예약/상담 신청은 어떻게 하나요?"
          ? "채팅으로 원하시는 날짜/시간을 남겨주시면 상담팀이 확인 후 바로 안내드립니다."
          : "현재 진행 중인 이벤트는 홈 > 구독 > 추천 탭에서 카드뉴스로 확인하실 수 있습니다.";
      appendOutgoingMessage(roomId, {
        type: "system",
        text: `FAQ 답변: ${answer}`,
        disableAutoReply: true
      });
    }, 300);
  };

  return (
    <section className="flex flex-col flex-1 min-h-0 h-full bg-[linear-gradient(180deg,#f4f8ff_0%,#f8fbff_48%,#fafdff_100%)] relative overflow-hidden">
      <div
        className={`relative flex min-h-[52px] shrink-0 items-center gap-1 border-b border-gray-100 bg-white/80 px-2 pb-2 backdrop-blur-md sticky top-0 z-[110] ${
          readOnlyBroadcast ? "pt-[max(12px,env(safe-area-inset-top,0px))]" : "pt-[max(8px,env(safe-area-inset-top,0px))] py-2"
        }`}
      >
        {isVmingChatRoom && vmingHeaderActive ? (
          <VmingHeaderIconButton
            onClick={() => setVmingInfoOpen(true)}
            className="absolute right-4 top-[calc(max(8px,env(safe-area-inset-top,0px))+66px)] z-[120]"
          />
        ) : null}
        <BackButton variant="inline" onBack={onBack} />
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <div className={`relative min-w-0 flex-1 ${readOnlyBroadcast ? "min-h-[44px]" : "min-h-[52px]"}`}>
            <div
              className={`absolute inset-0 flex transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${
                readOnlyBroadcast ? "items-center" : "items-start"
              } ${isSearchOpen ? "pointer-events-none opacity-0 -translate-x-2" : "pointer-events-auto opacity-100 translate-x-0"}`}
            >
              {readOnlyBroadcast ? (
                <div className="flex min-w-0 flex-1 items-center text-left">
                  <VlueOfficialChannelAvatar variant="header" />
                  <span className="min-w-0 truncate text-[clamp(14px,4vw,16px)] font-bold text-gray-900">{roomName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleFavoriteRoom?.();
                      const next = !isFavoriteRoom;
                      setFavoriteNotice(next ? "즐겨찾기로 설정되었습니다." : "즐겨찾기가 해제되었습니다.");
                      setTimeout(() => setFavoriteNotice(""), 1200);
                    }}
                    className={`ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${isFavoriteRoom ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300 bg-white text-gray-400"}`}
                    aria-label="즐겨찾기 토글"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill={isFavoriteRoom ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3.8l2.1 4.3 4.8.7-3.4 3.3.8 4.7-4.3-2.2-4.3 2.2.8-4.7L5.1 8.8l4.8-.7L12 3.8z" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(true)}
                  className="flex min-w-0 flex-1 cursor-pointer flex-col text-left"
                >
                  <div className="flex min-w-0 items-center">
                    <span className="mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[13px] font-bold text-white shadow-sm ring-2 ring-white">
                      {roomName.slice(0, 1)}
                    </span>
                    <span className="truncate text-[clamp(14px,4vw,16px)] font-bold text-gray-900">{roomName}</span>
                    <span
                      className={`ml-1.5 h-2 w-2 shrink-0 rounded-full ${peerOnline ? "bg-emerald-500" : "bg-gray-300"}`}
                      title={peerOnline ? "온라인" : "오프라인"}
                      aria-hidden
                    />
                    {peerMembershipTier === "premium" && (
                      <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white text-[9px] font-black leading-none" title="프리미엄">
                        V
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavoriteRoom?.();
                        const next = !isFavoriteRoom;
                        setFavoriteNotice(next ? "즐겨찾기로 설정되었습니다." : "즐겨찾기가 해제되었습니다.");
                        setTimeout(() => setFavoriteNotice(""), 1200);
                      }}
                      className={`ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full border transition ${isFavoriteRoom ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300 bg-white text-gray-400"}`}
                      aria-label="즐겨찾기 토글"
                    >
                      <svg viewBox="0 0 24 24" width="13" height="13" fill={isFavoriteRoom ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3.8l2.1 4.3 4.8.7-3.4 3.3.8 4.7-4.3-2.2-4.3 2.2.8-4.7L5.1 8.8l4.8-.7L12 3.8z" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-0.5 whitespace-nowrap pl-11 text-[10px] font-medium">
                    <span className={peerOnline ? "text-emerald-600" : "text-gray-400"}>
                      {peerOnline ? "온라인" : "오프라인"}
                    </span>
                    <span className="text-gray-300"> · </span>
                    <span className="text-gray-400">통신 내용 보호중</span>
                  </div>
                </button>
              )}
            </div>
            <div
              className={`absolute inset-0 flex items-center pl-1 transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${
                isSearchOpen ? "pointer-events-auto opacity-100 translate-x-0" : "pointer-events-none opacity-0 translate-x-5"
              }`}
            >
              <input
                autoFocus={isSearchOpen}
                id="chat-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="대화 내용 검색"
                className="w-full min-w-0 rounded-full border border-gray-200/90 bg-white py-2.5 pl-4 pr-3 text-[clamp(12px,3.2vw,14px)] shadow-[0_2px_12px_rgba(15,23,42,0.06)] outline-none transition-[box-shadow,border-color] duration-300 focus:border-blue-200 focus:shadow-[0_2px_16px_rgba(37,99,235,0.12)]"
              />
            </div>
          </div>
        </div>

        {!isSearchOpen ? (
          <div className="flex shrink-0 items-center gap-2 pl-2 text-gray-500">
            <button
              type="button"
              disabled={readOnlyBroadcast || isGroupRoom || !phoneDigits}
              title={readOnlyBroadcast ? "공식 알림에서는 통화를 사용할 수 없습니다" : isGroupRoom || !phoneDigits ? "보안통화(번호 없음)" : "보안통화"}
              onClick={() => setIsCalling(true)}
              className={`active:scale-90 transition ${readOnlyBroadcast || isGroupRoom || !phoneDigits ? "cursor-not-allowed opacity-35" : ""}`}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.3 19.3 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.2 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 3a2 2 0 0 1-.4 2l-1.2 1.2a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.4c1 .3 2 .5 3 .6A2 2 0 0 1 22 16.9z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setSettingsSheetOpen(true)}
              title="채팅방 설정"
              className="text-gray-700 active:scale-90 transition"
              aria-label="더보기"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="19" cy="12" r="1.8" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={closeSearch}
            className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-bold text-blue-600 active:scale-95"
          >
            닫기
          </button>
        )}
      </div>

      {!readOnlyBroadcast ? (
        <ChatRoomNoticeBanner
          roomId={roomId}
          myUserId={myCardUserId}
          isDarkMode={isDarkMode}
          onOpenEvent={onOpenCalendarFromNotice}
        />
      ) : null}

      {!readOnlyBroadcast && isVmingChatRoom ? (
        <FraudAlertBanner alert={fraudAlert} onDismiss={() => setFraudAlert(null)} isDarkMode={isDarkMode} />
      ) : null}

      <MessageList
        ref={messageListRef}
        roomId={roomId}
        messages={filteredMessages}
        roomName={roomName}
        onOpenMenu={openChatMenu}
        onOpenProfileMenu={openProfileMenu}
        myMembershipTier={membershipTier}
        myCardUserId={effectiveMyUserId}
        cardOrganization={myCard?.organization || "VLUE"}
        cardTitle={myCard?.title || ""}
        cardName={myCard?.name || ""}
        cardPhone={myPhone}
        cardIntroBack={myCard?.introBack || ""}
        walletCards={walletCards}
        profileByRoomId={profileByRoomId}
        onSaveCardToWallet={onSaveCardToWallet}
        onSaveToContacts={onSaveToContacts}
        isDarkMode={isDarkMode}
        isGroupRoom={isGroupRoom}
        groupMemberCount={groupMemberCount}
        onOpenCalendarNotice={onOpenCalendarFromNotice}
        vmingConsentStatus={vmingConsent}
        myName={myCard?.name || ""}
        onVmingAcceptConsent={async () => {
          try {
            await respondVmingConsent({ roomId, status: "accepted" });
          } catch {
            /* ignore */
          }
          refreshVmingConsent();
        }}
        onVmingDeclineConsent={async () => {
          try {
            await respondVmingConsent({ roomId, status: "declined" });
          } catch {
            /* ignore */
          }
          postVmingNotice(buildVmingDeclinedMessage({ userName: myCard?.name }));
          refreshVmingConsent();
        }}
        onVmingOpenConsentModal={() => setVmingRespondOpen(true)}
      />
      {isSubscribeRoom && !readOnlyBroadcast && (
        <div className="shrink-0 border-t border-blue-100 bg-blue-50/65 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setConsultClosed(true);
                appendOutgoingMessage(roomId, {
                  type: "system",
                  text: "상담이 종료되었습니다. 새 문의는 다음 상담 시작 시 자동 접수됩니다.",
                  disableAutoReply: true
                });
              }}
              className="rounded-full border border-red-200 bg-white px-3 py-1 text-[11px] font-bold text-red-600"
            >
              상담 종료
            </button>
            <span className="text-[11px] font-medium text-blue-700">영업시간 외 자동응답 활성화</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => sendFaqQuestion("운영시간이 어떻게 되나요?")} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 ring-1 ring-gray-200">
              운영시간 FAQ
            </button>
            <button type="button" onClick={() => sendFaqQuestion("예약/상담 신청은 어떻게 하나요?")} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 ring-1 ring-gray-200">
              예약 FAQ
            </button>
            <button type="button" onClick={() => sendFaqQuestion("이벤트 혜택은 어디서 보나요?")} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 ring-1 ring-gray-200">
              이벤트 FAQ
            </button>
          </div>
        </div>
      )}
      {readOnlyBroadcast ? (
        <div className="shrink-0 border-t border-slate-200/90 bg-white/95 px-3 py-3 text-center text-[12px] leading-snug text-slate-500">
          공지 전용 채널입니다. 메시지는 VLUE에서 보낸 내용만 표시됩니다.
        </div>
      ) : (
        <>
          {replyTo ? (
            <div
              className={`flex shrink-0 items-center gap-2 border-t px-3 py-2 text-[12px] ${
                isDarkMode ? "border-white/10 bg-[#111827] text-gray-300" : "border-blue-100 bg-blue-50/80 text-blue-800"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">답장: {replyTo.preview}</span>
              <button type="button" onClick={() => setReplyTo(null)} className="shrink-0 font-bold text-gray-500">
                ✕
              </button>
            </div>
          ) : null}
        <ChatInput
          membershipTier={membershipTier}
          digitalCardActive={digitalCardActive}
          walletCards={walletCards}
          profileByRoomId={profileByRoomId}
          myCard={myCard}
          myCardUserId={myCardUserId}
          onSaveCardToWallet={onSaveCardToWallet}
          onRemoveCardFromWallet={onRemoveCardFromWallet}
          onSaveToContacts={onSaveToContacts}
          isDarkMode={isDarkMode}
          onSend={handleOutgoing}
        />
        </>
      )}

      <WeChatMessageContextMenu
        open={menuState.open}
        anchor={menuState.anchor}
        message={menuState.message}
        isDarkMode={isDarkMode}
        onClose={() => setMenuState({ open: false, anchor: null, message: null })}
        onAction={handleMenuAction}
      />

      <ChatRoomSettingsSheet
        open={settingsSheetOpen}
        onClose={() => setSettingsSheetOpen(false)}
        roomId={roomId}
        roomName={roomName}
        isDarkMode={isDarkMode}
        isFavoriteRoom={isFavoriteRoom}
        onToggleFavorite={() => {
          onToggleFavoriteRoom?.();
          const next = !isFavoriteRoom;
          setFavoriteNotice(next ? "즐겨찾기로 설정되었습니다." : "즐겨찾기가 해제되었습니다.");
          setTimeout(() => setFavoriteNotice(""), 1200);
        }}
        onOpenProfile={() => onOpenPeerFeed?.()}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onLeave={onBack}
        onToast={(msg) => {
          setFavoriteNotice(msg);
          setTimeout(() => setFavoriteNotice(""), 2000);
        }}
        onOpenGroupCalendar={onOpenGroupCalendar}
        onCreateGroupCalendar={onCreateGroupCalendar}
        canManageGroupCalendar={canManageGroupCalendar}
        onOpenVmingConsent={isVmingChatRoom ? () => setVmingRequestOpen(true) : undefined}
      />

      {false && menuState.open && (
        <div
          className="fixed z-[9999] min-w-[140px] rounded-lg border border-gray-200 bg-white py-2 shadow-xl"
          style={{ top: menuState.anchor?.y ?? 0, left: menuState.anchor?.x ?? 0 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button type="button" onClick={() => handleMenuAction("analysis")} className="w-full px-4 py-2 text-left text-[14px] font-bold text-blue-600 hover:bg-blue-50">
            블로AI(분석)
          </button>
          <div className="my-1 h-px bg-gray-100" />
          <button type="button" onClick={() => handleMenuAction("copy")} className="w-full px-4 py-2 text-left text-[14px] text-gray-700 hover:bg-gray-100">
            복사하기
          </button>
          <button type="button" onClick={() => handleMenuAction("delete")} className="w-full px-4 py-2 text-left text-[14px] text-red-500 hover:bg-red-50">
            삭제하기
          </button>
          <button type="button" onClick={() => handleMenuAction("translate")} className="w-full px-4 py-2 text-left text-[14px] text-gray-700 hover:bg-gray-100">
            번역하기
          </button>
        </div>
      )}

      {profileMenu.open && (
        <div
          className="fixed z-[100002] w-40 overflow-hidden rounded-2xl border border-gray-100 bg-white py-2 shadow-2xl"
          style={{ top: profileMenu.y, left: profileMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="mb-1 border-b border-gray-50 px-3 py-2">
            <span className="text-[11px] font-bold text-blue-600">{roomName}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setProfileMenu((s) => ({ ...s, open: false }));
              onOpenPeerFeed?.();
            }}
            className="w-full px-4 py-2 text-left text-[13px] text-gray-700 active:bg-blue-50"
          >
            활동
          </button>
        </div>
      )}

      {showPhoneModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-6 backdrop-blur-sm" onMouseDown={() => setShowPhoneModal(false)}>
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ModalCloseButton variant="onDark" onClick={() => setShowPhoneModal(false)} />
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-6 pb-10 pt-8 text-center text-white">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 text-2xl font-black shadow-lg ring-2 ring-white/30">
                {roomName.slice(0, 1)}
              </div>
              <h4 className="mt-4 text-lg font-black tracking-tight">{roomName}</h4>
              <p className="mt-1 font-mono text-[15px] font-semibold text-blue-100">
                {isGroupRoom ? "단체 채팅 · 개별 번호 없음" : peerPhone || "번호 없음"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 pb-6 pt-4">
              <div className="col-span-2 flex justify-center">
                <VcidCard membershipTier={peerMembershipTier} peerCard={peerCard} vcidLetteringOn={peerCard?.vcidLettering !== false} />
              </div>
              <button
                type="button"
                onClick={onStartVlueVoiceFromModal}
                disabled={isGroupRoom || !phoneDigits}
                className="col-span-2 flex flex-row items-center justify-center gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-[13px] font-black text-white shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
                    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.3 19.3 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.2 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 3a2 2 0 0 1-.4 2l-1.2 1.2a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.4c1 .3 2 .5 3 .6A2 2 0 0 1 22 16.9z" />
                  </svg>
                </span>
                보안통화 (앱 내 통화)
              </button>
              <button
                type="button"
                onClick={onTapPhoneCall}
                disabled={isGroupRoom || !phoneDigits}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 py-4 text-[13px] font-bold text-gray-800 shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md">
                  <IconPhone className="h-6 w-6" />
                </span>
                일반 전화
              </button>
              <button
                type="button"
                onClick={onTapSms}
                disabled={isGroupRoom || !phoneDigits}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 py-4 text-[13px] font-bold text-gray-800 shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                  <IconMsg className="h-6 w-6" />
                </span>
                SMS 보내기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed inset-0 z-[130] ${isDrawerOpen ? "" : "pointer-events-none"}`}>
        <button
          type="button"
          aria-label="닫기"
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isDrawerOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsDrawerOpen(false)}
        />
        <aside
          className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#f8fafc] shadow-[-12px_0_40px_rgba(15,23,42,0.12)] transition-transform duration-300 ease-out ${
            isDrawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200/80 bg-white px-2">
            <span className="text-[15px] font-black text-gray-900">대화 정보</span>
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="rounded-xl p-2 text-gray-500 active:bg-gray-100">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-28 pt-5">
            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-2xl font-black text-white shadow-md ring-4 ring-blue-500/10">
                  {roomName.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-black text-gray-900">{roomName}</h3>
                  <p className="mt-0.5 text-[12px] font-medium text-gray-400">통신 내용 보호중</p>
                </div>
              </div>

              {!isGroupRoom && (
                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/90 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">본인인증 · 표시</p>
                  <div className="mt-2 space-y-2.5 text-[12px] leading-snug text-gray-700">
                    <div>
                      <p className="font-bold text-gray-900">내 계정</p>
                      {getLegalName() ? (
                        <p className="mt-0.5 text-gray-600">본인인증 완료: {getLegalName()}</p>
                      ) : (
                        <p className="mt-0.5 text-gray-500">저장된 본인인증 실명이 없습니다. 설정에서 인증을 완료해 주세요.</p>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">상대</p>
                      {peerVerifiedLegal ? (
                        <p className="mt-0.5 text-gray-600">본인인증 완료: {peerVerifiedLegal}</p>
                      ) : (
                        <p className="mt-0.5 text-gray-500">
                          상대 실명은 상대 설정·서비스 정책에 따라 표시되거나 비공개일 수 있습니다.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6">
                <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <span className="h-1 w-1 rounded-full bg-blue-500" />
                  파일 미리보기
                </p>
                {attachmentPreviews.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center text-[13px] text-gray-400">
                    아직 공유된 이미지·문서가 없습니다.
                  </div>
                ) : (
                  <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 pt-1">
                    {attachmentPreviews.map((p) => (
                      <div
                        key={p.id}
                        className="flex w-[92px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                      >
                        <div
                          className={`flex aspect-square items-center justify-center ${
                            p.kind === "image" ? "bg-gradient-to-br from-slate-100 to-blue-50" : "bg-gradient-to-br from-amber-50 to-orange-50"
                          }`}
                        >
                          {p.kind === "image" ? (
                            <svg className="h-9 w-9 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                              <rect x="3" y="5" width="18" height="14" rx="2" />
                              <circle cx="8.5" cy="10.5" r="1.5" />
                              <path d="M21 19l-6-6-4 4-3-3-5 5" />
                            </svg>
                          ) : (
                            <svg className="h-9 w-9 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          )}
                        </div>
                        <p className="line-clamp-2 px-2 py-1.5 text-[10px] font-medium leading-tight text-gray-600">{p.caption}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              <MenuRow
                icon={IconSearch}
                title="대화 검색"
                subtitle="이 채팅방 메시지에서 검색합니다."
                onClick={() => {
                  setIsDrawerOpen(false);
                  setIsSearchOpen(true);
                }}
              />
              <MenuRow
                icon={IconUserPlus}
                title="초대하기"
                subtitle="선택한 연락처와 새 단체 방이 열립니다. 기존 1:1 대화는 유지됩니다."
                onClick={() => setInviteOpen(true)}
              />
              <MenuRow
                icon={IconCalendar}
                title="일정 등록"
                subtitle="대화에서 바로 일정을 만들고 알림을 받아보세요."
                onClick={() => {
                  setFavoriteNotice("일정 등록은 다음 업데이트에서 제공됩니다.");
                  setTimeout(() => setFavoriteNotice(""), 1500);
                }}
              />
              <MenuRow
                icon={IconBell}
                title="알림"
                subtitle="이 대화방 알림을 켜거나 끕니다."
                onClick={() => {
                  setFavoriteNotice("알림 설정은 프로필 > 알림에서 관리할 수 있습니다.");
                  setTimeout(() => setFavoriteNotice(""), 1500);
                }}
              />
              <MenuRow
                icon={IconPin}
                title="상단 고정"
                subtitle="채팅 목록 최상단에 고정합니다."
                onClick={() => {
                  setFavoriteNotice("상단 고정은 곧 제공됩니다.");
                  setTimeout(() => setFavoriteNotice(""), 1400);
                }}
              />
              <MenuRow
                icon={IconFolder}
                title="카테고리 이동"
                subtitle="가족 · 친구 · 직장 등 폴더로 옮깁니다."
                onClick={() => {
                  setFavoriteNotice("카테고리 이동은 채팅 목록 편집에서 지원될 예정입니다.");
                  setTimeout(() => setFavoriteNotice(""), 1800);
                }}
              />
              <MenuRow
                icon={isBlocked ? IconShieldOff : IconShield}
                title={isBlocked ? "차단 해제" : "차단하기"}
                subtitle={isBlocked ? "상대방과 다시 대화할 수 있습니다." : "이 상대방을 차단합니다. 메시지 수신이 제한됩니다."}
                danger={!isBlocked}
                onClick={() => {
                  onToggleBlock?.();
                  if (!isBlocked) setIsDrawerOpen(false);
                }}
              />
            </div>
          </div>
        </aside>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 z-[135] flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center" onMouseDown={() => setInviteOpen(false)}>
          <div
            className="relative max-h-[85vh] w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ModalCloseButton variant="default" onClick={() => setInviteOpen(false)} />
            <div className="border-b border-gray-100 px-5 py-4 pr-14">
              <h4 className="text-lg font-black text-gray-900">대화 상대 초대</h4>
              <p className="mt-1 text-[13px] text-gray-500">초대하면 새 단체 채팅방이 만들어지고, 지금 방은 그대로 남습니다.</p>
            </div>
            <div className="max-h-[46vh] overflow-y-auto px-3 py-2">
              {inviteCandidates.length === 0 ? (
                <p className="py-10 text-center text-[14px] text-gray-400">초대할 다른 연락처가 없습니다.</p>
              ) : (
                inviteCandidates.map((c) => {
                  const on = invitePick.has(c.roomKey);
                  return (
                    <button
                      key={c.roomKey}
                      type="button"
                      onClick={() => toggleInvite(c.roomKey)}
                      className={`mb-2 flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                        on ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[14px] font-bold text-blue-600 shadow-sm ring-1 ring-gray-100">
                        {c.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-gray-900">{c.name}</span>
                        <span className="text-[12px] text-gray-400">{c.group === "family" ? "가족" : c.group === "friends" ? "친구" : c.group === "work" ? "직장" : c.group}</span>
                      </span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                          on ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-white"
                        }`}
                      >
                        {on && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 px-3 py-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                  checked={inviteVmingOn}
                  onChange={(e) => setInviteVmingOn(e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold text-gray-900">브이밍 AI 호출</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-gray-600">
                    방 생성 후 멤버 동의를 요청합니다. 전원 동의 · 90일 유효
                  </span>
                </span>
              </label>
              <label className="mt-2 flex cursor-pointer items-center gap-2 px-1 text-[12px] text-gray-600">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-blue-600"
                  checked={saveInviteVmingDefault}
                  onChange={(e) => setSaveInviteVmingDefault(e.target.checked)}
                />
                앞으로 그룹 만들 때 위 설정을 기본값으로 사용
              </label>
            </div>
            <div className="flex gap-2 border-t border-gray-100 bg-gray-50 px-4 py-4">
              <button type="button" onClick={() => setInviteOpen(false)} className="flex-1 rounded-2xl bg-white py-3 text-[14px] font-bold text-gray-600 shadow-sm ring-1 ring-gray-200">
                취소
              </button>
              <button
                type="button"
                onClick={confirmInvite}
                className="flex-1 rounded-2xl bg-blue-600 py-3 text-[14px] font-bold text-white shadow-md active:scale-[0.99]"
              >
                단체 방 만들기
              </button>
            </div>
          </div>
        </div>
      )}

      {isCalling && (
        <div className="fixed inset-0 z-[140] overflow-hidden bg-[#070b12] text-white">
          <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-blue-600/25 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -right-16 bottom-32 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" aria-hidden />
          <div
            className="relative mx-auto flex h-full w-full max-w-md flex-col px-5 pt-[max(2.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <div className="shrink-0 text-center">
              <p className="text-[11px] font-bold tracking-[0.32em] text-blue-300/90">보안통화</p>
              {isAiLiveMode && (
                <p className="mt-3 truncate text-[16px] font-black text-white/95">{roomName}</p>
              )}
              {!isAiLiveMode && (
                <>
                  <div className="relative mx-auto mt-5 w-[104px]">
                    <div className="absolute inset-0 animate-ping rounded-full bg-blue-400/25" style={{ animationDuration: "2.2s" }} aria-hidden />
                    <div className="relative mx-auto flex h-[104px] w-[104px] items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-700 text-[34px] font-black text-white shadow-[0_12px_40px_rgba(37,99,235,0.45)] ring-4 ring-white/15">
                      {roomName.slice(0, 1)}
                    </div>
                  </div>
                  <p className="mt-4 text-[clamp(17px,5vw,22px)] font-black leading-tight">{roomName}</p>
                  {(peerCard?.title || peerCard?.name) && (
                    <p className="mt-1 text-[13px] font-semibold text-slate-300">
                      {[peerCard?.title, peerCard?.name].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {!isGroupRoom && peerPhone && (
                    <p className="mt-0.5 font-mono text-[12px] text-slate-400">{maskPhoneTail(peerPhone)}</p>
                  )}
                  {!isGroupRoom && peerVerifiedLegal && (
                    <p className="mx-auto mt-2 max-w-[280px] rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-200 ring-1 ring-emerald-400/30">
                      본인인증 완료: {peerVerifiedLegal}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] font-medium text-slate-500">통신 내용 보호중 · 데모 음성 세션</p>
                </>
              )}
              <p className={`font-mono text-[15px] font-bold tabular-nums text-blue-100 ${isAiLiveMode ? "mt-6" : "mt-3"}`}>
                {mm}:{ss}
              </p>
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
              {!isAiLiveMode && (
                <div className="mb-3 flex justify-center">
                  <div className="origin-top scale-[0.84] text-center">
                    <p className="mb-1 text-[10px] font-bold tracking-[0.08em] text-blue-200/85">
                      상대 명함 등급: {peerMembershipTier === "premium" ? "프리미엄" : peerMembershipTier === "standard" ? "스탠다드" : "일반"}
                    </p>
                    <VcidCard membershipTier={peerMembershipTier} peerCard={peerCard} vcidLetteringOn={peerCard?.vcidLettering !== false} />
                  </div>
                </div>
              )}
              {isAiLiveMode && (
                <div className="mb-2 text-center">
                  <p className="text-[12px] font-bold text-slate-300">AI 실시간 통역</p>
                  {!isGroupRoom && peerVerifiedLegal && (
                    <p className="mt-1 text-[11px] text-emerald-200/90">상대 인증: {peerVerifiedLegal}</p>
                  )}
                </div>
              )}
              {isAiLiveMode && (
                <div className="mt-3 rounded-2xl border border-white/15 bg-white/5 p-3 text-left">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-bold tracking-wider text-blue-200">Live Subtitle</p>
                    {(isTranslating || isListening) && (
                      <div className="subtitle-loading">
                        <span />
                        <span />
                        <span />
                      </div>
                    )}
                  </div>
                  <div ref={subtitleListRef} className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {liveSubtitles.map((line) => {
                      const isMine = line.speaker === "나";
                      const isAi = line.speaker === "AI 통역";
                      return (
                        <div
                          key={line.id}
                          className={`subtitle-item rounded-xl px-2.5 py-1.5 ${
                            isMine
                              ? "ml-6 bg-blue-500/22 ring-1 ring-blue-300/25"
                              : isAi
                              ? "mr-6 bg-violet-500/22 ring-1 ring-violet-300/25"
                              : "bg-white/10"
                          }`}
                        >
                          <p className={`text-[10px] ${isMine ? "text-blue-100" : isAi ? "text-violet-100" : "text-blue-100"}`}>
                            {line.speaker} · {line.stamp}
                          </p>
                          <p className="text-[12px] text-white">{line.text}</p>
                        </div>
                      );
                    })}
                    {liveSubtitles.length === 0 && (
                      <p className="text-[clamp(10px,2.8vw,12px)] leading-snug text-gray-300 break-keep">
                        통역 버튼을 누르면 음성이 자막으로 변환됩니다.
                      </p>
                    )}
                  </div>
                  <div className="mt-2 flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={runVoiceToText}
                      disabled={isTranslating || isListening}
                      className="h-9 min-w-[54px] shrink-0 whitespace-nowrap rounded-xl bg-blue-600 px-2 text-[clamp(10px,2.9vw,12px)] leading-none font-bold text-white disabled:opacity-40"
                    >
                      {isListening ? "듣는 중..." : "통역"}
                    </button>
                    <div className="relative min-w-0 flex-1">
                      <input
                        value={voiceInput}
                        onChange={(e) => setVoiceInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            submitVoiceSimulation();
                          }
                        }}
                        placeholder="테스트 문장 입력"
                        className="h-9 min-w-0 w-full rounded-xl border border-white/20 bg-black/20 pl-3 pr-16 text-[clamp(10px,2.9vw,12px)] text-white outline-none placeholder:text-gray-400"
                      />
                      <select
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="absolute right-1 top-1 h-7 w-14 rounded-lg border border-white/20 bg-[#111827] px-1 text-[10px] font-bold text-blue-100 outline-none"
                      >
                        {LANG_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label} ▼
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              {isAiLiveMode && (
                <div className="flex justify-center opacity-90">
                  <div className="origin-top scale-[0.92]">
                    <VcidCard membershipTier={peerMembershipTier} peerCard={peerCard} vcidLetteringOn={peerCard?.vcidLettering !== false} />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto grid w-full shrink-0 grid-cols-4 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAiLiveMode((v) => !v)}
                className={`h-[52px] rounded-2xl text-[11px] font-bold leading-tight ${isAiLiveMode ? "bg-indigo-500 text-white shadow-lg shadow-indigo-900/40" : "bg-white/12 text-white ring-1 ring-white/10"}`}
              >
                AI 통역
              </button>
              <button
                type="button"
                onClick={() => setIsMuted((v) => !v)}
                className={`h-[52px] rounded-2xl text-[11px] font-bold leading-tight ${isMuted ? "bg-blue-500 text-white" : "bg-white/12 text-white ring-1 ring-white/10"}`}
              >
                {isMuted ? "음소거 해제" : "음소거"}
              </button>
              <button
                type="button"
                onClick={() => setIsSpeakerOn((v) => !v)}
                className={`h-[52px] rounded-2xl text-[11px] font-bold leading-tight ${isSpeakerOn ? "bg-blue-500 text-white" : "bg-white/12 text-white ring-1 ring-white/10"}`}
              >
                {isSpeakerOn ? "스피커 끔" : "스피커"}
              </button>
              <button type="button" onClick={endVoiceCall} className="h-[52px] rounded-2xl bg-red-600 text-[11px] font-black shadow-lg shadow-red-900/30">
                종료
              </button>
            </div>
          </div>
        </div>
      )}
      {favoriteNotice && (
        <div className="pointer-events-none fixed left-1/2 top-[92px] z-[180] -translate-x-1/2 rounded-full bg-gray-900/92 px-4 py-1.5 text-[11px] font-bold text-white">
          {favoriteNotice}
        </div>
      )}

      <VmingInfoSheet
        open={vmingInfoOpen}
        onClose={() => setVmingInfoOpen(false)}
        isDarkMode={isDarkMode}
        status={vmingConsent}
        isHost={canManageGroupCalendar || isGroupRoom}
        canWithdraw={Boolean(
          vmingConsent?.members?.find((m) =>
            resolveMyIdentityIds(effectiveMyUserId).some((id) => isSameVlueUser(id, m.userId))
          )?.isValid
        )}
        onReRequest={() => setVmingRequestOpen(true)}
        onEvict={async () => {
          if (!window.confirm("브이밍을 보내고 분석 데이터를 삭제할까요?")) return;
          try {
            await evictVmingFromRoom(roomId);
          } catch {
            /* 로컬 알림은 표시 */
          }
          vmingJoinedPostedRef.current = false;
          setVmingConsent(null);
          setVmingInfoOpen(false);
          postVmingNotice(buildVmingLeftMessage());
        }}
        onWithdraw={async () => {
          if (!window.confirm("동의를 철회하면 브이밍이 즉시 비활성화될 수 있어요. 그래도 철회하시겠어요?")) return;
          const wasActive = vmingJoinedPostedRef.current;
          try {
            await withdrawVmingConsent(roomId);
          } catch {
            /* ignore */
          }
          setVmingInfoOpen(false);
          if (wasActive) postVmingNotice(buildVmingLeftMessage());
          vmingJoinedPostedRef.current = false;
          refreshVmingConsent();
        }}
      />
      <VmingConsentRequestModal
        open={vmingRequestOpen}
        isDarkMode={isDarkMode}
        onClose={() => setVmingRequestOpen(false)}
        onSubmit={async (cfg) => {
          setVmingRequestOpen(false);
          await runVmingConsentRequest(cfg);
        }}
      />
      <VmingConsentRespondModal
        open={vmingRespondOpen || Boolean(myConsentPending)}
        requesterName={roomName}
        isDarkMode={isDarkMode}
        onClose={() => setVmingRespondOpen(false)}
        onAccept={async () => {
          setVmingRespondOpen(false);
          try {
            await respondVmingConsent({ roomId, status: "accepted" });
          } catch {
            /* ignore */
          }
          refreshVmingConsent();
        }}
        onDecline={async () => {
          setVmingRespondOpen(false);
          try {
            await respondVmingConsent({ roomId, status: "declined" });
          } catch {
            /* ignore */
          }
          postVmingNotice(buildVmingDeclinedMessage({ userName: myCard?.name }));
          refreshVmingConsent();
        }}
      />
    </section>
  );
}

export default ChatRoom;
