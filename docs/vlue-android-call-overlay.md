# VLUE Android — 전화 수신 오버레이·로컬 DB (§3 설계 요약)

## 권한

- `READ_PHONE_STATE` / `READ_CALL_LOG`(정책 허용 시): 수신 발신 번호 식별.
- `SYSTEM_ALERT_WINDOW`: 타 앱 위 오버레이(설정에서 수동 허용 안내).
- 네트워크: `GET /api/cards/by-number?number=` 호출(웹과 동일 엔드포인트).

## 모듈 구성

1. **CallListenerService** (`TelephonyManager` / `PhoneStateListener` 또는 `Telecom` 콜백): `RINGING` 시 E.164 정규화된 번호를 브로드캐스트.
2. **CardLookupRepository**: Room(SQLite) 테이블 `cached_cards(phone_e164 PRIMARY KEY, payload_json, updated_at)` 조회 → 미스 시 API 호출 후 `INSERT OR REPLACE`.
3. **OverlayActivity** 또는 **WindowManager` 풀스크린 타입 애플리케이션 오버레이**: Case A/B/C에 따라 `displayName`, `jobTitle`, `companyName`만 표시(PII 최소화).
4. **SyncWorker**: 주기적 백그라운드로 서버와 명함 캐시 동기화(선택).

## 플로우

수신 이벤트 → 로컬 DB 조회 → (없음) `getBusinessCardByNumber` → 캐시 저장 → 오버레이 표시 → 통화 종료 시 오버레이 제거.

## 참고

- Kotlin: `apps/android/` — `CallOverlayService` + **`incall/VlueInCallService`**(기본 전화앱 UI).
- DTMF·완벽한 종료: 사용자가 VLUE를 기본 전화 앱으로 지정해야 `Call.playDtmfTone` / `Call.disconnect` 사용 가능.
- 상세: `docs/v1_incall_android_ios.md`
