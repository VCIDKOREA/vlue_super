/**
 * Electron Windows 설치 파일 → web/public/downloads (Vite 정적 배포용)
 * npm run electron:build:win 이후 실행하거나 web:build 전에 연동
 * Railway: VLUE_PC_INSTALLER_URL — GitHub Release 등 외부 URL만 사용 (www.vlue.kr 금지: 순환)
 */
import {
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { get } from "node:https";
import { get as httpGet } from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "apps/electron/dist/VLUE-Setup-1.0.0.exe");
const destDir = join(root, "web/public/downloads");
const dest = join(destDir, "VLUE-Setup-1.0.0.exe");
const distDestDir = join(root, "web/dist/downloads");
const distDest = join(distDestDir, "VLUE-Setup-1.0.0.exe");
const MIN_BYTES = 5_000_000;
const DEFAULT_INSTALLER_URL =
  "https://github.com/VCIDKOREA/vlue_super/releases/download/pc-v1.0.0/VLUE-Setup-1.0.0.exe";

const strict =
  process.env.REQUIRE_PC_INSTALLER === "1" || Boolean(process.env.RAILWAY_ENVIRONMENT);

function isCircularBuildUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "www.vlue.kr" ||
      host === "vlue.kr" ||
      host.endsWith(".up.railway.app") ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

function getRemoteCandidates() {
  const candidates = [];
  const envUrl = String(process.env.VLUE_PC_INSTALLER_URL || "").trim();

  if (envUrl.startsWith("http")) {
    if (isCircularBuildUrl(envUrl)) {
      console.warn(
        `[sync-pc-installer] SKIP circular build URL (배포 중인 사이트 자체 URL 불가): ${envUrl}`
      );
    } else {
      candidates.push(envUrl);
    }
  }

  if (!candidates.includes(DEFAULT_INSTALLER_URL)) {
    candidates.push(DEFAULT_INSTALLER_URL);
  }

  return candidates;
}

function verifyInstaller(path) {
  if (!existsSync(path)) {
    throw new Error(`installer missing after sync: ${path}`);
  }
  const size = statSync(path).size;
  if (size < MIN_BYTES) {
    throw new Error(`installer too small (${size} bytes): ${path}`);
  }
  const head = readFileSync(path).subarray(0, 2);
  if (head[0] !== 0x4d || head[1] !== 0x5a) {
    throw new Error(`installer is not a Windows .exe (MZ header missing): ${path}`);
  }
  return size;
}

function hasValidInstaller(path) {
  try {
    verifyInstaller(path);
    return true;
  } catch {
    return false;
  }
}

function downloadFile(url, outPath, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) {
      reject(new Error("download failed: too many redirects"));
      return;
    }

    const client = url.startsWith("https:") ? get : httpGet;
    const req = client(
      url,
      {
        headers: {
          "User-Agent": "vlue-build-sync/1.0",
          Accept: "application/octet-stream,*/*"
        }
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = new URL(res.headers.location, url).toString();
          res.resume();
          downloadFile(next, outPath, redirects + 1).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`download failed: HTTP ${res.statusCode} for ${url}`));
          res.resume();
          return;
        }

        const contentType = String(res.headers["content-type"] || "").toLowerCase();
        if (contentType.includes("text/html")) {
          reject(new Error(`download returned HTML, not binary: ${url}`));
          res.resume();
          return;
        }

        const tmp = `${outPath}.part`;
        const file = createWriteStream(tmp);
        res.pipe(file);
        file.on("finish", () => {
          file.close(() => {
            try {
              if (existsSync(outPath)) unlinkSync(outPath);
              copyFileSync(tmp, outPath);
              unlinkSync(tmp);
              resolve();
            } catch (err) {
              reject(err);
            }
          });
        });
        file.on("error", reject);
      }
    );

    req.on("error", reject);
    req.setTimeout(10 * 60 * 1000, () => {
      req.destroy(new Error(`download timeout: ${url}`));
    });
  });
}

function copyInstaller(fromPath, label) {
  mkdirSync(destDir, { recursive: true });
  copyFileSync(fromPath, dest);
  const publicSize = verifyInstaller(dest);
  console.log(`[sync-pc-installer] OK (${label}) → web/public/downloads/VLUE-Setup-1.0.0.exe (${publicSize} bytes)`);

  if (existsSync(join(root, "web/dist"))) {
    mkdirSync(distDestDir, { recursive: true });
    copyFileSync(fromPath, distDest);
    const distSize = verifyInstaller(distDest);
    console.log(`[sync-pc-installer] OK (${label}) → web/dist/downloads/VLUE-Setup-1.0.0.exe (${distSize} bytes)`);
  }
}

async function downloadInstallerRemote() {
  const candidates = getRemoteCandidates();
  let lastError = null;

  for (const url of candidates) {
    try {
      mkdirSync(destDir, { recursive: true });
      console.log(`[sync-pc-installer] downloading ${url}`);
      await downloadFile(url, dest);
      verifyInstaller(dest);
      console.log(`[sync-pc-installer] OK (remote: ${url}) → ${dest}`);
      return;
    } catch (err) {
      lastError = err;
      console.warn(`[sync-pc-installer] retry — ${url}: ${err instanceof Error ? err.message : err}`);
      for (const p of [dest, `${dest}.part`]) {
        if (existsSync(p)) unlinkSync(p);
      }
    }
  }

  throw lastError || new Error("installer download failed");
}

async function main() {
  if (existsSync(src)) {
    copyInstaller(src, "local");
    return;
  }

  if (hasValidInstaller(dest)) {
    const size = statSync(dest).size;
    console.log(`[sync-pc-installer] SKIP (already present) → ${dest} (${size} bytes)`);
    if (existsSync(join(root, "web/dist")) && !hasValidInstaller(distDest)) {
      mkdirSync(distDestDir, { recursive: true });
      copyFileSync(dest, distDest);
      console.log(`[sync-pc-installer] OK (public→dist) → ${distDest}`);
    }
    return;
  }

  if (getRemoteCandidates().length > 0) {
    await downloadInstallerRemote();

    if (existsSync(join(root, "web/dist"))) {
      mkdirSync(distDestDir, { recursive: true });
      copyFileSync(dest, distDest);
      verifyInstaller(distDest);
      console.log(`[sync-pc-installer] OK (remote→dist) → ${distDest}`);
    }
    return;
  }

  const message =
    "설치 파일 없음 — npm run electron:build:win 또는 VLUE_PC_INSTALLER_URL(GitHub Release 등) 설정";

  if (strict) {
    console.error(`[sync-pc-installer] FAIL: ${message}`);
    process.exit(1);
  }

  console.warn(`[sync-pc-installer] ${message}`);
}

main().catch((e) => {
  console.error("[sync-pc-installer]", e.message || e);
  process.exit(1);
});
