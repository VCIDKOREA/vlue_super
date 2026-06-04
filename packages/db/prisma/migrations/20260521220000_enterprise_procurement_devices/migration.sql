-- B2B enterprise roles, device auth, procurement

CREATE TYPE "LineType" AS ENUM ('NONE', 'WIRED', 'MOBILE');
CREATE TYPE "EnterpriseRole" AS ENUM ('NONE', 'MASTER', 'MANAGER', 'BUYER', 'STAFF');
CREATE TYPE "StorePurchaseRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "users" ADD COLUMN "line_type" "LineType" NOT NULL DEFAULT 'NONE';
ALTER TABLE "users" ADD COLUMN "enterprise_role" "EnterpriseRole" NOT NULL DEFAULT 'NONE';
ALTER TABLE "users" ADD COLUMN "enterprise_group_id" UUID;
ALTER TABLE "users" ADD COLUMN "enterprise_dept" VARCHAR(80);

ALTER TABLE "users" ADD CONSTRAINT "users_enterprise_group_id_fkey"
  FOREIGN KEY ("enterprise_group_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "users_enterprise_group_id_idx" ON "users"("enterprise_group_id");
CREATE INDEX "users_enterprise_role_idx" ON "users"("enterprise_role");

ALTER TABLE "b2b_enterprise_accounts" ADD COLUMN "corporate_wallet_balance_krw" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "b2b_enterprise_accounts" ADD COLUMN "corporate_card_last4" VARCHAR(4);
ALTER TABLE "b2b_enterprise_accounts" ADD COLUMN "corporate_card_registered_at" TIMESTAMPTZ(6);

ALTER TABLE "shop_orders" ADD COLUMN "enterprise_group_id" UUID;
ALTER TABLE "shop_orders" ADD COLUMN "paid_by_enterprise_wallet" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "shop_orders_enterprise_group_id_created_at_idx" ON "shop_orders"("enterprise_group_id", "created_at" DESC);

CREATE TABLE "user_devices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "device_token" VARCHAR(128) NOT NULL,
  "label" VARCHAR(120),
  "is_verified" BOOLEAN NOT NULL DEFAULT false,
  "verified_at" TIMESTAMPTZ(6),
  "user_agent" VARCHAR(512),
  "last_ip" VARCHAR(45),
  "client_kind" VARCHAR(16),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "user_devices_user_id_device_token_key" ON "user_devices"("user_id", "device_token");
CREATE INDEX "user_devices_user_id_is_verified_idx" ON "user_devices"("user_id", "is_verified");

CREATE TABLE "store_purchase_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "enterprise_id" UUID NOT NULL,
  "enterprise_group_id" UUID NOT NULL,
  "product_id" VARCHAR(64) NOT NULL,
  "product_name" VARCHAR(200) NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_price_krw" INTEGER NOT NULL DEFAULT 0,
  "requested_by_user_id" UUID NOT NULL,
  "requested_by_name" VARCHAR(120) NOT NULL,
  "requested_by_dept" VARCHAR(80),
  "status" "StorePurchaseRequestStatus" NOT NULL DEFAULT 'PENDING',
  "buyer_note" TEXT,
  "reviewed_at" TIMESTAMPTZ(6),
  "reviewed_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "store_purchase_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_purchase_requests_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "b2b_enterprise_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "store_purchase_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "store_purchase_requests_enterprise_id_status_created_at_idx" ON "store_purchase_requests"("enterprise_id", "status", "created_at" DESC);
CREATE INDEX "store_purchase_requests_enterprise_group_id_created_at_idx" ON "store_purchase_requests"("enterprise_group_id", "created_at" DESC);

CREATE TABLE "enterprise_procurement_cart_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "enterprise_id" UUID NOT NULL,
  "external_product_id" VARCHAR(64) NOT NULL,
  "product_name" VARCHAR(200) NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_price_krw" INTEGER NOT NULL DEFAULT 0,
  "added_by_user_id" UUID NOT NULL,
  "added_by_name" VARCHAR(120) NOT NULL,
  "added_by_dept" VARCHAR(80),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_procurement_cart_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "enterprise_procurement_cart_items_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "b2b_enterprise_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "enterprise_procurement_cart_items_added_by_user_id_fkey" FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "enterprise_procurement_cart_items_enterprise_id_created_at_idx" ON "enterprise_procurement_cart_items"("enterprise_id", "created_at" DESC);

CREATE TABLE "enterprise_group_chats" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "enterprise_id" UUID NOT NULL,
  "title" VARCHAR(120) NOT NULL DEFAULT '사내 비품·업무',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_group_chats_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "enterprise_group_chats_enterprise_id_key" UNIQUE ("enterprise_id"),
  CONSTRAINT "enterprise_group_chats_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "b2b_enterprise_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "enterprise_group_chat_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "chat_id" UUID NOT NULL,
  "sender_id" UUID,
  "content" TEXT NOT NULL,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_group_chat_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "enterprise_group_chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "enterprise_group_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "enterprise_group_chat_messages_chat_id_created_at_idx" ON "enterprise_group_chat_messages"("chat_id", "created_at" DESC);
