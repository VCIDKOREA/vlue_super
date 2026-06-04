/** 본사 어드민 기기 식별키 — AdminSecretApp · 어드민 API 공통 */
export function ensureAdminDeviceKey() {
  try {
    let k = localStorage.getItem("vlue-admin-device-key");
    if (!k || k.length < 8) {
      k = crypto.randomUUID();
      localStorage.setItem("vlue-admin-device-key", k);
    }
    return k;
  } catch {
    return crypto.randomUUID();
  }
}

export function adminDeviceHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    "X-Admin-Device-Id": ensureAdminDeviceKey(),
    ...extra
  };
}
