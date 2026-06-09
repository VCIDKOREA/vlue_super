import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PaidBillingCycle } from "./membershipBmConstants.js";
import { quoteBroadcastRefund } from "./broadcastRefundPolicy.js";

export type BroadcastLineStatus = "draft" | "pending_payment" | "active" | "paused" | "cancelled";

export type BroadcastLineRecord = {
  userId: string;
  phoneE164: string;
  phoneVerified: boolean;
  broadcastEnabled: boolean;
  status: BroadcastLineStatus;
  billingCycle: PaidBillingCycle;
  amountKrw?: number;
  paidAt?: string;
  merchantUid?: string;
  refundPolicyAgreedAt?: string;
  otpSentAt?: string;
  verifiedAt?: string;
  pausedAt?: string;
  pauseRefundAgreedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type Store = { lines: BroadcastLineRecord[] };

function storePath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../../../data/broadcast_lines.json");
}

async function readStore(): Promise<Store> {
  try {
    const text = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(text) as Store;
    return { lines: Array.isArray(parsed.lines) ? parsed.lines : [] };
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return { lines: [] };
    throw err;
  }
}

async function writeStore(store: Store) {
  const p = storePath();
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function normalizePhone(raw: string): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) throw new Error("추가 발신번호를 입력해 주세요.");
  return trimmed;
}

function findActiveRow(store: Store, userId: string): BroadcastLineRecord | undefined {
  return store.lines.find((l) => l.userId === userId && l.status !== "cancelled");
}

export async function getBroadcastLineForUser(userId: string): Promise<BroadcastLineRecord | null> {
  const store = await readStore();
  return findActiveRow(store, userId) || null;
}

export async function prepareBroadcastCheckout(
  userId: string,
  phoneE164: string,
  billingCycle: PaidBillingCycle = "monthly"
): Promise<BroadcastLineRecord> {
  const normalized = normalizePhone(phoneE164);
  const store = await readStore();
  const now = new Date().toISOString();
  const existing = findActiveRow(store, userId);

  if (existing?.status === "active" && existing.phoneVerified) {
    throw new Error("이미 등록·결제가 완료된 발신번호가 있습니다. 수정 메뉴를 이용해 주세요.");
  }

  const row: BroadcastLineRecord = {
    userId,
    phoneE164: normalized,
    phoneVerified: false,
    broadcastEnabled: true,
    status: "pending_payment",
    billingCycle,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  if (existing) {
    Object.assign(existing, row);
    await writeStore(store);
    return existing;
  }

  store.lines.push(row);
  await writeStore(store);
  return row;
}

export async function completeBroadcastCheckout(input: {
  userId: string;
  phoneE164: string;
  amountKrw: number;
  billingCycle: PaidBillingCycle;
  merchantUid: string;
  agreeRefundPolicy: boolean;
}): Promise<BroadcastLineRecord> {
  if (!input.agreeRefundPolicy) {
    throw new Error("환불 정책에 동의해 주세요.");
  }

  const normalized = normalizePhone(input.phoneE164);
  const store = await readStore();
  const now = new Date().toISOString();
  const existing = findActiveRow(store, input.userId);

  const row: BroadcastLineRecord = {
    userId: input.userId,
    phoneE164: normalized,
    phoneVerified: true,
    broadcastEnabled: true,
    status: "active",
    billingCycle: input.billingCycle,
    amountKrw: Math.floor(input.amountKrw),
    paidAt: now,
    merchantUid: input.merchantUid,
    refundPolicyAgreedAt: now,
    verifiedAt: now,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  if (existing) {
    Object.assign(existing, row);
    await writeStore(store);
    return existing;
  }

  store.lines.push(row);
  await writeStore(store);
  return row;
}

/** @deprecated 결제 플로우로 대체 — OTP 없이 결제 후 확정 */
export async function registerBroadcastPhone(userId: string, phoneE164: string): Promise<BroadcastLineRecord> {
  return prepareBroadcastCheckout(userId, phoneE164);
}

/** @deprecated 결제 플로우로 대체 */
export async function verifyBroadcastPhone(userId: string, _otp: string): Promise<BroadcastLineRecord> {
  const line = await getBroadcastLineForUser(userId);
  if (!line) throw new Error("등록된 발신번호가 없습니다.");
  if (line.status !== "active" || !line.paidAt) {
    throw new Error("결제 완료 후 자동으로 번호가 확정됩니다.");
  }
  return line;
}

export async function updateBroadcastPhone(userId: string, phoneE164: string): Promise<BroadcastLineRecord> {
  const normalized = normalizePhone(phoneE164);
  const store = await readStore();
  const row = findActiveRow(store, userId);
  if (!row || row.status !== "active") {
    throw new Error("활성화된 발신번호가 없습니다.");
  }
  const now = new Date().toISOString();
  row.phoneE164 = normalized;
  row.updatedAt = now;
  await writeStore(store);
  return row;
}

export async function setBroadcastEnabled(userId: string, enabled: boolean): Promise<BroadcastLineRecord> {
  const store = await readStore();
  const row = findActiveRow(store, userId);
  if (!row || row.status !== "active") {
    throw new Error("활성화된 발신번호가 없습니다.");
  }
  row.broadcastEnabled = Boolean(enabled);
  row.updatedAt = new Date().toISOString();
  await writeStore(store);
  return row;
}

export async function pauseBroadcastLine(
  userId: string,
  agreeRefundPolicy: boolean
): Promise<{ line: BroadcastLineRecord; refund: ReturnType<typeof quoteBroadcastRefund> }> {
  if (!agreeRefundPolicy) {
    throw new Error("환불 정책에 동의해 주세요.");
  }
  const store = await readStore();
  const row = findActiveRow(store, userId);
  if (!row || row.status !== "active") {
    throw new Error("정지할 활성 옵션이 없습니다.");
  }
  const now = new Date().toISOString();
  row.status = "paused";
  row.broadcastEnabled = false;
  row.pausedAt = now;
  row.pauseRefundAgreedAt = now;
  row.updatedAt = now;
  await writeStore(store);
  const refund = quoteBroadcastRefund(row.paidAt, row.amountKrw ?? 0);
  return { line: row, refund };
}

export async function deleteBroadcastLine(userId: string): Promise<void> {
  const store = await readStore();
  const row = findActiveRow(store, userId);
  if (!row) throw new Error("삭제할 발신번호가 없습니다.");
  row.status = "cancelled";
  row.broadcastEnabled = false;
  row.phoneVerified = false;
  row.updatedAt = new Date().toISOString();
  await writeStore(store);
}
