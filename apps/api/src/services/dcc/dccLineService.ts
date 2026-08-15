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

export type DccLineKind = "extension" | "rep_number";

export type DccLineDto = {
  id: string;
  kind: DccLineKind;
  kindLabel: string;
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
};

function text(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

function kindLabel(kind: string): string {
  if (kind === "extension") return "내선번호";
  if (kind === "rep_number") return "대표번호";
  return kind;
}

function displayPhone(e164: string): string {
  const d = String(e164 || "").replace(/^\+82/, "0").replace(/\D/g, "");
  if (d.startsWith("02") && d.length >= 9) {
    return `02-${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
  }
  if (d.length === 8 && d.startsWith("15")) {
    return `${d.slice(0, 4)}-${d.slice(4)}`;
  }
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return e164;
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

function toLineDto(row: {
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
}): DccLineDto {
  const snap = snapObj(row.dccSnapshotJson);
  return {
    id: row.id,
    kind: row.kind === "rep_number" ? "rep_number" : "extension",
    kindLabel: kindLabel(row.kind),
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
    updatedAt: (row.lineShowcaseUpdatedAt || row.updatedAt).toISOString()
  };
}

async function requireOwnedLine(userId: string, cardId: string) {
  const row = await prisma.businessCard.findFirst({
    where: {
      id: cardId,
      userId,
      kind: { in: ["extension", "rep_number"] }
    }
  });
  if (!row) {
    const err = new Error("내선·대표번호를 찾을 수 없습니다.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  return row;
}

export async function listDccLines(userId: string): Promise<{ lines: DccLineDto[] }> {
  const rows = await prisma.businessCard.findMany({
    where: { userId, kind: { in: ["extension", "rep_number"] } },
    orderBy: [{ kind: "asc" }, { createdAt: "asc" }]
  });
  return { lines: rows.map(toLineDto) };
}

export async function getDccLineBundle(userId: string, cardId: string) {
  const row = await requireOwnedLine(userId, cardId);
  const agent = row.activeDccAgentProfileId
    ? await prisma.userDccAgentProfile.findFirst({
        where: { id: row.activeDccAgentProfileId, userId }
      })
    : null;
  const snap = snapObj(row.dccSnapshotJson);
  return {
    line: toLineDto(row),
    agent: agent ? agentDto(agent) : null,
    dcc: slimExportSnapshot(snap) || snap,
    showcase: {
      v: 2 as const,
      editor: row.lineShowcaseStyleJson || null,
      live: row.lineShowcaseLiveStyleJson || null,
      liveSource: row.lineShowcaseLiveSourceJson || null,
      updatedAt: row.lineShowcaseUpdatedAt ? row.lineShowcaseUpdatedAt.toISOString() : null
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
  const prev = snapObj(row.dccSnapshotJson);
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
    line: toLineDto(updated),
    agent: agentDto(agent)
  };
}

export async function putDccLineSnapshot(
  userId: string,
  cardId: string,
  patch: Record<string, unknown>
) {
  const row = await requireOwnedLine(userId, cardId);
  const prev = snapObj(row.dccSnapshotJson);
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
  return { line: toLineDto(updated), dcc: slim };
}

export async function putDccLineShowcase(
  userId: string,
  cardId: string,
  input: { editor?: unknown; live?: unknown; liveSource?: unknown }
) {
  const row = await requireOwnedLine(userId, cardId);
  const now = new Date();
  const data: Prisma.BusinessCardUpdateInput = {
    lineShowcaseUpdatedAt: now
  };
  if (input.editor !== undefined) {
    const obj = input.editor && typeof input.editor === "object" ? (input.editor as Record<string, unknown>) : null;
    if (obj) {
      const slim = slimShowcaseStyleForPersist(stripDataUrlsFromJson(obj)) as Record<string, unknown>;
      slim.v = 2;
      assertShowcaseStyleWithinLimit(slim, "showcase style");
      data.lineShowcaseStyleJson = slim as Prisma.InputJsonValue;
    } else {
      data.lineShowcaseStyleJson = Prisma.JsonNull;
    }
  }
  if (input.live !== undefined) {
    const obj = input.live && typeof input.live === "object" ? (input.live as Record<string, unknown>) : null;
    if (obj) {
      const slim = slimShowcaseStyleForPersist(stripDataUrlsFromJson(obj)) as Record<string, unknown>;
      slim.v = 2;
      assertShowcaseStyleWithinLimit(slim, "showcase style");
      data.lineShowcaseLiveStyleJson = slim as Prisma.InputJsonValue;
    } else {
      data.lineShowcaseLiveStyleJson = Prisma.JsonNull;
    }
  }
  if (input.liveSource !== undefined && input.liveSource && typeof input.liveSource === "object") {
    data.lineShowcaseLiveSourceJson = input.liveSource as Prisma.InputJsonValue;
  }
  const updated = await prisma.businessCard.update({
    where: { id: row.id },
    data
  });
  return {
    ok: true as const,
    updatedAt: now.toISOString(),
    line: toLineDto(updated)
  };
}

export async function getLineShowcasePublicByPhone(rawNumber: string) {
  const { normalizeToE164KR } = await import("../../lib/phoneE164.js");
  const e164 = normalizeToE164KR(String(rawNumber || "").trim());
  if (!e164) return null;
  const card = await prisma.businessCard.findFirst({
    where: { phoneE164: e164, kind: { in: ["extension", "rep_number"] } },
    select: {
      id: true,
      userId: true,
      lineShowcaseLiveStyleJson: true,
      lineShowcaseStyleJson: true,
      lineShowcaseLiveSourceJson: true,
      lineShowcaseUpdatedAt: true
    }
  });
  if (!card) return null;
  const live = card.lineShowcaseLiveStyleJson || card.lineShowcaseStyleJson;
  if (!live) {
    return {
      cardId: card.id,
      userId: card.userId,
      v: 2 as const,
      live: null,
      liveSource: card.lineShowcaseLiveSourceJson || null,
      updatedAt: card.lineShowcaseUpdatedAt ? card.lineShowcaseUpdatedAt.toISOString() : null
    };
  }
  return {
    cardId: card.id,
    userId: card.userId,
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
