import { useCallback, useEffect, useRef, useState } from "react";
import { fetchGroupChat, postGroupChatMessage } from "../lib/b2bEnterpriseApi.js";
import { ENTERPRISE_ROLE_LABELS } from "../lib/enterpriseRoles.js";

const FALLBACK_POLL_MS = 60000;

function appendMessage(chat, message) {
  if (!chat?.chatId || !message?.id) return chat;
  const exists = (chat.messages || []).some((m) => m.id === message.id);
  if (exists) return chat;
  return { ...chat, messages: [...(chat.messages || []), message] };
}

export default function EnterpriseGroupChatPanel({ onToast }) {
  const [chat, setChat] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchGroupChat();
      if (data?.chatId) setChat(data);
      else setChat(null);
    } catch {
      setChat(null);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, FALLBACK_POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const onRealtime = (ev) => {
      const data = ev.detail;
      if (data?.type === "enterprise-group-chat-ready") {
        load();
        return;
      }
      if (data?.type !== "enterprise-group-chat" || !data.message) return;
      setChat((prev) => {
        if (!prev?.chatId) return prev;
        if (data.message.chatId && data.message.chatId !== prev.chatId) return prev;
        return appendMessage(prev, data.message);
      });
    };
    window.addEventListener("vlue-enterprise-chat", onRealtime);
    return () => window.removeEventListener("vlue-enterprise-chat", onRealtime);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages?.length]);

  if (!chat?.chatId) return null;

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setBusy(true);
    try {
      const res = await postGroupChatMessage(content);
      if (res?.message) {
        setChat((prev) => appendMessage(prev, res.message));
      }
      setText("");
    } catch (e) {
      onToast?.(e?.message || "전송 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[13px] font-black text-slate-900">{chat.title || "사내 그룹"}</p>
      <p className="text-[10px] text-slate-500">실시간 · 비품 결제 공지·업무 확인</p>

      <div className="mt-2 max-h-52 space-y-2 overflow-y-auto">
        {(chat.messages || []).map((m) => (
          <div
            key={m.id}
            className={`rounded-lg px-2.5 py-2 text-[11px] ${
              m.isSystem ? "bg-indigo-50 text-indigo-950" : "bg-slate-50 text-slate-800"
            }`}
          >
            <p className="text-[9px] font-bold text-slate-500">
              {m.sender?.name || "시스템"}
              {m.sender?.role && m.sender.role !== "SYSTEM"
                ? ` · ${ENTERPRISE_ROLE_LABELS[m.sender.role] || m.sender.role}`
                : ""}
            </p>
            <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{m.content}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-2 flex gap-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="메시지 입력…"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-2 text-[12px]"
        />
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={send}
          className="rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-black text-white disabled:opacity-50"
        >
          전송
        </button>
      </div>
    </section>
  );
}
