# Railway — @vlue/api 환경 변수

Railway는 `NODE_ENV=production` 이라 API 시작 시 **7개 필수 변수** 검증이 실행됩니다.  
`.env.production` 파일은 Git에 없으므로 **반드시 Railway Variables** 에 넣어야 합니다.

## 설정 위치

**Railway** → 프로젝트 → **`@vlue/api` 서비스** → **Variables**

## 필수 변수 (7)

| Variable | 설명 |
|----------|------|
| `DATABASE_URL` | PostgreSQL (Railway Postgres 플러그인 연결 시 `${{Postgres.DATABASE_URL}}` 참조 가능) |
| `REDIS_URL` | Redis (플러그인 연결 시 `${{Redis.REDIS_URL}}` 등) |
| `GEMINI_API_KEY` | Google AI Studio API 키 |
| `PORTONE_API_SECRET` | 포트원 API Secret (결제) |
| `PORTONE_API_KEY` | 포트원 API Key (권장, 없으면 경고만) |
| `JWT_ACCESS_SECRET` | 32자 이상 랜덤 문자열 (또는 `JWT_SECRET`) |
| `SESSION_SECRET` | 세션 서명 (비우면 JWT와 동일 값으로 별칭 처리) |
| `FILE_STORAGE_PROVIDER` | `mock` (초기 배포) 또는 `s3` |

`FILE_STORAGE_PROVIDER` 를 비우면 서버가 **`mock`** 으로 기본 설정합니다.

### `FILE_STORAGE_PROVIDER=s3` 일 때 추가 필수

`S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`

## 권장 추가 변수

| Variable | 설명 |
|----------|------|
| `PORTONE_API_KEY` | 포트원 imp_key |
| `PORTONE_WEBHOOK_SECRET` | 웹훅 서명 |
| `CORS_ORIGIN` | 웹 URL (예: `https://your-web.up.railway.app`) |
| `DIRECT_URL` | Prisma direct URL (Supabase/Neon 사용 시) |

## 서비스 설정

| 항목 | 값 |
|------|-----|
| Root Directory | `/` (저장소 루트) |
| Build | `npm ci && npm run build -w @vlue/db && npm run build -w @vlue/shared && npm run build -w @vlue/api` |
| Start | `npm run start -w @vlue/api` |

## 임시 우회 (디버그만)

```
VLUE_SKIP_PRODUCTION_ENV_CHECK=1
```

프로덕션 상시 사용 금지. 변수 누락 원인 확인용입니다.

## 배포 후 확인

```
GET https://<api-host>/api/health
```

`{"ok":true,"service":"vlue-api",...}` 이면 정상 기동입니다.
