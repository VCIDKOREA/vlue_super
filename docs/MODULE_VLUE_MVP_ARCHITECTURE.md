# VLUE 통합 MVP — 가족 보안·상태 공유 & POS 경영 자동화

## 원칙

- **On-device 우선**: 위험앱 스캔·OCR·알림 파싱은 기기에서 처리
- **저비용**: JSON 스토어 → Prisma/Room 확장 경로 유지
- **사업자 전용 용어**: `매출전표`·`매출`·POS 장부는 `UserBusinessProfile.isBusiness && accountStatus=active` 회원만

## 디렉터리 구조

```
apps/api/src/
  services/membership/businessMemberAccess.ts
  services/familyProtection/
    familyCrossSecurity*.ts
    familySecurityStateStore.ts      # 배터리·보안 상태
    familySecurityStateService.ts    # 15% 미만 FCM
  services/office/posBillOcrService.ts
  routes/familyCrossSecurity.ts      # /state, /threats, /dashboard

apps/android/.../family/
  FamilyDangerousPermissionScanner.kt
  FamilyBatteryMonitor.kt
  FamilyCareForegroundService.kt     # START_STICKY 백그라운드
  FamilyDeleteIntentHelper.kt
  VlueFamilyBridge.kt

web/src/
  lib/businessMemberAccess.js
  components/office/CsScannerScreen.jsx   # 일반/POS 탭 분리
  components/FamilySecurityDashboard.jsx

data/
  family_security_states.json
  family_cross_security_incidents.json
  pos_ledger_entries.json
```

## 필수 라이브러리

| 영역 | 라이브러리 |
|------|-----------|
| 푸시 | FCM (`familyProtectionFcmPush.ts`) |
| Android DB | Room 스키마 참조 (`PosLedgerEntity.kt`) + SQLCipher 확장 예정 |
| OCR | Google ML Kit (Android 네이티브 연동 예정), 웹은 CS 스캐너 + 텍스트 파서 |
| 은행 알림 | `NotificationListenerService` (다음 단계) |
| 암호화 | Web Crypto AES-GCM, `chainLogHash` 서버 감사 |

## FamilySecurityState DB 스키마

### 서버 JSON (`family_security_states.json`)

```json
{
  "userId": "uuid",
  "batteryPercent": 42,
  "isCharging": false,
  "securityHealth": "ok|warning|critical",
  "openThreatCount": 0,
  "lastBankActivityMasked": "입금 ***1234 · 50,000원",
  "logHash": "sha256...",
  "updatedAt": "ISO8601"
}
```

### Android Room (확장)

```sql
CREATE TABLE family_security_state (
  user_id TEXT PRIMARY KEY NOT NULL,
  battery_percent INTEGER NOT NULL,
  is_charging INTEGER NOT NULL,
  security_health TEXT NOT NULL,
  open_threat_count INTEGER NOT NULL,
  last_bank_cipher BLOB,
  log_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/family-cross-security/state` | 배터리·보안 동기화 |
| GET | `/api/family-cross-security/state` | 가족 그룹 상태 |
| POST | `/api/office/pos-ledger/ingest` | 사업자만 — 매출전표 OCR |
| GET | `/api/office/pos-ledger/dashboard` | `canUsePosLedger` 포함 |

## 핵심 로직 — 배터리 15% 미만 알림 (Kotlin)

```kotlin
// FamilyBatteryMonitor.kt — ACTION_BATTERY_CHANGED 스냅샷
val snap = FamilyBatteryMonitor.read(context)
VlueFamilyBridge.dispatchBatteryState(snap.percent, snap.isCharging)

// web → POST /api/family-cross-security/state
// server → batteryPercent <= 15 && !isCharging → 가족 FCM
```

## 백그라운드 유지 전략

1. `FamilyCareForegroundService` — `START_STICKY`, 5분 주기 배터리 푸시
2. `BOOT_COMPLETED` 리시버 확장(다음 단계)으로 재시작
3. Doze 대응: Foreground notification + `dataSync` 타입
4. 위험앱 스캔은 `onResume`·권한 허용 시 즉시 실행

## CS 스캐너 UI

| 모드 | 제목 | 대상 |
|------|------|------|
| 일반 문서 | 일반 문서 스캐너 | 전체 회원 |
| POS 빌지 | POS 빌지 스캐너 | 사업자 등록·승인 회원만 탭 노출 |

상단 세그먼트 탭 + 모드별 한줄 설명으로 구분.

## 구현 완료 (Android 네이티브)

### ML Kit OCR
- `PosBillMlKitOcr.kt` — Korean text recognition
- `VlueFamilyBridgeNative.runPosBillOcr(dataUrl)` → `onPosOcrResult(text)`
- 웹 `posBillNativeOcr.js` + CS 스캐너 POS 모드 자동 주입

### Room + SQLCipher
- `VlueEncryptedDatabase` — AES-256 (`SupportFactory` + 32바이트 키)
- `pos_ledger_entries`, `family_security_state` 테이블
- `VlueLocalStore` — 장부·상태 로컬 저장

### NotificationListenerService
- `FamilyBankNotificationListener` — 은행 앱 푸시 감지
- `FamilyBankNotificationParser` — 계좌 마스킹·입출금 파싱
- `onBankNotification` → 서버 `syncFamilySecurityState`
- 설정: 가족 대시보드 **은행 입출금 알림 연동** 버튼

## POS RBAC — OWNER / STAFF (사장님 중심 Vault)

| 역할 | 스캔·전송 | 장부 조회·수정 | 전송 후 로컬 삭제 |
|------|-----------|----------------|-------------------|
| **OWNER** (사업자) | ✅ | ✅ OWNER Vault | ❌ |
| **STAFF** (직원) | ✅ (원격 차단 가능) | ❌ | ✅ Zero-Retention |

- `GET /api/office/pos-ledger/role` — 역할·권한
- `POST /api/office/pos-ledger/staff` — 사장님 직원 등록 (`@handle`)
- `GET /api/office/pos-ledger/staff` — 직원 목록 + `transmitEnabled`
- `PATCH /api/office/pos-ledger/staff/:staffUserId` — `{ transmitEnabled: boolean }` 원격 차단/활성화
- 장부 응답 `vault: "owner_security_vault"` — STAFF 조회 API 차단

### Zero-Retention (STAFF · 앱 전용)

1. STAFF는 **POS 빌지 모드만** — 일반 문서·갤러리 저장 차단
2. 서버 ingest 성공 직후 `wipeStaffScanArtifacts` — data URL·localStorage·Android `wipePosScanCache`
3. 스캐너 닫기 시에도 잔여 페이지 wipe

### 실시간 알림 → 매출 대시보드

- STAFF ingest → OWNER **FCM** + **SSE** `vlue-pos-staff-bill-submitted`
- payload: `deepLink: vlue://pos-sales-dashboard`, `action: open_pos_dashboard`
- 앱: 탭 가능 토스트 → 친구검색(가족보호) **매출 대시보드** (`#pos-sales-dashboard`) 스크롤

### 직원 관리 콘솔 (OWNER)

- `PosStaffManagementConsole.jsx` — 직원별 전송 허용/차단 토글
- `FamilySecurityDashboard` 내 OWNER Vault 배지 + 매출·직원 통합 UI

## 민감 화면 스크린 캡처 차단 (부분 적용)

앱 전체가 아닌 **정보 유출 가능 화면**만 `FLAG_SECURE`:

| 화면 | 조건 |
|------|------|
| CS 스캐너 / POS 빌지 | 스캐너 `open` |
| VLUE 메일·오피스 | 메일함 `open` |
| 개인 자료실 | 지갑 허브 `docs` 탭 |

- 웹: `useSensitiveScreenSecure(active)` → `VlueFamilyBridgeNative.setSensitiveScreenSecure`
- Android: `ScreenSecureHelper` — 중첩 화면은 참조 카운트로 해제 시점 관리
- **PC 웹 브라우저** 단독 실행 시 OS 캡처 차단 불가 (Android 앱 WebView에서만 완전 차단)

## Android vs iOS 플랫폼 기능 (검증됨)

| 구분 | Android | iPhone |
|------|---------|--------|
| OCR 빌지 스캔 | 가능 (강력) ML Kit | 가능 (강력) Vision |
| 실시간 입출금 알림 | 가능 (알림 파싱) | 불가능 (보안 차단) |
| 실시간 악성 앱 탐지 | 가능 (시스템 권한) | 불가능 (샌드박스) |
| 가족 보안/상태 공유 | 가능 (배터리 등) | 제한적 (백그라운드) |

- iOS 제한 시 안내: **「아이폰(애플iso)은 규정상 해당기능이 제한됩니다.」** + 확인 버튼
- `devicePlatform` — `POST /api/family-cross-security/state` 동기화 필드
- 자녀 iPhone: 앱 로그인·보호자 대시보드에서 `iPhone` 배지 + 안내창

## 남은 단계

- Prisma 마이그레이션 (`business_staff_links`, `pos_ledger_entries`)
- 은행앱별 파싱 규칙 세밀 튜닝
- iOS `setSensitiveScreenSecure` 네이티브 구현 (현재 로그만)
