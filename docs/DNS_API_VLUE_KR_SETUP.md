# api.vlue.kr → Railway @vlue/api 연결

`api.vlue.kr`은 **가비아(Gabia) DNS**에서 관리됩니다.  
`www.vlue.kr`은 GitHub Pages(`vcidkorea.github.io`)로 이미 연결되어 있습니다.

Railway 커스텀 도메인은 **CNAME + TXT 두 레코드**가 모두 있어야 검증됩니다. CNAME만 넣으면 `NXDOMAIN` 또는 `404`가 납니다.

---

## 1단계 — Railway에서 커스텀 도메인 등록

1. [Railway](https://railway.app) → 프로젝트 → **`@vlue/api`** 서비스
2. **Settings** → **Networking** → **Public Networking** → **+ Custom Domain**
3. 도메인 입력: `api.vlue.kr`
4. **Show DNS records** 에 표시되는 값을 복사:
   - **CNAME** — 예: `xxxxxxxx.up.railway.app` (서비스마다 다름)
   - **TXT** — `_railway-verify` 또는 Railway가 안내하는 이름/값

> `vlueapi-production.up.railway.app`를 CNAME에 직접 넣지 마세요. Railway가 발급한 **커스텀 도메인 전용 CNAME**을 써야 합니다.

---

## 2단계 — 가비아 DNS 레코드 추가

[가비아 DNS 관리](https://dns.gabia.com) → `vlue.kr` → **레코드 추가**

| 호스트 | 타입 | 값 | TTL |
|--------|------|-----|-----|
| `api` | **CNAME** | Railway 1단계 CNAME 값 | 600 |
| (Railway TXT 이름) | **TXT** | Railway TXT 값 | 600 |

저장 후 **5~30분**(최대 72시간) 전파 대기.

---

## 3단계 — 검증

```bash
npm run verify:api-domain
```

또는 브라우저:

```
https://api.vlue.kr/api/media/video-upload/status
```

기대 응답:

```json
{ "ok": true, "configured": true, "provider": "cloudflare-r2" }
```

---

## 4단계 — Railway Variables (선택·권장)

`@vlue/api` Variables:

| Variable | 값 |
|----------|-----|
| `APP_BASE_URL` | `https://api.vlue.kr` |
| `CORS_ORIGIN` | `https://www.vlue.kr,https://vlue.kr,https://vlueweb-production.up.railway.app` |

`@vlue/web` — 프로덕션 빌드 시:

| Variable | 값 |
|----------|-----|
| `VITE_API_URL` | `https://api.vlue.kr` |

변경 후 **@vlue/web 재배포** (빌드 타임 변수).

---

## CLI로 도메인 등록 (Railway 로그인 후)

```bash
npx @railway/cli login
npx @railway/cli link          # 프로젝트 선택
npx @railway/cli domain api.vlue.kr --service @vlue/api
```

출력된 CNAME·TXT를 가비아에 그대로 입력합니다.

---

## 문제 해결

| 증상 | 원인 | 조치 |
|------|------|------|
| `DNS_PROBE_FINISHED_NXDOMAIN` | 가비아에 `api` 레코드 없음 | CNAME 추가 |
| 도메인은 열리나 404 | TXT 미설정 | Railway TXT 레코드 추가 |
| SSL 오류 | 검증 미완료 | Railway 대시보드에서 도메인 초록 체크 대기 |
| `configured: false` | R2 env 미설정 | `R2_*` 5개 변수 확인 |

임시 확인 URL (DNS 전): `https://vlueapi-production.up.railway.app/api/media/video-upload/status`
