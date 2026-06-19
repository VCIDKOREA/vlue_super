/**
 * 프로덕션 정적 서버 — /downloads/* 는 SPA(index.html) 폴백 제외
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import handler from "serve-handler";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, "..", "dist");
const port = Number(process.env.PORT || 8080);

/** @type {Record<string, unknown>} */
let serveConfig = {};
try {
  serveConfig = JSON.parse(readFileSync(join(dist, "serve.json"), "utf8"));
} catch {
  /* dist/serve.json 없으면 headers만 기본 */
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url || "/", `http://127.0.0.1:${port}`).pathname;
  const bypassSpa = pathname.startsWith("/downloads/");

  return handler(request, response, {
    public: dist,
    ...serveConfig,
    renderSingle: bypassSpa ? false : true
  });
});

server.listen(port, () => {
  console.log(`[serve] http://0.0.0.0:${port} (downloads SPA bypass)`);
});
