# VLUE iOS — 가족보호 WKWebView 브릿지 스텁

## iOS 가드 (웹 UI 인지용)

`didFinish` 시 주입되는 전역 객체:

```javascript
window.VlueFamilyBridge.platform === 'ios'
window.VlueFamilyBridge.__iosShell === true
window.VlueFamilyBridge.capabilities === {
  callLog: false,
  remoteAppScan: false,
  missedCallDetection: false,
  phoneState: false
}
```

웹의 `registerFamilyCallBridge()` / `registerFamilyDeviceBridge()` 는 그대로 동작하지만, **iOS 네이티브는 `onCallEnded` / `onMissedCall` / `onRemoteAppDetected` 를 호출하지 않습니다.**

UI에서 분기 예:

```javascript
const bridge = window.VlueFamilyBridge;
const iosLimited =
  bridge?.platform === 'ios' ||
  bridge?.capabilities?.callLog === false;
```

## Android 호환 인터페이스

| 웹 핸들러 | iOS 네이티브 |
|-----------|--------------|
| `onCallEnded({ phone, durationSec, direction, peerIsVlueMember })` | 미호출 (스텁) |
| `onMissedCall()` | 미호출 |
| `onRemoteAppDetected(packageName)` | 미호출 |

| 웹 → 네이티브 | iOS 동작 |
|---------------|----------|
| `VlueFamilyBridgeNative.ping()` | `postMessage({ action: 'ping' })` → 로그 |
| `scanRemoteControlAppsNow()` | 제약 안내 로그 |
| `reportLastCallFromLog()` | 제약 안내 로그 |

## API (웹만)

iOS에서도 웹이 직접 호출하는 API는 변경 없음:

- `POST /api/family-protection/alert/call` — Android 셸에서만 네이티브가 트리거
- `POST /api/family-protection/ward/remote-app` — Android만
- 오픈뱅킹·자녀 동의 가드 — 백엔드 동일 (`isAccountAgreed`, 1만 원, 미등록 상대)

## 소스 위치

| 파일 | 역할 |
|------|------|
| `VlueShell/UI/MainViewController.swift` | WKWebView, URL 로드, `didFinish` 주입 |
| `VlueShell/Bridge/VlueFamilyBridge.swift` | JS 주입·no-op 디스패처 |
| `VlueShell/Bridge/VlueFamilyBridgeMessageHandler.swift` | `WKScriptMessageHandler` |
| `VlueShell/Config/VlueLetteringConfig.swift` | `webBaseURL` / `apiBaseURL` |

## 로컬 테스트

1. 루트에서 `npm run dev` (Vite 5173) + API 8788
2. Xcode → 시뮬레이터 Run
3. Safari Web Inspector로 `window.VlueFamilyBridge` 확인
