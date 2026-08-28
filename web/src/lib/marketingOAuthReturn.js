import { consumeInstagramLinkReturn } from "./instagramLinkApi.js";
import { consumeKakaoLinkReturn } from "./kakaoLinkApi.js";
import { consumeSocialOAuthReturn } from "./socialOAuthReturn.js";
import { persistVlueAuthSession } from "./vlueAuthApi.js";

/**
 * www 마케팅 셸 — SNS 연동·간편 로그인 OAuth 콜백 일괄 처리
 * @returns {{ kind: string; success: boolean; message?: string; user?: object } | null}
 */
export function consumeMarketingOAuthReturn() {
  const ig = consumeInstagramLinkReturn();
  if (ig.handled) {
    return {
      kind: "instagram-link",
      success: ig.success,
      message: ig.success
        ? `${ig.username ? `@${ig.username}` : "Instagram"} 인증이 완료되었습니다.`
        : ig.message || "Instagram 연동에 실패했습니다."
    };
  }

  const kakao = consumeKakaoLinkReturn();
  if (kakao.handled) {
    return {
      kind: "kakao-link",
      success: kakao.success,
      message: kakao.success
        ? `${kakao.nickname || "카카오"} 프로필 인증이 완료되었습니다.`
        : kakao.message || "카카오 연동에 실패했습니다."
    };
  }

  const social = consumeSocialOAuthReturn();
  if (!social.handled) return null;

  if (social.success && social.session) {
    const user = persistVlueAuthSession({
      userId: social.session.userId,
      accessToken: social.session.accessToken,
      refreshToken: social.session.refreshToken,
      publicHandle: social.session.publicHandle,
      legalName: social.session.legalName,
      accountStatus: social.session.accountStatus
    });
    const label =
      social.provider === "google"
        ? "Google"
        : social.provider === "naver"
          ? "네이버"
          : social.provider === "instagram"
            ? "Instagram"
            : "카카오";
    return {
      kind: "social-login",
      success: true,
      user,
      message: `${label}로 로그인되었습니다.`
    };
  }

  return {
    kind: "social-login",
    success: false,
    message: social.message || "간편 로그인에 실패했습니다."
  };
}

/** /app 차단 페이지에서 www 쇼케이스로 OAuth 파라미터 이관 */
export function relayAppOAuthToMarketing() {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname || "";
  if (path !== "/app" && !path.startsWith("/app/")) return false;
  const search = window.location.search || "";
  if (!/(kakao_oauth|instagram_oauth|social_oauth|google_oauth|naver_oauth)=/.test(search)) {
    return false;
  }
  const origin = window.location.origin.replace(/\/$/, "");
  window.location.replace(`${origin}/${search}#showcase`);
  return true;
}
