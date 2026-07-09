# VLUE archive-v2 — V2 기능 격리 백업

> **슬로건:** 모르는 번호에 속지 마라, 아는 번호라도 확인하라!  
> V1은 일상 감성 프로필(무료) + 디지털 인증명함(유료) 이원화.  
> 이 폴더는 **삭제 금지** — V2 업데이트 시 재활성화용 백업·격리 영역입니다.

## 격리 방식 (메인 소스)

1. **물리 백업:** `npm run archive:v2-sync` → 이 폴더로 복사
2. **런타임 격리:** `web/src/lib/v1ReleaseScope.js` 플래그로 네비·라우트 비노출
3. **원본 파일:** 메인 트리에 유지 (import 깨짐 방지). V2 시 플래그만 켜면 복구

---

## V1 MVP — 유지 (Keep)

### 웹 (www)
| 기능 | 주요 경로 |
|------|-----------|
| 의심번호·전화 검색 포털 | `web/src/site/bolt/pages/SearchPage.tsx`, `HomePage.tsx` |
| 웹뷰 프로필 | `web/src/site/bolt/pages/BusinessCardPage.tsx`, `LetteringDigitalReception.jsx` |
| 기본 계정·보안 설정 | `VlueSettingsPanel.jsx`, `vlueAuthApi.js` |
| 가족보호 | `FamilyProtectionPage.tsx`, `familyProtection*.js` |
| 개인자료실 | `ResourcesPage.tsx` |
| 앱 다운로드 (모바일) | `DownloadPage.tsx`, `DownloadSection.tsx` |

### 앱 (/app)
| 기능 | 주요 경로 |
|------|-----------|
| 통화 빅푸시 + 드롭다운 | `CallBigPushOverlay.jsx`, `LetteringCallScreenPreview.jsx` |
| 인스타 단일 연동 / 커스텀 프로필 | `CallBigPushOverlay.jsx`, `letteringSettings.js` |
| 디지털 인증명함 (유료) | `LetteringDigitalReception.jsx`, `LetteringBizcard*.jsx` |
| 가족보호 | `FamilyProtectionRegister.jsx`, `FamilySecurityDashboard.jsx` |
| 개인 자료실 | `cardWalletStorage.js`, `ProfilePanel` 명함 지갑 |
| 전화번호부·친구 | `ContactFriendsPanel.jsx`, `FriendSearch.jsx` |
| 알림함 (채팅 제외) | `PushNotificationInbox.jsx` |
| 카카오 알림톡 트리거 | `phoneOutboundRules.js`, API `lettering` |

---

## V2 격리 — 웹 출시 제외

| 기능 | 백업 대상 (`archive-v2/web-marketing/`) |
|------|------------------------------------------|
| VLUE 스토어 | `web/src/site/bolt/pages/ShoppingPage.tsx`, `components/shopping/`, `MarketingMediaCommerceStore.tsx` |
| VLUE 경매 | `web/src/site/bolt/pages/AuctionPage.tsx`, `components/auction/` |
| 공식 채용 | `web/src/site/bolt/pages/JobsPage.tsx` |
| 지역 이벤트 | `web/src/site/bolt/pages/EventsPage.tsx` |
| VLUE 이메일 | `MarketingEmailSettingsPage.tsx`, `components/email/`, `mailTalk/` |
| AI 엑셀 에디터 | `ExcelEditorPage.tsx`, `OfficeExcelWorkshop.tsx` |
| PC 설치형 (Windows/macOS, 채팅 연동) | `vluePcInstaller.js`, `DownloadPage.tsx`, Electron `pc/` |

**API (백업 `archive-v2/api/routes/`):** `shop.ts`, `auction.ts`, `mailTalk.ts`, `office/excel`, `email-forwarding`

---

## V2 격리 — 앱 출시 제외

| 기능 | 백업 대상 (`archive-v2/web-app/`) |
|------|-----------------------------------|
| 개인 쇼핑카트 | `Subscription.jsx`, `StoreShoppingCartPanel.jsx`, `shoppingCartStorage.js` |
| 복합기 리모컨 | `office/OfficeRemoteModal.jsx`, `vlueOfficeApi.js` |
| 마이페이지(상점) | `MyPage.jsx` (상점 섹션), `VlueStoreShopSection.jsx` |
| 채팅 시스템 | `ChatList.jsx`, `ChatRoom.jsx`, `mailTalk/` |
| 브이밍 AI | `BlueAIChat.jsx`, `components/vming/`, `vmingApi.js` |
| 매장 스캐너 | `office/CsScannerScreen.jsx`, `csScanner*.js` |
| 음성·영상통화 | `ChatRoom.jsx` 보안통화 UI |

**App.jsx 하단 탭 V1:** 홈(메인)·친구·알림만 — 채팅·브이밍·쇼핑·마이페이지(상점) 숨김

---

## 복구 (V2)

1. `v1ReleaseScope.js`에서 해당 플래그 `true`로 변경
2. `Navbar.tsx` / `App.jsx` 네비 필터 제거 또는 플래그 해제
3. `archive-v2/`에서 diff 참고 후 필요 시 파일 병합

## 동기화

```bash
npm run archive:v2-sync
```

마지막 동기화: 수동 실행 전 — `scripts/sync-archive-v2.mjs` 참고
