import { useCallback, useEffect, useState } from "react";

import {

  fetchOnboardingManualReview,

  fetchOnboardingStats,

  resolveOnboardingReview,

  fetchTitleDeptPendingReviews,

  resolveTitleDeptReview

} from "../../lib/adminV1Api.js";

import MarketingCenterTab from "./MarketingCenterTab.jsx";

import ContentCenterTab from "./ContentCenterTab.jsx";



function StatCard({ label, value, accent }) {

  return (

    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">

      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>

      <p className={`mt-1 text-[22px] font-black tabular-nums ${accent || "text-slate-900"}`}>{value}</p>

    </div>

  );

}



function formatWhen(iso) {

  if (!iso) return "—";

  try {

    return new Date(iso).toLocaleString("ko-KR", {

      month: "2-digit",

      day: "2-digit",

      hour: "2-digit",

      minute: "2-digit"

    });

  } catch {

    return iso;

  }

}



function OnboardingHomeTab({ onToast }) {

  const [stats, setStats] = useState(null);

  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);

  const [busyId, setBusyId] = useState("");

  const [error, setError] = useState("");



  const load = useCallback(async () => {

    setLoading(true);

    setError("");

    try {

      const [s, q] = await Promise.all([fetchOnboardingStats(), fetchOnboardingManualReview()]);

      setStats(s.stats || null);

      setRequests(q.requests || []);

    } catch (e) {

      setError(e?.message || String(e));

      setStats(null);

      setRequests([]);

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    load();

    const t = window.setInterval(load, 8000);

    return () => window.clearInterval(t);

  }, [load]);



  const resolve = async (reviewId, action) => {

    setBusyId(reviewId);

    try {

      await resolveOnboardingReview(reviewId, action);

      onToast?.(action === "approve" ? "수동 승인 완료" : "가입 반려 처리");

      load();

    } catch (e) {

      onToast?.(e?.message || "처리 실패");

    } finally {

      setBusyId("");

    }

  };



  return (

    <div className="space-y-4">

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

        <StatCard label="30일 가입 심사" value={stats?.total ?? "—"} />

        <StatCard label="자동 승인" value={stats?.autoApproved ?? "—"} accent="text-emerald-600" />

        <StatCard label="수동 심사 대기" value={stats?.manualReview ?? "—"} accent="text-[#EF4444]" />

        <StatCard label="자동 승인률" value={stats ? `${stats.autoRatePercent}%` : "—"} accent="text-blue-600" />

      </div>



      <div className="rounded-xl border border-slate-200 bg-white p-3">

        <div className="mb-3 flex items-center justify-between">

          <p className="text-[13px] font-black text-slate-900">수동 심사 대기</p>

          <button

            type="button"

            onClick={load}

            disabled={loading}

            className="text-[11px] font-bold text-blue-600 disabled:opacity-50"

          >

            {loading ? "…" : "새로고침"}

          </button>

        </div>

        {error ? <p className="mb-2 text-[12px] text-[#EF4444]">{error}</p> : null}

        {requests.length === 0 ? (

          <p className="rounded-lg bg-slate-50 py-8 text-center text-[12px] text-slate-500">

            예외 케이스 없음 — 자동 승인 파이프라인 정상

          </p>

        ) : (

          <ul className="max-h-[420px] space-y-2 overflow-y-auto">

            {requests.map((r) => (

              <li

                key={r.id}

                className="rounded-xl border-2 border-[#EF4444]/30 bg-red-50/40 p-3 ring-1 ring-[#EF4444]/20"

              >

                <div className="flex items-start justify-between gap-2">

                  <div className="min-w-0">

                    <p className="text-[12px] font-black text-[#EF4444]">예외 · 수동 심사</p>

                    <p className="mt-0.5 truncate text-[13px] font-bold text-slate-900">

                      {r.companyName || r.legalName || r.publicHandle || r.userId}

                    </p>

                    <p className="mt-1 text-[11px] text-slate-600">

                      사업자 {r.businessRegistrationNo} · 대표 {r.representativeName} · 개업 {r.openDate}

                    </p>

                    <p className="mt-0.5 text-[10px] text-slate-500">

                      국세청 {r.ntsStatusLabel || r.ntsStatusCode} · {r.failureReason || "검증 실패"}

                    </p>

                    <p className="text-[10px] text-slate-400">{formatWhen(r.createdAt)}</p>

                  </div>

                </div>

                <div className="mt-2 flex gap-2">

                  <button

                    type="button"

                    disabled={busyId === r.id}

                    onClick={() => resolve(r.id, "approve")}

                    className="flex-1 rounded-lg bg-blue-600 py-2 text-[11px] font-black text-white disabled:opacity-50"

                  >

                    수동 승인

                  </button>

                  <button

                    type="button"

                    disabled={busyId === r.id}

                    onClick={() => resolve(r.id, "reject")}

                    className="flex-1 rounded-lg border border-[#EF4444] bg-white py-2 text-[11px] font-black text-[#EF4444] disabled:opacity-50"

                  >

                    반려

                  </button>

                </div>

              </li>

            ))}

          </ul>

        )}

      </div>

    </div>

  );

}



function TitleDeptReviewTab({ onToast }) {

  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);

  const [busyId, setBusyId] = useState("");

  const [error, setError] = useState("");



  const load = useCallback(async () => {

    setLoading(true);

    setError("");

    try {

      const q = await fetchTitleDeptPendingReviews();

      setRequests(q.requests || []);

    } catch (e) {

      setError(e?.message || String(e));

      setRequests([]);

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    load();

    const t = window.setInterval(load, 8000);

    return () => window.clearInterval(t);

  }, [load]);



  const resolve = async (reviewId, action) => {

    setBusyId(reviewId);

    try {

      await resolveTitleDeptReview(reviewId, action);

      onToast?.(action === "approve" ? "직책·부서 승인 완료" : "직책·부서 반려");

      load();

    } catch (e) {

      onToast?.(e?.message || "처리 실패");

    } finally {

      setBusyId("");

    }

  };



  const sourceLabel = (s) => (s === "onboarding_signup" ? "가입 증빙" : "명함 설정");



  return (

    <div className="rounded-xl border border-slate-200 bg-white p-3">

      <div className="mb-3 flex items-center justify-between">

        <p className="text-[13px] font-black text-slate-900">직책·부서 확인 서류 대기</p>

        <button type="button" onClick={load} disabled={loading} className="text-[11px] font-bold text-blue-600 disabled:opacity-50">

          {loading ? "…" : "새로고침"}

        </button>

      </div>

      {error ? <p className="mb-2 text-[12px] text-[#EF4444]">{error}</p> : null}

      {requests.length === 0 ? (

        <p className="rounded-lg bg-slate-50 py-8 text-center text-[12px] text-slate-500">대기 중인 직책·부서 확인 서류가 없습니다.</p>

      ) : (

        <ul className="max-h-[420px] space-y-2 overflow-y-auto">

          {requests.map((r) => (

            <li key={r.id} className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3">

              <p className="text-[12px] font-black text-amber-900">{sourceLabel(r.source)}</p>

              <p className="mt-0.5 text-[13px] font-bold text-slate-900">{r.legalName || r.publicHandle || r.userId}</p>

              <p className="mt-1 text-[11px] text-slate-700">

                직책 {r.pendingTitle || "—"} · 부서 {r.pendingDepartment || "—"}

              </p>

              <p className="mt-0.5 text-[10px] text-slate-500">

                서류 {r.docKind} · 발급 {r.docIssuedAt || "—"} · {r.docFileName}

              </p>

              {r.docDataUrl ? (

                <a href={r.docDataUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[10px] font-bold text-blue-600 underline">

                  서류 보기

                </a>

              ) : r.docUrl ? (

                <p className="mt-1 text-[10px] text-slate-400">{r.docUrl}</p>

              ) : null}

              <p className="text-[10px] text-slate-400">{formatWhen(r.createdAt)}</p>

              <div className="mt-2 flex gap-2">

                <button

                  type="button"

                  disabled={busyId === r.id}

                  onClick={() => resolve(r.id, "approve")}

                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"

                >

                  승인

                </button>

                <button

                  type="button"

                  disabled={busyId === r.id}

                  onClick={() => resolve(r.id, "reject")}

                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 disabled:opacity-50"

                >

                  반려

                </button>

              </div>

            </li>

          ))}

        </ul>

      )}

    </div>

  );

}



const DASH_TABS = [

  { id: "onboarding", label: "가입 승인" },

  { id: "title-dept", label: "직책·부서" },

  { id: "marketing", label: "마케팅 센터" },

  { id: "content", label: "콘텐츠 센터" }

];



export default function AdminDashboardPanel({ onToast }) {

  const [dashTab, setDashTab] = useState("onboarding");



  return (

    <div className="space-y-4">

      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-2">

        {DASH_TABS.map((t) => (

          <button

            key={t.id}

            type="button"

            onClick={() => setDashTab(t.id)}

            className={`rounded-lg px-3 py-1.5 text-[12px] font-bold ${

              dashTab === t.id ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"

            }`}

          >

            {t.label}

          </button>

        ))}

      </div>



      {dashTab === "onboarding" ? <OnboardingHomeTab onToast={onToast} /> : null}

      {dashTab === "title-dept" ? <TitleDeptReviewTab onToast={onToast} /> : null}

      {dashTab === "marketing" ? <MarketingCenterTab onToast={onToast} /> : null}

      {dashTab === "content" ? <ContentCenterTab onToast={onToast} /> : null}

    </div>

  );

}


