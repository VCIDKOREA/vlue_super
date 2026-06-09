-- VLUE production (ywhjhdpecwvaujiagaln) — Supabase Security Advisor 대응
-- rls_disabled_in_public · sensitive_columns_exposed
--
-- 원칙: public 스키마 모든 테이블 RLS ON.
-- 정책이 없으면 anon/authenticated 접근은 기본 거부됩니다.
-- Prisma API(DATABASE_URL·postgres/service_role)는 RLS를 우회합니다.
--
-- 적용: Supabase Dashboard → SQL Editor → 전체 실행
-- 또는: npm run db:supabase-rls-lockdown (psql + DIRECT_URL)

-- 1) 개발용 전체 공개 정책 제거
DROP POLICY IF EXISTS "chat_messages_select_all_for_dev" ON public.chat_messages;

-- 2) public 스키마 모든 테이블 RLS 활성화
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relispartition
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- 3) (선택) 마케팅 documents — 활성 문서만 공개 읽기
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'documents'
  ) THEN
    DROP POLICY IF EXISTS "documents_public_read_active" ON public.documents;
    CREATE POLICY "documents_public_read_active" ON public.documents
      FOR SELECT
      TO anon, authenticated
      USING (COALESCE(is_active, false) = true);
  END IF;
END $$;

-- 4) terms_agreement_log — 테이블이 있을 때만 (미생성 DB는 스킵)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'terms_agreement_log'
  ) THEN
    ALTER TABLE public.terms_agreement_log ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "terms_agreement_log_no_anon" ON public.terms_agreement_log;
    CREATE POLICY "terms_agreement_log_no_anon"
      ON public.terms_agreement_log
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;
