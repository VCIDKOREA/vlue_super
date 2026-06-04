-- 쇼핑 커머스 VLUER 쉐어: 인증 0.3% (30bp), 파트너 0.8% (80bp)
-- (구독 10%/15%와 별도 — 결제액 VAT 포함 기준)

UPDATE "vluer_tier_policies"
SET "commerce_rate_bp" = 0
WHERE "tier_code" IN ('general', 'official');

UPDATE "vluer_tier_policies"
SET "commerce_rate_bp" = 30
WHERE "tier_code" IN ('certified', 'professional');

UPDATE "vluer_tier_policies"
SET "commerce_rate_bp" = 80
WHERE "tier_code" IN ('partner', 'master');
