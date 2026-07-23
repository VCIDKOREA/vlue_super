import { useEffect, useState } from "react";
import { completePortoneV2FromRedirectSearch } from "../lib/portoneV2Payment.js";
import "../styles/portone-v2-callback.css";

function StatusIcon({ status }) {
  if (status === "processing") {
    return <span className="portone-v2-cb__spinner" aria-hidden />;
  }
  if (status === "ok") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 13.2 9.2 17.5 19 7.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "cancelled") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 7l10 10M17 7 7 17"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 8v5.5M12 16.5h.01"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/**
 * 모바일 리다이렉트 복귀 화면.
 * URL: /app/payment/v2/callback?paymentId=...
 */
export default function PortoneV2PaymentCallback({
  expectedAmount,
  orderName,
  onDone,
  onError
}) {
  const [status, setStatus] = useState("processing");
  const [detail, setDetail] = useState("");
  const [paymentId, setPaymentId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search || "");
        const code = params.get("code") || "";
        const message = params.get("message") || "";
        const pgCode = params.get("pgCode") || "";
        const qPaymentId = params.get("paymentId") || "";
        if (qPaymentId) setPaymentId(qPaymentId);

        // 고객 취소·PG 실패는 승인 API 호출 없이 안내만
        if (code || pgCode === "9000" || /취소/.test(message)) {
          if (cancelled) return;
          setStatus("cancelled");
          setDetail(message || "결제가 취소되었습니다. 언제든 다시 시도할 수 있어요.");
          return;
        }

        const pendingAmount = expectedAmount ?? Number(sessionStorage.getItem("vlue_v2_pay_amount") || 0);
        const pendingName = orderName || sessionStorage.getItem("vlue_v2_pay_order_name") || undefined;
        const result = await completePortoneV2FromRedirectSearch(window.location.search, {
          expectedAmount: pendingAmount > 0 ? pendingAmount : undefined,
          orderName: pendingName
        });
        if (cancelled) return;
        setStatus("ok");
        setPaymentId(result.paymentId || qPaymentId);
        setDetail("결제가 정상적으로 승인되었습니다.");
        try {
          const { addPushNotification } = await import("../lib/pushNotificationInbox.js");
          addPushNotification({
            category: "결제",
            title: "결제 완료",
            body: `${result.orderName || "VLUE 결제"} · ${Number(result.amountTotal || 0).toLocaleString("ko-KR")}원 결제가 완료되었습니다.`
          });
        } catch {
          /* ignore */
        }
        onDone?.(result);
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setDetail(e?.message || "결제 승인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        onError?.(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expectedAmount, orderName, onDone, onError]);

  const goApp = () => {
    window.location.replace("/app");
  };

  const title =
    status === "ok"
      ? "결제 완료"
      : status === "cancelled"
        ? "결제 취소"
        : status === "error"
          ? "결제 실패"
          : "결제 확인 중";

  const hint =
    status === "ok"
      ? "VLUE에서 이어서 이용해 보세요."
      : status === "cancelled"
        ? "설정 › 결제 테스트에서 다시 진행할 수 있습니다."
        : status === "error"
          ? "문제가 계속되면 고객센터로 문의해 주세요."
          : null;

  return (
    <div className="portone-v2-cb" data-status={status}>
      <div className="portone-v2-cb__stage">
        <p className="portone-v2-cb__brand">VLUE</p>
        <div className={`portone-v2-cb__mark portone-v2-cb__mark--${status}`} aria-hidden>
          <StatusIcon status={status} />
        </div>
        <h1 className="portone-v2-cb__title">{title}</h1>
        <p className="portone-v2-cb__detail">
          {status === "processing" ? "결제 내역을 안전하게 확인하고 있어요…" : detail}
        </p>
        {paymentId && status !== "processing" ? (
          <p className="portone-v2-cb__id" title={paymentId}>
            결제번호 {paymentId}
          </p>
        ) : null}
        {status !== "processing" ? (
          <div className="portone-v2-cb__actions">
            <button type="button" className="portone-v2-cb__btn portone-v2-cb__btn--primary" onClick={goApp}>
              앱으로 돌아가기
            </button>
            {hint ? <p className="portone-v2-cb__hint">{hint}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
