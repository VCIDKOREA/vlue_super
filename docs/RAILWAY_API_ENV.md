# Railway — @vlue/api 환경 변수

Railway는 `NODE_ENV=production` 이라 API 시작 시 **7개 필수 변수** 검증이 실행됩니다.  
`.env.production` 파일은 Git에 없으므로 **반드시 Railway Variables** 에 넣어야 합니다.

## 설정 위치

**Railway** → 프로젝트 → **`@vlue/api` 서비스** → **Variables**

## 필수 변수 (4 + 1 자동)

| Variable | 설명 |
|----------|------|
| `DATABASE_URL` | Supabase **ywhjhdpecwvaujiagaln** (`인프라마스터정보` URL). Railway 자체 Postgres가 아니면 **Add Reference 대신** 전체 URL 직접 입력 |
| `PORTONE_API_SECRET` | 포트원 API Secret |
| `JWT_ACCESS_SECRET` | 32자 이상 랜덤 (또는 `JWT_SECRET`) |
| `SESSION_SECRET` | 비우면 JWT와 동일하게 자동 채움 |
| `FILE_STORAGE_PROVIDER` | 비우면 **`mock`** 자동 |

## 미디어 커머스 (Direct Upload · 에스크로 · VOD)

| Variable | 설명 |
|----------|------|
| `R2_ACCOUNT_ID` | Cloudflare 계정 ID |
| `R2_ACCESS_KEY_ID` | R2 API 액세스 키 |
| `R2_SECRET_ACCESS_KEY` | R2 API 시크릿 키 |
| `R2_BUCKET_NAME` | `vlue-product-media` (기본값) |
| `R2_PUBLIC_BASE_URL` | 퍼블릭 CDN 베이스 (`https://pub-xxx.r2.dev` 또는 커스텀 도메인) |
| `LIVE_VOD_WEBHOOK_SECRET` | `POST /api/live/webhook/recording-complete` 인증 |
| `APP_BASE_URL` | `https://api.vlue.kr` |

## 권장 (없어도 API는 기동됨)

| Variable | 설명 |
|----------|------|
| `REDIS_URL` | Redis — Vming 토큰 캡 등 (없으면 인메모리 폴백) |
| `GEMINI_API_KEY` | Google AI — AI 기능 사용 시 필수 |
| `PORTONE_API_KEY` | 포트원 imp_key |

### Postgres 연결 (Railway)

1. 프로젝트에 **PostgreSQL** 서비스 추가
2. **@vlue/api** → Variables → **Add Reference** → `DATABASE_URL` = Postgres의 `DATABASE_URL`
3. 수동 입력 시 `postgresql://...` 전체 URL이어야 함 (`${{Postgres...}}` 그대로면 실패)

### JWT 시크릿 예시

PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

생성값을 `JWT_ACCESS_SECRET`에 붙여넣기.

### `FILE_STORAGE_PROVIDER=s3` 일 때 추가 필수

`S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`

## 권장 추가 변수

| Variable | 설명 |
|----------|------|
| `PORTONE_API_KEY` | 포트원 imp_key |
| `PORTONE_WEBHOOK_SECRET` | 웹훅 서명 |
| `CORS_ORIGIN` | 웹 URL (예: `https://vlueweb-production.up.railway.app`) — 코드에 기본 포함되나 명시 권장 |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` / `PUBLIC_DATA_SERVICE_KEY` | `GET /api/v1/search/verify` 기관 검색 |
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
