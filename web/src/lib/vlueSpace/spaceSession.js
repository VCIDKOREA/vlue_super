import { VLUE_ACCESS_TOKEN_KEY } from "../vlueAuthHeaders.js";

/** 폐쇄형은 로그인 세션과 액세스 토큰이 있을 때만 연다. */
export function readSpaceAuth() {
  try {
    const loggedIn = localStorage.getItem("vlue_logged_in") === "1";
    const token = String(localStorage.getItem(VLUE_ACCESS_TOKEN_KEY) || "").trim();
    return { loggedIn, closedAllowed: loggedIn && token.length > 12 };
  } catch {
    return { loggedIn: false, closedAllowed: false };
  }
}
