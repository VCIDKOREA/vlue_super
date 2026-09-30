# VLUE Call Overlay Contract (Freeze)

**Status:** FROZEN — behavior changes require matrix + tests first.  
**Verified PASS (device):** outgoing logo → Safe Care/auth popup → Mini (v1.0.15 / 57).  
**Owner path:** `kr.vlue.calloverlay` + `web/src/components/LetteringOverlayHost.jsx`  
**Executable lock:** `CallUiPhasePolicy`

이 문서는 BigPush / Showcase / 중앙 팝업 / 발신 로고의 **유일한 UX 규격**이다.  
코드에 예외를 먼저 넣지 말고, 여기 표를 고친 뒤 Policy·테스트를 맞춘다.  
**필요할 때만** 수정·보강한다. 핫픽스·우회 분기 금지.

---

## 1. Phases

| Phase | Meaning |
|-------|---------|
| `BIG_PUSH` | Compact top bar only (**incoming** ringing) |
| `OUTGOING_LOGO` | Outgoing-only: center VLUÉ logo (no peer BigPush bar) until user tap |
| `CENTER_SAFE_POPUP` | 경로 검증 · 안심케어 (비회원 주소록) |
| `CENTER_AUTH_POPUP` | 경로 검증 · 인증 회원 (송출 OFF / DCC 없음) |
| `FULL_SHOWCASE` | Fullscreen peer showcase (실콘텐츠 + 송출 ON) |
| `MINI_CASE` | After popup Confirm (or user minimize) |
| `KEEP_BIG_PUSH` | Answered but no safe content path — stay on bar, **no empty fullscreen** (incoming) |

---

## 2. Dialing / ringing (before answer)

| Event | UI |
|-------|-----|
| Incoming ringing | `BIG_PUSH` only |
| Outgoing dialing / connecting | `OUTGOING_LOGO` only — **skip peer BigPush / identity fetch UI** |
| Audio `MODE_IN_CALL` while still dialing | **Ignore** — must not open popup/showcase |
| Logo / bar tap while outgoing unanswered | **Honored (v2 one-touch)** — opens best memory entry from `CallPrefetchCache` instantly (member → showcase / safe popup; otherwise 미등록 안심팝업). Never waits, never shows a spinner. |
| Outgoing logo label | Text sits **above** the logo (nothing below it; `연결중...` is deleted). VLUÉ DB 상호/이름 → that name · saved contact → saved name/상호 · VLUÉ 미등록/unknown/lookup pending → `탭하여 정보확인`. Connection state no longer changes the text (`CallUiPhasePolicy.outgoingBubbleLabel`, web `resolveOutgoingLogoLabel`). |
| Card lookup / Safe Care payload arrives while unanswered | Incoming: paint BigPush only. Outgoing: keep logo — **no center popup** |

`remoteConnected` may become true **only** after a real answer path (`enterShowcaseFromAnswer` / InCall `STATE_ACTIVE` after dialing/connecting). Audio `MODE_IN_CALL` alone must **never** open popup/showcase (OEM false positive while still ringing).

Path abnormal also follows this rule: before answer it remains **BigPush only**.
Never attach a center popup over a ringing BigPush.

---

## 3. After answer (`remoteConnected == true`)

### 3a. Incoming (unchanged except public directory)

Decision order (first match wins):

1. User already Mini / auth confirmed → stay `MINI_CASE` (no re-open popup/showcase)
2. **Path abnormal** (`dcp_route=abnormal` / `pathVerify` / `CallPathSession` 비정상) → `CENTER_SAFE_POPUP` only — **FULL_SHOWCASE 금지** (회원 DCC·쇼케이스·미인증 신고 패널 포함)
3. `profileKind == contact_safe_care` **or** `public_directory_safe` → `CENTER_SAFE_POPUP` (안심팝업 · 신고/제보 없음)
4. Auth-member-only (verified + **explicit** broadcast OFF, or no DCC/showcase content) → `CENTER_AUTH_POPUP`
5. Verified member with real DCC **or** showcase content, unless `includeDigitalCard:false` → `FULL_SHOWCASE`
   (missing `includeDigitalCard` key must **not** be treated as OFF when a digital card exists)
6. Resolved unverified / 미등록 (lookup done or timed out, `matched:false`, not pending, not safe-care, no device-contact promote) → **`CENTER_SAFE_POPUP` (미등록 안심팝업, v2)**. **FULL_SHOWCASE is forbidden** unless the user explicitly presses the popup's report button (`AnswerInput.reportRequested`).
   - Line 1: `• 발신경로 정상 (VLUE 미등록 번호)`
   - Line 2: `• 유선상 금전요구는 주의바랍니다.`
   - Buttons (one row): `제보하기` → in-overlay 제보 panel (user action only) · `신고하기` → in-overlay 신고 sheet (user action only) · `피싱안심SOS` → external 경찰청 SOS page. Then `닫기` → Mini.
   - Shown **natively, instantly** from the `CallPrefetchCache` entry — presenting it never expands the overlay window or starts any extra WebView navigation/loading UI. Same rule applies to the in-app call-history list (`CallShowcaseHistorySheet`): tapping an unregistered number opens the web twin of this popup, never the full-screen showcase/report panel.
7. Else (pending lookup / blank) → `KEEP_BIG_PUSH` until `CallPrefetchCache` binds (hard cap `FIRST_PAINT_TIMEOUT_MS`, 2s) — the cap binds a 미등록 entry, so pending can never persist.

Contact promote: if lookup pending/blank **and** device contact name exists → treat as Safe Care (`CENTER_SAFE_POPUP`).

**Lookup tiers (v2, `CallPrefetchCache`, ConcurrentHashMap, parallel first-arrival binding):**
1. VLUE member → `FULL_SHOWCASE` / auth popup (rules 4–5)
2. Public / local DB (`public_directory_safe`, saved safe-care) → 안심팝업 (rule 3)
3. Unregistered / timeout → 미등록 안심팝업 (rule 6)

A lower tier may bind first (first paint) but never overwrites a higher tier; a later higher-tier result upgrades an already-visible 미등록 popup in place.

**Public directory:** 학교·우체국·공공기관 등 DB 전화 매칭 → `public_directory_safe` 안심팝업.

**BigPush bar tap (after answer):** same decision table. Resolved unverified opens the 미등록 안심팝업 (not fullscreen).

### 3b. Outgoing (manual expand only)

| Event | UI |
|-------|-----|
| Peer answers / `ACTION_CONNECTED` / card arrives | Mark `remoteConnected` — **keep `OUTGOING_LOGO`**. Do **not** auto-open popup/showcase |
| User taps center VLUÉ logo (after answer) | Same decision table as §3a (blink anim on web → expand) |
| Confirm on popup / 전화화면 보기 | `MINI_CASE` (same as incoming) |
| Mini tap restore | Showcase / popup again (same as incoming) |

`CallUiPhasePolicy.mayAutoExpandAfterAnswer(outgoing, expandRequestedByUser)` must be false for outgoing until the user taps.

**v2 one-touch:** the tap itself is the unlock. `CallUiPhasePolicy.mayAdvancePastBigPush(..., userTapRequested = true)` passes even while still dialing, and popup gating treats `remoteConnected || outgoingExpandRequestedByUser` as "answered". The tap never sets `remoteConnected` by itself.

**Label / connected signal (outgoing):**
- Default dialer (InCallService bound): `STATE_ACTIVE` → `notifyConnected` immediately (no 350ms probe wait) → web `outgoing_connected` → label flips.
- Not default dialer: telephony gives no ACTIVE. After `NON_DIALER_LABEL_FALLBACK_MS` (4s) of OFFHOOK the label (only) flips via `outgoing_connected`; `remoteConnected` stays false.
- Web must replay a queued `outgoing_connected` when its listener registers (page load race was the stuck-"연결 중" root cause).

---

## 4. Layout rules

- BigPush window `y >= statusBarHeightPx + 8dp` (never under system status bar)
- Overlay WebView must inject `--vlue-status-inset: {statusBarHeightPx}px` so Showcase live-bar / DCC chrome sit below the system status bar (`FLAG_LAYOUT_IN_SCREEN` is edge-to-edge; `env(safe-area-inset-top)` is often 0)
- MiniCase window `y >= statusBarHeightPx + 8dp`, size = bar only (never `MATCH_PARENT`); `FLAG_NOT_FOCUSABLE | FLAG_NOT_TOUCH_MODAL` so touches outside the bar pass through to the system phone UI
- MiniCase must expose an explicit control to restore `FULL_SHOWCASE` (tap-only is not enough)
- Center popups are separate overlay windows; attach popup **before** tearing down BigPush chrome when possible
- Once a center popup attaches, BigPush chrome must be soft-hidden; popup and BigPush must never remain visibly stacked
- Mini tap restores the session’s prior destination: Showcase sessions → `FULL_SHOWCASE`, popup-only sessions → the same center popup
- Safe Care / auth-only: **never** leave a blank dark `FULLSCREEN` Showcase
- **Path abnormal:** never `FULL_SHOWCASE` — center 안심 팝업 only (even if peer has DCC/showcase)
- Web host must not `setExpanded(true)` or `notifyVlueAuthMemberReady` for `contact_safe_care`
- **Hard gate:** `commitFullscreenLayout` / `enterShowcaseLayout` / `restoreShowcase` require `hasBroadcastShowcaseContent` **or** (resolved unverified **and** the user pressed the 미등록 popup report button — `unregisteredReportRequested`), and must fail when path is abnormal — otherwise `refuseEmptyFullscreen` → popup or compact BigPush (releases touch blockade)
- Web: connected + no expand content → `lettering-overlay-host--bar-only` (transparent host, not `#070b14` full bleed) — **exception:** resolved unverified may expand to 미인증 panel
- Native unmatched after API confirm: inject `profileKind=unverified` (do not leave `lookup_pending` forever)

---

## 5. Single entry points (native)

| Intent | Function |
|--------|----------|
| Answer / peer connected | `CallOverlayService.enterShowcaseFromAnswer` → consult `CallUiPhasePolicy` |
| Center popup only | `presentCenterSafePopup` (gated: no dialing) |
| Confirm on popup | `enterMiniCaseAfterAuthPopupConfirm` |
| End call | `dismissOverlay` |

Do not add parallel “open showcase” / “open popup” helpers that skip this table.

### 5a. Overlay bundle (server-independent)

- The overlay WebView does **not** depend on `https://www.vlue.kr/app`. `VlueLetteringConfig.overlayUrl` points to
  `https://<web>/vlue-overlay/overlay.html#lettering-overlay?...`; `OverlayAssetServer` (WebViewClient
  `shouldInterceptRequest`) serves it from `assets/vlue-overlay/` — origin is kept so localStorage / API CORS match the main app.
- Server outage (404/5xx/offline) cannot blank the overlay; the server only supplies async JSON (lookup / showcase data).
- If `assets/vlue-overlay/overlay.html` is missing from the APK, the URL falls back to remote `/app` (legacy path).
- **After ANY change under `web/src` that affects the overlay** (`LetteringOverlayHost`, `OutgoingCallLogo`, styles, lib/*):
  run `npm run build:overlay --workspace @vlue/web` and commit `apps/android/app/src/main/assets/vlue-overlay/`, then rebuild the APK.

---

## 6. Regression checklist (manual)

- [x] Outgoing: dialing → center VLUÉ logo (no peer BigPush); answer → logo stays; tap logo → Safe Care / auth popup / showcase; Confirm → Mini — **PASS 2026-09-14**
- [x] Incoming never shows outgoing center logo — **PASS**
- [ ] Outgoing still “거는 중”: no center popup (auth/safe-care); logo tap ignored until answer
- [ ] Outgoing unknown: logo until user tap after answer → 미인증 fullscreen report panel (no auto on answer)
- [ ] Incoming: BigPush → answer → immediate showcase/popup → Confirm → Mini (unchanged)
- [ ] Answered pending lookup (incoming): BigPush remains until resolve — no blank dark case
- [ ] BigPush not covered by status bar clock/battery
- [ ] Auth member explicit broadcast OFF: center auth popup, not empty Showcase
- [ ] Auth member DCC exists (even if `includeDigitalCard` key missing): full Showcase / call-history 케이스함
- [ ] Auth member broadcast ON + content: full Showcase
- [ ] In-call Showcase / MiniCase not covered by Android status bar
- [ ] MiniCase: phone app under the bar is tappable; bar has 쇼케이스 보기
- [ ] Path abnormal + member showcase: 안심 팝업 only (no FULL_SHOWCASE)
- [ ] Call history row「안심 저장」→ next call uses local PublicDirectory/CardLookup cache (ENABLE_DIRECTORY_SYNC remains false)

---

## 7. Change protocol

1. Update this matrix  
2. Update `CallUiPhasePolicy` + unit tests (red → green)  
3. Touch Service / web host last  
4. Unrelated features (DCC account, withdraw, seals): **do not** edit overlay state machines
