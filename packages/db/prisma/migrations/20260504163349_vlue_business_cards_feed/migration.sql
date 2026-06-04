-- CreateEnum
CREATE TYPE "BusinessCardKind" AS ENUM ('mobile', 'extension', 'rep_number');

-- CreateEnum
CREATE TYPE "CardVerificationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "CardMemberRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF');

-- AlterTable
ALTER TABLE "admin_devices" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "sender_card_id" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "nick_chat" VARCHAR(64),
ADD COLUMN     "nick_feed" VARCHAR(64);

-- CreateTable
CREATE TABLE "business_cards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "BusinessCardKind" NOT NULL,
    "phone_e164" VARCHAR(24) NOT NULL,
    "display_name" VARCHAR(120),
    "job_title" VARCHAR(120),
    "company_name" VARCHAR(200),
    "profile_json" JSONB,
    "verification_status" "CardVerificationStatus" NOT NULL DEFAULT 'approved',
    "is_premium_line" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_members" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "CardMemberRole" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_logs" (
    "id" UUID NOT NULL,
    "card_id" UUID,
    "user_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "detail" JSONB,
    "outcome" VARCHAR(32) NOT NULL DEFAULT 'info',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_feed_posts" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "title" VARCHAR(200),
    "body" TEXT NOT NULL,
    "meta_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "card_feed_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_cards_phone_e164_key" ON "business_cards"("phone_e164");

-- CreateIndex
CREATE INDEX "business_cards_user_id_idx" ON "business_cards"("user_id");

-- CreateIndex
CREATE INDEX "card_members_user_id_idx" ON "card_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "card_members_card_id_user_id_key" ON "card_members"("card_id", "user_id");

-- CreateIndex
CREATE INDEX "verification_logs_card_id_created_at_idx" ON "verification_logs"("card_id", "created_at");

-- CreateIndex
CREATE INDEX "card_feed_posts_card_id_created_at_idx" ON "card_feed_posts"("card_id", "created_at");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_card_id_fkey" FOREIGN KEY ("sender_card_id") REFERENCES "business_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_cards" ADD CONSTRAINT "business_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_members" ADD CONSTRAINT "card_members_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "business_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_members" ADD CONSTRAINT "card_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "business_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_feed_posts" ADD CONSTRAINT "card_feed_posts_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "business_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_feed_posts" ADD CONSTRAINT "card_feed_posts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
