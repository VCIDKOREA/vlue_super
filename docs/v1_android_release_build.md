# Android 릴리즈 빌드 · 서명 · 포트원 테스트 모드

## 1. JDK 17

`apps/android/gradle.properties`:

```properties
org.gradle.java.home=C\:\\Program Files\\Zulu\\zulu-17
```

또는 Android Studio `jbr` 경로. `scripts/android-assemble.mjs`도 Zulu 17을 자동 탐지합니다.

## 2. 릴리즈 APK / AAB

```powershell
# 루트에서
npm run android:assemble:release   # APK
npm run android:bundle:release     # AAB (Play Store)
```

출력:
- `apps/android/app/build/outputs/apk/release/app-release.apk`
- `apps/android/app/build/outputs/bundle/release/app-release.aab`

`keystore.properties`가 없으면 **debug 키로 서명**된 release 빌드가 나옵니다(내부 QA용).  
**Play Store 제출 전** 반드시 아래 실키로 교체하세요.

### 실 서명 키 생성

```powershell
cd apps\android
keytool -genkeypair -v -keystore vlue-release.keystore -alias vlue -keyalg RSA -keysize 2048 -validity 10000
copy keystore.properties.example keystore.properties
# keystore.properties 에 storeFile / 비밀번호 / alias 기입
```

`keystore.properties` · `*.keystore` 는 gitignore 대상입니다.

## 3. 포트원 테스트 모드 (네이버페이 심사 중)

| 위치 | 변수 | 승인 후 |
|------|------|---------|
| Web | `VITE_PORTONE_TEST_MODE=true` | `false` 또는 삭제 |
| API | `PORTONE_TEST_MODE=true` (+ `VLUE_ALLOW_DEV_BILLING=1`) | 둘 다 제거 |

테스트 모드에서 **결제 버튼** → `POST /api/payment/subscribe/complete` (`devBillingBypass`) → 구독 active + `digitalCard.membershipTierSnapshot=paid` → 클라 Premium.

## 4. 크로스 플랫폼 (WebView 셸)

VLUE는 RN/Flutter가 아니라 **웹(Vite) + Android/iOS Native WebView** 구조입니다.

- 결제·PortOne env는 **웹 번들** (`VITE_*`)에만 있습니다.
- Android `BuildConfig.API_BASE_URL` / iOS xcconfig `VLUE_API_BASE_URL` 은 API·Web 로딩 URL만 담당합니다.
- iOS: `apps/ios/Config/Release.xcconfig` → `https://api.vlue.kr` / `https://www.vlue.kr` (PortOne 키 없음 — WebView가 웹 env 사용).

승인 후 스위치만 끄면 Android·iOS 동일 웹 빌드가 실결제 경로로 전환됩니다.
