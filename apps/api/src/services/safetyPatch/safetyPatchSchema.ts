import { prisma } from "../../db/client.js";

let ready = false;

export async function ensureSafetyPatchSchema() {
  if (ready) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS safety_patch_sessions (
      user_id uuid PRIMARY KEY,
      last_patched_at timestamptz NOT NULL,
      expiry_notified_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS safety_patch_sessions_expiry_idx
      ON safety_patch_sessions (last_patched_at);
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE safety_patch_sessions
      ADD COLUMN IF NOT EXISTS battery_pct integer,
      ADD COLUMN IF NOT EXISTS is_charging boolean,
      ADD COLUMN IF NOT EXISTS lat double precision,
      ADD COLUMN IF NOT EXISTS lng double precision,
      ADD COLUMN IF NOT EXISTS location_status text,
      ADD COLUMN IF NOT EXISTS installer_package text,
      ADD COLUMN IF NOT EXISTS play_store_install boolean,
      ADD COLUMN IF NOT EXISTS emulator boolean,
      ADD COLUMN IF NOT EXISTS rooted boolean;
  `);
  await prisma.$executeRawUnsafe(`
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
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS safety_patch_reports_pair_idx
      ON safety_patch_reports (viewer_user_id, target_user_id, created_at DESC);
  `);
  ready = true;
}
