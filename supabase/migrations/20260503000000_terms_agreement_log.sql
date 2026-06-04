-- VLUE 약관 동의 법적 로그 (Terms_Agreement_Log)
-- Edge Function(service role) 삽입 전용. 클라이언트 직접 INSERT 불가.

create table if not exists public.terms_agreement_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  terms_version text not null,
  agreed_at timestamptz not null default now(),
  client_ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists terms_agreement_log_agreed_at_idx on public.terms_agreement_log (agreed_at desc);
create index if not exists terms_agreement_log_terms_version_idx on public.terms_agreement_log (terms_version);

comment on table public.terms_agreement_log is 'VLUE 서비스 약관 동의 시 IP(Edge에서 수집)/UA/버전/시각 증빙';

alter table public.terms_agreement_log enable row level security;

-- 일반 클라이언트는 읽기/쓰기 불가. service_role(Edge Function)은 RLS 우회.
create policy "terms_agreement_log_no_anon"
  on public.terms_agreement_log
  for all
  using (false)
  with check (false);
