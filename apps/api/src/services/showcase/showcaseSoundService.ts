import type { Prisma, ShowcaseSoundCreateType, ShowcaseSoundKind } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { isPaidMember } from "../membership/paidMemberGate.js";

export const SOUND_RIGHTS_DISCLAIMER =
  "VLUE는 음원을 직접 판매하거나 저작권을 최종 인증하는 플랫폼이 아닙니다. 이용자가 적법한 권리 또는 이용 권한을 보유한 음원을 쇼케이스에서 소개·재생할 수 있도록 연결합니다.";

const FREE_MONTHLY_REGISTER_LIMIT = 1;
const FREE_WEEKLY_THEME_CHANGE_LIMIT = 1;

function yearMonthNow(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function isoWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function attributionFromCreateType(
  createType: ShowcaseSoundCreateType,
  aiMeta?: Record<string, unknown> | null
): string {
  if (createType === "human_created") return "Human Created";
  if (createType === "ai_generated") return "AI Generated";
  if (createType === "remake_arrangement") {
    return aiMeta?.finalEdited === true || aiMeta?.finalEdit === "edited"
      ? "Human Edited"
      : "AI Assisted";
  }
  if (createType === "ai_assisted") {
    return aiMeta?.finalEdited === true || aiMeta?.finalEdit === "edited"
      ? "Human Edited"
      : "AI Assisted";
  }
  return "Human Created";
}

export function serializeShowcaseSound(
  row: {
    id: string;
    kind: ShowcaseSoundKind;
    ownerUserId: string | null;
    createType: ShowcaseSoundCreateType;
    title: string;
    artistName: string | null;
    audioUrl: string;
    contentType: string | null;
    fileSize: number | null;
    visibility: string;
    attributionLabel: string;
    aiMetaJson: unknown;
    copyrightVerifyJson: unknown;
    rightsConsentAt: Date | null;
    commercialUseClaimed: boolean;
    isPublished: boolean;
    sortOrder: number;
    adminNote: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  opts: { linkBroken?: boolean } = {}
) {
  return {
    id: row.id,
    kind: row.kind,
    ownerUserId: row.ownerUserId,
    createType: row.createType,
    title: row.title,
    artistName: row.artistName,
    audioUrl: opts.linkBroken ? "" : row.audioUrl,
    contentType: row.contentType,
    fileSize: row.fileSize,
    visibility: row.visibility,
    attributionLabel: row.attributionLabel,
    aiMeta: row.aiMetaJson,
    copyrightVerify: row.copyrightVerifyJson,
    rightsConsentAt: row.rightsConsentAt?.toISOString() ?? null,
    commercialUseClaimed: row.commercialUseClaimed,
    isPublished: row.isPublished,
    sortOrder: row.sortOrder,
    adminNote: row.adminNote,
    deleted: Boolean(row.deletedAt),
    linkBroken: Boolean(opts.linkBroken),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    disclaimer: SOUND_RIGHTS_DISCLAIMER
  };
}

export async function getSoundQuotaStatus(userId: string) {
  const paid = await isPaidMember(userId);
  const yearMonth = yearMonthNow();
  const weekKey = isoWeekKey();
  const row = await prisma.showcaseSoundQuotaMonth.findUnique({
    where: { userId_yearMonth: { userId, yearMonth } }
  });
  const registerCount = row?.registerCount ?? 0;
  const themeWeek = row?.themeChangeWeekKey === weekKey ? row.themeChangeCount : 0;
  return {
    paid,
    yearMonth,
    weekKey,
    registerCount,
    registerLimit: paid ? null : FREE_MONTHLY_REGISTER_LIMIT,
    canRegister: paid || registerCount < FREE_MONTHLY_REGISTER_LIMIT,
    themeChangeCount: themeWeek,
    themeChangeLimit: paid ? null : FREE_WEEKLY_THEME_CHANGE_LIMIT,
    canChangeTheme: paid || themeWeek < FREE_WEEKLY_THEME_CHANGE_LIMIT
  };
}

export async function assertCanRegisterSound(userId: string) {
  const q = await getSoundQuotaStatus(userId);
  if (!q.canRegister) {
    throw new Error("무료 회원은 월 1회만 음원을 등록할 수 있습니다. 유료 플랜에서 상시 등록이 가능합니다.");
  }
  return q;
}

export async function bumpRegisterQuota(userId: string) {
  const yearMonth = yearMonthNow();
  await prisma.showcaseSoundQuotaMonth.upsert({
    where: { userId_yearMonth: { userId, yearMonth } },
    create: { userId, yearMonth, registerCount: 1 },
    update: { registerCount: { increment: 1 } }
  });
}

export async function bumpThemeChangeQuota(userId: string) {
  const paid = await isPaidMember(userId);
  if (paid) return { ok: true as const, skipped: true };
  const yearMonth = yearMonthNow();
  const weekKey = isoWeekKey();
  const row = await prisma.showcaseSoundQuotaMonth.findUnique({
    where: { userId_yearMonth: { userId, yearMonth } }
  });
  const count = row?.themeChangeWeekKey === weekKey ? row.themeChangeCount : 0;
  if (count >= FREE_WEEKLY_THEME_CHANGE_LIMIT) {
    throw new Error("무료 회원은 쇼케이스 주제곡을 주 1회만 변경할 수 있습니다.");
  }
  await prisma.showcaseSoundQuotaMonth.upsert({
    where: { userId_yearMonth: { userId, yearMonth } },
    create: {
      userId,
      yearMonth,
      registerCount: 0,
      themeChangeWeekKey: weekKey,
      themeChangeCount: 1
    },
    update: {
      themeChangeWeekKey: weekKey,
      themeChangeCount: row?.themeChangeWeekKey === weekKey ? { increment: 1 } : 1
    }
  });
  return { ok: true as const };
}

export async function listSignatureSounds() {
  const rows = await prisma.showcaseSound.findMany({
    where: { kind: "signature", deletedAt: null, isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
  });
  return rows.map((r) => serializeShowcaseSound(r));
}

export async function listAdminSignatureSounds() {
  const rows = await prisma.showcaseSound.findMany({
    where: { kind: "signature", deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
  });
  return rows.map((r) => serializeShowcaseSound(r));
}

export async function listMySounds(userId: string) {
  const owned = await prisma.showcaseSound.findMany({
    where: { ownerUserId: userId, deletedAt: null },
    orderBy: { createdAt: "desc" }
  });
  const borrows = await prisma.showcaseSoundBorrow.findMany({
    where: { borrowerUserId: userId },
    include: { sound: true },
    orderBy: { createdAt: "desc" }
  });
  return {
    owned: owned.map((r) => serializeShowcaseSound(r)),
    borrowed: borrows.map((b) => {
      const broken =
        !b.sound ||
        Boolean(b.sound.deletedAt) ||
        b.sound.visibility !== "public" ||
        (b.sound.kind === "signature" && !b.sound.isPublished);
      return {
        borrowId: b.id,
        borrowedAt: b.createdAt.toISOString(),
        sound: serializeShowcaseSound(b.sound, { linkBroken: broken })
      };
    })
  };
}

export async function createUserOriginalSound(
  userId: string,
  input: {
    title: string;
    artistName?: string;
    createType: ShowcaseSoundCreateType;
    audioUrl: string;
    objectKey?: string;
    contentType?: string;
    fileSize?: number;
    visibility?: "public" | "private";
    aiMeta?: Record<string, unknown> | null;
    copyrightVerify?: Record<string, unknown> | null;
    commercialUseClaimed?: boolean;
    rightsConsent: boolean;
  }
) {
  if (!input.rightsConsent) {
    throw new Error("권리·책임 동의에 체크해야 등록할 수 있습니다.");
  }
  const title = String(input.title || "").trim();
  if (!title) throw new Error("음원 제목이 필요합니다.");
  const audioUrl = String(input.audioUrl || "").trim();
  if (!audioUrl) throw new Error("음원 URL이 필요합니다.");

  await assertCanRegisterSound(userId);

  const createType = input.createType;
  const isAi = createType === "ai_assisted" || createType === "ai_generated" || createType === "remake_arrangement";
  if (isAi && input.commercialUseClaimed !== true) {
    throw new Error("AI 관련 음원은 상업적 이용 권한 보유를 확인해야 등록할 수 있습니다.");
  }

  const attributionLabel = attributionFromCreateType(createType, input.aiMeta);
  const row = await prisma.showcaseSound.create({
    data: {
      kind: "user_original",
      ownerUserId: userId,
      createType,
      title: title.slice(0, 200),
      artistName: String(input.artistName || "").trim().slice(0, 120) || null,
      audioUrl,
      objectKey: input.objectKey || null,
      contentType: input.contentType || null,
      fileSize: Number.isFinite(Number(input.fileSize)) ? Math.floor(Number(input.fileSize)) : null,
      visibility: input.visibility === "public" ? "public" : "private",
      attributionLabel,
      ...(input.aiMeta ? { aiMetaJson: input.aiMeta as Prisma.InputJsonValue } : {}),
      ...(input.copyrightVerify
        ? { copyrightVerifyJson: input.copyrightVerify as Prisma.InputJsonValue }
        : {}),
      rightsConsentAt: new Date(),
      commercialUseClaimed: Boolean(input.commercialUseClaimed),
      isPublished: true
    }
  });
  await bumpRegisterQuota(userId);
  return serializeShowcaseSound(row);
}

export async function createSignatureSound(input: {
  title: string;
  artistName?: string;
  audioUrl: string;
  objectKey?: string;
  contentType?: string;
  fileSize?: number;
  sortOrder?: number;
  adminNote?: string;
  isPublished?: boolean;
}) {
  const title = String(input.title || "").trim();
  if (!title) throw new Error("음원 제목이 필요합니다.");
  const audioUrl = String(input.audioUrl || "").trim();
  if (!audioUrl) throw new Error("음원 URL이 필요합니다.");
  const row = await prisma.showcaseSound.create({
    data: {
      kind: "signature",
      ownerUserId: null,
      createType: "ai_generated",
      title: title.slice(0, 200),
      artistName: String(input.artistName || "VLUE").trim().slice(0, 120) || "VLUE",
      audioUrl,
      objectKey: input.objectKey || null,
      contentType: input.contentType || null,
      fileSize: Number.isFinite(Number(input.fileSize)) ? Math.floor(Number(input.fileSize)) : null,
      visibility: "public",
      attributionLabel: "VLUE Signature",
      rightsConsentAt: new Date(),
      commercialUseClaimed: true,
      isPublished: input.isPublished !== false,
      sortOrder: Number(input.sortOrder) || 0,
      adminNote: String(input.adminNote || "").trim().slice(0, 500) || null
    }
  });
  return serializeShowcaseSound(row);
}

export async function updateSignatureSound(
  id: string,
  patch: {
    title?: string;
    artistName?: string;
    sortOrder?: number;
    adminNote?: string | null;
    isPublished?: boolean;
    deleted?: boolean;
  }
) {
  const data: Prisma.ShowcaseSoundUpdateInput = {};
  if (patch.title != null) data.title = String(patch.title).trim().slice(0, 200);
  if (patch.artistName != null) data.artistName = String(patch.artistName).trim().slice(0, 120);
  if (patch.sortOrder != null) data.sortOrder = Number(patch.sortOrder) || 0;
  if (patch.adminNote !== undefined) {
    data.adminNote = patch.adminNote ? String(patch.adminNote).slice(0, 500) : null;
  }
  if (patch.isPublished != null) data.isPublished = Boolean(patch.isPublished);
  if (patch.deleted) data.deletedAt = new Date();
  const row = await prisma.showcaseSound.update({
    where: { id },
    data
  });
  return serializeShowcaseSound(row);
}

export async function borrowShowcaseSound(borrowerUserId: string, soundId: string) {
  const sound = await prisma.showcaseSound.findFirst({
    where: { id: soundId, deletedAt: null }
  });
  if (!sound) throw new Error("음원을 찾을 수 없습니다.");
  if (sound.visibility !== "public" || (sound.kind === "signature" && !sound.isPublished)) {
    throw new Error("공개된 음원만 퍼갈 수 있습니다.");
  }
  if (sound.ownerUserId && sound.ownerUserId === borrowerUserId) {
    throw new Error("내 음원은 퍼갈 필요가 없습니다.");
  }
  await prisma.showcaseSoundBorrow.upsert({
    where: {
      borrowerUserId_soundId: { borrowerUserId, soundId }
    },
    create: { borrowerUserId, soundId },
    update: {}
  });
  return serializeShowcaseSound(sound);
}

export async function getSoundForPlayback(soundId: string, viewerUserId?: string | null) {
  const sound = await prisma.showcaseSound.findFirst({ where: { id: soundId } });
  if (!sound || sound.deletedAt) {
    return { ok: false as const, linkBroken: true, sound: null };
  }
  const isOwner = viewerUserId && sound.ownerUserId === viewerUserId;
  const isPublic =
    sound.visibility === "public" && (sound.kind !== "signature" || sound.isPublished);
  let borrowed = false;
  if (viewerUserId && !isOwner) {
    const b = await prisma.showcaseSoundBorrow.findUnique({
      where: {
        borrowerUserId_soundId: { borrowerUserId: viewerUserId, soundId }
      }
    });
    borrowed = Boolean(b);
  }
  if (!isOwner && !isPublic && !borrowed) {
    return { ok: false as const, linkBroken: true, sound: serializeShowcaseSound(sound, { linkBroken: true }) };
  }
  if (!isPublic && !isOwner) {
    return { ok: false as const, linkBroken: true, sound: serializeShowcaseSound(sound, { linkBroken: true }) };
  }
  return { ok: true as const, linkBroken: false, sound: serializeShowcaseSound(sound) };
}
