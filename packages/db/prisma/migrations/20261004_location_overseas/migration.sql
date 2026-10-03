-- 가족위치 해외 접속 판별 필드
ALTER TABLE location_presence
  ADD COLUMN IF NOT EXISTS is_overseas boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS country_code varchar(8) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS country_name varchar(80) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city_name varchar(80) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS time_zone_id varchar(64) NOT NULL DEFAULT '';
