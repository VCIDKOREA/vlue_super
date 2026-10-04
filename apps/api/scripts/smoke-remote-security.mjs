/**
 * Remote security API smoke (local).
 * Uses DATABASE_URL from env via ensure schema + optional HTTP if API up.
 * Never prints secrets.
 *
 * Usage:
 *   node scripts/smoke-remote-security.mjs
 *   SMOKE_BASE=http://127.0.0.1:8788 SMOKE_USER_ID=<uuid> node scripts/smoke-remote-security.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, "..");

function loadDotEnv() {
  const p = resolve(apiRoot, ".env");
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadDotEnv();

const results = [];
function ok(name, detail = "") {
  results.push({ name, status: "PASS", detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  results.push({ name, status: "FAIL", detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}
function skip(name, detail = "") {
  results.push({ name, status: "SKIP", detail });
  console.log(`SKIP  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function checkRoutesMounted() {
  const apiTs = readFileSync(resolve(apiRoot, "src/routes/api.ts"), "utf8");
  if (apiTs.includes('route("/security"') && apiTs.includes("securityRemoteRoutes")) {
    ok("routes.mounted", "/api/security → securityRemoteRoutes");
  } else {
    fail("routes.mounted", "security routes not found in api.ts");
  }
  const sec = readFileSync(resolve(apiRoot, "src/routes/securityRemote.ts"), "utf8");
  for (const path of ["/remote-detected", "/remote-heartbeat", "/app-lifecycle"]) {
    if (sec.includes(`"${path}"`)) ok(`route.${path}`);
    else fail(`route.${path}`);
  }
}

async function checkFcmCopy() {
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync("npx", ["tsx", "src/tests/familyRemoteSecurityFcm.test.ts"], {
    cwd: apiRoot,
    encoding: "utf8",
    shell: true
  });
  if (r.status === 0 && String(r.stdout || "").includes("OK")) {
    ok("fcm.unit", "familyRemoteSecurityFcm.test.ts OK");
  } else {
    fail("fcm.unit", String(r.stderr || r.stdout || `exit ${r.status}`).slice(0, 200));
  }
}

async function checkSchemaEnsure() {
  if (!process.env.DATABASE_URL) {
    skip("db.schema_ensure", "DATABASE_URL missing");
    return;
  }
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync("npx", ["tsx", "scripts/ensure-remote-security-schema.ts"], {
    cwd: apiRoot,
    encoding: "utf8",
    env: process.env,
    shell: true
  });
  if (r.status === 0 && String(r.stdout || "").includes("SCHEMA_OK")) {
    ok("db.schema_ensure", "family_remote_security_state + location_presence last_*");
  } else {
    fail(
      "db.schema_ensure",
      String(r.stderr || r.stdout || `exit ${r.status}`).replace(process.env.DATABASE_URL || "", "[db]").slice(0, 240)
    );
  }
}

async function checkHttpSmoke() {
  const base = (process.env.SMOKE_BASE || "http://127.0.0.1:8788").replace(/\/$/, "");
  const userId = process.env.SMOKE_USER_ID || "";
  let up = false;
  try {
    const health = await fetch(`${base}/api/health`).catch(() => null);
    if (health && health.ok) {
      up = true;
      ok("api.health", base);
    } else {
      const alt = await fetch(`${base}/health`).catch(() => null);
      if (alt && alt.ok) {
        up = true;
        ok("api.health", `${base}/health`);
      }
    }
  } catch {
    /* ignore */
  }
  if (!up) {
    skip("api.http_smoke", `API not listening at ${base}`);
    return;
  }
  if (!userId) {
    skip("api.remote_detected", "set SMOKE_USER_ID=<uuid> for auth smoke");
    return;
  }
  const res = await fetch(`${base}/api/security/remote-detected`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-VLUE-User-Id": userId,
      Accept: "application/json"
    },
    body: JSON.stringify({
      packageName: "com.anydesk.anydeskandroid",
      is_remote_active: true
    })
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 200 && body && (body.ok === true || body.matched != null)) {
    ok("api.remote_detected", `status=${res.status} matched=${body.matched} silent=${body.silentLocal}`);
  } else if (res.status === 401) {
    skip("api.remote_detected", "auth rejected (need valid user / JWT mode)");
  } else {
    fail("api.remote_detected", `status=${res.status} body=${JSON.stringify(body).slice(0, 180)}`);
  }
}

async function checkAndroidAndWebArtifacts() {
  const files = [
    "D:/dev/vlue_super/apps/android/app/src/main/java/kr/vlue/calloverlay/family/FamilyRemoteSecurityGate.kt",
    "D:/dev/vlue_super/apps/android/app/src/main/java/kr/vlue/calloverlay/family/FamilyCareForegroundService.kt",
    "D:/dev/vlue_super/web/src/components/FamilyProtectionRegister.jsx",
    "D:/dev/vlue_super/packages/db/prisma/migrations/20261004_remote_security_last_location/migration.sql"
  ];
  for (const f of files) {
    if (existsSync(f)) ok(`artifact.${f.split("/").pop()}`);
    else fail(`artifact.${f.split("/").pop()}`, "missing");
  }
  const reg = readFileSync(
    "D:/dev/vlue_super/web/src/components/FamilyProtectionRegister.jsx",
    "utf8"
  );
  if (reg.includes("마지막 위치는 24시간") || reg.includes("동의·안내")) {
    ok("ui.consent_copy");
  } else {
    fail("ui.consent_copy");
  }
}

async function main() {
  console.log("=== remote-security smoke ===");
  await checkRoutesMounted();
  await checkFcmCopy();
  await checkAndroidAndWebArtifacts();
  await checkSchemaEnsure();
  await checkHttpSmoke();
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log("---");
  console.log(
    `summary PASS=${results.filter((r) => r.status === "PASS").length} FAIL=${failed} SKIP=${results.filter((r) => r.status === "SKIP").length}`
  );
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
