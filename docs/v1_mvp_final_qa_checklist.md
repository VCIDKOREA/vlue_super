# VLUE V1 MVP 최종 QA 체크리스트

> 출시 전 직접 검증용. 체크박스를 탭하여 완료 표시하세요.  
> 테스트 계정: **무료** 일반 / **유료** `test_b2b` (`010-9000-0003`, `membershipTierSnapshot: b2b`)

---

## 1. 회원 등급 · 프리미엄 게이트

- [ ] **무료 계정** 로그인 → 프로필 → 블루 쇼케이스 설정 → **비즈니스** 탭 클릭 시 `ShowcasePremiumGateModal` 유료 유도 팝업 노출
- [ ] 무료 계정에서 **소셜 링크·메뉴판·상품 소개·해시태그** 입력 시도 시 프리미엄 게이트 차단
- [ ] **유료 계정 (`test_b2b`)** 로그인 → 비즈니스 탭에서 인스타/유튜브 링크, 메뉴, 상품 등록·미리보기 정상
- [ ] 유료 계정 쇼케이스 **상품 클릭** → 쿠팡/네이버쇼핑/카카오쇼핑 등 **외부 URL 새 탭 리다이렉트** (Link-out)

---

## 2. V1 해시태그 (유료 전용)

- [ ] `packages/db/prisma/schema.prisma` — `User.showcaseTags String[]` 필드 존재 확인
- [ ] `web/src/lib/showcase/showcaseStyleStorage.js` — 클라이언트 `tags: []` 배열 저장·복원 확인
- [ ] **유료 계정**에서 `#소금빵 #대구소금빵` 입력 → localStorage 유지 + 서버 `PUT /api/lettering/showcase/tags` 동기화
- [ ] **무료 계정**에서 해시태그 입력 시도 → 프리미엄 게이트 차단 (등록 불가)
- [ ] 홈 검색에 `#소금빵` 입력 → 해시태그 매칭 업체·쇼케이스 결과 노출

---

## 3. BGM 하이브리드 시스템 (RF 큐레이션 + YouTube)

- [ ] 쇼케이스 설정 → **음악** 탭: **커스텀 BGM 업로드 버튼 없음** (완전 제거)
- [ ] **RF 큐레이션 프리셋** 20종+ 테마 필터(카페/비즈니스/로파이/앰비언트) 선택 → 미리보기에서 재생
- [ ] **「내 쇼케이스 배경음악/영상 검색 지정하기」** — YouTube URL 또는 키워드 입력 → `지정` → videoId·제목 저장
- [ ] 프리셋(RF)과 YouTube 지정 곡 전환 시 이전 소스 정상 교체

---

## 4. 통화 중 / 종료 후 BGM UX

- [ ] 설정 패널 **「통화 중 (BGM OFF)」** 토글 → 비주얼(사진 슬라이드) 재생, **오디오 완전 무음**
- [ ] 통화 중 화면에 **「🎵 현재 설정된 BGM: [제목 - 아티스트]」** CSS Marquee 자막 부드럽게 흐름
- [ ] **「종료 후 재생」** 토글 → RF 프리셋 또는 YouTube embed **음소거 해제·자동 재생**
- [ ] 하단 **통화 목록** 전체화면 → 통화 행 탭 → 쇼케이스 진입 시 **터치 이벤트로 BGM unlock** 후 자동 재생
- [ ] YouTube BGM: `youtube-nocookie.com` iframe embed, 통화 중 `mute=1` 유지

---

## 5. 근접 센서 (실기기 Android)

- [ ] 통화 중 쇼케이스 표시 상태에서 **휴대폰을 귀에 대면** 화면 sleep/잠금 오버레이 (`근접 센서 · 화면 잠금`)
- [ ] 귀에서 **떼면 즉시** 쇼케이스 화면 복구 (페이드/깜빡임 없이)
- [ ] `ShowcaseProximitySensor.kt` → `VlueShowcaseBridge.onProximityNear/Far` JS 이벤트 연동

---

## 6. 인스타 감성 · 사진 꾸미기

- [ ] **사진** 탭 → 갤러리 멀티 선택 **최대 10장** 추가
- [ ] 사진별 **무료 폰트 5종** (프리텐다드·마루부리·에스코어드림·Noto·SD고딕) 드롭다운 적용
- [ ] 사진 위 **텍스트 + 이모지 스티커** (😀🚀🔥 등) 배치·미리보기 노출
- [ ] 미리보기 **10장 스와이프 슬라이더** 자동 재생 (4초 간격)
- [ ] 명함 소개글 textarea에 **이모지 입력·저장·재표시** 정상

---

## 7. 쇼케이스 설정 UI (카카오톡·인스타 스타일)

- [ ] 상단 **스타일 | 사진 | 음악 | 비즈니스** 탭 네비 (인스타 스토리 링 스타일 칩)
- [ ] 카카오/인스타 프로필 URL 연결 폼 정상
- [ ] 설정 변경 시 우측 **실시간 미리보기** 즉시 반영
- [ ] 단순 설정 폼이 아닌 **카드형·탭형** 레이아웃 확인

---

## 8. 알림톡 (카카오)

- [ ] API `buildCallEndAlimtalkPayload` 본문에 **「보이스피싱」 단어 없음**
- [ ] 본문에 **「스마트 명함·쇼케이스」** 강조 문구 포함
- [ ] 1번 버튼 텍스트: **`수신된 번호 인증서보기`** (이모지 없이 고정)
- [ ] 버튼 웹링크: `https://vlue.app` 기반 쇼케이스 URL (`/site/web/showcase/{phone}`)
- [ ] `npm run test:alimtalk-call-end` (apps/api) 통과

---

## 9. V1 숨김 · V2 예정 기능 스크리닝

`web/src/lib/v1ReleaseScope.js` 플래그 기준:

- [ ] **PC Windows/macOS 다운로드** UI 전면 숨김 (`pcInstaller: false`)
- [ ] **AI 엑셀에디터** 웹 메뉴 숨김 (`aiExcel: false`)
- [ ] **채팅·브이밍·쇼핑카트·마이페이지 상점** 앱 하단/페이지 숨김
- [ ] **VLUE STORE 인앱결제·장바구니·마이케이스 검색 탭** 미노출
- [ ] **추천 프로그램·VLUER 파트너** UI 숨김 (`referralProgram: false`)
- [ ] 홈 **레거시 피드·핫플레이스** 숨김 (`homeLegacyFeed: false`)

---

## 10. 통화 목록 · 친구 쇼케이스 (V1 핵심)

- [ ] 하단 바 **통화 목록** → 전체화면 시트 → 통화 탭 → 상대 쇼케이스 리플레이
- [ ] 홈 **친구 쇼케이스** 카카오톡형 세로 스크롤 + 검색 돋보기
- [ ] 홈 **블루 쇼케이스 미리보기** — `수신 중…` 문구 없이 정상 타이틀
- [ ] 알림은 **하단 바 아이콘** 전체화면 (`notificationBottomNavOnly: true`)

---

## 11. 빌드 · 스모크

- [ ] `cd web && npm run build` 성공
- [ ] `cd apps/api && npm run test:alimtalk-call-end` 성공
- [ ] Android 앱 빌드 후 통화 오버레이 + 근접 센서 스모크

---

## 빠른 테스트 시나리오 (15분)

1. `test_b2b` 로그인 → 쇼케이스 설정 → 사진 3장 + BGM 프리셋 + 상품 1개 등록  
2. 미리보기 **통화 중** → Marquee 확인 → **종료 후** BGM 재생  
3. 통화 목록에서 동일 쇼케이스 탭 진입 → BGM auto-play  
4. 무료 계정으로 비즈니스 탭 → 게이트 모달 확인  
5. www 마케팅 홈 → PC 다운로드 버튼 없음 확인  

---

## 관련 파일

| 영역 | 경로 |
|------|------|
| V1 플래그 | `web/src/lib/v1ReleaseScope.js` |
| 쇼케이스 설정 | `web/src/components/showcase/ShowcaseStyleSettingsPanel.jsx` |
| BGM 컨텍스트 | `web/src/context/ShowcaseBgmContext.jsx` |
| RF 프리셋 | `web/src/lib/showcase/showcaseBgmPresets.js` |
| YouTube | `web/src/lib/showcase/showcaseYoutube.js` |
| 근접 센서 | `web/src/lib/showcase/showcaseProximityBridge.js`, `apps/android/.../ShowcaseProximitySensor.kt` |
| 알림톡 | `apps/api/src/lib/alimtalkTemplate.ts` |
| DB tags | `packages/db/prisma/schema.prisma` → `User.showcaseTags` |

---

*마지막 업데이트: V1 MVP 출시 QA — BGM·쇼케이스·로드맵 반영*
