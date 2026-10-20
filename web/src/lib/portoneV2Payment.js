/**
 * 포트원 V2 인증결제 (브라우저 SDK)
 * PG: 한국결제네트웍스(KPN) / 채널: VLUE_결제
 *
 * npm 패키지 정적 import 대신 CDN을 씁니다.
 * (Vite optimizeDeps 가 깨진 의존성 때문에 앱 부팅이 백지되는 것 방지)
 *
 * @see https://developers.portone.io/opi/ko/integration/start/v2/checkout
 */
import {
  getPortoneV2ChannelKey,
  getPortoneV2ChannelName,
  getPortoneV2StoreId
} from "./portoneV2Env.js";
import { postPortoneV2Complete } from "./portoneV2CompleteApi.js";
import { isVlueKidsApp } from "./vlueKidsApp.js";

const PORTONE_V2_CDN = "https://cdn.portone.io/v2/browser-sdk.js";

/** @returns {Promise<typeof window.PortOne>} */
function loadPortOneV2Sdk() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("브라우저 환경에서만 결제가 가능합니다."));
      return;
    }
    if (window.PortOne?.requestPayment) {
      resolve(window.PortOne);
      return;
    }
    const existing = document.querySelector(`script[src="${PORTONE_V2_CDN}"]`);
    const onReady = () => {
      if (window.PortOne?.requestPayment) resolve(window.PortOne);
      else reject(new Error("포트원 V2 SDK 로드 실패"));
    };
    if (existing) {
      if (window.PortOne?.requestPayment) {
        onReady();
        return;
      }
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () => reject(new Error("포트원 V2 SDK 스크립트 오류")));
      return;
    }
    const s = document.createElement("script");
    s.src = PORTONE_V2_CDN;
    s.async = true;
    s.onload = onReady;
    s.onerror = () => reject(new Error("포트원 V2 SDK를 불러오지 못했습니다."));
    document.head.appendChild(s);
  });
}

/**
 * @param {object} opts
 * @param {string} opts.orderName
 * @param {number} opts.totalAmount 원화 정수
 * @param {"CARD"|"TRANSFER"|"VIRTUAL_ACCOUNT"|"MOBILE"|"EASY_PAY"|string} [opts.payMethod]
 * @param {string} [opts.paymentId] 미지정 시 자동 생성
 * @param {string} [opts.redirectUrl] 모바일 리다이렉트 (권장)
 * @param {boolean} [opts.forceRedirect]
 * @param {object} [opts.customer] { fullName, email, phoneNumber, customerId }
 * @param {object} [opts.customData] 서버 전달용 메타
 * @param {boolean} [opts.skipComplete] true면 서버 승인 호출 생략 (리다이렉트 흐름용)
 * @returns {Promise<{ paymentId: string, paymentResponse: object, complete?: object }>}
 */
export async function requestPortoneV2Payment(opts = {}) {
  if (isVlueKidsApp()) throw new Error("VLUÉ Kids에서는 결제를 사용할 수 없습니다.");
  const storeId = getPortoneV2StoreId();
  const channelKey = getPortoneV2ChannelKey();
  if (!storeId) throw new Error("VITE_PORTONE_V2_STORE_ID 가 필요합니다.");
  if (!channelKey) {
    throw new Error(
      `VITE_PORTONE_V2_CHANNEL_KEY 가 필요합니다. 콘솔에서 채널 "${getPortoneV2ChannelName()}"(KPN)의 Channel Key를 복사하세요.`
    );
  }

  const totalAmount = Math.floor(Number(opts.totalAmount));
  if (!Number.isFinite(totalAmount) || totalAmount < 1) {
    throw new Error("결제 금액(totalAmount)이 올바르지 않습니다.");
  }

  // KPN 결제창: É→HTML엔티티(VLU&#201;), NFD 한글 자모→&#4363; 등으로 깨짐
  // 한글은 NFC(완성형) 유지, 라틴 악센트만 ASCII로 치환
  const orderName = String(opts.orderName || "")
    .replace(/&#?\w+;/g, "")
    .replace(/[Éé]/g, "E")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
  if (!orderName) throw new Error("주문명(orderName)이 필요합니다.");

  // KPN(FirstPay) MxdIssueNO 최대 32byte — 영문·숫자만, 하이픈 불가
  const paymentId =
    String(opts.paymentId || "").trim() ||
    crypto.randomUUID().replace(/-/g, "").slice(0, 32);

  const payMethod = opts.payMethod || "CARD";
  const PortOne = await loadPortOneV2Sdk();

  const request = {
    storeId,
    channelKey,
    paymentId,
    orderName,
    goods_name: opts.goods_name || opts.good_name || orderName,
    good_name: opts.good_name || opts.goods_name || orderName,
    totalAmount,
    currency: "CURRENCY_KRW",
    payMethod,
    // NHN KCP / KPN 심사 보완: 서비스 제공기간 파라미터 명시 ("구매일로부터 1개월")
    period: opts.period || "구매일로부터 1개월",
    service_period: opts.service_period || "구매일로부터 1개월",
    servicePeriod: opts.servicePeriod || "구매일로부터 1개월",
    offerPeriod: opts.offerPeriod || { interval: "1m" },
    ...(opts.customer ? { customer: opts.customer } : {}),
    ...(opts.customData ? { customData: opts.customData } : {}),
    ...(opts.redirectUrl ? { redirectUrl: opts.redirectUrl } : {}),
    ...(opts.forceRedirect != null ? { forceRedirect: Boolean(opts.forceRedirect) } : {}),
    bypass: {
      kcp_v2: {
        good_expr: "1M",
        good_name: opts.goods_name || opts.good_name || orderName,
        goods_name: opts.goods_name || opts.good_name || orderName,
        service_period: opts.service_period || "구매일로부터 1개월",
        period: opts.period || "구매일로부터 1개월"
      },
      kcp: {
        good_expr: "1M",
        good_name: opts.goods_name || opts.good_name || orderName,
        goods_name: opts.goods_name || opts.good_name || orderName,
        service_period: opts.service_period || "구매일로부터 1개월",
        period: opts.period || "구매일로부터 1개월"
      },
      kpn: {
        good_expr: "1M",
        good_name: opts.goods_name || opts.good_name || orderName,
        goods_name: opts.goods_name || opts.good_name || orderName,
        service_period: opts.service_period || "구매일로부터 1개월",
        period: opts.period || "구매일로부터 1개월"
      },
      ...(opts.bypass || {})
    }
  };

  const paymentResponse = await PortOne.requestPayment(request);

  // 모바일 리다이렉트 시 undefined 반환 → 쿼리스트링으로 이어 처리
  if (paymentResponse == null) {
    return { paymentId, paymentResponse: null, redirected: true };
  }

  if (paymentResponse.code != null) {
    const err = new Error(paymentResponse.message || "결제가 취소되었거나 실패했습니다.");
    err.code = paymentResponse.code;
    err.pgCode = paymentResponse.pgCode;
    err.pgMessage = paymentResponse.pgMessage;
    err.paymentId = paymentResponse.paymentId || paymentId;
    throw err;
  }

  const resolvedPaymentId = paymentResponse.paymentId || paymentId;

  if (opts.skipComplete) {
    return { paymentId: resolvedPaymentId, paymentResponse };
  }

  const complete = await postPortoneV2Complete({
    paymentId: resolvedPaymentId,
    expectedAmount: totalAmount,
    orderName,
    customData: opts.customData || null
  });

  return { paymentId: resolvedPaymentId, paymentResponse, complete };
}

/**
 * 리다이렉트 복귀 URL의 쿼리에서 결제 결과 파싱 후 서버 승인.
 * 예: /app/payment/v2/callback?paymentId=...
 */
export async function completePortoneV2FromRedirectSearch(search, extras = {}) {
  const params = new URLSearchParams(
    typeof search === "string" ? search.replace(/^\?/, "") : String(window.location.search || "")
  );
  const paymentId = params.get("paymentId") || "";
  const code = params.get("code");
  const message = params.get("message") || "";

  if (code) {
    const err = new Error(message || "결제가 취소되었거나 실패했습니다.");
    err.code = code;
    err.paymentId = paymentId;
    throw err;
  }
  if (!paymentId) throw new Error("리다이렉트에 paymentId가 없습니다.");

  const complete = await postPortoneV2Complete({
    paymentId,
    expectedAmount: extras.expectedAmount,
    orderName: extras.orderName,
    customData: extras.customData || null
  });

  return { paymentId, complete };
}

/** 기본 모바일/리다이렉트 콜백 URL */
export function defaultPortoneV2RedirectUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/app/payment/v2/callback`;
}
