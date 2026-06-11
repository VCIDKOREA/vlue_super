/** 말풍선 하단 확장 번역 스트립 */
export default function ChatMessageTranslation({
  visible,
  loading,
  translated,
  targetLang = "en",
  source,
  cacheHit,
  isMe,
  isDarkMode
}) {
  if (!visible && !loading) return null;

  const shell = isMe
    ? "border-blue-400/30 bg-blue-950/30 text-blue-50"
    : isDarkMode
      ? "border-white/10 bg-[#111827] text-gray-200"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`mt-1 w-full max-w-full rounded-xl border px-2.5 py-2 text-[12px] leading-relaxed ${shell}`}>
      <div className="mb-0.5 flex items-center gap-1.5">
        <span className="text-[9px] font-black uppercase tracking-wide opacity-70">
          🌐 {String(targetLang).toUpperCase()}
        </span>
        {cacheHit ? (
          <span className="rounded bg-emerald-500/20 px-1 py-0.5 text-[8px] font-bold text-emerald-600">캐시</span>
        ) : null}
        {source === "gemini" || source === "mlkit" ? (
          <span className="text-[8px] font-semibold opacity-50">{source}</span>
        ) : null}
      </div>
      {loading ? (
        <p className="animate-pulse text-[11px] opacity-70">번역 중…</p>
      ) : (
        <p className="whitespace-pre-wrap break-words">{translated || "—"}</p>
      )}
    </div>
  );
}
