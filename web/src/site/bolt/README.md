# bolt.new 마케팅 사이트 (web2 복원본)

`web2/` 폴더의 bolt.new 코드를 **소스맵에서 원본 TSX로 복원**해 둔 디렉터리입니다.

## 재추출 (web2 갱신 시)

```bash
node scripts/extract-web2-sources.mjs
```

## 진입점

- `VlueMarketingApp.jsx` → `./bolt/App.tsx`
- 스타일: `./bolt/index.css` (Tailwind + hero 유틸)

## 메뉴별 페이지

| view | 파일 |
|------|------|
| home | `pages/HomePage.tsx` + `sections/*` |
| about | `pages/AboutPage.tsx` |
| news | `pages/NewsPage.tsx` |
| events | `pages/EventsPage.tsx` |
| support | `pages/SupportPage.tsx` |
| resources | `pages/ResourcesPage.tsx` (개인케이스) |
| pricing | `pages/PricingPage.tsx` (+ App 내 PremiumHeroSection) |
| jobs | `pages/JobsPage.tsx` |
| shopping | `pages/ShoppingPage.tsx` |
| mail | `pages/SecureMailPage.tsx` |
| search | `pages/SearchPage.tsx` |
| download | `pages/DownloadPage.tsx` |
| safezone | `pages/SafeZonePage.tsx` |
| mypage | `pages/MyPage.tsx` |
| bizcard | `pages/BusinessCardPage.tsx` |

## 통합 시 최소 수정

- `App.tsx`: URL `#about` 등 해시 ↔ view 동기화
- `types/index.ts`: web2에 비어 있어 view 유니온 타입 추가
- `index.css`: web2 `index.css`는 Vite 컴파일본만 있어 Tailwind 소스로 대체

이후 수정은 이 `bolt/` 트리에서 진행하면 됩니다.

## www vs /app 분리

| URL | 셸 | 수정 위치 |
|-----|-----|----------|
| `http://localhost:5173/` · `#pricing` | 마케팅 (`VlueMarketingApp`) | **`site/bolt/`만** |
| `http://localhost:5173/app` | 슈퍼앱 (`App.jsx`) | `src/components/`, 앱 화면 |

인증신청 빅푸시·명함 데모: `LetteringMarketingDemo.tsx` → `LetteringCallScreenPreview`(`callUi="native"`) + CSS 통화 UI(`LetteringNativeCallScreen`, `marketing-native-call.css`) + 앱 Lettering 명함·애니메이션
