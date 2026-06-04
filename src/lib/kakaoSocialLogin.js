/** 카카오 JavaScript SDK (웹) */
const KAKAO_SDK_SRC = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";

export function getKakaoJavaScriptKey() {
  return String(import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY ?? "").trim();
}

/**
 * 카카오 로그인에 넣을 redirect_uri — 콘솔에 등록한 값과 바이트 단위로 일치해야 함.
 * 비우면 `현재 오리진 + /` (예: http://127.0.0.1:5178/)
 */
export function getKakaoOAuthRedirectUri() {
  const fromEnv = String(import.meta.env.VITE_KAKAO_REDIRECT_URI ?? "").trim();
  if (fromEnv) return fromEnv;
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/`;
}

function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("카카오 SDK 로드 실패")), { once: true });
      if (window.Kakao) resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("카카오 SDK 스크립트를 불러오지 못했습니다."));
    document.head.appendChild(s);
  });
}

/**
 * Kakao.init + SDK 로드
 * @returns {Promise<typeof window.Kakao>}
 */
export async function ensureKakaoSdk() {
  const key = getKakaoJavaScriptKey();
  if (!key) {
    throw new Error("VITE_KAKAO_JAVASCRIPT_KEY가 .env에 설정되어 있지 않습니다. 카카오 개발자 콘솔의 JavaScript 키를 넣어 주세요.");
  }
  await loadExternalScript(KAKAO_SDK_SRC);
  const Kakao = window.Kakao;
  if (!Kakao) {
    throw new Error("카카오 SDK 객체를 찾을 수 없습니다.");
  }
  if (!Kakao.isInitialized()) {
    Kakao.init(key);
  }
  return Kakao;
}

/**
 * @param {typeof window.Kakao} Kakao
 * @returns {Promise<string>}
 */
function kakaoAuthLoginPromise(Kakao) {
  const isMobileUa =
    typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "");
  const redirectUri = getKakaoOAuthRedirectUri();
  if (!redirectUri) {
    return Promise.reject(new Error("카카오 redirect URI를 정할 수 없습니다. (브라우저 환경이 아님)"));
  }
  return new Promise((resolve, reject) => {
    try {
      Kakao.Auth.login({
        redirectUri,
        /* 데스크톱 웹에서 throughTalk 기본값이 팝업이 즉시 닫히는 사례가 있어 PC는 끔 */
        throughTalk: isMobileUa,
        success: (auth) => {
          const t = auth?.access_token;
          if (t) resolve(String(t));
          else reject(new Error("카카오 응답에 access_token이 없습니다."));
        },
        fail: (err) => {
          if (import.meta.env.DEV) {
            console.warn("[Kakao Auth.login] fail:", err);
          }
          const msg =
            err?.error_description ||
            err?.error ||
            err?.msg ||
            (typeof err === "string" ? err : null) ||
            (err && typeof err === "object" ? `카카오 로그인 실패 (${JSON.stringify(err).slice(0, 180)})` : null) ||
            "카카오 로그인에 실패했습니다.";
          const blob = typeof err === "object" && err ? JSON.stringify(err) : String(err || "");
          const koe006 = /KOE006|KOE-006|등록하지 않은 redirect|redirect uri/i.test(`${msg} ${blob}`);
          reject(
            new Error(
              koe006
                ? `Redirect URI 불일치: 카카오 콘솔 [제품 설정] → [카카오 로그인] → Redirect URI에 「${redirectUri}」를 등록하세요.`
                : msg
            )
          );
        }
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

export function isKakaoSdkInitialized() {
  return typeof window !== "undefined" && Boolean(window.Kakao?.isInitialized?.());
}

/**
 * 카카오 로그인 팝업 → 액세스 토큰
 * 브라우저는 클릭 직후 한 동안만 "사용자 제스처"로 팝업을 허용하므로,
 * SDK가 이미 `Kakao.init` 된 상태면 `await` 없이 곧바로 `Auth.login`을 호출한다.
 * (간편 로그인 시트를 열 때 `ensureKakaoSdk`로 선로드할 것)
 * @returns {Promise<string>}
 */
export function getKakaoAccessTokenWithLogin() {
  if (typeof window !== "undefined" && window.Kakao?.isInitialized?.()) {
    return kakaoAuthLoginPromise(window.Kakao);
  }
  return ensureKakaoSdk().then((Kakao) => kakaoAuthLoginPromise(Kakao));
}

/**
 * 액세스 토큰으로 프로필(서버 검증과 동일 엔드포인트) — 서버에 넘길 email/nickname 보조용
 */
export async function fetchKakaoUserMeClient(accessToken) {
  const res = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`카카오 프로필 요청 실패 (${res.status})${text ? `: ${text.slice(0, 120)}` : ""}`);
  }
  const j = await res.json();
  const id = j.id != null ? String(j.id) : "";
  const ac = j.kakao_account || {};
  const email = typeof ac.email === "string" ? ac.email.trim() : "";
  const props = j.properties || {};
  const prof = ac.profile || {};
  const nickname =
    (typeof props.nickname === "string" && props.nickname.trim()) ||
    (typeof prof.nickname === "string" && prof.nickname.trim()) ||
    "";
  return { id, email, nickname };
}
