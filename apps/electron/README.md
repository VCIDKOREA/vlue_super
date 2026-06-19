# VLUE Desktop (Electron) — 빌드 가이드

## 빠른 시작

```bash
# 개발 (Vite + Electron)
npm run electron:dev

# 설치 파일 생성 (현재 OS)
npm run electron:build

# Windows NSIS (.exe)
npm run electron:build:win

# macOS DMG (Mac에서 실행)
npm run electron:build:mac
```

## 빌드 파이프라인

1. **`npm run web:build:electron`** — Vite `base: './'` 로 `web/dist` 생성 (file:// 호환)
2. **`node scripts/prepare-electron-pack.mjs`** — dist 검증 + 아이콘 PNG 생성
3. **`electron-builder`** — `apps/electron/dist/` 에 설치 파일 출력

## 출력 경로

| 플랫폼 | 파일 예시 |
|--------|-----------|
| Windows | `apps/electron/dist/VLUE-Setup-1.0.0.exe` |
| macOS | `apps/electron/dist/VLUE-1.0.0-arm64.dmg` |

## 아이콘

- 경로: `build/icons/`
- `icon.png` / `icon.ico` / `icon.icns` — 없어도 빌드 가능 (Electron 기본 아이콘)
- `npm run electron:build` 시 `favicon.svg` → `icon.png` 자동 생성 시도

## 프로덕션 로딩

- 패키징된 앱은 `resources/web-dist/index.html` (Vite 빌드)을 `file://` 로 로드
- User-Agent: `… VLUE-PC-App` (브라우저 `/app` 차단 우회)
- API: 빌드 타임 `VITE_API_URL` (기본 `https://api.vlue.kr`)

## Windows 빌드 오류 (한글 경로)

OneDrive `바탕 화면` 등 **한글이 포함된 경로**에서 `app-builder.exe ENOENT` 가 나면:

```text
C:\dev\vlue_super
```

처럼 **ASCII 전용 경로**에 클론 후 `npm ci` → `npm run electron:build:win` 을 실행하세요.

## electron-builder 설정

- `electron-builder.config.cjs` — appId `com.vlue.app`, productName `VLUE`
- Windows: NSIS one-click, 바탕·시작메뉴 바로가기
- macOS: DMG
