# VLUE V1 MVP 최종 QA 체크리스트

> 출시 전 직접 검증용. 체크박스를 탭하여 완료 표시하세요.  
> **기능 추가 금지** — 버그·카피·빌드·결제·배포만 허용.  
> 테스트 계정: **무료** 일반 / **유료(Premium)** / **B2B** `test_b2b` (`010-9000-0003`)

**V1 출시 범위:** 기관 검색 · 블루 쇼케이스(소셜 오버레이 1~6 포함) · 디지털 인증명함 · 가족보호 · 개인케이스 · 요금제 · 앱 다운로드 · 고객지원

**비앱 사용자 쇼케이스 전달:** 카카오 **알림톡은 V1 미사용**. 통화 중 **앱 미사용자**에게는 이미 구현된 **카카오 Share API(쇼케이스 초대 공유)** 로 전달한다. (`shareShowcaseInviteKakao.js` · `InCallKakaoShareSlot`)

---

## 출시 일정 (2주)

> 신규 기능 개발 없음. 아래 순서로 **검증·배포·스토어 제출**만 진행.

### 이번 주 — 인프라 · 결제 · Android 실기기

| 우선 | 작업 | 체크리스트 |
|------|------|------------|
| P0 | Railway **API·www** 배포 안정화, 빌드·헬스 스모크 | §12-A |
| P0 | DB migration `showcase_search_privacy_guards` **deploy** | §12-A |
| P0 | **포트원 테스트** 결제 1회(또는 `VITE_PORTONE_TEST_MODE`) + Premium 즉시 반영 | §4-B |
| P0 | **Android 릴리즈** 빌드 → 통화 오버레이 · `ROLE_DIALER` · 근접 센서 | §6 · §12-B |
| P1 | www 결제 미지원 카피·CTA → 앱 다운로드 | §4-A |
| P1 | 요금·카피 UI (9,900 / 취소선 / 가족보호 / B2B·SOHO) | §4-C |

### 다음 주 — 종합 QA · 스토어 심사 제출

| 우선 | 작업 | 체크리스트 |
|------|------|------------|
| P0 | **종합 QA** — 게이트·해시태그·BGM·소셜오버레이·통화목록·개인케이스·V2 숨김 | §1–§5 · §7–§13 |
| P0 | **Play Store** (필수) / **App Store** (가능 시) 심사 제출 | §12-C |
| P1 | iOS CallKit 오버레이 스모크 (PSTN 정책 한계 문서화) | §12-B |
| P1 | 가족보호 E2E (본인 + 가족 등록) | §4-C (가족보호 혜택 노출 후 실사용) |
| P1 | 카톡 Share — 앱 미사용자 통화 시 공유 시트·토스트 회귀 | §8 |

---

## 1. 회원 등급 · 프리미엄 게이트

- [ ] **무료 계정** 로그인 → 블루 쇼케이스 설정 → **비즈니스** 탭 클릭 시 `ShowcasePremiumGateModal` 유료 유도 팝업 노출
- [ ] 무료 계정에서 **소셜 링크·메뉴·해시태그** 입력 시도 시 프리미엄 게이트 차단
- [ ] **유료(Premium) 계정** 로그인 → 비즈니스 탭에서 인스타/유튜브 링크·메뉴 등록·미리보기 정상
- [ ] 무료 ↔ 유료 전환 후 게이트·송출 범위가 즉시 반영되는지 확인

---

## 2. V1 해시태그 (유료 전용)

- [ ] **유료 계정**에서 `#소금빵 #대구소금빵` 입력 → 저장 유지 + 서버 `PUT /api/lettering/showcase/tags` 동기화
- [ ] **무료 계정**에서 해시태그 입력 시도 → 프리미엄 게이트 차단
- [ ] 홈 검색에 `#소금빵` 입력 → 해시태그 매칭 업체·쇼케이스 결과 노출 (상호주의·프라이버시·429 — `docs/v1_showcase_search_security.md`)

---

## 3. BGM 하이브리드 시스템 (RF 큐레이션 + YouTube)

- [ ] 쇼케이스 설정 → **음악** 탭: **커스텀 BGM 업로드 버튼 없음**
- [ ] **RF 큐레이션 프리셋** 테마 필터 선택 → 미리보기에서 재생
- [ ] YouTube URL/키워드 지정 → videoId·제목 저장
- [ ] 프리셋(RF) ↔ YouTube 전환 시 이전 소스 정상 교체

---

## 4. 결제·멤버십 실연동 확인

### 4-A. www (웹) — V1 결제 미지원

- [ ] 인증신청(`#pricing`) 상단에 **「가입과 결제는 VLUE 앱을 다운로드하여 진행해 주세요」** 카피 노출
- [ ] 요금제 CTA가 웹 결제/로그인 유도가 아니라 **앱 다운로드(`#download`)** 로 이동
- [ ] www 온보딩 완료 후 **`PostSignupPaymentModal`(포트원)이 뜨지 않음** — 앱 다운로드 안내만
- [ ] `v1WebShell.webSubscribePayment === false` (웹 구독 결제 V2로 이관)

### 4-B. 앱 — 포트원 테스트 키 가상 결제 1회 (Railway) 【이번 주 P0】

환경: Railway에 등록된 **테스트** 키  
- Web: `VITE_PORTONE_USER_CODE` (및 관련 `VITE_PORTONE_*`)  
- API: `PORTONE_API_KEY` / `PORTONE_API_SECRET` (테스트)

점검 흐름 (`PostSignupPaymentModal` → `requestIamportBillingPay` → `POST /api/payment/subscribe/complete`):

- [ ] **앱 셸**에서 유료 등급으로 신규 가입(또는 가입 직후 결제 대기 상태) → `PostSignupPaymentModal` 노출
- [ ] 포트원 테스트 결제창이 에러 없이 열리고, 테스트 카드/가상결제로 **1회 승인** 완료
- [ ] 클라이언트 로그/네트워크에 `POST /api/payment/subscribe/complete` **200**
- [ ] 결제 완료 직후 계정 티어가 **Premium(유료)** 로 즉시 반영
- [ ] 결제 완료 후 **디지털 인증명함·풀 쇼케이스·가족보호** 기능이 즉시 활성화
- [ ] (참고) 로컬 `import.meta.env.DEV` 의 **개발 전용 결제 우회**는 실연동 검증으로 인정하지 않음 — Railway/빌드 앱 + 테스트 키로만 확인
- [ ] 결제 실패·취소 시 티어가 유료로 올라가지 않는지 확인

### 4-C. 요금·카피 UI

최신 V1 요금·표시 기준 (`membershipBm.js` · `MembershipUpgradeModal` · 인증신청 페이지):

- [ ] **프리미엄 유료** 결제/업그레이드 화면에서 정가 **28,300원**이 **취소선(`line-through`)** 처리되는지 확인
- [ ] 동일 화면에 **65% 특별 할인** 안내와 판매가 **월 9,900원**이 명확히 표기되는지 확인
- [ ] 연간 구독 안내: **연 99,000원 · 2개월 추가 무료** 문구 노출
- [ ] 프리미엄 혜택 **최상단(또는 유료 옵션 직하)**에  
  **「가족보호 시스템(본인 + 가족 최대 3명 등록 가능, 2계정 시 최대 8인)」** 이 직관적으로 노출되는지 확인  
  (코드 상수: `FAMILY_PROTECTION_SUMMARY` / `FAMILY_PROTECTION_SUMMARY_SHORT`)
- [ ] B2B: 대표 28,300원 + 직원 정가 취소선 → 이벤트 **5,200원** 표시·결제 경로 확인
- [ ] SOHO 영업 송출 옵션 **+4,200원(할인 미적용)** 별도 SKU 안내 확인
- [ ] **추천인 리워드/할인 UI 없음** (V1 미운영)

---

## 5. 통화 중 / 종료 후 BGM UX

- [ ] **「통화 중 (BGM OFF)」** 토글 → 비주얼 재생, **오디오 완전 무음**
- [ ] 통화 중 **현재 설정된 BGM** Marquee 자막 흐름
- [ ] **「종료 후 재생」** → RF/YouTube **음소거 해제·자동 재생**
- [ ] 통화 목록에서 쇼케이스 재진입 시 터치 unlock 후 BGM 재생
- [ ] YouTube: `youtube-nocookie.com`, 통화 중 `mute=1`

---

## 6. 근접 센서 (실기기 Android) 【이번 주 P0】

- [ ] 통화 중 쇼케이스에서 **귀에 대면** 화면 sleep/잠금 오버레이
- [ ] **떼면 즉시** 쇼케이스 복구
- [ ] `ShowcaseProximitySensor.kt` ↔ `VlueShowcaseBridge` 연동

---

## 7. 인스타 감성 · 사진 꾸미기

- [ ] **사진** 탭 → 갤러리 멀티 선택 **최대 10장**
- [ ] 사진별 무료 폰트·텍스트·이모지 스티커 배치·미리보기
- [ ] 미리보기 슬라이더 자동 재생
- [ ] 소개글 이모지 입력·저장·재표시

---

## 8. 쇼케이스 설정 UI · 카톡 Share (앱 미사용자)

- [ ] 상단 **스타일 | 사진 | 음악 | 비즈니스** 탭 네비
- [ ] 카카오/인스타 프로필 URL 연결
- [ ] 설정 변경 시 미리보기 즉시 반영
- [ ] 통화 중 **VLUE 앱 미사용자**(`callPeerMatrix`) → **카톡 공유** 슬롯 노출
- [ ] 카톡 Share 시트(`Kakao.Share.sendDefault`) 정상 오픈 · 공유 후 쇼케이스 오버레이 유지
- [ ] 공유 카드에 쇼케이스 초대 문구·링크 포함 (`shareShowcaseInviteKakao.js`)

---

## 9. V1 숨김 · V2 스크리닝

`web/src/lib/v1ReleaseScope.js` 기준 — **노출되면 출시 차단**:

- [ ] PC Windows/macOS 다운로드 UI 숨김 (`pcInstaller: false`)
- [ ] AI엑셀에디터 메뉴·라우트 숨김 (`aiExcel: false`)
- [ ] 채팅·블루AI(브이밍)·쇼핑카트·마이페이지 상점 숨김
- [ ] VLUE 스토어·입점·미디어커머스·장바구니 미노출
- [ ] 추천 프로그램·VLUER 파트너 숨김 (`referralProgram: false`)
- [ ] 홈 레거시 피드·핫플레이스 숨김 (`homeLegacyFeed: false`)
- [ ] www 네비/푸터/챗봇/고객지원에 **스토어·입점·엑셀·메일·채용** 문구 없음
- [ ] 서비스소개에 **미디어커머스·블루AI·리모컨** 등 V2 기능 카드 없음
- [ ] 앱 통합검색 바로가기에 **블루AI·스토어/입점** 미노출

---

## 10. 통화 목록 · 친구 쇼케이스 (V1 핵심)

- [ ] 하단 바 **통화 목록** → 쇼케이스 리플레이 (무료/유료)
- [ ] 유료 통화만 보안 쉴드 마크 표시 (무료/유료 텍스트 라벨 없음)
- [ ] 홈 **친구 쇼케이스** 세로 스크롤 + 검색
- [ ] 알림은 **하단 바 아이콘** 전체화면 (`notificationBottomNavOnly: true`)

---

## 11. 개인케이스 (웹 = 앱)

- [ ] 웹·앱 라벨 **「개인케이스」** (개인자료실·이력서 다운로드 없음)
- [ ] 탭 동일: **명함저장 / 저장된케이스 / 내문서**
- [ ] 명함저장 행 — 홈 **쇼케이스 미리보기** 글래스 스타일 · 펼침 시 저장/삭제만 (캐러셀 본문 없음)
- [ ] 빈 상태 문구·저장된 쇼케이스 스크랩 동작이 앱과 동일 계열인지 확인

---

## 12. 빌드 · 스모크 · 스토어

### 12-A. 인프라 【이번 주】

- [x] `cd web && npm run build` 성공
- [x] `cd apps/api && npm run build` 성공
- [x] Railway API·www 배포 후 `/api/health` · www 홈 스모크
- [x] DB: `showcase_reactions` · `showcase_comments` 테이블 존재 + 검색 프라이버시 컬럼 (`has_active_showcase` 등)

### 12-B. Android · iOS 실기기 【이번 주 Android / 다음 주 iOS】

- [ ] Android 릴리즈 빌드 → 통화 오버레이 + InCall 키패드 + **기본 전화앱(`ROLE_DIALER`)** DTMF·종료
- [ ] Android 근접 센서 스모크 (§6)
- [ ] iOS: CallKit 전면 오버레이 · 스와이프 업/다운 (`LetteringCallKitOverlay.swift`) — PSTN 한계 문서 준수

### 12-C. 스토어 【다음 주】

- [ ] Google Play 내부/공개 트랙 — 릴리즈 APK/AAB 업로드 · 스토어 등록정보·스크린샷
- [ ] (선택) App Store Connect 빌드 업로드 · 심사 제출

---

## 13. 쇼케이스 소셜 오버레이 (V1 필수) 【종합 QA】

스펙: `docs/v1_showcase_social_overlay.md` · `v1AppShell.showcaseSocialOverlay`

- [ ] **홈/설정 미리보기** — 유료 배너 슬라이드에 우레일(좋아요·댓글·공유·⋯) + 좌하단 로고/아바타 + 상태·한줄설명 노출
- [ ] **실통화 중** — 소셜 레일 **비노출** (키패드·음소거·스피커·종료만)
- [ ] **통화 목록 다시보기** — 레일 재노출 · 좋아요 토글·카운트 API 반영
- [ ] **댓글** — 바텀시트 열림 · 목록·입력·전송 (로그인 시 서버 저장)
- [ ] **공유** — 카톡 Share / 초대 시트 (`shareShowcaseInviteKakao.js`)
- [ ] **더보기** — 개인케이스 저장 · 신고 · BGM 음소거
- [ ] **디지털 인증명함 슬라이드** — 레일 없음 (명함 UX 유지)
- [ ] 캡션 우선순위: 사진 오버레이문 → 소개 한 줄 → 상태메시지 → 회사소개

---

## 빠른 테스트 시나리오 (15분)

1. 무료 → 비즈니스 탭 게이트 확인  
2. **앱** 유료 가입 → `PostSignupPaymentModal` 포트원 **테스트** 결제 1회 → complete API 200 → Premium 즉시 반영  
3. www: 요금제 CTA → 다운로드 / **웹 결제 모달 없음**  
4. 쇼케이스 설정 → 사진·BGM 미리보기 · **배너 소셜 오버레이(좋아요·댓글·로고·상태)**  
5. 통화 목록에서 쇼케이스 다시보기 · 앱 미사용자 통화 시 **카톡 Share** 슬롯  
6. www: PC다운로드·스토어·미디어커머스·블루AI **없음** / 개인케이스 3탭 확인  

---

## 관련 파일

| 영역 | 경로 |
|------|------|
| V1 플래그 | `web/src/lib/v1ReleaseScope.js` (`webSubscribePayment: false`, `showcaseSocialOverlay: true`) |
| 요금·할인 | `web/src/lib/membershipBm.js`, `web/src/lib/membershipBenefits.js` |
| 앱 가입 후 결제 | `web/src/components/PostSignupPaymentModal.jsx`, `web/src/lib/iamportClient.js` |
| 결제 complete API | `apps/api` `POST /api/payment/subscribe/complete` |
| 웹 요금제(안내만) | `web/src/site/bolt/pages/PricingPage.tsx` |
| 웹 가입(결제 게이트) | `web/src/site/bolt/components/AuthModal.tsx` |
| 멤버십 업그레이드 UI | `web/src/components/MembershipUpgradeModal.jsx` |
| 쇼케이스 설정 | `web/src/components/showcase/ShowcaseStyleSettingsPanel.jsx` |
| 쇼케이스 소셜 오버레이 | `web/src/components/showcase/ShowcaseBannerSocialLayer.jsx`, `docs/v1_showcase_social_overlay.md` |
| 카톡 Share (앱 미사용자) | `web/src/lib/call/shareShowcaseInviteKakao.js`, `web/src/components/call/InCallKakaoShareSlot.jsx` |
| 통화 상대 매트릭스 | `web/src/lib/call/callPeerMatrix.js` |
| 검색 보안 | `docs/v1_showcase_search_security.md`, `apps/api/src/middleware/SearchAuthInterceptor.ts` |
| 개인케이스(웹) | `web/src/site/bolt/pages/ResourcesPage.tsx` |
| 개인케이스(앱) | `web/src/components/WalletHubModal.jsx` |

---

*마지막 업데이트: V1 — 쇼케이스 소셜 오버레이(1~6) 출시 범위 포함 · 알림톡 제외 · 카톡 Share · 2주 일정*
