import { prisma } from "../../db/client.js";

let ready = false;

export async function ensureLocationPresenceOverseasSchema() {
  if (ready) return;
  await prisma.$executeRawUnsafe(`
    ALTER TABLE location_presence
      ADD COLUMN IF NOT EXISTS is_overseas boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS country_code varchar(8) NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS country_name varchar(80) NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS city_name varchar(80) NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS time_zone_id varchar(64) NOT NULL DEFAULT '';
  `);
  ready = true;
}
