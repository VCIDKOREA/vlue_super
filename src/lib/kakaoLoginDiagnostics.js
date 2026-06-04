import { apiUrl } from "./apiBase.js";
import {
  ensureKakaoSdk,
  getKakaoJavaScriptKey,
  getKakaoOAuthRedirectUri,
  isKakaoSdkInitialized
} from "./kakaoSocialLogin.js";

/**
 * 카카오 간편 로그인 문제를 줄이기 위한 점검 문자열 (복사해 데브톡·동료에게 붙여넣기용)
 */
export async function buildKakaoLoginDiagnosticsText() {
  const lines = [];
  const href = typeof window !== "undefined" ? window.location.href : "(SSR)";
  const redirectUri = getKakaoOAuthRedirectUri();
  const key = getKakaoJavaScriptKey();

  lines.push("=== VLUE 카카오 로그인 점검 ===");
  lines.push(`현재 URL: ${href}`);
  lines.push(`Redirect URI (앱이 카카오에 보내는 값): ${redirectUri || "(없음)"}`);
  lines.push(
    `VITE_KAKAO_JAVASCRIPT_KEY: ${key ? `설정됨 (${key.slice(0, 4)}…${key.slice(-4)}, 길이 ${key.length})` : "미설정 — 루트 .env 확인 후 dev 재시작"}`
  );
  lines.push(`Kakao.init 직후 상태: ${isKakaoSdkInitialized() ? "초기화됨" : "아직 아님"}`);

  if (key && !isKakaoSdkInitialized()) {
    try {
      await ensureKakaoSdk();
      lines.push(`선로드 시도 후: ${isKakaoSdkInitialized() ? "초기화 성공" : "여전히 미초기화"}`);
    } catch (e) {
      lines.push(`선로드 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  let apiLine = "GET /api/health (프록시 또는 VITE_API_URL): ";
  try {
    const res = await fetch(apiUrl("/api/health"), { method: "GET", cache: "no-store" });
    const body = await res.text().catch(() => "");
    apiLine += res.ok ? `OK ${res.status} ${body.slice(0, 80)}` : `실패 ${res.status} ${body.slice(0, 120)}`;
  } catch (e) {
    apiLine += `네트워크 오류 — API(8788) 실행 여부·vite 프록시(/api) 확인`;
  }
  lines.push(apiLine);

  lines.push("");
  lines.push("[카카오 콘솔에서 맞출 것]");
  lines.push(`1) 제품 설정 → 카카오 로그인 → Redirect URI에 아래와 동일한 문자열 등록`);
  lines.push(`   → ${redirectUri}`);
  lines.push("2) 제품 링크 관리(또는 플랫폼 Web) 웹 도메인: 위 URL의 origin(호스트+포트)과 일치");
  lines.push("3) 브라우저 팝업 차단 해제");
  lines.push("4) 포트가 바뀌면(5174, 5178…) 콘솔에 그 포트로도 추가 등록");

  return lines.join("\n");
}
