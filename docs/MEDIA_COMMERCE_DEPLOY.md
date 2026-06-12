# 실시간 미디어 커머스 — 프로덕션 배포 체크리스트

## 프로덕션 URL

| 서비스 | URL |
|--------|-----|
| 웹 (메인) | https://www.vlue.kr |
| API | https://api.vlue.kr |
| API Health | https://api.vlue.kr/api/health |
| Supabase | https://ywhjhdpecwvaujiagaln.supabase.co |

## 1단계 — DB / Storage

```bash
npm run db:deploy:safe
npm run db:supabase-product-media
```

적용 마이그레이션:
- `20260602200000_auction_video_url`
- `20260602220000_live_vod_commerce`
- `supabase/migrations/20260602210000_product_media_bucket.sql` (5GB, public read)

**Supabase Storage CORS** (Dashboard → Storage → Configuration):

```
https://www.vlue.kr
https://vlue.kr
http://localhost:5173
```

허용 메서드: `GET`, `HEAD`, `PUT`

## 2단계 — Railway @vlue/api Variables

| Variable | 필수 | 용도 |
|----------|------|------|
| `DATABASE_URL` | ✅ | Supabase Postgres |
| `DIRECT_URL` | 권장 | Prisma migrate |
| `SUPABASE_URL` | ✅ | Presigned URL 발급 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Direct Upload |
| `PORTONE_API_KEY` | ✅ | 에스크로 결제 |
| `PORTONE_API_SECRET` | ✅ | 에스크로 결제 |
| `LIVE_VOD_WEBHOOK_SECRET` | ✅ | 라이브 녹화 웹훅 |
| `JWT_ACCESS_SECRET` | ✅ | API 인증 |

## 2단계 — Railway @vlue/web Variables

| Variable | 필수 |
|----------|------|
| `VITE_API_URL` | `https://api.vlue.kr` |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | anon key |
| `VITE_PORTONE_USER_CODE` | `imp57735111` |

## 3단계 — E2E 테스트

1. **스크래핑:** 상품 등록 → URL 붙여넣기 → 폼 자동완성  
   `GET https://api.vlue.kr/api/scrape-product?url=...`

2. **5GB Direct Upload:** 등록 → 파일 업로드 탭 → mp4 선택  
   `GET https://api.vlue.kr/api/media/video-upload/status`

3. **라이브 UI:** YouTube/TikTok/Instagram URL → 워터마크 + 가로/세로 레이아웃

4. **VOD 웹훅:**
   ```bash
   curl -X POST https://api.vlue.kr/api/live/webhook/recording-complete \
     -H "Content-Type: application/json" \
     -d '{"sessionId":"<uuid>","videoUrl":"https://...mp4","secret":"<LIVE_VOD_WEBHOOK_SECRET>"}'
   ```

5. **에스크로:** 라이브/VOD 시청 중 「라이브 특가 구매」→ Iamport 팝업 → `ESCROW_HOLD`
