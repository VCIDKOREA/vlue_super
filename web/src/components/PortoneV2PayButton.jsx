import { useState } from "react";
import {
  defaultPortoneV2RedirectUrl,
  requestPortoneV2Payment
} from "../lib/portoneV2Payment.js";

/**
 * 포트원 V2(KPN) 결제창 호출 예시 버튼.
 * Store: store-2bead538-ca75-4e6c-8035-8b6512a5b1d2 / 채널명: VLUE_결제
 *
 * 사용 전 `.env`에 `VITE_PORTONE_V2_CHANNEL_KEY` 설정 필요.
 */
export default function PortoneV2PayButton({
  orderName = "VLUE 결제",
  totalAmount = 1000,
  payMethod = "CARD",
  className = "",
  children = "결제하기",
  onPaid,
  onError
}) {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      try {
        sessionStorage.setItem("vlue_v2_pay_amount", String(totalAmount));
        sessionStorage.setItem("vlue_v2_pay_order_name", orderName);
      } catch {
        /* ignore */
      }
      const result = await requestPortoneV2Payment({
        orderName,
        totalAmount,
        payMethod,
        redirectUrl: defaultPortoneV2RedirectUrl(),
        customData: { source: "portone_v2_pay_button" }
      });
      if (result.redirected) return;
      onPaid?.(result);
    } catch (e) {
      onError?.(e);
      console.error("[portone-v2]", e);
      alert(e?.message || "결제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className={className} disabled={busy} onClick={onClick}>
      {busy ? "결제 진행 중…" : children}
    </button>
  );
}
