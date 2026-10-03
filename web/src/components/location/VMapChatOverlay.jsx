import { useEffect, useMemo, useRef, useState } from "react";
import VlueCyanVerifiedSeal from "../VlueCyanVerifiedSeal.jsx";

const PEEK_MS = 2800;
const PEEK_H = 160;
const EXPANDED_H = 240;

function previewText(row) {
  if (!row) return "";
  if (row.kind === "voice") return "🎤 음성 메시지";
  if (row.kind === "system") return String(row.body || "");
  return String(row.body || "");
}

function authorPaid(row) {
  return Boolean(row?.cyanBadgeActive ?? row?.paidMember ?? row?.isPaid);
}

/**
 * V-Map · 가족 위치방 공통 채팅 오버레이
 * - 접힘: 단일 행 (잘림/대비 이슈 방지)
 * - 새 메시지: 슬라이드 업 → 자동 접힘
 * - 탭: 고정 확장
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
  const visibleRows = expanded || peeking ? sorted.slice(-40) : latest ? [latest] : [];

  /* 인라인 색 — WebView에서 Tailwind/투명 blur 대비 깨짐 방지 */
  const panelBg = dark ? "#04121a" : "#ffffff";
  const bodyColor = dark ? "#f8fafc" : "#0f172a";
  const metaColor = dark ? "rgba(248,250,252,0.55)" : "rgba(15,23,42,0.5)";
  const borderColor = dark ? "rgba(255,255,255,0.22)" : "rgba(15,23,42,0.12)";

  if (!sorted.length && !expanded) return null;

  const renderAuthor = (row) => {
    const paid = authorPaid(row);
    const name = row.displayName || "멤버";
    return (
      <span className="inline-flex min-w-0 shrink-0 items-center gap-0.5">
        <span className="truncate font-semibold" style={{ color: "#00D2FF" }}>
          {name}
        </span>
        {paid ? <VlueCyanVerifiedSeal size={14} className="shrink-0" title="VLUÉ 유료 인증" /> : null}
        <span className="mx-0.5 font-medium" style={{ color: metaColor }}>
          :
        </span>
      </span>
    );
  };

  const renderBody = (row, compact) => {
    if (row.kind === "voice") {
      return (
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold"
          style={{ background: "rgba(0,210,255,0.18)", color: "#00D2FF" }}
          onClick={(event) => {
            event.stopPropagation();
            onPlayVoice?.(row);
          }}
        >
          {playingVoiceId === row.id ? "❚❚" : "▶"} 음성
        </button>
      );
    }
    return (
      <span
        className={`min-w-0 flex-1 font-semibold ${compact ? "truncate" : "break-words"}`}
        style={{ color: bodyColor, opacity: row.kind === "system" ? 0.75 : 1 }}
      >
        {compact ? previewText(row).slice(0, 72) : previewText(row)}
      </span>
    );
  };

  return (
    <div
      className="pointer-events-none absolute inset-x-3 z-20 flex flex-col justify-end"
      style={{ bottom: Math.max(10, 8 + Number(bottomOffset) || 0) }}
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
        className="pointer-events-auto overflow-hidden rounded-[20px] shadow-[0_12px_36px_rgba(0,0,0,0.35)] transition-[height] duration-250 ease-out"
        style={{
          background: panelBg,
          border: `1px solid ${borderColor}`,
          height: mode === "collapsed" ? 48 : mode === "peek" ? PEEK_H : EXPANDED_H
        }}
      >
        {mode === "collapsed" ? (
          /* 단일 행 — 헤더/본문 분리로 생기던 세로 잘림 제거 */
          <div className="flex h-full items-center gap-2 px-3">
            <div className="flex min-w-0 flex-1 items-center gap-1 text-[13px] leading-none">
              {latest ? (
                <>
                  {renderAuthor(latest)}
                  {renderBody(latest, true)}
                </>
              ) : (
                <span className="text-[12px]" style={{ color: metaColor }}>
                  아직 대화가 없습니다.
                </span>
              )}
            </div>
            <span className="shrink-0 text-[10px] leading-none" style={{ color: metaColor }}>
              탭하여 고정
            </span>
          </div>
        ) : (
          <>
            <div className="flex h-7 shrink-0 items-center justify-between gap-2 px-3">
              <span className="text-[11px] font-semibold leading-none tracking-tight" style={{ color: "#00D2FF" }}>
                {expanded ? "대화 · 스크롤" : "새 메시지"}
              </span>
              <span className="text-[10px] leading-none" style={{ color: metaColor }}>
                {expanded ? "탭하여 접기" : "탭하여 고정"}
              </span>
            </div>
            <div
              ref={listRef}
              className="overflow-y-auto overscroll-contain px-2.5 pb-2"
              style={{ height: (mode === "peek" ? PEEK_H : EXPANDED_H) - 28 }}
              onClick={(event) => {
                if (expanded) event.stopPropagation();
              }}
            >
              {!visibleRows.length ? (
                <p className="px-1 py-2 text-[12px]" style={{ color: metaColor }}>
                  아직 대화가 없습니다.
                </p>
              ) : (
                <ul className="flex flex-col justify-end gap-2 py-1">
                  {visibleRows.map((row) => (
                    <li key={row.id} className="flex min-w-0 items-start gap-1 text-[13px] leading-5">
                      {renderAuthor(row)}
                      {renderBody(row, false)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
