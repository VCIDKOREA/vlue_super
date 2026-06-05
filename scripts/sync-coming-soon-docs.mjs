#!/usr/bin/env node
/**
 * web/public/coming-soon.html → github-pages/ 동기화
 * 원본은 web/public/coming-soon.html 만 수정하세요.
 */
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "github-pages");

mkdirSync(out, { recursive: true });
copyFileSync(join(root, "web/public/coming-soon.html"), join(out, "index.html"));
copyFileSync(join(root, "web/public/favicon.svg"), join(out, "favicon.svg"));
writeFileSync(join(out, "CNAME"), "www.vlue.kr", "ascii");
writeFileSync(join(out, ".nojekyll"), "", "ascii");

console.log("Synced coming-soon → github-pages/ (index.html, favicon.svg, CNAME)");
