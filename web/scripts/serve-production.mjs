/**
 * 프로덕션 정적 서버
 * - /downloads/* : 정적 파일 직접 서빙 ONLY (index.html SPA 폴백 절대 금지)
 * - 그 외 : SPA(index.html) 폴백
 */
import { createServer } from "node:http";
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import handler from "serve-handler";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, "..", "dist");
const downloadsRoot = normalize(join(dist, "downloads"));
const port = Number(process.env.PORT || 8080);
const installerName = "VLUE-Setup-1.0.0.exe";
const GITHUB_INSTALLER_URL =
  "https://github.com/VCIDKOREA/vlue_super/releases/download/pc-v1.0.0/VLUE-Setup-1.0.0.exe";

/** @type {Record<string, unknown>} */
let serveConfig = {};
try {
  serveConfig = JSON.parse(readFileSync(join(dist, "serve.json"), "utf8"));
} catch {
  /* optional */
}

const { headers: configHeaders, rewrites: _dropRewrites, ...restServeConfig } = serveConfig;

function isInsideDownloadsRoot(filePath) {
  const normalized = normalize(filePath);
  return normalized === downloadsRoot || normalized.startsWith(`${downloadsRoot}${sep}`);
}

function resolveDownloadFile(pathname) {
  if (!pathname.startsWith("/downloads/")) return null;

  const relative = pathname.slice("/downloads/".length);
  if (!relative || relative.includes("/") || relative.includes("..")) {
    return null;
  }

  const filePath = normalize(join(downloadsRoot, relative));
  if (!isInsideDownloadsRoot(filePath)) {
    return null;
  }

  return filePath;
}

function sendPlain(response, statusCode, body, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "CDN-Cache-Control": "no-store",
    "Cloudflare-CDN-Cache-Control": "no-store",
    ...extraHeaders
  });
  response.end(body);
}

function isDownloadsRequest(pathname) {
  return pathname === "/downloads" || pathname === "/downloads/" || pathname.startsWith("/downloads/");
}

function serveDownload(request, response, pathname) {
  const filePath = resolveDownloadFile(pathname);
  if (!filePath) {
    sendPlain(response, 400, "Bad Request");
    return;
  }

  if (!existsSync(filePath)) {
    console.warn(`[serve] 404 downloads missing (no SPA fallback): ${pathname}`);
    sendPlain(response, 404, `404 Not Found: ${pathname}`);
    return;
  }

  const stats = statSync(filePath);
  if (!stats.isFile()) {
    sendPlain(response, 404, `404 Not Found: ${pathname}`);
    return;
  }

  const head = readFileSync(filePath).subarray(0, 2);
  if (head[0] !== 0x4d || head[1] !== 0x5a) {
    console.warn(`[serve] 404 downloads invalid PE: ${pathname}`);
    sendPlain(response, 404, `404 Not Found: invalid installer at ${pathname}`);
    return;
  }

  const baseName = pathname.split("/").pop() || "download";
  /** @type {Record<string, string>} */
  const headers = {
    "Content-Type": "application/octet-stream",
    "Content-Length": String(stats.size),
    "Cache-Control": "public, max-age=86400",
    "CDN-Cache-Control": "max-age=86400",
    "Cloudflare-CDN-Cache-Control": "max-age=86400",
    "X-Content-Type-Options": "nosniff"
  };

  if (baseName.endsWith(".exe")) {
    headers["Content-Disposition"] = `attachment; filename="${baseName}"`;
  }

  if (request.headers.range && stats.size) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(String(request.headers.range));
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : stats.size - 1;
      if (start <= end && end < stats.size) {
        headers["Content-Range"] = `bytes ${start}-${end}/${stats.size}`;
        headers["Content-Length"] = String(end - start + 1);
        response.writeHead(206, headers);
        createReadStream(filePath, { start, end }).pipe(response);
        return;
      }
    }
  }

  response.writeHead(200, headers);
  createReadStream(filePath).pipe(response);
}

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
  const pathname = url.pathname;

  if (isDownloadsRequest(pathname)) {
    if (pathname === "/downloads" || pathname === "/downloads/") {
      sendPlain(response, 404, "404 Not Found: /downloads/");
      return;
    }
    serveDownload(request, response, pathname);
    return;
  }

  return handler(request, response, {
    public: dist,
    ...restServeConfig,
    headers: configHeaders,
    cleanUrls: false,
    directoryListing: false,
    renderSingle: true,
    rewrites: [{ source: "**", destination: "/index.html" }]
  });
});

server.listen(port, "0.0.0.0", () => {
  const installerPath = join(downloadsRoot, installerName);
  const hasInstaller = existsSync(installerPath);
  const size = hasInstaller ? statSync(installerPath).size : 0;
  let dirListing = "(downloads dir missing)";
  try {
    if (existsSync(downloadsRoot)) {
      dirListing = readdirSync(downloadsRoot).join(", ") || "(empty)";
    }
  } catch {
    /* ignore */
  }
  console.log(`[serve] http://0.0.0.0:${port}`);
  console.log(
    `[serve] dist/downloads installer=${hasInstaller ? `ready ${size} bytes` : "MISSING"} files=[${dirListing}]`
  );
  if (!hasInstaller) {
    console.warn(`[serve] WARN: ${installerName} not in dist — /downloads/ returns 404 (never index.html)`);
    console.warn(`[serve] fallback source: ${GITHUB_INSTALLER_URL}`);
  }
});
