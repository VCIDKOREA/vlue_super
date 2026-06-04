/** `npm run seed:test-accounts` 로 생성되는 공식 테스트 ID */
const SEED_TEST_HANDLES = new Set(["test_free", "test_paid", "test_b2b"]);

export function isVlueSeedTestHandle(handle: string | null | undefined): boolean {
  return SEED_TEST_HANDLES.has(String(handle || "").trim().toLowerCase());
}
