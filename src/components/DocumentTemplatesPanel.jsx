import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDocumentTemplates } from "../lib/documentTemplatesApi.js";
import { isPaidMembershipKind, normalizeMembershipKind } from "../lib/membershipBm.js";
import MembershipUpgradeModal from "./MembershipUpgradeModal.jsx";
import { useHorizontalScrollStrip } from "../lib/useHorizontalScrollStrip.js";
import ScreenBackHeader from "./common/ScreenBackHeader";

const TAB_IDS = ["all", "business", "life", "legal_other"];

function categoryLabel(id) {
  const map = {
    all: "전체",
    business: "비즈니스/업무",
    life: "일상/생활",
    legal_other: "내용증명/기타"
  };
  return map[id] || id;
}

function ComingSoonCard({ title, description, isPaidOnly, isDarkMode }) {
  const panel = isDarkMode ? "border-white/10 bg-white/[0.03]" : "border-slate-200/90 bg-slate-50/80";
  const titleCls = isDarkMode ? "text-slate-200" : "text-slate-800";
  const sub = isDarkMode ? "text-slate-500" : "text-slate-500";
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-dashed p-4 ${panel}`}>
      <div
        className={`pointer-events-none absolute inset-0 opacity-[0.35] ${
          isDarkMode
            ? "bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.25),transparent_55%)]"
            : "bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_55%)]"
        }`}
        aria-hidden
      />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-[14px] font-black ${titleCls}`}>{title}</p>
          <span className="rounded-full bg-indigo-600/10 px-2 py-0.5 text-[10px] font-black text-indigo-700">준비 중</span>
          {isPaidOnly ? (
            <span className="rounded-full bg-violet-600/10 px-2 py-0.5 text-[10px] font-black text-violet-700">유료 전용 예정</span>
          ) : null}
        </div>
        <p className={`mt-2 text-[12px] leading-relaxed ${sub}`}>{description}</p>
        <p className={`mt-3 text-[11px] font-semibold leading-relaxed ${isDarkMode ? "text-indigo-200/90" : "text-indigo-800/90"}`}>
          안전한 거래와 서식을 위해 VLUER 전문가 검수를 거쳐 순차적으로 업데이트 중입니다.
        </p>
      </div>
    </div>
  );
}

function TemplateCard({ item, isPaidUser, isDarkMode, onNeedUpgrade }) {
  const panel = isDarkMode ? "border-white/10 bg-[#151821]" : "border-slate-200 bg-white";
  const titleCls = isDarkMode ? "text-gray-100" : "text-gray-900";
  const sub = isDarkMode ? "text-gray-400" : "text-gray-500";
  const locked = item.isPaidOnly && !isPaidUser;
  const canDownload = item.status === "available" && item.downloadUrl && !locked;

  const onDownload = () => {
    if (locked) {
      onNeedUpgrade?.();
      return;
    }
    if (!item.downloadUrl) return;
    const a = document.createElement("a");
    a.href = item.downloadUrl;
    a.download = item.downloadPath || `${item.id}.pdf`;
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${panel}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-[15px] font-black leading-snug ${titleCls}`}>{item.title}</p>
          <p className={`mt-1 text-[12px] leading-relaxed ${sub}`}>{item.description}</p>
        </div>
        {item.isPaidOnly ? (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
              isPaidUser ? "bg-violet-100 text-violet-800" : "bg-amber-100 text-amber-900"
            }`}
          >
            {isPaidUser ? "유료 포함" : "유료 전용"}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-800">
            일반·유료 공통
          </span>
        )}
      </div>
      {item.tags?.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                isDarkMode ? "bg-white/10 text-gray-400" : "bg-slate-100 text-slate-600"
              }`}
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {canDownload ? (
          <button
            type="button"
            onClick={onDownload}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-black text-white shadow-sm active:scale-[0.99]"
          >
            {item.fileFormat?.toUpperCase() || "PDF"} 다운로드
          </button>
        ) : locked ? (
          <button
            type="button"
            onClick={() => onNeedUpgrade?.()}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-[13px] font-black text-white shadow-sm"
          >
            유료 멤버십으로 열기
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** 업무·일상 서류 양식 — 전체 화면·개인 자료실 공용 */
export default function DocumentTemplatesPanel({
  embedded = false,
  onGoBack,
  membershipTier = "free",
  isDarkMode = false
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const categoryStrip = useHorizontalScrollStrip();

  const membershipKind = normalizeMembershipKind(membershipTier);
  const isPaidUser = isPaidMembershipKind(membershipKind);

  const load = useCallback(async (category) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchDocumentTemplates(category);
      setPayload(data);
    } catch (e) {
      setError(e?.message || "목록을 불러오지 못했습니다.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(activeTab);
  }, [activeTab, load]);

  const templates = payload?.templates || [];
  const available = useMemo(() => templates.filter((t) => t.status === "available"), [templates]);
  const comingSoon = useMemo(() => templates.filter((t) => t.status === "coming_soon"), [templates]);
  const notice = payload?.notice || "";
  const meta = payload?.meta;

  const headText = isDarkMode ? "text-gray-100" : "text-gray-900";
  const subText = isDarkMode ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`min-w-0 ${embedded ? "" : "flex flex-col"}`}>
      {!embedded && onGoBack ? <ScreenBackHeader title="업무·일상 서류 양식" onBack={onGoBack} isDarkMode={isDarkMode} /> : null}
      <div className={`${embedded ? "" : "flex-1 overflow-y-auto px-3 pb-24 pt-3"}`}>
      <div
        className={`rounded-2xl border p-4 shadow-sm ${
          isDarkMode ? "border-white/10 bg-[#151821]" : embedded ? "border-teal-100 bg-teal-50/40" : "border-gray-100 bg-white"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Document Center</p>
            {embedded ? (
              <>
                <h2 className={`text-[16px] font-black ${headText}`}>업무·일상 서류 양식</h2>
                <p className={`mt-1 text-[12px] ${subText}`}>
                  위임장 · 근로계약서 · 내용증명 등 VLUE 검수 서식을 다운로드합니다.
                </p>
              </>
            ) : (
              <p className={`mt-1 text-[12px] ${subText}`}>
                위임장 · 근로계약서 · 내용증명 등 VLUE 검수 서식을 다운로드합니다.
              </p>
            )}
          </div>
        </div>
        {meta ? (
          <p className={`mt-3 text-[11px] font-semibold ${subText}`}>
            제공 {meta.available}건 · 준비 중 {meta.comingSoon}건
          </p>
        ) : null}
      </div>

      <div
        ref={categoryStrip.ref}
        title="드래그하거나 휠로 카테고리를 넘길 수 있습니다"
        onMouseDown={categoryStrip.onMouseDown}
        className={`mt-3 overflow-x-auto overscroll-x-contain touch-pan-x snap-x snap-mandatory scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          embedded ? "-mx-4 scroll-pl-4 scroll-pr-6 px-4" : "scroll-pl-0 scroll-pr-6"
        } ${categoryStrip.stripClassName}`}
      >
        <div className="flex w-max flex-nowrap items-center gap-2">
          {TAB_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={categoryStrip.wrapClick(() => setActiveTab(id))}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-black transition ${
                activeTab === id
                  ? "bg-blue-600 text-white shadow-sm"
                  : isDarkMode
                    ? "bg-white/10 text-gray-400"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              {categoryLabel(id)}
            </button>
          ))}
        </div>
      </div>

      {notice ? (
        <div
          className={`mt-3 rounded-2xl border px-3 py-3 ${
            isDarkMode ? "border-indigo-500/25 bg-indigo-500/10" : "border-indigo-100 bg-indigo-50/90"
          }`}
        >
          <p className={`text-[12px] font-bold leading-relaxed ${isDarkMode ? "text-indigo-100" : "text-indigo-950"}`}>{notice}</p>
        </div>
      ) : null}

      {loading ? <p className={`mt-6 text-center text-[13px] font-semibold ${subText}`}>서류 목록 불러오는 중…</p> : null}
      {error ? (
        <p className="mt-6 rounded-xl bg-red-50 px-3 py-2 text-center text-[12px] font-semibold text-red-800">{error}</p>
      ) : null}

      {!loading && !error && available.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className={`px-0.5 text-[11px] font-black uppercase tracking-wide ${subText}`}>다운로드 가능</p>
          {available.map((item) => (
            <TemplateCard
              key={item.id}
              item={item}
              isPaidUser={isPaidUser}
              isDarkMode={isDarkMode}
              onNeedUpgrade={() => setUpgradeOpen(true)}
            />
          ))}
        </div>
      ) : null}

      {!loading && !error && comingSoon.length > 0 ? (
        <div className="mt-5 space-y-3">
          <p className={`px-0.5 text-[11px] font-black uppercase tracking-wide ${subText}`}>순차 업데이트 예정</p>
          {comingSoon.map((item) => (
            <ComingSoonCard
              key={item.id}
              title={item.title}
              description={item.description}
              isPaidOnly={item.isPaidOnly}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      ) : null}

      {!loading && !error && templates.length === 0 ? (
        <div className="mt-6">
          <ComingSoonCard
            title="이 카테고리 서식"
            description="선택한 분류의 양식을 준비하고 있습니다."
            isPaidOnly={false}
            isDarkMode={isDarkMode}
          />
        </div>
      ) : null}
      </div>

      <MembershipUpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        membershipTier={membershipKind}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
