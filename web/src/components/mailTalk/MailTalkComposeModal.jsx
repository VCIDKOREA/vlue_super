import { useState } from "react";
import ModalCloseButton from "../common/ModalCloseButton.tsx";
import { sendMailTalkNew } from "../../lib/mailTalkApi.js";

export default function MailTalkComposeModal({ open, onClose, onSent, isDarkMode = false }) {
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const counterpartyEmail = email.trim();
    const chatBody = body.trim();
    if (!counterpartyEmail || !chatBody) return;
    setSending(true);
    setError("");
    try {
      const data = await sendMailTalkNew({
        counterpartyEmail,
        chatBody,
        subject: subject.trim() || undefined
      });
      onSent?.(data.roomId, counterpartyEmail);
      setEmail("");
      setBody("");
      setSubject("");
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "발송 실패");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        className={`w-full max-w-md rounded-t-2xl p-4 shadow-xl sm:rounded-2xl ${
          isDarkMode ? "bg-[#0f172a] text-gray-100" : "bg-white"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-black">새 메일톡</h2>
          <ModalCloseButton onClick={onClose} />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-gray-500">거래처 이메일</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@company.com"
              className={`w-full rounded-xl border px-3 py-2 text-[14px] ${
                isDarkMode ? "border-white/10 bg-[#1e293b]" : "border-gray-200"
              }`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-gray-500">제목 (선택)</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 text-[14px] ${
                isDarkMode ? "border-white/10 bg-[#1e293b]" : "border-gray-200"
              }`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-gray-500">메시지</span>
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 text-[14px] ${
                isDarkMode ? "border-white/10 bg-[#1e293b]" : "border-gray-200"
              }`}
            />
          </label>
          {error ? <p className="text-[12px] text-red-500">{error}</p> : null}
          <button
            type="submit"
            disabled={sending}
            className="rounded-xl bg-blue-600 py-3 text-[14px] font-black text-white disabled:opacity-50"
          >
            {sending ? "발송 중…" : "메일톡 발송"}
          </button>
        </form>
      </div>
    </div>
  );
}
