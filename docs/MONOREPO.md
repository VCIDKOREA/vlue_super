# VLUE 슈퍼앱 모노레포 (`발구지`)

## 디렉터리 구조

```
발구지/
├── apps/                 # 네이티브·백엔드 앱 모듈
│   ├── api/              # @vlue/api — Hono API 서버
│   ├── android/          # Android
│   ├── ios/              # iOS
│   └── pc-agent/         # @vlue/pc-agent
├── web/                  # @vlue/web — Vite React 슈퍼앱 웹 (구 wep/ + 메인 UI)
├── packages/
│   ├── db/               # @vlue/db — Prisma schema.prisma · 마이그레이션
│   └── shared/           # @vlue/shared — 가입 검증·정산·프라이싱 공통 로직
├── scripts/              # 배포·마이그레이션·안드로이드 도구
└── package.json          # npm workspaces 루트
```

## 워크스페이스 패키지

| 패키지 | 역할 |
|--------|------|
| `@vlue/web` | 웹 프론트엔드 (`web/src`) |
| `@vlue/api` | REST API · 정산 스케줄러 |
| `@vlue/db` | PostgreSQL 16 + Prisma |
| `@vlue/shared` | BM 정책 순수 함수 (웹·API 공유) |

## 자주 쓰는 명령

```bash
npm install
npm run web:dev          # 웹만
npm run api:dev          # API만
npm run db:deploy:safe   # 2단계 DB 배포
npm run build:all        # shared 검증 + API + Web 빌드
npm run production:ready # 프로덕션 검증
```

## Cursor에서 동시 작업

- `apps/api/src/**` 와 `web/src/**` 를 한 워크스페이스 루트에서 열면 에이전트가 양쪽을 동시에 수정할 수 있습니다.
- 비즈니스 규칙 변경 시 **`packages/shared`** 를 먼저 수정한 뒤 API re-export·웹 import를 맞춥니다.

## 레거시 `src/` (루트)

웹 이전 과정에서 루트 `src/` 가 남아 있을 수 있습니다. **정본은 `web/src`** 입니다. 파일 잠금 해제 후 루트 `src/` 를 삭제해도 됩니다.

## GitHub 연결

```powershell
cd "발구지"
git init
git add .
git commit -m "chore: VLUE superapp monorepo (web + apps + packages)"
git branch -M main
git remote add origin https://github.com/<ORG>/<REPO>.git
git push -u origin main
```

CI: `.github/workflows/ci.yml`  
수동/태그 배포: `.github/workflows/deploy.yml`
