-- Portone 본인인증 생년월일·성별 (CI는 ci_hash만 저장)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "birth_date" VARCHAR(8);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gender" VARCHAR(1);
