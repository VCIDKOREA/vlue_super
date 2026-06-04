/**
 * 포트원 V1 정기결제(빌링키) 서버 API
 * @see https://api.iamport.kr/subscribe/payments/again
 */
import { getIamportAccessToken } from "./iamportCert.js";

const IAMPORT_HOST = "https://api.iamport.kr";

export type IamportSubscribeAgainResponse = {
  imp_uid?: string;
  merchant_uid?: string;
  customer_uid?: string;
  amount?: number;
  status?: string;
  fail_reason?: string;
  [key: string]: unknown;
};

type IamportApiEnvelope<T> = {
  code?: number;
  message?: string | null;
  response?: T;
};

export async function requestSubscribePaymentAgain(
  accessToken: string,
  params: {
    customer_uid: string;
    merchant_uid: string;
    amount: number;
    name: string;
    buyer_email?: string;
    buyer_tel?: string;
  }
): Promise<IamportSubscribeAgainResponse> {
  const res = await fetch(`${IAMPORT_HOST}/subscribe/payments/again`, {
    method: "POST",
    headers: {
      Authorization: accessToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      customer_uid: params.customer_uid,
      merchant_uid: params.merchant_uid,
      amount: params.amount,
      name: params.name,
      buyer_email: params.buyer_email,
      buyer_tel: params.buyer_tel
    })
  });
  const json = (await res.json()) as IamportApiEnvelope<IamportSubscribeAgainResponse>;
  if (json.code !== 0 || !json.response) {
    throw new Error(json.message || "정기결제 첫 회차 청구에 실패했습니다.");
  }
  const pay = json.response;
  if (pay.status && pay.status !== "paid") {
    throw new Error(pay.fail_reason || `결제 상태: ${pay.status}`);
  }
  return pay;
}

export async function getIamportPayment(impUid: string, accessToken: string) {
  const res = await fetch(`${IAMPORT_HOST}/payments/${encodeURIComponent(impUid)}`, {
    headers: { Authorization: accessToken }
  });
  const json = (await res.json()) as IamportApiEnvelope<IamportSubscribeAgainResponse>;
  if (json.code !== 0 || !json.response) {
    throw new Error(json.message || "결제 조회 실패");
  }
  return json.response;
}

export async function chargeSubscribeWithPortoneSecrets(
  impKey: string,
  impSecret: string,
  params: {
    customer_uid: string;
    merchant_uid: string;
    amount: number;
    name: string;
    buyer_email?: string;
    buyer_tel?: string;
  }
) {
  const token = await getIamportAccessToken(impKey, impSecret);
  return requestSubscribePaymentAgain(token, params);
}
