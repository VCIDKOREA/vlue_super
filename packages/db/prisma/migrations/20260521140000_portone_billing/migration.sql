-- PortOne V1 billing key + subscription payment history

DO $$ BEGIN
  ALTER TYPE "UserSubscriptionStatus" ADD VALUE 'pending_payment';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('pending', 'paid', 'failed');

ALTER TABLE "user_subscriptions"
  ADD COLUMN IF NOT EXISTS "portone_customer_uid" VARCHAR(64);

CREATE TABLE "subscription_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "subscription_id" UUID,
    "merchant_uid" VARCHAR(80) NOT NULL,
    "imp_uid" VARCHAR(80),
    "customer_uid" VARCHAR(64) NOT NULL,
    "amount_krw" INTEGER NOT NULL,
    "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'pending',
    "portone_status" VARCHAR(40),
    "paid_at" TIMESTAMPTZ(6),
    "raw_response" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_payments_merchant_uid_key" ON "subscription_payments"("merchant_uid");
CREATE INDEX "subscription_payments_user_id_created_at_idx" ON "subscription_payments"("user_id", "created_at" DESC);

ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "user_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
