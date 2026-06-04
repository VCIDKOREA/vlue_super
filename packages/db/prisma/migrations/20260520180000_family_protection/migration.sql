-- CreateEnum
CREATE TYPE "FamilyWardRole" AS ENUM ('elder', 'child');

-- CreateEnum
CREATE TYPE "FamilyProtectionLinkStatus" AS ENUM ('pending', 'active', 'revoked');

-- CreateEnum
CREATE TYPE "FamilyAlertKind" AS ENUM ('elder_no_app_24h', 'elder_device_absent', 'child_risky_site');

-- CreateTable
CREATE TABLE "family_protection_links" (
    "id" UUID NOT NULL,
    "guardian_user_id" UUID NOT NULL,
    "ward_user_id" UUID NOT NULL,
    "ward_role" "FamilyWardRole" NOT NULL,
    "status" "FamilyProtectionLinkStatus" NOT NULL DEFAULT 'pending',
    "ward_accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "family_protection_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_ward_presence" (
    "ward_user_id" UUID NOT NULL,
    "last_app_access_at" TIMESTAMPTZ(6),
    "last_device_seen_at" TIMESTAMPTZ(6),
    "device_absent_since" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "family_ward_presence_pkey" PRIMARY KEY ("ward_user_id")
);

-- CreateTable
CREATE TABLE "family_protection_alerts" (
    "id" UUID NOT NULL,
    "ward_user_id" UUID NOT NULL,
    "kind" "FamilyAlertKind" NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "body" TEXT NOT NULL,
    "payload_json" JSONB,
    "guardians_notified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_protection_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "family_protection_links_guardian_user_id_ward_user_id_key" ON "family_protection_links"("guardian_user_id", "ward_user_id");

-- CreateIndex
CREATE INDEX "family_protection_links_ward_user_id_status_idx" ON "family_protection_links"("ward_user_id", "status");

-- CreateIndex
CREATE INDEX "family_protection_links_guardian_user_id_status_idx" ON "family_protection_links"("guardian_user_id", "status");

-- CreateIndex
CREATE INDEX "family_protection_alerts_ward_user_id_kind_created_at_idx" ON "family_protection_alerts"("ward_user_id", "kind", "created_at");

-- AddForeignKey
ALTER TABLE "family_protection_links" ADD CONSTRAINT "family_protection_links_guardian_user_id_fkey" FOREIGN KEY ("guardian_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_protection_links" ADD CONSTRAINT "family_protection_links_ward_user_id_fkey" FOREIGN KEY ("ward_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_ward_presence" ADD CONSTRAINT "family_ward_presence_ward_user_id_fkey" FOREIGN KEY ("ward_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
