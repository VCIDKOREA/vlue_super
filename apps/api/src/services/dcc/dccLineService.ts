import { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { slimExportSnapshot } from "../../lib/digitalCardSlim.js";
import { isDataUrl, isHttpMediaUrl, mergeExportSnapshotMedia, stripDataUrlsFromJson } from "../../lib/mediaUrlGuard.js";
import {
  assertShowcaseStyleWithinLimit,
  slimShowcaseStyleForPersist,
  slimShowcaseStyleForPublic
} from "../../lib/slimShowcaseStyle.js";
import { defaultAgentLabel, normalizePhotoFocus } from "./dccAgentProfileService.js";

export type DccLineKind = "mobile" | "extension" | "rep_number";

export type DccLineDto = {
  id: string;
  kind: DccLineKind;
  kindLabel: string;
  isCertified: boolean;
  phoneE164: string;
  displayPhone: string;
  displayName: string;
  jobTitle: string;
  department: string;
  photoUrl: string | null;
  photoFocus: string;
  agentId: string | null;
  hasShowcase: boolean;
  hasDcc: boolean;
  updatedAt: string;
  billingStatus?: string;
  graceEndsAt?: string | null;
};

function text(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

function kindLabel(kind: string, isCertified: boolean): string {
  if (isCertified) return "인증번호";
  if (kind === "mobile") return "인증번호";
  if (kind === "extension") return "내선번호";
  if (kind === "rep_number") return "대표번호";
  return kind;
}

function displayPhone(e164: string): string {
  const raw = String(e164 || "").trim();
  let rest = raw.startsWith("+82") ? raw.slice(3) : raw.replace(/\D/g, "").replace(/^82/, "");
  if (rest.startsWith("0") && rest.length === 9 && /^1[3-9]\d{6}$/.test(rest.slice(1))) {
    rest = rest.slice(1);
  }
  if (/^1[3-9]\d{6}$/.test(rest)) {
    return `${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  if (rest.startsWith("10") && rest.length === 10) {
    return `0${rest.slice(0, 2)}-${rest.slice(2, 6)}-${rest.slice(6)}`;
  }
  if (rest.startsWith("2")) {
    const d = `0${rest}`;
    if (d.length >= 9) return `02-${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
  }
  const d = rest.startsWith("0") ? rest : `0${rest}`;
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return raw || e164;
}

const LINE_KINDS = ["mobile", "extension", "rep_number"] as const;
const KIND_RANK: Record<string, number> = { mobile: 0, extension: 1, rep_number: 2 };

function showcaseHasContent(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const s = raw as Record<string, unknown>;
  const bgm = snapObj(s.bgm);
  if (bgm.mode && bgm.mode !== "none") return true;
  if (Array.isArray(bgm.playlist) && bgm.playlist.length > 0) return true;
  if (Array.isArray(s.pages) && s.pages.length > 0) return true;
  const gallery = snapObj(s.gallery);
  if (Array.isArray(gallery.photos) && gallery.photos.length > 0) return true;
  const commercial = snapObj(s.commercial);
  const outlinks = snapObj(commercial.outlinks);
  if (Object.values(outlinks).some((v) => String(v || "").trim())) return true;
  if (Array.isArray(commercial.links) && commercial.links.length > 0) return true;
  const rich = snapObj(s.richCustom);
  if (String(rich.bodyText || "").trim()) return true;
  if (Array.isArray(s.tags) && s.tags.length > 0) return true;
  return false;
}

async function loadMasterExport(userId: string): Promise<Record<string, unknown>> {
  const card = await prisma.digitalCard.findUnique({
    where: { userId },
    select: { exportSnapshotJson: true, photoUrl: true, logoUrl: true }
  });
  const snap = snapObj(card?.exportSnapshotJson);
  if (card?.photoUrl && !httpPhoto(snap.photoUrl)) snap.photoUrl = card.photoUrl;
  if (card?.logoUrl && !httpPhoto(snap.logoUrl)) snap.logoUrl = card.logoUrl;
  return snap;
}

async function isCertifiedRow(userId: string, phoneE164: string) {
  const { phone } = await userCertifiedPhone(userId);
  return Boolean(phone) && phoneE164 === phone;
}

async function lineDccBase(userId: string, row: { phoneE164: string; dccSnapshotJson: unknown }) {
  const lineSnap = snapObj(row.dccSnapshotJson);
  if (await isCertifiedRow(userId, row.phoneE164)) {
    return mergeExportSnapshotMedia(await loadMasterExport(userId), lineSnap);
  }
  return lineSnap;
}

async function loadMasterShowcase(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      showcaseStyleJson: true,
      showcaseLiveStyleJson: true,
      showcaseLiveSourceJson: true,
      showcaseStyleUpdatedAt: true
    }
  });
}

function snapObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

function agentDto(agent: {
  id: string;
  label: string;
  displayName: string;
  title: string;
  department: string;
  photoUrl: string | null;
  photoFocus: string;
  isActive: boolean;
  sortOrder: number;
  updatedAt: Date;
}) {
  return {
    id: agent.id,
    label: agent.label || defaultAgentLabel(agent.displayName, agent.title),
    displayName: agent.displayName,
    title: agent.title,
    department: agent.department,
    photoUrl: agent.photoUrl,
    photoFocus: normalizePhotoFocus(agent.photoFocus),
    isActive: agent.isActive,
    sortOrder: agent.sortOrder,
    updatedAt: agent.updatedAt.toISOString()
  };
}

function httpPhoto(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s || isDataUrl(s)) return null;
  if (isHttpMediaUrl(s) || s.startsWith("/")) return s;
  return null;
}

function toLineDto(
  row: {
    id: string;
    kind: string;
    phoneE164: string;
    displayName: string | null;
    jobTitle: string | null;
    dccSnapshotJson: unknown;
    lineShowcaseLiveStyleJson: unknown;
    lineShowcaseStyleJson: unknown;
    activeDccAgentProfileId: string | null;
    updatedAt: Date;
    lineShowcaseUpdatedAt: Date | null;
  },
  certifiedPhone = ""
): DccLineDto {
  const snap = snapObj(row.dccSnapshotJson);
  const isCertified = Boolean(certifiedPhone) && row.phoneE164 === certifiedPhone;
  return {
    id: row.id,
    kind: row.kind === "rep_number" ? "rep_number" : row.kind === "mobile" ? "mobile" : "extension",
    kindLabel: kindLabel(row.kind, isCertified),
    isCertified,
    phoneE164: row.phoneE164,
    displayPhone: displayPhone(row.phoneE164),
    displayName: text(row.displayName || snap.name || snap.displayName, 120),
    jobTitle: text(row.jobTitle || snap.title, 120),
    department: text(snap.department, 120),
    photoUrl: httpPhoto(snap.photoUrl),
    photoFocus: normalizePhotoFocus(snap.photoFocus),
    agentId: row.activeDccAgentProfileId,
    hasShowcase: Boolean(row.lineShowcaseLiveStyleJson || row.lineShowcaseStyleJson),
    hasDcc: Boolean(httpPhoto(snap.photoUrl) || snap.name || snap.title),
    updatedAt: (row.lineShowcaseUpdatedAt || row.updatedAt).toISOString(),
    billingStatus: "none",
    graceEndsAt: null
  };
}

async function requireOwnedLine(userId: string, cardId: string) {
  const { phone } = await userCertifiedPhone(userId);
  const row = await prisma.businessCard.findFirst({
    where: {
      id: cardId,
      userId,
      OR: [{ kind: { in: [...LINE_KINDS] } }, ...(phone ? [{ phoneE164: phone }] : [])]
    }
  });
  if (!row) {
    const err = new Error("번호를 찾을 수 없습니다.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  return row;
}

async function toOwnedLineDto(userId: string, row: Parameters<typeof toLineDto>[0]) {
  const { phone } = await userCertifiedPhone(userId);
  return toLineDto(row, phone);
}

async function userCertifiedPhone(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phoneE164: true, legalName: true }
  });
  return {
    phone: String(user?.phoneE164 || "").trim(),
    legalName: String(user?.legalName || "").trim()
  };
}

/** 계정 본인인증 휴대폰(VLUE 인증번호)을 회선 목록에 항상 넣는다. */
async function ensureCertifiedLine(userId: string) {
  const { phone, legalName } = await userCertifiedPhone(userId);
  if (!phone) return null;
  const owned = await prisma.businessCard.findFirst({
    where: { userId, phoneE164: phone }
  });
  if (owned) return owned;
  const taken = await prisma.businessCard.findFirst({
    where: { phoneE164: phone },
    select: { userId: true }
  });
  if (taken && taken.userId !== userId) return null;
  try {
    return await prisma.businessCard.create({
      data: {
        userId,
        kind: "mobile",
        phoneE164: phone,
        displayName: legalName,
        isPremiumLine: false,
        verificationStatus: "approved"
      }
    });
  } catch {
    return prisma.businessCard.findFirst({ where: { userId, phoneE164: phone } });
  }
}

export async function listDccLines(userId: string): Promise<{ lines: DccLineDto[] }> {
  const certified = await ensureCertifiedLine(userId);
  const certifiedPhone = certified?.phoneE164 || (await userCertifiedPhone(userId)).phone;
  const rows = await prisma.businessCard.findMany({
    where: {
      userId,
      OR: [{ kind: { in: [...LINE_KINDS] } }, ...(certifiedPhone ? [{ phoneE164: certifiedPhone }] : [])]
    }
  });
  if (certified && !rows.some((row) => row.id === certified.id)) {
    rows.unshift(certified);
  }
  rows.sort((a, b) => {
    const aCert = certifiedPhone && a.phoneE164 === certifiedPhone ? 0 : 1;
    const bCert = certifiedPhone && b.phoneE164 === certifiedPhone ? 0 : 1;
    return aCert - bCert || (KIND_RANK[a.kind] ?? 9) - (KIND_RANK[b.kind] ?? 9) || a.createdAt.getTime() - b.createdAt.getTime();
  });
  const subs = await prisma.lineSubscription.findMany({
    where: { userId, businessCardId: { in: rows.map((r) => r.id) } },
    select: { businessCardId: true, status: true, graceEndsAt: true }
  });
  const subByCard = new Map(subs.map((s) => [s.businessCardId, s]));
  return {
    lines: rows.map((row) => {
      const dto = toLineDto(row, certifiedPhone);
      const sub = subByCard.get(row.id);
      if (sub) {
        dto.billingStatus = sub.status;
        dto.graceEndsAt = sub.graceEndsAt?.toISOString() || null;
      }
      return dto;
    })
  };
}

export async function getDccLineBundle(userId: string, cardId: string) {
  const row = await requireOwnedLine(userId, cardId);
  const agent = row.activeDccAgentProfileId
    ? await prisma.userDccAgentProfile.findFirst({
        where: { id: row.activeDccAgentProfileId, userId }
      })
    : null;
  const certified = await isCertifiedRow(userId, row.phoneE164);
  const snap = await lineDccBase(userId, row);
  const lineEditor = row.lineShowcaseStyleJson;
  const lineLive = row.lineShowcaseLiveStyleJson;
  const lineHas = showcaseHasContent(lineEditor) || showcaseHasContent(lineLive);
  /* 인증번호만 대표계정 쇼케이스를 쓴다. 내선·대표번호는 비어 있으면 빈 쇼케이스. */
  const master = !lineHas && certified ? await loadMasterShowcase(userId) : null;
  const editor = lineHas
    ? lineEditor
    : certified
      ? master?.showcaseStyleJson || master?.showcaseLiveStyleJson || null
      : null;
  const live = lineHas
    ? lineLive || lineEditor
    : certified
      ? master?.showcaseLiveStyleJson || master?.showcaseStyleJson || null
      : null;
  const updatedAt = lineHas ? row.lineShowcaseUpdatedAt : certified ? master?.showcaseStyleUpdatedAt : null;
  return {
    line: await toOwnedLineDto(userId, row),
    agent: agent ? agentDto(agent) : null,
    dcc: slimExportSnapshot(snap) || snap,
    showcase: {
      v: 2 as const,
      editor: editor || null,
      live: live || null,
      liveSource: (lineHas ? row.lineShowcaseLiveSourceJson : master?.showcaseLiveSourceJson) || null,
      updatedAt: updatedAt ? updatedAt.toISOString() : null
    }
  };
}

export async function assignAgentToLine(userId: string, cardId: string, agentId: string) {
  const row = await requireOwnedLine(userId, cardId);
  const agent = await prisma.userDccAgentProfile.findFirst({ where: { id: agentId, userId } });
  if (!agent) {
    const err = new Error("담당자 프로필을 찾을 수 없습니다.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const prev = await lineDccBase(userId, row);
  const merged = mergeExportSnapshotMedia(prev, {
    name: agent.displayName,
    displayName: agent.displayName,
    title: agent.title,
    department: agent.department
  });
  const slim = slimExportSnapshot(merged) || merged;
  const prevPj = snapObj(row.profileJson);
  const updated = await prisma.businessCard.update({
    where: { id: row.id },
    data: {
      displayName: agent.displayName,
      jobTitle: agent.title || null,
      activeDccAgentProfileId: agent.id,
      dccSnapshotJson: slim as Prisma.InputJsonValue,
      profileJson: {
        ...prevPj,
        title: agent.title,
        department: agent.department
      } as Prisma.InputJsonValue
    }
  });
  return {
    line: await toOwnedLineDto(userId, updated),
    agent: agentDto(agent)
  };
}

export async function putDccLineSnapshot(
  userId: string,
  cardId: string,
  patch: Record<string, unknown>
) {
  const row = await requireOwnedLine(userId, cardId);
  const prev = await lineDccBase(userId, row);
  if (patch.photoUrl != null && isDataUrl(patch.photoUrl)) {
    const err = new Error("프로필 사진은 https URL만 저장할 수 있습니다.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  const merged = mergeExportSnapshotMedia(prev, {
    ...patch,
    photoFocus: normalizePhotoFocus(patch.photoFocus || prev.photoFocus)
  });
  const slim = slimExportSnapshot(merged) || merged;
  const photoUrl = httpPhoto(slim.photoUrl);
  const prevPj = snapObj(row.profileJson);
  const updated = await prisma.businessCard.update({
    where: { id: row.id },
    data: {
      dccSnapshotJson: slim as Prisma.InputJsonValue,
      profileJson: {
        ...prevPj,
        photoUrl,
        image_url: photoUrl,
        photoFocus: slim.photoFocus || prevPj.photoFocus
      } as Prisma.InputJsonValue
    }
  });
  return { line: await toOwnedLineDto(userId, updated), dcc: slim };
}

export async function putDccLineShowcase(
  userId: string,
  cardId: string,
  input: { editor?: unknown; live?: unknown; liveSource?: unknown }
) {
  const row = await requireOwnedLine(userId, cardId);
  const certified = await isCertifiedRow(userId, row.phoneE164);
  const existingHas =
    showcaseHasContent(row.lineShowcaseStyleJson) || showcaseHasContent(row.lineShowcaseLiveStyleJson);
  const now = new Date();
  const data: Prisma.BusinessCardUpdateInput = {};
  if (input.editor !== undefined) {
    const obj = input.editor && typeof input.editor === "object" ? (input.editor as Record<string, unknown>) : null;
    if (obj && showcaseHasContent(obj)) {
      const slim = slimShowcaseStyleForPersist(stripDataUrlsFromJson(obj)) as Record<string, unknown>;
      slim.v = 2;
      assertShowcaseStyleWithinLimit(slim, "showcase style");
      data.lineShowcaseStyleJson = slim as Prisma.InputJsonValue;
    } else if (!obj && !existingHas && !certified) {
      data.lineShowcaseStyleJson = Prisma.JsonNull;
    }
  }
  if (input.live !== undefined) {
    const obj = input.live && typeof input.live === "object" ? (input.live as Record<string, unknown>) : null;
    if (obj && showcaseHasContent(obj)) {
      const slim = slimShowcaseStyleForPersist(stripDataUrlsFromJson(obj)) as Record<string, unknown>;
      slim.v = 2;
      assertShowcaseStyleWithinLimit(slim, "showcase style");
      data.lineShowcaseLiveStyleJson = slim as Prisma.InputJsonValue;
    } else if (!obj && !existingHas && !certified) {
      data.lineShowcaseLiveStyleJson = Prisma.JsonNull;
    }
  }
  if (input.liveSource !== undefined && input.liveSource && typeof input.liveSource === "object") {
    data.lineShowcaseLiveSourceJson = input.liveSource as Prisma.InputJsonValue;
  }
  if (Object.keys(data).length === 0) {
    return {
      ok: true as const,
      updatedAt: row.lineShowcaseUpdatedAt ? row.lineShowcaseUpdatedAt.toISOString() : now.toISOString(),
      line: await toOwnedLineDto(userId, row),
      skippedEmpty: true as const
    };
  }
  data.lineShowcaseUpdatedAt = now;
  const updated = await prisma.businessCard.update({
    where: { id: row.id },
    data
  });
  return {
    ok: true as const,
    updatedAt: now.toISOString(),
    line: await toOwnedLineDto(userId, updated)
  };
}

export async function getLineShowcasePublicByPhone(rawNumber: string) {
  const { normalizeToE164KR } = await import("../../lib/phoneE164.js");
  const e164 = normalizeToE164KR(String(rawNumber || "").trim());
  if (!e164) return null;
  const card = await prisma.businessCard.findFirst({
    where: { phoneE164: e164, kind: { in: [...LINE_KINDS] } },
    select: {
      id: true,
      userId: true,
      phoneE164: true,
      lineShowcaseLiveStyleJson: true,
      lineShowcaseStyleJson: true,
      lineShowcaseLiveSourceJson: true,
      lineShowcaseUpdatedAt: true,
      user: { select: { phoneE164: true } }
    }
  });
  if (!card) return null;
  const certified = Boolean(card.user?.phoneE164) && card.phoneE164 === card.user.phoneE164;
  const live = card.lineShowcaseLiveStyleJson || card.lineShowcaseStyleJson;
  if (certified && !showcaseHasContent(live)) return null;
  if (!showcaseHasContent(live)) {
    return {
      cardId: card.id,
      userId: card.userId,
      isCertified: false,
      v: 2 as const,
      live: null,
      liveSource: null,
      updatedAt: null
    };
  }
  return {
    cardId: card.id,
    userId: card.userId,
    isCertified: certified,
    v: 2 as const,
    live: slimShowcaseStyleForPublic(live),
    liveSource: card.lineShowcaseLiveSourceJson || null,
    updatedAt: card.lineShowcaseUpdatedAt ? card.lineShowcaseUpdatedAt.toISOString() : null
  };
}

export async function syncAssignedLinesForAgent(
  userId: string,
  agent: { id: string; displayName: string; title: string; department: string }
) {
  const lines = await prisma.businessCard.findMany({
    where: { userId, activeDccAgentProfileId: agent.id }
  });
  for (const row of lines) {
    await assignAgentToLine(userId, row.id, agent.id);
  }
}

export { defaultAgentLabel };
