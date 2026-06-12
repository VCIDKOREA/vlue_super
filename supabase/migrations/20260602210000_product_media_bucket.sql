-- VLUE 상품 영상 — Supabase Storage (CDN 직접 업로드, 공개 읽기)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vlue-product-media',
  'vlue-product-media',
  true,
  5368709120,
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 공개 읽기 (재생 트래픽은 Supabase CDN)
DROP POLICY IF EXISTS "vlue_product_media_public_read" ON storage.objects;
CREATE POLICY "vlue_product_media_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vlue-product-media');
