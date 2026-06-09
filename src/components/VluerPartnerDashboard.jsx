import { Component, useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchVluerDashboard,
  fetchVluerOrgMap,
  fetchVluerSettlements,
  simulateVluerRevenue
} from "../lib/vluerDashboardApi.js";
import { SIMULATOR_MAX } from "../lib/vluerRevenueSimulator.js";
import { buildVluerDashboardDemoFallback, buildVluerOrgMapDemoFallback } from "../lib/vluerDashboardDemo.js";
import { hasVlueServerSession } from "../lib/vlueSession.js";

const TABS = [
  { id: "org", label: "조직 맵" },
  { id: "sim", label: "수익 시뮬레이터" },
  { id: "ledger", label: "정산 내역" }
];

const TIER_RING = {
  PV: "from-amber-500 via-yellow-500 to-orange-600",
  CV: "from-violet-600 to-indigo-700",
  OV: "from-emerald-600 to-teal-700",
  VLUER: "from-slate-600 to-slate-800"
};

function formatKrw(n) {
  return `${Math.max(0, Math.floor(Number(n) || 0)).toLocaleString("ko-KR")}원`;
}

function formatPoints(n) {
  return `${Math.max(0, Math.floor(Number(n) || 0)).toLocaleString("ko-KR")}P`;
}

class VluerDashboardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || "렌더 오류" };
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-3">
          <p className="text-[12px] font-bold text-red-800">VLUER 대시보드 표시 오류</p>
          <p className="mt-1 text-[11px] text-red-700">{this.state.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="mt-2 text-[11px] font-bold text-red-900 underline"
          >
            다시 시도
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}

function clampSim(n) {
  return Math.min(SIMULATOR_MAX, Math.max(0, Math.floor(Number(n) || 0)));
}

function tierRingClass(code) {
  return TIER_RING[code] || TIER_RING.VLUER;
}

function pct(current, target) {
  if (!target || target <= 0) return 100;
  return Math.min(100, Math.round((Math.max(0, current) / target) * 100));
}

/** 진행도 게이지 — 수치만 표시, 정책 문구 없음 */
function ProgressGauge({ label, value, max, icon, tone = "indigo" }) {
  const p = pct(value, max);
  const bar =
    tone === "amber"
      ? "bg-gradient-to-r from-amber-400 to-orange-500"
      : tone === "violet"
        ? "bg-gradient-to-r from-violet-500 to-indigo-600"
        : "bg-gradient-to-r from-indigo-500 to-blue-600";
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
          <span className="text-[12px]" aria-hidden>
            {icon}
          </span>
          {label}
        </span>
        <span className="text-[10px] font-black tabular-nums text-slate-800">
          {value}
          <span className="font-semibold text-slate-400">/{max}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

function ModalShell({ open, title, children, onClose, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/45 p-3 sm:items-center" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0" aria-label="닫기" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
        <h3 className="text-center text-[15px] font-bold text-slate-900">{title}</h3>
        <div className="mt-3">{children}</div>
        {footer ? <div className="mt-4 flex gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

function DashboardDetailModal({ open, title, subtitle, onClose, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/45 sm:items-center sm:p-3"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button type="button" className="absolute inset-0" aria-label="닫기" onClick={onClose} />
      <div className="relative flex max-h-[min(88vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 py-3 text-white">
          <div className="min-w-0">
            <p className="text-[14px] font-black leading-tight">{title}</p>
            {subtitle ? <p className="mt-0.5 truncate text-[10px] font-medium text-indigo-200">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-black text-white"
          >
            닫기
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4 pt-2.5">{children}</div>
      </div>
    </div>
  );
}

/**
 * VLUER 리워드·수익 — compact: 마이페이지 상단 한 줄 + 모달 상세
 */
function VluerPartnerDashboardInner({ onOpenFamilyProtection, layout = "compact" }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("org");
  const [dash, setDash] = useState(null);
  const [org, setOrg] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [simPersonalCount, setSimPersonalCount] = useState(0);
  const [simB2bLines, setSimB2bLines] = useState(0);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [simTarget, setSimTarget] = useState("");
  const [simResult, setSimResult] = useState(null);
  const [simBusy, setSimBusy] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [offlineDemo, setOfflineDemo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setOfflineDemo(false);

    if (!hasVlueServerSession()) {
      const demo = buildVluerDashboardDemoFallback();
      setDash(demo);
      setOrg(buildVluerOrgMapDemoFallback());
      setSettlements([]);
      setSimTarget((prev) => prev || demo.tierCode || "general");
      setLoading(false);
      return;
    }

    try {
      const d = await fetchVluerDashboard();
      setDash(d);
      setSimTarget((prev) => prev || d?.tierCode || "general");
      try {
        const o = await fetchVluerOrgMap();
        setOrg(o);
      } catch (e) {
        console.warn("[VLUER org-map]", e);
        setOrg(buildVluerOrgMapDemoFallback());
      }
      try {
        const s = await fetchVluerSettlements(25);
        setSettlements(s.items || []);
      } catch (e) {
        console.warn("[VLUER settlements]", e);
        setSettlements([]);
      }
    } catch (e) {
      console.warn("[VLUER dashboard]", e);
      const demo = buildVluerDashboardDemoFallback();
      setDash(demo);
      setOrg(buildVluerOrgMapDemoFallback());
      setSettlements([]);
      setSimTarget((prev) => prev || demo.tierCode || "general");
      setOfflineDemo(true);
      const msg = e?.message || "대시보드를 불러오지 못했습니다.";
      const needsAction =
        e?.code === "VLUER_SCHEMA_NOT_READY" ||
        e?.status === 503 ||
        msg.includes("migrate") ||
        e?.code === "USER_NOT_FOUND" ||
        e?.status === 401;
      const hint = needsAction
        ? e?.code === "VLUER_SCHEMA_NOT_READY" || e?.status === 503 || msg.includes("migrate")
          ? "파트너 DB 준비 중입니다. 루트에서 npm run db:deploy:safe 후 API를 재시작하고 다시 불러오기를 눌러 주세요."
          : "로그인이 만료되었거나 계정이 서버에 없습니다. 다시 로그인해 주세요."
        : "";
      setError(hint);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tierCode = dash?.tierDisplay?.code || "VLUER";
  const churnCount = dash?.stats?.pendingChurnRequests ?? 0;
  const downline = dash?.stats?.downlineUsers ?? 0;
  const enterprises = dash?.stats?.enterprises ?? 0;

  const baseB2bLines = useMemo(
    () => (org?.enterprises || []).reduce((sum, e) => sum + (Number(e.lineCount) || 0), 0),
    [org]
  );

  useEffect(() => {
    if (!dash) return;
    setSimPersonalCount(Math.max(0, downline));
    setSimB2bLines(Math.max(0, baseB2bLines || enterprises * 10));
  }, [dash, downline, enterprises, baseB2bLines]);
  const totalMembers = dash?.stats?.totalMembers ?? downline + enterprises;
  const upgrade = dash?.upgrade;
  const canWithdraw = dash?.stats?.canWithdraw ?? dash?.tierDisplay?.canWithdraw ?? false;

  const canUpgradeCertified = upgrade?.certifiedAvailable;
  const canUpgradePartner = upgrade?.partnerAvailable;

  const selectTab = (id) => {
    setTab(id);
    if (id === "sim" && (canUpgradeCertified || canUpgradePartner) && !simResult) {
      setUpgradeModalOpen(true);
    }
  };

  const runSim = useCallback(async () => {
    if (!dash) return;
    setSimBusy(true);
    try {
      const r = await simulateVluerRevenue({
        billingCycle,
        personalMemberCount: Number(simPersonalCount) || 0,
        b2bLineCount: Number(simB2bLines) || 0,
        targetTier: simTarget || dash.tierCode
      });
      setSimResult(r);
    } catch (e) {
      setSimResult({ error: e?.message });
    } finally {
      setSimBusy(false);
    }
  }, [dash, billingCycle, simPersonalCount, simB2bLines, simTarget]);

  useEffect(() => {
    if (tab !== "sim" || !dash) return undefined;
    const timer = window.setTimeout(() => {
      runSim();
    }, 320);
    return () => window.clearTimeout(timer);
  }, [tab, dash, billingCycle, simPersonalCount, simB2bLines, simTarget, runSim]);

  const dashboardBody = (
    <div className="px-0.5">
            <div className="mb-2 grid grid-cols-3 gap-1.5">
              <div className="rounded-xl bg-slate-50 px-2 py-2 text-center">
                <p className="text-[9px] font-bold text-slate-500">합산</p>
                <p className="text-[15px] font-black text-slate-900">{totalMembers}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-2 py-2 text-center">
                <p className="text-[9px] font-bold text-slate-500">개인</p>
                <p className="text-[15px] font-black text-slate-900">{downline}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-2 py-2 text-center">
                <p className="text-[9px] font-bold text-slate-500">기업</p>
                <p className="text-[15px] font-black text-slate-900">{enterprises}</p>
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-[10px]">
              <span className="font-semibold text-slate-600">
                {canWithdraw ? "정산 출금 가능" : "리워드 포인트 (출금 불가)"}
              </span>
              {churnCount > 0 && (
                <span className="font-black text-red-600">대기 {churnCount}</span>
              )}
            </div>

            {(canUpgradeCertified || canUpgradePartner) && (
              <div className="mb-2 rounded-xl border border-violet-100 bg-violet-50/90 px-3 py-2">
                <p className="text-[11px] font-bold text-violet-950">VLUER 업그레이드 안내</p>
                <p className="mt-0.5 text-[10px] leading-snug text-violet-800/90">
                  활동 규모에 따라 인증·파트너 VLUER 업그레이드를 신청할 수 있습니다. 마이페이지에서 확인하세요.
                </p>
              </div>
            )}

            {dash?.tierCode === "partner" && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <span className="text-lg" aria-hidden>
                  ★
                </span>
                <p className="text-[11px] font-bold text-amber-900">파트너 VLUER</p>
              </div>
            )}

            <div className="mb-2 flex gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTab(t.id)}
                  className={`relative flex-1 rounded-full py-1.5 text-[10px] font-black ${
                    tab === t.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {t.label}
                  {t.id === "org" && churnCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" aria-label={`대기 ${churnCount}건`} />
                  )}
                </button>
              ))}
            </div>

            {tab === "org" && (
              <div>
                <div className="max-h-[200px] space-y-1.5 overflow-y-auto">
                  {(org?.members || []).length === 0 && (org?.enterprises || []).length === 0 ? (
                    <p className="py-6 text-center text-[11px] text-slate-400">조직 데이터 없음</p>
                  ) : null}
                  {(org?.members || []).map((m) => (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        {m.churnRisk && (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] text-white" title="코드 변경 신청">
                            !
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-bold text-slate-900">{m.name}</p>
                          <p className="text-[10px] text-slate-500">@{m.handle || "member"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(org?.enterprises || []).map((e) => (
                    <div
                      key={e.enterpriseId}
                      className="flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50/60 px-2.5 py-2"
                    >
                      <p className="text-[12px] font-bold text-violet-950">{e.name}</p>
                      <span className="text-[10px] font-bold tabular-nums text-violet-700">{e.lineCount}L</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "sim" && (
              <div className="space-y-2.5">
                <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={`flex-1 rounded-lg py-1.5 text-[10px] font-black ${
                      billingCycle === "monthly" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    월간 결제
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("annual")}
                    className={`flex-1 rounded-lg py-1.5 text-[10px] font-black ${
                      billingCycle === "annual" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    연간 결제 (2개월 무료)
                  </button>
                </div>

                <label className="block text-[10px] font-bold text-slate-500">
                  개인 구독 회원
                  <input
                    type="range"
                    min={0}
                    max={SIMULATOR_MAX}
                    step={1}
                    value={Math.min(SIMULATOR_MAX, simPersonalCount)}
                    onChange={(e) => setSimPersonalCount(Number(e.target.value))}
                    className="mt-1 w-full accent-indigo-600"
                  />
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="font-black tabular-nums text-indigo-700">
                      {Number(simPersonalCount).toLocaleString("ko-KR")}명
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={SIMULATOR_MAX}
                      value={simPersonalCount}
                      onChange={(e) => setSimPersonalCount(clampSim(e.target.value))}
                      className="w-[88px] rounded-lg border border-indigo-200 px-2 py-1 text-right text-[11px] font-black tabular-nums text-indigo-800"
                      aria-label="개인 구독 회원 수 직접 입력"
                    />
                  </div>
                </label>

                <label className="block text-[10px] font-bold text-slate-500">
                  B2B 회선
                  <input
                    type="range"
                    min={0}
                    max={SIMULATOR_MAX}
                    step={1}
                    value={Math.min(SIMULATOR_MAX, simB2bLines)}
                    onChange={(e) => setSimB2bLines(Number(e.target.value))}
                    className="mt-1 w-full accent-violet-600"
                  />
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="font-black tabular-nums text-violet-700">
                      {Number(simB2bLines).toLocaleString("ko-KR")}회선
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={SIMULATOR_MAX}
                      value={simB2bLines}
                      onChange={(e) => setSimB2bLines(clampSim(e.target.value))}
                      className="w-[88px] rounded-lg border border-violet-200 px-2 py-1 text-right text-[11px] font-black tabular-nums text-violet-800"
                      aria-label="B2B 회선 수 직접 입력"
                    />
                  </div>
                </label>

                <select
                  value={simTarget}
                  onChange={(e) => setSimTarget(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-bold"
                >
                  <option value="general">일반 VLUER · 5% 포인트</option>
                  <option value="certified">인증 VLUER · 10% 캐시</option>
                  <option value="partner">파트너 VLUER · 15% 캐시</option>
                </select>

                {simBusy && !simResult && (
                  <p className="text-center text-[10px] font-semibold text-slate-400">계산 중…</p>
                )}

                {simResult && !simResult.error && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                    <p className="text-[10px] font-bold text-emerald-800">
                      {simResult.periodLabel || "예상 수익"}
                    </p>
                    <p className="mt-0.5 text-[20px] font-black tabular-nums leading-tight text-emerald-950">
                      {simResult.displayLabel ||
                        (simResult.isRewardPoints
                          ? formatPoints(simResult.afterTaxPoints)
                          : formatKrw(simResult.afterTaxCommissionKrw))}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-emerald-700">
                      {simResult.benefitSubtitle || ""}
                    </p>
                    {!simResult.isRewardPoints && Number(simResult.withholdingTaxKrw) > 0 && (
                      <div className="mt-2 space-y-0.5 rounded-lg bg-white/60 px-2 py-1.5 text-[9px] tabular-nums text-emerald-900/90">
                        <p className="font-bold text-emerald-800">계산 순서 (부가세 → 커미션 → 원천징수)</p>
                        <p>
                          ① 결제액(VAT 포함) {formatKrw(simResult.personalUnitKrw)}
                          {simResult.personalMemberCount > 0
                            ? ` × ${simResult.personalMemberCount}명`
                            : ""}
                          {simResult.b2bLineCount > 0
                            ? ` + 회선 ${formatKrw(simResult.b2bLineUnitKrw)}×${simResult.b2bLineCount}`
                            : ""}
                        </p>
                        <p>
                          ② 공급가액(÷1.1) {formatKrw(simResult.totalSupplyKrw)} × {simResult.tierRatePct}% ={" "}
                          <span className="font-black">세전 {formatKrw(simResult.preTaxCommissionKrw)}</span>
                        </p>
                        <p>
                          ③ 원천징수 3.3% −{formatKrw(simResult.withholdingTaxKrw)} →{" "}
                          <span className="font-black">세후 {formatKrw(simResult.afterTaxCommissionKrw)}</span>
                          <span className="text-emerald-700/80"> (= 세전 − 원천징수)</span>
                        </p>
                      </div>
                    )}
                    {simResult.isRewardPoints && Number(simResult.preTaxCommissionKrw) > 0 && (
                      <p className="mt-1 text-[9px] tabular-nums text-emerald-800/80">
                        공급가 {formatKrw(simResult.totalSupplyKrw ?? 0)} × {simResult.tierRatePct ?? 0}% ={" "}
                        {formatPoints(simResult.afterTaxPoints)}
                      </p>
                    )}
                    <p className="mt-2 border-t border-emerald-200/80 pt-2 text-[9px] leading-snug text-emerald-900/85">
                      {simResult.disclaimer}
                    </p>
                  </div>
                )}
                {simResult?.error && (
                  <p className="text-[11px] font-semibold text-red-600">{simResult.error}</p>
                )}
              </div>
            )}

            {tab === "ledger" && (
              <div className="max-h-[220px] space-y-1.5 overflow-y-auto">
                {settlements.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-slate-400">정산 없음</p>
                ) : (
                  settlements.map((row, idx) => (
                    <div
                      key={row.id || `settlement-${idx}`}
                      className="flex items-center justify-between rounded-xl border border-slate-100 px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold text-slate-900">{row.payerLabel}</p>
                        <p className="text-[10px] text-slate-500">{formatKrw(row.grossPaymentKrw)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-black text-indigo-600">{row.tierLabel}</p>
                        <p className={`text-[12px] font-black tabular-nums ${row.retained ? "text-slate-400" : "text-emerald-600"}`}>
                          {row.retained
                            ? "—"
                            : row.isRewardPoints
                              ? `+${Number(row.commissionKrw).toLocaleString("ko-KR")}P`
                              : `+${formatKrw(row.commissionKrw)}`}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

      <button type="button" onClick={load} className="mt-2 w-full text-[10px] font-semibold text-slate-400">
        새로고침
      </button>
      {onOpenFamilyProtection ? (
        <button
          type="button"
          onClick={onOpenFamilyProtection}
          className="mt-2 w-full text-left text-[10px] font-bold text-amber-700 underline underline-offset-2"
        >
          가족 보호 등록 (친구검색) →
        </button>
      ) : null}
    </div>
  );

  if (loading && !dash) {
    return (
      <div className="vlue-mypage-reward-bar shrink-0 border-b border-slate-800/80 bg-slate-900 px-3 py-2">
        <p className="text-[11px] font-semibold text-slate-400">리워드 불러오는 중…</p>
      </div>
    );
  }

  const monthlyCaption = dash?.stats?.monthlyIsPoints ? "월 예상 리워드" : "월 예상 정산";
  const modalSubtitle = [dash?.tierDisplay?.label, dash?.tierDisplay?.benefitLabel].filter(Boolean).join(" · ");

  return (
    <>
      {offlineDemo && error ? (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-1.5">
          <p className="text-[10px] font-semibold leading-snug text-amber-900">{error}</p>
          <button
            type="button"
            onClick={load}
            className="text-[10px] font-bold text-amber-800 underline underline-offset-2"
          >
            다시 불러오기
          </button>
        </div>
      ) : null}

      <div className="vlue-mypage-reward-bar shrink-0 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={`inline-flex shrink-0 rounded-full bg-gradient-to-r ${tierRingClass(tierCode)} px-2 py-0.5 text-[9px] font-black text-white`}
          >
            {tierCode}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold text-indigo-200/95">
              {dash?.tierDisplay?.label}
              {offlineDemo && !error ? (
                <span className="ml-1 rounded bg-white/10 px-1 py-px text-[8px] font-bold text-amber-200">샘플</span>
              ) : null}
            </p>
            <p className="flex items-baseline gap-1.5 leading-none">
              <span
                className={`text-[15px] font-black tabular-nums tracking-tight ${
                  dash?.stats?.monthlyIsPoints ? "text-amber-300" : "text-emerald-300"
                }`}
              >
                {dash?.stats?.monthlyEstimatedLabel}
              </span>
              <span className="text-[9px] font-medium text-slate-400">{monthlyCaption}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-lg bg-white/12 px-2.5 py-1 text-[10px] font-black text-white ring-1 ring-white/20 active:scale-[0.98]"
        >
          리워드
        </button>
      </div>

      <DashboardDetailModal
        open={open}
        title={monthlyCaption}
        subtitle={modalSubtitle}
        onClose={() => setOpen(false)}
      >
        {dashboardBody}
      </DashboardDetailModal>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[210] w-[86%] max-w-sm -translate-x-1/2 rounded-xl bg-slate-900/92 px-4 py-2.5 text-center text-[12px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      <ModalShell
        open={upgradeModalOpen}
        title="VLUER 업그레이드 시뮬레이션"
        onClose={() => setUpgradeModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setUpgradeModalOpen(false)}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[13px] font-semibold text-slate-600"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={() => {
                setUpgradeModalOpen(false);
                runSim();
              }}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-[13px] font-bold text-white"
            >
              시뮬레이션 실행
            </button>
          </>
        }
      >
        {upgrade?.nextTierDisplay && (
          <div className="space-y-2 text-[12px] leading-relaxed text-slate-700">
            <p>
              다음 단계 <strong>{upgrade.nextTierDisplay.label}</strong>
            </p>
            <p className="font-bold text-slate-900">예상 {upgrade.projectedMonthlyLabel}</p>
            <p className="text-[11px] text-slate-600">{upgrade.nextTierDisplay.benefitLabel}</p>
            <p className="text-[10px] text-slate-500">{upgrade.priceChangeNotice}</p>
          </div>
        )}
      </ModalShell>

    </>
  );
}

export default function VluerPartnerDashboard(props) {
  return (
    <VluerDashboardErrorBoundary>
      <VluerPartnerDashboardInner {...props} />
    </VluerDashboardErrorBoundary>
  );
}
