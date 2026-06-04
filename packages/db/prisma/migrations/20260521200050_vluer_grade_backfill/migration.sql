-- VluerTierCode 신규 값 backfill (이전 마이그레이션 커밋 후 실행)

UPDATE "user_vluer_profiles" SET "tier_code" = 'certified' WHERE "tier_code"::text = 'professional';
UPDATE "user_vluer_profiles" SET "tier_code" = 'partner' WHERE "tier_code"::text = 'master';
UPDATE "user_vluer_profiles" SET "tier_code" = 'certified' WHERE "activity_tier" = 2 AND "tier_code"::text = 'general';
UPDATE "user_vluer_profiles" SET "tier_code" = 'partner' WHERE "activity_tier" = 1;

UPDATE "user_vluer_profiles" SET "vluer_grade" = CASE
  WHEN "tier_code"::text IN ('certified', 'professional') THEN 'certified'::"VluerGrade"
  WHEN "tier_code"::text IN ('partner', 'master') THEN 'partner'::"VluerGrade"
  WHEN "tier_code"::text = 'official' THEN 'official'::"VluerGrade"
  ELSE 'general'::"VluerGrade"
END
WHERE "vluer_grade" IS NULL;

ALTER TABLE "user_vluer_profiles" ALTER COLUMN "vluer_grade" SET DEFAULT 'general';
ALTER TABLE "user_vluer_profiles" ALTER COLUMN "vluer_grade" SET NOT NULL;

UPDATE "commission_ledgers" SET "tier_code" = 'certified' WHERE "tier_code"::text = 'professional';
UPDATE "commission_ledgers" SET "tier_code" = 'partner' WHERE "tier_code"::text = 'master';

INSERT INTO "vluer_tier_policies" ("tier_code", "label_ko", "min_referrals", "max_referrals", "subscription_rate_bp", "commerce_rate_bp", "payout_mode")
VALUES
  ('certified', '인증 VLUER', 50, 999, 1000, 1000, 'cash_commission'),
  ('partner', '파트너 VLUER', 1000, NULL, 1500, 1500, 'cash_commission'),
  ('official', '공식 VLUER', 0, NULL, 0, 0, 'cash_commission')
ON CONFLICT ("tier_code") DO UPDATE SET
  "label_ko" = EXCLUDED."label_ko",
  "subscription_rate_bp" = EXCLUDED."subscription_rate_bp",
  "commerce_rate_bp" = EXCLUDED."commerce_rate_bp",
  "payout_mode" = EXCLUDED."payout_mode";

UPDATE "vluer_tier_policies" SET
  "label_ko" = '일반 VLUER',
  "min_referrals" = 0,
  "max_referrals" = 49,
  "subscription_rate_bp" = 500,
  "commerce_rate_bp" = 0,
  "payout_mode" = 'reward_only'
WHERE "tier_code" = 'general';
