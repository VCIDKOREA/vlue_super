/**
 * 통화 오버레이 전용 번들 → Android assets (apps/android/app/src/main/assets/vlue-overlay).
 *
 *   npm run build:overlay --workspace @vlue/web
 *
 * - base `/vlue-overlay/` : 네이티브 shouldInterceptRequest 가 `https://<web>/vlue-overlay/*` 를
 *   assets/vlue-overlay/* 로 매핑한다. (오리진 유지 → localStorage·API CORS 는 기존과 동일)
 * - publicDir 미사용 : 대용량 공개 파일(mp4 등)을 APK 에 넣지 않는다.
 */
import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import baseConfigFactory from "./vite.config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig((env) => {
  const base = typeof baseConfigFactory === "function" ? baseConfigFactory(env) : baseConfigFactory;
  return {
    ...base,
    base: "/vlue-overlay/",
    publicDir: false,
    plugins: (base.plugins || []).filter((p) => p && p.name !== "vlue-firebase-web-config"),
    build: {
      outDir: resolve(__dirname, "../apps/android/app/src/main/assets/vlue-overlay"),
      emptyOutDir: true,
      target: "es2019",
      cssCodeSplit: false,
      assetsInlineLimit: 8192,
      chunkSizeWarningLimit: 4000,
      rollupOptions: {
        input: resolve(__dirname, "overlay.html")
      }
    }
  };
});
