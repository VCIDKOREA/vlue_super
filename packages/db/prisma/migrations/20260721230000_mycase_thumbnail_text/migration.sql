-- Fix truncated data-URL thumbnails (VARCHAR 2048 broke base64 images)
ALTER TABLE "showcase_cases"
  ALTER COLUMN "thumbnail_url" TYPE TEXT;
