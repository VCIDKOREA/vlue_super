# Formspree — Coming Soon 이메일 구독 (`xpqewkwk`)

`www.vlue.kr` Coming Soon 페이지의 **알림 받기** 폼이 Formspree로 전송됩니다.

- 코드: `web/public/coming-soon.html` (원본) → `npm run pages:sync` 로 루트 `index.html` 동기화
- 엔드포인트: `https://formspree.io/f/xpqewkwk`

## Cole 메일(검증 안내) 요약

Formspree 온보딩 메일은 **스팸·오타 구독을 줄이려면 검증을 켜라**는 안내입니다.

| 구분 | 역할 | VLUE 현황 |
|------|------|-----------|
| **클라이언트 검증** | 입력 중·제출 전 UX | 코드에 이메일 형식·필수·허니팟·가짜 도메인 차단 |
| **서버 검증** | JS 우회·봇 제출 차단 | **Formspree 대시보드 Workflow** 에서 설정 필요 |

## Formspree 대시보드에서 할 일 (서버 검증)

1. [formspree.io](https://formspree.io) 로그인 → 폼 **`xpqewkwk`** 선택
2. **Workflow** 탭 → **Validation** → **+ Add new**
3. 필드 **`email`** 추가 (HTML `name="email"` 과 동일해야 함)
4. 권장 규칙:
   - Type: **email**
   - **Required**: ON
   - **Maximum length**: `254`
5. (선택) B2B만 받을 때: **Require work email** — 구독 폼에는 **끄는 것** 권장 (gmail·naver 등 개인 메일 허용)

저장 후 테스트: 잘못된 이메일(`not-an-email`) 제출 시 Formspree가 거절하고, 코드는 서버 오류 메시지를 화면에 표시합니다.

## 로컬에서 확인

```bash
npm run pages:sync
npx serve . -l 4173
# http://localhost:4173 — 이메일 오입력·정상 제출 테스트
```
