-- VLUE DM — Supabase Realtime용 (SQL Editor에서 한 번 실행)
-- Prisma 마이그레이션으로 만든 public.chat_messages / chat_rooms 와 동일 DB를 사용합니다.

-- 1) Realtime publication 에 INSERT 브로드캐스트 대상으로 등록
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- (선택) UPDATE/DELETE 변경까지 필터링하려면 REPLICA IDENTITY FULL
-- ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- 2) RLS: 운영 잠금은 supabase/migrations/20260608120000_lockdown_public_rls.sql 적용.
--    chat_messages 는 anon REST/Realtime 직접 접근 차단. DM은 VLUE API + SSE 사용.

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_messages_select_all_for_dev" ON public.chat_messages;
