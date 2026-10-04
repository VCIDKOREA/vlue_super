# VLUE 가족보호 — 구현 가이드

## 가장 쉬운 3단계 접근

| 단계 | 내용 | 지금 상태 |
|------|------|-----------|
| **1** | VLUE 앱 안에서 할 수 있는 것 | ✅ 구현됨 |
| **2** | Android/iOS 네이티브 브릿지 | 🔌 API·브릿지 준비 |
| **3** | 금융결제원 오픈뱅킹 자동 연동 | 제외 (알림 파싱·웹훅 모두 제공하지 않음) |

### 1단계 (웹·앱 즉시)

- **부모·자녀 공통**: 앱 미접속(24h), 부재중 3통, `VlueFamilyBridge.onCallEnded`, `onRemoteAppDetected`
- **원격 보안 (핵심)**: 원격제어 앱 작동 감지 → 본인 단말 묵음·진입 차단 → 가족 전원 1·2차 FCM → 마지막 위치 24시간 V-MAP
- **자녀**: 인앱 링크 유해사이트 감지. 계좌·입출금 알림(파싱·오픈뱅킹·동의)은 제공하지 않음
- **정부기관**: `governmentHotlines.ts` — 112, 119, 1332, 1588-1199 등 30+ 번호
- **가족 위치**: V-MAP 가족 모드 — 동의·보호 연결 구성원 위치 공유, 중단 시 마지막 확인 위치 24시간

### 2단계 (네이티브 앱 필수)

```javascript
// 통화 종료 (CallLog)
window.VlueFamilyBridge.onCallEnded({
  phone: "01012345678",
  durationSec: 720,
  direction: "out",
  peerIsVlueMember: false
});

// 부재중
window.VlueFamilyBridge.onMissedCall();

// 원격제어 앱 (설치·작동)
window.VlueFamilyBridge.onRemoteAppDetected("com.teamviewer.host");
```

Android: `READ_CALL_LOG`, `PACKAGE_USAGE_STATS`(권장), 설치 앱 목록 주기 스캔, `FamilyRemoteSecurityGate` 묵음 차단  
iOS: CallKit·제한적 — 부모 기기는 Android 권장

### 3단계 (계좌 자동)

- 자녀 **명시 동의** (`POST .../bank-consent/respond`) 후만
- 오픈뱅킹 AGENT → `POST /webhook/openbanking/transaction` (시크릿 헤더 필수)
- 알림: 전체 / N원 이상 / 미등록 상대 (설정 UI에 있음)
- 로컬 테스트·보안: **[README_FAMILY_PROTECTION.md](./README_FAMILY_PROTECTION.md)**

## 원격 보안 (Remote Security) — 정책 요약

| 단계 | 동작 | 본인 단말 | 가족(본인 제외) |
|------|------|-----------|-----------------|
| **1차** | 원격앱 작동 감지 | 알림·소리·진동·토스트 없음, 앱 진입/터치 차단 | `🚨 [VLUÉ 긴급] 원격 제어 감지` 푸시 |
| **2차** | 원격 중 강제종료 | (이미 차단/중단) | `(원격 앱) VLUÉ 앱이 강제 종료되었습니다` |
| **2차** | 원격 중/후 삭제 | — | `(원격 앱) VLUÉ 앱이 삭제되었습니다` |
| **일반** | 원격 없이 삭제 | — | `VLUÉ 앱이 삭제되었습니다` |
| **위치** | DISCONNECTED/TERMINATED | — | V-MAP `[📍 마지막 확인 위치]` 24시간 |

푸시 탭 → V-MAP 가족 모드에서 해당 구성원 마지막 확인 위치로 이동.

## API 요약

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/family-protection/links` | 연결·설정·동의 목록 |
| PATCH | `/api/family-protection/settings` | 부모/자녀 알림 설정 |
| POST | `/api/family-protection/alert/call` | 네이티브 셸 통화·정부번호 (alias) |
| POST | `/api/family-protection/ward/call-event` | 통화·정부번호 (동일) |
| POST | `/api/family-protection/webhook/openbanking/transaction` | 오픈뱅킹 입출금 (동의·1만원·미등록 상대 가드) |
| POST | `/api/family-protection/ward/remote-app` | 원격앱 (→ security 통합) |
| POST | `/api/security/remote-detected` | 원격 작동 감지 + 1차 가족 푸시 |
| POST | `/api/security/remote-heartbeat` | 원격 활성 10초 하트비트 |
| POST | `/api/security/app-lifecycle` | 강제종료·삭제·연결중단 (2차 푸시) |
| POST | `/api/cron/remote-security-sweep` | 하트비트 유실 스윕 |
| POST | `/api/family-protection/ward/risky-site` | 유해 URL |
| POST | `/api/family-protection/links/:id/bank-consent/request` | 보호자 → 동의 요청 |
| POST | `/api/family-protection/links/:id/bank-consent/respond` | 자녀 동의/거절 |
| POST | `/api/family-protection/ward/bank-transaction` | 입출금 이벤트 |
| GET | `/api/family-protection/catalog/government-hotlines` | 정부번호 목록 |
| GET | `/api/location/family` | 가족 위치 + lastKnownLocation 24h |

## DB 마이그레이션

```bash
npm run db:deploy:safe
```

`20260521260000_family_protection_extended`  
`20261004_remote_security_last_location` — `family_remote_security_state`, `location_presence.last_*`

## UI

친구 검색 → **가족 보호** 펼침 → **부모 보호** / **자녀 보호** 설정 분리  
원격제어 토글 ON 시 위치·푸시·1·2차 대응·24시간 마지막 위치 동의 안내 표시
