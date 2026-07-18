-- CreateTable
CREATE TABLE "user_instagram_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "ig_user_id" VARCHAR(80) NOT NULL,
    "username" VARCHAR(120) NOT NULL,
    "access_token" TEXT NOT NULL,
    "account_type" VARCHAR(32),
    "token_expires_at" TIMESTAMPTZ(6),
    "linked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_instagram_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_instagram_links_user_id_key" ON "user_instagram_links"("user_id");

-- CreateIndex
CREATE INDEX "user_instagram_links_ig_user_id_idx" ON "user_instagram_links"("ig_user_id");

-- AddForeignKey
ALTER TABLE "user_instagram_links" ADD CONSTRAINT "user_instagram_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
