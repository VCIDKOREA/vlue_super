# VLUE 플랫폼 고정 계정 (역할 분리)

생성: `npm run seed:platform-accounts`

| 구분 | 로그인 ID | 역할 | 이메일 | 권한 |
|------|-----------|------|--------|------|
| 마스터 관리자 | `admin` | `role=admin` | admin@vlue.internal | 시스템 전체 조회 · 알림톡/결제 로그 · V1 출시 스위치 |
| 대표 개인 | `ceo` | `role=user` + Premium | ceo@vlue.kr | 쇼케이스·인증명함·가족보호(최대 4인) 등 V1 유료 기능 |

## 비밀번호

- admin: 환경변수 `VLUE_ADMIN_PASSWORD` (미설정 시 시드 기본값)
- ceo: 환경변수 `VLUE_CEO_PASSWORD` (미설정 시 시드 기본값)

## 분리 원칙

- **admin** 만 `/api/admin/console`, `/api/admin/hq` 접근
- **ceo** 는 일반 회원 로그인만 — 관리 콘솔/HQ 거부 (`CEO_NOT_SYSTEM_ADMIN`)

시드 시각: 2026-08-05T09:08:17.356Z
admin userId: 6393e24a-c05c-4d0d-b175-6e54fc6fe51c
ceo userId: 13c75cbe-206b-4eed-82d2-a54c7bc80c9c
