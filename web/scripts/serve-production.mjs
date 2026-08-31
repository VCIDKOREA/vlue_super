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
const webRoot = join(__dirname, "..");
const dist = process.env.VLUE_WEB_DIST?.trim() || join(webRoot, "dist");
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

/** Meta 검수용 정적 약관 — SPA index.html 폴백보다 우선 */
const LEGAL_STATIC_PAGES = new Map([
  ["/privacy", "privacy/index.html"],
  ["/privacy/", "privacy/index.html"],
  ["/terms", "terms/index.html"],
  ["/terms/", "terms/index.html"],
  ["/data-deletion", "data-deletion/index.html"],
  ["/data-deletion/", "data-deletion/index.html"],
  ["/refund", "refund/index.html"],
  ["/refund/", "refund/index.html"],
  ["/privacy/legal-article-6", "data-deletion/index.html"],
  ["/privacy/legal-article-6/", "data-deletion/index.html"]
]);

/** serve-handler rewrites — 정적 약관을 SPA 폴백보다 먼저 */
const LEGAL_STATIC_REWRITES = [
  { source: "/privacy", destination: "/privacy/index.html" },
  { source: "/privacy/", destination: "/privacy/index.html" },
  { source: "/terms", destination: "/terms/index.html" },
  { source: "/terms/", destination: "/terms/index.html" },
  { source: "/data-deletion", destination: "/data-deletion/index.html" },
  { source: "/data-deletion/", destination: "/data-deletion/index.html" },
  { source: "/refund", destination: "/refund/index.html" },
  { source: "/refund/", destination: "/refund/index.html" },
  { source: "/privacy/legal-article-6", destination: "/data-deletion/index.html" },
  { source: "/privacy/legal-article-6/", destination: "/data-deletion/index.html" }
];

const VLUE_SHARE_ORIGIN = String(process.env.VLUE_SHARE_ORIGIN || "https://m.vlue.kr")
  .trim()
  .replace(/\/$/, "");

/** `/showcase/010…` · `/s/010…` — 문자 OG 카드용. 관리 화면 `/showcase` 는 제외 */
function matchPublicShowcaseShare(pathname) {
  const m = String(pathname || "").match(/^\/(?:showcase|s)\/(\d{8,15})\/?$/);
  return m ? m[1] : "";
}

function serveShowcaseShortBounce(response, phone) {
  const spa = `/site/web/showcase/${encodeURIComponent(phone)}`;
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>VLUE 쇼케이스</title>
<meta http-equiv="refresh" content="0;url=${spa}"/>
<script>location.replace(${JSON.stringify(spa)});</script>
</head>
<body style="margin:0;font-family:sans-serif;background:#0B101B;color:#e2e8f0;display:flex;min-height:100vh;align-items:center;justify-content:center">
<a href="${spa}" style="color:#7dd3fc;font-weight:800;text-decoration:none">쇼케이스 열기</a>
</body>
</html>`;
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(html);
  return true;
}

async function serveShowcaseOgShare(_request, response, phone) {
  const dest = `${VLUE_SHARE_ORIGIN}/showcase/${encodeURIComponent(phone)}`;
  response.writeHead(302, {
    Location: dest,
    "Cache-Control": "public, max-age=120"
  });
  response.end();
}

function serveLegalStatic(response, pathname) {
  const rel = LEGAL_STATIC_PAGES.get(pathname);
  if (!rel) return false;
  const filePath = join(dist, rel);
  if (!existsSync(filePath)) return false;
  const body = readFileSync(filePath);
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": String(body.length),
    "Cache-Control": "public, max-age=300"
  });
  response.end(body);
  return true;
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

  const showcasePhone = matchPublicShowcaseShare(pathname);
  if (showcasePhone) {
    void serveShowcaseOgShare(request, response, showcasePhone);
    return;
  }

  if (serveLegalStatic(response, pathname)) {
    return;
  }

  return handler(request, response, {
    public: dist,
    ...restServeConfig,
    headers: configHeaders,
    cleanUrls: false,
    directoryListing: false,
    renderSingle: true,
    rewrites: [...LEGAL_STATIC_REWRITES, { source: "**", destination: "/index.html" }]
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
  console.log(`[serve] dist=${dist}`);
  for (const [, rel] of LEGAL_STATIC_PAGES) {
    const ok = existsSync(join(dist, rel));
    console.log(`[serve] legal ${rel} ${ok ? "OK" : "MISSING"}`);
  }
  console.log(
    `[serve] dist/downloads installer=${hasInstaller ? `ready ${size} bytes` : "MISSING"} files=[${dirListing}]`
  );
  if (!hasInstaller) {
    console.warn(`[serve] WARN: ${installerName} not in dist — /downloads/ returns 404 (never index.html)`);
    console.warn(`[serve] fallback source: ${GITHUB_INSTALLER_URL}`);
  }
});
