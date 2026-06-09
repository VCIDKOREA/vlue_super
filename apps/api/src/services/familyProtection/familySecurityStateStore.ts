import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chainLogHash } from "../security/securityGateway.js";

export type FamilySecurityHealth = "ok" | "warning" | "critical";

export type FamilyDevicePlatform = "android" | "ios" | "unknown";

export type FamilySecurityStateRow = {
  userId: string;
  batteryPercent: number;
  isCharging: boolean;
  securityHealth: FamilySecurityHealth;
  openThreatCount: number;
  lastBankActivityMasked?: string;
  /** 자녀·가족 기기 OS — iOS 제한 안내용 */
  devicePlatform?: FamilyDevicePlatform;
  logHash: string;
  prevLogHash?: string;
  updatedAt: string;
};

type Store = { states: FamilySecurityStateRow[] };

function storePath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../../../data/family_security_states.json");
}

async function readStore(): Promise<Store> {
  try {
    const text = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(text) as Store;
    return { states: Array.isArray(parsed.states) ? parsed.states : [] };
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return { states: [] };
    throw err;
  }
}

async function writeStore(store: Store) {
  const p = storePath();
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function upsertFamilySecurityState(input: {
  userId: string;
  batteryPercent: number;
  isCharging: boolean;
  securityHealth: FamilySecurityHealth;
  openThreatCount: number;
  lastBankActivityMasked?: string;
  devicePlatform?: FamilyDevicePlatform;
}): Promise<FamilySecurityStateRow> {
  const store = await readStore();
  const now = new Date().toISOString();
  const prev = store.states.find((s) => s.userId === input.userId);
  const prevLogHash = prev?.logHash;
  const row: FamilySecurityStateRow = {
    userId: input.userId,
    batteryPercent: Math.max(0, Math.min(100, Math.floor(input.batteryPercent))),
    isCharging: Boolean(input.isCharging),
    securityHealth: input.securityHealth,
    openThreatCount: Math.max(0, Math.floor(input.openThreatCount)),
    lastBankActivityMasked: input.lastBankActivityMasked,
    devicePlatform: input.devicePlatform || prev?.devicePlatform,
    logHash: chainLogHash(prevLogHash, { ...input, updatedAt: now }),
    prevLogHash,
    updatedAt: now
  };
  const idx = store.states.findIndex((s) => s.userId === input.userId);
  if (idx >= 0) store.states[idx] = row;
  else store.states.push(row);
  await writeStore(store);
  return row;
}

export async function listFamilySecurityStates(userIds: string[]): Promise<FamilySecurityStateRow[]> {
  const store = await readStore();
  const set = new Set(userIds);
  return store.states.filter((s) => set.has(s.userId));
}
