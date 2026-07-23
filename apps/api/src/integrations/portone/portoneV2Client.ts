/**
 * 포트원 V2 REST — 결제 단건 조회
 * Authorization: PortOne ${PORTONE_V2_API_SECRET}
 *
 * V1(imp_key/imp_secret)과 시크릿이 다릅니다. 콘솔 › 결제 연동 › V2 API Secret 을 사용하세요.
 */

const PORTONE_V2_API = "https://api.portone.io";

export type PortoneV2PaymentAmount = {
  total?: number;
  taxFree?: number;
  vat?: number;
  supply?: number;
  discount?: number;
  paid?: number;
  cancelled?: number;
  cancelledTaxFree?: number;
};

export type PortoneV2Payment = {
  id?: string;
  status?: string;
  orderName?: string;
  amount?: PortoneV2PaymentAmount;
  currency?: string;
  paidAt?: string;
  channel?: { type?: string; id?: string; key?: string; name?: string; pgProvider?: string };
  customData?: unknown;
  [key: string]: unknown;
};

function requireV2ApiSecret(): string {
  const secret =
    process.env.PORTONE_V2_API_SECRET?.trim() ||
    // 일부 환경에서 V2 시크릿만 PORTONE_API_SECRET 에 넣은 경우 허용 (V1과 혼용 주의)
    (process.env.PORTONE_V2_USE_LEGACY_SECRET_ENV === "1"
      ? process.env.PORTONE_API_SECRET?.trim()
      : "") ||
    "";
  if (!secret) {
    throw new Error(
      "PORTONE_V2_API_SECRET 환경변수가 필요합니다. (포트원 콘솔 › 결제 연동 › API Secret)"
    );
  }
  return secret;
}

/** GET /payments/{paymentId} */
export async function getPortoneV2Payment(paymentId: string): Promise<PortoneV2Payment> {
  const id = String(paymentId || "").trim();
  if (!id) throw new Error("paymentId가 필요합니다.");

  const secret = requireV2ApiSecret();
  const res = await fetch(`${PORTONE_V2_API}/payments/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: {
      Authorization: `PortOne ${secret}`,
      "Content-Type": "application/json"
    }
  });

  const body = (await res.json().catch(() => ({}))) as PortoneV2Payment & {
    message?: string;
    type?: string;
  };

  if (!res.ok) {
    throw new Error(
      body?.message || `포트원 V2 결제 조회 실패 (HTTP ${res.status})`
    );
  }

  return body;
}
