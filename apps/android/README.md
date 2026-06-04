# VLUE Android (메인 앱 모듈)

소스 원본: `apps/android-call-overlay/` → `npm run android:sync` 로 `app/src/main` 에 병합됩니다.

## 필수

- **Android Studio** (JDK 17 `jbr` 포함)
- Android SDK (Studio 설치 시 함께 설치)

`gradle.properties`에 Studio JBR 경로가 없으면 추가:

```properties
org.gradle.java.home=C\:\\Program Files\\Android\\Android Studio\\jbr
```

## 빠른 시작

프로젝트 루트에서:

```powershell
npm run android:setup:device
npm run android:assemble
```

자세한 단계: `docs/RUN_ANDROID_LOCAL.md`
