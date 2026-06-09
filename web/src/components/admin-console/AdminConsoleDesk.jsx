import { useCallback, useEffect, useState } from "react";
import {
  createAdminNotice,
  createAdminPopup,
  deleteAdminFeedPost,
  deleteAdminNotice,
  deleteAdminPopup,
  fetchAdminHealth,
  fetchAdminManualReview,
  fetchAdminOnboardingStats,
  fetchAdminPosts,
  fetchAdminUsers,
  patchAdminUser,
  resolveAdminManualReview,
  testAdminNotification,
  testAdminScanner,
  updateAdminNotice,
  updateAdminPopup
} from "../../lib/adminConsoleApi.js";
import PricingManagerPanel from "./PricingManagerPanel.jsx";

const TABS = [
  { id: "health", label: "상태 점검" },
  { id: "pricing", label: "요금제 관리" },
  { id: "users", label: "회원 관리" },
  { id: "posts", label: "게시물 관리" },
  { id: "onboarding", label: "가입 승인" }
];

function Table({ columns, rows, emptyLabel = "데이터 없음" }) {
  if (!rows?.length) {
    return <p className="rounded-lg bg-slate-50 py-10 text-center text-[13px] text-slate-500">{emptyLabel}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-[12px]">
        <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2.5">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row._key} className="hover:bg-slate-50/80">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2.5 align-top text-slate-800">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HealthTab({ onToast }) {
  const [health, setHealth] = useState(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await fetchAdminHealth();
      setHealth(data);
    } catch (e) {
      onToast?.(e?.message || "상태 조회 실패");
    }
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const runTest = async (kind) => {
    setBusy(kind);
    try {
      if (kind === "notify") {
        const r = await testAdminNotification("관리자 대시보드 알림 테스트");
        onToast?.(`SSE 테스트 · ${r.deliveredConnections ?? 0}연결`);
      } else {
        const r = await testAdminScanner();
        onToast?.(r.ok ? "스캐너/결제 API 설정 확인됨" : "Portone 설정 누락");
      }
      load();
    } catch (e) {
      onToast?.(e?.message || "테스트 실패");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={load} className="rounded-lg bg-slate-100 px-3 py-2 text-[12px] font-bold">
          새로고침
        </button>
        <button
          type="button"
          disabled={busy === "notify"}
          onClick={() => runTest("notify")}
          className="rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50"
        >
          알림 푸시 테스트
        </button>
        <button
          type="button"
          disabled={busy === "scanner"}
          onClick={() => runTest("scanner")}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50"
        >
          스캐너/결제 점검
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(health?.checks || []).map((c) => (
          <div
            key={c.id}
            className={`rounded-xl border p-3 ${c.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}
          >
            <p className="text-[11px] font-black text-slate-600">{c.label}</p>
            <p className={`mt-1 text-[14px] font-black ${c.ok ? "text-emerald-700" : "text-rose-600"}`}>
              {c.ok ? "정상" : "점검 필요"}
            </p>
            {c.detail ? <p className="mt-1 text-[11px] text-slate-600">{c.detail}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersTab({ onToast }) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminUsers({ q });
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (e) {
      onToast?.(e?.message || "회원 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [q, onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const suspend = async (userId) => {
    setBusyId(userId);
    try {
      await patchAdminUser(userId, { accountStatus: "suspended" });
      onToast?.("활동 정지 처리");
      load();
    } catch (e) {
      onToast?.(e?.message || "처리 실패");
    } finally {
      setBusyId("");
    }
  };

  const activate = async (userId) => {
    setBusyId(userId);
    try {
      await patchAdminUser(userId, { accountStatus: "active", status: "ACTIVE" });
      onToast?.("계정 활성화");
      load();
    } catch (e) {
      onToast?.(e?.message || "처리 실패");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="아이디·이름·이메일·전화 검색"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
        />
        <button type="button" onClick={load} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-bold text-white">
          검색
        </button>
      </div>
      <p className="text-[11px] text-slate-500">총 {total}명</p>
      <Table
        emptyLabel={loading ? "불러오는 중…" : "회원 없음"}
        columns={[
          { key: "handle", label: "아이디", render: (r) => r.publicHandle || "—" },
          { key: "name", label: "이름", render: (r) => r.legalName || "—" },
          { key: "status", label: "상태", render: (r) => `${r.accountStatus} / ${r.status}` },
          { key: "role", label: "역할" },
          {
            key: "actions",
            label: "관리",
            render: (r) => (
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => suspend(r.id)}
                  className="rounded bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600"
                >
                  정지
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => activate(r.id)}
                  className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"
                >
                  활성
                </button>
              </div>
            )
          }
        ]}
        rows={users.map((u) => ({ ...u, _key: u.id }))}
      />
    </div>
  );
}

function PostsTab({ onToast }) {
  const [data, setData] = useState({ notices: [], popups: [], feedPosts: [], mediaCampaigns: [] });
  const [section, setSection] = useState("notices");
  const [form, setForm] = useState({ title: "", bodyText: "", highlightText: "", imageUrl: "", startsAt: "", endsAt: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchAdminPosts();
      setData(res);
    } catch (e) {
      onToast?.(e?.message || "게시물 조회 실패");
    }
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const createNotice = async () => {
    if (!form.title.trim() || !form.bodyText.trim()) {
      onToast?.("공지 제목·본문 입력");
      return;
    }
    setBusy(true);
    try {
      await createAdminNotice(form);
      onToast?.("공지 배포 완료");
      setForm({ title: "", bodyText: "", highlightText: "", imageUrl: "", startsAt: "", endsAt: "" });
      load();
    } catch (e) {
      onToast?.(e?.message || "실패");
    } finally {
      setBusy(false);
    }
  };

  const createPopup = async () => {
    if (!form.imageUrl || !form.startsAt || !form.endsAt) {
      onToast?.("팝업 이미지·기간 입력");
      return;
    }
    setBusy(true);
    try {
      await createAdminPopup(form);
      onToast?.("마케팅 팝업 등록");
      load();
    } catch (e) {
      onToast?.(e?.message || "실패");
    } finally {
      setBusy(false);
    }
  };

  const rows =
    section === "notices"
      ? data.notices
      : section === "popups"
        ? data.popups
        : section === "feed"
          ? data.feedPosts
          : data.mediaCampaigns;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { id: "notices", label: "공지사항" },
          { id: "popups", label: "마케팅 팝업" },
          { id: "feed", label: "피드 게시물" },
          { id: "media", label: "미디어 쇼핑" }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSection(t.id)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-bold ${section === t.id ? "bg-blue-600 text-white" : "bg-slate-100"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {section === "notices" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <p className="text-[13px] font-black">새 공지 배포</p>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="제목" className="w-full rounded-lg border px-3 py-2 text-[13px]" />
          <input value={form.highlightText} onChange={(e) => setForm((f) => ({ ...f, highlightText: e.target.value }))} placeholder="강조 문구" className="w-full rounded-lg border px-3 py-2 text-[13px]" />
          <textarea value={form.bodyText} onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))} placeholder="본문" rows={3} className="w-full rounded-lg border px-3 py-2 text-[13px]" />
          <button type="button" disabled={busy} onClick={createNotice} className="rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-bold text-white">
            공지 배포
          </button>
        </div>
      ) : null}

      {section === "popups" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <p className="text-[13px] font-black">새 마케팅 팝업</p>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="제목" className="w-full rounded-lg border px-3 py-2 text-[13px]" />
          <input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="imageUrl" className="w-full rounded-lg border px-3 py-2 text-[13px]" />
          <div className="grid grid-cols-2 gap-2">
            <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} className="rounded-lg border px-2 py-2 text-[12px]" />
            <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} className="rounded-lg border px-2 py-2 text-[12px]" />
          </div>
          <button type="button" disabled={busy} onClick={createPopup} className="rounded-lg bg-indigo-600 px-4 py-2 text-[12px] font-bold text-white">
            팝업 등록
          </button>
        </div>
      ) : null}

      <Table
        emptyLabel="항목 없음"
        columns={
          section === "notices"
            ? [
                { key: "title", label: "제목" },
                { key: "publishedAt", label: "배포", render: (r) => (r.publishedAt || "").slice(0, 16) },
                {
                  key: "act",
                  label: "",
                  render: (r) => (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("삭제할까요?")) return;
                        await deleteAdminNotice(r.id);
                        onToast?.("삭제됨");
                        load();
                      }}
                      className="text-[10px] font-bold text-rose-600"
                    >
                      삭제
                    </button>
                  )
                }
              ]
            : section === "popups"
              ? [
                  { key: "title", label: "제목" },
                  { key: "isActive", label: "활성", render: (r) => (r.isActive ? "Y" : "N") },
                  {
                    key: "act",
                    label: "",
                    render: (r) => (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await updateAdminPopup(r.id, { isActive: !r.isActive });
                            load();
                          }}
                          className="text-[10px] font-bold text-blue-600"
                        >
                          토글
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm("삭제?")) return;
                            await deleteAdminPopup(r.id);
                            load();
                          }}
                          className="text-[10px] font-bold text-rose-600"
                        >
                          삭제
                        </button>
                      </div>
                    )
                  }
                ]
              : section === "feed"
                ? [
                    { key: "title", label: "제목", render: (r) => r.title || r.bodyPreview },
                    { key: "author", label: "작성", render: (r) => r.authorHandle || r.authorName },
                    {
                      key: "act",
                      label: "",
                      render: (r) => (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm("삭제?")) return;
                            await deleteAdminFeedPost(r.id);
                            load();
                          }}
                          className="text-[10px] font-bold text-rose-600"
                        >
                          삭제
                        </button>
                      )
                    }
                  ]
                : [
                    { key: "title", label: "캠페인" },
                    { key: "status", label: "상태" },
                    { key: "shopId", label: "상점" }
                  ]
        }
        rows={(rows || []).map((r) => ({ ...r, _key: r.id }))}
      />
    </div>
  );
}

function OnboardingTab({ onToast }) {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const [s, q] = await Promise.all([fetchAdminOnboardingStats(), fetchAdminManualReview()]);
      setStats(s.stats);
      setRequests(q.requests || []);
    } catch (e) {
      onToast?.(e?.message || "조회 실패");
    }
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (id, action) => {
    setBusyId(id);
    try {
      await resolveAdminManualReview(id, action);
      onToast?.(action === "approve" ? "승인" : "반려");
      load();
    } catch (e) {
      onToast?.(e?.message || "실패");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-3"><p className="text-[10px] text-slate-500">30일 심사</p><p className="text-[20px] font-black">{stats?.total ?? "—"}</p></div>
        <div className="rounded-xl border bg-white p-3"><p className="text-[10px] text-slate-500">자동승인</p><p className="text-[20px] font-black text-emerald-600">{stats?.autoApproved ?? "—"}</p></div>
        <div className="rounded-xl border bg-white p-3"><p className="text-[10px] text-slate-500">수동대기</p><p className="text-[20px] font-black text-rose-600">{stats?.manualReview ?? "—"}</p></div>
        <div className="rounded-xl border bg-white p-3"><p className="text-[10px] text-slate-500">승인률</p><p className="text-[20px] font-black">{stats ? `${stats.autoRatePercent}%` : "—"}</p></div>
      </div>
      <Table
        emptyLabel="수동 심사 대기 없음"
        columns={[
          { key: "company", label: "업체", render: (r) => r.companyName || r.legalName || r.publicHandle },
          { key: "reason", label: "사유", render: (r) => r.failureReason || "—" },
          {
            key: "act",
            label: "처리",
            render: (r) => (
              <div className="flex gap-1">
                <button type="button" disabled={busyId === r.id} onClick={() => resolve(r.id, "approve")} className="rounded bg-blue-600 px-2 py-1 text-[10px] font-bold text-white">승인</button>
                <button type="button" disabled={busyId === r.id} onClick={() => resolve(r.id, "reject")} className="rounded border border-rose-300 px-2 py-1 text-[10px] font-bold text-rose-600">반려</button>
              </div>
            )
          }
        ]}
        rows={requests.map((r) => ({ ...r, _key: r.id }))}
      />
    </div>
  );
}

export default function AdminConsoleDesk({ user, onLogout }) {
  const [tab, setTab] = useState("health");
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-black text-slate-900">VLUE 관리자 대시보드</p>
            <p className="text-[11px] text-slate-500">
              {user.legalName || user.publicHandle} · {user.role}
            </p>
          </div>
          <button type="button" onClick={onLogout} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-bold text-slate-600">
            로그아웃
          </button>
        </div>
        <nav className="mx-auto mt-3 flex max-w-6xl flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-bold ${tab === t.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        {tab === "health" ? <HealthTab onToast={showToast} /> : null}
        {tab === "pricing" ? <PricingManagerPanel onToast={showToast} /> : null}
        {tab === "users" ? <UsersTab onToast={showToast} /> : null}
        {tab === "posts" ? <PostsTab onToast={showToast} /> : null}
        {tab === "onboarding" ? <OnboardingTab onToast={showToast} /> : null}
      </main>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-[12px] font-bold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
