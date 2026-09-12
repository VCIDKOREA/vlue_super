# VLUE Call Overlay Contract (Freeze)

**Status:** FROZEN — behavior changes require matrix + tests first.  
**Owner path:** `kr.vlue.calloverlay` + `web/src/components/LetteringOverlayHost.jsx`  
**Executable lock:** `CallUiPhasePolicy`

이 문서는 BigPush / Showcase / 중앙 팝업의 **유일한 UX 규격**이다.  
코드에 예외를 먼저 넣지 말고, 여기 표를 고친 뒤 Policy·테스트를 맞춘다.

---

## 1. Phases

| Phase | Meaning |
|-------|---------|
| `BIG_PUSH` | Compact top bar only (ringing or dialing) |
| `CENTER_SAFE_POPUP` | 경로 검증 · 안심케어 (비회원 주소록) |
| `CENTER_AUTH_POPUP` | 경로 검증 · 인증 회원 (송출 OFF / DCC 없음) |
| `FULL_SHOWCASE` | Fullscreen peer showcase (실콘텐츠 + 송출 ON) |
| `MINI_CASE` | After popup Confirm (or user minimize) |
| `KEEP_BIG_PUSH` | Answered but no safe content path — stay on bar, **no empty fullscreen** |

---

## 2. Dialing / ringing (before answer)

| Event | UI |
|-------|-----|
| Incoming ringing | `BIG_PUSH` only |
| Outgoing dialing / connecting | `BIG_PUSH` only |
| Audio `MODE_IN_CALL` while still dialing | **Ignore** — must not open popup/showcase |
| BigPush bar tap while outgoing unanswered | **Ignore** (hold bar) |
| Card lookup / Safe Care payload arrives while unanswered | Paint BigPush bar only — **no center popup** |

`remoteConnected` may become true **only** after a real answer path (`enterShowcaseFromAnswer` / InCall `STATE_ACTIVE` after dialing/connecting). Audio `MODE_IN_CALL` alone must **never** open popup/showcase (OEM false positive while still ringing).

---

## 3. After answer (`remoteConnected == true`)

Decision order (first match wins):

1. User already Mini / auth confirmed → stay `MINI_CASE` (no re-open popup/showcase)
2. `profileKind == contact_safe_care` → `CENTER_SAFE_POPUP`
3. Auth-member-only (verified + no public DCC/showcase) → `CENTER_AUTH_POPUP`
4. Broadcast ON **and** real DCC/showcase content → `FULL_SHOWCASE`
5. Resolved unverified (lookup done, `matched:false`, not pending, not safe-care, no device-contact promote) → `FULL_SHOWCASE` (**미인증 신고 패널**)
6. Else (pending lookup / blank) → `KEEP_BIG_PUSH`

Contact promote: if lookup pending/blank **and** device contact name exists → treat as Safe Care (`CENTER_SAFE_POPUP`).

**BigPush bar tap (after answer):** same decision table. Resolved unverified must open 미인증 fullscreen (not `BIG_PUSH_TAP_KEEP`).  
**BigPush bar tap while outgoing dialing:** still Ignore for popup/auth — **except** resolved unverified may open 미인증 report fullscreen (useful while waiting for answer).

---

## 4. Layout rules

- BigPush window `y >= statusBarHeightPx + 8dp` (never under system status bar)
- Center popups are separate overlay windows; attach popup **before** tearing down BigPush chrome when possible
- Safe Care / auth-only: **never** leave a blank dark `FULLSCREEN` Showcase
- Web host must not `setExpanded(true)` or `notifyVlueAuthMemberReady` for `contact_safe_care`
- **Hard gate:** `commitFullscreenLayout` / `enterShowcaseLayout` / `restoreShowcase` require `hasBroadcastShowcaseContent` **or** resolved unverified (`isUnverifiedResolved`) — otherwise `refuseEmptyFullscreen` → popup or compact BigPush (releases touch blockade)
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

---

## 6. Regression checklist (manual)

- [ ] Outgoing to address-book non-member: dialing → BigPush only; answer → Safe Care popup; Confirm → Mini
- [ ] Outgoing still “거는 중”: no center popup (auth/safe-care)
- [ ] Outgoing unknown (not in contacts): lookup done → 미인증 BigPush; tap or answer → 미인증 fullscreen report panel
- [ ] Answered pending lookup: BigPush remains until resolve — no blank dark case
- [ ] BigPush not covered by status bar clock/battery
- [ ] Auth member broadcast OFF: center auth popup, not empty Showcase
- [ ] Auth member broadcast ON + content: full Showcase

---

## 7. Change protocol

1. Update this matrix  
2. Update `CallUiPhasePolicy` + unit tests (red → green)  
3. Touch Service / web host last  
4. Unrelated features (DCC account, withdraw, seals): **do not** edit overlay state machines
