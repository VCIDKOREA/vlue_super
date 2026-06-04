-- [2단계] 실서버 매니페스트: User.status / referrerCode / currentDiscountRate
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');

ALTER TABLE "users" ADD COLUMN "user_status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "users" ADD COLUMN "referrer_code" VARCHAR(24);
ALTER TABLE "users" ADD COLUMN "current_discount_rate" INTEGER NOT NULL DEFAULT 30;

CREATE INDEX "abusing_protection_logs_deleted_at_idx" ON "abusing_protection_logs"("deleted_at");
