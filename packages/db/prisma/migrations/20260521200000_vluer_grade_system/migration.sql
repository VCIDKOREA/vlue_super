-- VLUER 통합 등급 (GENERAL / CERTIFIED / PARTNER / OFFICIAL)
-- PostgreSQL: enum 신규 값은 별도 마이그레이션(20260521200050)에서 사용 — 동일 트랜잭션 UPDATE 금지

CREATE TYPE "VluerGrade" AS ENUM ('general', 'certified', 'partner', 'official');

ALTER TABLE "user_vluer_profiles" ADD COLUMN IF NOT EXISTS "vluer_grade" "VluerGrade";

ALTER TYPE "VluerTierCode" ADD VALUE IF NOT EXISTS 'certified';
ALTER TYPE "VluerTierCode" ADD VALUE IF NOT EXISTS 'partner';
ALTER TYPE "VluerTierCode" ADD VALUE IF NOT EXISTS 'official';
