-- 회원 공개 ID (가입 시 1회 확정, 변경 없음)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "public_handle" VARCHAR(32);

CREATE UNIQUE INDEX IF NOT EXISTS "users_public_handle_key" ON "users" ("public_handle");
