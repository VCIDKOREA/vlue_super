import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(apiRoot, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

if (!process.env.DATABASE_URL) {
  console.error("NO_DATABASE_URL");
  process.exit(2);
}

const r = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsx", "scripts/ensure-remote-security-schema.ts"],
  { cwd: apiRoot, encoding: "utf8", env: process.env }
);
process.stdout.write(r.stdout || "");
process.stderr.write((r.stderr || "").replace(process.env.DATABASE_URL, "[db]"));
process.exit(r.status ?? 1);
