import { isLocalDevHost, isMarketingHost } from "./siteMode.js";

const SESSION_KEY = "vlue_www_staging_bypass";

export function isWwwStagingLockEnabled() {
  if (typeof window === "undefined") return false;
  if (!isMarketingHost(window.location.hostname)) return false;
  if (isLocalDevHost(window.location.hostname)) return false;
  if (import.meta.env.DEV) return false;
  const flag = String(import.meta.env.VITE_WWW_STAGING_LOCK ?? "false").toLowerCase();
  return flag !== "false" && flag !== "0";
}

export function readStagingBypassSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeStagingBypassSession(ok) {
  try {
    if (ok) sessionStorage.setItem(SESSION_KEY, "1");
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export async function probeStagingAccess(basicAuthHeader) {
  const { apiUrl } = await import("./apiBase.js");
  const headers = {};
  if (basicAuthHeader) headers.Authorization = basicAuthHeader;
  try {
    const res = await fetch(apiUrl("/api/public/staging-access"), { headers });
    const data = await res.json().catch(() => ({}));
    return Boolean(data.bypass);
  } catch {
    return false;
  }
}

export function promptBasicAuth() {
  const user = window.prompt("개발자 아이디 (Basic Auth)");
  if (user == null) return null;
  const pass = window.prompt("비밀번호");
  if (pass == null) return null;
  const token = btoa(`${user}:${pass}`);
  return `Basic ${token}`;
}
