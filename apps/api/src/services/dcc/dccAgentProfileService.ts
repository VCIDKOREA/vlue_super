import { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { extractDigitalCardSlimMeta, slimExportSnapshot } from "../../lib/digitalCardSlim.js";
import { isDataUrl, isHttpMediaUrl, mergeExportSnapshotMedia } from "../../lib/mediaUrlGuard.js";

export const DCC_AGENT_MAX_COUNT = 20;

export type DccAgentInput = {
  label?: string;
  displayName?: string;
  name?: string;
  title?: string;
  department?: string;
  photoUrl?: string | null;
  photoFocus?: string;
};

export type DccAgentDto = {
  id: string;
  label: string;
  displayName: string;
  title: string;
  department: string;
  photoUrl: string | null;
  photoFocus: string;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
};

const PHOTO_FOCUS = new Set(["top", "center", "bottom"]);

function text(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

export function normalizePhotoFocus(raw: unknown): string {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (v === "middle") return "center";
  return PHOTO_FOCUS.has(v) ? v : "center";
}

export function defaultAgentLabel(displayName: string, title: string): string {
  const name = text(displayName, 120);
  const job = text(title, 120);
  if (name && job) return `${name} · ${job}`.slice(0, 80);
  return (name || job || "담당자").slice(0, 80);
}

export function normalizeDccAgentInput(body: DccAgentInput): {
  label: string;
  displayName: string;
  title: string;
  department: string;
  photoUrl: string | null;
  photoFocus: string;
} {
  const displayName = text(body.displayName || body.name, 120);
  const title = text(body.title, 120);
  const department = text(body.department, 120);
  const labelRaw = text(body.label, 80);
  const photoRaw = String(body.photoUrl ?? "").trim();
  if (photoRaw && isDataUrl(photoRaw)) {
    const err = new Error("프로필 사진은 https URL만 저장할 수 있습니다.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  const photoUrl = photoRaw && (isHttpMediaUrl(photoRaw) || photoRaw.startsWith("/")) ? photoRaw : null;
  return {
    displayName,
    title,
    department,
    label: labelRaw || defaultAgentLabel(displayName, title),
    photoUrl,
    photoFocus: normalizePhotoFocus(body.photoFocus)
  };
}

function toDto(row: {
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
}): DccAgentDto {
  return {
    id: row.id,
    label: row.label || defaultAgentLabel(row.displayName, row.title),
    displayName: row.displayName,
    title: row.title,
    department: row.department,
    photoUrl: row.photoUrl,
    photoFocus: normalizePhotoFocus(row.photoFocus),
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt.toISOString()
  };
}

function tableMissing(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e || "");
  return /user_dcc_agent_profiles|does not exist|P2021|P2010/i.test(msg);
}

async function seedFromDigitalCard(userId: string) {
  const [user, card] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { legalName: true }
    }),
    prisma.digitalCard.findUnique({
      where: { userId },
      select: {
        displayName: true,
        titleSnapshot: true,
        departmentSnapshot: true,
        photoUrl: true,
        exportSnapshotJson: true
      }
    })
  ]);
  const snap =
    card?.exportSnapshotJson && typeof card.exportSnapshotJson === "object"
      ? (card.exportSnapshotJson as Record<string, unknown>)
      : {};
  const displayName = text(
    card?.displayName || snap.name || snap.displayName || user?.legalName,
    120
  );
  if (!displayName) return null;
  const title = text(card?.titleSnapshot || snap.title, 120);
  const department = text(card?.departmentSnapshot || snap.department, 120);
  const photoUrl = text(card?.photoUrl || snap.photoUrl, 1024) || null;
  const photoFocus = normalizePhotoFocus(snap.photoFocus);
  const created = await prisma.userDccAgentProfile.create({
    data: {
      userId,
      label: defaultAgentLabel(displayName, title),
      displayName,
      title,
      department,
      photoUrl: photoUrl && (isHttpMediaUrl(photoUrl) || photoUrl.startsWith("/")) ? photoUrl : null,
      photoFocus,
      isActive: true,
      sortOrder: 0
    }
  });
  return created;
}

export async function listDccAgentProfiles(userId: string): Promise<{
  profiles: DccAgentDto[];
  activeId: string | null;
  maxCount: number;
}> {
  try {
    let rows = await prisma.userDccAgentProfile.findMany({
      where: { userId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });
    if (rows.length === 0) {
      const seeded = await seedFromDigitalCard(userId);
      if (seeded) rows = [seeded];
    }
    const profiles = rows.map(toDto);
    return {
      profiles,
      activeId: profiles.find((p) => p.isActive)?.id || profiles[0]?.id || null,
      maxCount: DCC_AGENT_MAX_COUNT
    };
  } catch (e) {
    if (tableMissing(e)) {
      const err = new Error(
        "담당자 프로필 테이블이 아직 준비되지 않았습니다. DB 마이그레이션 후 API를 재시작해 주세요."
      );
      (err as Error & { status?: number }).status = 503;
      throw err;
    }
    throw e;
  }
}

export async function createDccAgentProfile(userId: string, body: DccAgentInput): Promise<DccAgentDto> {
  const input = normalizeDccAgentInput(body);
  if (!input.displayName) {
    const err = new Error("담당자 이름을 입력해 주세요.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  const count = await prisma.userDccAgentProfile.count({ where: { userId } });
  if (count >= DCC_AGENT_MAX_COUNT) {
    const err = new Error(`담당자는 최대 ${DCC_AGENT_MAX_COUNT}명까지 등록할 수 있습니다.`);
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  const makeFirstActive = count === 0;
  const created = await prisma.userDccAgentProfile.create({
    data: {
      userId,
      ...input,
      isActive: makeFirstActive,
      sortOrder: count
    }
  });
  if (makeFirstActive) {
    await applyAgentToLiveDcc(userId, created);
  }
  return toDto(created);
}

export async function updateDccAgentProfile(
  userId: string,
  id: string,
  body: DccAgentInput
): Promise<DccAgentDto> {
  const existing = await prisma.userDccAgentProfile.findFirst({ where: { id, userId } });
  if (!existing) {
    const err = new Error("담당자 프로필을 찾을 수 없습니다.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const input = normalizeDccAgentInput({
    label: body.label ?? existing.label,
    displayName: body.displayName ?? body.name ?? existing.displayName,
    title: body.title ?? existing.title,
    department: body.department ?? existing.department,
    photoUrl: body.photoUrl === undefined ? existing.photoUrl : body.photoUrl,
    photoFocus: body.photoFocus ?? existing.photoFocus
  });
  if (!input.displayName) {
    const err = new Error("담당자 이름을 입력해 주세요.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  const updated = await prisma.userDccAgentProfile.update({
    where: { id },
    data: input
  });
  if (updated.isActive) {
    await applyAgentToLiveDcc(userId, updated);
  }
  return toDto(updated);
}

export async function deleteDccAgentProfile(userId: string, id: string): Promise<{ ok: true; activeId: string | null }> {
  const existing = await prisma.userDccAgentProfile.findFirst({ where: { id, userId } });
  if (!existing) {
    const err = new Error("담당자 프로필을 찾을 수 없습니다.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const remaining = await prisma.userDccAgentProfile.count({ where: { userId } });
  if (remaining <= 1) {
    const err = new Error("최소 1명의 담당자는 남겨 두어야 합니다.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  await prisma.userDccAgentProfile.delete({ where: { id } });
  if (existing.isActive) {
    const next = await prisma.userDccAgentProfile.findFirst({
      where: { userId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });
    if (next) {
      await prisma.userDccAgentProfile.update({
        where: { id: next.id },
        data: { isActive: true }
      });
      await applyAgentToLiveDcc(userId, next);
      return { ok: true, activeId: next.id };
    }
  }
  return { ok: true, activeId: null };
}

export async function activateDccAgentProfile(userId: string, id: string): Promise<DccAgentDto> {
  const target = await prisma.userDccAgentProfile.findFirst({ where: { id, userId } });
  if (!target) {
    const err = new Error("담당자 프로필을 찾을 수 없습니다.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  await prisma.$transaction(async (tx) => {
    await tx.userDccAgentProfile.updateMany({
      where: { userId, isActive: true, NOT: { id } },
      data: { isActive: false }
    });
    await tx.userDccAgentProfile.update({
      where: { id },
      data: { isActive: true }
    });
  });
  const active = { ...target, isActive: true };
  await applyAgentToLiveDcc(userId, active);
  return toDto(active);
}

async function applyAgentToLiveDcc(
  userId: string,
  agent: {
    displayName: string;
    title: string;
    department: string;
    photoUrl: string | null;
    photoFocus: string;
  }
) {
  const card = await prisma.digitalCard.findUnique({
    where: { userId },
    select: { id: true, exportSnapshotJson: true }
  });
  const prevSnap =
    card?.exportSnapshotJson && typeof card.exportSnapshotJson === "object"
      ? (card.exportSnapshotJson as Record<string, unknown>)
      : {};
  const patch: Record<string, unknown> = {
    name: agent.displayName,
    displayName: agent.displayName,
    title: agent.title,
    department: agent.department,
    photoUrl: agent.photoUrl || "",
    photoFocus: agent.photoFocus,
    noProfilePhoto: !agent.photoUrl
  };
  const merged = mergeExportSnapshotMedia(prevSnap, patch);
  const slim = slimExportSnapshot(merged) || {};
  const meta = extractDigitalCardSlimMeta(slim);

  if (!card) {
    const sub = await prisma.userSubscription.findFirst({
      where: { userId, status: "active" },
      orderBy: { createdAt: "desc" },
      select: { id: true }
    });
    await prisma.digitalCard.create({
      data: {
        userId,
        membershipTierSnapshot: sub ? "paid" : "free",
        exportSnapshotJson: slim as Prisma.InputJsonValue,
        displayName: meta.displayName,
        titleSnapshot: meta.title,
        departmentSnapshot: meta.department,
        photoUrl: meta.photoUrl
      }
    });
  } else {
    await prisma.digitalCard.update({
      where: { userId },
      data: {
        exportSnapshotJson: slim as Prisma.InputJsonValue,
        displayName: meta.displayName,
        titleSnapshot: meta.title,
        departmentSnapshot: meta.department,
        photoUrl: meta.photoUrl
      }
    });
  }

  const owned = await prisma.businessCard.findMany({
    where: { userId },
    select: { id: true, profileJson: true }
  });
  for (const row of owned) {
    const prev = row.profileJson && typeof row.profileJson === "object" ? (row.profileJson as Record<string, unknown>) : {};
    await prisma.businessCard.update({
      where: { id: row.id },
      data: {
        displayName: agent.displayName,
        jobTitle: agent.title || null,
        profileJson: {
          ...prev,
          department: agent.department,
          title: agent.title,
          photoUrl: agent.photoUrl,
          image_url: agent.photoUrl,
          photoFocus: agent.photoFocus
        } as Prisma.InputJsonValue
      }
    });
  }
}
