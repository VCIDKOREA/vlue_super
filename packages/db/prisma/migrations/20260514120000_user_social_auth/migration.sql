-- AlterTable: 간편 로그인(카카오 등) 식별자 + 이메일 검증 플래그
ALTER TABLE "users" ADD COLUMN "social_provider" VARCHAR(32),
ADD COLUMN "social_id" VARCHAR(80),
ADD COLUMN "is_verified" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "users_social_provider_social_id_key" ON "users" ("social_provider", "social_id");
