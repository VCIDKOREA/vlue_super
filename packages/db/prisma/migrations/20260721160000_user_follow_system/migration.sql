-- CreateEnum
CREATE TYPE "UserFollowStatus" AS ENUM ('pending', 'active', 'rejected', 'cancelled');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "is_private_follow" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "is_showcase_private" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "is_phone_followers_allowed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "is_name_followers_allowed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "is_org_followers_allowed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "is_id_followers_allowed" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "user_follows" (
    "id" UUID NOT NULL,
    "follower_id" UUID NOT NULL,
    "following_id" UUID NOT NULL,
    "status" "UserFollowStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_follows_follower_id_following_id_key" ON "user_follows"("follower_id", "following_id");

-- CreateIndex
CREATE INDEX "user_follows_following_id_status_idx" ON "user_follows"("following_id", "status");

-- CreateIndex
CREATE INDEX "user_follows_follower_id_status_idx" ON "user_follows"("follower_id", "status");

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
