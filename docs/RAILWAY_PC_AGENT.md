# Railway — @vlue/pc-agent (배포하지 마세요)

## 요약

**`@vlue/pc-agent`는 Railway 서비스로 운영하지 않습니다.**  
대시보드에서 **Crashed**인 것은 설계상 클라우드에 맞지 않기 때문이며, **서비스 제거**가 올바른 해결입니다.

## 크래시 흔한 원인

1. **`VLUE_AGENT_USER_ID` 없음** → 시작 직후 `process.exit(1)`
2. **`VLUE_AGENT_WS_URL` 기본값** `ws://localhost:8788/...` → Railway 컨테이너 안의 localhost는 API가 아님
3. **프린터 없음** — Linux 이미지에 `lp`/Windows 인쇄 불가

## 권장 인프라

| 서비스 | Railway | 비고 |
|--------|---------|------|
| `@vlue/api` | ✅ Online | WebSocket 에이전트 허브 |
| `@vlue/web` | ✅ Online | 프론트 |
| `@vlue/pc-agent` | ❌ 제거 | 사무실 PC에서 `npm run pc-agent:start` |

## PC 에이전트 연결 절차

1. API Public URL 확인 (Networking)
2. Windows PC에 Node 20+ 설치, 저장소 clone
3. `apps/pc-agent/.env.example` 참고해 환경 변수 설정
4. `npm run pc-agent:start` (저장소 루트)

자세한 내용: `apps/pc-agent/README.md`
