# VLUE Call Overlay (Android)

통화 수·발신 이벤트 → API 명함 조회 → **WebView 레터링 UI** 오버레이.

## 포함 파일

| 클래스 | 역할 |
|--------|------|
| `LetteringCallReceiver` | `PHONE_STATE` RINGING / IDLE |
| `OutgoingCallReceiver` | `NEW_OUTGOING_CALL` |
| `LetteringCallCoordinator` | 조회·오버레이 생명주기 |
| `CallOverlayService` | `WindowManager` + WebView + 페이드 인/아웃 |
| `CardLookupRepository` | `GET /api/cards/by-number` |
| `LetteringPrefs` | SharedPreferences on/off |
| `LetteringPermissionHelper` | `SYSTEM_ALERT_WINDOW`, `READ_PHONE_STATE` |
| `MainActivity` | 메인 WebView + 권한 다이얼로그 |

## 빌드

Android Studio에서 `apps/android-call-overlay` 열기.  
`app/build.gradle.kts`의 `WEB_BASE_URL`, `API_BASE_URL` 수정.

## 메인 앱 merge

1. `AndroidManifest`에 receiver·service·권한 복사
2. 로그인 후 `LetteringPrefs.setSession(context, userId, accessToken)`
3. 웹 설정 토글 ↔ `Android.setLetteringEnabled("1")`

상세: `docs/lettering-integration.md`
