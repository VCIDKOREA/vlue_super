-- B2B phase 2: subscriptions, enterprise billing, refund queue, corporate membership

CREATE TYPE "UserSubscriptionPlan" AS ENUM ('b2c_monthly', 'b2c_annual');
CREATE TYPE "UserSubscriptionStatus" AS ENUM ('active', 'cancelled');
CREATE TYPE "RefundQueueStatus" AS ENUM ('pending', 'processed', 'failed');
CREATE TYPE "EnterpriseBillingStatus" AS ENUM ('active', 'paused');

ALTER TABLE "b2b_enterprise_accounts"
  ADD COLUMN "total_billing_amount_krw" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "next_billing_at" TIMESTAMPTZ(6),
  ADD COLUMN "company_branding_json" JSONB;

CREATE TABLE "user_corporate_memberships" (
    "user_id" UUID NOT NULL,
    "enterprise_id" UUID NOT NULL,
    "attribution_request_id" UUID,
    "override_by_company" BOOLEAN NOT NULL DEFAULT true,
    "activated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_corporate_memberships_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "user_corporate_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_corporate_memberships_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "b2b_enterprise_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "user_corporate_memberships_attribution_request_id_key" ON "user_corporate_memberships"("attribution_request_id");
CREATE INDEX "user_corporate_memberships_enterprise_id_idx" ON "user_corporate_memberships"("enterprise_id");

CREATE TABLE "user_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan" "UserSubscriptionPlan" NOT NULL,
    "status" "UserSubscriptionStatus" NOT NULL DEFAULT 'active',
    "amount_krw" INTEGER NOT NULL,
    "cycle_start_at" TIMESTAMPTZ(6) NOT NULL,
    "cycle_end_at" TIMESTAMPTZ(6) NOT NULL,
    "next_charge_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancel_reason" VARCHAR(120),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "user_subscriptions_user_id_status_idx" ON "user_subscriptions"("user_id", "status");

CREATE TABLE "enterprise_billing_schedules" (
    "id" UUID NOT NULL,
    "enterprise_id" UUID NOT NULL,
    "total_billing_amount_krw" INTEGER NOT NULL DEFAULT 0,
    "line_count" INTEGER NOT NULL DEFAULT 0,
    "billing_cycle" "B2BBillingCycle" NOT NULL,
    "next_billing_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "EnterpriseBillingStatus" NOT NULL DEFAULT 'active',
    "corporate_payment_ref" VARCHAR(120),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "enterprise_billing_schedules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "enterprise_billing_schedules_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "b2b_enterprise_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "enterprise_billing_schedules_enterprise_id_key" ON "enterprise_billing_schedules"("enterprise_id");

CREATE TABLE "refund_queue" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subscription_id" UUID,
    "refund_amount_krw" INTEGER NOT NULL,
    "reason" VARCHAR(200) NOT NULL,
    "status" "RefundQueueStatus" NOT NULL DEFAULT 'pending',
    "proration_meta" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    CONSTRAINT "refund_queue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refund_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "refund_queue_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "user_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "refund_queue_user_id_status_idx" ON "refund_queue"("user_id", "status");
