-- 관리자 DB 차트용 제품 지표 이벤트 (통화 UI · 쇼케이스 조회)
CREATE TABLE IF NOT EXISTS "product_metric_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_type" VARCHAR(40) NOT NULL,
  "user_id" UUID,
  "target_user_id" UUID,
  "source" VARCHAR(40),
  "meta_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "product_metric_events_event_type_created_at_idx"
  ON "product_metric_events"("event_type", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "product_metric_events_created_at_idx"
  ON "product_metric_events"("created_at" DESC);

CREATE INDEX IF NOT EXISTS "product_metric_events_user_id_event_type_created_at_idx"
  ON "product_metric_events"("user_id", "event_type", "created_at" DESC);
