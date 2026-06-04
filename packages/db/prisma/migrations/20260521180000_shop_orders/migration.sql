-- VLUE PAGE 상점 — 판매 상품·단발성 주문

CREATE TYPE "ShopOrderStatus" AS ENUM ('pending_payment', 'paid', 'failed', 'cancelled');

CREATE TABLE "store_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seller_user_id" UUID NOT NULL,
    "external_id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "unit_price_krw" INTEGER NOT NULL,
    "sale_price_krw" INTEGER,
    "shipping_fee_krw" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(24) NOT NULL DEFAULT 'on_sale',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shop_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_uid" VARCHAR(80) NOT NULL,
    "buyer_user_id" UUID NOT NULL,
    "seller_user_id" UUID NOT NULL,
    "store_product_id" UUID,
    "product_name" VARCHAR(200) NOT NULL,
    "unit_price_krw" INTEGER NOT NULL,
    "shipping_fee_krw" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "total_amount_krw" INTEGER NOT NULL,
    "status" "ShopOrderStatus" NOT NULL DEFAULT 'pending_payment',
    "pay_method" VARCHAR(24),
    "imp_uid" VARCHAR(80),
    "portone_status" VARCHAR(40),
    "receipt_url" VARCHAR(512),
    "paid_at" TIMESTAMPTZ(6),
    "raw_response" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_products_seller_user_id_external_id_key" ON "store_products"("seller_user_id", "external_id");
CREATE INDEX "store_products_seller_user_id_status_idx" ON "store_products"("seller_user_id", "status");

CREATE UNIQUE INDEX "shop_orders_merchant_uid_key" ON "shop_orders"("merchant_uid");
CREATE INDEX "shop_orders_buyer_user_id_created_at_idx" ON "shop_orders"("buyer_user_id", "created_at" DESC);
CREATE INDEX "shop_orders_seller_user_id_created_at_idx" ON "shop_orders"("seller_user_id", "created_at" DESC);
CREATE INDEX "shop_orders_status_created_at_idx" ON "shop_orders"("status", "created_at" DESC);

ALTER TABLE "store_products" ADD CONSTRAINT "store_products_seller_user_id_fkey" FOREIGN KEY ("seller_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_seller_user_id_fkey" FOREIGN KEY ("seller_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_store_product_id_fkey" FOREIGN KEY ("store_product_id") REFERENCES "store_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
