CREATE TABLE "local_ads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "store_name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "location" VARCHAR(120) NOT NULL,
    "image_url" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "local_ads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "local_ads_user_id_created_at_idx" ON "local_ads"("user_id", "created_at" DESC);
CREATE INDEX "local_ads_created_at_idx" ON "local_ads"("created_at" DESC);

ALTER TABLE "local_ads" ADD CONSTRAINT "local_ads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
