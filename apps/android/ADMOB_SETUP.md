# AdMob production setup

`local.properties` 또는 CI Gradle secret에 아래 값을 설정한다. 저장소에는 실제 ID를 커밋하지 않는다.

```properties
admob.app.id=ca-app-pub-...~...
admob.rewarded.15.id=ca-app-pub-.../...
admob.rewarded.30.id=ca-app-pub-.../...
admob.native.id=ca-app-pub-.../...
```

- AdMob 보상형 광고 단위의 SSV 콜백 URL: `https://api.vlue.kr/api/monetization/reward/ssv`
- 개발 기본값은 Google 공식 테스트 광고 ID다.
  - Banner: `ca-app-pub-3940256099942544/6300978111`
  - Native Advanced: `ca-app-pub-3940256099942544/2247696110` (오타 `/2241692110` 금지 — Publisher data not found)
- `15초`/`30초`는 정책별 광고 단위 분리 기준이다. 실제 광고 소재 길이는 AdMob이 결정하며 앱에서 강제할 수 없다.
- 서버는 `onUserEarnedReward`만 신뢰하지 않고 Google SSV 서명과 transaction ID를 검증한 뒤 권한을 확정한다.
