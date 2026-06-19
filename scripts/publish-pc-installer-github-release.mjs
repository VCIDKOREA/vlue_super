/**
 * 로컬 VLUE-Setup-1.0.0.exe → GitHub Release 업로드
 * 사용: GITHUB_TOKEN=<repo 권한 PAT> node scripts/publish-pc-installer-github-release.mjs
 */
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const installer = join(root, "apps/electron/dist/VLUE-Setup-1.0.0.exe");
const repo = "VCIDKOREA/vlue_super";
const tag = String(process.env.PC_INSTALLER_TAG || "pc-v1.0.0").trim();
const assetName = "VLUE-Setup-1.0.0.exe";

const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
if (!token) {
  console.error("[publish-pc-installer] GITHUB_TOKEN 또는 GH_TOKEN 필요");
  process.exit(1);
}

if (!existsSync(installer)) {
  console.error("[publish-pc-installer] 설치 파일 없음 — npm run electron:build:win 먼저 실행");
  process.exit(1);
}

const size = statSync(installer).size;
if (size < 5_000_000) {
  console.error(`[publish-pc-installer] 파일이 너무 작음 (${size} bytes)`);
  process.exit(1);
}

async function gh(path, { method = "GET", headers = {}, body } = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...headers
    },
    body
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`GitHub API ${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }

  return json;
}

async function ensureRelease() {
  try {
    return await gh(`/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`);
  } catch {
    return gh(`/repos/${repo}/releases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tag_name: tag,
        name: `VLUE PC Installer ${tag}`,
        body: "Windows PC 설치 파일"
      })
    });
  }
}

async function deleteAssetIfExists(releaseId, name) {
  const release = await gh(`/repos/${repo}/releases/${releaseId}`);
  const existing = (release.assets || []).find((a) => a.name === name);
  if (!existing) return;
  await gh(`/repos/${repo}/releases/assets/${existing.id}`, { method: "DELETE" });
}

async function uploadAsset(uploadUrl, filePath, name) {
  const endpoint = uploadUrl.replace(/\{[^}]*\}$/, `?name=${encodeURIComponent(name)}`);
  const stats = statSync(filePath);
  const stream = createReadStream(filePath);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Content-Length": String(stats.size)
    },
    // @ts-expect-error Node fetch streaming body
    duplex: "half",
    body: stream
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`upload failed ${res.status}: ${text.slice(0, 400)}`);
  }

  return JSON.parse(text);
}

async function main() {
  console.log(`[publish-pc-installer] release=${tag} file=${installer} (${size} bytes)`);
  const release = await ensureRelease();
  await deleteAssetIfExists(release.id, assetName);
  const asset = await uploadAsset(release.upload_url, installer, assetName);
  const downloadUrl = asset.browser_download_url;
  console.log("[publish-pc-installer] OK");
  console.log(`  download: ${downloadUrl}`);
  console.log(`  Railway VLUE_PC_INSTALLER_URL=${downloadUrl}`);
}

main().catch((e) => {
  console.error("[publish-pc-installer]", e.message || e);
  process.exit(1);
});
