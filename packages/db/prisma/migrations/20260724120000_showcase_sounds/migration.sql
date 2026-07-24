-- 쇼케이스 음원 (Signature / User Original) · 퍼가기 · 월간 쿼터
DO $$ BEGIN
  CREATE TYPE "ShowcaseSoundKind" AS ENUM ('signature', 'user_original');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ShowcaseSoundCreateType" AS ENUM ('human_created', 'ai_assisted', 'ai_generated', 'remake_arrangement');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ShowcaseSoundVisibility" AS ENUM ('public', 'private');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "showcase_sounds" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "kind" "ShowcaseSoundKind" NOT NULL,
  "owner_user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
  "create_type" "ShowcaseSoundCreateType" NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "artist_name" VARCHAR(120),
  "audio_url" TEXT NOT NULL,
  "object_key" VARCHAR(512),
  "content_type" VARCHAR(80),
  "file_size" INTEGER,
  "visibility" "ShowcaseSoundVisibility" NOT NULL DEFAULT 'private',
  "attribution_label" VARCHAR(40) NOT NULL DEFAULT 'Human Created',
  "ai_meta_json" JSONB,
  "copyright_verify_json" JSONB,
  "rights_consent_at" TIMESTAMPTZ(6),
  "commercial_use_claimed" BOOLEAN NOT NULL DEFAULT false,
  "is_published" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "admin_note" VARCHAR(500),
  "deleted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "showcase_sounds_kind_pub_idx"
  ON "showcase_sounds" ("kind", "is_published", "deleted_at", "sort_order");
CREATE INDEX IF NOT EXISTS "showcase_sounds_owner_idx"
  ON "showcase_sounds" ("owner_user_id", "deleted_at", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "showcase_sounds_vis_idx"
  ON "showcase_sounds" ("visibility", "deleted_at", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "showcase_sound_borrows" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "borrower_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "sound_id" UUID NOT NULL REFERENCES "showcase_sounds"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "showcase_sound_borrows_unique" UNIQUE ("borrower_user_id", "sound_id")
);
CREATE INDEX IF NOT EXISTS "showcase_sound_borrows_sound_idx"
  ON "showcase_sound_borrows" ("sound_id");

CREATE TABLE IF NOT EXISTS "showcase_sound_quota_months" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "year_month" VARCHAR(7) NOT NULL,
  "register_count" INTEGER NOT NULL DEFAULT 0,
  "theme_change_week_key" VARCHAR(10),
  "theme_change_count" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "showcase_sound_quota_months_unique" UNIQUE ("user_id", "year_month")
);
