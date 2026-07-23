import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(__dirname, "..");

/**
 * 모노레포 루트 `.env` 의 VITE_* (카카오 JS 키·포트원 등)와
 * `web/.env*` 를 병합. web 값이 있으면 우선.
 */
function mergeViteEnv(mode) {
  const fromRoot = loadEnv(mode, monorepoRoot, "VITE_");
  const fromWeb = loadEnv(mode, __dirname, "VITE_");
  for (const [key, value] of Object.entries({ ...fromRoot, ...fromWeb })) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export default defineConfig(({ mode }) => {
  mergeViteEnv(mode);

  return {
    root: __dirname,
    envDir: __dirname,
    /** Electron 패키징 시 file:// 프로토콜 상대 경로 로딩 */
    base: process.env.VITE_ELECTRON_PACK === "1" ? "./" : "/",
    plugins: [react()],
    optimizeDeps: {
      /** 깨진/미설치 패키지가 optimize 스캔에 끌려 들어와 앱 부팅이 백지되는 것 방지 */
      exclude: ["tesseract.js", "@portone/browser-sdk"]
    },
    resolve: {
      alias: {
        "@vlue/shared": resolve(__dirname, "../packages/shared/src/index.ts"),
        "@vlue/shared/signup/reservedIds": resolve(
          __dirname,
          "../packages/shared/src/signup/reservedIds.js"
        )
      }
    },
    build: {
      outDir: "dist",
      emptyOutDir: true
    },
    server: {
      /** true = 0.0.0.0 에 바인딩 — 같은 Wi-Fi 의 휴대폰에서 http://<PC_LAN_IP>:포트 로 접속 가능 */
      host: true,
      /** 카카오 콘솔 Web 도메인·Redirect URI와 포트를 맞추기 쉽게 기본 5173 (이미 사용 중이면 Vite가 다음 포트로 넘어가므로 콘솔에도 그 포트 등록) */
      port: 5173,
      strictPort: false,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8788",
          changeOrigin: true
        }
      }
    },
    preview: {
      host: true,
      port: Number(process.env.PORT) || 8080,
      strictPort: true,
      allowedHosts: [".up.railway.app", "localhost"]
    }
  };
});
