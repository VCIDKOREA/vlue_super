-- VLUE 개인 메모장
CREATE TABLE IF NOT EXISTS personal_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'text',
  content TEXT NOT NULL DEFAULT '',
  title VARCHAR(200),
  source_app VARCHAR(100),
  source_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
  is_unread BOOLEAN NOT NULL DEFAULT FALSE,
  tags JSONB,
  bg_color VARCHAR(20) NOT NULL DEFAULT 'white',
  ai_summary TEXT,
  reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personal_memos_user ON personal_memos(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_memos_user_pinned ON personal_memos(user_id, is_pinned DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_personal_memos_reminder ON personal_memos(reminder_at) WHERE reminder_at IS NOT NULL;
