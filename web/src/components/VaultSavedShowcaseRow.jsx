import { useState } from "react";
import { SHOWCASE_STYLE_TYPES } from "../lib/showcase/showcaseStyleTypes.js";
import { formatLetteringPhoneDisplay } from "../lib/letteringPhoneMatch.js";
import {
  isVlueBrandOrganization,
  resolveSavedShowcasePersonLine
} from "../lib/letteringPaidIdentityDisplay.js";
import ShowcaseStylePreview from "./showcase/ShowcaseStylePreview.jsx";
import "./showcase/showcase-style-settings.css";

function formatSavedAt(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function VaultSavedShowcaseRow({ item, onRemove, isDarkMode = false }) {
  const [expanded, setExpanded] = useState(false);
  const snap = item?.snapshot && typeof item.snapshot === "object" ? item.snapshot : {};
  const styleConfig = snap.showcaseStyle || {};
  const styleMeta = SHOWCASE_STYLE_TYPES[styleConfig.styleType] || SHOWCASE_STYLE_TYPES.default;
  const rawOrg = String(snap.organization || snap.companyName || "").trim();
  const org = isVlueBrandOrganization(rawOrg) ? "" : rawOrg;
  const personLine = resolveSavedShowcasePersonLine(snap);
  const phone = formatLetteringPhoneDisplay(snap.phone) || String(snap.phone || "").trim();
  const displayName = org || personLine || phone || "저장된 케이스";
  const subtitle = org && personLine ? personLine : "";
  const savedLabel = formatSavedAt(item?.savedAt || styleConfig.scrapedAt);

  return (
    <li
      className={`rounded-2xl p-4 shadow-sm ring-1 ${
        isDarkMode ? "bg-white/5 ring-white/10" : "bg-white ring-slate-100"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 text-left"
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[22px]"
          style={{ backgroundColor: `${styleMeta.accent || "#2b6ff0"}22` }}
          aria-hidden
        >
          {styleMeta.emoji || "📱"}
        </span>
        <span className="min-w-0 flex-1">
          <p className={`text-[12px] font-semibold ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
            {styleMeta.label} 케이스
          </p>
          <p className={`mt-0.5 text-[16px] font-black leading-snug ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
            {displayName}
          </p>
          {subtitle ? (
            <p className={`mt-0.5 text-[12px] font-semibold ${isDarkMode ? "text-gray-300" : "text-slate-600"}`}>{subtitle}</p>
          ) : null}
          {phone ? (
            <p className={`mt-1 text-[13px] font-medium tabular-nums ${isDarkMode ? "text-gray-300" : "text-slate-700"}`}>
              {phone}
            </p>
          ) : null}
          {savedLabel ? (
            <p className={`mt-1 text-[10px] font-bold ${isDarkMode ? "text-blue-300" : "text-blue-600"}`}>
              저장 {savedLabel}
            </p>
          ) : null}
        </span>
        <span className={`shrink-0 text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-slate-400"}`}>
          {expanded ? "접기" : "보기"}
        </span>
      </button>

      {expanded ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/80 p-2 dark:border-white/10 dark:bg-black/20">
          <ShowcaseStylePreview
            styleConfig={styleConfig}
            card={snap}
            membershipTier={snap.membershipTier || "free"}
            phase="replay"
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => onRemove?.(item.userId)}
        className={`mt-3 w-full rounded-lg py-2 text-[12px] font-bold ${
          isDarkMode ? "text-gray-500 hover:bg-red-500/15 hover:text-red-400" : "text-slate-400 hover:bg-red-50 hover:text-red-600"
        }`}
      >
        삭제
      </button>
    </li>
  );
}
