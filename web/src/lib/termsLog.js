import { TERMS_VERSION } from "../legal/vlueTermsArticles.js";

/**
 * 약관 동의를 로컬 감사 로그 + (구성 시) Supabase Edge Function으로 기록합니다.
 * IP는 Edge Function에서 x-forwarded-for 등으로 수집합니다.
 */
export async function logTermsAgreement({ termsVersion = TERMS_VERSION, userId = null } = {}) {
  const user_agent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const agreed_at = new Date().toISOString();
  const row = { terms_version: termsVersion, user_agent, agreed_at, user_id: userId };

  try {
    const key = "vlue_terms_audit_log";
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    prev.push(row);
    localStorage.setItem(key, JSON.stringify(prev.slice(-80)));
  } catch {
    /* ignore */
  }

  const base = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const fnUrl = base ? `${String(base).replace(/\/$/, "")}/functions/v1/log-terms-agreement` : null;

  if (fnUrl && anon) {
    try {
      const res = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anon}`,
          apikey: anon
        },
        body: JSON.stringify({
          terms_version: termsVersion,
          user_agent,
          user_id: userId
        })
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, ...data };
    } catch {
      return { ok: true, localOnly: true };
    }
  }

  return { ok: true, localOnly: true };
}
