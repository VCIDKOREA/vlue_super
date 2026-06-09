import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAdminPricingConfig,
  fetchAdminPricingRevenueStats,
  saveAdminPricingConfig
} from "../../lib/adminConsoleApi.js";

const PLAN_KEYS = ["b2b_full_package", "soho_activity", "soho_broadcast_addon"];

function cloneConfig(cfg) {
  return JSON.parse(JSON.stringify(cfg));
}

export default function PricingManagerPanel({ onToast }) {
  const [config, setConfig] = useState(null);
  const [draft, setDraft] = useState(null);
  const [stats, setStats] = useState(null);
  const [planFilter, setPlanFilter] = useState("");
  const [busy, setBusy] = useState("");

  const dirty = useMemo(() => {
    if (!config || !draft) return false;
    return JSON.stringify(config) !== JSON.stringify(draft);
  }, [config, draft]);

  const load = useCallback(async () => {
    try {
      const [cfgRes, statsRes] = await Promise.all([
        fetchAdminPricingConfig(),
        fetchAdminPricingRevenueStats({ planSku: planFilter || undefined })
      ]);
      setConfig(cfgRes.config);
      setDraft(cloneConfig(cfgRes.config));
      setStats(statsRes.stats);
    } catch (e) {
      onToast?.(e?.message || "요금 설정 조회 실패");
    }
  }, [onToast, planFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const updatePlan = (sku, field, value) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = cloneConfig(prev);
      if (field === "monthlyKrw" || field === "annualKrw") {
        next.plans[sku][field] = Math.max(0, Math.floor(Number(value) || 0));
      } else {
        next.plans[sku][field] = value;
      }
      return next;
    });
  };

  const updateLegacy = (field, value) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = cloneConfig(prev);
      if (field.includes("Krw")) {
        next.legacy[field] = Math.max(0, Math.floor(Number(value) || 0));
      } else {
        next.legacy[field] = Number(value) || 0;
      }
      return next;
    });
  };

  const save = async () => {
    if (!draft) return;
    setBusy("save");
    try {
      const saved = await saveAdminPricingConfig(draft);
      setConfig(saved.config);
      setDraft(cloneConfig(saved.config));
      onToast?.("요금 설정이 저장되었습니다.");
      const statsRes = await fetchAdminPricingRevenueStats({ planSku: planFilter || undefined });
      setStats(statsRes.stats);
    } catch (e) {
      onToast?.(e?.message || "저장 실패");
    } finally {
      setBusy("");
    }
  };

  if (!draft) {
    return <p className="rounded-lg bg-slate-50 py-10 text-center text-[13px] text-slate-500">불러오는 중…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[14px] font-black text-slate-900">요금제 중앙 관리</p>
          <p className="text-[11px] text-slate-500">
            v{draft.version} · 부가세 {draft.vatIncluded ? "포함" : "별도"} · 최종 수정 {draft.updatedBy || "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="rounded-lg bg-slate-100 px-3 py-2 text-[12px] font-bold">
            새로고침
          </button>
          <button
            type="button"
            disabled={!dirty || busy === "save"}
            onClick={save}
            className="rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50"
          >
            {busy === "save" ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLAN_KEYS.map((sku) => {
          const plan = draft.plans[sku];
          return (
            <div key={sku} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">{sku}</p>
              <label className="mt-2 block text-[11px] font-bold text-slate-500">
                표시명
                <input
                  value={plan.label}
                  onChange={(e) => updatePlan(sku, "label", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px]"
                />
              </label>
              <label className="mt-2 block text-[11px] font-bold text-slate-500">
                월 요금(원)
                <input
                  type="number"
                  value={plan.monthlyKrw}
                  onChange={(e) => updatePlan(sku, "monthlyKrw", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px]"
                />
              </label>
              <label className="mt-2 block text-[11px] font-bold text-slate-500">
                연 요금(원)
                <input
                  type="number"
                  value={plan.annualKrw}
                  onChange={(e) => updatePlan(sku, "annualKrw", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px]"
                />
              </label>
              <label className="mt-2 block text-[11px] font-bold text-slate-500">
                설명
                <textarea
                  rows={3}
                  value={plan.description}
                  onChange={(e) => updatePlan(sku, "description", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]"
                />
              </label>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-[12px] font-black text-slate-800">레거시·참고 요금</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[11px] font-bold text-slate-500">
            정가(월)
            <input
              type="number"
              value={draft.legacy.paidListMonthlyKrw}
              onChange={(e) => updateLegacy("paidListMonthlyKrw", e.target.value)}
              className="mt-1 w-full rounded-lg border px-2 py-1.5 text-[13px]"
            />
          </label>
          <label className="text-[11px] font-bold text-slate-500">
            정가(연)
            <input
              type="number"
              value={draft.legacy.paidListAnnualKrw}
              onChange={(e) => updateLegacy("paidListAnnualKrw", e.target.value)}
              className="mt-1 w-full rounded-lg border px-2 py-1.5 text-[13px]"
            />
          </label>
          <label className="text-[11px] font-bold text-slate-500">
            추천 할인율
            <input
              type="number"
              step="0.01"
              value={draft.legacy.referralDiscountRate}
              onChange={(e) => updateLegacy("referralDiscountRate", e.target.value)}
              className="mt-1 w-full rounded-lg border px-2 py-1.5 text-[13px]"
            />
          </label>
          <label className="text-[11px] font-bold text-slate-500">
            임직원 콤보(월)
            <input
              type="number"
              value={draft.legacy.personalComboAddonMonthlyKrw}
              onChange={(e) => updateLegacy("personalComboAddonMonthlyKrw", e.target.value)}
              className="mt-1 w-full rounded-lg border px-2 py-1.5 text-[13px]"
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] font-black text-slate-800">요금제별 매출</p>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]"
          >
            <option value="">전체</option>
            <option value="b2b_full_package">B2B 풀 패키지</option>
            <option value="soho_activity">SOHO 활동형</option>
            <option value="soho_broadcast_addon">SOHO 영업 송출</option>
            <option value="legacy_personal_combo">레거시 임직원 콤보</option>
            <option value="other">기타</option>
          </select>
        </div>
        <p className="mt-2 text-[20px] font-black text-slate-900">
          합계 {(stats?.grandTotalKrw ?? 0).toLocaleString("ko-KR")}원
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(stats?.byPlan || []).map((row) => (
            <div key={row.planSku} className="rounded-lg bg-slate-50 p-3">
              <p className="text-[11px] font-bold text-slate-600">{row.label}</p>
              <p className="text-[16px] font-black">{row.totalKrw.toLocaleString("ko-KR")}원</p>
              <p className="text-[10px] text-slate-500">{row.count}건</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
