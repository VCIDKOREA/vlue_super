import { useEffect, useState } from "react";
import {
  consentCountsFromStatus,
  isSameVlueUser,
  resolveMyIdentityIds
} from "../../lib/vmingConsentUi.js";
import { isVmingPanelCollapsed, setVmingPanelCollapsed } from "../../lib/chatRoomPrefsStorage.js";

export default function VmingConsentStatusCard({
  roomId = "",
  status,
  isHost = false,
  myUserId = "",
  onReRequest,
  onEvict,
  onWithdraw,
  isDarkMode = false
}) {
  const [expanded, setExpanded] = useState(() => !isVmingPanelCollapsed(roomId));

  useEffect(() => {
    setExpanded(!isVmingPanelCollapsed(roomId));
  }, [roomId]);

  if (!status?.isActive && !status?.members?.length) return null;

  const { accepted, required } = consentCountsFromStatus(status);
  const pct = required > 0 ? Math.round((accepted / required) * 100) : 0;
  const myIds = resolveMyIdentityIds(myUserId);
  const myRow = status.members?.find((m) => myIds.some((id) => isSameVlueUser(id, m.userId)));
  const card = isDarkMode
    ? "border-white/10 bg-[#151821]/90 text-white"
    : "border-slate-200 bg-white text-slate-900";

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    setVmingPanelCollapsed(roomId, !next);
  };

  return (
    <div className={`mx-3 mb-2 rounded-2xl border shadow-sm ${card}`}>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        onClick={toggleExpanded}
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-black">브이밍 {status.isActive ? "활성" : "대기"}</p>
          {!expanded ? (
            <p className="mt-0.5 text-[11px] opacity-70">
              동의 {accepted}/{required}명
              {status.roomExpiresAt
                ? ` · 만료 ${new Date(status.roomExpiresAt).toLocaleDateString("ko-KR")}`
                : ""}
            </p>
          ) : null}
        </div>
        {expanded && status.roomExpiresAt ? (
          <span className="shrink-0 text-[10px] opacity-60">
            만료 {new Date(status.roomExpiresAt).toLocaleDateString("ko-KR")}
          </span>
        ) : null}
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300 ${
            expanded ? "rotate-180" : ""
          } transition-transform`}
          aria-hidden
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-slate-100 px-3 pb-3 pt-2 dark:border-white/10">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[11px] opacity-70">
            동의현황 {accepted}/{required}명
          </p>
          <ul className="mt-2 flex flex-wrap gap-1 text-[11px]">
            {status.members
              ?.filter((m) => m.userId !== status.requestedBy)
              .map((m) => (
                <li
                  key={m.userId}
                  className={`rounded-full px-2 py-0.5 ${
                    m.isValid
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                      : "bg-slate-100 dark:bg-white/10"
                  }`}
                >
                  {m.isValid ? "✓" : m.consentStatus === "pending" ? "⏳" : "✗"} {m.userName}
                </li>
              ))}
          </ul>
          {myRow?.isValid && !isHost ? (
            <button type="button" className="mt-2 text-[11px] font-bold text-red-600" onClick={onWithdraw}>
              동의 철회
            </button>
          ) : null}
          {isHost ? (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg bg-slate-100 py-1.5 text-[11px] font-bold dark:bg-white/10"
                onClick={onReRequest}
              >
                재요청
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg bg-red-50 py-1.5 text-[11px] font-bold text-red-700 dark:bg-red-950/40"
                onClick={onEvict}
              >
                브이밍보내기
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
