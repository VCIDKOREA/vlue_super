import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../web2/src");
const re = /sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)/;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(tsx?)$/.test(name)) continue;
    const raw = fs.readFileSync(full, "utf8");
    const m = raw.match(re);
    if (!m) continue;
    const json = JSON.parse(Buffer.from(m[1], "base64").toString("utf8"));
    (json.sources || []).forEach((src, i) => {
      if (src && String(src).includes("types")) {
        const content = json.sourcesContent?.[i] || "";
        console.log(path.relative(root, full), "->", src, content.length);
        if (content.length > 100) {
          const out = path.resolve(
            path.dirname(fileURLToPath(import.meta.url)),
            "../web/src/site/bolt/types/index.ts"
          );
          fs.writeFileSync(out, content, "utf8");
          console.log("WROTE", out);
        }
      }
    });
  }
}

walk(root);
