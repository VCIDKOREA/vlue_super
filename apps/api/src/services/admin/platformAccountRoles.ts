/**
 * VLUE 플랫폼 고정 계정 역할·권한 매핑 (UI 없음 — 시드/미들웨어 기준)
 *
 * 1) admin  — 마스터 관리자 (시스템 관제, role=admin)
 * 2) ceo    — 대표 개인 Premium 회원 (role=user, 유료 티어) — 관리 콘솔/HQ 접근 불가
 */

export const PLATFORM_MASTER_ADMIN = Object.freeze({
  handle: "admin",
  /** 통합 시스템 관리 — 전체 데이터·알림톡/결제 로그·V1 출시 스위치 */
  role: "admin",
  label: "마스터 관리자",
  accountKind: "master_system_admin"
});

export const PLATFORM_CEO_MEMBER = Object.freeze({
  handle: "ceo",
  email: "ceo@vlue.kr",
  phoneE164: "+821080144666",
  /** 서비스 최고 등급 유저 — 관리자 아님 */
  role: "user",
  membershipTier: "paid",
  label: "대표경영자(개인)",
  accountKind: "ceo_premium_member",
  /** 가족보호 기본 최대(본인+3) — FAMILY_BASE_MAX_MEMBERS 와 정합 */
  familyProtectionMaxMembers: 4
});

/** 마스터 전용 기능 키 — 라우트/미들웨어에서 고정 매핑 */
export const MasterCapability = Object.freeze({
  VIEW_ALL_SYSTEM_DATA: "VIEW_ALL_SYSTEM_DATA",
  MONITOR_ALIMTALK_LOGS: "MONITOR_ALIMTALK_LOGS",
  MONITOR_PAYMENT_LOGS: "MONITOR_PAYMENT_LOGS",
  MANAGE_V1_RELEASE_SWITCH: "MANAGE_V1_RELEASE_SWITCH"
});

export type MasterCapabilityKey = (typeof MasterCapability)[keyof typeof MasterCapability];

const MASTER_CAPABILITY_SET = new Set<string>(Object.values(MasterCapability));

export type PlatformUserRef = {
  role?: string | null;
  publicHandle?: string | null;
  phoneE164?: string | null;
  accountStatus?: string | null;
  status?: string | null;
};

function normalizeHandle(raw: string | null | undefined): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
}

/** env SUPER_ADMIN_HANDLES CSV — 기본값은 admin */
export function masterAdminHandles(): string[] {
  const fromEnv = String(process.env.SUPER_ADMIN_HANDLES || process.env.VLUE_MASTER_ADMIN_HANDLES || "")
    .split(",")
    .map((s) => normalizeHandle(s))
    .filter(Boolean);
  if (fromEnv.length) return [...new Set(fromEnv)];
  return [PLATFORM_MASTER_ADMIN.handle];
}

export function isPlatformCeoHandle(handle: string | null | undefined): boolean {
  return normalizeHandle(handle) === PLATFORM_CEO_MEMBER.handle;
}

export function isPlatformMasterAdminHandle(handle: string | null | undefined): boolean {
  const h = normalizeHandle(handle);
  return Boolean(h) && masterAdminHandles().includes(h);
}

/**
 * 마스터 시스템 관리자 — role=admin 이고 고정 핸들(admin) 또는 SUPER_ADMIN_HANDLES.
 * ceo 는 절대 true 가 되면 안 됨.
 */
export function isMasterSystemAdmin(user: PlatformUserRef | null | undefined): boolean {
  if (!user) return false;
  if (isPlatformCeoHandle(user.publicHandle)) return false;
  if (user.status === "DELETED") return false;
  if (user.accountStatus === "suspended") return false;

  const handle = normalizeHandle(user.publicHandle);
  if (!isPlatformMasterAdminHandle(handle)) return false;

  if (user.role === "admin") return true;

  const masterPhone = String(process.env.ADMIN_MASTER_PHONE_E164 || "").trim();
  if (masterPhone && user.phoneE164 === masterPhone) return true;

  return false;
}

/** 마스터 전용 기능 보유 여부 */
export function hasMasterCapability(
  user: PlatformUserRef | null | undefined,
  capability: MasterCapabilityKey | string
): boolean {
  if (!MASTER_CAPABILITY_SET.has(capability)) return false;
  return isMasterSystemAdmin(user);
}

export function listMasterCapabilities(
  user: PlatformUserRef | null | undefined
): MasterCapabilityKey[] {
  if (!isMasterSystemAdmin(user)) return [];
  return Object.values(MasterCapability) as MasterCapabilityKey[];
}

/** 대표 개인 계정은 관리 콘솔·HQ 로그인 거부 */
export function denyAdminAccessReasonForUser(user: PlatformUserRef | null | undefined): string | null {
  if (isPlatformCeoHandle(user?.publicHandle)) {
    return "대표 개인 계정(ceo)은 서비스 회원용입니다. 시스템 관리(admin)와 역할이 분리되어 있습니다.";
  }
  return null;
}
