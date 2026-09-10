import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type AndroidVersionConfig = {
  latestVersionCode: number;
  latestVersionName: string;
  message: string;
  updatedAt: string | null;
};

const DEFAULT: AndroidVersionConfig = {
  latestVersionCode: 48,
  latestVersionName: "1.0.6",
  message: "새로운 버전이 있습니다. 업데이트 하시겠습니까?",
  updatedAt: null
};

function configPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../../../data/android_version.json");
}

let cache: AndroidVersionConfig | null = null;

function envOverrides(): Partial<AndroidVersionConfig> {
  const out: Partial<AndroidVersionConfig> = {};
  const code = Number(process.env.VLUE_ANDROID_LATEST_VERSION_CODE);
  if (Number.isFinite(code) && code > 0) out.latestVersionCode = Math.floor(code);
  const name = process.env.VLUE_ANDROID_LATEST_VERSION_NAME?.trim();
  if (name) out.latestVersionName = name.slice(0, 32);
  const msg = process.env.VLUE_ANDROID_UPDATE_MESSAGE?.trim();
  if (msg) out.message = msg.slice(0, 200);
  return out;
}

function normalize(raw: unknown): AndroidVersionConfig {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const code = Number(o.latestVersionCode);
  return {
    latestVersionCode:
      Number.isFinite(code) && code > 0 ? Math.floor(code) : DEFAULT.latestVersionCode,
    latestVersionName: String(o.latestVersionName || DEFAULT.latestVersionName).trim().slice(0, 32),
    message: String(o.message || DEFAULT.message).trim().slice(0, 200) || DEFAULT.message,
    updatedAt: o.updatedAt ? String(o.updatedAt) : null
  };
}

export async function loadAndroidVersionConfig(): Promise<AndroidVersionConfig> {
  if (!cache) {
    try {
      const raw = await readFile(configPath(), "utf8");
      cache = normalize(JSON.parse(raw));
    } catch {
      cache = { ...DEFAULT };
    }
  }
  return { ...cache, ...envOverrides() };
}

export async function saveAndroidVersionConfig(input: {
  latestVersionCode: number;
  latestVersionName?: string;
  message?: string;
}): Promise<AndroidVersionConfig> {
  const code = Math.floor(Number(input.latestVersionCode));
  if (!Number.isFinite(code) || code < 1) {
    throw new Error("latestVersionCode 가 올바르지 않습니다.");
  }
  const prev = await loadAndroidVersionConfig();
  const next: AndroidVersionConfig = {
    latestVersionCode: code,
    latestVersionName: String(input.latestVersionName || prev.latestVersionName || DEFAULT.latestVersionName)
      .trim()
      .slice(0, 32),
    message: String(input.message || prev.message || DEFAULT.message).trim().slice(0, 200),
    updatedAt: new Date().toISOString()
  };
  await mkdir(path.dirname(configPath()), { recursive: true });
  await writeFile(configPath(), JSON.stringify(next, null, 2), "utf8");
  cache = next;
  return next;
}
