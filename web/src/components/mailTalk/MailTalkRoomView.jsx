import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BackButton from "../common/BackButton.tsx";
import {
  fetchMailTalkMessages,
  formatMailTalkTime,
  sendMailTalkMessage
} from "../../lib/mailTalkApi.js";
import { uploadMailTalkAttachment } from "../../lib/mailTalkAttachmentUpload.js";

const TABS = [
  { id: "chat", label: "💬 채팅" },
  { id: "body", label: "📄 본문" },
  { id: "files", label: "📎 첨부" }
];

function fileNameFromUrl(url) {
  try {
    const path = new URL(url).pathname;
    const base = path.split("/").pop() || "file";
    return decodeURIComponent(base.replace(/^[a-f0-9-]+-/i, ""));
  } catch {
    return "첨부파일";
  }
}

function isImageUrl(url) {
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(String(url || ""));
}

export default function MailTalkRoomView({
  roomId,
  counterpartyEmail: counterpartyEmailProp,
  onBack,
  isDarkMode = false,
  sseVersion = 0
}) {
  const [activeTab, setActiveTab] = useState("chat");
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [bodyIndex, setBodyIndex] = useState(0);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadMessages = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchMailTalkMessages(roomId);
      setRoom(data.room);
      setMessages(data.messages || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages, sseVersion]);

  useEffect(() => {
    if (activeTab !== "chat") return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, activeTab, sending]);

  const counterpartyEmail = room?.counterpartyEmail || counterpartyEmailProp || "";

  const receivedForBody = useMemo(
    () => messages.filter((m) => m.direction === "RECEIVED"),
    [messages]
  );

  const allAttachments = useMemo(() => {
    const out = [];
    for (const m of messages) {
      for (const url of m.attachmentUrls || []) {
        out.push({ url, messageId: m.id, direction: m.direction, createdAt: m.createdAt });
      }
    }
    return out.reverse();
  }, [messages]);

  const selectedBodyMessage = receivedForBody[bodyIndex] || receivedForBody[receivedForBody.length - 1] || null;

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    const attachmentUrls = pendingAttachments.map((a) => a.url);
    setSending(true);
    try {
      const data = await sendMailTalkMessage(roomId, {
        chatBody: text,
        attachmentUrls
      });
      setDraft("");
      setPendingAttachments([]);
      if (data.message) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.message.id,
            direction: data.message.direction || "SENT",
            bodyText: data.message.bodyText,
            subject: data.message.subject,
            attachmentUrls,
            createdAt: data.message.createdAt
          }
        ]);
      } else {
        await loadMessages();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "발송 실패");
    } finally {
      setSending(false);
    }
  };

  const handlePickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadPct(0);
    setError("");
    try {
      const url = await uploadMailTalkAttachment(file, setUploadPct);
      setPendingAttachments((prev) => [...prev, { url, name: file.name }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${isDarkMode ? "bg-[#0b1220] text-gray-100" : "bg-white"}`}>
      <header
        className={`flex shrink-0 items-center gap-2 border-b px-2 py-2 ${
          isDarkMode ? "border-white/10" : "border-gray-100"
        }`}
      >
        <BackButton onClick={onBack} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-black">{counterpartyEmail.split("@")[0] || "메일톡"}</p>
          <p className="truncate text-[11px] text-gray-500">{counterpartyEmail}</p>
        </div>
      </header>

      <div
        className={`flex shrink-0 border-b ${isDarkMode ? "border-white/10 bg-[#0f172a]" : "border-gray-100 bg-gray-50"}`}
        role="tablist"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-center text-[12px] font-bold transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-blue-600 text-blue-600"
                : isDarkMode
                  ? "text-gray-400"
                  : "text-gray-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="shrink-0 bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-gray-500">불러오는 중…</div>
      ) : null}

      {!loading && activeTab === "chat" ? (
        <>
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-gray-400">아직 대화가 없습니다. 첫 메일을 보내 보세요.</p>
            ) : (
              messages.map((m) => {
                const sent = m.direction === "SENT";
                return (
                  <div key={m.id} className={`mb-3 flex ${sent ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${
                        sent
                          ? "rounded-br-md bg-blue-600 text-white"
                          : isDarkMode
                            ? "rounded-bl-md bg-[#1e293b] text-gray-100"
                            : "rounded-bl-md bg-gray-100 text-gray-900"
                      }`}
                    >
                      {m.subject ? (
                        <p className={`mb-1 text-[10px] font-bold ${sent ? "text-blue-100" : "text-gray-500"}`}>
                          {m.subject}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">{m.bodyText}</p>
                      {(m.attachmentUrls || []).length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {m.attachmentUrls.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className={`rounded-lg px-2 py-1 text-[11px] font-semibold underline ${
                                sent ? "text-blue-100" : "text-blue-600"
                              }`}
                            >
                              📎 {fileNameFromUrl(url)}
                            </a>
                          ))}
                        </div>
                      ) : null}
                      <p className={`mt-1 text-[10px] ${sent ? "text-blue-200" : "text-gray-400"}`}>
                        {formatMailTalkTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {pendingAttachments.length > 0 ? (
            <div className="shrink-0 flex flex-wrap gap-1 border-t px-3 py-2">
              {pendingAttachments.map((a) => (
                <span
                  key={a.url}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[11px] text-blue-700"
                >
                  📎 {a.name}
                  <button
                    type="button"
                    className="text-red-500"
                    onClick={() => setPendingAttachments((prev) => prev.filter((x) => x.url !== a.url))}
                    aria-label="첨부 제거"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {uploading ? (
            <div className="shrink-0 px-3 pb-1">
              <div className="h-1 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full bg-blue-600 transition-all" style={{ width: `${uploadPct}%` }} />
              </div>
            </div>
          ) : null}

          <div
            className={`flex shrink-0 items-end gap-2 border-t px-2 py-2 pb-[calc(8px+env(safe-area-inset-bottom,0px))] ${
              isDarkMode ? "border-white/10" : "border-gray-100"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
              onChange={handlePickFile}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || sending}
              className="shrink-0 rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
              aria-label="파일 첨부"
              title="파일 첨부"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.64 16.9a2 2 0 01-2.83-2.83l8.49-8.49" />
              </svg>
            </button>
            <textarea
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="메일톡 메시지…"
              className={`max-h-24 min-h-[40px] flex-1 resize-none rounded-2xl border px-3 py-2 text-[14px] outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 ${
                isDarkMode ? "border-white/10 bg-[#1e293b]" : "border-gray-200 bg-gray-50"
              }`}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!draft.trim() || sending || uploading}
              className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40"
            >
              {sending ? "…" : "전송"}
            </button>
          </div>
        </>
      ) : null}

      {!loading && activeTab === "body" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {receivedForBody.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-gray-400">수신된 메일 본문이 없습니다.</p>
          ) : (
            <>
              {receivedForBody.length > 1 ? (
                <div className="mb-3 flex flex-wrap gap-1">
                  {receivedForBody.map((m, idx) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setBodyIndex(idx)}
                      className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                        bodyIndex === idx ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {formatMailTalkTime(m.createdAt)}
                    </button>
                  ))}
                </div>
              ) : null}
              {selectedBodyMessage ? (
                <article className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <h2 className="mb-2 text-[16px] font-black text-gray-900">
                    {selectedBodyMessage.subject || "(제목 없음)"}
                  </h2>
                  <p className="mb-4 text-[11px] text-gray-400">{formatMailTalkTime(selectedBodyMessage.createdAt)}</p>
                  {selectedBodyMessage.bodyHtml ? (
                    <div
                      className="prose prose-sm max-w-none email-body-view"
                      dangerouslySetInnerHTML={{ __html: selectedBodyMessage.bodyHtml }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap break-words font-sans text-[14px] leading-relaxed text-gray-800">
                      {selectedBodyMessage.rawBodyText || selectedBodyMessage.bodyText}
                    </pre>
                  )}
                </article>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {!loading && activeTab === "files" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {allAttachments.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-gray-400">첨부파일이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {allAttachments.map((item) => (
                <a
                  key={`${item.messageId}-${item.url}`}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
                >
                  {isImageUrl(item.url) ? (
                    <img src={item.url} alt="" className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-gray-50 text-3xl">📄</div>
                  )}
                  <div className="p-2">
                    <p className="truncate text-[11px] font-bold text-gray-800">{fileNameFromUrl(item.url)}</p>
                    <p className="text-[10px] text-gray-400">
                      {item.direction === "SENT" ? "보냄" : "받음"} · {formatMailTalkTime(item.createdAt)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
