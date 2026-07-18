-- 실명 검색과 상호 검색 허용 플래그 분리
-- 기존 is_name_search_allowed=true 사용자는 상호도 허용으로 이관해 동작 유지

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_org_search_allowed" BOOLEAN NOT NULL DEFAULT false;

UPDATE "users"
SET "is_org_search_allowed" = true
WHERE "is_name_search_allowed" = true
  AND "is_org_search_allowed" = false;
