import { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";

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
 * LWW: clientUpdatedAt 가 서버보다 오래되면 거부하고 서버본 반환.
 * clientUpdatedAt 없으면 항상 저장(서버 now).
 */
export async function putUserShowcaseStyleBundle(
  userId: string,
  input: {
    editor?: unknown;
    live?: unknown;
    liveSource?: unknown;
    clientUpdatedAt?: string | null;
  }
): Promise<{ ok: true; bundle: ShowcaseStyleBundle } | { ok: false; conflict: true; bundle: ShowcaseStyleBundle }> {
  const existing = await getUserShowcaseStyleBundle(userId);
  const clientAtMs = input.clientUpdatedAt ? Date.parse(String(input.clientUpdatedAt)) : NaN;
  const serverAtMs = existing.updatedAt ? Date.parse(existing.updatedAt) : 0;

  if (
    Number.isFinite(clientAtMs) &&
    serverAtMs > 0 &&
    clientAtMs + 1500 < serverAtMs &&
    (existing.editor != null || existing.live != null)
  ) {
    return { ok: false, conflict: true, bundle: existing };
  }

  const nextUpdatedAt = Number.isFinite(clientAtMs)
    ? new Date(Math.max(clientAtMs, Date.now() - 1000))
    : new Date();

  const data: Prisma.UserUpdateInput = {
    showcaseStyleUpdatedAt: nextUpdatedAt
  };

  if (input.editor !== undefined) {
    const editor = asObjectOrNull(input.editor);
    if (editor) data.showcaseStyleJson = editor as Prisma.InputJsonValue;
  }
  if (input.live !== undefined) {
    if (input.live === null) {
      data.showcaseLiveStyleJson = Prisma.JsonNull;
    } else {
      const live = asObjectOrNull(input.live);
      if (live) data.showcaseLiveStyleJson = live as Prisma.InputJsonValue;
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

  const bundle = await getUserShowcaseStyleBundle(userId);
  return { ok: true, bundle };
}
