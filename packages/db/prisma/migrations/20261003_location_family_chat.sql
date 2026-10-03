-- Family location chat (30-day TTL)
CREATE TABLE IF NOT EXISTS location_family_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  display_name varchar(80) NOT NULL DEFAULT '',
  kind varchar(16) NOT NULL DEFAULT 'text',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS location_family_messages_user_created_idx
  ON location_family_messages (user_id, created_at);

CREATE INDEX IF NOT EXISTS location_family_messages_created_idx
  ON location_family_messages (created_at);
