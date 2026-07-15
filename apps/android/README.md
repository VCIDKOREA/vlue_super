# VLUE Android (메인 앱 모듈)

소스 원본: `apps/android-call-overlay/` → `npm run android:sync` 로 `app/src/main` 에 병합됩니다.

## 필수

- **Android Studio** (JDK 17 `jbr` 포함) — 최초 1회 열어 SDK 설치
- Android SDK (`%LOCALAPPDATA%\Android\Sdk`) — `local.properties`의 `sdk.dir`
- 릴리즈 가이드: [`docs/v1_android_release_build.md`](../../docs/v1_android_release_build.md)

`gradle.properties`에 JDK 17:

```properties
org.gradle.java.home=C\:\\Program Files\\Zulu\\zulu-17
```

## 릴리즈 APK / AAB

```powershell
npm run android:assemble:release
npm run android:bundle:release
```

실 서명: `keystore.properties.example` → `keystore.properties` (gitignore).  
없으면 **debug 키로 release 서명**(내부 QA). Play 제출 전 실키 필수.

## 빠른 시작 (디버그)

```powershell
npm run android:setup:device
npm run android:assemble
```

자세한 단계: `docs/RUN_ANDROID_LOCAL.md`
