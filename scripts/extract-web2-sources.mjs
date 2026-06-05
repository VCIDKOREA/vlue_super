import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(repoRoot, "web2", "src");
const outRoot = path.join(repoRoot, "web", "src", "site", "bolt");

function extractContent(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const match = raw.match(/sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)/);
  if (match) {
    try {
      const json = JSON.parse(Buffer.from(match[1], "base64").toString("utf8"));
      const content = json.sourcesContent?.[0];
      if (content) return { content, from: "map" };
    } catch {
      /* fall through */
    }
  }
  if (!raw.includes("__vite__createHotContext") && !raw.includes("/@vite/client")) {
    return { content: raw, from: "raw" };
  }
  return null;
}

function walk(dir, rel = "") {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const relPath = rel ? `${rel}/${name}` : name;
    if (fs.statSync(full).isDirectory()) {
      walk(full, relPath);
      continue;
    }
    if (!/\.(tsx?|css)$/.test(name)) continue;

    const extracted = extractContent(full);
    if (!extracted) {
      console.warn("SKIP (no source):", relPath);
      continue;
    }

    const outPath = path.join(outRoot, relPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, extracted.content, "utf8");
    console.log(`OK ${relPath} (${extracted.from}, ${extracted.content.length} bytes)`);
  }
}

if (fs.existsSync(outRoot)) {
  fs.rmSync(outRoot, { recursive: true, force: true });
}
fs.mkdirSync(outRoot, { recursive: true });
walk(srcRoot);
console.log("Done ->", outRoot);
