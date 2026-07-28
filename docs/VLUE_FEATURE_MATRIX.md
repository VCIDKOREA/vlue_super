# VLUE Feature Matrix

> **작성 기준:** `docs/VLUE_PRODUCT_OVERVIEW.md`와 코드·`v1ReleaseScope.js`·QA를 대조한 **실존 기능만** 행으로 기술.  
> **상태:** `[완료]` `[부분 구현]` `[출시 전 필수]` `[V2]` `[미구현]`  
> **플랫폼:** Web = www + `/app` SPA · Android/iOS = 네이티브 셸 + WebView(해당 시)

---

## 읽는 법

| 열 | 의미 |
|----|------|
| 현재 구현 상태 | 코드 존재·완성도 |
| V1/V2 | `v1ReleaseScope` 노출 여부 |
| 무료/유료 | 게이트·혜택표 기준 (B2B는 유료 계열로 표기할 때 「유료·B2B」) |
| 출시 전 남은 작업 | QA 미체크·실기기 검증 등 |

---

## V1 핵심 기능

### 1. PASS 본인인증 · 계정 바인딩

| 항목 | 내용 |
|------|------|
| 기능명 | PASS·PortOne 휴대폰 본인인증 |
| 사용자 문제 | 전화·명함·검색에 쓸 신원·번호를 신뢰할 수 있게 확인해야 함 |
| 기능 설명 | `IMP.certification`으로 본인확인 후 CI 해시·전화번호를 계정에 저장. 실명 변경 불가 정책 |
| 실제 구현 파일/모듈 | `web/src/lib/iamportClient.js`, `web/src/components/VlueOnboarding.jsx`, API `identityPortone` / `iamportCert` |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | 공통(필수) |
| Android/Web/iOS 지원 상태 | Web·Android·iOS 앱 WebView에서 동일 클라 경로. 네이티브 전용 PASS SDK 아님 |
| 출시 전 남은 작업 | 운영 키·실기기 본인인증 스모크 |
| 기술적 차별점 | 통화 오버레이·쇼케이스 표시 번호와 **동일 본인인증 번호**로 묶음 |

---

### 2. 앱 구독 결제 (PortOne)

| 항목 | 내용 |
|------|------|
| 기능명 | 유료·B2B 구독 결제 (앱) |
| 사용자 문제 | 유료 명함·풀 쇼케이스·가족보호를 쓰려면 결제·티어 반영이 필요 |
| 기능 설명 | 가입 후 `PostSignupPaymentModal` → 빌링 결제 → `POST /api/payment/subscribe/complete`로 Premium 반영 |
| 실제 구현 파일/모듈 | `web/src/components/PostSignupPaymentModal.jsx`, `iamportClient.js`, `apps/api/.../portoneSubscribeComplete.ts`, `payment.ts` |
| 현재 구현 상태 | `[완료]` (코드) / 테스트 결제 검증 `[출시 전 필수]` |
| V1/V2 구분 | **V1** (앱만). www 결제는 **V2** (`webSubscribePayment: false`) |
| 무료/유료 구분 | 유료·B2B 가입 경로 |
| Android/Web/iOS 지원 상태 | **앱 셸** 대상. www는 다운로드 CTA만 |
| 출시 전 남은 작업 | PortOne **테스트** 1회 승인 → complete 200 → 티어 즉시 반영 (QA §4-B) |
| 기술적 차별점 | 웹 결제 분리로 V1 결제 경로를 앱·빌링에 고정 |

---

### 3. 기관·전화번호·사업자 검색

| 항목 | 내용 |
|------|------|
| 기능명 | 전화·기관 검색 포털 |
| 사용자 문제 | 의심 번호·기관명을 즉시 조회하고 싶음 |
| 기능 설명 | 기관명·전화번호·사업자번호 입력 시 공공·VLUE 데이터 대조 검색 (웹 허브·앱 홈 검색) |
| 실제 구현 파일/모듈 | `web/src/site/bolt/pages/SearchPage.tsx`, `HomePage` 검색, `SearchVerifyCrossTabs.tsx`, API 검색·`SearchAuthInterceptor`, `docs/v1_showcase_search_security.md` |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** (`phoneSearchPortal`, `homeBizSearch`) |
| 무료/유료 구분 | 공통 (일부 인증·레이트리밋은 문서 참고) |
| Android/Web/iOS 지원 상태 | **Web** 중심. 앱 홈 검색바도 동일 SPA |
| 출시 전 남은 작업 | 해시태그 검색·프라이버시·429 회귀 (QA §2) |
| 기술적 차별점 | 쇼케이스 해시태그·프라이버시 가드와 연동된 검색 API |

---

### 4. 통화 중 쇼케이스·명함 오버레이

| 항목 | 내용 |
|------|------|
| 기능명 | PSTN 통화 오버레이 (Lettering) |
| 사용자 문제 | 통화 중 상대/본인 신원·프로필을 화면에 보여 주기 어렵다 |
| 기능 설명 | 통화 연결 시 WebView 오버레이로 쇼케이스 캐러셀·디지털명함 표시. 접힘/펼침 |
| 실제 구현 파일/모듈 | `LetteringOverlayHost.jsx`, `LetteringIncomingNotification.jsx`, `ShowcaseCallCarousel.jsx`, Android `CallOverlayService.kt` / `LetteringCallCoordinator.kt`, iOS `LetteringCallKitOverlay.swift` |
| 현재 구현 상태 | `[완료]` (아키텍처) / 실기기 `[출시 전 필수]` |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | 공통 표시. 유료는 풀 페이지·명함 슬라이드 |
| Android/Web/iOS 지원 상태 | **Android** 오버레이·InCall. **iOS** CallKit+전면 WebView. **Web**은 홈 미리보기만 (실 PSTN 없음) |
| 출시 전 남은 작업 | Android 릴리즈 오버레이 스모크 · iOS CallKit 스모크 |
| 기술적 차별점 | 통신사 PSTN을 유지한 채 **앱 UI로 쇼케이스 송출** |

---

### 5. InCall 제어 (키패드·음소거·스피커·종료)

| 항목 | 내용 |
|------|------|
| 기능명 | InCall 제어바 · DTMF |
| 사용자 문제 | 쇼케이스 화면에서도 키패드·음소거·종료가 필요 |
| 기능 설명 | 하단 4버튼 + 캐러셀/명함 위 DTMF 패드. Android는 `ROLE_DIALER`일 때 native Call 제어 |
| 실제 구현 파일/모듈 | `InCallControlBar.jsx`, `InCallDtmfPad.jsx`, `nativeCallControl.js`, Android `VlueInCallService.kt`, `VlueInCallController.kt`, `DialerRoleHelper.kt` |
| 현재 구현 상태 | `[완료]` (UI) / Dialer 실기기 `[부분 구현]`→`[출시 전 필수]` |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | 공통 |
| Android/Web/iOS 지원 상태 | **Android** 풀 제어(다이얼러 역할 필요). **iOS** 스와이프 업으로 순정 UI·데모/브릿지 제한 (`docs/v1_incall_android_ios.md`). Web 미리보기는 `demoMode` |
| 출시 전 남은 작업 | Android 기본 전화앱·DTMF·종료 · iOS 스와이프 회귀 |
| 기술적 차별점 | 쇼케이스와 **동일 화면**에서 InCall + DTMF |

---

### 6. Android 기본 전화 앱 (ROLE_DIALER)

| 항목 | 내용 |
|------|------|
| 기능명 | 기본 전화 앱 역할 |
| 사용자 문제 | 오버레이만으로는 DTMF·통화 종료 등 시스템 Call API가 제한됨 |
| 기능 설명 | 사용자에게 `ROLE_DIALER` 요청. 보유 시 InCallService로 disconnect/DTMF/mute/route |
| 실제 구현 파일/모듈 | `DialerRoleHelper.kt`, `DialerTrampolineActivity.kt`, `VlueInCallService.kt` |
| 현재 구현 상태 | `[부분 구현]` (코드) / 릴리즈 검증 `[출시 전 필수]` |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | 공통 |
| Android/Web/iOS 지원 상태 | **Android만**. iOS·Web 해당 없음 |
| 출시 전 남은 작업 | 릴리즈 빌드 기기에서 역할 지정·제어 스모크 |
| 기술적 차별점 | PSTN 회선은 통신사, **UI·제어는 VLUE**로 분리 가능 |

---

### 7. 근접 센서 (통화 중)

| 항목 | 내용 |
|------|------|
| 기능명 | 쇼케이스 근접 센서 |
| 사용자 문제 | 귀에 대면 화면이 켜져 있으면 오터치·불편 |
| 기능 설명 | 근접 시 sleep/잠금 오버레이, 떼면 쇼케이스 복구 |
| 실제 구현 파일/모듈 | `apps/android/.../showcase/ShowcaseProximitySensor.kt`, WebView 브릿지 |
| 현재 구현 상태 | `[부분 구현]` / 실기기 `[출시 전 필수]` |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | 공통 |
| Android/Web/iOS 지원 상태 | **Android**. iOS·Web 동등 구현 없음(문서상 Android QA) |
| 출시 전 남은 작업 | QA §6 실기기 |
| 기술적 차별점 | 통화 쇼케이스 WebView와 네이티브 센서 연동 |

---

### 8. 디지털 인증명함

| 항목 | 내용 |
|------|------|
| 기능명 | 디지털 인증명함 |
| 사용자 문제 | 통화·공유 시 인증된 연락처·소속을 명함 형태로 보여 주고 함 |
| 기능 설명 | 앞면(프로필·연락처)·뒷면(추가 설명), 인증 배지·유효기간·로고/워터마크. 캐러셀 1페이지 |
| 실제 구현 파일/모듈 | `LetteringDigitalReception.jsx`, `letteringBizcardStorage.js`, 명함 설정 UI |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** (`digitalBizcard`) |
| 무료/유료 구분 | **유료·B2B** (무료 혜택표 「—」) |
| Android/Web/iOS 지원 상태 | 앱 통화/홈·웹 프로필 경로에서 동일 React 컴포넌트 |
| 출시 전 남은 작업 | 유료 전환 직후 명함 활성화 확인 (결제 QA와 연동) |
| 기술적 차별점 | PASS 연동 인증 표시 + 통화 캐러셀 슬라이드 |

---

### 9. 블루 쇼케이스 (페이지·갤러리·스타일)

| 항목 | 내용 |
|------|------|
| 기능명 | 블루 쇼케이스 편집·송출 |
| 사용자 문제 | 전화로 포트폴리오·사진·소개를 보여 주기 어렵다 |
| 기능 설명 | 다페이지 쇼케이스(무료 1 / 유료 ≤5 + DCC), 갤러리·스타일·프라이버시. 홈 빅푸시 켜짐/꺼짐 |
| 실제 구현 파일/모듈 | `ShowcaseStyleSettingsPanel.jsx`, `ShowcaseCallCarousel.jsx`, `CallBigPushPreviewSection.jsx`, `tentShowcaseTypes.js`, `syncMycaseLiveBroadcast.js` |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | 무료 기본 · 유료 풀·게이트 기능 |
| Android/Web/iOS 지원 상태 | 앱 홈/설정/통화. 웹은 프로필·미리보기 일부 |
| 출시 전 남은 작업 | 게이트·사진 꾸미기 종합 QA (§1·§7) |
| 기술적 차별점 | **통화 중 송출**과 동일 데이터 모델을 홈 미리보기에 재사용 |

---

### 10. 본인 통화화면 미리보기

| 항목 | 내용 |
|------|------|
| 기능명 | 「통화화면 보기 / 닫기」 |
| 사용자 문제 | 실제 통화 옵션에 사진이 가리는지 설정만으로는 알기 어렵다 |
| 기능 설명 | 본인 홈 쇼케이스 상단에서 InCall 바와 동일 하단 제어를 미리보기. 닫아도 쇼케이스 창 유지 |
| 실제 구현 파일/모듈 | `LetteringIncomingNotification.jsx` (`inCallChromePreview`), `CallBigPushPreviewSection.jsx`, `InCallControlBar` `demoMode` |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | 본인 미리보기(`showOwnerSettings`) — 상대 열람에 미노출 |
| Android/Web/iOS 지원 상태 | 앱 `/app` 홈 (WebView). 실통화와 별개 미리보기 |
| 출시 전 남은 작업 | 회귀(버튼 위치·닫기 동작) |
| 기술적 차별점 | 실통화와 **같은 제어바 컴포넌트**로 safe-area·가림 확인 |

---

### 11. 프리미엄 게이트 (해시태그·비즈 링크 등)

| 항목 | 내용 |
|------|------|
| 기능명 | 쇼케이스 유료 기능 게이트 |
| 사용자 문제 | 무료/유료 경계가 UI에서 명확해야 함 |
| 기능 설명 | 해시태그·아웃링크·메뉴·위치·쿠폰·파일 업로드 등 `requiresPremium` → `ShowcasePremiumGateModal` |
| 실제 구현 파일/모듈 | `showcaseStylePermissions.js`, `ShowcasePremiumGateModal.jsx`, `ShowcaseStyleSettingsPanel.jsx` |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | 해당 기능 **유료·B2B** |
| Android/Web/iOS 지원 상태 | 앱 설정 UI |
| 출시 전 남은 작업 | 무료→유료 전환 즉시 반영 QA (§1) |
| 기술적 차별점 | 티어별 `getShowcasePermissions` 단일 소스 |

---

### 12. V1 해시태그

| 항목 | 내용 |
|------|------|
| 기능명 | 쇼케이스 해시태그 등록·검색 |
| 사용자 문제 | 상호·업종 키워드로 쇼케이스를 찾고 싶음 |
| 기능 설명 | 유료 태그 저장·`PUT /api/lettering/showcase/tags` · 홈 검색 `#태그` |
| 실제 구현 파일/모듈 | 설정 패널 태그 입력, API lettering tags, 검색 보안 문서 |
| 현재 구현 상태 | `[완료]` (코드) / QA `[출시 전 필수]` |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | **유료** (`hashtagRegister`) |
| Android/Web/iOS 지원 상태 | 앱 설정 + 웹/앱 검색 |
| 출시 전 남은 작업 | QA §2 |
| 기술적 차별점 | 검색 프라이버시·레이트리밋과 결합 |

---

### 13. BGM — VLUE Signature

| 항목 | 내용 |
|------|------|
| 기능명 | VLUE Signature Sound |
| 사용자 문제 | 쇼케이스에 배경음을 넣고 싶음(직접 음원 없을 때) |
| 기능 설명 | Signature 탭에서 큐레이션 음원 선택·장르 검색·미리듣기·쇼케이스 연결 |
| 실제 구현 파일/모듈 | `ShowcaseBgmPicker.jsx`, `ShowcaseBgmContext.jsx`, `/api/showcase-sounds`, `showcaseSoundService.ts` |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | 공통(무료는 변경 주기·1곡 등 쿼터 문구) |
| Android/Web/iOS 지원 상태 | 앱 쇼케이스 재생. Web 미리보기 가능 |
| 출시 전 남은 작업 | 통화 중 뮤트·종료 후 재생 QA (§5) |
| 기술적 차별점 | 통화 phase에 따른 **강제 뮤트** (`call_active`) |

---

### 14. BGM — User Original 업로드·송출

| 항목 | 내용 |
|------|------|
| 기능명 | User Original Sound (커스텀 음원) |
| 사용자 문제 | 본인 제작·권리 보유 음원을 쇼케이스에 쓰고 싶음 |
| 기능 설명 | 유료: 파일 업로드·권리/동의·등록 → Original Track·쇼케이스 BGM. 일일/보관 쿼터. 무료: 업로드 불가·퍼오기만 |
| 실제 구현 파일/모듈 | `ShowcaseBgmPicker.jsx` (`UserSoundRegisterSheet`, `uploadShowcaseSoundFile`), `apps/api/src/routes/showcaseSounds.ts`, `showcaseSoundStorage.ts` |
| 현재 구현 상태 | `[완료]` (**V1 포함**) |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | 업로드 **유료**. 무료는 Signature/Shared만 |
| Android/Web/iOS 지원 상태 | 앱 설정·송출. API·R2(스토리지) 연동 |
| 출시 전 남은 작업 | QA §3 업로드·쿼터·동의 체크 |
| 기술적 차별점 | 권리 동의·쿼터·Shared Track 퍼오기와 분리된 **User Original** 파이프라인 |

---

### 15. BGM 재생모드 (단독·순서·셔플)

| 항목 | 내용 |
|------|------|
| 기능명 | 재생목록 · 셔플/순서 |
| 사용자 문제 | 여러 곡을 쇼케이스에서 이어서/섞어 재생 |
| 기능 설명 | 유료 재생목록, `playMode` single/order/shuffle, 다음곡 URL 재발급 |
| 실제 구현 파일/모듈 | `ShowcaseBgmContext.jsx`, `showcaseBgmPresets.js`, `ShowcaseBgmTransport.jsx` |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | 재생목록·모드 **유료** UI |
| Android/Web/iOS 지원 상태 | 앱 쇼케이스 |
| 출시 전 남은 작업 | 셔플·다음곡 회귀 |
| 기술적 차별점 | `soundId`만 있어도 서명 URL 재조회로 큐 유지 |

---

### 16. 배너 소셜 오버레이

| 항목 | 내용 |
|------|------|
| 기능명 | 쇼케이스 배너 좋아요·댓글·공유·더보기 |
| 사용자 문제 | 통화 외 열람에서 반응·공유가 필요 |
| 기능 설명 | 미리보기·통화목록 다시보기에 우레일. **실통화 중에는 비노출** (InCall만) |
| 실제 구현 파일/모듈 | `ShowcaseBannerSocialLayer.jsx`, `showcaseSocialApi.js`, `docs/v1_showcase_social_overlay.md` |
| 현재 구현 상태 | `[완료]` / QA `[출시 전 필수]` |
| V1/V2 구분 | **V1** (`showcaseSocialOverlay: true`) |
| 무료/유료 구분 | 배너 슬라이드 기준(유료 배너 UX와 연동) |
| Android/Web/iOS 지원 상태 | 앱 미리보기·히스토리 |
| 출시 전 남은 작업 | QA §13 |
| 기술적 차별점 | 실통화와 미리보기에서 **소셜 레일 on/off 분기** |

---

### 17. 팔로우 · 친구 쇼케이스

| 항목 | 내용 |
|------|------|
| 기능명 | 팔로우 · 친구 쇼케이스 목록 |
| 사용자 문제 | 관심 쇼케이스를 모아 보고 싶음 |
| 기능 설명 | 팔로우 토글·카운트·홈 친구 쇼케이스 세로 목록·검색 |
| 실제 구현 파일/모듈 | `followApi.js`, `FollowActionButton.jsx`, `FriendShowcaseList.jsx`, API `/api/follow` |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** (`friendShowcaseFeed`) |
| 무료/유료 구분 | 공통 |
| Android/Web/iOS 지원 상태 | 앱 홈 |
| 출시 전 남은 작업 | QA §10 |
| 기술적 차별점 | 쇼케이스 크롬의 「나」/팔로우와 동일 액션 컴포넌트 |

---

### 18. 통화 중 카톡 Share (앱 미사용자)

| 항목 | 내용 |
|------|------|
| 기능명 | InCall 카카오톡 쇼케이스 초대 Share |
| 사용자 문제 | 상대가 VLUE 미설치면 쇼케이스를 전달하기 어렵다 |
| 기능 설명 | `callPeerMatrix` 조건 시 `InCallKakaoShareSlot` → Kakao Share 기본 템플릿. **알림톡은 V1 미사용** |
| 실제 구현 파일/모듈 | `shareShowcaseInviteKakao.js`, `InCallKakaoShareSlot.jsx`, `callPeerMatrix.js`, `docs/v1_call_peer_matrix.md` |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** (Share). 알림톡 핸드오프는 V1 정책 제외 |
| 무료/유료 구분 | 매트릭스 조건(미가입·주소록 등) |
| Android/Web/iOS 지원 상태 | 앱 실통화 오버레이 (카카오 SDK/웹 브릿지 환경) |
| 출시 전 남은 작업 | QA §8 Share 시트 회귀 |
| 기술적 차별점 | 알림톡 대신 **Share API**로 V1 핸드오프 |

---

### 19. 통화 목록 다시보기

| 항목 | 내용 |
|------|------|
| 기능명 | 통화 쇼케이스 히스토리 |
| 사용자 문제 | 지난 통화에서 본 쇼케이스를 다시 보고 싶음 |
| 기능 설명 | 하단 네비 통화 목록 → 리플레이. 유료 통화 보안 쉴드 등 |
| 실제 구현 파일/모듈 | `callShowcaseHistory.js`, Call history sheet/UI, `v1AppShell.callShowcaseHistoryNav` |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | 공통 목록 · 표시 차이는 유료 쉴드 등 |
| Android/Web/iOS 지원 상태 | 앱 |
| 출시 전 남은 작업 | QA §10 |
| 기술적 차별점 | 실통화와 동일 Lettering UI를 `fromCallHistory`로 재사용 |

---

### 20. 개인케이스 (명함저장·저장된케이스·내문서)

| 항목 | 내용 |
|------|------|
| 기능명 | 개인케이스 |
| 사용자 문제 | 받은 명함·스크랩·문서를 모아야 함 |
| 기능 설명 | 웹·앱 동일 3탭. 명함저장 행은 저장/삭제 중심 |
| 실제 구현 파일/모듈 | `ResourcesPage.tsx`, `WalletHubModal.jsx`, `v1AppShell.vaultTabsMinimal` / `personalVault` |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | 공통 |
| Android/Web/iOS 지원 상태 | **Web** Resources · **앱** WalletHub |
| 출시 전 남은 작업 | QA §11 웹=앱 패리티 |
| 기술적 차별점 | V1에서 개인자료실/이력서 다운로드 라벨 제거·3탭 고정 |

---

### 21. 마이케이스 아카이브

| 항목 | 내용 |
|------|------|
| 기능명 | 마이케이스 그리드 |
| 사용자 문제 | 내 쇼케이스 게시물을 보관·재송출 |
| 기능 설명 | 하단 마이케이스 아카이브 · 라이브 방송 스타일 적용 |
| 실제 구현 파일/모듈 | `MyCaseGrid.jsx`, `mycaseApi.js`, `syncMycaseLiveBroadcast.js` |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** (`mycase`) |
| 무료/유료 구분 | 공통(콘텐츠 한도는 티어) |
| Android/Web/iOS 지원 상태 | 앱 |
| 출시 전 남은 작업 | 라이브 적용 회귀 |
| 기술적 차별점 | 아카이브 → **라이브 송출 스타일** hydrate |

---

### 22. 가족보호

| 항목 | 내용 |
|------|------|
| 기능명 | 가족보호 |
| 사용자 문제 | 가족 위험 통화·앱·링크를 보호자가 알기 어렵다 |
| 기능 설명 | 유료 1:3 등록·설정·알림 API. Android 네이티브 스캐너·브릿지·통화/배터리 등. 오픈뱅킹 자동은 미구현 |
| 실제 구현 파일/모듈 | `FamilyProtectionPage.tsx`, `FamilyProtectionRegister.jsx`, `apps/api/.../familyProtection.ts`, Android `family/*`, iOS `VlueFamilyBridge.swift` |
| 현재 구현 상태 | `[부분 구현]` |
| V1/V2 구분 | **V1** (`familyProtection: true`) |
| 무료/유료 구분 | **유료** (B2B 계정 해당 없음) |
| Android/Web/iOS 지원 상태 | Web 설정·안내. Android 네이티브 비중 큼. iOS 브릿지 일부 |
| 출시 전 남은 작업 | E2E QA · 혜택 카피 노출 (§4-C·가족) |
| 기술적 차별점 | 웹 설정 + **단말 권한/스캔** 하이브리드 |

---

### 23. 종이명함 스캐너

| 항목 | 내용 |
|------|------|
| 기능명 | 명함 스캐너 (OCR → 연락처) |
| 사용자 문제 | 종이 명함을 디지털로 옮기기 번거로움 |
| 기능 설명 | 카메라/이미지 OCR 후 연락처 저장 흐름 |
| 실제 구현 파일/모듈 | `BizcardScannerScreen.jsx`, `v1AppShell.bizcardScanner` |
| 현재 구현 상태 | `[완료]` (기능 플래그 on) |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | 공통(상세 게이트는 UI 확인) |
| Android/Web/iOS 지원 상태 | 앱(카메라). Web 제한적일 수 있음 |
| 출시 전 남은 작업 | 실기기 OCR 스모크 |
| 기술적 차별점 | 홈 헤더 최소 UI의 스캐너 진입 (`homeHeaderMinimal`) |

---

### 24. 소셜 로그인·계정 연동

| 항목 | 내용 |
|------|------|
| 기능명 | 카카오·네이버·Google 로그인/연동 |
| 사용자 문제 | 가입·재로그인 편의 · 마스터 계정과 소셜 연결 |
| 기능 설명 | 소셜 로그인 및 가입 후 연동 패널. 핵심 기능은 PASS 본인인증 후 |
| 실제 구현 파일/모듈 | `LoginScreen.jsx`, `socialOAuthReturn.js`, `SocialAccountLinkPanel.jsx`, `socialLoginPolicy.js` |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | 공통 |
| Android/Web/iOS 지원 상태 | Web·앱 OAuth 리다이렉트 |
| 출시 전 남은 작업 | 프로바이더별 실키 스모크 |
| 기술적 차별점 | 「소셜만으로 마스터 계정 생성」이 아니라 **PASS 가입 + 연동** 정책 |

---

### 25. 인스타·비즈 아웃링크

| 항목 | 내용 |
|------|------|
| 기능명 | 인스타 링크 · 비즈니스 아웃링크 |
| 사용자 문제 | 쇼케이스에서 SNS·채널로 바로 보내고 싶음 |
| 기능 설명 | 인스타 연동 API·설정. 유료 비즈니스 섹션 IG/YT/FB/카카오 URL |
| 실제 구현 파일/모듈 | `instagramLinkApi.js`, `ShowcaseStyleSettingsPanel.jsx`, `ShowcaseSlideChrome.jsx` |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** (`instagramFeed` 등) |
| 무료/유료 구분 | 아웃링크·메뉴 등 **유료** 게이트 |
| Android/Web/iOS 지원 상태 | 앱 쇼케이스·설정 |
| 출시 전 남은 작업 | 유료 비즈니스 탭 QA (§1·§8) |
| 기술적 차별점 | 통화 중 소셜 레일과 별도인 **쇼셜 토글·아웃링크** |

---

### 26. 알림함

| 항목 | 내용 |
|------|------|
| 기능명 | 푸시·알림 인박스 |
| 사용자 문제 | 결제·팔로우 등 알림을 모아 보기 |
| 기능 설명 | 하단 바 아이콘 전체화면 알림 (`notificationBottomNavOnly`) |
| 실제 구현 파일/모듈 | `PushNotificationInbox.jsx`, `pushNotificationInbox.js`, `fcmWebPush.js` |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | 공통 |
| Android/Web/iOS 지원 상태 | 앱(+FCM). Web 푸시는 환경 의존 |
| 출시 전 남은 작업 | FCM 실기기 |
| 기술적 차별점 | 홈 본문 알림 패널 대신 **하단 네비 전용** |

---

### 27. 연락처·친구

| 항목 | 내용 |
|------|------|
| 기능명 | 연락처·친구 |
| 사용자 문제 | 기기 연락처와 VLUE 친구를 연결 |
| 기능 설명 | 연락처 패널·검색·하이브리드 known-contact |
| 실제 구현 파일/모듈 | `ContactFriendsPanel.jsx`, `hybridKnownContact.js`, Android `DeviceContactsReader.kt` |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** (`contacts`) |
| 무료/유료 구분 | 공통 |
| Android/Web/iOS 지원 상태 | 앱 + 기기 권한. Web은 제한 |
| 출시 전 남은 작업 | 권한 거부 시 UX |
| 기술적 차별점 | 통화 peer 매트릭스와 **known-contact** 공유 |

---

### 28. www 요금·다운로드·고객지원

| 항목 | 내용 |
|------|------|
| 기능명 | 마케팅 웹 (요금·다운로드·FAQ) |
| 사용자 문제 | 앱 설치 전 요금·기능·문의 확인 |
| 기능 설명 | Pricing/Download/Support/About. V1 웹 결제 없음 → 앱 다운로드 유도 |
| 실제 구현 파일/모듈 | `PricingPage.tsx`, `DownloadPage.tsx`, `SupportPage.tsx`, `serviceIntroContent.ts`, `v1WebShell` |
| 현재 구현 상태 | `[완료]` |
| V1/V2 구분 | **V1** |
| 무료/유료 구분 | 안내(유료 요금 카피) |
| Android/Web/iOS 지원 상태 | **Web만** |
| 출시 전 남은 작업 | §4-A·§4-C 카피 QA · V2 메뉴 미노출 (§9) |
| 기술적 차별점 | `webSubscribePayment: false`로 결제 경로 분리 |

---

### 29. SOHO 추가번호 쇼케이스 옵션

| 항목 | 내용 |
|------|------|
| 기능명 | SOHO 추가번호 송출 (+4,200원) |
| 사용자 문제 | 대표 계정 외 번호로 쇼케이스만 송출하고 싶음 |
| 기능 설명 | 요금·카피 상수·결제 연관 경로(브로드캐스트 라인). 할인 미적용 |
| 실제 구현 파일/모듈 | `membershipBm.js` (`SOHO_BROADCAST_*`), `broadcastLine` API/checkout |
| 현재 구현 상태 | `[부분 구현]` |
| V1/V2 구분 | **V1** 안내·SKU |
| 무료/유료 구분 | 유료 옵션 |
| Android/Web/iOS 지원 상태 | 앱 결제·설정 연동 |
| 출시 전 남은 작업 | 카피·결제 경로 QA (§4-C) |
| 기술적 차별점 | 본인인증 번호와 분리된 **추가 송출 회선** 모델 |

---

## V2로 숨겨진 기능 (코드는 존재·플래그 off)

아래는 **새 기능이 아니라** 메인 트리/archive에 있으나 V1 네비·라우트에서 제외된 항목.

| 기능명 | 구현 위치(예) | V1/V2 | 구현 상태 | 플랫폼 메모 |
|--------|---------------|-------|-----------|-------------|
| VLUE 스토어·쇼핑카트 | `ShoppingPage`, shopping 컴포넌트 | **V2** | 격리·플래그 false | Web/앱 미노출 |
| 경매 | `AuctionPage` | **V2** | 동일 | Web |
| 채용·이벤트 | `JobsPage`, `EventsPage` | **V2** | 동일 | Web |
| AI 엑셀 에디터 | `ExcelEditorPage` | **V2** | 동일 | Web |
| VLUE 이메일·메일톡 | mail 라우트·컴포넌트 | **V2** | 동일 | Web/앱 |
| PC 설치형 | `pcInstaller` false | **V2** | 동일 | Web 다운로드 |
| 채팅·블루AI(브이밍) | chat / `vumingAi` | **V2** | 컴포넌트 잔존·페이지 coerce | 앱 |
| 추천인·VLUER 파트너 | `referralProgram` false | **V2** | 미운영 상수 | — |
| 홈 레거시 피드 | `homeLegacyFeed` false | **V2** | 숨김 | 앱 |
| www 구독 결제 | `webSubscribePayment` false | **V2** | 의도적 비활성 | Web |
| 마케팅 AI FAB 챗봇 | `marketingFabChat` false | **V2** | 숨김 | Web |
| 음성·영상 통화(앱 내) | `voiceVideoCall` false | **V2** | 플래그 off | — |
| 프린터 리모컨·스토어 스캐너 | 해당 플래그 false | **V2** | 플래그 off | — |

출시 전: QA §9 **V2 노출되면 출시 차단**.

---

## 미구현·정책 제외 (행 검증)

| 기능명 | 근거 | 상태 |
|--------|------|------|
| iOS 기본 전화 앱 교체 | OS 정책 | `[미구현]` (불가) |
| 오픈뱅킹 기반 가족 자동 알림 | `FAMILY_PROTECTION.md` 후속 | `[미구현]` |
| 카카오 알림톡 쇼케이스 핸드오프 | QA: V1 미사용 (Share로 대체) | V1 범위 외 |
| 추천인 리워드 실운영 | `referralProgram: false` | 의도적 미운영 |
| 정적 `SHOWCASE_BGM_PRESETS` 배열 채움 | `[]` — Signature/User Original API로 대체 | 상수 비움 |

---

## 출시 전 작업 요약 (기능 횡단)

| 우선 | 작업 | 관련 기능 # |
|------|------|-------------|
| P0 | PortOne 테스트 결제 → Premium | 2, 8, 9, 11 |
| P0 | Android 릴리즈 · Dialer · 근접 | 4–7 |
| P0 | 종합 QA · V2 숨김 | 전체 V1 · V2 표 |
| P0 | Play Store 제출 | — |
| P1 | www 결제 미지원 카피 | 28 |
| P1 | iOS CallKit | 4–5 |
| P1 | 가족보호 E2E | 22 |
| P1 | 카톡 Share · BGM · 소셜 오버레이 | 13–16, 18 |

근거: `docs/v1_mvp_final_qa_checklist.md`.

---

## 대조 검증 메모

| Overview 주장 | 코드 대조 결과 |
|---------------|----------------|
| User Original 업로드 V1 | `ShowcaseBgmPicker` 유료 `음원 등록` + `showcaseSounds` API — **일치** |
| 웹 결제 V2 | `webSubscribePayment: false` — **일치** |
| 알림톡 쇼케이스 전달 V1 미사용 | Share 경로 사용 · QA 명시 — **일치** |
| RF 프리셋 배열 | `SHOWCASE_BGM_PRESETS=[]` — Signature API와 별개 상수 — Overview와 **일치** |
| ROLE_DIALER Android만 | `DialerRoleHelper.kt` · iOS 문서 — **일치** |

---

*문서 생성: Product Overview 수정본 + 코드 대조. 존재하지 않는 기능을 행으로 추가하지 않음.*
