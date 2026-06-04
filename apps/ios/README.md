# VLUE iOS Native Shell (`apps/ios`)

Android `VlueFamilyBridge` 와 동일한 웹 계약을 갖는 **WKWebView 셸**입니다.

## Apple 정책 제약 (가족보호)

| 기능 | Android | iOS |
|------|---------|-----|
| 통화 기록 / 부재중 | `READ_CALL_LOG` | **불가** — 브릿지 스텁만 |
| 원격제어 앱 스캔 | `QUERY_ALL_PACKAGES` | **불가** — 스캔 비활성 |
| 웹 서비스 | WebView | WKWebView |

웹뷰 로드 완료 시 `window.VlueFamilyBridge.platform === 'ios'` 및 `capabilities` 객체가 주입됩니다.

## Xcode 열기

```bash
open apps/ios/VlueShell.xcodeproj
```

- 타겟: **VlueShell**
- Bundle ID: `kr.vlue.app` (Android와 동일)
- iOS 15+

## URL 설정

`Config/Debug.xcconfig` / `Release.xcconfig`:

```properties
VLUE_WEB_BASE_URL = http://127.0.0.1:5173
VLUE_API_BASE_URL = http://127.0.0.1:8788
```

시뮬레이터는 Mac의 `127.0.0.1`로 Vite·API에 접속합니다.

## 브릿지

| 방향 | Android | iOS |
|------|---------|-----|
| 웹 → 네이티브 | `VlueFamilyBridgeNative.*()` | `webkit.messageHandlers.VlueFamilyBridgeNative.postMessage` |
| 네이티브 → 웹 | `evaluateJavascript` | **통화/원격앱 이벤트 미발생** (정책) |

자세한 계약: `README_FAMILY_PROTECTION.md`

## 관련 모듈

- 레터링 SPM: `apps/ios-lettering` (별도 패키지, 본 셸과 병합 가능)
