import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { readShowcaseStyle, writeShowcaseStyle } from "./showcase/showcaseStyleStorage.js";

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

/** 인증 성공 시 닉네임·프로필 이미지·인증 플래그 반영 (개인 프로필은 공유 URL 없음) */
export function applyKakaoVerifiedLocal(nickname, opts = {}) {
  const title = String(nickname || "").trim();
  if (!title) return;
  const kakaoUserId = String(opts.kakaoUserId || opts.kakao_user_id || "").trim();
  const picture = String(opts.profileImageUrl || opts.profile_image_url || "").trim();
  const style = readShowcaseStyle();
  writeShowcaseStyle(
    {
      ...style,
      platformFeed: {
        ...style.platformFeed,
        kakaoVerified: true,
        kakaoUserId,
        kakaoProfileTitle: title,
        kakaoProfileUrl: "",
        kakaoAvatarUrl: picture || style.platformFeed?.kakaoAvatarUrl || ""
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
  const error = u.searchParams.get("kakao_error") || "";

  u.searchParams.delete("kakao_oauth");
  u.searchParams.delete("kakao_nickname");
  u.searchParams.delete("kakao_user_id");
  u.searchParams.delete("kakao_error");
  window.history.replaceState({}, "", `${u.pathname}${u.search}${u.hash}`);

  if (mode === "success") {
    if (nickname) {
      applyKakaoVerifiedLocal(nickname, { kakaoUserId });
    }
    return { handled: true, success: true, nickname };
  }
  return {
    handled: true,
    success: false,
    message: error || "카카오 연동에 실패했습니다. 다시 시도해 주세요."
  };
}
