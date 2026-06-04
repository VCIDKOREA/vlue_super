-- VLUER 슬라이딩 할인·재가입 어뷰징 방어
CREATE TABLE "member_referral_benefit_states" (
    "user_id" UUID NOT NULL,
    "accumulated_benefit_months" INTEGER NOT NULL DEFAULT 0,
    "sponsor_penalty_months_left" INTEGER NOT NULL DEFAULT 0,
    "is_rejoin_from_abuse_log" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "member_referral_benefit_states_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "abusing_protection_logs" (
    "hashed_identity" VARCHAR(64) NOT NULL,
    "accumulated_using_months" INTEGER NOT NULL DEFAULT 0,
    "last_referral_code" VARCHAR(24),
    "deleted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abusing_protection_logs_pkey" PRIMARY KEY ("hashed_identity")
);

ALTER TABLE "member_referral_benefit_states" ADD CONSTRAINT "member_referral_benefit_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
