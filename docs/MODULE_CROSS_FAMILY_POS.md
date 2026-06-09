# Cross-Family Security + POS Universal Ledger

## 디렉터리 구조

```
apps/api/src/
  services/security/securityGateway.ts          # 모듈 게이트웨이 + log_hash 체이닝
  services/familyProtection/
    familyCrossSecurityStore.ts                 # 인시던트 JSON 저장
    familyCrossSecurityService.ts             # 위협 보고·해결·FCM
    familyCrossSecurityFcm.ts                   # FCM 메시지 템플릿
  services/office/
    posBillOcrService.ts                        # OCR 텍스트 파싱
    posLedgerStore.ts                           # 서버 장부 JSON
  routes/familyCrossSecurity.ts
  routes/office.ts                              # /pos-ledger/*

apps/android/.../family/
  FamilyDangerousPermissionScanner.kt           # PackageManager 위험 권한 스캔
  FamilyDeleteIntentHelper.kt                 # ACTION_DELETE_PACKAGE
  VlueFamilyBridge.kt                         # onDangerousAppDetected, requestDeletePackage
  ledger/PosLedgerEntity.kt                     # Room 스키마 참조

web/src/
  lib/familyCrossSecurityApi.js
  lib/posBillOcrParser.js
  lib/localPosLedger.js                         # Web Crypto AES-GCM 로컬 장부
  components/FamilySecurityDashboard.jsx
  components/FamilyThreatAlertCard.jsx
  components/office/CsScannerScreen.jsx         # 문서/POS 모드 토글

data/
  family_cross_security_incidents.json
  pos_ledger_entries.json
```

## API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/family-cross-security/dashboard` | 가족 보안 대시보드 |
| POST | `/api/family-cross-security/threats` | 위협 보고 → 가족 전원 FCM |
| POST | `/api/family-cross-security/threats/:id/resolve` | 삭제·조치 완료 |
| POST | `/api/office/pos-ledger/ingest` | OCR 텍스트 → 장부 |
| GET | `/api/office/pos-ledger/dashboard` | 오늘/이번 달 매출 |

## DB 스키마

### 서버 (JSON → Prisma 확장 예정)

**family_cross_security_incidents**
- `id`, `wardUserId`, `reporterUserId`, `threatKind`, `packageName`, `appLabel`
- `status` (`open` | `resolved` | `dismissed`)
- `logHash`, `prevLogHash`, `createdAt`, `updatedAt`

**pos_ledger_entries**
- `id`, `userId`, `saleDate`, `totalKrw`, `cardKrw`, `cashKrw`, `vatKrw`
- `rawOcrText`, `assetFileId`, `logHash`, `prevLogHash`, `createdAt`

### Android Room (참조)

```sql
CREATE TABLE pos_ledger_entries (
  id TEXT PRIMARY KEY NOT NULL,
  sale_date TEXT NOT NULL,
  total_krw INTEGER NOT NULL,
  card_krw INTEGER NOT NULL,
  cash_krw INTEGER NOT NULL,
  vat_krw INTEGER NOT NULL,
  raw_ocr_cipher BLOB NOT NULL,
  log_hash TEXT NOT NULL,
  prev_log_hash TEXT,
  created_at TEXT NOT NULL
);
```

`raw_ocr_cipher` — AES-256-GCM (Android Keystore 키). 웹은 `localPosLedger.js` 동일 패턴.

## 핵심 플로우

### 1. 악성앱 → FCM

1. Android `FamilyDangerousPermissionScanner` 상시 스캔
2. `VlueFamilyBridge.dispatchDangerousAppDetected` → 웹 `onDangerousAppDetected`
3. `POST /api/family-cross-security/threats` → 가족 그룹 FCM + SSE 알림
4. 대시보드 `FamilyThreatAlertCard` **[즉시 제거]** → `ACTION_DELETE_PACKAGE`
5. `POST .../resolve` → **해결 완료** 실시간 반영

### 2. POS OCR

1. CS 스캐너 **POS 모드** 촬영
2. 빌지 OCR 텍스트 입력·파싱 (`parsePosBillFromText`)
3. 로컬 AES 장부 + `POST /api/office/pos-ledger/ingest`
4. `FamilySecurityDashboard` — **오늘의 매출** 집계

### 3. 보안 게이트웨이

모든 모듈 간 payload는 `assertGatewayEnvelope(module, action, userId, payload)` 검증 후 처리.  
감사 로그는 `chainLogHash(prev, record)` 로 체이닝.

## 통합 대시보드 UI

`FamilyProtectionRegister` 하단 **가족·매출 통합 대시보드**:
- 좌: 미해결 가족 보안 건수
- 우: 오늘의 매출 / 이번 달 합계
- 하단: 미해결 위협 카드 + 최근 POS 장부

## 로컬 실행

```powershell
npm run api:dev   # :8788
npm run dev       # :5173
```
