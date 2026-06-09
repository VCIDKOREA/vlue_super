import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_PRICING_CONFIG,
  type PricingConfigFile,
  type PricingPlanSku
} from "./pricingConfigSchema.js";

const PLAN_SKUS: PricingPlanSku[] = ["b2b_full_package", "soho_activity", "soho_broadcast_addon"];

function repoDataPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../../../data/pricing_config.json");
}

let cache: PricingConfigFile | null = null;
let cacheMtime = 0;

function validateConfig(raw: unknown): PricingConfigFile {
  if (!raw || typeof raw !== "object") {
    throw new Error("요금 설정 형식이 올바르지 않습니다.");
  }
  const obj = raw as PricingConfigFile;
  if (!obj.plans || typeof obj.plans !== "object") {
    throw new Error("plans 섹션이 필요합니다.");
  }
  for (const sku of PLAN_SKUS) {
    const plan = obj.plans[sku];
    if (!plan) throw new Error(`요금제 ${sku} 가 없습니다.`);
    if (!Number.isFinite(plan.monthlyKrw) || plan.monthlyKrw < 0) {
      throw new Error(`${sku} 월 요금이 올바르지 않습니다.`);
    }
    if (!Number.isFinite(plan.annualKrw) || plan.annualKrw < 0) {
      throw new Error(`${sku} 연 요금이 올바르지 않습니다.`);
    }
    if (!plan.label?.trim()) throw new Error(`${sku} 라벨이 필요합니다.`);
  }
  if (!obj.legacy || typeof obj.legacy !== "object") {
    throw new Error("legacy 섹션이 필요합니다.");
  }
  return {
    ...DEFAULT_PRICING_CONFIG,
    ...obj,
    version: Number(obj.version) || 1,
    vatIncluded: obj.vatIncluded !== false,
    currency: "KRW",
    plans: {
      ...DEFAULT_PRICING_CONFIG.plans,
      ...obj.plans
    },
    legacy: {
      ...DEFAULT_PRICING_CONFIG.legacy,
      ...obj.legacy
    }
  };
}

export async function loadPricingConfig(force = false): Promise<PricingConfigFile> {
  const filePath = repoDataPath();
  try {
    const stat = await import("node:fs").then((fs) => fs.promises.stat(filePath));
    if (!force && cache && stat.mtimeMs === cacheMtime) return cache;
    const text = await readFile(filePath, "utf8");
    const parsed = validateConfig(JSON.parse(text));
    cache = parsed;
    cacheMtime = stat.mtimeMs;
    return parsed;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      cache = { ...DEFAULT_PRICING_CONFIG, updatedAt: new Date().toISOString() };
      cacheMtime = 0;
      return cache;
    }
    if (cache) return cache;
    return DEFAULT_PRICING_CONFIG;
  }
}

export function getPricingConfigSync(): PricingConfigFile {
  return cache || DEFAULT_PRICING_CONFIG;
}

export async function savePricingConfig(
  next: PricingConfigFile,
  updatedBy: string
): Promise<PricingConfigFile> {
  const validated = validateConfig({
    ...next,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy || "admin"
  });
  const filePath = repoDataPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  const payload = `${JSON.stringify(validated, null, 2)}\n`;
  await writeFile(tmp, payload, "utf8");
  await rename(tmp, filePath);
  cache = validated;
  try {
    const stat = await import("node:fs").then((fs) => fs.promises.stat(filePath));
    cacheMtime = stat.mtimeMs;
  } catch {
    cacheMtime = Date.now();
  }
  return validated;
}

/** 런타임 pricingConstants 연동용 */
export function pricingNumbersFromConfig(cfg: PricingConfigFile = getPricingConfigSync()) {
  return {
    B2B_MONTHLY_PER_LINE_KRW: cfg.plans.b2b_full_package.monthlyKrw,
    B2B_ANNUAL_PER_LINE_KRW: cfg.plans.b2b_full_package.annualKrw,
    SOHO_ACTIVITY_MONTHLY_KRW: cfg.plans.soho_activity.monthlyKrw,
    SOHO_ACTIVITY_ANNUAL_KRW: cfg.plans.soho_activity.annualKrw,
    SOHO_BROADCAST_MONTHLY_KRW: cfg.plans.soho_broadcast_addon.monthlyKrw,
    SOHO_BROADCAST_ANNUAL_KRW: cfg.plans.soho_broadcast_addon.annualKrw,
    PREMIUM_LIST_PRICE_KRW: cfg.legacy.paidListMonthlyKrw,
    B2C_MONTHLY_PRICE_KRW: cfg.plans.soho_activity.monthlyKrw,
    PERSONAL_COMBO_ADDON_MONTHLY_KRW: cfg.legacy.personalComboAddonMonthlyKrw
  };
}
