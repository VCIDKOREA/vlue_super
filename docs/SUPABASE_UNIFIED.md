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

DM·Realtime·`card_wallet` REST 는 **ywhj 프로젝트**의 anon 키가 필요합니다.

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

## 6. 확인

```bash
npm run start -w @vlue/api
# GET http://127.0.0.1:8788/api/health
```

웹: DM 화면에서 Realtime 연결, `VITE_SUPABASE_*` 경고가 없어야 합니다.
