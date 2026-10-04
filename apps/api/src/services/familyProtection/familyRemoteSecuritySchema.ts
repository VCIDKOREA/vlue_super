import { prisma } from "../../db/client.js";

let ready = false;

/** 원격 감지·하트비트·마지막 위치 보존 테이블 (런타임 ensure) */
export async function ensureFamilyRemoteSecuritySchema() {
  if (ready) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS family_remote_security_state (
      user_id uuid PRIMARY KEY,
      is_remote_active boolean NOT NULL DEFAULT false,
      remote_app_package varchar(160) NOT NULL DEFAULT '',
      remote_app_label varchar(80) NOT NULL DEFAULT '',
      remote_detected_at timestamptz NULL,
      last_heartbeat_at timestamptz NULL,
      device_status varchar(24) NOT NULL DEFAULT 'CONNECTED',
      last_lat double precision NULL,
      last_lng double precision NULL,
      last_seen_at timestamptz NULL,
      stage1_notified_at timestamptz NULL,
      stage2_reason varchar(32) NOT NULL DEFAULT '',
      stage2_notified_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE location_presence
      ADD COLUMN IF NOT EXISTS last_lat double precision NULL,
      ADD COLUMN IF NOT EXISTS last_lng double precision NULL,
      ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NULL,
      ADD COLUMN IF NOT EXISTS connection_status varchar(24) NOT NULL DEFAULT 'CONNECTED';
  `);
  ready = true;
}
