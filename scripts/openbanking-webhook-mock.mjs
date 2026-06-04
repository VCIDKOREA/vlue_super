#!/usr/bin/env node
/**
 * 오픈뱅킹 입출금 웹훅 로컬 Mock
 *
 * 사용:
 *   OPENBANKING_WEBHOOK_SECRET=dev-secret-local \
 *   WARD_USER_ID=<자녀-uuid> \
 *   node scripts/openbanking-webhook-mock.mjs
 *
 * API: npm run api:dev (기본 http://127.0.0.1:8788)
 */
const API_BASE = (process.env.VITE_API_URL || process.env.API_BASE_URL || "http://127.0.0.1:8788").replace(
  /\/$/,
  ""
);
const SECRET = process.env.OPENBANKING_WEBHOOK_SECRET || "dev-openbanking-secret";
const WARD_USER_ID = process.env.WARD_USER_ID || "";

const payload = {
  wardUserId: WARD_USER_ID,
  amountKrw: Number(process.env.AMOUNT_KRW || 15000),
  direction: process.env.DIRECTION || "out",
  counterpartyName: process.env.COUNTERPARTY_NAME || "홍길동",
  counterpartyMasked: process.env.COUNTERPARTY_MASKED || "",
  externalTransactionId: `mock-${Date.now()}`
};

if (!WARD_USER_ID) {
  console.error("WARD_USER_ID 환경 변수가 필요합니다. (자녀 계정 users.id UUID)");
  console.error("예: WARD_USER_ID=... OPENBANKING_WEBHOOK_SECRET=dev-secret-local node scripts/openbanking-webhook-mock.mjs");
  process.exit(1);
}

const url = `${API_BASE}/api/family-protection/webhook/openbanking/transaction`;

async function main() {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OpenBanking-Webhook-Secret": SECRET
    },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  console.log("POST", url);
  console.log("status:", res.status);
  console.log(JSON.stringify(data, null, 2));
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
