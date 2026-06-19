# VLUE Desktop — 앱 아이콘 리소스

electron-builder 패키징 시 사용하는 아이콘 경로입니다.  
**파일이 없어도 빌드는 성공**하며, Electron 기본 아이콘이 적용됩니다.

## 권장 파일

| 파일 | 용도 | 권장 크기 |
|------|------|-----------|
| `icon.png` | Windows·macOS 공통 (우선 생성됨) | 512×512 이상 |
| `icon.ico` | Windows NSIS 설치 파일 | 256×256 멀ti |
| `icon.icns` | macOS DMG | Apple 규격 |

## 자동 생성 (favicon 기반)

루트에서 패키징 전 스크립트가 `web/public/favicon.svg` → `icon.png` 를 생성합니다.

```bash
npm run electron:build
# 내부: node scripts/prepare-electron-icons.mjs
```

## 공식 브랜드 아이콘 교체

1. 디자인팀에서 `icon.png` (512×512), `icon.ico`, `icon.icns` 납품
2. 이 폴더(`apps/electron/build/icons/`)에 덮어쓰기
3. `npm run electron:build` 재실행

## 참고

- `electron-builder.config.cjs` — 존재하는 아이콘만 자동 적용
- `.gitkeep` — 빈 폴더 유지용
