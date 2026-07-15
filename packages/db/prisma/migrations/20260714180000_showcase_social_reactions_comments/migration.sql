-- V2 showcase social: likes + comments
CREATE TABLE IF NOT EXISTS "showcase_reactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "actor_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "slide_id" VARCHAR(80) NOT NULL DEFAULT '',
  "type" VARCHAR(24) NOT NULL DEFAULT 'like',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "showcase_reactions_owner_actor_type_slide_key"
  ON "showcase_reactions" ("owner_user_id", "actor_user_id", "type", "slide_id");

CREATE INDEX IF NOT EXISTS "showcase_reactions_owner_type_created_idx"
  ON "showcase_reactions" ("owner_user_id", "type", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "showcase_comments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "author_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "slide_id" VARCHAR(80) NOT NULL DEFAULT '',
  "body" VARCHAR(1000) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "showcase_comments_owner_slide_created_idx"
  ON "showcase_comments" ("owner_user_id", "slide_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "showcase_comments_author_created_idx"
  ON "showcase_comments" ("author_user_id", "created_at" DESC);
