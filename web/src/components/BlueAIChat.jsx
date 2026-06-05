import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MessageList from "./MessageList.jsx";
import ScreenBackHeader from "./common/ScreenBackHeader";
import { VMING_AI_ENGINES, VMING_QUICK_REPLIES, postVmingChat } from "../lib/vmingApi.js";
import { VlueBrandMark } from "./VlueBrandLogo.jsx";

const WELCOME_ID = "vming-welcome";
const VMING_ROOM_ID = "vming:assistant";
const VMING_ROOM_NAME = "브이밍";

const QUICK_ICON_TONE = {
  guide: { light: "bg-blue-50 text-blue-600", dark: "bg-blue-500/15 text-blue-300" },
  referral: { light: "bg-violet-50 text-violet-600", dark: "bg-violet-500/15 text-violet-300" },
  shield: { light: "bg-emerald-50 text-emerald-600", dark: "bg-emerald-500/15 text-emerald-300" },
  video: { light: "bg-rose-50 text-rose-600", dark: "bg-rose-500/15 text-rose-300" },
  printer: { light: "bg-slate-100 text-slate-600", dark: "bg-white/10 text-slate-300" }
};

function VmingQuickIcon({ name }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "h-[13px] w-[13px]",
    "aria-hidden": true
  };
  if (name === "guide") {
    return (
      <svg {...common}>
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18v16H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" />
        <path d="M8 8h8M8 12h6" />
      </svg>
    );
  }
  if (name === "referral") {
    return (
      <svg {...common}>
        <path d="M16 11a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z" />
        <path d="M7 20v-1a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v1M5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
        <path d="M3 20v-.5A3.5 3.5 0 0 1 6.5 16" />
      </svg>
    );
  }
  if (name === "shield") {
    return <VlueBrandMark size={13} className="!rounded-[18%]" />;
  }
  if (name === "video") {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="14" height="12" rx="2" />
        <path d="m17 10 4-2v8l-4-2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M7 8h10v8H7zM9 8V6h6v2M10 16h4" />
    </svg>
  );
}

function toChatRow(msg) {
  return {
    id: msg.id,
    type: msg.role === "user" ? "me" : "target",
    text: msg.text,
    at: msg.at
  };
}

function BlueAIChat({ onGoMain, onAssistantReply, isDarkMode = false }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: WELCOME_ID,
      role: "ai",
      at: new Date().toISOString(),
      text: "안녕하세요, 브이밍(Vming)입니다. VLUE 일상 매니저예요. 아래에서 궁금한 항목을 고르거나 직접 질문해 주세요."
    }
  ]);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [quickClosing, setQuickClosing] = useState(false);
  const [engineMenuOpen, setEngineMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const messageListRef = useRef(null);

  const hasUserMessage = messages.some((m) => m.role === "user");

  const chatMessages = useMemo(() => {
    const rows = messages.map(toChatRow);
    if (sending) {
      rows.push({
        id: "vming-typing",
        type: "target",
        text: "브이밍이 답변을 작성 중이에요…",
        at: new Date().toISOString()
      });
    }
    return rows;
  }, [messages, sending]);

  useEffect(() => {
    messageListRef.current?.scrollToBottom?.("smooth");
  }, [chatMessages.length, showQuickReplies, sending]);

  const dismissQuickReplies = useCallback(() => {
    if (!showQuickReplies || quickClosing) return;
    setQuickClosing(true);
    setTimeout(() => {
      setShowQuickReplies(false);
      setQuickClosing(false);
    }, 280);
  }, [showQuickReplies, quickClosing]);

  const sendMessage = useCallback(
    async (text, quickReplyId) => {
      const trimmed = String(text || "").trim();
      if (!trimmed || sending) return;

      dismissQuickReplies();
      setEngineMenuOpen(false);

      const userMsg = { id: `u-${Date.now()}`, role: "user", text: trimmed, at: new Date().toISOString() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setSending(true);

      const history = messages
        .filter((m) => m.id !== WELCOME_ID)
        .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", text: m.text }));

      try {
        const data = await postVmingChat({ message: trimmed, history, quickReplyId });
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "ai",
            text: data.reply || "답변을 준비하지 못했어요.",
            at: new Date().toISOString()
          }
        ]);
        onAssistantReply?.();
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "ai",
            text: "잠시 연결에 문제가 있어요. 네트워크 확인 후 다시 시도해 주세요.",
            at: new Date().toISOString()
          }
        ]);
      } finally {
        setSending(false);
      }
    },
    [dismissQuickReplies, messages, onAssistantReply, sending]
  );

  const headSub = isDarkMode ? "text-gray-500" : "text-gray-400";
  const inputShell = isDarkMode
    ? "shrink-0 border-t border-white/10 bg-[#0f172a] px-2 py-2"
    : "shrink-0 border-t border-gray-100 bg-white px-2 py-2";

  return (
    <section className="mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col">
      <ScreenBackHeader
        onBack={onGoMain}
        isDarkMode={isDarkMode}
        title={
          <div className="min-w-0">
            <p className={`truncate text-[16px] font-black leading-tight ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
              브이밍 Vming
            </p>
            <p className={`truncate text-[11px] font-medium ${headSub}`}>VLUE 공식 AI · 일상 매니저</p>
          </div>
        }
        right={
          <button
            type="button"
            onClick={() => setEngineMenuOpen((v) => !v)}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95 ${
              engineMenuOpen
                ? isDarkMode
                  ? "bg-indigo-500/25 text-indigo-200"
                  : "bg-indigo-100 text-indigo-700"
                : isDarkMode
                  ? "text-gray-300 hover:bg-white/10"
                  : "text-gray-600 hover:bg-black/5"
            }`}
            aria-label="AI 전문 엔진 메뉴"
            aria-expanded={engineMenuOpen}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <rect x="4" y="6" width="16" height="2" rx="1" />
              <rect x="4" y="11" width="16" height="2" rx="1" />
              <rect x="4" y="16" width="16" height="2" rx="1" />
            </svg>
          </button>
        }
      />

      {engineMenuOpen && !hasUserMessage ? (
        <div
          className={`shrink-0 border-b px-3 py-2 ${
            isDarkMode ? "border-white/10 bg-[#151821]" : "border-indigo-100 bg-indigo-50/40"
          }`}
        >
          <p className={`mb-2 text-center text-[10px] font-semibold ${isDarkMode ? "text-indigo-200" : "text-indigo-800"}`}>
            AI 전문 엔진
          </p>
          <ul className="flex flex-col gap-1">
            {VMING_AI_ENGINES.map((item) => {
              const tone = QUICK_ICON_TONE[item.icon] || QUICK_ICON_TONE.guide;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => sendMessage(item.message, item.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition active:scale-[0.99] disabled:opacity-50 ${
                      isDarkMode
                        ? "border-indigo-400/20 bg-indigo-500/10 text-gray-100 hover:bg-indigo-500/15"
                        : "border-indigo-100 bg-white text-gray-700 hover:bg-indigo-50"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${isDarkMode ? tone.dark : tone.light}`}
                      aria-hidden
                    >
                      <VmingQuickIcon name={item.icon} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-medium leading-tight">{item.label}</span>
                      <span className={`block text-[9px] ${headSub}`}>{item.desc}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {showQuickReplies && !hasUserMessage ? (
        <div
          className={`shrink-0 border-b px-3 py-2 transition-all duration-300 ease-out ${
            isDarkMode ? "border-white/10 bg-[#0b1220]" : "border-gray-100 bg-white"
          } ${quickClosing ? "max-h-0 overflow-hidden opacity-0 py-0" : "max-h-[240px] opacity-100"}`}
        >
          <p className={`mb-2 text-center text-[10px] font-normal tracking-tight ${headSub}`}>무엇이 궁금하신가요?</p>
          <ul className="flex flex-col gap-1">
            {VMING_QUICK_REPLIES.map((item) => {
              const tone = QUICK_ICON_TONE[item.icon] || QUICK_ICON_TONE.guide;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => sendMessage(item.message, item.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition active:scale-[0.99] disabled:opacity-50 ${
                      isDarkMode
                        ? "border-white/[0.08] bg-white/[0.03] text-gray-200 hover:bg-white/[0.06]"
                        : "border-gray-100/90 bg-white text-gray-600 hover:bg-gray-50/80"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${isDarkMode ? tone.dark : tone.light}`}
                      aria-hidden
                    >
                      <VmingQuickIcon name={item.icon} />
                    </span>
                    <span className="min-w-0 flex-1 text-[11px] font-normal leading-tight tracking-tight">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <MessageList
          ref={messageListRef}
          roomId={VMING_ROOM_ID}
          messages={chatMessages}
          roomName={VMING_ROOM_NAME}
          isDarkMode={isDarkMode}
          walletCards={[]}
          profileByRoomId={{}}
          scrollerClassName="pb-[72px]"
          showReadReceipts={false}
        />
      </div>

      <div
        className={`fixed inset-x-0 z-[38] ${inputShell}`}
        style={{ bottom: "calc(54px + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
                onFocus={() => {
                  if (input.trim()) dismissQuickReplies();
                  setEngineMenuOpen(false);
                }}
            onKeyDown={(e) => {
              if (e.isComposing) return;
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="메시지를 입력하세요..."
            className={`min-w-0 flex-1 rounded-full px-4 py-2.5 text-[clamp(12px,3vw,14px)] outline-none ${
              isDarkMode ? "bg-white/10 text-gray-100 placeholder:text-gray-500" : "bg-gray-100"
            }`}
          />
          <button
            type="button"
            disabled={sending}
            onClick={() => sendMessage(input)}
            className="shrink-0 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            전송
          </button>
        </div>
      </div>
    </section>
  );
}

export default BlueAIChat;
