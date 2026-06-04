-- CreateEnum
CREATE TYPE "FamilyRelation" AS ENUM ('parent', 'child');

-- AlterEnum
ALTER TYPE "FamilyAlertKind" ADD VALUE IF NOT EXISTS 'elder_missed_calls';

-- AlterTable
ALTER TABLE "family_protection_links" ADD COLUMN "family_relation" "FamilyRelation";
UPDATE "family_protection_links" SET "family_relation" = CASE WHEN "ward_role" = 'child' THEN 'child'::"FamilyRelation" ELSE 'parent'::"FamilyRelation" END;
ALTER TABLE "family_protection_links" ALTER COLUMN "family_relation" SET NOT NULL;

ALTER TABLE "family_protection_links" ADD COLUMN "alert_no_app_enabled" BOOLEAN;
ALTER TABLE "family_protection_links" ADD COLUMN "alert_no_app_hours" INTEGER;
ALTER TABLE "family_protection_links" ADD COLUMN "alert_missed_call_enabled" BOOLEAN;
ALTER TABLE "family_protection_links" ADD COLUMN "alert_missed_call_threshold" INTEGER;

-- CreateTable
CREATE TABLE "family_protection_settings" (
    "user_id" UUID NOT NULL,
    "alert_no_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "alert_no_app_hours" INTEGER NOT NULL DEFAULT 24,
    "alert_missed_call_enabled" BOOLEAN NOT NULL DEFAULT true,
    "alert_missed_call_threshold" INTEGER NOT NULL DEFAULT 3,
    "alert_child_site_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "family_protection_settings_pkey" PRIMARY KEY ("user_id")
);

-- AlterTable
ALTER TABLE "family_ward_presence" ADD COLUMN "missed_call_streak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "family_ward_presence" ADD COLUMN "missed_call_streak_since" TIMESTAMPTZ(6);

-- AddForeignKey
ALTER TABLE "family_protection_settings" ADD CONSTRAINT "family_protection_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
