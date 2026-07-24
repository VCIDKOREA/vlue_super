import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import ModalCloseButton from "./common/ModalCloseButton";
import WalletHubModal from "./WalletHubModal.jsx";
import { buildMyCardChatPayload } from "../lib/shareMyCardToChat.js";
import SpellingCorrectionField from "./spell/SpellingCorrectionField.jsx";
import { useSpellingCheckMode } from "../hooks/useSpellingCheckMode.js";
import { fitImageFileOrThrow, IMAGE_FIT_CHAT } from "../lib/fitImageFile.js";

/** 위챗 스타일 8칸 + VLUE 기존 확장 */
const PRIMARY_ACTIONS = [
  { id: "camera", label: "카메라", emoji: "📷" },
  { id: "gallery", label: "앨범", emoji: "🖼️" },
  { id: "file", label: "파일", emoji: "📁" },
  { id: "location", label: "위치 공유", emoji: "📍" },
  { id: "bizcard", label: "명함 공유", emoji: "💳" },
  { id: "voiceMsg", label: "음성메시지", emoji: "🎵" },
  { id: "shortVideo", label: "짧은영상", emoji: "🎥" },
  { id: "transfer", label: "송금(포인트)", emoji: "💰" }
];

const EXTRA_ACTIONS = [
  { id: "scheduled", label: "예약메시지", emoji: "⏰" },
  { id: "gift", label: "선물하기", emoji: "🎁" },
  { id: "profile", label: "내 프로필", emoji: "👤" },
  { id: "wallet", label: "명함 지갑", emoji: "👛" }
];

const SAVED_FILES_KEY = "vlue_saved_files";

const DEFAULT_STORAGE_FILES = [
  { id: "f1", name: "보험약관_요약.pdf" },
  { id: "f2", name: "상담기록_2026-04.docx" },
  { id: "f3", name: "제안서_수정본.hwp" },
  { id: "f4", name: "매출집계표_v2.xlsx" }
];

const readSavedFiles = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_FILES_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((f) => f && typeof f.name === "string")
      .map((f) => ({ id: f.id || `sf-${Date.now()}`, name: f.name, content: f.content || "" }));
  } catch {
    return [];
  }
};

function ActionIcon({ id }) {
  if (id === "gallery") return <span className="text-blue-600">🖼</span>;
  if (id === "camera") return <span className="text-sky-600">📷</span>;
  if (id === "file") return <span className="text-indigo-600">📄</span>;
  if (id === "location") return <span className="text-rose-600">📍</span>;
  if (id === "scheduled") return <span className="text-violet-600">⏰</span>;
  if (id === "gift") return <span className="text-emerald-600">🎁</span>;
  if (id === "profile") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-cyan-600" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M4.5 19c1.8-3.1 4.4-4.6 7.5-4.6s5.7 1.5 7.5 4.6" />
      </svg>
    );
  }
  if (id === "bizcard") {
    return <span className="text-indigo-600">🪪</span>;
  }
  if (id === "wallet") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 16.5z" />
        <path d="M4 9h16" />
        <circle cx="16.5" cy="13.5" r="1.2" />
      </svg>
    );
  }
  return null;
}

const ChatInput = forwardRef(function ChatInput(
  {
    onSend,
    membershipTier,
    digitalCardActive = true,
    walletCards = [],
    profileByRoomId = {},
    myCard,
    myCardUserId = "me",
    onRemoveCardFromWallet,
    onSaveToContacts,
    isDarkMode = false
  },
  ref
) {
  const spellingCheck = useSpellingCheckMode();
  const [value, setValue] = useState("");
  const [openPlus, setOpenPlus] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordCancel, setRecordCancel] = useState(false);
  const [recordStart, setRecordStart] = useState(0);
  const recordPointerStartY = useRef(0);
  const [paywallFeature, setPaywallFeature] = useState("");
  const [walletHubOpen, setWalletHubOpen] = useState(false);
  const [walletHubTab, setWalletHubTab] = useState("mine");
  const [toast, setToast] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleText, setScheduleText] = useState("");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedMapProvider, setSelectedMapProvider] = useState("kakao");
  const [pendingLocation, setPendingLocation] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const plusPanelRef = useRef(null);
  const plusBtnRef = useRef(null);
  const messageInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaChunksRef = useRef([]);
  const isPaid = useMemo(() => ["premium", "standard"].includes(membershipTier), [membershipTier]);

  const assignMessageInputRef = (el) => {
    messageInputRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  const toggleEmojiPanel = () => {
    setEmojiOpen((open) => {
      const next = !open;
      if (next) {
        messageInputRef.current?.blur();
        setOpenPlus(false);
      }
      return next;
    });
  };
  const [savedFiles, setSavedFiles] = useState(() => readSavedFiles());
  const storageFiles = useMemo(() => [...savedFiles, ...DEFAULT_STORAGE_FILES], [savedFiles]);

  const sendMyCardToChat = async () => {
    if (!digitalCardActive) {
      setToast("VLUE 명함을 가입 시 신청하지 않았습니다.");
      return;
    }
    const payload = await buildMyCardChatPayload(
      { ...myCard, membershipTier },
      myCardUserId
    );
    if (!payload.card.digitalCardId) {
      setToast("디지털 명함 ID가 없습니다. 마이페이지에서 명함을 저장한 뒤 다시 시도해 주세요.");
      return;
    }
    onSend(payload);
    window.dispatchEvent(new CustomEvent("vlue-kpi-event", { detail: { kind: "card_sent" } }));
    setToast("내 명함이 채팅방에 공유되었습니다.");
    setOpenPlus(false);
    setShowProfileModal(false);
  };

  useEffect(() => {
    const onDocClick = (e) => {
      if (!openPlus) return;
      const inPanel = plusPanelRef.current && plusPanelRef.current.contains(e.target);
      const inBtn = plusBtnRef.current && plusBtnRef.current.contains(e.target);
      if (!inPanel && !inBtn) setOpenPlus(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openPlus]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const syncSavedFiles = () => setSavedFiles(readSavedFiles());
    window.addEventListener("vlue-files-updated", syncSavedFiles);
    return () => window.removeEventListener("vlue-files-updated", syncSavedFiles);
  }, []);

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
  };
  const reverseGeocode = async (lat, lng) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("geocode failed");
      const data = await res.json();
      const name = data.name || data.address?.attraction || data.address?.road || "현재 위치";
      const address = data.display_name || `위도 ${lat.toFixed(5)}, 경도 ${lng.toFixed(5)}`;
      return { name, address };
    } catch {
      return { name: "현재 위치", address: `위도 ${lat.toFixed(5)}, 경도 ${lng.toFixed(5)}` };
    }
  };
  const onAction = (action) => {
    if (action.paidOnly && !isPaid) return setPaywallFeature(action.label);
    if (action.id === "gallery") {
      galleryInputRef.current?.click();
      setOpenPlus(false);
      return;
    }
    if (action.id === "camera") {
      cameraInputRef.current?.click();
      setOpenPlus(false);
      return;
    }
    if (action.id === "file") {
      setWalletHubTab("mydocs");
      setWalletHubOpen(true);
      setOpenPlus(false);
      return;
    }
    if (action.id === "location") {
      if (!navigator.geolocation) {
        setToast("위치 서비스를 지원하지 않는 환경입니다.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const googleMapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
          const kakaoMapUrl = `https://map.kakao.com/link/map/${latitude},${longitude}`;
          const staticMapUrl = `https://static-maps.yandex.ru/1.x/?lang=ko_KR&ll=${longitude},${latitude}&z=15&size=450,220&l=map&pt=${longitude},${latitude},pm2rdm`;
          const place = await reverseGeocode(latitude, longitude);
          setPendingLocation({
            lat: latitude,
            lng: longitude,
            googleMapUrl,
            kakaoMapUrl,
            staticMapUrl,
            placeName: place.name,
            address: place.address
          });
          setSelectedMapProvider("kakao");
          setShowLocationModal(true);
        },
        () => setToast("위치 권한이 필요합니다. 권한을 확인해 주세요.")
      );
      setOpenPlus(false);
      return;
    }
    if (action.id === "scheduled") {
      const now = new Date();
      const defaultDate = now.toISOString().slice(0, 10);
      const defaultTime = `${String(now.getHours()).padStart(2, "0")}:${String((now.getMinutes() + 1) % 60).padStart(2, "0")}`;
      setScheduleDate(defaultDate);
      setScheduleTime(defaultTime);
      setScheduleText("");
      setShowScheduleModal(true);
      setOpenPlus(false);
      return;
    }
    if (action.id === "voiceMsg") {
      setToast("마이크 버튼을 길게 눌러 음성메시지를 보내세요.");
      setOpenPlus(false);
      return;
    }
    if (action.id === "shortVideo") {
      videoInputRef.current?.click();
      setOpenPlus(false);
      return;
    }
    if (action.id === "transfer") {
      onSend("[송금] VLUE 포인트 10,000원을 보냈습니다.");
      setOpenPlus(false);
      return;
    }
    if (action.id === "gift") {
      setToast("선물 기능은 다음 업데이트에서 열립니다.");
      setOpenPlus(false);
      return;
    }
    if (action.id === "bizcard") {
      void sendMyCardToChat();
      return;
    }
    if (action.id === "profile") {
      setShowProfileModal(true);
      setOpenPlus(false);
      return;
    }
    if (action.id === "wallet") {
      setWalletHubTab("received");
      setWalletHubOpen(true);
      setOpenPlus(false);
      return;
    }
    if (action.text) onSend(action.text);
    setOpenPlus(false);
  };
  const sendImageFile = async (file) => {
    if (!file) return;
    try {
      const { dataUrl } = await fitImageFileOrThrow(file, IMAGE_FIT_CHAT);
      onSend({ type: "me", imageUrl: dataUrl, text: "" });
    } catch {
      /* ignore */
    }
  };
  const shareCardToChat = (profile) => {
    if (!profile) return;
    let vcidLettering = profile.vcidLettering !== false;
    try {
      if (profile.userId === "me") vcidLettering = localStorage.getItem("vcid") === "true";
    } catch {
      /* keep profile default */
    }
    onSend({
      type: "me",
      text: "[명함카드]",
      card: {
        userId: profile.userId || "",
        digitalCardId: profile.digitalCardId || "",
        membershipTier: profile.membershipTier || "free",
        organization: profile.organization || "VLUE",
        title: profile.title || "",
        name: profile.name || "",
        phone: profile.phone || "",
        email: profile.email || "",
        address: profile.address || "",
        landline: profile.landline || "",
        fax: profile.fax || "",
        backNote: profile.backNote || "",
        introBack: profile.introBack || "",
        logoUrl: profile.logoUrl || "",
        legalName: String(profile.legalName || "").trim(),
        vcidLettering
      }
    });
    window.dispatchEvent(new CustomEvent("vlue-kpi-event", { detail: { kind: "card_sent" } }));
    setToast("명함이 채팅방에 공유되었습니다.");
    setShowWalletModal(false);
  };
  const QUICK_EMOJIS = ["😀", "👍", "❤️", "😂", "🙏", "🎉", "✨", "🔥"];

  const startVoice = async (clientY = 0) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      mediaChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) mediaChunksRef.current.push(e.data);
      };
      recorder.start();
      setRecording(true);
      setRecordCancel(false);
      setRecordStart(Date.now());
      recordPointerStartY.current = clientY;
    } catch {
      setToast("마이크 권한이 필요합니다. 권한을 확인해 주세요.");
    }
  };

  const onRecordPointerMove = (clientY) => {
    if (!recording) return;
    const delta = recordPointerStartY.current - clientY;
    setRecordCancel(delta > 72);
  };

  const stopVoice = (cancelled = false) => {
    if (!recording) return;
    const wasCancel = cancelled || recordCancel;
    setRecording(false);
    setRecordCancel(false);
    const sec = Math.max(1, Math.round((Date.now() - recordStart) / 1000));
    const recorder = mediaRecorderRef.current;
    const cleanup = () => {
      mediaStreamRef.current?.getTracks()?.forEach((t) => t.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      mediaChunksRef.current = [];
    };
    if (wasCancel) {
      if (recorder && recorder.state !== "inactive") recorder.stop();
      cleanup();
      setToast("음성메시지가 취소되었습니다.");
      return;
    }
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => {
        const blob = new Blob(mediaChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(blob);
        onSend({
          type: "me",
          text: `[음성메시지] ${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`,
          audioUrl,
          audioDurationSec: sec
        });
        cleanup();
      };
      recorder.stop();
      return;
    }
    onSend({
      type: "me",
      text: `[음성메시지] ${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`,
      audioDurationSec: sec
    });
    cleanup();
  };

  const shellCls = isDarkMode
    ? "shrink-0 border-t border-white/10 bg-[#0f172a] px-2 py-2"
    : "shrink-0 border-t border-gray-100 bg-white px-2 py-2";
  const panelCls = isDarkMode
    ? "rounded-2xl border border-white/10 bg-[#151d2e] p-3"
    : "rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3";
  const actionBtnCls = isDarkMode
    ? "rounded-xl border border-white/10 bg-[#1f2937] py-2.5 text-[11px] font-semibold text-gray-100"
    : "rounded-xl border border-slate-200 bg-white py-2.5 text-[11px] font-semibold text-slate-900 shadow-sm";

  return (
    <div className={shellCls}>
      <div
        ref={plusPanelRef}
        className={`chat-plus-panel ${openPlus ? "chat-plus-panel--open" : ""}`}
        aria-hidden={!openPlus}
      >
        <div className={panelCls}>
          <div className="grid grid-cols-4 gap-2">
            {PRIMARY_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onAction(action)}
                className={`plus-action-btn ${actionBtnCls} transition-colors active:scale-[0.98]`}
              >
                <span className="mb-1 block text-[20px] leading-none">{action.emoji}</span>
                <span className="plus-action-label block leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
          <p className={`mt-2 text-center text-[10px] font-bold ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
            VLUE 확장
          </p>
          <div className="mt-1.5 grid grid-cols-4 gap-2">
            {EXTRA_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onAction(action)}
                className={`${actionBtnCls} py-2 text-[10px]`}
              >
                <span className="block text-[16px]">{action.emoji}</span>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {emojiOpen && (
        <div className={`mb-2 flex flex-wrap gap-1 rounded-2xl p-2 ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
          {QUICK_EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              className="h-9 w-9 rounded-lg text-[20px] active:scale-95"
              onClick={() => setValue((v) => `${v}${em}`)}
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {recording && (
        <div
          className={`chat-voice-record-overlay fixed inset-x-0 bottom-[72px] z-[120] flex justify-center px-6 ${
            recordCancel ? "text-rose-500" : "text-blue-600"
          }`}
        >
          <div
            className={`rounded-2xl px-5 py-3 text-center text-[13px] font-bold shadow-lg ${
              isDarkMode ? "bg-[#1e293b]" : "bg-white"
            }`}
          >
            {recordCancel ? "손을 떼면 취소됩니다" : "↑ 위로 슬라이드하면 취소"}
            <p className="mt-1 text-[11px] font-medium opacity-80">녹음 중…</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 sm:gap-3 box-border">
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            sendImageFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            sendImageFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onSend(`[짧은영상] ${f.name || "video"}`);
            e.target.value = "";
          }}
        />
        <button
          ref={plusBtnRef}
          type="button"
          onClick={() => {
            setOpenPlus((v) => !v);
            setEmojiOpen(false);
          }}
          className={`h-10 w-10 shrink-0 rounded-full border font-bold ${
            openPlus
              ? "border-blue-600 bg-blue-600 text-white"
              : isDarkMode
                ? "border-white/15 text-blue-400"
                : "border-blue-100 text-blue-600"
          }`}
          aria-expanded={openPlus}
          aria-label="더보기"
        >
          +
        </button>
        <button
          type="button"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            startVoice(e.clientY);
          }}
          onPointerMove={(e) => onRecordPointerMove(e.clientY)}
          onPointerUp={(e) => {
            stopVoice(recordCancel);
            e.currentTarget.releasePointerCapture?.(e.pointerId);
          }}
          onPointerCancel={() => stopVoice(true)}
          className={`h-10 w-10 shrink-0 rounded-full border ${
            recording
              ? recordCancel
                ? "border-rose-500 bg-rose-500 text-white"
                : "border-blue-600 bg-blue-600 text-white"
              : isDarkMode
                ? "border-white/15 text-gray-300"
                : "border-gray-200 text-gray-600"
          }`}
          aria-label="음성 메시지 길게 누르기"
        >
          <svg viewBox="0 0 24 24" className="mx-auto h-5 w-5" fill="currentColor">
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V19H9v2h6v-2h-2v-1.08A7 7 0 0 0 19 11h-2z" />
          </svg>
        </button>
        <div
          className={`relative flex min-w-0 flex-1 items-center rounded-full ${
            isDarkMode ? "bg-white/10" : "bg-gray-100"
          }`}
        >
          <button
            type="button"
            onClick={() => spellingCheck.toggle()}
            title={spellingCheck.enabled ? "맞춤법 검사 켜짐" : "맞춤법 검사"}
            aria-pressed={spellingCheck.enabled}
            className={`shrink-0 pl-3 pr-1.5 text-[13px] font-extrabold leading-none transition active:scale-95 ${
              spellingCheck.enabled
                ? "text-emerald-600 grayscale-0"
                : "text-gray-500 grayscale opacity-60"
            }`}
          >
            Aa
          </button>
          <SpellingCorrectionField
            enabled={spellingCheck.enabled}
            value={value}
            onChange={setValue}
            inputRef={assignMessageInputRef}
            onFocus={() => setEmojiOpen(false)}
            onKeyDown={(e) => {
              if (e.isComposing) return;
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={
              spellingCheck.enabled ? "맞춤법 검사 — 입력 후 자동 교정" : "메시지를 입력하세요..."
            }
            isDarkMode={isDarkMode}
            className="min-w-0 flex-1"
            inputClassName={`w-full bg-transparent py-2.5 pr-3 text-[clamp(12px,3vw,14px)] outline-none ${
              isDarkMode ? "text-gray-100 placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-400"
            }`}
          />
        </div>
        <button
          type="button"
          onClick={toggleEmojiPanel}
          className={`chat-emoji-btn h-10 w-10 shrink-0 rounded-full text-[20px] ${emojiOpen ? "chat-emoji-btn--open" : ""}`}
          aria-label="이모지"
          aria-expanded={emojiOpen}
        >
          ☺
        </button>
        <button type="button" onClick={submit} className="shrink-0 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-bold text-white">
          전송
        </button>
      </div>

      {paywallFeature && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-6" onMouseDown={() => setPaywallFeature("")}>
          <div className="relative w-full max-w-xs rounded-2xl bg-white p-5 border border-blue-100" onMouseDown={(e) => e.stopPropagation()}>
            <ModalCloseButton variant="default" onClick={() => setPaywallFeature("")} />
            <h3 className="text-lg font-bold text-gray-900">유료 멤버십 안내</h3>
            <p className="text-sm text-gray-600 mt-2">
              <span className="text-blue-600 font-bold">{paywallFeature}</span>은 스탠다드/프리미엄 전용입니다.
            </p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setPaywallFeature("")} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-bold text-gray-600">닫기</button>
              <button onClick={() => window.open("https://www.vlue.kr/membership", "_blank", "noopener,noreferrer")} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white">전환하기</button>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center px-6" onMouseDown={() => setShowScheduleModal(false)}>
          <div className="relative w-full max-w-sm rounded-2xl bg-white border border-blue-100 shadow-2xl p-4 pt-12" onMouseDown={(e) => e.stopPropagation()}>
            <ModalCloseButton variant="default" onClick={() => setShowScheduleModal(false)} />
            <h4 className="text-[16px] font-black text-gray-900">예약 메시지</h4>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <textarea
              value={scheduleText}
              onChange={(e) => setScheduleText(e.target.value)}
              placeholder="예약 전송할 메시지를 입력하세요"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-20 outline-none"
            />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setShowScheduleModal(false)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-bold text-gray-600">닫기</button>
              <button
                type="button"
                onClick={() => {
                  const body = scheduleText.trim();
                  if (!body || !scheduleDate || !scheduleTime) return setToast("예약 날짜/시간/메시지를 입력해 주세요.");
                  const targetMs = new Date(`${scheduleDate}T${scheduleTime}:00`).getTime();
                  const delay = targetMs - Date.now();
                  if (delay <= 0) return setToast("현재 시각보다 이후로 예약해 주세요.");
                  setShowScheduleModal(false);
                  setToast("예약 메시지가 등록되었습니다.");
                  setTimeout(() => {
                    onSend({ type: "me", text: body, scheduledAt: targetMs });
                  }, delay);
                }}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white"
              >
                예약 전송
              </button>
            </div>
          </div>
        </div>
      )}

      {showLocationModal && pendingLocation && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center px-6" onMouseDown={() => setShowLocationModal(false)}>
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white border border-blue-100 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <ModalCloseButton variant="default" onClick={() => setShowLocationModal(false)} />
            <img src={pendingLocation.staticMapUrl} alt="미니맵 미리보기" className="w-full h-36 object-cover" />
            <div className="p-4">
              <h4 className="text-[15px] font-black text-gray-900">위치 공유 미리보기</h4>
              <p className="mt-1 text-[13px] font-bold text-blue-700">{pendingLocation.placeName}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{pendingLocation.address}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMapProvider("kakao")}
                  className={`rounded-xl py-2 text-[12px] font-bold border ${selectedMapProvider === "kakao" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"}`}
                >
                  카카오 지도
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMapProvider("google")}
                  className={`rounded-xl py-2 text-[12px] font-bold border ${selectedMapProvider === "google" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"}`}
                >
                  구글 지도
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setShowLocationModal(false)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-bold text-gray-600">
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSend({
                      type: "me",
                      location: {
                        lat: pendingLocation.lat,
                        lng: pendingLocation.lng,
                        placeName: pendingLocation.placeName,
                        address: pendingLocation.address,
                        staticMapUrl: pendingLocation.staticMapUrl,
                        mapProvider: selectedMapProvider,
                        mapUrl: selectedMapProvider === "kakao" ? pendingLocation.kakaoMapUrl : pendingLocation.googleMapUrl,
                        kakaoMapUrl: pendingLocation.kakaoMapUrl,
                        googleMapUrl: pendingLocation.googleMapUrl
                      },
                      text: "현재 위치를 공유했어요."
                    });
                    setShowLocationModal(false);
                    setPendingLocation(null);
                  }}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white"
                >
                  이 위치 보내기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-6" onMouseDown={() => setShowProfileModal(false)}>
          <div className="relative w-full max-w-xs rounded-2xl bg-white p-4 pt-12 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <ModalCloseButton variant="default" onClick={() => setShowProfileModal(false)} />
            <h4 className="text-[15px] font-black text-gray-900">내 프로필</h4>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={() => void sendMyCardToChat()}
                className="rounded-xl bg-blue-600 py-2.5 text-[13px] font-bold text-white"
              >
                내 명함 보내기
              </button>
              <button
                type="button"
                onClick={() => {
                  onSend("[내 상점] 블루스토어 요약\n- 베스트상품: VLUE 인증 명함 템플릿\n- 이번주 쿠폰: VLUE10 (10%)\nhttps://shop.vlue.kr/my-store");
                  setShowProfileModal(false);
                }}
                className="rounded-xl bg-gray-100 py-2.5 text-[13px] font-bold text-gray-700"
              >
                내 상점 보내기
              </button>
            </div>
          </div>
        </div>
      )}

      <WalletHubModal
        open={walletHubOpen}
        defaultTab={walletHubTab}
        onClose={() => setWalletHubOpen(false)}
        walletCards={walletCards}
        profileByRoomId={profileByRoomId}
        membershipTier={membershipTier}
        storageFiles={storageFiles}
        onPickDocument={(name) => {
          setValue(`[파일] ${name}`);
          setWalletHubOpen(false);
        }}
        onRemoveCardFromWallet={onRemoveCardFromWallet}
        onShareCardToChat={(profile) => shareCardToChat(profile)}
        myCard={myCard}
        myCardUserId={myCardUserId}
        digitalCardActive={digitalCardActive}
        onShareMyCardToChat={() => void sendMyCardToChat()}
        onSaveToContacts={onSaveToContacts}
      />

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] w-[86%] max-w-sm rounded-xl border border-blue-100 bg-white/95 px-4 py-3 text-[13px] font-semibold text-gray-700 shadow-lg backdrop-blur">
          {toast}
        </div>
      )}
    </div>
  );
});

export default ChatInput;
