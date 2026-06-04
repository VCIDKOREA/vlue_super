/**
 * Gradle Wrapper jar 다운로드 (gradlew.bat 사용 가능하게)
 */
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const androidDir = path.resolve(__dirname, "../apps/android");
const wrapperDir = path.join(androidDir, "gradle/wrapper");
const jarPath = path.join(wrapperDir, "gradle-wrapper.jar");
const version = "8.2";

if (fs.existsSync(jarPath) && fs.statSync(jarPath).size > 10000) {
  console.log("gradle-wrapper.jar already present");
  process.exit(0);
}

fs.mkdirSync(wrapperDir, { recursive: true });
const url = `https://raw.githubusercontent.com/gradle/gradle/v${version}.0/gradle/wrapper/gradle-wrapper.jar`;

console.log("Downloading", url);
https
  .get(url, (res) => {
    if (res.statusCode === 302 || res.statusCode === 301) {
      https.get(res.headers.location, save).on("error", fail);
      return;
    }
    save(res);
  })
  .on("error", fail);

function save(res) {
  const chunks = [];
  res.on("data", (c) => chunks.push(c));
  res.on("end", () => {
    fs.writeFileSync(jarPath, Buffer.concat(chunks));
    console.log("OK —", jarPath);
  });
}
function fail(e) {
  console.error("Download failed:", e.message);
  console.error("Android Studio에서 apps/android 열고 Gradle Sync 하세요.");
  process.exit(1);
}
