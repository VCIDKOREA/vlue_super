import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { readShowcaseStyle, writeShowcaseStyle } from "./showcase/showcaseStyleStorage.js";
import { normalizeKakaoProfilePageUrl } from "./showcase/showcaseSocialOutlinks.js";

/** Kakao OAuth 시작 — 반환 URL로 이동 */
export async function startKakaoLink() {
  const res = await vlueAuthFetch(apiUrl("/api/v1/auth/kakao/link/start"), {
    method: "POST",
    headers: vlueAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "카카오 연동을 시작할 수 없습니다.");
  }
  const url = typeof data.url === "string" ? data.url.trim() : "";
  if (!url) throw new Error("카카오 인증 URL을 받지 못했습니다.");
  return url;
}

export async function fetchKakaoLinkStatus() {
  const res = await vlueAuthFetch(apiUrl("/api/v1/auth/kakao/status"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "카카오 연동 상태를 확인할 수 없습니다.");
  }
  return data;
}

export async function disconnectKakaoLink() {
  const res = await vlueAuthFetch(apiUrl("/api/v1/auth/kakao/link"), {
    method: "DELETE",
    headers: vlueAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "카카오 연동 해제에 실패했습니다.");
  }
  return data;
}

/** 인증 성공 시 닉네임·프로필 이미지·채널 URL 반영 */
export function applyKakaoVerifiedLocal(nickname, opts = {}) {
  const kakaoUserId = String(opts.kakaoUserId || opts.kakao_user_id || "").trim();
  if (!kakaoUserId) return;

  const incomingTitle = String(nickname || "").trim();
  const picture = String(opts.profileImageUrl || opts.profile_image_url || "").trim();
  const incomingUrl = normalizeKakaoProfilePageUrl(
    opts.profilePageUrl || opts.profile_page_url || opts.kakao_profile_url || ""
  );
  const style = readShowcaseStyle();
  const prevTitle = String(style.platformFeed?.kakaoProfileTitle || "").trim();
  const prevAvatar = String(style.platformFeed?.kakaoAvatarUrl || "").trim();
  const prevUrl =
    normalizeKakaoProfilePageUrl(style.platformFeed?.kakaoProfileUrl) ||
    normalizeKakaoProfilePageUrl(style.commercial?.outlinks?.kakaoProfile);
  const title = incomingTitle || prevTitle || "카카오 인증";
  const avatar = picture || prevAvatar;
  const profileUrl = incomingUrl || prevUrl;

  writeShowcaseStyle(
    {
      ...style,
      platformFeed: {
        ...style.platformFeed,
        kakaoVerified: true,
        kakaoUserId,
        kakaoProfileTitle: title,
        kakaoProfileUrl: profileUrl,
        kakaoAvatarUrl: avatar
      },
      commercial: {
        ...style.commercial,
        outlinks: {
          ...style.commercial.outlinks,
          kakaoProfile: profileUrl
        }
      }
    },
    { skipSync: true }
  );
}

export function clearKakaoVerifiedLocal() {
  const style = readShowcaseStyle();
  writeShowcaseStyle(
    {
      ...style,
      platformFeed: {
        ...style.platformFeed,
        kakaoVerified: false,
        kakaoUserId: "",
        kakaoProfileTitle: "",
        kakaoProfileUrl: "",
        kakaoAvatarUrl: ""
      },
      commercial: {
        ...style.commercial,
        outlinks: {
          ...style.commercial.outlinks,
          kakaoProfile: ""
        }
      }
    },
    { skipSync: true }
  );
}

/**
 * OAuth 콜백 후 URL 쿼리 처리.
 * @returns {{handled:boolean,success:boolean,nickname?:string,message?:string}}
 */
export function consumeKakaoLinkReturn() {
  if (typeof window === "undefined") return { handled: false, success: false };

  const u = new URL(window.location.href);
  const mode = u.searchParams.get("kakao_oauth");
  if (!mode) return { handled: false, success: false };

  const hash = String(window.location.hash || "");
  if (hash.includes("accessToken=") && mode === "success") {
    return { handled: false, success: false };
  }

  const nickname = u.searchParams.get("kakao_nickname") || "";
  const kakaoUserId = u.searchParams.get("kakao_user_id") || "";
  const profileImageUrl = u.searchParams.get("kakao_profile_image") || "";
  const profilePageUrl = u.searchParams.get("kakao_profile_url") || "";
  const error = u.searchParams.get("kakao_error") || "";

  u.searchParams.delete("kakao_oauth");
  u.searchParams.delete("kakao_nickname");
  u.searchParams.delete("kakao_user_id");
  u.searchParams.delete("kakao_profile_image");
  u.searchParams.delete("kakao_profile_url");
  u.searchParams.delete("kakao_error");
  window.history.replaceState({}, "", `${u.pathname}${u.search}${u.hash}`);

  if (mode === "success") {
    if (kakaoUserId) {
      applyKakaoVerifiedLocal(nickname, { kakaoUserId, profileImageUrl, profilePageUrl });
    }
    return { handled: true, success: true, nickname: nickname || "카카오 인증" };
  }
  return {
    handled: true,
    success: false,
    message: error || "카카오 연동에 실패했습니다. 다시 시도해 주세요."
  };
}
