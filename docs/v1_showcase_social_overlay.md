# V1 쇼케이스 소셜 오버레이 (1~6)

> **V1 출시 범위에 포함.** 유료 쇼케이스 배너 슬라이드에 인스타/숏폼형 액션 레일·좌하단 로고·상태/한줄설명을 노출한다.  
> 관련 QA: `docs/v1_mvp_final_qa_checklist.md` §13

## 배치

| # | 위치 | 기능 |
|---|------|------|
| 1 | 우하단 세로 위 | 좋아요 ♡ — 토글 + 카운트 |
| 2 | 그 아래 | 댓글 — SAM/숏폼형 바텀시트 (목록 + 입력) |
| 3 | 그 아래 | 공유 — 카톡 Share / 시스템 공유 |
| 4 | ⋯ | 더보기: 개인케이스 저장 · 신고 · BGM 음소거 |
| 5 | 좌하단 | 프로필/로고 아바타 |
| 6 | 5 옆 | 캡션·상태메시지·소개 한 줄 (말줄임, 탭 시 전체) |

## 노출 규칙

- **노출:** 통화 종료 후 다시보기 · 친구 쇼케이스 · 홈/설정 미리보기
- **비노출:** 실통화 중 (`socialOverlayEnabled=false`) · 디지털 인증명함 슬라이드 · 키패드 오픈 시
- **대상 슬라이드:** `banner` 타입만 (empty-slot·card·free 제외)

## 캡션·로고 우선순위

- **캡션:** 슬라이드 `overlayText`/`caption` → 스타일 `richCustom.bodyText`(소개 한 줄) → `card.statusMessage` → `companyIntro` → 앱 설정 상태메시지
- **아바타:** `resolveShowcasePeerAvatar` (플랫폼 피드 아바타) → `card.logoUrl` (브랜드 VLUE 에셋 제외) → 이니셜

## 권한·게이트

- 좋아요: 로그인 · UUID `ownerUserId` 있을 때 API / 미리보기는 로컬 토글
- 댓글: 로그인 후 작성 · 스팸 레이트리밋 (API)
- 공유·저장·신고·BGM: 기존 VLUE 유틸 재사용

## API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/lettering/showcase/social/:ownerUserId` | likeCount, likedByMe, comments[] |
| POST | `/api/lettering/showcase/social/:ownerUserId/like` | 토글 like |
| GET | `/api/lettering/showcase/social/:ownerUserId/comments` | 댓글 목록 |
| POST | `/api/lettering/showcase/social/:ownerUserId/comments` | 댓글 작성 |

`slideId` 쿼리/바디 선택(배너별 구분).

## FE 컴포넌트

- `ShowcaseBannerSocialLayer.jsx` — 오케스트레이션
- `ShowcaseSocialRail.jsx` — 1~4
- `ShowcaseBannerFooter.jsx` — 5·6
- `ShowcaseCommentSheet.jsx` — 2 바텀시트
- `ShowcaseMoreMenu.jsx` — 4 더보기
- `showcaseSocialApi.js` — HTTP 클라
- `ShowcaseCallCarousel.jsx` — `socialOverlayEnabled`

## DB

- `ShowcaseReaction` (like) — `showcase_reactions`
- `ShowcaseComment` — `showcase_comments`
- migration: `20260714180000_showcase_social_reactions_comments`
