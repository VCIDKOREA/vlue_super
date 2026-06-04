import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "../lib/apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "../lib/vlueAuthHeaders.js";
import ReviewSubmissionForm from "./ReviewSubmissionForm.jsx";

export default function ActiveBoard({ embedded = false, onGoMain }) {
  const [campaigns, setCampaigns] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [myMatches, setMyMatches] = useState([]);
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [appliedCampaignIds, setAppliedCampaignIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [roleTab, setRoleTab] = useState("reviewer");
  const [creating, setCreating] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [ownerSpotlight, setOwnerSpotlight] = useState({ open: false, message: "" });
  const [createErrors, setCreateErrors] = useState({});
  const [createServerError, setCreateServerError] = useState("");
  const [canManageOwnerCampaign, setCanManageOwnerCampaign] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    rewardCash: 11000,
    capacity: 3,
    tierLevel: 1,
    requiredKeywords: "친절,위치,가격"
  });
  const tierRewardTable = { 0: 0, 1: 11000, 2: 22000, 3: 33000, 4: 44000 };
  const selectedTierReward = Number(tierRewardTable[createForm.tierLevel] ?? 11000);
  const selectedTierFee = Math.round(selectedTierReward * 0.2);
  const selectedTierPerSeatCash = selectedTierReward + selectedTierFee;
  const estimatedCreateTotalCash =
    Number(createForm.tierLevel) === 0
      ? 0
      : Math.max(1, Number(createForm.capacity || 1)) * selectedTierPerSeatCash;

  const refresh = async () => {
    setLoading(true);
    try {
      const [boardRes, matchRes, ownerRes] = await Promise.all([
        vlueAuthFetch(apiUrl("/api/active-board"), { headers: vlueAuthHeaders() }),
        vlueAuthFetch(apiUrl("/api/campaign/my-matches"), { headers: vlueAuthHeaders() }),
        vlueAuthFetch(apiUrl("/api/campaign/owner/dashboard"), { headers: vlueAuthHeaders() })
      ]);
      const board = await boardRes.json().catch(() => ({}));
      const matches = await matchRes.json().catch(() => ({}));
      const owner = await ownerRes.json().catch(() => ({}));
      if (boardRes.ok) {
        setCampaigns(Array.isArray(board.campaigns) ? board.campaigns : []);
        setTimeline(Array.isArray(board.timeline) ? board.timeline : []);
        setAppliedCampaignIds(Array.isArray(board.appliedCampaignIds) ? board.appliedCampaignIds : []);
      }
      if (matchRes.ok) setMyMatches(Array.isArray(matches.matches) ? matches.matches : []);
      if (ownerRes.ok) {
        setCanManageOwnerCampaign(Boolean(owner.canManageOwnerCampaign));
        setMyCampaigns(Array.isArray(owner.campaigns) ? owner.campaigns : []);
        setPendingApplications(Array.isArray(owner.pendingApplications) ? owner.pendingApplications : []);
        setPendingReviews(Array.isArray(owner.pendingReviews) ? owner.pendingReviews : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!canManageOwnerCampaign && roleTab === "owner") {
      setRoleTab("reviewer");
    }
  }, [canManageOwnerCampaign, roleTab]);

  const applyCampaign = async (campaignId) => {
    if (appliedCampaignIds.includes(campaignId)) return;
    const res = await vlueAuthFetch(apiUrl(`/api/campaign/${encodeURIComponent(campaignId)}/apply`), {
      method: "POST",
      headers: vlueAuthHeaders(),
      body: JSON.stringify({})
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setAppliedCampaignIds((prev) => (prev.includes(campaignId) ? prev : [...prev, campaignId]));
    }
    setToast(res.ok ? "지원이 완료되었습니다." : data.error || "지원 실패");
    setTimeout(() => setToast(""), 1500);
  };

  const verifiedMatches = useMemo(
    () => myMatches.filter((m) => m.status === "verified" || m.status === "review_submitted"),
    [myMatches]
  );

  const createCampaign = async () => {
    const nextErrors = {
      title: !createForm.title.trim(),
      description: !createForm.description.trim(),
      rewardCash: false
    };
    setCreateErrors(nextErrors);
    setCreateServerError("");
    if (nextErrors.title || nextErrors.description || nextErrors.rewardCash) {
      return;
    }
    try {
      const res = await vlueAuthFetch(apiUrl("/api/campaign"), {
        method: "POST",
        headers: vlueAuthHeaders(),
        body: JSON.stringify({
          title: createForm.title.trim(),
          description: createForm.description.trim(),
          rewardCash: selectedTierReward,
          tierLevel: Number(createForm.tierLevel || 1),
          capacity: Math.max(1, Number(createForm.capacity || 1)),
          requiredKeywords: createForm.requiredKeywords
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fallback = res.status >= 500 ? "API 서버 연결 상태를 확인해 주세요." : "캠페인 등록 실패";
        setCreateServerError(data.error || fallback);
        return;
      }
      setCreating(false);
      setCreateForm({ title: "", description: "", rewardCash: 11000, capacity: 3, tierLevel: 1, requiredKeywords: "친절,위치,가격" });
      setCreateErrors({});
      setCreateServerError("");
      setToast("캠페인이 등록되었습니다.");
      setTimeout(() => setToast(""), 1600);
      refresh();
    } catch {
      setCreateServerError("API 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.");
    }
  };

  const ownerDecision = async (matchId, decision) => {
    const res = await vlueAuthFetch(apiUrl(`/api/campaign/matches/${encodeURIComponent(matchId)}/review/decision`), {
      method: "POST",
      headers: vlueAuthHeaders(),
      body: JSON.stringify({ decision })
    });
    const data = await res.json().catch(() => ({}));
    setToast(res.ok ? (decision === "approved" ? "승인 처리 완료" : "반려 처리 완료") : data.error || "처리 실패");
    setTimeout(() => setToast(""), 1500);
    if (res.ok) {
      if (decision === "approved") {
        setOwnerSpotlight({ open: true, message: "홍보 시작! 메인 홈 실시간 홍보 영역으로 연결됩니다." });
      }
      refresh();
    }
  };

  const ownerApplicationDecision = async (campaignId, applicationId, decision) => {
    const endpoint =
      decision === "accepted"
        ? `/api/campaign/${encodeURIComponent(campaignId)}/match/${encodeURIComponent(applicationId)}`
        : `/api/campaign/${encodeURIComponent(campaignId)}/application/${encodeURIComponent(applicationId)}/reject`;
    const res = await vlueAuthFetch(apiUrl(endpoint), {
      method: "POST",
      headers: vlueAuthHeaders(),
      body: JSON.stringify({})
    });
    const data = await res.json().catch(() => ({}));
    setToast(res.ok ? (decision === "accepted" ? "지원 승인(매칭) 완료" : "지원 반려 완료") : data.error || "처리 실패");
    setTimeout(() => setToast(""), 1600);
    if (res.ok) refresh();
  };

  const resetDemoData = async () => {
    setResettingDemo(true);
    try {
      const res = await vlueAuthFetch(apiUrl("/api/campaign/demo/reset"), {
        method: "POST",
        headers: vlueAuthHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "데이터 초기화 실패");
      setToast("시연 데이터가 초기 상태로 리셋되었습니다.");
      setTimeout(() => setToast(""), 1800);
      setOwnerSpotlight({ open: false, message: "" });
      refresh();
    } catch (e) {
      setToast(e?.message || "데이터 초기화 실패");
      setTimeout(() => setToast(""), 1800);
    } finally {
      setResettingDemo(false);
    }
  };

  return (
    <section
      className={
        embedded
          ? "vlue-active-board-embedded rounded-2xl border border-blue-100 bg-gradient-to-b from-white to-blue-50/60 p-3"
          : "min-h-0 flex-1 overflow-y-auto bg-slate-50 px-3 pb-24 pt-3"
      }
    >
      <div className="vlue-active-board-tabs mb-3 flex rounded-xl bg-blue-50 p-1">
        <button type="button" className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-black ${roleTab === "reviewer" ? "bg-white text-blue-700 shadow-sm" : "text-blue-500"}`} onClick={() => setRoleTab("reviewer")}>
          캠페인 활동
        </button>
        {canManageOwnerCampaign ? (
          <button type="button" className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-black ${roleTab === "owner" ? "bg-white text-blue-700 shadow-sm" : "text-blue-500"}`} onClick={() => setRoleTab("owner")}>
            캠페인 관리
          </button>
        ) : null}
      </div>

      {roleTab === "reviewer" ? (
        <>
          <section className="mb-4">
            <h2 className="text-[17px] font-black text-slate-900">내 주변 실시간 모집 캠페인</h2>
            <p className="text-[11px] font-semibold text-blue-600">활동 보드 · 상단에서 바로 지원</p>
            <div className="mt-2 space-y-2">
              {campaigns.map((c) => (
                <article key={c.id} className="rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
                  <p className="text-[14px] font-black text-slate-900">{c.title}</p>
                  <p className="mt-1 line-clamp-2 text-[12px] text-slate-600">{c.description}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-black text-blue-700">{c.rewardCash === 0 ? "무료 티어0 모집" : "티어별 정산형 모집"}</p>
                      <p className="text-[12px] font-bold text-emerald-700">보상 {Number(c.expectedRewardCash ?? c.rewardCash ?? 0).toLocaleString()}원</p>
                      <p className="text-[10px] font-semibold text-slate-500">기본 제공: 2만원 상당 식사권/사용권</p>
                      <p className="text-[11px] font-bold text-blue-700">모집 인원 {Number(c.capacity || 0)}명</p>
                      <p className="text-[11px] font-black text-rose-600">🔥 지원율 {Number(c.supportRatePct || 0)}% {Number(c.supportRatePct || 0) >= 400 ? "돌파!" : ""}</p>
                    </div>
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-black text-white ${appliedCampaignIds.includes(c.id) ? "bg-emerald-600" : "bg-blue-700"}`}
                      onClick={() => applyCampaign(c.id)}
                      disabled={appliedCampaignIds.includes(c.id)}
                    >
                      {appliedCampaignIds.includes(c.id) ? "지원완료" : "지원하기"}
                    </button>
                  </div>
                </article>
              ))}
              {!campaigns.length && !loading ? <p className="rounded-xl bg-white p-3 text-[12px] text-slate-500">현재 모집 캠페인이 없습니다.</p> : null}
            </div>
          </section>

          <section className="mb-4">
            <h3 className="text-[15px] font-black text-slate-900">리뷰 작성 대기</h3>
            <div className="mt-2 space-y-2">
              {verifiedMatches.map((m) => (
                <div key={m.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[12px] font-black text-amber-900">{m.campaign?.title || "캠페인"}</p>
                  <p className="mt-1 text-[11px] font-semibold text-amber-800">마감: {m.reviewDeadlineAt ? new Date(m.reviewDeadlineAt).toLocaleString("ko-KR") : "-"}</p>
                  <button type="button" className="mt-2 rounded bg-amber-700 px-3 py-1.5 text-[11px] font-black text-white" onClick={() => setSelectedMatch(m)}>
                    리뷰 작성
                  </button>
                </div>
              ))}
              {!verifiedMatches.length ? <p className="rounded-xl bg-white p-3 text-[12px] text-slate-500">작성 가능한 리뷰가 없습니다.</p> : null}
            </div>
          </section>

          <section>
            <h3 className="text-[15px] font-black text-slate-900">인증 스캔 타임라인</h3>
            <p className="text-[11px] font-semibold text-blue-600">실시간 방문 인증 기록</p>
            <div className="mt-2 space-y-2">
              {timeline.map((e) => (
                <div key={e.id} className="rounded-xl border border-blue-100 bg-white p-3">
                  <p className="text-[12px] font-bold text-slate-800">인증 완료 · {String(e.payloadJson?.method || "gps").toUpperCase()}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{new Date(e.createdAt).toLocaleString("ko-KR")}</p>
                </div>
              ))}
              {!timeline.length ? <p className="rounded-xl bg-white p-3 text-[12px] text-slate-500">아직 인증 기록이 없습니다.</p> : null}
            </div>
          </section>
        </>
      ) : canManageOwnerCampaign ? (
        <>
          <section className="mb-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[15px] font-black text-slate-900">내가 올린 캠페인</h3>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[10px] font-black text-white disabled:opacity-50" disabled={resettingDemo} onClick={resetDemoData}>
                  {resettingDemo ? "초기화 중" : "데모 초기화"}
                </button>
                <button type="button" className="rounded-lg bg-blue-700 px-3 py-1.5 text-[11px] font-black text-white" onClick={() => setCreating((v) => !v)}>
                  {creating ? "닫기" : "새 캠페인"}
                </button>
              </div>
            </div>
            {creating ? (
              <div className="mb-2 rounded-xl border border-blue-100 bg-white p-3">
                <input
                  className={`mb-1 w-full rounded-lg border px-2 py-2 text-[12px] ${createErrors.title ? "border-rose-400 bg-rose-50/60" : "border-blue-100"}`}
                  placeholder="캠페인 제목"
                  value={createForm.title}
                  onChange={(e) => {
                    setCreateForm((p) => ({ ...p, title: e.target.value }));
                    if (createErrors.title) setCreateErrors((prev) => ({ ...prev, title: false }));
                  }}
                />
                {createErrors.title ? <p className="mb-2 text-[10px] font-bold text-rose-600">제목을 입력해 주세요.</p> : <div className="mb-2" />}
                <textarea
                  className={`mb-1 w-full rounded-lg border px-2 py-2 text-[12px] ${createErrors.description ? "border-rose-400 bg-rose-50/60" : "border-blue-100"}`}
                  rows={3}
                  placeholder="캠페인 설명"
                  value={createForm.description}
                  onChange={(e) => {
                    setCreateForm((p) => ({ ...p, description: e.target.value }));
                    if (createErrors.description) setCreateErrors((prev) => ({ ...prev, description: false }));
                  }}
                />
                {createErrors.description ? <p className="mb-2 text-[10px] font-bold text-rose-600">설명을 입력해 주세요.</p> : <div className="mb-2" />}
                <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    className="w-full rounded-lg border border-blue-100 px-2 py-2 text-[12px]"
                    value={createForm.tierLevel}
                    onChange={(e) =>
                      setCreateForm((p) => ({
                        ...p,
                        tierLevel: Number(e.target.value || 1),
                        rewardCash: Number(tierRewardTable[Number(e.target.value || 1)] ?? 11000)
                      }))
                    }
                  >
                    <option value={0}>Tier 0 무료 모집 (식사권 제공형)</option>
                    <option value={1}>Tier 1 정산형 모집</option>
                    <option value={2}>Tier 2 정산형 모집</option>
                    <option value={3}>Tier 3 정산형 모집</option>
                    <option value={4}>Tier 4 정산형 모집</option>
                  </select>
                  <label className="relative block">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[12px] font-black text-slate-500">₩</span>
                    <input
                      disabled
                      type="number"
                      className={`min-w-0 w-full rounded-lg border py-2 pl-6 pr-10 text-[12px] ${createErrors.rewardCash ? "border-rose-400 bg-rose-50/60" : "border-blue-100"} bg-slate-100 text-slate-500`}
                      placeholder="보상 금액"
                      value={selectedTierReward}
                      onChange={(e) => {
                        setCreateForm((p) => ({ ...p, rewardCash: Number(e.target.value || 0) }));
                        if (createErrors.rewardCash) setCreateErrors((prev) => ({ ...prev, rewardCash: false }));
                      }}
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-500">원</span>
                  </label>
                  <input className="min-w-0 w-full rounded-lg border border-blue-100 px-2 py-2 text-[12px]" placeholder="필수 키워드(콤마)" value={createForm.requiredKeywords} onChange={(e) => setCreateForm((p) => ({ ...p, requiredKeywords: e.target.value }))} />
                </div>
                <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-black text-blue-700">요청 인원(모집 인원)</span>
                    <input
                      type="number"
                      min={1}
                      className="w-full rounded-lg border border-blue-100 px-2 py-2 text-[12px]"
                      placeholder="예: 12"
                      value={createForm.capacity}
                      onChange={(e) => setCreateForm((p) => ({ ...p, capacity: Math.max(1, Number(e.target.value || 1)) }))}
                    />
                  </label>
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-2 text-[11px] font-bold text-indigo-700">
                    {Number(createForm.tierLevel) === 0
                      ? `무료 티어0 모집 · 예상 결제 0원 (정원 ${Math.max(1, Number(createForm.capacity || 1))}명)`
                      : `Tier ${Number(createForm.tierLevel)} 기준 예상 결제 ${estimatedCreateTotalCash.toLocaleString()}원 (정원 ${Math.max(1, Number(createForm.capacity || 1))}명)`}
                  </div>
                </div>
                <button type="button" className="w-full rounded-lg bg-blue-700 py-2 text-[12px] font-black text-white" onClick={createCampaign}>
                  캠페인 등록
                </button>
                {createErrors.rewardCash ? <p className="mt-1 text-[10px] font-bold text-rose-600">보상 금액 입력을 확인해 주세요.</p> : null}
                {createServerError ? <p className="mt-1 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">{createServerError}</p> : null}
              </div>
            ) : null}
            <div className="space-y-2">
              {myCampaigns.map((c) => (
                <div key={c.id} className="rounded-xl border border-blue-100 bg-white p-3">
                  <p className="text-[13px] font-black text-slate-900">{c.title}</p>
                  <p className="mt-1 text-[11px] text-slate-600">{c.description}</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-700">{c.pricingMode === "tier0_free" ? "무료 티어0 모집" : "티어별 정산형 모집"}</p>
                  <p className="mt-1 text-[11px] font-bold text-emerald-700">정원 {Number(c.capacity || 0)}명 · 지원율 {Number(c.supportRatePct || 0)}%</p>
                  <p className="mt-1 text-[11px] font-bold text-indigo-700">예상 총결제 {Number(c.estimatedTotalCash || 0).toLocaleString()}원</p>
                  <p className="mt-1 text-[10px] text-slate-500">매장 QR 토큰: {c.qrToken || "-"}</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-500">QR 기능: 방문 인증 + 향후 위챗형 결제 확장</p>
                </div>
              ))}
              {!myCampaigns.length ? <p className="rounded-xl bg-white p-3 text-[12px] text-slate-500">등록된 캠페인이 없습니다.</p> : null}
            </div>
          </section>

          <section>
            <h3 className="text-[15px] font-black text-slate-900">지원 승인/반려</h3>
            <div className="mt-2 space-y-2">
              {pendingApplications.map((a) => (
                <div key={a.id} className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <p className="text-[12px] font-black text-blue-900">{a.campaign?.title || "캠페인"}</p>
                  <p className="mt-1 text-[11px] text-blue-800">지원자: {a.applicant?.nickFeed || a.applicant?.publicHandle || "리뷰어"}</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-700">팔로워 {Number(a.applicantProfile?.followers || 0).toLocaleString()} · 클릭수 {Number(a.applicantProfile?.clicks || 0).toLocaleString()}</p>
                  <p className="mt-1 text-[11px] font-bold text-indigo-700">예상 티어: Tier {Number(a.payoutQuote?.tier ?? 0)}</p>
                  <p className="mt-1 text-[11px] text-slate-700">확정 시 보상 {Number(a.payoutQuote?.rewardCash || 0).toLocaleString()}원 / 수수료 {Number(a.payoutQuote?.platformFeeCash || 0).toLocaleString()}원</p>
                  {a.message ? <p className="mt-1 line-clamp-2 text-[11px] text-slate-700">{a.message}</p> : null}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="flex-1 rounded bg-blue-700 py-1.5 text-[11px] font-black text-white"
                      onClick={() => ownerApplicationDecision(a.campaignId, a.id, "accepted")}
                    >
                      매칭 승인
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded bg-rose-600 py-1.5 text-[11px] font-black text-white"
                      onClick={() => ownerApplicationDecision(a.campaignId, a.id, "rejected")}
                    >
                      지원 반려
                    </button>
                  </div>
                </div>
              ))}
              {!pendingApplications.length ? <p className="rounded-xl bg-white p-3 text-[12px] text-slate-500">신규 지원 대기가 없습니다.</p> : null}
            </div>
          </section>

          <section className="mt-4">
            <h3 className="text-[15px] font-black text-slate-900">리뷰 승인/반려</h3>
            {ownerSpotlight.open ? (
              <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-[12px] font-black text-emerald-900">{ownerSpotlight.message}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-[11px] font-black text-white"
                    onClick={() => onGoMain?.()}
                  >
                    메인 홈으로 이동
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200"
                    onClick={() => setOwnerSpotlight({ open: false, message: "" })}
                  >
                    닫기
                  </button>
                </div>
              </div>
            ) : null}
            <div className="mt-2 space-y-2">
              {pendingReviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[12px] font-black text-amber-900">{r.campaign?.title || "캠페인"}</p>
                  <p className="mt-1 text-[11px] text-amber-800">작성자: {r.bloggerUser?.nickFeed || r.bloggerUser?.publicHandle || "리뷰어"}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-slate-700">{r.reviewSubmission?.summary3Lines || "요약 없음"}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="flex-1 rounded bg-blue-700 py-1.5 text-[11px] font-black text-white" onClick={() => ownerDecision(r.id, "approved")}>
                      승인
                    </button>
                    <button type="button" className="flex-1 rounded bg-rose-600 py-1.5 text-[11px] font-black text-white" onClick={() => ownerDecision(r.id, "rejected")}>
                      반려
                    </button>
                  </div>
                </div>
              ))}
              {!pendingReviews.length ? <p className="rounded-xl bg-white p-3 text-[12px] text-slate-500">검토 대기 리뷰가 없습니다.</p> : null}
            </div>
          </section>
        </>
      ) : (
        <p className="rounded-xl bg-white p-3 text-[12px] text-slate-500">캠페인 관리는 업체 계정에서만 노출됩니다.</p>
      )}
      {toast ? <div className="fixed bottom-24 left-1/2 z-[120] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-[11px] font-bold text-white">{toast}</div> : null}
      {selectedMatch && <ReviewSubmissionForm match={selectedMatch} onClose={() => setSelectedMatch(null)} onSubmitted={() => { setSelectedMatch(null); refresh(); }} />}
    </section>
  );
}
