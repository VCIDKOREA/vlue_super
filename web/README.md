# @vlue/web



VLUE 슈퍼앱 웹 클라이언트 (Vite + React).



## 스크립트



| 명령 | 설명 |

|------|------|

| `npm run dev` (루트: `npm run web:dev`) | 개발 서버 http://localhost:5173 |

| `npm run build` | `web/dist` 프로덕션 빌드 |

| `npm run preview` | 빌드 결과 미리보기 |



## 환경 변수



- 템플릿: `web/.env.example`

- 프로덕션: `web/.env.production` — **`VITE_API_URL=https://api.vlue.kr`**

- 로컬에서 프로덕션 API 붙이기: `web/.env` 에 동일 URL



구조·페이지 맵: `docs/WEB_OVERVIEW.md`

## www vs 슈퍼앱

| 주소 | 화면 |
|------|------|
| `/` | 마케팅 웹 (`src/site/`) |
| `/app` | VLUE 슈퍼앱 (`App.jsx`) |

프로덕션: `www.vlue.kr` → `/`, 앱은 `www.vlue.kr/app`

## API 연동



- 모든 REST 호출: `src/lib/apiBase.js` → `apiUrl("/api/...")`

- 로컬 API만: `VITE_API_URL` 비우기 + Vite proxy (`vite.config.js` → 8788)

- 프로덕션 API: `VITE_API_URL=https://api.vlue.kr`



## Railway @vlue/web Variables (권장)



```

VITE_API_URL=https://api.vlue.kr

VITE_SUPABASE_URL=https://ywhjhdpecwvaujiagaln.supabase.co

VITE_SUPABASE_ANON_KEY=<Dashboard anon key>

CORS는 @vlue/api 에 www.vlue.kr + Railway web URL 포함

```

Networking **Port 8080** + Start Command `npm run start -w @vlue/web` (502 방지)



공통 BM: `@vlue/shared` (`packages/shared`)


