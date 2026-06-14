#!/usr/bin/env node
/**
 * www.vlue.kr DNS + 웹 서비스 검증
 * 사용: npm run verify:www-domain
 */

const WWW = "https://www.vlue.kr";
const RAILWAY_QA = "https://vlueweb-production.up.railway.app";
const GITHUB_PAGES_CNAME = "vcidkorea.github.io";

async function checkDns() {
  try {
    const res = await fetch(`https://dns.google/resolve?name=www.vlue.kr&type=CNAME`, {
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

async function checkSite(base) {
  const url = base.replace(/\/$/, "") + "/";
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const html = await res.text();
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch?.[1]?.trim() || "";
  const isComingSoon =
    /coming\s*soon/i.test(title) || /더 나은 내일을 설계/i.test(html);
  const isRailwayWeb =
    /id="root"/i.test(html) && !isComingSoon;
  return {
    url,
    status: res.status,
    title,
    isComingSoon,
    isRailwayWeb,
    ok: res.ok && !isComingSoon
  };
}

console.log("=== VLUE www.vlue.kr 연결 검증 ===\n");

const dns = await checkDns();
if (dns.resolved) {
  const onGithub = dns.records.some((r) =>
    r.toLowerCase().includes(GITHUB_PAGES_CNAME.toLowerCase())
  );
  const onRailway = dns.records.some((r) => /\.up\.railway\.app\.?$/i.test(r));
  console.log("DNS www.vlue.kr CNAME:", dns.records.join(", "));
  if (onGithub) {
    console.log("  상태: GitHub Pages (티저) — Railway CNAME으로 교체 필요");
  } else if (onRailway) {
    console.log("  상태: Railway CNAME — DNS 전환 완료");
  } else {
    console.log("  상태: 알 수 없는 대상 — Railway 대시보드 CNAME과 일치하는지 확인");
  }
} else {
  console.log("DNS www.vlue.kr: 미설정 또는 전파 중");
  if (dns.error) console.log("  ", dns.error);
}

console.log("");

for (const base of [WWW, RAILWAY_QA]) {
  try {
    const r = await checkSite(base);
    console.log(r.url);
    console.log(`  HTTP ${r.status} | title="${r.title}"`);
    if (r.isComingSoon) {
      console.log("  → Coming Soon (GitHub Pages) — DNS 전환 후 재검증");
    } else if (r.isRailwayWeb) {
      console.log("  → VLUE 웹 앱 (마케팅 셸) — 정상");
    }
  } catch (e) {
    console.log(base + "/");
    console.log(`  실패: ${e.message}`);
  }
  console.log("");
}

console.log("가이드: docs/DNS_WWW_VLUE_KR_SETUP.md");
