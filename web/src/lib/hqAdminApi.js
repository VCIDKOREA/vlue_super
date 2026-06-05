import { apiUrl } from "./apiBase.js";

export const HQ_ACCESS_TOKEN_KEY = "vlue_hq_access_token";
export const HQ_USER_KEY = "vlue_hq_user";

function hqHeaders() {
  const h = { "Content-Type": "application/json" };
  try {
    const t = localStorage.getItem(HQ_ACCESS_TOKEN_KEY);
    if (t) h.Authorization = `Bearer ${t}`;
  } catch {
    /* ignore */
  }
  return h;
}

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export function clearHqSession() {
  try {
    localStorage.removeItem(HQ_ACCESS_TOKEN_KEY);
    localStorage.removeItem(HQ_USER_KEY);
  } catch {
    /* ignore */
  }
}

export function readHqSession() {
  try {
    const raw = localStorage.getItem(HQ_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveHqSession(payload) {
  try {
    if (payload?.accessToken) localStorage.setItem(HQ_ACCESS_TOKEN_KEY, String(payload.accessToken));
    localStorage.setItem(
      HQ_USER_KEY,
      JSON.stringify({
        userId: payload.userId,
        legalName: payload.legalName,
        publicHandle: payload.publicHandle,
        role: payload.role
      })
    );
  } catch {
    /* ignore */
  }
}

export async function hqLogin(loginId, password) {
  const res = await fetch(apiUrl("/api/admin/hq/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginId, password })
  });
  const data = await parseJson(res);
  saveHqSession(data);
  return data;
}

export async function fetchHqMe() {
  const res = await fetch(apiUrl("/api/admin/hq/me"), { headers: hqHeaders() });
  return parseJson(res);
}

export async function fetchHqHomeLayout() {
  const res = await fetch(apiUrl("/api/admin/hq/home-layout"), { headers: hqHeaders() });
  return parseJson(res);
}

export async function saveHqHomeLayout(layout) {
  const res = await fetch(apiUrl("/api/admin/hq/home-layout"), {
    method: "PUT",
    headers: hqHeaders(),
    body: JSON.stringify({ layout })
  });
  return parseJson(res);
}

export async function fetchPublicHomeLayout() {
  try {
    const res = await fetch(apiUrl("/api/home/layout"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    return data.layout || null;
  } catch {
    return null;
  }
}
