/**
 * VLUE V1 (MVP) 출시 범위 — V2 기능 격리 플래그
 * @see archive-v2/README.md
 */

/** @typedef {'shopping'|'auction'|'events'|'jobs'|'mail-settings'|'mail'|'exceleditor'} WebExcludedView */

/** @type {ReadonlySet<string>} */
export const V1_WEB_EXCLUDED_VIEWS = new Set([
  "shopping",
  "auction",
  "events",
  "jobs",
  "mail-settings",
  "mail",
  "exceleditor"
]);

/** @type {ReadonlySet<string>} */
export const V1_APP_EXCLUDED_PAGES = new Set([
  "list",
  "room",
  "feed",
  "manage",
  "blueai",
  "subhub",
  "mypage",
  "memo",
  "calendar"
]);

/** @param {string} view */
export function isWebViewV1Enabled(view) {
  const v = String(view || "");
  if (V1_WEB_EXCLUDED_VIEWS.has(v)) return false;
  const shellKey = WEB_VIEW_SHELL_KEY[v];
  if (shellKey && v1WebShell[shellKey] === false) return false;
  return true;
}

/** MVP — 웹 AI엑셀에디터 노출 여부 */
export function isWebAiExcelEnabled() {
  return v1WebShell.aiExcel && isWebViewV1Enabled("exceleditor");
}

/** MVP — PC 설치형 프로그램 다운로드 노출 여부 (V2 채팅 연동 시) */
export function isWebPcDownloadEnabled() {
  return Boolean(v1WebShell.pcInstaller);
}

/** @param {string} page */
export function isAppPageV1Enabled(page) {
  return !V1_APP_EXCLUDED_PAGES.has(String(page || ""));
}

/** @param {string} view @returns {string} V1-safe fallback */
export function coerceWebViewForV1(view) {
  const v = String(view || "home");
  return isWebViewV1Enabled(v) ? v : "home";
}

/** @param {string} page @returns {string} V1-safe fallback */
export function coerceAppPageForV1(page) {
  const p = String(page || "main");
  return isAppPageV1Enabled(p) ? p : "main";
}

export const v1AppShell = {
  /** V1 — 비로그인 둘러보기 없음. 설치·실행 시 로그인/가입 화면부터 */
  guestBrowse: false,
  callBigPush: true,
  /** 홈 — 등록 친구 블루 쇼케이스 목록 */
  friendShowcaseFeed: true,
  /** 하단 바 — 통화 목록 시트 */
  callShowcaseHistoryNav: true,
  showcaseStyleSettings: true,
  /** V1 — 배너 소셜 오버레이 (좋아요·댓글·공유·더보기·로고·상태/한줄) */
  showcaseSocialOverlay: true,
  instagramFeed: true,
  customCallProfile: true,
  digitalBizcard: true,
  familyProtection: true,
  personalVault: true,
  /** 개인케이스 — V1 탭(명함저장·저장된케이스·내문서) */
  vaultTabsMinimal: true,
  contacts: true,
  notificationInbox: true,
  /** V1 — 홈 본문 알림 패널 대신 하단 바 아이콘 사용 */
  notificationBottomNavOnly: true,
  /** V1 — 지인·홍보 추천 프로그램 UI */
  referralProgram: false,
  /** V1 — VLUER 파트너 섹션 */
  vluerPartnerSection: false,
  phoneSearchPortal: true,
  /** 메인 본문 — 업체·명함 검색바 (헤더와 분리) */
  homeBizSearch: true,
  /** 메인 헤더 — 명함 스캐너만 (검색·QR 숨김) */
  homeHeaderMinimal: true,
  /** 메인 빅푸시 — 일상/비즈 탭 숨김 */
  callBigPushTierTabs: true,
  /** 명함 스캐너 (문서 스캔 → 개인 자료실) */
  bizcardScanner: true,
  webViewProfile: true,
  kakaoAlimtalk: true,
  chat: false,
  mailTalk: false,
  vumingAi: false,
  shoppingCart: false,
  mypageShop: false,
  walletCash: false,
  personalMail: false,
  printerRemote: false,
  storeScanner: false,
  voiceVideoCall: false,
  vlueStore: false,
  auction: false,
  /** 홈 — 핫플레이스·카테고리·스토어 피드·광고 배너 (V2) */
  homeLegacyFeed: false
};

export const v1WebShell = {
  phoneSearchPortal: true,
  webViewProfile: true,
  basicAccountSettings: true,
  familyProtection: true,
  resources: true,
  pricing: true,
  download: true,
  /**
   * V1 — www 웹 구독 결제(PostSignupPaymentModal) 비활성.
   * 가입·결제는 VLUE 앱에서만. 웹 결제는 V2.
   */
  webSubscribePayment: false,
  /** V2 — PC 설치형 (채팅 연동 시 지원 예정) */
  pcInstaller: false,
  vlueStore: false,
  auction: false,
  jobs: false,
  events: false,
  vlueEmail: false,
  aiExcel: false,
  /** V1 — 우측 하단 AI 고객센터 FAB 숨김 */
  marketingFabChat: false
};

/** hash view → v1WebShell 키 (없으면 셸 검사 생략) */
const WEB_VIEW_SHELL_KEY = Object.freeze({
  shopping: "vlueStore",
  auction: "auction",
  events: "events",
  jobs: "jobs",
  "mail-settings": "vlueEmail",
  mail: "vlueEmail",
  exceleditor: "aiExcel",
  resources: "resources",
  pricing: "pricing",
  download: "download",
  family: "familyProtection"
});

/** 홈 — 스토어·이벤트 블록 */
export function isWebHomeCommerceEnabled() {
  return Boolean(v1WebShell.vlueStore || v1WebShell.events);
}
