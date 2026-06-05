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
