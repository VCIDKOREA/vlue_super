# VLUE Lettering — iOS

## Xcode 타겟 포함

1. **Swift Package** — Xcode → File → Add Package Dependencies → `apps/ios-lettering` (로컬)
2. 메인 타겟에 `VlueLettering` 라이브러리 링크
3. `Integration/AppDelegate+Lettering.swift` 참고해 진입점 연결

## AppDelegate / SceneDelegate

```swift
import VlueLettering

func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions ...) -> Bool {
    LetteringBootstrap.start()  // LetteringCallObserver.shared.start()
    return true
}

func applicationDidBecomeActive(_ application: UIApplication) {
    LetteringBootstrap.onBecomeActive()
}
```

## 로컬 호스트 앱 (검증용)

```bash
cd apps/ios-lettering
swift build
```

`VlueHost` 실행 타겟 — `VlueHostApp.swift`에서 `LetteringBootstrap.start()` 호출됨.

## WKWebView

- `vlueLetteringBlock`, `vlueLetteringOpenCert`, `vlueLetteringSettings`
- Info.plist `VLUEWebBaseURL` = `https://www.vlue.kr` (또는 로컬 `http://127.0.0.1:5173`)
