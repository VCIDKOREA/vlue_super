-- FCM push tokens for verified user devices (family protection alerts)
ALTER TABLE "user_devices" ADD COLUMN IF NOT EXISTS "fcm_token" VARCHAR(512);

CREATE INDEX IF NOT EXISTS "user_devices_user_id_fcm_token_idx"
  ON "user_devices" ("user_id")
  WHERE "fcm_token" IS NOT NULL;
