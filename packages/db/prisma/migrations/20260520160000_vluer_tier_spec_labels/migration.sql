-- 공식 티어 스펙 라벨·구간 정합 (개인+기업회원 합산 1~99 / 100~999 / 1000+)

UPDATE "vluer_tier_policies" SET
  "label_ko" = 'VLUER (Junior VLUER)',
  "min_referrals" = 1,
  "max_referrals" = 99,
  "subscription_rate_bp" = 500,
  "commerce_rate_bp" = 0,
  "payout_mode" = 'reward_only'
WHERE "tier_code" = 'general';

UPDATE "vluer_tier_policies" SET
  "label_ko" = 'Senior VLUER',
  "min_referrals" = 100,
  "max_referrals" = 999,
  "subscription_rate_bp" = 1000,
  "commerce_rate_bp" = 1000,
  "payout_mode" = 'cash_commission'
WHERE "tier_code" = 'professional';

UPDATE "vluer_tier_policies" SET
  "label_ko" = 'Master VLUER',
  "min_referrals" = 1000,
  "max_referrals" = NULL,
  "subscription_rate_bp" = 1500,
  "commerce_rate_bp" = 1500,
  "payout_mode" = 'cash_commission'
WHERE "tier_code" = 'master';
