import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  buildRefundInquiryMailto,
  confirmPushPurchase,
  markPushRead
} from "../lib/pushNotificationInbox.js";
import { acceptFamilyProtectionLink, rejectFamilyProtectionLink } from "../lib/familyProtectionApi.js";
import { marketingLegalUrl } from "../lib/legalPageLinks.js";

const CATEGORY_STYLE = {
  가족보호: "bg-emerald-50 text-emerald-700",
  안심: "bg-emerald-50 text-emerald-700",
  앱: "bg-blue-50 text-blue-700",
  공지: "bg-indigo-50 text-indigo-700",
  결제: "bg-sky-50 text-sky-800",
  기타: "bg-gray-100 text-gray-600"
};

/**
 * 알림 상세 보기 팝업 (body 포털 — 전체화면 시트 위에서도 탭 가능)
 * 결제 알림은 구매확인 + 환불 문의(고객센터 메일) 제공
 */
export default function PushNotificationDetailModal({
  open,
  item,
  displayTime = "",
  isDarkMode = false,
  memberHandle = "",
  onClose,
  onUpdated
}) {
  const [view, setView] = useState(item);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [familyBusy, setFamilyBusy] = useState(false);
  const [familyDone, setFamilyDone] = useState("");

  useEffect(() => {
    setView(item);
    setFamilyDone("");
  }, [item, open]);

  if (!open || !item || typeof document === "undefined") return null;

  const current = view || item;
  const catStyle = CATEGORY_STYLE[current.category] || CATEGORY_STYLE.기타;
  const isRead = Boolean(current.read);
  const isPayment =
    current.kind === "payment" || current.category === "결제" || current.needsPurchaseConfirm;
  const canConfirm = isPayment && current.needsPurchaseConfirm && !current.purchaseConfirmed;
  const resolvedHandle =
    String(memberHandle || "").replace(/^@/, "").trim() ||
    String(
      typeof localStorage !== "undefined" ? localStorage.getItem("vlue_member_handle") || "" : ""
    )
      .replace(/^@/, "")
      .trim();

  const isFamilyInvite =
    current.kind === "family_invite" ||
    Boolean(current.familyInvitePending && current.linkId);
  const canFamilyRespond = isFamilyInvite && current.linkId && !familyDone;

  const onFamilyAccept = async () => {
    if (familyBusy || !canFamilyRespond) return;
    setFamilyBusy(true);
    try {
      await acceptFamilyProtectionLink(current.linkId);
      markPushRead(current.id);
      setFamilyDone("accepted");
      window.dispatchEvent(new CustomEvent("vlue-family-protection-changed"));
      onUpdated?.({ ...current, read: true, familyInvitePending: false });
    } catch (e) {
      setFamilyDone(String(e?.message || "수락 실패"));
    } finally {
      setFamilyBusy(false);
    }
  };

  const onFamilyReject = async () => {
    if (familyBusy || !canFamilyRespond) return;
    setFamilyBusy(true);
    try {
      await rejectFamilyProtectionLink(current.linkId);
      markPushRead(current.id);
      setFamilyDone("rejected");
      window.dispatchEvent(new CustomEvent("vlue-family-protection-changed"));
      onUpdated?.({ ...current, read: true, familyInvitePending: false });
    } catch (e) {
      setFamilyDone(String(e?.message || "거절 실패"));
    } finally {
      setFamilyBusy(false);
    }
  };

  const onConfirmPurchase = () => {
    if (confirmBusy || !canConfirm) return;
    setConfirmBusy(true);
    try {
      const next = confirmPushPurchase(current.id);
      if (next) {
        setView(next);
        onUpdated?.(next);
      }
    } finally {
      setConfirmBusy(false);
    }
  };

  const onRefundInquiry = () => {
    const href = buildRefundInquiryMailto({
      productName: current.productName,
      amountKrw: current.amountKrw,
      paymentId: current.paymentId,
      handle: resolvedHandle
    });
    window.location.href = href;
  };

  const onOpenRefundPolicy = () => {
    window.open(marketingLegalUrl("refund"), "_blank", "noopener,noreferrer");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[260] flex items-end justify-center bg-black/45 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-notif-detail-title"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[min(92dvh,720px)] w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-2xl ${
          isDarkMode ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3 ${
            isDarkMode ? "border-white/10" : "border-slate-100"
          }`}
        >
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${catStyle}`}>
                {current.category || "알림"}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  isRead
                    ? isDarkMode
                      ? "bg-white/10 text-slate-300"
                      : "bg-slate-100 text-slate-500"
                    : "bg-blue-600 text-white"
                }`}
              >
                {isRead ? "확인" : "미확인"}
              </span>
              {current.purchaseConfirmed ? (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">
                  구매확정
                </span>
              ) : null}
              {displayTime ? (
                <span className={`text-[11px] font-medium ${isDarkMode ? "text-slate-400" : "text-slate-400"}`}>
                  {displayTime}
                </span>
              ) : null}
            </div>
            <h3 id="push-notif-detail-title" className="text-[16px] font-black leading-snug tracking-tight">
              {current.title || "알림"}
            </h3>
          </div>
          <button
            type="button"
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
            }`}
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {isPayment && (current.productName || current.amountKrw != null) ? (
            <div
              className={`mb-4 rounded-xl border px-3.5 py-3 text-left ${
                isDarkMode ? "border-white/10 bg-white/5" : "border-sky-100 bg-sky-50/80"
              }`}
            >
              <p className="text-[11px] font-black uppercase tracking-wide text-sky-700">구매 상품</p>
              <p className="mt-1 text-[15px] font-black">{current.productName || "VLUE 상품"}</p>
              {current.productDetail ? (
                <p
                  className={`mt-2 whitespace-pre-wrap text-[13px] leading-relaxed ${
                    isDarkMode ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {current.productDetail}
                </p>
              ) : null}
              {current.amountKrw != null ? (
                <p className={`mt-2 text-[14px] font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  {Number(current.amountKrw).toLocaleString("ko-KR")}원
                </p>
              ) : null}
            </div>
          ) : null}
          <p
            className={`whitespace-pre-wrap break-words text-[14px] font-medium leading-relaxed ${
              isDarkMode ? "text-slate-200" : "text-slate-700"
            }`}
          >
            {current.body || "내용이 없습니다."}
          </p>
          {familyDone === "accepted" ? (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] font-bold text-emerald-800">
              가족 보호 초대를 수락했습니다.
            </p>
          ) : null}
          {familyDone === "rejected" ? (
            <p className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] font-bold text-gray-700">
              가족 보호 초대를 거절했습니다.
            </p>
          ) : null}
          {familyDone && familyDone !== "accepted" && familyDone !== "rejected" ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] font-bold text-red-700">
              {familyDone}
            </p>
          ) : null}
          {current.purchaseConfirmed ? (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] font-bold text-emerald-800">
              구매가 확정되었습니다. 이용해 주셔서 감사합니다.
            </p>
          ) : null}
          {isPayment ? (
            <div
              className={`mt-4 rounded-xl border px-3.5 py-3 text-[12px] leading-relaxed ${
                isDarkMode ? "border-white/10 bg-white/5 text-slate-300" : "border-amber-100 bg-amber-50/70 text-slate-700"
              }`}
            >
              <p className="font-black text-amber-800">환불·청약철회</p>
              <p className="mt-1.5 font-medium">
                환불이 필요하시면 아래 <span className="font-black">환불 문의</span>로 고객센터에 신청해 주세요.
                메일에는 결제 정보가 미리 채워집니다. 규정은{" "}
                <button
                  type="button"
                  className="font-black text-sky-700 underline underline-offset-2"
                  onClick={onOpenRefundPolicy}
                >
                  환불·청약철회 규정
                </button>
                을 확인해 주세요.
              </p>
            </div>
          ) : null}
        </div>
        <div
          className={`shrink-0 space-y-2 border-t px-4 py-3 ${isDarkMode ? "border-white/10" : "border-slate-100"}`}
        >
          {canFamilyRespond ? (
            <>
              <button
                type="button"
                disabled={familyBusy}
                className="w-full rounded-xl bg-emerald-600 py-3 text-[14px] font-black text-white active:scale-[0.99] disabled:opacity-60"
                onClick={onFamilyAccept}
              >
                {familyBusy ? "처리 중…" : "수락"}
              </button>
              <button
                type="button"
                disabled={familyBusy}
                className="w-full rounded-xl border border-red-200 bg-red-50 py-3 text-[14px] font-black text-red-700 active:scale-[0.99] disabled:opacity-60"
                onClick={onFamilyReject}
              >
                거절
              </button>
            </>
          ) : null}
          {canConfirm ? (
            <button
              type="button"
              disabled={confirmBusy}
              className="w-full rounded-xl bg-emerald-600 py-3 text-[14px] font-black text-white active:scale-[0.99] disabled:opacity-60"
              onClick={onConfirmPurchase}
            >
              {confirmBusy ? "처리 중…" : "구매확인"}
            </button>
          ) : null}
          {isPayment ? (
            <button
              type="button"
              className={`w-full rounded-xl py-3 text-[14px] font-black active:scale-[0.99] ${
                isDarkMode
                  ? "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/40"
                  : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
              }`}
              onClick={onRefundInquiry}
            >
              환불 문의
            </button>
          ) : null}
          <button
            type="button"
            className={`w-full rounded-xl py-3 text-[14px] font-black active:scale-[0.99] ${
              canConfirm || isPayment || canFamilyRespond
                ? isDarkMode
                  ? "bg-white/10 text-slate-100"
                  : "bg-slate-100 text-slate-700"
                : "bg-blue-600 text-white"
            }`}
            onClick={onClose}
          >
            {canConfirm || isPayment || canFamilyRespond ? "닫기" : "확인"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
