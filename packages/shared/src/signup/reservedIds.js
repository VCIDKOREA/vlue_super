/** @vlue.kr 가상 메일·VLUE ID 사칭 방지 예약어 */
export const RESERVED_IDS = [
  "admin",
  "administrator",
  "root",
  "master",
  "webmaster",
  "sysadmin",
  "ceo",
  "cto",
  "cfo",
  "coo",
  "owner",
  "president",
  "vlue",
  "vluecorp",
  "official",
  "manager",
  "operator",
  "staff",
  "team",
  "support",
  "help",
  "contact",
  "info",
  "service",
  "cs",
  "billing",
  "account",
  "security",
  "privacy",
  "abuse",
  "jobs",
  "careers",
  "test",
  "tester",
  "sample",
  "demo",
  "api",
  "dev",
  "developer",
  "mail",
  "email",
  "postmaster",
  "status",
  "welcome",
  "noreply"
];

export const RESERVED_ID_MESSAGE =
  "사칭 방지 및 회원 보호를 위해 사용할 수 없는 아이디입니다.";

export const VIRTUAL_ID_CONFLICT_MESSAGE =
  "이미 사용 중이거나 사용할 수 없는 주소입니다. 나만의 다른 비즈니스 메일 ID를 지정해 주세요.";

const RESERVED_SET = new Set(RESERVED_IDS);

export function normalizeReservedIdCheck(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_]/g, "");
}

export function isReservedId(raw) {
  const id = normalizeReservedIdCheck(raw);
  if (!id) return false;
  return RESERVED_SET.has(id);
}
