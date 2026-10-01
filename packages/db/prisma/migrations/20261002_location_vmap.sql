-- 가족위치 / V-Map / 지도 스폰서 배너
CREATE TABLE IF NOT EXISTS map_sponsor_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(80) NOT NULL,
  body varchar(160) NOT NULL DEFAULT '',
  image_url varchar(1024) NOT NULL DEFAULT '',
  link_url varchar(1024) NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS map_sponsor_banners_active_idx ON map_sponsor_banners (active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS location_presence (
  user_id uuid PRIMARY KEY,
  display_name varchar(80) NOT NULL DEFAULT '',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  address_label varchar(240) NOT NULL DEFAULT '',
  battery_pct integer,
  online boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vmap_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL,
  title varchar(80) NOT NULL DEFAULT '약속',
  place_label varchar(160) NOT NULL DEFAULT '',
  place_lat double precision NOT NULL,
  place_lng double precision NOT NULL,
  place_ready boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  closing_at timestamptz,
  closing_reason varchar(16) NOT NULL DEFAULT '',
  log_body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vmap_rooms_host_idx ON vmap_rooms (host_user_id, active);

CREATE TABLE IF NOT EXISTS vmap_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  user_id uuid NOT NULL,
  display_name varchar(80) NOT NULL DEFAULT '',
  departed boolean NOT NULL DEFAULT false,
  arrived boolean NOT NULL DEFAULT false,
  lat double precision,
  lng double precision,
  battery_pct integer,
  online boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS vmap_members_room_idx ON vmap_members (room_id);

CREATE TABLE IF NOT EXISTS vmap_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  user_id uuid NOT NULL,
  display_name varchar(80) NOT NULL DEFAULT '',
  kind varchar(16) NOT NULL DEFAULT 'text',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vmap_messages_room_idx ON vmap_messages (room_id, created_at);

ALTER TABLE vmap_rooms ADD COLUMN IF NOT EXISTS place_ready boolean NOT NULL DEFAULT false;
ALTER TABLE vmap_rooms ADD COLUMN IF NOT EXISTS closing_at timestamptz;
ALTER TABLE vmap_rooms ADD COLUMN IF NOT EXISTS closing_reason varchar(16) NOT NULL DEFAULT '';
ALTER TABLE vmap_rooms ADD COLUMN IF NOT EXISTS log_body text NOT NULL DEFAULT '';
ALTER TABLE vmap_members ADD COLUMN IF NOT EXISTS arrived boolean NOT NULL DEFAULT false;
