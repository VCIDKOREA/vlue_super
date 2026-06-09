import { useCallback, useEffect, useState } from "react";
import { pricingNumbers } from "../lib/pricingConfig.js";
import { clearMembershipAccessCache } from "../lib/membershipAccessGuard.js";
import {
  deleteBroadcastLine,
  fetchBroadcastLineMe,
  fetchBroadcastRefundPolicy,
  patchBroadcastPhone,
  pauseBroadcastLine,
  prepareBroadcastCheckout,
  toggleBroadcastEnabled
} from "../lib/broadcastLineApi.js";
import BroadcastAddonCheckoutModal from "./BroadcastAddonCheckoutModal.jsx";

export default function BroadcastLineSetupPanel({ onToast, onClose }) {
  const nums = pricingNumbers();
  const [line, setLine] = useState(null);
  const [access, setAccess] = useState(null);
  const [refund, setRefund] = useState(null);
  const [phone, setPhone] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [busy, setBusy] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseAgree, setPauseAgree] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policy, setPolicy] = useState(null);

  const load = useCallback(async () => {
    const data = await fetchBroadcastLineMe();
    setLine(data.line);
    setAccess(data.access);
    setRefund(data.refund);
    if (data.line?.phoneE164) {
      setPhone(data.line.phoneE164);
      setEditPhone(data.line.phoneE164);
    }
  }, []);

  useEffect(() => {
    load().catch((e) => onToast?.(e?.message || "조회 실패"));
  }, [load, onToast]);

  useEffect(() => {
    if (!policyOpen || policy) return;
    fetchBroadcastRefundPolicy()
      .then(setPolicy)
      .catch(() => setPolicy({ summary: "", details: [] }));
  }, [policyOpen, policy]);

  const isActive = line?.status === "active" && line?.phoneVerified && line?.paidAt;
  const isPaused = line?.status === "paused";
  const needsPrimary = access && !access.hasPrimarySoho;

  const openCheckout = async () => {
    const trimmed = phone.trim();
    if (!trimmed) {
      onToast?.("추가 발신번호를 입력해 주세요.");
      return;
    }
    if (needsPrimary) {
      onToast?.("SOHO 활동형 Primary 계정이 먼저 필요합니다.");
      return;
    }
    setBusy("prepare");
    try {
      const data = await prepareBroadcastCheckout({ phoneE164: trimmed, billingCycle: "monthly" });
      setCheckout({
        phoneE164: trimmed,
        amountKrw: data.checkout?.amountKrw ?? nums.broadcastMonthly,
        billingCycle: data.checkout?.billingCycle ?? "monthly",
        refundPolicySummary: data.refundPolicySummary
      });
      setCheckoutOpen(true);
    } catch (e) {
      onToast?.(e?.message || "결제 준비 실패");
    } finally {
      setBusy("");
    }
  };

  const onCheckoutComplete = async () => {
    clearMembershipAccessCache?.();
    await load();
    onToast?.("결제가 완료되었습니다. 발신번호가 확정·승인되었습니다.");
  };

  const saveEdit = async () => {
    setBusy("edit");
    try {
      const data = await patchBroadcastPhone(editPhone.trim());
      setLine(data.line);
      setPhone(data.line.phoneE164);
      setEditMode(false);
      onToast?.("발신번호가 수정되었습니다.");
    } catch (e) {
      onToast?.(e?.message || "수정 실패");
    } finally {
      setBusy("");
    }
  };

  const onToggle = async (enabled) => {
    setBusy("toggle");
    try {
      const data = await toggleBroadcastEnabled(enabled);
      setLine(data.line);
      setAccess(data.access);
      onToast?.(enabled ? "송출이 켜졌습니다." : "송출이 꺼졌습니다.");
    } catch (e) {
      onToast?.(e?.message || "토글 실패");
    } finally {
      setBusy("");
    }
  };

  const runPause = async () => {
    if (!pauseAgree) {
      onToast?.("환불 정책에 동의해 주세요.");
      return;
    }
    setBusy("pause");
    try {
      const data = await pauseBroadcastLine({ agreeRefundPolicy: true });
      setLine(data.line);
      setAccess(data.access);
      setRefund(data.refund);
      setPauseOpen(false);
      setPauseAgree(false);
      onToast?.(`사용이 정지되었습니다. ${data.refund?.summary || ""}`);
    } catch (e) {
      onToast?.(e?.message || "정지 실패");
    } finally {
      setBusy("");
    }
  };

  const runDelete = async () => {
    setBusy("delete");
    try {
      await deleteBroadcastLine();
      setLine(null);
      setPhone("");
      setEditPhone("");
      setEditMode(false);
      setDeleteOpen(false);
      clearMembershipAccessCache?.();
      await load();
      onToast?.("발신번호가 삭제되었습니다.");
    } catch (e) {
      onToast?.(e?.message || "삭제 실패");
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[15px] font-black text-slate-900">영업 송출 옵션 · 발신번호 등록</p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
              명함 상세(이름·직함·연락처 등)는 기본 디지털인증명함 설정과 동일합니다. 추가로 등록·인증한 발신번호로
              전화할 때, 수신 화면에 해당 번호 전용 송출 명함이 함께 표시됩니다. 월{" "}
              {nums.broadcastMonthly.toLocaleString("ko-KR")}원(부가세 포함). Primary SOHO 활동형(
              {nums.sohoMonthly.toLocaleString("ko-KR")}원) 보유 후 이용.
            </p>
          </div>
          {onClose ? (
            <button type="button" onClick={onClose} className="text-[12px] font-bold text-slate-500">
              닫기
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setPolicyOpen(true)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 text-[11px] font-bold text-slate-700"
        >
          환불·정지 정책 안내
        </button>

        {needsPrimary ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800">
            SOHO 활동형 Primary 계정이 먼저 필요합니다.
          </p>
        ) : null}

        {isActive ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13px] font-black text-slate-900">등록 번호 확정 · 승인됨</p>
                <p className="mt-0.5 text-[15px] font-bold tabular-nums tracking-tight text-slate-800">
                  {line.phoneE164}
                </p>
                {line.verifiedAt ? (
                  <p className="mt-1 text-[10px] font-medium text-slate-500">
                    확정일 {new Date(line.verifiedAt).toLocaleString("ko-KR")}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 rounded-md bg-slate-800 px-2 py-0.5 text-[9px] font-bold tracking-wide text-white">
                ACTIVE
              </span>
            </div>

            <label
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white px-3.5 py-3 shadow-sm ${
                busy === "toggle" ? "opacity-70" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-slate-900">송출 명함</p>
                <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                  {line.broadcastEnabled ? "수신 화면에 표시 중" : "송출 일시 중단"}
                </p>
              </div>
              <input
                type="checkbox"
                role="switch"
                aria-checked={Boolean(line.broadcastEnabled)}
                checked={Boolean(line.broadcastEnabled)}
                disabled={busy === "toggle"}
                onChange={(e) => onToggle(e.target.checked)}
                className="peer sr-only"
              />
              <span
                className={`vlue-broadcast-switch ${line.broadcastEnabled ? "vlue-broadcast-switch--on" : ""} ${
                  busy === "toggle" ? "vlue-broadcast-switch--disabled" : ""
                }`}
                aria-hidden
              >
                <span className="vlue-broadcast-switch__knob" />
              </span>
            </label>

            {editMode ? (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-500">
                  사내유선번호 또는 추가 발신번호 등록
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px]"
                    placeholder="추가 발신번호를 입력하세요."
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy === "edit"}
                    onClick={saveEdit}
                    className="flex-1 rounded-lg bg-slate-900 py-2 text-[12px] font-bold text-white"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false);
                      setEditPhone(line.phoneE164);
                    }}
                    className="flex-1 rounded-lg border border-slate-200 py-2 text-[12px] font-bold text-slate-600"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="rounded-lg border border-slate-200 bg-white py-2 text-[11px] font-bold text-slate-700"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => setPauseOpen(true)}
                  className="rounded-lg border border-slate-200 bg-white py-2 text-[11px] font-semibold text-slate-700"
                >
                  정지 요청
                </button>
                <button
                  type="button"
                  disabled={busy === "delete"}
                  onClick={() => setDeleteOpen(true)}
                  className="rounded-lg border border-slate-200 bg-white py-2 text-[11px] font-semibold text-slate-500"
                >
                  삭제
                </button>
              </div>
            )}

            {refund ? (
              <p className="text-[10px] font-medium text-slate-500">{refund.summary}</p>
            ) : null}
          </div>
        ) : isPaused ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
            <p className="text-[13px] font-black text-amber-950">사용 정지됨</p>
            <p className="mt-1 text-[12px] text-amber-900">{line?.phoneE164}</p>
            {refund ? <p className="mt-2 text-[11px] font-semibold text-amber-800">{refund.summary}</p> : null}
            <button
              type="button"
              disabled={busy === "delete"}
              onClick={() => setDeleteOpen(true)}
              className="mt-3 w-full rounded-lg border border-slate-200 bg-white py-2 text-[12px] font-semibold text-slate-600"
            >
              등록 정보 삭제
            </button>
          </div>
        ) : (
          <>
            <label className="block text-[11px] font-bold text-slate-500">
              사내유선번호 또는 추가 발신번호 등록
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px]"
                placeholder="추가 발신번호를 입력하세요."
              />
            </label>

            <button
              type="button"
              disabled={busy === "prepare" || needsPrimary}
              onClick={openCheckout}
              className="w-full rounded-xl bg-slate-900 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
            >
              {busy === "prepare" ? "준비 중…" : "번호 등록 · 인증번호 받기"}
            </button>
            <p className="text-center text-[10px] text-slate-500">
              버튼을 누르면 추가 결제창이 열리며, 결제 완료 시 번호가 자동 확정됩니다.
            </p>
          </>
        )}
      </div>

      <BroadcastAddonCheckoutModal
        open={checkoutOpen}
        checkout={checkout}
        onClose={() => setCheckoutOpen(false)}
        onComplete={onCheckoutComplete}
        onOpenPolicy={() => setPolicyOpen(true)}
      />

      {deleteOpen ? (
        <div
          className="fixed inset-0 z-[265] flex items-end justify-center bg-black/45 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="broadcast-delete-title"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="닫기"
            onClick={() => !busy && setDeleteOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <p id="broadcast-delete-title" className="text-[15px] font-black text-slate-900">
              발신번호 삭제
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-slate-600">
              등록된 발신번호와 송출 설정이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            {line?.phoneE164 ? (
              <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-bold tabular-nums text-slate-800">
                {line.phoneE164}
              </p>
            ) : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={busy === "delete"}
                onClick={runDelete}
                className="flex-1 rounded-xl bg-slate-900 py-2.5 text-[13px] font-black text-white disabled:opacity-50"
              >
                {busy === "delete" ? "삭제 중…" : "삭제 확인"}
              </button>
              <button
                type="button"
                disabled={busy === "delete"}
                onClick={() => setDeleteOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] font-bold text-slate-600"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pauseOpen ? (
        <div className="fixed inset-0 z-[260] flex items-end justify-center bg-black/45 p-3 sm:items-center">
          <button type="button" className="absolute inset-0" aria-label="닫기" onClick={() => setPauseOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <p className="text-[15px] font-black text-slate-900">사용 정지 요청</p>
            <p className="mt-2 text-[12px] leading-relaxed text-slate-600">
              정지 즉시 송출 기능이 중단됩니다. 환불은 이용 기간에 따라 달라집니다.
            </p>
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
              {refund?.summary || "15일 이상: 환불 없음 · 15일 미만: 50% 환불 검토"}
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={pauseAgree}
                onChange={(e) => setPauseAgree(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span className="text-[11px] font-semibold text-slate-700">환불·정지 정책에 동의합니다.</span>
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={busy === "pause" || !pauseAgree}
                onClick={runPause}
                className="flex-1 rounded-xl bg-amber-600 py-2.5 text-[13px] font-black text-white disabled:opacity-50"
              >
                {busy === "pause" ? "처리 중…" : "정지 확정"}
              </button>
              <button
                type="button"
                onClick={() => setPauseOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] font-bold text-slate-600"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {policyOpen ? (
        <div className="fixed inset-0 z-[270] flex items-end justify-center bg-black/45 p-3 sm:items-center">
          <button type="button" className="absolute inset-0" aria-label="닫기" onClick={() => setPolicyOpen(false)} />
          <div className="relative max-h-[min(80vh,520px)] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
            <p className="text-[15px] font-black text-slate-900">환불·정지 정책 안내</p>
            <p className="mt-2 text-[12px] font-semibold text-slate-700">
              {policy?.summary || "월 15일 이상 사용 시 환불 없음. 15일 미만 사용 시 50% 환불."}
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-[11px] leading-relaxed text-slate-600">
              {(policy?.details || []).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setPolicyOpen(false)}
              className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-[13px] font-bold text-white"
            >
              확인
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
