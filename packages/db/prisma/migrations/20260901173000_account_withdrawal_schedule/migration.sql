-- 회원탈퇴 예약(24h 유예) · 복구
ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_scheduled_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_requested_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_method VARCHAR(32);

CREATE INDEX IF NOT EXISTS idx_users_withdrawal_scheduled ON users (withdrawal_scheduled_at)
  WHERE withdrawal_scheduled_at IS NOT NULL;
