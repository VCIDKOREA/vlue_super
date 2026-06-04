import { getAccessToken } from "./vlueAuthHeaders.js";

/** 서버에 등록된 로그인 세션(회원 ID 또는 액세스 토큰) */
export function hasVlueServerSession() {
  try {
    if (getAccessToken()) return true;
    return Boolean(localStorage.getItem("vlue_server_user_id")?.trim());
  } catch {
    return false;
  }
}
