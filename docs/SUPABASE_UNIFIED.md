# Supabase 단일 프로젝트 (`ywhjhdpecwvaujiagaln`)

개발·프로덕션·Railway·Prisma를 **한 Supabase 프로젝트**만 쓰도록 통일합니다.  
대시보드 이름이 `vlue-production` 이어도 **Reference ID**가 아래와 같으면 동일 프로젝트입니다.

| 항목 | 값 |
|------|-----|
| Reference ID | `ywhjhdpecwvaujiagaln` |
| API URL | `https://ywhjhdpecwvaujiagaln.supabase.co` |
| DB 호스트 | `db.ywhjhdpecwvaujiagaln.supabase.co` |

이전 프로젝트 `qvynpdsxbqvlxkhsglib` 은 더 이상 레포 기본값이 아닙니다.

## 1. 로컬 env (이미 반영된 파일)

- 루트 `.env`
- `apps/api/.env`
- `packages/db/.env`

`DATABASE_URL` / `DIRECT_URL` 은 `인프라마스터정보_도메인부터파이어베이스까지.txt` 와 동일한 DB를 가리킵니다.  
비밀번호에 `!` 가 있으면 URL에는 `%21` 로 넣습니다.

## 2. Supabase anon 키 (필수 — 직접 붙여넣기)

DM Realtime(선택)은 **ywhj 프로젝트**의 anon 키가 필요합니다.  
**`card_wallet` REST 직접 쓰기는 보안상 제거** — 명함첩은 localStorage만 사용합니다.

1. Supabase → **vlue-production** (ref `ywhjhdpecwvaujiagaln`)
2. **Settings → API** → `anon` `public` 키 복사
3. 루트 `.env` 의 `VITE_SUPABASE_ANON_KEY=` 에 붙여넣기
4. Railway **웹** 서비스 Variables에도 동일하게 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## 3. 스키마 적용 (새 DB가 비어 있을 때)

```bash
npm run db:deploy:safe
```

`packages/db/.env` 의 `DATABASE_URL` 이 ywhj 를 가리키는지 확인한 뒤 실행합니다.

## 4. Railway `@vlue/api`

| Variable | 값 |
|----------|-----|
| `DATABASE_URL` | `인프라마스터정보` 의 PostgreSQL URL (또는 Supabase **Transaction pooler** 6543 URL) |
| `DIRECT_URL` | (선택) 마이그레이션용 `:5432` 직접 URL |
| `REDIS_URL` | 마스터 문서 Upstash URL |

## 5. 예전 DB(`qvyn`) 데이터가 필요할 때

- **필요 없음** → Supabase에서 `qvyn` 프로젝트 **Pause** 후 나중에 삭제
- **필요함** → Table 데이터만 pg_dump/pg_restore 또는 Supabase 백업으로 **ywhj** 로 이관 후 3번 재실행

## 6. 보안 — RLS 잠금 (필수)

Supabase Security Advisor 경고(`rls_disabled_in_public`, `sensitive_columns_exposed`) 대응:

1. **SQL 적용** (둘 중 하나)
   - Dashboard → **SQL Editor** → `supabase/migrations/20260608120000_lockdown_public_rls.sql` 전체 붙여넣기 → Run
   - 또는 로컬: `npm run db:supabase-rls-lockdown` (`packages/db/.env`에 `DIRECT_URL`)
2. **Advisor** → Issues에서 Critical 해소 확인 (수 분~24시간)
3. **원칙**
   - `public` 모든 테이블: RLS ON + anon/authenticated 거부
   - `User.password_hash` 등 민감 컬럼: 브라우저 anon 키로 REST 접근 불가
   - VLUE API(Prisma·`DATABASE_URL`)만 DB 읽기/쓰기
   - 마케팅 `documents` 테이블만 `is_active=true` 공개 읽기 예외

## 7. 확인

```bash
npm run start -w @vlue/api
# GET http://127.0.0.1:8788/api/health
```

웹: DM 화면에서 Realtime 연결, `VITE_SUPABASE_*` 경고가 없어야 합니다.
