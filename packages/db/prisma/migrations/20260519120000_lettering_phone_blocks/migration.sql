-- LetteringPhoneBlock / LetteringPhoneReport — FK to users(id)

CREATE TABLE IF NOT EXISTS "lettering_phone_blocks" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "phone_e164" VARCHAR(24) NOT NULL,
    "reason" VARCHAR(200),
    "report_id" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lettering_phone_blocks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lettering_phone_reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "phone_e164" VARCHAR(24) NOT NULL,
    "reason_id" VARCHAR(32) NOT NULL,
    "detail" TEXT,
    "card_snapshot" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lettering_phone_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lettering_phone_blocks_owner_id_phone_e164_key"
    ON "lettering_phone_blocks"("owner_id", "phone_e164");

CREATE INDEX IF NOT EXISTS "lettering_phone_blocks_owner_id_idx"
    ON "lettering_phone_blocks"("owner_id");

CREATE INDEX IF NOT EXISTS "lettering_phone_blocks_phone_e164_idx"
    ON "lettering_phone_blocks"("phone_e164");

CREATE INDEX IF NOT EXISTS "lettering_phone_reports_reporter_id_idx"
    ON "lettering_phone_reports"("reporter_id");

CREATE INDEX IF NOT EXISTS "lettering_phone_reports_phone_e164_idx"
    ON "lettering_phone_reports"("phone_e164");

DO $$ BEGIN
    ALTER TABLE "lettering_phone_blocks"
        ADD CONSTRAINT "lettering_phone_blocks_owner_id_fkey"
        FOREIGN KEY ("owner_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "lettering_phone_reports"
        ADD CONSTRAINT "lettering_phone_reports_reporter_id_fkey"
        FOREIGN KEY ("reporter_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
