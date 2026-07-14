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
  const { markShowcaseActiveIfEligible } = await import("./SearchService.js");
  await markShowcaseActiveIfEligible(userId);
  return row.showcaseTags || [];
}

/**
 * @deprecated Use SearchService.searchByHashtag — 마스킹·권한 필터 포함
 * 하위 호환 래퍼 (평문 PII 미반환)
 */
export async function searchUsersByShowcaseTag(query: string, limit = 24) {
  const { searchByHashtag } = await import("./SearchService.js");
  const items = await searchByHashtag(query, limit);
  return items.map((hit) => ({
    userId: hit.userId,
    phone: hit.phone,
    name: hit.displayName,
    organization: hit.organization,
    title: hit.title,
    logoUrl: hit.logoUrl,
    tags: hit.tags,
    membershipTier: hit.membershipTier,
    phoneVisible: hit.phoneVisible,
    nameVisible: hit.nameVisible,
    idInquiryEnabled: hit.idInquiryEnabled,
    publicHandle: hit.publicHandle,
    privacy: hit.privacy
  }));
}
