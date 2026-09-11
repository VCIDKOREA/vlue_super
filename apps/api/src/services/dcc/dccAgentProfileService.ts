import { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { isDataUrl, isHttpMediaUrl } from "../../lib/mediaUrlGuard.js";

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
  isRepresentative: boolean;
  sortOrder: number;
  updatedAt: string;
  hasDcc: boolean;
  hasShowcase: boolean;
  assignedLineIds: string[];
  assignedPhones: string[];
  /** 이 프로필로 소통할 상대 전화번호(표시용) */
  contactPhones: string[];
};

const PHOTO_FOCUS = new Set(["top", "center", "bottom"]);

let columnsReady = false;

export async function ensureMultiDccProfileBundleColumns() {
  if (columnsReady) return;
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "user_dcc_agent_profiles"
        ADD COLUMN IF NOT EXISTS "is_representative" BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "dcc_snapshot_json" JSONB,
        ADD COLUMN IF NOT EXISTS "showcase_style_json" JSONB,
        ADD COLUMN IF NOT EXISTS "showcase_live_style_json" JSONB,
        ADD COLUMN IF NOT EXISTS "routed_contact_phones" JSONB;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "user_dcc_agent_profiles_user_id_is_representative_idx"
        ON "user_dcc_agent_profiles" ("user_id", "is_representative");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "user_dcc_agent_profiles_one_representative_idx"
        ON "user_dcc_agent_profiles" ("user_id")
        WHERE "is_representative" = TRUE;
    `);
  } catch {
    /* table may not exist yet — list will surface 503 */
  }
  columnsReady = true;
}

function text(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

function snapObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? { ...(raw as Record<string, unknown>) } : {};
}

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
  return (name || job || "프로필").slice(0, 80);
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

type AgentRow = {
  id: string;
  label: string;
  displayName: string;
  title: string;
  department: string;
  photoUrl: string | null;
  photoFocus: string;
  isActive: boolean;
  isRepresentative?: boolean;
  sortOrder: number;
  updatedAt: Date;
  dccSnapshotJson?: unknown;
  showcaseStyleJson?: unknown;
  showcaseLiveStyleJson?: unknown;
  routedContactPhones?: unknown;
};

function parseRoutedContactPhones(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const e164 = String(item || "").trim();
    if (!e164 || seen.has(e164)) continue;
    seen.add(e164);
    out.push(e164);
  }
  return out;
}

export function toDto(
  row: AgentRow,
  extras?: { assignedLineIds?: string[]; assignedPhones?: string[]; isActiveOverride?: boolean }
): DccAgentDto {
  const hasDcc = Object.keys(snapObj(row.dccSnapshotJson)).length > 0;
  const hasShowcase =
    showcaseHasContent(row.showcaseStyleJson) || showcaseHasContent(row.showcaseLiveStyleJson);
  const contactE164 = parseRoutedContactPhones(row.routedContactPhones);
  return {
    id: row.id,
    label: row.label || defaultAgentLabel(row.displayName, row.title),
    displayName: row.displayName,
    title: row.title,
    department: row.department,
    photoUrl: row.photoUrl,
    photoFocus: normalizePhotoFocus(row.photoFocus),
    isActive: extras?.isActiveOverride ?? row.isActive,
    isRepresentative: Boolean(row.isRepresentative),
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt.toISOString(),
    hasDcc,
    hasShowcase,
    assignedLineIds: extras?.assignedLineIds || [],
    assignedPhones: extras?.assignedPhones || [],
    contactPhones: contactE164.map(displayPhone)
  };
}

function tableMissing(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e || "");
  return /user_dcc_agent_profiles|does not exist|P2021|P2010/i.test(msg);
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
  const d = rest.startsWith("0") ? rest : `0${rest}`;
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return raw || e164;
}

async function seedFromDigitalCard(userId: string) {
  const [user, card] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { legalName: true, phoneE164: true, showcaseStyleJson: true, showcaseLiveStyleJson: true }
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
      isRepresentative: true,
      sortOrder: 0,
      dccSnapshotJson: (Object.keys(snap).length ? snap : undefined) as Prisma.InputJsonValue | undefined,
      showcaseStyleJson: (user?.showcaseStyleJson as Prisma.InputJsonValue) || undefined,
      showcaseLiveStyleJson: (user?.showcaseLiveStyleJson as Prisma.InputJsonValue) || undefined
    }
  });
  return created;
}

async function loadAssignments(userId: string) {
  const lines = await prisma.businessCard.findMany({
    where: { userId, activeDccAgentProfileId: { not: null } },
    select: { id: true, phoneE164: true, activeDccAgentProfileId: true }
  });
  const byAgent = new Map<string, { ids: string[]; phones: string[] }>();
  for (const line of lines) {
    const aid = line.activeDccAgentProfileId;
    if (!aid) continue;
    const cur = byAgent.get(aid) || { ids: [], phones: [] };
    cur.ids.push(line.id);
    cur.phones.push(displayPhone(line.phoneE164));
    byAgent.set(aid, cur);
  }
  return byAgent;
}

export async function getRepresentativeProfile(userId: string) {
  await ensureMultiDccProfileBundleColumns();
  let row = await prisma.userDccAgentProfile.findFirst({
    where: { userId, isRepresentative: true }
  });
  if (!row) {
    row = await prisma.userDccAgentProfile.findFirst({
      where: { userId },
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
    });
  }
  return row;
}

export async function listDccAgentProfiles(
  userId: string,
  cardId?: string | null
): Promise<{
  profiles: DccAgentDto[];
  activeId: string | null;
  representativeId: string | null;
  maxCount: number;
  entitlement?: {
    freeSlots: number;
    paidSlots: number;
    allowedSlots: number;
    monthlyKrw: number;
  };
}> {
  try {
    await ensureMultiDccProfileBundleColumns();
    let rows = await prisma.userDccAgentProfile.findMany({
      where: { userId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });
    if (rows.length === 0) {
      const seeded = await seedFromDigitalCard(userId);
      if (seeded) rows = [seeded];
    }
    if (rows.length && !rows.some((r) => r.isRepresentative)) {
      await prisma.userDccAgentProfile.update({
        where: { id: rows[0].id },
        data: { isRepresentative: true }
      });
      rows = await prisma.userDccAgentProfile.findMany({
        where: { userId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      });
    }
    /* 목록 조회 시 마스터 명함 사진 → 활성·대표 칸 동기화(옛 사진 잔존 해소) */
    try {
      const card = await prisma.digitalCard.findUnique({
        where: { userId },
        select: {
          photoUrl: true,
          displayName: true,
          titleSnapshot: true,
          departmentSnapshot: true,
          exportSnapshotJson: true
        }
      });
      const snap =
        card?.exportSnapshotJson && typeof card.exportSnapshotJson === "object"
          ? (card.exportSnapshotJson as Record<string, unknown>)
          : {};
      const masterPhoto = text(card?.photoUrl || snap.photoUrl, 1024);
      if (masterPhoto && (isHttpMediaUrl(masterPhoto) || masterPhoto.startsWith("/"))) {
        await syncMasterIdentityToPrimaryAgents(userId, {
          photoUrl: masterPhoto,
          displayName: text(card?.displayName || snap.name || snap.displayName, 120) || null,
          title: text(card?.titleSnapshot || snap.title, 120) || null,
          department: text(card?.departmentSnapshot || snap.department, 120) || null
        });
        rows = await prisma.userDccAgentProfile.findMany({
          where: { userId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        });
      }
    } catch {
      /* ignore heal errors */
    }
    let activeId = rows.find((p) => p.isActive)?.id || rows[0]?.id || null;
    if (cardId) {
      const line = await prisma.businessCard.findFirst({
        where: { id: cardId, userId },
        select: { activeDccAgentProfileId: true }
      });
      if (line?.activeDccAgentProfileId) activeId = line.activeDccAgentProfileId;
    }
    const assignments = await loadAssignments(userId);
    const representativeId = rows.find((p) => p.isRepresentative)?.id || activeId;
    const profiles = rows.map((row) => {
      const a = assignments.get(row.id);
      return toDto(row, {
        assignedLineIds: a?.ids || [],
        assignedPhones: a?.phones || [],
        isActiveOverride: row.id === activeId
      });
    });
    let entitlement = {
      freeSlots: 1,
      paidSlots: 0,
      allowedSlots: 1,
      monthlyKrw: 4200
    };
    try {
      const { getMultiDccSlotEntitlement } = await import("./multiDccSlotService.js");
      entitlement = await getMultiDccSlotEntitlement(userId);
    } catch {
      /* ignore */
    }
    return {
      profiles,
      activeId,
      representativeId,
      maxCount: Math.min(DCC_AGENT_MAX_COUNT, entitlement.allowedSlots || DCC_AGENT_MAX_COUNT),
      entitlement
    };
  } catch (e) {
    if (tableMissing(e)) {
      const err = new Error(
        "멀티 프로필 테이블이 아직 준비되지 않았습니다. DB 마이그레이션 후 API를 재시작해 주세요."
      );
      (err as Error & { status?: number }).status = 503;
      throw err;
    }
    throw e;
  }
}

export async function createDccAgentProfile(userId: string, body: DccAgentInput): Promise<DccAgentDto> {
  await ensureMultiDccProfileBundleColumns();
  const input = normalizeDccAgentInput(body);
  if (!input.displayName) {
    const err = new Error("프로필 이름을 입력해 주세요.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  const count = await prisma.userDccAgentProfile.count({ where: { userId } });
  if (count >= DCC_AGENT_MAX_COUNT) {
    const err = new Error(`멀티 프로필은 최대 ${DCC_AGENT_MAX_COUNT}개까지 등록할 수 있습니다.`);
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  if (count >= 1) {
    const { assertCanCreateMultiDccSlot } = await import("./multiDccSlotService.js");
    await assertCanCreateMultiDccSlot(userId, count);
  }
  const makeFirst = count === 0;
  const label =
    text(input.label, 80) ||
    (makeFirst ? defaultAgentLabel(input.displayName, input.title) : `프로필 ${count + 1}`);
  const created = await prisma.userDccAgentProfile.create({
    data: {
      userId,
      label,
      displayName: input.displayName,
      /* 추가 프로필은 이름만 유지 — 직함·사진·DCC·쇼케이스는 빈 계정 */
      title: makeFirst ? input.title : "",
      department: makeFirst ? input.department : "",
      photoUrl: makeFirst ? input.photoUrl : null,
      photoFocus: input.photoFocus || "center",
      ...(makeFirst
        ? {}
        : {
            dccSnapshotJson: {} as Prisma.InputJsonValue,
            showcaseStyleJson: {} as Prisma.InputJsonValue,
            showcaseLiveStyleJson: {} as Prisma.InputJsonValue,
            routedContactPhones: [] as Prisma.InputJsonValue
          }),
      isActive: makeFirst,
      isRepresentative: makeFirst,
      sortOrder: count
    }
  });
  return toDto(created);
}

export async function updateDccAgentProfile(
  userId: string,
  id: string,
  body: DccAgentInput
): Promise<DccAgentDto> {
  await ensureMultiDccProfileBundleColumns();
  const existing = await prisma.userDccAgentProfile.findFirst({ where: { id, userId } });
  if (!existing) {
    const err = new Error("멀티 프로필을 찾을 수 없습니다.");
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
    const err = new Error("프로필 이름을 입력해 주세요.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  const updated = await prisma.userDccAgentProfile.update({
    where: { id },
    data: (() => {
      const data: Prisma.UserDccAgentProfileUpdateInput = { ...input };
      if (body.photoUrl !== undefined) {
        const snap = snapObj(existing.dccSnapshotJson);
        data.dccSnapshotJson = {
          ...snap,
          photoUrl: input.photoUrl || ""
        } as Prisma.InputJsonValue;
      }
      return data;
    })()
  });
  const { syncAssignedLinesForAgent } = await import("./dccLineService.js");
  await syncAssignedLinesForAgent(userId, updated);
  const assignments = await loadAssignments(userId);
  const a = assignments.get(updated.id);
  return toDto(updated, { assignedLineIds: a?.ids || [], assignedPhones: a?.phones || [] });
}

export async function deleteDccAgentProfile(userId: string, id: string): Promise<{ ok: true; activeId: string | null }> {
  await ensureMultiDccProfileBundleColumns();
  const existing = await prisma.userDccAgentProfile.findFirst({ where: { id, userId } });
  if (!existing) {
    const err = new Error("멀티 프로필을 찾을 수 없습니다.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const remaining = await prisma.userDccAgentProfile.count({ where: { userId } });
  if (remaining <= 1) {
    const err = new Error("최소 1개의 대표 프로필은 남겨 두어야 합니다.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  if (existing.isRepresentative) {
    const err = new Error("대표 프로필은 삭제할 수 없습니다. 다른 프로필을 대표로 지정한 뒤 삭제해 주세요.");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  await prisma.businessCard.updateMany({
    where: { userId, activeDccAgentProfileId: id },
    data: { activeDccAgentProfileId: null }
  });
  await prisma.userDccAgentProfile.delete({ where: { id } });
  if (existing.isActive) {
    const next = await prisma.userDccAgentProfile.findFirst({
      where: { userId },
      orderBy: [{ isRepresentative: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
    });
    if (next) {
      await prisma.userDccAgentProfile.update({
        where: { id: next.id },
        data: { isActive: true }
      });
      return { ok: true, activeId: next.id };
    }
  }
  return { ok: true, activeId: null };
}

export async function activateDccAgentProfile(
  userId: string,
  id: string,
  cardId?: string | null
): Promise<DccAgentDto> {
  await ensureMultiDccProfileBundleColumns();
  const target = await prisma.userDccAgentProfile.findFirst({ where: { id, userId } });
  if (!target) {
    const err = new Error("멀티 프로필을 찾을 수 없습니다.");
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
  if (cardId) {
    const { assignAgentToLine } = await import("./dccLineService.js");
    await assignAgentToLine(userId, cardId, id);
  }
  const assignments = await loadAssignments(userId);
  const a = assignments.get(id);
  return toDto({ ...target, isActive: true }, {
    assignedLineIds: a?.ids || [],
    assignedPhones: a?.phones || []
  });
}

export async function setRepresentativeDccProfile(userId: string, id: string): Promise<DccAgentDto> {
  await ensureMultiDccProfileBundleColumns();
  const target = await prisma.userDccAgentProfile.findFirst({ where: { id, userId } });
  if (!target) {
    const err = new Error("멀티 프로필을 찾을 수 없습니다.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  await prisma.$transaction(async (tx) => {
    await tx.userDccAgentProfile.updateMany({
      where: { userId, isRepresentative: true, NOT: { id } },
      data: { isRepresentative: false }
    });
    await tx.userDccAgentProfile.update({
      where: { id },
      data: { isRepresentative: true, isActive: true }
    });
    await tx.userDccAgentProfile.updateMany({
      where: { userId, isActive: true, NOT: { id } },
      data: { isActive: false }
    });
  });
  /* 이름·전화 검색 노출은 대표 프로필 쇼케이스·사진을 따름 — 빈 프로필로 마스터를 덮지 않음 */
  try {
    const dcc = snapObj(target.dccSnapshotJson);
    const live = target.showcaseLiveStyleJson || target.showcaseStyleJson;
    if (live != null && showcaseHasContent(live)) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          showcaseStyleJson: (target.showcaseStyleJson as Prisma.InputJsonValue) || undefined,
          showcaseLiveStyleJson: (live as Prisma.InputJsonValue) || undefined
        }
      });
    }
    const titlePhoto = text(dcc.titlePhotoUrl, 1024);
    const org = text(dcc.organization || dcc.companyName, 200);
    if (target.photoUrl || titlePhoto || org || target.title || target.department) {
      await prisma.digitalCard.updateMany({
        where: { userId },
        data: {
          ...(target.photoUrl ? { photoUrl: target.photoUrl } : {}),
          ...(org ? { organization: org } : {}),
          ...(target.title ? { titleSnapshot: target.title } : {}),
          ...(target.department ? { departmentSnapshot: target.department } : {})
        }
      });
    }
  } catch {
    /* non-fatal */
  }
  const assignments = await loadAssignments(userId);
  const a = assignments.get(id);
  return toDto({ ...target, isRepresentative: true, isActive: true }, {
    assignedLineIds: a?.ids || [],
    assignedPhones: a?.phones || []
  });
}

/**
 * 카카오톡 친구관리형 — 상대 전화번호를 이 멀티 프로필에 지정.
 * 지정된 상대와 통화 시 이 프로필 쇼케이스가 송출된다.
 */
export async function setRoutedContactPhones(
  userId: string,
  profileId: string,
  phonesRaw: unknown
): Promise<DccAgentDto> {
  await ensureMultiDccProfileBundleColumns();
  const profile = await prisma.userDccAgentProfile.findFirst({ where: { id: profileId, userId } });
  if (!profile) {
    const err = new Error("멀티 프로필을 찾을 수 없습니다.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const { normalizeToE164KR } = await import("../../lib/phoneE164.js");
  const list = Array.isArray(phonesRaw) ? phonesRaw : [];
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const e164 = normalizeToE164KR(String(item || "").trim());
    if (!e164 || seen.has(e164)) continue;
    seen.add(e164);
    normalized.push(e164);
    if (normalized.length >= 200) break;
  }
  /* 같은 번호는 한 프로필에만 — 다른 프로필에서 제거 */
  const siblings = await prisma.userDccAgentProfile.findMany({
    where: { userId, NOT: { id: profileId } },
    select: { id: true, routedContactPhones: true }
  });
  await prisma.$transaction(async (tx) => {
    await tx.userDccAgentProfile.update({
      where: { id: profileId },
      data: { routedContactPhones: normalized as Prisma.InputJsonValue }
    });
    for (const sib of siblings) {
      const prev = parseRoutedContactPhones(sib.routedContactPhones);
      const next = prev.filter((p) => !seen.has(p));
      if (next.length !== prev.length) {
        await tx.userDccAgentProfile.update({
          where: { id: sib.id },
          data: { routedContactPhones: next as Prisma.InputJsonValue }
        });
      }
    }
  });
  const refreshed = await prisma.userDccAgentProfile.findFirst({ where: { id: profileId, userId } });
  const assignments = await loadAssignments(userId);
  const a = assignments.get(profileId);
  return toDto(refreshed || profile, {
    assignedLineIds: a?.ids || [],
    assignedPhones: a?.phones || []
  });
}

/** 상대 전화번호 → 송출할 멀티 프로필 (연락처 지정 우선, 없으면 대표) */
export async function resolveAgentProfileForPeer(
  ownerUserId: string,
  peerPhoneRaw?: string | null
): Promise<{ profile: AgentRow & { id: string }; viaContact: boolean } | null> {
  await ensureMultiDccProfileBundleColumns();
  const rows = await prisma.userDccAgentProfile.findMany({
    where: { userId: ownerUserId },
    orderBy: [{ isRepresentative: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
  });
  if (!rows.length) return null;
  const { normalizeToE164KR } = await import("../../lib/phoneE164.js");
  const peer = peerPhoneRaw ? normalizeToE164KR(String(peerPhoneRaw).trim()) : null;
  if (peer) {
    for (const row of rows) {
      if (parseRoutedContactPhones(row.routedContactPhones).includes(peer)) {
        return { profile: row, viaContact: true };
      }
    }
  }
  const fallback =
    rows.find((r) => r.isRepresentative) || rows.find((r) => r.isActive) || rows[0] || null;
  return fallback ? { profile: fallback, viaContact: false } : null;
}

/** 프로필에 회선(전화번호) 배정 — 지정된 번호에만 이 프로필 DCC·쇼케이스 송출 */
export async function assignLinesToDccProfile(
  userId: string,
  profileId: string,
  lineIds: string[]
): Promise<DccAgentDto> {
  await ensureMultiDccProfileBundleColumns();
  const profile = await prisma.userDccAgentProfile.findFirst({ where: { id: profileId, userId } });
  if (!profile) {
    const err = new Error("멀티 프로필을 찾을 수 없습니다.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const wanted = [...new Set(lineIds.map((x) => String(x || "").trim()).filter(Boolean))];
  const { assignAgentToLine, listDccLines } = await import("./dccLineService.js");
  const { lines } = await listDccLines(userId);
  const ownedIds = new Set(lines.map((l) => l.id));
  for (const id of wanted) {
    if (!ownedIds.has(id)) {
      const err = new Error("소유하지 않은 번호는 배정할 수 없습니다.");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
  }
  const currentlyAssigned = await prisma.businessCard.findMany({
    where: { userId, activeDccAgentProfileId: profileId },
    select: { id: true }
  });
  for (const row of currentlyAssigned) {
    if (!wanted.includes(row.id)) {
      await prisma.businessCard.update({
        where: { id: row.id },
        data: { activeDccAgentProfile: { disconnect: true } }
      });
    }
  }
  for (const lineId of wanted) {
    await assignAgentToLine(userId, lineId, profileId);
  }
  const refreshed = await prisma.userDccAgentProfile.findFirst({ where: { id: profileId, userId } });
  const assignments = await loadAssignments(userId);
  const a = assignments.get(profileId);
  return toDto(refreshed || profile, {
    assignedLineIds: a?.ids || [],
    assignedPhones: a?.phones || []
  });
}

export async function putDccProfileBundle(
  userId: string,
  profileId: string,
  input: { dcc?: Record<string, unknown> | null; showcase?: { editor?: unknown; live?: unknown } | null }
): Promise<DccAgentDto> {
  await ensureMultiDccProfileBundleColumns();
  const profile = await prisma.userDccAgentProfile.findFirst({ where: { id: profileId, userId } });
  if (!profile) {
    const err = new Error("멀티 프로필을 찾을 수 없습니다.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const data: Prisma.UserDccAgentProfileUpdateInput = {};
  if (input.dcc !== undefined) {
    data.dccSnapshotJson =
      input.dcc && typeof input.dcc === "object"
        ? (input.dcc as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    /* 컬럼 photoUrl 과 dcc 스냅샷 동기화 — 전환 시 stale 컬럼이 새 사진을 덮지 않게 */
    if (input.dcc && typeof input.dcc === "object" && "photoUrl" in input.dcc) {
      const photoRaw = String((input.dcc as { photoUrl?: unknown }).photoUrl ?? "").trim();
      data.photoUrl =
        photoRaw && (isHttpMediaUrl(photoRaw) || photoRaw.startsWith("/")) ? photoRaw : null;
    }
  }
  if (input.showcase !== undefined) {
    if (input.showcase?.editor !== undefined) {
      data.showcaseStyleJson =
        input.showcase.editor && typeof input.showcase.editor === "object"
          ? (input.showcase.editor as Prisma.InputJsonValue)
          : Prisma.JsonNull;
    }
    if (input.showcase?.live !== undefined) {
      data.showcaseLiveStyleJson =
        input.showcase.live && typeof input.showcase.live === "object"
          ? (input.showcase.live as Prisma.InputJsonValue)
          : Prisma.JsonNull;
    }
  }
  const updated = await prisma.userDccAgentProfile.update({
    where: { id: profileId },
    data
  });
  const { syncAssignedLinesForAgent } = await import("./dccLineService.js");
  await syncAssignedLinesForAgent(userId, updated);
  const assignments = await loadAssignments(userId);
  const a = assignments.get(profileId);
  return toDto(updated, { assignedLineIds: a?.ids || [], assignedPhones: a?.phones || [] });
}

/** 전환용 — 프로필 DCC·쇼케이스 번들 */
export async function getDccProfileBundle(userId: string, profileId: string) {
  await ensureMultiDccProfileBundleColumns();
  const profile = await prisma.userDccAgentProfile.findFirst({ where: { id: profileId, userId } });
  if (!profile) {
    const err = new Error("멀티 프로필을 찾을 수 없습니다.");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const assignments = await loadAssignments(userId);
  const a = assignments.get(profileId);
  const dcc = snapObj(profile.dccSnapshotJson);
  const editor = profile.showcaseStyleJson;
  const live = profile.showcaseLiveStyleJson || profile.showcaseStyleJson;
  return {
    profile: toDto(profile, { assignedLineIds: a?.ids || [], assignedPhones: a?.phones || [] }),
    dcc,
    showcase: {
      editor: editor || null,
      live: live || null,
      updatedAt: profile.updatedAt?.toISOString?.() || null
    }
  };
}

/** 회선 저장 시 연결된 프로필 번들도 갱신 */
export async function mirrorLineContentToProfile(
  userId: string,
  profileId: string,
  patch: {
    dcc?: Record<string, unknown>;
    showcaseEditor?: unknown;
    showcaseLive?: unknown;
  }
) {
  await ensureMultiDccProfileBundleColumns();
  const data: Prisma.UserDccAgentProfileUpdateInput = {};
  if (patch.dcc) data.dccSnapshotJson = patch.dcc as Prisma.InputJsonValue;
  if (patch.showcaseEditor !== undefined) {
    data.showcaseStyleJson =
      patch.showcaseEditor && typeof patch.showcaseEditor === "object"
        ? (patch.showcaseEditor as Prisma.InputJsonValue)
        : Prisma.JsonNull;
  }
  if (patch.showcaseLive !== undefined) {
    data.showcaseLiveStyleJson =
      patch.showcaseLive && typeof patch.showcaseLive === "object"
        ? (patch.showcaseLive as Prisma.InputJsonValue)
        : Prisma.JsonNull;
  }
  if (patch.dcc && typeof patch.dcc === "object" && "photoUrl" in patch.dcc) {
    const photoRaw = String((patch.dcc as { photoUrl?: unknown }).photoUrl ?? "").trim();
    data.photoUrl =
      photoRaw && (isHttpMediaUrl(photoRaw) || photoRaw.startsWith("/")) ? photoRaw : null;
  }
  if (Object.keys(data).length === 0) return;
  await prisma.userDccAgentProfile.updateMany({
    where: { id: profileId, userId },
    data
  });
}

/**
 * 마스터 디지털명함 사진·표시명을 활성·대표 멀티프로필에 반영
 * — 예전 photoUrl 잔존으로 대표 칸에 옛 사진이 남는 문제 방지
 */
export async function syncMasterIdentityToPrimaryAgents(
  userId: string,
  opts: {
    photoUrl?: string | null;
    displayName?: string | null;
    title?: string | null;
    department?: string | null;
  }
) {
  await ensureMultiDccProfileBundleColumns();
  const rows = await prisma.userDccAgentProfile.findMany({
    where: { userId },
    select: {
      id: true,
      isActive: true,
      isRepresentative: true,
      photoUrl: true,
      dccSnapshotJson: true
    }
  });
  if (!rows.length) return { updated: 0 };

  const photoRaw = String(opts.photoUrl ?? "").trim();
  const photoUrl =
    photoRaw && (isHttpMediaUrl(photoRaw) || photoRaw.startsWith("/")) ? photoRaw : null;
  const displayName = text(opts.displayName, 120);
  const title = text(opts.title, 120);
  const department = text(opts.department, 120);

  const targets = rows.filter((r) => r.isActive || r.isRepresentative);
  /* 프로필이 하나뿐이면 그 칸을 마스터와 맞춤 */
  const list = targets.length ? targets : rows.slice(0, 1);
  let updated = 0;

  for (const row of list) {
    const data: Prisma.UserDccAgentProfileUpdateInput = {};
    if (photoUrl !== null || opts.photoUrl === "") {
      data.photoUrl = photoUrl;
    }
    if (displayName) data.displayName = displayName;
    if (title) data.title = title;
    if (department) data.department = department;

    const prev = snapObj(row.dccSnapshotJson);
    const nextSnap: Record<string, unknown> = { ...prev };
    let snapChanged = false;
    if (photoUrl !== null || opts.photoUrl === "") {
      if (photoUrl) nextSnap.photoUrl = photoUrl;
      else delete nextSnap.photoUrl;
      snapChanged = true;
    }
    if (displayName) {
      nextSnap.name = displayName;
      nextSnap.displayName = displayName;
      snapChanged = true;
    }
    if (title) {
      nextSnap.title = title;
      snapChanged = true;
    }
    if (department) {
      nextSnap.department = department;
      snapChanged = true;
    }
    if (snapChanged) {
      data.dccSnapshotJson = nextSnap as Prisma.InputJsonValue;
    }
    if (Object.keys(data).length === 0) continue;
    await prisma.userDccAgentProfile.update({ where: { id: row.id }, data });
    updated += 1;
  }
  return { updated };
}
