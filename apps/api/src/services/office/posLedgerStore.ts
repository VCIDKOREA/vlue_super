import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chainLogHash } from "../security/securityGateway.js";

export type PosLedgerEntry = {
  id: string;
  /** 장부 소유자(사장님) */
  userId: string;
  ownerUserId?: string;
  submittedByUserId?: string;
  submittedByName?: string;
  saleDate: string;
  totalKrw: number;
  cardKrw: number;
  cashKrw: number;
  vatKrw: number;
  rawOcrText: string;
  assetFileId?: string;
  logHash: string;
  prevLogHash?: string;
  createdAt: string;
  updatedAt?: string;
};

type Store = { entries: PosLedgerEntry[] };

function storePath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../../../data/pos_ledger_entries.json");
}

async function readStore(): Promise<Store> {
  try {
    const text = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(text) as Store;
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] };
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return { entries: [] };
    throw err;
  }
}

async function writeStore(store: Store) {
  const p = storePath();
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function lastHash(store: Store): string | undefined {
  const last = store.entries[store.entries.length - 1];
  return last?.logHash;
}

export async function listPosLedgerForOwner(ownerUserId: string, limit = 60): Promise<PosLedgerEntry[]> {
  const store = await readStore();
  return store.entries
    .filter((e) => (e.ownerUserId || e.userId) === ownerUserId)
    .slice(-limit)
    .reverse();
}

/** @deprecated use listPosLedgerForOwner */
export async function listPosLedgerForUser(userId: string, limit = 60): Promise<PosLedgerEntry[]> {
  return listPosLedgerForOwner(userId, limit);
}

export async function updatePosLedgerEntry(
  entryId: string,
  ownerUserId: string,
  patch: Partial<Pick<PosLedgerEntry, "saleDate" | "totalKrw" | "cardKrw" | "cashKrw" | "vatKrw" | "rawOcrText">>
): Promise<PosLedgerEntry> {
  const store = await readStore();
  const row = store.entries.find((e) => e.id === entryId);
  if (!row) throw new Error("장부 항목을 찾을 수 없습니다.");
  if ((row.ownerUserId || row.userId) !== ownerUserId) {
    throw new Error("장부 수정 권한이 없습니다.");
  }
  const now = new Date().toISOString();
  if (patch.saleDate != null) row.saleDate = patch.saleDate;
  if (patch.totalKrw != null) row.totalKrw = patch.totalKrw;
  if (patch.cardKrw != null) row.cardKrw = patch.cardKrw;
  if (patch.cashKrw != null) row.cashKrw = patch.cashKrw;
  if (patch.vatKrw != null) row.vatKrw = patch.vatKrw;
  if (patch.rawOcrText != null) row.rawOcrText = patch.rawOcrText;
  row.updatedAt = now;
  row.logHash = chainLogHash(row.prevLogHash, { id: row.id, patch, updatedAt: now });
  await writeStore(store);
  return row;
}

export async function appendPosLedgerEntry(input: {
  userId: string;
  ownerUserId?: string;
  submittedByUserId?: string;
  submittedByName?: string;
  saleDate: string;
  totalKrw: number;
  cardKrw: number;
  cashKrw: number;
  vatKrw: number;
  rawOcrText: string;
  assetFileId?: string;
}): Promise<PosLedgerEntry> {
  const store = await readStore();
  const now = new Date().toISOString();
  const prevLogHash = lastHash(store);
  const body = {
    userId: input.userId,
    saleDate: input.saleDate,
    totalKrw: input.totalKrw,
    cardKrw: input.cardKrw,
    cashKrw: input.cashKrw,
    vatKrw: input.vatKrw,
    assetFileId: input.assetFileId || null,
    createdAt: now
  };
  const ownerId = input.ownerUserId || input.userId;
  const row: PosLedgerEntry = {
    id: `pos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: ownerId,
    ownerUserId: ownerId,
    submittedByUserId: input.submittedByUserId,
    submittedByName: input.submittedByName,
    saleDate: input.saleDate,
    totalKrw: input.totalKrw,
    cardKrw: input.cardKrw,
    cashKrw: input.cashKrw,
    vatKrw: input.vatKrw,
    rawOcrText: input.rawOcrText,
    assetFileId: input.assetFileId,
    logHash: chainLogHash(prevLogHash, body),
    prevLogHash,
    createdAt: now
  };
  store.entries.push(row);
  await writeStore(store);
  return row;
}
