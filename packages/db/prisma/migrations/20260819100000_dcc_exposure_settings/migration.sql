-- DCC 검색·팔로우 주소 노출 + 노출설정 지정 여부

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_address_search_allowed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_address_followers_allowed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "dcc_exposure_configured" BOOLEAN NOT NULL DEFAULT false;
