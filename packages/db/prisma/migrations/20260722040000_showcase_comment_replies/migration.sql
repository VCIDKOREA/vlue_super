-- Showcase comments: Instagram-style replies (1-level parent)
ALTER TABLE "showcase_comments"
  ADD COLUMN IF NOT EXISTS "parent_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'showcase_comments_parent_id_fkey'
  ) THEN
    ALTER TABLE "showcase_comments"
      ADD CONSTRAINT "showcase_comments_parent_id_fkey"
      FOREIGN KEY ("parent_id") REFERENCES "showcase_comments"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "showcase_comments_parent_id_created_at_idx"
  ON "showcase_comments"("parent_id", "created_at" ASC);
