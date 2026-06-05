# @vlue/pc-agent

사무실 **Windows PC**에서 돌리는 원격 인쇄·팩스 에이전트입니다. API WebSocket(`/api/office/ws/agent`)에 붙어 `PRINT_EXECUTE` / `FAX_EXECUTE` 작업을 처리합니다.

## Railway에 두면 안 되는 이유

| Railway `@vlue/pc-agent` | 실제 필요한 환경 |
|--------------------------|------------------|
| Linux 컨테이너, 프린터 없음 | Windows PC + OS 기본 프린터 |
| API와 다른 머신 | 같은 사무실 LAN 또는 PC에서 API URL 접근 |
| `VLUE_AGENT_USER_ID` 미설정 시 즉시 종료 | 회원 UUID 필수 |

**`@vlue/api`, `@vlue/web`만 Railway에 두고, pc-agent 서비스는 삭제(또는 Deploy 중지)하는 것이 정상 구성입니다.**

## Railway 대시보드에서 크래시 없애기

1. Railway 프로젝트 → **`@vlue/pc-agent` 서비스**
2. **Settings** → 맨 아래 **Remove Service** (또는 Deployments 중지)

API·웹은 그대로 **Online** 유지됩니다.

## Windows PC에서 실행 (프로덕션 API 연결)

저장소 루트에서:

```powershell
$env:VLUE_AGENT_USER_ID="<Prisma User.id UUID>"
$env:VLUE_AGENT_WS_URL="wss://<@vlue-api-public-host>/api/office/ws/agent"
$env:VLUE_AGENT_DEVICE_LABEL="Office-PC-01"
npm run pc-agent:start
```

- `VLUE_AGENT_USER_ID`: 인쇄 권한이 있는 VLUE 회원 ID (DB `User` 테이블)
- `VLUE_AGENT_WS_URL`: Railway **@vlue/api** Public URL 기준 (`https` → `wss`, 경로 동일)
- 로컬 개발: `ws://127.0.0.1:8788/api/office/ws/agent`

예시는 `.env.example` 참고.

## 로그로 상태 확인

- 성공: `[vlue-pc-agent] connected`, `ready`
- 실패: `VLUE_AGENT_USER_ID 가 필요합니다` → UUID 설정
- 실패: `socket error` → WS URL·API Online·방화벽 확인
