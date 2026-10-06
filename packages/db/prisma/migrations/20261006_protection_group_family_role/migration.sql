-- 가족 계정 역할(PARENT/KIDS), CI 문자열 키, 가족 보호 그룹·슬롯

DO $$ BEGIN
  CREATE TYPE "FamilyAccountRole" AS ENUM ('PARENT', 'KIDS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GroupMemberType" AS ENUM ('OWNED_MEMBER', 'CARE_MEMBER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "family_role" "FamilyAccountRole" NOT NULL DEFAULT 'PARENT';

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "ci" VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS "users_ci_key" ON "users"("ci");

CREATE TABLE IF NOT EXISTS "protection_groups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_id" UUID NOT NULL,
  "max_members" INTEGER NOT NULL DEFAULT 4,
  "extra_slots" INTEGER NOT NULL DEFAULT 0,
  "invite_code" VARCHAR(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "protection_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "protection_groups_owner_id_key" ON "protection_groups"("owner_id");
CREATE UNIQUE INDEX IF NOT EXISTS "protection_groups_invite_code_key" ON "protection_groups"("invite_code");

DO $$ BEGIN
  ALTER TABLE "protection_groups"
    ADD CONSTRAINT "protection_groups_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "protection_group_members" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "group_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "member_type" "GroupMemberType" NOT NULL,
  "is_location_sharing" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "protection_group_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "protection_group_members_group_id_user_id_key"
  ON "protection_group_members"("group_id", "user_id");

CREATE INDEX IF NOT EXISTS "protection_group_members_user_id_member_type_idx"
  ON "protection_group_members"("user_id", "member_type");

DO $$ BEGIN
  ALTER TABLE "protection_group_members"
    ADD CONSTRAINT "protection_group_members_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "protection_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "protection_group_members"
    ADD CONSTRAINT "protection_group_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
