# www.vlue.kr → Railway @vlue/web 연결

`www.vlue.kr`은 현재 **GitHub Pages Coming Soon** (`vcidkorea.github.io`)입니다.  
실서비스(마케팅·쇼핑·가입·AI 엑셀)를 열려면 **Railway `@vlue/web`** 으로 DNS를 전환합니다.

> `api.vlue.kr` 은 이미 Railway `@vlue/api`에 연결되어 있습니다.  
> API 가이드: [DNS_API_VLUE_KR_SETUP.md](./DNS_API_VLUE_KR_SETUP.md)

---

## 현재 DNS (2026-06-02 기준)

| 호스트 | 타입 | 값 | 비고 |
|--------|------|-----|------|
| `www` | CNAME | `vcidkorea.github.io` | **교체 대상** |
| `vlue.kr` (루트) | A | `185.199.108~111.153` | GitHub Pages IP — 선택적으로 나중에 `www` 리다이렉트 |

검증:

```bash
npm run verify:www-domain
```

---

## 1단계 — Railway `@vlue/web` Variables 확인

[Railway](https://railway.app) → 프로젝트 → **`@vlue/web`** → **Variables**

| Variable | 값 | 필수 |
|----------|-----|------|
| `VITE_API_URL` | `https://api.vlue.kr` | ✅ |
| `VITE_SUPABASE_URL` | `https://ywhjhdpecwvaujiagaln.supabase.co` | DM 사용 시 |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon 키 | DM 사용 시 |
| `VITE_CARD_PUBLIC_API_BASE` | `https://www.vlue.kr` | 카카오 명함 |
| `VITE_VLUE_LANDING_URL` | `https://www.vlue.kr` | |
| `VITE_VLUE_CREATE_CARD_URL` | `https://www.vlue.kr/membership` | |
| `VITE_VLUE_PC_WINDOWS_URL` | `https://www.vlue.kr/downloads/VLUE-Setup-1.0.0.exe` | PC 설치 파일 (빌드 후 `npm run web:sync-pc-installer`) |
| `VLUE_PC_INSTALLER_URL` | (선택) 원격 `.exe` 직접 URL | Railway 빌드 시 `web/public/downloads`로 자동 복사 |
| `VITE_VLUE_PC_MAC_URL` | (출시 전 비움) | macOS DMG URL |
| `VITE_VLUE_PLAY_STORE_URL` | (출시 전 비움) | |
| `VITE_VLUE_APP_STORE_URL` | (출시 전 비움) | |
| `NIXPACKS_NODE_INSTALL_DEV_DEPS` | `true` | 빌드 실패 시 |

`VITE_*` 는 **빌드 타임** 변수입니다. 변경 후 **Redeploy** 필수.

템플릿: `web/.env.railway.example`

---

## 2단계 — Railway 커스텀 도메인 등록

1. **`@vlue/web`** 서비스 → **Settings** → **Networking** → **Public Networking**
2. **+ Custom Domain** → `www.vlue.kr` 입력
3. **Show DNS records** 에서 복사:
   - **CNAME** — 예: `xxxxxxxx.up.railway.app` (`@vlue/api`의 `rahwnlov`와 **다를 수 있음**)
   - **TXT** — `_railway-verify.www` 등 Railway가 안내하는 이름/값

> `vlueweb-production.up.railway.app` 를 CNAME에 직접 넣지 마세요.  
> **커스텀 도메인 전용 CNAME**을 써야 SSL·라우팅이 맞습니다.

### CLI (Railway 로그인 후)

```bash
npx @railway/cli login
npx @railway/cli link
npx @railway/cli domain www.vlue.kr --service @vlue/web
```

---

## 3단계 — 가비아 DNS 변경

[가비아 DNS 관리](https://dns.gabia.com) → `vlue.kr`

### 3-1. `www` CNAME 교체 (필수)

| 호스트 | 타입 | 기존 값 | **새 값** |
|--------|------|---------|-----------|
| `www` | CNAME | `vcidkorea.github.io` | Railway 2단계 CNAME |

기존 `www` → `vcidkorea.github.io` 레코드를 **삭제**하거나 **수정**합니다.

### 3-2. Railway TXT 추가 (필수)

| 호스트 | 타입 | 값 |
|--------|------|-----|
| (Railway TXT 이름) | TXT | Railway TXT 값 |

`api.vlue.kr` 연결 때와 동일하게 **CNAME + TXT 둘 다** 있어야 Railway 검증·SSL이 완료됩니다.

저장 후 **5~30분** 전파 대기 (최대 72시간).

---

## 4단계 — GitHub Pages 티저 해제

DNS가 Railway로 바뀌면 `www` 는 자동으로 티저가 아닌 실서비스가 됩니다.  
추가로 권장:

1. GitHub 저장소 → **Settings** → **Pages** → Source **None** (또는 비활성)
2. 루트 `CNAME` 파일은 레포에 남아 있어도 DNS만 Railway면 무관
3. 워크플로 `.github/workflows/github-pages-coming-soon.yml` 은 **수동 배포만** (`workflow_dispatch`)으로 변경됨

---

## 5단계 — `@vlue/api` CORS 확인

`@vlue/api` Variables:

```
CORS_ORIGIN=https://www.vlue.kr,https://vlue.kr,https://vlueweb-production.up.railway.app
```

코드 기본값(`apps/api/src/index.ts`)에도 `www.vlue.kr` 이 포함되어 있으나, ENV에 명시하는 것을 권장합니다.

### Cloudflare R2 CORS

버킷 CORS `AllowedOrigins`에 `https://www.vlue.kr` 포함 확인.

---

## 6단계 — 검증

```bash
npm run verify:www-domain
npm run verify:api-domain
```

### 브라우저 체크리스트

| URL | 기대 |
|-----|------|
| https://www.vlue.kr/ | 마케팅 홈 (Coming Soon **아님**) |
| https://www.vlue.kr/#shopping | 쇼핑 |
| https://www.vlue.kr/app | 브라우저 설치 안내 (앱 차단) |
| DevTools → Network | API 요청이 `https://api.vlue.kr/...` |

임시 QA URL (DNS 전): https://vlueweb-production.up.railway.app/

---

## (선택) 루트 `vlue.kr` → `www` 리다이렉트

지금 `vlue.kr` 은 GitHub Pages A 레코드입니다. 런칭 후:

- **가비아 URL 포워딩**: `vlue.kr` → `https://www.vlue.kr` (301)
- 또는 Railway에 `vlue.kr` apex 도메인 추가 (가비아 ALIAS/ANAME 지원 여부 확인)

1순위는 **`www.vlue.kr`만** Railway 연결로 충분합니다.

---

## 문제 해결

| 증상 | 원인 | 조치 |
|------|------|------|
| 여전히 Coming Soon | DNS 전파 전·캐시 | `npm run verify:www-domain` CNAME 확인, 시크릿 창 |
| Railway 도메인 빨간색 | TXT 누락 | 가비아 TXT 추가 |
| API CORS 오류 | `CORS_ORIGIN` 미포함 | `@vlue/api` Variables 수정 |
| API가 Railway QA로 감 | `VITE_API_URL` 미설정 빌드 | `@vlue/web` 변수 후 Redeploy |
| SSL 오류 | 검증 미완료 | Railway Networking 초록 체크 대기 |
