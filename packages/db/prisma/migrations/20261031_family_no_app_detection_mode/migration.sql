-- 골든타임(미접속) 감지 기준: device_idle | app_open
ALTER TABLE "family_protection_settings"
  ADD COLUMN IF NOT EXISTS "alert_no_app_detection_mode" VARCHAR(24) NOT NULL DEFAULT 'app_open';
