#!/usr/bin/env node
/**
 * AWS SES 자격증명 유효성만 확인 (시크릿 값은 출력하지 않음)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SESClient, GetSendQuotaCommand } from "@aws-sdk/client-ses";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = resolve(root, "apps/api/.env");

function loadEnv(file) {
  const map = {};
  if (!existsSync(file)) return map;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx < 0) continue;
    const key = t.slice(0, idx).trim();
    let val = t.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    map[key] = val;
  }
  return map;
}

const env = { ...loadEnv(envFile), ...process.env };
const accessKeyId = String(env.AWS_ACCESS_KEY_ID || "").trim();
const secretAccessKey = String(env.AWS_SECRET_ACCESS_KEY || "").trim();
const region = String(env.AWS_REGION || env.AWS_SES_REGION || "ap-northeast-2").trim();
const sender = String(env.SENDER_EMAIL || "").trim();

console.log(
  JSON.stringify(
    {
      region,
      sender,
      accessKeyLen: accessKeyId.length,
      accessKeyPrefix: accessKeyId.slice(0, 4),
      secretLen: secretAccessKey.length,
      secretHasPlus: secretAccessKey.includes("+"),
      hasSessionToken: Boolean(String(env.AWS_SESSION_TOKEN || "").trim())
    },
    null,
    2
  )
);

if (!accessKeyId || !secretAccessKey) {
  console.error("FAIL: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY missing");
  process.exit(1);
}

const client = new SESClient({
  region,
  credentials: { accessKeyId, secretAccessKey }
});

try {
  const quota = await client.send(new GetSendQuotaCommand({}));
  console.log(
    JSON.stringify(
      {
        ok: true,
        max24HourSend: quota.Max24HourSend,
        sentLast24Hours: quota.SentLast24Hours,
        maxSendRate: quota.MaxSendRate
      },
      null,
      2
    )
  );
} catch (e) {
  const name = e?.name || e?.Code || "Error";
  const msg = e?.message || String(e);
  console.error(JSON.stringify({ ok: false, name, message: msg }, null, 2));
  process.exit(2);
}
