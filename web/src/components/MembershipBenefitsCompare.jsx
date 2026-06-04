import { useEffect, useState } from "react";
import {
  B2B_ENTERPRISE_SUMMARY,
  FAMILY_PROTECTION_B2B_NOTE,
  FAMILY_PROTECTION_SUMMARY,
  VLUER_REFERRAL_B2B_NOTE,
  MEMBERSHIP_BENEFIT_ROWS,
  MEMBERSHIP_PLAN_DETAILS
} from "../lib/membershipBenefits.js";

const TABS = [
  { id: "compare", label: "한눈에 비교" },
  { id: "free", label: "일반" },
  { id: "paid", label: "유료" },
  { id: "b2b", label: "기업" }
];

const COL = "grid grid-cols-4";

function CompareCell({ children, muted, tone = "free" }) {
  const toneClass =
    tone === "paid" || tone === "b2b"
      ? muted
        ? "bg-blue-50/35 text-blue-400/80"
        : "bg-blue-50/50 text-blue-700"
      : muted
        ? "text-slate-400"
        : "text-slate-600";
  return (
    <span
      className={`block px-1 py-2 text-center text-[10px] font-normal leading-[1.35] [word-break:keep-all] ${toneClass}`}
    >
      {children}
    </span>
  );
}

function isMutedValue(v) {
  return v === "—" || v === "해당 없음";
}

/**
 * 멤버십 혜택·서비스 비교 모달
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {"free"|"paid"|"b2b"|"compare"} [initialTab]
 */
export default function MembershipBenefitsCompare({ open, onClose, initialTab = "compare" }) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  if (!open) return null;

  const plan =
    tab === "free" || tab === "paid" || tab === "b2b" ? MEMBERSHIP_PLAN_DETAILS[tab] : null;
  const isCompare = tab === "compare";

  return (
    <div
      className="fixed inset-0 z-[100001] flex items-end justify-center bg-slate-900/45 p-2 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="membership-benefits-title"
    >
      <div className="flex max-h-[min(92vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="shrink-0 border-b border-slate-100 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p id="membership-benefits-title" className="text-[15px] font-semibold tracking-tight text-slate-900">
                멤버십 혜택 · 서비스 비교
              </p>
              <p className="mt-0.5 text-[11px] font-normal text-slate-500">가입 전 한눈에 확인하세요</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              aria-label="닫기"
            >
              닫기
            </button>
          </div>

          <div className="mt-3 flex gap-0.5 rounded-xl bg-slate-100/90 p-0.5 text-[11px] font-medium">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`min-w-0 flex-1 rounded-[10px] py-1.5 transition ${
                  tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 sm:px-4">
          {isCompare ? (
            <div className="w-full">
              <div className="w-full overflow-hidden rounded-xl border border-slate-200/90">
                <div className={`${COL} border-b border-slate-200 bg-slate-50/80`}>
                  <span className="px-2 py-2.5 text-[10px] font-medium text-slate-500">항목</span>
                  <span className="border-l border-slate-200/80 px-1 py-2.5 text-center text-[10px] font-medium text-slate-500">
                    일반
                  </span>
                  <span className="border-l border-blue-100 bg-blue-50/60 px-1 py-2.5 text-center text-[10px] font-medium text-blue-600">
                    유료
                  </span>
                  <span className="border-l border-blue-100 bg-blue-50/80 px-1 py-2.5 text-center text-[10px] font-medium text-blue-600">
                    기업
                  </span>
                </div>
                {MEMBERSHIP_BENEFIT_ROWS.map((row, i) => (
                  <div
                    key={row.label}
                    className={`${COL} border-b border-slate-100 last:border-0 ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    }`}
                  >
                    <span className="px-2 py-1 text-[10px] font-medium leading-snug text-slate-700 [word-break:keep-all]">
                      {row.label}
                    </span>
                    <span className="border-l border-slate-100">
                      <CompareCell muted={isMutedValue(row.free)} tone="free">
                        {row.free}
                      </CompareCell>
                    </span>
                    <span className="border-l border-blue-100/80">
                      <CompareCell muted={isMutedValue(row.paid)} tone="paid">
                        {row.paid}
                      </CompareCell>
                    </span>
                    <span className="border-l border-blue-100/80">
                      <CompareCell muted={isMutedValue(row.b2b)} tone="b2b">
                        {row.b2b}
                      </CompareCell>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-[10px] font-normal leading-relaxed text-blue-900/85">
                {FAMILY_PROTECTION_SUMMARY}
              </p>
              <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-[10px] font-normal leading-relaxed text-slate-600">
                {FAMILY_PROTECTION_B2B_NOTE}
              </p>
              <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-[10px] font-normal leading-relaxed text-slate-600">
                {VLUER_REFERRAL_B2B_NOTE}
              </p>
              <p className="mt-2 rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2 text-[10px] font-normal leading-relaxed text-blue-900/85">
                {B2B_ENTERPRISE_SUMMARY}
              </p>
            </div>
          ) : plan ? (
            <div
              className={`rounded-xl border p-4 ${
                plan.accent === "indigo"
                  ? "border-indigo-100 bg-indigo-50/30"
                  : plan.accent === "blue"
                    ? "border-blue-100 bg-blue-50/30"
                    : "border-slate-200 bg-slate-50/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                    plan.accent === "indigo"
                      ? "bg-indigo-600 text-white"
                      : plan.accent === "blue"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-600 text-white"
                  }`}
                >
                  {plan.badge}
                </span>
                <p className="text-[14px] font-semibold text-slate-900">{plan.title}</p>
              </div>
              <p className="mt-2 text-[12px] font-medium text-slate-700">{plan.headline}</p>
              <ul className="mt-3 space-y-2">
                {plan.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-[11px] font-normal leading-relaxed text-slate-600">
                    <span className="mt-0.5 shrink-0 text-slate-400" aria-hidden>
                      ·
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-[13px] font-semibold text-white transition active:bg-blue-700"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
