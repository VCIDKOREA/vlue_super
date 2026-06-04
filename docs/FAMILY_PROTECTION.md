# VLUE 가족보호 — 구현 가이드

## 가장 쉬운 3단계 접근

| 단계 | 내용 | 지금 상태 |
|------|------|-----------|
| **1** | VLUE 앱 안에서 할 수 있는 것 | ✅ 구현됨 |
| **2** | Android/iOS 네이티브 브릿지 | 🔌 API·브릿지 준비 |
| **3** | 금융결제원 오픈뱅킹 자동 연동 | 📋 설계만 (동의·웹훅) |

### 1단계 (웹·앱 즉시)

- **부모**: 앱 미접속(24h), 부재중 3통, `VlueFamilyBridge.onCallEnded`, `onRemoteAppDetected`
- **자녀**: 인앱 링크 유해사이트 감지, 계좌 동의 채팅 알림 → 동의/거절, 수동 입출금 보고 API
- **정부기관**: `governmentHotlines.ts` — 112, 119, 1332, 1588-1199 등 30+ 번호

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

// 원격제어 앱
window.VlueFamilyBridge.onRemoteAppDetected("com.teamviewer.host");
```

Android: `READ_CALL_LOG`, `PACKAGE_USAGE_STATS` 또는 설치 앱 목록 주기 스캔  
iOS: CallKit·제한적 — 부모 기기는 Android 권장

### 3단계 (계좌 자동)

- 자녀 **명시 동의** (`POST .../bank-consent/respond`) 후만
- 오픈뱅킹 AGENT → `POST /webhook/openbanking/transaction` (시크릿 헤더 필수)
- 알림: 전체 / N원 이상 / 미등록 상대 (설정 UI에 있음)
- 로컬 테스트·보안: **[README_FAMILY_PROTECTION.md](./README_FAMILY_PROTECTION.md)**

## API 요약

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/family-protection/links` | 연결·설정·동의 목록 |
| PATCH | `/api/family-protection/settings` | 부모/자녀 알림 설정 |
| POST | `/api/family-protection/alert/call` | 네이티브 셸 통화·정부번호 (alias) |
| POST | `/api/family-protection/ward/call-event` | 통화·정부번호 (동일) |
| POST | `/api/family-protection/webhook/openbanking/transaction` | 오픈뱅킹 입출금 (동의·1만원·미등록 상대 가드) |
| POST | `/api/family-protection/ward/remote-app` | 원격앱 |
| POST | `/api/family-protection/ward/risky-site` | 유해 URL |
| POST | `/api/family-protection/links/:id/bank-consent/request` | 보호자 → 동의 요청 |
| POST | `/api/family-protection/links/:id/bank-consent/respond` | 자녀 동의/거절 |
| POST | `/api/family-protection/ward/bank-transaction` | 입출금 이벤트 |
| GET | `/api/family-protection/catalog/government-hotlines` | 정부번호 목록 |

## DB 마이그레이션

```bash
npm run db:deploy:safe
```

`20260521260000_family_protection_extended`

## UI

친구 검색 → **가족 보호** 펼침 → **부모 보호** / **자녀 보호** 설정 분리
