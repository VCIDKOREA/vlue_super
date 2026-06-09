import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type BusinessStaffRole = "OWNER" | "STAFF";
export type BusinessStaffLinkStatus = "active" | "revoked";

export type BusinessStaffLink = {
  id: string;
  ownerUserId: string;
  staffUserId: string;
  role: BusinessStaffRole;
  status: BusinessStaffLinkStatus;
  /** false면 전송 권한 원격 차단 (조회 불가) */
  transmitEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type Store = { links: BusinessStaffLink[] };

function storePath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../../../data/business_staff_links.json");
}

async function readStore(): Promise<Store> {
  try {
    const text = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(text) as Store;
    return { links: Array.isArray(parsed.links) ? parsed.links : [] };
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return { links: [] };
    throw err;
  }
}

async function writeStore(store: Store) {
  const p = storePath();
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function normalizeLink(row: BusinessStaffLink): BusinessStaffLink {
  return { ...row, transmitEnabled: row.transmitEnabled !== false };
}

/** active STAFF 링크 (전송 차단 여부 무관 — 역할 판별용) */
export async function findStaffLink(staffUserId: string): Promise<BusinessStaffLink | null> {
  const store = await readStore();
  const row = store.links.find(
    (l) => l.staffUserId === staffUserId && l.status === "active" && l.role === "STAFF"
  );
  return row ? normalizeLink(row) : null;
}

/** 전송 권한이 활성화된 STAFF만 (ingest 게이트) */
export async function findActiveStaffLink(staffUserId: string): Promise<BusinessStaffLink | null> {
  const link = await findStaffLink(staffUserId);
  if (!link || link.transmitEnabled === false) return null;
  return link;
}

export async function listStaffForOwner(ownerUserId: string): Promise<BusinessStaffLink[]> {
  const store = await readStore();
  return store.links
    .filter((l) => l.ownerUserId === ownerUserId && l.role === "STAFF" && l.status !== "revoked")
    .map(normalizeLink);
}

export async function setStaffTransmitEnabled(
  ownerUserId: string,
  staffUserId: string,
  enabled: boolean
): Promise<BusinessStaffLink> {
  const store = await readStore();
  const row = store.links.find((l) => l.ownerUserId === ownerUserId && l.staffUserId === staffUserId);
  if (!row) throw new Error("직원 링크를 찾을 수 없습니다.");
  row.transmitEnabled = enabled;
  row.status = "active";
  row.updatedAt = new Date().toISOString();
  await writeStore(store);
  return normalizeLink(row);
}

export async function revokeStaffLink(ownerUserId: string, staffUserId: string): Promise<BusinessStaffLink> {
  const store = await readStore();
  const row = store.links.find((l) => l.ownerUserId === ownerUserId && l.staffUserId === staffUserId);
  if (!row) throw new Error("직원 링크를 찾을 수 없습니다.");
  row.status = "revoked";
  row.transmitEnabled = false;
  row.updatedAt = new Date().toISOString();
  await writeStore(store);
  return normalizeLink(row);
}

export async function createStaffLink(ownerUserId: string, staffUserId: string): Promise<BusinessStaffLink> {
  const store = await readStore();
  const existing = store.links.find(
    (l) => l.ownerUserId === ownerUserId && l.staffUserId === staffUserId && l.status === "active"
  );
  if (existing) return normalizeLink(existing);
  const now = new Date().toISOString();
  const row: BusinessStaffLink = {
    id: `bst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ownerUserId,
    staffUserId,
    role: "STAFF",
    status: "active",
    transmitEnabled: true,
    createdAt: now,
    updatedAt: now
  };
  store.links.push(row);
  await writeStore(store);
  return row;
}
