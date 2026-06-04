import { getPortoneUserCode } from "./portoneEnv.js";

const SCRIPT_SRC = "https://cdn.iamport.kr/v1/iamport.js";

/**
 * 아임포트(포트원) v1 스크립트 로드 후 `window.IMP` 반환
 */
export function loadIamportScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("브라우저 환경에서만 본인인증이 가능합니다."));
      return;
    }
    if (window.IMP) {
      resolve(window.IMP);
      return;
    }
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      const onLoad = () => resolve(window.IMP);
      const onErr = () => reject(new Error("아임포트 스크립트 로드 실패"));
      if (window.IMP) {
        onLoad();
        return;
      }
      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", onErr);
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve(window.IMP);
    s.onerror = () => reject(new Error("아임포트 스크립트를 불러오지 못했습니다."));
    document.head.appendChild(s);
  });
}

function envTrim(v) {
  if (v == null || typeof v !== "string") return "";
  return v.replace(/^["']|["']$/g, "").trim();
}

/**
 * 본인인증(IMP.certification)용 PG 정규화.
 * `html5_inicis` 는 결제(카드) 쪽 식별자로 쓰이는 경우가 많아, 본인인증에 넣으면 이니시스가
 * "서비스 이용에 불편을 드려 죄송합니다" 같은 일반 오류만 내고 끝나는 사례가 많습니다.
 * 통합본인인증 채널은 보통 `inicis_unified` (+ 필요 시 `.MID`).
 */
function normalizePgBaseForCertification(pgBase) {
  const lower = pgBase.toLowerCase();
  if (lower === "html5_inicis" || lower.startsWith("html5_inicis.")) {
    return pgBase.replace(/^html5_inicis/i, "inicis_unified");
  }
  return pgBase;
}

/** PG 코드 문자열 (MID 포함 시 `pg.MID`) */
function buildIamportCertPg() {
  const raw =
    envTrim(typeof import.meta !== "undefined" ? import.meta.env?.VITE_IAMPORT_CERT_PG : "") ||
    "inicis_unified";
  const pgBase = normalizePgBaseForCertification(raw);
  const mid = envTrim(typeof import.meta !== "undefined" ? import.meta.env?.VITE_IAMPORT_CERT_MID : "");
  const omitMid =
    envTrim(typeof import.meta !== "undefined" ? import.meta.env?.VITE_IAMPORT_CERT_OMIT_MID : "") === "1" ||
    envTrim(typeof import.meta !== "undefined" ? import.meta.env?.VITE_IAMPORT_CERT_OMIT_MID : "") === "true";
  if (!mid || omitMid) return pgBase;
  if (pgBase.includes(".")) return pgBase;
  return `${pgBase}.${mid}`;
}

/**
 * IMP.certification — 휴대폰 본인인증 창 호출
 *
 * @param {string} userCode `VITE_PORTONE_USER_CODE` → `IMP.init(userCode)`
 * @returns {Promise<object>} success 시 `imp_uid` 등
 *
 * `pg` 는 `VITE_IAMPORT_CERT_PG` + `VITE_IAMPORT_CERT_MID` → 예: `inicis_unified.MIIiasTest`
 * (`html5_inicis` 로 설정돼 있으면 본인인증용으로 `inicis_unified` 로 자동 치환)
 */
export async function requestIamportCertification(userCode = getPortoneUserCode()) {
  if (!userCode) {
    throw new Error("VITE_PORTONE_USER_CODE(가맹점 식별코드, 예: imp57735111)를 루트 .env에 설정하세요.");
  }
  const IMP = await loadIamportScript();
  IMP.init(userCode);

  const merchantUid = `vlue_cert_${Date.now()}`;
  const pg = buildIamportCertPg();

  /** 이니시스 등 PG가 참고하는 상점/사이트 식별 — 문자열 "VLUE" 보다 실제 오리진이 안전한 경우가 많음 */
  const company =
    typeof window !== "undefined" && window.location?.origin ? window.location.origin : "VLUE";

  const usePopup =
    envTrim(typeof import.meta !== "undefined" ? import.meta.env?.VITE_IAMPORT_CERT_POPUP : "") !== "false";

  const returnUrl = typeof window !== "undefined" ? window.location.href.split("#")[0] : "";

  const payload = {
    merchant_uid: merchantUid,
    company,
    pg,
    popup: usePopup
  };
  if (returnUrl) {
    payload.m_redirect_url = returnUrl;
  }

  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    console.info("[VLUE 본인인증 요청]", {
      pg,
      popup: usePopup,
      company,
      m_redirect_url: payload.m_redirect_url,
      impUserCode: `${String(userCode).slice(0, 6)}…`
    });
  }

  return new Promise((resolve, reject) => {
    IMP.certification(
      payload,
      (rsp) => {
        if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
          console.info("[VLUE 본인인증 응답]", rsp);
        }
        if (rsp?.success) {
          resolve(rsp);
        } else {
          const pgHint =
            typeof import.meta !== "undefined" && import.meta.env?.DEV
              ? " 이니시스(sa.inicis.com) 일반 오류면 포트원 콘솔에서 통합본인인증 채널·MID·http://localhost:5173 허용을 확인하거나, 개발 시 「PASS 우회(개발)」를 사용하세요."
              : "";
          reject(new Error((rsp?.error_msg || "본인인증이 완료되지 않았습니다.") + pgHint));
        }
      }
    );
  });
}

function buildIamportBillingPg() {
  const raw =
    envTrim(typeof import.meta !== "undefined" ? import.meta.env?.VITE_IAMPORT_BILLING_PG : "") ||
    "html5_inicis.bill";
  const mid = envTrim(typeof import.meta !== "undefined" ? import.meta.env?.VITE_IAMPORT_BILLING_MID : "");
  if (!mid || raw.includes(".")) return raw;
  return `${raw}.${mid}`;
}

/**
 * IMP.request_pay — 정기결제(빌링키) 카드 등록 창
 *
 * @param {object} opts
 * @param {string} opts.userCode
 * @param {string} opts.userId 서버 user UUID
 * @param {number} opts.amount 청구 예정 금액(원)
 * @param {'monthly'|'annual'} opts.billingCycle
 */
function buildIamportShopPg() {
  const raw =
    envTrim(typeof import.meta !== "undefined" ? import.meta.env?.VITE_IAMPORT_SHOP_PG : "") ||
    "html5_inicis";
  const mid = envTrim(typeof import.meta !== "undefined" ? import.meta.env?.VITE_IAMPORT_SHOP_MID : "");
  if (!mid || raw.includes(".")) return raw;
  return `${raw}.${mid}`;
}

/**
 * IMP.request_pay — 상점 단발성 일반결제 (customer_uid 없음)
 *
 * @param {object} opts
 * @param {string} opts.merchantUid 서버 주문 merchant_uid (shop_order_*)
 * @param {number} opts.amount 결제 금액(원)
 * @param {string} opts.name 주문명
 * @param {'card'|'trans'|'vbank'} [opts.payMethod]
 */
export async function requestIamportShopPay({
  userCode = getPortoneUserCode(),
  merchantUid,
  amount,
  name,
  payMethod = "card",
  buyerName,
  buyerTel,
  buyerEmail
}) {
  if (!userCode) {
    throw new Error("VITE_PORTONE_USER_CODE를 루트 .env에 설정하세요.");
  }
  if (!merchantUid) {
    throw new Error("merchant_uid가 필요합니다.");
  }
  const IMP = await loadIamportScript();
  IMP.init(userCode);

  const pg = buildIamportShopPg();
  const payAmount = Math.max(0, Math.floor(Number(amount) || 0));
  const method = payMethod === "trans" ? "trans" : payMethod === "vbank" ? "vbank" : "card";

  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    console.info("[VLUE 상점 결제 요청]", { pg, merchant_uid: merchantUid, amount: payAmount, pay_method: method });
  }

  return new Promise((resolve, reject) => {
    IMP.request_pay(
      {
        pg,
        pay_method: method,
        merchant_uid: merchantUid,
        name: name || "VLUE 상점 주문",
        amount: payAmount,
        buyer_name: buyerName || undefined,
        buyer_tel: buyerTel || undefined,
        buyer_email: buyerEmail || undefined
      },
      (rsp) => {
        if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
          console.info("[VLUE 상점 결제 응답]", rsp);
        }
        if (rsp?.success) {
          resolve({
            ...rsp,
            merchant_uid: rsp.merchant_uid || merchantUid,
            imp_uid: rsp.imp_uid
          });
        } else {
          reject(new Error(rsp?.error_msg || "결제가 완료되지 않았습니다."));
        }
      }
    );
  });
}

export async function requestIamportBillingPay({
  userCode = getPortoneUserCode(),
  userId,
  amount,
  billingCycle = "monthly",
  merchantUid: merchantUidOverride,
  name: nameOverride,
  buyerName,
  buyerTel,
  buyerEmail
}) {
  if (!userCode) {
    throw new Error("VITE_PORTONE_USER_CODE를 루트 .env에 설정하세요.");
  }
  if (!userId) {
    throw new Error("userId가 필요합니다. PASS 본인인증을 먼저 완료해 주세요.");
  }
  const IMP = await loadIamportScript();
  IMP.init(userCode);

  const customer_uid = `user_customer_${userId}`;
  const merchant_uid = merchantUidOverride || `billing_${Date.now()}`;
  const pg = buildIamportBillingPg();
  const cycleLabel = billingCycle === "annual" ? "1년" : "1월";
  const name = nameOverride || `VLUE 멤버십 구독 (${cycleLabel})`;
  const payAmount = Math.max(0, Math.floor(Number(amount) || 0));

  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    console.info("[VLUE 정기결제 요청]", { pg, merchant_uid, customer_uid, amount: payAmount, name });
  }

  return new Promise((resolve, reject) => {
    IMP.request_pay(
      {
        pg,
        pay_method: "card",
        merchant_uid,
        customer_uid,
        name,
        amount: payAmount,
        buyer_name: buyerName || undefined,
        buyer_tel: buyerTel || undefined,
        buyer_email: buyerEmail || undefined
      },
      (rsp) => {
        if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
          console.info("[VLUE 정기결제 응답]", rsp);
        }
        if (rsp?.success) {
          resolve({
            ...rsp,
            customer_uid: rsp.customer_uid || customer_uid,
            merchant_uid: rsp.merchant_uid || merchant_uid
          });
        } else {
          reject(new Error(rsp?.error_msg || "카드 등록·결제가 완료되지 않았습니다."));
        }
      }
    );
  });
}
