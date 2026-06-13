#!/usr/bin/env node
/**
 * api.vlue.kr DNS + API 상태 검증
 * 사용: npm run verify:api-domain
 */

const CUSTOM = "https://api.vlue.kr";
const RAILWAY = "https://vlueapi-production.up.railway.app";
const PATH = "/api/media/video-upload/status";

async function fetchStatus(base) {
  const url = `${base.replace(/\/$/, "")}${PATH}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const body = await res.json().catch(() => ({}));
  return { url, ok: res.ok, status: res.status, body };
}

async function checkDns() {
  try {
    const res = await fetch(`https://dns.google/resolve?name=api.vlue.kr&type=CNAME`, {
      signal: AbortSignal.timeout(10000)
    });
    const data = await res.json();
    const answers = data.Answer || [];
    if (!answers.length) return { resolved: false, records: [] };
    return {
      resolved: true,
      records: answers.map((a) => a.data)
    };
  } catch (e) {
    return { resolved: false, error: e.message };
  }
}

console.log("=== VLUE api.vlue.kr 연결 검증 ===\n");

const dns = await checkDns();
if (dns.resolved) {
  console.log("DNS api.vlue.kr CNAME:", dns.records.join(", "));
} else {
  console.log("DNS api.vlue.kr: 미설정 또는 전파 중 (NXDOMAIN)");
  if (dns.error) console.log("  ", dns.error);
}

console.log("");

for (const base of [CUSTOM, RAILWAY]) {
  try {
    const r = await fetchStatus(base);
    const b = r.body;
    console.log(`${base}${PATH}`);
    console.log(`  HTTP ${r.status} | configured=${b.configured} provider=${b.provider ?? "null"}`);
  } catch (e) {
    console.log(`${base}${PATH}`);
    console.log(`  실패: ${e.message}`);
  }
  console.log("");
}

console.log("가이드: docs/DNS_API_VLUE_KR_SETUP.md");
