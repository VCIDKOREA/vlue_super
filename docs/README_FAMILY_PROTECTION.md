# 가족보호 — 오픈뱅킹 웹훅 보안·로컬 테스트

> 정부번호 장부(`governmentHotlines.ts`)·Android/iOS 네이티브 브릿지는 별도 문서를 참고하세요.  
> 전체 API: [FAMILY_PROTECTION.md](./FAMILY_PROTECTION.md)

## 환경 변수

`apps/api` 실행 환경(`.env` 또는 셸)에 반드시 설정:

```env
OPENBANKING_WEBHOOK_SECRET=dev-openbanking-secret
```

미설정 시 웹훅은 **401** (`OPENBANKING_SECRET_NOT_CONFIGURED`)을 반환합니다.

## 엔드포인트

`POST /api/family-protection/webhook/openbanking/transaction`

| 헤더 | 값 |
|------|-----|
| `Content-Type` | `application/json` |
| `X-OpenBanking-Webhook-Secret` | `OPENBANKING_WEBHOOK_SECRET` 와 동일 |

### 처리 파이프라인

1. **시크릿 검증** (`openbankingWebhookAuth.ts`) — 실패 시 즉시 401
2. **어댑터 매핑** (`bankingAgentAdapter.ts`) — KFT/일반/내부 포맷 → `ChildBankTransaction`
3. **비즈니스 가드** (`recordChildBankTransaction`)
   - `isAccountAgreed === false` → `consent_required` (알림 없음)
   - 임계치 미만 + 전체 알림 OFF → `below_threshold` (DB 저장·로그만)
   - 화이트리스트(동의 `knownPayees` + 가족 연결 표시명) → `isUnknownPayee` 판별

## curl 예시 (PowerShell)

```powershell
$secret = "dev-openbanking-secret"
$wardId = "<자녀-users.id-UUID>"
$body = @{
  wardUserId = $wardId
  amountKrw = 15000
  direction = "out"
  counterpartyName = "테스트상대"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8788/api/family-protection/webhook/openbanking/transaction" `
  -Method POST `
  -Headers @{ "X-OpenBanking-Webhook-Secret" = $secret; "Content-Type" = "application/json" } `
  -Body $body
```

## curl 예시 (bash)

```bash
export OPENBANKING_WEBHOOK_SECRET=dev-openbanking-secret
export WARD_USER_ID="<자녀-users.id-UUID>"

curl -sS -X POST "http://127.0.0.1:8788/api/family-protection/webhook/openbanking/transaction" \
  -H "Content-Type: application/json" \
  -H "X-OpenBanking-Webhook-Secret: ${OPENBANKING_WEBHOOK_SECRET}" \
  -d "{
    \"wardUserId\": \"${WARD_USER_ID}\",
    \"amountKrw\": 15000,
    \"direction\": \"out\",
    \"counterpartyName\": \"홍길동\"
  }"
```

## KFT 스타일 페이로드 (어댑터 자동 변환)

```json
{
  "user_id": "<자녀-uuid>",
  "tran_amt": 25000,
  "inout_type": "DEPOSIT",
  "print_content": "김철수",
  "account_number": "110-****-1234",
  "tran_id": "OB-20260520-001",
  "tran_dt": "20260520143000"
}
```

## Mock 스크립트

```bash
npm run api:dev
```

다른 터미널:

```bash
OPENBANKING_WEBHOOK_SECRET=dev-openbanking-secret \
WARD_USER_ID=<자녀-uuid> \
AMOUNT_KRW=15000 \
DIRECTION=out \
COUNTERPARTY_NAME=미등록테스트 \
node scripts/openbanking-webhook-mock.mjs
```

## 응답 예시

| reason | 의미 |
|--------|------|
| `consent_required` | 자녀 계좌 동의 없음 — 차단 |
| `below_threshold` | 1만 원 미만·전체 알림 OFF — 저장만 |
| (알림 발송) | `notified` > 0 |

성공 시 `isUnknownPayee`, `filterReasons`, `agentVendor` 필드를 확인하세요.

## FCM 실시간 푸시 (보호자 기기)

| 항목 | 내용 |
|------|------|
| 서비스 | `apps/api/src/services/fcmNotificationService.ts` — `sendFamilyProtectionPush` |
| 트리거 | `familyProtectionFcmPush.ts` — 통화·원격앱·계좌 알림 적발 시 |
| 토큰 등록 | `POST /api/auth/devices/fcm-token` — `{ deviceToken, fcmToken }` (승인된 기기) |
| DB | `user_devices.fcm_token` (마이그레이션 `20260521280000_user_device_fcm_token`) |

환경 변수: `GOOGLE_APPLICATION_CREDENTIALS` 또는 `FCM_PROJECT_ID` / `FCM_CLIENT_EMAIL` / `FCM_PRIVATE_KEY` (`apps/api/.env.example` 참고).

푸시 실패·토큰 없음은 **경고 로그만** 남기고 API·DB 알림 저장은 정상 완료됩니다.
