# 실시간 미디어 커머스 — 프로덕션 배포 체크리스트

## 프로덕션 URL (2026-06-13 기준)

| 서비스 | URL | 비고 |
|--------|-----|------|
| **API (동작 중)** | https://vlueapi-production.up.railway.app | Cloudflare R2 Direct Upload |
| API 상태 | https://vlueapi-production.up.railway.app/api/media/video-upload/status | `configured:true` 확인됨 |
| **웹 (QA)** | https://vlueweb-production.up.railway.app | 쇼핑 `#shopping`, 앱 `/app` |
| www 티저 | https://www.vlue.kr | GitHub Pages Coming Soon (미디어 커머스 아님) |
| `api.vlue.kr` | — | DNS 미설정 (NXDOMAIN) — Railway CNAME 연결 전 |
| Supabase | https://ywhjhdpecwvaujiagaln.supabase.co | |

`api.vlue.kr` DNS 연결 전까지 E2E 테스트는 **Railway URL** 사용.  
`@vlue/web` Variables `VITE_API_URL=https://api.vlue.kr` (빌드 타임 — 변경 후 Redeploy 필수).

## 1단계 — DB / Storage

```bash
npm run db:deploy:safe          # baseline 이슈 시 prisma db execute 로 개별 SQL 적용
```

적용 마이그레이션:
- `20260602200000_auction_video_url`
- `20260602220000_live_vod_commerce`

**Cloudflare R2 버킷 (`vlue-product-media`):**
1. R2 → Create bucket → `vlue-product-media`
2. **Settings → Public access** — `r2.dev` 서브도메인 또는 커스텀 도메인 연결 → `R2_PUBLIC_BASE_URL`에 입력
3. **CORS** — 브라우저 Direct PUT 허용:
   - `AllowedOrigins`: `https://vlueweb-production.up.railway.app`, `https://www.vlue.kr`, `http://localhost:5173`
   - `AllowedMethods`: `PUT`, `GET`, `HEAD`
   - `AllowedHeaders`: `Content-Type`, `*`
4. **API Token** — R2 Read & Write → `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`

## 2단계 — Railway @vlue/api Variables

| Variable | 필수 | 용도 |
|----------|------|------|
| `DATABASE_URL` | ✅ | Supabase Postgres |
| `DIRECT_URL` | 권장 | Prisma migrate |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare R2 Presigned PUT |
| `R2_ACCESS_KEY_ID` | ✅ | R2 API 키 |
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 API 시크릿 |
| `R2_BUCKET_NAME` | ✅ | `vlue-product-media` |
| `R2_PUBLIC_BASE_URL` | ✅ | 퍼블릭 CDN URL (DB `video_url` 매핑) |
| `PORTONE_API_KEY` | ✅ | 에스크로 결제 |
| `PORTONE_API_SECRET` | ✅ | 에스크로 결제 |
| `LIVE_VOD_WEBHOOK_SECRET` | 권장 | 라이브 녹화 웹훅 |
| `JWT_ACCESS_SECRET` | ✅ | API 인증 |

## 2단계 — Railway @vlue/web Variables

| Variable | 권장값 |
|----------|--------|
| `VITE_API_URL` | `https://api.vlue.kr` |
| `VITE_PORTONE_USER_CODE` | `imp57735111` |

## 3단계 — E2E 테스트 (Railway URL)

1. **스크래핑:** https://vlueweb-production.up.railway.app/app → 상품 등록 → URL 붙여넣기

2. **5GB Direct Upload:** 파일 업로드 탭 → mp4  
   `GET https://vlueapi-production.up.railway.app/api/media/video-upload/status`

3. **라이브 UI:** YouTube/TikTok URL → 워터마크 + 가로/세로 레이아웃

4. **VOD 웹훅:**
   ```bash
   curl -X POST https://vlueapi-production.up.railway.app/api/live/webhook/recording-complete \
     -H "Content-Type: application/json" \
     -d '{"sessionId":"<uuid>","videoUrl":"https://...mp4","secret":"<LIVE_VOD_WEBHOOK_SECRET>"}'
   ```

5. **에스크로:** 「라이브 특가 구매」→ Iamport 팝업 → `ESCROW_HOLD`

## 추후 — 커스텀 도메인

- `api.vlue.kr` → Railway `@vlue/api` Custom Domain + DNS CNAME
- `www.vlue.kr` 런칭 시 GitHub Pages 티저 → Railway `@vlue/web` 전환
