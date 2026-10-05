-- VLUÉ 가격·추천인·파트너·CI 최초가입 정책 (2026-10)
-- Apply: npx prisma migrate deploy  OR  prisma db execute --file ...

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_first_join" BOOLEAN NOT NULL DEFAULT true;

-- CI 유일 인덱스 (NULL 은 다건 허용 — Postgres UNIQUE 동작)
DROP INDEX IF EXISTS "users_ci_hash_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "users_ci_hash_key" ON "users"("ci_hash");

ALTER TABLE "user_vluer_profiles"
  ADD COLUMN IF NOT EXISTS "partner_type" TEXT,
  ADD COLUMN IF NOT EXISTS "partner_status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "parent_employee_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "monthly_active_referrals" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "partner_suspended_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "partner_terminated_at" TIMESTAMPTZ(6);

DO $$ BEGIN
  CREATE TYPE "PartnerProgramType" AS ENUM ('EMPLOYEE', 'EXTERNAL_PARTNER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PartnerProgramStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- partner_type / partner_status 를 enum 으로 승격 (이미 text면 캐스팅)
DO $$ BEGIN
  ALTER TABLE "user_vluer_profiles"
    ALTER COLUMN "partner_type" TYPE "PartnerProgramType"
    USING (
      CASE
        WHEN "partner_type" IN ('EMPLOYEE', 'EXTERNAL_PARTNER') THEN "partner_type"::"PartnerProgramType"
        ELSE NULL
      END
    );
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_vluer_profiles"
    ALTER COLUMN "partner_status" TYPE "PartnerProgramStatus"
    USING (
      CASE
        WHEN "partner_status" IN ('ACTIVE', 'SUSPENDED', 'TERMINATED') THEN "partner_status"::"PartnerProgramStatus"
        ELSE 'ACTIVE'::"PartnerProgramStatus"
      END
    );
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_vluer_profiles"
    ADD CONSTRAINT "user_vluer_profiles_parent_employee_user_id_fkey"
    FOREIGN KEY ("parent_employee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "user_vluer_profiles_partner_status_partner_type_idx"
  ON "user_vluer_profiles"("partner_status", "partner_type");
CREATE INDEX IF NOT EXISTS "user_vluer_profiles_parent_employee_user_id_idx"
  ON "user_vluer_profiles"("parent_employee_user_id");

DO $$ BEGIN
  CREATE TYPE "CommissionSettlementStatus" AS ENUM ('pending_hold', 'confirmed', 'clawed_back', 'company_retained');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "commission_ledgers"
  ADD COLUMN IF NOT EXISTS "settlement_status" TEXT NOT NULL DEFAULT 'pending_hold',
  ADD COLUMN IF NOT EXISTS "eligible_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMPTZ(6);

DO $$ BEGIN
  ALTER TABLE "commission_ledgers"
    ALTER COLUMN "settlement_status" TYPE "CommissionSettlementStatus"
    USING (
      CASE
        WHEN "settlement_status" IN ('pending_hold', 'confirmed', 'clawed_back', 'company_retained')
          THEN "settlement_status"::"CommissionSettlementStatus"
        ELSE 'pending_hold'::"CommissionSettlementStatus"
      END
    );
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "commission_ledgers_settlement_status_eligible_at_idx"
  ON "commission_ledgers"("settlement_status", "eligible_at");
