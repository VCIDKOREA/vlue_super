import { useCallback, useEffect, useMemo, useState } from "react";
import ModalCloseButton from "../common/ModalCloseButton.tsx";
import { fetchMailTalkRooms, formatMailTalkTime, sendMailTalkMessage } from "../../lib/mailTalkApi.js";
import { isElectronApp } from "../../lib/electronBridge.js";

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

/**
 * 장문 메일 인앱 전용 뷰어 — 외부 브라우저로 이탈하지 않음
 */
export default function MailTalkLongFormViewer({
  message,
  roomId,
  counterpartyEmail = "",
  rooms = [],
  isDarkMode = false,
  onClose,
  onSent
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardTargets, setForwardTargets] = useState(rooms);
  const [forwardRoomId, setForwardRoomId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (rooms.length) {
      setForwardTargets(rooms);
      return;
    }
    fetchMailTalkRooms()
      .then(setForwardTargets)
      .catch(() => setForwardTargets([]));
  }, [rooms]);

  const attachments = message?.attachmentUrls || [];

  const bodyHtml = message?.bodyHtml;
  const bodyText = message?.rawBodyText || message?.bodyText || "";

  const quotedForwardBody = useMemo(() => {
    const subject = message?.subject ? `[Fwd: ${message.subject}]\n\n` : "";
    return `${subject}${bodyText}`.trim();
  }, [bodyText, message?.subject]);

  const handleContentClick = useCallback((e) => {
    const anchor = e.target.closest("a");
    if (anchor?.href) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const handleReplySend = async () => {
    const text = replyDraft.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      await sendMailTalkMessage(roomId, { chatBody: text });
      setReplyDraft("");
      setReplyOpen(false);
      onSent?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "답장 발송 실패");
    } finally {
      setSending(false);
    }
  };

  const handleForwardSend = async () => {
    const targetId = forwardRoomId.trim();
    if (!targetId || !quotedForwardBody || sending) return;
    setSending(true);
    setError("");
    try {
      await sendMailTalkMessage(targetId, {
        chatBody: quotedForwardBody,
        subject: message?.subject ? `Fwd: ${message.subject}` : undefined,
        attachmentUrls: attachments
      });
      setForwardOpen(false);
      onSent?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "전달 실패");
    } finally {
      setSending(false);
    }
  };

  const downloadAttachment = (url) => {
    if (isElectronApp()) {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileNameFromUrl(url);
      a.rel = "noopener";
      a.click();
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = fileNameFromUrl(url);
    a.target = "_self";
    a.rel = "noopener";
    a.click();
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="메일 전용 뷰어"
    >
      <div
        className={`mx-auto flex h-full w-full max-w-4xl flex-col shadow-2xl ${
          isDarkMode ? "bg-[#0f172a] text-gray-100" : "bg-white"
        }`}
      >
        <header
          className={`flex shrink-0 items-center gap-2 border-b px-4 py-3 ${
            isDarkMode ? "border-white/10" : "border-gray-200"
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-blue-600">인앱 메일 뷰어</p>
            <h2 className="truncate text-[16px] font-black">{message?.subject || "(제목 없음)"}</h2>
            <p className="text-[11px] text-gray-500">
              {counterpartyEmail} · {formatMailTalkTime(message?.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReplyOpen((v) => !v)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-bold text-white"
          >
            ↩️ 답장
          </button>
          <button
            type="button"
            onClick={() => setForwardOpen(true)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-bold ${
              isDarkMode ? "bg-white/10" : "bg-gray-100 text-gray-800"
            }`}
          >
            ▶️ 전달
          </button>
          <ModalCloseButton onClick={onClose} />
        </header>

        {error ? (
          <div className="shrink-0 bg-red-50 px-4 py-2 text-[12px] text-red-600">{error}</div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {bodyHtml ? (
            <div
              className="email-body-view prose prose-sm max-w-none"
              onClick={handleContentClick}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : (
            <pre className="whitespace-pre-wrap break-words font-sans text-[14px] leading-relaxed">
              {bodyText}
            </pre>
          )}

          {attachments.length > 0 ? (
            <section
              className={`mt-6 rounded-xl border p-4 ${
                isDarkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"
              }`}
            >
              <h3 className="mb-3 text-[13px] font-black">📎 첨부파일</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {attachments.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => downloadAttachment(url)}
                    className={`flex flex-col overflow-hidden rounded-lg border text-left ${
                      isDarkMode ? "border-white/10 bg-[#1e293b]" : "border-gray-200 bg-white"
                    }`}
                  >
                    {isImageUrl(url) ? (
                      <img src={url} alt="" className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="flex aspect-video items-center justify-center text-2xl">📄</div>
                    )}
                    <span className="truncate p-2 text-[11px] font-bold">{fileNameFromUrl(url)}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {replyOpen ? (
          <footer
            className={`shrink-0 border-t px-4 py-3 ${
              isDarkMode ? "border-white/10 bg-[#0b1220]" : "border-gray-200 bg-gray-50"
            }`}
          >
            <p className="mb-2 text-[12px] font-bold text-blue-600">↩️ 인라인 답장</p>
            <textarea
              rows={3}
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder="답장 내용을 입력하세요…"
              className={`mb-2 w-full resize-none rounded-xl border px-3 py-2 text-[14px] outline-none ${
                isDarkMode ? "border-white/10 bg-[#1e293b]" : "border-gray-200 bg-white"
              }`}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReplyOpen(false)}
                className="rounded-lg px-3 py-1.5 text-[12px] font-bold text-gray-500"
              >
                취소
              </button>
              <button
                type="button"
                disabled={!replyDraft.trim() || sending}
                onClick={handleReplySend}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-[12px] font-bold text-white disabled:opacity-40"
              >
                {sending ? "발송 중…" : "이메일 답장 발송"}
              </button>
            </div>
          </footer>
        ) : null}
      </div>

      {forwardOpen ? (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div
            className={`w-full max-w-md rounded-2xl p-5 shadow-xl ${
              isDarkMode ? "bg-[#1e293b]" : "bg-white"
            }`}
          >
            <h3 className="text-[15px] font-black">▶️ 메일 전달</h3>
            <p className="mt-1 text-[12px] text-gray-500">전달할 메일톡방을 선택하세요.</p>
            <select
              value={forwardRoomId}
              onChange={(e) => setForwardRoomId(e.target.value)}
              className={`mt-3 w-full rounded-xl border px-3 py-2 text-[13px] ${
                isDarkMode ? "border-white/10 bg-[#0f172a]" : "border-gray-200"
              }`}
            >
              <option value="">선택…</option>
              {forwardTargets.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.counterpartyEmail}
                </option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForwardOpen(false)}
                className="rounded-lg px-3 py-1.5 text-[12px] font-bold text-gray-500"
              >
                취소
              </button>
              <button
                type="button"
                disabled={!forwardRoomId || sending}
                onClick={handleForwardSend}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-[12px] font-bold text-white disabled:opacity-40"
              >
                전달 발송
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
