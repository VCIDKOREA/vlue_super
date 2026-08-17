import { prisma } from "../../db/client.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";
import { formatPhoneDisplayKR } from "../../lib/phoneDisplay.js";

const DEDUP_MS = 90_000;
const HISTORY_LIMIT = 300;
const NAME_BATCH_MAX = 80;

function firstStr(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function snapName(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const o = json as Record<string, unknown>;
  return firstStr(o.name, o.displayName);
}

export async function recordOverlayLineCallEvent(opts: {
  viewerId: string;
  number: string;
  direction?: string;
}): Promise<{ ok: true; recorded: boolean; skipped?: string }> {
  const viewerId = String(opts.viewerId || "").trim();
  const e164 = normalizeToE164KR(opts.number);
  if (!viewerId || !e164) return { ok: true, recorded: false, skipped: "invalid" };

  const card = await prisma.businessCard.findFirst({
    where: { phoneE164: e164 },
    select: { id: true, userId: true, phoneE164: true }
  });
  const ownerUserId = card?.userId
    ? card.userId
    : (
        await prisma.user.findFirst({
          where: { phoneE164: e164 },
          select: { id: true }
        })
      )?.id;
  if (!ownerUserId) return { ok: true, recorded: false, skipped: "unmatched" };
  if (ownerUserId === viewerId) return { ok: true, recorded: false, skipped: "self" };

  const since = new Date(Date.now() - DEDUP_MS);
  const dup = await prisma.lineCallEvent.findFirst({
    where: {
      ownerUserId,
      linePhoneE164: e164,
      peerUserId: viewerId,
      createdAt: { gte: since }
    },
    select: { id: true }
  });
  if (dup) return { ok: true, recorded: false, skipped: "dedup" };

  const viewer = await prisma.user.findUnique({
    where: { id: viewerId },
    select: {
      phoneE164: true,
      legalName: true,
      digitalCard: {
        select: {
          displayName: true,
          membershipTierSnapshot: true,
          exportSnapshotJson: true
        }
      }
    }
  });
  const peerPhone = String(viewer?.phoneE164 || "").trim();
  if (!peerPhone) return { ok: true, recorded: false, skipped: "no_peer_phone" };

  const exportSnap =
    viewer?.digitalCard?.exportSnapshotJson && typeof viewer.digitalCard.exportSnapshotJson === "object"
      ? (viewer.digitalCard.exportSnapshotJson as Record<string, unknown>)
      : null;
  const peerName = firstStr(exportSnap?.name, viewer?.digitalCard?.displayName, viewer?.legalName);
  const tier = String(viewer?.digitalCard?.membershipTierSnapshot || "").trim() || "free";

  await prisma.lineCallEvent.create({
    data: {
      ownerUserId,
      lineCardId: card?.id || null,
      linePhoneE164: e164,
      peerUserId: viewerId,
      peerPhoneE164: peerPhone,
      peerDisplayName: peerName.slice(0, 120),
      peerIsVlueMember: true,
      peerMembershipTier: tier.slice(0, 24) || "free",
      direction: opts.direction === "out" ? "out" : "in",
      durationSec: 0
    }
  });
  return { ok: true, recorded: true };
}

export async function listOwnerLineCallEvents(ownerUserId: string, linePhoneE164?: string | null) {
  const lineFilter = linePhoneE164 ? normalizeToE164KR(linePhoneE164) : null;
  const rows = await prisma.lineCallEvent.findMany({
    where: {
      ownerUserId,
      ...(lineFilter ? { linePhoneE164: lineFilter } : {})
    },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: {
      id: true,
      lineCardId: true,
      linePhoneE164: true,
      peerPhoneE164: true,
      peerDisplayName: true,
      peerIsVlueMember: true,
      peerMembershipTier: true,
      peerUserId: true,
      direction: true,
      durationSec: true,
      createdAt: true
    }
  });
  return rows.map((row) => ({
    id: `line-${row.id}`,
    source: "line" as const,
    lineId: row.lineCardId || "",
    linePhoneE164: row.linePhoneE164,
    phone: row.peerPhoneE164,
    phoneDisplay: formatPhoneDisplayKR(row.peerPhoneE164),
    name: String(row.peerDisplayName || "").trim(),
    memberName: row.peerIsVlueMember ? String(row.peerDisplayName || "").trim() : "",
    direction: row.direction === "out" ? "out" : "in",
    durationSec: row.durationSec,
    endedAt: row.createdAt.toISOString(),
    dateMs: row.createdAt.getTime(),
    verified: row.peerIsVlueMember,
    membershipTier: row.peerMembershipTier || (row.peerIsVlueMember ? "free" : null),
    userId: row.peerUserId || "",
    callState: "ended"
  }));
}

export async function lookupMemberNamesByNumbers(rawNumbers: string[]) {
  const e164s = [
    ...new Set(
      (Array.isArray(rawNumbers) ? rawNumbers : [])
        .map((n) => normalizeToE164KR(String(n || "")))
        .filter((n): n is string => Boolean(n))
    )
  ].slice(0, NAME_BATCH_MAX);
  if (!e164s.length) return { members: [] as Array<Record<string, unknown>> };

  const [cards, users] = await Promise.all([
    prisma.businessCard.findMany({
      where: { phoneE164: { in: e164s }, verificationStatus: "approved" },
      select: {
        phoneE164: true,
        displayName: true,
        dccSnapshotJson: true,
        userId: true,
        user: {
          select: {
            legalName: true,
            digitalCard: { select: { displayName: true, membershipTierSnapshot: true, photoUrl: true } }
          }
        }
      }
    }),
    prisma.user.findMany({
      where: {
        phoneE164: { in: e164s },
        OR: [{ identityVerified: true }, { digitalCard: { isNot: null } }]
      },
      select: {
        id: true,
        phoneE164: true,
        legalName: true,
        digitalCard: { select: { displayName: true, membershipTierSnapshot: true, photoUrl: true } }
      }
    })
  ]);

  const byPhone = new Map<string, Record<string, unknown>>();
  for (const u of users) {
    const phone = String(u.phoneE164 || "").trim();
    if (!phone) continue;
    byPhone.set(phone, {
      phoneE164: phone,
      phoneDisplay: formatPhoneDisplayKR(phone),
      name: firstStr(u.digitalCard?.displayName, u.legalName),
      userId: u.id,
      verified: true,
      membershipTier: String(u.digitalCard?.membershipTierSnapshot || "free"),
      avatarUrl: String(u.digitalCard?.photoUrl || "").trim()
    });
  }
  for (const c of cards) {
    const phone = String(c.phoneE164 || "").trim();
    if (!phone) continue;
    const prev = byPhone.get(phone) || {};
    byPhone.set(phone, {
      phoneE164: phone,
      phoneDisplay: formatPhoneDisplayKR(phone),
      name: firstStr(snapName(c.dccSnapshotJson), c.displayName, prev.name as string, c.user?.legalName),
      userId: c.userId || prev.userId,
      verified: true,
      membershipTier: String(
        c.user?.digitalCard?.membershipTierSnapshot || prev.membershipTier || "free"
      ),
      avatarUrl: String(c.user?.digitalCard?.photoUrl || prev.avatarUrl || "").trim()
    });
  }

  return { members: [...byPhone.values()].filter((m) => String(m.name || "").trim()) };
}
