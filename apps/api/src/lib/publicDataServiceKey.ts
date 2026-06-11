/** 공공데이터포털 / odcloud 서비스 키 (인증키 버그 대비 이중 시도) */

export function getPublicDataServiceKey(): string {
  return String(
    process.env.PUBLIC_DATA_SERVICE_KEY ||
      process.env.DATA_GO_KR_SERVICE_KEY ||
      process.env.NTS_BUSINESS_API_KEY ||
      ""
  ).trim();
}

function isServiceKeyAuthFailure(status: number, body: unknown): boolean {
  if (status === 401 || status === 403) return true;
  const row = body as Record<string, unknown>;
  const code = String(row.resultCode ?? row.code ?? row.status ?? "").trim();
  const msg = String(row.resultMsg ?? row.message ?? row.returnAuthMsg ?? "").toLowerCase();
  if (code === "30" || code === "31" || code === "32") return true;
  return msg.includes("servicekey") || msg.includes("인증") || msg.includes("key");
}

export type PublicDataFetchResult = {
  ok: boolean;
  status: number;
  json: unknown;
  usedEncodedKey: boolean;
};

/** serviceKey 원본 → encodeURIComponent 순으로 재시도 */
export async function fetchPublicDataJson(
  endpoint: string,
  params: Record<string, string> = {},
  init?: RequestInit
): Promise<PublicDataFetchResult> {
  const key = getPublicDataServiceKey();
  if (!key) {
    return { ok: false, status: 0, json: { error: "PUBLIC_DATA_SERVICE_KEY_MISSING" }, usedEncodedKey: false };
  }

  const keyAttempts = [key, encodeURIComponent(key)];
  let lastStatus = 0;
  let lastJson: unknown = { error: "PUBLIC_DATA_FETCH_FAILED" };

  for (let i = 0; i < keyAttempts.length; i += 1) {
    const serviceKey = keyAttempts[i]!;
    const url = new URL(endpoint);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    url.searchParams.set("serviceKey", serviceKey);

    try {
      const res = await fetch(url.toString(), init);
      const json = await res.json().catch(() => ({}));
      lastStatus = res.status;
      lastJson = json;

      if (res.ok) {
        return { ok: true, status: res.status, json, usedEncodedKey: i === 1 };
      }
      if (i === 0 && isServiceKeyAuthFailure(res.status, json)) continue;
      return { ok: false, status: res.status, json, usedEncodedKey: i === 1 };
    } catch (err) {
      lastJson = { error: err instanceof Error ? err.message : "PUBLIC_DATA_FETCH_EXCEPTION" };
    }
  }

  return { ok: false, status: lastStatus, json: lastJson, usedEncodedKey: true };
}

/** odcloud NTS 등 POST + query serviceKey */
export async function postPublicDataJson(
  endpoint: string,
  query: Record<string, string>,
  body: unknown
): Promise<PublicDataFetchResult> {
  const key = getPublicDataServiceKey();
  if (!key) {
    return { ok: false, status: 0, json: { error: "PUBLIC_DATA_SERVICE_KEY_MISSING" }, usedEncodedKey: false };
  }

  const keyAttempts = [key, encodeURIComponent(key)];
  let lastStatus = 0;
  let lastJson: unknown = { error: "PUBLIC_DATA_POST_FAILED" };

  for (let i = 0; i < keyAttempts.length; i += 1) {
    const serviceKey = keyAttempts[i]!;
    const url = new URL(endpoint);
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
    url.searchParams.set("serviceKey", serviceKey);

    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => ({}));
      lastStatus = res.status;
      lastJson = json;

      if (res.ok) {
        return { ok: true, status: res.status, json, usedEncodedKey: i === 1 };
      }
      if (i === 0 && isServiceKeyAuthFailure(res.status, json)) continue;
      return { ok: false, status: res.status, json, usedEncodedKey: i === 1 };
    } catch (err) {
      lastJson = { error: err instanceof Error ? err.message : "PUBLIC_DATA_POST_EXCEPTION" };
    }
  }

  return { ok: false, status: lastStatus, json: lastJson, usedEncodedKey: true };
}
