-- VLUE 인증 배지(시안) — 유료 자동 부여 · 무료 조건 달성 시 1회 부여(영구 유지)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "vlue_verified_badge_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "showcase_share_count" INTEGER NOT NULL DEFAULT 0;
