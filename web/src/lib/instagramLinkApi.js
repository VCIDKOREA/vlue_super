import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { readShowcaseStyle, writeShowcaseStyle } from "./showcase/showcaseStyleStorage.js";

/** Instagram OAuth 시작 — 반환 URL로 이동 */
export async function startInstagramLink() {
  const res = await vlueAuthFetch(apiUrl("/api/v1/auth/instagram/link/start"), {
    method: "POST",
    headers: vlueAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Instagram 연동을 시작할 수 없습니다.");
  }
  const url = typeof data.url === "string" ? data.url.trim() : "";
  if (!url) throw new Error("Instagram 인증 URL을 받지 못했습니다.");
  return url;
}

export async function fetchInstagramLinkStatus() {
  const res = await vlueAuthFetch(apiUrl("/api/v1/auth/instagram/status"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Instagram 연동 상태를 확인할 수 없습니다.");
  }
  return data;
}

export async function fetchInstagramMedia(limit = 40) {
  const res = await vlueAuthFetch(apiUrl(`/api/v1/auth/instagram/media?limit=${limit}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Instagram 게시물을 불러오지 못했습니다.");
  }
  return {
    username: typeof data.username === "string" ? data.username : "",
    media: Array.isArray(data.media) ? data.media : []
  };
}

export async function resolveInstagramMediaUrls(ids = []) {
  const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!list.length) return { media: [] };
  const res = await vlueAuthFetch(apiUrl("/api/v1/auth/instagram/media/resolve"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ ids: list })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "미디어 URL을 갱신하지 못했습니다.");
  }
  return {
    username: typeof data.username === "string" ? data.username : "",
    media: Array.isArray(data.media) ? data.media : []
  };
}

export async function disconnectInstagramLink() {
  const res = await vlueAuthFetch(apiUrl("/api/v1/auth/instagram/link"), {
    method: "DELETE",
    headers: vlueAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Instagram 연동 해제에 실패했습니다.");
  }
  return data;
}

/** 인증 성공 시 @아이디·프로필 이미지·비즈니스 링크·인증 플래그 반영 */
export function applyInstagramVerifiedLocal(username, opts = {}) {
  const u = String(username || "").trim().replace(/^@/, "");
  if (!u) return;
  const style = readShowcaseStyle();
  const handle = `@${u}`;
  const profileUrl = `https://instagram.com/${u}`;
  const picture = String(opts.profilePictureUrl || opts.profile_picture_url || "").trim();
  writeShowcaseStyle({
    ...style,
    platformFeed: {
      ...style.platformFeed,
      instagramHandle: handle,
      instagramProfileUrl: profileUrl,
      instagramProfilePictureUrl: picture || style.platformFeed?.instagramProfilePictureUrl || "",
      instagramVerified: true
    },
    commercial: {
      ...style.commercial,
      outlinks: {
        ...style.commercial.outlinks,
        instagram: profileUrl
      }
    }
  }, { skipSync: true });
}

/** 연동 해제 시 인증·선택 미디어 정리 */
export function clearInstagramVerifiedLocal() {
  const style = readShowcaseStyle();
  writeShowcaseStyle({
    ...style,
    platformFeed: {
      ...style.platformFeed,
      instagramHandle: "",
      instagramProfileUrl: "",
      instagramProfilePictureUrl: "",
      instagramVerified: false,
      instagramMedia: [],
      instagramPostUrls: [],
      instagramPostUrl: ""
    },
    commercial: {
      ...style.commercial,
      outlinks: {
        ...style.commercial.outlinks,
        instagram: ""
      }
    }
  }, { skipSync: true });
}

/**
 * OAuth 콜백 후 URL 쿼리 처리.
 * @returns {{handled:boolean,success:boolean,username?:string,message?:string}}
 */
export function consumeInstagramLinkReturn() {
  if (typeof window === "undefined") return { handled: false, success: false };

  const u = new URL(window.location.href);
  const mode = u.searchParams.get("instagram_oauth");
  if (!mode) return { handled: false, success: false };

  /* 소셜 로그인 성공(해시 토큰)은 socialOAuthReturn 이 처리 */
  const hash = String(window.location.hash || "");
  if (hash.includes("accessToken=") && mode === "success") {
    return { handled: false, success: false };
  }

  const username = u.searchParams.get("instagram_username") || "";
  const error = u.searchParams.get("instagram_error") || "";

  u.searchParams.delete("instagram_oauth");
  u.searchParams.delete("instagram_username");
  u.searchParams.delete("instagram_error");
  window.history.replaceState({}, "", `${u.pathname}${u.search}${u.hash}`);

  if (mode === "success") {
    if (username) applyInstagramVerifiedLocal(username);
    return { handled: true, success: true, username };
  }
  return {
    handled: true,
    success: false,
    message: error || "Instagram 연동에 실패했습니다. 다시 시도해 주세요."
  };
}
