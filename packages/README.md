# packages — 공통 라이브러리

| 패키지 | 내용 |
|--------|------|
| `@vlue/db` | `prisma/schema.prisma`, 마이그레이션, Prisma Client |
| `@vlue/shared` | 가입 어뷰징 검증(`signupGateCore`), 레퍼럴 정산(`referralSettlementPolicy`), 멤버십 프라이싱 |

웹(`@vlue/web`)과 API(`@vlue/api`)는 **동일한 `@vlue/shared` 규칙**을 import 합니다.
