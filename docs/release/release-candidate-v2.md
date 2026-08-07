# VLUE Companion Engine — Release Candidate v2

> **Phase 6-B.** Companion Engine **Release Freeze**.  
> Architecture / OverlayState / Controller / Window / State Machine / Diagnostics 구조 변경 **금지**.  
> 허용: Release Blocker 수정 · Bug Fix · Store 제출 준비 · 문서.  
> 앱 버전: `versionName 1.0.0-rc2` / `versionCode 2`

선행: [RC-1](release-candidate-v1.md) (Engine GO / Store NO-GO).

---

## 1. Release Blocker 해결

| ID | 항목 | 조치 | 상태 |
|----|------|------|------|
| **R1** | `QUERY_ALL_PACKAGES` | **제거**. Family 원격앱 스캔은 알려진 package만 `<queries>` + `getPackageInfo` | **CLOSED** |
| **R2** | `usesCleartextTraffic` | **`false`**. 프로덕션 HTTPS (`api.vlue.kr` / `www.vlue.kr`). Debug localhost·`10.0.2.2`만 `network_security_config.xml` 예외 | **CLOSED** |
| **R3** | raw phone Trace / `Log.d` / Probe | `ReleaseDebugGate.maskPhoneForLog` · `ReleaseDebugGate.d` · Probe/`ACTION_NORMAL_OVERLAY_PROBE`는 **DEBUG only** | **CLOSED** |

근거 코드: `FamilyRemoteAppPackages` · `AndroidManifest.xml` · `ReleaseDebugGate` · `NormalOverlayProbe` · `CallOverlayService`.

---

## 2. Release Build 검증

| 항목 | 기대 | 기록 |
|------|------|------|
| Release Variant | `assembleRelease` | **SUCCESS** (2026-08-08) |
| R8 / ProGuard | `isMinifyEnabled=true` | **PASS** (`minifyReleaseWithR8`) |
| Resource Shrink | `isShrinkResources=true` | **PASS** (`shrinkReleaseRes`) |
| Signing | `keystore.properties` 있으면 실키, 없으면 **debug 키 fallback** | debug fallback 사용 중 — 스토어 제출 전 **실키 필수** (잔여 Risk R6) |
| Manifest Merge | QUERY_ALL 없음 · cleartext=false | **PASS** |
| Build | SUCCESS | **PASS** |

명령:

```bash
cd apps/android && ./gradlew :app:assembleRelease
```

---

## 3. Store Submission 준비

### 권한 설명 (Play)

| 권한 | 목적 |
|------|------|
| `SYSTEM_ALERT_WINDOW` | 통화 중 레터링/디지털 카드 Companion Overlay (단일 Window) |
| `READ_PHONE_STATE` / Call log / Contacts | 수신·발신 이벤트 및 카드 조회 |
| FGS `specialUse` / phoneCall | Overlay 서비스 유지 — Console 고지 |
| Notification Listener | Family Care 은행 알림(선택 기능) |
| CAMERA / LOCATION | Family/부가 기능 — Overlay 핵심과 분리 고지 |

### Privacy Policy 반영

- 통화 번호 처리·마스킹된 진단 로그
- Overlay 권한 목적
- 선택적 기본 전화앱(ROLE_DIALER) 영향
- 원격제어 앱 탐지: **전체 패키지 목록 조회 없음** (알려진 package만)

### Overlay 목적 설명

- 레터링/디지털 카드 Companion — **전화 앱 대체·상시 광고 Overlay 아님**
- AccessibilityService **미등록**

### 스크린샷 필요 항목

1. Incoming BigPush / 카드  
2. Answer → Showcase  
3. Mini / Edge  
4. Overlay 권한 안내 화면  
5. (선택) Family Care 원격앱 경고

### 앱 설명 반영

- 통화 Companion Overlay  
- 단일 Window 아키텍처  
- OEM(특히 Samsung)에서 통화 중 Overlay 제한 가능 — 스토어 설치 권장

체크리스트 상세: `docs/architecture/store-security-readiness.md`

---

## 4. Final QA Checklist

| Device | Incoming | Answer | Mini | Edge | Restore | Call End | PASS |
|--------|----------|--------|------|------|---------|----------|------|
| Samsung | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Pixel | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Xiaomi (가능 시) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

실기 PASS는 제출 직전 기입. 단위/시나리오 자동화는 Phase 4–5 근거.

---

## 5. Open Risk (잔여 · Store Blocker 아님)

| ID | 리스크 | 심각도 | 완화 |
|----|--------|--------|------|
| R1 | Samsung 통화 중 Overlay 2038 | High | Diagnostics · 스토어 설치 · 우회 금지 |
| R2 | allowBackup=true | Medium | Backup rules |
| R3 | OEM 편차 (Xiaomi 등) | Medium | Final QA |
| R4 | FGS specialUse Console | Medium | Play 고지 |
| R5 | CAMERA/LOCATION 범위 | Medium | 리스팅 고지 |
| R6 | Release signing debug fallback | Medium | `keystore.properties` 실키 |
| R7 | WebView JS phone payload | Low | 기능 데이터 · 정책 고지 |

---

## 6. Go / No-Go (RC-2)

| 판정 | 내용 |
|------|------|
| **Release Blockers R1–R3** | **CLOSED** |
| **Engine RC** | **GO** |
| **Store 제출** | **GO** (실키 서명 · Console 고지 · Final QA 실기 체크 후 업로드) |
| **RC-2 상태** | Store-submittable candidate |

**종합: GO** — Architecture Freeze 유지 하에 Store 제출 가능.  
NO-GO로 되돌리는 조건: 실키 미준비로 서명 불가, 또는 Final QA에서 Critical 회귀.

---

## 7. Architecture 변경 여부

**없음.** Phase 6-B는 Blocker Bug Fix · Manifest/Network · Release gate · 문서 · Checklist만.
