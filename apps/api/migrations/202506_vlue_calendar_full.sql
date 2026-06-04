-- VLUE 그룹 일정관리 — office_calendars 확장 + calendar_members + 예약 FCM

ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS cal_type VARCHAR(20) NOT NULL DEFAULT 'personal';
ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS location VARCHAR(200);
ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS color VARCHAR(7) NOT NULL DEFAULT '#8B5CF6';
ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS push_before_minutes INT NOT NULL DEFAULT 30;
ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS repeat_type VARCHAR(20) NOT NULL DEFAULT 'none';
ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS repeat_end_date DATE;
ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS group_kind VARCHAR(20);
ALTER TABLE office_calendars ADD COLUMN IF NOT EXISTS group_name VARCHAR(120);

UPDATE office_calendars SET cal_type = 'group' WHERE group_id IS NOT NULL AND cal_type = 'personal';

CREATE TABLE IF NOT EXISTS calendar_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (calendar_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_calendar_members_cal ON calendar_members(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_members_user ON calendar_members(user_id);

ALTER TABLE office_fcm_push_queue ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_office_fcm_queue_sched ON office_fcm_push_queue(status, scheduled_at);
