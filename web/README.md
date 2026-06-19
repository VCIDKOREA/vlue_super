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

### Railway Build / Deploy (zooming-flow · @vlue/web)

| 설정 | 위치 | 값 |
|------|------|-----|
| Config file | Settings → General | **`web/railway.toml`** (필수) |
| Build Command | `web/railway.toml` 또는 비움 | `npm run build -w @vlue/shared && npm run build -w @vlue/web` |
| Start Command | Settings → **Deploy** | `npm run start -w @vlue/web` |
| Port | Settings → **Networking** | `8080` |

빌드가 `vite: not found` / `tsc: not found` 로 실패하면 Variables에  
`NIXPACKS_NODE_INSTALL_DEV_DEPS=true` 추가 후 Redeploy.

빌드가 `sync-pc-installer` / `verify-pc-installer` 로 실패하면 Variables 확인:

- `VLUE_PC_INSTALLER_URL` 은 **GitHub Release** 등 외부 URL만 사용  
  (`https://www.vlue.kr/downloads/...` 는 배포 전 순환 참조로 HTML이 받아져 실패함)
- 권장값: `https://github.com/VCIDKOREA/vlue_super/releases/download/pc-v1.0.0/VLUE-Setup-1.0.0.exe`
- `web/railway.toml` · `web/nixpacks.toml` 적용 여부 확인 후 Redeploy



공통 BM: `@vlue/shared` (`packages/shared`)


