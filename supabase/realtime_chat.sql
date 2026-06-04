-- VLUE DM — Supabase Realtime용 (SQL Editor에서 한 번 실행)
-- Prisma 마이그레이션으로 만든 public.chat_messages / chat_rooms 와 동일 DB를 사용합니다.

-- 1) Realtime publication 에 INSERT 브로드캐스트 대상으로 등록
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- (선택) UPDATE/DELETE 변경까지 필터링하려면 REPLICA IDENTITY FULL
-- ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- 2) RLS: Realtime은 RLS를 적용합니다. 앱은 API(Prisma)로 쓰기하고,
--    브라우저 anon 키로는 INSERT 구독만 필요하면 아래처럼 최소 정책을 둡니다.
--    운영 전에는 반드시 Supabase Auth 연동·정책 강화로 교체하세요.

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 개발/연결 확인용: 익명·인증 모두 읽기 허용 (모든 메시지 노출 — 임시)
DROP POLICY IF EXISTS "chat_messages_select_all_for_dev" ON public.chat_messages;
CREATE POLICY "chat_messages_select_all_for_dev" ON public.chat_messages
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- anon 이 직접 insert 하지 않을 때는 쓰기 정책을 두지 않아도 됩니다( API만 insert ).
