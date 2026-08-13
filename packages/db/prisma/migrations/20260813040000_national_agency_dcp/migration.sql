-- 국가기관 디지털인증프로필(DCP) 화이트리스트
CREATE TABLE IF NOT EXISTS "national_agency_profiles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "short_number" VARCHAR(16) NOT NULL,
  "agency_name" VARCHAR(160) NOT NULL,
  "official_website" VARCHAR(255) NOT NULL,
  "logo_url" VARCHAR(1024) NOT NULL DEFAULT '',
  "logo_resource_name" VARCHAR(80) NOT NULL DEFAULT '',
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "route_status" VARCHAR(16) NOT NULL DEFAULT 'normal',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "national_agency_profiles_short_number_key"
  ON "national_agency_profiles" ("short_number");

CREATE INDEX IF NOT EXISTS "national_agency_profiles_enabled_sort_idx"
  ON "national_agency_profiles" ("enabled", "sort_order");
