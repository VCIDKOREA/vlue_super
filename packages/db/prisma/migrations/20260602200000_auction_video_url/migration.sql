-- Auction: external embed video URL (YouTube/Vimeo — no server storage)
ALTER TABLE "auctions" ADD COLUMN IF NOT EXISTS "video_url" VARCHAR(1000);
