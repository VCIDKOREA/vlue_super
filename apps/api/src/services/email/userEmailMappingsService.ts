import { userHasPremiumTier } from "../../middleware/cardGate.js";
import {
  findMappingByFullVirtualEmailExceptUser,
  findMappingByUserId,
  type MembershipStatus,
  type UserEmailMappingRow,
  updateTargetMasterEmail,
  upsertUserEmailMapping
} from "./userEmailMappingsStore.js";

const PREFIX_RE = /^[a-z0-9](?:[a-z0-9._-]{1,62}[a-z0-9])?$/i;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AddressKind = "standard" | "brand";

export function normalizeEmailPrefix(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/@.*$/, "");
}

export function normalizeCompanySlug(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function buildFullVirtualEmail(prefix: string, companySlug: string | null): string {
  const p = normalizeEmailPrefix(prefix);
  if (companySlug) {
    const slug = normalizeCompanySlug(companySlug);
    return `${p}@${slug}.vlue.kr`;
  }
  return `${p}@vlue.kr`;
}

export async function resolveMembershipStatus(userId: string): Promise<MembershipStatus> {
  const premium = await userHasPremiumTier(userId);
  return premium ? "PREMIUM" : "FREE";
}

export function mapRowForApi(row: UserEmailMappingRow | null, isPremium: boolean) {
  if (!row) {
    return {
      configured: false,
      membershipStatus: isPremium ? "PREMIUM" : "FREE",
      virtualEmailPrefix: "",
      userCompanySlug: null,
      fullVirtualEmail: null,
      targetMasterEmail: null,
      addressKind: "standard" as AddressKind
    };
  }
  return {
    configured: true,
    membershipStatus: row.membership_status,
    virtualEmailPrefix: row.virtual_email_prefix,
    userCompanySlug: row.user_company_slug,
    fullVirtualEmail: row.full_virtual_email,
    targetMasterEmail: row.target_master_email,
    addressKind: row.user_company_slug ? ("brand" as AddressKind) : ("standard" as AddressKind),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

export async function getUserEmailMapping(userId: string) {
  const isPremium = (await resolveMembershipStatus(userId)) === "PREMIUM";
  const row = await findMappingByUserId(userId);
  return { mapping: mapRowForApi(row, isPremium), isPremium };
}

function assertValidPrefix(prefix: string) {
  if (!prefix || prefix.length < 2 || prefix.length > 64) {
    throw new Error("INVALID_PREFIX");
  }
  if (!PREFIX_RE.test(prefix)) {
    throw new Error("INVALID_PREFIX");
  }
}

function assertValidMasterEmail(email: string) {
  if (!email || !EMAIL_RE.test(email)) {
    throw new Error("INVALID_MASTER_EMAIL");
  }
}

export async function saveVirtualEmailMapping(
  userId: string,
  input: {
    virtualEmailPrefix: string;
    addressKind: AddressKind;
    userCompanySlug?: string | null;
  }
) {
  const membershipStatus = await resolveMembershipStatus(userId);
  const prefix = normalizeEmailPrefix(input.virtualEmailPrefix);
  assertValidPrefix(prefix);

  let companySlug: string | null = null;
  if (input.addressKind === "brand") {
    if (membershipStatus !== "PREMIUM") {
      throw new Error("PREMIUM_REQUIRED");
    }
    companySlug = normalizeCompanySlug(input.userCompanySlug || "");
    if (!companySlug || !SLUG_RE.test(companySlug)) {
      throw new Error("INVALID_COMPANY_SLUG");
    }
  } else if (membershipStatus === "FREE") {
    companySlug = null;
  }

  const fullVirtualEmail = buildFullVirtualEmail(prefix, companySlug);
  const conflict = await findMappingByFullVirtualEmailExceptUser(fullVirtualEmail, userId);
  if (conflict) {
    throw new Error("EMAIL_ALREADY_TAKEN");
  }

  const existing = await findMappingByUserId(userId);
  const row = await upsertUserEmailMapping({
    userId,
    membershipStatus,
    virtualEmailPrefix: prefix,
    userCompanySlug: companySlug,
    fullVirtualEmail,
    targetMasterEmail: existing?.target_master_email ?? null
  });

  return mapRowForApi(row, membershipStatus === "PREMIUM");
}

export async function saveTargetMasterEmail(userId: string, targetMasterEmail: string) {
  const email = String(targetMasterEmail || "").trim().toLowerCase();
  assertValidMasterEmail(email);

  const existing = await findMappingByUserId(userId);
  if (!existing) {
    throw new Error("MAPPING_NOT_CONFIGURED");
  }

  const row = await updateTargetMasterEmail(userId, email);
  if (!row) throw new Error("MAPPING_NOT_CONFIGURED");

  const isPremium = (await resolveMembershipStatus(userId)) === "PREMIUM";
  return mapRowForApi(row, isPremium);
}
