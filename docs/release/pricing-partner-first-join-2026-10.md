# VLUÉ 가격·추천인·파트너·재가입 정책 마이그레이션 (2026-10)

## 적용 SQL

`packages/db/prisma/migrations/20261006_pricing_partner_first_join/migration.sql`

추가 컬럼·enum:

- `users.is_first_join` (BOOLEAN, default true)
- `users.ci_hash` UNIQUE 인덱스 (`users_ci_hash_key`)
- `user_vluer_profiles.partner_type` / `partner_status` / `parent_employee_user_id` / `monthly_active_referrals` …
- `commission_ledgers.settlement_status` / `eligible_at` / `confirmed_at`

## 실행 (로컬 / Railway)

```powershell
cd D:\dev\vlue_super\packages\db
npx prisma migrate deploy
npx prisma generate
```

또는 SQL만:

```powershell
cd D:\dev\vlue_super\packages\db
npx prisma db execute --file prisma/migrations/20261006_pricing_partner_first_join/migration.sql
npx prisma generate
```

## shared 패키지 재빌드

```powershell
cd D:\dev\vlue_super\packages\shared
npm run build
```

## 크론

매월 1일: `GET/POST /api/cron/partner-monthly-eligibility`  
(외부 파트너 전월 신규 < 10명 → `SUSPENDED` + 수수료 `company_retained`)

## CI 우선 규칙

1. PortOne 본인인증 CI → `users.ci_hash` + `abusing_protection_logs`
2. 동일 CI 재등장 → `is_first_join=false` → 추천 할인·파트너 수수료 제외
3. 결제 금액: 모바일 이벤트 14,100/141,000 · 최초+추천 9,900/99,000 · 내선 5,200(추천 불가)
