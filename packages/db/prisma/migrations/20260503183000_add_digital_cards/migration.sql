-- VLUE 디지털 명함: 가입 시 신청한 사용자만 1:1 행 생성

CREATE TABLE "digital_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "membership_tier_snapshot" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_cards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "digital_cards_user_id_key" ON "digital_cards"("user_id");

ALTER TABLE "digital_cards" ADD CONSTRAINT "digital_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
