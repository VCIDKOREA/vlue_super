#!/usr/bin/env node
/**
 * web/public/coming-soon.html → 저장소 루트(GitHub Pages) 동기화
 * 원본은 web/public/coming-soon.html 만 수정하세요.
 */
import { copyFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

copyFileSync(join(root, "web/public/coming-soon.html"), join(root, "index.html"));
copyFileSync(join(root, "web/public/favicon.svg"), join(root, "favicon.svg"));
writeFileSync(join(root, "CNAME"), "www.vlue.kr", "ascii");
writeFileSync(join(root, ".nojekyll"), "", "ascii");

console.log("Synced coming-soon → repo root (index.html, favicon.svg, CNAME)");
