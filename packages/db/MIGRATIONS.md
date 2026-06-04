# DB 마이그레이션 가이드

## 일괄 적용 (권장)

```bash
npm run db:deploy:safe
```

1. 실패 기록된 `20260521200000_vluer_grade_system` 을 rolled-back 처리
2. `prisma migrate deploy` — 미적용 마이그레이션 전부 적용
3. `prisma generate` (Windows EPERM 시 API 중지 후 `npm run db:generate:safe`)

## 수동 적용

```bash
cd packages/db
npx prisma migrate resolve --rolled-back 20260521200000_vluer_grade_system   # 실패 이력 있을 때만
npx prisma migrate deploy
cd ../..
npm run db:generate:safe
```

## PostgreSQL enum 주의

`VluerTierCode` 에 값을 추가한 뒤 **같은 마이그레이션 파일에서** 그 값으로 `UPDATE` 하면 실패합니다.

- `20260521200000_vluer_grade_system` — enum·컬럼만 추가
- `20260521200050_vluer_grade_backfill` — 데이터 backfill (별도 트랜잭션)

## 최근 적용 마이그레이션 (2026-05-21~24)

| 마이그레이션 | 내용 |
|-------------|------|
| `20260521200000` | VluerGrade, tier_code enum 확장 |
| `20260521200050` | tier/grade backfill |
| `20260521210000` | B2B 회선 대표번호 표시 |
| `20260521220000` | B2B 회선·기기·구매요청·그룹채팅 |
| `20260521230000` | 회선 역할·임직원 자격증명 |
| `20260521240000` | planned_line_count, group_chat |
| `20260521250000` | 개인 콤보 회사 인증·OTP |

## 테스트 계정

```bash
npm run seed:test-accounts
```

자세한 로그인 정보: `scripts/TEST_ACCOUNTS.md`
