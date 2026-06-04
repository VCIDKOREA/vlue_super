#!/usr/bin/env node
/**
 * Cloudflare Email Routing → VLUE webhook 시뮬레이터
 *
 * 사용:
 *   node scripts/simulate-office-email-webhook.mjs --user <UUID> --pdf ./sample.pdf
 *
 * 환경:
 *   VLUE_API_URL=http://localhost:8788
 *   VLUE_OFFICE_EMAIL_WEBHOOK_SECRET=dev-secret
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
function arg(name, fallback = "") {
  const i = args.indexOf(name);
  return i >= 0 ? String(args[i + 1] || "").trim() : fallback;
}

const userId = arg("--user", process.env.VLUE_TEST_USER_ID || "");
const pdfPath = arg("--pdf", "");
const apiBase = (process.env.VLUE_API_URL || "http://localhost:8788").replace(/\/$/, "");
const secret = process.env.VLUE_OFFICE_EMAIL_WEBHOOK_SECRET || "dev-secret";
const from = arg("--from", "partner@example.com");
const subject = arg("--subject", "VLUE 테스트 메일");

if (!userId) {
  console.error("필수: --user <vlue_user_uuid>");
  process.exit(1);
}

const attachments = [];
if (pdfPath) {
  const abs = path.resolve(pdfPath);
  const buf = fs.readFileSync(abs);
  attachments.push({
    filename: path.basename(abs),
    mimeType: "application/pdf",
    content: buf.toString("base64")
  });
} else {
  const minimalPdf = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 200 200]/Parent 2 0 R>>endobj\nxref\n0 4\ntrailer<</Root 1 0 R/Size 4>>\nstartxref\n0\n%%EOF",
    "utf8"
  );
  attachments.push({
    filename: "sim-mail.pdf",
    mimeType: "application/pdf",
    content: minimalPdf.toString("base64")
  });
}

const payload = {
  subject,
  email: from,
  mail_from: from,
  rcpt_to: `${userId}@vlue.kr`,
  to: `${userId}@vlue.kr`,
  message: "VLUE 이메일 웹훅 시뮬레이션 본문",
  plain_body: "VLUE 이메일 웹훅 시뮬레이션 본문",
  attachments
};

const url = `${apiBase}/api/office/email-webhook`;
const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-VLUE-Email-Webhook-Secret": secret
  },
  body: JSON.stringify(payload)
});

const text = await res.text();
console.log(`POST ${url}`);
console.log(`status: ${res.status}`);
console.log(text);

if (!res.ok) process.exit(1);

console.log(`
curl 예시:
curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -H "X-VLUE-Email-Webhook-Secret: ${secret}" \\
  -d '{"subject":"테스트","email":"a@b.com","rcpt_to":"${userId}@vlue.kr","plain_body":"hello","attachments":[{"filename":"doc.pdf","mimeType":"application/pdf","content":"'$(node -e "console.log(require('fs').readFileSync('${pdfPath || "sample.pdf"}').toString('base64'))")'"}]}'
`);
