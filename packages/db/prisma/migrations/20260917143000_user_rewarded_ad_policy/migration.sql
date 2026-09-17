CREATE TYPE "RewardedAdAction" AS ENUM (
  'showcase_slot_unlock',
  'showcase_save',
  'bgm_apply'
);

CREATE TYPE "RewardedAdGrantStatus" AS ENUM (
  'pending',
  'earned',
  'consumed',
  'rejected',
  'expired'
);

CREATE TABLE "user_ad_states" (
  "user_id" UUID NOT NULL,
  "showcase_slot_mask" INTEGER NOT NULL DEFAULT 1,
  "first_showcase_saved_at" TIMESTAMPTZ(6),
  "first_bgm_applied_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "user_ad_states_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "rewarded_ad_grants" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "action" "RewardedAdAction" NOT NULL,
  "target_key" VARCHAR(120),
  "status" "RewardedAdGrantStatus" NOT NULL DEFAULT 'pending',
  "provider_transaction_id" VARCHAR(180),
  "provider_payload_json" JSONB,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "earned_at" TIMESTAMPTZ(6),
  "consumed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "rewarded_ad_grants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rewarded_ad_grants_provider_transaction_id_key"
ON "rewarded_ad_grants"("provider_transaction_id");

CREATE INDEX "rewarded_ad_grants_user_id_action_status_created_at_idx"
ON "rewarded_ad_grants"("user_id", "action", "status", "created_at" DESC);

ALTER TABLE "user_ad_states"
ADD CONSTRAINT "user_ad_states_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rewarded_ad_grants"
ADD CONSTRAINT "rewarded_ad_grants_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
