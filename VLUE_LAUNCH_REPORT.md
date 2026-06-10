# VLUE 앱 전체 감사(Audit) 및 출시 준비 보고서

> 생성일: 2026-06-02 · **갱신: 2026-06-02 (PPT 제작 제거·AI 엑셀 MVP 정렬)**  
> 대상: `c:\Users\jg071\OneDrive\바탕 화면\발구지` (monorepo `vlue-superapp`)  
> 스캔 범위: `apps/`, `packages/`, `web/`, `web2/`, `src/`(동기화 복제), `scripts/`

---

## 0. 제품 포지셔닝 (출시 기준)

### 초기 서비스(MVP) — AI 엑셀 생성

| 구분 | 상태 | 구현 |
|------|------|------|
| **AI 엑셀 제작** | ⚠️ MVP | `www.vlue.kr` 웹 — `OfficeExcelWorkshop.tsx`, `ExcelEditorPage.tsx` · API `/api/office/excel/*` · Vming `featureType: web_excel` |
| 엑셀 저장·동기화 | ✅ | `OfficeExcelWorkbook` Prisma · `PUT /api/office/excel/workbooks/:id` |
| 앱/PC 열람 | ✅ | 동일 계정 JWT · 자료실(`WalletHubModal` 내 문서) |

### PPT — 저장·공유·인쇄만 (AI 제작 없음)

| 기능 | 상태 | 구현 |
|------|------|------|
| PPT/PDF **저장** | ✅ | 메일 수신·스캔 → `AssetFile` (`/api/office/files`, `ingestVaultBuffer`) |
| PPT/PDF **공유** | ✅ | `VaultSavedFileRow` + `vaultFileActions.js` (Web Share API) |
| PPT/PDF **인쇄·팩스** | ✅ | `OfficeRemoteModal` → `/api/office/remote-control`, `/api/iot/print-jobs` |
| **AI PPT 제작** | ❌ 미제공 | `/api/ppt/*`, `/api/office/ppt-tasks/*`, `OfficePptWorkshopPanel` **코드베이스에서 제거됨** |

> Prisma `PptJob` / `PptJobEvent` 테이블은 레거시 스키마로 DB에 남아 있으나 **런타임 API·UI 미연결**.

---

## 1. 프로젝트 전체 구조 스캔

### 1.1 전체 폴더/파일 트리 (핵심)

```
발구지/                          # npm workspaces monorepo
├── apps/
│   ├── api/                     # @vlue/api — Hono/Node 백엔드 (TypeScript)
│   │   ├── src/
│   │   │   ├── routes/          # 53개 라우트 모듈 (ppt.ts 제거)
│   │   │   ├── services/        # 도메인 비즈니스 로직
│   │   │   ├── middleware/
│   │   │   ├── config/          # productionEnv.ts 등
│   │   │   ├── cron/
│   │   │   ├── realtime/        # SSE 허브
│   │   │   └── tests/           # coreSmoke, referral-policy, signup-gate
│   │   ├── dist/
│   │   ├── docs/
│   │   └── package.json
│   ├── android/                 # Kotlin — 통화 오버레이·가족보호
│   ├── android-call-overlay/
│   ├── ios/                     # iOS 셸
│   └── pc-agent/                # @vlue/pc-agent — 복합기 원격 에이전트
├── packages/
│   ├── db/                      # @vlue/db — Prisma + PostgreSQL
│   │   └── prisma/schema.prisma # 93 models
│   └── shared/                  # @vlue/shared — 정책·정산 공유 모듈
├── web/                         # @vlue/web — 메인 React/Vite 슈퍼앱
│   ├── src/
│   │   ├── components/          # 171 *.jsx (OfficePptWorkshopPanel 제거)
│   │   ├── lib/
│   │   ├── legal/
│   │   └── site/bolt/           # 마케팅 셸 (TSX)
│   └── public/
├── web2/                        # 별도 마케팅 Vite 사이트 (workspaces 미포함)
├── src/                         # web/src 동기화 복제본
├── scripts/                     # migrate, seed, android, production-ready 등
├── data/                        # 런타임 JSON (family_security_states.json 등)
├── docs/
├── supabase/
├── docker-compose.yml           # 로컬 PostgreSQL 16
├── package.json
├── .env.example
└── deployment.lock.json
```

**참고:** 루트에 개발 문서·이미지·PDF 등 비코드 자산이 다수 존재함 (출시 코드와 무관).

### 1.2 프론트엔드 컴포넌트 목록 (화면별)

| 화면/기능 | 주요 컴포넌트 | 경로 |
|-----------|--------------|------|
| **앱 셸·홈** | `App.jsx`, `Home.jsx`, `Splash.jsx`, `BetaLaunchGuide.jsx` | `web/src/` |
| **로그인·가입** | `LoginScreen.jsx`, `VlueOnboarding.jsx`, `GroupSignupSetupModal.jsx`, `PostSignupPaymentModal.jsx` | `web/src/components/` |
| **채팅/DM** | `ChatList.jsx`, `ChatRoom.jsx`, `VlueDmChat.jsx`, `ChatInput.jsx`, `MessageList.jsx`, `FriendSearch.jsx` | `web/src/components/` |
| **마이페이지** | `MyPage.jsx`, `ProfilePanel.jsx`, `VluerPartnerDashboard.jsx`, `MembershipUpgradeModal.jsx` | `web/src/components/` |
| **디지털명함/레터링** | `LetteringBusinessCardPanel.jsx`, `DigitalCardEditorView.jsx`, `LetteringOverlayHost.jsx`, `MyPageDigitalLetteringSection.jsx` 등 24개 | `web/src/components/` |
| **쇼핑/커머스** | `VlueStoreShopSection.jsx`, `StoreCartCheckoutModal.jsx`, `MediaCommerceFeed.jsx`, `shopping/*` | `web/src/components/` |
| **브이밍 AI** | `BlueAIChat.jsx`, `vming/*` (동의·업그레이드 모달) | `web/src/components/` |
| **일정관리** | `calendar/VlueCalendarScreen.jsx`, `CalendarEventFormSheet.jsx` | `web/src/components/calendar/` |
| **가족보호** | `FamilyProtectionRegister.jsx`, `FamilySecurityDashboard.jsx`, `FamilyThreatAlertCard.jsx` | `web/src/components/` |
| **메모장** | `memo/PersonalMemoScreen.jsx`, `PersonalMemoEditor.jsx` | `web/src/components/memo/` |
| **B2B/기업** | `B2BLineCartPanel.jsx`, `EnterpriseMemberManagePanel.jsx`, `EnterpriseGroupChatPanel.jsx`, `PersonalComboPanel.jsx` | `web/src/components/` |
| **오피스/자료실** | `WalletHubModal.jsx`, `VaultSavedFileRow.jsx`, `OfficeRemoteModal.jsx`, `office/*` | `web/src/components/` |
| **AI 엑셀 에디터 (웹 MVP)** | `site/bolt/components/OfficeExcelWorkshop.tsx`, `ExcelEditorPage.tsx` | `web/src/site/bolt/` |
| **결제/멤버십** | `Subscription.jsx`, `BroadcastAddonCheckoutModal.jsx`, `StoreCartCheckoutModal.jsx` | `web/src/components/` |
| **관리자** | `AdminSecretApp.jsx`, `admin-console/*`, `hq/SuperAdminHqApp.jsx` | `web/src/components/` |
| **설정** | `settings/VlueSettingsPanel.jsx` | `web/src/components/settings/` |
| **마케팅 웹** | `site/bolt/pages/*.tsx` (17페이지) | `web/src/site/bolt/` |

### 1.3 백엔드 라우터/컨트롤러 목록

**마운트 허브:** `apps/api/src/routes/api.ts` → 모든 경로 `/api` 접두사

| 라우트 파일 | 마운트 경로 | 역할 |
|------------|------------|------|
| `health.ts` | `/api/health` | 헬스체크 |
| `auth.ts` | `/api/auth` | 로그인·JWT·비밀번호·기기·FCM |
| `authV1.ts` | `/api/v1/auth` | 카카오 OAuth |
| `identity.ts` | `/api/identity` | PortOne 본인인증·가입 |
| `chat.ts` | `/api/chat` | 1:1 채팅 |
| `realtime.ts` | `/api/realtime` | SSE |
| `cards.ts` | `/api/cards` | 디지털명함·회선 |
| `cardV1.ts` | `/api/v1/card` | 공개 명함 PNG/VCF |
| `feed.ts` | `/api/feed` | 카드 피드 |
| `vouch.ts` | `/api/vouch` | 보증 요청 |
| `wallet.ts` | `/api/wallet` | 지갑·출금 |
| `payment.ts` | `/api/payment` | PortOne 구독·웹훅 |
| `pricingConfig.ts` | `/api/pricing`, `/api/admin/console/pricing-config` | 요금 설정 |
| `broadcastLine.ts` | `/api/broadcast-line` | 방송 회선 |
| `shop.ts` + `shopPayment.ts` | `/api/shop` | 쇼핑·결제 |
| `b2b.ts` | `/api/b2b` | B2B 기업 |
| `personalEnterprise.ts` | `/api/personal-combo/*` | 개인+기업 콤보 |
| `vluer.ts` | `/api/vluer` | 추천·리워드 |
| `campaign.ts` | `/api/campaign` | 체험단 캠페인 |
| `activeBoard.ts` | `/api/active-board` | 액티브보드 |
| `familyProtection.ts` | `/api/family-protection` | 가족보호 |
| `familyInvite.ts` | `/api/family` | 가족 초대 alias |
| `familyCrossSecurity.ts` | `/api/family-cross-security` | 교차 보안 |
| `fraud.ts` | `/api/fraud` | 사기 분석·증거 |
| `office.ts` + `officeExcel.ts` | `/api/office`, `/api/office/excel` | 오피스·**AI 엑셀** (MVP) |
| `calendar.ts` | `/api/calendar` | 일정 |
| `calendarNotice.ts` | `/api/calendar/notice` | 일정 공지 푸시 |
| `memo.ts` | `/api/memo` | 메모 |
| `ai.ts` | `/api/ai` | VLUE AI 채팅 |
| `vming.ts` | `/api/vming` | 브이밍 사용량·결제 |
| `vmingConsent.ts` | `/api/vming/consent` | 브이밍 동의 |
| `mail.ts` | `/api/mail` | 메일 |
| `vault.ts` | `/api/vault` | 파트너십 금고 |
| `documents.ts` | `/api/documents` | 문서 템플릿 |
| `assets.ts` | `/api/assets` | 파일 자산 |
| `sourcing.ts` | `/api/sourcing` | AI 소싱 |
| `groupbuy.ts` | `/api/groupbuy` | 공동구매 |
| `live.ts` | `/api/live` | 라이브 스트림 |
| `iot.ts` | `/api/iot` | 인쇄·팩스·PC 에이전트 |
| `ads.ts` | `/api/ads` | 지역 광고 |
| `lettering.ts` | `/api/lettering` | 전화 신고·차단 |
| `overlay.ts` | `/api/v1/overlay` | 통화 오버레이 매칭 |
| `telecomWebhook.ts` | `/api/webhooks/telecom` | 통신사 웹훅 |
| `subscriptionCron.ts` | `/api/cron` | 구독 정기결제 |
| `adminDevices.ts` | `/api/admin/device` | 관리자 기기 |
| `adminMarketing.ts` | `/api/admin/marketing`, `/api/admin/notices` | 마케팅·공지 |
| `adminConsole.ts` | `/api/admin/console` | 관리 콘솔 |
| `adminHq.ts` | `/api/admin/hq` | HQ 슈퍼관리자 |
| `adminV1.ts` | `/api/v1/admin` | 온보딩·기업 귀속 |
| `homeLayout.ts` | `/api/home/layout` | 홈 레이아웃 |

**비-REST:** WebSocket `ws://…/api/office/ws/agent` (`remoteControlHub.ts`)

### 1.4 DB 모델/테이블 목록 (93 models)

`packages/db/prisma/schema.prisma` 기준:

| 도메인 | Models |
|--------|--------|
| 사용자·인증 | `User`, `AdminDevice`, `AuthRefreshSession`, `PasswordResetToken`, `UserBlock`, `UserBusinessProfile`, `UserSocialLoginLink`, `UserDevice`, `PersonalEnterpriseMailOtp` |
| 채팅 | `ChatRoom`, `ChatMessage`, `ChatReadState` |
| 명함·피드 | `DigitalCard`, `BusinessCard`, `CardMember`, `VerificationLog`, `CardFeedPost`, `FeedPostHashtag` |
| 소셜 | `FriendRequest`, `VouchRequest` |
| 캠페인 | `Campaign`, `CampaignKeyword`, `CampaignApplication`, `CampaignMatch`, `EscrowHold`, `VisitVerification`, `ReviewDraft`, `ReviewSubmission` |
| 지갑 | `WalletAccount`, `WalletWithdrawalAccount`, `WalletLedger`, `TrustScoreLedger`, `PenaltyEvent`, `OwnerNotification`, `ActiveBoardEvent` |
| 레터링 | `LetteringPhoneBlock`, `LetteringPhoneReport` |
| VLuer/추천 | `VluerTierPolicy`, `ReferralAttribution`, `VluerCodeChangeRequest`, `VluerReferralPenalty`, `UserVluerProfile`, `CommissionLedger`, `MemberReferralBenefitState`, `AbusingProtectionLog` |
| B2B | `B2BEnterpriseAccount`, `B2BCartLine`, `CorporateAttributionRequest`, `UserCorporateMembership`, `EnterpriseBillingSchedule`, `StorePurchaseRequest`, `EnterpriseProcurementCartItem`, `EnterpriseGroupChat`, `EnterpriseGroupChatMessage`, `EnterpriseMemberCredential` |
| 구독 | `UserSubscription`, `SubscriptionPayment`, `RefundQueue` |
| 가족보호 | `FamilyProtectionSettings`, `FamilyProtectionLink`, `FamilyBankConsent`, `FamilyBankTransaction`, `FamilyWardPresence`, `FamilyProtectionAlert` |
| 커머스 | `LocalAd`, `StoreProduct`, `ShopOrder` |
| 오피스·5대핵심 | `StoreProfile`, `SourcingDraft`, `ExternalSourcingItem`, `PartnershipVaultItem`, `PartnershipVaultConnection`, `GroupBuyCampaign`, `GroupBuyStockTick`, `LiveStreamEndpoint`, `PptJob`, `PptJobEvent`, `CompanyLineWhitelist`, `PcAgentSession`, `AssetFile`, `UserVaultFolder`, `RemotePrintJob`, `RemoteFaxJob`, `MailAccount`, `MailMessage`, `MailAttachment` |
| 오피스 엑셀 | `OfficeExcelWorkbook`, `OfficeExcelRevision`, `OfficeExcelGenerationJob`, `OfficeExcelTemplate` |

**스키마 ENV:** `DATABASE_URL`, `DIRECT_URL`

### 1.5 현재 ENV 변수 사용 목록

#### API (`apps/api/.env.example` + 코드 스캔)

| 변수 | 용도 |
|------|------|
| `PORT` | API 포트 (기본 8788) |
| `NODE_ENV` | production/dev 분기 |
| `CORS_ORIGIN` | CORS 허용 오리진 (쉼표 구분) |
| `DATABASE_URL` | PostgreSQL (Prisma) |
| `DIRECT_URL` | Prisma direct connection |
| `PORTONE_API_KEY` / `PORTONE_IMP_KEY` | PortOne imp_key |
| `PORTONE_API_SECRET` / `PORTONE_IMP_SECRET` | PortOne API 시크릿 |
| `PORTONE_WEBHOOK_SECRET` | 결제 웹훅 서명 |
| `VLUE_ALLOW_DEV_BILLING` | 개발 결제 우회 |
| `VLUE_ALLOW_DEV_SHOP` | 상점 결제 우회 |
| `VLUE_CRON_DEV_BYPASS_BILLING` | 크론 결제 우회 |
| `SUBSCRIPTION_CRON_SECRET` | 구독 크론 인증 |
| `JWT_ACCESS_SECRET` / `JWT_SECRET` | JWT 서명 |
| `SESSION_SECRET` | 세션 서명 |
| `REDIS_URL` | Vming 토큰 캡 (미설정 시 인메모리) |
| `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` / `KAKAO_REDIRECT_URI` | 카카오 OAuth |
| `FRONTEND_URL` | OAuth 리다이렉트 |
| `GOOGLE_APPLICATION_CREDENTIALS` | Firebase Admin |
| `FCM_PROJECT_ID` / `FCM_CLIENT_EMAIL` / `FCM_PRIVATE_KEY` | FCM 푸시 |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | 웹 푸시 |
| `ADMIN_ENTRY_PATH` | 관리자 비밀 URL |
| `ADMIN_MASTER_PHONE_E164` | 마스터 관리자 전화 |
| `OPENBANKING_WEBHOOK_SECRET` | 오픈뱅킹 웹훅 |
| `FAMILY_CRON_SECRET` | 가족보호 elder cron |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | AI (Vming·사기·캘린더) |
| `OPENAI_API_KEY` | 소싱 Vision |
| `FFMPEG_PATH` | 미디어 합성 |
| `FILE_STORAGE_PROVIDER` | `mock` \| `s3` |
| `S3_*` | S3 호환 스토리지 |
| `PG_PROVIDER` | `mock` \| portone |
| `SMTP_*` / `SMTP_PROVIDER` | 메일 |
| `LIVE_RTMP_BASE` | 라이브 RTMP |
| `APP_BASE_URL` / `WS_ORIGIN` | 앱·WS 베이스 URL |
| `COMPANY_LINE_WHITELIST` | 기업 회선 화이트리스트 |
| `VLUE_PRODUCTION_LOCK` | 프로덕션 ENV 강제 검증 |
| `VLUE_SKIP_PRODUCTION_ENV_CHECK` | 검증 생략 (스테이징) |
| `VLUE_DEMO_COMPANY_LINE` | 데모 회선 시드 |
| `VLUE_SCHEDULER_SECRET` | VLuer 티어 스케줄러 |
| `VMING_CONSENT_ENC_KEY` | Vming 동의 암호화 |
| `VMING_CONSENT_CRON_MS` | Vming 동의 만료 cron |
| `FAMILY_ELDER_CHECK_MS` | elder 체크 주기 |
| `DATA_GO_KR_SERVICE_KEY` / `NTS_BUSINESS_API_KEY` | 사업자 검증 |
| `VLUE_PUBLIC_ORIGIN` / `VLUE_CREATE_CARD_URL` | 명함 공개 URL |
| `SUPER_ADMIN_HANDLES` | HQ 슈퍼관리자 |
| `PASSWORD_RESET_RETURN_TOKEN_DEBUG` | 비밀번호 리셋 디버그 |
| `ALLOW_DEV_IDENTITY` | 본인인증 개발 우회 |
| `API_BASE_URL` / `VLUE_SMOKE_USER_ID` | 스모크 테스트 |

#### Web (`web/.env.example` + `VITE_*`)

`VITE_API_URL`, `VITE_SITE_SHELL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CARD_PUBLIC_API_BASE`, `VITE_VLUE_LANDING_URL`, `VITE_VLUE_CREATE_CARD_URL`, `VITE_PORTONE_USER_CODE`, `VITE_KAKAO_JAVASCRIPT_KEY`, `VITE_ADMIN_PATH`, `VITE_ADMIN_CONSOLE_PATH`, `VITE_IAMPORT_*`, `VITE_WEB_PUSH_VAPID_PUBLIC_KEY`, `VITE_KAKAO_BIZCARD_BUTTON_IMAGE`, `VITE_VLUE_IOS_STORE_URL`, `VITE_VLUE_ANDROID_STORE_URL`

#### PC Agent

`VLUE_AGENT_USER_ID`, `VLUE_AGENT_WS_URL`, `VLUE_AGENT_DEVICE_ID`, `VLUE_AGENT_DEVICE_LABEL`

---

## 2. API 전체 목록 추출

> **총계:** REST 약 **280개** + WebSocket 1개 + 루트 `GET /`  
> **인증 범례:** Y=필수, N=공개, P=부분(웹훅 시크릿·Bearer 선택·역할 게이트)  
> **완성 범례:** ✅ 완성 / ⚠️ MVP·mock / 🔴 보안 이슈

### 2.1 인증/소셜로그인

| Method | Endpoint | 기능 | 인증필요 | 완성여부 |
|--------|----------|------|----------|----------|
| GET | `/api/auth/check-login-id` | 공개 핸들 중복 확인 | N | ✅ |
| POST | `/api/auth/login` | ID/비밀번호 로그인 + JWT | N | ✅ |
| POST | `/api/auth/social-login` | 소셜 토큰 로그인 | N | ✅ |
| POST | `/api/auth/refresh` | 액세스 토큰 갱신 | N | ✅ |
| POST | `/api/auth/logout` | 리프레시 토큰 폐기 | P | ✅ |
| POST | `/api/auth/logout-all` | 전체 세션 폐기 | P (Bearer) | ✅ |
| POST | `/api/auth/password/forgot` | 비밀번호 재설정 요청 | N | ✅ |
| POST | `/api/auth/password/reset` | 토큰으로 비밀번호 재설정 | N | ✅ |
| POST | `/api/auth/password/change` | 로그인 상태 비밀번호 변경 | P (Bearer) | ✅ |
| POST | `/api/auth/terms/accept` | 약관 버전 동의 저장 | P (Bearer) | ✅ |
| POST | `/api/auth/referral/apply-post-signup` | 가입 후 추천인 할인 예약 | P (Bearer) | ✅ |
| GET | `/api/auth/referral/verify` | 추천 코드 검증 | N | ✅ |
| POST | `/api/auth/membership-change/request` | 멤버십 변경 요청 (로그만) | P (Bearer) | ⚠️ |
| GET | `/api/auth/devices/pending` | 승인 대기 기기 목록 | Y | ✅ |
| POST | `/api/auth/devices/:deviceId/approve` | 기기 승인 | Y | ✅ |
| GET | `/api/auth/devices/token/new` | 새 기기 토큰 발급 | N | ✅ |
| POST | `/api/auth/devices/fcm-token` | FCM 토큰 등록 | Y | ✅ |
| GET | `/api/v1/auth/kakao` | 카카오 OAuth 리다이렉트 | N | ✅ |
| GET | `/api/v1/auth/kakao/callback` | 카카오 콜백 → JWT | N | ✅ |
| GET | `/api/v1/auth/social/links` | 연동 소셜 계정 목록 | Y | ✅ |
| POST | `/api/v1/auth/social/link` | 소셜 계정 연동 | Y | ✅ |

### 2.2 회원가입/탈퇴

| Method | Endpoint | 기능 | 인증필요 | 완성여부 |
|--------|----------|------|----------|----------|
| POST | `/api/identity/portone/complete` | PortOne 본인인증 완료·계정 생성/로그인 | N | ✅ |
| — | *(회원탈퇴 API)* | UI만 존재 (`ProfilePanel.jsx`), 백엔드 엔드포인트 없음 | — | ❌ |

### 2.3 채팅/DM

| Method | Endpoint | 기능 | 인증필요 | 완성여부 |
|--------|----------|------|----------|----------|
| GET | `/api/chat/peers` | 채팅 가능 사용자 목록 | Y (Bearer) | ✅ |
| POST | `/api/chat/blocks` | 사용자 차단 | Y | ✅ |
| DELETE | `/api/chat/blocks/:blockedUserId` | 차단 해제 | Y | ✅ |
| GET | `/api/chat/blocks` | 차단 목록 | Y | ✅ |
| POST | `/api/chat/rooms/open` | 1:1 방 열기 | Y | ✅ |
| GET | `/api/chat/rooms/:roomId/messages` | 메시지 목록 | Y | ✅ |
| POST | `/api/chat/rooms/:roomId/read` | 읽음 처리 | Y | ✅ |
| POST | `/api/chat/rooms/:roomId/messages` | 메시지 전송 | Y | ✅ |
| GET | `/api/realtime/sse` | SSE 실시간 이벤트 | Y (Bearer) | ✅ |

### 2.4 디지털명함/레터링

| Method | Endpoint | 기능 | 인증필요 | 완성여부 |
|--------|----------|------|----------|----------|
| GET | `/api/cards/lookup` | 전화번호로 카드 조회 | N | ✅ |
| GET | `/api/cards/by-number` | lookup 별칭 | N | ✅ |
| GET | `/api/cards/me-context` | 내 카드·멤버십 컨텍스트 | Y | ✅ |
| POST | `/api/cards/register` | 프리미엄 회선 등록 | Y | ✅ |
| POST | `/api/cards/register-line` | register 별칭 | Y | ✅ |
| POST | `/api/cards/:cardId/mock-approve` | mock 승인 | Y | ⚠️ mock |
| GET | `/api/cards/:cardId/members` | 카드 멤버 목록 | Y | ✅ |
| POST | `/api/cards/:cardId/members` | 멤버 추가 | Y | ✅ |
| DELETE | `/api/cards/:cardId/members/:userId` | 멤버 제거 | Y | ✅ |
| POST | `/api/cards/:cardId/notify-inquiry` | 문의 알림 | Y | ✅ |
| GET | `/api/cards/my-digital-card` | 디지털 명함 조회 | Y | ✅ |
| PATCH | `/api/cards/my-digital-card` | 디지털 명함 수정 | Y | ✅ |
| GET | `/api/v1/card/validate/:cardId` | 카드 검증 (JSON/HTML) | N | ✅ |
| GET | `/api/v1/card/verify/:cardId` | QR 검증 페이지 | N | ✅ |
| GET | `/api/v1/card/kakao-feed/:cardId` | 카카오 피드 PNG | N | ✅ |
| GET | `/api/v1/card/share-button.png` | 공유 버튼 PNG | N | ✅ |
| GET | `/api/v1/card/thumb/:cardId` | 썸네일 PNG | N | ✅ |
| GET | `/api/v1/card/view/:cardId` | 호스팅 카드 뷰 | N | ✅ |
| GET | `/api/v1/card/gallery-png/:cardId` | 갤러리 PNG+QR | N | ✅ |
| GET | `/api/v1/card/vcf/:cardId` | vCard 다운로드 | N | ✅ |
| GET | `/api/v1/card/wallet-pass/:cardId` | Wallet Pass ZIP | N | ⚠️ stub |
| GET | `/api/lettering/reports/by-phone` | 전화 신고 이력 | N | ✅ |
| GET | `/api/lettering/blocks/check` | 번호 차단 여부 | Y | ✅ |
| POST | `/api/lettering/blocks` | 번호 차단 | Y | ✅ |
| POST | `/api/lettering/reports` | 번호 신고 | Y | ✅ |
| GET | `/api/v1/overlay/match` | 통화 오버레이 매칭 | N | ✅ |
| POST | `/api/v1/overlay/match` | 통화 오버레이 매칭 (POST) | N | ✅ |
| POST | `/api/webhooks/telecom/inbound` | LGU+/KT 통화 시작 웹훅 | N | ✅ |
| GET | `/api/feed/posts` | 카드 피드 | P | ✅ |
| POST | `/api/feed/posts` | 피드 게시 | Y | ✅ |
| DELETE | `/api/feed/posts/:postId` | 피드 삭제 | Y | ✅ |
| GET | `/api/feed/search` | 해시태그 검색 | Y | ✅ |

### 2.5 쇼핑/커머스

| Method | Endpoint | 기능 | 인증필요 | 완성여부 |
|--------|----------|------|----------|----------|
| GET | `/api/shop/products` | 판매자 상품 목록 | Y | ✅ |
| POST | `/api/shop/products/sync` | 상품 DB 동기화 | Y | ✅ |
| POST | `/api/shop/orders/prepare` | 주문 준비 | Y | ✅ |
| POST | `/api/shop/payment/complete` | PortOne 상점 결제 검증 | Y | ✅ |
| GET | `/api/shop/enterprise/dashboard` | 기업 쇼핑 대시보드 | Y + 기업 | ✅ |
| POST | `/api/shop/enterprise/purchase-request` | 구매 요청 생성 | Y + 기업 | ✅ |
| GET | `/api/shop/enterprise/purchase-requests` | 구매 요청 목록 | Y + 기업 | ✅ |
| POST | `/api/shop/enterprise/purchase-requests/:id/review` | 구매 요청 검토 | Y + 구매자 | ✅ |
| POST | `/api/shop/enterprise/cart/items` | 조달 카트 추가 | Y + 기업 | ✅ |
| POST | `/api/shop/enterprise/cart/share-to-chat` | 카트 채팅 공유 | Y + 구매자 | ✅ |
| GET | `/api/shop/enterprise/tax-export` | 세금계산서 JSON | Y + 관리자 | ✅ |
| GET | `/api/shop/enterprise/tax-export.csv` | 세금계산서 CSV | Y + 기업 | ✅ |
| GET | `/api/shop/enterprise/tax-export/print` | 세금계산서 인쇄 HTML | Y + 기업 | ✅ |
| POST | `/api/shop/enterprise/wallet/charge` | 기업 지갑 충전 | Y + 관리자 | ✅ |
| POST | `/api/shop/enterprise/corporate-card` | 법인카드 등록 | Y + 관리자 | ✅ |
| POST | `/api/sourcing/vision-draft` | Vision 상품 초안 | Y | ✅ |
| POST | `/api/sourcing/ai-generate` | AI 상품 생성 | Y | ✅ |
| POST | `/api/sourcing/inline-import` | URL 임포트 | Y | ✅ |
| POST | `/api/sourcing/register-product` | 페이지 상품 등록 | Y | ✅ |
| GET | `/api/sourcing/page-feed` | 페이지 피드 상품 | Y | ✅ |
| POST | `/api/groupbuy/campaigns` | 공동구매 캠페인 생성 | Y | ✅ |
| POST | `/api/groupbuy/campaigns/:id/tick` | 판매 수량 증가 | Y | ✅ |
| GET | `/api/groupbuy/campaigns/:id/tick` | 캠페인 틱 조회 | Y | ✅ |
| GET | `/api/ads/` | 지역 광고 목록 | N | ✅ |
| POST | `/api/ads/` | 지역 광고 등록 (유료) | Y | ✅ |

### 2.6 브이밍 AI

| Method | Endpoint | 기능 | 인증필요 | 완성여부 |
|--------|----------|------|----------|----------|
| POST | `/api/ai/chat` | VLUE AI 채팅 (Vming·캘린더·메모) | Y + Vming동의 | ✅ |
| GET | `/api/vming/user/vming-status` | Vming 사용량 상태 | Y | ✅ |
| POST | `/api/vming/user/vming-unlimited/purchase` | 무제한 패키지 구매 | Y | ✅ |
| POST | `/api/vming/feature/check` | 기능 한도 사전 확인 | Y | ✅ |
| POST | `/api/vming/user/vming-unlimited/confirm` | 무제한 결제 확정 | Y | ✅ |
| GET | `/api/vming/consent/status` | 방 동의 상태 | Y | ✅ |
| POST | `/api/vming/consent/request` | 방 동의 요청 | Y | ✅ |
| POST | `/api/vming/consent/respond` | 동의 수락/거절 | Y | ✅ |
| POST | `/api/vming/consent/withdraw` | 동의 철회 | Y | ✅ |
| POST | `/api/vming/consent/evict` | Vming 퇴장 | Y | ✅ |

### 2.6.1 AI 엑셀 에디터 (초기 서비스 MVP)

| Method | Endpoint | 기능 | 인증필요 | 완성여부 |
|--------|----------|------|----------|----------|
| GET | `/api/office/excel/templates` | 업무 템플릿 카탈로그 | Y | ✅ |
| GET | `/api/office/excel/workbooks` | 워크북 목록 | Y | ✅ |
| POST | `/api/office/excel/workbooks` | 워크북 생성 | Y | ✅ |
| GET | `/api/office/excel/workbooks/:id` | 워크북 조회 | Y | ✅ |
| PUT | `/api/office/excel/workbooks/:id` | 워크북 저장(리비전) | Y | ✅ |
| POST | `/api/office/excel/workbooks/generate` | AI 프롬프트 → 엑셀 생성 | Y | ⚠️ mock Agent |
| GET | `/api/office/excel/generation-jobs/:id` | 생성 Job 상태 | Y | ✅ |
| POST | `/api/vming/feature/check` | `web_excel` 한도 선체크 | Y | ✅ |

### 2.7 일정관리

| Method | Endpoint | 기능 | 인증필요 | 완성여부 |
|--------|----------|------|----------|----------|
| POST | `/api/calendar/personal` | 개인 일정 생성 | Y | ✅ |
| GET | `/api/calendar/personal` | 개인 일정 목록 | Y | ✅ |
| PUT | `/api/calendar/personal/:id` | 개인 일정 수정 | Y | ✅ |
| DELETE | `/api/calendar/personal/:id` | 개인 일정 삭제 | Y | ✅ |
| POST | `/api/calendar/group/:groupId` | 그룹 일정 생성 | Y | ✅ |
| GET | `/api/calendar/group/:groupId` | 그룹 일정 목록 | Y | ✅ |
| GET | `/api/calendar/all` | 전체 일정 병합 | Y | ✅ |
| GET | `/api/calendar/events/:id` | 일정 단건 조회 | Y | ✅ |
| PUT | `/api/calendar/group/:id` | 그룹 일정 수정 | Y | ✅ |
| DELETE | `/api/calendar/group/:id` | 그룹 일정 삭제 | Y | ✅ |
| POST | `/api/calendar/events/:id/rsvp` | RSVP | Y | ✅ |
| POST | `/api/calendar/push/send` | 일정 푸시 즉시 발송 | Y | ✅ |
| POST | `/api/calendar/push/schedule` | 일정 푸시 예약 | Y | ✅ |
| POST | `/api/calendar/parse` | 자연어 → 일정 파싱 | Y | ✅ |
| POST | `/api/calendar/notice/publish` | 일정 공지 + FCM | Y | ✅ |
| POST | `/api/office/calendar/events` | 오피스 일정 생성 | Y | ✅ |
| GET | `/api/office/calendar/events` | 오피스 일정 목록 | Y | ✅ |

### 2.8 가족보호

| Method | Endpoint | 기능 | 인증필요 | 완성여부 |
|--------|----------|------|----------|----------|
| GET | `/api/family-protection/links` | 보호 링크 목록 | Y | ✅ |
| PATCH | `/api/family-protection/settings` | 설정 변경 | Y | ✅ |
| POST | `/api/family-protection/links` | 초대 링크 생성 | Y | ✅ |
| POST | `/api/family-protection/links/:linkId/accept` | 링크 수락 | Y | ✅ |
| POST | `/api/family-protection/links/:linkId/revoke` | 링크 해제 | Y | ✅ |
| POST | `/api/family-protection/presence/heartbeat` | 피보호자 하트비트 | Y | ✅ |
| POST | `/api/family-protection/presence/missed-call` | 부재중 전화 기록 | Y | ✅ |
| POST | `/api/family-protection/ward/risky-site` | 위험 URL 신고 | Y | ✅ |
| POST | `/api/family-protection/alert/call` | 전화 알림 | Y | ✅ |
| POST | `/api/family-protection/ward/call-event` | 통화 이벤트 | Y | ✅ |
| POST | `/api/family-protection/ward/remote-app` | 원격앱 리포트 | Y | ✅ |
| GET | `/api/family-protection/catalog/government-hotlines` | 정부 핫라인 | N | ✅ |
| GET | `/api/family-protection/catalog/remote-control-apps` | 원격앱 카탈로그 | N | ✅ |
| POST | `/api/family-protection/links/:linkId/bank-consent/request` | 은행 동의 요청 | Y | ✅ |
| POST | `/api/family-protection/links/:linkId/bank-consent/respond` | 은행 동의 응답 | Y | ✅ |
| POST | `/api/family-protection/ward/bank-transaction` | 은행 거래 기록 | Y | ✅ |
| POST | `/api/family-protection/webhook/openbanking/transaction` | 오픈뱅킹 웹훅 | P (secret) | ✅ |
| POST | `/api/family-protection/cron/check-elder` | elder 보호 cron | P (secret) | ✅ |
| POST | `/api/family/invite` | 가족 초대 alias | Y | ✅ |
| GET | `/api/family-cross-security/dashboard` | 교차 보안 대시보드 | Y | ✅ |
| POST | `/api/family-cross-security/threats` | 위협 신고 | Y | ✅ |
| POST | `/api/family-cross-security/state` | 배터리/보안 상태 동기화 | Y | ✅ |
| GET | `/api/family-cross-security/state` | 그룹 상태 조회 | Y | ✅ |
| POST | `/api/family-cross-security/threats/:id/resolve` | 위협 해결 확인 | Y | ✅ |

### 2.9 메모장

| Method | Endpoint | 기능 | 인증필요 | 완성여부 |
|--------|----------|------|----------|----------|
| GET | `/api/memo/meta` | 메모 메타 | Y | ✅ |
| POST | `/api/memo/` | 메모 생성 | Y | ✅ |
| GET | `/api/memo/` | 메모 목록 | Y | ✅ |
| GET | `/api/memo/search` | 메모 검색 | Y | ✅ |
| GET | `/api/memo/link-preview` | URL 미리보기 | Y | ✅ |
| POST | `/api/memo/share-receive` | 공유 메모 수신 | Y | ✅ |
| GET | `/api/memo/:id` | 메모 단건 | Y | ✅ |
| PUT | `/api/memo/:id` | 메모 수정 | Y | ✅ |
| DELETE | `/api/memo/:id` | 메모 삭제 | Y | ✅ |
| POST | `/api/memo/:id/reminder` | 리마인더 설정 | Y | ✅ |

### 2.10 B2B/기업

| Method | Endpoint | 기능 | 인증필요 | 완성여부 |
|--------|----------|------|----------|----------|
| GET | `/api/b2b/enterprise/me` | 기업 컨텍스트 | Y | ✅ |
| POST | `/api/b2b/enterprise/setup` | 기업 초기 설정 | Y | ✅ |
| POST | `/api/b2b/cart/lines` | 카트 라인 추가 | Y | ✅ |
| PATCH | `/api/b2b/cart/lines/:lineId` | 카트 라인 수정 | Y | ✅ |
| DELETE | `/api/b2b/cart/lines/:lineId` | 카트 라인 삭제 | Y | ✅ |
| GET | `/api/b2b/cart/invoice-preview` | 청구서 미리보기 | Y | ✅ |
| POST | `/api/b2b/cart/checkout-validate` | 결제 검증 | Y | ✅ |
| GET | `/api/b2b/enrollment/status` | 등록 상태 | Y | ✅ |
| POST | `/api/b2b/enrollment/documents` | 등록 서류 업로드 | Y | ✅ |
| POST | `/api/b2b/enrollment/submit` | 등록 제출 | Y | ✅ |
| GET | `/api/b2b/enterprise/branding` | 브랜딩 조회 | Y | ✅ |
| POST | `/api/b2b/enterprise/branding/logo` | 로고 업로드 | Y | ✅ |
| PATCH | `/api/b2b/enterprise/branding` | 브랜딩 수정 | Y | ✅ |
| GET | `/api/b2b/mock/e2e-pipeline` | E2E 파이프라인 | Y | ⚠️ mock |
| POST | `/api/b2b/cart/activate` | 카트 라인 활성화 | Y | ✅ |
| GET | `/api/b2b/membership-ui-context` | 멤버십 UI 컨텍스트 | Y | ✅ |
| POST | `/api/b2b/attribution/request` | 기업 귀속 요청 | Y | ✅ |
| PATCH | `/api/b2b/enterprise/members/:userId/role` | 멤버 역할 변경 | Y | ✅ |
| GET | `/api/b2b/enterprise/member-credentials` | 멤버 자격증명 | Y | ✅ |
| GET | `/api/b2b/enterprise/members` | 멤버 목록 | Y | ✅ |
| PATCH | `/api/b2b/enterprise/members/:userId` | 멤버 수정 | Y | ✅ |
| PATCH | `/api/b2b/enterprise/cart-lines/:lineId` | 기업 카트 라인 수정 | Y | ✅ |
| GET | `/api/b2b/enterprise/group-chat/messages` | 그룹 채팅 메시지 | Y | ✅ |
| POST | `/api/b2b/enterprise/group-chat/messages` | 그룹 채팅 전송 | Y | ✅ |
| GET | `/api/personal-combo/status` | 개인+기업 콤보 상태 | Y | ✅ |
| POST | `/api/personal-combo/verify-credentials` | 기업 자격 검증 | Y | ✅ |
| POST | `/api/personal-combo/mail/send-otp` | 기업 메일 OTP | Y | ✅ |
| POST | `/api/personal-combo/mail/verify-otp` | OTP 검증 | Y | ✅ |
| POST | `/api/personal-combo/subscribe` | 콤보 구독 | Y | ✅ |

### 2.11 결제/정산

| Method | Endpoint | 기능 | 인증필요 | 완성여부 |
|--------|----------|------|----------|----------|
| POST | `/api/payment/subscribe/complete` | PortOne 구독 결제 완료 | Y | ✅ |
| POST | `/api/payment/webhook` | PortOne 결제 웹훅 | P (signature) | ✅ |
| POST | `/api/payment/escrow/hold` | 에스크로 홀드 | Y | ⚠️ mock |
| GET | `/api/pricing/config` | 공개 요금 설정 | N | ✅ |
| GET | `/api/pricing/access` | 사용자 멤버십 접근 | Y | ✅ |
| GET | `/api/pricing/revenue-stats` | 관리자 매출 통계 | admin-console | ✅ |
| GET | `/api/admin/console/pricing-config/` | 관리자 요금 설정 조회 | admin-console | ✅ |
| PUT | `/api/admin/console/pricing-config/` | 관리자 요금 설정 저장 | admin-console | ✅ |
| GET | `/api/wallet/me` | 지갑 잔액·원장 | Y | ✅ |
| GET | `/api/wallet/withdrawal-account` | 출금 계좌 조회 | Y | ✅ |
| PUT | `/api/wallet/withdrawal-account` | 출금 계좌 설정 | Y | ✅ |
| POST | `/api/wallet/deposit-request` | 입금 요청 | Y | ✅ |
| POST | `/api/wallet/withdrawal-request` | 부분 출금 | Y | ✅ |
| POST | `/api/wallet/withdraw-all` | 전액 출금 | Y | ✅ |
| GET | `/api/broadcast-line/me` | 방송 회선 정보 | Y | ✅ |
| GET | `/api/broadcast-line/refund-policy` | 환불 정책 | Y | ✅ |
| POST | `/api/broadcast-line/checkout/prepare` | 결제 준비 | Y | ✅ |
| POST | `/api/broadcast-line/checkout/complete` | 결제 완료 | Y | ✅ |
| PATCH | `/api/broadcast-line/me` | 전화번호 변경 | Y | ✅ |
| PATCH | `/api/broadcast-line/toggle` | 방송 on/off | Y | ✅ |
| POST | `/api/broadcast-line/pause` | 일시정지+환불 | Y | ✅ |
| DELETE | `/api/broadcast-line/me` | 방송 회선 삭제 | Y | ✅ |
| GET | `/api/broadcast-line/access-check` | 기능 접근 확인 | Y | ✅ |
| POST | `/api/cron/subscription-billing` | 구독 정기결제 배치 | P (cron secret) | ✅ |
| POST | `/api/cron/personal-combo-reverify` | 콤보 재검증 배치 | P (cron secret) | ✅ |
| GET | `/api/vluer/me` | VLuer 프로필 | Y | ✅ |
| POST | `/api/vluer/referral-code/issue` | 추천 코드 발급 | Y | ✅ |
| POST | `/api/vluer/commission/preview` | 수수료 미리보기 | Y | ✅ |
| GET | `/api/vluer/dashboard` | 추천 대시보드 | Y | ✅ |
| GET | `/api/vluer/dashboard/org-map` | 조직도 | Y | ✅ |
| GET | `/api/vluer/dashboard/settlements` | 정산 내역 | Y | ✅ |
| POST | `/api/vluer/dashboard/simulate` | 수익 시뮬레이터 | Y | ✅ |
| GET | `/api/vluer/promo/apply/status` | 홍보 VLUER 신청 상태 | Y | ✅ |
| POST | `/api/vluer/promo/apply` | 홍보 VLUER 신청 | Y | ✅ |
| POST | `/api/vluer/code-change/request` | 코드 변경 요청 | Y | ✅ |
| POST | `/api/vluer/tier/sync` | 티어 동기화 | Y | ✅ |
| GET | `/api/vluer/upgrade/status` | 업그레이드 자격 | Y | ✅ |
| POST | `/api/vluer/upgrade` | VLuer 등급 업그레이드 | Y | ✅ |
| POST | `/api/vluer/tier/scheduler-run` | 티어 스케줄러 | P (secret) | ✅ |
| POST | `/api/vluer/code-change/:id/approve` | 코드 변경 승인 | P (admin device) | ✅ |

### 2.12 관리자/HQ

| Method | Endpoint | 기능 | 인증필요 | 완성여부 |
|--------|----------|------|----------|----------|
| GET | `/api/admin/device/me` | 관리자 기기 상태 | P (device header) | ✅ |
| POST | `/api/admin/device/pending` | 기기 등록 대기 | P | ✅ |
| POST | `/api/admin/device/authorize` | 기기 승인 | admin-device | ✅ |
| POST | `/api/admin/marketing/popups` | 마케팅 팝업 생성 | admin-device | ✅ |
| GET | `/api/admin/marketing/popups` | 팝업 목록 | admin-device | ✅ |
| POST | `/api/admin/notices/release` | 공지 발행 | admin-device | ✅ |
| GET | `/api/admin/notices` | 공지 목록 | admin-device | ✅ |
| POST | `/api/admin/console/login` | 관리 콘솔 로그인 | N | ✅ |
| GET | `/api/admin/console/me` | 관리자 정보 | admin-console | ✅ |
| GET | `/api/admin/console/users` | 사용자 목록 | admin-console | ✅ |
| PATCH | `/api/admin/console/users/:userId` | 사용자 수정 | admin-console | ✅ |
| GET | `/api/admin/console/posts` | 공지·팝업·피드 | admin-console | ✅ |
| POST/PATCH/DELETE | `/api/admin/console/posts/*` | 콘텐츠 CRUD | admin-console | ✅ |
| GET | `/api/admin/console/onboarding/stats` | 온보딩 통계 | admin-console | ✅ |
| GET | `/api/admin/console/onboarding/manual-review` | 수동 심사 큐 | admin-console | ✅ |
| POST | `/api/admin/console/onboarding/manual-review/:id/resolve` | 심사 처리 | admin-console | ✅ |
| GET | `/api/admin/console/health` | 시스템 헬스 | admin-console | ✅ |
| POST | `/api/admin/console/health/test-notification` | 알림 테스트 | admin-console | ✅ |
| POST | `/api/admin/console/health/test-scanner` | PortOne 설정 테스트 | admin-console | ✅ |
| POST | `/api/admin/hq/login` | HQ 로그인 | N | ✅ |
| GET | `/api/admin/hq/me` | HQ 사용자 | super-admin | ✅ |
| GET/PUT | `/api/admin/hq/home-layout` | HQ 홈 레이아웃 | super-admin | ✅ |
| GET | `/api/v1/admin/corporate-attribution/pending` | 기업 귀속 대기 | admin-device | ✅ |
| GET | `/api/v1/admin/onboarding/stats` | 온보딩 통계 | admin-device | ✅ |
| GET | `/api/v1/admin/onboarding/manual-review` | 수동 심사 | admin-device | ✅ |
| POST | `/api/v1/admin/onboarding/resolve` | 심사 처리 | admin-device | ✅ |
| POST | `/api/v1/admin/corporate-attribution/approve` | 귀속 승인 | admin-device | ✅ |

### 2.13 파일/미디어·오피스·기타

| Method | Endpoint | 기능 | 인증필요 | 완성여부 |
|--------|----------|------|----------|----------|
| GET | `/api/health` | API 헬스체크 | N | ✅ |
| GET | `/` | API 안내 텍스트 | N | ✅ |
| POST | `/api/office/email-webhook` | 인바운드 메일 웹훅 | P (secret) | ✅ |
| GET | `/api/office/marketing/active-popup` | 활성 팝업 | Y | ✅ |
| GET | `/api/office/notices/latest` | 최신 공지 | Y | ✅ |
| GET | `/api/office/files` | 사용자 파일 | Y | ✅ |
| GET | `/api/office/email-inbox` | 메일 수신함 | Y | ✅ |
| GET | `/api/office/email-sent` | 발신 메일 | Y | ✅ |
| POST | `/api/office/scan-upload` | 스캔 PDF 업로드 | Y | ✅ |
| POST | `/api/office/remote-control` | 원격 제어 작업 | Y | ✅ |
| GET | `/api/office/remote-control/queue` | 원격 제어 큐 | Y | ✅ |
| GET | `/api/office/remote-control/agents` | PC 에이전트 목록 | Y | ✅ |
| POST | `/api/office/media/upload` | 미디어 캠페인 업로드 | Y | ✅ |
| GET | `/api/office/media/campaigns/:id` | 미디어 캠페인 | Y | ✅ |
| GET | `/api/office/media/files/:campaignId/:fileName` | 미디어 파일 | Y | ✅ |
| GET~PATCH | `/api/office/pos-ledger/*` | POS 원장 (6 endpoints) | Y | ✅ |
| GET~PUT | `/api/office/excel/*` | AI 엑셀 워크북 (7 endpoints, §2.6.1 참고) | Y | ⚠️ generate=mock |
| POST | `/api/mail/accounts/provision` | 메일 계정 생성 | Y | ✅ |
| POST | `/api/mail/send` | 메일 발송 | Y | ✅ |
| GET | `/api/documents/templates` | 문서 템플릿 | N | ✅ |
| GET/POST | `/api/vault/items`, `/api/vault/connections` | 금고 | Y | ✅ |
| POST | `/api/assets/scan-upload` | 자산 업로드 | Y | ✅ |
| GET | `/api/assets/:assetId` | 자산 메타 | Y | ✅ |
| GET | `/api/assets/mock/:key` | mock 스토리지 | Y | ⚠️ mock |
| POST | `/api/live/endpoints` | 라이브 스트림 | Y | ✅ |
| GET | `/api/live/embed/:platform/:streamId` | 임베드 메타 | Y | ✅ |
| POST | `/api/iot/pc-agent/session` | PC 에이전트 세션 | Y | ✅ |
| POST | `/api/iot/print-jobs` | 인쇄 작업 | Y | ✅ |
| POST | `/api/iot/fax-jobs` | 팩스 작업 | Y | ✅ |
| GET | `/api/iot/jobs/:jobId` | 원격 작업 상태 | Y | ✅ |
| GET | `/api/home/layout` | 홈 레이아웃 | N | ✅ |
| GET | `/api/vouch/inbox` | 보증 인박스 | Y (Bearer) | ✅ |
| POST | `/api/vouch/request` | 보증 요청 | Y | ✅ |
| POST | `/api/vouch/:id/approve` | 보증 승인 | Y | ✅ |
| POST | `/api/vouch/:id/reject` | 보증 거절 | Y | ✅ |
| POST | `/api/fraud/*` | 사기 분석·증거 (6 endpoints) | Y | ✅ |
| POST/GET | `/api/campaign/*` | 체험단 캠페인 (18 endpoints) | Y (1건 N) | ⚠️ |
| GET | `/api/active-board/` | 액티브보드 | Y | ✅ |
| WS | `/api/office/ws/agent` | PC 에이전트 WebSocket | P | ✅ |

**추가 발견 — 보안 주의:**
- `POST /api/campaign/matches/check-overdue` — **인증 없음** (🔴 공개 cron 의도 추정, 미보호)

---

## 3. 미완성/버그 항목 체크

### 3.1 기능별 상태 요약

| 기능 | 상태 | 근거 |
|------|------|------|
| 인증·JWT·OAuth | ✅ | `auth.ts`, `authV1.ts`, scrypt 해시 |
| PortOne 본인인증 가입 | ✅ | `identity/portone/complete` |
| 회원탈퇴 | ❌ | UI만 (`ProfilePanel.jsx`), API 없음 |
| 채팅/DM | ✅ | Bearer + Prisma |
| 디지털명함·공개 PNG | ✅ | `cards.ts`, `cardV1.ts` |
| Wallet Pass | ⚠️ | `wallet-pass` stub |
| 쇼핑·PortOne 결제 | ⚠️ | 코드 완성, 실키·웹훅 ENV 필요 |
| B2B 기업 | ✅ | 24+ endpoints |
| VLuer 2단계 추천 | ⚠️ | UI·정산 완료, `referralChannel` DB 미영구 저장(런타임 추론) |
| 홍보 VLUER 신청 | ✅ | `promo/apply` + UI |
| 가족보호 | ✅ | FCM·오픈뱅킹 웹훅 |
| 브이밍 AI | ⚠️ | GEMINI_API_KEY 없으면 mock 폴백 |
| **AI 엑셀 생성 (MVP)** | ⚠️ | `/api/office/excel/workbooks/generate` mock · www 웹 제작 전용 |
| **PPT AI 제작** | ❌ | 제거됨 — 저장·공유·인쇄만 (`vaultFileActions`, `remote-control`) |
| PPT/PDF 자료실 | ✅ | 업로드·메일 인입·공유·인쇄·팩스 |
| 파일 스토리지 | ⚠️ | 기본 `FILE_STORAGE_PROVIDER=mock` |
| FCM 푸시 | ⚠️ | 구현됨, credentials 미설정 시 skip |
| 관리자 콘솔/HQ | ✅ | Bearer·device gate |
| Android 오버레이 | ⚠️ | `apps/android` 존재, 스토어 배포 ❌ 미확인 |

### 3.2 코드 품질 점검

| 점검 항목 | 결과 |
|-----------|------|
| API 응답 에러 처리 | ✅ 대부분 try/catch + JSON error (일부 webhook은 200 + error body) |
| ENV 변수 하드코딩 | ⚠️ `vmingConsentCrypto.ts` 기본키 `"vlue-dev-consent-key-change-in-production!!"`; `OPENBANKING_WEBHOOK_SECRET=dev-openbanking-secret` (.env.example) |
| `console.log` 제거 | ⚠️ API·서비스 40+ 파일에 `console.log/warn/error` 잔존 (프로덕션 부팅·웹훅·cron 로그) |
| TODO/FIXME 주석 | ✅ `apps/api` 내 TODO/FIXME 없음 (전체 repo placeholder 텍스트만) |
| 미연결 라우터 | ✅ `api.ts` 50개 모듈 마운트 (`ppt.ts` 제거 반영) |
| 빈 컨트롤러 함수 | ❌ 미확인 (개별 핸들러 본문 전수 검사 미실시) |
| TypeScript 타입 에러 | ✅ `npm run api:build` 성공 (2026-06-02) |
| 이중 인증 체계 | 🔴 `X-VLUE-User-Id` vs `Authorization: Bearer` 혼용 — 보안 일관성 검토 필요 |
| 공개 cron 엔드포인트 | 🔴 `POST /api/campaign/matches/check-overdue` 인증 없음 |

### 3.3 Mock/Stub 엔드포인트 목록

- `POST /api/cards/:cardId/mock-approve`
- `POST /api/payment/escrow/hold` (PG_PROVIDER=mock)
- `POST /api/office/excel/workbooks/generate` (AI 엑셀 MVP — mock Agent)
- `GET /api/assets/mock/:key`
- `GET /api/b2b/mock/e2e-pipeline`
- `POST /api/campaign/demo/reset`
- `GET /api/v1/card/wallet-pass/:cardId`

---

## 4. 출시 전 필수 체크리스트

### [보안]

| 항목 | 상태 | 근거 |
|------|------|------|
| JWT 시크릿 ENV 분리 | ✅ | `JWT_ACCESS_SECRET` — `productionEnv.ts` production 필수 검증 |
| 비밀번호 bcrypt 해시 | ⚠️ | **bcrypt 아님** — Node `scrypt` 사용 (`lib/passwordHash.ts`), 동등 보안 수준 |
| SQL Injection 방어 | ✅ | Prisma ORM 파라미터화 쿼리 |
| CORS 설정 | ✅ | `hono/cors` + `CORS_ORIGIN` (`index.ts`) |
| Rate Limiting | ❌ | 코드베이스에 rate-limit 미구현 |
| HTTPS 강제 리다이렉트 | ❌ | API/웹 서버 레벨 HTTPS redirect 미구현 (플랫폼·CDN 위임 추정, ❌ 미확인) |

### [성능]

| 항목 | 상태 | 근거 |
|------|------|------|
| 이미지 최적화 | ⚠️ | `loading="lazy"` 다수, webp 데모 URL — CDN/리사이즈 파이프라인 ❌ 미확인 |
| API 응답 캐싱 | ⚠️ | pricing config 파일 캐시, cardV1 Cache-Control 일부 — 전역 Redis API 캐시 없음 |
| DB 인덱스 | ✅ | schema에 `@@index` 113건 |
| 페이지네이션 | ⚠️ | `lettering`, `admin/console/users`, `vluer/settlements` 등 일부만 — 채팅·피드 등 ❌ 미확인 |

### [결제]

| 항목 | 상태 | 근거 |
|------|------|------|
| PortOne 실서버 키 연동 | ⚠️ | `PORTONE_API_KEY/SECRET` 코드 연동 완료, 실키 설정은 배포 환경 의존 |
| Webhook 엔드포인트 | ✅ | `POST /api/payment/webhook` + `PORTONE_WEBHOOK_SECRET` |
| 결제 실패 롤백 | ⚠️ | `portoneSubscribeComplete.ts`, `shopPaymentComplete.ts` — dev bypass 분기 존재, 전체 롤백 시나리오 ❌ 미확인 |

### [푸시알림]

| 항목 | 상태 | 근거 |
|------|------|------|
| FCM 서버키 연동 | ⚠️ | `fcmNotificationService.ts` — credentials 없으면 skip |
| 푸시 발송 함수 | ✅ | `sendMulticastPush`, calendar·family·device 경로 |
| 토픽 구독 | ❌ | FCM topic subscribe 코드 없음 (개별 토큰 multicast만) |

### [법적 필수]

| 항목 | 상태 | 근거 |
|------|------|------|
| 개인정보처리방침 페이지 | ⚠️ | `web/src/legal/vlueTermsArticles.js` 약관 본문, 마케팅 Footer 링크는 `view: 'home'` — **독립 정책 페이지 ❌ 미확인** |
| 이용약관 페이지 | ⚠️ | 온보딩(`VlueOnboarding.jsx`) 내 통합 동의 UI — **독립 URL 페이지 ❌ 미확인** |
| 마케팅 동의 분리 | ❌ | `terms/accept` 단일 `termsVersion` — 마케팅 수신 동의 별도 필드/엔드포인트 없음 |
| 만 14세 미만 가입 제한 | ❌ | `birthDate` 수집(`identityPortone.ts`)하나 연령 게이트 로직 없음 |

---

## 5. 출시 우선순위 로드맵

### [즉시 수정 필요 — 출시 블로커]

1. **AI 엑셀 생성 실서비스화** — `POST /api/office/excel/workbooks/generate` mock → Gemini/ExcelJS Agent 연동 (초기 서비스 핵심)
2. **프로덕션 ENV 실키 설정** — `DATABASE_URL`, `JWT_ACCESS_SECRET`, `PORTONE_API_SECRET`, `PORTONE_WEBHOOK_SECRET`, `FILE_STORAGE_PROVIDER=s3` + S3 키
3. **회원탈퇴 API 구현** — UI(`ProfilePanel`)만 있고 백엔드 없음
4. **인증 없는 공개 엔드포인트 보호** — `POST /api/campaign/matches/check-overdue`
5. **이중 인증 체계 정리** — `X-VLUE-User-Id` vs JWT Bearer 혼용
6. **만 14세 미만 가입 제한** — PortOne `birthDate` 연령 게이트
7. **마케팅 수신 동의 분리** · **약관/개인정보 독립 페이지**

### [출시 후 1주일 내 패치]

1. API Rate Limiting (로그인·본인인증·웹훅)
2. `referralChannel` DB 영구 저장 (현재 코드 추론 기반)
3. FCM credentials 프로덕션 연동 + 토픽 구독(공지 브로드캐스트)
4. `console.log` 프로덕션 로거 교체 (structured logging)
5. 채팅·피드·메모 목록 페이지네이션 표준화
6. `VMING_CONSENT_ENC_KEY` 프로덕션 강제 + dev 기본키 제거
7. 홍보 VLUER 심사 중 사용자 수익 계산기 UX (계산기 버튼 추가 완료)

### [출시 후 1개월 내 추가]

1. Wallet Pass 실구현 (현재 stub ZIP)
2. AI PPT 제작 기능 — **출시 범위 외** (필요 시 별도 로드맵)
3. HTTPS 강제 및 HSTS (리버스 프록시 또는 미들웨어)
4. 이미지 CDN·리사이즈 파이프라인
5. Android/iOS 스토어 정식 배포 파이프라인
6. 에스크로 실 PG 연동 (`PG_PROVIDER` mock → portone)
7. 결제 실패 전체 롤백·멱등성 감사

---

## 6. 실서버 배포 명령어 모음

> 출처: `package.json`, `apps/api/package.json`, `web/package.json`, `packages/db/package.json`

### 6.1 사전 준비

```bash
# 로컬 DB (선택)
docker compose up -d

# 프로덕션 ENV 검증
npm run production:ready
# 또는 배포 락
npm run deploy:lock
```

### 6.2 빌드

```bash
# 프론트엔드만
npm run build
# 또는
npm run web:build

# API + 의존 패키지 전체
npm run api:build
# (= db build → shared build → api tsc)

# 프론트+API
npm run build:all
```

### 6.3 DB 마이그레이션

```bash
# 개발 마이그레이션 생성·적용
npm run db:migrate

# 프로덕션 배포 (CI/CD)
npm run db:deploy

# 안전 배포 (스크립트 래퍼)
npm run db:deploy:safe

# Prisma Client 생성
npm run db:generate
# 또는
npm run db:generate:safe

# 시드 데이터
npm run db:seed
npm run seed:test-accounts
npm run seed:admin-account
```

### 6.4 서버 시작

```bash
# API 개발
npm run api:dev
# API 프로덕션 (빌드 후)
npm run start -w @vlue/api
# → node dist/index.js (PORT 기본 8788)

# Web 개발
npm run dev
# Web 프로덕션 (정적)
npm run start -w @vlue/web
# → serve dist -s -l 8080

# PC 에이전트
npm run pc-agent:start
```

### 6.5 테스트·검증

```bash
npm run api:test:core
npm run api:test:policy
npm run api:test:signup
npm run shared:typecheck
```

### 6.6 헬스체크 엔드포인트

| Endpoint | 용도 |
|----------|------|
| `GET /api/health` | 공개 API 헬스 (`{ ok, service, time }`) |
| `GET /api/admin/console/health` | 관리 콘솔 시스템 헬스 (admin-console Bearer 필요) |
| `GET /` | API 루트 안내 텍스트 |

### 6.7 Railway/클라우드 참고

- API: `apps/api/railway.toml` 존재
- Web: `web/.env.railway.example` 존재
- 프로덕션 ENV: `NODE_ENV=production` 또는 `VLUE_PRODUCTION_LOCK=1` 시 `assertProductionEnvLocked()` 실행

---

## 부록: 스캔 메타데이터

| 항목 | 값 |
|------|-----|
| API 라우트 파일 | 53개 (`ppt.ts` 제거) |
| REST 엔드포인트 | ~272개 (PPT 8건 제거) |
| Prisma 모델 | 93개 (`PptJob` 레거시·미사용) |
| Web 컴포넌트 (jsx) | 171개 |
| AI PPT 제작 API/UI | ❌ 제거 (2026-06-02) |
| AI 엑셀 MVP | `web_excel` + `/api/office/excel/*` |
| TypeScript 빌드 | ✅ 통과 |
| `.env.example` | 4개 (root, web, api, pc-agent) |

---

*본 보고서는 실제 코드베이스 스캔 결과만 반영하였으며, 배포 인프라(Railway/Cloudflare HTTPS 등) 세부 설정은 ❌ 미확인 항목으로 표기하였습니다.*
