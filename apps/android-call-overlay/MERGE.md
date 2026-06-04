# Android 메인 앱 Merge 체크리스트

별도 `MainActivity` 저장소가 있으면 아래를 **기존 앱 모듈**에 복사합니다.  
이 레포의 `apps/android-call-overlay`는 VLUE 통합 셸(메인 WebView + 레터링)입니다.

## AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.PROCESS_OUTGOING_CALLS" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL" />

<receiver android:name="kr.vlue.calloverlay.LetteringCallReceiver" android:exported="true">
  <intent-filter>
    <action android:name="android.intent.action.PHONE_STATE" />
  </intent-filter>
</receiver>
<receiver android:name="kr.vlue.calloverlay.OutgoingCallReceiver" android:exported="true">
  <intent-filter>
    <action android:name="android.intent.action.NEW_OUTGOING_CALL" />
  </intent-filter>
</receiver>
<service android:name="kr.vlue.calloverlay.CallOverlayService"
  android:exported="false"
  android:foregroundServiceType="phoneCall" />
```

## Application / MainActivity

```kotlin
// Application.onCreate
LetteringIntegration.onApplicationCreate(this)

// MainActivity.onCreate / onResume
LetteringIntegration.onMainActivityReady(this)
// 로그인 후
LetteringIntegration.bindUserSession(this, userId, accessToken)
```

## URL

`gradle.properties` → `VLUE_API_BASE_URL`, `VLUE_WEB_BASE_URL`
