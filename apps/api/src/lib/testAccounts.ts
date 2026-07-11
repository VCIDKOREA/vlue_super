/** `npm run seed:test-accounts` 로 생성되는 공식 테스트 ID */
const SEED_TEST_HANDLES = new Set(["test_free", "test_paid", "test_b2b"]);

/** `npm run seed:platform-accounts` — 마스터 admin · 대표 ceo */
const PLATFORM_BOOTSTRAP_HANDLES = new Set(["admin", "ceo"]);

export function isVlueSeedTestHandle(handle: string | null | undefined): boolean {
  return SEED_TEST_HANDLES.has(String(handle || "").trim().toLowerCase());
}

export function isPlatformBootstrapHandle(handle: string | null | undefined): boolean {
  return PLATFORM_BOOTSTRAP_HANDLES.has(String(handle || "").trim().toLowerCase());
}

/** QA·플랫폼 고정 계정 — 신규 기기 로그인 시 즉시 승인 */
export function isDeviceAutoApproveHandle(handle: string | null | undefined): boolean {
  return isVlueSeedTestHandle(handle) || isPlatformBootstrapHandle(handle);
}
