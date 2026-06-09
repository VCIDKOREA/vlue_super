# VLUE 요금제 API 명세

중앙 설정 파일: `data/pricing_config.json`  
런타임 로드: API 부팅 시 `loadPricingConfig()` — 관리자 저장 시 캐시 즉시 갱신

## 공개

### `GET /api/pricing/config`

앱·웹 전역 요금제 설정 조회.

**응답 200**
```json
{
  "ok": true,
  "config": {
    "version": 1,
    "vatIncluded": true,
    "plans": {
      "b2b_full_package": { "monthlyKrw": 14700, "annualKrw": 147000, "label": "...", "description": "..." },
      "soho_activity": { "monthlyKrw": 19800, "annualKrw": 198000 },
      "soho_broadcast_addon": { "monthlyKrw": 4200, "annualKrw": 42000 }
    },
    "legacy": { "paidListMonthlyKrw": 28300, "personalComboAddonMonthlyKrw": 5100 }
  }
}
```

### `GET /api/pricing/access`

로그인 사용자 멤버십 권한 스냅샷.  
헤더: `Authorization: Bearer …` 또는 `X-VLUE-User-Id`

**응답 200**
```json
{
  "ok": true,
  "access": {
    "hasPrimarySoho": true,
    "hasBroadcastAddon": false,
    "hasB2bLine": false,
    "canUseChat": true,
    "canUseShopping": true,
    "canBroadcastDigitalCard": false,
    "primaryMonthlyKrw": 19800,
    "broadcastMonthlyKrw": 4200
  }
}
```

## 관리자

관리자 JWT: `POST /api/admin/console/login` 후 Bearer 토큰.

### `GET /api/admin/console/pricing-config`

현재 `pricing_config.json` 전체 (캐시 무시 강제 로드).

### `PUT /api/admin/console/pricing-config`

요금 설정 저장. 원자적 쓰기(임시 파일 → rename). 검증 실패 시 400, 기존 파일 유지.

**요청**
```json
{ "config": { "...PricingConfigFile" } }
```

**응답 200**
```json
{ "ok": true, "config": { "...saved" } }
```

**오류 400** — `plans` 누락, SKU별 `monthlyKrw`/`annualKrw` 음수, 라벨 공백 등

### `GET /api/pricing/revenue-stats`

요금제별 매출 집계 (`subscriptionPayment` 기준).

**쿼리**
| 파라미터 | 설명 |
|----------|------|
| `planSku` | `b2b_full_package` \| `soho_activity` \| `soho_broadcast_addon` \| `legacy_personal_combo` \| `other` |
| `from` | ISO 날짜 (paidAt ≥) |
| `to` | ISO 날짜 (paidAt ≤) |

**응답 200**
```json
{
  "ok": true,
  "stats": {
    "grandTotalKrw": 594000,
    "byPlan": [
      { "planSku": "soho_activity", "label": "SOHO 활동형", "count": 12, "totalKrw": 237600 }
    ],
    "vatIncluded": true
  }
}
```

## 영업 송출(Secondary) — 발신번호

모든 엔드포인트 인증 필요.

### `GET /api/broadcast-line/me`

등록 발신번호 + `access` 스냅샷.

### `POST /api/broadcast-line/register`

**요청** `{ "phoneE164": "01012345678" }`  
OTP 발송(데모: 즉시 pending 상태). Primary 없으면 이후 verify 단계에서 차단.

### `POST /api/broadcast-line/verify`

**요청** `{ "otp": "123456" }`  
인증 완료 시 `status: active`, `phoneVerified: true`.

### `GET /api/broadcast-line/access-check`

송출 기능 가능 여부. 옵션 미결제·Primary 없음 → 403.

## 기능 게이트 (서버 인터셉터)

| 기능 | 조건 | 적용 라우트 |
|------|------|-------------|
| 채팅 | `canUseChat` (SOHO Primary 또는 B2B) | `POST /api/chat/rooms/open`, `POST /api/chat/rooms/:id/messages` |
| 쇼핑(개인) | `canUseShopping` | `POST /api/shop/orders/prepare` |
| 송출 명함 | `canBroadcastDigitalCard` + 번호 인증 | broadcast-line 서비스 |

**403 응답 코드** — `MEMBERSHIP_CHAT_REQUIRED`, `MEMBERSHIP_SHOPPING_REQUIRED`

## 결제 가드

- `assertMembershipCheckoutAmountKrw` — Primary/콤보/정가
- `assertBroadcastCheckoutAmountKrw` — `soho_broadcast_addon` 금액 + Primary 보유

## SKU 정책 요약

| SKU | 월 요금(기본) | 용도 |
|-----|---------------|------|
| `b2b_full_package` | 14,700원/회선 | PC, 채팅·회사업무·사내소통·쇼핑(부분) |
| `soho_activity` | 19,800원 | Primary, 채팅·쇼핑 풀 |
| `soho_broadcast_addon` | 4,200원 | Secondary, 발신번호 인증 송출 명함 |

부가세 포함. 4,200원은 VLUER 포인트·임직원 콤보(5,100원)와 별개.

## 프론트 연동

- `web/src/lib/pricingConfig.js` — `/api/pricing/config` 캐시
- `web/src/lib/membershipAccessGuard.js` — `/api/pricing/access`
- 관리자 UI — `/admin` → **요금제 관리** 탭 (`PricingManagerPanel`)
