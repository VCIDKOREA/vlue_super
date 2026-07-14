# V1 Android InCallService · iOS CallKit 전면 오버레이

## Android (InCallService)

| 구성 | 경로 |
|------|------|
| InCall UI | `apps/android/.../incall/VlueInCallService.kt` |
| Call 제어 | `incall/VlueInCallController.kt` — `disconnect` / `playDtmfTone` / `setMuted` / `setAudioRoute` |
| 기본 전화앱 역할 | `incall/DialerRoleHelper.kt` + `DialerTrampolineActivity` |
| 오디오 헬퍼 | `LetteringCallAudioHelper.kt` — InCall 우선, 폴백 ToneGenerator |

**필수:** 사용자가 VLUE를 **기본 전화 앱**으로 지정해야 통신사 DTMF·`Call.disconnect()`가 동작한다.  
권한 설정 흐름에서 `ROLE_DIALER`를 요청한다 (`requestDefaultDialerRole`).

통화 종료 시 `endCallKeepOverlay` → 쇼케이스 유지 (`ACTION_ENDED_KEEP`).

## iOS (CallKit + 전면 WebView)

| 구성 | 경로 |
|------|------|
| 셸 통합 | `apps/ios/VlueShell/Lettering/LetteringCallKitOverlay.swift` |
| SPM | `apps/ios-lettering` — `LetteringCallObserver` + `LetteringOverlayPresenter` |

- `CXCallObserver`로 통화 활성 감지
- 전면 `UIWindow` + WKWebView `#lettering-overlay&platform=ios&native=1`
- **스와이프 업** → 오버레이 가림 → 순정 통화 UI 사용 (ARS/녹음)
- 스와이프 다운 → 쇼케이스 복귀
- 번호 주입: `vlue://lettering?phone=...&verified=1` 또는 `PeerPhoneHint` 알림

> iOS는 정책상 시스템 다이얼러를 완전 대체할 수 없다. PushKit VoIP가 아닌 PSTN은 전면 오버레이 + 순정 UI 슬라이드 전략이 최종 형태다.
