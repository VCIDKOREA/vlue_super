-- V1 마이케이스(쇼케이스 아카이브) + 메인 송출 쿨다운

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "main_broadcast_changed_at" TIMESTAMPTZ(6);

CREATE TABLE IF NOT EXISTS "showcase_cases" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "thumbnail_url" VARCHAR(2048),
    "payload_json" JSONB NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "is_main_broadcast" BOOLEAN NOT NULL DEFAULT false,
    "slot_index" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "showcase_cases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "showcase_cases_owner_user_id_deleted_at_created_at_idx"
  ON "showcase_cases"("owner_user_id", "deleted_at", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "showcase_cases_owner_user_id_is_main_broadcast_deleted_at_idx"
  ON "showcase_cases"("owner_user_id", "is_main_broadcast", "deleted_at");

CREATE INDEX IF NOT EXISTS "showcase_cases_owner_user_id_is_public_deleted_at_created_at_idx"
  ON "showcase_cases"("owner_user_id", "is_public", "deleted_at", "created_at" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'showcase_cases_owner_user_id_fkey'
  ) THEN
    ALTER TABLE "showcase_cases"
      ADD CONSTRAINT "showcase_cases_owner_user_id_fkey"
      FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
