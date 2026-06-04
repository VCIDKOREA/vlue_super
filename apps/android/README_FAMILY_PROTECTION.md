# VLUE Android — 가족보호 네이티브 셸

## 권한 (`AndroidManifest.xml`)

- `READ_CALL_LOG` — 통화 기록
- `READ_PHONE_STATE` — 전화 상태
- `QUERY_ALL_PACKAGES` — 원격제어 앱 스캔

## 브릿지

| 네이티브 | 웹 `window.VlueFamilyBridge` | API |
|----------|------------------------------|-----|
| `FamilyCallTracker` IDLE | `onCallEnded` / `onMissedCall` | `POST /api/family-protection/alert/call` |
| `FamilyRemoteAppScanner` | `onRemoteAppDetected` | `POST .../ward/remote-app` |

웹 → 네이티브: `window.VlueFamilyBridgeNative.scanRemoteControlAppsNow()`

## 로컬 개발

`local.properties`:

```properties
vlue.web.base.url=http://10.0.2.2:5173
vlue.api.base.url=http://10.0.2.2:8788
```

에뮬레이터에서 PC의 Vite(5173)·API(8788)에 연결됩니다.

## 빌드

```bash
npm run android:assemble
```
