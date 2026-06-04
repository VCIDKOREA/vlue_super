# VLUE 테스트 계정

생성: `npm run seed:test-accounts`

공통 비밀번호: `VlueTest1!`

| 구분 | 로그인 ID | 휴대폰 | 이메일 |
|------|-----------|--------|--------|
| 일반(무료) | `test_free` | +821090000001 | test-free@vlue.test |
| 유료 | `test_paid` | +821090000002 | test-paid@vlue.test |
| 기업단체(B2B) | `test_b2b` | +821090000003 | test-b2b@vlue.test |

## 로그인

회원 ID(publicHandle) + 비밀번호로 로그인합니다.

가입·로그인 후 `localStorage.membershipTier` 를 맞추려면:
- 일반: `free`
- 유료: `paid`
- 기업: `b2b`

## PC 관제 데스크 (SUPER_ADMIN)

주소: **`http://localhost:5173/super-admin-hq`** (루트 `/` 가 아님)

| 로그인 ID | 비밀번호 | 권한 |
|-----------|----------|------|
| `test_b2b` | `VlueTest1!` | SUPER_ADMIN (`role=admin`) |

로그인 후 4:6 분할 관제 데스크(홈 레이아웃 편집 + 실시간 미리보기)가 열립니다.
