import { useMemo } from "react";
import { readAvatar } from "../lib/vlueAvatar.js";
import { withLetteringBizcardPreviewFallback } from "../lib/letteringBizcardProfile.js";
import VLUE_SHIELD_LOGO from "../assets/vlue-shield-logo.svg?url";

function buildTags(card) {
  const tags = [];
  const title = String(card.title || "").trim();
  const dept = String(card.department || "").trim();
  if (dept) tags.push(dept);
  if (title && title !== dept) tags.push(title);
  const org = String(card.organization || "").trim();
  if (tags.length < 3 && org) tags.push(org.length > 14 ? `${org.slice(0, 13)}…` : org);
  return tags.slice(0, 3);
}

/**
 * 카카오톡 Feed에 전송되는 「명함 카드」 UI 미리보기 (카카오 비즈니스 채널 스타일)
 */
export default function KakaoBizcardFeedPreview({ card, className = "", isDarkMode = false }) {
  const snap = useMemo(() => withLetteringBizcardPreviewFallback(card || {}), [card]);
  const name = String(snap.name || "회원").trim();
  const org = String(snap.organization || "").trim();
  const title = String(snap.title || "").trim();
  const dept = String(snap.department || "").trim();
  const roleLine = [dept, title].filter(Boolean).join(" | ");
  const tags = useMemo(() => buildTags(snap), [snap]);
  const avatarUrl = readAvatar("card") || readAvatar("primary") || "";
  const initial = (name.replace(/\s/g, "").slice(0, 1) || "V").toUpperCase();

  return (
    <div
      className={`mt-2 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_28px_-8px_rgba(15,23,42,0.28)] ${className}`}
      aria-label="카카오 명함 카드 미리보기"
    >
      <div className="bg-[#0b1a33] px-3.5 pb-3.5 pt-3.5">
        <div className="flex items-start gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white/20 bg-slate-700">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[18px] font-black text-white/90">
                {initial}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-[17px] font-black leading-tight text-white">{name}</p>
            {roleLine ? (
              <p className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug text-slate-200">{roleLine}</p>
            ) : null}
            {org ? <p className="mt-0.5 truncate text-[12px] font-medium text-slate-300">{org}</p> : null}
          </div>
        </div>
        {tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-white/10 px-2.5 py-1 text-[12px] font-bold leading-snug text-slate-100 ring-1 ring-white/15"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className={`px-3.5 py-3 ${isDarkMode ? "bg-[#151821]" : "bg-white"}`}>
        <p className={`text-center text-[14px] font-bold leading-snug ${isDarkMode ? "text-gray-200" : "text-slate-800"}`}>
          <span className={isDarkMode ? "text-white" : "text-slate-900"}>{name}</span>
          <span className={`font-semibold ${isDarkMode ? "text-gray-400" : "text-slate-600"}`}>님의 명함을 확인하세요.</span>
        </p>
        <div
          className={`mt-2.5 flex h-11 w-full items-center justify-center rounded-xl text-[14px] font-black ${
            isDarkMode ? "bg-blue-600/30 text-blue-100 ring-1 ring-blue-400/40" : "bg-[#eceff3] text-slate-800"
          }`}
          aria-hidden
        >
          명함 확인
        </div>
        <div className={`mt-2.5 flex items-center justify-between border-t pt-2 ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
          <div className="flex min-w-0 items-center gap-1.5">
            <img src={VLUE_SHIELD_LOGO} alt="" className="h-5 w-5 shrink-0 object-contain" />
            <span className="truncate text-[13px] font-black text-slate-700">VLUE</span>
          </div>
          <span className="text-[14px] font-bold text-slate-400" aria-hidden>
            ›
          </span>
        </div>
      </div>
    </div>
  );
}
