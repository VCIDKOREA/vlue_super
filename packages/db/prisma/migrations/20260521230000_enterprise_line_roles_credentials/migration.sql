-- B2B cart line role + member credentials

ALTER TABLE "b2b_cart_lines" ADD COLUMN "enterprise_role" "EnterpriseRole" NOT NULL DEFAULT 'STAFF';

CREATE TABLE "enterprise_member_credentials" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "enterprise_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "public_handle" VARCHAR(32) NOT NULL,
  "assignee_name" VARCHAR(120) NOT NULL,
  "enterprise_role" "EnterpriseRole" NOT NULL DEFAULT 'STAFF',
  "line_kind" "B2BCartLineKind" NOT NULL,
  "phone_e164" VARCHAR(24) NOT NULL,
  "initial_password" VARCHAR(64) NOT NULL,
  "delivered_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_member_credentials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "enterprise_member_credentials_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "b2b_enterprise_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "enterprise_member_credentials_enterprise_id_user_id_key" ON "enterprise_member_credentials"("enterprise_id", "user_id");
CREATE INDEX "enterprise_member_credentials_enterprise_id_created_at_idx" ON "enterprise_member_credentials"("enterprise_id", "created_at" DESC);
