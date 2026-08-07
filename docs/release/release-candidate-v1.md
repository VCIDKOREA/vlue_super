# VLUE Companion Engine — Release Candidate v1

> **Phase 6-A.** Companion Engine **Architecture Freeze**.  
> Engine 관련 코드 변경은 **Bug Fix 외 금지**. 본 문서는 RC 준비·Go/No-Go 판단용이다.  
> 앱 버전: `versionName 1.0.0` / `versionCode 1` (`apps/android/app/build.gradle.kts`)

---

## 1. Code Freeze Report

| 항목 | 값 |
|------|-----|
| **Architecture Version** | Companion Overlay B안 — Single Window + Event Driven State (`docs/architecture/companion-overlay.md`) |
| **State Version** | `OverlayState`: IDLE · BIG_PUSH · SHOWCASE · MINI_CASE (+ ScreenState · MiniCaseVisibility · OverlayPosition) |
| **Overlay Engine Version** | Companion Engine RC-1 (Freeze after Phase 5-D) |
| **App versionName** | 1.0.0 |
| **App versionCode** | 1 |
| **Freeze scope** | OverlayState · OverlayPosition · Controller · State Machine · Single Window · TYPE_APPLICATION_OVERLAY · Diagnostics 구조 · Window Lifecycle · Companion Architecture |
| **Allowed changes** | Bug Fix · OEM Compatibility note · Performance observation · Diagnostics/QA docs · Store/Security docs |

### Known Limitation

1. **INCOMING은 별도 OverlayState가 아님** — Incoming 이벤트 후 BigPush 전까지 IDLE 유지 (Controller API).
2. **Keypad Close만으로 SHOWCASE 복귀하지 않음** — `onKeypad(false)`는 context 갱신; Showcase 복귀는 `onRestoreShowcase` (기존 API).
3. **BigPush는 optional** — Answer는 BigPush 완료와 독립 (Architecture §2.1).
4. **Diagnostics는 관찰 전용** — Failure/Recovery/Perf는 상태를 복구·Retry하지 않음.
5. **WebView Ready는 Showcase 표시를 지연시키지 않음** — Answer Event가 SoT.
6. **실기 OEM 편차는 기기별로 다름** — Samsung 통화 중 2038 거부는 Diagnostics로만 분류.

### Known OEM Restriction

| OEM | 제한 |
|-----|------|
| **Samsung One UI** | `canDrawOverlays=true`여도 통화 중 TYPE_APPLICATION_OVERLAY(2038) 거부 가능 → `OEM_RESTRICTED` |
| **Samsung** | 비스토어 설치에서 Call Overlay 거부가 더 흔함 |
| **Xiaomi** | 추가 “다른 앱 위에 표시” 토글 · Autostart/Battery |
| **공통** | SCREEN_OFF/AOD 시 BigPush Position HIDDEN (State 유지) |
| 상세 | `docs/architecture/oem-overlay-restrictions.md` |

### Open Risk

→ §4 Open Risk List.

---

## 2. Release Checklist

| # | 항목 | 기준 | RC 판정 |
|---|------|------|---------|
| 1 | Architecture Freeze 확인 | State/Controller/Window/Diagnostics 구조 미변경 | **PASS** (Phase 4~5 Freeze 유지) |
| 2 | Diagnostics 활성 여부 | OverlayDiagTracker · Perf · Recovery · Security 보고 활성 | **PASS** (관찰 전용 활성) |
| 3 | Debug Hook 제거 여부 | NORMAL_OVERLAY_PROBE 등 사용자 UX 비노출 · 후보 목록화 | **CONDITIONAL** — Probe는 QA용 잔존(§3 후보), 스토어 UX 비노출 확인 필요 |
| 4 | Deprecated API 정리 여부 | 후보만 목록화 · 자동 삭제 금지 | **PASS** (목록화 완료, 삭제 미실시) |
| 5 | Manifest Audit 확인 | Phase 5-D Manifest Risks 보고 | **PASS** (Audit 존재; Cleartext/QUERY_ALL 등 Open Risk) |
| 6 | Security Audit 확인 | Phase 5-D Security Report | **PASS** (Audit PASS; RISK 항목은 Open Risk로 추적) |
| 7 | Privacy Audit 확인 | phoneMasked OK · raw phone Trace RISK 추적 | **CONDITIONAL** — 마스킹 강화 Bug Fix 권장 |
| 8 | Performance KPI 확인 | Attach &lt;200ms · Answer→Showcase &lt;500ms · Window≤1 | **PASS** (단위 테스트/계측 기준) |
| 9 | Recovery PASS 확인 | Phase 5-C Case 1~7 | **PASS** |
| 10 | OEM Audit PASS 확인 | Phase 5-A Samsung/OEM Catalog · Audit | **PASS** (관찰 Audit; 실기 편차는 Known Limitation) |

**Checklist Validation:** `CompanionReleaseCandidateChecklist` + 단위 테스트.

---

## 3. Deprecated / Dead Code / Debug 후보 (삭제 금지 · 목록만)

| 후보 | 위치 | 유형 | 비고 |
|------|------|------|------|
| `CardLookupBridge` `@Deprecated` | `CardLookupBridge.kt` | Deprecated Wrapper | `LetteringCallCoordinator.onRinging`로 대체 |
| `DiagnosticsSessionStore` elapsed deprecated | `DiagnosticsSessionStore.kt` | Deprecated API | `elapsedRealtimeSinceStart` 사용 |
| `LetteringPermissionHelper` 이름 호환 deprecated | `LetteringPermissionHelper.kt` | Legacy Helper | 호환용 |
| `buildCompactOverlayLayoutParams` `@deprecated` | `CallOverlayService.kt` | Deprecated Wrapper | probe 호환 · `buildBigPushLayoutParams` |
| `ACTION_NORMAL_OVERLAY_PROBE` / `NormalOverlayProbe` | Service · diagnostics | Debug / QA Hook | Samsung 비교 실험 — 스토어 UX 비노출 유지 |
| `ACTION_ENDED_KEEP` + Advanced keep 경로 | `CallOverlayService` · `CompanionMvpConfig.DELEGATE_CALL_UI` | Legacy path | MVP=true 시 dismiss; false 분기 잔존 |
| `OutgoingCallReceiver` | Manifest · Receiver | Legacy API | `NEW_OUTGOING_CALL` deprecated — 유지 여부 검토 |
| Android Framework `@Deprecated` 사용처 | MainActivity / Monitor / Telecom | Platform API | acceptRingingCall 등 — Bug Fix 시 교체 검토 |
| `Log.d` debounce 등 | Coordinator 등 | Debug log | Release strip/gate 후보 |
| Trace payload raw `phone` | CallOverlayService / VlueBigPushTrace | Privacy | 마스킹 Bug Fix 후보 |

**규칙:** 위 항목은 **자동 삭제하지 않는다.** RC 이후 Bug Fix / 별도 cleanup PR에서만 처리.

---

## 4. Open Risk List (출시 시점 잔여 기술 리스크)

| ID | 리스크 | 심각도 | 완화 |
|----|--------|--------|------|
| R1 | **Samsung Overlay 정책** — 통화 중 2038 거부 | High | Diagnostics `OEM_RESTRICTED` · 스토어 설치 권장 · 정책 우회(Retry/이중 Window) 금지 |
| R2 | **QUERY_ALL_PACKAGES** | High (Store) | Play 고지·정당화 (Family Care) |
| R3 | **Cleartext traffic** | High | Release에서 HTTPS 강제 / cleartext 비활성 (Bug Fix 허용) |
| R4 | **allowBackup=true** | Medium | Backup 규칙 또는 비활성 검토 |
| R5 | **Raw phone in diagnostics/trace** | Medium | phoneMasked 확대 (Bug Fix) |
| R6 | **OEM 편차** (Xiaomi Autostart 등) | Medium | OEM Catalog · 실기 QA |
| R7 | **FGS specialUse Store 선언** | Medium | Play Console 고지 필수 |
| R8 | **CAMERA/LOCATION 권한 범위** | Medium | Overlay 핵심 외 권한 설명·최소화 |
| R9 | **NORMAL_OVERLAY_PROBE 잔존** | Low | QA 전용 · 프로덕션 진입점 차단 확인 |

---

## 5. Go / No-Go Checklist

### PASS 조건 (모두 충족 시 Go 후보)

| Gate | 조건 | RC |
|------|------|-----|
| Architecture Freeze | Engine Freeze 유지 | **PASS** |
| Scenario PASS | Phase 4-C Scenario 1~8 | **PASS** |
| Stress PASS | Phase 4-D 100× Incoming→Answer→End | **PASS** |
| Recovery PASS | Phase 5-C Case 1~7 | **PASS** |
| Security PASS | Phase 5-D Audit 실행 · Critical 미해결은 Open Risk로 명시 | **PASS*** |
| Performance PASS | Attach/Answer KPI · Window≤1 · Leak 없음 | **PASS** |
| OEM PASS | Phase 5-A Audit/Catalog | **PASS*** |

\* Security/OEM **Audit PASS** = 점검 체계·보고 완료. Store **출시 Go**는 Open Risk(R1–R3 등) 완화 후 별도 판단.

### Go / No-Go 판정 (RC-1)

| 판정 | 내용 |
|------|------|
| **Engine RC: GO** | Companion Engine 품질 게이트(Scenario/Stress/Recovery/Perf/Architecture Freeze) 충족 |
| **Store ship: NO-GO (조건부)** | Cleartext · QUERY_ALL_PACKAGES 고지 · Samsung 실기 Overlay · Privacy 마스킹 강화 전 **스토어 제출 보류 권장** |
| **다음 액션** | Open Risk Bug Fix / Store 서류 · Engine 코드 Freeze 유지 |

---

## 6. Phase Evidence (Freeze 기간)

| Phase | 내용 |
|-------|------|
| 4-A~4-D | Transition · Failure · Scenario · Exception/Stress |
| 5-A | Samsung/OEM Hardening Audit |
| 5-B | Performance Dashboard |
| 5-C | Recovery Hardening |
| 5-D | Security/Privacy/Store Audit |
| 6-A | Release Candidate 문서 · Checklist Validation |

---

## 7. Architecture 변경 여부

**없음.** Phase 6-A는 문서 · Checklist · Deprecated **후보 목록** · Validation 테스트만 추가한다.
