# OEM Overlay Known Restrictions

> **Diagnostics / QA 참고 문서.** Companion Architecture · OverlayState · Controller · Window 정책을 바꾸지 않는다.  
> Phase 5-A Hardening — 알려진 제한사항 카탈로그만 기록한다.

Companion Engine은 **Architecture Freeze** 상태이다. 본 문서는 제조사별 Overlay 제한을 **문서화**할 뿐, 제품 정책을 변경하지 않는다.

---

## 공통 (모든 OEM)

| 항목 | 제한 / 관찰 포인트 |
|------|-------------------|
| Overlay Permission | `SYSTEM_ALERT_WINDOW` / `Settings.canDrawOverlays` 필수 |
| TYPE_APPLICATION_OVERLAY | API 26+ type 2038 — 단일 Companion Window만 사용 |
| BadTokenException | Token 무효 · 권한 거부 · OEM 통화 중 거부가 흔함 |
| Foreground Service | 통화 FGS 미기동 시 OEM이 Overlay를 차단할 수 있음 |
| Battery Optimization | Doze / 배터리 최적화로 FGS·수신 지연 가능 |
| Screen OFF / AOD | BigPush Position → HIDDEN (State 유지, Window 제거 금지) |

---

## Samsung (One UI)

| 항목 | Known Restriction |
|------|-------------------|
| Call UI / Mini Call | 통화 중 non-store 설치 앱의 `TYPE_APPLICATION_OVERLAY` 거부가 보고됨 (`SamsungRestrictOverlayProcessor` 계열) |
| canDrawOverlays=true | 권한이 있어도 통화 중 2038 거부 → `OEM_RESTRICTED` |
| BadToken | `"permission denied for window type 2038"` 메시지와 함께 발생 가능 |
| AOD / Screen OFF | One UI Always On Display — BigPush HIDDEN 정책 |
| Battery | 절전·수면 모드에서 FGS 지연 |
| Installer | Play / Galaxy Store / ADB 외 사이드로드에서 통화 Overlay 거부가 더 흔함 |
| Mini Call | 시스템 Mini Call UI와 Companion Mini는 **경쟁하지 않음** (Companion 단일 Window) |

**Hardening 원칙:** Retry / Delay / 추가 Window / State Machine 변경으로 우회하지 않는다. Diagnostics로 원인(`OEM_RESTRICTED` / `BAD_TOKEN` / `PERMISSION_DENIED`)을 남긴다.

---

## Google Pixel (AOSP Phone)

| 항목 | Known Restriction |
|------|-------------------|
| Overlay Permission | 표준 `canDrawOverlays` — 거부 시 `PERMISSION_DENIED` |
| Call UI | AOSP Telecom — Samsung 대비 OEM 통화 중 2038 거부가 적음 |
| Battery | Adaptive Battery로 백그라운드 제한 가능 |
| Screen OFF | 표준 Screen Off — BigPush HIDDEN |
| Role Dialer | 참고용 — Overlay 정책과 무관하게 기록만 |

---

## Xiaomi (MIUI / HyperOS)

| 항목 | Known Restriction |
|------|-------------------|
| Overlay Permission | 표시 권한 + 추가 “다른 앱 위에 표시” MIUI 토글이 분리된 기기 존재 |
| Autostart / Battery | 자동 시작·배터리 절약에서 FGS·수신 누락 가능 |
| Window | MIUI가 Overlay를 공격적으로 차단하는 사례 보고 |
| Lock screen | 잠금 화면 Overlay 추가 제한 가능 |
| Screen OFF | BigPush HIDDEN 동일 정책 적용 |

---

## FailureReason 매핑 (관찰)

| 현상 | FailureReason |
|------|---------------|
| `canDrawOverlays=false` | `PERMISSION_DENIED` |
| BadToken (일반) | `BAD_TOKEN` |
| 2038 permission denied + canDraw=true | `OEM_RESTRICTED` |
| Screen OFF BigPush 거부 | `SCREEN_OFF_POLICY` |
| 기타 addView 거부 | `WINDOW_REJECTED` |
| 통화 종료 후 attach 시도 | `CALL_ENDED` |

---

## 금지

- Retry / Delay 추가
- 이중 Window / 추가 Overlay
- OverlayState · Controller · State Machine 변경
- OEM별 분기 정책으로 Architecture 분기
