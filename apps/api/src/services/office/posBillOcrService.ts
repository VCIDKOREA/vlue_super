import { assertGatewayEnvelope } from "../security/securityGateway.js";
import {
  resolvePosRoleContext,
  resolveUserDisplayName,
  resolveUserIdByHandle
} from "./businessStaffRbac.js";
import {
  createStaffLink,
  listStaffForOwner,
  setStaffTransmitEnabled
} from "./businessStaffStore.js";
import { prisma } from "../../db/client.js";
import { notifyOwnerStaffBillSubmitted } from "./posStaffNotify.js";
import {
  appendPosLedgerEntry,
  listPosLedgerForOwner,
  updatePosLedgerEntry
} from "./posLedgerStore.js";

function parseKrwToken(raw: string): number {
  const n = String(raw || "").replace(/[^\d]/g, "");
  return Math.max(0, Math.floor(Number(n) || 0));
}

/** POS 마감 빌지 OCR 텍스트 → 장부 필드 (한국어 키워드 휴리스틱) */
export function parsePosBillOcrText(ocrText: string) {
  const text = String(ocrText || "");
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let saleDate = "";
  const dateMatch = text.match(/(20\d{2})[.\-/년\s]*(\d{1,2})[.\-/월\s]*(\d{1,2})/);
  if (dateMatch) {
    const y = dateMatch[1];
    const m = String(dateMatch[2]).padStart(2, "0");
    const d = String(dateMatch[3]).padStart(2, "0");
    saleDate = `${y}-${m}-${d}`;
  } else {
    saleDate = new Date().toISOString().slice(0, 10);
  }

  const pick = (patterns: RegExp[]) => {
    for (const line of lines) {
      for (const re of patterns) {
        const m = line.match(re);
        if (m?.[1]) return parseKrwToken(m[1]);
      }
    }
    return 0;
  };

  const totalKrw = pick([
    /(?:총\s*매출|합\s*계|총\s*액|total)[^\d]*([\d,]+)/i,
    /(?:매출\s*합계)[^\d]*([\d,]+)/i
  ]);
  const cardKrw = pick([/(?:카드|신용|체크)[^\d]*([\d,]+)/i]);
  const cashKrw = pick([/(?:현금)[^\d]*([\d,]+)/i]);
  const vatKrw = pick([/(?:부가세|VAT)[^\d]*([\d,]+)/i]);

  return {
    saleDate,
    totalKrw: totalKrw || cardKrw + cashKrw,
    cardKrw,
    cashKrw,
    vatKrw,
    confidence: totalKrw > 0 ? "medium" : "low"
  };
}

export async function getPosLedgerRole(userId: string) {
  const ctx = await resolvePosRoleContext(userId);
  return {
    role: ctx.role,
    ownerUserId: ctx.ownerUserId,
    canScanPos: ctx.canScanPos,
    canViewDashboard: ctx.canViewDashboard,
    canModifyLedger: ctx.canModifyLedger,
    wipeLocalAfterSync: ctx.wipeLocalAfterSync
  };
}

export async function invitePosStaff(ownerUserId: string, staffHandle: string) {
  const ctx = await resolvePosRoleContext(ownerUserId);
  if (ctx.role !== "OWNER") throw new Error("사장님(OWNER)만 직원을 등록할 수 있습니다.");
  const staffUserId = await resolveUserIdByHandle(staffHandle);
  if (!staffUserId) throw new Error("직원 계정을 찾을 수 없습니다.");
  if (staffUserId === ownerUserId) throw new Error("본인은 직원으로 등록할 수 없습니다.");
  const link = await createStaffLink(ownerUserId, staffUserId);
  return { link };
}

export async function listPosStaffForOwner(ownerUserId: string) {
  const ctx = await resolvePosRoleContext(ownerUserId);
  if (ctx.role !== "OWNER") throw new Error("사장님(OWNER)만 직원 목록을 조회할 수 있습니다.");
  const links = await listStaffForOwner(ownerUserId);
  const ids = links.map((l) => l.staffUserId);
  const users =
    ids.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, legalName: true, publicHandle: true }
        })
      : [];
  const byId = new Map(users.map((u) => [u.id, u]));
  return {
    staff: links.map((link) => {
      const u = byId.get(link.staffUserId);
      return {
        ...link,
        displayName: u?.legalName || u?.publicHandle || "직원",
        handle: u?.publicHandle || ""
      };
    })
  };
}

export async function updatePosStaffTransmit(
  ownerUserId: string,
  staffUserId: string,
  transmitEnabled: boolean
) {
  const ctx = await resolvePosRoleContext(ownerUserId);
  if (ctx.role !== "OWNER") throw new Error("사장님(OWNER)만 직원 전송 권한을 변경할 수 있습니다.");
  const link = await setStaffTransmitEnabled(ownerUserId, staffUserId, transmitEnabled);
  return { link };
}

export async function ingestPosBillFromOcr(
  userId: string,
  body: { ocrText?: string; assetFileId?: string }
) {
  const ctx = await resolvePosRoleContext(userId);
  if (!ctx.canScanPos || !ctx.ownerUserId) {
    if (ctx.role === "STAFF") {
      throw new Error("사장님이 데이터 전송 권한을 차단했습니다. 관리자에게 문의하세요.");
    }
    throw new Error("POS 빌지 스캔 권한이 없습니다. 사업자 등록 또는 직원 초대가 필요합니다.");
  }

  const env = assertGatewayEnvelope("pos_ledger", "ingest_ocr", userId, body);
  const ocrText = String(env.payload.ocrText || "").trim();
  if (!ocrText) throw new Error("OCR 텍스트가 필요합니다.");

  const parsed = parsePosBillOcrText(ocrText);
  const staffName = ctx.role === "STAFF" ? await resolveUserDisplayName(userId) : undefined;

  const entry = await appendPosLedgerEntry({
    userId: ctx.ownerUserId,
    ownerUserId: ctx.ownerUserId,
    submittedByUserId: ctx.role === "STAFF" ? userId : ctx.ownerUserId,
    submittedByName: staffName,
    saleDate: parsed.saleDate,
    totalKrw: parsed.totalKrw,
    cardKrw: parsed.cardKrw,
    cashKrw: parsed.cashKrw,
    vatKrw: parsed.vatKrw,
    rawOcrText: ocrText.slice(0, 8000),
    assetFileId: ctx.role === "STAFF" ? undefined : String(env.payload.assetFileId || "").trim() || undefined
  });

  if (ctx.role === "STAFF") {
    await notifyOwnerStaffBillSubmitted(ctx.ownerUserId, staffName || "직원", entry.id);
  }

  return {
    parsed,
    entry,
    role: ctx.role,
    vault: "owner_security_vault",
    wipeLocalAfterSync: ctx.wipeLocalAfterSync
  };
}

export async function getPosLedgerDashboard(userId: string) {
  const ctx = await resolvePosRoleContext(userId);
  if (!ctx.canViewDashboard || !ctx.ownerUserId) {
    return {
      canUsePosLedger: ctx.canScanPos,
      role: ctx.role,
      canViewDashboard: false,
      todayTotalKrw: 0,
      monthTotalKrw: 0,
      entries: []
    };
  }

  const entries = await listPosLedgerForOwner(ctx.ownerUserId, 90);
  const today = new Date().toISOString().slice(0, 10);
  const monthPrefix = today.slice(0, 7);

  const todayTotal = entries
    .filter((e) => e.saleDate === today)
    .reduce((s, e) => s + e.totalKrw, 0);
  const monthTotal = entries
    .filter((e) => e.saleDate.startsWith(monthPrefix))
    .reduce((s, e) => s + e.totalKrw, 0);

  return {
    canUsePosLedger: true,
    role: "OWNER" as const,
    canViewDashboard: true,
    canModifyLedger: true,
    vault: "owner_security_vault" as const,
    todayTotalKrw: todayTotal,
    monthTotalKrw: monthTotal,
    entries: entries.slice(0, 30)
  };
}

export async function patchPosLedgerEntry(
  userId: string,
  entryId: string,
  patch: Record<string, unknown>
) {
  const ctx = await resolvePosRoleContext(userId);
  if (!ctx.canModifyLedger || !ctx.ownerUserId) {
    throw new Error("장부 수정은 사장님(OWNER)만 가능합니다.");
  }
  const env = assertGatewayEnvelope("pos_ledger", "patch_entry", userId, { entryId, ...patch });
  const id = String(env.payload.entryId || "");
  if (!id) throw new Error("entryId가 필요합니다.");
  const entry = await updatePosLedgerEntry(id, ctx.ownerUserId, {
    saleDate: env.payload.saleDate != null ? String(env.payload.saleDate) : undefined,
    totalKrw: env.payload.totalKrw != null ? Number(env.payload.totalKrw) : undefined,
    cardKrw: env.payload.cardKrw != null ? Number(env.payload.cardKrw) : undefined,
    cashKrw: env.payload.cashKrw != null ? Number(env.payload.cashKrw) : undefined,
    vatKrw: env.payload.vatKrw != null ? Number(env.payload.vatKrw) : undefined,
    rawOcrText: env.payload.rawOcrText != null ? String(env.payload.rawOcrText) : undefined
  });
  return { entry };
}
