-- Public directory (학교·우체국·공공기관·경찰·상권) for safe-call popup + VLUE search
CREATE TABLE IF NOT EXISTS "public_directory_entries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_kind" VARCHAR(32) NOT NULL,
  "external_id" VARCHAR(80) NOT NULL DEFAULT '',
  "display_name" VARCHAR(240) NOT NULL,
  "name_norm" VARCHAR(240) NOT NULL,
  "phone_e164" VARCHAR(24) NOT NULL DEFAULT '',
  "phone_digits" VARCHAR(24) NOT NULL DEFAULT '',
  "business_number" VARCHAR(16) NOT NULL DEFAULT '',
  "category" VARCHAR(120) NOT NULL DEFAULT '',
  "address" VARCHAR(400) NOT NULL DEFAULT '',
  "region" VARCHAR(40) NOT NULL DEFAULT '',
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "source_file" VARCHAR(255) NOT NULL DEFAULT '',
  "meta_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "public_directory_entries_source_ext_uid"
  ON "public_directory_entries" ("source_kind", "external_id");

CREATE INDEX IF NOT EXISTS "public_directory_entries_phone_e164_idx"
  ON "public_directory_entries" ("phone_e164");

CREATE INDEX IF NOT EXISTS "public_directory_entries_phone_digits_idx"
  ON "public_directory_entries" ("phone_digits");

CREATE INDEX IF NOT EXISTS "public_directory_entries_display_name_idx"
  ON "public_directory_entries" ("display_name");

CREATE INDEX IF NOT EXISTS "public_directory_entries_name_norm_idx"
  ON "public_directory_entries" ("name_norm");

CREATE INDEX IF NOT EXISTS "public_directory_entries_biz_no_idx"
  ON "public_directory_entries" ("business_number");

CREATE INDEX IF NOT EXISTS "public_directory_entries_kind_region_idx"
  ON "public_directory_entries" ("source_kind", "region");

-- Prefix / contains search acceleration (pg_trgm). Safe if extension missing: ignore.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX IF NOT EXISTS "public_directory_entries_name_norm_trgm_idx"
    ON "public_directory_entries" USING gin ("name_norm" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS "public_directory_entries_display_name_trgm_idx"
    ON "public_directory_entries" USING gin ("display_name" gin_trgm_ops);
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm indexes skipped: %', SQLERRM;
END $$;
