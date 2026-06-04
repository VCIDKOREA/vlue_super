-- VLUE 초기 스키마 (Prisma migrate diff 기준, UUID 기본값 보정)

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

CREATE TYPE "AccountStatus" AS ENUM ('pending_identity', 'pending_approval', 'active', 'suspended');

CREATE TYPE "FriendRequestStatus" AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT,
    "phone_e164" TEXT,
    "legal_name" VARCHAR(120),
    "legal_name_locked_at" TIMESTAMPTZ(6),
    "identity_verified" BOOLEAN NOT NULL DEFAULT false,
    "identity_verified_at" TIMESTAMPTZ(6),
    "portone_identity_id" VARCHAR(255),
    "ci_hash" BYTEA,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "account_status" "AccountStatus" NOT NULL DEFAULT 'pending_identity',
    "pending_approval_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_business_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "is_business" BOOLEAN NOT NULL DEFAULT false,
    "business_registration_no" VARCHAR(20),
    "company_name" VARCHAR(200),
    "job_title" VARCHAR(120),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_business_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "friend_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID NOT NULL,
    "applicant_legal_name_snapshot" VARCHAR(120) NOT NULL,
    "is_applicant_business" BOOLEAN NOT NULL DEFAULT false,
    "purpose_checklist" JSONB NOT NULL,
    "purpose_text" TEXT,
    "status" "FriendRequestStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friend_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE UNIQUE INDEX "users_phone_e164_key" ON "users"("phone_e164");

CREATE UNIQUE INDEX "users_portone_identity_id_key" ON "users"("portone_identity_id");

CREATE INDEX "users_ci_hash_idx" ON "users"("ci_hash");

CREATE UNIQUE INDEX "user_business_profiles_user_id_key" ON "user_business_profiles"("user_id");

CREATE INDEX "friend_requests_to_user_id_status_idx" ON "friend_requests"("to_user_id", "status");

CREATE INDEX "friend_requests_from_user_id_idx" ON "friend_requests"("from_user_id");

CREATE INDEX "friend_requests_from_user_id_to_user_id_idx" ON "friend_requests"("from_user_id", "to_user_id");

ALTER TABLE "user_business_profiles" ADD CONSTRAINT "user_business_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
