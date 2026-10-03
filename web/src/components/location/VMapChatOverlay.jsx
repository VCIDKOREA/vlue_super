import { useEffect, useMemo, useRef, useState } from "react";

const PEEK_MS = 2800;
const COLLAPSED_H = 40;
const PEEK_H = 148;
const EXPANDED_H = 220;

function previewText(row) {
  if (!row) return "";
  if (row.kind === "voice") return "🎤 음성 메시지";
  if (row.kind === "system") return String(row.body || "");
  return String(row.body || "");
}

/**
 * V-Map · 가족 위치방 공통 채팅 오버레이
 * - 기본: 하단 1줄
 * - 새 메시지: 4~5줄 슬라이드 업 → 2~3초 후 다운
 * - 탭: 고정 확장 + 스크롤 히스토리
 */
export default function VMapChatOverlay({
  messages = [],
  dark = true,
  playingVoiceId = "",
  onPlayVoice,
  bottomOffset = 0,
  expandToken = 0
}) {
  const [expanded, setExpanded] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const lastIdRef = useRef("");
  const peekTimerRef = useRef(0);
  const listRef = useRef(null);
  const skipFirstRef = useRef(true);

  useEffect(() => {
    if (!expandToken) return;
    setExpanded(true);
    setPeeking(false);
    window.clearTimeout(peekTimerRef.current);
  }, [expandToken]);

  const sorted = useMemo(() => {
    const list = Array.isArray(messages) ? [...messages] : [];
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return list;
  }, [messages]);

  const latest = sorted.length ? sorted[sorted.length - 1] : null;
  const latestId = latest ? String(latest.id || "") : "";

  useEffect(() => {
    if (!latestId) return;
    if (skipFirstRef.current) {
      skipFirstRef.current = false;
      lastIdRef.current = latestId;
      return;
    }
    if (latestId === lastIdRef.current) return;
    lastIdRef.current = latestId;
    if (expanded) {
      requestAnimationFrame(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
      return;
    }
    setPeeking(true);
    window.clearTimeout(peekTimerRef.current);
    peekTimerRef.current = window.setTimeout(() => setPeeking(false), PEEK_MS);
    return () => window.clearTimeout(peekTimerRef.current);
  }, [latestId, expanded]);

  useEffect(() => {
    if (!expanded && !peeking) return;
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [expanded, peeking, sorted.length]);

  const mode = expanded ? "expanded" : peeking ? "peek" : "collapsed";
  const height = expanded ? EXPANDED_H : peeking ? PEEK_H : COLLAPSED_H;
  const visibleRows = expanded || peeking ? sorted.slice(-40) : latest ? [latest] : [];

  const panel = dark
    ? "border-white/12 bg-[#04121a]/92 text-white"
    : "border-black/10 bg-white/92 text-slate-900";

  if (!sorted.length && !expanded) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-3 z-20 flex flex-col justify-end"
      style={{ bottom: `calc(${8 + Number(bottomOffset) || 0}px + env(safe-area-inset-bottom, 0px))` }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={expanded ? "채팅 접기" : "채팅 펼치기"}
        onClick={() => {
          setExpanded((v) => !v);
          setPeeking(false);
          window.clearTimeout(peekTimerRef.current);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setExpanded((v) => !v);
            setPeeking(false);
          }
        }}
        className={`pointer-events-auto overflow-hidden rounded-[22px] border shadow-[0_12px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-[height,transform,opacity] duration-300 ease-out ${panel}`}
        style={{
          height,
          transform: mode === "collapsed" ? "translateY(0)" : "translateY(0)"
        }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
          <span className="text-[11px] font-semibold tracking-tight text-[#00D2FF]">
            {expanded ? "대화 · 스크롤" : peeking ? "새 메시지" : "최근 대화"}
          </span>
          <span className="text-[10px] opacity-60">{expanded ? "탭하여 접기" : "탭하여 고정"}</span>
        </div>

        <div
          ref={listRef}
          className={`px-2.5 pb-2 ${expanded || peeking ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}
          style={{ height: height - 28 }}
          onClick={(event) => {
            if (expanded) event.stopPropagation();
          }}
        >
          {!visibleRows.length ? (
            <p className="px-1 py-2 text-[12px] opacity-60">아직 대화가 없습니다.</p>
          ) : (
            <ul className="flex flex-col justify-end gap-1.5 py-1">
              {visibleRows.map((row) => (
                <li key={row.id} className="flex min-w-0 items-start gap-1.5 text-[13px] leading-snug">
                  <span className="shrink-0 font-semibold text-[#00D2FF]">{row.displayName || "멤버"}</span>
                  {row.kind === "voice" ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full bg-[#00D2FF]/18 px-2 py-0.5 text-[12px] font-semibold text-[#00D2FF]"
                      onClick={(event) => {
                        event.stopPropagation();
                        onPlayVoice?.(row);
                      }}
                    >
                      {playingVoiceId === row.id ? "❚❚" : "▶"} 음성
                    </button>
                  ) : (
                    <span className={`min-w-0 break-words ${row.kind === "system" ? "opacity-75" : ""}`}>
                      {mode === "collapsed" ? previewText(row).slice(0, 72) : previewText(row)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
