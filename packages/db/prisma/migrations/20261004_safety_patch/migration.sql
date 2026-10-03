-- TODAY 안심패치 세션(24시간)과 Gemini 안심 리포트 캐시
CREATE TABLE IF NOT EXISTS safety_patch_sessions (
  user_id uuid PRIMARY KEY,
  last_patched_at timestamptz NOT NULL,
  expiry_notified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS safety_patch_sessions_expiry_idx
  ON safety_patch_sessions (last_patched_at);

CREATE TABLE IF NOT EXISTS safety_patch_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  summary text NOT NULL,
  safety_index integer NOT NULL,
  address_label varchar(240) NOT NULL DEFAULT '',
  battery_pct integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS safety_patch_reports_pair_idx
  ON safety_patch_reports (viewer_user_id, target_user_id, created_at DESC);
