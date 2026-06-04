-- VLUE 6월 릴리스 — 브이밍 / 그룹 일정 / 미디어 캠페인 / FCM 큐
-- API 기동 시 ensure*() 로도 생성되며, 운영 DB에는 본 파일을 한 번 적용 권장.

CREATE TABLE IF NOT EXISTS vming_daily_usage (
  user_id UUID NOT NULL,
  usage_date DATE NOT NULL,
  question_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

CREATE TABLE IF NOT EXISTS office_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id VARCHAR(120),
  author_user_id UUID NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  push_notify BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_office_cal_group_start ON office_calendars(group_id, starts_at);

CREATE TABLE IF NOT EXISTS office_group_members (
  group_id VARCHAR(120) NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS office_fcm_push_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title VARCHAR(200) NOT NULL,
  body VARCHAR(500) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  channel VARCHAR(60) NOT NULL DEFAULT 'office',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  last_error VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_office_fcm_queue_status ON office_fcm_push_queue(status, created_at);

CREATE TABLE IF NOT EXISTS shop_media_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  shop_id VARCHAR(120),
  title VARCHAR(200),
  status VARCHAR(40) NOT NULL DEFAULT 'processing',
  source_image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  video_url VARCHAR(1000),
  duration_sec INT NOT NULL DEFAULT 15,
  error_message VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shop_media_user_created ON shop_media_campaigns(user_id, created_at DESC);
