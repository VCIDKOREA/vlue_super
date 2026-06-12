-- VLUE 경매 — 입찰 · 에스크로 · 키워드 알림

CREATE TYPE "AuctionCondition" AS ENUM ('new_item', 'used_item');
CREATE TYPE "AuctionStatus" AS ENUM ('scheduled', 'live', 'ended', 'settled', 'cancelled');
CREATE TYPE "AuctionEscrowStatus" AS ENUM ('pending', 'held', 'released', 'refunded');
CREATE TYPE "InterestKeywordSource" AS ENUM ('watchlist', 'search');

CREATE TABLE "auctions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seller_user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" VARCHAR(40) NOT NULL DEFAULT '전체',
    "keywords" VARCHAR(300) NOT NULL DEFAULT '',
    "condition" "AuctionCondition" NOT NULL DEFAULT 'used_item',
    "shipping_fee_krw" INTEGER NOT NULL DEFAULT 0,
    "image_urls" JSONB NOT NULL DEFAULT '[]',
    "start_price_krw" INTEGER NOT NULL,
    "current_price_krw" INTEGER NOT NULL,
    "buy_now_price_krw" INTEGER,
    "bid_count" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'scheduled',
    "winner_user_id" UUID,
    "market_price_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auction_bids" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auction_id" UUID NOT NULL,
    "bidder_user_id" UUID NOT NULL,
    "amount_krw" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_bids_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auction_escrows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auction_id" UUID NOT NULL,
    "buyer_user_id" UUID NOT NULL,
    "seller_user_id" UUID NOT NULL,
    "amount_krw" INTEGER NOT NULL,
    "shipping_fee_krw" INTEGER NOT NULL DEFAULT 0,
    "status" "AuctionEscrowStatus" NOT NULL DEFAULT 'pending',
    "merchant_uid" VARCHAR(80),
    "escrow_ref" VARCHAR(120),
    "held_at" TIMESTAMPTZ(6),
    "released_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_escrows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_interest_keywords" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "keyword" VARCHAR(80) NOT NULL,
    "source" "InterestKeywordSource" NOT NULL DEFAULT 'watchlist',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_interest_keywords_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auction_escrows_auction_id_key" ON "auction_escrows"("auction_id");
CREATE UNIQUE INDEX "user_interest_keywords_user_id_keyword_key" ON "user_interest_keywords"("user_id", "keyword");

CREATE INDEX "auctions_status_ends_at_idx" ON "auctions"("status", "ends_at");
CREATE INDEX "auctions_seller_user_id_created_at_idx" ON "auctions"("seller_user_id", "created_at" DESC);
CREATE INDEX "auctions_category_status_idx" ON "auctions"("category", "status");
CREATE INDEX "auction_bids_auction_id_amount_krw_idx" ON "auction_bids"("auction_id", "amount_krw" DESC);
CREATE INDEX "auction_bids_bidder_user_id_created_at_idx" ON "auction_bids"("bidder_user_id", "created_at" DESC);
CREATE INDEX "auction_escrows_buyer_user_id_status_idx" ON "auction_escrows"("buyer_user_id", "status");
CREATE INDEX "auction_escrows_seller_user_id_status_idx" ON "auction_escrows"("seller_user_id", "status");
CREATE INDEX "user_interest_keywords_keyword_idx" ON "user_interest_keywords"("keyword");

ALTER TABLE "auctions" ADD CONSTRAINT "auctions_seller_user_id_fkey" FOREIGN KEY ("seller_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_winner_user_id_fkey" FOREIGN KEY ("winner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_bidder_user_id_fkey" FOREIGN KEY ("bidder_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auction_escrows" ADD CONSTRAINT "auction_escrows_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auction_escrows" ADD CONSTRAINT "auction_escrows_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auction_escrows" ADD CONSTRAINT "auction_escrows_seller_user_id_fkey" FOREIGN KEY ("seller_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_interest_keywords" ADD CONSTRAINT "user_interest_keywords_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
