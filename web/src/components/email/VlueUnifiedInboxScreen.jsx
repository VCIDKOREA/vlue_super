import { useCallback, useEffect, useState } from "react";
import {
  fetchEmailInbox,
  fetchEmailInboxDetail,
  sendOutboundEmail,
  emitEmailInboxChanged
} from "../../lib/vlueEmailMappingsApi.js";
import BackButton from "../common/BackButton";

function formatWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

function sourceLabel(mailSource) {
  if (mailSource === "EXTERNAL_IMAP") return "외부";
  return "VLUE";
}

function sourceBadgeClass(mailSource, isDarkMode) {
  if (mailSource === "EXTERNAL_IMAP") {
    return isDarkMode ? "bg-violet-500/15 text-violet-200" : "bg-violet-50 text-violet-700";
  }
  return isDarkMode ? "bg-primary-500/15 text-primary-200" : "bg-primary-50 text-primary-700";
}

export default function VlueUnifiedInboxScreen({
  open = true,
  onClose,
  onOpenSettings,
  isDarkMode = false
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchEmailInbox();
    setItems(data.inbox || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    load();
    const onEvt = () => load();
    window.addEventListener("vlue-email-inbox-changed", onEvt);
    return () => window.removeEventListener("vlue-email-inbox-changed", onEvt);
  }, [open, load]);

  useEffect(() => {
    if (!selected?.id) {
      setDetail(null);
      return;
    }
    fetchEmailInboxDetail(selected.id).then((data) => {
      setDetail(data.mail || null);
    });
  }, [selected]);

  const openReply = () => {
    const from = detail?.fromAddress || selected?.fromAddress || "";
    setComposeTo(from);
    setComposeSubject(
      String(detail?.subject || selected?.subject || "").startsWith("Re:")
        ? detail?.subject || selected?.subject || ""
        : `Re: ${detail?.subject || selected?.subject || ""}`
    );
    setComposeBody("");
    setComposeOpen(true);
    setSendError("");
  };

  const handleSend = async () => {
    setSending(true);
    setSendError("");
    try {
      await sendOutboundEmail({
        to: composeTo,
        subject: composeSubject,
        text: composeBody
      });
      setComposeOpen(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      emitEmailInboxChanged();
      await load();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "발송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const head = isDarkMode ? "text-gray-100" : "text-[#191f28]";
  const muted = "text-[#8b95a1]";
  const shellBg = isDarkMode ? "bg-[#0f1118]" : "bg-[#f7f8fa]";
  const panelBg = isDarkMode ? "bg-[#151821] border-white/8" : "bg-white border-[#f0f1f3]";

  if (selected) {
    return (
      <div className={`fixed inset-0 z-[150] flex flex-col ${shellBg}`}>
        <header className={`flex items-center gap-2 border-b px-4 py-3.5 ${isDarkMode ? "border-white/8 bg-[#151821]" : "border-[#f0f1f3] bg-white"}`}>
          <BackButton variant="inline" onBack={() => setSelected(null)} />
          <p className={`vlue-type-title min-w-0 flex-1 truncate ${head}`}>
            {selected.subject || "(제목 없음)"}
          </p>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <article className={`rounded-2xl border p-4 ${panelBg}`}>
            <p className="vlue-type-caption text-[#8b95a1]">보낸 사람</p>
            <p className={`vlue-type-subtitle mt-1 ${head}`}>
              {detail?.fromAddress || selected.fromAddress}
            </p>
            <div className="my-4 h-px bg-[#f0f1f3] dark:bg-white/8" />
            <p className="vlue-type-caption text-[#8b95a1]">받은 시각</p>
            <p className={`vlue-type-body mt-1 ${muted}`}>
              {formatWhen(detail?.receivedAt || selected.receivedAt)}
            </p>
            <div className="my-4 h-px bg-[#f0f1f3] dark:bg-white/8" />
            <p className={`vlue-type-body whitespace-pre-wrap leading-[1.7] ${head}`}>
              {detail?.bodyText || detail?.snippet || selected.snippet || "본문 미리보기가 없습니다."}
            </p>
          </article>
          {selected.direction !== "outbound" ? (
            <button
              type="button"
              onClick={openReply}
              className="vlue-promo-card__cta mt-4 !w-full"
            >
              답장
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (composeOpen) {
    return (
      <div className={`fixed inset-0 z-[150] flex flex-col ${shellBg}`}>
        <header className={`flex items-center gap-2 border-b px-4 py-3.5 ${isDarkMode ? "border-white/8 bg-[#151821]" : "border-[#f0f1f3] bg-white"}`}>
          <BackButton variant="inline" onBack={() => setComposeOpen(false)} />
          <p className={`vlue-type-title flex-1 ${head}`}>메일 작성</p>
          <button
            type="button"
            disabled={sending}
            onClick={handleSend}
            className="vlue-promo-card__cta !w-auto px-3.5 py-2"
          >
            {sending ? "발송 중…" : "보내기"}
          </button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <input
            type="email"
            value={composeTo}
            onChange={(e) => setComposeTo(e.target.value)}
            placeholder="받는 사람"
            className={`w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none ${isDarkMode ? "border-white/10 bg-[#151821] text-white" : "border-[#e5e8eb] bg-white"}`}
          />
          <input
            type="text"
            value={composeSubject}
            onChange={(e) => setComposeSubject(e.target.value)}
            placeholder="제목"
            className={`w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none ${isDarkMode ? "border-white/10 bg-[#151821] text-white" : "border-[#e5e8eb] bg-white"}`}
          />
          <textarea
            value={composeBody}
            onChange={(e) => setComposeBody(e.target.value)}
            placeholder="내용"
            rows={12}
            className={`w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none ${isDarkMode ? "border-white/10 bg-[#151821] text-white" : "border-[#e5e8eb] bg-white"}`}
          />
          {sendError ? <p className="text-[12px] text-rose-500">{sendError}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[150] flex flex-col ${shellBg}`}>
      <header className={`flex items-center gap-2 border-b px-4 py-3.5 ${isDarkMode ? "border-white/8 bg-[#151821]" : "border-[#f0f1f3] bg-white"}`}>
        {onClose ? <BackButton variant="inline" onBack={onClose} /> : null}
        <div className="min-w-0 flex-1">
          <p className={`vlue-type-title ${head}`}>통합 메일함</p>
          <p className={`vlue-type-caption ${muted}`}>가상 메일 · 외부 연동</p>
        </div>
        {onOpenSettings ? (
          <button type="button" onClick={onOpenSettings} className="vlue-promo-card__cta !w-auto px-3.5 py-2">
            설정
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setComposeTo("");
            setComposeSubject("");
            setComposeBody("");
            setSendError("");
            setComposeOpen(true);
          }}
          className="vlue-promo-card__cta !w-auto px-3.5 py-2"
        >
          작성
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <p className={`vlue-type-body py-16 text-center ${muted}`}>불러오는 중…</p>
        ) : items.length === 0 ? (
          <div className={`rounded-2xl border px-5 py-14 text-center ${panelBg}`}>
            <p className="text-2xl" aria-hidden>
              📭
            </p>
            <p className={`vlue-type-subtitle mt-3 ${head}`}>받은 메일이 없어요</p>
            <p className={`vlue-type-body mt-1.5 ${muted}`}>
              @vlue.kr로 메일이 오면 여기에 표시됩니다
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((row) => (
              <li key={row.id}>
                <button type="button" onClick={() => setSelected(row)} className={`vlue-inbox-item w-full ${panelBg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`vlue-chip ${sourceBadgeClass(row.mailSource, isDarkMode)}`}>
                      {sourceLabel(row.mailSource)}
                    </span>
                    <span className={`vlue-type-caption ml-auto ${muted}`}>{formatWhen(row.receivedAt)}</span>
                  </div>
                  <p className={`vlue-type-caption mt-2.5 ${muted}`}>{row.fromAddress}</p>
                  <p className={`vlue-type-subtitle mt-0.5 ${head}`}>{row.subject || "(제목 없음)"}</p>
                  <p className={`vlue-type-body mt-1.5 line-clamp-2 ${muted}`}>{row.snippet}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
