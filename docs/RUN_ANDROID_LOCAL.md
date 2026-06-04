# VLUE 레터링 — 로컬 Android 실행 가이드 (초보자용)

## 0. 한 번만 준비

1. **Android Studio** 설치 (JDK 17 포함)
2. **USB 디버깅** 켠 실제 폰 또는 **AVD 에뮬레이터** 생성
3. PC에 **Node.js 18+** 설치

## 1. 터미널 — 프로젝트 루트 (`발구지` 폴더)

```powershell
cd "c:\Users\jg071\OneDrive\바탕 화면\발구지"
```

### 1-1. Prisma (DLL 잠금 시)

```powershell
npm run db:generate:safe
```

### 1-2. 백엔드 + 웹 (창 2개)

**창 A — API**
```powershell
npm run api:dev
```

**창 B — 웹 (에뮬레이터/폰이 접속할 UI)**
```powershell
npm run dev -- --host 0.0.0.0
```

### 1-3. Android 병합 + 로컬 URL

**에뮬레이터**
```powershell
npm run android:setup
```

**실제 테스트폰 (USB)**
```powershell
npm run android:setup:device
adb reverse tcp:8788 tcp:8788
adb reverse tcp:5173 tcp:5173
```

## 2. APK 빌드

```powershell
npm run android:assemble
```

성공 시 APK 경로:
`apps\android\app\build\outputs\apk\debug\app-debug.apk`

## 3. 폰에 설치·실행

```powershell
npm run android:install
npm run android:launch
```

또는 Android Studio에서 `apps/android` 폴더 열기 → Run ▶

## 4. 레터링 팝업 테스트

1. 앱 실행 → **프로필 설정** → **VLUE 레터링** 켜기
2. **다른 앱 위에 표시** + **전화** 권한 허용
3. 다른 폰에서 테스트 번호로 전화 → 상단 VLUE 카드 확인  
   (에뮬레이터만으로는 실제 수신 이벤트가 제한될 수 있음 → **실기기 권장**)

## 5. 문제 해결

| 증상 | 조치 |
|------|------|
| Gradle JDK 오류 | Android Studio 설치 후 `npm run android:setup` 재실행 |
| SDK not found | `local.properties`의 `sdk.dir` 경로 확인 |
| WebView 빈 화면 | `npm run dev` 실행 여부, URL `10.0.2.2:5173` (에뮬) |
| API 조회 실패 | `npm run api:dev` + `VITE_API_URL` / 에뮬 `10.0.2.2:8788` |
| EPERM prisma | `npm run db:generate:safe` |
