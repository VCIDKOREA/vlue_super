-- V2 마이케이스·#해시태그 디렉토리 검색용
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "showcase_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
