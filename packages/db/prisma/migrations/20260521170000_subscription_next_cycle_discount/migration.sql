ALTER TABLE "user_subscriptions"
  ADD COLUMN IF NOT EXISTS "is_discounted_next_cycle" BOOLEAN NOT NULL DEFAULT false;
