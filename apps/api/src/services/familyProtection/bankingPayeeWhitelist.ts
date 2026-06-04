import { prisma } from "../../db/client.js";
import { getGuardianChildLinks } from "./familyProtectionSettingsHelper.js";

const FAMILY_RELATION_LABEL: Record<string, string> = {
  parent: "부모",
  child: "자녀"
};

export type PayeeWhitelistScopes = {
  knownPayees?: string[];
};

export function normalizePayeeKey(name?: string | null, masked?: string | null): string {
  return String(name || masked || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

/** 동의 scopes + 활성 가족 연결(보호자·피보호자 표시명) 화이트리스트 */
export async function collectKnownPayeeKeysForWard(
  wardUserId: string,
  scopes?: PayeeWhitelistScopes
): Promise<string[]> {
  const keys = new Set<string>();

  for (const k of scopes?.knownPayees || []) {
    const n = normalizePayeeKey(k);
    if (n) keys.add(n);
  }

  const links = await getGuardianChildLinks(wardUserId);
  const userIds = new Set<string>([wardUserId]);
  for (const link of links) {
    userIds.add(link.guardianUserId);
    userIds.add(link.wardUserId);
    const rel = FAMILY_RELATION_LABEL[link.familyRelation] || link.familyRelation;
    const relKey = normalizePayeeKey(rel);
    if (relKey) keys.add(relKey);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: { legalName: true, nickFeed: true, publicHandle: true }
  });

  for (const u of users) {
    for (const field of [u.legalName, u.nickFeed, u.publicHandle]) {
      const n = normalizePayeeKey(field);
      if (n) keys.add(n);
    }
  }

  return [...keys];
}

export function matchPayeeAgainstWhitelist(
  counterpartyName: string | null | undefined,
  counterpartyMasked: string | null | undefined,
  knownKeys: string[]
): boolean {
  const key = normalizePayeeKey(counterpartyName, counterpartyMasked);
  if (!key) return false;
  if (!knownKeys.length) return false;
  return knownKeys.some((k) => k && (key.includes(k) || k.includes(key)));
}

/**
 * 미등록 상대 여부 — explicit 우선, 없으면 화이트리스트 대조
 */
export async function resolveIsUnknownPayeeForWard(
  wardUserId: string,
  counterpartyName: string | null | undefined,
  counterpartyMasked: string | null | undefined,
  scopes?: PayeeWhitelistScopes,
  explicit?: boolean
): Promise<boolean> {
  if (explicit === true) return true;
  if (explicit === false) return false;

  const key = normalizePayeeKey(counterpartyName, counterpartyMasked);
  if (!key) return true;

  const knownKeys = await collectKnownPayeeKeysForWard(wardUserId, scopes);
  if (!knownKeys.length) return true;

  return !matchPayeeAgainstWhitelist(counterpartyName, counterpartyMasked, knownKeys);
}
