-- Live/VOD commerce + media escrow (zero-cost media metadata only)

CREATE TYPE "SellerVodSource" AS ENUM ('live_recording', 'direct_upload', 'external_link');
CREATE TYPE "SellerVodStatus" AS ENUM ('processing', 'ready', 'archived');
CREATE TYPE "MediaLiveStatus" AS ENUM ('scheduled', 'live', 'ended');
CREATE TYPE "MediaEscrowPaymentStatus" AS ENUM ('pending_payment', 'ESCROW_HOLD', 'released', 'refunded', 'failed');

ALTER TYPE "ShopOrderStatus" ADD VALUE IF NOT EXISTS 'escrow_hold';

CREATE TABLE "media_live_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "seller_user_id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL DEFAULT '',
  "stream_url" VARCHAR(1000) NOT NULL,
  "platform" VARCHAR(32) NOT NULL DEFAULT 'youtube',
  "aspect_ratio" VARCHAR(8) NOT NULL DEFAULT '16:9',
  "status" "MediaLiveStatus" NOT NULL DEFAULT 'live',
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "media_live_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "media_live_sessions_seller_user_id_fkey" FOREIGN KEY ("seller_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "media_live_sessions_seller_user_id_status_idx" ON "media_live_sessions"("seller_user_id", "status");

CREATE TABLE "seller_vod_products" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "seller_user_id" UUID NOT NULL,
  "live_session_id" UUID,
  "title" VARCHAR(200) NOT NULL,
  "product_title" VARCHAR(200),
  "video_url" VARCHAR(1000) NOT NULL,
  "thumb_url" VARCHAR(1000),
  "aspect_ratio" VARCHAR(8) NOT NULL DEFAULT '16:9',
  "platform" VARCHAR(32),
  "source" "SellerVodSource" NOT NULL DEFAULT 'external_link',
  "status" "SellerVodStatus" NOT NULL DEFAULT 'ready',
  "category" VARCHAR(40) NOT NULL DEFAULT 'past_live_deals',
  "price_krw" INTEGER,
  "duration_sec" INTEGER,
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seller_vod_products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "seller_vod_products_seller_user_id_fkey" FOREIGN KEY ("seller_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "seller_vod_products_live_session_id_fkey" FOREIGN KEY ("live_session_id") REFERENCES "media_live_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "seller_vod_products_seller_user_id_category_status_idx" ON "seller_vod_products"("seller_user_id", "category", "status");

CREATE TABLE "media_commerce_escrows" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "buyer_user_id" UUID NOT NULL,
  "seller_user_id" UUID NOT NULL,
  "feed_id" VARCHAR(120) NOT NULL,
  "campaign_id" VARCHAR(120),
  "product_title" VARCHAR(200) NOT NULL,
  "amount_krw" INTEGER NOT NULL,
  "merchant_uid" VARCHAR(80) NOT NULL,
  "imp_uid" VARCHAR(80),
  "payment_status" "MediaEscrowPaymentStatus" NOT NULL DEFAULT 'pending_payment',
  "receipt_url" VARCHAR(512),
  "paid_at" TIMESTAMPTZ(6),
  "raw_response" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "media_commerce_escrows_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "media_commerce_escrows_merchant_uid_key" UNIQUE ("merchant_uid"),
  CONSTRAINT "media_commerce_escrows_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "media_commerce_escrows_seller_user_id_fkey" FOREIGN KEY ("seller_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "media_commerce_escrows_buyer_user_id_payment_status_idx" ON "media_commerce_escrows"("buyer_user_id", "payment_status");
CREATE INDEX "media_commerce_escrows_seller_user_id_payment_status_idx" ON "media_commerce_escrows"("seller_user_id", "payment_status");
