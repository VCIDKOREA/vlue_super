import { useCallback, useEffect, useState } from "react";
import {
  fetchOwnerPendingDccApprovals,
  reviewOwnerDccApproval
} from "../lib/enterpriseDccApi.js";
import { VLUE_SSE_APP_EVENT } from "../lib/vlueSse.js";

/**
 * 대표자/관계자 — DCC 직장 인증 승인·거절 (사칭 신고 연계)
 */
export default function DccOwnerApprovalInbox({ isDarkMode = false, onToast }) {
  const [items, setItems] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [rejectOpenId, setRejectOpenId] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [reportImpersonation, setReportImpersonation] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchOwnerPendingDccApprovals();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
    const onFocus = () => void load();
    const onSse = (ev) => {
      const t = ev?.detail?.type;
      if (t === "vlue-dcc-owner-approval") void load();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener(VLUE_SSE_APP_EVENT, onSse);
    const poll = window.setInterval(() => void load(), 20000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(VLUE_SSE_APP_EVENT, onSse);
      window.clearInterval(poll);
    };
  }, [load]);

  if (!items.length) return null;

  const card = isDarkMode ? "border-white/15 bg-slate-900" : "border-violet-100 bg-violet-50/50";

  const act = async (id, action) => {
    setBusyId(id);
    try {
      const res = await reviewOwnerDccApproval(id, {
        action,
        rejectReason: action === "reject" ? rejectReason : undefined,
        reportImpersonation: action === "reject" ? reportImpersonation : false
      });
      onToast?.(
        action === "approve"
          ? "승인했습니다. 신청자가 위치 인증을 진행합니다."
          : res.banned
            ? "거절·사칭 신고 접수 — 해당 계정 DCC 생성이 영구 차단되었습니다."
            : "거절 처리했습니다."
      );
      setRejectOpenId("");
      setRejectReason("");
      await load();
    } catch (e) {
      onToast?.(e?.message || "처리 실패");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className={`mb-3 space-y-2 rounded-xl border p-3 ${card}`}>
      <p className="text-[13px] font-black text-violet-800">DCC 직장 인증 요청</p>
      <p className="text-[11px] text-slate-600">
        소속 기업으로 들어온 인증 요청입니다. 승인 또는 거절(사칭 신고)해 주세요.
      </p>
      {items.map((it) => (
        <div key={it.id} className="rounded-lg border border-violet-100 bg-white p-3">
          <p className="text-[12px] font-bold text-slate-900">
            {it.companyNameLocked || "회사"} · {it.applicantName}
            {it.department ? ` / ${it.department}` : ""}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            [{it.applicantName}]님께서 [{it.department || "부서 미입력"}]으로 대표자 인증을 요청하였습니다.
            승인하시겠습니까?
          </p>
          {rejectOpenId === it.id ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                placeholder="거절·신고 사유"
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]"
              />
              <label className="flex items-center gap-2 text-[11px] font-bold text-rose-700">
                <input
                  type="checkbox"
                  checked={reportImpersonation}
                  onChange={(e) => setReportImpersonation(e.target.checked)}
                />
                사칭으로 신고 (DCC 생성 영구 차단)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyId === it.id}
                  onClick={() => void act(it.id, "reject")}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-black text-white"
                >
                  거절·신고
                </button>
                <button
                  type="button"
                  onClick={() => setRejectOpenId("")}
                  className="rounded-lg border px-3 py-1.5 text-[11px] font-bold"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={busyId === it.id}
                onClick={() => void act(it.id, "approve")}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white"
              >
                승인
              </button>
              <button
                type="button"
                disabled={busyId === it.id}
                onClick={() => setRejectOpenId(it.id)}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-700"
              >
                거절
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
