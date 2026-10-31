import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type AndroidVersionConfig = {
  latestVersionCode: number;
  latestVersionName: string;
  /** 이 값 미만이면 강제 업데이트 */
  minRequiredVersionCode: number;
  /** true면 최신보다 낮은 앱에 강제 업데이트 팝업 */
  isForced: boolean;
  message: string;
  forceMessage: string;
  updatedAt: string | null;
};

const DEFAULT: AndroidVersionConfig = {
  latestVersionCode: 88,
  latestVersionName: "1.0.36",
  minRequiredVersionCode: 1,
  isForced: false,
  message: "새로운 버전이 있습니다. 업데이트하시겠습니까?",
  forceMessage: "필수 업데이트가 있습니다. 스토어에서 최신 버전으로 업데이트해 주세요.",
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
  const min = Number(process.env.VLUE_ANDROID_MIN_REQUIRED_VERSION_CODE);
  if (Number.isFinite(min) && min > 0) out.minRequiredVersionCode = Math.floor(min);
  const forced = process.env.VLUE_ANDROID_IS_FORCED?.trim().toLowerCase();
  if (forced === "1" || forced === "true" || forced === "yes") out.isForced = true;
  if (forced === "0" || forced === "false" || forced === "no") out.isForced = false;
  const msg = process.env.VLUE_ANDROID_UPDATE_MESSAGE?.trim();
  if (msg) out.message = msg.slice(0, 200);
  const forceMsg = process.env.VLUE_ANDROID_FORCE_UPDATE_MESSAGE?.trim();
  if (forceMsg) out.forceMessage = forceMsg.slice(0, 200);
  return out;
}

function asPositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function normalize(raw: unknown): AndroidVersionConfig {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const latest = asPositiveInt(o.latestVersionCode ?? o.latest_version_code, DEFAULT.latestVersionCode);
  const minRequired = asPositiveInt(
    o.minRequiredVersionCode ?? o.min_required_version ?? o.min_required_version_code,
    DEFAULT.minRequiredVersionCode
  );
  const forcedRaw = o.isForced ?? o.is_forced;
  const isForced =
    forcedRaw === true ||
    forcedRaw === 1 ||
    String(forcedRaw).trim().toLowerCase() === "true" ||
    String(forcedRaw).trim() === "1";
  return {
    latestVersionCode: latest,
    latestVersionName: String(
      o.latestVersionName || o.latest_version || DEFAULT.latestVersionName
    )
      .trim()
      .slice(0, 32),
    minRequiredVersionCode: Math.min(minRequired, latest),
    isForced,
    message: String(o.message || DEFAULT.message).trim().slice(0, 200) || DEFAULT.message,
    forceMessage:
      String(o.forceMessage || o.force_message || DEFAULT.forceMessage).trim().slice(0, 200) ||
      DEFAULT.forceMessage,
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
  minRequiredVersionCode?: number;
  isForced?: boolean;
  message?: string;
  forceMessage?: string;
}): Promise<AndroidVersionConfig> {
  const code = Math.floor(Number(input.latestVersionCode));
  if (!Number.isFinite(code) || code < 1) {
    throw new Error("latestVersionCode 가 올바르지 않습니다.");
  }
  const prev = await loadAndroidVersionConfig();
  let minRequired = prev.minRequiredVersionCode;
  if (input.minRequiredVersionCode !== undefined && input.minRequiredVersionCode !== null) {
    const m = Math.floor(Number(input.minRequiredVersionCode));
    if (!Number.isFinite(m) || m < 1) {
      throw new Error("minRequiredVersionCode 가 올바르지 않습니다.");
    }
    minRequired = m;
  }
  if (minRequired > code) {
    throw new Error("minRequiredVersionCode 는 latestVersionCode 이하여야 합니다.");
  }
  const next: AndroidVersionConfig = {
    latestVersionCode: code,
    latestVersionName: String(input.latestVersionName || prev.latestVersionName || DEFAULT.latestVersionName)
      .trim()
      .slice(0, 32),
    minRequiredVersionCode: minRequired,
    isForced: input.isForced !== undefined ? Boolean(input.isForced) : Boolean(prev.isForced),
    message: String(input.message || prev.message || DEFAULT.message).trim().slice(0, 200),
    forceMessage: String(input.forceMessage || prev.forceMessage || DEFAULT.forceMessage)
      .trim()
      .slice(0, 200),
    updatedAt: new Date().toISOString()
  };
  await mkdir(path.dirname(configPath()), { recursive: true });
  await writeFile(configPath(), JSON.stringify(next, null, 2), "utf8");
  cache = next;
  return next;
}

/** 공개 API·앱 클라이언트용 응답 필드 */
export function toPublicAndroidVersionPayload(cfg: AndroidVersionConfig) {
  return {
    ok: true as const,
    platform: "android" as const,
    packageName: "kr.vlue.app",
    latestVersionCode: cfg.latestVersionCode,
    latestVersionName: cfg.latestVersionName,
    minRequiredVersionCode: cfg.minRequiredVersionCode,
    isForced: cfg.isForced,
    message: cfg.message,
    forceMessage: cfg.forceMessage,
    /* 요구사항·테스트용 snake_case 별칭 */
    latest_version: cfg.latestVersionName,
    latest_version_code: cfg.latestVersionCode,
    min_required_version: cfg.minRequiredVersionCode,
    is_forced: cfg.isForced,
    store: {
      market: "market://details?id=kr.vlue.app",
      play: "https://play.google.com/store/apps/details?id=kr.vlue.app",
      galaxy: "https://apps.samsung.com/appquery/appDetail.as?appId=kr.vlue.app",
      /* 향후 iOS 연동용 — 앱이 플랫폼별로 선택 */
      appStore: null as string | null
    }
  };
}
