import { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { stripDataUrlsFromJson } from "../../lib/mediaUrlGuard.js";

export type ShowcaseLiveSource = { source: "editor" | "mycase"; at: number };

export type ShowcaseStyleBundle = {
  editor: unknown | null;
  live: unknown | null;
  liveSource: ShowcaseLiveSource | null;
  updatedAt: string | null;
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

export async function getUserShowcaseStyleBundle(userId: string): Promise<ShowcaseStyleBundle> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      showcaseStyleJson: true,
      showcaseLiveStyleJson: true,
      showcaseLiveSourceJson: true,
      showcaseStyleUpdatedAt: true
    }
  });
  return {
    editor: row?.showcaseStyleJson ?? null,
    live: row?.showcaseLiveStyleJson ?? null,
    liveSource: normalizeLiveSource(row?.showcaseLiveSourceJson),
    updatedAt: row?.showcaseStyleUpdatedAt ? row.showcaseStyleUpdatedAt.toISOString() : null
  };
}

/**
 * 타인 공개용 — 라이브 우선, 없으면 편집본 폴백.
 * 라이브가 있으면 editor JSONB 는 SELECT 하지 않음 (Pooler egress 절감).
 */
export async function getUserShowcasePublicLive(userId: string): Promise<{
  live: unknown | null;
  liveSource: ShowcaseLiveSource | null;
  updatedAt: string | null;
}> {
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
    return { live: row.showcaseLiveStyleJson, liveSource, updatedAt };
  }
  const editorRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { showcaseStyleJson: true }
  });
  return {
    live: editorRow?.showcaseStyleJson ?? null,
    liveSource,
    updatedAt
  };
}

/**
 * LWW: clientUpdatedAt 가 서버보다 오래되면 거부하고 서버본 반환.
 * clientUpdatedAt 없으면 항상 저장(서버 now).
 * 성공 시 전체 JSON 재조회 없이 updatedAt 만 반환 (응답 egress 절감).
 * 충돌 판정용 메타는 JSONB 본문 없이 IS NOT NULL 만 조회.
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
    const editor = asObjectOrNull(input.editor);
    if (editor) {
      data.showcaseStyleJson = stripDataUrlsFromJson(editor) as Prisma.InputJsonValue;
    }
  }
  if (input.live !== undefined) {
    if (input.live === null) {
      data.showcaseLiveStyleJson = Prisma.JsonNull;
    } else {
      const live = asObjectOrNull(input.live);
      if (live) {
        data.showcaseLiveStyleJson = stripDataUrlsFromJson(live) as Prisma.InputJsonValue;
      }
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
