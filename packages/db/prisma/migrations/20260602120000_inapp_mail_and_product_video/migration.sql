-- 인앱 메일함 인덱스 + 상품 동영상 URL
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "video_url" VARCHAR(2048);

CREATE TABLE IF NOT EXISTS "inapp_mail_caches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "mail_source" VARCHAR(24) NOT NULL,
    "from_address" VARCHAR(254) NOT NULL,
    "subject" VARCHAR(500) NOT NULL DEFAULT '',
    "snippet" TEXT NOT NULL DEFAULT '',
    "received_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inapp_mail_caches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inapp_mail_caches_user_id_received_at_idx"
    ON "inapp_mail_caches"("user_id", "received_at" DESC);

ALTER TABLE "inapp_mail_caches"
    ADD CONSTRAINT "inapp_mail_caches_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
