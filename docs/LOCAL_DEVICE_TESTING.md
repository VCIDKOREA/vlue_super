# VLUE 로컬·실기기 테스트 가이드

개발자가 Cloudflare 이메일 웹훅, FCM 푸시, 통합 메일함을 로컬에서 검증하고 대표자가 실기기에서 앱을 터치 테스트하는 절차입니다.

## 1. 사전 준비

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp web/.env.example web/.env.local
```

필수 로컬 실행:

```bash
# 터미널 1 — API (8788)
cd apps/api && npm run dev

# 터미널 2 — 웹 (5173, /api 프록시 → 8788)
cd web && npm run dev
```

- 마케팅 웹: `http://localhost:5173/`
- 슈퍼앱: `http://localhost:5173/app`
- VLUE 메일: `http://localhost:5173/#mail-settings`

## 2. Cloudflare 웹훅 — ngrok / Localtunnel

### ngrok (권장)

```bash
ngrok http 8788
```

`apps/api/.env`:

```env
VLUE_OFFICE_EMAIL_WEBHOOK_SECRET=your-shared-secret
VLUE_EMAIL_FORWARD_MODE=cloudflare_edge
APP_BASE_URL=https://xxxx.ngrok-free.app
```

웹훅 URL:

```
POST https://xxxx.ngrok-free.app/api/email-forwarding/inbound
Header: X-VLUE-Email-Webhook-Secret: your-shared-secret
```

### Localtunnel

```bash
npx localtunnel --port 8788
```

## 3. FCM 푸시

서버: `GOOGLE_APPLICATION_CREDENTIALS` 또는 `FCM_*` 변수.

웹: `VITE_FIREBASE_*`, `VITE_WEB_PUSH_VAPID_PUBLIC_KEY`.

## 4. IMAP 순차 큐

```env
VLUE_IMAP_SYNC_BATCH_SIZE=50
VLUE_IMAP_SYNC_TICK_MS=30000
IMAP_PROVIDER=mock
```

## 5. www.vlue.kr 스테이징 잠금

```env
VLUE_WWW_STAGING_LOCK=true
VLUE_STAGING_BASIC_USER=dev
VLUE_STAGING_BASIC_PASS=your-password
VITE_WWW_STAGING_LOCK=true
```

## 6. 실기기 테스트

- **Expo Go**: `npx expo start` → QR 스캔
- **TestFlight / Play 내부 테스트**: `npx eas build --platform ios|android --profile preview`

LAN 테스트 시 `VITE_API_URL=http://192.168.x.x:8788`

자세한 체크리스트는 위 환경 변수와 `web/src/components/email/VlueUnifiedInboxScreen.jsx` 통합 메일함 UI를 참고하세요.
