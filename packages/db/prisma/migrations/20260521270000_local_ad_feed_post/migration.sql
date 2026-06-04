-- 지역 광고 — 상점 피드 게시물 연결
ALTER TABLE "local_ads" ADD COLUMN IF NOT EXISTS "feed_post_id" VARCHAR(64);
ALTER TABLE "local_ads" ADD COLUMN IF NOT EXISTS "feed_post_source" VARCHAR(20);

CREATE INDEX IF NOT EXISTS "local_ads_feed_post_id_idx" ON "local_ads"("feed_post_id");
