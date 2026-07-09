import { prisma } from "../../db/client.js";
import { isPaidMember } from "../membership/paidMemberGate.js";

const MAX_TAGS = 12;

/** @param {string} tag */
export function normalizeShowcaseTag(tag: string): string {
  const t = String(tag || "").trim();
  if (!t) return "";
  const withHash = t.startsWith("#") ? t : `#${t}`;
  return withHash.replace(/\s+/g, "").slice(0, 40);
}

/** @param {unknown} raw */
export function sanitizeShowcaseTags(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : String(raw || "").split(/[\s,]+/);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const tag = normalizeShowcaseTag(String(item));
    if (!tag || tag === "#") continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export async function userHasPaidMembership(userId: string): Promise<boolean> {
  const r = await isPaidMember(userId);
  return Boolean(r.ok);
}

export async function updateUserShowcaseTags(userId: string, tags: string[]): Promise<string[]> {
  const cleaned = sanitizeShowcaseTags(tags);
  const row = await prisma.user.update({
    where: { id: userId },
    data: { showcaseTags: cleaned },
    select: { showcaseTags: true }
  });
  return row.showcaseTags || [];
}

/**
 * #해시태그로 유료 회원 쇼케이스 검색 (홈 디렉토리)
 */
export async function searchUsersByShowcaseTag(query: string, limit = 24) {
  const tag = normalizeShowcaseTag(query);
  const bare = tag.replace(/^#/, "").toLowerCase();
  if (!bare) return [];

  const users = await prisma.user.findMany({
    where: {
      showcaseTags: { isEmpty: false }
    },
    select: {
      id: true,
      phoneE164: true,
      legalName: true,
      publicHandle: true,
      showcaseTags: true,
      businessProfile: { select: { companyName: true, jobTitle: true } },
      digitalCard: { select: { membershipTierSnapshot: true, exportSnapshotJson: true } }
    },
    take: 200
  });

  const matched = users.filter((u) =>
    (u.showcaseTags || []).some((t) => {
      const n = String(t).toLowerCase().replace(/^#/, "");
      return n === bare || n.includes(bare) || bare.includes(n);
    })
  );

  return matched.slice(0, limit).map((u) => {
    const snap =
      u.digitalCard?.exportSnapshotJson && typeof u.digitalCard.exportSnapshotJson === "object"
        ? (u.digitalCard.exportSnapshotJson as Record<string, unknown>)
        : {};
    return {
      userId: u.id,
      phone: u.phoneE164 || String(snap.phone || ""),
      name: u.legalName || String(snap.name || ""),
      organization: u.businessProfile?.companyName || String(snap.organization || ""),
      title: u.businessProfile?.jobTitle || String(snap.title || ""),
      logoUrl: String(snap.logoUrl || ""),
      tags: u.showcaseTags || [],
      membershipTier: u.digitalCard?.membershipTierSnapshot || "free"
    };
  });
}
