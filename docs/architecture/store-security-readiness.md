# Store / Security / Privacy Readiness

> Phase 5-D Audit + **Phase 6-B RC-2** Blocker 반영.  
> Companion Architecture Freeze — State / Controller / Window 변경 없음.

---

## 1. Manifest Risk Summary

| 항목 | 상태 | 비고 |
|------|------|------|
| `exported=true` Receivers | 검토 | 시스템 Broadcast — 권한/필터 유지 |
| `QUERY_ALL_PACKAGES` | **제거 (RC-2)** | 알려진 remote 앱만 `<queries>` |
| `allowBackup=true` | 검토 | Backup 규칙 검토 |
| `usesCleartextTraffic` | **false (RC-2)** | HTTPS 기본; localhost/`10.0.2.2`만 NSC 예외 |
| CAMERA / LOCATION / READ_MEDIA | 검토 | 목적 고지·최소화 |
| FGS `specialUse` | Store 선언 | Play Console 고지 |
| NotificationListener / InCallService | 보호됨 | permission-gated |

---

## 2. Intent / PendingIntent

| 항목 | 결과 |
|------|------|
| PendingIntent | `FLAG_IMMUTABLE` |
| Overlay Service | `exported=false` |

---

## 3. Overlay Security

| 항목 | 결과 |
|------|------|
| SYSTEM_ALERT_WINDOW | 사용자 권한 게이트 |
| Abuse | Call Event 기반 단일 Window — 상시 광고 아님 |
| TYPE_APPLICATION_OVERLAY | 단일 Window (Freeze) |

---

## 4. Privacy (RC-2)

| 항목 | 결과 |
|------|------|
| Diagnostics phone | `phoneMasked` / `ReleaseDebugGate.maskPhoneForLog` |
| Trace / Log | Release에서 raw phone 마스킹 |
| `Log.d` / Probe | `ReleaseDebugGate` — DEBUG only |
| Crash | Log.e 유지 |

---

## 5. Store Readiness Checklist

- [x] QUERY_ALL 제거 / `<queries>` 근거
- [x] Cleartext off (HTTPS) + debug NSC 예외 문서화
- [x] Trace/Log/Probe Release 게이트
- [ ] Play Console: 권한 사용 목적 (Overlay / Phone / Contacts / FGS specialUse)
- [ ] 개인정보 처리방침 URL 반영
- [ ] Overlay 목적 문구 (Companion · 전화앱 대체 아님)
- [ ] AccessibilityService: 앱 미등록 확인
- [ ] Default Dialer 선택적 고지
- [ ] 스크린샷 · 앱 설명
- [ ] Production keystore 서명 (`keystore.properties`)
- [ ] Final QA (Samsung / Pixel / Xiaomi)

상세 제출 문서: `docs/release/release-candidate-v2.md`

---

## 금지

Architecture / State / Controller / Window / Retry / Delay 변경으로 “우회”하지 않는다.
