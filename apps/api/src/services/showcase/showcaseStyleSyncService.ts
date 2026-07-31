import { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { stripDataUrlsFromJson } from "../../lib/mediaUrlGuard.js";
import {
  assertShowcaseStyleWithinLimit,
  slimShowcaseStyleForPersist,
  slimShowcaseStyleForPublic
} from "../../lib/slimShowcaseStyle.js";

export type ShowcaseLiveSource = { source: "editor" | "mycase"; at: number };

export type ShowcaseStyleBundle = {
  v: 2;
  editor: unknown | null;
  live: unknown | null;
  liveSource: ShowcaseLiveSource | null;
  updatedAt: string | null;
  unchanged?: boolean;
};

function asObjectOrNull(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeLiveSource(raw: unknown): ShowcaseLiveSource | null {
  const o = asObjectOrNull(raw);
  if (!o) return null;
  const source = o.source === "mycase" ? "mycase" : o.source === "editor" ? "editor" : null;
  if (!source) return null;
  const at = Number(o.at);
  return { source, at: Number.isFinite(at) ? at : Date.now() };
}

function prepareStyleForDb(raw: unknown): Record<string, unknown> | null {
  const obj = asObjectOrNull(raw);
  if (!obj) return null;
  const slim = slimShowcaseStyleForPersist(stripDataUrlsFromJson(obj)) as Record<string, unknown>;
  slim.v = 2;
  assertShowcaseStyleWithinLimit(slim, "showcase style");
  return slim;
}

/** updatedAt 만 — JSONB 본문 SELECT 없음 */
export async function getUserShowcaseStyleUpdatedAt(userId: string): Promise<string | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { showcaseStyleUpdatedAt: true }
  });
  return row?.showcaseStyleUpdatedAt ? row.showcaseStyleUpdatedAt.toISOString() : null;
}

export async function getUserShowcaseStyleBundle(
  userId: string,
  opts: { ifNoneMatch?: string | null } = {}
): Promise<ShowcaseStyleBundle> {
  const ifNone = String(opts.ifNoneMatch || "").trim();
  if (ifNone) {
    const serverAt = await getUserShowcaseStyleUpdatedAt(userId);
    if (serverAt && serverAt === ifNone) {
      return {
        v: 2,
        editor: null,
        live: null,
        liveSource: null,
        updatedAt: serverAt,
        unchanged: true
      };
    }
  }

  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      showcaseStyleJson: true,
      showcaseLiveStyleJson: true,
      showcaseLiveSourceJson: true,
      showcaseStyleUpdatedAt: true
    }
  });
  const updatedAt = row?.showcaseStyleUpdatedAt ? row.showcaseStyleUpdatedAt.toISOString() : null;
  return {
    v: 2,
    editor: row?.showcaseStyleJson
      ? slimShowcaseStyleForPersist(row.showcaseStyleJson)
      : null,
    live: row?.showcaseLiveStyleJson
      ? slimShowcaseStyleForPersist(row.showcaseLiveStyleJson)
      : null,
    liveSource: normalizeLiveSource(row?.showcaseLiveSourceJson),
    updatedAt
  };
}

/**
 * 타인 공개용 — 라이브 우선, 없으면 편집본 폴백.
 * 응답은 public slim. ifNoneMatch 시 본문 생략.
 */
export async function getUserShowcasePublicLive(
  userId: string,
  opts: { ifNoneMatch?: string | null } = {}
): Promise<{
  v: 2;
  live: unknown | null;
  liveSource: ShowcaseLiveSource | null;
  updatedAt: string | null;
  unchanged?: boolean;
}> {
  const ifNone = String(opts.ifNoneMatch || "").trim();
  if (ifNone) {
    const serverAt = await getUserShowcaseStyleUpdatedAt(userId);
    if (serverAt && serverAt === ifNone) {
      return { v: 2, live: null, liveSource: null, updatedAt: serverAt, unchanged: true };
    }
  }

  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      showcaseLiveStyleJson: true,
      showcaseLiveSourceJson: true,
      showcaseStyleUpdatedAt: true
    }
  });
  const liveSource = normalizeLiveSource(row?.showcaseLiveSourceJson);
  const updatedAt = row?.showcaseStyleUpdatedAt ? row.showcaseStyleUpdatedAt.toISOString() : null;
  if (row?.showcaseLiveStyleJson != null) {
    return {
      v: 2,
      live: slimShowcaseStyleForPublic(row.showcaseLiveStyleJson),
      liveSource,
      updatedAt
    };
  }
  const editorRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { showcaseStyleJson: true }
  });
  return {
    v: 2,
    live: editorRow?.showcaseStyleJson
      ? slimShowcaseStyleForPublic(editorRow.showcaseStyleJson)
      : null,
    liveSource,
    updatedAt
  };
}

/**
 * LWW + slim-only write. 성공 시 updatedAt 만 반환.
 */
export async function putUserShowcaseStyleBundle(
  userId: string,
  input: {
    editor?: unknown;
    live?: unknown;
    liveSource?: unknown;
    clientUpdatedAt?: string | null;
  }
): Promise<
  | { ok: true; updatedAt: string }
  | { ok: false; conflict: true; bundle: ShowcaseStyleBundle }
> {
  const metaRows = await prisma.$queryRaw<
    Array<{
      showcase_style_updated_at: Date | null;
      has_editor: boolean;
      has_live: boolean;
    }>
  >(Prisma.sql`
    SELECT
      showcase_style_updated_at,
      (showcase_style_json IS NOT NULL) AS has_editor,
      (showcase_live_style_json IS NOT NULL) AS has_live
    FROM users
    WHERE id = ${userId}::uuid
    LIMIT 1
  `);
  const meta = metaRows[0];
  const clientAtMs = input.clientUpdatedAt ? Date.parse(String(input.clientUpdatedAt)) : NaN;
  const serverAtMs = meta?.showcase_style_updated_at
    ? meta.showcase_style_updated_at.getTime()
    : 0;
  const hasExisting = Boolean(meta?.has_editor || meta?.has_live);

  if (
    Number.isFinite(clientAtMs) &&
    serverAtMs > 0 &&
    clientAtMs + 1500 < serverAtMs &&
    hasExisting
  ) {
    const bundle = await getUserShowcaseStyleBundle(userId);
    return { ok: false, conflict: true, bundle };
  }

  const nextUpdatedAt = Number.isFinite(clientAtMs)
    ? new Date(Math.max(clientAtMs, Date.now() - 1000))
    : new Date();

  const data: Prisma.UserUpdateInput = {
    showcaseStyleUpdatedAt: nextUpdatedAt
  };

  if (input.editor !== undefined) {
    const editor = prepareStyleForDb(input.editor);
    if (editor) {
      data.showcaseStyleJson = editor as Prisma.InputJsonValue;
    }
  }
  if (input.live !== undefined && input.live !== null) {
    /* live: null 로 서버 송출본을 지우지 않음 — 재설치 직후 빈 로컬 푸시 레이스 방지 */
    const live = prepareStyleForDb(input.live);
    if (live) {
      data.showcaseLiveStyleJson = live as Prisma.InputJsonValue;
    }
  }
  if (input.liveSource !== undefined) {
    const src = normalizeLiveSource(input.liveSource);
    data.showcaseLiveSourceJson = (src as Prisma.InputJsonValue | null) ?? Prisma.JsonNull;
  }

  await prisma.user.update({
    where: { id: userId },
    data
  });

  return { ok: true, updatedAt: nextUpdatedAt.toISOString() };
}
