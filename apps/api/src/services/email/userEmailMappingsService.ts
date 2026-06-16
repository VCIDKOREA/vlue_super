import { prisma } from "../../db/client.js";
import { userHasPremiumTier } from "../../middleware/cardGate.js";
import {
  addMasterTarget,
  findMappingByFullVirtualEmailExceptUser,
  findMappingByUserId,
  listMasterTargets,
  type MembershipStatus,
  type UserEmailMappingRow,
  setPrimaryMasterTarget,
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
    .replace(/^@+/, "")
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

export async function resolveUserLoginPrefix(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { publicHandle: true }
  });
  const prefix = normalizeEmailPrefix(user?.publicHandle || "");
  if (!prefix || prefix.length < 2 || !PREFIX_RE.test(prefix)) {
    throw new Error("LOGIN_ID_REQUIRED");
  }
  return prefix;
}

function mapMasterTargetsForApi(rows: Awaited<ReturnType<typeof listMasterTargets>>) {
  return rows.map((row) => ({
    email: row.email,
    isPrimary: Boolean(row.is_primary),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  }));
}

export function mapRowForApi(
  row: UserEmailMappingRow | null,
  isPremium: boolean,
  loginPrefix: string,
  masterTargets: Awaited<ReturnType<typeof listMasterTargets>> = []
) {
  const masters = mapMasterTargetsForApi(masterTargets);
  const primary = masters.find((m) => m.isPrimary)?.email || row?.target_master_email || null;

  if (!row) {
    return {
      configured: false,
      membershipStatus: isPremium ? "PREMIUM" : "FREE",
      loginPrefix,
      virtualEmailPrefix: loginPrefix,
      userCompanySlug: null,
      fullVirtualEmail: loginPrefix ? buildFullVirtualEmail(loginPrefix, null) : null,
      targetMasterEmail: primary,
      masterEmails: masters,
      addressKind: "standard" as AddressKind
    };
  }
  return {
    configured: true,
    membershipStatus: row.membership_status,
    loginPrefix,
    virtualEmailPrefix: row.virtual_email_prefix,
    userCompanySlug: row.user_company_slug,
    fullVirtualEmail: row.full_virtual_email,
    targetMasterEmail: primary,
    masterEmails: masters,
    addressKind: row.user_company_slug ? ("brand" as AddressKind) : ("standard" as AddressKind),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

export async function getUserEmailMapping(userId: string) {
  const isPremium = (await resolveMembershipStatus(userId)) === "PREMIUM";
  let loginPrefix = "";
  try {
    loginPrefix = await resolveUserLoginPrefix(userId);
  } catch {
    loginPrefix = "";
  }
  const row = await findMappingByUserId(userId);
  let masterTargets = await listMasterTargets(userId);
  if (masterTargets.length === 0 && row?.target_master_email) {
    await addMasterTarget(userId, row.target_master_email, true);
    masterTargets = await listMasterTargets(userId);
  }
  return { mapping: mapRowForApi(row, isPremium, loginPrefix, masterTargets), isPremium };
}

function assertValidMasterEmail(email: string) {
  if (!email || !EMAIL_RE.test(email)) {
    throw new Error("INVALID_MASTER_EMAIL");
  }
}

export async function saveVirtualEmailMapping(
  userId: string,
  input: {
    addressKind: AddressKind;
    userCompanySlug?: string | null;
  }
) {
  const membershipStatus = await resolveMembershipStatus(userId);
  const prefix = await resolveUserLoginPrefix(userId);

  let companySlug: string | null = null;
  if (input.addressKind === "brand") {
    if (membershipStatus !== "PREMIUM") {
      throw new Error("PREMIUM_REQUIRED");
    }
    companySlug = normalizeCompanySlug(input.userCompanySlug || "");
    if (!companySlug || !SLUG_RE.test(companySlug)) {
      throw new Error("INVALID_COMPANY_SLUG");
    }
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

  const masterTargets = await listMasterTargets(userId);
  return mapRowForApi(row, membershipStatus === "PREMIUM", prefix, masterTargets);
}

export async function addUserMasterEmail(userId: string, targetMasterEmail: string) {
  const email = String(targetMasterEmail || "").trim().toLowerCase();
  assertValidMasterEmail(email);

  let existing = await findMappingByUserId(userId);
  if (!existing) {
    const membershipStatus = await resolveMembershipStatus(userId);
    const prefix = await resolveUserLoginPrefix(userId);
    existing = await upsertUserEmailMapping({
      userId,
      membershipStatus,
      virtualEmailPrefix: prefix,
      userCompanySlug: null,
      fullVirtualEmail: buildFullVirtualEmail(prefix, null),
      targetMasterEmail: null
    });
  }

  const targets = await listMasterTargets(userId);
  const setPrimary = targets.length === 0;
  await addMasterTarget(userId, email, setPrimary);
  if (setPrimary) {
    await updateTargetMasterEmail(userId, email);
  }

  const isPremium = (await resolveMembershipStatus(userId)) === "PREMIUM";
  const loginPrefix = await resolveUserLoginPrefix(userId);
  const row = await findMappingByUserId(userId);
  const masterTargets = await listMasterTargets(userId);
  return mapRowForApi(row, isPremium, loginPrefix, masterTargets);
}

export async function setUserPrimaryMasterEmail(userId: string, targetMasterEmail: string) {
  const email = String(targetMasterEmail || "").trim().toLowerCase();
  assertValidMasterEmail(email);

  const existing = await findMappingByUserId(userId);
  if (!existing) {
    throw new Error("MAPPING_NOT_CONFIGURED");
  }

  const updated = await setPrimaryMasterTarget(userId, email);
  if (!updated) {
    throw new Error("MASTER_EMAIL_NOT_FOUND");
  }

  const row = await updateTargetMasterEmail(userId, email);
  if (!row) throw new Error("MAPPING_NOT_CONFIGURED");

  const isPremium = (await resolveMembershipStatus(userId)) === "PREMIUM";
  const loginPrefix = await resolveUserLoginPrefix(userId);
  const masterTargets = await listMasterTargets(userId);
  return mapRowForApi(row, isPremium, loginPrefix, masterTargets);
}
