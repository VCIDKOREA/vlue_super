import { useCallback, useEffect, useRef, useState } from "react";
import PricingManagerPanel from "./PricingManagerPanel.jsx";
import AdminMetricsPanel from "./AdminMetricsPanel.jsx";
import AdminDiagnosticsPanel from "./AdminDiagnosticsPanel.jsx";
import AdminAgencyDcpPanel from "./AdminAgencyDcpPanel.jsx";
import { ADMIN_DIAGNOSTICS_UI_ENABLED } from "../../lib/adminDiagnosticsFlags.js";
import {
  createAdminNotice,
  createAdminPopup,
  createAdminSignatureSound,
  createAdminSignatureSoundUploadUrl,
  deleteAdminFeedPost,
  deleteAdminNotice,
  deleteAdminPopup,
  fetchAdminEnterpriseDccPending,
  fetchAdminHealth,
  fetchAdminManualReview,
  fetchAdminOnboardingStats,
  fetchAdminPosts,
  fetchAdminSignatureSounds,
  fetchAdminBroadcastAudiences,
  fetchAdminOverdueLines,
  fetchAdminUsers,
  fetchAdminUser,
  fetchAdminGroupAccountPending,
  patchAdminSignatureSound,
  patchAdminUser,
  adminSuspendUser,
  adminActivateUser,
  adminWithdrawUser,
  adminRestoreUser,
  adminGrantPaidUser,
  resolveAdminManualReview,
  reviewAdminEnterpriseDcc,
  reviewAdminGroupAccount,
  saveAdminDigitalLetter,
  setAdminDigitalLetterActive,
  sendAdminBroadcast,
  fetchAdminAndroidVersion,
  saveAdminAndroidVersion,
  testAdminNotification,
  testAdminScanner,
  updateAdminNotice,
  updateAdminPopup
} from "../../lib/adminConsoleApi.js";

const TABS = [
  { id: "metrics", label: "DB 지표" },
  ...(ADMIN_DIAGNOSTICS_UI_ENABLED
    ? [{ id: "diagnostics", label: "Diagnostics" }]
    : []),
  { id: "agencies", label: "국가기관 DCP" },
  { id: "enterpriseDcc", label: "기업명함 승인" },
  { id: "groupAccount", label: "계좌 승인" },
  { id: "health", label: "상태 점검" },
  { id: "broadcast", label: "회원 알림" },
  { id: "pricing", label: "요금제 관리" },
  { id: "signature", label: "Signature Sound" },
  { id: "users", label: "회원 관리" },
  { id: "overdue", label: "미납 회선" },
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

function MemberBroadcastTab({ onToast }) {
  const [audiences, setAudiences] = useState([]);
  const [audience, setAudience] = useState("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("공지");
  const [busy, setBusy] = useState(false);
  const [verCode, setVerCode] = useState("46");
  const [verName, setVerName] = useState("1.0.4");
  const [verBusy, setVerBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchAdminBroadcastAudiences();
      setAudiences(data.audiences || []);
    } catch (e) {
      onToast?.(e?.message || "대상 그룹 조회 실패");
    }
    try {
      const ver = await fetchAdminAndroidVersion();
      if (ver?.latestVersionCode) setVerCode(String(ver.latestVersionCode));
      if (ver?.latestVersionName) setVerName(String(ver.latestVersionName));
    } catch {
      /* ignore */
    }
  }, [onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = audiences.find((a) => a.id === audience);
  const send = async () => {
    if (!title.trim() || !body.trim()) {
      onToast?.("제목과 내용을 입력해 주세요.");
      return;
    }
    const label = selected?.label || audience;
    const count = selected?.count ?? "?";
    const ok = window.confirm(
      `[${label}] 대상 약 ${count}명에게 알림을 보냅니다.\n\n제목: ${title.trim()}\n\n계속할까요?`
    );
    if (!ok) return;

    setBusy(true);
    try {
      const result = await sendAdminBroadcast({
        audience,
        title: title.trim(),
        body: body.trim(),
        category: category.trim() || "공지",
        confirm: true
      });
      const truncated = result.truncated ? ` (상한 ${result.maxSend}명)` : "";
      const tokenHint =
        result.pushUsersWithTokens != null
          ? ` · 토큰 ${result.pushUsersWithTokens}명`
          : "";
      const skipHint = result.pushSkipReason
        ? ` · ${
            result.pushSkipReason === "no_tokens"
              ? "FCM 토큰 없음"
              : result.pushSkipReason === "fcm_not_configured"
                ? "서버 FCM 미설정"
                : result.pushSkipReason.includes("private key") ||
                    result.pushSkipReason.includes("Cannot read")
                  ? "FCM 초기화 오류"
                  : result.pushSkipReason
          }`
        : "";
      onToast?.(
        `발송 완료 · 대상 ${result.targeted}명 · 알림함 ${result.inboxSaved} · 푸시 ${result.pushSent}${tokenHint}${skipHint}${truncated}`
      );
      void load();
    } catch (e) {
      onToast?.(e?.message || "발송 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
        <p className="text-[13px] font-black text-slate-800">앱 버전 업데이트 안내 (알림 없이)</p>
        <p className="text-[11px] leading-relaxed text-slate-600">
          스토어에 새 APK를 올린 뒤 여기 최신 versionCode를 저장하세요. 그보다 낮은 앱이 실행되면
          「새로운 버전이 있습니다. 업데이트 하시겠습니까?」 팝업 → 확인 시 스토어로 이동합니다.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-black text-slate-500">최신 versionCode</span>
            <input
              value={verCode}
              onChange={(e) => setVerCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
              placeholder="46"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-black text-slate-500">버전명</span>
            <input
              value={verName}
              onChange={(e) => setVerName(e.target.value)}
              maxLength={32}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
              placeholder="1.0.4"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={verBusy || !verCode}
          onClick={() => {
            setVerBusy(true);
            void saveAdminAndroidVersion({
              latestVersionCode: Number(verCode),
              latestVersionName: verName.trim() || String(verCode)
            })
              .then((res) => {
                onToast?.(
                  `앱 최신 버전 저장: ${res.latestVersionName} (${res.latestVersionCode})`
                );
              })
              .catch((e) => onToast?.(e?.message || "버전 저장 실패"))
              .finally(() => setVerBusy(false));
          }}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-[12px] font-black text-white disabled:opacity-50"
        >
          {verBusy ? "저장 중…" : "최신 버전 저장"}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-black text-slate-800">회원 그룹별 알림 발송</p>
        <button type="button" onClick={() => void load()} className="rounded-lg bg-slate-100 px-3 py-1.5 text-[12px] font-bold">
          대상 수 새로고침
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {audiences.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAudience(a.id)}
            className={`rounded-xl border p-3 text-left transition ${
              audience === a.id
                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <p className="text-[12px] font-black text-slate-800">{a.label}</p>
            <p className="mt-1 text-[18px] font-black text-blue-700">{a.count?.toLocaleString() ?? "—"}명</p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <label className="block">
          <span className="text-[11px] font-black text-slate-500">분류</span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            maxLength={12}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
            placeholder="공지"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-black text-slate-500">제목</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
            placeholder="알림 제목"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-black text-slate-500">내용</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1200}
            rows={5}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
            placeholder="알림 본문"
          />
        </label>
        <p className="text-[11px] text-slate-500">
          선택 그룹: <strong>{selected?.label || "—"}</strong>
          {selected?.count != null ? ` · 약 ${selected.count.toLocaleString()}명` : null}
          {" · "}알림함 저장 + 앱 푸시(FCM) · 1회 최대 5,000명
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void send()}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
        >
          {busy ? "발송 중…" : "알림 보내기"}
        </button>
      </div>
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

function EnterpriseDccAdminTab({ onToast }) {
  const [items, setItems] = useState([]);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await fetchAdminEnterpriseDccPending();
      setItems(data.items || []);
    } catch (e) {
      onToast?.(e?.message || "목록 조회 실패");
    }
  }, [onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (id, action) => {
    setBusyId(id);
    try {
      await reviewAdminEnterpriseDcc(id, action);
      onToast?.(action === "approve" ? "승인 · 결제 단계 오픈" : "반려 처리");
      await load();
    } catch (e) {
      onToast?.(e?.message || "처리 실패");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-black text-slate-800">기업·대표번호 인증명함 승인 대기</p>
        <button type="button" onClick={() => void load()} className="rounded-lg bg-slate-100 px-3 py-1.5 text-[12px] font-bold">
          새로고침
        </button>
      </div>
      <Table
        columns={[
          {
            key: "company",
            label: "상호·사업자",
            render: (row) => (
              <div>
                <p className="font-bold">{row.companyNameLocked || "—"}</p>
                <p className="text-[10px] text-slate-500">{row.businessRegistrationNo}</p>
              </div>
            )
          },
          {
            key: "detail",
            label: "부서·담당·DCC",
            render: (row) => (
              <div className="text-[11px]">
                <p>{row.department || "—"}</p>
                <p>{row.contactName || "—"}</p>
                <p>{row.dccOutboundPhone || "—"}</p>
              </div>
            )
          },
          {
            key: "actions",
            label: "처리",
            render: (row) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void review(row.id, "approve")}
                  className="rounded border border-emerald-300 px-2 py-1 text-[10px] font-bold text-emerald-700"
                >
                  승인
                </button>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void review(row.id, "reject")}
                  className="rounded border border-rose-300 px-2 py-1 text-[10px] font-bold text-rose-600"
                >
                  반려
                </button>
              </div>
            )
          }
        ]}
        rows={items.map((r) => ({ ...r, _key: r.id }))}
        emptyLabel="승인 대기 신청 없음"
      />
    </div>
  );
}

function GroupAccountAdminTab({ onToast }) {
  const [items, setItems] = useState([]);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await fetchAdminGroupAccountPending();
      setItems(data.items || []);
    } catch (e) {
      onToast?.(e?.message || "목록 조회 실패");
    }
  }, [onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (cardId, action) => {
    setBusyId(cardId);
    try {
      await reviewAdminGroupAccount(cardId, action);
      onToast?.(
        action === "approve"
          ? "계좌 승인 · 명함 앞면에 표시됩니다"
          : "계좌 반려 처리"
      );
      await load();
    } catch (e) {
      onToast?.(e?.message || "처리 실패");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-black text-slate-800">모임/단체 계좌 승인 대기</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            명함 설정에서 「모임/단체 통장」으로 등록·전체적용한 건만 표시됩니다. 승인 후 앞면에 계좌가 노출됩니다.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-lg bg-slate-100 px-3 py-1.5 text-[12px] font-bold">
          새로고침
        </button>
      </div>
      <Table
        columns={[
          {
            key: "member",
            label: "회원",
            render: (row) => (
              <div>
                <p className="font-bold">{row.legalName || row.publicHandle || "—"}</p>
                <p className="text-[10px] text-slate-500">
                  {row.organization || "—"} · {row.phoneE164 || "—"}
                </p>
                <p className="text-[10px] text-slate-400">card {String(row.cardId || "").slice(0, 8)}…</p>
              </div>
            )
          },
          {
            key: "account",
            label: "계좌",
            render: (row) => (
              <div className="text-[11px]">
                <p className="font-semibold">{row.bankName}</p>
                <p className="tabular-nums">{row.accountNumber}</p>
                <p>{row.accountHolder}</p>
                {row.accountGroupDocName ? (
                  <p className="mt-1 text-[10px] text-blue-700">서류: {row.accountGroupDocName}</p>
                ) : (
                  <p className="mt-1 text-[10px] text-amber-700">통장 사본 파일명 없음</p>
                )}
              </div>
            )
          },
          {
            key: "when",
            label: "신청",
            render: (row) => (
              <span className="text-[10px] text-slate-500">
                {row.updatedAt ? new Date(row.updatedAt).toLocaleString("ko-KR") : "—"}
              </span>
            )
          },
          {
            key: "actions",
            label: "처리",
            render: (row) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyId === row.cardId}
                  onClick={() => void review(row.cardId, "approve")}
                  className="rounded border border-emerald-300 px-2 py-1 text-[10px] font-bold text-emerald-700"
                >
                  승인
                </button>
                <button
                  type="button"
                  disabled={busyId === row.cardId}
                  onClick={() => void review(row.cardId, "reject")}
                  className="rounded border border-rose-300 px-2 py-1 text-[10px] font-bold text-rose-600"
                >
                  반려
                </button>
              </div>
            )
          }
        ]}
        rows={items.map((r) => ({ ...r, _key: r.cardId || r.id }))}
        emptyLabel="승인 대기 계좌 없음"
      />
    </div>
  );
}

function accountStatusLabel(row) {
  if (row?.status === "DELETED") {
    const t = String(row?.accountActionType || "");
    if (t === "permanent_ban" || t === "withdraw_permanent_ban") return "영구추방";
    return "탈퇴완료";
  }
  if (row?.pendingWithdrawal) {
    const until = String(row.recoverableUntil || "").replace("T", " ").slice(0, 16);
    return until ? `탈퇴예정 · ${until}까지 복구` : "탈퇴예정";
  }
  const s = String(row?.accountStatus || row || "");
  if (s === "active") return "활성";
  if (s === "suspended") return "정지";
  if (s === "pending_identity") return "본인인증 대기";
  if (s === "pending_approval") return "가입 승인 대기";
  return s || "—";
}

function MemberActionModal({
  open,
  title,
  hint,
  confirmLabel,
  confirmClass,
  requireReason,
  showImmediate,
  forcePermanentBan = false,
  showPaidMonths = false,
  onClose,
  onConfirm,
  busy
}) {
  const PAID_MONTH_OPTIONS = [1, 3, 6, 12];
  const [reason, setReason] = useState("");
  const [months, setMonths] = useState(12);
  const [immediate, setImmediate] = useState(false);
  const [permanentBan, setPermanentBan] = useState(false);
  useEffect(() => {
    if (open) {
      setReason("");
      setMonths(12);
      setImmediate(Boolean(forcePermanentBan));
      setPermanentBan(Boolean(forcePermanentBan));
    }
  }, [open, forcePermanentBan]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <p className="text-[15px] font-black text-slate-900">{title}</p>
        {hint ? <p className="mt-2 text-[12px] leading-relaxed text-slate-500">{hint}</p> : null}
        {showPaidMonths ? (
          <fieldset className="mt-3">
            <legend className="text-[11px] font-bold text-slate-600">부여 기간</legend>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {PAID_MONTH_OPTIONS.map((m) => {
                const active = months === m;
                return (
                  <label
                    key={m}
                    className={`cursor-pointer rounded-lg border px-2 py-2 text-center text-[12px] font-bold ${
                      active
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="admin-paid-months"
                      className="sr-only"
                      checked={active}
                      onChange={() => setMonths(m)}
                    />
                    {m}개월
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500">
              사유: <span className="font-bold text-slate-700">테스터 쿠폰</span>
              {" · 쿠폰 코드 VLUE_TESTER"}
            </p>
          </fieldset>
        ) : null}
        {requireReason ? (
          <label className="mt-3 block text-[11px] font-bold text-slate-600">
            사유 (필수)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-medium text-slate-900"
              placeholder="문의 내용·처리 근거를 입력하세요"
            />
          </label>
        ) : (
          <label className="mt-3 block text-[11px] font-bold text-slate-600">
            {showPaidMonths ? "추가 메모 (선택)" : "메모 (선택)"}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-medium text-slate-900"
              placeholder={showPaidMonths ? "참고 메모가 있으면 입력" : "복구 사유가 있으면 입력"}
            />
          </label>
        )}
        {showImmediate && !forcePermanentBan ? (
          <>
            <label className="mt-3 flex items-start gap-2 text-[12px] font-semibold text-rose-700">
              <input
                type="checkbox"
                checked={immediate}
                disabled={permanentBan}
                onChange={(e) => {
                  setImmediate(e.target.checked);
                  if (e.target.checked) setPermanentBan(false);
                }}
                className="mt-0.5"
              />
              <span>
                즉시 탈퇴(개인정보 파기 · 복구 불가 · 재가입 시 본인인증 필요). 체크하지 않으면 24시간 유예
                후 자동 탈퇴되며 그사이 복구 가능합니다.
              </span>
            </label>
            <label className="mt-2 flex items-start gap-2 text-[12px] font-semibold text-rose-900">
              <input
                type="checkbox"
                checked={permanentBan}
                onChange={(e) => {
                  setPermanentBan(e.target.checked);
                  if (e.target.checked) setImmediate(true);
                }}
                className="mt-0.5"
              />
              <span>영구 추방(동일 본인인증으로 재가입 불가). 사칭·악용 등 운영 차단용입니다.</span>
            </label>
          </>
        ) : null}
        {forcePermanentBan ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-semibold leading-snug text-rose-900">
            동일 본인인증(CI)으로는 재가입할 수 없습니다. 개인정보는 파기되며 복구할 수 없습니다.
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-[12px] font-bold text-slate-500"
          >
            취소
          </button>
          <button
            type="button"
            disabled={busy || (requireReason && reason.trim().length < 2)}
            onClick={() =>
              onConfirm({
                reason: reason.trim(),
                months,
                immediate: forcePermanentBan ? true : immediate,
                permanentBan: forcePermanentBan ? true : permanentBan
              })
            }
            className={`rounded-lg px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50 ${confirmClass || "bg-slate-900"}`}
          >
            {busy ? "처리 중…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function membershipLabel(user) {
  const path = user?.membershipPathLabel;
  if (path) return path;
  const t = String(user?.membershipTier || "free").toLowerCase();
  if (t === "paid" || t === "standard" || t === "premium") return "유료";
  if (t === "free") return "무료";
  if (t === "b2b") return "B2B";
  return t || "—";
}

function isFreeMembership(user) {
  const t = String(user?.membershipTier || "free").toLowerCase();
  return !t || t === "free" || t === "pending_payment";
}

function formatAdminDate(iso) {
  const s = String(iso || "");
  if (!s) return "—";
  return s.replace("T", " ").slice(0, 16);
}

function signupMethodLabel(method) {
  const m = String(method || "");
  if (m === "vlue_native") return "VLUE 앱";
  if (m === "social_kakao") return "카카오";
  if (m === "social_google") return "구글";
  if (m === "social_naver") return "네이버";
  if (m === "social_instagram") return "인스타그램";
  return m || "—";
}

function MemberDetail({ user, onClose }) {
  const rows = [
    ["가입일시", formatAdminDate(user.createdAt)],
    ["아이디", user.publicHandle ? `@${user.publicHandle}` : "—"],
    ["실명", user.legalName || "—"],
    ["전화번호", user.phoneDisplay || user.phoneE164 || "—"],
    ["이메일", user.email || "—"],
    ["생년월일", user.birthDisplay || "—"],
    ["성별", user.genderDisplay || "—"],
    ["본인인증", user.identityVerified ? `완료${user.identityVerifiedAt ? ` · ${formatAdminDate(user.identityVerifiedAt)}` : ""}` : "미완료"],
    ["가입 경로", signupMethodLabel(user.signupMethod)],
    ["멤버십", membershipLabel(user)],
    ["멤버십 경로", user.membershipPathLabel || membershipLabel(user)],
    ["디지털명함", user.digitalCardIssued ? "발급" : "미발급"],
    ["상호", user.companyName || "—"],
    ["직함", user.jobTitle || "—"],
    ["사업자번호", user.businessRegistrationNo || "—"],
    ["직장메일 인증", user.isCompanyVerified ? "완료" : "—"],
    ["추천인 코드", user.referrerCode || "—"],
    ["계정 상태", `${accountStatusLabel(user)} / ${user.status || "—"}`],
    ["탈퇴 예약", user.pendingWithdrawal ? `${formatAdminDate(user.recoverableUntil)}까지 복구 가능` : "—"],
    ["최근 처리 사유", user.accountActionReason || "—"],
    ["최근 처리", user.accountActionType ? `${user.accountActionType} · ${formatAdminDate(user.accountActionAt)}` : "—"],
    ["역할", user.role || "—"],
    ["약관 동의", formatAdminDate(user.termsAcceptedAt)]
  ];
  return (
    <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[14px] font-black text-slate-900">가입 회원 정보</p>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600">
          닫기
        </button>
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-0.5 break-all text-[13px] font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function OverdueLinesTab({ onToast }) {
  const [q, setQ] = useState("");
  const [lines, setLines] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminOverdueLines({ q });
      setLines(data.lines || []);
      setTotal(data.total || 0);
    } catch (e) {
      onToast?.(e?.message || "미납 회선 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [q, onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const statusLabel = (status) => {
    if (status === "grace") return "유예(미납)";
    if (status === "lapsed") return "만료·삭제";
    return status || "—";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름·핸들·번호 검색"
          className="rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
        />
        <button type="button" onClick={load} className="rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-bold text-white">
          {loading ? "조회 중…" : "조회"}
        </button>
        <p className="text-[12px] text-slate-500">미납·유예·만료 회선 {total}건</p>
      </div>
      <Table
        emptyLabel="미납 회선이 없습니다"
        columns={[
          { key: "legalName", label: "회원", render: (r) => `${r.legalName || "—"} (@${r.publicHandle || ""})` },
          { key: "phoneDisplay", label: "회선 번호" },
          { key: "kind", label: "종류" },
          { key: "status", label: "상태", render: (r) => statusLabel(r.status) },
          {
            key: "graceEndsAt",
            label: "유예 마감",
            render: (r) =>
              r.graceEndsAt
                ? new Date(r.graceEndsAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
                : "—"
          },
          { key: "amountKrw", label: "금액", render: (r) => `${Number(r.amountKrw || 0).toLocaleString("ko-KR")}원` },
          { key: "email", label: "이메일" }
        ]}
        rows={lines.map((row) => ({ ...row, _key: row.id }))}
      />
    </div>
  );
}

function UsersTab({ onToast }) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null);

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

  const openDetail = async (row) => {
    setSelected(row);
    try {
      const data = await fetchAdminUser(row.id);
      if (data?.user) setSelected(data.user);
    } catch {
      /* 목록 데이터로 표시 */
    }
  };

  const runAction = async ({ reason, immediate, permanentBan, months }) => {
    if (!action?.userId || !action?.type) return;
    setBusyId(action.userId);
    try {
      if (action.type === "suspend") {
        await adminSuspendUser(action.userId, { reason });
        onToast?.("활동 정지 처리");
      } else if (action.type === "activate") {
        await adminActivateUser(action.userId, { reason });
        onToast?.("계정 활성화");
      } else if (action.type === "withdraw" || action.type === "permanent_ban") {
        const mode =
          action.type === "permanent_ban" || permanentBan
            ? "permanent_ban"
            : immediate
              ? "immediate"
              : "grace";
        const res = await adminWithdrawUser(action.userId, { reason, mode });
        onToast?.(
          res?.message ||
            (mode === "permanent_ban"
              ? "영구 추방 처리"
              : immediate
                ? "즉시 탈퇴 처리"
                : "탈퇴 예약(24시간 복구 가능)")
        );
      } else if (action.type === "restore") {
        const res = await adminRestoreUser(action.userId, { reason });
        onToast?.(res?.message || "복구 완료");
      } else if (action.type === "grant_paid") {
        const paidMonths = [1, 3, 6, 12].includes(Number(months)) ? Number(months) : 12;
        const memo = String(reason || "").trim();
        const paidReason = memo ? `테스터 쿠폰 · ${memo}` : "테스터 쿠폰";
        const res = await adminGrantPaidUser(action.userId, {
          reason: paidReason,
          months: paidMonths
        });
        onToast?.(res?.message || `테스터 쿠폰으로 유료 ${paidMonths}개월 적용`);
      }
      setAction(null);
      load();
    } catch (e) {
      onToast?.(e?.message || "처리 실패");
    } finally {
      setBusyId("");
    }
  };

  const actionMeta = (() => {
    if (!action) return null;
    if (action.type === "suspend") {
      return {
        title: "회원 정지",
        hint: "정지 사유를 남겨 주세요. 이후 「복구」로 다시 활성화할 수 있습니다.",
        confirmLabel: "정지 처리",
        confirmClass: "bg-rose-600",
        requireReason: true,
        showImmediate: false,
        forcePermanentBan: false
      };
    }
    if (action.type === "withdraw") {
      return {
        title: "회원 탈퇴 처리",
        hint: "고객 요청 탈퇴는 재가입(본인인증 다시)이 가능합니다. 사칭·악용은 「영구 추방」 버튼을 사용하세요.",
        confirmLabel: "탈퇴 처리",
        confirmClass: "bg-rose-700",
        requireReason: true,
        showImmediate: true,
        forcePermanentBan: false
      };
    }
    if (action.type === "permanent_ban") {
      return {
        title: "영구 추방",
        hint: "사칭·악용 등 운영 차단용입니다. 동일 본인인증으로는 재가입할 수 없습니다.",
        confirmLabel: "영구 추방 확정",
        confirmClass: "bg-black",
        requireReason: true,
        showImmediate: false,
        forcePermanentBan: true
      };
    }
    if (action.type === "grant_paid") {
      return {
        title: "유료 업그레이드 (테스터 쿠폰)",
        hint: "결제 없이 유료 멤버십을 부여합니다. 사유는 「테스터 쿠폰」으로 기록되며, 기간을 선택하세요.",
        confirmLabel: "유료 적용",
        confirmClass: "bg-blue-600",
        requireReason: false,
        showImmediate: false,
        forcePermanentBan: false,
        showPaidMonths: true
      };
    }
    if (action.type === "restore") {
      return {
        title: "계정 복구",
        hint: action.pendingWithdrawal
          ? "탈퇴 예약을 취소하고 계정을 다시 활성화합니다."
          : "정지 상태를 해제하고 활성화합니다.",
        confirmLabel: "복구",
        confirmClass: "bg-emerald-600",
        requireReason: false,
        showImmediate: false,
        forcePermanentBan: false
      };
    }
    if (action.type === "activate") {
      return {
        title: "계정 활성화",
        hint: "정지·대기 상태를 활성으로 바꿉니다.",
        confirmLabel: "활성화",
        confirmClass: "bg-emerald-600",
        requireReason: false,
        showImmediate: false,
        forcePermanentBan: false
      };
    }
    return null;
  })();

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="아이디·이름·이메일·전화·상호 검색"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
        />
        <button type="button" onClick={load} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-bold text-white">
          검색
        </button>
      </div>
      <p className="text-[11px] text-slate-500">
        총 {total}명 · 유료=테스터 쿠폰(VLUE_TESTER) · 정지/탈퇴/영구추방은 사유 필수 · 탈퇴 기본 24시간 복구 · 영구추방은
        재가입 불가
      </p>
      {selected ? <MemberDetail user={selected} onClose={() => setSelected(null)} /> : null}
      <MemberActionModal
        open={Boolean(actionMeta)}
        title={actionMeta?.title}
        hint={actionMeta?.hint}
        confirmLabel={actionMeta?.confirmLabel}
        confirmClass={actionMeta?.confirmClass}
        requireReason={actionMeta?.requireReason}
        showImmediate={actionMeta?.showImmediate}
        forcePermanentBan={actionMeta?.forcePermanentBan}
        showPaidMonths={Boolean(actionMeta?.showPaidMonths)}
        busy={Boolean(busyId)}
        onClose={() => setAction(null)}
        onConfirm={(payload) => void runAction(payload)}
      />
      <Table
        emptyLabel={loading ? "불러오는 중…" : "회원 없음"}
        columns={[
          { key: "createdAt", label: "가입일", render: (r) => formatAdminDate(r.createdAt) },
          { key: "handle", label: "아이디", render: (r) => (r.publicHandle ? `@${r.publicHandle}` : "—") },
          { key: "name", label: "실명", render: (r) => r.legalName || "—" },
          { key: "phone", label: "전화", render: (r) => r.phoneDisplay || r.phoneE164 || "—" },
          { key: "email", label: "이메일", render: (r) => r.email || "—" },
          {
            key: "identity",
            label: "본인인증",
            render: (r) => (r.identityVerified ? "완료" : "미완료")
          },
          {
            key: "membership",
            label: "멤버십",
            render: (r) => membershipLabel(r)
          },
          { key: "status", label: "상태", render: (r) => accountStatusLabel(r) },
          {
            key: "actions",
            label: "관리",
            render: (r) => {
              const deleted = r.status === "DELETED";
              const pending = Boolean(r.pendingWithdrawal);
              const suspended = r.accountStatus === "suspended" && !pending;
              const canGrantPaid = !deleted && !pending && isFreeMembership(r);
              return (
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => openDetail(r)}
                    className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700"
                  >
                    상세
                  </button>
                  {canGrantPaid ? (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => setAction({ type: "grant_paid", userId: r.id })}
                      className="rounded bg-blue-600 px-2 py-1 text-[10px] font-bold text-white"
                    >
                      유료
                    </button>
                  ) : null}
                  {!deleted && !pending ? (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => setAction({ type: "suspend", userId: r.id })}
                      className="rounded bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600"
                    >
                      정지
                    </button>
                  ) : null}
                  {!deleted && (pending || suspended) ? (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() =>
                        setAction({ type: "restore", userId: r.id, pendingWithdrawal: pending })
                      }
                      className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"
                    >
                      복구
                    </button>
                  ) : null}
                  {!deleted && !pending && !suspended ? (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => setAction({ type: "activate", userId: r.id })}
                      className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"
                    >
                      활성
                    </button>
                  ) : null}
                  {!deleted && !pending ? (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => setAction({ type: "withdraw", userId: r.id })}
                      className="rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white"
                    >
                      탈퇴
                    </button>
                  ) : null}
                  {!deleted && !pending ? (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => setAction({ type: "permanent_ban", userId: r.id })}
                      className="rounded bg-black px-2 py-1 text-[10px] font-bold text-white"
                    >
                      영구추방
                    </button>
                  ) : null}
                </div>
              );
            }
          }
        ]}
        rows={users.map((u) => ({ ...u, _key: u.id }))}
      />
    </div>
  );
}

function PostsTab({ onToast }) {
  const [data, setData] = useState({ notices: [], popups: [], feedPosts: [], mediaCampaigns: [], letters: [] });
  const [section, setSection] = useState("notices");
  const [form, setForm] = useState({ title: "", bodyText: "", highlightText: "", imageUrl: "", startsAt: "", endsAt: "" });
  const [letterForm, setLetterForm] = useState({
    id: "",
    title: "",
    body: "",
    bgmUrl: "",
    bgmSoundId: "",
    bgmVolume: 0.45,
    isActive: true
  });
  const [signatureSounds, setSignatureSounds] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [res, soundsRes] = await Promise.all([
        fetchAdminPosts(),
        fetchAdminSignatureSounds().catch(() => ({ items: [] }))
      ]);
      const sounds = Array.isArray(soundsRes?.items) ? soundsRes.items : [];
      setSignatureSounds(sounds);
      setData({ ...res, letters: res.letters || [] });
      const active = (res.letters || []).find((l) => l.isActive) || (res.letters || [])[0];
      if (active) {
        const match = sounds.find((s) => s.audioUrl && s.audioUrl === active.bgmUrl);
        setLetterForm({
          id: active.id || "",
          title: active.title || "",
          body: active.body || "",
          bgmUrl: active.bgmUrl || "",
          bgmSoundId: match?.id || "",
          bgmVolume: typeof active.bgmVolume === "number" ? active.bgmVolume : 0.45,
          isActive: active.isActive !== false
        });
      }
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

  const saveLetter = async () => {
    if (!letterForm.body.trim()) {
      onToast?.("편지 본문을 입력해 주세요");
      return;
    }
    setBusy(true);
    try {
      const selected = signatureSounds.find((s) => s.id === letterForm.bgmSoundId);
      await saveAdminDigitalLetter({
        id: letterForm.id || undefined,
        title: letterForm.title,
        body: letterForm.body,
        bgmUrl: selected?.audioUrl || "",
        bgmVolume: letterForm.bgmVolume,
        isActive: letterForm.isActive !== false
      });
      onToast?.("VLUE 편지 저장 완료 (버전↑ → 미확인 사용자에게 다시 표시)");
      load();
    } catch (e) {
      onToast?.(e?.message || "편지 저장 실패");
    } finally {
      setBusy(false);
    }
  };

  const rows =
    section === "notices"
      ? data.notices
      : section === "popups"
        ? data.popups
        : section === "letters"
          ? data.letters || []
          : section === "feed"
            ? data.feedPosts
            : data.mediaCampaigns;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { id: "notices", label: "공지사항" },
          { id: "popups", label: "마케팅 팝업" },
          { id: "letters", label: "VLUE 편지" },
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

      {section === "letters" ? (
        <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-orange-50/80 via-white to-sky-50 p-4 space-y-2">
          <p className="text-[13px] font-black text-slate-800">VLUE가 전하는 편지</p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            첫 로그인 사용자에게 필독으로 표시됩니다. 저장 시 버전이 올라가면 아직 확인하지 않은 사용자·이전 버전만 본 사용자에게 다시 보입니다. BGM은{" "}
            <strong className="font-bold text-slate-600">Signature Sound</strong>에 업로드된 곡에서 고릅니다.
          </p>
          <input
            value={letterForm.title}
            onChange={(e) => setLetterForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="편지 제목"
            className="w-full rounded-lg border border-amber-100 bg-white px-3 py-2 text-[13px]"
          />
          <textarea
            value={letterForm.body}
            onChange={(e) => setLetterForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="편지 본문"
            rows={12}
            className="w-full rounded-lg border border-amber-100 bg-white px-3 py-2 text-[13px] leading-relaxed"
          />
          <label className="block text-[11px] font-bold text-slate-500">편지 BGM (Signature Sound)</label>
          <select
            value={letterForm.bgmSoundId || ""}
            onChange={(e) => {
              const id = e.target.value;
              const selected = signatureSounds.find((s) => s.id === id);
              setLetterForm((f) => ({
                ...f,
                bgmSoundId: id,
                bgmUrl: selected?.audioUrl || ""
              }));
            }}
            className="w-full rounded-lg border border-amber-100 bg-white px-3 py-2 text-[13px]"
          >
            <option value="">BGM 없음</option>
            {signatureSounds.map((s) => (
              <option key={s.id} value={s.id} disabled={!s.audioUrl}>
                {(s.title || "제목 없음") +
                  (s.artistName ? ` · ${s.artistName}` : "") +
                  (s.isPublished ? "" : " (미게시)") +
                  (s.audioUrl ? "" : " · URL없음")}
              </option>
            ))}
          </select>
          {!signatureSounds.length ? (
            <p className="text-[11px] text-amber-700">
              등록된 Signature Sound가 없습니다. 「Signature Sound」 탭에서 먼저 업로드해 주세요.
            </p>
          ) : letterForm.bgmSoundId && letterForm.bgmUrl ? (
            <audio controls preload="none" src={letterForm.bgmUrl} className="w-full h-9" />
          ) : null}
          <label className="block text-[11px] font-bold text-slate-500">
            기본 음량 {Math.round((Number(letterForm.bgmVolume) || 0) * 100)}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round((Number(letterForm.bgmVolume) || 0) * 100)}
            onChange={(e) =>
              setLetterForm((f) => ({ ...f, bgmVolume: Math.min(1, Math.max(0, Number(e.target.value) / 100)) }))
            }
            className="w-full accent-sky-600"
          />
          <p className="text-[10px] text-slate-400">편지 저장 시 기본 음량으로 적용됩니다. 사용자는 편지 화면에서도 조절·기억됩니다.</p>
          <label className="flex items-center gap-2 text-[12px] font-bold text-slate-600">
            <input
              type="checkbox"
              checked={letterForm.isActive !== false}
              onChange={(e) => setLetterForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            활성 (첫 방문 자동 표시)
          </label>
          <button type="button" disabled={busy} onClick={saveLetter} className="rounded-lg bg-sky-600 px-4 py-2 text-[12px] font-bold text-white">
            편지 저장
          </button>
        </div>
      ) : null}

      {section !== "letters" ? (
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
      ) : (
        <Table
          emptyLabel="저장된 편지 없음"
          columns={[
            { key: "title", label: "제목", render: (r) => (r.title || "").slice(0, 28) },
            { key: "version", label: "ver" },
            { key: "isActive", label: "활성", render: (r) => (r.isActive ? "Y" : "N") },
            {
              key: "act",
              label: "",
              render: (r) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setLetterForm({
                        id: r.id,
                        title: r.title || "",
                        body: r.body || "",
                        bgmUrl: r.bgmUrl || "",
                        bgmSoundId: signatureSounds.find((s) => s.audioUrl && s.audioUrl === r.bgmUrl)?.id || "",
                        bgmVolume: typeof r.bgmVolume === "number" ? r.bgmVolume : 0.45,
                        isActive: r.isActive !== false
                      })
                    }
                    className="text-[10px] font-bold text-blue-600"
                  >
                    불러오기
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await setAdminDigitalLetterActive(r.id, true);
                      onToast?.("활성 편지로 설정");
                      load();
                    }}
                    className="text-[10px] font-bold text-emerald-600"
                  >
                    활성화
                  </button>
                </div>
              )
            }
          ]}
          rows={(data.letters || []).map((r) => ({ ...r, _key: r.id }))}
        />
      )}
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
  const [tab, setTab] = useState("metrics");
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
        {tab === "metrics" ? <AdminMetricsPanel onToast={showToast} /> : null}
        {tab === "diagnostics" && ADMIN_DIAGNOSTICS_UI_ENABLED ? (
          <AdminDiagnosticsPanel onToast={showToast} />
        ) : null}
        {tab === "agencies" ? <AdminAgencyDcpPanel onToast={showToast} /> : null}
        {tab === "enterpriseDcc" ? <EnterpriseDccAdminTab onToast={showToast} /> : null}
        {tab === "groupAccount" ? <GroupAccountAdminTab onToast={showToast} /> : null}
        {tab === "health" ? <HealthTab onToast={showToast} /> : null}
        {tab === "broadcast" ? <MemberBroadcastTab onToast={showToast} /> : null}
        {tab === "pricing" ? <PricingManagerPanel onToast={showToast} /> : null}
        {tab === "signature" ? <SignatureSoundTab onToast={showToast} /> : null}
        {tab === "users" ? <UsersTab onToast={showToast} /> : null}
        {tab === "overdue" ? <OverdueLinesTab onToast={showToast} /> : null}
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

function titleFromFileName(name) {
  const base = String(name || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return base || "Untitled";
}

function guessAudioContentType(file) {
  const t = String(file?.type || "").trim();
  if (t && t !== "application/octet-stream") return t;
  const n = String(file?.name || "").toLowerCase();
  if (n.endsWith(".wav")) return "audio/wav";
  if (n.endsWith(".m4a") || n.endsWith(".aac")) return "audio/mp4";
  if (n.endsWith(".ogg")) return "audio/ogg";
  if (n.endsWith(".webm")) return "audio/webm";
  return "audio/mpeg";
}

function isLikelyAudioFile(file) {
  if (!file) return false;
  if (/^audio\//i.test(file.type || "")) return true;
  if (/\.(mp3|m4a|wav|ogg|aac|webm|flac|aiff|aif)$/i.test(file.name || "")) return true;
  /* USB 등 확장자 없는 음원 — 선택 목록에 올렸으면 통과 */
  if (!/\.[a-z0-9]{1,5}$/i.test(file.name || "")) return true;
  return false;
}

function SignatureSoundTab({ onToast }) {
  const [items, setItems] = useState([]);
  const [artistName, setArtistName] = useState("VLUE");
  const [queue, setQueue] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const filesInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchAdminSignatureSounds();
      setItems(data.items || []);
    } catch (e) {
      onToast?.(e?.message || "목록 실패");
    }
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const enqueueFiles = (fileList) => {
    const raw = Array.from(fileList || []);
    const files = raw.filter(isLikelyAudioFile);
    if (!files.length) {
      onToast?.(raw.length ? "오디오로 인식된 파일이 없습니다" : "파일을 선택해 주세요");
      return;
    }
    setQueue((prev) => {
      const seen = new Set(prev.map((p) => `${p.file.name}|${p.file.size}|${p.file.lastModified}`));
      const next = [];
      files.forEach((file, i) => {
        const key = `${file.name}|${file.size}|${file.lastModified}`;
        if (seen.has(key)) return;
        seen.add(key);
        next.push({
          id: `${Date.now()}-${i}-${key}`,
          file,
          title: titleFromFileName(file.name),
          status: "ready"
        });
      });
      return [...prev, ...next];
    });
    if (files.length < raw.length) {
      onToast?.(`${files.length}개 추가 · ${raw.length - files.length}개 건너뜀`);
    } else {
      onToast?.(`${files.length}개 대기열에 추가됨`);
    }
  };

  const onPickFiles = (e) => {
    enqueueFiles(e.target.files);
    e.target.value = "";
  };

  const updateQueueTitle = (id, title) => {
    setQueue((prev) => prev.map((row) => (row.id === id ? { ...row, title } : row)));
  };

  const removeQueueItem = (id) => {
    setQueue((prev) => prev.filter((row) => row.id !== id));
  };

  const clearQueue = () => setQueue([]);

  const uploadOne = async (row, artist) => {
    const file = row.file;
    const contentType = guessAudioContentType(file);
    const signed = await createAdminSignatureSoundUploadUrl({
      fileName: /\.[a-z0-9]+$/i.test(file.name) ? file.name : `${file.name}.mp3`,
      contentType,
      fileSize: file.size
    });
    const put = await fetch(signed.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": signed.contentType || contentType },
      body: file
    });
    if (!put.ok) throw new Error("업로드 실패");
    await createAdminSignatureSound({
      title: String(row.title || "").trim() || titleFromFileName(file.name),
      artistName: artist,
      audioUrl: signed.publicUrl,
      objectKey: signed.path,
      contentType: signed.contentType || contentType,
      fileSize: file.size,
      isPublished: true
    });
  };

  const onBatchUpload = async () => {
    const pending = queue.filter((q) => q.status === "ready" || q.status === "error");
    if (!pending.length) {
      onToast?.("업로드할 파일을 추가해 주세요");
      return;
    }
    const blank = pending.find((q) => !String(q.title || "").trim());
    if (blank) {
      onToast?.("제목이 비어 있는 항목이 있습니다");
      return;
    }

    setBusy(true);
    const artist = artistName.trim() || "VLUE";
    let okCount = 0;
    let failCount = 0;

    for (let i = 0; i < pending.length; i += 1) {
      const row = pending[i];
      setProgress(`${i + 1}/${pending.length} · ${row.file.name}`);
      setQueue((prev) => prev.map((q) => (q.id === row.id ? { ...q, status: "uploading" } : q)));
      try {
        await uploadOne(row, artist);
        okCount += 1;
        setQueue((prev) => prev.map((q) => (q.id === row.id ? { ...q, status: "done" } : q)));
      } catch (err) {
        failCount += 1;
        setQueue((prev) =>
          prev.map((q) =>
            q.id === row.id ? { ...q, status: "error", error: err?.message || "실패" } : q
          )
        );
      }
    }

    setProgress("");
    setBusy(false);
    setQueue((prev) => prev.filter((q) => q.status !== "done"));
    onToast?.(
      failCount
        ? `완료 ${okCount}곡 · 실패 ${failCount}곡`
        : `Signature Sound ${okCount}곡 등록됨`
    );
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-[14px] font-black text-slate-900">VLUE Signature Sound</h2>
        <p className="mt-1 text-[12px] text-slate-500">
          여러 파일을 선택하거나 폴더 전체를 추가한 뒤 「일괄 업로드」를 누르세요. 제목은 파일명으로
          자동 입력됩니다. (R2 Presigned)
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          파일 선택 창에서 Ctrl+클릭 / Shift+클릭 / Ctrl+A 로 여러 개를 고르거나, 「폴더 추가」를 사용하세요.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
            placeholder="아티스트 (일괄 적용)"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            disabled={busy}
          />
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-bold text-slate-800 disabled:opacity-50"
            disabled={busy}
            onClick={() => filesInputRef.current?.click()}
          >
            여러 파일 추가
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-bold text-slate-800 disabled:opacity-50"
            disabled={busy}
            onClick={() => folderInputRef.current?.click()}
          >
            폴더 추가
          </button>
          <input
            ref={filesInputRef}
            type="file"
            className="hidden"
            multiple
            disabled={busy}
            onChange={onPickFiles}
          />
          <input
            ref={folderInputRef}
            type="file"
            className="hidden"
            multiple
            disabled={busy}
            onChange={onPickFiles}
            {...{ webkitdirectory: "", directory: "" }}
          />
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50"
            disabled={busy || !queue.length}
            onClick={onBatchUpload}
          >
            {busy ? progress || "업로드 중…" : `일괄 업로드${queue.length ? ` (${queue.length})` : ""}`}
          </button>
          {queue.length ? (
            <button
              type="button"
              className="rounded-lg px-2 py-2 text-[12px] font-bold text-slate-500"
              disabled={busy}
              onClick={clearQueue}
            >
              대기열 비우기
            </button>
          ) : null}
        </div>

        {queue.length ? (
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/80 p-2">
            {queue.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-2 rounded-md bg-white px-2 py-1.5 text-[12px]"
              >
                <input
                  className="min-w-[140px] flex-1 rounded border border-slate-200 px-2 py-1"
                  value={row.title}
                  disabled={busy || row.status === "uploading"}
                  onChange={(e) => updateQueueTitle(row.id, e.target.value)}
                />
                <span className="max-w-[160px] truncate text-slate-400" title={row.file.name}>
                  {row.file.name}
                </span>
                <span
                  className={
                    row.status === "error"
                      ? "font-bold text-rose-600"
                      : row.status === "uploading"
                        ? "font-bold text-blue-600"
                        : row.status === "done"
                          ? "font-bold text-emerald-600"
                          : "text-slate-400"
                  }
                >
                  {row.status === "error"
                    ? row.error || "실패"
                    : row.status === "uploading"
                      ? "업로드 중"
                      : row.status === "done"
                        ? "완료"
                        : "대기"}
                </span>
                <button
                  type="button"
                  className="font-bold text-slate-400 hover:text-rose-600"
                  disabled={busy}
                  onClick={() => removeQueueItem(row.id)}
                >
                  제거
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[12px] text-slate-400">
            MUSIC 폴더처럼 확장자 없는 파일도 「폴더 추가」로 한 번에 넣을 수 있습니다.
          </p>
        )}
      </div>
      <Table
        columns={[
          { key: "title", label: "제목" },
          { key: "artistName", label: "아티스트" },
          {
            key: "isPublished",
            label: "게시",
            render: (row) => (row.isPublished ? "ON" : "OFF")
          },
          {
            key: "actions",
            label: "관리",
            render: (row) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-[11px] font-bold text-blue-600"
                  onClick={async () => {
                    await patchAdminSignatureSound(row.id, { isPublished: !row.isPublished });
                    load();
                  }}
                >
                  {row.isPublished ? "숨김" : "게시"}
                </button>
                <button
                  type="button"
                  className="text-[11px] font-bold text-rose-600"
                  onClick={async () => {
                    if (!window.confirm("삭제할까요?")) return;
                    await patchAdminSignatureSound(row.id, { deleted: true });
                    load();
                  }}
                >
                  삭제
                </button>
              </div>
            )
          }
        ]}
        rows={items.map((r) => ({ ...r, _key: r.id }))}
        emptyLabel="등록된 Signature Sound 없음"
      />
    </div>
  );
}
