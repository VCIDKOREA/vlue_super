-- 회선별 독립 구독 · 유예(grace) · 알림함 고정

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LineSubscriptionStatus') THEN
    CREATE TYPE "LineSubscriptionStatus" AS ENUM (
      'pending_payment',
      'active',
      'grace',
      'cancelled',
      'lapsed'
    );
  END IF;
END $$;

ALTER TABLE "owner_notifications"
  ADD COLUMN IF NOT EXISTS "pin_kind" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "pin_key" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "payload_json" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "owner_notifications_owner_user_id_pin_key_key"
  ON "owner_notifications" ("owner_user_id", "pin_key");

CREATE INDEX IF NOT EXISTS "owner_notifications_owner_user_id_pin_kind_idx"
  ON "owner_notifications" ("owner_user_id", "pin_kind");

CREATE TABLE IF NOT EXISTS "line_subscriptions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "business_card_id" UUID NOT NULL,
  "user_subscription_id" UUID,
  "plan" "UserSubscriptionPlan" NOT NULL,
  "status" "LineSubscriptionStatus" NOT NULL DEFAULT 'pending_payment',
  "amount_krw" INTEGER NOT NULL,
  "cycle_start_at" TIMESTAMPTZ(6) NOT NULL,
  "cycle_end_at" TIMESTAMPTZ(6) NOT NULL,
  "next_charge_at" TIMESTAMPTZ(6),
  "grace_started_at" TIMESTAMPTZ(6),
  "grace_ends_at" TIMESTAMPTZ(6),
  "lapsed_at" TIMESTAMPTZ(6),
  "cancelled_at" TIMESTAMPTZ(6),
  "cancel_reason" VARCHAR(120),
  "showcase_purged_at" TIMESTAMPTZ(6),
  "portone_customer_uid" VARCHAR(64),
  "last_payment_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "line_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "line_subscriptions_business_card_id_key"
  ON "line_subscriptions" ("business_card_id");

CREATE INDEX IF NOT EXISTS "line_subscriptions_user_id_status_idx"
  ON "line_subscriptions" ("user_id", "status");

CREATE INDEX IF NOT EXISTS "line_subscriptions_status_grace_ends_at_idx"
  ON "line_subscriptions" ("status", "grace_ends_at");

CREATE INDEX IF NOT EXISTS "line_subscriptions_status_next_charge_at_idx"
  ON "line_subscriptions" ("status", "next_charge_at");

CREATE TABLE IF NOT EXISTS "line_subscription_payments" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "line_subscription_id" UUID NOT NULL,
  "merchant_uid" VARCHAR(80) NOT NULL,
  "imp_uid" VARCHAR(80),
  "customer_uid" VARCHAR(64) NOT NULL,
  "amount_krw" INTEGER NOT NULL,
  "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'pending',
  "portone_status" VARCHAR(40),
  "paid_at" TIMESTAMPTZ(6),
  "failure_reason" VARCHAR(240),
  "raw_response" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "line_subscription_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "line_subscription_payments_merchant_uid_key"
  ON "line_subscription_payments" ("merchant_uid");

CREATE INDEX IF NOT EXISTS "line_subscription_payments_user_id_created_at_idx"
  ON "line_subscription_payments" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "line_subscription_payments_line_subscription_id_created_at_idx"
  ON "line_subscription_payments" ("line_subscription_id", "created_at" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'line_subscriptions_user_id_fkey'
  ) THEN
    ALTER TABLE "line_subscriptions"
      ADD CONSTRAINT "line_subscriptions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'line_subscriptions_business_card_id_fkey'
  ) THEN
    ALTER TABLE "line_subscriptions"
      ADD CONSTRAINT "line_subscriptions_business_card_id_fkey"
      FOREIGN KEY ("business_card_id") REFERENCES "business_cards"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'line_subscriptions_user_subscription_id_fkey'
  ) THEN
    ALTER TABLE "line_subscriptions"
      ADD CONSTRAINT "line_subscriptions_user_subscription_id_fkey"
      FOREIGN KEY ("user_subscription_id") REFERENCES "user_subscriptions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'line_subscription_payments_line_subscription_id_fkey'
  ) THEN
    ALTER TABLE "line_subscription_payments"
      ADD CONSTRAINT "line_subscription_payments_line_subscription_id_fkey"
      FOREIGN KEY ("line_subscription_id") REFERENCES "line_subscriptions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
