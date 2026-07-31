import { getAccessToken } from "./vlueAuthHeaders.js";

/** 공개 쇼케이스·게스트 — 팔로우/좋아요/댓글 등 회원 전용 안내 */
export const VLUE_MEMBERSHIP_REQUIRED_MSG = "회원가입 후 이용할 수 있습니다.";

export function hasVlueLoggedInSession() {
  try {
    if (getAccessToken()) return true;
    return Boolean(localStorage.getItem("vlue_server_user_id"));
  } catch {
    return false;
  }
}
