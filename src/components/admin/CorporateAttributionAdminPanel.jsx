import { useCallback, useEffect, useState } from "react";
import {
  approveCorporateAttribution,
  fetchPendingCorporateAttributions
} from "../../lib/adminV1Api.js";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

function ApproveModal({ request, onClose, onApproved }) {
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await approveCorporateAttribution(request.id, adminNote.trim());
      onApproved();
      onClose();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-[16px] font-black text-gray-900">귀속 최종 승인</h3>
        <p className="mt-2 text-[12px] text-gray-600 leading-relaxed">
          <b>{request.enterprise?.companyName || "기업"}</b> ·{" "}
          {request.memberDisplayName || request.memberUser?.legalName || "직원"}
          {request.memberTitle ? ` (${request.memberTitle})` : ""}
        </p>
        <p className="mt-1 text-[11px] text-amber-800">
          승인 시 개인 구독 해지·VLUER 차단·기업 통합 청구가 즉시 적용됩니다.
        </p>
        <label className="mt-4 block text-[11px] font-bold text-gray-500">어드민 메모 (선택)</label>
        <textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px]"
          placeholder="승인 사유·서류 확인 메모"
        />
        {error ? <p className="mt-2 text-[12px] text-red-600">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[12px] font-bold text-gray-700"
          >
            취소
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-[12px] font-black text-white disabled:opacity-50"
          >
            {busy ? "처리 중…" : "최종 승인"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CorporateAttributionAdminPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approveTarget, setApproveTarget] = useState(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchPendingCorporateAttributions();
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (e) {
      if (e?.status === 403) {
        setError("이 기기는 아직 승인되지 않았습니다. 마스터 휴대폰에서 6자리 코드로 승인해 주세요.");
      } else {
        setError(e?.message || String(e));
      }
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  return (
    <div className="w-full max-w-5xl rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-black text-blue-800">기업 귀속 승인 관리</h2>
          <p className="mt-1 text-[11px] text-gray-500">
            PENDING_DOC_VERIFICATION · 서류 검증 후 최종 승인
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="rounded-xl border border-gray-200 px-4 py-2 text-[12px] font-bold text-gray-700 disabled:opacity-50"
        >
          새로고침
        </button>
      </div>

      {toast ? (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-[12px] font-semibold text-green-800">
          {toast}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-center text-[13px] text-gray-500">목록 불러오는 중…</p>
      ) : requests.length === 0 ? (
        <p className="mt-8 text-center text-[13px] text-gray-500">대기 중인 귀속 요청이 없습니다.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-3">신청 기업</th>
                <th className="py-2 pr-3">직원</th>
                <th className="py-2 pr-3">증빙 서류</th>
                <th className="py-2 pr-3">신청일</th>
                <th className="py-2 text-right">처리</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 align-top">
                  <td className="py-3 pr-3 font-semibold text-gray-900">
                    {r.enterprise?.companyName || "—"}
                    <p className="mt-0.5 text-[10px] font-normal text-gray-400">
                      {r.enterprise?.billingCycle === "annual" ? "연간권" : "월간권"}
                    </p>
                  </td>
                  <td className="py-3 pr-3">
                    <p className="font-semibold text-gray-900">
                      {r.memberDisplayName || r.memberUser?.legalName || "—"}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {r.memberTitle || "직급 미등록"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-400">{r.memberPhoneE164}</p>
                  </td>
                  <td className="py-3 pr-3">
                    {(r.documentLinks || []).length ? (
                      <ul className="space-y-1">
                        {r.documentLinks.map((doc) => (
                          <li key={doc.url}>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-blue-600 underline"
                            >
                              {doc.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-400">미제출</span>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-gray-600 whitespace-nowrap">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setApproveTarget(r)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-black text-white"
                    >
                      최종 승인
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {approveTarget ? (
        <ApproveModal
          request={approveTarget}
          onClose={() => setApproveTarget(null)}
          onApproved={() => {
            showToast("귀속 승인이 완료되었습니다.");
            load();
          }}
        />
      ) : null}
    </div>
  );
}
