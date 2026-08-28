-- CreateTable
CREATE TABLE "user_kakao_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "kakao_user_id" VARCHAR(80) NOT NULL,
    "nickname" VARCHAR(120) NOT NULL,
    "profile_image_url" TEXT,
    "access_token" TEXT NOT NULL,
    "linked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_kakao_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_kakao_links_user_id_key" ON "user_kakao_links"("user_id");

-- CreateIndex
CREATE INDEX "user_kakao_links_kakao_user_id_idx" ON "user_kakao_links"("kakao_user_id");

-- AddForeignKey
ALTER TABLE "user_kakao_links" ADD CONSTRAINT "user_kakao_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
