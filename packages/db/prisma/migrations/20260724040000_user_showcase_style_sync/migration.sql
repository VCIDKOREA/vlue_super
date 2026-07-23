-- 쇼케이스 편집/라이브 스타일 기기 간 동기화
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "showcase_style_json" JSONB;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "showcase_live_style_json" JSONB;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "showcase_live_source_json" JSONB;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "showcase_style_updated_at" TIMESTAMPTZ(6);
