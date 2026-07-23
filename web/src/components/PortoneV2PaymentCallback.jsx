import { useEffect, useState } from "react";
import { completePortoneV2FromRedirectSearch } from "../lib/portoneV2Payment.js";

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search || "");
        const code = params.get("code") || "";
        const message = params.get("message") || "";
        const pgCode = params.get("pgCode") || "";

        // 고객 취소·PG 실패는 승인 API 호출 없이 안내만
        if (code || pgCode === "9000" || /취소/.test(message)) {
          if (cancelled) return;
          setStatus("cancelled");
          setDetail(message || "결제가 취소되었습니다.");
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
        setDetail(`결제 승인 완료 (${result.paymentId})`);
        onDone?.(result);
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setDetail(e?.message || "결제 승인 실패");
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
    status === "ok" ? "결제 완료" : status === "cancelled" ? "결제 취소" : status === "error" ? "결제 실패" : "결제 확인";

  return (
    <div style={{ padding: 24, textAlign: "center", minHeight: "100dvh", display: "grid", placeContent: "center", gap: 12 }}>
      <h1 style={{ fontSize: 18, margin: 0 }}>{title}</h1>
      <p style={{ margin: 0, color: "#444", wordBreak: "keep-all" }}>
        {status === "processing" ? "결제를 확인하고 있습니다…" : detail}
      </p>
      {status !== "processing" ? (
        <button
          type="button"
          onClick={goApp}
          style={{
            marginTop: 8,
            padding: "12px 20px",
            borderRadius: 12,
            border: 0,
            background: "#111",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          앱으로 돌아가기
        </button>
      ) : null}
    </div>
  );
}
