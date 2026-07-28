-- 50k slim sync — DigitalCard 메타 컬럼 + ShowcaseCase.style_url
-- 적용: psql $DATABASE_URL -f packages/db/prisma/migrations/20260728_slim_sync_meta.sql

ALTER TABLE digital_cards
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS organization VARCHAR(200),
  ADD COLUMN IF NOT EXISTS title_snapshot VARCHAR(120),
  ADD COLUMN IF NOT EXISTS department_snapshot VARCHAR(120),
  ADD COLUMN IF NOT EXISTS activity_name VARCHAR(80);

ALTER TABLE showcase_cases
  ADD COLUMN IF NOT EXISTS style_url TEXT;

-- 기존 스냅에서 메타 백필 (data: URL 제외)
UPDATE digital_cards SET
  photo_url = NULLIF(TRIM(export_snapshot_json->>'photoUrl'), ''),
  logo_url = NULLIF(TRIM(export_snapshot_json->>'logoUrl'), ''),
  display_name = NULLIF(TRIM(COALESCE(export_snapshot_json->>'displayName', export_snapshot_json->>'name')), ''),
  organization = NULLIF(TRIM(COALESCE(export_snapshot_json->>'organization', export_snapshot_json->>'companyName')), ''),
  title_snapshot = NULLIF(TRIM(export_snapshot_json->>'title'), ''),
  department_snapshot = NULLIF(TRIM(export_snapshot_json->>'department'), ''),
  activity_name = NULLIF(TRIM(export_snapshot_json->>'activityName'), '')
WHERE export_snapshot_json IS NOT NULL;

UPDATE digital_cards
SET photo_url = NULL
WHERE photo_url IS NOT NULL AND photo_url LIKE 'data:%';

UPDATE digital_cards
SET logo_url = NULL
WHERE logo_url IS NOT NULL AND logo_url LIKE 'data:%';
