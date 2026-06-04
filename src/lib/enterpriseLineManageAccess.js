import {
  fetchB2bEnterpriseMe,
  fetchB2bMembershipUiContext,
  fetchEnterpriseMembers
} from "./b2bEnterpriseApi.js";
import { isB2bMembershipKind, normalizeMembershipKind } from "./membershipBm.js";
import { getMemberHandle } from "./memberCardStorage.js";

export function readStoredEnterpriseRole() {
  try {
    return String(localStorage.getItem("vlue_enterprise_role") || "").trim().toUpperCase();
  } catch {
    return "";
  }
}

/** B2B 등급 + 대표(MASTER)·대리인(MANAGER) 여부 (로컬 캐시) */
export function mayManageEnterpriseLinesLocal(membershipTier) {
  const kind = normalizeMembershipKind(
    membershipTier || (typeof localStorage !== "undefined" ? localStorage.getItem("vlue_membership_kind") : "")
  );
  if (!isB2bMembershipKind(kind)) return false;
  const role = readStoredEnterpriseRole();
  return role === "MASTER" || role === "MANAGER";
}

function readStoredServerUserId() {
  try {
    return String(localStorage.getItem("vlue_server_user_id") || "").trim();
  } catch {
    return "";
  }
}

function matchesCurrentUser(member) {
  const myServerUserId = readStoredServerUserId();
  const myHandleNorm = String(getMemberHandle() || "")
    .trim()
    .replace(/^@/, "")
    .toUpperCase();

  const pickHandle = (v) => {
    if (v == null) return "";
    return String(v)
      .trim()
      .replace(/^@/, "")
      .toUpperCase();
  };

  const memberHandleNorm = pickHandle(
    member?.user?.publicHandle ||
      member?.publicHandle ||
      member?.user?.handle ||
      member?.handle ||
      member?.loginId ||
      member?.userHandle ||
      member?.userId ||
      ""
  );

  const memberUserId =
    member?.user?.userId || member?.user?.id || member?.user?.userId || member?.userId || member?.memberUserId || member?.linkedUserId;

  const idMatch = Boolean(
    myServerUserId && memberUserId != null && String(memberUserId).trim() === String(myServerUserId).trim()
  );

  const handleMatch = Boolean(myHandleNorm && memberHandleNorm && myHandleNorm === memberHandleNorm);

  // 서버가 publicHandle을 nested 대신 top-level로 내주는 케이스 대응
  const topHandleAlt = pickHandle(
    member?.publicHandle || member?.loginId || member?.handle || member?.user?.publicHandle || ""
  );
  const topHandleAltMatch = Boolean(myHandleNorm && topHandleAlt && myHandleNorm === topHandleAlt);

  return Boolean(handleMatch || topHandleAltMatch || idMatch);
}

function isManageRole(role) {
  const r = String(role || "").trim().toUpperCase();
  return r === "MASTER" || r === "MANAGER";
}

function readLocalEnterpriseHint() {
  try {
    const lineType = String(localStorage.getItem("vlue_line_type") || "").trim().toLowerCase();
    const kind = String(localStorage.getItem("vlue_membership_kind") || "").trim().toLowerCase();
    const role = readStoredEnterpriseRole();
    const roleEnterprise = role && role !== "NONE";
    return lineType === "enterprise" || lineType === "b2b" || kind === "b2b" || roleEnterprise;
  } catch {
    return false;
  }
}

/** 기업계정 여부 + 회선 관리 권한(MASTER/MANAGER) 동시 판정 */
export async function probeEnterpriseSidebarAccess(membershipTier) {
  const kind = normalizeMembershipKind(
    membershipTier || (typeof localStorage !== "undefined" ? localStorage.getItem("vlue_membership_kind") : "")
  );
  const localEnterprise = isB2bMembershipKind(kind) || readLocalEnterpriseHint();
  const localCanManage = mayManageEnterpriseLinesLocal(membershipTier);
  if (localCanManage) return { isEnterpriseMember: true, canManage: true };

  // 1) 기업 관리자(대표) — /enterprise/me 는 adminUserId === 본인일 때만 enterprise 반환
  try {
    const me = await fetchB2bEnterpriseMe();
    if (me?.enterprise) {
      return { isEnterpriseMember: true, canManage: true };
    }
  } catch {
    /* ignore */
  }

  // 2) 기업 귀속·브랜딩 적용 계정 (임직원 포함)
  try {
    const ui = await fetchB2bMembershipUiContext();
    if (ui?.corporate_active || ui?.override_by_company) {
      const role = readStoredEnterpriseRole();
      return {
        isEnterpriseMember: true,
        canManage: isManageRole(role)
      };
    }
  } catch {
    /* ignore */
  }

  // 3) members 목록 (대표·대리인만 조회 가능) — 성공 시 관리 권한 확정
  try {
    const members = await fetchEnterpriseMembers();
    return { isEnterpriseMember: true, canManage: true };
  } catch {
    /* ignore */
  }

  return { isEnterpriseMember: localEnterprise, canManage: localCanManage };
}

/** 레거시 호환: 회선 목록 관리 가능 여부만 필요할 때 */
export async function probeEnterpriseLineManageAccess(membershipTier) {
  const result = await probeEnterpriseSidebarAccess(membershipTier);
  return !!result.canManage;
}
