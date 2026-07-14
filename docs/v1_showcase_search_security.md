# V1 쇼케이스 검색 보안 아키텍처

## 목적

보이스피싱·스패머·크롤러의 **이름·전화번호·#해시태그 Target Scraping**을 차단하고, 상호주의·옵트인 프라이버시·레이트 리밋으로 비즈니스 라운지 격을 유지한다.

## 모듈

| 파일 | 역할 |
|------|------|
| `middleware/SearchAuthInterceptor.ts` | 로그인·본인인증(CI)·활성 쇼케이스 상호주의 + 레이트리밋 게이트 |
| `services/showcase/SearchService.ts` | 해시태그/전화/이름/ID 검색 + PII 마스킹 |
| `services/showcase/SearchRateLimiter.ts` | 분당 10회 · 반복 시 suspended + SecuritySearchAlert |
| `migrations/20260714120000_showcase_search_privacy_guards` | 프라이버시·has_active_showcase·alerts |

## 상호주의 (Reciprocity)

1. **401 `LOGIN_REQUIRED`** — 비로그인 → `meta.popup=login`
2. **403 `IDENTITY_REQUIRED`** — `identityVerified` + `ciHash` 없음
3. **403 `SHOWCASE_REQUIRED`** — 본인 쇼케이스 미활성화 (`has_active_showcase`)
4. **403 `ACCOUNT_SUSPENDED`** — 계정/검색 잠금

## 프라이버시 필드 (기본 false)

- `is_phone_search_allowed` — 전화 다이렉트 검색 노출
- `is_name_search_allowed` — 실명 검색·리스트 이름
- `is_id_search_allowed` — 핸들 문의 CTA

### 해시태그 리스트 마스킹

| Case | 이름 | 전화 | CTA |
|------|------|------|-----|
| A 비허용 | `비공개 회원` | hidden | 아이디 문의만 (허용 시) |
| B 영업 허용 | 실명 | 전화 걸기 | 풀 노출 |

응답에 허용되지 않은 PII 필드는 **빈 문자열 / false**만 내려가며, DB 원본 전화·실명을 평문으로 넣지 않는다.

## Rate limit

- 슬라이딩 1분 / **10회** → **429**
- 1시간 내 429 **3회** → `accountStatus=suspended` + `security_search_alerts`

## API

```
GET  /api/lettering/showcase/tags/search?q=&mode=hashtag|phone|name|id
     → SearchAuthInterceptor
GET  /api/lettering/showcase/search-privacy
PUT  /api/lettering/showcase/search-privacy
GET  /api/admin/console/security-search-alerts
POST /api/admin/console/security-search-alerts/:id/ack
```

## 적용

```bash
cd packages/db && npx prisma migrate deploy
# 또는 SQL 마이그레이션 수동 적용 후
npx prisma generate
```

## 프론트

- `showcaseTagsApi.searchShowcaseByTag` → `vlueAuthFetch`
- 권한 실패 → `vlue-showcase-search-auth` 이벤트 → 토스트
- 설정 패널: 검색 공개 체크박스 3종
