# VLUE API (`apps/api`)

## 기술 스택 추천: **Hono + `@hono/node-server`**

| 기준 | Hono | NestJS |
|------|------|--------|
| VLUE 초기 백엔드 규모 | 경량, 라우트·미들웨어 빠르게 추가 | 구조화·DI 유리, 보일러플레이 큼 |
| Prisma 연동 | 단순 import | `@nestjs/prisma` 패턴으로도 무난 |
| 수석 개발자 1인·소규모 팀 | **추천** | 조직 표준·복잡 도메인 시 유리 |

이 레포는 **Hono**로 시작합니다. 나중에 도메인이 커지면 모듈만 Nest로 이전해도 Prisma·도메인 로직은 재사용 가능합니다.

## 실행

```bash
# 저장소 루트에서 워크스페이스 설치 후
cd apps/api
cp .env.example .env   # DATABASE_URL 등 설정
npm run dev
```

## 폴더 역할

- `src/index.ts` — HTTP 진입점
- `src/routes/` — 라우트 단위 (`health`, 이후 `auth`, `users`, …)
- `src/middleware/` — 세션·역할(admin)·요청 로깅
- `src/services/` — 유스케이스 (실명 확정은 `@vlue/db` 가드와 함께)
- `src/integrations/portone/` — 본인인증 검증·웹훅
- `src/db/` — Prisma 클라이언트 싱글턴
