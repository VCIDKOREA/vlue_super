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

시드 시각: 2026-07-24T10:19:29.605Z
admin userId: 0ca6ad09-c39c-4bce-809d-a7090db707fc
ceo userId: 041eb932-5dc8-4039-ab28-4d24f69e83c9
