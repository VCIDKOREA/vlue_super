# @vlue/web 구조 요약

> **확정 아키텍처:** [SERVICE_ARCHITECTURE.md](./SERVICE_ARCHITECTURE.md) — 웹(단독)·앱(제어)·@vlue/api·실시간 동기화

## 디렉터리

```
web/
├── index.html          # Vite 엔트리 HTML
├── vite.config.js      # dev 서버·/api 프록시·@vlue/shared alias
├── package.json        # @vlue/web
├── .env.production     # 프로덕션 빌드 ENV (gitignore)
├── .env.example        # ENV 템플릿 (커밋)
├── public/             # 정적 자산
├── dist/               # vite build 산출물
└── src/
    ├── main.jsx        # React 부트·라우트 분기(앱/HQ/관리자)
    ├── App.jsx         # 메인 셸(채팅·홈·마이페이지·온보딩 등)
    ├── config.js       # 프로덕션 ENV 검증·로그
    ├── styles.css
    ├── assets/
    ├── components/     # UI 화면
    ├── lib/            # API 클라이언트·스토리지·유틸
    ├── hooks/
    └── context/
```

## 환경 변수

| 파일 | 용도 |
|------|------|
| `web/.env` | 로컬 `npm run dev` (gitignore) |
| `web/.env.production` | `vite build` 시 주입 (gitignore) |
| `web/.env.example` | 팀 공유 템플릿 |

핵심 키:

| 변수 | 역할 |
|------|------|
| `VITE_API_URL` | REST/SSE 베이스 → `src/lib/apiBase.js` |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | DM Realtime |
| `VITE_CARD_PUBLIC_API_BASE` | 카카오 Feed·명함 PNG 공개 URL |
| `VITE_PORTONE_*` / `VITE_KAKAO_*` | 결제·로그인 |

## API 연동 패턴

- **단일 진입점**: `getApiBase()` / `apiUrl("/api/...")` (`src/lib/apiBase.js`)
- **인증 fetch**: `vlueAuthFetch` (`src/lib/vlueAuthHeaders.js`) — 401 시 refresh
- **SSE**: `startVlueSse` (`src/lib/vlueSse.js`) — `VITE_API_URL` + `/api/realtime/sse`
- **도메인 API 모듈**: `src/lib/*Api.js` (calendar, memo, shop, vming, office, …)

## 주요 페이지(컴포넌트)

| 영역 | 경로 | 파일 |
|------|------|------|
| 부트 | `#root` | `main.jsx` → `App.jsx` |
| 스플래시·온보딩 | 앱 초기 | `Splash.jsx`, `VlueOnboarding.jsx` |
| 로그인 | | `LoginScreen.jsx`, `KakaoLoginButton.jsx` |
| 홈·탭 | | `Home.jsx`, `ChatList.jsx`, `MyPage.jsx` |
| 채팅 | | `ChatRoom.jsx`, `VlueDmChat.jsx`, `BlueAIChat.jsx` |
| 캘린더·메모 | | `calendar/VlueCalendarScreen.jsx`, `memo/PersonalMemoScreen.jsx` |
| 쇼핑·구독 | | `PersonalFeed.jsx`, `Subscription.jsx`, `lib/shopApi.js` |
| 오피스 | | `office/*`, `lib/vlueOfficeApi.js` |
| 관리자 | URL gate | `AdminSecretApp.jsx` (`VITE_ADMIN_PATH`) |
| HQ | URL gate | `hq/SuperAdminHqApp.jsx` |

## www vs 앱 (셸 분기)

| URL | 화면 |
|-----|------|
| `https://www.vlue.kr/` | **마케팅 웹** (`web/src/site/`) |
| `https://www.vlue.kr/app` | **슈퍼앱** (`App.jsx`) |
| 로컬 `http://localhost:5173/` | 마케팅 |
| 로컬 `http://localhost:5173/app` | 슈퍼앱 |

로직: `web/src/lib/siteMode.js` · 진입: `main.jsx`

Bolt 원본 참고: 루트 `APP볼트 코드 APP.tsx` → `web/src/site/` 로 이관·확장 중

## 개발 vs 프로덕션

| 모드 | API 연결 |
|------|----------|
| `VITE_API_URL` 비움 | 동일 오리진 + Vite proxy `/api` → localhost:8788 |
| `VITE_API_URL=https://api.vlue.kr` | 직접 프로덕션 API (CORS 필요) |

프로덕션 빌드 기본값: `web/.env.production` 의 `VITE_API_URL=https://api.vlue.kr`
