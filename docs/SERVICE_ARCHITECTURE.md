# VLUE 서비스 아키텍처 (확정)

모든 클라이언트는 **공통 API 서버 (`@vlue/api`)** 를 바라보며, 사용자 데이터는 플랫폼이 달라도 **하나의 상태**로 유지·동기화한다.

| 항목 | 값 |
|------|-----|
| API | `@vlue/api` — REST + SSE/WebSocket |
| 웹 | `https://www.vlue.kr/` (`web/src/site/`) |
| 앱 | `https://www.vlue.kr/app` + PC 설치형 + 모바일 네이티브 |
| 실시간 | SSE (`/api/realtime/sse`), 채팅·리모컨은 WebSocket |

---

## 1. 웹 (www.vlue.kr) — 단독 기능 중심

### 핵심 (웹 전용 UI)
| 기능 | 설명 |
|------|------|
| **AI 엑셀 제작 (MVP)** | `OfficeExcelWorkshop` — www 웹 전용 · `/api/office/excel/*` · Vming `web_excel` |
| **PPT 자료** | 저장·공유·인쇄만 (`WalletHubModal`, `remote-control`) — **AI 제작 없음** |
| **통합 검색** | 기관명·전화·사업자번호 — 마케팅 홈 히어로 검색, 공공+VLUE DB 교차 검증 |

### 공통 (앱과 동일 API·데이터)
| 기능 | API·모듈 |
|------|----------|
| 쇼핑 | `shopApi.js`, 장바구니·주문 |
| 결제 | PortOne/Iamport, 구독·에스크로 |
| 메일 | `@vlue.kr`, `vlueOfficeApi` |
| 자료실 | documents, CS 스캔 업로드 |

### UI 컨셉
- **홍보·마케팅** 레이아웃 (브랜드·보이스피싱 예방 스토리)
- **공통 기능** 구간은 앱과 **동일 디자인 시스템** (컬러·폰트·컴포넌트) — 설치 후 이질감 최소화
- 상·하단 **앱/PC 다운로드** 상시 노출 → 설치형 유도

---

## 2. 앱 (PC 설치형 / 모바일) — 도구 및 제어 중심

### 핵심 (앱·네이티브)
| 기능 | 설명 |
|------|------|
| **복합기 리모컨** | `OfficeRemotePanel`, PC 에이전트 큐 |
| **실시간 알림** | SSE·푸시·가족보호·보이스피싱 경보 |
| **하드웨어 제어** | Android 통화 오버레이, 레터링, 가족보호 브릿지 |

### 공통 (웹과 동일 API·데이터)
쇼핑 · 결제 · 메일 · 자료실 — 웹과 **동일 엔드포인트·동일 비즈니스 로직**

### UI 컨셉
- 카카오톡 스타일 **통일 도구 UI** (하단 탭, 채팅, MY, 쇼핑)
- 업무 생산성·제어에 집중

---

## 3. 데이터 동기화 원칙

```
[ www 웹 ]     [ PC 앱 ]     [ 모바일 ]
     \            |            /
      \           |           /
       =====  @vlue/api  =====
              PostgreSQL
```

| 데이터 | 동기화 |
|--------|--------|
| 결제·구독 내역 | 즉시 — 동일 `userId` |
| 자료실 파일 | 즉시 — documents API |
| 쇼핑 장바구니·주문 | 즉시 — shop/cart API |
| 채팅·DM | **WebSocket** + Supabase Realtime |
| 리모컨·오피스 상태 | **WebSocket/SSE** |
| 홈·마케팅 레이아웃 | HQ SSE 배포 (앱 홈 반영) |

**원칙:** 플랫폼이 달라도 **한 사용자 = 한 데이터 상태**.

---

## 4. 개발 방향 (체크리스트)

- [x] 문서화 — 본 파일 + `WEB_OVERVIEW.md` 링크
- [x] 마케팅 웹 — 서비스소개·다운로드 CTA 상시 노출
- [ ] 웹 쇼핑/메일/자료실 — 앱 디자인 토큰(`styles.css`, primary/slate) 점진 통일
- [ ] 공통 기능 라우트 — 로그인 후 `@vlue/api` 세션 공유
- [ ] WebSocket 채널 — 채팅·리모컨 플랫폼 간 브로드캐스트

### 웹 클라이언트 API 진입
- `web/src/lib/apiBase.js` → `VITE_API_URL` 또는 Vite `/api` 프록시
- 앱·웹 동일: `vlueAuthFetch`, `startVlueSse`

### 코드 위치 참고
| 영역 | 경로 |
|------|------|
| 마케팅 셸 | `web/src/site/bolt/` |
| 슈퍼앱 셸 | `web/src/App.jsx` |
| API 서버 | `apps/api/` |
| 오피스·자료실 | `web/src/components/office/`, `WalletHubModal`, `OfficeRemoteModal` |
| AI 엑셀 (www) | `web/src/site/bolt/components/OfficeExcelWorkshop.tsx` |
| 쇼핑 | `web/src/components/Subscription.jsx`, `lib/shopApi.js` |
