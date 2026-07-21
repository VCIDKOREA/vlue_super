import { apiUrl } from "../apiBase.js";
import { vlueAuthFetch } from "../vlueAuthHeaders.js";

export const WEB_RISK_BLOCK_MESSAGE = "유해·불법 링크는 등록할 수 없습니다.";

/**
 * 쇼케이스 커스텀 링크 추가 전 Web Risk Lookup 검사.
 * @param {string} uri
 * @returns {Promise<{ ok: boolean, safe: boolean, uri?: string, error?: string, skipped?: boolean }>}
 */
export async function checkShowcaseLinkUri(uri) {
  const raw = String(uri || "").trim();
  if (!raw) {
    return { ok: false, safe: false, error: "링크 URL을 입력해 주세요." };
  }

  try {
    const res = await vlueAuthFetch(apiUrl("/api/webrisk/uris/search"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uri: raw })
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok: false,
        safe: false,
        uri: data?.uri,
        error: data?.error || "링크 안전성 검사를 완료할 수 없습니다."
      };
    }

    if (data?.safe === false || data?.blocked) {
      return {
        ok: true,
        safe: false,
        uri: data?.uri,
        error: data?.message || data?.error || WEB_RISK_BLOCK_MESSAGE
      };
    }

    return {
      ok: true,
      safe: true,
      uri: data?.uri || raw,
      skipped: Boolean(data?.skipped)
    };
  } catch (e) {
    return {
      ok: false,
      safe: false,
      error: e instanceof Error ? e.message : "링크 안전성 검사를 완료할 수 없습니다."
    };
  }
}
