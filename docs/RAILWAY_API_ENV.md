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
| `REDIS_URL` | Redis — 이메일 OTP(5분 TTL)·Vming 등 (없으면 인메모리 폴백) |
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
| `PORTONE_TEST_MODE` | `true`면 KG이니시스 테스트처럼 CI 없는 본인인증을 DI/합성키로 통과 (실연동 전용, 실서비스에서는 제거) |
| `PORTONE_WEBHOOK_SECRET` | 웹훅 서명 |
| `CORS_ORIGIN` | 웹 URL (예: `https://vlueweb-production.up.railway.app`) — 코드에 기본 포함되나 명시 권장 |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` / `PUBLIC_DATA_SERVICE_KEY` | `GET /api/v1/search/verify` 기관 검색 |
| `DIRECT_URL` | Prisma direct URL (Supabase/Neon 사용 시) |

## 이메일 인증번호 (AWS SES)

가입 · 앱 새 기기 로그인 · 비밀번호 변경 · DCC 수신 메일 등록에 공통 사용합니다.

| Variable | 값 | 설명 |
|----------|----|------|
| `AWS_REGION` | `ap-northeast-2` | SES 리전 |
| `AWS_ACCESS_KEY_ID` | IAM 액세스 키 | SES `ses:SendEmail` |
| `AWS_SECRET_ACCESS_KEY` | IAM 시크릿 | **Railway에만 저장. Git 금지** |
| `SENDER_EMAIL` | `support@vlue.kr` | SES에서 인증된 발신 주소 |
| `REDIS_URL` | Redis URL | OTP 5분 TTL. 없으면 프로세스 메모리 폴백 |

엔드포인트: `POST /api/auth/send-code`, `POST /api/auth/verify-code` (`purpose`: `signup` / `login_device` / `password_change` / `dcc_email`).

세션 정책:

- **웹 (`www.vlue.kr`)** — 중복 로그인 허용. 접속 IP·위치(`CF-IPCountry` 등)·User-Agent를 `user_devices` / `auth_refresh_sessions`에 기록.
- **Android 앱 (`VLUE-Android-App`)** — 단일 활성 기기. 새 기기 로그인 시 가입 이메일로 6자리 코드를 보내고, 확인 후 기존 앱 세션을 즉시 만료.

`POST /api/auth/signup-email/send` 는 위 SES 경로를 사용합니다. Resend SMTP는 가입 OTP에 더 이상 필요하지 않습니다.

임시 QA만 필요하면 가입에서 **「개인 아이디로 가입」** 트랙을 쓰면 이메일 OTP 없이 진행할 수 있습니다.

## PASS 본인인증 (KG이니시스 「서비스 이용에 불편…」)

이 화면은 **VLUE UI 버그가 아니라** 포트원 → 이니시스 통합본인인증 연동 실패 시 자주 납니다.

**@vlue/web** Railway Variables (빌드 시 번들 고정 → 변경 후 **Redeploy**):

| Variable | 예시 | 설명 |
|----------|------|------|
| `VITE_PORTONE_USER_CODE` | `imp…` | 가맹점 식별코드 |
| `VITE_IAMPORT_CERT_PG` | `inicis_unified` | 결제용 `html5_inicis` 금지 |
| `VITE_IAMPORT_CERT_MID` | 콘솔 MID | 통합본인인증 채널 MID |
| `VITE_IAMPORT_CERT_OMIT_MID` | `true` (선택) | MID 불일치 시 pg만 전송 |

포트원 관리자 콘솔에서 확인:

1. **본인인증**용 채널 = **KG이니시스 통합본인인증** (`inicis_unified`) — 결제 채널과 별개  
2. **웹사이트 URL**에 `https://www.vlue.kr`, `https://vlue.kr` (로컬은 `http://localhost:5173`) 등록  
3. 테스트 MID(`MIIiasTest` 등) / 운영 MID가 가맹점·도메인과 일치하는지  
4. 그래도 동일하면 MID 생략(`OMIT_MID=true`) 후 웹 재배포해 비교

로컬 DEV만이면 온보딩의 **「PASS 우회(개발)」**로 가입 흐름 E2E를 이어갈 수 있습니다 (운영 빌드에서는 불가).

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

## FCM 푸시 (관리자 회원 알림·쇼케이스·가족보호)

**@vlue/api** 서비스에 Firebase **서비스 계정**이 없으면 알림함 저장은 되지만 **푸시 0 · 서버 FCM 미설정** 이 됩니다.

### 방법 A — 개별 변수 (권장)

Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키(JSON) 다운로드 후:

| Variable | 값 |
|----------|-----|
| `FCM_PROJECT_ID` | JSON의 `project_id` (예: `vlue-c6c0b`) |
| `FCM_CLIENT_EMAIL` | JSON의 `client_email` |
| `FCM_PRIVATE_KEY` | JSON의 `private_key` 전체. 줄바꿈은 `\n` 으로 이스케이프 |

### 방법 B — JSON 한 줄

| Variable | 값 |
|----------|-----|
| `GOOGLE_APPLICATION_CREDENTIALS` | 서비스 계정 JSON **파일 내용 전체** (한 줄, `{` 로 시작) |

Windows 경로(`C:\Users\...\xxx.json`)는 Railway Linux에서 **동작하지 않습니다.**

### USB에서 Railway로 올리기

```powershell
cd D:\dev
npx @railway/cli login
.\sync-fcm-railway.ps1
```

`apps\api\.env` 의 `GOOGLE_APPLICATION_CREDENTIALS` 경로를 읽어 `@vlue/api` Variables 에 반영합니다.

### 확인

관리자 대시보드 → **상태 점검** → **푸시(FCM)** 가 **정상**이면 발송 가능합니다.
