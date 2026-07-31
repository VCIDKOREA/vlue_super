import { getPortoneUserCode } from "./portoneEnv.js";
import { hasVlueNativeAppUserAgent, VLUE_ANDROID_APP_UA_TOKEN } from "./vlueClientAccess.js";

const SCRIPT_SRC = "https://cdn.iamport.kr/v1/iamport.js";
const CERT_REDIRECT_FLAG_KEY = "vlue_iamport_cert_redirect_v1";

/**
 * Android/iOS WebView·인앱 브라우저 — window.open 팝업이 흰 화면이 되므로 redirect 권장
 */
export function shouldUseIamportCertRedirect() {
  if (typeof window === "undefined") return false;
  if (hasVlueNativeAppUserAgent()) return true;
  if (window.VlueFamilyBridgeNative || window.VlueFamilyBridge?.__androidShell) return true;
  const ua = String(navigator.userAgent || "");
  if (ua.includes(VLUE_ANDROID_APP_UA_TOKEN)) return true;
  /* 일반 모바일 브라우저도 팝업 차단이 잦음 */
  if (/Android|iPhone|iPad|iPod/i.test(ua) && !window.IMP_FORCE_POPUP) return true;
  return false;
}

/**
 * redirect 본인인증 복귀 URL (?imp_uid=&success=) 파싱 후 쿼리 정리
 * @returns {{ imp_uid: string, success: boolean, error_msg?: string } | null}
 */
export function consumeIamportCertRedirectResult() {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search || "");
    const impUid = String(params.get("imp_uid") || params.get("impUid") || "").trim();
    const successRaw = String(params.get("success") || "").toLowerCase();
    const errorMsg = String(params.get("error_msg") || params.get("errorMsg") || "").trim();
    if (!impUid && successRaw !== "false" && successRaw !== "true" && !errorMsg) {
      return null;
    }
    const success = successRaw === "true" || successRaw === "1" || (Boolean(impUid) && successRaw !== "false");
    /* URL 정리 — 해시(#) 온보딩 상태 유지 */
    const url = new URL(window.location.href);
    ["imp_uid", "impUid", "success", "error_msg", "merchant_uid", "imp_success"].forEach((k) =>
      url.searchParams.delete(k)
    );
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    try {
      sessionStorage.removeItem(CERT_REDIRECT_FLAG_KEY);
    } catch {
      /* ignore */
    }
    if (!success || !impUid) {
      return { imp_uid: "", success: false, error_msg: errorMsg || "본인인증이 완료되지 않았습니다." };
    }
    return { imp_uid: impUid, success: true };
  } catch {
    return null;
  }
}

export function markIamportCertRedirectPending() {
  try {
    sessionStorage.setItem(CERT_REDIRECT_FLAG_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function wasIamportCertRedirectPending() {
  try {
    return sessionStorage.getItem(CERT_REDIRECT_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

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

  const envPopup =
    envTrim(typeof import.meta !== "undefined" ? import.meta.env?.VITE_IAMPORT_CERT_POPUP : "");
  const useRedirect = shouldUseIamportCertRedirect() || envPopup === "false";
  const usePopup = !useRedirect && envPopup !== "false";

  const returnUrl =
    typeof window !== "undefined"
      ? (() => {
          const origin = window.location.origin;
          const path = window.location.pathname || "/";
          /* www 마케팅 가입: redirect 복귀 시 AuthModal이 다시 열리도록 딥링크 유지 */
          if (!path.includes("/app")) {
            return `${origin}${path === "/" ? "/" : path}?auth=signup&start=1`;
          }
          return `${origin}${path}`;
        })()
      : "";

  const payload = {
    merchant_uid: merchantUid,
    company,
    pg,
    popup: usePopup
  };
  if (returnUrl) {
    payload.m_redirect_url = returnUrl;
  }

  if (useRedirect) {
    markIamportCertRedirectPending();
  }

  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    console.info("[VLUE 본인인증 요청]", {
      pg,
      popup: usePopup,
      redirect: useRedirect,
      company,
      m_redirect_url: payload.m_redirect_url,
      impUserCode: `${String(userCode).slice(0, 6)}…`
    });
  } else if (typeof console !== "undefined" && console.info) {
    /* 운영에서도 pg만 남겨 이니시스 일반 오류 원인 추적 (MID·키 전체는 미출력) */
    console.info("[VLUE 본인인증 요청]", {
      pg,
      popup: usePopup,
      company: String(company).slice(0, 64)
    });
  }

  return new Promise((resolve, reject) => {
    IMP.certification(payload, (rsp) => {
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
    });
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
