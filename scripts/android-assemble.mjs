/**
 * JDK 17 자동 탐지 후 assembleDebug
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const androidDir = path.resolve(__dirname, "../apps/android");

function findJbr() {
  const candidates = [
    process.env.JAVA_HOME,
    process.env.ANDROID_STUDIO_JBR,
    "C:\\Program Files\\Android\\Android Studio\\jbr",
    "C:\\Program Files\\Android\\Android Studio1\\jbr",
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Android", "Android Studio", "jbr"),
    "C:\\Program Files\\Microsoft\\jdk-17.0.13.11-hotspot",
    "C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.13.11-hotspot"
  ].filter(Boolean);
  for (const p of candidates) {
    const java = path.join(p, "bin", "java.exe");
    if (fs.existsSync(java)) return p;
  }
  return null;
}

const jbr = findJbr();
const env = { ...process.env };
if (jbr) {
  env.JAVA_HOME = jbr;
  console.log("Using JAVA_HOME:", jbr);
} else {
  console.error("JDK 17+ not found.");
  console.error("Install Android Studio, then set in apps/android/gradle.properties:");
  console.error('  org.gradle.java.home=C:\\\\Program Files\\\\Android\\\\Android Studio\\\\jbr');
  process.exit(1);
}

const gradlew = path.join(androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew");
const args = process.argv.slice(2);
if (args.length === 0) args.push("assembleDebug");

const r = spawnSync(gradlew, args, { cwd: androidDir, env, stdio: "inherit", shell: true });
process.exit(r.status ?? 1);
