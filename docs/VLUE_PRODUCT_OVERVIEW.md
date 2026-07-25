# VLUE Product Overview

> **작성 기준:** 코드·플래그·QA 문서에 **실제로 존재하는** 구현만 기술한다.  
> **출처:** `web/src/lib/v1ReleaseScope.js`, `membershipBm.js`, `membershipBenefits.js`, `docs/v1_mvp_final_qa_checklist.md`, `archive-v2/README.md` 및 관련 컴포넌트.  
> **상태 표기:** `[완료]` `[부분 구현]` `[출시 전 필수]` `[V2]` `[미구현]`

---

## 1. VLUE 서비스 한 줄 정의

**상태: [완료]** (제품 정의 기준 · 구현 범위는 아래 절 참고)

VLUE는 **일반 전화(PSTN) 통화 중에** 상대/본인에게 **블루 쇼케이스·디지털 인증명함**을 보여주고, **PASS 본인인증·기관/번호 검색**으로 신원·연락처를 확인하게 하는 모바일 앱(및 검색·안내용 웹)이다.

- 앱: 통화 오버레이·쇼케이스 송출·가입·결제  
- 웹(www): 기관·번호 검색, 요금·다운로드·고객지원·가족보호·개인케이스 안내/이용 (V1에서 **웹 구독 결제 비활성**)

---

## 2. 핵심 사용자 유형

| 유형 | 코드상 구분 | 상태 |
|------|-------------|------|
| 일반(무료) 회원 | `membershipTier` ≈ `free` | `[완료]` |
| 유료(Premium) 회원 | `paid` / `standard` / `premium` | `[완료]` (결제 실연동은 `[출시 전 필수]`) |
| B2B(기업) 회원 | `b2b` — 대표·직원 회선 | `[완료]` (요금·혜택 상수·게이트) |
| 가족보호 대상 | 유료 계정의 등록 가족(멤버십 종류 아님) | `[부분 구현]` (UI·API 존재, E2E QA 미체크) |
| SOHO 추가번호 송출 | 옵션 SKU `+4,200원/월` | `[부분 구현]` (요금·카피 상수 존재) |
| 플랫폼 CEO 시드 | 서버 시드 유료 강제(판매 티어 아님) | `[완료]` (운영/시드용) |

근거: `web/src/lib/membershipBm.js`, `membershipBenefits.js`, `letteringMembership.js`.

---

## 3. 사용자가 겪는 문제

코드·카피·QA 범위에서 다루는 **문제 영역** (마케팅 슬로건이 아닌 제품 초점):

1. **모르는·의심되는 번호**로 걸려 올 때 상대 신원·소속을 바로 알기 어렵다.  
2. **아는 번호라도** 사칭·오인 위험이 있어, 통화 중 신뢰할 수 있는 **인증·프로필 제시**가 필요하다.  
3. 사업자·개인이 **전화로 자신을 소개**할 때, 명함·포트폴리오·연락처를 한 화면에 보여 주기 어렵다.  
4. 가족 구성원의 **위험 통화·링크**를 보호자가 알리기 어렵다.

(슬로건 참고·제품 카피: archive-v2 README — 「모르는 번호에 속지 마라, 아는 번호라도 확인하라」)

---

## 4. VLUE가 해결하는 방식

| 방식 | 구현 | 상태 |
|------|------|------|
| 통화 연결 시 오버레이로 쇼케이스/명함 표시 | `LetteringOverlayHost` → `LetteringIncomingNotification` | `[완료]` (아키텍처) / 실기기 검증 `[출시 전 필수]` |
| PASS·PortOne 본인인증으로 계정·번호 바인딩 | `iamportClient.js`, API identity | `[완료]` |
| 기관명·전화번호·사업자번호 검색 | 웹 검색 허브·앱 홈 검색 | `[완료]` |
| 유료 디지털 인증명함 + 풀 쇼케이스 | 게이트·캐러셀·스타일 설정 | `[완료]` |
| 앱 미사용자에게 카톡 Share로 쇼케이스 초대 | `shareShowcaseInviteKakao.js` (알림톡은 V1 미사용) | `[완료]` |
| 유료 가족보호 등록·알림 | 가족보호 페이지·API | `[부분 구현]` |

---

## 5. 핵심 사용자 흐름

### 5-1. 가입 · 본인인증 · (앱) 결제

1. 앱 설치 → 로그인/가입 (게스트 둘러보기 **없음**, `guestBrowse: false`)  
2. PASS 본인인증 → CI·전화번호 저장  
3. 유료/B2B 선택 시 `PostSignupPaymentModal` → PortOne 빌링 → `POST /api/payment/subscribe/complete`  
4. www에서는 가입·결제 유도 시 **앱 다운로드**로 안내 (`webSubscribePayment: false`)

| 단계 | 상태 |
|------|------|
| 본인인증 플로우 | `[완료]` |
| 앱 구독 결제 코드 경로 | `[완료]` |
| PortOne **테스트** 결제 1회 → Premium 즉시 반영 검증 | `[출시 전 필수]` |
| 웹 구독 결제 | `[V2]` |

### 5-2. 쇼케이스 설정 · 홈 미리보기

1. 홈 빅푸시/설정에서 스타일·사진·BGM·비즈니스 링크 편집  
2. 「통화화면 보기」로 하단 통화 옵션이 있는 화면 확인 (본인만)  
3. 켜짐/꺼짐에 따라 송출 범위 변경

| 단계 | 상태 |
|------|------|
| 스타일 설정·미리보기 | `[완료]` |
| 통화화면 미리보기(본인) | `[완료]` |

### 5-3. 실통화

1. Android: VLUE를 기본 전화 앱(`ROLE_DIALER`)으로 지정 가능 → InCall UI에서 쇼케이스 + 키패드·음소거·스피커·종료  
2. iOS: 기본 전화 앱 교체 불가 → CallKit/오버레이·스와이프 전략 (`docs/v1_incall_android_ios.md`)  
3. 상대가 앱 미가입·주소록 조건이면 카톡 Share 슬롯

| 단계 | 상태 |
|------|------|
| 오버레이·InCall 바 코드 | `[완료]` |
| Android 릴리즈·다이얼러·근접센서 실기기 | `[출시 전 필수]` |
| iOS CallKit 스모크 | `[출시 전 필수]` (Play 대비 선택·P1) |

### 5-4. 검색 · 개인케이스 · 가족보호

| 흐름 | 상태 |
|------|------|
| 번호·기관 검색 | `[완료]` |
| 개인케이스 3탭 (명함저장·저장된케이스·내문서) | `[완료]` |
| 가족보호 등록·설정 UI/API | `[부분 구현]` / E2E `[출시 전 필수]` |

---

## 6. 디지털 인증명함 기능

**주요 코드:** `LetteringDigitalReception.jsx`, 명함 설정·스토리지, 유료 게이트.

| 항목 | 내용 | 상태 |
|------|------|------|
| 앞면 / 뒷면 | 앞면: 프로필·연락처 / 뒷면: 추가 설명 | `[완료]` |
| 유료·B2B 전용 | 무료는 혜택표상 「—」 | `[완료]` |
| 인증 배지·유효기간 | VLUE 인증 UI, 유효기간 표시 | `[완료]` |
| 회사 로고·워터마크 | 프로필 배지·반투명 워터마크 (CEO는 공식 로고 규칙) | `[완료]` |
| 명함 위 비즈니스 쇼셜 아웃링크 | 인스타·유튜브·페북·카카오 등 | `[완료]` (유료 권한과 연동) |
| 통화·홈 캐러셀 1페이지 | 디지털명함 슬라이드 | `[완료]` |

---

## 7. 쇼케이스 기능

**주요 코드:** `ShowcaseCallCarousel`, `ShowcaseStyleSettingsPanel`, `ShowcaseSlideChrome`, `FriendShowcaseList`, `syncMycaseLiveBroadcast.js`.

| 항목 | 내용 | 상태 |
|------|------|------|
| 페이지 수 | 무료 콘텐츠 1p / 유료 최대 10(명함 포함 시 콘텐츠 9) | `[완료]` |
| 갤러리 사진 | 페이지당 다수 사진(설정·업로드 파이프라인) | `[완료]` |
| 스타일·프라이버시·해시태그 | 유료 해시태그·아웃링크 등 게이트 | `[완료]` |
| 팔로우 | 팔로우 API·버튼·친구 쇼케이스 목록 | `[완료]` |
| 배너 소셜 오버레이 | 좋아요·댓글·공유·더보기 (미리보기·다시보기) / **실통화 중 비노출** | `[완료]` (종합 QA `[출시 전 필수]`) |
| 라이브 송출 동기화 | 마이케이스 → 라이브 스타일 | `[완료]` |
| 홈 빅푸시 켜짐/꺼짐 | 전면 쇼케이스 vs 번호·인증만 | `[완료]` |
| 본인 「통화화면 보기」 | 실통화와 동일한 하단 제어바 미리보기 | `[완료]` |

프리미엄 게이트: `ShowcasePremiumGateModal`, `showcaseStylePermissions.js`  
(`hashtagRegister`, `outlinkButtons`, `menuWrite`, `youtubeBgm` 등 유료).

---

## 8. 통화 인터페이스 기능

**주요 코드:** `LetteringOverlayHost.jsx`, `LetteringIncomingNotification.jsx`, `InCallControlBar.jsx`, `InCallDtmfPad.jsx`, Android `DialerRoleHelper`, iOS `LetteringCallKitOverlay`.

| 항목 | 내용 | 상태 |
|------|------|------|
| 수신/연결 오버레이 | 카드 조회·펼침·캐러셀 | `[완료]` |
| 하단 제어 | 키패드·음소거·스피커·통화종료 | `[완료]` |
| DTMF 키패드 | 명함/캐러셀 영역 오버레이 | `[완료]` |
| Android `ROLE_DIALER` | 기본 전화 앱으로 DTMF·종료 등 | `[부분 구현]` → 릴리즈 검증 `[출시 전 필수]` |
| 근접 센서 | 귀에 대면 화면 처리 (`ShowcaseProximitySensor`) | `[부분 구현]` → 실기기 `[출시 전 필수]` |
| iOS | 기본 앱 교체 불가, CallKit/오버레이 | `[부분 구현]` |
| 통화 목록 다시보기 | 하단 네비 → 리플레이 | `[완료]` |
| 앱 미사용자 카톡 Share | `InCallKakaoShareSlot` | `[완료]` |
| 카카오 알림톡으로 쇼케이스 전달 | QA상 V1 미사용 | `[V2]` / 정책상 제외 |

---

## 9. 일반회원과 유료회원 차이

근거: `MEMBERSHIP_BENEFIT_ROWS`, `getShowcasePermissions`, `tentShowcaseTypes.js`.

| 기능 | 무료 | 유료(Premium) | B2B |
|------|------|---------------|-----|
| 통화·신원 확인 | 제공 | 제공 | 제공 |
| 블루 쇼케이스 | 기본(연락처별·페이지 제한) | 풀(명함+배너) | 풀(회선) |
| 디지털 인증명함 | 없음 | 제공 | CI·대표번호 등 |
| 스타일·해시태그·비즈 아웃링크 | 기본 / 게이트 | 전체 | 전체 |
| 가족보호 | 없음 | 1:3 (1계정 4인, 2계정 8인) | 해당 없음(개인 유료로) |
| 추가번호 송출 | 없음 | 옵션 +4,200원 | 대표 외 추가번호 |
| 요금(V1 이벤트) | 0 | 월 9,900 / 연 99,000 (정가 28,300 취소선) | 대표 28,300 + 직원 이벤트 5,200 |

| 구분 | 상태 |
|------|------|
| 혜택·게이트 코드 | `[완료]` |
| 요금 UI·카피 점검 | `[출시 전 필수]` (QA §4-C) |
| 추천인 할인·리워드 | `[V2]` (`referralProgram: false`) |
| 개인 콤보(회사+개인) | `[V2]` (`PERSONAL_COMBO_PRICING_NOTE`) |

---

## 10. BGM / 사운드 기능

**주요 코드:** `ShowcaseBgmContext.jsx`, `ShowcaseBgmPicker.jsx`, `showcaseBgmPresets.js`, API `/api/showcase-sounds`.

| 항목 | 내용 | 상태 |
|------|------|------|
| 재생 컨텍스트 | preview / call_active(강제 뮤트) / replay 등 | `[완료]` |
| 단일·순서·셔플 재생 | 유료 재생목록 · soundId URL 갱신 | `[완료]` |
| VLUE Signature Sound | 큐레이션 시그니처 선택·장르 검색 | `[완료]` |
| **User Original 음원 업로드·송출** | **유료**: 파일 업로드·권리 동의·등록 후 쇼케이스 BGM (`음원 등록`) | `[완료]` (**V1 포함**) |
| 무료 BGM | Signature 선택 · Shared Track 퍼오기 · **업로드 불가** | `[완료]` |
| 업로드 쿼터 | 유료 일일 등록·보관 한도 UI | `[완료]` |
| 통화 중 무음·종료 후 재생 UX | 코드 경로 존재 | `[부분 구현]` (QA §3·§5 검증 `[출시 전 필수]`) |
| 레거시 YouTube BGM 필드 | 유틸·권한 잔존, 주 UI는 Signature/User Original | `[부분 구현]` |
| 정적 `SHOWCASE_BGM_PRESETS` 배열 | 비어 있음(시그니처는 API/라이브러리 경로) | 참고용 상수 |

---

## 11. 소셜 연동 기능

| 항목 | 내용 | 상태 |
|------|------|------|
| 카카오·네이버·Google 로그인/연동 | 소셜 로그인·계정 연결 패널 | `[완료]` |
| 인스타 쇼케이스 링크 | `instagramLinkApi`·설정 | `[완료]` |
| 비즈 아웃링크 (IG/YT/FB/카카오) | 유료 설정 | `[완료]` |
| 팔로우 그래프 | `/api/follow`, Follow 버튼, 친구 쇼케이스 | `[완료]` |
| 배너 좋아요·댓글·공유 | `ShowcaseBannerSocialLayer` + API | `[완료]` / QA `[출시 전 필수]` |
| 통화 중 카톡 Share (미가입 상대) | Share API | `[완료]` |
| 알림톡 쇼케이스 전달 | V1 미사용 | `[V2]` |

---

## 12. 현재 V1에 실제 포함된 기능

`v1AppShell` / `v1WebShell` **true** 및 QA 출시 범위 기준.

### 앱 (`v1AppShell`)

| 기능 | 플래그/영역 | 상태 |
|------|-------------|------|
| 통화 빅푸시·쇼케이스 설정 | `callBigPush`, `showcaseStyleSettings` | `[완료]` |
| 친구 쇼케이스 피드 | `friendShowcaseFeed` | `[완료]` |
| 통화 목록 | `callShowcaseHistoryNav` | `[완료]` |
| 배너 소셜 오버레이 | `showcaseSocialOverlay` | `[완료]` |
| 인스타 피드/커스텀 프로필 | `instagramFeed`, `customCallProfile` | `[완료]` |
| BGM Signature + **User Original 업로드**(유료) | `ShowcaseBgmPicker` · `/api/showcase-sounds` | `[완료]` |
| 디지털 인증명함 | `digitalBizcard` | `[완료]` |
| 가족보호 | `familyProtection` | `[부분 구현]` |
| 개인케이스·마이케이스 | `personalVault`, `vaultTabsMinimal`, `mycase` | `[완료]` |
| 연락처·알림함 | `contacts`, `notificationInbox` | `[완료]` |
| 번호·업체 검색 | `phoneSearchPortal`, `homeBizSearch` | `[완료]` |
| 명함 스캐너 | `bizcardScanner` | `[완료]` |
| 카카오 알림톡 **트리거 플래그** | `kakaoAlimtalk: true` (쇼케이스 전달 수단으로서의 알림톡은 QA상 미사용) | `[부분 구현]` |

### 웹 (`v1WebShell`)

| 기능 | 상태 |
|------|------|
| 전화·기관 검색 | `[완료]` |
| 웹뷰 프로필·명함 | `[완료]` |
| 계정 설정 | `[완료]` |
| 가족보호 페이지 | `[부분 구현]` |
| 개인케이스(Resources) | `[완료]` |
| 요금제·다운로드·서비스소개·고객지원 | `[완료]` (안내용) |

### V1에서 의도적으로 끈 것 (웹 결제 등)

| 항목 | 상태 |
|------|------|
| www 구독 결제 | `[V2]` (`webSubscribePayment: false`) |

---

## 13. 현재 V2로 숨겨진 기능

`v1ReleaseScope.js` false / excluded + `archive-v2`.

### 앱 셸 false

| 기능 | 플래그 | 상태 |
|------|--------|------|
| 게스트 둘러보기 | `guestBrowse` | `[V2]` |
| 채팅 | `chat` | `[V2]` |
| 메일톡 | `mailTalk` | `[V2]` |
| 블루AI / 브이밍 | `vumingAi` | `[V2]` |
| 쇼핑카트·마이페이지 상점 | `shoppingCart`, `mypageShop` | `[V2]` |
| 지갑 캐시 | `walletCash` | `[V2]` |
| 개인 메일 | `personalMail` | `[V2]` |
| 프린터 리모컨 | `printerRemote` | `[V2]` |
| 스토어 스캐너 | `storeScanner` | `[V2]` |
| 음성·영상 통화(앱 내) | `voiceVideoCall` | `[V2]` |
| VLUE 스토어·경매 | `vlueStore`, `auction` | `[V2]` |
| 홈 레거시 피드(핫플·광고 등) | `homeLegacyFeed` | `[V2]` |
| 추천 프로그램·VLUER 파트너 | `referralProgram`, `vluerPartnerSection` | `[V2]` |

### 웹 셸 false / 제외 뷰

| 기능 | 상태 |
|------|------|
| 스토어·경매·채용·이벤트 | `[V2]` |
| VLUE 이메일 | `[V2]` |
| AI 엑셀 에디터 | `[V2]` |
| PC 설치형 | `[V2]` |
| 마케팅 AI 고객센터 FAB | `[V2]` |
| 웹 구독 결제 | `[V2]` |

### 앱 제외 페이지 예

`list`, `room`, `feed`, `manage`, `blueai`, `subhub`, `mypage`, `memo`, `calendar` → `[V2]`

원본 파일은 메인 트리에 남을 수 있으나 **네비·라우트는 플래그로 비노출**.

---

## 14. 현재 구현되지 않은 기능

코드·문서상 **미구현이거나 설계 단계만**인 것 (V2 숨김과 구분).

| 항목 | 근거 | 상태 |
|------|------|------|
| 오픈뱅킹 기반 가족 자동 알림 등 | `FAMILY_PROTECTION.md` 후속 단계 | `[미구현]` |
| V1 추천인 리워드 실운영 | 상수·플래그로 명시적 미운영 | `[미구현]` (의도적) / 재개 시 `[V2]` |
| iPhone에서 기본 전화 앱 교체 | OS 정책 | `[미구현]` (불가) |
| RF 큐레이션 전용 정적 프리셋 배열 | `SHOWCASE_BGM_PRESETS = []` — V1은 Signature API·User Original 업로드 경로 사용 | 상수 비움(기능 대체됨) |
| 카카오 알림톡으로 쇼케이스 핸드오프 | QA: V1 미사용 | `[미구현]` (V1 범위 외) |

---

## 15. 현재 출시를 막는 잔여 작업

근거: `docs/v1_mvp_final_qa_checklist.md` (체크 미완료 = 잔여). 인프라 빌드·헬스·일부 DB는 문서상 `[x]`.

### P0 — 출시 전 필수

| 작업 | 상태 |
|------|------|
| PortOne **테스트** 결제 1회 → `subscribe/complete` 200 → Premium 즉시 반영 | `[출시 전 필수]` |
| Android 릴리즈 AAB/APK: 통화 오버레이 · `ROLE_DIALER` · DTMF·종료 | `[출시 전 필수]` |
| Android 근접 센서 스모크 | `[출시 전 필수]` |
| 종합 QA (게이트·해시태그·BGM·소셜오버레이·통화목록·개인케이스·V2 숨김) | `[출시 전 필수]` |
| Google Play 스토어 제출(등록정보·스크린샷·AAB) | `[출시 전 필수]` |

### P1 — 권장 / 병행

| 작업 | 상태 |
|------|------|
| www 결제 미지원 카피·CTA → 앱 다운로드 확인 | `[출시 전 필수]` (카피 QA) |
| 요금·가족보호·B2B·SOHO UI 카피 | `[출시 전 필수]` |
| iOS CallKit 스모크 · PSTN 한계 문서화 | `[출시 전 필수]` (스토어 선택 시) |
| 가족보호 E2E | `[출시 전 필수]` |
| 카톡 Share 회귀 | `[출시 전 필수]` |
| App Store 제출 | 선택 (체크리스트: 가능 시) |

### 출시 후·별도

| 작업 | 상태 |
|------|------|
| 포트원 테스트 모드 해제·라이브 키 | 승인 후 운영 작업 |
| `VITE_VLUE_PLAY_STORE_URL` 등 스토어 URL 반영 | 승인 후 |

---

## 부록 A. 상태 범례

| 표기 | 의미 |
|------|------|
| `[완료]` | 코드에 구현되어 V1 플래그로 노출(또는 해당 절의 정의가 확정) |
| `[부분 구현]` | 코드·UI는 있으나 데이터/실기기/E2E가 비어 있거나 QA 미완 |
| `[출시 전 필수]` | 스토어 제출·유료 전환에 막히는 검증·빌드·배포 항목 |
| `[V2]` | `v1ReleaseScope` 등으로 V1에서 숨김·제외 |
| `[미구현]` | 제품에 없거나 OS/정책상 불가, 또는 상수·문서만 존재 |

## 부록 B. 권위 있는 설정 파일

| 파일 | 역할 |
|------|------|
| `web/src/lib/v1ReleaseScope.js` | V1/V2 노출 플래그 |
| `web/src/lib/membershipBm.js` | 요금·이벤트가 |
| `web/src/lib/membershipBenefits.js` | 무료/유료/B2B 혜택 표 |
| `docs/v1_mvp_final_qa_checklist.md` | 출시 QA·잔여 작업 |
| `archive-v2/README.md` | V2 격리 목록 |
| `docs/v1_incall_android_ios.md` | 통화 OS별 동작 |

---

*문서 생성: 코드베이스 실측 기준. 기능 추가 계획·로드맵 약속은 포함하지 않음.*
