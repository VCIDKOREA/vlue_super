/** B2B 회선·계정 역할 — 가입·회선 등록 시 대표가 지정 */

export const ENTERPRISE_LINE_ROLES = [
  { id: "STAFF", label: "일반 직원", hint: "채팅·자료실·구매 요청" },
  { id: "BUYER", label: "경리·구매", hint: "회사 예산·법인카드 결제" },
  { id: "MANAGER", label: "대리인·관리", hint: "대표 권한 대행·기기 승인" }
];

export const ENTERPRISE_ROLE_LABELS = {
  STAFF: "일반 직원",
  BUYER: "경리·구매",
  MANAGER: "대리인",
  MASTER: "대표"
};

export function normalizeEnterpriseRole(role) {
  return ["STAFF", "BUYER", "MANAGER"].includes(role) ? role : "STAFF";
}

/** 경리·대리인은 회선당 1명씩만 */
export function normalizeLineEnterpriseRoles(lines) {
  const list = (lines || []).map((row) => ({
    ...row,
    enterpriseRole: ["STAFF", "BUYER", "MANAGER"].includes(row.enterpriseRole) ? row.enterpriseRole : "STAFF"
  }));
  let buyerSet = false;
  let managerSet = false;
  return list.map((row) => {
    if (row.enterpriseRole === "BUYER") {
      if (buyerSet) return { ...row, enterpriseRole: "STAFF" };
      buyerSet = true;
      return row;
    }
    if (row.enterpriseRole === "MANAGER") {
      if (managerSet) return { ...row, enterpriseRole: "STAFF" };
      managerSet = true;
      return row;
    }
    return row;
  });
}

export function validateLineEnterpriseRoles(lines) {
  const normalized = normalizeLineEnterpriseRoles(lines);
  const buyers = normalized.filter((r) => r.enterpriseRole === "BUYER").length;
  const managers = normalized.filter((r) => r.enterpriseRole === "MANAGER").length;
  if (buyers > 1) return { ok: false, message: "경리·구매 담당은 1명만 지정할 수 있습니다." };
  if (managers > 1) return { ok: false, message: "대리인·관리자는 1명만 지정할 수 있습니다." };
  return { ok: true, lines: normalized };
}

export function pickLineRoleOnChange(lines, lineId, nextRole) {
  const role = ["STAFF", "BUYER", "MANAGER"].includes(nextRole) ? nextRole : "STAFF";
  const mapped = lines.map((row) => {
    if (row.id !== lineId) {
      if (role === "BUYER" && row.enterpriseRole === "BUYER") return { ...row, enterpriseRole: "STAFF" };
      if (role === "MANAGER" && row.enterpriseRole === "MANAGER") return { ...row, enterpriseRole: "STAFF" };
      return row;
    }
    return { ...row, enterpriseRole: role };
  });
  return normalizeLineEnterpriseRoles(mapped);
}
