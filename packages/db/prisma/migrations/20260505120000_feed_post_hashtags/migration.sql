-- Hashtag index for GET /api/feed/search
CREATE TABLE "feed_post_hashtags" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "tag" VARCHAR(120) NOT NULL,

    CONSTRAINT "feed_post_hashtags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "feed_post_hashtags_post_id_tag_key" ON "feed_post_hashtags"("post_id", "tag");
CREATE INDEX "feed_post_hashtags_tag_idx" ON "feed_post_hashtags"("tag");

ALTER TABLE "feed_post_hashtags" ADD CONSTRAINT "feed_post_hashtags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "card_feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
